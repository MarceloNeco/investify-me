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
| 2 | App: login da conta SolverONE, família, cofre (PIN, digital, código de recuperação), sincronia | a fazer |
| 3 | Levar para dentro o cadastro do robô (`financas-robo/CADASTRO.md`) e os lançamentos de 2026 | a fazer |
| 4 | Robô grava direto no MoneyTRIO (pacote cifrado para a chave pública da família) | a fazer |
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
