# MoneyTRIO — como o app é feito por dentro

Versão do documento: 3.4 · Setembro de 2026

Este arquivo é para quem for mexer no código depois — inclusive uma IA
a quem você peça "muda tal coisa no MoneyTRIO". Leia as três primeiras
seções antes de tocar em qualquer arquivo.

---

## 1. Em uma frase

O MoneyTRIO é um site estático: só HTML, CSS e JavaScript escritos à
mão. Não usa React, nem Vue, nem nenhuma biblioteca de tela. Não tem
servidor, não tem banco de dados, não tem build obrigatório para
funcionar — se você abrir `index.html` direto no navegador, ele roda.

Os dados ficam no navegador de quem usa. Nada é enviado para lugar
nenhum, exceto quando a própria pessoa liga uma função que precisa de
internet (cotação, notícia, IA, Google Drive).

---

## 2. O que NÃO mexer

| Nunca | Por quê |
|---|---|
| Não suba `MoneyTRIO-local.html` no GitHub | é a carteira aberta, sem senha |
| Não suba `NAO-SUBIR-NO-GITHUB-backup-carteira.json` | mesma coisa, em texto puro |
| Não escreva chave de API em nenhum arquivo do projeto | o repositório é público |
| Não escreva senha de e-mail nem chave secreta em arquivo nenhum | idem |
| Não traduza o que a pessoa digitou | nome de categoria, de fundo, de pessoa, descrição de lançamento — ver §6 |
| Não troque `esc()` por concatenação direta ao montar HTML | é o que segura XSS |
| Não use `<a href="' + link + '">` com link de fora | use `urlSegura(link)` — ver §8 |

**Vão para o GitHub exatamente 5 arquivos:**
`index.html`, `manifest.json`, `sw.js`, `icone-192.png`, `icone-512.png`.
Mais nada.

---

## 3. Os dois arquivos que a pessoa recebe

| Arquivo | O que tem dentro | Onde vive |
|---|---|---|
| `index.html` | app inteiro + carteira **cifrada** (AES-GCM, senha `investify2026`, 210.000 voltas de PBKDF2) | vai para o GitHub, é o site |
| `MoneyTRIO-local.html` | app inteiro + carteira **aberta** (gzip em base64), abre sem senha | fica só no computador dele |

Os dois são gerados pelo mesmo script a partir da mesma pasta de código
(§4). O que muda é só o bloco da carteira no fim do arquivo e o fato de
que a versão local não liga o `manifest.json`.

---

## 4. Onde o código mora e como vira um arquivo só

```
investify-me/
  index.html              ← o esqueleto: <head>, topo, menus, modais, <script src=...>
  assets/css/style.css    ← todo o visual, um arquivo só
  assets/js/*.js          ← 40 arquivos, carregados na ordem que está no index.html
  pwa/                    ← manifest.json, sw.js, icone-192.png, icone-512.png
gerar/
  gerar-arquivo-unico.py  ← junta tudo num HTML só
entrega3/                 ← o resultado: index.html, MoneyTRIO-local.html e os 4 do PWA
```

Para gerar:

```
python3 gerar/gerar-arquivo-unico.py
```

O script lê `index.html`, troca cada `<script src=...>` e o `<link
rel=stylesheet>` pelo conteúdo do arquivo, gruda a carteira no fim e
escreve os dois HTML em `entrega3/`. Ele também copia os 4 arquivos do
PWA e confere que não sobrou nenhuma referência externa.

**A ordem dos `<script>` no `index.html` importa.** Vários arquivos
definem `const` no topo (por exemplo `esc` e `urlSegura` em
`graficos.js`), e `const` em JavaScript não pode ser usado antes da
linha que o define. Se você criar um arquivo novo, ponha a tag `<script>`
dele **depois** dos que ele usa e **antes** de `app.js`.

---

## 5. O que cada arquivo faz

### Base (carregados primeiro)

| Arquivo | Responsabilidade |
|---|---|
| `idioma.js` | dicionário de rótulos curtos `t('chave')`, `I18n.definir('pt'\|'en')`, formato de data e de dinheiro |
| `frases.js` | dicionário de frases inteiras PT→EN e o `Verter` (§6) |
| `catalogo.js` | lista de ativos conhecidos (nome, tipo, moeda) para completar o que a pessoa digita |
| `glossario.js` | 137 verbetes, cada um com texto próprio em iniciante / médio / expert, em PT e EN |
| `coach-conteudo.js` | 18 aulas do Coach, mesma estrutura de níveis e idiomas |
| `limites.js` | teto de consultas por minuto e por dia de cada provedor de cotação |
| `armazenamento.js` | `Store` (o estado inteiro), gravação no navegador, backup em arquivo, cookie, Google Drive, `Cripto` e `Cofre` (as chaves de API) |

### Dados que vêm de fora

| Arquivo | Responsabilidade |
|---|---|
| `mercado.js` | cotação: brapi (B3), Twelve Data / Finnhub / Alpha Vantage (EUA), CoinGecko (cripto), AwesomeAPI (câmbio) |
| `historico.js` | série histórica de preço, para os gráficos de evolução |
| `noticias.js` | manchetes por RSS, através do serviço rss2json |
| `ia.js` | o botão ✨ IA: cofre de chave compartilhado, adaptadores Gemini / OpenAI / Anthropic. Cada adaptador tem `perguntar` e `testar` (a chave é testada ao colar: recusada não salva; "falta permissão" e "sem cota" contam como válida). Se a IA escolhida falhar por cota, crédito ou chave recusada, `IA.perguntar` espera 3 s e tenta a próxima com chave, na ordem da lista, avisando na tela |

### Cálculo (não desenham nada)

| Arquivo | Responsabilidade |
|---|---|
| `gastos.js` | agregação dos lançamentos do BudgetONE: por mês, por categoria, custo real, custo fixo |
| `recorrentes.js` | compromissos que se repetem, feriados nacionais, serviço por visita (a diarista), reajuste com data |
| `orcamento.js` | limite por categoria e quanto já foi gasto |
| `rentabilidade.js` | XIRR (retorno do bolso) e TWR (retorno da estratégia) |
| `movimentos.js` | entradas e saídas da carteira |
| `perfil.js` | perguntas de perfil e o que elas mudam nas sugestões |
| `servicos.js` | catálogo de assinaturas e serviços recorrentes |
| `contas.js` | contas de acesso: apelido, senha (PBKDF2), código de recuperação |
| `acesso.js` | níveis de acesso, o portão `Acesso.pode()` e os anúncios |
| `notificacoes.js` | avisos, horário silencioso, registro do service worker |
| `bancos.js` | lista pronta de bancos e bandeiras, cadastro de banco e cartão, fatura do cartão, leitura da forma de pagamento num texto |
| `salario.js` | tabelas de INSS e IRRF (com a data de vigência), bruto↔líquido e comparação PJ × CLT |
| `voz.js` | ler em voz alta e ditar; entende número falado por extenso |

### Entrada de dados

| Arquivo | Responsabilidade |
|---|---|
| `importar.js` | leitura de extrato e de planilha, reconhecimento de colunas |
| `planilha.js` | leitura de `.xlsx` e `.csv` |
| `pdf-texto.js` | texto de dentro de PDF |
| `ocr.js` | leitura de foto de cupom (Tesseract) |
| `camera.js`, `camera-ui.js` | tirar a foto e ler o QR code da nota fiscal |

### Tela

| Arquivo | Responsabilidade |
|---|---|
| `app.js` | o coração: `render()`, todas as telas do InvestifyONE, Configurações, e o despachante de cliques |
| `budget-ui.js` | telas do BudgetONE e o hub dos três apps |
| `custos-ui.js` | tela de custos e compromissos |
| `acesso-ui.js` | porta de entrada, cartão da conta, painel do administrador |
| `servicos-ui.js` | tela de assinaturas |
| `bancos-ui.js` | bloco de bancos e cartões nas Configurações, e os dois formulários |
| `salario-ui.js` | as duas abas do salário: bruto→líquido e PJ × CLT |
| `graficos.js` | gráficos em SVG puro, e os utilitários `esc()` e `urlSegura()` |
| `calendario.js` | o calendário do BudgetONE |
| `fita-budget.js` | a fita que corre no topo |
| `barra-baixo.js` | escolha de quais botões ficam fixos no rodapé do celular |
| `wizard.js` | o passo a passo de primeiro uso |
| `assist.js` | a central de ajuda (`Assist`: ajuda desta tela, tutorial, "começar", busca) e o **AssistONE** (`AssistOne`): o personagem redondo no canto da tela, com o balão "Você está em…" + atalhos por tela (`ATALHOS_TELA`, só `data-acao` que já existem). Liga/desliga em `ST.config.assistOne` |
| `ux.js` | sanfona das Configurações, dobra de texto longo, régua de somar/subtrair nos campos de dinheiro e botão de ouvir — tudo aplicado depois de cada render |
| `versao.js` | número da versão e a lista de mudanças |

---

## 6. Como o inglês funciona

Não existe arquivo de tradução por tela. Funciona assim:

1. `t('chave')` — rótulos curtos e fixos, em `idioma.js`.
2. `Verter.html(h)` — **a peça central.** Toda tela é montada como texto
   HTML em português e passa por essa função antes de entrar na página.
   Ela procura cada pedaço de texto entre `>` e `<`, mais os atributos
   `title` e `placeholder`, no dicionário `FRASES_EN` de `frases.js`.
   Em português a função devolve o mesmo texto e não custa nada.
3. `Verter.no(elemento)` — para pedaços que já vêm prontos no
   `index.html` e nunca passam por `render()` (a tela de senha, por
   exemplo).
4. `Verter.txt(texto)` — para avisos e títulos que não são HTML.

**Para traduzir uma frase nova:** escreva-a em português no código e
acrescente uma linha em `frases.js`:

```js
'A frase exata como está no código':'The exact English sentence',
```

O texto tem que bater **exatamente**, incluindo pontuação. Emoji no
começo, número no começo e frases compostas com ` · `, `: ` ou ` — ` são
tratados automaticamente — por isso `'3 dias registrados'` acha a chave
`'dias registrados'`.

**O que a pessoa escreveu nunca é traduzido.** Nome de categoria, de
instituição, de fundo, de pessoa e descrição de lançamento passam por
`esc()` e vão para a tela como ela digitou, nos dois idiomas. Se uma
tradução sua começar a mexer nesses campos, é bug.

As notas de versão continuam em português de propósito: são registro
histórico, e a tela avisa isso em inglês.

---

## 7. Níveis de explicação

Três níveis: `iniciante`, `medio`, `expert`. Cada um tem **texto
próprio**, não é um texto que cresce. Mudam de nível:

- os ⓘ das telas (vêm do glossário);
- os verbetes do Glossário;
- as aulas do Coach.

O seletor de nível fica no pé do menu e **só aparece onde muda alguma
coisa** — no Coach, no Glossário e em telas que tenham pelo menos um ⓘ.
A regra está em `renderCalendarioMenu()`, em `app.js`.

Acessos: `glosTexto(g, nivel)`, `glosTitulo(g)`, `coachTexto(m, nivel)`,
`coachTitulo(m)`. Cada um já escolhe o idioma sozinho.

---

## 8. Segurança — as regras que valem sempre

1. **Tudo que vira HTML passa por `esc()`.** Sem exceção para texto que
   veio de fora (notícia, anúncio, QR code) ou que a pessoa digitou.
2. **Endereço que veio de fora passa por `urlSegura()`**, não por
   `esc()`. Só `http://`, `https://` e caminho relativo passam; qualquer
   outra coisa vira `#`. Isso existe porque `javascript:` dentro de um
   `href` é código rodando dentro do app, com a carteira aberta ao lado.
3. **Chave de API nunca no código.** As chaves moram no navegador de
   quem usa, em `investifyme.chaves.v1` (`Cofre`), e o `Cofre` as tira do
   backup antes de exportar.
4. **A senha da carteira não é guardada.** Ela existe só na memória
   enquanto a aba está aberta (`Cofre.senhaSessao`).
5. **Senha de conta nunca em texto.** `contas.js` guarda só o resultado
   de PBKDF2 com 150.000 voltas, e compara em tempo constante. O mesmo
   vale para o código de recuperação.
6. **A IA não vê o que a pessoa escreveu**, a não ser que ela ligue
   a chavinha em ✨ IA. Desligada — que é como vem —, o nome do
   compromisso é trocado pela categoria antes de sair. A tela mostra,
   aberta, exatamente o texto que vai junto com a pergunta.
7. **Do cartão guardamos só os quatro últimos dígitos.** O número
   inteiro não tem campo em lugar nenhum do app e não deve ser
   digitado. Nenhum dado de cartão sai do aparelho.
8. **O espelho em cookie vem desligado** desde a 3.3. Um cookie sobe
   junto com todo pedido feito ao endereço do site, então ele levaria a
   lista de ativos para o servidor que hospeda a página a cada visita.
   Quem quiser liga em Configurações, avisado do que isso significa.

O que o app busca na internet, e só isso: cotação, série histórica,
manchete, e — se a pessoa configurar — a pergunta da IA e o backup no
Drive. Não existe nenhuma telemetria, nenhum analytics, nenhum pixel.

---

## 9. Onde os dados ficam guardados

Todos os apps do `marceloneco.github.io` dividem o mesmo armazenamento do
navegador. Por isso **toda chave começa com um prefixo** — sem isso, um
app apagaria os dados do outro.

| Chave | O que guarda |
|---|---|
| `investifyme.dados.v1` | a carteira inteira (o `Store`) |
| `investifyme.chaves.v1` | as chaves de API (`Cofre`) |
| `investifyme.cache.v1` | última cotação recebida |
| `investifyme.hist.v1` | série histórica de preço |
| `investifyme.cota.v1` | quantas consultas já foram feitas hoje |
| `investifyme.ipca.v1` | índices do Banco Central |
| `investifyme.noticias.v1` | manchetes já baixadas |
| `investifyme.idioma.v1` | português ou inglês |
| `investifyme.bio.v1` | cadastro de biometria deste aparelho |
| `moneytrio.contas.v1` | contas de acesso |
| `moneytrio.sessao.v1` | quem está logado agora |
| `moneytrio.avisos.v1` | preferências de notificação |
| `moneytrio.anuncios.v1` | contagem de exibição e clique |
| `moneytrio.tutorial.v1` | se o tutorial já foi visto |
| `moneytrio.cfg.abertos.v1` | quais blocos das Configurações ficam abertos |
| (dentro de `investifyme.dados.v1`) | `bancos` e `cartoes` moram no mesmo lugar da carteira, então entram no backup e no Drive junto com o resto |
| `dgo:global:ia` | **compartilhada de propósito** — a chave de IA vale para todos os apps da família |
| `ifm_bkp` (cookie) | espelho da carteira, **desligado de fábrica** |

Se você criar uma chave nova, comece com `moneytrio.` e termine com
`.v1`. Só use o prefixo `dgo:global:` para algo que realmente deva
valer em todos os apps.

---

## 10. Onde mudar o quê

| Quero mudar… | Vá em |
|---|---|
| uma cor, um espaçamento, um tamanho | `assets/css/style.css` — os tokens estão no topo, em `:root` |
| o texto de um verbete ou de um ⓘ | `glossario.js` |
| o texto de uma aula | `coach-conteudo.js` |
| uma tradução | `frases.js` (frase inteira) ou `idioma.js` (rótulo curto) |
| a ajuda de uma tela ou o tutorial | `assist.js` — `AJUDA_TELAS` e `TUTORIAL` |
| os atalhos do balão do AssistONE numa tela | `assist.js` — `ATALHOS_TELA` (use só `data-acao` que já existe) |
| cantos, sombras e o topo do celular | `assets/css/style.css` — bloco "CAMADA VISUAL — v3.16", no fim do arquivo |
| quem pode usar o quê | `acesso.js` — `SERVICOS_PADRAO` |
| os anúncios | `acesso.js` — `ANUNCIOS_PADRAO`, ou um `anuncios.json` ao lado do site |
| um cálculo do BudgetONE | `gastos.js`, `recorrentes.js` ou `orcamento.js` |
| um cálculo do InvestifyONE | `rentabilidade.js` ou `mercado.js` |
| o que aparece numa tela | a função `view...()` correspondente, em `app.js` ou `budget-ui.js` |
| a lista de mudanças e o número da versão | `versao.js` |
| a versão do cache do PWA | `pwa/sw.js`, linha `var VERSAO` |
| a lista de bancos ou de bandeiras | `bancos.js` — `BANCOS_BR` e `BANDEIRAS` (cor, sigla, código, CNPJ) |
| as formas de pagamento | `bancos.js` — `FORMAS_PGTO`; o campo `pede` diz se ela pergunta banco, cartão ou nada |
| as pistas que o OCR usa para achar banco e bandeira | `bancos.js` — `PISTAS_BANCO`, dentro de `lerDoTexto` |
| as tabelas de INSS e imposto de renda | `salario.js` — `TABELAS_SALARIO`. **Nenhuma conta tem número escrito no meio do código**: quando a lei mudar, troque só os números de lá e a data de `vigencia` |
| os passos dos botões de valor | `ux.js` — `PASSOS` e `passosPara()` |

---

## 11. Ao publicar uma versão nova

1. Acrescente a entrada nova no topo de `MUDANCAS`, em `versao.js`. O
   número da versão e a data saem dali sozinhos.
2. Troque `var VERSAO` em `pwa/sw.js` (`v2` → `v3`). É o que avisa os
   celulares de que existe conteúdo novo — sem isso o app instalado
   continua mostrando a versão velha.
3. Rode `python3 gerar/gerar-arquivo-unico.py`.
4. Suba **só** os 5 arquivos da §2.

---

## 12. Testes

Os testes usam Playwright e um servidor local na porta 8099, apontado
para `entrega3/`.

| Arquivo | O que verifica |
|---|---|
| `tfinal2.mjs` | abre as 17 telas nos dois arquivos gerados, procura tela vazia, texto estourando e erro de JavaScript |
| `tmede.mjs` | passa tudo para inglês e conta quanto português sobrou |
| `tux.mjs` | tutorial, sanfona, fita do topo, anúncio, painel do administrador, IA |
| `tv33.mjs` | hub nos dois idiomas, telas vazias, tema claro, tamanho dos avisos |
| `tv34.mjs` | cadastro de banco e cartão, fatura, régua de valores, formulário de lançamento, salário, PJ × CLT, wizard e rolagem do menu |
| `tniv2.mjs` | os três níveis nos dois idiomas |

Rode assim:

```
python3 gerar/gerar-arquivo-unico.py
node tfinal2.mjs
```

Um teste que termina com `"erros": []` passou.
