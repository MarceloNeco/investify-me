-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-03c-moneytrio-robo-correcao.sql (rodar DEPOIS do teste-moneytrio-caixa.sql,
-- no mesmo banco, com o v3 aplicado). Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
INSERT INTO auth.users (id, email) VALUES
 ('a2000000-0000-0000-0000-000000000001','ana.c@x.com'), ('f2000000-0000-0000-0000-000000000001','robo.c@x.com')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT v::uuid FROM t WHERE k = 'g' $$;
CREATE OR REPLACE FUNCTION pg_temp.pac(x text) RETURNS text LANGUAGE sql AS $$ SELECT '{"v":1,"k":"' || repeat('K', 512) || '","iv":"AAAAAAAAAAAAAAAA","ct":"' || repeat(x, 80) || '"}' $$;
CREATE OR REPLACE FUNCTION pg_temp.dep(id text, x text, imp text) RETURNS integer LANGUAGE sql AS $$
  SELECT public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('id', id, 'pacote', pg_temp.pac(x), 'impressao', imp))));
$$;
CREATE OR REPLACE FUNCTION pg_temp.linha(p_id text) RETURNS public.money_entrada LANGUAGE sql AS $$ SELECT e FROM public.money_entrada e WHERE e.grupo_id = pg_temp.g() AND e.id = p_id $$;

SET ROLE authenticated;
SELECT pg_temp.quem('a2000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('g', public.sol_criar_grupo('Família Correção', 'familia', 'Ana'));
SELECT public.money_robo_autorizar(pg_temp.g(), 'robo.c@x.com');
SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');

-- 1) primeira vez
SELECT pg_temp.ok(pg_temp.dep('c-1', 'A', 'impA0000') = 1, 'robô deposita com impressao');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-1')).impressao = 'impA0000' AND (pg_temp.linha('c-1')).versao = 1, 'guarda a impressao e versao 1');
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');

-- 2) reenviar igual não muda nada
SELECT pg_temp.ok(pg_temp.dep('c-1', 'B', 'impA0000') = 0, 'mesma impressao: não conta como novo');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-1')).pacote = pg_temp.pac('A') AND (pg_temp.linha('c-1')).versao = 1, 'mesma impressao: pacote e versão iguais');

-- 3) a família aproveita
SET ROLE authenticated; SELECT pg_temp.quem('a2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_entrada_consumir(pg_temp.g(), array['c-1']) = 1, 'chefe aproveita');

-- 4) correção do robô: impressão diferente
SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-1', 'C', 'impC0000') = 1, 'impressao diferente: conta como corrigido');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-1')).pacote = pg_temp.pac('C'), 'correção troca o pacote');
SELECT pg_temp.ok((pg_temp.linha('c-1')).consumido_em IS NULL, 'correção volta a esperar o app (consumido_em zerado)');
SELECT pg_temp.ok((pg_temp.linha('c-1')).versao = 2 AND (pg_temp.linha('c-1')).impressao = 'impC0000', 'correção soma versão (2) e guarda a impressão nova');
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-1', 'D', 'impC0000') = 0, 'reenviar a correção igual não muda de novo');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-1')).versao = 2, 'versão continua 2');

-- 5) sem impressao: como antes (não sobrescreve)
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-1', 'E', NULL) = 0, 'sem impressao: não sobrescreve (como antes)');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-1')).pacote = pg_temp.pac('C'), 'pacote continua o da correção');

-- 6) linha antiga, sem impressão: aprende sem reabrir
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-old', 'F', NULL) = 1, 'depósito antigo, sem impressao');
SELECT pg_temp.quem('a2000000-0000-0000-0000-000000000001');
SELECT public.money_entrada_consumir(pg_temp.g(), array['c-old']);
SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-old', 'G', 'impG0000') = 0, 'linha antiga: o primeiro reenvio com impressao não reabre');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-old')).impressao = 'impG0000' AND (pg_temp.linha('c-old')).consumido_em IS NOT NULL AND (pg_temp.linha('c-old')).pacote = pg_temp.pac('F'), 'linha antiga: só aprende a impressão (pacote e aproveitado ficam)');
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-old', 'H', 'impH0000') = 1, 'depois disso, uma correção reabre normalmente');

-- 7) impressão inválida
DO $$ BEGIN PERFORM pg_temp.dep('c-2', 'A', 'curta'); RAISE EXCEPTION 'FALHOU: impressao curta';
EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'ok: impressao inválida é recusada'; END $$;
DO $$ BEGIN PERFORM pg_temp.dep('c-2', 'A', 'tem espaço aqui'); RAISE EXCEPTION 'FALHOU: impressao com espaço';
EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'ok: impressao com espaço é recusada'; END $$;

-- 8) LGPD: o que foi apagado não volta
RESET ROLE;
UPDATE public.money_entrada SET pacote = NULL, consumido_em = coalesce(consumido_em, now()) WHERE grupo_id = pg_temp.g() AND id = 'c-1';
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(pg_temp.dep('c-1', 'Z', 'impZ0000') = 0, 'pacote apagado (LGPD) não volta com a correção');
RESET ROLE;
SELECT pg_temp.ok((pg_temp.linha('c-1')).pacote IS NULL, 'continua apagado');

-- 9) o resto continua fechado
SET ROLE authenticated; SELECT pg_temp.quem('f2000000-0000-0000-0000-000000000001');
DO $$ BEGIN UPDATE public.money_entrada SET impressao = 'xxxxxxxx'; RAISE EXCEPTION 'FALHOU: update direto';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém muda a impressão direto'; END $$;
RESET ROLE; SET ROLE anon;
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), '[]'); RAISE EXCEPTION 'FALHOU: anon chamou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: visitante não chama o depósito'; END $$;
RESET ROLE;
