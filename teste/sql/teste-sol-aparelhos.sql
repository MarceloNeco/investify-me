-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-07-sol-aparelhos.sql. Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb DEFAULT '{}';   -- existe no Supabase; o stub não tinha
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('a7000000-0000-0000-0000-000000000001','ana.ap@x.com','{"full_name":"Ana"}'), ('b7000000-0000-0000-0000-000000000001','bia.ap@x.com','{"full_name":"Bia"}'),
 ('c7000000-0000-0000-0000-000000000001','caio.ap@x.com','{}'), ('e7000000-0000-0000-0000-000000000001','zed.ap@x.com','{}')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.v(k2 text) RETURNS text LANGUAGE sql AS $$ SELECT v FROM t WHERE k = k2 $$;
-- uma pub de mentira no formato certo (43 caracteres em x e y)
CREATE OR REPLACE FUNCTION pg_temp.pub(c text) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('kty','EC','crv','P-256','x',repeat(c,43),'y',repeat(c,43)) $$;
CREATE OR REPLACE FUNCTION pg_temp.n(c text) RETURNS text LANGUAGE sql AS $$ SELECT repeat(c,43) $$;

SET ROLE authenticated;
-- família: Ana chefe, Bia responsável, Caio membro; Zed de fora
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('g', public.sol_criar_grupo('Família Aparelhos', 'familia', 'Ana'));
INSERT INTO t VALUES ('cv_r', public.sol_criar_convite(pg_temp.v('g')::uuid, 'responsavel', 7, 1));
INSERT INTO t VALUES ('cv_m', public.sol_criar_convite(pg_temp.v('g')::uuid, 'membro', 7, 1));
SELECT pg_temp.quem('b7000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite(pg_temp.v('cv_r'), 'Bia');
SELECT pg_temp.quem('c7000000-0000-0000-0000-000000000001'); SELECT public.sol_aceitar_convite(pg_temp.v('cv_m'), 'Caio');

-- tabelas fechadas para o app
DO $$ BEGIN PERFORM 1 FROM public.sol_acesso_pedidos; RAISE EXCEPTION 'FALHOU: leu pedidos direto';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: pedidos não são legíveis direto'; END $$;
DO $$ BEGIN INSERT INTO public.sol_aparelhos (user_id, nome, app, como) VALUES (auth.uid(), 'x', 'moneytrio', 'primeiro'); RAISE EXCEPTION 'FALHOU: escreveu direto';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: aparelhos não aceitam escrita direta'; END $$;
DO $$ BEGIN PERFORM public.sol_pedidos_limpar(); RAISE EXCEPTION 'FALHOU: app chamou a limpeza';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: limpeza só por dentro'; END $$;

-- Ana: o aparelho A (registrado como "primeiro")
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('apA', public.sol_aparelho_registrar('Computador · Chrome', 'moneytrio', 'primeiro'));
SELECT pg_temp.ok(public.sol_aparelho_visto(pg_temp.v('apA')::uuid), 'aparelho registrado e "visto"');
-- Ana pede pelo celular B (pessoal)
INSERT INTO t VALUES ('p1', public.sol_pedido_criar('Android · Chrome', 'moneytrio', pg_temp.pub('B'), pg_temp.n('C'), null));
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_pedidos_para_mim() WHERE id = pg_temp.v('p1')::uuid AND tipo = 'pessoal' AND quem_email = 'ana.ap@x.com') = 1, 'A vê o pedido do próprio celular (pessoal)');
SELECT pg_temp.ok(NOT public.sol_pedido_revelar(pg_temp.v('p1')::uuid, pg_temp.n('N')), 'B não revela nB antes do desafio');
SELECT pg_temp.ok(NOT public.sol_pedido_aprovar(pg_temp.v('p1')::uuid, '{"v":2}', pg_temp.v('apA')::uuid), 'não aprova sem desafio e revelar');
-- outra pessoa não mexe
SELECT pg_temp.quem('e7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_pedidos_para_mim()) = 0, 'pessoa de fora não vê o pedido');
DO $$ BEGIN PERFORM public.sol_pedido_desafio(pg_temp.v('p1')::uuid, pg_temp.pub('Z'), pg_temp.n('Z')); RAISE EXCEPTION 'FALHOU: estranho fez desafio';
EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF; RAISE NOTICE 'ok: pessoa de fora não faz o desafio'; END $$;
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_pedido_buscar(pg_temp.v('p1')::uuid)) = 0, 'pessoa de fora não busca o pedido dos outros');
-- desafio (A), revelar (B), aprovar (A)
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.sol_pedido_desafio(pg_temp.v('p1')::uuid, pg_temp.pub('A'), pg_temp.n('a')), 'A grava pubA e nA');
SELECT pg_temp.ok(NOT public.sol_pedido_desafio(pg_temp.v('p1')::uuid, pg_temp.pub('X'), pg_temp.n('x')), 'o desafio é uma vez só');
SELECT pg_temp.ok((SELECT pub_a->>'x' FROM public.sol_pedido_buscar(pg_temp.v('p1')::uuid)) = repeat('A',43), 'B lê pubA');
SELECT pg_temp.ok(public.sol_pedido_revelar(pg_temp.v('p1')::uuid, pg_temp.n('b')), 'B revela nB depois do desafio');
SELECT pg_temp.ok(NOT public.sol_pedido_revelar(pg_temp.v('p1')::uuid, pg_temp.n('c')), 'revelar é uma vez só');
SELECT pg_temp.ok(public.sol_pedido_aprovar(pg_temp.v('p1')::uuid, '{"v":2,"iv":"i","ct":"c"}', pg_temp.v('apA')::uuid), 'A aprova');
SELECT pg_temp.ok(NOT public.sol_pedido_aprovar(pg_temp.v('p1')::uuid, '{"v":2,"iv":"j","ct":"d"}', pg_temp.v('apA')::uuid), 'a resposta é gravada uma vez só');
CREATE TEMP TABLE r1 AS SELECT * FROM public.sol_pedido_buscar(pg_temp.v('p1')::uuid);
SELECT pg_temp.ok((SELECT estado = 'aprovado' AND resposta->>'iv' = 'i' AND tipo = 'pessoal' AND aparelho IS NOT NULL FROM r1), 'B lê a resposta e entra na lista');
SELECT pg_temp.ok((SELECT estado = 'usado' AND resposta IS NULL FROM public.sol_pedido_buscar(pg_temp.v('p1')::uuid)), 'ler de novo: "usado", sem resposta');
RESET ROLE;
SELECT pg_temp.ok((SELECT resposta IS NULL FROM public.sol_acesso_pedidos WHERE id = pg_temp.v('p1')::uuid), 'a resposta saiu do banco depois de lida');
SELECT pg_temp.ok((SELECT como = 'aparelho' AND aprovado_por_ap = pg_temp.v('apA')::uuid FROM public.sol_aparelhos WHERE id = (SELECT aparelho FROM r1)), 'registra quem aprovou e de qual aparelho');
SET ROLE authenticated;
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_aparelhos_meus()) = 2, 'a lista mostra os 2 aparelhos da Ana');

-- recusar
INSERT INTO t VALUES ('p2', public.sol_pedido_criar('iPhone · Safari', 'moneytrio', pg_temp.pub('D'), pg_temp.n('E'), null));
SELECT pg_temp.ok(public.sol_pedido_recusar(pg_temp.v('p2')::uuid), 'A recusa');
SELECT pg_temp.ok((SELECT estado FROM public.sol_pedido_buscar(pg_temp.v('p2')::uuid)) = 'recusado', 'B vê "recusado"');

-- vencer: aprovado e nunca lido não fica no banco; aberto vencido vira "vencido"
INSERT INTO t VALUES ('p3', public.sol_pedido_criar('Tablet', 'moneytrio', pg_temp.pub('F'), pg_temp.n('G'), null));
INSERT INTO t VALUES ('p4', public.sol_pedido_criar('Tablet 2', 'moneytrio', pg_temp.pub('H'), pg_temp.n('I'), null));
SELECT public.sol_pedido_desafio(pg_temp.v('p4')::uuid, pg_temp.pub('A'), pg_temp.n('a'));
SELECT public.sol_pedido_revelar(pg_temp.v('p4')::uuid, pg_temp.n('b'));
SELECT public.sol_pedido_aprovar(pg_temp.v('p4')::uuid, '{"v":2,"iv":"k","ct":"e"}', pg_temp.v('apA')::uuid);
RESET ROLE;
UPDATE public.sol_acesso_pedidos SET expira_em = now() - interval '1 minute' WHERE id IN (pg_temp.v('p3')::uuid, pg_temp.v('p4')::uuid);
SET ROLE authenticated;
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT estado FROM public.sol_pedido_buscar(pg_temp.v('p3')::uuid)) = 'vencido', 'aberto vencido vira "vencido"');
RESET ROLE;
SELECT pg_temp.ok((SELECT resposta IS NULL FROM public.sol_acesso_pedidos WHERE id = pg_temp.v('p4')::uuid), 'aprovado e nunca lido: a resposta sai do banco ao vencer');
SET ROLE authenticated;
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT resposta IS NULL FROM public.sol_pedido_buscar(pg_temp.v('p4')::uuid)), 'e o aparelho novo não recebe nada');
SELECT pg_temp.ok(NOT public.sol_pedido_desafio(pg_temp.v('p3')::uuid, pg_temp.pub('A'), pg_temp.n('a')), 'pedido vencido não aceita desafio');

-- até 3 abertos
INSERT INTO t VALUES ('q1', public.sol_pedido_criar('x1', 'moneytrio', pg_temp.pub('J'), pg_temp.n('J'), null));
INSERT INTO t VALUES ('q2', public.sol_pedido_criar('x2', 'moneytrio', pg_temp.pub('K'), pg_temp.n('K'), null));
INSERT INTO t VALUES ('q3', public.sol_pedido_criar('x3', 'moneytrio', pg_temp.pub('L'), pg_temp.n('L'), null));
DO $$ BEGIN PERFORM public.sol_pedido_criar('x4', 'moneytrio', pg_temp.pub('M'), pg_temp.n('M'), null); RAISE EXCEPTION 'FALHOU: 4º pedido';
EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF; RAISE NOTICE 'ok: no máximo 3 pedidos em aberto'; END $$;
SELECT public.sol_pedido_recusar(pg_temp.v('q1')::uuid); SELECT public.sol_pedido_recusar(pg_temp.v('q2')::uuid); SELECT public.sol_pedido_recusar(pg_temp.v('q3')::uuid);

-- responsável aprova: o celular novo do Caio? (membro não vê finanças) — usamos a Ana pedindo pela família e a Bia aprovando
INSERT INTO t VALUES ('p5', public.sol_pedido_criar('Celular novo', 'moneytrio', pg_temp.pub('N'), pg_temp.n('O'), pg_temp.v('g')::uuid));
SELECT pg_temp.quem('b7000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('apBia', public.sol_aparelho_registrar('Bia · Chrome', 'moneytrio', 'primeiro'));
SELECT pg_temp.ok((SELECT tipo = 'familia' AND quem_nome = 'Ana' AND quem_email = 'ana.ap@x.com' FROM public.sol_pedidos_para_mim() WHERE id = pg_temp.v('p5')::uuid), 'a responsável vê o pedido da família com o nome e o e-mail de quem pede');
SELECT pg_temp.ok(public.sol_pedido_desafio(pg_temp.v('p5')::uuid, pg_temp.pub('Q'), pg_temp.n('q')), 'a responsável faz o desafio');
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_pedidos_para_mim() WHERE id = pg_temp.v('p5')::uuid) = 0, 'com o desafio de outra pessoa, o pedido some para os outros aparelhos');
SELECT public.sol_pedido_revelar(pg_temp.v('p5')::uuid, pg_temp.n('r'));
SELECT pg_temp.quem('b7000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.sol_pedido_aprovar(pg_temp.v('p5')::uuid, '{"v":2}', pg_temp.v('apA')::uuid); RAISE EXCEPTION 'FALHOU: usou aparelho dos outros';
EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF; RAISE NOTICE 'ok: não aprova "de um aparelho" que não é seu'; END $$;
SELECT pg_temp.ok(public.sol_pedido_aprovar(pg_temp.v('p5')::uuid, '{"v":2,"iv":"f","ct":"f"}', pg_temp.v('apBia')::uuid), 'a responsável aprova');
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT tipo FROM public.sol_pedido_buscar(pg_temp.v('p5')::uuid)) = 'familia', 'o aparelho novo recebe a resposta "familia"');
SELECT pg_temp.ok((SELECT aprovado_por_email = 'bia.ap@x.com' AND como = 'familia' FROM public.sol_aparelhos_meus() WHERE nome = 'Celular novo'), 'a lista da Ana diz "aprovado pela Bia" (para o aviso nos outros aparelhos)');
-- membro comum não aprova pedido da família
INSERT INTO t VALUES ('p6', public.sol_pedido_criar('Outro', 'moneytrio', pg_temp.pub('S'), pg_temp.n('T'), pg_temp.v('g')::uuid));
SELECT pg_temp.quem('c7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_pedidos_para_mim() WHERE id = pg_temp.v('p6')::uuid) = 0, 'membro comum não vê o pedido da família');
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001'); SELECT public.sol_pedido_recusar(pg_temp.v('p6')::uuid);

-- tirar aparelho
SELECT pg_temp.ok(public.sol_aparelho_tirar((SELECT aparelho FROM r1)), 'Ana tira o celular B');
SELECT pg_temp.ok(NOT public.sol_aparelho_visto((SELECT aparelho FROM r1)), 'o celular tirado recebe "false" (apaga o cadeado local)');
SELECT pg_temp.quem('b7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(NOT public.sol_aparelho_tirar(pg_temp.v('apA')::uuid), 'ninguém tira aparelho dos outros');

-- passkeys
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.sol_passkey_guardar('credencial-ana-0001', pg_temp.n('s'), '{"iv":"i","ct":"c"}'), 'guarda a passkey fechada');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_passkeys_minhas()) = 1, 'a Ana vê a passkey dela');
SELECT pg_temp.quem('b7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_passkeys_minhas()) = 0, 'a Bia não vê a passkey da Ana');
SELECT pg_temp.quem('a7000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(public.sol_passkey_tirar('credencial-ana-0001'), 'tira a passkey');
SELECT pg_temp.ok((SELECT count(*) FROM public.sol_passkeys_minhas()) = 0, 'a passkey tirada não aparece mais');
RESET ROLE;
SELECT pg_temp.ok(NOT has_function_privilege('anon', 'public.sol_pedido_criar(text,text,jsonb,text,uuid)', 'execute'), 'visitante não chama as funções');
