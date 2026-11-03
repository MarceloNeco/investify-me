-- =====================================================================================
-- MoneyTRIO v2 — CAIXA DE ENTRADA DO ROBÔ (financas-robo → MoneyTRIO), sobre o v1 (money_docs)
-- Plano: PLANO-SUPABASE-MoneyTRIO.md (etapa 4) · Projeto Supabase: solverone-app (São Paulo)
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- Como funciona (contrato fechado com o robô financas-robo, 03/Nov/2026):
--   * money_robos: quais contas (do robô) podem deixar lançamentos na caixa de uma família.
--     Só chefe/responsável cadastra (money_robo_autorizar) e desliga (money_robo_desligar).
--   * money_caixa_chave: a chave PÚBLICA da caixa da família (JWK RSA-OAEP-256, 3072 bits). O app gera o par na
--     primeira vez que um chefe/responsável abre o cadeado; a chave privada fica no money_docs, fechada com a
--     chave da família (colecao 'config', id 'caixa_robo'). Chefe/responsável grava; robôs autorizados e membros leem.
--   * money_entrada: os pacotes que o robô deixou. O robô SÓ deposita (money_robo_depositar, repetir o mesmo id não
--     duplica). Chefe/responsável lê e marca como aproveitado (money_entrada_consumir). Ninguém apaga pelo app.
--   * O banco nunca vê o lançamento aberto: o pacote é {"v":1,"k":…,"iv":…,"ct":…} (AES-256-GCM, chave AES embrulhada
--     com RSA-OAEP SHA-256 pela chave pública da caixa). Só quem abre o cadeado da família abre a caixa.
--
-- Depende da BASE COMUM (rootify-one/entrega/solverone-app/supabase/2026-10-03-plataforma-dados-v1.sql) e do
-- MoneyTRIO v1 (supabase/2026-11-03-moneytrio-v1.sql). Se faltar algo, para logo no começo e NADA é criado.
--
-- Regras de escrita deste arquivo: SECURITY DEFINER + SET search_path = '' + nomes qualificados;
-- GRANTs explícitos no mesmo arquivo; nada de DELETE pelo app; conferência no fim.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- -------------------------------------------------------------------------------------
-- 0) Porteiro: a base comum e o MoneyTRIO v1 existem? (senão para tudo, sem criar nada)
-- -------------------------------------------------------------------------------------
do $$
declare v_falta text := '';
begin
  if to_regclass('public.sol_grupos') is null then v_falta := v_falta || ' sol_grupos'; end if;
  if to_regclass('public.sol_grupo_membros') is null then v_falta := v_falta || ' sol_grupo_membros'; end if;
  if to_regprocedure('public.sol_meu_papel(uuid)') is null then v_falta := v_falta || ' sol_meu_papel(uuid)'; end if;
  if to_regprocedure('public.sol_sou_membro(uuid)') is null then v_falta := v_falta || ' sol_sou_membro(uuid)'; end if;
  if to_regprocedure('auth.uid()') is null then v_falta := v_falta || ' auth.uid()'; end if;
  if to_regclass('auth.users') is null then v_falta := v_falta || ' auth.users'; end if;
  if to_regclass('public.money_docs') is null then v_falta := v_falta || ' money_docs (MoneyTRIO v1)'; end if;
  if to_regprocedure('public.money_posso_ver(uuid)') is null then v_falta := v_falta || ' money_posso_ver(uuid) (MoneyTRIO v1)'; end if;
  if v_falta <> '' then
    raise exception 'MoneyTRIO v2: falta:%. Rode antes a base comum e o 2026-11-03-moneytrio-v1.sql.', v_falta;
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 1) Robôs autorizados por família. Desligar = marcar desligado_em (nada se apaga).
-- -------------------------------------------------------------------------------------
create table if not exists public.money_robos (
  grupo_id      uuid not null references public.sol_grupos(id),
  user_id       uuid not null references auth.users(id),
  nome          text not null default 'robô' check (length(nome) between 1 and 60),
  criado_por    uuid references auth.users(id),
  criado_em     timestamptz not null default now(),
  desligado_em  timestamptz,
  primary key (grupo_id, user_id)
);

-- a conta que está chamando é um robô ligado desta família?
create or replace function public.money_sou_robo(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.money_robos r
                  where r.grupo_id = p_grupo and r.user_id = (select auth.uid()) and r.desligado_em is null);
$$;

-- chefe/responsável autoriza a conta do robô pelo e-mail (a conta precisa existir)
create or replace function public.money_robo_autorizar(p_grupo uuid, p_email text, p_nome text default 'robô')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_robo uuid; v_nome text := coalesce(nullif(btrim(p_nome), ''), 'robô');
begin
  if v_uid is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.money_posso_ver(p_grupo) then
    raise exception 'Só chefe ou responsável da família autoriza um robô.' using errcode = '42501';
  end if;
  if length(v_nome) > 60 then v_nome := left(v_nome, 60); end if;
  select u.id into v_robo from auth.users u where lower(u.email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  if v_robo is null then raise exception 'Não há conta SolverONE com esse e-mail.' using errcode = 'P0002'; end if;
  insert into public.money_robos (grupo_id, user_id, nome, criado_por)
  values (p_grupo, v_robo, v_nome, v_uid)
  on conflict (grupo_id, user_id) do update
    set desligado_em = null, nome = excluded.nome, criado_por = excluded.criado_por, criado_em = now();
  return v_robo;
end $$;

-- chefe/responsável desliga um robô (ele não deposita mais; o que já deixou continua na caixa)
create or replace function public.money_robo_desligar(p_grupo uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.money_posso_ver(p_grupo) then
    raise exception 'Só chefe ou responsável da família desliga um robô.' using errcode = '42501';
  end if;
  update public.money_robos r set desligado_em = now()
   where r.grupo_id = p_grupo and r.user_id = p_user and r.desligado_em is null;
  return found;
end $$;

-- -------------------------------------------------------------------------------------
-- 2) Chave pública da caixa da família (uma por família)
--    JWK RSA-OAEP-256 de 3072 bits: n em base64url sem "=" tem exatamente 512 letras; e = AQAB.
-- -------------------------------------------------------------------------------------
create table if not exists public.money_caixa_chave (
  grupo_id      uuid primary key references public.sol_grupos(id),
  chave_publica jsonb not null check (
                  jsonb_typeof(chave_publica) = 'object'
                  and chave_publica->>'kty' = 'RSA'
                  and chave_publica->>'alg' = 'RSA-OAEP-256'
                  and chave_publica->>'e' = 'AQAB'
                  and length(chave_publica->>'n') = 512
                  and chave_publica->>'n' ~ '^[A-Za-z0-9_-]+$'
                  and not (chave_publica ? 'd')),          -- nunca a parte privada
  criado_por    uuid references auth.users(id),
  criado_em     timestamptz not null default now()
);

-- carimbos: quem gravou e quando (o app não escolhe); família não muda
create or replace function public.money_tg_caixa_chave() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.grupo_id <> old.grupo_id then
    raise exception 'Não dá para mudar a família da chave da caixa.';
  end if;
  if current_user not in ('authenticated', 'anon') then return new; end if;   -- funções internas (ex.: LGPD)
  new.criado_por := (select auth.uid()); new.criado_em := now();
  return new;
end $$;
drop trigger if exists money_caixa_chave_regras on public.money_caixa_chave;
create trigger money_caixa_chave_regras before insert or update on public.money_caixa_chave
  for each row execute function public.money_tg_caixa_chave();

-- -------------------------------------------------------------------------------------
-- 3) Caixa de entrada: os pacotes cifrados que o robô deixou
-- -------------------------------------------------------------------------------------
create table if not exists public.money_entrada (
  grupo_id      uuid not null references public.sol_grupos(id),
  id            text not null check (id ~ '^[A-Za-z0-9_.:@-]{1,80}$'),
  pacote        text check (pacote is null or length(pacote) between 64 and 200000),
  origem        text check (origem is null or length(origem) <= 60),
  criado_em     timestamptz not null default now(),
  consumido_em  timestamptz,
  primary key (grupo_id, id),
  constraint money_entrada_pacote check (pacote is not null or consumido_em is not null)
);
create index if not exists money_entrada_pendentes on public.money_entrada (grupo_id, criado_em) where consumido_em is null;

-- o robô deposita: p_itens = [{"id": "...", "pacote": "{\"v\":1,…}", "origem": "pluggy"}, …] (até 500 por vez)
-- repetir um id que já está na caixa não faz nada (não duplica, não sobrescreve). Devolve quantos entraram.
create or replace function public.money_robo_depositar(p_grupo uuid, p_itens jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer := 0; v_i integer := 0; v_item jsonb; v_id text; v_pac text; v_org text; v_p jsonb; v_pend bigint;
begin
  if (select auth.uid()) is null then raise exception 'Entre na conta do robô.' using errcode = '42501'; end if;
  if not public.money_sou_robo(p_grupo) then
    raise exception 'Este robô não está autorizado nesta família.' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'p_itens precisa ser uma lista com pelo menos 1 item.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_itens) > 500 then
    raise exception 'No máximo 500 itens por vez.' using errcode = '22023';
  end if;
  select count(*) into v_pend from public.money_entrada e where e.grupo_id = p_grupo and e.consumido_em is null;
  if v_pend + jsonb_array_length(p_itens) > 20000 then
    raise exception 'A caixa desta família está cheia (20 mil itens esperando). Abra o MoneyTRIO para esvaziar.' using errcode = '54000';
  end if;
  for v_item in select x from jsonb_array_elements(p_itens) as t(x) loop
    v_i := v_i + 1;
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Item %: não é um objeto.', v_i using errcode = '22023'; end if;
    v_id := v_item->>'id'; v_pac := v_item->>'pacote'; v_org := nullif(v_item->>'origem', '');
    if v_id is null or v_id !~ '^[A-Za-z0-9_.:@-]{1,80}$' then
      raise exception 'Item %: id inválido (letras, números e _ . : @ -, até 80).', v_i using errcode = '22023';
    end if;
    if v_pac is null or length(v_pac) < 64 or length(v_pac) > 200000 then
      raise exception 'Item %: pacote vazio ou grande demais.', v_i using errcode = '22023';
    end if;
    begin v_p := v_pac::jsonb; exception when others then v_p := null; end;
    if v_p is null or jsonb_typeof(v_p) <> 'object' or v_p->>'v' is distinct from '1'
       or jsonb_typeof(v_p->'k') is distinct from 'string' or jsonb_typeof(v_p->'iv') is distinct from 'string'
       or jsonb_typeof(v_p->'ct') is distinct from 'string' then
      raise exception 'Item %: pacote fora do formato {"v":1,"k":…,"iv":…,"ct":…}.', v_i using errcode = '22023';
    end if;
    if v_org is not null and length(v_org) > 60 then v_org := left(v_org, 60); end if;
    insert into public.money_entrada (grupo_id, id, pacote, origem)
    values (p_grupo, v_id, v_pac, v_org)
    on conflict (grupo_id, id) do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

-- chefe/responsável marca como aproveitado (o lançamento já está no money_docs, fechado com a chave da família)
create or replace function public.money_entrada_consumir(p_grupo uuid, p_ids text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.money_posso_ver(p_grupo) then
    raise exception 'Só chefe ou responsável da família mexe na caixa.' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then return 0; end if;
  if cardinality(p_ids) > 1000 then raise exception 'No máximo 1000 por vez.' using errcode = '22023'; end if;
  update public.money_entrada e set consumido_em = now()
   where e.grupo_id = p_grupo and e.id = any(p_ids) and e.consumido_em is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- -------------------------------------------------------------------------------------
-- 4) Regras de acesso (RLS) — o banco garante, não só a tela
-- -------------------------------------------------------------------------------------
alter table public.money_robos enable row level security;
alter table public.money_caixa_chave enable row level security;
alter table public.money_entrada enable row level security;

-- robôs: chefe/responsável veem os da família; o robô vê a própria linha
drop policy if exists money_robos_ler on public.money_robos;
create policy money_robos_ler on public.money_robos for select to authenticated
  using (public.money_posso_ver(grupo_id) or user_id = (select auth.uid()));
-- (criar e desligar só pelas funções; ninguém apaga)

-- chave pública da caixa: chefe/responsável grava; robô autorizado e membros leem
drop policy if exists money_caixa_chave_ler on public.money_caixa_chave;
create policy money_caixa_chave_ler on public.money_caixa_chave for select to authenticated
  using (public.money_posso_ver(grupo_id) or public.money_sou_robo(grupo_id) or public.sol_sou_membro(grupo_id));
drop policy if exists money_caixa_chave_criar on public.money_caixa_chave;
create policy money_caixa_chave_criar on public.money_caixa_chave for insert to authenticated
  with check (public.money_posso_ver(grupo_id));
drop policy if exists money_caixa_chave_mudar on public.money_caixa_chave;
create policy money_caixa_chave_mudar on public.money_caixa_chave for update to authenticated
  using (public.money_posso_ver(grupo_id))
  with check (public.money_posso_ver(grupo_id));

-- caixa: só chefe/responsável leem (depositar e marcar, só pelas funções)
drop policy if exists money_entrada_ler on public.money_entrada;
create policy money_entrada_ler on public.money_entrada for select to authenticated
  using (public.money_posso_ver(grupo_id));

-- -------------------------------------------------------------------------------------
-- 5) LGPD (C8): a mesma money_anonimizar do v1, agora também nas tabelas da caixa.
--    Família que fica sem ninguém com conta: registros esvaziados (v1) e a caixa esvaziada (pacotes saem).
--    Robô que é a pessoa anonimizada: desligado. Carimbos de quem criou: limpos.
-- -------------------------------------------------------------------------------------
create or replace function public.money_anonimizar(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_esvaziados integer := 0; v_carimbos integer := 0; v_caixa integer := 0; v_robos integer := 0; v_n integer; r record;
begin
  if p_uid is null then raise exception 'uid obrigatório'; end if;
  for r in select distinct m.grupo_id from public.sol_grupo_membros m where m.user_id = p_uid loop
    if not exists (select 1 from public.sol_grupo_membros o
                    where o.grupo_id = r.grupo_id and o.user_id is not null and o.user_id <> p_uid and o.status = 'ativo') then
      update public.money_docs d set dados_cifrado = null, apagado_em = coalesce(d.apagado_em, now())
       where d.grupo_id = r.grupo_id and d.dados_cifrado is not null;
      get diagnostics v_n = row_count; v_esvaziados := v_esvaziados + v_n;
      update public.money_entrada e set pacote = null, consumido_em = coalesce(e.consumido_em, now())
       where e.grupo_id = r.grupo_id and e.pacote is not null;
      get diagnostics v_n = row_count; v_caixa := v_caixa + v_n;
    end if;
  end loop;
  update public.money_docs d set criado_por = null where d.criado_por = p_uid;
  get diagnostics v_n = row_count; v_carimbos := v_carimbos + v_n;
  update public.money_docs d set atualizado_por = null where d.atualizado_por = p_uid;
  get diagnostics v_n = row_count; v_carimbos := v_carimbos + v_n;
  update public.money_caixa_chave c set criado_por = null where c.criado_por = p_uid;
  get diagnostics v_n = row_count; v_carimbos := v_carimbos + v_n;
  update public.money_robos b set criado_por = null where b.criado_por = p_uid;
  get diagnostics v_n = row_count; v_carimbos := v_carimbos + v_n;
  update public.money_robos b set desligado_em = coalesce(b.desligado_em, now()) where b.user_id = p_uid and b.desligado_em is null;
  get diagnostics v_robos = row_count;
  return jsonb_build_object('app', 'moneytrio', 'registros_esvaziados', v_esvaziados, 'carimbos_limpos', v_carimbos,
                            'caixa_esvaziada', v_caixa, 'robos_desligados', v_robos);
end $$;

-- -------------------------------------------------------------------------------------
-- 6) Permissões (GRANTs explícitos). Visitante (anon) não toca em nada.
-- -------------------------------------------------------------------------------------
revoke all on public.money_robos from public, anon, authenticated;
grant select on public.money_robos to authenticated;
grant select, insert, update, delete on public.money_robos to service_role;

revoke all on public.money_caixa_chave from public, anon, authenticated;
grant select, insert, update on public.money_caixa_chave to authenticated;
grant select, insert, update, delete on public.money_caixa_chave to service_role;

revoke all on public.money_entrada from public, anon, authenticated;
grant select on public.money_entrada to authenticated;
grant select, insert, update, delete on public.money_entrada to service_role;

revoke all on function public.money_sou_robo(uuid) from public, anon;
grant execute on function public.money_sou_robo(uuid) to authenticated, service_role;

revoke all on function public.money_robo_autorizar(uuid, text, text) from public, anon;
grant execute on function public.money_robo_autorizar(uuid, text, text) to authenticated, service_role;

revoke all on function public.money_robo_desligar(uuid, uuid) from public, anon;
grant execute on function public.money_robo_desligar(uuid, uuid) to authenticated, service_role;

revoke all on function public.money_robo_depositar(uuid, jsonb) from public, anon;
grant execute on function public.money_robo_depositar(uuid, jsonb) to authenticated, service_role;

revoke all on function public.money_entrada_consumir(uuid, text[]) from public, anon;
grant execute on function public.money_entrada_consumir(uuid, text[]) to authenticated, service_role;

-- gatilho: o app não chama direto; só o servidor
revoke all on function public.money_tg_caixa_chave() from public, anon, authenticated;
grant execute on function public.money_tg_caixa_chave() to service_role;

-- LGPD: só o servidor (mesma regra do v1)
revoke all on function public.money_anonimizar(uuid) from public, anon, authenticated;
grant execute on function public.money_anonimizar(uuid) to service_role;

-- -------------------------------------------------------------------------------------
-- 7) Conferência
-- -------------------------------------------------------------------------------------
do $$
declare v_erros text := ''; t text;
begin
  foreach t in array array['money_robos', 'money_caixa_chave', 'money_entrada'] loop
    if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = ('public.' || t)::regclass) then
      v_erros := v_erros || ' ' || t || ' sem RLS';
    end if;
    if has_table_privilege('anon', 'public.' || t, 'select') or has_table_privilege('anon', 'public.' || t, 'insert') then
      v_erros := v_erros || ' anon com acesso a ' || t;
    end if;
    if has_table_privilege('authenticated', 'public.' || t, 'delete') then
      v_erros := v_erros || ' authenticated pode apagar ' || t;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'public.money_entrada', 'insert') or has_table_privilege('authenticated', 'public.money_entrada', 'update')
     or has_table_privilege('authenticated', 'public.money_robos', 'insert') or has_table_privilege('authenticated', 'public.money_robos', 'update') then
    v_erros := v_erros || ' caixa ou robôs graváveis direto (deveria ser só pelas funções)';
  end if;
  if (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'public'
       and p.tablename in ('money_robos', 'money_caixa_chave', 'money_entrada')) <> 5 then
    v_erros := v_erros || ' regras de acesso diferentes de 5';
  end if;
  if has_function_privilege('anon', 'public.money_robo_depositar(uuid, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.money_robo_autorizar(uuid, text, text)', 'execute')
     or has_function_privilege('authenticated', 'public.money_anonimizar(uuid)', 'execute') then
    v_erros := v_erros || ' função aberta demais';
  end if;
  if v_erros <> '' then raise exception 'MoneyTRIO v2: conferência falhou:%', v_erros; end if;
  raise notice 'MoneyTRIO v2: caixa do robô com RLS, sem acesso para visitante, ninguém apaga pelo app. Tudo certo.';
end $$;

commit;

-- Tabelinha para conferir na tela (só leitura). Esperado: as 5 linhas com "sim".
select 'caixa do robô com regras de acesso ligadas (3 tabelas)' as conferencia,
       case when (select bool_and(c.relrowsecurity) from pg_catalog.pg_class c
                   where c.oid in ('public.money_robos'::regclass, 'public.money_caixa_chave'::regclass, 'public.money_entrada'::regclass))
            then 'sim' else 'NÃO' end as ok
union all select 'regras de acesso criadas (5)',
       case when (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'public'
                   and p.tablename in ('money_robos', 'money_caixa_chave', 'money_entrada')) = 5 then 'sim' else 'NÃO' end
union all select 'visitante sem acesso à caixa',
       case when not has_table_privilege('anon', 'public.money_entrada', 'select')
             and not has_function_privilege('anon', 'public.money_robo_depositar(uuid, jsonb)', 'execute') then 'sim' else 'NÃO' end
union all select 'ninguém apaga pelo app',
       case when not has_table_privilege('authenticated', 'public.money_entrada', 'delete')
             and not has_table_privilege('authenticated', 'public.money_robos', 'delete') then 'sim' else 'NÃO' end
union all select 'robô só deposita pela função (não grava direto)',
       case when not has_table_privilege('authenticated', 'public.money_entrada', 'insert') then 'sim' else 'NÃO' end;
