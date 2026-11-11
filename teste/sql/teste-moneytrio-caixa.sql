-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-03b-moneytrio-caixa-robo.sql. Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
INSERT INTO auth.users (id, email) VALUES
 ('a1000000-0000-0000-0000-000000000001','ana.m@x.com'), ('b1000000-0000-0000-0000-000000000001','bia.m@x.com'),
 ('c1000000-0000-0000-0000-000000000001','caio.m@x.com'), ('e1000000-0000-0000-0000-000000000001','zed.m@x.com'),
 ('f1000000-0000-0000-0000-000000000001','Robo.Financas@x.com')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT v::uuid FROM t WHERE k = 'g' $$;
CREATE OR REPLACE FUNCTION pg_temp.pac() RETURNS text LANGUAGE sql AS $$ SELECT '{"v":1,"k":"' || repeat('K', 512) || '","iv":"AAAAAAAAAAAAAAAA","ct":"' || repeat('C', 80) || '"}' $$;
CREATE OR REPLACE FUNCTION pg_temp.jwk() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('kty','RSA','alg','RSA-OAEP-256','e','AQAB','n',repeat('n',512),'kid','cx1') $$;

-- família: Ana chefe, Bia responsável, Caio membro
SET ROLE authenticated;
SELECT pg_temp.quem('a1000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('g', public.sol_criar_grupo('Família Money', 'familia', 'Ana'));
INSERT INTO t VALUES ('cv_r', public.sol_criar_convite(pg_temp.g(), 'responsavel', 7, 1));
INSERT INTO t VALUES ('cv_m', public.sol_criar_convite(pg_temp.g(), 'membro', 7, 1));
SELECT pg_temp.quem('b1000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_r'), 'Bia');
SELECT pg_temp.quem('c1000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_m'), 'Caio');

-- 1) autorizar robô
SELECT pg_temp.quem('f1000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','x1','pacote',pg_temp.pac())));
  RAISE EXCEPTION 'FALHOU: robô sem autorização depositou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: robô ainda não autorizado não deposita'; END $$;
SELECT pg_temp.quem('c1000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_robo_autorizar(pg_temp.g(), 'robo.financas@x.com');
  RAISE EXCEPTION 'FALHOU: membro autorizou robô';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: membro comum não autoriza robô'; END $$;
SELECT pg_temp.quem('e1000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_robo_autorizar(pg_temp.g(), 'robo.financas@x.com');
  RAISE EXCEPTION 'FALHOU: pessoa de fora autorizou robô';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: pessoa de fora não autoriza robô'; END $$;
SELECT pg_temp.quem('a1000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_robo_autorizar(pg_temp.g(), 'ninguem@x.com');
  RAISE EXCEPTION 'FALHOU: e-mail sem conta';
EXCEPTION WHEN no_data_found THEN RAISE NOTICE 'ok: e-mail sem conta é recusado'; END $$;
SELECT pg_temp.ok(public.money_robo_autorizar(pg_temp.g(), '  ROBO.financas@x.com ', 'Robô Pluggy') = 'f1000000-0000-0000-0000-000000000001', 'chefe autoriza o robô pelo e-mail (sem diferença de maiúsculas e espaços)');
SELECT pg_temp.ok(public.money_robo_autorizar(pg_temp.g(), 'robo.financas@x.com') IS NOT NULL, 'autorizar de novo não duplica');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_robos) = 1, 'chefe vê 1 robô na família');
DO $$ BEGIN INSERT INTO public.money_robos (grupo_id, user_id) VALUES (pg_temp.g(), 'e1000000-0000-0000-0000-000000000001');
  RAISE EXCEPTION 'FALHOU: insert direto em money_robos';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém grava direto em money_robos'; END $$;
SELECT pg_temp.quem('c1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_robos) = 0, 'membro comum não vê os robôs');

-- 2) chave pública da caixa
SELECT pg_temp.quem('c1000000-0000-0000-0000-000000000001');
DO $$ BEGIN INSERT INTO public.money_caixa_chave (grupo_id, chave_publica) VALUES (pg_temp.g(), pg_temp.jwk());
  RAISE EXCEPTION 'FALHOU: membro gravou a chave da caixa';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: membro comum não grava a chave da caixa'; END $$;
SELECT pg_temp.quem('b1000000-0000-0000-0000-000000000001');
DO $$ BEGIN INSERT INTO public.money_caixa_chave (grupo_id, chave_publica) VALUES (pg_temp.g(), pg_temp.jwk() || '{"d":"segredo"}');
  RAISE EXCEPTION 'FALHOU: aceitou chave com parte privada';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok: chave com a parte privada (d) é recusada'; END $$;
DO $$ BEGIN INSERT INTO public.money_caixa_chave (grupo_id, chave_publica) VALUES (pg_temp.g(), pg_temp.jwk() || '{"n":"curta"}');
  RAISE EXCEPTION 'FALHOU: aceitou chave curta';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok: chave que não é de 3072 bits é recusada'; END $$;
INSERT INTO public.money_caixa_chave (grupo_id, chave_publica, criado_por) VALUES (pg_temp.g(), pg_temp.jwk(), 'e1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT criado_por FROM public.money_caixa_chave) = 'b1000000-0000-0000-0000-000000000001', 'responsável grava a chave pública; o carimbo é de quem gravou (o app não escolhe)');
UPDATE public.money_caixa_chave SET chave_publica = pg_temp.jwk() || '{"kid":"cx2"}' WHERE grupo_id = pg_temp.g();
SELECT pg_temp.ok((SELECT chave_publica->>'kid' FROM public.money_caixa_chave) = 'cx2', 'responsável troca a chave pública');
DO $$ BEGIN DELETE FROM public.money_caixa_chave; RAISE EXCEPTION 'FALHOU: apagou a chave';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém apaga a chave da caixa pelo app'; END $$;
SELECT pg_temp.quem('c1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_caixa_chave) = CASE WHEN to_regprocedure('public.money_vejo_casa(uuid)') IS NULL THEN 1 ELSE 0 END, 'membro da família lê a chave pública (com o SQL v4 "escopos": só quem tem visão no MoneyTRIO)');
SELECT pg_temp.quem('e1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_caixa_chave) = 0, 'pessoa de fora não lê a chave pública');
SELECT pg_temp.quem('f1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_caixa_chave) = 1, 'robô autorizado lê a chave pública');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_robos) = 1, 'robô vê a própria autorização');
DO $$ BEGIN UPDATE public.money_caixa_chave SET chave_publica = pg_temp.jwk(); IF FOUND THEN RAISE EXCEPTION 'FALHOU: robô trocou a chave'; END IF;
  RAISE NOTICE 'ok: robô não troca a chave pública';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: robô não troca a chave pública'; END $$;

-- 3) robô deposita
SELECT pg_temp.ok(public.money_robo_depositar(pg_temp.g(), jsonb_build_array(
  jsonb_build_object('id','pluggy-1','pacote',pg_temp.pac(),'origem','pluggy'),
  jsonb_build_object('id','pluggy-2','pacote',pg_temp.pac()))) = 2, 'robô deposita 2 pacotes');
SELECT pg_temp.ok(public.money_robo_depositar(pg_temp.g(), jsonb_build_array(
  jsonb_build_object('id','pluggy-2','pacote',pg_temp.pac()),
  jsonb_build_object('id','pluggy-3','pacote',pg_temp.pac()))) = 1, 'repetir um id não duplica (entra só o novo)');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada) = 0, 'robô não lê a caixa');
DO $$ BEGIN INSERT INTO public.money_entrada (grupo_id, id, pacote) VALUES (pg_temp.g(), 'x9', pg_temp.pac());
  RAISE EXCEPTION 'FALHOU: insert direto na caixa';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: robô não grava direto na caixa (só pela função)'; END $$;
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), '[{"id":"ruim id!","pacote":"x"}]');
  RAISE EXCEPTION 'FALHOU: id inválido';
EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'ok: id inválido é recusado'; END $$;
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','p9','pacote','{"v":2,"k":"' || repeat('a',80) || '"}')));
  RAISE EXCEPTION 'FALHOU: formato errado';
EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'ok: pacote fora do formato é recusado'; END $$;
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','p8','pacote',pg_temp.pac()), jsonb_build_object('id','p7','pacote','curto')));
  RAISE EXCEPTION 'FALHOU: lote com item ruim';
EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'ok: lote com item ruim é recusado inteiro'; END $$;
SELECT pg_temp.quem('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada WHERE id = 'p8') = 0, 'lote recusado não deixa nada pela metade');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada WHERE consumido_em IS NULL) = 3, 'chefe lê os 3 pacotes da caixa');
SELECT pg_temp.ok((SELECT origem FROM public.money_entrada WHERE id = 'pluggy-1') = 'pluggy', 'origem guardada');

-- 4) família aproveita
SELECT pg_temp.quem('c1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada) = 0, 'membro comum não lê a caixa');
DO $$ BEGIN PERFORM public.money_entrada_consumir(pg_temp.g(), array['pluggy-1']);
  RAISE EXCEPTION 'FALHOU: membro marcou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: membro comum não marca a caixa'; END $$;
SELECT pg_temp.quem('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_entrada_consumir(pg_temp.g(), array['pluggy-1','pluggy-2','nao-existe']) = 2, 'responsável marca 2 como aproveitados');
SELECT pg_temp.ok(public.money_entrada_consumir(pg_temp.g(), array['pluggy-1']) = 0, 'marcar de novo não muda nada');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada WHERE consumido_em IS NULL) = 1, 'sobra 1 esperando');
DO $$ BEGIN UPDATE public.money_entrada SET pacote = 'x'; RAISE EXCEPTION 'FALHOU: update direto na caixa';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém muda a caixa direto'; END $$;
DO $$ BEGIN DELETE FROM public.money_entrada; RAISE EXCEPTION 'FALHOU: delete na caixa';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ninguém apaga a caixa pelo app'; END $$;
SELECT pg_temp.quem('f1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','pluggy-1','pacote',pg_temp.pac()))) = 0, 'reenviar um id já aproveitado não volta para a caixa');

-- 5) desligar o robô
SELECT pg_temp.quem('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_robo_desligar(pg_temp.g(), 'f1000000-0000-0000-0000-000000000001'), 'chefe desliga o robô');
SELECT pg_temp.quem('f1000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','pluggy-5','pacote',pg_temp.pac())));
  RAISE EXCEPTION 'FALHOU: robô desligado depositou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: robô desligado não deposita'; END $$;
SELECT pg_temp.ok((SELECT count(*) FROM public.money_caixa_chave) = 0, 'robô desligado não lê mais a chave');
SELECT pg_temp.quem('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_robo_autorizar(pg_temp.g(), 'robo.financas@x.com') IS NOT NULL, 'chefe liga o robô de novo');

-- 6) visitante e LGPD
RESET ROLE; SET ROLE anon;
DO $$ BEGIN PERFORM count(*) FROM public.money_entrada; RAISE EXCEPTION 'FALHOU: anon leu';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: visitante não lê a caixa'; END $$;
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), '[]'); RAISE EXCEPTION 'FALHOU: anon chamou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: visitante não chama o depósito'; END $$;
RESET ROLE; SET ROLE authenticated; SELECT pg_temp.quem('a1000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_anonimizar('f1000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'FALHOU: app chamou LGPD';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: o app não chama a LGPD'; END $$;
RESET ROLE;
SELECT pg_temp.ok((public.money_anonimizar('f1000000-0000-0000-0000-000000000001')->>'robos_desligados')::int = 1, 'LGPD do robô: ele é desligado');
SELECT pg_temp.ok((public.money_anonimizar('b1000000-0000-0000-0000-000000000001')->>'carimbos_limpos')::int >= 1, 'LGPD da Bia: carimbo da chave da caixa limpo');
SELECT pg_temp.ok((SELECT criado_por FROM public.money_caixa_chave WHERE grupo_id = pg_temp.g()) IS NULL, 'chave da caixa sem o nome da Bia');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada WHERE pacote IS NOT NULL) = 3, 'família com outras contas: a caixa continua');
-- família de uma pessoa só: a caixa é esvaziada
SELECT set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000001',false); SET ROLE authenticated;
INSERT INTO t VALUES ('g2', public.sol_criar_grupo('Família Zed', 'familia', 'Zed'));
SELECT public.money_robo_autorizar((SELECT v::uuid FROM t WHERE k='g2'), 'robo.financas@x.com');
RESET ROLE;
INSERT INTO public.money_entrada (grupo_id, id, pacote) VALUES ((SELECT v::uuid FROM t WHERE k='g2'), 'z1', pg_temp.pac());
SELECT pg_temp.ok((public.money_anonimizar('e1000000-0000-0000-0000-000000000001')->>'caixa_esvaziada')::int = 1, 'LGPD de quem era o único da família: a caixa é esvaziada');
SELECT pg_temp.ok((SELECT pacote IS NULL AND consumido_em IS NOT NULL FROM public.money_entrada WHERE id = 'z1'), 'pacote apagado e marcado como aproveitado');
