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
e a pasta `assets/ocr/` (o motor de leitura de fotos: Tesseract, português,
ZXing, jsQR — uns 10 MB, copiados do app Leitor OCR). Mais nada.

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
| `beneficios.js` | `Beneficios`: vale-alimentação, VT, plano de saúde etc. pendurados num salário (`salarioId` obrigatório; acabou o salário, acabam juntos). Modo `renda` vira um `Recorrente` de entrada (`ben` = id); `referencia` e `desconto` são só registro. `lerExtrato` lê a foto do extrato do vale. `Desloc`: lugares (com coordenadas do Nominatim), trajetos e a estimativa mensal de combustível, pedágio, app e transporte público; `lancarComoFixo` grava `Recorrente`s com `desloc`. Atrás da flag `deslocamentos` (`Flags.ligada`) |
| `voz.js` | ler em voz alta e ditar; entende número falado por extenso |

### Entrada de dados

| Arquivo | Responsabilidade |
|---|---|
| `importar.js` | leitura de extrato e de planilha, reconhecimento de colunas |
| `planilha.js` | leitura de `.xlsx` e `.csv` |
| `pdf-texto.js` | texto de dentro de PDF |
| `ocr.js` | `Ocr`: carregar o Tesseract (de `assets/ocr/`, do arquivo embutido ou da CDN, nesta ordem) e ler texto cru; `CupomTexto`: entender o texto de um cupom brasileiro (total, data, CNPJ, itens, forma de pagamento e cartão) |
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
   continua mostrando a versão velha. A pasta `assets/ocr/` tem cache
   próprio (`CACHE_OCR`, `moneytrio-ocr-1`), que **não** muda com a versão:
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
