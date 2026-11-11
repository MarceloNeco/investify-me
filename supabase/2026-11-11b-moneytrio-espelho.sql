-- =====================================================================================
-- MoneyTRIO v5 — PLANILHA ESPELHO (o app manda as edições para o robô) + MEMÓRIA DO ROBÔ (regras aprendidas)
-- Projeto Supabase: solverone-app (São Paulo). Contrato combinado com o robô financas-robo (11/Nov/2026).
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- O que faz (o banco NUNCA vê nada aberto):
--   * money_espelho_chave: a chave PÚBLICA do robô para o espelho (JWK EC P-256), publicada pelo próprio robô a cada
--     rodada (money_espelho_publicar). A privada é derivada da senha do robô, no robô, e nunca sai de lá.
--     Chefe/responsável lê (money_espelho_chave_de) para fechar os pacotes.
--   * money_espelho_saida: os pacotes que o app deixa para o robô (uma edição, criação ou exclusão de lançamento cada),
--     fechados para a chave do robô: {"v":1,"epk":{x,y},"iv","ct"} (ECDH P-256 efêmero → HKDF-SHA256 → AES-256-GCM).
--     Chefe/responsável deposita (até 200 por vez); só o robô da família lê e marca como lido; os lidos somem em 7 dias.
--   * money_robo_memoria: as REGRAS APRENDIDAS do robô (a planilha é só destino, nunca dependência), num pacote fechado
--     pelo próprio robô para a chave dele (o mesmo formato). Só o robô da família lê e grava (até 512 KB).
--   * Nenhuma tabela aceita leitura ou escrita direta: tudo pelas funções abaixo.
--
-- Depende da BASE COMUM, do MoneyTRIO v1 (money_posso_ver) e do v2 (money_robos, money_sou_robo).
-- Regras de escrita: SECURITY DEFINER + SET search_path = '' + nomes qualificados; GRANTs explícitos; conferência no fim.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- 0) Porteiro
do $$
declare v_falta text := '';
begin
  if to_regclass('public.sol_grupos') is null then v_falta := v_falta || ' sol_grupos'; end if;
  if to_regprocedure('public.money_posso_ver(uuid)') is null then v_falta := v_falta || ' money_posso_ver(uuid) (MoneyTRIO v1)'; end if;
  if to_regprocedure('public.money_sou_robo(uuid)') is null then v_falta := v_falta || ' money_sou_robo(uuid) (MoneyTRIO v2)'; end if;
  if v_falta <> '' then raise exception 'MoneyTRIO v5: falta:%.', v_falta; end if;
end $$;

-- 1) A chave pública do robô para o espelho
create table if not exists public.money_espelho_chave (
  grupo_id       uuid primary key references public.sol_grupos(id),
  chave_publica  jsonb not null check (jsonb_typeof(chave_publica) = 'object' and chave_publica->>'kty' = 'EC' and chave_publica->>'crv' = 'P-256'
                                      and chave_publica->>'x' ~ '^[A-Za-z0-9_-]{43}$' and chave_publica->>'y' ~ '^[A-Za-z0-9_-]{43}$'
                                      and not (chave_publica ? 'd')),     -- nunca a parte privada
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);
alter table public.money_espelho_chave enable row level security;

-- 2) Os pacotes do app para o robô
create table if not exists public.money_espelho_saida (
  id           uuid primary key default gen_random_uuid(),
  grupo_id     uuid not null references public.sol_grupos(id),
  pacote       text not null check (length(pacote) between 20 and 65536 and left(pacote, 1) = '{'),
  criado_em    timestamptz not null default now(),
  criado_por   uuid references auth.users(id),
  consumido_em timestamptz
);
create index if not exists money_espelho_saida_pend on public.money_espelho_saida (grupo_id, criado_em) where consumido_em is null;
alter table public.money_espelho_saida enable row level security;

-- 3) A memória do robô (regras aprendidas), fechada pelo próprio robô
create table if not exists public.money_robo_memoria (
  grupo_id      uuid primary key references public.sol_grupos(id),
  blob          text not null check (octet_length(blob) <= 524288 and left(blob, 1) = '{'),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);
alter table public.money_robo_memoria enable row level security;
-- (sem regra de acesso em nenhuma das três: ninguém lê nem escreve direto)

-- 4) Funções

-- o robô publica a chave pública dele (a mesma checagem do money_robo_depositar: robô ligado desta família)
create or replace function public.money_espelho_publicar(p_grupo uuid, p_jwk jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Entre na conta do robô.' using errcode = '42501'; end if;
  if not public.money_sou_robo(p_grupo) then raise exception 'Este robô não está autorizado nesta família.' using errcode = '42501'; end if;
  insert into public.money_espelho_chave (grupo_id, chave_publica, atualizado_por)
  values (p_grupo, jsonb_build_object('kty', 'EC', 'crv', 'P-256', 'x', p_jwk->>'x', 'y', p_jwk->>'y'), (select auth.uid()))
  on conflict (grupo_id) do update set chave_publica = excluded.chave_publica, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  return true;
end $$;
revoke all on function public.money_espelho_publicar(uuid, jsonb) from public, anon;
grant execute on function public.money_espelho_publicar(uuid, jsonb) to authenticated, service_role;

-- chefe/responsável lê a chave pública do robô (para fechar os pacotes); null = o robô ainda não publicou
create or replace function public.money_espelho_chave_de(p_grupo uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.money_posso_ver(p_grupo) then raise exception 'Só chefe ou responsável da família.' using errcode = '42501'; end if;
  return (select c.chave_publica from public.money_espelho_chave c where c.grupo_id = p_grupo);
end $$;
revoke all on function public.money_espelho_chave_de(uuid) from public, anon;
grant execute on function public.money_espelho_chave_de(uuid) to authenticated, service_role;

-- o app deposita os pacotes (chefe/responsável; até 200 por vez; no máximo 20 mil esperando por família)
create or replace function public.money_espelho_depositar(p_grupo uuid, p_pacotes text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if (select auth.uid()) is null then raise exception 'Entre na conta.' using errcode = '42501'; end if;
  if not public.money_posso_ver(p_grupo) then raise exception 'Só chefe ou responsável da família.' using errcode = '42501'; end if;
  if p_pacotes is null or cardinality(p_pacotes) = 0 then return 0; end if;
  if cardinality(p_pacotes) > 200 then raise exception 'No máximo 200 pacotes por vez.' using errcode = '22023'; end if;
  if (select count(*) from public.money_espelho_saida s where s.grupo_id = p_grupo and s.consumido_em is null) + cardinality(p_pacotes) > 20000 then
    raise exception 'O robô ainda não leu os pacotes anteriores.' using errcode = '54000';
  end if;
  insert into public.money_espelho_saida (grupo_id, pacote, criado_por)
  select p_grupo, x, (select auth.uid()) from unnest(p_pacotes) as x;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.money_espelho_depositar(uuid, text[]) from public, anon;
grant execute on function public.money_espelho_depositar(uuid, text[]) to authenticated, service_role;

-- o robô lê os pacotes esperando (os mais antigos primeiro); de passagem, apaga os lidos há mais de 7 dias
create or replace function public.money_espelho_ler(p_grupo uuid, p_limite integer default 200) returns table (id uuid, pacote text, criado_em timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.money_sou_robo(p_grupo) then raise exception 'Este robô não está autorizado nesta família.' using errcode = '42501'; end if;
  delete from public.money_espelho_saida s where s.grupo_id = p_grupo and s.consumido_em < now() - interval '7 days';
  return query select s.id, s.pacote, s.criado_em from public.money_espelho_saida s
                where s.grupo_id = p_grupo and s.consumido_em is null order by s.criado_em, s.id limit least(greatest(coalesce(p_limite, 200), 1), 500);
end $$;
revoke all on function public.money_espelho_ler(uuid, integer) from public, anon;
grant execute on function public.money_espelho_ler(uuid, integer) to authenticated, service_role;

create or replace function public.money_espelho_consumir(p_grupo uuid, p_ids uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if not public.money_sou_robo(p_grupo) then raise exception 'Este robô não está autorizado nesta família.' using errcode = '42501'; end if;
  update public.money_espelho_saida s set consumido_em = now() where s.grupo_id = p_grupo and s.id = any(p_ids) and s.consumido_em is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.money_espelho_consumir(uuid, uuid[]) from public, anon;
grant execute on function public.money_espelho_consumir(uuid, uuid[]) to authenticated, service_role;

-- a memória do robô: só o robô da família lê e grava
create or replace function public.money_robo_memoria_ler(p_grupo uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.money_sou_robo(p_grupo) then raise exception 'Este robô não está autorizado nesta família.' using errcode = '42501'; end if;
  return (select m.blob from public.money_robo_memoria m where m.grupo_id = p_grupo);
end $$;
revoke all on function public.money_robo_memoria_ler(uuid) from public, anon;
grant execute on function public.money_robo_memoria_ler(uuid) to authenticated, service_role;

create or replace function public.money_robo_memoria_gravar(p_grupo uuid, p_blob text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.money_sou_robo(p_grupo) then raise exception 'Este robô não está autorizado nesta família.' using errcode = '42501'; end if;
  if p_blob is null or octet_length(p_blob) > 524288 then raise exception 'A memória do robô passa de 512 KB.' using errcode = '22023'; end if;
  insert into public.money_robo_memoria (grupo_id, blob, atualizado_por) values (p_grupo, p_blob, (select auth.uid()))
  on conflict (grupo_id) do update set blob = excluded.blob, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  return true;
end $$;
revoke all on function public.money_robo_memoria_gravar(uuid, text) from public, anon;
grant execute on function public.money_robo_memoria_gravar(uuid, text) to authenticated, service_role;

-- 5) Tabelas: sem acesso direto
revoke all on public.money_espelho_chave, public.money_espelho_saida, public.money_robo_memoria from public, anon, authenticated;
grant all on public.money_espelho_chave, public.money_espelho_saida, public.money_robo_memoria to service_role;

-- 6) Conferência
do $$
declare v_erros text := '';
begin
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename in ('money_espelho_chave', 'money_espelho_saida', 'money_robo_memoria')) then
    v_erros := v_erros || ' regra de acesso direto nas tabelas';
  end if;
  if has_table_privilege('authenticated', 'public.money_espelho_saida', 'select') or has_table_privilege('authenticated', 'public.money_robo_memoria', 'select')
     or has_table_privilege('authenticated', 'public.money_espelho_chave', 'insert') then
    v_erros := v_erros || ' tabela aberta direto';
  end if;
  if has_function_privilege('anon', 'public.money_espelho_depositar(uuid,text[])', 'execute') or has_function_privilege('anon', 'public.money_robo_memoria_ler(uuid)', 'execute') then
    v_erros := v_erros || ' função aberta para visitante';
  end if;
  if v_erros <> '' then raise exception 'MoneyTRIO v5: conferência falhou:%', v_erros; end if;
  raise notice 'MoneyTRIO v5: espelho (app → robô) e memória do robô, tudo fechado, só pelas funções. Tudo certo.';
end $$;

commit;
