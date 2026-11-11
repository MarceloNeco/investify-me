-- ⚠ SÓ PARA UM POSTGRES LOCAL DE TESTE. NUNCA RODE NO SUPABASE (cria pessoas e dados de mentira).
-- Confere o supabase/2026-11-11-sol-pin-conta.sql (depois do 2026-11-07-sol-aparelhos.sql). Como rodar: teste/sql/LEIA-ME.md
\set ON_ERROR_STOP 1
\set QUIET 1
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb DEFAULT '{}';
INSERT INTO auth.users (id, email) VALUES ('a8000000-0000-0000-0000-000000000001','ana.pin@x.com'), ('b8000000-0000-0000-0000-000000000001','bia.pin@x.com')
ON CONFLICT DO NOTHING;
CREATE TEMP TABLE t (k text PRIMARY KEY, v text);
GRANT ALL ON t TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(cond,false) THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF; RAISE NOTICE 'ok: %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.quem(u text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', u, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.v(k2 text) RETURNS text LANGUAGE sql AS $$ SELECT v FROM t WHERE k = k2 $$;
-- v e sal de mentira no formato certo (43 e 22 caracteres base64url)
CREATE OR REPLACE FUNCTION pg_temp.pv(c text) RETURNS text LANGUAGE sql AS $$ SELECT repeat(c, 43) $$;
CREATE OR REPLACE FUNCTION pg_temp.sal(c text) RETURNS text LANGUAGE sql AS $$ SELECT repeat(c, 22) $$;

SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM 1 FROM public.sol_pin_conta; RAISE EXCEPTION 'FALHOU: leu direto';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: sol_pin_conta não é legível direto'; END $$;
DO $$ BEGIN PERFORM public.sol_pin_segredo(null); RAISE EXCEPTION 'FALHOU: segredo direto';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: o segredo do aparelho só sai por sol_pin_conferir'; END $$;
-- dois aparelhos antigos (migração): computador e celular
-- (os dois já estavam registrados pela 3.61; aqui o 2º entra direto na tabela, como ficou no banco)
INSERT INTO t VALUES ('pc', public.sol_aparelho_registrar('Computador', 'moneytrio', 'primeiro'));
DO $$ BEGIN PERFORM public.sol_aparelho_registrar('Celular falso', 'moneytrio', 'primeiro'); RAISE EXCEPTION 'FALHOU: 2º primeiro';
EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF; RAISE NOTICE 'ok: com um aparelho na conta, ninguém registra outro "primeiro" (precisa de aprovação)'; END $$;
RESET ROLE;
INSERT INTO public.sol_aparelhos (user_id, nome, app, como, aprovado_por) VALUES ('a8000000-0000-0000-0000-000000000001', 'Celular', 'moneytrio', 'primeiro', 'a8000000-0000-0000-0000-000000000001');
INSERT INTO t VALUES ('cel', (SELECT id FROM public.sol_aparelhos WHERE nome = 'Celular')::text);
SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT NOT tem FROM public.sol_pin_info()), 'conta ainda sem PIN');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('P'), pg_temp.v('pc')::uuid))->>'erro') = 'sempin', 'conferir sem PIN definido: "sempin"');
-- 1º aparelho define o PIN da conta (conta sem PIN: não precisa do atual)
CREATE TEMP TABLE r1 AS SELECT public.sol_pin_definir(pg_temp.pv('P'), pg_temp.sal('s'), null, pg_temp.v('pc')::uuid) j;
SELECT pg_temp.ok((SELECT (j->>'ok')::boolean AND (j->>'versao')::int = 1 AND length(j->>'segredo') = 43 FROM r1), 'o 1º aparelho define o PIN da conta e recebe o segredo dele');
SELECT pg_temp.ok((SELECT tem AND sal = pg_temp.sal('s') AND versao = 1 FROM public.sol_pin_info()), 'info: tem PIN, sal e versão 1');
-- o celular: PIN antigo diferente não confere; o da conta confere e devolve o segredo do celular (outro)
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('Q'), pg_temp.v('cel')::uuid))->>'erro') = 'pin', 'o PIN antigo do celular (diferente) não confere');
CREATE TEMP TABLE r2 AS SELECT public.sol_pin_conferir(pg_temp.pv('P'), pg_temp.v('cel')::uuid) j;
SELECT pg_temp.ok((SELECT (j->>'ok')::boolean AND j->>'segredo' <> (SELECT j->>'segredo' FROM r1) FROM r2), 'o PIN da conta confere no celular, com o segredo DO CELULAR');
SELECT pg_temp.ok((SELECT tentativas FROM public.sol_pin_info()) = 0, 'acertou: as tentativas zeram');
-- trocar sem o atual não vale (aparelho antigo); com o atual errado conta tentativa; com o certo troca e sobe a versão
SELECT pg_temp.ok((SELECT (public.sol_pin_definir(pg_temp.pv('R'), pg_temp.sal('t'), null, pg_temp.v('cel')::uuid))->>'erro') = 'sem_permissao', 'trocar sem o PIN atual: não pode');
SELECT pg_temp.ok((SELECT (public.sol_pin_definir(pg_temp.pv('R'), pg_temp.sal('t'), pg_temp.pv('X'), pg_temp.v('cel')::uuid))->>'erro') = 'pin', 'trocar com o PIN atual errado: não pode (e conta tentativa)');
SELECT pg_temp.ok((SELECT tentativas FROM public.sol_pin_info()) = 1, 'a tentativa errada da troca contou');
SELECT pg_temp.ok((SELECT ((public.sol_pin_definir(pg_temp.pv('R'), pg_temp.sal('t'), pg_temp.pv('P'), pg_temp.v('cel')::uuid))->>'versao')::int) = 2, 'trocar com o PIN atual: versão 2');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('P'), pg_temp.v('pc')::uuid))->>'erro') = 'pin', 'no computador, o PIN velho não vale mais');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('R'), pg_temp.v('pc')::uuid))->>'ok')::boolean, 'no computador, o PIN novo vale (trocou num, vale em todos)');
-- erros: espera a partir do 5º, bloqueio no 10º
SELECT public.sol_pin_conferir(pg_temp.pv('X'), pg_temp.v('pc')::uuid) FROM generate_series(1, 4);
SELECT pg_temp.ok((SELECT espera_ate IS NULL AND tentativas = 4 FROM public.sol_pin_info()), '4 erros: ainda sem espera');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('X'), pg_temp.v('pc')::uuid))->>'restam')::int = 5, '5º erro: restam 5');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('R'), pg_temp.v('pc')::uuid))->>'erro') = 'espera', 'depois do 5º erro, espera (nem o PIN certo entra antes da hora)');
RESET ROLE;
UPDATE public.sol_pin_conta SET espera_ate = now() - interval '1 second';
SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
DO $$ DECLARE i int; BEGIN FOR i IN 1..4 LOOP PERFORM public.sol_pin_conferir(pg_temp.pv('X'), pg_temp.v('pc')::uuid); RESET ROLE; UPDATE public.sol_pin_conta SET espera_ate = null; SET ROLE authenticated; END LOOP; END $$;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT public.sol_pin_conferir(pg_temp.pv('X'), pg_temp.v('pc')::uuid);
SELECT pg_temp.ok((SELECT NOT bloqueado AND tentativas = 10 AND espera_ate > now() + interval '23 hours' FROM public.sol_pin_info()), '10º erro: espera de 24 h (sem bloqueio definitivo)');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('R'), pg_temp.v('pc')::uuid))->>'erro') = 'espera', 'na espera de 24 h, nem o PIN certo entra');
SELECT pg_temp.ok((SELECT (public.sol_pin_definir(pg_temp.pv('S'), pg_temp.sal('u'), pg_temp.pv('R'), pg_temp.v('pc')::uuid))->>'erro') = 'espera', 'na espera, trocar com o PIN atual também não');
RESET ROLE;
UPDATE public.sol_pin_conta SET espera_ate = now() - interval '1 second';
SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('X'), pg_temp.v('pc')::uuid))->>'tentativas')::int = 11, 'passadas as 24 h, um erro novo conta (11)…');
SELECT pg_temp.ok((SELECT espera_ate > now() + interval '23 hours' FROM public.sol_pin_info()), '…e dá mais 24 h de espera');
RESET ROLE;
UPDATE public.sol_pin_conta SET espera_ate = now() - interval '1 second';
SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('R'), pg_temp.v('pc')::uuid))->>'ok')::boolean, 'passadas as 24 h, o PIN certo entra');
SELECT pg_temp.ok((SELECT tentativas FROM public.sol_pin_info()) = 0, '…e as tentativas zeram');
-- erra de novo até a espera de 24 h, para desbloquear NA HORA pela aprovação
DO $$ DECLARE i int; BEGIN FOR i IN 1..10 LOOP PERFORM public.sol_pin_conferir(pg_temp.pv('X'), pg_temp.v('pc')::uuid); RESET ROLE; UPDATE public.sol_pin_conta SET espera_ate = null; SET ROLE authenticated; END LOOP; END $$;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
RESET ROLE; UPDATE public.sol_pin_conta SET espera_ate = now() + interval '24 hours'; SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
-- desbloquear: aprovação PRÓPRIA (um aparelho novo aprovado pelo outro aparelho) → definir sem o atual
INSERT INTO t VALUES ('p1', public.sol_pedido_criar('Celular novo', 'moneytrio', jsonb_build_object('kty','EC','crv','P-256','x',repeat('B',43),'y',repeat('B',43)), repeat('C',43), null));
SELECT public.sol_pedido_desafio(pg_temp.v('p1')::uuid, jsonb_build_object('kty','EC','crv','P-256','x',repeat('A',43),'y',repeat('A',43)), repeat('a',43));
SELECT public.sol_pedido_revelar(pg_temp.v('p1')::uuid, repeat('b',43));
SELECT public.sol_pedido_aprovar(pg_temp.v('p1')::uuid, '{"v":2,"iv":"i","ct":"c"}', pg_temp.v('pc')::uuid);
INSERT INTO t VALUES ('novo', (SELECT aparelho FROM public.sol_pedido_buscar(pg_temp.v('p1')::uuid))::text);
SELECT pg_temp.ok((SELECT ((public.sol_pin_definir(pg_temp.pv('S'), pg_temp.sal('u'), null, pg_temp.v('novo')::uuid))->>'ok')::boolean), 'aparelho aprovado pelo outro há menos de 10 min define o PIN novo sem o atual (desbloqueia NA HORA, mesmo na espera de 24 h)');
SELECT pg_temp.ok((SELECT NOT bloqueado AND tentativas = 0 AND espera_ate IS NULL AND versao = 3 FROM public.sol_pin_info()), 'desbloqueado: tentativas zeradas, sem espera, versão 3');
-- passados 10 min, o mesmo aparelho já não troca sem o atual
RESET ROLE;
UPDATE public.sol_aparelhos SET criado_em = now() - interval '11 minutes' WHERE id = pg_temp.v('novo')::uuid;
SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT (public.sol_pin_definir(pg_temp.pv('T'), pg_temp.sal('v'), null, pg_temp.v('novo')::uuid))->>'erro') = 'sem_permissao', 'depois de 10 min, não troca mais sem o PIN atual');
-- aparelho aprovado pela FAMÍLIA não troca o PIN de outra pessoa sem o atual
RESET ROLE;
UPDATE public.sol_aparelhos SET como = 'familia', criado_em = now() WHERE id = pg_temp.v('novo')::uuid;
SET ROLE authenticated;
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT (public.sol_pin_definir(pg_temp.pv('T'), pg_temp.sal('v'), null, pg_temp.v('novo')::uuid))->>'erro') = 'sem_permissao', 'aparelho aprovado pela família não troca o PIN sem o atual');
-- aparelho que se registrou sozinho como "passkey" não troca o PIN sem o atual (o banco não confere a passkey)
INSERT INTO t VALUES ('pk', public.sol_aparelho_registrar('Passkey', 'moneytrio', 'passkey'));
SELECT pg_temp.ok((SELECT (public.sol_pin_definir(pg_temp.pv('T'), pg_temp.sal('v'), null, pg_temp.v('pk')::uuid))->>'erro') = 'sem_permissao', 'aparelho "passkey" (registrado por ele mesmo) não troca o PIN sem o atual');
-- outra pessoa: não usa o aparelho da Ana nem vê o PIN dela
SELECT pg_temp.quem('b8000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT NOT tem FROM public.sol_pin_info()), 'a Bia não vê o PIN da Ana (a conta dela não tem PIN)');
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('S'), pg_temp.v('pc')::uuid))->>'erro') = 'aparelho', 'a Bia não confere PIN pelo aparelho da Ana');
DO $$ BEGIN PERFORM public.sol_pin_definir(pg_temp.pv('Z'), pg_temp.sal('z'), null, pg_temp.v('pc')::uuid); RAISE EXCEPTION 'FALHOU: definiu pelo aparelho dos outros';
EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FALHOU%' THEN RAISE; END IF; RAISE NOTICE 'ok: ninguém define PIN pelo aparelho dos outros'; END $$;
-- aparelho tirado não confere
SELECT pg_temp.quem('a8000000-0000-0000-0000-000000000001');
SELECT public.sol_aparelho_tirar(pg_temp.v('cel')::uuid);
SELECT pg_temp.ok((SELECT (public.sol_pin_conferir(pg_temp.pv('S'), pg_temp.v('cel')::uuid))->>'erro') = 'aparelho', 'aparelho tirado não recebe o segredo nem com o PIN certo');
RESET ROLE;
SELECT pg_temp.ok((SELECT hv <> pg_temp.pv('S') AND length(hv) = 64 FROM public.sol_pin_conta WHERE user_id = 'a8000000-0000-0000-0000-000000000001'), 'o banco guarda só SHA-256(v), não o v');
SELECT pg_temp.ok(NOT has_function_privilege('anon', 'public.sol_pin_info()', 'execute'), 'visitante não chama as funções do PIN');
