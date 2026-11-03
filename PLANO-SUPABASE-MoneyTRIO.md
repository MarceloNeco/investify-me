# MoneyTRIO na nuvem (Supabase) — plano

Versão 1 · 03/Nov/2026 · dono: Marcelo · regra zero cumprida: decisões abaixo confirmadas pelo dono antes do código.

## Decisões do dono (03/Nov/2026)
1. **Mesmo projeto Supabase** dos outros apps (`solverone-app`): uma conta SolverONE vale em todos.
   (O "projeto separado só para finanças" do plano do robô de 02/Nov foi descartado: contraria o contrato
   `PLATAFORMA-DADOS.md` e não traz segurança extra quando tudo já vai cifrado.)
2. **Tudo de finanças vai cifrado no aparelho** antes de subir. A tabela `money_docs` nem tem coluna em claro:
   o banco guarda só família, tipo do registro, id, pacote cifrado e carimbos.

## Como fica
- Uma tabela: `money_docs` (`grupo_id`, `colecao`, `id`, `dados_cifrado`, `versao`, carimbos, `apagado_em`).
  Cada lançamento, conta, cartão, posição, categoria, item do cadastro… é uma linha.
- **Quem vê:** só **chefe e responsável** da família (`sol_grupo_membros`). Membro comum e criança não veem.
  Visitante (`anon`) não toca em nada. Ninguém apaga de verdade pelo app (apagar = marcar `apagado_em`).
- **Cifra:** a mesma da plataforma (contrato C7). Chave da família AES-GCM 256 embrulhada para a chave pública
  de cada chefe/responsável (`sol_grupo_chaves`); par de chaves da pessoa em `sol_chave_publica`.
  Sem a chave, o pacote não abre, mesmo que uma regra de acesso falhe.
- **LGPD (C8):** `money_anonimizar(uuid)`, registrada em `sol_apps`.
- Sincronia como no OmniLifeONE: cópia local no aparelho, fila de mudanças, trava otimista por `versao`.

## Etapas
| # | O que | Situação |
|---|---|---|
| 0 | Diretriz atualizada do master (rootify-one) e verificador `teste/sql-grants.js` | ✅ 03/Nov/2026 |
| 1 | `supabase/2026-11-03-moneytrio-v1.sql` (tabela, regras, LGPD, permissões) | ✅ testado num Postgres local; **aplicado no solverone-app em 03/Nov/2026** ("pode aplicar" do dono; migração `moneytrio_v1_2026_11_03`), conferência 5/5 "sim", 0 registros |
| 2 | App: login da conta SolverONE, família, cadeado (PIN, digital, código de recuperação), sincronia | ✅ **no app principal desde a 3.30** (03/Nov/2026, `nuvem.js` 1.1.0), depois do teste do dono na página de teste (login Google, código, PIN, caixa do robô) |
| 3 | Levar para dentro o cadastro do robô (`financas-robo/CADASTRO.md`) e os lançamentos de 2026 | a fazer |
| 4 | Robô deixa os lançamentos na **caixa da família** (`money_entrada`, pacote fechado para a chave pública da caixa) | SQL `supabase/2026-11-03b-moneytrio-caixa-robo.sql` testado localmente e **aplicado no solverone-app em 03/Nov/2026** (~12:50 UTC, migração `moneytrio_v2_caixa_robo_2026_11_03`, "pode aplicar" do dono); conferência ok (3 tabelas com RLS, 5 regras, visitante sem acesso, robô só pela função); o app já esvazia a caixa (`nuvem.js`, `Caixa`) |
| 5 | Apagar dados e cadastro do GitHub (`financas-robo`) | só com o "ok" do dono |

## Ponto para o chat Arquitetura (antes da etapa 2)
A cópia cifrada da **chave privada** da pessoa (para usar outro aparelho) hoje fica em `omni_chave_privada`,
tabela do OmniLifeONE. O MoneyTRIO usa o **mesmo par de chaves** (a chave da família é embrulhada para ele).
Proposta: levar essa cópia para a base (`sol_chave_privada`), num script novo datado no rootify-one, e os dois
apps passarem a usar a da base. Até lá, o MoneyTRIO não cria par de chaves próprio.

## Testes feitos (Postgres 16 local, stub do Supabase + base + OmniLifeONE)
Rodou duas vezes sem erro (idempotente); conferência final 5/5 "sim"; chefe grava; responsável lê e muda
(versão sobe); membro e pessoa de fora não veem nem gravam; sem pacote é recusado; apagar de verdade recusado;
mudar id recusado; visitante sem acesso; app não chama a LGPD; LGPD esvazia a família quando a pessoa era a
única com conta e limpa os carimbos. `node teste/sql-grants.js supabase`: OK.

## Depois de aplicar (03/Nov/2026)
Verificador de segurança do Supabase: o único aviso do MoneyTRIO é `money_posso_ver` poder ser chamada por quem
está logado. É de propósito (as regras de acesso usam essa função; ela só responde se a própria pessoa é chefe ou
responsável de uma família), igual às `omni_sou_*`. O aviso de `spatial_ref_sys` sem RLS é antigo e de fora do app.

## Etapa 2 — como ficou (03/Nov/2026; no app principal desde a 3.30)
- **Arquivos:** `index.html` (começa por `MoneyNuvem.portao`) + `nuvem.js`. A `teste-nuvem.html` virou redirecionamento para `./`.
- **Sem conta:** "Usar o MoneyTRIO só neste aparelho" continua (o app de sempre, no localStorage).
- **Conta:** a mesma SolverONE (`solverone.sessao.v1`), e-mail/senha e Google, REST sem biblioteca (igual ao OmniLifeONE).
- **Família:** `sol_meus_grupos`, só chefe/responsável. Última escolhida fica em `moneytrio.nuvem.familia`.
- **Cadeado:** o mesmo par de chaves e a mesma chave da família (CF) do OmniLifeONE. Primeira vez: código de recuperação →
  `omni_chave_privada` (PBKDF2 600 mil) → chave privada → `sol_minha_chave_grupo` → CF. Depois: PIN (PBKDF2 600 mil) e digital
  (WebAuthn PRF) abrem a chave do aparelho, que guarda as outras fechadas no IndexedDB `moneytrio-nuvem` (store `kv`,
  `cadeado|<conta>`). Chaves abertas só na memória. 10 erros de PIN bloqueiam (espera a partir do 4º). Fecha sozinho (3.31) com
  15 min sem uso (avisa 1 min antes) ou 10 min fora do app, nunca no meio de um trabalho; sem recarregar: a tela do cadeado
  cobre o app e a chave da família sai da memória.
- **Registros:** `money_docs`, um por item. `colecao` = nome da lista do Store (`gastos`, `recorrentes`, `posicoes`,
  `movimentos`, `cartoes`, `bancos`, `pagamentos`, `precos`, `extratos`, `agenda`, `metas`, `beneficios`, `lugares`,
  `trajetos`, `tax_declaracoes`, `tax_processos`, `tax_docs`); o resto do estado vai em `colecao = 'config'`, `id` = nome do
  campo (`config` sem as chaves de API, `categorias`, `vistos`, `tax`, …). `config/caixa_robo` = parte secreta da caixa do robô.
  Pacote = `{"c":1,"kv","fk","iv","ct"}` (AES-GCM 256 com a CF, iv novo por registro, mesmo formato do cofre do Omni).
- **Sincronia:** cópia fechada no aparelho (store `docs`), fila (store `fila`), POST em lote sem sobrescrever para novos,
  PATCH com `versao=eq.` (trava otimista) para mudados; conflito junta campo a campo (o campo mudado aqui ganha). Busca a cada
  20 s, ao voltar ao app e quando a internet volta (cursor `atualizado_em` com folga de 2 min).
- **Levar para a nuvem:** se o aparelho tem dados no MoneyTRIO sem nuvem e a nuvem da família está vazia, oferece antes de
  tudo (com cópia de segurança). Os dados continuam também no aparelho.
- **Caixa do robô:** o primeiro chefe/responsável que abre cria o par RSA-OAEP 3072 da caixa (secreta em `money_docs`
  primeiro, depois a pública em `money_caixa_chave`). A cada busca, abre `money_entrada` não aproveitadas, vira lançamento
  (`id = rb_<id do robô>`, sem duplicar), grava fechado e só então marca `money_entrada_consumir`.
  Formato do pacote e código de referência em Python: `teste/robo-pacote/pacote_caixa.py`; vetor fixo: `vetor-caixa-robo.json`.
- **Testes:** `node teste/teste-nuvem.js` (Chromium, Supabase de mentira, 52 verificações: Python ↔ navegador, dois aparelhos,
  conflito, robô, PIN, trava de apagar em massa, sem erro de página em 390x800 e 1366x768). SQL: `teste/sql/LEIA-ME.md`.
  No Supabase real (só leitura, 03/Nov): formato de `omni_chave_privada` (600 mil, `iv/ct/kid`) e de `sol_grupo_chaves`
  (`1.`) confere; visitante recebe 401 em `money_docs`; `money_docs` vazio. Depois de aplicar o v2: `money_robo_depositar(p_grupo uuid, p_itens jsonb) → integer` como no contrato do robô; a chave da caixa da família já foi criada pelo app (1 linha em `money_caixa_chave`); nenhum robô autorizado ainda.
