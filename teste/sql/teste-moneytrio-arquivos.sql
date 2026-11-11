-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-06-moneytrio-arquivos.sql. Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
INSERT INTO auth.users (id, email) VALUES
 ('a3000000-0000-0000-0000-000000000001','ana.a@x.com'), ('b3000000-0000-0000-0000-000000000001','bia.a@x.com'),
 ('c3000000-0000-0000-0000-000000000001','caio.a@x.com'), ('e3000000-0000-0000-0000-000000000001','zed.a@x.com')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT v::uuid FROM t WHERE k = 'g' $$;

SELECT pg_temp.ok((SELECT public FROM storage.buckets WHERE id = 'money-arquivos') = false, 'bucket money-arquivos existe e é privado');
SELECT pg_temp.ok(public.money_arquivo_grupo('a3000000-0000-0000-0000-000000000001/fabc123') IS NOT NULL, 'caminho <grupo>/<id> é entendido');
SELECT pg_temp.ok(public.money_arquivo_grupo('../x/y') IS NULL AND public.money_arquivo_grupo('nao-uuid/fabc123') IS NULL
  AND public.money_arquivo_grupo('a3000000-0000-0000-0000-000000000001/a/b') IS NULL, 'caminho fora do formato não vale');

SET ROLE authenticated;
SELECT pg_temp.quem('a3000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('g', public.sol_criar_grupo('Família Arquivos', 'familia', 'Ana'));
INSERT INTO t VALUES ('cv_r', public.sol_criar_convite(pg_temp.g(), 'responsavel', 7, 1));
INSERT INTO t VALUES ('cv_m', public.sol_criar_convite(pg_temp.g(), 'membro', 7, 1));
SELECT pg_temp.quem('b3000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_r'), 'Bia');
SELECT pg_temp.quem('c3000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_m'), 'Caio');
-- com o SQL v4 "escopos", só o chefe vê tudo sem linha: o chefe dá 'tudo' à responsável (como era antes)
SELECT pg_temp.quem('a3000000-0000-0000-0000-000000000001');
DO $$ BEGIN IF to_regprocedure('public.money_visao_definir(uuid,uuid,text)') IS NOT NULL THEN
  PERFORM public.money_visao_definir(pg_temp.g(), 'b3000000-0000-0000-0000-000000000001', 'tudo'); END IF; END $$;

-- chefe sobe
SELECT pg_temp.quem('a3000000-0000-0000-0000-000000000001');
INSERT INTO storage.objects (bucket_id, name) VALUES ('money-arquivos', pg_temp.g() || '/fnota0001');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'money-arquivos') = 1, 'chefe sobe e vê o arquivo da família');
-- responsável lê e sobe
SELECT pg_temp.quem('b3000000-0000-0000-0000-000000000001');
INSERT INTO storage.objects (bucket_id, name) VALUES ('money-arquivos', pg_temp.g() || '/fnota0002');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'money-arquivos') = 2, 'responsável sobe e vê');
-- membro comum e pessoa de fora não
SELECT pg_temp.quem('c3000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'money-arquivos') = 0, 'membro comum não vê os arquivos');
DO $$ BEGIN INSERT INTO storage.objects (bucket_id, name) VALUES ('money-arquivos', pg_temp.g() || '/fmembro01'); RAISE EXCEPTION 'FALHOU: membro subiu';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: membro comum não sobe'; END $$;
SELECT pg_temp.quem('e3000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'money-arquivos') = 0, 'pessoa de fora não vê');
DO $$ BEGIN INSERT INTO storage.objects (bucket_id, name) VALUES ('money-arquivos', pg_temp.g() || '/fintruso1'); RAISE EXCEPTION 'FALHOU: de fora subiu';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: pessoa de fora não sobe na pasta da família'; END $$;
-- caminho torto
SELECT pg_temp.quem('a3000000-0000-0000-0000-000000000001');
DO $$ BEGIN INSERT INTO storage.objects (bucket_id, name) VALUES ('money-arquivos', 'solto.pdf'); RAISE EXCEPTION 'FALHOU: caminho solto';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: arquivo fora de <grupo>/<id> é recusado'; END $$;
-- ninguém muda nem apaga
DO $$ BEGIN UPDATE storage.objects SET name = pg_temp.g() || '/foutro001' WHERE bucket_id = 'money-arquivos';
  IF FOUND THEN RAISE EXCEPTION 'FALHOU: mudou'; END IF; RAISE NOTICE 'ok: ninguém muda arquivo pelo app';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém muda arquivo pelo app'; END $$;
-- (com o SQL v4 "escopos", quem vê tudo apaga: a migração tira as cópias antigas; o apagar é desfeito aqui)
DO $$ BEGIN DELETE FROM storage.objects WHERE bucket_id = 'money-arquivos';
  IF FOUND AND to_regprocedure('public.money_arquivo_apagar_posso(text)') IS NULL THEN RAISE EXCEPTION 'FALHOU: apagou'; END IF;
  IF FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0009', MESSAGE = 'desfaz'; END IF;
  RAISE NOTICE 'ok: ninguém apaga arquivo pelo app';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém apaga arquivo pelo app';
  WHEN SQLSTATE 'P0009' THEN RAISE NOTICE 'ok: com o v4, quem vê tudo apaga (desfeito)'; END $$;
RESET ROLE; SET ROLE anon;
DO $$ BEGIN PERFORM public.money_arquivo_posso('x'); RAISE EXCEPTION 'FALHOU: anon chamou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: visitante não chama a função'; END $$;
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'money-arquivos') = 2, 'os 2 arquivos continuam lá');
