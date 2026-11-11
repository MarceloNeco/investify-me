# Desenho — "visão da casa" (dois cofres) no MoneyTRIO · 3.66 (rascunho para OK, nada construído)

Pedido do dono, 11/Nov/2026: um membro da família (a esposa, "Beta" nos exemplos) entra e vê só a parte da casa. Ela não vê
os lançamentos do chefe um a um, a renda dele, investimentos, patrimônio e IR, **e não percebe que há algo escondido**.
Esconder na tela não basta: precisa de **escopo de chave** e de **regra no banco**.

## 0. O ponto de partida (o que existe hoje)

- Tudo do MoneyTRIO (money_docs, ~5.000 linhas; ~2.400 seriam reservadas) está fechado com a **CF**, a chave da família da plataforma
  (`sol_grupo_chaves`). A CF é embrulhada para **todo membro ativo**, inclusive o papel `membro`, e também abre as Senhas da casa do
  OmniLifeONE. Se ela entrar na família, ela recebe a CF.
- Hoje quem barra é só o RLS (`money_posso_ver` = chefe ou responsável). Se ela entrasse como responsável, leria tudo.
- **Caixa do robô:** a chave privada da caixa está em `money_docs config|caixa_robo`, fechada com a **CF**. A tabela `money_entrada`
  só é lida por chefe e responsável. Ou seja: hoje, **um responsável com a CF lê tudo o que está na caixa**. Um `membro` é barrado
  só pelo RLS, numa camada só.
- Os comprovantes (bucket `money-arquivos`, `<grupo>/<id>`) estão fechados com a CF.

## 1. Chaves (cripto)

Duas chaves novas, só do MoneyTRIO, aleatórias (AES-256-GCM, como a CF). **A CF da plataforma não é tocada.**

| Chave | Fecha | Vai para |
|---|---|---|
| **CC** — chave da casa | o escopo `casa` | quem tem visão `casa` ou `tudo` |
| **CR** — chave reservada | o escopo `reservado` | só quem tem visão `tudo` (hoje, só o chefe) |

- **Distribuição:** cada chave é embrulhada com RSA-OAEP-256 para a chave pública da pessoa (`sol_chave_publica`, a mesma usada
  na CF). Fica numa tabela nova `money_chaves (grupo_id, user_id, escopo, versao, embrulhada, embrulhada_por, criado_em)`, com estas regras:
  - cada um lê só as suas linhas;
  - só quem tem visão `tudo` grava, pela função `money_chave_guardar`;
  - uma versão nunca é sobrescrita.
- **No aparelho:** `L.fam[gid]` passa a guardar também `cc` e `cr`, fechadas com a chave do aparelho (DUK), como a CF hoje. O PIN, a
  digital e o modo sem internet continuam iguais.
- **Aprovação de aparelho:**
  - **pessoal** (outro aparelho meu ou passkey): vem a chave privada pessoal, que desembrulha `money_chaves`;
  - **pela família:** o aprovador manda a CC, e manda a CR **só** se quem pede tem visão `tudo` (o app confere `money_visao` de quem
    pede) e o aprovador tem a CR.
  - Um aparelho do chefe aprovado pela família por quem não tem a CR vê só a casa, com o aviso "Aprove por um aparelho seu para ver
    tudo".
- **Girar a CF?** Recomendo **não** girar no MoneyTRIO:
  1. A CF abre também as Senhas da casa (OmniLifeONE). Girá-la é uma ação da plataforma (re-cifrar o cofre do OmniLifeONE).
  2. Com CC e CR novas e a migração (seção 6), **a CF deixa de abrir qualquer registro vivo do MoneyTRIO**. Para o MoneyTRIO, isso é o
     mesmo que girar.
  3. **Risco que sobra:** os backups do Supabase guardam as linhas antigas fechadas com a CF. Ela não tem acesso a backups. Se o dono
     quiser zerar também isso e as Senhas, vira um pedido à plataforma (RootifyONE e OmniLifeONE): girar a CF.

## 2. Dados (SQL v3 — `supabase/2026-11-1x-moneytrio-escopos.sql`, rascunho depois do OK)

- **`money_docs` ganha `escopo text not null default 'casa'`**, com `check (escopo in ('casa','reservado'))` e
  `check ((escopo = 'reservado') = (id like 'r.%'))`. O item reservado tem outro id (`r.` + id), então os dois escopos nunca disputam a
  mesma linha. A chave primária continua a mesma.
- **Visão por pessoa:** tabela `money_visao (grupo_id, user_id, visao 'tudo'|'casa', definido_por, em)` e função
  `money_visao(grupo) → 'tudo' | 'casa' | null`:
  - o chefe é sempre `tudo`;
  - qualquer outro (responsável inclusive) só com uma linha explícita do chefe;
  - para os outros, só vale uma linha explícita gravada pelo chefe.
- **RLS em money_docs:**
  - **ler:** `money_visao(g) = 'tudo' or (money_visao(g) = 'casa' and escopo = 'casa')`. As linhas reservadas **nem chegam** ao aparelho
    dela: não há contagem, nem id, nem tombstone.
  - **criar e mudar:** a mesma regra. O gatilho `money_docs_chave_fixa` impede mudar grupo, coleção, id e escopo de uma linha; o check
    (escopo reservado ⇔ id `r.`) amarra o escopo ao id. Quem tem `casa` só grava `casa`. Mover de escopo = apagar num escopo e criar no
    outro.
  - **só chave nova:** depois que a família tem as chaves do MoneyTRIO, o gatilho `money_docs_so_chave_nova` recusa registro fechado
    com a CF (um aparelho ou app antigo nunca vaza).
- **Só o chefe é `tudo` sem linha.** Qualquer outro, responsável inclusive, precisa de uma linha do chefe em `money_visao`.
- **Visão `casa` só depois da migração concluída** (`money_migracao`, gravada pelo chefe com `money_migracao_concluir`, que confere
  que nenhuma linha viva está com a CF). Antes disso `money_visao_definir(…, 'casa')` dá 42501.
- **Papel dela na plataforma:** `membro`, não `responsavel`. Assim ela não guarda chaves para outros nem aprova pela família. No
  MoneyTRIO, quem decide é `money_visao`. A pergunta sobre o OmniLifeONE (o que ela vê lá) está no item 9.

## 3. O que é de cada escopo

A classificação é feita no aparelho do chefe, numa regra só (`Escopo.de(registro)`, módulo novo `modulos/escopo.js`).

**casa:**
- compromissos e recorrentes (todos), Futuro, seguros (vida inclusive), contas fixas, escola, condomínio;
- **lançamentos:**
  - os de quem/quemId = ela;
  - os do cartão cujo "Quem usa" = ela (o Visa final 4189);
  - as transferências "Entre a família" (as dele para ela e as dela para ele);
  - **os que pagam um compromisso** (ligados a ele, mesmo que saiam do débito do chefe);
- a **renda dela** (o aluguel do apto: "quem recebe" = ela);
- as pessoas, as categorias e a configuração da casa;
- os bancos e cartões usados por ela ou pelos compromissos;
- os comprovantes desses itens.

**reservado:** todo o resto:
- os lançamentos dele, o Black, o débito dele e as transferências dele que não são para ela;
- a renda dele;
- posições, movimentos e patrimônio;
- TaxONE, IR e declarações;
- o saldo do banco das contas dele;
- os bancos e cartões só dele;
- a configuração do robô, do espelho e da caixa;
- os comprovantes desses itens.

**Totais da família (resumo):**
- uma coleção nova `resumo`, no escopo `casa`, com id `AAAA-MM`: `{saida por grupo, total, n}` de **todos** os gastos da família;
- a renda dele não entra; investimento e transferência entre contas também não;
- quem calcula é o aparelho do chefe: depois de cada mudança (com uma pequena espera) e, uma vez, para os meses antigos.

**Mudou de escopo depois:** por exemplo, ela passa a usar outro cartão. O aparelho do chefe move o item: cria no outro escopo e
apaga no antigo. Ela vê o item aparecer ou sumir, nunca o conteúdo reservado.

**Reclassificar** (revisão da sessão principal): o gatilho proíbe mudar o escopo de uma linha. Então "o app do chefe reclassifica para
casa" é **criar a linha casa (id sem `r.`, CC) e apagar DE VERDADE a `r.`**, pela função `money_reservar_mover(grupo, colecao, id, para)`, só
para visão `tudo`. Casa → reservado deixa tombstone na casa (ela já tinha visto); reservado → casa apaga a `r.` sem tombstone. Teste próprio
nos dois sentidos: ela vê aparecer, o conteúdo reservado nunca chega, nada fica em dobro.

**Resumo velho:** o `resumo` guarda `atualizado_em`; o Painel dela mostra "Totais da família · atualizado em dd/mm" (se o chefe ficar dias sem
abrir o app, ela sabe que os totais são de antes).

**Um compromisso só dele** (ex.: o contador da PJ): proponho um interruptor "Só eu vejo" no compromisso, que vale também para os
pagamentos dele (item 9).

## 4. Telas

- **Para ela, a visão casa:**
  - o MoneyTRIO abre direto no BudgetONE; **InvestifyONE e TaxONE não existem no menu** (nem como "bloqueado");
  - **Painel:**
    - "Gastos da família", do `resumo`: por mês e por grupo, com o total;
    - "Os seus", com os lançamentos dela em detalhe;
    - em "Entrou", só a renda dela;
    - o cartão "Sobrou" da família sai: renda dela menos o gasto da família seria um número sem sentido;
  - **Lançamentos:** os que ela vê; ela edita a categoria, a descrição e o "para quem";
  - **Custos, Compromissos e Futuro:** completos, sem a renda dele (o Futuro projeta só os compromissos e os gastos);
  - **Configurações:** sem robô, espelho, caixa e "Segurança e aparelhos → robô";
  - nenhum texto "oculto", "restrito" ou "escondido"; nenhuma contagem que não feche (ex.: "61 de 61 lançamentos" conta só os dela).
- **Para o chefe:**
  - **Configurações → "Família no MoneyTRIO":** para cada membro, Visão "Tudo" ou "Só a casa", e o botão "Liberar o MoneyTRIO",
    que embrulha a CC (e a CR, se Tudo);
  - no Painel, **"Ver como ela vê"**: uma prévia da visão casa, sem sair da conta dele.

## 5. Caixa do robô, espelho e ponte

**Caixa:** duas caixas, com duas chaves RSA (`money_caixa_chave` ganha `escopo`):
- a privada da casa fica em `config|caixa_casa`, no escopo casa (CC);
- a privada reservada fica em `r.config|caixa_robo` (CR);
- `money_entrada` ganha `escopo`; o RLS e `money_entrada_consumir` seguem a mesma regra do money_docs.

**Robô** (com a sessão principal):
- em cada item, `escopo`:
  - `casa` se quem = Beta (PLUGGY_ITENS_FAMILIA), se o cartão tem CARTAO_QUEM = Beta (final 4189) ou se é transferência entre a família;
  - **senão, `reservado`** (seguro por padrão);
- fecha o pacote com a chave pública daquele escopo (lê as duas em `money_caixa_chave`);
- `money_robo_depositar` passa a aceitar `escopo` em cada item; sem o campo, vale `reservado`;
- no reenvio, mesmo id e o escopo de agora.

**Apps:**
- o app **dela** abre só a caixa da casa: os lançamentos dela chegam mesmo se o chefe não abrir o app;
- o app do chefe abre as duas, e o pagamento de compromisso que chegou `reservado` (ex.: condomínio no débito dele) ele
  reclassifica para `casa`.

**Espelho (planilha):** só quem tem visão `tudo` deposita (função e RLS). A planilha continua sendo a do chefe, com tudo.

**Ponte com o OmniLifeONE:** só quem tem visão `tudo` processa. Ela vem fechada com a CF e é tratada pelo app do chefe.

**Comprovantes:**
- os reservados vão para `<grupo>/r/<id>`, fechados com a CR (policy do storage: o prefixo `r/` só para visão `tudo`);
- os da casa são recifrados com a CC.

## 6. Migração (antes do convite; só o aparelho do chefe; pelo `Fundo`, retomável)

1. **Aplicar o SQL v3.** As colunas nascem com o default: tudo fica `casa` e o app de hoje segue igual.
2. **App 3.66, no aparelho do chefe:** a tela "Preparar a visão da família".
   - Gera a CC e a CR e as embrulha para ele.
   - Classifica cada registro.
   - Casa: re-cifra com a CC (mesmo id).
   - Reservado: cria `r.` + id com a CR, e o antigo é **apagado de verdade** pela função `money_reservar_migrar(grupo, ids[])`. Ela só
     roda para visão `tudo` e só enquanto **ninguém** tem visão `casa`; depois disso, mover deixa um tombstone.
   - Lotes de 200, com a barra de andamento.
3. **Caixa:** gera as duas chaves, publica, apaga a antiga (`config|caixa_robo`) e apaga os pacotes já consumidos. Os não consumidos
   ficam até o chefe processar.
4. **Resumos** de todos os meses.
5. **Comprovantes:** recifrar e mover.
6. **Os outros aparelhos do chefe:** um marcador `r.config|escopos` (versão) faz cada um apagar a cópia local e baixar de novo.
   Senão, eles guardariam os ids antigos.
7. **Conferência no fim, feita pelo app:**
   - **nenhuma** linha viva decifra com a CF;
   - todas as casa decifram com a CC; as reservadas, só com a CR;
   - as contagens por escopo batem com as de antes.
8. **Só então o convite** (pela plataforma, como `membro`). No MoneyTRIO: "Liberar" com "Só a casa", que embrulha só a CC.

## 7. Testes

**`teste/teste-visao-casa.js`:** dois contextos (chefe e membro), mock com RLS por escopo e visão, dados fictícios com marcadores
únicos.

- **Migração:** nenhuma linha viva abre com a CF; casa abre com a CC; reservado só com a CR; as contagens batem.
- **Membro:**
  - via API (GET money_docs sem filtro) não recebe nenhuma linha `r.` nem tombstone da migração;
  - **o IndexedDB dela** não tem nenhum id `r.` nem nenhum marcador dos itens reservados (busca no conteúdo aberto e no fechado);
  - `money_entrada` reservado: nada;
  - gravar `reservado` ou mudar o escopo: recusado.
- **Totais:**
  - o "Gastos da família" dela por mês e grupo = a soma de todos os gastos no aparelho do chefe;
  - o marcador da renda dele não aparece em lugar nenhum (DOM, IDB, rede).
- **Editar:** ela muda a categoria de um compartilhado, o chefe recebe, e a trava otimista funciona.
- **Robô:**
  - um item `casa` chega para ela com o chefe fechado;
  - um item reservado não chega;
  - o pagamento de compromisso que veio reservado é reclassificado pelo chefe e aparece para ela.
- **"Não percebe":** no menu e nas telas dela não há InvestifyONE, TaxONE, renda dele, "oculto", "restrito" nem contagem quebrada.
- **Chefe:** espelho, robô, Segurança e aparelhos e o modo sem internet continuam funcionando.
- **SQL:** `teste/sql/teste-escopos.sql` no Postgres local (o RLS de cada regra, como no PIN da conta).

## 8. O que muda no robô (é com a sessão principal)

1. O campo `escopo` em cada item (`casa` | `reservado`), pela regra da seção 5; **na dúvida, `reservado`**.
2. Fechar cada pacote com a chave pública **do escopo** (`money_caixa_chave` com `escopo`).
3. `money_robo_depositar(p_grupo, p_itens)`: cada item leva `escopo`.
4. O reenvio usa o mesmo id; se o escopo mudou (ex.: CARTAO_QUEM mudou), manda no novo.

## 9. Perguntas para o dono (antes de construir)

1. Ela entra na plataforma como `membro`, e não como responsável. Ela recebe a CF, que abre as **Senhas da casa** do OmniLifeONE:
   pode? Se não, é outro escopo, no OmniLifeONE.
2. Algum compromisso é só dele (contador PJ, pensão, presente)? Se for, terá o interruptor "Só eu vejo".
3. Para ela, o Painel fica sem o cartão "Sobrou" da família. Ok?
4. Os bancos dele que pagam contas da casa aparecem para ela só como nome ("Itaú") nos compromissos, sem saldo nem extrato. Ok?
5. Girar a CF da plataforma também (zera o risco dos backups e protege as Senhas)? É um pedido separado à plataforma.

## 10. Gráficos do Painel (o defeito visto pelo dono)

Conferido em 1366, 1920 e celular, nos dois temas, com os grupos reais:

- **Grandes:** em 1920 os cartões têm ~1.650 px de largura e as barras ocupam tudo.
  - "Para onde foi": a rosca fica pequena num canto e as legendas atravessam a tela.
  - "Mês a mês": barras de ~700 px por lado.
  - "Os meses caros do seu ano": 12 linhas empilhadas com barra fina, ~600 px de altura.
- **Escuros e esquisitos:**
  - cores de grupo escuras sobre o fundo escuro (Lazer verde-escuro; Habitação e Dependentes em azul e laranja fechados);
  - trilho das barras quase da cor do fundo;
  - na visão do grupo "Sem grupo", a cor é a do texto secundário (cinza).

**Proposta (3.66, junto, ou antes como 3.65.1 se o dono quiser já):**
- **No desktop:**
  - "Para onde foi" e "Mês a mês" lado a lado (2 colunas a partir de 1200 px);
  - barras com largura máxima (~640 px) e rosca maior (220 px);
  - "Os meses caros" vira **12 colunas verticais** compactas (~160 px de altura), com o mês e o valor no toque ou no hover.
- **Paleta própria dos gráficos** (dark e light), clara no escuro e com contraste ≥ 3:1 contra o fundo do cartão; trilho visível.
- **Celular:** o mesmo, em 1 coluna; os meses em colunas também.
- **Teste:** fotos em 1366, 1920 e 390 nos dois temas, e conferência do contraste das cores pelo estilo calculado.
