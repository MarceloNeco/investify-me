# MONEY-TRIO v3.4 — passo a passo

> **Esta entrega substitui todas as anteriores.** Pode apagar os zips
> antigos. O que vale é só o que está aqui dentro.

## 1. O que veio neste zip

**Vão para o GitHub** (raiz do repositório `investify-me`):

| Arquivo | O que é |
|---|---|
| `index.html` | o app inteiro, com a carteira cifrada dentro |
| `manifest.json` | faz o app poder ser instalado no celular |
| `sw.js` | faz o site abrir sem internet — **já vem com a versão v3** |
| `icone-192.png` · `icone-512.png` | o ícone do app instalado |

**Nunca vão para o GitHub:**

| Arquivo | Por quê |
|---|---|
| `MoneyTRIO-local.html` | carteira **aberta** dentro |
| `NAO-SUBIR-NO-GITHUB-backup-carteira.json` | carteira **aberta** |

**Para conferir o pacote antes de subir:** `abrir-teste-moneytrio.bat`
(Windows) ou `abrir-teste-moneytrio.command` (Mac) — dois cliques.

**Só para ler:** este guia, o `LEIA-ME-moneytrio.txt` e o
`ARQUITETURA.md` (técnico, para colar numa conversa quando você pedir
uma mudança a mim ou a outra IA).

## 2. Subir (1 minuto)

1. `https://github.com/MarceloNeco/investify-me`
2. **Add file → Upload files**
3. Arraste os **5** arquivos da primeira tabela. Confirme "replace".
4. **Commit changes**

O `sw.js` já vem com `v3` — você não precisa editar nada dentro dele.

Se a aba do Chrome travar com "Aw, Snap!", feche as outras abas e tente
de novo; as outras saídas estão no item 6 do LEIA-ME.

## 3. O que entrou na 3.4

### Banco e cartão deixaram de ser texto solto

Antes, "Como pagou" e "Conta ou cartão" eram dois campos onde você
digitava o que quisesse. Agora:

- **"Como pagou" é uma lista**: Pix, cartão de crédito, cartão de
  débito, boleto, transferência, débito automático, espécie, vale.
- **Escolheu Pix ou boleto**, ele pergunta **por qual banco**. Escolheu
  cartão, pergunta **qual cartão**. Escolheu espécie, não pergunta nada.
- **O que você já tinha escrito foi convertido sozinho.** "Crédito"
  virou cartão de crédito, "Pix" virou Pix, e assim por diante. Nada foi
  perdido: o texto antigo continua guardado embaixo.

**Cadastro de bancos** — em Configurações → BudgetONE. Você escolhe de
uma lista com 27 instituições e ela já traz **nome, código do banco e
CNPJ** preenchidos. Se você tem mais de uma conta no mesmo banco, dá um
apelido a cada uma ("conta corrente", "PJ").

**Cadastro de cartões** — apelido, bandeira, **últimos 4 dígitos**,
banco, dia em que a fatura fecha e dia do pagamento. Com isso o app
passa a somar sozinho quanto está aberto em cada fatura e quando ela
vence, e a compra entra na fatura certa: comprou depois do fechamento,
cai na seguinte.

> **Sobre o número do cartão:** o app guarda só os quatro últimos
> dígitos, que é o que aparece no comprovante. O número inteiro não tem
> campo em lugar nenhum e não deve ser digitado em app nenhum.

**Sobre os logos:** cada banco e cada bandeira ganharam um selo colorido
na cor oficial, com a sigla, **desenhado pelo próprio app**. Não uso a
marca registrada de nenhum banco — além de ser marca de terceiro, eu
teria que baixar as imagens de fora, e aí o arquivo deixaria de abrir
sem internet.

### A foto do cupom agora lê como foi pago

O OCR já achava valor, data, CNPJ e loja. Agora também reconhece a
**forma de pagamento**, o **banco**, a **bandeira** e o **final do
cartão**, e deixa tudo escolhido no formulário — você só confere.

Se o cartão lido já está cadastrado, ele mesmo diz se é crédito ou
débito. Se não está, o app mostra "••4821 (cartão não cadastrado)" em
vez de inventar.

### Digitar valor no celular virou tocar

Embaixo de cada campo de dinheiro aparece uma fileira de botões de
somar e subtrair. Os passos vão de um centavo a cinquenta mil, e o app
escolhe quais mostrar **pelo tamanho do número que já está no campo**:
quem está em 1.200 vê −10 +10 −50 +50 −100 +100 −500 +500; quem está em
3,50 vê −,50 +,50 −1 +1 −5 +5 −10 +10. Segurar o botão repete.

Tem também um **zerar** e, onde o aparelho permite, um **microfone**.

### Voz: ouvir e ditar

**Ditar (🎤)** — toque no microfone ao lado de um campo de valor e fale.
Funciona com "mil e duzentos", "R$ 1.234,56", "quarenta e cinco" e até
"doze reais e cinquenta" (que vira 12,50, não 62).

- Funciona no **Chrome e no Edge**, no computador e no Android.
- **Não funciona no Safari do iPhone**, porque a Apple não oferece
  reconhecimento de voz para páginas. Nesse caso o botão **nem
  aparece** — botão que não funciona é pior do que botão nenhum.
- Nada é gravado e nenhum áudio vai para o app: quem converte é o
  próprio navegador.

**Ouvir (🔊)** — os cartões de explicação ganharam um botão que lê o
texto em voz alta, no idioma escolhido. Esse funciona em todo aparelho
atual, **inclusive iPhone**.

### Salário bruto → líquido

Em Configurações → BudgetONE → **Salário**. Você informa o bruto e ele
calcula o líquido com as tabelas em vigor:

- **INSS por faixa** — é progressivo, não é uma alíquota só. Quem ganha
  R$ 8.000 paga R$ 921,51, e não 14% de tudo.
- **Imposto de renda com a regra de 2026** — que **zera o imposto até
  R$ 5.000** por mês e vai soltando aos poucos até R$ 7.350.
- O app escolhe sozinho entre o desconto simplificado e as deduções
  legais, o que der menos imposto para você, e diz qual usou.

Vale-transporte, plano de saúde, pensão e sindicato **você acrescenta
como linhas**, porque variam de empresa para empresa e não dá para
adivinhar.

Dá para fazer o caminho inverso também: *sei o líquido, quanto é o
bruto?*

A tela escreve a data de vigência das tabelas. **Quando a lei mudar, o
número muda na próxima versão** — não há consulta automática à
legislação, e eu não vou fingir que há.

### PJ × CLT, na mesma régua

O erro clássico é comparar o salário CLT com o valor cheio da nota PJ.
Não são a mesma coisa. A tela põe os dois lado a lado:

- **No CLT** entram 13º, férias com um terço e FGTS — e ela soma tudo
  para dizer quanto aquele emprego vale, de verdade, por mês.
- **No PJ** saem imposto, contador e INSS do pró-labore, e sobra o que
  você precisa **guardar sozinho** para ter o mesmo conforto.
- No fim: **quanto uma proposta PJ precisa ser para empatar**.

A conta é só de dinheiro, e a tela diz isso: estabilidade,
seguro-desemprego, licença e quem paga a conta quando você fica doente
ficam de fora.

### Menu da esquerda, no computador

Quando as opções não cabiam na altura da tela, o calendário do
BudgetONE era empurrado para fora. Agora **quem rola é a lista de
opções**, com a barra de rolagem **à mostra** — barra escondida é opção
escondida —, e o calendário continua aparecendo inteiro embaixo.

### A frequência agora está escrita

No calendário e no passo a passo, cada compromisso mostra com que
frequência cai, **por extenso**: "toda segunda-feira", "todo dia 10",
"5º dia útil do mês", "anual em janeiro". Antes só aparecia o número.

### Sair do passo a passo

Clicar fora do passo a passo com valores preenchidos **pergunta se você
quer salvar**, em vez de jogar o trabalho fora em silêncio. Respondendo,
você volta para a tela onde estava.

### O que você escreve é seu

A IA **não vê mais os nomes que você digitou** nos lançamentos. Ela
recebe a categoria no lugar — "Escola" em vez de "Escola da Ana". Para
mudar isso existe uma chavinha na tela da IA, **desligada de fábrica**,
e a lista do que sai daqui agora aparece **aberta**, não escondida.

Nada do app é publicado em lugar nenhum: não há envio automático, nem
telemetria, nem analytics.

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

## 10. O que da sua lista ficou de fora, e por quê

Você mandou 22 itens. Entraram os 8 de prioridade **Alta**, os 4 de
**Média** e a calculadora **PJ × CLT**. Ficaram de fora estes, todos de
prioridade Baixa na sua própria planilha — e não por falta de vontade:

### Os itens de PJ no TaxONE

| Item | Por que não dá agora |
|---|---|
| PJ Visão no TaxONE (CNPJ, pró-labore, MEI, Simples, Fator R) | O TaxONE ainda é uma casca — está marcado "em construção" no app. Isso é um app inteiro, não um campo a mais. |
| PJ Consulta Leis | Precisa de uma base de legislação atualizada e de uma fonte com data e link para cada regra. Um site estático não tem onde guardar nem como atualizar isso. |
| PJ Atualização de Cálculos (automática) | Não existe API pública gratuita com as regras do Simples e do MEI em formato consultável. Sem servidor e sem fonte, "atualização automática" seria promessa vazia. |
| PJ Integrado (BudgetONE + TaxONE + InvestifyONE) | Depende do TaxONE existir primeiro. |

**O que eu fiz no lugar:** a calculadora PJ × CLT, que é a parte que dá
para fazer com honestidade hoje, porque as contas são aritmética e as
tabelas cabem num arquivo com a data de vigência escrita ao lado.

**Se você quiser ir adiante com o PJ**, o caminho honesto é:
1. Definir o que o TaxONE precisa fazer no primeiro ano (só IRPF? já com
   PJ?).
2. As alíquotas do Simples podem morar num arquivo, como as do INSS
   moram hoje — com data de vigência e atualização manual a cada versão.
3. "Consulta de leis" com resposta confiável precisa de servidor. Sem
   ele, o máximo honesto é: eu escrever o conteúdo, com data e fonte, e
   o app mostrar — nunca o app "consultar a lei" sozinho.

### As três integrações bancárias

| Item | Por que não dá agora |
|---|---|
| Open Finance (Pluggy, Belvo, Celcoin…) | Todo agregador exige **credencial secreta no servidor**. Num site estático a chave ficaria dentro do `index.html`, num repositório público — qualquer pessoa leria e usaria a sua conta. Isso não é uma limitação técnica que dá para contornar: é o motivo pelo qual eles exigem servidor. |
| Parsing de e-mails / notificações push | Ler notificação de banco no Android exige um **aplicativo Android** com a permissão de Notification Listener. Uma página web não tem acesso a isso, em nenhum navegador. Você mesmo anotou a limitação: não recupera o passado. |
| Automação de CSV/OFX pelos bancos | A parte automática precisa de servidor (agendar, buscar, processar). |

**O que dá para fazer sem servidor, se você quiser:** **importar OFX**
que você mesmo baixa do banco. O app já lê extrato e planilha; ler OFX é
mais um formato — o arquivo é XML e a leitura é local, sem chave nenhuma
e sem sair do aparelho. É trabalho de uma entrega, não de um projeto.
Me diga se quer.

**Se você quiser Open Finance de verdade**, aí o caminho é o mesmo que
já apareceu antes: **Firebase ou Supabase**, que dão servidor com plano
gratuito. Aí a chave do agregador fica lá, longe do repositório, e o app
conversa com ele. Também é o que resolveria conta valendo em qualquer
aparelho, "esqueci a senha" por e-mail e aviso com o app fechado.

### Dois itens que já estavam prontos

| Item | Situação |
|---|---|
| Três apps em um | Você já tinha marcado **Done**. |
| Barra inferior reordenável com alternativa de um toque (WCAG 2.5.7) | **Já estava atendido** desde a 3.1: além de arrastar, cada botão tem ↑ e ↓ que movem com um toque só. Conferi nesta versão. |

### Tutoriais de investimento em voz alta

Entrou como **leitura em voz alta de qualquer cartão de explicação**
(o botão 🔊), que cobre o Coach, o Glossário e os textos das telas. O que
não fiz foi um "modo áudio" que lê uma aula inteira sozinho, passo a
passo — se for isso que você quer, me diga que eu faço.
