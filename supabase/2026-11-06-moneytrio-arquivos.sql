-- =====================================================================================
-- MoneyTRIO v4 — ARQUIVOS DA FAMÍLIA NO STORAGE (N40: notas fiscais e pasta do IR)
-- Projeto Supabase: solverone-app (São Paulo)
--
-- !!! NÃO RODAR ANTES DA REVISÃO (regra C10) E DO "PODE APLICAR" DO DONO.
--     Depois, rodar UMA vez no SQL Editor. É idempotente: rodar de novo não estraga nada nem duplica.
--
-- O que faz:
--   * Cria o bucket PRIVADO 'money-arquivos' (até 15 MB por arquivo; só 'application/octet-stream', porque o app
--     sobe os bytes JÁ FECHADOS com a chave da família — o Supabase nunca vê o PDF aberto).
--   * Caminho de cada arquivo: '<grupo_id>/<id do arquivo>'. Regras (RLS em storage.objects):
--       - ler e subir: só chefe/responsável da família (money_posso_ver, a mesma regra do money_docs);
--       - mudar e apagar: ninguém pelo app (arquivo novo = id novo).
--   * A descrição de cada arquivo (nome, ano, tipo) fica no money_docs, fechada, na coleção 'arquivos'.
--   * Sem este SQL, o app guarda os arquivos só no aparelho e sobe sozinho depois de aplicado.
--
-- Depende da BASE COMUM, do MoneyTRIO v1 (money_posso_ver) e do Storage do Supabase.
-- Regras de escrita: SECURITY DEFINER + SET search_path = '' + nomes qualificados; GRANTs explícitos; conferência.
-- =====================================================================================

begin;
set local client_min_messages = warning;

-- 0) Porteiro
do $$
declare v_falta text := '';
begin
  if to_regclass('storage.buckets') is null then v_falta := v_falta || ' storage.buckets'; end if;
  if to_regclass('storage.objects') is null then v_falta := v_falta || ' storage.objects'; end if;
  if to_regprocedure('public.money_posso_ver(uuid)') is null then v_falta := v_falta || ' money_posso_ver(uuid) (MoneyTRIO v1)'; end if;
  if v_falta <> '' then raise exception 'MoneyTRIO v4: falta:%.', v_falta; end if;
end $$;

-- 1) O bucket (privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('money-arquivos', 'money-arquivos', false, 15728640, array['application/octet-stream'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2) De que família é um caminho '<grupo_id>/<id>'? (null se o caminho não está nesse formato)
create or replace function public.money_arquivo_grupo(p_nome text) returns uuid
language sql immutable set search_path = '' as $$
  select case when p_nome ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9_-]{6,80}$'
              then split_part(p_nome, '/', 1)::uuid end;
$$;

-- a pessoa pode mexer nos arquivos deste caminho? (chefe/responsável da família do caminho)
create or replace function public.money_arquivo_posso(p_nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.money_posso_ver(public.money_arquivo_grupo(p_nome)), false);
$$;

-- 3) Regras de acesso (o RLS de storage.objects já vem ligado no Supabase)
drop policy if exists money_arquivos_ler on storage.objects;
create policy money_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'money-arquivos' and public.money_arquivo_posso(name));
drop policy if exists money_arquivos_subir on storage.objects;
create policy money_arquivos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'money-arquivos' and public.money_arquivo_posso(name));
-- (sem regra de update/delete para este bucket: ninguém muda nem apaga pelo app)

-- 4) Permissões
revoke all on function public.money_arquivo_grupo(text) from public, anon;
grant execute on function public.money_arquivo_grupo(text) to authenticated, service_role;
revoke all on function public.money_arquivo_posso(text) from public, anon;
grant execute on function public.money_arquivo_posso(text) to authenticated, service_role;

-- 5) Conferência
do $$
declare v_erros text := '';
begin
  if not exists (select 1 from storage.buckets b where b.id = 'money-arquivos' and b.public = false) then
    v_erros := v_erros || ' bucket ausente ou público';
  end if;
  if (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'storage' and p.tablename = 'objects'
       and p.policyname in ('money_arquivos_ler', 'money_arquivos_subir')) <> 2 then
    v_erros := v_erros || ' regras de acesso diferentes de 2';
  end if;
  if exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'storage' and p.tablename = 'objects'
              and p.cmd in ('UPDATE', 'DELETE', 'ALL') and (p.qual like '%money-arquivos%' or p.with_check like '%money-arquivos%')) then
    v_erros := v_erros || ' regra que deixa mudar ou apagar arquivo da família';
  end if;
  if has_function_privilege('anon', 'public.money_arquivo_posso(text)', 'execute') then
    v_erros := v_erros || ' função aberta para visitante';
  end if;
  if v_erros <> '' then raise exception 'MoneyTRIO v4: conferência falhou:%', v_erros; end if;
  raise notice 'MoneyTRIO v4: bucket money-arquivos privado, só a família lê e sobe, ninguém apaga pelo app. Tudo certo.';
end $$;

commit;

-- Tabelinha para conferir na tela (só leitura). Esperado: as 3 linhas com "sim".
select 'bucket money-arquivos privado' as conferencia,
       case when exists (select 1 from storage.buckets b where b.id = 'money-arquivos' and b.public = false) then 'sim' else 'NÃO' end as ok
union all select 'regras de ler e subir (2)',
       case when (select count(*) from pg_catalog.pg_policies p where p.schemaname = 'storage' and p.tablename = 'objects'
                   and p.policyname in ('money_arquivos_ler', 'money_arquivos_subir')) = 2 then 'sim' else 'NÃO' end
union all select 'visitante sem acesso',
       case when not has_function_privilege('anon', 'public.money_arquivo_posso(text)', 'execute') then 'sim' else 'NÃO' end;
