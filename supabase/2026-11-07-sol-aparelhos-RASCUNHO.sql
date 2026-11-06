-- =====================================================================================
-- RASCUNHO PARA REVISÃO — PLATAFORMA: APARELHOS E APROVAÇÃO SEM CÓDIGO DE RECUPERAÇÃO (sol_aparelhos, sol_acesso_pedidos,
-- sol_passkeys). Vale para TODOS os apps (MoneyTRIO e OmniLifeONE usam as mesmas tabelas e o mesmo formato).
-- Projeto Supabase: solverone-app (São Paulo)
--
-- !!! RASCUNHO. NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois de aprovado, perde o "-RASCUNHO" do nome. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- O banco NUNCA vê chave aberta. Ele só guarda:
--   * a parte PÚBLICA de um par efêmero (ECDH P-256) que o aparelho novo gera para um pedido;
--   * a resposta FECHADA para esse par (AES-256-GCM com a chave tirada do ECDH; só o aparelho novo abre);
--   * para a passkey: a chave privada da pessoa FECHADA com o segredo PRF da passkey (só a digital abre).
-- Pedido vale 10 min, é respondido UMA vez e lido UMA vez (depois fica "usado"). Até 3 pedidos em aberto por pessoa.
--
-- Depende da BASE COMUM (sol_grupos, sol_grupo_membros, sol_meu_papel). Regras: SECURITY DEFINER + search_path = '' +
-- nomes qualificados; o app só usa as funções (nenhuma regra de tabela para insert/update/delete); GRANTs; conferência.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- 0) Porteiro
do $$
declare v_falta text := '';
begin
  if to_regclass('public.sol_grupos') is null then v_falta := v_falta || ' sol_grupos'; end if;
  if to_regclass('public.sol_grupo_membros') is null then v_falta := v_falta || ' sol_grupo_membros'; end if;
  if to_regprocedure('public.sol_meu_papel(uuid)') is null then v_falta := v_falta || ' sol_meu_papel(uuid)'; end if;
  if v_falta <> '' then raise exception 'sol_aparelhos: falta:%.', v_falta; end if;
end $$;

-- 1) Os aparelhos de cada pessoa (lista em ⚙, "tirar este aparelho", quem aprovou)
create table if not exists public.sol_aparelhos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id),
  nome            text not null check (length(nome) between 1 and 60),        -- "Android · Chrome", escrito pelo aparelho
  app             text not null check (app ~ '^[a-z][a-z0-9-]{1,30}$'),       -- onde foi aprovado (moneytrio, omnilife…)
  como            text not null check (como in ('primeiro', 'aparelho', 'familia', 'passkey', 'kit')),
  aprovado_por    uuid references auth.users(id),                              -- quem aprovou (a própria pessoa ou o responsável)
  aprovado_por_ap uuid references public.sol_aparelhos(id),                    -- de qual aparelho
  criado_em       timestamptz not null default now(),
  visto_em        timestamptz not null default now(),
  removido_em     timestamptz,
  removido_por    uuid references auth.users(id)
);
create index if not exists sol_aparelhos_user on public.sol_aparelhos (user_id) where removido_em is null;
alter table public.sol_aparelhos enable row level security;
drop policy if exists sol_aparelhos_ler on public.sol_aparelhos;
create policy sol_aparelhos_ler on public.sol_aparelhos for select to authenticated using (user_id = auth.uid());

-- 2) Pedidos de acesso de um aparelho novo
create table if not exists public.sol_acesso_pedidos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id),
  nome          text not null check (length(nome) between 1 and 60),
  app           text not null check (app ~ '^[a-z][a-z0-9-]{1,30}$'),
  pub           jsonb not null check (jsonb_typeof(pub) = 'object' and pub->>'kty' = 'EC' and pub->>'crv' = 'P-256'
                                      and length(pub->>'x') = 43 and length(pub->>'y') = 43 and not (pub ? 'd')),
  grupo_id      uuid references public.sol_grupos(id),        -- para "alguém da família aprova": de qual família
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '10 minutes',
  estado        text not null default 'aberto' check (estado in ('aberto', 'aprovado', 'recusado', 'usado')),
  resposta      jsonb check (resposta is null or (jsonb_typeof(resposta) = 'object' and length(resposta::text) < 12000)),
  tipo_resposta text check (tipo_resposta in ('pessoal', 'familia')),
  respondido_por    uuid references auth.users(id),
  respondido_por_ap uuid references public.sol_aparelhos(id),
  respondido_em     timestamptz
);
create index if not exists sol_acesso_pedidos_user on public.sol_acesso_pedidos (user_id, estado);
alter table public.sol_acesso_pedidos enable row level security;
-- ninguém lê a tabela direto: só pelas funções abaixo

-- 3) Passkey sincronizada (WebAuthn PRF): a chave privada da pessoa fechada com o segredo da passkey
create table if not exists public.sol_passkeys (
  user_id    uuid not null default auth.uid() references auth.users(id),
  cred_id    text not null check (cred_id ~ '^[A-Za-z0-9_-]{16,700}$'),
  sal        text not null check (sal ~ '^[A-Za-z0-9_-]{43}$'),               -- 32 bytes, entra no PRF
  fechada    jsonb not null check (jsonb_typeof(fechada) = 'object' and length(fechada::text) < 12000),
  criado_em  timestamptz not null default now(),
  removido_em timestamptz,
  primary key (user_id, cred_id)
);
alter table public.sol_passkeys enable row level security;
drop policy if exists sol_passkeys_ler on public.sol_passkeys;
create policy sol_passkeys_ler on public.sol_passkeys for select to authenticated using (user_id = auth.uid() and removido_em is null);

-- 4) Funções

-- o aparelho novo pede acesso (até 3 em aberto; os vencidos não contam)
create or replace function public.sol_pedido_criar(p_nome text, p_app text, p_pub jsonb, p_grupo uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  if (select count(*) from public.sol_acesso_pedidos where user_id = auth.uid() and estado = 'aberto' and expira_em > now()) >= 3 then
    raise exception 'muitos pedidos em aberto: espere 10 minutos';
  end if;
  if p_grupo is not null and not exists (select 1 from public.sol_grupo_membros m where m.grupo_id = p_grupo and m.user_id = auth.uid()) then
    raise exception 'família errada';
  end if;
  insert into public.sol_acesso_pedidos (user_id, nome, app, pub, grupo_id) values (auth.uid(), p_nome, p_app, p_pub, p_grupo) returning id into v_id;
  return v_id;
end $$;

-- os pedidos que EU posso aprovar: os meus (pessoal) e, se sou chefe/responsável, os de quem é da minha família (familia)
create or replace function public.sol_pedidos_para_mim() returns table (id uuid, quem uuid, nome text, app text, pub jsonb, grupo_id uuid, criado_em timestamptz, tipo text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.user_id, p.nome, p.app, p.pub, p.grupo_id, p.criado_em, case when p.user_id = auth.uid() then 'pessoal' else 'familia' end
    from public.sol_acesso_pedidos p
   where p.estado = 'aberto' and p.expira_em > now()
     and (p.user_id = auth.uid()
          or (p.grupo_id is not null and coalesce(public.sol_meu_papel(p.grupo_id) in ('chefe', 'responsavel'), false)));
$$;

-- aprovar: grava a resposta fechada UMA vez (pessoal: só a própria pessoa; familia: chefe/responsável da família do pedido)
create or replace function public.sol_pedido_aprovar(p_id uuid, p_resposta jsonb, p_tipo text, p_meu_ap uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare p public.sol_acesso_pedidos;
begin
  select * into p from public.sol_acesso_pedidos where id = p_id for update;
  if not found or p.estado <> 'aberto' or p.expira_em <= now() then return false; end if;
  if p_tipo = 'pessoal' and p.user_id <> auth.uid() then raise exception 'só a própria pessoa aprova o seu aparelho'; end if;
  if p_tipo = 'familia' and not (p.grupo_id is not null and coalesce(public.sol_meu_papel(p.grupo_id) in ('chefe', 'responsavel'), false)) then
    raise exception 'só chefe ou responsável da família aprova';
  end if;
  if p_tipo not in ('pessoal', 'familia') then raise exception 'tipo'; end if;
  if p_meu_ap is not null and not exists (select 1 from public.sol_aparelhos a where a.id = p_meu_ap and a.user_id = auth.uid() and a.removido_em is null) then
    raise exception 'aparelho que aprova não é seu';
  end if;
  update public.sol_acesso_pedidos set estado = 'aprovado', resposta = p_resposta, tipo_resposta = p_tipo,
         respondido_por = auth.uid(), respondido_por_ap = p_meu_ap, respondido_em = now()
   where id = p_id;
  return true;
end $$;

create or replace function public.sol_pedido_recusar(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_acesso_pedidos p set estado = 'recusado', respondido_por = auth.uid(), respondido_em = now()
   where p.id = p_id and p.estado = 'aberto'
     and (p.user_id = auth.uid() or (p.grupo_id is not null and coalesce(public.sol_meu_papel(p.grupo_id) in ('chefe', 'responsavel'), false)));
  return found;
end $$;

-- o aparelho novo olha o SEU pedido (estado; a resposta só uma vez: ao ler aprovado, vira "usado" e o aparelho entra na lista)
create or replace function public.sol_pedido_buscar(p_id uuid) returns table (estado text, resposta jsonb, tipo text, aparelho uuid)
language plpgsql security definer set search_path = '' as $$
declare p public.sol_acesso_pedidos; v_ap uuid;
begin
  select * into p from public.sol_acesso_pedidos where id = p_id and user_id = auth.uid() for update;
  if not found then return; end if;
  if p.estado = 'aberto' and p.expira_em <= now() then return query select 'vencido'::text, null::jsonb, null::text, null::uuid; return; end if;
  if p.estado <> 'aprovado' then return query select p.estado, null::jsonb, null::text, null::uuid; return; end if;
  insert into public.sol_aparelhos (user_id, nome, app, como, aprovado_por, aprovado_por_ap)
  values (auth.uid(), p.nome, p.app, case when p.tipo_resposta = 'pessoal' then 'aparelho' else 'familia' end, p.respondido_por, p.respondido_por_ap)
  returning id into v_ap;
  update public.sol_acesso_pedidos set estado = 'usado', resposta = null where id = p_id;   -- a resposta sai do banco depois de lida
  return query select 'aprovado'::text, p.resposta, p.tipo_resposta, v_ap;
end $$;

-- registrar um aparelho que já abria antes (com o código, a passkey ou o kit), e marcar "visto"
create or replace function public.sol_aparelho_registrar(p_nome text, p_app text, p_como text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  if p_como not in ('primeiro', 'passkey', 'kit') then raise exception 'como'; end if;
  insert into public.sol_aparelhos (user_id, nome, app, como, aprovado_por) values (auth.uid(), p_nome, p_app, p_como, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.sol_aparelho_visto(p_id uuid) returns boolean   -- false = este aparelho foi tirado: apagar o cadeado local
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_aparelhos set visto_em = now() where id = p_id and user_id = auth.uid() and removido_em is null;
  return found;
end $$;

create or replace function public.sol_aparelho_tirar(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_aparelhos set removido_em = now(), removido_por = auth.uid() where id = p_id and user_id = auth.uid() and removido_em is null;
  return found;
end $$;

create or replace function public.sol_passkey_guardar(p_cred text, p_sal text, p_fechada jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  insert into public.sol_passkeys (user_id, cred_id, sal, fechada) values (auth.uid(), p_cred, p_sal, p_fechada)
  on conflict (user_id, cred_id) do update set sal = excluded.sal, fechada = excluded.fechada, removido_em = null;
  return true;
end $$;

create or replace function public.sol_passkey_tirar(p_cred text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_passkeys set removido_em = now() where user_id = auth.uid() and cred_id = p_cred and removido_em is null;
  return found;
end $$;

-- 5) Permissões (só funções; as tabelas não aceitam escrita do app)
revoke all on public.sol_aparelhos, public.sol_acesso_pedidos, public.sol_passkeys from public, anon, authenticated;
grant select on public.sol_aparelhos, public.sol_passkeys to authenticated;
grant all on public.sol_aparelhos, public.sol_acesso_pedidos, public.sol_passkeys to service_role;
revoke all on function public.sol_pedido_criar(text, text, jsonb, uuid) from public, anon;
grant execute on function public.sol_pedido_criar(text, text, jsonb, uuid) to authenticated, service_role;
revoke all on function public.sol_pedidos_para_mim() from public, anon;
grant execute on function public.sol_pedidos_para_mim() to authenticated, service_role;
revoke all on function public.sol_pedido_aprovar(uuid, jsonb, text, uuid) from public, anon;
grant execute on function public.sol_pedido_aprovar(uuid, jsonb, text, uuid) to authenticated, service_role;
revoke all on function public.sol_pedido_recusar(uuid) from public, anon;
grant execute on function public.sol_pedido_recusar(uuid) to authenticated, service_role;
revoke all on function public.sol_pedido_buscar(uuid) from public, anon;
grant execute on function public.sol_pedido_buscar(uuid) to authenticated, service_role;
revoke all on function public.sol_aparelho_registrar(text, text, text) from public, anon;
grant execute on function public.sol_aparelho_registrar(text, text, text) to authenticated, service_role;
revoke all on function public.sol_aparelho_visto(uuid) from public, anon;
grant execute on function public.sol_aparelho_visto(uuid) to authenticated, service_role;
revoke all on function public.sol_aparelho_tirar(uuid) from public, anon;
grant execute on function public.sol_aparelho_tirar(uuid) to authenticated, service_role;
revoke all on function public.sol_passkey_guardar(text, text, jsonb) from public, anon;
grant execute on function public.sol_passkey_guardar(text, text, jsonb) to authenticated, service_role;
revoke all on function public.sol_passkey_tirar(text) from public, anon;
grant execute on function public.sol_passkey_tirar(text) to authenticated, service_role;

-- 6) Conferência
do $$
declare v_erros text := '';
begin
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename in ('sol_aparelhos', 'sol_acesso_pedidos', 'sol_passkeys')
              and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')) then
    v_erros := v_erros || ' regra de escrita direta nas tabelas';
  end if;
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = 'sol_acesso_pedidos') then
    v_erros := v_erros || ' sol_acesso_pedidos legível direto';
  end if;
  if has_function_privilege('anon', 'public.sol_pedido_aprovar(uuid,jsonb,text,uuid)', 'execute') then v_erros := v_erros || ' função aberta para visitante'; end if;
  if v_erros <> '' then raise exception 'sol_aparelhos: conferência falhou:%', v_erros; end if;
  raise notice 'sol_aparelhos: pedidos de 10 min, aprovação pelo outro aparelho ou pelo responsável, passkeys fechadas. Tudo certo.';
end $$;

commit;
