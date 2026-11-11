-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-12-moneytrio-escopos.sql (visão da casa). Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
INSERT INTO auth.users (id, email) VALUES
 ('a4000000-0000-0000-0000-000000000001','ana.esc@x.com'), ('b4000000-0000-0000-0000-000000000001','beta.esc@x.com'),
 ('c4000000-0000-0000-0000-000000000001','caio.esc@x.com'), ('f4000000-0000-0000-0000-000000000001','robo.esc@x.com')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT v::uuid FROM t WHERE k = 'g' $$;
CREATE OR REPLACE FUNCTION pg_temp.pac() RETURNS text LANGUAGE sql AS $$ SELECT '{"v":1,"k":"' || repeat('K', 512) || '","iv":"AAAAAAAAAAAAAAAA","ct":"' || repeat('C', 80) || '"}' $$;
CREATE OR REPLACE FUNCTION pg_temp.emb() RETURNS text LANGUAGE sql AS $$ SELECT '1.' || repeat('E', 400) $$;
CREATE OR REPLACE FUNCTION pg_temp.ana() RETURNS void LANGUAGE sql AS $$ SELECT pg_temp.quem('a4000000-0000-0000-0000-000000000001') $$;
CREATE OR REPLACE FUNCTION pg_temp.beta() RETURNS void LANGUAGE sql AS $$ SELECT pg_temp.quem('b4000000-0000-0000-0000-000000000001') $$;

-- família: Ana chefe, Beta membro (vai ter a visão da casa), Caio responsável (vê tudo, como hoje)
SET ROLE authenticated;
SELECT pg_temp.ana();
INSERT INTO t VALUES ('g', public.sol_criar_grupo('Família Escopo', 'familia', 'Ana'));
INSERT INTO t VALUES ('cv_m', public.sol_criar_convite(pg_temp.g(), 'membro', 7, 1));
INSERT INTO t VALUES ('cv_r', public.sol_criar_convite(pg_temp.g(), 'responsavel', 7, 1));
SELECT pg_temp.beta(); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_m'), 'Beta');
SELECT pg_temp.quem('c4000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite((SELECT v FROM t WHERE k='cv_r'), 'Caio');

-- 1) visão
SELECT pg_temp.ana();
SELECT pg_temp.ok(public.money_visao(pg_temp.g()) = 'tudo', 'chefe vê tudo');
SELECT pg_temp.quem('c4000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.money_visao(pg_temp.g()) = 'tudo', 'responsável sem linha: vê tudo, como hoje');
SELECT pg_temp.beta();
SELECT pg_temp.ok(public.money_visao(pg_temp.g()) IS NULL, 'membro sem linha: não vê nada do MoneyTRIO');
DO $$ BEGIN PERFORM public.money_visao_definir(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'tudo'); RAISE EXCEPTION 'FALHOU: membro se deu visão';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: membro não define a própria visão'; END $$;
SELECT pg_temp.quem('c4000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_visao_definir(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'tudo'); RAISE EXCEPTION 'FALHOU: responsável definiu visão';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: só o chefe define (o responsável não)'; END $$;

-- 2) antes de existir visão da casa: o chefe grava casa e reservado; a migração apaga a cópia antiga de verdade
SELECT pg_temp.ana();
INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado) VALUES
 (pg_temp.g(), 'gastos', 'g1', repeat('A', 40)), (pg_temp.g(), 'gastos', 'g2', repeat('B', 40)), (pg_temp.g(), 'gastos', 'velho', repeat('D', 40));
SELECT pg_temp.ok((SELECT escopo FROM public.money_docs WHERE grupo_id = pg_temp.g() AND id = 'g1') = 'casa', 'sem escopo: casa (o app de antes continua igual)');
DO $$ BEGIN INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado) VALUES (pg_temp.g(), 'gastos', 'r.g3', repeat('C', 40));
  RAISE EXCEPTION 'FALHOU: r. sem escopo';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok: "r." sem dizer o escopo é recusado'; END $$;
INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado, escopo) VALUES (pg_temp.g(), 'gastos', 'r.g3', repeat('C', 40), 'reservado');
DO $$ BEGIN INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado, escopo) VALUES (pg_temp.g(), 'gastos', 'r.g4', repeat('E', 40), 'casa');
  RAISE EXCEPTION 'FALHOU: r. como casa';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok: "r." precisa ser reservado'; END $$;
INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado, escopo) VALUES (pg_temp.g(), 'gastos', 'r.g4', repeat('E', 40), 'reservado');
DO $$ BEGIN INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado, escopo) VALUES (pg_temp.g(), 'gastos', 'g5', repeat('F', 40), 'reservado');
  RAISE EXCEPTION 'FALHOU: reservado sem r.';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok: reservado precisa do id "r."'; END $$;
SELECT pg_temp.ok(public.money_reservar_apagar(pg_temp.g(), 'gastos', array['velho']) = 1, 'antes de existir visão da casa: a cópia antiga (casa) sai de verdade');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.money_docs WHERE grupo_id = pg_temp.g() AND id = 'velho'), 'sem rastro (nem apagado_em)');

SELECT pg_temp.ok((SELECT count(*) FROM public.money_docs_recifrar(pg_temp.g(), jsonb_build_array(
  jsonb_build_object('colecao','gastos','id','g1','versao',(SELECT versao FROM public.money_docs WHERE grupo_id = pg_temp.g() AND id = 'g1'),'dados',repeat('N',40)),
  jsonb_build_object('colecao','gastos','id','g2','versao',99,'dados',repeat('N',40))))) = 1, 'recifrar em lote: só a versão certa muda (trava otimista)');
SELECT pg_temp.ok((SELECT dados_cifrado FROM public.money_docs WHERE grupo_id = pg_temp.g() AND id = 'g1') = repeat('N',40), 'o pacote novo está lá');

-- 3) as chaves: CC para ela; CR não
SELECT public.money_visao_definir(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'casa');
SELECT pg_temp.ok(public.money_chave_guardar(pg_temp.g(), 'a4000000-0000-0000-0000-000000000001', 'casa', 1, pg_temp.emb()), 'chefe guarda a CC para si');
SELECT pg_temp.ok(public.money_chave_guardar(pg_temp.g(), 'a4000000-0000-0000-0000-000000000001', 'reservado', 1, pg_temp.emb()), 'chefe guarda a CR para si');
SELECT pg_temp.ok(public.money_chave_guardar(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'casa', 1, pg_temp.emb()), 'chefe guarda a CC para ela');
DO $$ BEGIN PERFORM public.money_chave_guardar(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'reservado', 1, pg_temp.emb()); RAISE EXCEPTION 'FALHOU: CR para ela';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: a CR nunca vai para quem vê só a casa'; END $$;
SELECT pg_temp.ok(NOT public.money_chave_guardar(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'casa', 1, pg_temp.emb()), 'a mesma versão não é sobrescrita');

-- 4) depois da visão da casa: o que era da casa não sai mais de verdade
DO $$ BEGIN PERFORM public.money_reservar_apagar(pg_temp.g(), 'gastos', array['g2']); RAISE EXCEPTION 'FALHOU: apagou casa de verdade';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: com alguém na visão da casa, o da casa só sai por apagado_em'; END $$;
SELECT pg_temp.ok(public.money_reservar_apagar(pg_temp.g(), 'gastos', array['r.g4']) = 1, 'o "r." continua saindo de verdade (reservado → casa)');

-- 5) ela: só a casa, em tudo
SELECT pg_temp.beta();
SELECT pg_temp.ok(public.money_visao(pg_temp.g()) = 'casa', 'ela tem a visão da casa');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_docs WHERE grupo_id = pg_temp.g()) = 2, 'ela lê só as 2 linhas da casa (nem a contagem das reservadas)');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.money_docs WHERE grupo_id = pg_temp.g() AND id LIKE 'r.%'), 'nenhuma linha "r." chega para ela');
DO $$ BEGIN INSERT INTO public.money_docs (grupo_id, colecao, id, dados_cifrado, escopo) VALUES (pg_temp.g(), 'gastos', 'r.dela', repeat('X', 40), 'reservado');
  RAISE EXCEPTION 'FALHOU: ela gravou reservado';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ela não grava reservado'; END $$;
UPDATE public.money_docs SET dados_cifrado = '{"c":1,"m":"c",' || repeat('Z', 40) WHERE grupo_id = pg_temp.g() AND id = 'g1';
SELECT pg_temp.ok((SELECT dados_cifrado FROM public.money_docs WHERE grupo_id = pg_temp.g() AND id = 'g1') = '{"c":1,"m":"c",' || repeat('Z', 40), 'ela edita um lançamento da casa');
DO $$ BEGIN UPDATE public.money_docs SET dados_cifrado = '{"c":1,"kv":1,' || repeat('Z', 40) WHERE grupo_id = pg_temp.g() AND id = 'g1';
  RAISE EXCEPTION 'FALHOU: gravou fechado com a CF depois da migração';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: depois das chaves novas, nada fechado com a CF entra'; END $$;
SELECT pg_temp.ok((SELECT count(*) FROM public.money_chaves WHERE grupo_id = pg_temp.g()) = 1, 'ela lê só a CC dela');
DO $$ BEGIN PERFORM public.money_chave_guardar(pg_temp.g(), 'b4000000-0000-0000-0000-000000000001', 'casa', 2, pg_temp.emb()); RAISE EXCEPTION 'FALHOU: ela guardou chave';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ela não guarda chaves'; END $$;
DO $$ BEGIN PERFORM * FROM public.money_docs_recifrar(pg_temp.g(), '[]'::jsonb); RAISE EXCEPTION 'FALHOU: ela recifrou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ela não recifra em lote'; END $$;
DO $$ BEGIN PERFORM public.money_reservar_apagar(pg_temp.g(), 'gastos', array['r.g3']); RAISE EXCEPTION 'FALHOU: ela apagou';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: ela não apaga de verdade'; END $$;
SELECT pg_temp.ok(NOT public.money_posso_ver(pg_temp.g()), 'money_posso_ver (robô, espelho, caixa reservada) é falso para ela');
SELECT pg_temp.ok(public.money_arquivo_posso(pg_temp.g()::text || '/arquivo1') AND NOT public.money_arquivo_posso(pg_temp.g()::text || '/r/arquivo2'), 'comprovante da casa sim; "/r/" não');
SELECT pg_temp.ok(NOT public.money_arquivo_apagar_posso(pg_temp.g()::text || '/arquivo1'), 'ela não apaga comprovante');

-- 6) caixa do robô por escopo
SELECT pg_temp.ana();
SELECT public.money_robo_autorizar(pg_temp.g(), 'robo.esc@x.com', 'Robô');
INSERT INTO public.money_caixa_chave (grupo_id, escopo, chave_publica) VALUES
 (pg_temp.g(), 'casa', jsonb_build_object('kty','RSA','alg','RSA-OAEP-256','e','AQAB','n',repeat('c',512),'kid','casa1')),
 (pg_temp.g(), 'reservado', jsonb_build_object('kty','RSA','alg','RSA-OAEP-256','e','AQAB','n',repeat('r',512),'kid','res1'));
SELECT pg_temp.quem('f4000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_caixa_chave WHERE grupo_id = pg_temp.g()) = 2, 'o robô lê as duas chaves públicas (uma por escopo)');
SELECT pg_temp.ok(public.money_robo_depositar(pg_temp.g(), jsonb_build_array(
  jsonb_build_object('id','e1','pacote',pg_temp.pac(),'escopo','casa'),
  jsonb_build_object('id','e2','pacote',pg_temp.pac()),
  jsonb_build_object('id','e3','pacote',pg_temp.pac(),'escopo','reservado'))) = 3, 'o robô deposita com escopo (sem o campo = reservado)');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_entrada WHERE grupo_id = pg_temp.g()) = 0, 'o robô não lê a caixa');
SELECT pg_temp.ana();
SELECT pg_temp.ok((SELECT escopo FROM public.money_entrada WHERE grupo_id = pg_temp.g() AND id = 'e2') = 'reservado', 'sem escopo: reservado');
SELECT pg_temp.quem('f4000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','e9','pacote',pg_temp.pac(),'escopo','todos')));
  RAISE EXCEPTION 'FALHOU: escopo inválido';
EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'ok: escopo inválido é recusado'; END $$;
SELECT pg_temp.ok(public.money_robo_depositar(pg_temp.g(), jsonb_build_array(jsonb_build_object('id','e3','pacote',pg_temp.pac(),'escopo','casa'))) = 1, 'o mesmo id com outro escopo: o pacote novo entra no lugar');
SELECT pg_temp.beta();
SELECT pg_temp.ok((SELECT string_agg(id, ',' ORDER BY id) FROM public.money_entrada WHERE grupo_id = pg_temp.g()) = 'e1,e3', 'ela lê na caixa só os da casa (e1, e3)');
SELECT pg_temp.ok(public.money_entrada_consumir(pg_temp.g(), array['e1','e2']) = 1, 'ela marca como aproveitado só o da casa');
SELECT pg_temp.ok((SELECT count(*) FROM public.money_caixa_chave WHERE grupo_id = pg_temp.g()) = 2, 'ela lê as chaves públicas (para nada: o pacote se abre com a privada)');
SELECT pg_temp.ana();
SELECT pg_temp.ok((SELECT consumido_em FROM public.money_entrada WHERE grupo_id = pg_temp.g() AND id = 'e2') IS NULL, 'o reservado continua esperando o chefe');
SELECT pg_temp.ok(public.money_entrada_limpar(pg_temp.g()) = 1, 'o chefe limpa os já aproveitados');

-- 7) a lista do chefe
SELECT pg_temp.ok((SELECT string_agg(papel || ':' || coalesce(visao, '-'), ',' ORDER BY papel) FROM public.money_visoes(pg_temp.g())) = 'chefe:tudo,membro:casa,responsavel:tudo', 'a lista "Família no MoneyTRIO" (chefe tudo, ela casa, responsável tudo)');
RESET ROLE;
