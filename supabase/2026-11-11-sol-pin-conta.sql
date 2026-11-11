-- =====================================================================================
-- PLATAFORMA — PIN DA CONTA (um PIN só, igual em todos os aparelhos da pessoa; trocou num, vale em todos)
-- Tabelas: sol_pin_conta, sol_aparelho_pin. Vale para TODOS os apps (MoneyTRIO e OmniLifeONE, mesmo formato).
-- Projeto Supabase: solverone-app (São Paulo). Depende de supabase/2026-11-07-sol-aparelhos.sql (sol_aparelhos).
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- O PIN NUNCA vem ao banco. O aparelho manda v = PBKDF2-SHA256(PIN, sal_da_conta, 600 mil) e o banco guarda só
-- hv = SHA-256(v). O banco também guarda, para cada aparelho, um SEGREDO de 32 bytes que ele só entrega com o PIN certo:
-- a chave do aparelho fica fechada no próprio aparelho por esse segredo (e por uma chave não extraível do navegador),
-- então, com internet, nem quem mexe no navegador abre os dados sem passar pelo PIN contado aqui.
-- Por que hv e o segredo no banco não abrem dado nenhum: os dados estão fechados com a chave da família, que só existe
-- fechada nos aparelhos aprovados (e embrulhada para a chave privada da pessoa, que também só existe nos aparelhos).
-- O segredo sozinho não abre nada: ele fecha uma camada de um arquivo que só existe dentro do aparelho.
--
-- Tentativas: contadas POR CONTA (o PIN é um só) e por aparelho. A partir do 5º erro seguido, espera crescente
-- (30 s, 1 min, 5 min, 15 min, 30 min); do 10º em diante, CADA erro novo dá 24 h de espera (não existe bloqueio
-- definitivo: decisão do dono, 11/Nov/2026). A aprovação por outro aparelho da própria pessoa desbloqueia NA HORA
-- (sol_pin_definir sem o atual, em até 10 min). Aprovação da família NUNCA troca o PIN.
-- (A coluna "bloqueado" fica só por compatibilidade: sempre false.)
--
-- Regras: SECURITY DEFINER + search_path = '' + nomes qualificados; sem acesso direto às tabelas; GRANTs; conferência.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- 0) Porteiro
do $$
declare v_falta text := '';
begin
  if to_regclass('public.sol_aparelhos') is null then v_falta := v_falta || ' sol_aparelhos (rode antes 2026-11-07-sol-aparelhos.sql)'; end if;
  if to_regprocedure('extensions.digest(bytea,text)') is null then v_falta := v_falta || ' pgcrypto em extensions'; end if;
  if v_falta <> '' then raise exception 'sol_pin_conta: falta:%.', v_falta; end if;
end $$;

-- 1) O PIN da conta: só o verificador (nunca o PIN)
create table if not exists public.sol_pin_conta (
  user_id       uuid primary key references auth.users(id),
  sal           text not null check (sal ~ '^[A-Za-z0-9_-]{22}$'),          -- 16 bytes, base64url, escolhido pelo aparelho
  hv            text not null check (hv ~ '^[0-9a-f]{64}$'),                 -- SHA-256(v), em hexadecimal
  versao        integer not null default 1,
  tentativas    integer not null default 0,
  espera_ate    timestamptz,
  bloqueado     boolean not null default false,
  atualizado_em timestamptz not null default now(),
  atualizado_por_ap uuid references public.sol_aparelhos(id)
);
alter table public.sol_pin_conta enable row level security;

-- 2) O segredo de cada aparelho (entregue só com o PIN certo) e as tentativas daquele aparelho
create table if not exists public.sol_aparelho_pin (
  ap_id       uuid primary key references public.sol_aparelhos(id),
  user_id     uuid not null references auth.users(id),
  segredo     text not null check (segredo ~ '^[A-Za-z0-9_-]{43}$'),        -- 32 bytes, base64url, gerado pelo banco
  tentativas  integer not null default 0,
  criado_em   timestamptz not null default now()
);
alter table public.sol_aparelho_pin enable row level security;
-- ninguém lê nem escreve direto: só pelas funções abaixo

-- 3) Funções

-- auxiliares (só por dentro)
create or replace function public.sol_pin_hash(p_v text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(p_v, 'UTF8'), 'sha256'), 'hex');
$$;
revoke all on function public.sol_pin_hash(text) from public, anon, authenticated;
grant execute on function public.sol_pin_hash(text) to service_role;

create or replace function public.sol_pin_espera(p_erros integer) returns interval
language sql immutable set search_path = '' as $$
  select case when p_erros >= 10 then interval '24 hours' when p_erros = 9 then interval '30 minutes' when p_erros = 8 then interval '15 minutes' when p_erros = 7 then interval '5 minutes'
              when p_erros = 6 then interval '1 minute' when p_erros = 5 then interval '30 seconds' else interval '0' end;
$$;
revoke all on function public.sol_pin_espera(integer) from public, anon, authenticated;
grant execute on function public.sol_pin_espera(integer) to service_role;

-- o aparelho é meu e está na lista?
create or replace function public.sol_pin_meu_ap(p_ap uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sol_aparelhos a where a.id = p_ap and a.user_id = auth.uid() and a.removido_em is null);
$$;
revoke all on function public.sol_pin_meu_ap(uuid) from public, anon, authenticated;
grant execute on function public.sol_pin_meu_ap(uuid) to service_role;

-- o segredo do aparelho (cria na primeira vez)
create or replace function public.sol_pin_segredo(p_ap uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_s text;
begin
  insert into public.sol_aparelho_pin (ap_id, user_id, segredo)
  values (p_ap, auth.uid(), rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '='))
  on conflict (ap_id) do nothing;
  select segredo into v_s from public.sol_aparelho_pin where ap_id = p_ap and user_id = auth.uid();
  return v_s;
end $$;
revoke all on function public.sol_pin_segredo(uuid) from public, anon, authenticated;
grant execute on function public.sol_pin_segredo(uuid) to service_role;

-- a conta tem PIN? (sal e versão, para o aparelho calcular v; e se está bloqueado ou esperando)
create or replace function public.sol_pin_info() returns table (tem boolean, sal text, versao integer, bloqueado boolean, espera_ate timestamptz, tentativas integer)
language sql stable security definer set search_path = '' as $$
  select true, p.sal, p.versao, p.bloqueado, p.espera_ate, p.tentativas from public.sol_pin_conta p where p.user_id = auth.uid()
  union all
  select false, null, 0, false, null, 0 where not exists (select 1 from public.sol_pin_conta p where p.user_id = auth.uid());
$$;
revoke all on function public.sol_pin_info() from public, anon;
grant execute on function public.sol_pin_info() to authenticated, service_role;

-- conferir o PIN da conta: ok → o segredo deste aparelho e a versão; errado → quantas restam e até quando esperar
create or replace function public.sol_pin_conferir(p_v text, p_ap uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.sol_pin_conta; v_erros integer;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  if not public.sol_pin_meu_ap(p_ap) then return jsonb_build_object('ok', false, 'erro', 'aparelho'); end if;
  select * into p from public.sol_pin_conta where user_id = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'sempin'); end if;
  if p.espera_ate is not null and p.espera_ate > now() then return jsonb_build_object('ok', false, 'erro', 'espera', 'espera_ate', p.espera_ate, 'tentativas', p.tentativas); end if;
  if public.sol_pin_hash(p_v) = p.hv then
    update public.sol_pin_conta set tentativas = 0, espera_ate = null where user_id = auth.uid();
    update public.sol_aparelho_pin set tentativas = 0 where ap_id = p_ap;
    return jsonb_build_object('ok', true, 'versao', p.versao, 'segredo', public.sol_pin_segredo(p_ap));
  end if;
  v_erros := p.tentativas + 1;
  update public.sol_pin_conta set tentativas = v_erros, bloqueado = false,
         espera_ate = case when public.sol_pin_espera(v_erros) > interval '0' then now() + public.sol_pin_espera(v_erros) end
   where user_id = auth.uid();
  perform public.sol_pin_segredo(p_ap);
  update public.sol_aparelho_pin set tentativas = tentativas + 1 where ap_id = p_ap;
  return jsonb_build_object('ok', false, 'erro', 'pin', 'tentativas', v_erros, 'restam', greatest(10 - v_erros, 0),
    'espera_ate', case when public.sol_pin_espera(v_erros) > interval '0' then now() + public.sol_pin_espera(v_erros) end);
end $$;
revoke all on function public.sol_pin_conferir(text, uuid) from public, anon;
grant execute on function public.sol_pin_conferir(text, uuid) to authenticated, service_role;

-- definir/trocar o PIN da conta. Vale: (1) a conta ainda sem PIN; (2) com o PIN atual certo (erro conta tentativa);
-- (3) sem o atual, se ESTE aparelho entrou por aprovação de OUTRO APARELHO DA PRÓPRIA PESSOA (como = 'aparelho', gravado
-- pelo banco no sol_pedido_buscar) há menos de 10 min — é assim que se desbloqueia. NÃO vale para 'passkey' nem 'kit'
-- (o aparelho se registra sozinho; o banco não tem como conferir) nem para 'familia' (nunca troca o PIN de outra pessoa).
create or replace function public.sol_pin_definir(p_v_novo text, p_sal_novo text, p_v_atual text, p_ap uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.sol_pin_conta; v_pode boolean := false; v_conf jsonb;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  if not public.sol_pin_meu_ap(p_ap) then raise exception 'aparelho que não é seu'; end if;
  if p_sal_novo !~ '^[A-Za-z0-9_-]{22}$' or p_v_novo !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'formato'; end if;
  select * into p from public.sol_pin_conta where user_id = auth.uid() for update;
  if not found then v_pode := true;
  elsif exists (select 1 from public.sol_aparelhos a where a.id = p_ap and a.user_id = auth.uid() and a.removido_em is null
                   and a.como = 'aparelho' and a.criado_em > now() - interval '10 minutes') then v_pode := true;
  elsif p_v_atual is not null then
    v_conf := public.sol_pin_conferir(p_v_atual, p_ap);
    v_pode := coalesce((v_conf->>'ok')::boolean, false);
    if not v_pode then return v_conf; end if;
  end if;
  if not v_pode then return jsonb_build_object('ok', false, 'erro', 'sem_permissao'); end if;
  insert into public.sol_pin_conta (user_id, sal, hv, versao, atualizado_por_ap) values (auth.uid(), p_sal_novo, public.sol_pin_hash(p_v_novo), 1, p_ap)
  on conflict (user_id) do update set sal = excluded.sal, hv = excluded.hv, versao = public.sol_pin_conta.versao + 1,
     tentativas = 0, espera_ate = null, bloqueado = false, atualizado_em = now(), atualizado_por_ap = p_ap;
  update public.sol_aparelho_pin set tentativas = 0 where user_id = auth.uid();
  return jsonb_build_object('ok', true, 'versao', (select versao from public.sol_pin_conta where user_id = auth.uid()), 'segredo', public.sol_pin_segredo(p_ap));
end $$;
revoke all on function public.sol_pin_definir(text, text, text, uuid) from public, anon;
grant execute on function public.sol_pin_definir(text, text, text, uuid) to authenticated, service_role;

-- 3b) Registro de aparelho (troca a função da 2026-11-07): "primeiro" só quando a conta ainda não tem nenhum aparelho.
--     Sem isso, quem rouba só a conta Google registraria um aparelho e gastaria as 10 tentativas do PIN (bloqueio do dono).
--     Aparelho a mais entra pela aprovação (sol_pedido_*), que já registra com como = 'aparelho' ou 'familia'.
create or replace function public.sol_aparelho_registrar(p_nome text, p_app text, p_como text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'entre na conta'; end if;
  if p_como not in ('primeiro', 'passkey', 'kit') then raise exception 'como'; end if;
  if p_como = 'primeiro' and exists (select 1 from public.sol_aparelhos a where a.user_id = auth.uid() and a.removido_em is null) then
    raise exception 'a conta já tem aparelho: este precisa ser aprovado pelo outro';
  end if;
  insert into public.sol_aparelhos (user_id, nome, app, como, aprovado_por) values (auth.uid(), p_nome, p_app, p_como, auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.sol_aparelho_registrar(text, text, text) from public, anon;
grant execute on function public.sol_aparelho_registrar(text, text, text) to authenticated, service_role;

-- 4) Tabelas: sem acesso direto
revoke all on public.sol_pin_conta, public.sol_aparelho_pin from public, anon, authenticated;
grant all on public.sol_pin_conta, public.sol_aparelho_pin to service_role;

-- 5) Conferência
do $$
declare v_erros text := '';
begin
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename in ('sol_pin_conta', 'sol_aparelho_pin')) then
    v_erros := v_erros || ' regra de acesso direto nas tabelas';
  end if;
  if has_table_privilege('authenticated', 'public.sol_pin_conta', 'select') or has_table_privilege('authenticated', 'public.sol_aparelho_pin', 'select') then
    v_erros := v_erros || ' tabela legível direto';
  end if;
  if has_function_privilege('anon', 'public.sol_pin_conferir(text,uuid)', 'execute') then v_erros := v_erros || ' função aberta para visitante'; end if;
  if has_function_privilege('authenticated', 'public.sol_pin_segredo(uuid)', 'execute') then v_erros := v_erros || ' segredo do aparelho aberto direto'; end if;
  if v_erros <> '' then raise exception 'sol_pin_conta: conferência falhou:%', v_erros; end if;
  raise notice 'sol_pin_conta: PIN da conta (só o verificador), segredo por aparelho só com o PIN certo, espera a partir do 5º erro e 24 h por erro do 10º em diante. Tudo certo.';
end $$;

commit;
