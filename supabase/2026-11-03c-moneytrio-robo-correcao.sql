-- =====================================================================================
-- MoneyTRIO v3 — CORREÇÃO DO ROBÔ ATUALIZA A CAIXA (N24), sobre o v2 (2026-11-03b-moneytrio-caixa-robo.sql)
-- Projeto Supabase: solverone-app (São Paulo)
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- O que muda:
--   * money_entrada ganha duas colunas:
--       impressao  text     — "impressão digital" do lançamento ABERTO que o robô mandou (um hash, ex.: sha256 em
--                             base64url). O banco continua sem ver o lançamento: só compara se a impressão mudou.
--       versao     integer  — começa em 1 e soma 1 a cada correção que o robô manda.
--   * money_robo_depositar passa a aceitar "impressao" em cada item e, para um id que JÁ está na caixa:
--       - impressão IGUAL (ou não mandada): não faz nada (como antes);
--       - impressão DIFERENTE: troca o pacote, zera consumido_em (volta a esperar o app), soma 1 na versão;
--       - linha antiga SEM impressão (depositada antes desta versão): só guarda a impressão, sem reabrir
--         (senão o primeiro reenvio do robô reabriria a caixa inteira);
--       - pacote apagado pela LGPD (pacote nulo): nunca volta.
--     Devolve quantos itens entraram ou foram corrigidos.
--   * O app (MoneyTRIO 3.39+) ao aproveitar um item cujo lançamento já existe: atualiza o lançamento, a não ser
--     que a pessoa tenha editado esse lançamento no app (a edição da pessoa vence; o app marca "o robô sugeriu
--     outra coisa" para ela decidir).
--
-- Depende do v2. Se faltar algo, para logo no começo e NADA é mudado.
-- Regras de escrita: SECURITY DEFINER + SET search_path = '' + nomes qualificados; GRANTs explícitos no mesmo
-- arquivo; nada de DELETE pelo app; conferência no fim.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- -------------------------------------------------------------------------------------
-- 0) Porteiro: o v2 (caixa do robô) existe?
-- -------------------------------------------------------------------------------------
do $$
declare v_falta text := '';
begin
  if to_regclass('public.money_entrada') is null then v_falta := v_falta || ' money_entrada'; end if;
  if to_regclass('public.money_robos') is null then v_falta := v_falta || ' money_robos'; end if;
  if to_regprocedure('public.money_robo_depositar(uuid, jsonb)') is null then v_falta := v_falta || ' money_robo_depositar(uuid, jsonb)'; end if;
  if to_regprocedure('public.money_sou_robo(uuid)') is null then v_falta := v_falta || ' money_sou_robo(uuid)'; end if;
  if to_regprocedure('public.money_posso_ver(uuid)') is null then v_falta := v_falta || ' money_posso_ver(uuid)'; end if;
  if v_falta <> '' then
    raise exception 'MoneyTRIO v3: falta:%. Rode antes o 2026-11-03b-moneytrio-caixa-robo.sql.', v_falta;
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 1) As colunas novas
-- -------------------------------------------------------------------------------------
alter table public.money_entrada add column if not exists impressao text;
alter table public.money_entrada add column if not exists versao integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint c
                  where c.conrelid = 'public.money_entrada'::regclass and c.conname = 'money_entrada_impressao') then
    alter table public.money_entrada add constraint money_entrada_impressao
      check (impressao is null or impressao ~ '^[A-Za-z0-9_+/=:-]{8,128}$');
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint c
                  where c.conrelid = 'public.money_entrada'::regclass and c.conname = 'money_entrada_versao') then
    alter table public.money_entrada add constraint money_entrada_versao check (versao >= 1);
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 2) O depósito agora entende a correção
--    p_itens = [{"id": "...", "pacote": "{\"v\":1,…}", "origem": "pluggy", "impressao": "…"}, …] (até 500 por vez)
-- -------------------------------------------------------------------------------------
create or replace function public.money_robo_depositar(p_grupo uuid, p_itens jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer := 0; v_i integer := 0; v_item jsonb; v_id text; v_pac text; v_org text; v_imp text; v_p jsonb; v_pend bigint;
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
    v_id := v_item->>'id'; v_pac := v_item->>'pacote'; v_org := nullif(v_item->>'origem', ''); v_imp := nullif(v_item->>'impressao', '');
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
    if v_imp is not null and v_imp !~ '^[A-Za-z0-9_+/=:-]{8,128}$' then
      raise exception 'Item %: impressao inválida (8 a 128 letras, números e _ + / = : -).', v_i using errcode = '22023';
    end if;
    if v_org is not null and length(v_org) > 60 then v_org := left(v_org, 60); end if;

    insert into public.money_entrada (grupo_id, id, pacote, origem, impressao)
    values (p_grupo, v_id, v_pac, v_org, v_imp)
    on conflict (grupo_id, id) do nothing;
    if found then v_n := v_n + 1; continue; end if;

    -- já estava na caixa
    if v_imp is null then continue; end if;                                   -- sem impressão: como antes
    update public.money_entrada e
       set pacote = v_pac, origem = coalesce(v_org, e.origem), impressao = v_imp,
           consumido_em = null, versao = e.versao + 1
     where e.grupo_id = p_grupo and e.id = v_id
       and e.pacote is not null                                               -- LGPD: o que foi apagado não volta
       and e.impressao is not null and e.impressao <> v_imp;                  -- só quando o lançamento mudou
    if found then v_n := v_n + 1; continue; end if;
    -- linha antiga, depositada antes desta versão: aprende a impressão sem reabrir
    update public.money_entrada e set impressao = v_imp
     where e.grupo_id = p_grupo and e.id = v_id and e.pacote is not null and e.impressao is null;
  end loop;
  return v_n;
end $$;

-- -------------------------------------------------------------------------------------
-- 3) Permissões (GRANTs explícitos, os mesmos do v2). Visitante (anon) não toca em nada.
-- -------------------------------------------------------------------------------------
revoke all on public.money_entrada from public, anon, authenticated;
grant select on public.money_entrada to authenticated;
grant select, insert, update, delete on public.money_entrada to service_role;

revoke all on function public.money_robo_depositar(uuid, jsonb) from public, anon;
grant execute on function public.money_robo_depositar(uuid, jsonb) to authenticated, service_role;

-- -------------------------------------------------------------------------------------
-- 4) Conferência
-- -------------------------------------------------------------------------------------
do $$
declare v_erros text := '';
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'money_entrada' and column_name = 'impressao') then
    v_erros := v_erros || ' sem a coluna impressao';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'money_entrada' and column_name = 'versao') then
    v_erros := v_erros || ' sem a coluna versao';
  end if;
  if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.money_entrada'::regclass) then
    v_erros := v_erros || ' money_entrada sem RLS';
  end if;
  if has_table_privilege('anon', 'public.money_entrada', 'select')
     or has_table_privilege('authenticated', 'public.money_entrada', 'insert')
     or has_table_privilege('authenticated', 'public.money_entrada', 'update')
     or has_table_privilege('authenticated', 'public.money_entrada', 'delete') then
    v_erros := v_erros || ' caixa aberta demais';
  end if;
  if has_function_privilege('anon', 'public.money_robo_depositar(uuid, jsonb)', 'execute')
     or not has_function_privilege('authenticated', 'public.money_robo_depositar(uuid, jsonb)', 'execute') then
    v_erros := v_erros || ' permissão do depósito errada';
  end if;
  if v_erros <> '' then raise exception 'MoneyTRIO v3: conferência falhou:%', v_erros; end if;
  raise notice 'MoneyTRIO v3: a caixa aceita correções do robô (impressao + versao). Tudo certo.';
end $$;

commit;

-- Tabelinha para conferir na tela (só leitura). Esperado: as 4 linhas com "sim".
select 'coluna impressao na caixa' as conferencia,
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'money_entrada' and column_name = 'impressao') then 'sim' else 'NÃO' end as ok
union all select 'coluna versao na caixa',
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'money_entrada' and column_name = 'versao') then 'sim' else 'NÃO' end
union all select 'visitante sem acesso à caixa',
       case when not has_table_privilege('anon', 'public.money_entrada', 'select')
             and not has_function_privilege('anon', 'public.money_robo_depositar(uuid, jsonb)', 'execute') then 'sim' else 'NÃO' end
union all select 'robô só deposita pela função (não grava direto)',
       case when not has_table_privilege('authenticated', 'public.money_entrada', 'insert')
             and not has_table_privilege('authenticated', 'public.money_entrada', 'update') then 'sim' else 'NÃO' end;
