# MoneyTRIO v3.2 — passo a passo

## 1. O que veio neste zip

**Vão para o GitHub** (raiz do repositório `investify-me`):

| Arquivo | O que é |
|---|---|
| `index.html` | o app inteiro, com a carteira cifrada dentro |
| `manifest.json` | faz o app poder ser instalado no celular |
| `sw.js` | faz o site abrir sem internet |
| `icone-192.png` · `icone-512.png` | o ícone do app instalado |

**Nunca vão para o GitHub:**

| Arquivo | Por quê |
|---|---|
| `MoneyTRIO-local.html` | carteira **aberta** dentro |
| `NAO-SUBIR-NO-GITHUB-backup-carteira.json` | carteira **aberta** |

**Só para você ler:** este guia e o `LEIA-ME-moneytrio.txt`.

## 2. Subir (1 minuto)

1. `https://github.com/MarceloNeco/investify-me`
2. **Add file → Upload files**
3. Arraste os **5** arquivos da primeira tabela. Confirme "replace" no `index.html`.
4. **Commit changes**

Não há nenhuma linha para colar em lugar nenhum — diferente do pacote de
diretrizes que você recebeu, aqui tudo já está dentro do `index.html`.

## 3. Por que eu não usei o `diretrizes.js`

Você me mandou o pacote com `diretrizes.js` + `diretrizes-config.js` e as duas
linhas para colar. Eu li os 144 KB do módulo antes de decidir, e **não colei**,
por três motivos concretos:

**Duplicaria o que o MoneyTRIO já faz.** O app já tem seletor PT/EN no topo,
datas `18/Set/2026` ⇄ `Sep/18/2026`, banner `<ANUNCIE AQUI>`, modo visitante,
biometria, compartilhamento nativo e OCR. Colar o módulo daria dois botões de
idioma, dois banners e duas telas de login na mesma página.

**Deixaria o celular lento de novo.** O módulo instala um `MutationObserver`
que varre a tela inteira a cada mudança do DOM. O MoneyTRIO redesenha a tela
inteira a cada clique, filtro e tique da fita, com 11.595 lançamentos em
memória. Seria a volta do problema que a gente levou duas versões pra resolver.

**O arquivo local pararia de funcionar.** O `MoneyTRIO-local.html` é um arquivo
só, sem nada ao lado. Com `<script src="diretrizes.js">` ele perderia tudo
silenciosamente.

Então eu fiz o que **faltava**, nativo, com as mesmas decisões do módulo — mesmo
formato de código de recuperação, mesmos cinco tipos de aviso, mesmo horário
silencioso. Os apps se comportam igual; só não compartilham o arquivo.

**Onde o módulo continua valendo:** nos seus outros sites (cifras, histórias,
RiseONE, portal). Lá ele resolve de uma vez o que aqui já estava resolvido.

## 4. O que entrou na 3.2

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

## 5. O que entrou na 3.1

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

## 6. O que ainda precisa de servidor

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

## 7. E o OCR

Continua como na 3.0: o app procura o Tesseract em três lugares (embutido,
ao lado do arquivo, internet) e hoje cai no terceiro, porque o ambiente onde eu
monto o arquivo bloqueia o download dele. Para resolver, rode no seu computador:

```
curl -o tesseract.min.js https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js
```

e me mande o arquivo. Ler QR de nota e código de boleto não depende disso.
