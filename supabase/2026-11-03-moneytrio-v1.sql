-- =====================================================================================
-- MoneyTRIO (BudgetONE · InvestifyONE · TaxONE) — tabelas money_* sobre a base comum da plataforma SolverONE
-- Contrato de dados v1 (rootify-one/PLATAFORMA-DADOS.md) · plano: PLANO-SUPABASE-MoneyTRIO.md
-- Projeto Supabase: solverone-app (São Paulo)
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- Decisões do dono (03/Nov/2026):
--   * mesmo projeto Supabase dos outros apps (uma conta SolverONE só);
--   * TUDO de finanças vai cifrado no aparelho antes de subir: a tabela nem tem coluna de dados em claro.
--     O banco guarda só: de que família é, que tipo de registro é, um id, o pacote cifrado e os carimbos.
--
-- Quem vê as finanças: só chefe e responsável da família (sol_grupo_membros). Membro comum e criança não veem.
-- A chave da família (sol_grupo_chaves) é a mesma da plataforma; quem não tem a chave não abre nada,
-- mesmo que uma regra de acesso falhe.
--
-- Depende da BASE COMUM (rootify-one/entrega/solverone-app/supabase/2026-10-03-plataforma-dados-v1.sql).
-- Se faltar algo, o arquivo para logo no começo com uma mensagem e NADA é criado.
--
-- Regras de escrita deste arquivo: SECURITY DEFINER + SET search_path = '' + nomes qualificados;
-- GRANTs explícitos no mesmo arquivo; nada de DELETE pelo app; conferência no fim.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- -------------------------------------------------------------------------------------
-- 0) A base comum existe? (senão para tudo, sem criar nada)
-- -------------------------------------------------------------------------------------
do $$
declare v_falta text := '';
begin
  if to_regclass('public.sol_grupos') is null then v_falta := v_falta || ' sol_grupos'; end if;
  if to_regclass('public.sol_grupo_membros') is null then v_falta := v_falta || ' sol_grupo_membros'; end if;
  if to_regclass('public.sol_grupo_chaves') is null then v_falta := v_falta || ' sol_grupo_chaves'; end if;
  if to_regclass('public.sol_apps') is null then v_falta := v_falta || ' sol_apps'; end if;
  if to_regprocedure('public.sol_meu_papel(uuid)') is null then v_falta := v_falta || ' sol_meu_papel(uuid)'; end if;
  if to_regprocedure('auth.uid()') is null then v_falta := v_falta || ' auth.uid()'; end if;
  if v_falta <> '' then
    raise exception 'MoneyTRIO: falta a base comum da plataforma:%. Rode antes o SQL da base (chat do RootifyONE).', v_falta;
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 1) Quem pode mexer nas finanças da família: chefe ou responsável
-- -------------------------------------------------------------------------------------
create or replace function public.money_posso_ver(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.sol_meu_papel(p_grupo) in ('chefe', 'responsavel'), false);
$$;

-- -------------------------------------------------------------------------------------
-- 2) Tabela única de registros (cada lançamento, conta, posição, categoria… é uma linha cifrada)
--    colecao: o tipo do registro (ex.: gastos, posicoes, cadastro, config). Nome curto, só letras minúsculas e _.
--    Apagar = marcar apagado_em e esvaziar o pacote (os outros aparelhos ficam sabendo, mesmo sem internet na hora).
-- -------------------------------------------------------------------------------------
create table if not exists public.money_docs (
  grupo_id        uuid not null references public.sol_grupos(id),
  colecao         text not null check (colecao ~ '^[a-z][a-z0-9_]{1,39}$'),
  id              text not null check (id ~ '^[A-Za-z0-9_.:@-]{1,80}$'),
  dados_cifrado   text check (dados_cifrado is null or length(dados_cifrado) between 16 and 2000000),
  versao          bigint not null default 1,
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz not null default now(),
  atualizado_por  uuid references auth.users(id),
  atualizado_em   timestamptz not null default now(),
  apagado_em      timestamptz,
  primary key (grupo_id, colecao, id),
  -- vivo tem pacote; apagado não guarda mais nada
  constraint money_docs_conteudo check ((apagado_em is null) = (dados_cifrado is not null))
);
create index if not exists money_docs_sync on public.money_docs (grupo_id, atualizado_em);

-- -------------------------------------------------------------------------------------
-- 3) Gatilho: carimbos de quem/quando, versão (trava otimista) e campos que não mudam
--    As regras valem para o app (authenticated). Funções internas da plataforma (LGPD) passam direto.
-- -------------------------------------------------------------------------------------
create or replace function public.money_tg_docs() returns trigger
language plpgsql set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(v_uid, new.criado_por);
    new.criado_em := now(); new.atualizado_por := v_uid; new.atualizado_em := now(); new.versao := 1;
    if new.apagado_em is not null then new.apagado_em := now(); end if;
    return new;
  end if;
  if new.grupo_id <> old.grupo_id or new.colecao <> old.colecao or new.id <> old.id then
    raise exception 'Não dá para mudar a família, o tipo ou o id de um registro.';
  end if;
  new.versao := old.versao + 1; new.atualizado_em := now();
  if current_user not in ('authenticated', 'anon') then return new; end if;  -- funções internas (ex.: LGPD)
  new.criado_por := old.criado_por; new.criado_em := old.criado_em; new.atualizado_por := v_uid;
  if new.apagado_em is not null and old.apagado_em is null then new.apagado_em := now(); end if;
  return new;
end $$;
drop trigger if exists money_docs_regras on public.money_docs;
create trigger money_docs_regras before insert or update on public.money_docs
  for each row execute function public.money_tg_docs();

-- -------------------------------------------------------------------------------------
-- 4) Regras de acesso (RLS) — o banco garante, não só a tela
-- -------------------------------------------------------------------------------------
alter table public.money_docs enable row level security;

drop policy if exists money_docs_ler on public.money_docs;
create policy money_docs_ler on public.money_docs for select to authenticated
  using (public.money_posso_ver(grupo_id));

drop policy if exists money_docs_criar on public.money_docs;
create policy money_docs_criar on public.money_docs for insert to authenticated
  with check (public.money_posso_ver(grupo_id));

drop policy if exists money_docs_mudar on public.money_docs;
create policy money_docs_mudar on public.money_docs for update to authenticated
  using (public.money_posso_ver(grupo_id))
  with check (public.money_posso_ver(grupo_id));
-- apagar de verdade: ninguém pelo app (apaga marcando apagado_em)

-- -------------------------------------------------------------------------------------
-- 5) LGPD (C8): anonimizar uma pessoa no MoneyTRIO. Chamada pela plataforma (admin_anonimizar_usuario), nunca pelo app.
--    Os registros são da família e estão cifrados. Se a pessoa era a única com conta na família, os registros dessa
--    família são esvaziados; senão, só sai o nome dela dos carimbos (quem criou / quem mudou).
-- -------------------------------------------------------------------------------------
create or replace function public.money_anonimizar(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_esvaziados integer := 0; v_carimbos integer := 0; v_n integer; r record;
begin
  if p_uid is null then raise exception 'uid obrigatório'; end if;
  for r in select distinct m.grupo_id from public.sol_grupo_membros m where m.user_id = p_uid loop
    if not exists (select 1 from public.sol_grupo_membros o
                    where o.grupo_id = r.grupo_id and o.user_id is not null and o.user_id <> p_uid and o.status = 'ativo') then
      update public.money_docs d set dados_cifrado = null, apagado_em = coalesce(d.apagado_em, now())
       where d.grupo_id = r.grupo_id and d.dados_cifrado is not null;
      get diagnostics v_n = row_count; v_esvaziados := v_esvaziados + v_n;
    end if;
  end loop;
  update public.money_docs d set criado_por = null where d.criado_por = p_uid;
  get diagnostics v_n = row_count; v_carimbos := v_carimbos + v_n;
  update public.money_docs d set atualizado_por = null where d.atualizado_por = p_uid;
  get diagnostics v_n = row_count; v_carimbos := v_carimbos + v_n;
  return jsonb_build_object('app', 'moneytrio', 'registros_esvaziados', v_esvaziados, 'carimbos_limpos', v_carimbos);
end $$;

-- -------------------------------------------------------------------------------------
-- 6) Registro do app na LGPD da plataforma (C8): a base chama public.money_anonimizar(uuid) sozinha
-- -------------------------------------------------------------------------------------
insert into public.sol_apps (codigo, nome, prefixo, repo, funcao_anonimizar)
values ('moneytrio', 'MoneyTRIO', 'money', 'investify-me', 'money_anonimizar')
on conflict (codigo) do update set funcao_anonimizar = excluded.funcao_anonimizar, atualizado_em = now();

-- -------------------------------------------------------------------------------------
-- 7) Permissões (GRANTs explícitos). Visitante (anon) não toca em nada do MoneyTRIO.
-- -------------------------------------------------------------------------------------
revoke all on public.money_docs from public, anon, authenticated;
grant select, insert, update on public.money_docs to authenticated;
grant select, insert, update, delete on public.money_docs to service_role;

revoke all on function public.money_posso_ver(uuid) from public, anon;
grant execute on function public.money_posso_ver(uuid) to authenticated;

-- gatilho: o app não chama direto (o gatilho roda sozinho, sem depender desta permissão); só o servidor
revoke all on function public.money_tg_docs() from public, anon, authenticated;
grant execute on function public.money_tg_docs() to service_role;

-- LGPD: só o servidor
revoke all on function public.money_anonimizar(uuid) from public, anon, authenticated;
grant execute on function public.money_anonimizar(uuid) to service_role;

-- -------------------------------------------------------------------------------------
-- 8) Conferência: RLS ligada, regras criadas, nada aberto para anon, LGPD registrada
-- -------------------------------------------------------------------------------------
do $$
declare v_erros text := '';
begin
  if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.money_docs'::regclass) then
    v_erros := v_erros || ' money_docs sem RLS';
  end if;
  if (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = 'money_docs') <> 3 then
    v_erros := v_erros || ' money_docs sem as 3 regras';
  end if;
  if has_table_privilege('anon', 'public.money_docs', 'select') or has_table_privilege('anon', 'public.money_docs', 'insert') then
    v_erros := v_erros || ' anon com acesso a money_docs';
  end if;
  if has_table_privilege('authenticated', 'public.money_docs', 'delete') then
    v_erros := v_erros || ' authenticated pode apagar money_docs';
  end if;
  if has_function_privilege('anon', 'public.money_posso_ver(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.money_anonimizar(uuid)', 'execute') then
    v_erros := v_erros || ' função aberta demais';
  end if;
  if not exists (select 1 from public.sol_apps a where a.codigo = 'moneytrio' and a.funcao_anonimizar = 'money_anonimizar') then
    v_erros := v_erros || ' sol_apps sem money_anonimizar';
  end if;
  if v_erros <> '' then raise exception 'MoneyTRIO v1: conferência falhou:%', v_erros; end if;
  raise notice 'MoneyTRIO v1: money_docs com RLS e 3 regras, sem acesso para visitante, LGPD registrada. Tudo certo.';
end $$;

commit;

-- Tabelinha para conferir na tela (só leitura). Esperado: as 5 linhas com "sim".
select 'money_docs com regras de acesso ligadas' as conferencia,
       case when (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.money_docs'::regclass) then 'sim' else 'NÃO' end as ok
union all select 'regras de acesso criadas (3)',
       case when (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = 'money_docs') = 3 then 'sim' else 'NÃO' end
union all select 'visitante sem acesso',
       case when not has_table_privilege('anon', 'public.money_docs', 'select') then 'sim' else 'NÃO' end
union all select 'ninguém apaga pelo app',
       case when not has_table_privilege('authenticated', 'public.money_docs', 'delete') then 'sim' else 'NÃO' end
union all select 'LGPD registrada (money_anonimizar)',
       case when exists (select 1 from public.sol_apps a where a.codigo = 'moneytrio' and a.funcao_anonimizar = 'money_anonimizar') then 'sim' else 'NÃO' end;
