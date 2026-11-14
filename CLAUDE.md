# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.


---

# SolverONE — regras do projeto para o Claude Code

Antes de qualquer alteração neste repositório, leia e siga **inteira** a diretriz geral da plataforma em
`.claude/skills/diretrizes-gerais-apps/SKILL.md` (ela também é carregada como skill `diretrizes-gerais-apps`).

Resumo do que nunca pode ser esquecido (o detalhe está na diretriz):

- **Regra zero**: antes de implementar no app um requisito da diretriz que ainda não existe aqui, liste o que
  falta e confirme com o dono. Não crie repositórios nem publique (push/Pages) sem permissão explícita.
- **Segurança**: nenhuma senha, chave de API, token ou segredo entra no código, no repositório, no chat ou em
  arquivo. Chaves de IA ficam só no cofre do navegador da pessoa. Se uma chave aparecer no chat, peça para revogar.
- **Idioma** (dono, 14/Nov/2026): textos para o usuário em **PT (Brasil), EN (EUA) e ES (Espanha)**, tradução
  humanizada; **um seletor só em todo lugar**, bandeira + sigla (🇧🇷 PT · 🇺🇸 EN · 🇪🇸 ES), componente do módulo comum,
  nunca toggle ou dropdown próprio; ES só aparece num app quando ele está 100 % traduzido (até lá, PT|EN). Detalhe na
  diretriz, "Idioma e datas". Instruções para o dono em português, passo a passo, como para iniciante (ele não é
  desenvolvedor).
- **Entrega**: um `.zip` por app, nome `<NOME APP> <VERSAO> <dd-Mmm-aaaa> <HHhMMm>.zip`, arquivos soltos na
  raiz; atualizar `versoes.json`, a versão no código, o `sw.js` e `ARQUITETURA.md`/`PENDENCIAS.md`.
- **Trabalho demorado** (foto, OCR, IA, importação, áudio) roda no módulo `Fundo`: nunca morre ao sair da tela,
  Wake Lock, aviso antes de fechar, pílula de andamento, resultado entregue onde a pessoa estiver.
- **Feedback dos usuários**: pergunta do dia, 💬 em toda tela e no AssistONE, tudo estruturado no RootifyONE.

## Aviso do dono (13/Nov/2026): Definition of done da plataforma (12 pontos), até sair a diretriz nova

A Definition of done da plataforma passa a ter 12 pontos:
1. manual e orientações;
2. AssistONE;
3. Novidades da versão;
4. termos;
5. comunicações e e-mails;
6. RootifyONE;
7. ArchONE;
8. EaglePlanONE (roadmap);
9. retrocompatibilidade;
10. segurança e LGPD;
11. qualidade verificável;
12. registro.

Vai nascer também uma teia de integrações entre os apps, o RootifyONE, o ArchONE e o EaglePlanONE (eventos e comandos, com aprovação). Quando a diretriz nova da conversa de diretrizes da SolverONE sair, siga a diretriz.

- **Aplicabilidade:** cada ponto vale quando se aplica ao estágio atual deste app. O que não se aplica hoje é dito como "não aplicável hoje", com o motivo em uma linha. Este aviso não é motivo para criar login, migrar para banco nem criar integração. Quando o app ganhar login, banco ou integração nova, ele já nasce cumprindo os pontos que passaram a valer.
- **Em cada entrega:** o resumo diz o que o RootifyONE, o ArchONE ou o EaglePlanONE precisariam saber (integração nova ou removida, recurso novo, item do roadmap concluído).
  Na linha do **ArchONE** (que mostra recursos — banco, código, Cloudflare, GitHub e outros serviços —, as ligações entre eles, o estado, a
  capacidade e a performance), escreva só: recurso novo ou removido (tabela, bucket, função de banco, serviço); ligação nova ou removida entre
  recursos ou apps; mudança de estado ou capacidade. Lógica interna do app não entra. Ex.: "3 tabelas novas no Supabase (money_visao,
  money_chaves, money_migracao); nenhuma ligação nova (o robô no GitHub continua → Supabase)".
- **Integração:** nenhuma integração nova sem a regra zero (listar e confirmar com o dono).
