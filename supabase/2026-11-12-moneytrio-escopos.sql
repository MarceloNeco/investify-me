-- =====================================================================================
-- MoneyTRIO v4 — "visão da casa" (dois cofres): escopo casa | reservado, visão por pessoa, chaves do MoneyTRIO, duas caixas
-- Desenho: DESENHO-visao-da-casa.md (aprovado pela sessão principal e pelo dono, 11/Nov/2026).
--
-- !!! NÃO RODAR ANTES DO "PODE APLICAR". Rodar UMA vez no SQL Editor, DEPOIS dos SQLs anteriores do MoneyTRIO
--     (v1, caixa do robô, correção do robô, arquivos, espelho). É idempotente: rodar de novo não estraga nem duplica.
--     O app de hoje continua funcionando com este SQL aplicado (tudo nasce 'casa' e quem já via tudo continua vendo tudo).
--
-- O que muda:
--   * money_docs ganha escopo ('casa' | 'reservado'); reservado ⇔ id começa com "r." (a chave primária não muda).
--   * money_visao: quem vê o quê. Chefe = 'tudo' sempre; responsável = 'tudo' (como hoje) se o chefe não disser outra coisa;
--     outro membro só com uma linha do chefe ('casa'). money_posso_ver passa a ser "vê tudo" (o robô, o espelho, a caixa
--     reservada e o resto seguem só para quem vê tudo).
--   * money_docs: quem tem visão 'casa' lê e grava SÓ escopo casa. As linhas reservadas nem chegam ao aparelho dele.
--   * money_chaves: as chaves do MoneyTRIO (CC da casa, CR reservada), embrulhadas (RSA-OAEP) para cada pessoa. Cada um lê as
--     suas. Só quem vê tudo guarda; a CR só para quem vê tudo.
--   * Caixa do robô por escopo: money_caixa_chave (uma chave pública por escopo) e money_entrada.escopo. Sem o campo, o
--     depósito vale 'reservado' (seguro por padrão).
--   * money_reservar_apagar: apagar DE VERDADE (sem rastro) linhas "r." e, só antes de existir alguém com visão casa, as
--     cópias antigas (migração).
--   * Comprovantes reservados: "<grupo>/r/<id>" só para quem vê tudo; só quem vê tudo apaga um comprovante (a migração tira as
--     cópias antigas, fechadas com a CF).
-- =====================================================================================

begin;
set local client_min_messages = warning;

do $$
declare v_falta text := '';
begin
  if to_regclass('public.money_docs') is null then v_falta := v_falta || ' money_docs (v1)'; end if;
  if to_regclass('public.money_entrada') is null then v_falta := v_falta || ' money_entrada (caixa do robô)'; end if;
  if to_regclass('public.money_caixa_chave') is null then v_falta := v_falta || ' money_caixa_chave (caixa do robô)'; end if;
  if to_regprocedure('public.money_arquivo_grupo(text)') is null then v_falta := v_falta || ' money_arquivo_grupo (arquivos)'; end if;
  if to_regprocedure('public.money_robo_depositar(uuid, jsonb)') is null then v_falta := v_falta || ' money_robo_depositar'; end if;
  if to_regclass('public.sol_chave_publica') is null then v_falta := v_falta || ' sol_chave_publica (base)'; end if;
  if v_falta <> '' then raise exception 'MoneyTRIO v4: falta:%. Rode antes os SQLs anteriores.', v_falta; end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 1) Quem vê o quê
-- -------------------------------------------------------------------------------------
create table if not exists public.money_visao (
  grupo_id      uuid not null references public.sol_grupos(id),
  user_id       uuid not null references auth.users(id),
  visao         text not null check (visao in ('tudo', 'casa')),
  definido_por  uuid references auth.users(id),
  definido_em   timestamptz not null default now(),
  primary key (grupo_id, user_id)
);
alter table public.money_visao enable row level security;

-- 'tudo' | 'casa' | null (não vê nada do MoneyTRIO)
create or replace function public.money_visao(p_grupo uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when public.sol_meu_papel(p_grupo) = 'chefe' then 'tudo'
    when (select v.visao from public.money_visao v where v.grupo_id = p_grupo and v.user_id = (select auth.uid())) is not null
      then (select v.visao from public.money_visao v where v.grupo_id = p_grupo and v.user_id = (select auth.uid()))
    when public.sol_meu_papel(p_grupo) = 'responsavel' then 'tudo'
    else null end;
$$;
create or replace function public.money_vejo_tudo(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select coalesce(public.money_visao(p_grupo) = 'tudo', false); $$;
create or replace function public.money_vejo_casa(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select public.money_visao(p_grupo) is not null; $$;

-- tudo o que já usava money_posso_ver (robô, caixa, espelho, arquivos de antes) passa a ser só de quem vê tudo
create or replace function public.money_posso_ver(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select public.money_vejo_tudo(p_grupo); $$;

-- o chefe define a visão de um membro (nunca a dele: o chefe vê tudo sempre)
create or replace function public.money_visao_definir(p_grupo uuid, p_user uuid, p_visao text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if public.sol_meu_papel(p_grupo) is distinct from 'chefe' then
    raise exception 'Só o chefe da família define quem vê o quê no MoneyTRIO.' using errcode = '42501';
  end if;
  if p_visao not in ('tudo', 'casa') then raise exception 'Visão: tudo ou casa.' using errcode = '22023'; end if;
  if not exists (select 1 from public.sol_grupo_membros m where m.grupo_id = p_grupo and m.user_id = p_user and m.status = 'ativo') then
    raise exception 'Essa pessoa não é membro ativo da família.' using errcode = '22023';
  end if;
  if exists (select 1 from public.sol_grupo_membros m where m.grupo_id = p_grupo and m.user_id = p_user and m.papel = 'chefe') then
    raise exception 'O chefe vê tudo sempre.' using errcode = '22023';
  end if;
  insert into public.money_visao (grupo_id, user_id, visao, definido_por) values (p_grupo, p_user, p_visao, (select auth.uid()))
  on conflict (grupo_id, user_id) do update set visao = excluded.visao, definido_por = excluded.definido_por, definido_em = now();
  return true;
end $$;

-- a lista para a tela do chefe ("Família no MoneyTRIO")
create or replace function public.money_visoes(p_grupo uuid) returns table (user_id uuid, papel text, visao text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.papel,
         case when m.papel = 'chefe' then 'tudo'
              else coalesce((select v.visao from public.money_visao v where v.grupo_id = p_grupo and v.user_id = m.user_id),
                            case when m.papel = 'responsavel' then 'tudo' end) end
    from public.sol_grupo_membros m
   where m.grupo_id = p_grupo and m.status = 'ativo' and m.user_id is not null and public.money_vejo_tudo(p_grupo);
$$;

drop policy if exists money_visao_ler on public.money_visao;
create policy money_visao_ler on public.money_visao for select to authenticated
  using (user_id = (select auth.uid()) or public.money_vejo_tudo(grupo_id));
-- gravar: só pela função

-- -------------------------------------------------------------------------------------
-- 2) Escopo de cada registro
-- -------------------------------------------------------------------------------------
alter table public.money_docs add column if not exists escopo text not null default 'casa';
do $$ begin
  if not exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'public.money_docs'::regclass and c.conname = 'money_docs_escopo') then
    alter table public.money_docs add constraint money_docs_escopo check (escopo in ('casa', 'reservado') and ((escopo = 'reservado') = (id like 'r.%')));
  end if;
end $$;

drop policy if exists money_docs_ler on public.money_docs;
create policy money_docs_ler on public.money_docs for select to authenticated
  using (public.money_vejo_tudo(grupo_id) or (escopo = 'casa' and public.money_vejo_casa(grupo_id)));
drop policy if exists money_docs_criar on public.money_docs;
create policy money_docs_criar on public.money_docs for insert to authenticated
  with check (public.money_vejo_tudo(grupo_id) or (escopo = 'casa' and public.money_vejo_casa(grupo_id)));
drop policy if exists money_docs_mudar on public.money_docs;
create policy money_docs_mudar on public.money_docs for update to authenticated
  using (public.money_vejo_tudo(grupo_id) or (escopo = 'casa' and public.money_vejo_casa(grupo_id)))
  with check (public.money_vejo_tudo(grupo_id) or (escopo = 'casa' and public.money_vejo_casa(grupo_id)));

-- apagar DE VERDADE: as linhas "r." (quem vê só a casa nunca as viu) e, enquanto ninguém tem visão casa, as cópias antigas
-- de casa (a migração: o registro foi refeito como "r."). Devolve quantas saíram.
create or replace function public.money_reservar_apagar(p_grupo uuid, p_colecao text, p_ids text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if not public.money_vejo_tudo(p_grupo) then raise exception 'Só quem vê tudo.' using errcode = '42501'; end if;
  if p_ids is null or array_length(p_ids, 1) is null then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'No máximo 500 por vez.' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_ids) i where i not like 'r.%')
     and exists (select 1 from public.money_visao v where v.grupo_id = p_grupo and v.visao = 'casa') then
    raise exception 'Já existe alguém com visão da casa: o que era da casa sai pelo jeito normal (apagado_em).' using errcode = '42501';
  end if;
  delete from public.money_docs d where d.grupo_id = p_grupo and d.colecao = p_colecao and d.id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- recifrar em lote (a migração: cada linha da casa passa da CF para a CC). Só quem vê tudo; trava otimista por versão.
-- p_itens = [{"colecao": "...", "id": "...", "versao": 3, "dados": "..."}] (até 200). Devolve as que mudaram (colecao, id, versao nova).
create or replace function public.money_docs_recifrar(p_grupo uuid, p_itens jsonb)
returns table (colecao text, id text, versao bigint) language plpgsql security definer set search_path = '' as $$
declare v_item jsonb;
begin
  if not public.money_vejo_tudo(p_grupo) then raise exception 'Só quem vê tudo.' using errcode = '42501'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then raise exception 'p_itens: lista.' using errcode = '22023'; end if;
  if jsonb_array_length(p_itens) > 200 then raise exception 'No máximo 200 por vez.' using errcode = '22023'; end if;
  for v_item in select x from jsonb_array_elements(p_itens) as t(x) loop
    if length(coalesce(v_item->>'dados', '')) < 16 then raise exception 'Item sem dados.' using errcode = '22023'; end if;
    return query
      update public.money_docs d set dados_cifrado = v_item->>'dados'
       where d.grupo_id = p_grupo and d.colecao = v_item->>'colecao' and d.id = v_item->>'id'
         and d.versao = (v_item->>'versao')::bigint and d.apagado_em is null
      returning d.colecao, d.id, d.versao;
  end loop;
end $$;

-- -------------------------------------------------------------------------------------
-- 3) As chaves do MoneyTRIO (CC da casa, CR reservada), embrulhadas para cada pessoa
-- -------------------------------------------------------------------------------------
create table if not exists public.money_chaves (
  grupo_id        uuid not null references public.sol_grupos(id),
  user_id         uuid not null references auth.users(id),
  escopo          text not null check (escopo in ('casa', 'reservado')),
  versao          integer not null check (versao >= 1),
  embrulhada      text not null check (length(embrulhada) between 64 and 4000),
  embrulhada_por  uuid references auth.users(id),
  criado_em       timestamptz not null default now(),
  primary key (grupo_id, user_id, escopo, versao)
);
alter table public.money_chaves enable row level security;
drop policy if exists money_chaves_minhas on public.money_chaves;
create policy money_chaves_minhas on public.money_chaves for select to authenticated
  using (user_id = (select auth.uid()) and (escopo = 'casa' and public.money_vejo_casa(grupo_id) or public.money_vejo_tudo(grupo_id)));

create or replace function public.money_chave_guardar(p_grupo uuid, p_user uuid, p_escopo text, p_versao integer, p_embrulhada text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_dela text;
begin
  if not public.money_vejo_tudo(p_grupo) then raise exception 'Só quem vê tudo guarda as chaves do MoneyTRIO.' using errcode = '42501'; end if;
  if p_escopo not in ('casa', 'reservado') then raise exception 'Escopo: casa ou reservado.' using errcode = '22023'; end if;
  if not exists (select 1 from public.sol_grupo_membros m where m.grupo_id = p_grupo and m.user_id = p_user and m.status = 'ativo') then
    raise exception 'Essa pessoa não é membro ativo da família.' using errcode = '22023';
  end if;
  select case when m.papel = 'chefe' then 'tudo'
              else coalesce((select v.visao from public.money_visao v where v.grupo_id = p_grupo and v.user_id = p_user),
                            case when m.papel = 'responsavel' then 'tudo' end) end
    into v_dela from public.sol_grupo_membros m where m.grupo_id = p_grupo and m.user_id = p_user and m.status = 'ativo';
  if v_dela is null then raise exception 'Essa pessoa ainda não tem visão no MoneyTRIO.' using errcode = '42501'; end if;
  if p_escopo = 'reservado' and v_dela <> 'tudo' then
    raise exception 'A chave reservada só vai para quem vê tudo.' using errcode = '42501';
  end if;
  insert into public.money_chaves (grupo_id, user_id, escopo, versao, embrulhada, embrulhada_por)
  values (p_grupo, p_user, p_escopo, p_versao, p_embrulhada, (select auth.uid()))
  on conflict do nothing;
  return found;
end $$;

-- depois que a família tem as chaves do MoneyTRIO (a migração), o banco só aceita registro fechado com elas
-- ('{"c":1,"m":…'): um aparelho ou app antigo nunca mais grava nada fechado com a CF (que o membro "casa" também tem)
create or replace function public.money_docs_so_chave_nova() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.dados_cifrado is not null and new.dados_cifrado not like '{"c":1,"m":%'
     and exists (select 1 from public.money_chaves k where k.grupo_id = new.grupo_id) then
    raise exception 'Este aparelho precisa das chaves novas do MoneyTRIO: abra pelo PIN.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists money_docs_so_chave_nova on public.money_docs;
create trigger money_docs_so_chave_nova before insert or update of dados_cifrado on public.money_docs
  for each row execute function public.money_docs_so_chave_nova();
revoke all on function public.money_docs_so_chave_nova() from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 4) A caixa do robô por escopo
-- -------------------------------------------------------------------------------------
alter table public.money_caixa_chave add column if not exists escopo text not null default 'reservado';
do $$ begin
  if not exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'public.money_caixa_chave'::regclass and c.conname = 'money_caixa_chave_escopo') then
    alter table public.money_caixa_chave add constraint money_caixa_chave_escopo check (escopo in ('casa', 'reservado'));
  end if;
  if exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'public.money_caixa_chave'::regclass and c.conname = 'money_caixa_chave_pkey'
              and pg_catalog.array_length(c.conkey, 1) = 1) then
    alter table public.money_caixa_chave drop constraint money_caixa_chave_pkey;
    alter table public.money_caixa_chave add constraint money_caixa_chave_pkey primary key (grupo_id, escopo);
  end if;
end $$;
-- a chave pública da casa pode ser gravada por quem vê só a casa? Não: só quem vê tudo cria as chaves (a migração).
alter table public.money_entrada add column if not exists escopo text not null default 'reservado';
do $$ begin
  if not exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'public.money_entrada'::regclass and c.conname = 'money_entrada_escopo') then
    alter table public.money_entrada add constraint money_entrada_escopo check (escopo in ('casa', 'reservado'));
  end if;
end $$;
drop policy if exists money_entrada_ler on public.money_entrada;
create policy money_entrada_ler on public.money_entrada for select to authenticated
  using (public.money_vejo_tudo(grupo_id) or (escopo = 'casa' and public.money_vejo_casa(grupo_id)));

create or replace function public.money_entrada_consumir(p_grupo uuid, p_ids text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if not public.money_vejo_casa(p_grupo) then
    raise exception 'Só quem vê o MoneyTRIO da família mexe na caixa.' using errcode = '42501';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'No máximo 500 por vez.' using errcode = '22023'; end if;
  update public.money_entrada e set consumido_em = now()
   where e.grupo_id = p_grupo and e.id = any(p_ids) and e.consumido_em is null
     and (public.money_vejo_tudo(p_grupo) or e.escopo = 'casa');
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- o depósito do robô: cada item pode trazer "escopo" ('casa' | 'reservado'); sem ele, 'reservado'. Repetir o mesmo id com
-- outro escopo move o item (o que estava fechado para a outra chave sai e entra o novo).
create or replace function public.money_robo_depositar(p_grupo uuid, p_itens jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer := 0; v_i integer := 0; v_item jsonb; v_id text; v_pac text; v_org text; v_imp text; v_esc text; v_p jsonb; v_pend bigint;
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
    v_esc := coalesce(nullif(v_item->>'escopo', ''), 'reservado');
    if v_esc not in ('casa', 'reservado') then raise exception 'Item %: escopo é casa ou reservado.', v_i using errcode = '22023'; end if;
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

    insert into public.money_entrada (grupo_id, id, pacote, origem, impressao, escopo)
    values (p_grupo, v_id, v_pac, v_org, v_imp, v_esc)
    on conflict (grupo_id, id) do nothing;
    if found then v_n := v_n + 1; continue; end if;

    -- já estava na caixa: mudou o escopo → o pacote novo (fechado para a outra chave) entra no lugar
    update public.money_entrada e
       set pacote = v_pac, origem = coalesce(v_org, e.origem), impressao = coalesce(v_imp, e.impressao), escopo = v_esc,
           consumido_em = null, versao = e.versao + 1
     where e.grupo_id = p_grupo and e.id = v_id and e.pacote is not null and e.escopo <> v_esc;
    if found then v_n := v_n + 1; continue; end if;
    if v_imp is null then continue; end if;                                   -- sem impressão: como antes
    update public.money_entrada e
       set pacote = v_pac, origem = coalesce(v_org, e.origem), impressao = v_imp,
           consumido_em = null, versao = e.versao + 1
     where e.grupo_id = p_grupo and e.id = v_id
       and e.pacote is not null                                               -- LGPD: o que foi apagado não volta
       and e.impressao is not null and e.impressao <> v_imp;                  -- só quando o lançamento mudou
    if found then v_n := v_n + 1; continue; end if;
    update public.money_entrada e set impressao = v_imp
     where e.grupo_id = p_grupo and e.id = v_id and e.pacote is not null and e.impressao is null;
  end loop;
  return v_n;
end $$;

-- os pacotes já aproveitados saem (a migração: o que foi fechado com a chave antiga da caixa não fica guardado)
create or replace function public.money_entrada_limpar(p_grupo uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if not public.money_vejo_tudo(p_grupo) then raise exception 'Só quem vê tudo.' using errcode = '42501'; end if;
  delete from public.money_entrada e where e.grupo_id = p_grupo and e.consumido_em is not null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- -------------------------------------------------------------------------------------
-- 5) Comprovantes: "<grupo>/r/<id>" só para quem vê tudo; os da casa, para quem vê a casa
-- -------------------------------------------------------------------------------------
create or replace function public.money_arquivo_grupo(p_nome text) returns uuid
language sql immutable set search_path = '' as $$
  select case when p_nome ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/(r/)?[A-Za-z0-9_-]{6,80}$'
              then split_part(p_nome, '/', 1)::uuid end;
$$;
create or replace function public.money_arquivo_posso(p_nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case when p_nome like '%/r/%' then coalesce(public.money_vejo_tudo(public.money_arquivo_grupo(p_nome)), false)
              else coalesce(public.money_vejo_casa(public.money_arquivo_grupo(p_nome)), false) end;
$$;
-- quem vê tudo apaga (a migração apaga as cópias antigas, fechadas com a CF, depois de guardá-las em "r/" com a chave reservada)
create or replace function public.money_arquivo_apagar_posso(p_nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.money_vejo_tudo(public.money_arquivo_grupo(p_nome)), false);
$$;
drop policy if exists money_arquivos_apagar on storage.objects;
create policy money_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'money-arquivos' and public.money_arquivo_apagar_posso(name));

-- -------------------------------------------------------------------------------------
-- 6) Permissões
-- -------------------------------------------------------------------------------------
revoke all on public.money_visao from public, anon;
grant select on public.money_visao to authenticated;
revoke all on public.money_chaves from public, anon;
grant select on public.money_chaves to authenticated;
do $$
declare f text;
begin
  foreach f in array array['money_visao(uuid)', 'money_vejo_tudo(uuid)', 'money_vejo_casa(uuid)', 'money_posso_ver(uuid)',
    'money_visao_definir(uuid, uuid, text)', 'money_visoes(uuid)', 'money_reservar_apagar(uuid, text, text[])',
    'money_chave_guardar(uuid, uuid, text, integer, text)', 'money_entrada_consumir(uuid, text[])', 'money_robo_depositar(uuid, jsonb)',
    'money_entrada_limpar(uuid)', 'money_arquivo_posso(text)', 'money_arquivo_apagar_posso(text)', 'money_arquivo_grupo(text)', 'money_docs_recifrar(uuid, jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- -------------------------------------------------------------------------------------
-- 7) Conferência
-- -------------------------------------------------------------------------------------
select 'money_docs.escopo' as item, exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'money_docs' and column_name = 'escopo') as ok
union all select 'money_visao', to_regclass('public.money_visao') is not null
union all select 'money_chaves', to_regclass('public.money_chaves') is not null
union all select 'money_entrada.escopo', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'money_entrada' and column_name = 'escopo')
union all select 'caixa por escopo', exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'public.money_caixa_chave'::regclass and c.conname = 'money_caixa_chave_pkey' and pg_catalog.array_length(c.conkey, 1) = 2)
union all select 'comprovantes: apagar só quem vê tudo', exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'money_arquivos_apagar')
union all select 'só chave nova depois da migração', exists (select 1 from pg_catalog.pg_trigger t where t.tgname = 'money_docs_so_chave_nova')
union all select 'RLS docs por escopo', exists (select 1 from pg_catalog.pg_policies p where p.tablename = 'money_docs' and p.policyname = 'money_docs_ler' and p.qual like '%escopo%');

commit;
