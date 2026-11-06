-- =====================================================================================
-- PLATAFORMA — APARELHOS E APROVAÇÃO SEM CÓDIGO DE RECUPERAÇÃO (formato v2, com compromisso)
-- Tabelas: sol_aparelhos, sol_acesso_pedidos, sol_passkeys. Valem para TODOS os apps (MoneyTRIO e OmniLifeONE usam as
-- mesmas tabelas e o mesmo formato; um app aprova o aparelho do outro).
-- Projeto Supabase: solverone-app (São Paulo)
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- O banco NUNCA vê chave aberta. Ele guarda só:
--   * pubB (ECDH P-256) do aparelho novo e C = SHA-256(pubB‖nB) — o compromisso, gravado ANTES de ver pubA;
--   * pubA e nA do aparelho que aprova (sol_pedido_desafio), e só depois nB (sol_pedido_revelar);
--   * a resposta FECHADA para pubB (ECDH → HKDF(id, uid, nA, nB) → AES-256-GCM, AAD = id) — só o aparelho novo abre;
--   * para a passkey: a chave privada da pessoa FECHADA com o segredo PRF da passkey.
-- Os dois aparelhos mostram 6 números = SHA-256("sol-ap-v2"‖id‖pubA‖pubB‖nA‖nB). Como B se compromete com nB antes de
-- ver nA, um banco que troque a pub não consegue escolher os 6 números (comparação numérica com compromisso, como
-- no Bluetooth SSP e no ZRTP).
-- Pedido: 10 min, até 3 abertos por pessoa, desafio uma vez, revelar uma vez, resposta gravada uma vez e lida uma vez
-- (ao ler, vira "usado" e a resposta sai do banco). Pedido vencido: a resposta sai do banco e ele vira "vencido".
--
-- Depende da BASE COMUM (sol_grupos, sol_grupo_membros, sol_meu_papel). Regras: SECURITY DEFINER + search_path = '' +
-- nomes qualificados; o app só usa as funções (nenhuma regra de escrita direta nas tabelas); GRANTs; conferência.
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

-- 1) Os aparelhos de cada pessoa (lista, "tirar este aparelho", quem aprovou)
create table if not exists public.sol_aparelhos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id),
  nome            text not null check (length(nome) between 1 and 60),        -- "Android · Chrome", escrito pelo aparelho
  app             text not null check (app ~ '^[a-z][a-z0-9-]{1,30}$'),       -- onde entrou (moneytrio, omnilife…)
  como            text not null check (como in ('primeiro', 'aparelho', 'familia', 'passkey', 'kit')),
  aprovado_por    uuid references auth.users(id),
  aprovado_por_ap uuid references public.sol_aparelhos(id),
  criado_em       timestamptz not null default now(),
  visto_em        timestamptz not null default now(),
  removido_em     timestamptz,
  removido_por    uuid references auth.users(id)
);
create index if not exists sol_aparelhos_user on public.sol_aparelhos (user_id) where removido_em is null;
alter table public.sol_aparelhos enable row level security;
-- ninguém lê direto: sol_aparelhos_meus()

-- 2) Pedidos de acesso de um aparelho novo
create table if not exists public.sol_acesso_pedidos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id),
  nome          text not null check (length(nome) between 1 and 60),
  app           text not null check (app ~ '^[a-z][a-z0-9-]{1,30}$'),
  pub           jsonb not null check (jsonb_typeof(pub) = 'object' and pub->>'kty' = 'EC' and pub->>'crv' = 'P-256'
                                      and length(pub->>'x') = 43 and length(pub->>'y') = 43 and not (pub ? 'd')),
  compromisso   text not null check (compromisso ~ '^[A-Za-z0-9_-]{43}$'),     -- C = SHA-256(pubB‖nB), base64url
  grupo_id      uuid references public.sol_grupos(id),                          -- "alguém da família aprova": de qual família
  pub_a         jsonb check (pub_a is null or (jsonb_typeof(pub_a) = 'object' and pub_a->>'kty' = 'EC' and pub_a->>'crv' = 'P-256'
                                      and length(pub_a->>'x') = 43 and length(pub_a->>'y') = 43 and not (pub_a ? 'd'))),
  n_a           text check (n_a is null or n_a ~ '^[A-Za-z0-9_-]{43}$'),
  n_b           text check (n_b is null or n_b ~ '^[A-Za-z0-9_-]{43}$'),
  desafio_por   uuid references auth.users(id),
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '10 minutes',
  estado        text not null default 'aberto' check (estado in ('aberto', 'aprovado', 'recusado', 'usado', 'vencido')),
  resposta      jsonb check (resposta is null or (jsonb_typeof(resposta) = 'object' and length(resposta::text) < 12000)),
  tipo_resposta text check (tipo_resposta in ('pessoal', 'familia')),
  respondido_por    uuid references auth.users(id),
  respondido_por_ap uuid references public.sol_aparelhos(id),
  respondido_em     timestamptz
);
create index if not exists sol_acesso_pedidos_user on public.sol_acesso_pedidos (user_id, estado);
alter table public.sol_acesso_pedidos enable row level security;
-- ninguém lê direto: só pelas funções

-- 3) Passkey sincronizada (WebAuthn PRF): a chave privada da pessoa fechada com o segredo da passkey
create table if not exists public.sol_passkeys (
  user_id     uuid not null references auth.users(id),
  cred_id     text not null check (cred_id ~ '^[A-Za-z0-9_-]+$' and length(cred_id) between 16 and 700),
  sal         text not null check (sal ~ '^[A-Za-z0-9_-]{43}$'),
  fechada     jsonb not null check (jsonb_typeof(fechada) = 'object' and length(fechada::text) < 12000),
  criado_em   timestamptz not null default now(),
  removido_em timestamptz,
  primary key (user_id, cred_id)
);
alter table public.sol_passkeys enable row level security;
-- ninguém lê direto: sol_passkeys_minhas()

-- 4) Funções

-- limpeza: pedido vencido não guarda resposta e aberto vencido vira "vencido" (chamada por criar, buscar e para_mim)
create or replace function public.sol_pedidos_limpar() returns void
language sql security definer set search_path = '' as $$
  update public.sol_acesso_pedidos set resposta = null where expira_em <= now() and resposta is not null;
  update public.sol_acesso_pedidos set estado = 'vencido' where estado = 'aberto' and expira_em <= now();
$$;
revoke all on function public.sol_pedidos_limpar() from public, anon, authenticated;
grant execute on function public.sol_pedidos_limpar() to service_role;

-- posso aprovar este pedido? pessoal: é meu; familia: sou chefe/responsável da família do pedido
create or replace function public.sol_pedido_posso(p public.sol_acesso_pedidos) returns text
language sql stable security definer set search_path = '' as $$
  select case when p.user_id = auth.uid() then 'pessoal'
              when p.grupo_id is not null and coalesce(public.sol_meu_papel(p.grupo_id) in ('chefe', 'responsavel'), false) then 'familia'
         end;
$$;
revoke all on function public.sol_pedido_posso(public.sol_acesso_pedidos) from public, anon, authenticated;
grant execute on function public.sol_pedido_posso(public.sol_acesso_pedidos) to service_role;

-- o aparelho novo pede acesso (até 3 em aberto)
create or replace function public.sol_pedido_criar(p_nome text, p_app text, p_pub jsonb, p_compromisso text, p_grupo uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  perform public.sol_pedidos_limpar();
  if (select count(*) from public.sol_acesso_pedidos where user_id = auth.uid() and estado = 'aberto') >= 3 then
    raise exception 'muitos pedidos em aberto: espere 10 minutos';
  end if;
  if p_grupo is not null and not exists (select 1 from public.sol_grupo_membros m where m.grupo_id = p_grupo and m.user_id = auth.uid()) then
    raise exception 'família errada';
  end if;
  insert into public.sol_acesso_pedidos (user_id, nome, app, pub, compromisso, grupo_id) values (auth.uid(), p_nome, p_app, p_pub, p_compromisso, p_grupo)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.sol_pedido_criar(text, text, jsonb, text, uuid) from public, anon;
grant execute on function public.sol_pedido_criar(text, text, jsonb, text, uuid) to authenticated, service_role;

-- os pedidos que EU posso aprovar (os meus e, se sou chefe/responsável, os da família), com quem pede
create or replace function public.sol_pedidos_para_mim() returns table (id uuid, quem uuid, quem_email text, quem_nome text, nome text, app text,
  pub jsonb, compromisso text, pub_a jsonb, n_a text, n_b text, desafio_meu boolean, grupo_id uuid, criado_em timestamptz, tipo text)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.sol_pedidos_limpar();
  return query
  select p.id, p.user_id, u.email::text, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::text, p.nome, p.app,
         p.pub, p.compromisso, p.pub_a, p.n_a, p.n_b, p.desafio_por = auth.uid(), p.grupo_id, p.criado_em, public.sol_pedido_posso(p)
    from public.sol_acesso_pedidos p join auth.users u on u.id = p.user_id
   where p.estado = 'aberto' and p.expira_em > now() and public.sol_pedido_posso(p) is not null
     and (p.desafio_por is null or p.desafio_por = auth.uid());
end $$;
revoke all on function public.sol_pedidos_para_mim() from public, anon;
grant execute on function public.sol_pedidos_para_mim() to authenticated, service_role;

-- quem aprova grava pubA e nA (uma vez só; o primeiro aparelho que abrir o pedido fica com ele)
create or replace function public.sol_pedido_desafio(p_id uuid, p_pub_a jsonb, p_n_a text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare p public.sol_acesso_pedidos;
begin
  select * into p from public.sol_acesso_pedidos where id = p_id for update;
  if not found or p.estado <> 'aberto' or p.expira_em <= now() or p.pub_a is not null then return false; end if;
  if public.sol_pedido_posso(p) is null then raise exception 'sem permissão para este pedido'; end if;
  update public.sol_acesso_pedidos set pub_a = p_pub_a, n_a = p_n_a, desafio_por = auth.uid() where id = p_id;
  return true;
end $$;
revoke all on function public.sol_pedido_desafio(uuid, jsonb, text) from public, anon;
grant execute on function public.sol_pedido_desafio(uuid, jsonb, text) to authenticated, service_role;

-- o aparelho novo revela nB só DEPOIS de ver pubA e nA (uma vez só)
create or replace function public.sol_pedido_revelar(p_id uuid, p_n_b text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_acesso_pedidos set n_b = p_n_b
   where id = p_id and user_id = auth.uid() and estado = 'aberto' and expira_em > now() and pub_a is not null and n_b is null;
  return found;
end $$;
revoke all on function public.sol_pedido_revelar(uuid, text) from public, anon;
grant execute on function public.sol_pedido_revelar(uuid, text) to authenticated, service_role;

-- aprovar: grava a resposta fechada UMA vez (só quem fez o desafio, depois do revelar)
create or replace function public.sol_pedido_aprovar(p_id uuid, p_resposta jsonb, p_meu_ap uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare p public.sol_acesso_pedidos; v_tipo text;
begin
  select * into p from public.sol_acesso_pedidos where id = p_id for update;
  if not found or p.estado <> 'aberto' or p.expira_em <= now() or p.n_b is null or p.desafio_por is distinct from auth.uid() then return false; end if;
  v_tipo := public.sol_pedido_posso(p);
  if v_tipo is null then raise exception 'sem permissão para este pedido'; end if;
  if p_meu_ap is not null and not exists (select 1 from public.sol_aparelhos a where a.id = p_meu_ap and a.user_id = auth.uid() and a.removido_em is null) then
    raise exception 'aparelho que aprova não é seu';
  end if;
  update public.sol_acesso_pedidos set estado = 'aprovado', resposta = p_resposta, tipo_resposta = v_tipo,
         respondido_por = auth.uid(), respondido_por_ap = p_meu_ap, respondido_em = now()
   where id = p_id;
  return true;
end $$;
revoke all on function public.sol_pedido_aprovar(uuid, jsonb, uuid) from public, anon;
grant execute on function public.sol_pedido_aprovar(uuid, jsonb, uuid) to authenticated, service_role;

create or replace function public.sol_pedido_recusar(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare p public.sol_acesso_pedidos;
begin
  select * into p from public.sol_acesso_pedidos where id = p_id for update;
  if not found or p.estado <> 'aberto' or public.sol_pedido_posso(p) is null then return false; end if;
  update public.sol_acesso_pedidos set estado = 'recusado', respondido_por = auth.uid(), respondido_em = now() where id = p_id;
  return true;
end $$;
revoke all on function public.sol_pedido_recusar(uuid) from public, anon;
grant execute on function public.sol_pedido_recusar(uuid) to authenticated, service_role;

-- o aparelho novo olha o SEU pedido. Aprovado: devolve a resposta UMA vez, vira "usado", a resposta sai do banco e
-- o aparelho entra na lista
create or replace function public.sol_pedido_buscar(p_id uuid) returns table (estado text, pub_a jsonb, n_a text, resposta jsonb, tipo text, aparelho uuid)
language plpgsql security definer set search_path = '' as $$
declare p public.sol_acesso_pedidos; v_ap uuid;
begin
  perform public.sol_pedidos_limpar();
  select * into p from public.sol_acesso_pedidos where id = p_id and user_id = auth.uid() for update;
  if not found then return; end if;
  if p.estado <> 'aprovado' then return query select p.estado, p.pub_a, p.n_a, null::jsonb, null::text, null::uuid; return; end if;
  insert into public.sol_aparelhos (user_id, nome, app, como, aprovado_por, aprovado_por_ap)
  values (auth.uid(), p.nome, p.app, case when p.tipo_resposta = 'pessoal' then 'aparelho' else 'familia' end, p.respondido_por, p.respondido_por_ap)
  returning id into v_ap;
  update public.sol_acesso_pedidos set estado = 'usado', resposta = null where id = p_id;
  return query select 'aprovado'::text, p.pub_a, p.n_a, p.resposta, p.tipo_resposta, v_ap;
end $$;
revoke all on function public.sol_pedido_buscar(uuid) from public, anon;
grant execute on function public.sol_pedido_buscar(uuid) to authenticated, service_role;

-- registrar o aparelho que já abria antes (código antigo, passkey ou kit)
create or replace function public.sol_aparelho_registrar(p_nome text, p_app text, p_como text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  if p_como not in ('primeiro', 'passkey', 'kit') then raise exception 'como'; end if;
  insert into public.sol_aparelhos (user_id, nome, app, como, aprovado_por) values (auth.uid(), p_nome, p_app, p_como, auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.sol_aparelho_registrar(text, text, text) from public, anon;
grant execute on function public.sol_aparelho_registrar(text, text, text) to authenticated, service_role;

-- false = este aparelho foi tirado (o app apaga o cadeado local)
create or replace function public.sol_aparelho_visto(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_aparelhos set visto_em = now() where id = p_id and user_id = auth.uid() and removido_em is null;
  return found;
end $$;
revoke all on function public.sol_aparelho_visto(uuid) from public, anon;
grant execute on function public.sol_aparelho_visto(uuid) to authenticated, service_role;

create or replace function public.sol_aparelho_tirar(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_aparelhos set removido_em = now(), removido_por = auth.uid() where id = p_id and user_id = auth.uid() and removido_em is null;
  return found;
end $$;
revoke all on function public.sol_aparelho_tirar(uuid) from public, anon;
grant execute on function public.sol_aparelho_tirar(uuid) to authenticated, service_role;

-- os meus aparelhos, com quem aprovou (para a lista e para o aviso "aprovado por X")
create or replace function public.sol_aparelhos_meus() returns table (id uuid, nome text, app text, como text, criado_em timestamptz, visto_em timestamptz,
  aprovado_por uuid, aprovado_por_email text, aprovado_por_nome text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.nome, a.app, a.como, a.criado_em, a.visto_em, a.aprovado_por, u.email::text,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::text
    from public.sol_aparelhos a left join auth.users u on u.id = a.aprovado_por
   where a.user_id = auth.uid() and a.removido_em is null
   order by a.criado_em;
$$;
revoke all on function public.sol_aparelhos_meus() from public, anon;
grant execute on function public.sol_aparelhos_meus() to authenticated, service_role;

create or replace function public.sol_passkey_guardar(p_cred text, p_sal text, p_fechada jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  insert into public.sol_passkeys (user_id, cred_id, sal, fechada) values (auth.uid(), p_cred, p_sal, p_fechada)
  on conflict (user_id, cred_id) do update set sal = excluded.sal, fechada = excluded.fechada, removido_em = null;
  return true;
end $$;
revoke all on function public.sol_passkey_guardar(text, text, jsonb) from public, anon;
grant execute on function public.sol_passkey_guardar(text, text, jsonb) to authenticated, service_role;

create or replace function public.sol_passkeys_minhas() returns table (cred_id text, sal text, fechada jsonb, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select k.cred_id, k.sal, k.fechada, k.criado_em from public.sol_passkeys k where k.user_id = auth.uid() and k.removido_em is null;
$$;
revoke all on function public.sol_passkeys_minhas() from public, anon;
grant execute on function public.sol_passkeys_minhas() to authenticated, service_role;

create or replace function public.sol_passkey_tirar(p_cred text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.sol_passkeys set removido_em = now() where user_id = auth.uid() and cred_id = p_cred and removido_em is null;
  return found;
end $$;
revoke all on function public.sol_passkey_tirar(text) from public, anon;
grant execute on function public.sol_passkey_tirar(text) to authenticated, service_role;

-- 5) Tabelas: o app não lê nem escreve direto (só as funções acima)
revoke all on public.sol_aparelhos, public.sol_acesso_pedidos, public.sol_passkeys from public, anon, authenticated;
grant all on public.sol_aparelhos, public.sol_acesso_pedidos, public.sol_passkeys to service_role;

-- 6) Conferência
do $$
declare v_erros text := '';
begin
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename in ('sol_aparelhos', 'sol_acesso_pedidos', 'sol_passkeys')) then
    v_erros := v_erros || ' regra de acesso direto nas tabelas (era para não haver nenhuma)';
  end if;
  if has_table_privilege('authenticated', 'public.sol_acesso_pedidos', 'select') or has_table_privilege('anon', 'public.sol_passkeys', 'select') then
    v_erros := v_erros || ' tabela legível direto';
  end if;
  if has_function_privilege('anon', 'public.sol_pedido_aprovar(uuid,jsonb,uuid)', 'execute') then v_erros := v_erros || ' função aberta para visitante'; end if;
  if has_function_privilege('authenticated', 'public.sol_pedidos_limpar()', 'execute') then v_erros := v_erros || ' limpeza aberta para o app'; end if;
  if v_erros <> '' then raise exception 'sol_aparelhos: conferência falhou:%', v_erros; end if;
  raise notice 'sol_aparelhos v2: pedidos de 10 min com compromisso (desafio/revelar), aprovação pelo outro aparelho ou pelo responsável, passkeys fechadas. Tudo certo.';
end $$;

commit;
