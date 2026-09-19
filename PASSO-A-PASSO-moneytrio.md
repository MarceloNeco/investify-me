# MoneyTRIO v3.3 — passo a passo

> **Esta entrega substitui todas as anteriores.** Pode apagar os zips
> antigos do MoneyTRIO. O que vale é só o que está aqui dentro.

## 1. O que veio neste zip

**Vão para o GitHub** (raiz do repositório `investify-me`):

| Arquivo | O que é |
|---|---|
| `index.html` | o app inteiro, com a carteira cifrada dentro |
| `manifest.json` | faz o app poder ser instalado no celular |
| `sw.js` | faz o site abrir sem internet — **já vem com a versão v2** |
| `icone-192.png` · `icone-512.png` | o ícone do app instalado |

**Nunca vão para o GitHub:**

| Arquivo | Por quê |
|---|---|
| `MoneyTRIO-local.html` | carteira **aberta** dentro |
| `NAO-SUBIR-NO-GITHUB-backup-carteira.json` | carteira **aberta** |

**Para conferir o pacote antes de subir:**

| Arquivo | O que faz |
|---|---|
| `abrir-teste-moneytrio.bat` | Windows: dois cliques e abre a página de teste |
| `abrir-teste-moneytrio.command` | Mac: dois cliques e abre a página de teste |
| `TESTE-moneytrio.html` | a página em si (precisa ser aberta pelo atalho) |

**Só para ler:** este guia, o `LEIA-ME-moneytrio.txt` e o `ARQUITETURA.md`
(esse último é técnico — serve para quando você pedir uma mudança a mim ou a
outra IA; não precisa entender nada dele).

## 2. Testar antes de subir (1 minuto)

1. Descompacte o zip numa pasta.
2. **Windows:** dois cliques em `abrir-teste-moneytrio.bat`.
   **Mac:** dois cliques em `abrir-teste-moneytrio.command` — na primeira vez o
   Mac pode recusar; então clique com o botão direito → **Abrir** → **Abrir**.
3. Vai abrir uma janela preta (é o servidor, deixe aberta) e o navegador com a
   página de teste.
4. A página confere sozinha se os 5 arquivos estão inteiros, se a carteira saiu
   cifrada e se não sobrou nenhuma chave de API dentro do arquivo. Tem que ficar
   tudo com ✓ verde.
5. Para fechar, feche a janela preta.

Se você não tiver Python no computador, o atalho avisa e não acontece nada de
errado — dá para testar abrindo o `MoneyTRIO-local.html` com dois cliques, só
não tem a conferência automática.

## 3. Subir (1 minuto)

1. `https://github.com/MarceloNeco/investify-me`
2. **Add file → Upload files**
3. Arraste os **5** arquivos da primeira tabela. Confirme "replace".
4. **Commit changes**

Desta vez o `sw.js` **já vem com `v2`** — você não precisa editar nada dentro
dele. É esse número que avisa os celulares de que existe conteúdo novo.

## 4. O que entrou na 3.3

### A tela ficou mais calma

Você disse que estava poluída e confusa para quem não é de tecnologia. O que
mudou, sem tirar nenhuma função:

- **Configurações fechadas por padrão.** Cada bloco virou um título com uma
  linha de resumo; abre ao tocar. Eram 19 cartões abertos de uma vez.
- **Texto comprido dobrado.** Explicação longa mostra duas linhas e um
  **"ler mais"**. O texto continua todo lá.
- **Filtros de período enxutos.** Seis botões (Mês atual, Mês passado, Ano
  atual, Últimos 12 meses, Últimos 24 meses, Tudo) e os anos num seletor, em
  vez de uma parede de botões.
- **Avisos curtos.** Os recados do canto agora cabem em duas linhas no celular.
- **Espaçamento e tamanhos padronizados** na tela inteira, no tema escuro e no
  claro.

### Um botão só de ajuda: o **?** no topo

Abre a central **Assist ONE**, com quatro abas:

| Aba | O que tem |
|---|---|
| 💡 Esta tela | o que é a tela que você está vendo, e o que dá para fazer nela |
| 🧭 Tutorial | cinco passos, do zero ao primeiro lançamento |
| ✨ Começar | atalhos para as tarefas comuns (subir planilha, cadastrar ativo…) |
| 🔎 Buscar | procura ao mesmo tempo no glossário e nas aulas do Coach |

Na primeira vez o tutorial abre sozinho. Depois disso, só quando você pedir.

### O nível das explicações só aparece onde muda alguma coisa

Era o que você tinha pedido. Agora o seletor Iniciante / Médio / Expert some das
telas em que o nível não muda nada, e aparece no Coach, no Glossário e em
qualquer tela que tenha um ⓘ — com uma linha embaixo dizendo o que ele muda
ali ("3 explicações nesta tela").

Cada nível tem **texto próprio**, escrito um a um: 137 verbetes do glossário e
18 aulas do Coach, em português e em inglês. Não é o mesmo texto ficando maior.

### Duas coisas de segurança que eu arrumei

Fiz a revisão do código inteiro que as suas diretrizes pedem (sete checagens).
Duas coisas eram risco de verdade e eu corrigi; o resto está no fim deste guia.

**1. O espelho da carteira em cookie vinha ligado de fábrica.**
Um cookie sobe junto com **todo** pedido que o navegador faz ao endereço do
site. Na prática, a sua lista de ativos — código, quantidade, preço médio e
instituição — passava pelo servidor que hospeda a página a cada visita, e
qualquer outra página sua no mesmo endereço podia ler. Isso contradizia o que o
próprio app promete na tela de entrada.

Agora vem **desligado**. Quem já tinha ligado (você) é desligado uma vez, com
aviso na tela de Configurações. **Nada foi perdido:** a carteira continua no
navegador, no arquivo de backup e, se você usar, no Drive. Dá para religar em
**Configurações → Onde seus dados ficam salvos**, agora com a explicação do que
isso significa escrita ali do lado.

**2. Link vindo de fora podia rodar código dentro do app.**
Os links de notícia (que vêm de sites de fora), os de anúncio e o endereço lido
de um QR code de nota fiscal iam direto para a tela. Um endereço começando com
`javascript:` viraria código rodando dentro do app, com a carteira aberta ao
lado. Agora só passa `http` e `https`; o resto é descartado.

### Um documento técnico novo

O `ARQUITETURA.md` explica o que cada um dos 40 arquivos faz, o que nunca mexer
e onde mudar o quê. Ele não é para você ler — é para colar numa conversa quando
você pedir uma mudança a mim ou a outra IA, para ninguém quebrar o que já
funciona.

## 5. O que entrou na 3.2

### O inglês agora vale na tela inteira

Eram **431 textos** que continuavam em português quando você trocava o idioma —
título de tela, indicador, cabeçalho de tabela, filtro, legenda de gráfico,
botão, fita do topo, rodapé e a cláusula de uso. Agora sobrou **zero**.

Como funciona: a tradução acontece no instante em que a tela é desenhada, em
cima do HTML já pronto. Em português a passagem não faz nada. Não fica ninguém
vigiando a página — por isso não mudou nada de velocidade no celular.

**O que você escreveu nunca é traduzido.** Nome de categoria, de fundo, de
pessoa e descrição de lançamento aparecem como você digitou, nos dois idiomas.
"Empregada" continua "Empregada" em inglês; "Habitação", que é rótulo do app,
vira "Housing".

As notas de versão continuam em português de propósito — são registro
histórico, e em inglês a tela avisa isso em uma linha.

### A diarista, do jeito que ela realmente acontece

Marque o compromisso como **serviço por visita** e o app passa a separar duas
coisas que não são a mesma: **quando ela vem** e **quando você paga**.

Ela vem toda segunda; você paga na última segunda do mês (ou no último dia, ou
no dia que escolher). O pagamento soma os dias trabalhados no período, e a tela
do vencimento mostra dia a dia de onde veio aquele valor.

O que a vida faz por cima disso:

| Aconteceu | O que o app faz |
|---|---|
| Feriado na segunda | Ela não vem, e o dia **não entra** no pagamento. Não é falta. |
| Trocou a segunda pela terça | O dia conta igual, mesmo valor. |
| Veio num domingo extra | Vale mais — sugere 250 + 40% = **R$ 350**, e você confirma. |
| O domingo extra substitui a segunda | Você marca isso na hora, e a segunda sai do mês. |

Os feriados nacionais já vêm calculados, inclusive Carnaval, Sexta-feira Santa e
Corpus Christi, que mudam de data todo ano. Feriado da sua cidade você
acrescenta você mesmo.

Os dias ficam em **Custos → Recorrentes → 📋** no compromisso.

### Reajuste com data

O botão **↗** em cada compromisso. De R$ 250 para R$ 276 a partir de novembro,
ou já. O passado continua com o valor antigo nos gráficos; as próximas
ocorrências e as provisões passam a usar o novo. Tem atalho de +5%, +10% e pelo
IPCA de 12 meses.

Mudar o valor direto no formulário de edição também vira um reajuste que começa
hoje — para não reescrever o que já aconteceu.

### O calendário leva a algum lugar

Tocar num vencimento agora abre a tela dele: estado do pagamento (pendente,
agendado, débito automático, pago, confirmado), valor só daquele mês, e — quando
é serviço por visita — a lista dos dias que formaram o valor. Dali dá para ir
direto para editar ou reajustar.

Feriado fica pintado no calendário, e o dia avisa qual é.

### O pé do menu

No **InvestifyONE** voltou o nível das explicações, com as palavras de antes —
Iniciante, Médio, Expert. No **BudgetONE** ficou só o calendário. O PT/EN saiu
dos dois: mora no topo, uma vez só.

## 6. O que entrou na 3.1

### Instalar na tela de início

No Android, o Chrome oferece sozinho; ou em **Configurações → Instalar na tela
de início**. No iPhone: **Compartilhar → Adicionar à Tela de Início**.
Instalado, abre em tela cheia pelo ícone e funciona sem internet — só cotação e
notícia precisam de rede.

### Conta, e o que ela não é

São **duas coisas diferentes**, e vale entender a separação:

- **A senha da carteira** (`investify2026`) decifra os seus dados dentro do
  `index.html`. Continua exatamente como era.
- **A conta** (apelido + e-mail + senha) diz quem está usando o app naquele
  aparelho. Serve para outra pessoa usar sem ver a sua carteira, e para tirar o
  anúncio.

Ao criar a conta aparece **uma vez** um código como `9MVM-2PUW-WUSB`, com botão
de copiar e de baixar. É o caminho de volta se a senha for esquecida. Ao usar o
código, sai um novo e o antigo deixa de valer.

Sem servidor, a senha é conferida dentro do aparelho (PBKDF2, 150 mil voltas) e
nunca fica em texto puro — conferi isso no teste, lendo o que sobra no
navegador. Mas **não é o mesmo que uma conta de verdade**: ela vale naquele
aparelho, e quem tiver acesso a ele pode mexer no que o navegador guardou.

### Três portas na entrada

| Porta | Senha | Dados salvos | Anúncio |
|---|---|---|---|
| Visitante | não pede | nada é salvo | mostra |
| Assinante | pede | salvos | não mostra |
| Anunciante | pede | salvos | painel próprio |

### Painel do anunciante

Em **Configurações → Conta → Painel do anunciante**: exibições, cliques e a
proporção entre os dois, mais as campanhas (texto e link do banner). Sem
campanha, o banner mostra o `<ANUNCIE AQUI>` apontando para o seu portal.

A contagem é **deste aparelho**. Somar o que todo mundo viu precisa de servidor,
e o painel diz isso na tela.

### Avisos

Cinco tipos, cada um com a sua chavinha: conta a vencer, entrada de dinheiro,
categoria acima do normal, variação da carteira, prazos do IR.

Eles saem do que o app já sabe: os vencimentos dos seus compromissos, as
entradas do dia, e a categoria que passou da média dos últimos seis meses (o
limite é configurável, vem em 40%).

Horário silencioso das 22:00 às 07:00. Durante o silêncio o aviso **não some** —
fica guardado e sai quando o silêncio acaba.

**O limite honesto:** hoje o aviso aparece com o app aberto, e o que venceu
enquanto ele estava fechado sai na próxima abertura. Aviso chegando com o app
**fechado** precisa de um servidor de push. O `sw.js` já sabe receber e mostrar
quando houver — essa parte não vai precisar ser escrita depois.

### Um conserto que apareceu no caminho

A tabela "As dez maiores contas" esticava a página para 562 px numa tela de
390 px — no celular, tudo ficava torto e dava para arrastar a tela de lado.
Agora ela rola dentro do cartão. A regra vale para qualquer tabela larga.

## 7. O que ainda precisa de servidor

| Item | Hoje | Com servidor |
|---|---|---|
| Conta e código de recuperação | funciona **neste aparelho** | vale em qualquer aparelho |
| "Esqueci a senha" | pelo código | link por e-mail |
| Painel do anunciante | conta neste aparelho | métricas de todos somadas |
| Avisos | com o app aberto | chega com o app fechado |
| Cobrança da assinatura | não existe | entra aqui |
| Login social (Google) | precisa da chave do Google | igual |

Quando quiser resolver isso sem escrever servidor, o caminho é **Supabase** ou
**Firebase** — os dois têm plano gratuito e já trazem cadastro, confirmação de
e-mail e redefinição de senha prontos. Me avise que eu ligo.

## 8. E o OCR

Continua como na 3.0: o app procura o Tesseract em três lugares (embutido,
ao lado do arquivo, internet) e hoje cai no terceiro, porque o ambiente onde eu
monto o arquivo bloqueia o download dele. Para resolver, rode no seu computador:

```
curl -o tesseract.min.js https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js
```

e me mande o arquivo. Ler QR de nota e código de boleto não depende disso.

## 9. A revisão de código, por inteiro

As suas diretrizes pedem sete checagens em todo código que já estava no
repositório, reportadas em três níveis: **risco** (eu arrumo e aviso),
**problema** (eu reporto e você decide), **observação** (só registro). Foi isso:

### Riscos — arrumados nesta versão

| O que era | Onde | O que acontecia |
|---|---|---|
| Espelho em cookie ligado de fábrica | `armazenamento.js` | a lista de ativos ia junto com todo pedido feito ao endereço do site |
| Link externo sem conferência | notícias, anúncios, QR de nota | `javascript:` num link viraria código rodando dentro do app |
| Ícone de anúncio entrando sem limpeza | `acesso.js` | um `anuncios.json` maldoso poderia injetar HTML |
| `JSON.parse` do cadastro de biometria sem proteção | `acesso.js` | um registro corrompido travava a entrada por biometria |

### Problemas — você decide

**O leitor de cupom (Tesseract) vem da internet.** O app procura em três
lugares e hoje só acha na internet, no cdnjs. Se aquele endereço for
comprometido, o que ele mandar roda dentro da página onde a sua carteira está
aberta. O código já prefere uma cópia local: se você baixar o
`tesseract.min.js` (§8) e me mandar, ele passa a vir de dentro do seu próprio
site e o problema acaba. Enquanto isso, o OCR de foto de cupom é a única parte
do app que depende de um arquivo de fora.

### Observações — nada a fazer

- **Nenhuma chave de API no código.** As suas chaves ficam só no navegador, e
  são retiradas do arquivo de backup antes de exportar.
- **Nenhuma telemetria.** Não existe analytics, pixel ou envio de estatística
  em lugar nenhum do app.
- **Chaves do armazenamento sem colisão.** Todas começam com `investifyme.` ou
  `moneytrio.`, então os seus outros sites no mesmo endereço não se atrapalham.
  A única compartilhada de propósito é a chave de IA (`dgo:global:ia`), que vale
  para todos os apps da família — era o combinado.
- **Permissão do Google Drive é a mínima possível** (`drive.appdata`): o app só
  enxerga o arquivo que ele mesmo criou, nada do resto do seu Drive.
- **Permissão de notificação e de câmera só em botão**, nunca na abertura.
- **A IA diz o que manda.** Antes de perguntar, a tela mostra exatamente o
  resumo que vai junto — e avisa que a resposta é de um modelo de linguagem,
  que pode errar e não é recomendação de investimento.
- **Todos os `JSON.parse` de arquivo importado** já estavam protegidos: arquivo
  inválido vira aviso na tela, não tela branca.
