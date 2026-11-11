-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-11b-moneytrio-espelho.sql. Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
INSERT INTO auth.users (id, email) VALUES
 ('a9000000-0000-0000-0000-000000000001','ana.esp@x.com'), ('b9000000-0000-0000-0000-000000000001','bia.esp@x.com'),
 ('c9000000-0000-0000-0000-000000000001','caio.esp@x.com'), ('d9000000-0000-0000-0000-000000000001','robo.esp@x.com'),
 ('e9000000-0000-0000-0000-000000000001','zed.esp@x.com')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT v::uuid FROM t WHERE k = 'g' $$;
CREATE OR REPLACE FUNCTION pg_temp.nega(sql text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RAISE EXCEPTION 'FALHOU: %', msg;
EXCEPTION WHEN insufficient_privilege OR raise_exception OR invalid_parameter_value OR program_limit_exceeded OR check_violation THEN
  IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.jwk(c text) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('kty','EC','crv','P-256','x',repeat(c,43),'y',repeat(c,43)) $$;

SET ROLE authenticated;
SELECT pg_temp.quem('a9000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('g', public.sol_criar_grupo('Família Espelho', 'familia', 'Ana'));
INSERT INTO t VALUES ('cv_r', public.sol_criar_convite(pg_temp.g(), 'responsavel', 7, 1));
INSERT INTO t VALUES ('cv_m', public.sol_criar_convite(pg_temp.g(), 'membro', 7, 1));
SELECT pg_temp.quem('b9000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_r'), 'Bia');
SELECT pg_temp.quem('c9000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_m'), 'Caio');
-- com o SQL v4 "escopos", só o chefe vê tudo sem linha: o chefe dá 'tudo' à responsável (como era antes)
SELECT pg_temp.quem('a9000000-0000-0000-0000-000000000001');
DO $$ BEGIN IF to_regprocedure('public.money_visao_definir(uuid,uuid,text)') IS NOT NULL THEN
  PERFORM public.money_visao_definir(pg_temp.g(), 'b9000000-0000-0000-0000-000000000001', 'tudo'); END IF; END $$;
SELECT pg_temp.quem('a9000000-0000-0000-0000-000000000001');
SELECT public.money_robo_autorizar(pg_temp.g(), 'robo.esp@x.com', 'robô de teste');

-- chave pública do robô
SELECT pg_temp.ok(public.money_espelho_chave_de(pg_temp.g()) IS NULL, 'antes de o robô publicar: sem chave');
SELECT pg_temp.nega($$SELECT public.money_espelho_publicar(pg_temp.g(), pg_temp.jwk('A'))$$, 'a chefe não publica a chave do robô');
SELECT pg_temp.quem('d9000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_espelho_publicar(pg_temp.g(), pg_temp.jwk('R') || '{"d":"segredo"}'), 'o robô publica a chave pública');
SELECT pg_temp.ok(public.money_espelho_publicar(pg_temp.g(), pg_temp.jwk('S')), 'publicar de novo atualiza (idempotente)');
SELECT pg_temp.quem('a9000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT public.money_espelho_chave_de(pg_temp.g())->>'x') = repeat('S',43) AND NOT (public.money_espelho_chave_de(pg_temp.g()) ? 'd'), 'a chefe lê a chave (e nunca um "d", mesmo que o robô mande)');
SELECT pg_temp.quem('b9000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_espelho_chave_de(pg_temp.g()) IS NOT NULL, 'a responsável lê a chave');
SELECT pg_temp.quem('c9000000-0000-0000-0000-000000000001');
SELECT pg_temp.nega($$SELECT public.money_espelho_chave_de(pg_temp.g())$$, 'membro comum não lê a chave');
SELECT pg_temp.nega($$SELECT public.money_espelho_depositar(pg_temp.g(), ARRAY['{"v":1,"epk":{},"iv":"x","ct":"y"}'])$$, 'membro comum não deposita');
SELECT pg_temp.quem('e9000000-0000-0000-0000-000000000001');
SELECT pg_temp.nega($$SELECT public.money_espelho_depositar(pg_temp.g(), ARRAY['{"v":1,"epk":{},"iv":"x","ct":"y"}'])$$, 'pessoa de fora não deposita');

-- a chefe deposita; a responsável também; ninguém lê direto
SELECT pg_temp.quem('a9000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_espelho_depositar(pg_temp.g(), ARRAY['{"v":1,"epk":{"x":"a","y":"b"},"iv":"i1","ct":"c1"}', '{"v":1,"epk":{"x":"a","y":"b"},"iv":"i2","ct":"c2"}']) = 2, 'a chefe deposita 2 pacotes');
SELECT pg_temp.quem('b9000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_espelho_depositar(pg_temp.g(), ARRAY['{"v":1,"epk":{"x":"a","y":"b"},"iv":"i3","ct":"c3"}']) = 1, 'a responsável deposita');
SELECT pg_temp.nega($$SELECT public.money_espelho_depositar(pg_temp.g(), (SELECT array_agg('{"v":1,"epk":{},"iv":"x","ct":"y"}'::text) FROM generate_series(1, 201)))$$, 'mais de 200 de uma vez: recusa');
SELECT pg_temp.nega($$SELECT public.money_espelho_depositar(pg_temp.g(), ARRAY['não é json'])$$, 'pacote fora do formato: recusa');
SELECT pg_temp.nega($$SELECT count(*) FROM public.money_espelho_saida$$, 'ninguém lê os pacotes direto');
SELECT pg_temp.nega($$SELECT public.money_espelho_ler(pg_temp.g(), 10)$$, 'a responsável não lê a saída (só o robô)');

-- o robô lê e marca como lido
SELECT pg_temp.quem('d9000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE lidos AS SELECT * FROM public.money_espelho_ler(pg_temp.g(), 10);
SELECT pg_temp.ok((SELECT count(*) FROM lidos) = 3 AND (SELECT pacote FROM lidos ORDER BY criado_em, id LIMIT 1) LIKE '%"i1"%', 'o robô lê os 3, os mais antigos primeiro');
SELECT pg_temp.ok(public.money_espelho_consumir(pg_temp.g(), (SELECT array_agg(id) FROM lidos)) = 3, 'o robô marca os 3 como lidos');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_espelho_ler(pg_temp.g(), 10)) = 0, 'depois de lidos, não voltam');
RESET ROLE;
UPDATE public.money_espelho_saida SET consumido_em = now() - interval '8 days';
SET ROLE authenticated;
SELECT pg_temp.quem('d9000000-0000-0000-0000-000000000001');
SELECT count(*) FROM public.money_espelho_ler(pg_temp.g(), 10);
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM public.money_espelho_saida) = 0, 'os lidos há mais de 7 dias somem');
SET ROLE authenticated;

-- memória do robô
SELECT pg_temp.quem('d9000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_robo_memoria_ler(pg_temp.g()) IS NULL, 'memória vazia no começo');
SELECT pg_temp.ok(public.money_robo_memoria_gravar(pg_temp.g(), '{"v":1,"epk":{"x":"a","y":"b"},"iv":"m","ct":"regras"}'), 'o robô grava a memória (fechada por ele)');
SELECT pg_temp.ok(public.money_robo_memoria_ler(pg_temp.g()) LIKE '%regras%', 'o robô lê a memória');
SELECT pg_temp.nega($$SELECT public.money_robo_memoria_gravar(pg_temp.g(), '{' || repeat('x', 524288) || '}')$$, 'memória maior que 512 KB: recusa');
SELECT pg_temp.quem('a9000000-0000-0000-0000-000000000001');
SELECT pg_temp.nega($$SELECT public.money_robo_memoria_ler(pg_temp.g())$$, 'a chefe não lê a memória do robô');
SELECT pg_temp.nega($$SELECT public.money_robo_memoria_gravar(pg_temp.g(), '{"x":1}')$$, 'a chefe não grava a memória do robô');
SELECT pg_temp.nega($$SELECT count(*) FROM public.money_robo_memoria$$, 'ninguém lê a memória direto');

-- robô desligado perde tudo
SELECT public.money_robo_desligar(pg_temp.g(), 'd9000000-0000-0000-0000-000000000001');
SELECT pg_temp.quem('d9000000-0000-0000-0000-000000000001');
SELECT pg_temp.nega($$SELECT public.money_espelho_ler(pg_temp.g(), 10)$$, 'robô desligado não lê a saída');
SELECT pg_temp.nega($$SELECT public.money_robo_memoria_ler(pg_temp.g())$$, 'robô desligado não lê a memória');
SELECT pg_temp.nega($$SELECT public.money_espelho_publicar(pg_temp.g(), pg_temp.jwk('T'))$$, 'robô desligado não publica chave');
RESET ROLE;
SELECT pg_temp.ok(NOT has_function_privilege('anon', 'public.money_espelho_chave_de(uuid)', 'execute'), 'visitante não chama as funções');
