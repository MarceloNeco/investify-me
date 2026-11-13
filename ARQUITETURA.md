# MoneyTRIO — como o app é feito por dentro

Versão do documento: 3.6 · Outubro de 2026

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
| Não suba foto de comprovante, cupom ou documento (nem pasta de testes com fotos) | tem CNPJ, final de cartão, nome de loja, valor — dado pessoal; as fotos de teste ficam fora do repositório |
| Não mande a foto de um comprovante para fora do aparelho sem a pessoa ligar isso | a IA só recebe a foto com a chavinha "Ler com a IA" ligada ou pelo botão "Tentar com a IA"; a busca pelo CNPJ manda só os 14 números |

**Vão para o GitHub exatamente 7 arquivos e uma pasta:**
`index.html`, `manifest.json`, `sw.js`, `icone-192.png`, `icone-512.png`,
`recursos.js` e `recursos-do-app.json` (os interruptores do RootifyONE, §15)
a pasta `leitor/` (o motor do Leitor OCR, copiado sem alterar; `leitor/tesseract/` tem o Tesseract e o português, uns 9 MB,
usados pelo cartão por foto E pelo leitor de comprovantes, uma cópia só) e a pasta `assets/ocr/` (só ZXing e jsQR). Mais nada.

---

## 3. Os dois arquivos que a pessoa recebe

| Arquivo | O que tem dentro | Onde vive |
|---|---|---|
| `index.html` | app inteiro, **sem dado pessoal nenhum** (desde a 3.28, 03/Nov/2026, a carteira cifrada embutida saiu: a senha dela tinha vazado neste repositório em 18/Set/2026 e ainda abria a carteira). O código que lê uma carteira embutida continua, sem uso. Os dados reais vão para a nuvem trancada (`PLANO-SUPABASE-MoneyTRIO.md`) | vai para o GitHub, é o site |
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
| `beneficios.js` | `Beneficios`: vale-alimentação, VT, plano de saúde etc. pendurados num salário (`salarioId` obrigatório; acabou o salário, acabam juntos). Modo `renda` vira um `Recorrente` de entrada (`ben` = id); `referencia` e `desconto` são só registro. `lerExtrato` lê a foto do extrato do vale. `Desloc`: lugares (com coordenadas do Nominatim), trajetos e a estimativa mensal de combustível, pedágio, app e transporte público; `lancarComoFixo` grava `Recorrente`s com `desloc`. Atrás da flag `deslocamentos` (`Flags.ligada`) |
| `voz.js` | ler em voz alta e ditar; entende número falado por extenso |

### Entrada de dados

| Arquivo | Responsabilidade |
|---|---|
| `importar.js` | leitura de extrato e de planilha, reconhecimento de colunas |
| `planilha.js` | leitura de `.xlsx` e `.csv` |
| `pdf-texto.js` | texto de dentro de PDF |
| `ocr.js` | `Ocr`: carregar o Tesseract (de `leitor/tesseract/` desde a 3.65, do arquivo embutido ou da CDN, nesta ordem) e ler texto cru; `CupomTexto`: entender o texto de um cupom brasileiro (total, data, CNPJ, itens, forma de pagamento e cartão) |
| `leitor.js` | `Leitor`: **o motor de leitura de fotos**, portado do app Leitor OCR (`MarceloNeco/leitor-ocr`, v0.6.0) sem mexer na lógica dele. Endireita a foto (`estimateAngles`), acha o papel ou vários papéis (`findPapers`), lê até 4 vezes de jeitos diferentes e só afirma o **valor quando duas leituras concordam** (`agreedValue`); senão devolve candidatos. Lê QR code e código de barras (ZXing + jsQR). É UM motor para os três apps: BudgetONE (Escanear), InvestifyONE (Ler comprovante), TaxONE (Documentos do IR, via `DocIR.textoDe`). O que é nosso está marcado `(MoneyTRIO)`: `enquadrar` (foto de celular de 12 MP é recortada no bloco de texto e reduzida a 1600 px antes de tudo — é o que tira a leitura de minutos para segundos); o **sinal do ângulo invertido** (`base = -tilt[0]`: o motor original girava para o lado errado); a ordem pela inclinação (foto reta → duas leituras do quadro inteiro, cru e preparado como nos documentos do IR, que acertam o valor em negrito que o ajuste local do motor clareava; foto torta de 8° a 45° → direto para o motor, que endireita); `nomePeloCnpj` (nome oficial na BrasilAPI quando o CNPJ confere pelo dígito; só os 14 números saem); e `paraCupom`, que traduz o resultado para o formato que a tela já entendia. **Leitura pela IA** (`IA.lerFoto` + `perguntarFoto` em cada provedor + `cupomDaIA`): a foto só sai do aparelho com a chavinha "Ler com a IA" ligada (`ST.config.leitorIA`) ou pelo botão "Tentar com a IA" de um cartão; vai reduzida, a resposta é JSON e cada campo é conferido antes de entrar |
| `fundo.js` | `Fundo`: trabalho demorado que não morre ao sair da tela (§13). `comecar/passo/terminar/limpar`; segura a tela acesa (Wake Lock), arma o aviso de fechar/recarregar e mostra a pílula `#fundoPill` que leva de volta ao resultado |
| `camera.js`, `camera-ui.js` | a tela de escanear (`abrirEscanear`, `lerArquivosEscaneados`, cartões de resultado com os candidatos de valor) e `Camera`: entender QR da NFC-e, chave de 44 dígitos e código de boleto |

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
| `recursos.js` (na raiz, fora do arquivo único) | os interruptores do RootifyONE (§15). Cópia avulsa: o master fica no repositório `rootify-one`; **não edite aqui**, copie de lá quando mudar. Carregado no `<head>` do `index.html`, antes de todo o código do app |

---

## 6. Como o inglês funciona

Não existe arquivo de tradução por tela. Funciona assim:

1. `t('chave')` — rótulos curtos e fixos, em `idioma.js`.
2. `Verter.html(h)` — **a peça central.** Toda tela é montada como texto
   HTML em português e passa por essa função antes de entrar na página.
   Ela procura cada pedaço de texto entre `>` e `<`, mais os atributos
   `title` e `placeholder`, no dicionário `FRASES_EN` (desde a 3.48 em `textos/frases-en.js`).
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
manchete, os dois arquivos públicos de interruptores do RootifyONE (§15,
só leitura, nada da pessoa vai junto) e — se a pessoa configurar — a
pergunta da IA e o backup no Drive. Não existe nenhuma telemetria, nenhum analytics, nenhum pixel.

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
| (dentro de `investifyme.dados.v1`) | `bancos`, `cartoes`, `beneficios`, `lugares`, `trajetos` e `config.veiculo` moram no mesmo lugar da carteira, então entram no backup e no Drive junto com o resto |
| `moneytrio.bfiltro.v1` | o período que a pessoa deixou no filtro do BudgetONE (padrão: últimos 12 meses) |
| `dgo:moneytrio:central:recursos/…` | a última cópia dos interruptores do RootifyONE (gravada pelo `recursos.js`, §15) |
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
| a lista de benefícios oferecidos ou os modos | `beneficios.js` — `CATALOGO_BEN`, `MODOS_BEN`, `REGRAS_BEN` |
| o fator da distância de carro ou os padrões do carro | `beneficios.js` — `Desloc.kmEstimado` (× 1,3) e `Desloc.veiculo()` |
| cantos, sombras e o topo do celular | `assets/css/style.css` — bloco "CAMADA VISUAL — v3.16", no fim do arquivo |
| quem pode usar o quê | `acesso.js` — `SERVICOS_PADRAO` |
| os anúncios | `acesso.js` — `ANUNCIOS_PADRAO`, ou um `anuncios.json` ao lado do site |
| um cálculo do BudgetONE | `gastos.js`, `recorrentes.js` ou `orcamento.js` |
| um cálculo do InvestifyONE | `rentabilidade.js` ou `mercado.js` |
| o que aparece numa tela | a função `view...()` correspondente, em `app.js` ou `budget-ui.js` |
| a lista de mudanças e o número da versão | `versao.js` |
| o topo padrão (☰, nome do sub-app ▾, 🔍 📥 👤) | `index.html` (`<header class="topbar">`) e `app.js` — `menuDeApps` (Início + outros sub-apps), `identidade`/`htmlPerfilMenu`/`acaoPerfil` (menu do 👤), `inboxItens`/`abrirInbox` (📥), `ligarTopoPadrao` |
| o personagem do AssistONE (`ajuda-botao.png`, o mesmo em todos os apps) | `index.html` — `#assistFab` e o CSS `.assistone-bt` (fundo escuro sempre, anel dourado, balanço `aoneFlutua` 3,2 s); o arquivo entra no cache do `sw.js` |
| a versão do cache do PWA | `pwa/sw.js`, linha `var VERSAO` |
| o que o app obedece do RootifyONE (interruptores) | `data-recurso="id"` no elemento + `desligadoPelaAdm('id')` no código + o id em `recursos-do-app.json` (§15) |
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
   continua mostrando a versão velha. As pastas `leitor/tesseract/` e `assets/ocr/` têm cache
   próprio (`CACHE_OCR`, `moneytrio-ocr-2` desde a 3.65), que **não** muda com a versão:
   o motor baixa na primeira leitura e fica. Só troque esse número se
   trocar os arquivos do motor.
3. Rode `python3 gerar/gerar-arquivo-unico.py`.
4. Suba **só** os arquivos e a pasta da §2.

---

## 12. Diretriz geral da plataforma: restaurar uma cópia nunca duplica usuário

Regra que vale para todos os apps da SolverONE (registrada aqui até entrar na planilha de
diretrizes; já aplicada no OmniLifeONE 2.11.0). **Pendente neste app:** o MoneyTRIO restaura
backup só depois de entrar (`Store.importarTexto`) e as contas (`contas.js`) não passam pelo
mesmo reconhecimento de pessoa.

1. **Restaurar na primeira tela, antes de entrar, só se for seguro:** só a **cópia protegida**
   (conteúdo cifrado; abre com a senha da cópia ou com o código de recuperação do dono). Cópia
   aberta só entra depois de a pessoa entrar no próprio perfil, e só por um responsável.
2. **Reconhecer a mesma pessoa e juntar:** mesmo id interno na cópia, ou mesmo nome com a
   identidade confirmada pela senha/código. Se já existe usuário no aparelho, perguntar
   **Juntar** (padrão), **Substituir** ou **Manter separado**. Juntar troca o id da cópia pelo id
   local em todos os registros; o PIN/senha que vale é o do perfil local.
3. **Digital de outro endereço:** a digital (WebAuthn) é presa ao endereço. Avisar "ligue a
   digital de novo neste endereço" e deixar entrar pelo PIN/senha.
4. **Quem já ficou duplicado:** tela segura para unir dois usuários — mostra o que cada um
   tem, confirmação dupla (marcar + digitar o nome que some), baixa uma cópia antes.
5. **Riscos de fraude considerados:** cópia aberta restaurada por qualquer um na primeira tela
   (bloqueado); cópia protegida roubada (sem senha/código não abre; PBKDF2 310 mil voltas);
   juntar por nome sem prova (só com a cópia aberta pela senha/código; cópia aberta junta só
   por id); criança restaurando ou unindo (só responsável); Substituir apagando tudo (aviso
   vermelho e confirmação própria); perfil unido por engano (cópia baixada antes).

## 13. Diretriz geral da plataforma: trabalho demorado nunca morre ao sair da tela

Pedido do dono em 09/Out/2026, depois de uma leitura de foto que levou minutos no celular. Vale
para **todos os apps** (MoneyTRIO, OmniLifeONE, RiseONE, HyperNutry, Leitor OCR, Contador…) e
para tudo que demora segundos ou minutos: ler uma foto (OCR ou IA), importar extrato ou
planilha, gerar áudio, perguntar à IA, sincronizar. No MoneyTRIO está no módulo `Fundo`.

1. **O trabalho não depende da tela.** Ele é uma promessa que roda solta; fechar a janela,
   trocar de aba do app ou apertar Voltar **não cancela**. O resultado é entregue onde a
   pessoa estiver: na tela de origem, se ela está aberta; senão fica guardado (`escPendente`)
   e a tela o mostra assim que for aberta de novo.
2. **A tela não apaga sozinha** enquanto há trabalho: `navigator.wakeLock.request('screen')`,
   pedido de novo ao voltar para a aba (`visibilitychange`), solto quando o último trabalho
   termina. Onde não existe (Firefox), nada quebra.
3. **Fechar ou recarregar pergunta antes**: `beforeunload` armado só enquanto há trabalho
   ativo (o navegador mostra o "Sair da página?"). Nunca armado à toa.
4. **Uma pílula fixa** no canto de baixo à esquerda (o AssistONE fica à direita):
   "⏳ Lendo comprovante… 40%" com barra; some com o menu ☰ e as janelas abertas; no fim vira
   "✓ Comprovante lido · toque para ver", com um aviso curto. Tocar abre a tela de origem com
   o resultado e apaga a pílula. `role="status"`, `aria-live="polite"`.
5. **A tela de origem diz** "Pode ir para outra tela: a leitura continua e eu aviso quando
   terminar. Só não feche o app." Ao reabrir no meio, mostra o andamento atual.
6. **Um trabalho por vez do mesmo tipo**: começar outro enquanto o primeiro roda avisa
   "Ainda estou lendo a foto anterior".
7. **App nativo (futuro)**: o mesmo módulo vira o serviço em primeiro plano (Android
   Foreground Service / iOS background task) — adaptador, como manda a diretriz de nuvem e
   plataforma. O resto do app não muda.
8. **O que o PWA não garante**: com o app em segundo plano (outra app na frente) o Android
   pode congelar a aba; o Wake Lock evita a tela apagar, não o congelamento. Por isso a
   pílula e o aviso, e por isso a leitura é rápida (§5, `leitor.js`).

Texto para a planilha **DIRETRIZ GERAL** (categoria *Desempenho e rede*): "Trabalho demorado
(foto, OCR, IA, importação, áudio) nunca morre ao sair da tela: roda solto, segura a tela acesa
(Wake Lock), pergunta antes de fechar/recarregar, mostra pílula de andamento que leva de volta
ao resultado, entrega o resultado onde a pessoa estiver. Um módulo só por app (`Fundo`); no
nativo vira serviço em primeiro plano."

---

## 14. Testes

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
| `t_leitor.mjs` | o motor de leitura de fotos: `node t_leitor.mjs motor foto.jpg` lê a foto e mostra o que cada leitura achou; `node t_leitor.mjs tela` passa duas fotos pela tela de escanear e confere o botão Criar lançamento. As fotos ficam numa pasta **fora** do repositório (têm dado pessoal) |

Rode assim:

```
python3 gerar/gerar-arquivo-unico.py
node tfinal2.mjs
```

Um teste que termina com `"erros": []` passou.

---

## 15. Interruptores do RootifyONE (Controle dos apps)

Desde a 3.27 (10/Out/2026). No RootifyONE o dono liga e desliga recursos de cada app e publica
dois arquivos públicos: `solverone-dados/recursos/global.json` (vale para todos) e
`solverone-dados/recursos/moneytrio.json` (o app vence o global). O id de dados deste app é
**`moneytrio`** (não o nome do repositório).

- **Quem lê:** `recursos.js`, carregado no `<head>` com `data-app="moneytrio"`. Rede primeiro
  (4 s), senão a última cópia guardada, senão o padrão do código (tudo ligado). Relê ao voltar
  para o app, no máximo a cada 5 min. Nunca derruba o app. O `sw.js` guarda o `recursos.js` e
  **não** guarda os arquivos de `solverone-dados/` (eles vão sempre à rede; a reserva sem
  internet é a cópia do próprio `recursos.js`).
- **Como obedecer:** o elemento ganha `data-recurso="id"` (some sozinho pelo CSS) e o código
  pergunta `desligadoPelaAdm('id')` (função no primeiro `<script>` do app, em cima de
  `SolverRecursos.ligado`). Comportamentos com valor: `SolverRecursos.valor('id', padrão)`.
  Quando chega arquivo novo, o `SolverRecursos.aoMudar` registrado em `comecarApp()` redesenha.

| Id | Tipo | O que acontece no MoneyTRIO |
|---|---|---|
| `assistone` | recurso | o personagem e o balão somem e não abrem (`AssistOne.ligado()`); em ⚙ → Preferências o seletor vira "Desligado pela administração da SolverONE." / "Turned off by the SolverONE administration." |
| `assistone.dicas` | comportamento sim/não | `false` tira a dica da tela (o texto de `AJUDA_TELAS`) do balão; "Você está em…" e os atalhos ficam |
| `anuncios` | recurso | a faixa de anúncio do topo e o pop-up somem (`Anuncio.mostrar()` e `Anuncio.popup()`); a tabela de níveis do administrador não muda |
| `ia` | recurso | `Acesso.pode('ia')` responde não: some o ✨ IA, a chavinha "Ler com a IA" e o "Tentar com a IA"; a janela da IA, `IA.perguntar` e `IA.lerFoto` dizem "Desligado pela administração da SolverONE." |
| `voz` | recurso | `Voz.podeLer()` / `Voz.podeOuvir()` respondem não: somem o 🔊 e os 🎤 |
| `moeda.padrao` | comportamento `BRL`/`USD`/`EUR` | moeda base de quem começa do zero (`estadoPadrao()`); quem já escolheu a moeda em ⚙ (`config.moedaEscolhida`) ou já lançou algo fica com a sua |

**Ficaram de fora (de propósito):** `open-finance` (o app não tem Open Finance), `ocr` (a
leitura de foto tem entradas em muitas telas — BudgetONE, InvestifyONE, TaxONE — e precisa de um
portão único antes), `offline` (desligar o modo sem internet mexe no service worker, não é
simples nem seguro), `telemetria` (o app não tem telemetria nenhuma, §8).

**Ligar um id novo** = `data-recurso`/`desligadoPelaAdm` no código **e** o id em
`recursos-do-app.json` na mesma versão (o RootifyONE mostra "quem obedece" a partir dele).
Interruptor não é trava de segurança: quem mexe no navegador religa no aparelho dele.

**Pendências registradas aqui** (o app ainda não tem `PENDENCIAS.md`; a diretriz manda perguntar
ao dono antes de criar): portão único para o `ocr`; decidir se `offline` deve existir neste app;
`MoneyTRIO-local.html` (cópia local antiga) não recebeu o `recursos.js`.

## Nuvem (desde a 3.30, 03/Nov/2026 — etapa 2 do PLANO-SUPABASE-MoneyTRIO.md)

O `index.html` começa pelo portão da nuvem: `MoneyNuvem.portao(iniciar)` (no fim do arquivo, no lugar do `iniciar` direto) e
carrega `nuvem.js?v=1.2.0`. Sem o `nuvem.js` (ou se ele falhar ao carregar), o app abre como antes (`iniciar()`).
No `nuvem.js` (procure pelos nomes): `Conta` (conta SolverONE, copiada do OmniLifeONE), `Cadeado` (código de recuperação, PIN,
digital; chaves abertas só na memória), `Sinc` (cópia fechada no IndexedDB `moneytrio-nuvem`, fila, trava otimista, busca),
`mapear`/`reconstruir` (Store ↔ registros de `money_docs`), `Caixa` (caixa do robô), `Portao` (telas antes do app), `Painel`
(botão ☁️, inclusive robôs autorizados), `Trava` (fecha sozinho, 3.31: 15 min sem uso com aviso 1 min antes, 10 min fora do app,
espera trabalho "pesado" — Fundo, levar para a nuvem — e a sincronia; `Nuvem.trancar` cobre o app com a tela do PIN sem recarregar
e `Nuvem.destrancado` devolve a tela como estava), `Nuvem` (maestro).
- **Com a nuvem**: `Store.salvar` não grava finanças no `localStorage` (o `investifyme.dados.v1` só é lido, para "levar para
  a nuvem"); `Store.limparTudo` não apaga nada (aviso).
- **Só neste aparelho** (`moneytrio.soNesteAparelho` = 1, botão na tela de entrada ou no painel ☁️): o app de sempre, sem
  conta, com o Store original (localStorage); o botão "☁️ Entrar na nuvem" tira a marca e recarrega. Voltar do Google com a
  sessão no endereço também tira a marca.
- O rodapé da tela inicial (`viewHub`) diz onde os dados ficam conforme o modo.
- `teste-nuvem.html` é só um redirecionamento para `./` (mantém atalhos antigos).
- **Vale (3.35)**: recarregar dentro dos 15 min não pede PIN — a chave da família (CryptoKey não extraível) fica no IndexedDB `kv`, `vale|<conta>` = `{ cf, kv, fk, gid, ate }`; some ao trancar, sair ou trocar de conta.
- Teste: `node teste/teste-nuvem.js` (Chromium, Supabase de mentira, 91 verificações, inclusive o cadeado com relógio falso). Detalhes: PLANO-SUPABASE-MoneyTRIO.md;
  o que falta: PENDENCIAS.md.

### Custos (3.36)
- Abas: Todos · Recorrentes · Pontuais · Agenda · Revisar (`custosAba`), cada uma com uma linha explicando.
- `Recorrente.detectar()`: o que se repete no último ano (histórico + `per` que o robô traz: Mensal/Semanal/Trimestral/Anual);
  sem a dica do robô precisa de 4 meses com valor regular; parou (2 meses sem aparecer, 4 no trimestral, 13 no anual,
  contados a partir do último lançamento) fica de fora; renda e custo separados; "já existe" se já está em Recorrentes.
  `Recorrente.cadastrarDetectados()` cadastra os marcados com `desde` = hoje.
- `Recorrente.porMes(quando)` só soma o que vale naquele mês (vale desde/até). `Recorrente.periodoCurto(r)` = 2ª linha de "Quando cai".
- Teste: `node teste/teste-custos.js`.

### Novo compromisso e campo de data (3.37)
- `abrirRecorrente(id, semente, op)`: frente (O quê, Valor, Dia) + `<details id="rcMais">`; `lerFormRecorrente()` lê tudo;
  `Sugestor.para(nome)` sugere sem IA; `recRascunho` (memória) ao fechar sem salvar; `#assetModal[data-fixo]` não fecha ao tocar fora.
- Campos novos do compromisso: `pagador`, `conta` (conta de acesso, nunca senha), `cartao`, `fora` (meses sem cobrança, 1–12),
  `aConfirmar`, `rolouDe`. `Recorrente.datasNoMes` pula os meses de `fora`; `porMes` desconta.
- `Recorrente.sobreposicoes(r)` (repetido), `paraRolar()`, `rolar(id)`, `rolarDatas(r)`, `nomeDoAno()`, `taxaProvisoria(grupo)` (IPCA guardado).
- `DataEsperta`: todo `input[type=date]` vira texto + 📅 (MutationObserver); `Cal.campo(id, valor, {vazio, par, papel})`; `Cal.htmlCampo`, `Cal.atalho`.
- Testes: `teste/teste-compromisso.js`, `teste/teste-data.js`.

### Valor que varia, abatimento, feriados e tabelas (3.38)
- N28: `r.varia`; `Recorrente.historico(r)`; `ocorrencia()` devolve `previsto` e `realizado`.
- N31: `Abat` (arruma, bloco, ler, aplicar, texto, marca, doAno); `g.valor`/`r.valor` = o que saiu; `cheio` e `abat` ficam junto
  (no aparelho, `GastoCodec` colunas 23 e 24).
- N33: `FERIADOS_REGIONAIS`, `Feriados.regiao()/definirRegiao()` (`ST.config.regiao`, padrão SP/São Paulo), cache por ano+região;
  `blocoFeriadosCfg()`; `[data-servfalta]` nos dias trabalhados.
- N35: `UX.cabecalhoFixo(raiz, naJanela)` (também chamado por `abrir()`), classes `tbl-topo`/`tbl-topo-j`/`tbl-cabe`/`card-topo`.
- Teste: `node teste/teste-parte3.js`.

### Renda e correção do robô (3.39)
- `Transferencia` (index.html): `ST.transferencias` (coleção `transferencias` no money_docs, `nuvem.js` ITENS); `receber(l)`, `ligarTudo()`,
  `grupos(de, ate)`, `daRenda(gid)`. Nunca entra em total. `blocoTransferencias()` em Lançamentos.
- `nuvem.js` 1.5.0: `Caixa.converter` põe Rescisão/FGTS; `Caixa.corrigir(ja, g)` (campos `CAMPOS_ROBO`); `editadoPessoa` (marcado em
  `salvarLancamento` para lançamento do robô) e `roboSugeriu`.
- SQL v3 `supabase/2026-11-03c-moneytrio-robo-correcao.sql`: `money_entrada.impressao`/`versao`; `money_robo_depositar` reabre quando a impressão
  muda (linha antiga sem impressão só aprende; LGPD não volta). Teste local: `teste/sql/teste-moneytrio-correcao.sql`.
- Testes: `teste/teste-renda.js`, `teste/teste-nuvem.js` (parte 3, correção e transferência).

## Guia de módulos (3.41)

Desde a 3.41, **toda função nova é um módulo**: um arquivo em `modulos/`, com teste próprio, ligado ao app por
`modulos/base.js` (`window.MoneyModulos`). O `index.html` (mais de 2 MB) só ganha a ligação.

**Como criar**
1. Copie `modulos/_modelo.js` para `modulos/<nome>.js`. No cabeçalho: o que faz, a API pública e os dados
   (coleções), e a versão (`1.0.0`), que também vai no `registrar({versao})`.
2. Dados: uma ou mais **coleções** próprias (`colecoes: ['nome_da_lista']`, letras minúsculas e `_`). Elas moram em
   `Store.estado.<colecao>` (lista de objetos com `id`). Sem conta, ficam no aparelho; com a nuvem, cada item vira um
   registro fechado no `money_docs` (o `nuvem.js` soma as coleções dos módulos às dele). Nada de `localStorage` próprio
   para finanças.
3. Tela e botões, sem mexer no que já funciona:
   - `pontos: {'custos.topo': ctx => html}`: o `index.html` chama `MoneyModulos.html('custos.topo', ctx)` no lugar
     onde o pedaço aparece (uma linha por ponto novo; o ponto fica listado abaixo);
   - `acoes: {'meu-botao': (el, dados) => …}` para `data-acao="meu-botao"`, que cai no `default` do switch do app;
   - `telas: {'b-minha-tela': {app: 'budget', render: () => html}}`: `irPara('b-minha-tela')` abre a tela,
     e a seção é criada sozinha (o item no menu é uma linha no `index.html`);
   - `ouvir: {'gasto.salvo': fn}` para eventos que o app emite com `MoneyModulos.emitir(evento, dados)`.
4. Ligar: uma linha `<script src="modulos/<nome>.js?v=1.0.0">` no fim do `index.html`, **entre** `modulos/base.js` e
   `nuvem.js`, e a mesma URL no `ARQUIVOS` do `sw.js`.
5. Banco: se precisar de tabela ou Storage, o SQL vai em `supabase/AAAA-MM-DD…sql`: idempotente, com porteiro,
   conferência e GRANTs, passando no `teste/sql-grants.js`. Quem aplica é a sessão principal, depois de revisar.

**Antes de cada commit (regra permanente, 06/Nov/2026 — o repositório é público)**
- `node teste/teste-sem-dados-reais.js`: procura em `teste/`, `modulos/`, `textos/`, `supabase/`, `*.md` e `index.html` os nomes
  e valores reais da família (filhos, pais, escola, empregadores, saldos). A lista guarda só o hash de cada palavra; achou → troque
  por fictício (Ana, Bia, Alex, Paulo, Carla; "Escola Exemplo"; "Empresa A"; valores redondos). Endereço, CPF, CNPJ, telefone e
  linha digitável reais também não entram: em fixtures, use X ou zeros. Texto real de documento só entra como fixture com os dados
  trocados (o layout e os valores públicos, como a tabela de preços da escola, podem ficar).

**Amostra de PDF (regra permanente, 06/Nov/2026)**
- A amostra de um PDF no teste é SEMPRE o texto que o próprio app gera com `PdfTexto.extrair` (pdf.js: espaços colapsados,
  linhas quebradas de outro jeito), nunca o do `pdftotext -layout`. O leitor tem de passar com a amostra do PdfTexto; a do
  `-layout` pode ficar ao lado, como segunda prova. Ex.: `teste/amostras/boleto-matricula-pdfjs.txt` (o que o app lê) e
  `teste/amostras/boleto-matricula-layout.txt`, as duas em `teste/teste-parte14.js`. (A 3.55 errou o boleto real no app por
  testar só com o `-layout`.)

**Como testar**
- `teste/teste-<nome>.js` (Playwright, modo "só neste aparelho", telas de 390 e 1366 px, sem erro de página),
  no padrão dos outros testes.
- `node teste/teste-modulos.js` confere que o `index.html`, o `sw.js` e as versões dos arquivos combinam, e a base.
- Antes do PR, rodar os testes de `teste/` que tocam no que o módulo usa (no mínimo `teste-modulos` e `teste-nuvem`).

**Como versionar**
- Mudou o módulo: sobe a versão dele (cabeçalho, `registrar`, `?v=` no `index.html` e no `sw.js`; o teste confere).
- Toda entrega sobe a versão do app (`MUDANCAS` em PT/EN no `index.html`) e o `VERSAO` do `sw.js`.

**Regras**
- Um módulo nunca derruba o app: a base pega o erro e escreve um aviso no console.
- Pode chamar as funções globais do app (`ST`, `Store`, `render`, `toast`, `fmt`, `esc`, `I18n`, `$`), mas não as reescreve.
- Módulo que usa outro módulo: só pela API do cabeçalho (`window.<Nome>`).

**Pontos de encaixe e eventos que existem** (cresce a cada módulo; manter esta lista atualizada)
- html: `compromisso.form` {r} (dentro de "Como paga"), `recorrente.linha` {r}, `custos.topo`, `lancamentos.topo`,
  `lancamento.linha` {g}, `lancamento.form` {g}, `tax.deducoes.topo`
- itens (listas): `fita.budget`, `fita.tax` → `[{ico, texto, tom}]`
- eventos: `compromisso.form` {r} (formulário aberto), `compromisso.salvo` {id, estadoPadrao} (antes de fechar)
- eventos: `gasto.novo` (o lançamento, logo depois do `Gasto.add`; vale para manual, importação e robô) — 3.43
- html: `custos.revisar` (topo da aba Revisar) — 3.43
- html: `investify.painel` (depois dos números do Painel), `investify.carteira.topo` (topo da Carteira) — 3.45
- itens: `patrimonio.extra` → `[{valor, rotulo}]`: o Painel soma ao "Patrimônio total" e mostra separado do líquido — 3.45
- html: `compromisso.detalhes` {r} (fim de "Mais opções"), `compromisso.varia` {r} (embaixo de "O valor varia") — 3.46
- itens: `recorrente.previsto` {r, iso, valor} → `[{valor, fonte}]`: ajusta o previsto de uma ocorrência (o último vale; o valor marcado à mão ainda ganha) — 3.46
- pontos que um MÓDULO oferece a outro (3.47, `patrimonio-iliquido` 1.1.0): itens `iliquido.valor` {item} → `[{valor, nota}]` (valor de hoje de um
  item sem liquidez; o último vale) e html `iliquido.topo` (botões e avisos no cartão 🔒 Sem liquidez)
- telas aceitam `ajuda: {pt: {t, o, f}, en: {…}}` (título e ajuda do AssistONE); `appDaView` usa o `app` da tela
- nome global de módulo não pode repetir um `const`/`function` do index.html (o do app esconde o do módulo;
  `teste-modulos.js` confere). Ex.: o cofre de arquivos é `window.ArquivosFamilia` porque `Arquivos` já existia.

### Módulos (3.42)
- `modulos/arquivos.js` (`ArquivosFamilia`): cofre de arquivos. Descrição em `Store.estado.arquivos`; bytes no
  IndexedDB `moneytrio-arquivos` (fechados se a nuvem estiver aberta) e no Storage (`MoneyNuvem.arquivos`, `nuvem.js` 1.7.0:
  bucket privado `money-arquivos`, caminho `<grupo>/<id>`, formato `MTA1`+kv+iv+AES-GCM). Sem o SQL v4, fica no aparelho e
  sobe sozinho depois (`sincronizar()` a cada 2 min e ao voltar a internet).
- `modulos/agendamentos.js` (`Agendamentos`, N37): `Store.estado.agendamentos` = [{id do compromisso, ate, ciclo, renovadoEm}].
- `modulos/nf-ir.js` (`NfIr`, N40): `Store.estado.nf_status`; telas `b-nfs` e `t-pasta-ir`; leitura do PDF pelo `PdfTexto`
  do app (sem IA) e proposta por valor (5), data até 45 dias (2) e palavras em comum (até 3). Subir vários PDFs usa o `Fundo`.
- SQL v4 `supabase/2026-11-06-moneytrio-arquivos.sql` (bucket + regras em storage.objects: ler e subir só chefe/responsável;
  ninguém muda nem apaga). Teste local: `teste/sql/teste-moneytrio-arquivos.sql`.
- Testes: `teste/teste-parte6.js`, `teste/teste-nuvem.js` (arquivo fechado indo e voltando), `teste/teste-modulos.js`.

### Proposta: tirar partes antigas do index.html (aprovada em 06/Nov/2026 pela sessão principal, em partes)

| O quê | Ganho | Risco |
|---|---|---|
| Os textos didáticos (`GLOSSARIO` ~370 KB e `COACH` ~115 KB, em PT/EN) para `dados/glossario.js` e `dados/coach.js`, carregados só quando a pessoa abre uma explicação | o `index.html` (2,3 MB) perde cerca de 0,5 MB (~20%); abre mais rápido no celular | médio: o glossário passa a precisar de um arquivo a mais sem internet (vai no `sw.js`); as buscas que leem o glossário precisam esperar ele carregar |
| `FRASES_EN` (tradução, ~75 KB) e `MUDANCAS` (~50 KB) para `dados/` | arquivo menor; textos num lugar só | baixo: carrega antes do app; o `Verter` só lê |
| TaxONE (telas e cálculos) para `modulos/taxone.js` | o código do imposto fica isolado e testável | alto: muitas ligações com BudgetONE (deduções, salário); fazer só com os testes do TaxONE escritos antes |
| Leitores de extrato/planilha/OCR para `modulos/leitores.js` | isola o código mais frágil | médio: muitos formatos de banco; precisa de amostras para testar |
| O CSS (~150 KB) para `estilo.css` | o navegador guarda o estilo separado | baixo: mais um arquivo no `sw.js` |

Ordem aprovada: (1) Parte 11 — `FRASES_EN`/`MUDANCAS` e o CSS; (2) Parte 12 — glossário e coach, com teste de fumaça antes/depois;
(3) TaxONE e leitores só depois de terem testes próprios, numa parte aprovada de novo.

**Feito na 3.48 (Parte 11):** `estilo.css` (o `<style>` inteiro, ~2.300 linhas), `textos/frases-en.js` (`const FRASES_EN`) e
`textos/mudancas.js` (`const MUDANCAS`; `VERSAO = MUDANCAS[0].v` continua no `index.html`). São scripts comuns (não módulos):
carregam antes do bloco que usa cada um, e a `const` vale para todo o app. Os três vão no `sw.js` com `?v=` e o cabeçalho de cada
arquivo diz a versão (`teste-modulos.js` confere, agora também o `<link rel="stylesheet">`). O `index.html` caiu de 36 mil para 32,6 mil linhas.
**A cada versão nova:** a entrada nova vai em `textos/mudancas.js`, o inglês em `textos/frases-en.js` e o `?v=` dos dois (e do
`estilo.css`, se mudou) no `index.html` e no `sw.js`.
**Feito na 3.51 (Parte 12):** `textos/glossario.js` (`const GLOSSARIO`, 147 verbetes) e `textos/coach.js` (`const COACH`, 18 aulas), do mesmo
jeito (carregados antes de `GLOS_MAP`/`COACH_MAP`). Ficaram carregando junto com o app, e não "só quando abre uma explicação": com o
`sw.js` guardando tudo para uso sem internet, carregar depois ganharia pouco e obrigaria a busca e o AssistONE a esperar o arquivo.
O `index.html` caiu para cerca de 29,4 mil linhas. O que falta da proposta (TaxONE e leitores) depende de testes próprios e de nova aprovação.
Teste de fumaça para arrumação interna: `teste/teste-fumaca-telas.js <pasta de antes>` (10 telas × 390/1366 px × PT/EN: mesma foto,
mesmo HTML, sem erro de página; e o texto de cada verbete do glossário e de cada aula do Coach, 3 níveis × PT/EN; o número da versão e a lista "O que há de novo" ficam de fora da comparação).

### Parte 13 (3.54): contrato com boleto, sem duplicar, Desfazer, vencimentos passados e o computador
- `compromisso-de` 1.4.0: boleto de banco (rótulos em colunas: "Valor do documento", "(-) Desconto", "Valor cobrado/a pagar", vencimento até
  200 caracteres depois do rótulo); com boleto no lote, o gasto usa o valor a pagar e o vencimento dele e se chama "Matrícula AAAA (1ª parcela
  da anuidade)" (editável). `jaLancado(valor, data, nomes)`: mesmo valor e até 15 dias, ou nome da escola/beneficiário parecido e até 45 dias.
  `jaExistem(semente)`: mesmo grupo, período que se cruza, uma palavra do nome em comum e o mesmo aluno → a prévia vem desmarcada com
  "manter como está" / "atualizar <existente>" (valor, dia se o contrato diz, IR, a confirmar; as datas ficam) / "criar mesmo assim".
  "↩ Desfazer" por 5 min tira o que nasceu e devolve o que foi atualizado (o PDF guardado fica).
- `modulos/conciliacao.js` (`Conciliacao.rodar`): ao abrir e 2 s depois do último `gasto.novo`, chama
  `Pagamento.conciliarAutomatico({dias: 7, tol: 0.10, meses: 12, porNome: true})` (index.html; sem argumento continua como antes).
  `Recorrente.ocorrencia`: vencimento sem registro, de antes do `criadoEm` do compromisso, vira `semconf` ("sem conferência",
  `conta: false`), e não `atrasado`; não aparece como opção para marcar à mão.
- N35 no computador (≥ 761 px): `.shell` sem `max-width`, barra colada à esquerda; `ajustarLateral()` mede a altura da barra (da posição
  dela na tela até o fim), refeita ao rolar (rAF), no `resize`, no `matchMedia('(min-width:761px)')` e no `ResizeObserver` do topo e do
  anúncio; a barra e a lista rolam com `overscroll-behavior:contain`; as views sem `max-width`; texto corrido até 110ch; o selo "Entrar na
  nuvem" fica ao lado da barra. Teste: `teste/teste-desktop.js` (1280×720 a 2560×1440 e trocando a largura).
- 3.69 (módulo novo `previsao` 1.0.0; `orcamento` 1.1.0). **Previsto × realizado** (`window.Previsao`; o nome `Previsto` já é o
  do módulo de sazonalidade/boletos): para cada grupo › categoria de saída, previsto do mês = contas certas (`Recorrente.ocorrencias` do
  mês; o real — pagamento conciliado/pago ou lançamento com `recorrenteId` no mês — substitui o valor previsto) + variáveis (média dos 6
  meses fechados antes, sem lançamentos de compromisso, sem os de evento e sem os meses com evento × peso do mês do ano anterior, só
  com ≥ 12 meses de histórico, entre 0,6 e 1,5 × IPCA do grupo do cache do `Orcamento`, sem buscar nada) + eventos (`ST.eventos`, viagens
  do Futuro: km × 2 ÷ consumo × preço, de `Desloc.veiculo()`, no combustível do mês da ida). Viagem descoberta: janelas de 4 dias de
  combustível > 2× a mediana semanal (18 semanas) ou ≥ 2 abastecimentos quando o normal é 1; pergunta em `budget.atencao` (Painel) e
  `inbox.itens` (📥); "sim" grava o evento (`detectado`), marca `g.evento` e aprende o km; "não" vai para `ST.config.viagensNao`.
  `totalMes` → previsto/gasto/aVir/aVirCertas/rendaPrevista/sobra (renda e sobra `null` na visão da casa); `proximos(3)`.
  `orcamento` 1.1.0: barra empilhada (`.pv-barra`: gasto, passou, falta tracejado, risquinho do ritmo, linha da meta) nas categorias com
  limite + as 6 maiores pelo previsto; a "Projeção do mês" usa `Previsao.totalMes()`. Pontos novos no index: `futuro.topo`,
  `budget.atencao`, itens `inbox.itens`. Teste: `teste/teste-previsao.js`.
  **Conta fixa para boleto genérico** (`apelido` 1.1.0): `Apelido.contasFixas(g)` — saída de origem `u:` sem apelido e sem
  `recorrenteId` × ocorrências de 10 dias antes a 5 dias depois (vencimento −5/+10), valor dentro de `Apelido.faixa(r)` (min/max dos 12
  últimos pagamentos ±15%; sem histórico, valor ±25%), pulando vencimento que já tem `gastoId` conciliado. Uma: a lista mostra o nome
  (ponto `lancamento.linha`, selo "A confirmar" + ✓); duas ou mais: botões para escolher. `ap-conta` → `ligarConta`: `recorrenteId`,
  `Pagamento.conciliar` e o apelido só daquele lançamento. Teste: `teste/teste-apelido.js` (6).
  **Fluxo com o patrimônio real** (`modulos/patrimonio-mes.js` 1.0.0, `window.PatrimonioMes`): `ST.patrimonio_mes = [{id:'AAAA-MM', mes,
  valor, caixa, invest, em}]` — `registrar()` grava o `patrimonioHoje()` do mês, no máximo 1×/dia (vale a última do mês; nunca na visão da
  casa; coleção reservada). `realDe(mes)`: a de hoje no mês atual; a foto do mês; senão remonta das fontes que o patrimônio de hoje usa (última
  `ST.fotos` do mês para a carteira; último `saldos_banco.hist` do mês de cada conta — o robô guarda só 90 dias), e só se TODAS têm valor.
  `serie(meses)`: sem real, de trás para frente P(m−1) = P(m) − (entrou(m) − gastou(m)), e para a frente depois do último real; sem nenhum
  real, do zero. `vizFluxoPatrimonioDesenho` refeito: `.pat-real` (cheia) × `.pat-est` (tracejada), `.pat-inv` (área investida, só com fotos
  da carteira), colunas `.col-e`/`.col-x` (padrão listrado + ★)/`.col-s`/`.col-a` (`--viz-aporte`); saldo do mês = entrou − gastou. KPIs do
  Fluxo: patrimônio de hoje, variação (real se o 1º e o último ponto são reais), sobrou, foi para investimento. Visão da casa: só o bloco de
  baixo, sem aporte; o balão sem patrimônio/investimento. Verbetes `fluxo-patrimonio`, `patrimonio-planilha`, `saldo-acumulado`. Teste:
  `teste/teste-fluxo.js`.
  **Topo**: o ✨ IA saiu da faixa (`Anuncio.html`) para a barra de cima (`#btnIA`, `.ia-ico`, antes da 🔍; `ia-off` posto no
  `Anuncio.render`). A faixa só existe com anúncio ou com a tarja do modo de teste (senão `html()` devolve '' e o `medirTopo` mede de novo).
  No celular o nome do app encolhe (`.brand-caixa{flex:1 1 0}`) para o topo não quebrar de linha (quebrar fazia o fundo pular ao abrir
  uma janela, pelo `scrollbar-gutter`); abaixo de 360 px o ✨ some da barra e fica no menu 👤. Teste: `teste/teste-topo-ia.js`; a fumaça
  tira o ✨ e a faixa vazia nas duas cópias. **Calendário do menu** (`calendario-menu` 1.2.0): seta invertida (aberto ⌄ "Recolher";
  recolhido ⌃ "Abrir o calendário").
- 3.68.1: o Enter global (keydown no `document`) escolhe o botão por prioridade de verdade: `.modal-foot .btn.primary`, senão `.f-actions .btn.primary`, senão o primeiro `.btn.primary` (uma lista com vírgula no `querySelector` devolve o primeiro na ordem do documento). Teste: `teste/teste-enter.js`.
- 3.68 (módulo novo `apelido` 1.0.0; `pessoas` 1.2.0; `visao-casa` 1.0.2; o layout do Painel continua o mesmo, fora o "Mês a mês").
  **"Mês a mês"** (`vizMesAMes(itens, fmt)`, itens `{nome, rec, extra, entRec, saida, aplic}`): a barra é o resultado real (entrou − saiu;
  aplicação fora), em dois pedaços — o recorrente (`.mm-up`/`.mm-down`) e o extraordinário (`.mm-extra`, amarelo listrado, ★). A régua é
  só do recorrente (+15% de folga quando há extraordinária); o que passa da borda é cortado com `⫽` (`.mm-quebra`) e o número diz o total;
  embaixo "sem a rescisão/FGTS: ±R$ X". Cada mês é um `<details>` com entrou recorrente / extraordinária / saiu / foi para investimento.
  **Renda extraordinária à mão**: `#glExtra` na edição (só no grupo Renda); grava `g.extra` só quando difere da regra automática
  (`RX_RENDA_EXTRA`), senão apaga (volta a valer a regra). Verbete `renda-extra`.
  **`modulos/apelido.js`** (`window.Apelido`): `ST.apelidos = [{id, origem, nome}]`, a origem é `Origem.origemDe(g)` (CNPJ → idp → chave
  da descrição; genérica = `u:<id>`, só aquele lançamento). Campo `#glApelido` na edição; a lista mostra `Apelido.texto(g)` (o nome do
  banco no `title`); a busca (`Gasto.filtrar`) olha o apelido e a descrição. Cofre: `Escopo.de('apelidos')` = casa quando algum
  lançamento da casa tem essa origem (`C.origCasa`, montado no `preparar`), senão reservado.
  **Quem pelo nome**: `Pessoas.nomeVer(texto)` / `quemVer(t)` no index: o código gravado (o apelido da casa, que o robô usa) NÃO muda;
  quem é da casa aparece pelo `nome` do cadastro (lista, chips do filtro, edição, Custos, Rendas, compromissos), igual em PT e EN. A edição
  mostra o nome e o `Pessoas.ligar` do `arruma` devolve o código ao salvar; a busca aceita os dois. O backup guarda os códigos.
  Testes: `teste/teste-painel-mes.js` (3 e 3b), `teste/teste-apelido.js`, `teste/teste-quem-nome.js`.
- 3.67 (módulo novo `orcamento` 1.0.0; o layout do Painel não muda — o dono vai colher propostas).
  **Painel do BudgetONE** (`viewBPainel`): um período só para o Painel inteiro (`periodoPainel(lista)`: o filtro, ou os últimos 12
  meses; o nome vem de `periodosProntos`), rótulo `.pn-periodo` em cada bloco; todo "por mês" divide por `P.meses`; os quatro números
  do topo usam o mesmo período dos blocos. "Para onde foi" com drill-down (`vizBarrasDrill`; `painelGrupoAberto`; `data-pngrupo` abre,
  `data-pnsub` filtra os lançamentos no mesmo período). Renda extraordinária: `rendaExtra(g)` (rescisão, FGTS, indenização pelo nome — resgate de investimento NÃO, é a volta de um aporte —, ou
  `g.extra` true/false à mão) fora das médias e das barras do "Mês a mês" (★ e lista embaixo).
  **`modulos/orcamento.js`** (`window.OrcamentoMes`; o nome `Orcamento` já é o do IPCA): `ST.orcamentos = [{id:'GRUPO|sub', grupo, sub,
  limite}]`; cartão "Orçamento do mês" (barra; ≥80% perto, >100% estourou; aviso no `gasto.novo`) e "Projeção do mês" (entra = maior entre
  a renda do mês e a média sem extraordinária; sai = o que já saiu + média diária de 12 meses × dias que faltam; não aparece na visão da casa).
  **Visão da casa** (`visao-casa` 1.0.1): `orcamentos` é coleção da casa (o limite vale para a família); o `resumo` do mês leva `orc`
  (o total só das categorias com limite, sem lançamento nenhum); para quem vê só a casa, `gastoNoMes` = `resumo.orc` + o que ela lançou
  depois do `atualizadoEm`. O aviso diz só a categoria e os totais. A "Projeção do mês" não aparece para ela (a renda dele nunca entra).
  Teste: `teste/teste-painel-mes.js` (fotos `/tmp/painel-mes-*.png`).
- 3.66.1: título da aba, `og:title` e manifest = "MoneyTRIO" (sem frase). Ícone novo (cifrão sobre o gráfico de crescimento): `icone.svg`
  (favicon), `icone-32.png`, `icone-192.png`, `icone-512.png` e `icone-512-maskable.png` (fundo inteiro, desenho na zona segura de 76%).
  Teste: `teste/teste-nome-icone.js`.
- 3.66 (`nuvem.js` 1.14.0; módulo novo `visao-casa` 1.0.0; `espelho` 1.1.2; SQL `supabase/2026-11-12-moneytrio-escopos.sql`).
  **Dois cofres** (desenho: `DESENHO-visao-da-casa.md`; contrato do robô: `supabase/CONTRATO-robo-escopos.md`):
  - **Chaves próprias do MoneyTRIO:** CC (casa) e CR (reservada), AES-256, em `money_chaves` embrulhadas (RSA-OAEP, `Cifra.embrulhar`)
    para cada pessoa; no aparelho em `L.fam[gid].mk` (chave do aparelho) e no Vale. A CF da plataforma continua só para abrir o
    cadeado e a ponte; nenhum registro vivo do MoneyTRIO abre com ela (conferido na migração e por `money_migracao_concluir`).
  - **Registro:** `{c:1, m:'c'|'r', mv, iv, ct}`. Reservado = id `r.<id>` e escopo `reservado` (a regra é `Escopo.de`, em
    `modulos/visao-casa.js`; PJ é sempre reservado; o chefe muda um item com `escopo` no lançamento ou compromisso). O
    reservado que sai é apagado de verdade (`money_reservar_apagar`). Config reservada `r.<chave>` vale por cima da da casa.
  - **Banco:** visão por pessoa (`money_visao`: só o chefe é "tudo" sem linha); RLS por escopo; "casa" só depois da migração
    concluída (`money_migracao`); gatilhos: só chave nova depois da migração; grupo, coleção, id e escopo fixos.
  - **Migração** (`Escopos.migrar`, pelo `Fundo`, retomável): caixa vazia → chaves → recifra a casa, move o reservado para `r.` →
    rastros fora → duas caixas (`config|caixa_casa`, `config|r.caixa_robo`) → comprovantes `MTA2` em `r/` → marcador
    `config|r.escopos` (os outros aparelhos baixam tudo de novo) → conferência → `money_migracao_concluir`.
  - **Visão da casa:** `appsVisiveis()` = só o BudgetONE; Painel sem "Sobrou", com "Gastos da família" (coleção `resumo`, por mês,
    calculada no aparelho do chefe); sem robô, espelho, ponte nem "Família no MoneyTRIO".
  - **CF:** a de versão mais alta (`buscarMinha`), conferida ao abrir pelo PIN (`conferirCf`) e antes de aprovar pela família
    (nunca repassa uma CF velha); a ponte percebe uma CF mais nova (`cfNova`). Girar a CF é com o OmniLifeONE.

  Teste: `teste/teste-visao-casa.js` (mock `teste/mock-escopos.js`, duas pessoas) e `teste/sql/teste-moneytrio-escopos.sql`.
- 3.65.2 (`nuvem.js` 1.13.0; módulo novo `lancamento-form` 1.0.0; `saldo-banco` 2.1.0).
  **Gráficos** (regra do app, vale para todo gráfico novo):
  1. **Largura real e altura que cabe:** todo gráfico em SVG passa por `Viz.auto(fn(W, H), {frac, min, max})`. O desenho é feito na
     largura medida do lugar (sem esticar o viewBox: o texto do eixo fica com o tamanho do CSS) e com a altura = `frac` da janela
     (entre `min` e `max`). Um `MutationObserver` e o `resize` chamam `Viz.ajustar()`, que redesenha só quando a medida muda. O
     cartão inteiro, com a legenda, cabe sem rolar no 1366×768 e no 1920×1080.
  2. **Eixo legível:** `.ax` = 12 px, cor `--viz-eixo` (contraste AA ≥ 4,5 nos dois temas), formato curto (`vizEixo`/`fmtCurto`:
     "R$ 150 mil", "R$ 2,5 mil") e marcas redondas (`vizMarcas`: 1, 2, 2,5, 5 × 10ⁿ).
  3. **Zero sempre:** `.viz-zero` (cor `--viz-zero`) em todo gráfico com valor negativo ou barras para cima e para baixo;
     `.viz-div-zero` nas barras divergentes.
  4. **Cores do tema:** nada de cor fixa no código. `--viz-*` e `--s1…--s8` mudam com o tema; o saldo do mês é `--viz-saldo`
     (roxo-claro no escuro, roxo mais escuro no claro).
  5. **Escalas diferentes = blocos diferentes:** blocos com título e eixo próprios. No Fluxo, "O que você tem" (estoque) e
     "Entrou e saiu, mês a mês" (barras, zero e a linha do saldo do mês).

  **Painel:** "Para onde foi" e "Mês a mês" lado a lado a partir de 1200 px (`.painel-par`); "Os meses caros" em 12 colunas
  (`vizColunas`).

  **Aporte:** a aplicação ou o resgate do robô (`Caixa.aporte`, pela descrição; grupo INVESTIMENTO sem a palavra = aplicação) vira
  lançamento do grupo Investimento com `fluxo` 'aplicacao'. O resgate é negativo (`g.resgate`, em `Gasto.arruma`). As já guardadas
  como transferência migram uma vez (`config.aportesV`).

  **Patrimônio de hoje** (`patrimonioHoje`):
  - caixa = os saldos das contas e poupanças que o robô manda (`SaldoBanco.patrimonio`);
  - investido = a carteira do InvestifyONE (sem a classe "Dinheiro em conta" quando o robô já trouxe as contas) ou, sem carteira,
    os investimentos do robô.

  **Lançamento** (`modulos/lancamento-form.js`):
  - Categoria: combobox com a lista INTEIRA do grupo (`Gasto.arvore`), com a atual marcada; o texto livre continua valendo.
  - "A confirmar": o selo e "✓ Confirmar como está" no topo (ponto `lancamento.topo`); com pendência, a bandeira "Marcar para
    conferir" sai.
  - "Falta: …" destaca o grupo, a categoria, "como pagou", o banco e o cartão vazios.
  - "Por qual banco" vem de `Banco.palpite(g.conta)` (o cadastrado ou `cod:341`, que salvar cadastra).

  Teste: `teste/teste-graficos.js` (1366, 1920 e 390, nos dois temas; fotos em `/tmp/graf2-*.png`).
- 3.65.1 (`origem` 1.0.1, `espelho` 1.1.1): descrição genérica do banco (`Origem.GENERICA`, a mesma lista do robô, espelho.py GENERICA:
  boleto "PAG TIT", Pix enviado/recebido sem nome, TED, DOC, compra débito) SEM `contraparte.cnpj` nem `id_pessoa` → a origem é só aquele
  lançamento (`origemDe` = `u:<id>`, `mesma` = false): confirmar não replica e o espelho não manda `regra`. O Itaú não manda o beneficiário
  do boleto. Teste: `teste/teste-origem.js`.
- 3.65 (`nuvem.js` 1.12.0; módulos novos `tour` 1.0.0, `cartoes` 1.0.0, `contraparte` 1.0.0, `declaracao-escolhas` 1.0.0; `pessoas` 1.1.0,
  `profissionais` 1.2.0, `compromisso-de` 1.7.0, `calendario-menu` 1.1.0).
  **Barra de andamento global** (`Fundo.mostrar(id, frac|null, rótulo)` / `Fundo.esconder(id)` / `Fundo.renderBarra`): `#barraAndamento`
  na base do cabeçalho, role=progressbar; mostra as tarefas do Fundo e os trabalhos curtos (caixa do robô com "x de N", sincronizar,
  espelho); com algum total, o %; sem total, indeterminada; só aparece depois de 400 ms; some com fade; respeita reduzir movimento.
  **Passeio** (`modulos/tour.js`, `Assist.abrir('tutorial')`): spotlight (sombra recortando o alvo), balão que se move (transition em
  left/top) com seta, alvo por lista de seletores em ordem (computador: `#navLista`; celular: `#btnMenu`), fora da tela rola até ele,
  teclado (→ ← Esc), foco preso, sem alvo → balão no meio; `html:has(.tour)` trava o fundo. **Calendário do menu**: animação de altura
  (Web Animations, 220 ms) e o chevron gira; `pedirLateral()` no fim. **Lançamentos**: `.desc-txt` com line-clamp 2 e o texto no title.
  **Cartões** (`modulos/cartoes.js`): o cartão é a conta (fatura) com `finais [{fim, tipo, titular}]`, `contaId` (conta_cartao da
  Pluggy), `titular`, `usa` ("Quem usa"); final novo da mesma conta entra como virtual (novo); sem conta pergunta uma vez
  (`ST.config.cartoesPergunta`); "Cartões encontrados" agrupa por conta; `ligarRetro` liga as compras antigas; quem pagou = titular do
  adicional → quem usa → titular. Ponto novo `cartao.form` e `cartoes.config`. Corrigido: `cartao-salvar` usava `bt` (não existia).
  **Contraparte** (`modulos/contraparte.js`): CNPJ → id_pessoa → nome (Pessoas e Profissionais guardam `cnpjs`/`idps`; aprendem ao
  confirmar); MCC só palpite. **Pessoas 1.1.0**: nomes no banco gerados do nome completo (`nomesDoBanco`), apelido da casa e nomes antigos
  em `aliases` (nunca como nome de banco); pares novos `contato`, `titular`, `usa`; SolverONE como empresa quando há "IA e software".
  **Segurança e aparelhos** (`nuvem.js` `Painel`): tela larga (`.nv-largo`, `.nv-grade` 1/2/3 colunas em <760/≥760/≥1600 px) com 5 seções
  (Seus dados · PIN e digital · Seus aparelhos · Robô do banco · Sair), cada uma com "Avançado" (`<details>`) para o que é raro (passkey,
  e-mail do robô, apagar a cópia, só neste aparelho). Abre pelo item do menu do perfil `data-perfil="nuvem"` ("☁️ Dados salvos · hh:mm",
  amarelo guardando, vermelho com erro; `MoneyNuvem.itemMenu()`; só esse item é atualizado, sem redesenhar o menu) e por Configurações
  (`#cfgSeguranca`, `data-acao="nuvem-painel"`). O selo "Tudo guardado" saiu: `#nvSelo` é um ícone ao lado do perfil (no início, solto no
  canto). Aparelhos do mesmo nome em apps diferentes viram uma linha ("Linux · Chrome · MoneyTRIO e OmniLifeONE"). Com a tela aberta, o
  pedido de acesso aparece dentro dela. **Jornada entre apps**: o PIN é da pessoa; `Portao.primeiraVez` lê `sol_aparelhos_meus` (coluna
  `app`) e `sol_pin_info` antes de mostrar; já usa outro app → "Você já usa o OmniLifeONE. Aprove por um aparelho seu…" (+ aviso de que o
  PIN escolhido também vale lá, se a conta não tem PIN); `novoPin` → "Crie o PIN da sua conta SolverONE. Ele vale no MoneyTRIO, no
  OmniLifeONE e nos próximos apps". Os textos ficam no `nuvem.js` para o OmniLifeONE reaproveitar. Teste: `teste/teste-seguranca.js`.
  **Cartão por foto** (`modulos/cartao-foto.js` 1.0.0, ponto novo `cartao.topo` no `abrirCartao`, só no cadastro novo): "📷 Fotografar cartão"
  (`capture="environment"`) e "🖼️ Imagem ou print do cartão" (galeria). O motor do Leitor OCR (cópia SEM alterar do leitor-ocr 0.9.4,
  motor 1.11.0, em `leitor/`: `leitura.js`, `leitura/`, `leitores/cartao-plastico.js`, `tesseract/`) carrega só no toque, em ordem
  (`leitura.js`, `leitura/catalogo.js`, `leitura/texto.js`, `leitores/cartao-plastico.js`; o `foto.js` o motor carrega sozinho);
  `Leitura.lerCartao(file, {aviso, progresso})` → `{final, bandeira, nome, validade, emissor, conferido, virtual}`. Preenche o vazio; o
  final já de um cartão → "Abrir esse cartão"; o final nas compras do robô (`Cartoes.encontrados`) → reabre o cadastro com a semente da
  conta; virtual com final novo → "Juntar a" um cartão do robô do mesmo banco. Segurança: o arquivo vai direto ao motor e o input é limpo
  (`input.value = ''`); nada no IndexedDB, histórico ou fila; sem IA e sem internet; só a frente. `sw.js`: os .js do motor no básico;
  `leitor/tesseract/` no cache do OCR (1º uso). **Uma cópia só do Tesseract**: o leitor antigo do app (`Ocr`, `Leitor`) também lê de
  `leitor/tesseract/`; de `assets/ocr/` saiu tudo menos ZXing e jsQR; `CACHE_OCR` foi para `moneytrio-ocr-2` e a ativação apaga o
  `ocr-1` (quem já tinha baixa o Tesseract uma vez, de `leitor/`). Atualizar o motor: copiar de novo do leitor-ocr (mudanças lá só pelo PEDIDOS.md).
  Teste: `teste/teste-cartao-foto.js` (cartões fictícios com os números de teste públicos das bandeiras).
  **Reenvio do robô** (`Caixa.corrigir`, 1.12.0): lançamento editado OU confirmado pela pessoa (`editadoPessoa` ou `confirmadoEm`) fica
  como ela deixou; os campos que ela não vê nem edita (`CAMPOS_META`: `finalCartao`, `contaCartao`, `contraparte`) entram sem perguntar; o
  resto vira `roboSugeriu` (e só ele marca para conferir). Intocado: ganha tudo, mais a `confianca` (`marcarConfianca`). O id do robô
  (`rb_…`) evita dobra. Teste: `teste/teste-nuvem.js` (reenvio de tudo).
  **Declaração com escolhas** (`modulos/declaracao-escolhas.js`, ponto `declaracao.escolhas`): bens sem liquidez com dono e dívida,
  restituição prevista (desmarcada), imposto em compromissos (dia −1), conferência de deduções. Testes: `teste/teste-tour.js`,
  `teste/teste-cartoes-contraparte.js`; teste-desktop (descrição longa, calendário animado); teste-pessoas-espelho (barra com %).
  **Origem** (`modulos/origem.js`): selos "A confirmar"/"A identificar" na coluna Categoria (ponto `lancamento.categoria`), filtros
  `bFiltro.aconfirmar/aidentificar`, mesma origem = cnpj → id_pessoa → chave da descrição (NFKD, A–Z, sem palavras de 1 letra);
  `Origem.depoisDe` replica grupo/sub/paraQuem/irpf nos pendentes da mesma origem (nunca nos editados/confirmados), com Desfazer, e
  manda cada um ao espelho sem regra (`semRegra`); tela `b-confirmar` agrupada. Caixa: `marcarConfianca` põe a confiança também no
  lançamento já existente que ninguém tocou. "Debito" do robô = `debconta` (ou Pix/TED/boleto pela contraparte). **Categorias**
  (`modulos/categorias.js`): `ST.config.subAlias` aplicado no `Gasto.arruma`/`Recorrente.arruma`; migração única para "Streaming e
  mídias"; "Renomear categoria" em Configurações. **Assinaturas 1.1.0**: "Não vou renovar" (fim → `r.ate`), "já paga até" (sem
  cobrança), cobrança depois do fim → aviso. **Conferência com o banco 2.0.0**: conta_id/categoria_conta/final_conta; três seções;
  cartão com a fatura positiva; itens `investimento` (`SaldoBanco.receberInvest`). Teste: `teste/teste-origem.js`.
- 3.64.1 (`nuvem.js` 1.11.1), correção de segurança: "Sair" do menu do perfil e da conta (`case 'sair'`/`'conta-sair'`) chamavam o
  `Sessao.sair()` antigo; com a nuvem ligada agora chamam `MoneyNuvem.sair(false)` (tela "Saindo…", tranca, sai, `location.replace`;
  `pageshow` com página guardada pelo navegador → recarrega). "Criar o PIN da conta" (`Portao.criarPinConta`): conta sem PIN da conta e
  cadeado aberto (PIN ou digital: a DUK fica na memória) → `sol_pin_definir` com o atual nulo + `Pin.gravar` (L.pin e L.srv); o painel
  mostra "Criar" ou "Trocar" conforme `Pin.info().tem`. Conta sem PIN da conta: `Pin.abrir` abre com o PIN do aparelho e **não** cria o
  PIN da conta em silêncio (só nasce quando a pessoa cria de propósito); `Aparelhos.aoAbrir` mostra no topo `#nvAvisoPin` "Crie o PIN da
  sua conta SolverONE … · Criar agora"; criado, o L.pin é refeito e o PIN antigo dá "PIN errado". "🔒 Fechar agora" → "🔒 Bloquear
  agora". Mesma regra para o OmniLifeONE. Teste: `teste/teste-sair-pin.js` (digital simulada: autenticador virtual com PRF).
- 3.64 (`nuvem.js` 1.11.0; módulos novos `pessoas` 1.0.0, `espelho` 1.0.0, `saldo-banco` 1.0.0, `indicadores` 1.0.0; `profissionais` 1.1.0).
  **Pessoas** (`modulos/pessoas.js`, coleção `pessoas`): da casa (responsável/dependente), outras pessoas, empresas (CNPJ opcional; nunca
  CPF). Cada registro guarda o ID ao lado do texto nos pares `quem/quemId`, `paraQuem/paraQuemId`, `pagador/pagadorId` (`Gasto.arruma`
  e `Recorrente.arruma` chamam `Pessoas.ligarTudo`); renomear reescreve o texto em todas as listas do Store (`Pessoas.propagar`).
  Texto livre continua valendo; parecido sem certeza → "É a mesma pessoa?" (uma vez por nome); sem parecido → "A identificar".
  Migração única (`ST.config.pessoasV`): os "quem" de hoje viram pessoas, "PJ" vira empresa, o texto antigo fica nos apelidos do
  extrato; pré-preenche com `sol_grupo_membros` (`MoneyNuvem.membros()`) e com as pessoas da ponte do OmniLife. Lançamento: "Quem
  pagou" (`quem`; vazio → o dono da conta/cartão, `Pessoas.donoDe`) e "Para quem é" (`paraQuem`). Pagamento de compromisso: `quem` =
  "Quem paga", `paraQuem` = "Para quem é". IR (`Tax.daPessoa`): beneficiário adulto → a declaração dele; dependente → quem pagou.
  Profissionais 1.1.0: "para quem é" = `paraQuem` (o pagante continua da conta). Categoria Saúde "Terapias (TO/Fono/Psicopedagogia)".
  **Caixa do robô** (nuvem.js 1.11.0): `irDe` ("IRPF…" marca o IR; `irTexto`), `TIPOS` (desconhecido → ignorado e anotado em
  `Caixa.desconhecidos`), `saldo` → `SaldoBanco.receber`, estorno → `estornar` (negativo, na categoria do original de até 120 dias;
  `Gasto.arruma` mantém o sinal com `estorno: true`; `migrarEstornos` uma vez), `confianca` (só lançamento novo), `para_quem`,
  `descRobo`, `contaRobo`; gasto já entregue que o robô reclassifica como transferência/fatura (`virouTransferencia`): sem edição sai do
  livro (a transferência fica só em Movimentações, sem contar em dobro), editado vira sugestão em Revisar. **Espelho** (`modulos/espelho.js` + `Espelho` no nuvem.js): a edição da PESSOA (formulário, apagar,
  confirmar palpite, confirmar profissional) vira o texto do contrato v1, entra na fila do IndexedDB fechada com a CF e vai fechada para
  a chave do robô (`money_espelho_chave_de` → ECDH P-256 efêmero → HKDF "money-espelho-v1|grupo" → AES-256-GCM, AAD grupo) em lotes de
  200 (`money_espelho_depositar`); correção do robô não gera pacote; `regra` só quando a pessoa mudou grupo/categoria/para quem de um
  lançamento do robô (ou confirmou: `confirmada: true`). Link da planilha em `ST.config.espelhoLink` (só docs.google.com/spreadsheets),
  no menu do perfil. **Painel**: `budget.painel` (ponto novo) com os indicadores do mês e a conferência com o saldo do banco; "Peso na
  renda" no "Para onde foi". Configurações: ponto novo `config.todos`. Teste: `teste/teste-pessoas-espelho.js` (51 verificações, inclusive o reenvio de 2.330 itens pela caixa: ~27 s, a tela não trava;
  o vetor do espelho em `teste/espelho/vetor-espelho.json`).
- 3.63 (`estilo.css` 3.63, `nuvem.js` 1.10.1): **janela aberta trava o fundo** (diretriz "janela.js"). Só CSS, no fim do estilo.css:
  `html:has(.modal-wrap:not(.hidden) | #nvPortao | .nv-painel | .lock-wrap:not(.hidden) | .popup-an | dialog[open]){overflow:hidden;
  scrollbar-gutter:stable}` e, até 760 px, `html:has(.sidenav.open)` (o menu ☰); a trava fica só no `<html>`, nunca no `<body>`, e
  como `overflow:hidden` não mexe no `scrollY`, ao fechar a página está onde estava (nada de guardar e devolver a posição por JS).
  `overscroll-behavior:contain` em `.modal-wrap/.modal/.modal-body/.lock-wrap/.popup-an/.sidenav/#navLista/dialog` e nas telas da nuvem.
  A faixa do anúncio, com janela aberta, fica `visibility:hidden` (antes `display:none` encolhia a página 44 px e a lista pulava).
  Janela nova: se cobre a tela, acrescente o seletor dela nessa regra. Teste: `teste/teste-desktop.js` ("janelas", 1366, 1920 e 390,
  com roda do mouse e dedo, 5 janelas + o menu no celular).
- 3.62 (`nuvem.js` 1.10.0, seção `Pin`): **PIN da conta**, igual em todos os aparelhos. Plataforma: `supabase/2026-11-11-sol-pin-conta.sql`
  (sol_pin_conta, sol_aparelho_pin; RPCs sol_pin_info / sol_pin_conferir / sol_pin_definir; "primeiro" só na conta sem aparelho).
  v = PBKDF2-SHA256(PIN, sal da conta, 600 mil), base64url; o banco guarda SHA-256(v) e as tentativas (espera do 5º erro; 24 h por erro
  do 10º em diante; aprovação por outro aparelho próprio, como='aparelho' há < 10 min, troca o PIN sem o atual e desbloqueia). Com o PIN
  certo o banco entrega o segredo do aparelho. A DUK fica fechada duas vezes: `L.pin` (PBKDF2 do PIN da conta, abre sem internet, limite
  local de 10) e `L.srv` (AES(HKDF(segredo, "sol-pin-v1"), AES(chave não extraível 'chaveAp|uid' do IndexedDB, DUK)), abre com internet).
  `L.pinVersao` = a versão do PIN que o L.pin conhece; versão diferente no banco → o aparelho aberto tranca ("trocado em outro aparelho").
  `Pin.abrir`: sem internet/sem SQL → o PIN local; conta sem PIN → este PIN vira o da conta; migração: `pinConta` (o PIN antigo daqui
  abriu, a conta tem outro → digite o da conta) e `pinAntigo` (o da conta está certo, falta o antigo daqui uma vez, ou a digital, ou
  aprovar). Aparelho aprovado/passkey/código antigo: `Pin.pedir` → "Digite o PIN da sua conta" (ou "Escolha o PIN da conta" se a conta
  não tem). "Esqueci o PIN" → aprovação → "Não lembro o PIN da conta: escolher outro" (sol_pin_definir sem o atual); o lugar antigo do
  aparelho na lista sai. Teste: `teste/teste-pin-conta.js` (ponta a ponta) e `teste/sql/teste-sol-pin-conta.sql`; o banco de mentira
  comum dos testes da plataforma fica em `teste/mock-sol.js`.
- 3.61 (`nuvem.js` 1.9.0, seção `Aparelhos`): **sem código de recuperação**. Plataforma: `supabase/2026-11-07-sol-aparelhos.sql`
  (sol_aparelhos, sol_acesso_pedidos, sol_passkeys; só funções, nenhuma regra de acesso direto). Formato v2 (o mesmo no OmniLifeONE):
  B (aparelho novo) cria o pedido com pubB (ECDH P-256 efêmero, não extraível, guardado no IndexedDB para continuar se recarregar)
  e C = SHA-256("sol-ap-v2|c|x.y|nB"); A (aparelho aberto da mesma conta, ou chefe/responsável da família) grava pubA e nA
  (`sol_pedido_desafio`); B revela nB (`sol_pedido_revelar`); A confere C; os dois mostram 6 números = SHA-256("sol-ap-v2|id|pubA|pubB|nA|nB")
  (4 primeiros bytes mod 10⁶). A aprova com o PIN ou a digital (`Cadeado.duk`, sem abrir nada) e grava a resposta: ECDH → HKDF
  (info "sol-ap-v2|id|uid|nA|nB") → AES-GCM (AAD = id): pessoal = {sk: pkcs8 da pessoa}; família = {gid, kv, fk, cf} (só a chave da família).
  B lê uma vez (`sol_pedido_buscar` → "usado", a resposta sai do banco), cria o PIN e `Cadeado.montar`. O aparelho guarda `L.ap`
  (id na lista) e `L.como`. Ao abrir: `sol_aparelho_registrar` (quem já usava, "primeiro"), `sol_aparelho_visto` (false = tirado →
  apaga o cadeado e a cópia) e o aviso "aprovado por X" (aparelho novo da conta aprovado pela família, depois de `L.avisosAte`).
  A cada busca: `sol_pedidos_para_mim` → faixa "🔔 Pedido de acesso". Passkey: rp.id solverone.com.br, PRF → HKDF("sol-passkey-v2")
  fecha o pkcs8 (`sol_passkeys`); a opção só aparece com leitor de digital e passkey na conta. O código antigo: link discreto
  "Tenho o código de recuperação antigo", só se existe a cópia em `omni_chave_privada`. Sem o SQL, tudo isso fica quieto.
  Testes: `teste/teste-aparelhos.js` (ponta a ponta, contextos separados: aprovar, repetir, recusar, vencer, pub trocada, responsável
  aprova, tirar, passkey só interface) e `teste/sql/teste-sol-aparelhos.sql` (Postgres local).
- 3.60 (`compromisso-de` 1.6.0): "Conferir o que foi lido" orientada a decisão. Chips no topo (`.cdl-chip`, um por seção, estado
  recalculado a cada escolha: ✓ já cadastrado / ⚠ escolha a opção / ✓ já paga em dd/mm / + será criado / ↻ vai atualizar). Seção aberta
  só quando pede decisão (opção não marcada e nada cadastrado; boleto sem valor claro); o resto com "ver detalhes" (`aria-expanded`).
  Com cadastro existente e "Manter", a opção não importa (nada é criado): o chip fica ✓. Repetidos numa faixa (`.cdl-faixa`, "Limpar"
  `aria-pressed`, apaga ao Criar, Desfazer devolve). Um cadastro só: "Manter" escolhido e Manter · Atualizar este · Criar novo em
  "mudar". "valor do documento…" vira ⓘ (title) no Valor; "o contrato não diz o dia" vira ⚠ no Vence. Janela até `min(1200px, 94vw)`;
  celular em uma coluna. Teste: `teste/teste-parte14.js` (390, 1366, 1920, com fotos, teclado, inglês).
- 3.59 (`compromisso-de` 1.5.0): boleto lido como o app lê (PdfTexto): a linha com os 3 valores (bruto, descontos, a pagar)
  pode vir SOZINHA logo abaixo de "1ª Parcela da Anuidade" ou do cabeçalho "Valor Bruto Descontos Valor a Pagar"; o rótulo nunca
  pega um percentual ("multa de 2,00%"). "Já existe" (`jaExistem`) compara só o MESMO tipo (`tipoComp`: escolar × escolar,
  ampliado × ampliado; lanche, cantina, uniforme, material, transporte nunca) e `agrupar` junta os existentes iguais entre si
  (`Recorrente.parecemRepetidos`): fica o que não está "a confirmar" (ou o mais antigo) e o outro é "o repetido", que dá para
  apagar (o Desfazer devolve, com os pagamentos dele). Cada existente aparece uma vez só. Tela "Conferir o que foi lido": janela
  `min(960px, 92vw)` (`#genModal:has(.cdl-tela)`), seções em grade `auto-fit minmax(280px,1fr)`, cabeçalho com checkbox e nome
  claro ("Mensalidades 2027 · 12 × R$ … · dia 10", "Período ampliado 2027", "Matrícula 2027 (1ª parcela) · R$ … · 30/10"),
  "já existe" em uma linha por existente com botões segmentados (rádios de verdade: Manter · Atualizar este · Criar novo; "Apagar
  o repetido"). Com uma janela aberta o selo da nuvem sai (como a pílula do Fundo). Teste: `teste/teste-parte14.js`.
- 3.58 (N44, estilo.css): no celular (≤ 760 px), com o menu ☰ aberto (`body:has(.sidenav.open)`), o selo da nuvem (`.nv-selo`, de
  nuvem.js) vai para o lado do menu (`left: 248px + 12px`, quebra em duas linhas se precisar), como o computador faz com a barra lateral;
  em tela com menos de 360 px não cabe ao lado e ele sai enquanto o menu está aberto (o mesmo da pílula do Fundo e do AssistONE).
  Sem z-index. Teste: `teste/teste-desktop.js`, celular 390×800, calendário aberto e recolhido, e de volta ao canto ao fechar o menu.
- 3.57 `modulos/calendario-menu.js` (`CalendarioMenu.recolhido/alternar/aplicar`): o calendário do pé do menu (barra lateral no
  computador, menu ☰ no celular; o mesmo `#navCal`) ganha no cabeçalho um botão discreto (seta, `aria-expanded`, `aria-controls`) que o
  recolhe numa etiqueta "📅 Novembro de 2026 ⌄" (botão de verdade; tocar abre). Padrão aberto; a escolha fica em localStorage
  `moneytrio.calMenu.recolhido` (só preferência de tela, com try/catch). Ligação no index.html: `renderCalendarioMenu` chama
  `CalendarioMenu.aplicar(#navCal)` depois de desenhar; o `ResizeObserver` da barra lateral observa também o `#navCal`. Estilo `.calm-*`
  no fim do estilo.css. Teste: `teste/teste-desktop.js` (aberto, recolhido pelo teclado, lembrado ao recarregar, aberto de novo, nas 4
  larguras e no celular 390×800). O botão ✨ IA não foi mexido (posição a decidir na diretriz da plataforma).
- 3.56 (`nuvem.js` 1.8.1): `Tela.mostrar` põe o cursor no 1º campo 60 ms depois de abrir a tela **só se o cursor ainda não estiver
  dentro dela** (antes roubava o campo de quem já estava digitando ou do preenchimento automático; era a causa do teste-nuvem instável, N43).
  Teste: `teste/teste-nuvem.js`, "cursor não é roubado do campo onde a pessoa já está".
- 3.55 (`compromisso-de` 1.4.1): amostra oficial `teste/amostras/boleto-matricula-layout.txt` no teste; com boleto no lote e "a pagar" não lido,
  usa documento − desconto; sem isso, a parcela do contrato com o aviso "confira o valor" (nunca o bruto calado, nunca zero).
- Boleto REAL (fixture literal em `teste/teste-parte13.js`): a linha da tabela "1ª Parcela da Anuidade … bruto descontos a pagar"
  ganha; sem ela, os rótulos ("Valor do Documento" aparece duas vezes, com o a pagar E com o bruto: não confiar nele sozinho;
  a pagar = "Valor a pagar/cobrado" ou documento − desconto). Vencimento = a data logo abaixo do rótulo "Vencimento" (nunca a
  "Data do Documento"; "após o vencimento" é instrução de multa, não rótulo). "Série / Turma 3º Ano" do boleto também escolhe a etapa.
- Repetido (itens 7 e 8 do dono): `Recorrente.parecemRepetidos(a, b)` = períodos que se cruzam E (nome igual sem acentos,
  maiúsculas e ano OU mesma categoria + mesmo "para quem é" + valor ±10%); números diferentes no nome (1 × 2, "6 cartas")
  nunca são repetidos. O formulário pergunta NA HORA, só ao criar: [Cancelar] [Criar mesmo assim] [Atualizar o existente];
  "Criar mesmo assim" grava `repetidoOk` e o par não ganha o selo "⚠ repetido?" (o selo fica para o que já existia).
  O importar JSON usa a mesma regra; o contrato PDF tem a sua (mais larga: mesmo aluno e uma palavra do nome) porque sempre mostra a escolha.
- Tabelas no computador (item 9): `UX.cabecalhoFixo` mede de novo a cada vez (tira a marca antes), roda no `resize` (150 ms) e um
  `ResizeObserver` em cada tabela marcada tira a marca se ela crescer depois: tabela que não cabe rola para o lado, nunca é cortada.
- Testes: `teste/teste-parte13.js` (36 ok), `teste/teste-desktop.js` (58 ok), `teste/teste-compromisso.js` (64 ok),
  `teste/teste-sem-dados-reais.js`.

### Ligação com o OmniLifeONE (3.50) — especificação
Decidido pelo dono em 06/Nov/2026 (respostas "sim" às perguntas a e b): o OmniLifeONE manda um resumo mínimo da saúde da família e o
MoneyTRIO usa para (a) preencher o plano de saúde (operadora e quem ele cobre) e (b) transformar o médico de referência em profissional conhecido.

**Caminho:** a ponte da plataforma (contrato C5, `sol_ponte`), que já existe na base. Nenhum SQL novo. Um app nunca lê a tabela do outro (C3):
o OmniLifeONE não lê `money_docs`, o MoneyTRIO não lê `omni_docs`.

**O que o OmniLifeONE faz (lado dele; o MoneyTRIO não mexe naquele repositório):**
1. Quem manda: um aparelho de **chefe ou responsável** com o cofre aberto (tem a CF). Quando muda o plano (`health.plan.operator`) ou o
   médico de referência (`health.doctor`) de alguém, e uma vez ao ligar a integração, chama:
   `sol_ponte_enviar(p_de := 'omnilife-one', p_para := 'moneytrio', p_tipo := 'saude-resumo', p_dados := <abaixo>, p_grupo := <id da família>)`.
   Se a pessoa desligou a integração (`sol_ponte_config`), a função devolve NULL e nada é mandado.
2. `p_dados` = `{"v": 1, "cif": "<texto>"}`. O `cif` é o MESMO formato do cofre e do `money_docs`:
   `JSON.stringify({c: 1, kv, fk, iv, ct})`, AES-GCM 256 com a **CF** (a chave que só chefe e responsável recebem embrulhada), iv de 12 bytes
   novo a cada envio, `ct` = texto + tag, tudo em base64. Nada de saúde vai em claro no `dados`.
3. O texto aberto (UTF-8, JSON) é sempre o **resumo inteiro** (não só o que mudou):
   `{"v": 1, "enviado_em": "<ISO>", "pessoas": [{"perfil_id": "<id da pessoa no OmniLife>", "apelido": "<nome curto, o mesmo da família>",
   "operadora": "<health.plan.operator ou vazio>", "validade": "<AAAA-MM-DD ou vazio>", "medico": "<health.doctor, texto livre, ou vazio>"}]}`.
   **Fica de fora, sempre:** número da carteirinha, cartão SUS, tipo sanguíneo, alergias, remédios, condições, telefone de emergência.
4. Quem lê: membros do grupo conseguem ver a linha da ponte (regra da base), mas só quem tem a CF (chefe e responsável) abre o `cif`.

**O que o MoneyTRIO faz (3.50):**
- `nuvem.js` 1.8.0: a cada 3 buscas (≈ 1 min) chama `sol_ponte_minha_caixa('moneytrio', true)`, abre o `cif` com a CF (registro com outro `fk`
  não abre e fica na caixa) e entrega aos módulos pelo evento `ponte.recebida` `[{id, de_app, tipo, criado_em, conteudo|null}]`.
- `modulos/ponte-omnilife.js` (`PonteOmni`): pega só o `saude-resumo` mais novo; mais velho que o último aplicado é só marcado como lido.
  Plano: `Saude.juntarDaPonte` (`saude` 1.1.0) junta pela operadora (nome conhecido: "amil" → "Amil"), cria o plano se não existir
  (PF, sem reembolso, `origem: 'omnilife'`) e acrescenta quem ele cobre; nunca troca reembolso, tabela ou PF/PJ, e plano "cobre todos" continua assim.
  Médico: o nome sai do texto livre até o primeiro "(", "-", "," ou número ("Dra. Ana Lima (pediatra) 11 9…" → "Dra. Ana Lima") e vira profissional
  conhecido (Saúde, categoria de consulta, a pessoa quando é de uma só, IR). Já conhecido: só ganha o apelido. "Não é profissional": fica assim.
  Depois marca cada mensagem como lida (`sol_ponte_marcar_lido`); o que foi aplicado sobe fechado no `money_docs` (`ponte_omnilife` guarda o último).
- Teste: `teste/teste-nuvem.js` (mensagem fechada com a CF; só a mais nova vale; outra chave fica na caixa; nada em claro no banco).

### Profissionais conhecidos (3.43)
- `modulos/profissionais.js` (`Profissionais`, N39): `Store.estado.profissionais` = [{id, nome, apelidos (nomes normalizados), grupo, sub, quem,
  irpf} | {id:'prign', ignorar: true, apelidos}]. Normaliza sem IA (acentos, PIX/TED/PAGAMENTO, DR/DRA, LTDA/ME/S/A, números) e compara
  palavra a palavra (1 letra de diferença vale nas palavras de 5+ letras). Nota ≥ 0,8 = o mesmo (classifica sozinho); 0,5–0,8 = pergunta
  com sugestão; nome novo de saúde/educação = pergunta. Ouve `gasto.novo`; cartão em `custos.revisar`; tela `b-profissionais`.
  Muda o lançamento no próprio objeto (quem chamou `Gasto.add` continua com a referência) e nunca mexe em `editadoPessoa`.
- Teste: `teste/teste-parte7.js`.

### Plano de saúde e reembolso (3.44)
- `modulos/saude.js` (`Saude`, N38): `Store.estado.saude_planos`. Tipo e especialidade do gasto por palavras (sem IA); reembolso estimado =
  menor entre o gasto e a tabela (especialidade ganha do tipo); "fica para o IR" = gasto − reembolso (só gasto com IR). Leitor de apólice
  "por modelo": lista de operadoras, frases de "sem reembolso"/"coparticipação" e linhas "tipo … R$ valor"; a pessoa confere antes de salvar.
  A apólice vai para `ArquivosFamilia` (tipo `apolice`). Pontos: `lancamento.linha`, `tax.deducoes.topo`, `custos.topo`; tela `b-saude`.
- Teste: `teste/teste-parte8.js`.

### Integração com o OmniLifeONE (relatório, 06/Nov/2026; nada foi mexido no OmniLife)
**O que existe**
- Na tela Saúde do OmniLifeONE, por pessoa: operadora do plano, nº da carteirinha, validade, cartão SUS, médico de referência,
  alergias e remédios. Fica **só no aparelho** (`NUVEM_LOCAL = ["health","docs","files"]` no index.html do OmniLife), de propósito,
  por ser dado sensível. Os outros dados vão para `omni_docs`, cifrados com a mesma chave da família que o MoneyTRIO usa.
- O `para-o-chat-do-MoneyTrio-integracao-OmniLifeONE.txt` descreve uma ponte antiga por `localStorage` (`ecossistema.ponte.v1`:
  gastos e preços do OmniLife para o BudgetONE). O MoneyTRIO nunca leu essa ponte; com a nuvem e o domínio próprio de cada app ela não
  funciona mais (cada app tem a sua origem).

**O que proponho** (decisão do dono e do chat do OmniLife)
1. Fonte de cada dado: a **identidade do plano** (operadora, carteirinha, quem é coberto) mora no OmniLife; a **parte financeira**
   (reembolso, coparticipação, tabela, PF/PJ) mora no MoneyTRIO. Nenhum app escreve no outro.
2. Para o MoneyTRIO preencher sozinho "operadora" e "quem é coberto", o OmniLife precisaria subir uma visão mínima da Saúde
   (só operadora e pessoas; sem alergias, remédios ou carteirinha) numa coleção própria do `omni_docs`, por exemplo `health_plan`.
   Leitura só de chefe/responsável, cifrada com a chave da família. Contrato escrito no `PLATAFORMA-DADOS.md`.
3. O "médico de referência" do OmniLife pode virar um profissional conhecido (N39), para o extrato reconhecê-lo desde o primeiro PIX.
4. A ponte por `localStorage` deve ser registrada como obsoleta nos dois repositórios.

### Patrimônio sem liquidez e Importar posições (3.45)
- `modulos/patrimonio-iliquido.js` (`PatrimonioIliquido`): `Store.estado.patrimonio_iliquido` = [{id, nome, tipo (fgts|previdencia|imovel|empresa|outro),
  inst, valor, data, obs}]. Entra no "Patrimônio total" do Painel pelo ponto `patrimonio.extra`, separado do líquido; `totais()` da carteira
  (alocação, rentabilidade, rebalanceamento) não muda.
- `modulos/importar-posicoes.js` (`ImportarPosicoes`): arquivo `{"tipo":"moneytrio-posicoes","versao":1,"itens":[…]}`.
  - Posição líquida: `{ticker, nome?, tipo (chave de TIPOS), inst?, qtd, pm, moeda?, data?, valorAtual? (fundo/previdência/outro), ix?/taxa? (renda fixa), notas?}`;
    em renda fixa, fundo, previdência e outro, `pm` é o valor aplicado (qtd = 1).
  - Sem liquidez: `{semLiquidez: true, nome, tipo, inst?, valor, data?, obs?}`.
  - "Já existe" = mesmo ticker e instituição (líquida) ou mesmo nome e instituição (sem liquidez): vem desmarcado.
- Teste: `teste/teste-parte9.js`.

### Sobras (3.46)
- `modulos/assinaturas.js` (`Assinaturas`, N29 b): `Store.estado.assinaturas` = [{id do compromisso, plano, renova, precoMensal, precoAnual}];
  `proxima()` avança a renovação sozinha; aviso em Custos e na fita (7/30 dias); comparação anual × mensal.
- `modulos/compromisso-de.js` (`CompromissoDe`): "Virar compromisso" (lançamento → semente) e contrato PDF por modelo (escola, aluno,
  ano letivo, anuidade, N parcelas de R$ X, dia de vencimento, matrícula; 11 parcelas = fev–dez). Abre o formulário para conferir;
  o PDF vai para `ArquivosFamilia` (tipo `contrato`). Regras de texto só dentro da linha (`[ \t]`, não `\s`).
- `modulos/previsto.js` (`Previsto`, N28): `previsto_cfg` (época do ano ligada por compromisso) e `boletos`. Pesos por mês = média do mês
  ÷ média geral (12+ meses, até 2 anos). Boleto: texto ("valor do documento", "vencimento", "beneficiário") e linha digitável (valor nos 10
  últimos números; fator de vencimento com a base nova de 22/02/2025). Ajusta o previsto pelo ponto `recorrente.previsto`
  (`Recorrente.ocorrencia` → `previstoFonte` 'sazonal' | 'boleto'); o valor marcado/conciliado ainda ganha.
- Teste: `teste/teste-parte10.js`.

### Contrato da escola pelo modelo e extrato do FGTS (3.47)
- `modulos/compromisso-de.js` 1.1.0: `lerModelo(texto)` reconhece 3 modelos (texto do pdftotext): **contrato escolar** ("educação escolar - AAAA":
  curso/turno marcados com `( X )`, tabela "Curso/Etapa | Anuidade | 1ª Parcela Antecipada | Restante | Nº | Parcela" com o nome da etapa
  quebrado em até 2 linhas acima do valor, "N mensais … de <mês> a <mês> … vencíveis no dia D"); **período ampliado** (tabela "Modalidade |
  Horário | Anuidade | Nº | Parcela", opção com `( X )` ou −1 = perguntar; "vencimento nos meses de fev a jun e de ago a dez" → `fora` [7]);
  **boleto da matrícula** ("1ª Parcela da Anuidade": os 3 últimos valores = bruto, desconto, a pagar; "Vencimento dd/mm/aaaa").
  `planoModelo(docs)` → compromissos `aConfirmar`, `origem: 'contrato'`, IR, Dependentes/escola + 1ª parcela como gasto pontual
  (`jaLancado` = mesmo valor ±15 dias → vem desmarcado). Prévia no `genModal`; leitura no `Fundo`. Texto sem modelo → leitor genérico (1.0.0).
  O aviso "A confirmar" do compromisso diz "Criado a partir do contrato" quando `origem === 'contrato'`.
- `modulos/fgts.js` (`Fgts`): `lerExtrato` (empregador, CNPJ, admissão, afastamento, saldo, data, lançamentos com saque negativo, taxa do último
  CREDITO DE JAM = crédito ÷ saldo antes dele); `estimar(item)` = saldo × (1 + taxa)^n, n = dias 21 desde a data do extrato (sem JAM no extrato:
  3% a.a. sem TR); distribuição de resultado fica "a confirmar" (fora da estimativa). Sem coleção própria: grava em `patrimonio_iliquido`
  (`tipo: 'fgts'`, `fgts: {empregador, admissao, afastamento, taxaJam, lancs (últimos 60)}`); acha a conta pelo 1º nome significativo do empregador.
  Aviso em agosto enquanto houver conta com saldo lida antes de 1º/ago. Extrato vai para `ArquivosFamilia` (tipo `fgts`).
- `modulos/patrimonio-iliquido.js` 1.1.0: `valorHoje(item)` (ponto `iliquido.valor`), `total()` pelo valor de hoje; FGTS pode ter valor 0
  (conta sacada: guardada e escondida, "N contas zeradas guardadas — mostrar").
- Teste: `teste/teste-contrato-fgts.js` (textos sintéticos, sem dado real).
- 3.49 (`compromisso-de` 1.2.0), conferido pela sessão principal contra o texto real (`pdftotext -layout`): o complemento "(1º ao 5º ano)" /
  "(5x na semana)" vem na linha DE BAIXO dos valores e completa a linha de cima; linha de valores sem nome herda a etapa de cima; o
  horário sai do nome (`horario`); aluno = "Nome do Aluno:" ou o 1º "Nome Completo:" depois de "Informações do(a) educando(a)";
  espaços repetidos viram um antes das regras; só as linhas da etapa marcada com X entram na prévia, e a série ("Ano/Série" ou o
  "3º Ano" do contrato do ampliado) pré-seleciona. O teste usa o mesmo layout, com nomes fictícios.
- 3.52 (`compromisso-de` 1.3.0): a tabela é lida em BLOCOS, pelo layout exato que a sessão principal mandou (fixture literal no teste):
  o nome vem nas linhas ACIMA dos valores ("Ens. Fundamental", "Horário Estendido –", horários, "Opcional"), o complemento "(…)" na linha
  de baixo; horários vão para `horario`, "Opcional" e o travessão saem do nome; linha com "R$" sem valores completos (Diária Avulsa) é ignorada.
  3.53 (1.3.1): linha só com palavras de cabeçalho (Valor, da, Anuidade, Nº, de, Parcelas, Parcela, Modalidade, Horário…) não começa bloco.
  Os exemplos das telas (placeholders) usam nomes genéricos; o catálogo de compromissos sugere "Salário" (não mais com um nome de pessoa).
- Nenhum nome real nos testes, nos módulos e na documentação (3.49): crianças, pais, escola, empregadores e saldos foram trocados
  por fictícios. O que já está no histórico do git só sai reescrevendo a main (decisão do dono).
