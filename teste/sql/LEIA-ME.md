# Teste local dos SQLs do MoneyTRIO (Postgres no computador)

**Nunca rode `teste-moneytrio-caixa.sql` no Supabase**: cria pessoas e dados de mentira.

Precisa de um Postgres 16 descartável e dos arquivos de outros repositórios (só leitura):
`rootify-one/teste/sql/stub-supabase.sql`, os SQLs da base em `rootify-one/entrega/solverone-app/supabase/`
e `omnilife-one/supabase/omnilife-one-v1.sql`.

```
createdb lab
psql -d lab -v ON_ERROR_STOP=1 -f rootify-one/teste/sql/stub-supabase.sql
for f in 2026-09-28a-nunca-excluir-e-encerrar-conta 2026-09-28b-lgpd-solicitacoes-e-anonimizacao \
         2026-09-28c-registro-de-acessos 2026-10-02-meu-papel-equipe 2026-10-02b-reativar-estado-anterior-e-travas \
         2026-10-03-plataforma-dados-v1 2026-10-10-feedback-usuarios 2026-10-16-manter-banco-acordado; do
  psql -d lab -v ON_ERROR_STOP=1 -f rootify-one/entrega/solverone-app/supabase/$f.sql > /dev/null
done
psql -d lab -v ON_ERROR_STOP=1 -f omnilife-one/supabase/omnilife-one-v1.sql > /dev/null
psql -d lab -v ON_ERROR_STOP=1 -f investify-me/supabase/2026-11-03-moneytrio-v1.sql > /dev/null
for i in 1 2; do psql -d lab -v ON_ERROR_STOP=1 -f investify-me/supabase/2026-11-03b-moneytrio-caixa-robo.sql; done
psql -d lab -f investify-me/teste/sql/teste-moneytrio-caixa.sql 2>&1 | grep -E "ok:|FALHOU"
for i in 1 2; do psql -d lab -v ON_ERROR_STOP=1 -f investify-me/supabase/2026-11-03c-moneytrio-robo-correcao.sql; done
psql -d lab -f investify-me/teste/sql/teste-moneytrio-correcao.sql 2>&1 | grep -E "ok:|FALHOU"
node investify-me/teste/sql-grants.js investify-me/supabase
```

Resultado em 03/Nov/2026 (Postgres 16.15): o v2 rodou duas vezes sem erro, conferência 5/5 "sim",
51 verificações "ok", nenhuma falha; `sql-grants.js`: OK (10 objetos, todos com GRANT).

v3 (correção do robô), 03/Nov/2026 (Postgres 16): rodou duas vezes sem erro, conferência 4/4 "sim"; com o v3 aplicado o
teste do v2 continua com 51 "ok", e `teste-moneytrio-correcao.sql` deu 23 "ok"; `sql-grants.js`: OK (3 scripts).

v4 (arquivos no Storage), 06/Nov/2026: depois do v1–v3, `for i in 1 2; do psql -d lab -v ON_ERROR_STOP=1 -f investify-me/supabase/2026-11-06-moneytrio-arquivos.sql; done`
e `psql -d lab -f investify-me/teste/sql/teste-moneytrio-arquivos.sql 2>&1 | grep -E "ok:|FALHOU"` → rodou duas vezes, conferência 3/3 "sim",
14 "ok" (o stub do Supabase tem storage.buckets e storage.objects com RLS).
