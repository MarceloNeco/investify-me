/* =====================================================================
   textos/glossario.js — o glossário: verbetes com 3 textos por idioma (iniciante, médio, expert)   3.51 · 06/Nov/2026
   ---------------------------------------------------------------------
   Saiu do index.html na 3.51 (arrumação interna). Carregado ANTES do código do app (é uma const global).
   Mudou aqui? Troque o ?v= no index.html e no sw.js (teste/teste-modulos.js confere).
   ===================================================================== */
const GLOSSARIO = [
 {
  "k": "fechamento",
  "t": "Abertura, fechamento e variação do dia",
  "te": "Open, close and daily change",
  "c": "Cotações",
  "ce": "Quotes",
  "pt": {
   "iniciante": "Abertura é o preço com que o papel começou o dia. Fechamento é o preço com que ele terminou. A variação que o app mostra compara o preço de agora com o fechamento de ontem.",
   "medio": "Abertura é o primeiro negócio do dia e fechamento é o último; a variação exibida é a distância entre o preço atual e o fechamento anterior, não o que aconteceu desde a abertura de hoje. A B3 negocia das 10h às 17h, com leilão de fechamento até por volta das 17h05. O mercado americano roda das 10h30 às 17h no horário de Brasília. Fora do pregão a cotação congela no último preço, então uma tela aberta de madrugada mostra número parado, não erro.",
   "expert": "A variação diária é calculada contra o fechamento ajustado do pregão anterior: em data-ex de provento ou em desdobramento, o fechamento de referência é ajustado, senão o papel apareceria caindo sem ter caído. Na B3, o preço de fechamento sai do leilão de fechamento, que agrega ordens e forma um preço único — por isso pode diferir do último negócio do pregão contínuo. Entre o fim do leilão e a abertura seguinte não há formação de preço: a tela mostra o último dado, e a informação nova só aparece no gap de abertura. O pregão americano ocupa das 10h30 às 17h no horário de Brasília, e essa janela se desloca quando os EUA entram ou saem do horário de verão."
  },
  "en": {
   "iniciante": "The open is the price a stock started the day at. The close is the price it ended at. The change shown in the app compares the price right now with yesterday's closing price.",
   "medio": "The open is the first trade of the session and the close is the last; the change on screen measures the distance from the current price to the previous close, not to this morning's open. B3 trades from 10am to 5pm, with a closing auction running to around 5:05pm. The US market runs from 10:30am to 5pm Brasília time. Outside those hours the quote freezes at the last price, so a screen left open overnight is showing stale data, not an error.",
   "expert": "The daily change is measured against the previous session's adjusted close: on an ex-dividend date or after a split the reference close is adjusted, otherwise the stock would look like it dropped when it did not. On B3 the closing price comes out of the closing auction, which pools orders into a single print, so it can differ from the last trade of continuous trading. Between the end of that auction and the next open there is no price formation — the screen shows the last data point, and new information only surfaces in the opening gap. The US session sits at 10:30am to 5pm Brasília time, and that window shifts when the US moves in and out of daylight saving time."
  }
 },
 {
  "k": "acao",
  "t": "Ação",
  "te": "Stock",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Ação é um pedacinho de uma empresa. Com uma ação da Petrobras você vira sócio dela — bem pequeno, mas sócio. Se o negócio vai bem, o seu pedaço vale mais; se vai mal, vale menos.",
   "medio": "Comprar ação é comprar uma fração do capital de uma empresa. O retorno vem de dois lugares: a valorização do preço e os proventos, a parte do lucro que a companhia distribui. No Brasil o final do código diz a classe: 3 é ON, com direito a voto em assembleia; 4 é PN, sem voto e normalmente com preferência na distribuição. Sócio não tem prazo nem rendimento contratado — o preço oscila todo dia e o dividendo depende de a empresa dar lucro e decidir distribuir.",
   "expert": "O valor de uma ação é o valor presente dos fluxos de caixa livres ao acionista, descontados ao custo de capital próprio. Múltiplos como P/L, EV/EBITDA e P/VP são atalhos de avaliação relativa: comparam a empresa com pares ou com o próprio histórico, mas não substituem o fluxo descontado nem corrigem diferenças de crescimento, alavancagem e qualidade do lucro. A classe entra na conta: ON (final 3) carrega voto e proteção societária, PN (final 4) troca voto por preferência na distribuição, e o mesmo emissor pode negociar com spread persistente entre as duas. O caixa chega ao acionista como dividendo ou como juros sobre capital próprio, com tratamento tributário distinto — o que muda o retorno líquido sem mudar o bruto."
  },
  "en": {
   "iniciante": "A stock is a small piece of a company. Buy one share of Petrobras and you are a part-owner of Petrobras — a very small one, but an owner. If the business does well your piece is worth more; if it does badly, it is worth less.",
   "medio": "Buying a stock means buying a fraction of a company's equity. Returns come from two places: the price rising, and the share of profit the company hands out as dividends. In Brazil the last digit of the ticker gives the class: 3 is ON, an ordinary share with a vote at shareholder meetings; 4 is PN, a preferred share with no vote and usually priority on distributions. Ownership comes with no maturity date and no contracted yield — the price moves every day, and a dividend depends on the company making a profit and deciding to pay it out.",
   "expert": "A share is worth the present value of the free cash flows available to equity, discounted at the cost of equity. Multiples such as P/E, EV/EBITDA and price-to-book are relative-valuation shortcuts: they compare a company with peers or with its own history, but they do not replace a discounted cash flow and do not correct for differences in growth, leverage and earnings quality. Share class belongs in the analysis: ON (ticker ending in 3) carries the vote and stronger minority protection, PN (ending in 4) trades the vote for priority on distributions, and the same issuer can show a persistent spread between the two. Cash reaches the shareholder either as a dividend or as juros sobre capital próprio (interest on equity, a Brazilian payout deductible for the company and taxed at the holder), and the tax treatment differs — which changes the net return without changing the gross one."
  }
 },
 {
  "k": "acao-on",
  "t": "Ação ordinária (ON)",
  "te": "Ordinary share (ON)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É a ação que dá direito a voto nas assembleias da empresa. No Brasil o código termina em 3 — PETR3, VALE3, BBAS3. Na prática o voto de um investidor pequeno pesa quase nada, mas ele existe.",
   "medio": "ON é a ação ordinária: dá voto em assembleia e o código termina em 3, como PETR3, VALE3 e BBAS3. O peso do voto de um pequeno investidor é mínimo, mas junto com ele vem o tag along: se o controlador vender o controle, quem tem ON recebe pelo menos 80% do valor pago por ação a ele. Empresas listadas no Novo Mercado só emitem ON. Em vários nomes a ON é menos líquida que a PN da mesma empresa, o que aparece como spread maior na hora de comprar e vender.",
   "expert": "O tag along mínimo de 80% é legal e vale para a ordinária; os níveis mais altos de governança da B3 elevam o direito a 100% do valor pago ao controlador. Como a ON concentra o direito político, ela tende a abrir prêmio sobre a PN quando há disputa de controle, e o spread ON/PN funciona como termômetro da probabilidade percebida de evento societário — OPA, troca de controle, migração de listagem. O Novo Mercado exige classe única ordinária, o que elimina o spread por construção. Liquidez costuma ser o contrapeso: em várias companhias o giro está na PN, e o prêmio de governança da ON vem com custo de execução maior."
  },
  "en": {
   "iniciante": "This is the share class that comes with a vote at company meetings. In Brazil the ticker ends in 3 — PETR3, VALE3, BBAS3. A small investor's vote carries almost no weight, but it exists.",
   "medio": "ON is the ordinary share: it carries voting rights and its ticker ends in 3, as in PETR3, VALE3 and BBAS3. A retail holder's vote is negligible in practice, but the class also carries tag along rights: if the controlling shareholder sells control, ON holders receive at least 80% of the price paid per share to the controller. Companies listed on B3's Novo Mercado segment issue ordinary shares only. In several names the ON is less liquid than the same company's PN, which shows up as a wider bid-ask spread when you trade.",
   "expert": "The 80% tag along floor is set in law and applies to ordinary shares; B3's higher governance tiers raise it to 100% of the price paid to the controller. Because the ON concentrates the political right, it tends to trade at a premium to the PN when control is in play, and the ON/PN spread works as a gauge of the market's perceived probability of a corporate event — a tender offer, a change of control, a listing migration. Novo Mercado requires a single ordinary class, which removes the spread by construction. Liquidity is the usual trade-off: in several companies the turnover sits in the PN, so the ON's governance premium comes with a higher execution cost."
  }
 },
 {
  "k": "acao-pn",
  "t": "Ação preferencial (PN)",
  "te": "Preferred share (PN)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É a ação sem direito a voto, mas que entra na frente na hora de receber dividendos. No Brasil o código termina em 4 — PETR4, ITUB4, BBDC4.",
   "medio": "A preferencial abre mão do voto em troca de preferência na distribuição de resultados; o código termina em 4, como PETR4, ITUB4 e BBDC4. Costuma ser a classe mais negociada da empresa, então tem mais liquidez que a ON e, com frequência, dividend yield um pouco maior. Em troca, o tag along pode ser menor que o da ON ou simplesmente não existir. Existem ainda PNA (final 5) e PNB (final 6), classes com regras próprias definidas no estatuto, que podem incluir dividendo fixo ou mínimo.",
   "expert": "A Lei das S.A. limita as preferenciais a 50% do capital nas companhias abertas registradas depois de 2001; estruturas com dois terços de PN sobrevivem apenas em emissoras mais antigas. A preferência pode ser dividendo fixo, dividendo mínimo ou prioridade no reembolso do capital, e quem define é o estatuto — PNA e PNB da mesma empresa podem carregar direitos diferentes entre si. Na comparação ON versus PN pesam liquidez, spread histórico entre as classes, política de proventos e proteção em evento de controle, já que a PN pode ter tag along reduzido ou nenhum. O preço de tela isolado não resolve essa comparação, porque parte do diferencial é direito, não desconto."
  },
  "en": {
   "iniciante": "This is the share class with no vote, but with priority when dividends are paid. In Brazil the ticker ends in 4 — PETR4, ITUB4, BBDC4.",
   "medio": "A preferred share gives up the vote in exchange for priority on distributions; the ticker ends in 4, as in PETR4, ITUB4 and BBDC4. It is usually the more heavily traded class, so it has better liquidity than the ON and often a slightly higher dividend yield. In return, its tag along right can be smaller than the ON's or absent altogether. There are also PNA (ticker ending in 5) and PNB (ending in 6), classes whose rights are set in the company's bylaws and can include a fixed or minimum dividend.",
   "expert": "Brazil's corporations law caps preferred shares at 50% of capital for listed companies registered after 2001; the older two-thirds structures survive only in earlier issuers. The preference itself can be a fixed dividend, a minimum dividend or priority in capital repayment, and the bylaws decide — PNA and PNB of the same company can carry different rights. Comparing ON with PN means weighing liquidity, the historical spread between the classes, distribution policy and protection in a change of control, since the PN may have reduced tag along or none at all. The screen price on its own does not settle that comparison, because part of the gap is a difference in rights, not a discount."
  }
 },
 {
  "k": "adr",
  "t": "ADR — American Depositary Receipt (ação estrangeira negociada nos EUA)",
  "te": "ADR — American Depositary Receipt (foreign stock traded in the US)",
  "c": "Internacional",
  "ce": "International",
  "pt": {
   "iniciante": "ADR é uma ação estrangeira negociada na bolsa americana, em dólar. É o caminho inverso do BDR. A Petrobras, por exemplo, atende por PBR em Nova York.",
   "medio": "O ADR é um recibo emitido por um banco depositário nos EUA representando ações de uma empresa de fora, negociado em dólar na NYSE ou na Nasdaq — a Petrobras aparece lá como PBR. É por ele que o investidor estrangeiro compra empresa brasileira sem abrir conta na B3. Para quem mora no Brasil, trocar PETR4 por PBR só muda alguma coisa se o dinheiro já estiver lá fora, e traz a retenção de 30% sobre os dividendos. O preço do ADR e o da ação local andam juntos, com a diferença explicada pelo câmbio e pela quantidade de ações que cada recibo representa.",
   "expert": "O ADR é lastreado em ações depositadas no mercado de origem e emitido segundo uma razão de paridade definida no programa — um ADR pode valer uma, várias ou fração de ações locais, e essa razão pode ser alterada pelo depositário. A arbitragem entre recibo e ativo-objeto mantém os preços alinhados quando o programa permite emissão e cancelamento; quando não permite, abre desconto ou prêmio persistente. Os dividendos chegam ao detentor de ADR com retenção de 30%, e o depositário ainda cobra taxa de custódia periódica descontada do provento. Os programas se dividem por nível: os de balcão têm exigência mínima de divulgação, enquanto os listados em bolsa exigem reconciliação contábil e arquivamento na SEC."
  },
  "en": {
   "iniciante": "An ADR is a foreign stock traded on a US exchange, in dollars. It is the mirror image of a BDR. Petrobras, for instance, trades in New York as PBR.",
   "medio": "An ADR is a receipt issued by a US depositary bank representing shares of a non-US company, traded in dollars on the NYSE or Nasdaq — Petrobras shows up there as PBR. It is how a foreign investor buys a Brazilian company without opening a B3 account. For someone living in Brazil, swapping PETR4 for PBR only changes anything if the money is already offshore, and it brings a 30% withholding on dividends. The ADR and the local share track each other, with the difference explained by the exchange rate and by how many local shares each receipt represents.",
   "expert": "An ADR is backed by shares deposited in the home market and issued at a ratio set in the program — one ADR can represent one, several or a fraction of local shares, and the depositary can change that ratio. Arbitrage between the receipt and the underlying keeps prices aligned where the program allows issuance and cancellation; where it does not, a persistent discount or premium opens up. Dividends reach the ADR holder with a 30% withholding, and the depositary also charges a periodic custody fee deducted from the payment. Programs come in levels: over-the-counter ones carry minimal disclosure duties, while exchange-listed ones require accounting reconciliation and SEC filings."
  }
 },
 {
  "k": "alocacao",
  "t": "Alocação de ativos",
  "te": "Asset allocation",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Alocação é decidir quanto do seu dinheiro vai para cada tipo de investimento — por exemplo, 60% em renda fixa, 30% em ações e 10% em dólar. É a divisão do bolo, antes de escolher qual ação ou qual banco.",
   "medio": "Alocação de ativos é a repartição do patrimônio entre classes: renda fixa, ações, câmbio, imóveis. Uma carteira 60/30/10 oscila de um jeito bem diferente de uma 20/70/10, mesmo que os papéis dentro de cada fatia sejam os mesmos. Estudos clássicos mostram que essa decisão explica a maior parte da variação do resultado ao longo do tempo — mais do que acertar a ação certa. Na prática ela só se mantém com rebalanceamento: as fatias se desalinham sozinhas conforme cada classe sobe ou cai.",
   "expert": "Brinson et al. mostram que a política de alocação explica a maior parte da variância dos retornos no tempo, resultado com frequência confundido com explicar o nível de retorno entre carteiras — são perguntas diferentes. A otimização de média-variância na fronteira eficiente é muito sensível a erro de estimativa, sobretudo dos retornos esperados: pequenas mudanças na entrada produzem carteiras de canto. Alternativas mais robustas atacam esse ponto por caminhos distintos — risk parity dispensa a estimativa de retorno e iguala contribuição de risco; Black-Litterman parte de um equilíbrio implícito e incorpora visões com grau de confiança explícito. A correlação entre classes não é estável: ela costuma subir no estresse, reduzindo o benefício da diversificação justamente quando ele seria mais necessário."
  },
  "en": {
   "iniciante": "Allocation is deciding what share of your money goes to each type of investment — say 60% fixed income, 30% stocks, 10% dollars. It is how you cut the cake, before picking which stock or which bank.",
   "medio": "Asset allocation is the split of a portfolio across classes: fixed income, equities, currency, property. A 60/30/10 portfolio behaves very differently from a 20/70/10 one even when the individual holdings inside each slice are identical. Classic studies show this decision explains most of the variation in results over time — more than picking the right stock. In practice it only holds with rebalancing: the slices drift apart on their own as each class rises or falls.",
   "expert": "Brinson et al. showed that allocation policy explains most of the variance of returns over time, a result often confused with explaining the level of return across portfolios — those are different questions. Mean-variance optimisation on the efficient frontier is highly sensitive to estimation error, above all in expected returns: small changes in the inputs produce corner portfolios. More robust alternatives attack that from different angles — risk parity drops the return estimate entirely and equalises risk contribution; Black-Litterman starts from an implied equilibrium and layers views on with explicit confidence. Correlations between classes are not stable: they tend to rise under stress, cutting the diversification benefit exactly when it would matter most."
  }
 },
 {
  "k": "altcoin",
  "t": "Altcoin e token",
  "te": "Altcoin and token",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "Altcoin é qualquer criptomoeda que não seja o Bitcoin. Token é um ativo digital criado dentro da rede de outra moeda, quase sempre a do Ethereum. A diferença: a altcoin tem rede própria, o token pega carona na rede alheia.",
   "medio": "Altcoin é toda criptomoeda fora o Bitcoin, e a marca principal é ter blockchain própria. Token não tem rede própria: é criado por contrato dentro da rede de outra moeda, na maioria das vezes o Ethereum, o que faz a taxa de transação ser paga na moeda da rede hospedeira. Existem milhares deles e a maior parte desaparece com o tempo, por abandono do projeto ou por sumiço da liquidez. Dentro de uma classe que já é arriscada, concentrar em BTC e ETH é a alternativa mais conservadora.",
   "expert": "A separação é de camada: altcoin é a moeda nativa de uma blockchain, usada para pagar o consenso daquela rede; token é estado dentro de um contrato inteligente hospedado em outra rede, seguindo padrões como ERC-20 para fungíveis e ERC-721 para não fungíveis. Isso empilha dois riscos no token — o da rede base e o do contrato, que pode ter função de emissão, pausa ou congelamento nas mãos de quem o implantou. A liquidez em altcoins costuma estar concentrada em poucos pares e em poucas corretoras, então o preço de tela pode não existir em volume relevante. O retorno da classe é fortemente assimétrico: poucos projetos concentram o resultado e a maioria não sobrevive ao ciclo."
  },
  "en": {
   "iniciante": "An altcoin is any cryptocurrency other than Bitcoin. A token is a digital asset created inside another coin's network, almost always Ethereum's. The difference: an altcoin has its own network, a token rides on someone else's.",
   "medio": "An altcoin is any cryptocurrency other than Bitcoin, and its defining feature is having its own blockchain. A token has no network of its own: it is created by a contract inside another coin's network, most often Ethereum, which is why the transaction fee is paid in the host network's coin. There are thousands of them and most disappear over time, through project abandonment or through liquidity drying up. Within a class that is already risky, concentrating on BTC and ETH is the more conservative option.",
   "expert": "The distinction is one of layer: an altcoin is the native coin of a blockchain, used to pay for that network's consensus; a token is state inside a smart contract hosted on another network, following standards such as ERC-20 for fungible and ERC-721 for non-fungible assets. That stacks two risks on a token — the base network's and the contract's, which may hold mint, pause or freeze functions in the hands of whoever deployed it. Altcoin liquidity is typically concentrated in a few pairs on a few exchanges, so the screen price may not exist in any meaningful size. Returns in the class are strongly skewed: a handful of projects account for the outcome and most do not survive the cycle."
  }
 },
 {
  "k": "aporte",
  "t": "Aporte",
  "te": "Contribution",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Aporte é cada vez que você coloca dinheiro novo em um investimento. Comprar mais ações da mesma empresa é um novo aporte. O que rendeu e ficou lá dentro não conta — aporte é dinheiro que saiu do seu bolso agora.",
   "medio": "Aporte é toda entrada de dinheiro novo na carteira, separada do que o investimento rendeu sozinho. Essa separação importa na hora de medir resultado: patrimônio que cresceu porque você depositou não é rentabilidade. Aportes regulares, um por mês por exemplo, suavizam o preço médio de entrada — às vezes você compra caro, às vezes barato, e a média fica no meio. Essa prática é o custo médio, ou DCA, e também tira da mesa a decisão de adivinhar o momento certo de entrar.",
   "expert": "O DCA reduz a variância do preço médio de entrada, mas em mercados com drift positivo tem retorno esperado menor que o aporte único, porque mantém parte do capital fora do risco por mais tempo. O ganho é de gestão de risco e comportamental — limita o arrependimento de entrar tudo no topo —, não de expectativa. Para medir desempenho com aportes irregulares, o retorno ponderado pelo tempo isola a decisão de alocação, enquanto o retorno ponderado pelo dinheiro (TIR) mede o que o investidor de fato levou, e os dois divergem quando o aporte chega perto de topo ou de fundo. Cada aporte também redefine o preço médio que serve de base de cálculo do imposto na venda, e no Brasil essa média é apurada por ativo, não por lote."
  },
  "en": {
   "iniciante": "A contribution is each time you put new money into an investment. Buying more shares of the same company is a new contribution. Gains that stay invested do not count — a contribution is money that came out of your pocket now.",
   "medio": "A contribution is any new money entering the portfolio, kept separate from what the investments earned on their own. That separation matters when you measure results: a balance that grew because you deposited is not performance. Regular contributions — monthly, for instance — smooth the average entry price: sometimes you buy high, sometimes low, and the average lands in between. That practice is dollar-cost averaging, and it also takes the timing decision off the table.",
   "expert": "Dollar-cost averaging lowers the variance of the average entry price, but in markets with positive drift it has a lower expected return than investing the lump sum, because it keeps part of the capital out of the market for longer. The gain is in risk management and behaviour — it caps the regret of going all in at a top — not in expectation. To measure performance with irregular contributions, time-weighted return isolates the allocation decision while money-weighted return (IRR) captures what the investor actually earned, and the two diverge when contributions land near a top or a bottom. Each contribution also resets the average cost that serves as the tax basis on sale, and in Brazil that average is computed per asset, not per lot."
  }
 },
 {
  "k": "aporte-mensal",
  "t": "Aporte mensal",
  "te": "Monthly contribution",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É quanto você consegue investir todo mês. No começo, esse valor muda mais o resultado do que a rentabilidade que você conseguir.",
   "medio": "O aporte mensal é o fluxo recorrente que entra na carteira. Nos primeiros anos ele domina o crescimento: sobre um patrimônio pequeno, uma diferença de alguns pontos de rentabilidade vale menos do que aumentar o depósito. Conforme o montante acumula, a conta se inverte e o rendimento sobre o que já existe passa a crescer mais que o depósito do mês. O ponto de virada depende do tamanho do aporte e da taxa, e chega mais cedo quando o aporte é constante do que quando ele oscila.",
   "expert": "Com aporte periódico constante, o patrimônio segue o valor futuro de uma anuidade: a parcela vinda dos depósitos cresce linearmente com o tempo, e a parcela vinda do rendimento cresce de forma composta. Daí existir um ponto de cruzamento em que o juro sobre o saldo supera o aporte do período — ele depende da razão entre aporte e saldo e da taxa, e se antecipa quando o aporte cresce junto com a renda em vez de ficar nominalmente fixo. Em prazo longo quem decide o resultado é a taxa real, então aporte nominal fixo perde poder de compra e o esforço efetivo cai ano a ano. Aporte debitado automaticamente tende a se manter mais estável que o decidido mês a mês, porque o que sobra no fim do mês varia mais do que o que sai no começo."
  },
  "en": {
   "iniciante": "This is how much you manage to invest every month. Early on, that number moves your result more than the return you earn.",
   "medio": "The monthly contribution is the recurring flow into the portfolio. In the first years it dominates growth: on a small balance, a few percentage points of return matter less than raising the deposit. As the balance builds, the arithmetic flips and the return on what is already there grows faster than the month's deposit. Where that crossover falls depends on the size of the contribution and on the rate, and it arrives sooner when the contribution is steady than when it swings around.",
   "expert": "With a constant periodic contribution, the balance follows the future value of an annuity: the part coming from deposits grows linearly with time while the part coming from returns compounds. That is why there is a crossover point where the return on the balance overtakes the period's contribution — it depends on the ratio of contribution to balance and on the rate, and it arrives sooner when the contribution rises with income instead of staying nominally fixed. Over long horizons the real rate decides the outcome, so a fixed nominal contribution loses purchasing power and the effective effort falls year by year. A contribution debited automatically tends to be steadier than one decided month by month, because what is left over at the end of the month varies more than what leaves at the start."
  }
 },
 {
  "k": "aversao-perda",
  "t": "Aversão à perda",
  "te": "Loss aversion",
  "c": "Comportamento",
  "ce": "Behaviour",
  "pt": {
   "iniciante": "Perder R$ 1.000 dói mais do que ganhar R$ 1.000 alegra. Por causa disso, muita gente segura um investimento que caiu esperando voltar, e vende rápido demais o que subiu.",
   "medio": "A aversão à perda é a assimetria entre a dor de perder e o prazer de ganhar o mesmo valor. Na carteira ela aparece como efeito disposição: realizar lucro cedo demais e carregar prejuízo tempo demais, porque vender no vermelho transforma perda no papel em perda admitida. O contraponto prático é testar cada posição com uma pergunta: \"compraria isso hoje, por esse preço?\". Se a resposta for não, o preço que você pagou é informação sua, não da empresa, e não deveria entrar na decisão.",
   "expert": "A aversão à perda vem da teoria do prospecto: a utilidade é definida sobre ganhos e perdas em relação a um ponto de referência, com inclinação maior do lado da perda. Esse ponto de referência costuma ser o preço de compra, que é custo afundado — irrelevante para o valor futuro do ativo. Daí o efeito disposição e os erros encadeados nele: manter posição perdedora esperando o empate, aumentar a posição só para baixar o preço médio, e adiar a venda para não fechar a conta mental. Uma regra de decisão escrita antes da compra, com o critério de saída definido, ataca o problema onde ele é barato — antes de a posição existir; depois dela, o preço pago já está ancorado."
  },
  "en": {
   "iniciante": "Losing R$ 1,000 hurts more than gaining R$ 1,000 feels good. Because of that, many people hold on to an investment that fell hoping it comes back, and sell the one that rose far too quickly.",
   "medio": "Loss aversion is the asymmetry between the pain of a loss and the pleasure of an equal gain. In a portfolio it shows up as the disposition effect: taking profits too early and carrying losses too long, because selling in the red turns a paper loss into an admitted one. The practical counter is to test each position with one question: \"would I buy this today, at this price?\". If the answer is no, the price you paid is a fact about you, not about the company, and it does not belong in the decision.",
   "expert": "Loss aversion comes out of prospect theory: utility is defined over gains and losses relative to a reference point, with a steeper slope on the loss side. That reference point is usually the purchase price, which is a sunk cost — irrelevant to the asset's future value. Hence the disposition effect and the errors chained to it: holding a loser to get back to even, adding to it purely to pull the average price down, and delaying the sale so the mental account stays open. A decision rule written before the purchase, with the exit criterion defined, attacks the problem where it is cheap — before the position exists; afterwards the entry price is already anchored."
  }
 },
 {
  "k": "bdr",
  "t": "BDR — Brazilian Depositary Receipt (ação estrangeira negociada na B3)",
  "te": "BDR — Brazilian Depositary Receipt (foreign stock traded on B3)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "BDR é um recibo negociado na bolsa brasileira que representa uma ação de fora. Dá para investir na Apple comprando AAPL34 em reais, sem abrir conta no exterior.",
   "medio": "O BDR é um recibo emitido na B3 com lastro em ações estrangeiras guardadas lá fora, negociado em reais — AAPL34 para a Apple, por exemplo. Você fica exposto a duas coisas ao mesmo tempo: o preço da ação e o dólar, então o papel pode cair lá fora e o BDR subir aqui. No imposto ele não segue a regra das ações comuns: o ganho paga 15% sem a isenção mensal de R$ 20 mil em vendas. Os dividendos chegam já com retenção no país de origem, então o que entra na sua conta é o valor líquido.",
   "expert": "BDR patrocinado é emitido com participação da companhia estrangeira; o não patrocinado é montado pelo depositário por conta própria, sem envolvimento nem compromisso de divulgação da emissora. A razão de paridade entre recibo e ação-objeto é definida no programa e pode ser ajustada pelo depositário, o que muda o preço unitário sem que nada tenha acontecido com a empresa. A liquidez é local e costuma ser fina, então o spread de compra e venda frente ao ativo-objeto pesa mais que a diferença de preço em si. Sobre o ganho de capital incidem 15% sem a isenção mensal de R$ 20 mil aplicável a ações, e somando taxa do depositário, spread e câmbio embutido, o custo total costuma superar o de investir direto lá fora quando a carteira é maior."
  },
  "en": {
   "iniciante": "A BDR is a receipt traded on the Brazilian exchange that stands for a foreign share. You can invest in Apple by buying AAPL34 in reais, without opening an account abroad.",
   "medio": "A BDR is a receipt issued on B3 and backed by foreign shares held offshore, traded in reais — AAPL34 for Apple, for example. You end up exposed to two things at once, the share price and the dollar, so the stock can fall abroad and the BDR still rise here. Tax treatment does not follow the rules for ordinary shares: the gain is taxed at 15% with no monthly exemption on up to R$ 20,000 of sales. Dividends arrive already withheld in the country of origin, so what reaches your account is the net amount.",
   "expert": "A sponsored BDR is issued with the foreign company's involvement; an unsponsored one is set up by the depositary on its own initiative, with no participation and no disclosure commitment from the issuer. The ratio between receipt and underlying share is set in the program and can be changed by the depositary, which moves the unit price without anything happening at the company. Liquidity is local and usually thin, so the bid-ask spread against the underlying weighs more than the price gap itself. Capital gains are taxed at 15% with no access to the R$ 20,000 monthly exemption available for shares, and once the depositary fee, the spread and the embedded exchange rate are added up, the total cost tends to exceed investing directly abroad once the portfolio gets larger."
  }
 },
 {
  "k": "benchmark",
  "t": "Benchmark (referência de comparação)",
  "te": "Benchmark",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Benchmark é a régua com que você compara o seu resultado. Para renda fixa costuma ser o CDI; para ações brasileiras, o Ibovespa; para americanas, o S&P 500. Sem uma régua, o número sozinho não diz se foi bom.",
   "medio": "Benchmark é a referência contra a qual o resultado é medido: CDI para renda fixa, Ibovespa para ações brasileiras, S&P 500 para americanas. Ganhar 8% no ano parece bom até você ver que o CDI deu 13% no mesmo período — aí você ficou abaixo do básico. A régua precisa combinar com o que está sendo medido: comparar carteira de ações com CDI mistura dois riscos diferentes e erra a conclusão nos dois sentidos. O período também tem que ser o mesmo, aportes e saques incluídos, senão a comparação vira coincidência de datas.",
   "expert": "Um benchmark útil é investível, replicável e de risco semelhante ao da carteira: se não dá para comprar o índice, a comparação não mede escolha, mede sorte de composição. Excesso de retorno sobre o índice não é alfa enquanto não for ajustado por beta e por exposição a fatores — tamanho, valor, momentum e qualidade explicam boa parte do que costuma ser vendido como habilidade. O Ibovespa é ponderado por free float ajustado com critério de liquidez, o que o deixa concentrado em poucos setores, e o CDI é taxa de caixa sem oscilação de preço, então bater um e bater o outro têm significados estatísticos distintos. Índice de preço e índice de retorno total também divergem no tempo pela reinversão de proventos; comparar carteira com proventos reinvestidos contra índice de preço infla o resultado sem mérito nenhum."
  },
  "en": {
   "iniciante": "A benchmark is the yardstick you compare your result against. For fixed income it is usually the CDI; for Brazilian stocks, the Ibovespa; for US stocks, the S&P 500. Without a yardstick, the number on its own says nothing.",
   "medio": "A benchmark is the reference your result is measured against: CDI for fixed income, Ibovespa for Brazilian equities, S&P 500 for US ones. An 8% year looks fine until you see the CDI returned 13% over the same stretch — in that case you came in below the default option. The yardstick has to match what is being measured: comparing an equity portfolio with the CDI mixes two different risks and gets the conclusion wrong in both directions. The period has to match too, contributions and withdrawals included, or the comparison is just a coincidence of dates.",
   "expert": "A usable benchmark is investable, replicable and carries risk similar to the portfolio's: if you cannot buy the index, the comparison measures composition luck rather than skill. Excess return over the index is not alpha until it is adjusted for beta and for factor exposure — size, value, momentum and quality explain much of what gets sold as skill. The Ibovespa is weighted by adjusted free float with a liquidity screen, which leaves it concentrated in a few sectors, while the CDI is a cash rate with no price volatility, so beating one and beating the other mean statistically different things. Price indexes and total-return indexes also diverge over time through reinvested distributions; comparing a portfolio that reinvests dividends against a price index inflates the result for no merit at all."
  }
 },
 {
  "k": "beta",
  "t": "Beta (o quanto oscila junto com o mercado)",
  "te": "Beta (how much it swings with the market)",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "Beta mede o quanto um investimento balança em comparação com o mercado. Beta 1,5 quer dizer que ele costuma subir e cair 50% mais que o índice. Beta perto de 1 significa que anda junto.",
   "medio": "Beta mede a sensibilidade do ativo ao movimento do mercado: beta 1,5 oscila 50% mais que o índice, para cima e para baixo; abaixo de 1, oscila menos. Ele não diz se o ativo é bom ou ruim, diz de onde vem o balanço da carteira — quanto vem do mercado como um todo e quanto vem daquele papel específico. Duas ações com o mesmo beta podem ter riscos próprios muito diferentes, porque beta ignora o que é particular da empresa. O número muda conforme o período e o índice usados no cálculo, então dois sites podem mostrar betas diferentes para a mesma ação sem que nenhum esteja errado.",
   "expert": "Beta é o coeficiente da regressão do retorno do ativo contra o retorno do mercado: covariância entre os dois dividida pela variância do mercado. Ele captura apenas o risco sistemático; o resíduo da regressão é o risco idiossincrático, que a diversificação reduz e o beta não mede. A estimativa depende da janela, da frequência dos retornos e do índice escolhido como proxy de mercado, e tende a reverter à média, o que motiva o beta ajustado usado em avaliação. Em ativos pouco líquidos o beta sai subestimado porque o preço reage ao mercado com atraso, e uma correção comum é somar os coeficientes das defasagens. Beta também não é estável em crise: correlações sobem no estresse, e o beta medido em período calmo subestima a perda no período ruim."
  },
  "en": {
   "iniciante": "Beta measures how much an investment swings compared with the market. A beta of 1.5 means it tends to rise and fall 50% more than the index. A beta near 1 means it moves in step.",
   "medio": "Beta measures an asset's sensitivity to market moves: a beta of 1.5 swings 50% more than the index, up and down; below 1 it swings less. It does not say whether an asset is good or bad, it says where a portfolio's movement comes from — how much from the market as a whole and how much from that specific holding. Two stocks with the same beta can carry very different specific risk, because beta ignores everything particular to the company. The figure changes with the period and the index used in the calculation, so two websites can show different betas for the same stock without either being wrong.",
   "expert": "Beta is the slope of a regression of the asset's returns on the market's: covariance between the two divided by the variance of the market. It captures systematic risk only; the regression residual is idiosyncratic risk, which diversification reduces and beta does not measure. The estimate depends on the window, the return frequency and the index chosen as a market proxy, and it tends to revert to the mean, which is why valuation work often uses an adjusted beta. For illiquid assets beta comes out understated because prices react to the market with a lag; a common correction sums the coefficients on lagged market returns. Beta is also unstable in a crisis: correlations rise under stress, so a beta estimated in a calm period understates the drawdown in a bad one."
  }
 },
 {
  "k": "bitcoin",
  "t": "Bitcoin (BTC)",
  "te": "Bitcoin (BTC)",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "Bitcoin é a primeira e maior criptomoeda, criada em 2009. Nunca vão existir mais de 21 milhões de unidades, e essa escassez programada é o principal argumento de quem investe nele. Nenhum banco ou governo pode emitir mais.",
   "medio": "O Bitcoin é a criptomoeda mais antiga e maior, de 2009, com oferta limitada a 21 milhões de unidades por regra do próprio protocolo. Você não precisa comprar uma inteira: 0,001 BTC é uma compra normal, e a menor fração é o satoshi, 0,00000001 BTC. O preço aparece em dólar (BTC/USD) e em real (BTC/BRL), e a diferença entre as duas cotações embute o câmbio — se o dólar sobe, o BTC/BRL sobe mesmo com o BTC/USD parado. O mercado negocia sem parar, fim de semana incluído, então a variação do domingo já está no preço quando a bolsa abre na segunda.",
   "expert": "A emissão segue uma curva decrescente: a recompensa por bloco cai pela metade a cada 210 mil blocos, o halving, até o teto de 21 milhões. A correlação com ativos de risco subiu desde 2020, o que enfraquece a tese de reserva de valor descorrelacionada e aproxima o comportamento do ativo de uma posição alavancada em apetite por risco. A exposição regulada via ETF spot transfere o risco de custódia para o emissor e elimina o problema da chave perdida, ao custo da taxa de administração e do fim da autocustódia — o cotista tem o preço, não a moeda, e não transaciona na rede. Na autocustódia o risco muda de natureza: não há reversão de transação nem recuperação de frase semente, e a segurança vira problema operacional do detentor."
  },
  "en": {
   "iniciante": "Bitcoin is the first and largest cryptocurrency, created in 2009. There will never be more than 21 million units, and that programmed scarcity is the main argument of the people who invest in it. No bank or government can issue more.",
   "medio": "Bitcoin is the oldest and largest cryptocurrency, launched in 2009, with supply capped at 21 million units by the protocol itself. You do not have to buy a whole one: 0.001 BTC is an ordinary purchase, and the smallest unit is the satoshi, 0.00000001 BTC. Prices are quoted in dollars (BTC/USD) and in reais (BTC/BRL), and the difference between the two embeds the exchange rate — if the dollar rises, BTC/BRL rises even with BTC/USD flat. The market trades non-stop, weekends included, so Sunday's move is already in the price when the stock exchange opens on Monday.",
   "expert": "Issuance follows a decreasing curve: the block reward halves every 210,000 blocks — the halving — up to the 21 million cap. Correlation with risk assets has risen since 2020, which weakens the uncorrelated store-of-value thesis and makes the asset behave more like a leveraged position on risk appetite. Regulated exposure through a spot ETF shifts custody risk to the issuer and removes the lost-key problem, in exchange for the management fee and the end of self-custody — the holder owns the price, not the coin, and does not transact on the network. Under self-custody the risk changes shape: there is no transaction reversal and no seed-phrase recovery, and security becomes the holder's own operational problem."
  }
 },
 {
  "k": "blockchain",
  "t": "Blockchain (o livro-caixa público)",
  "te": "Blockchain (the public ledger)",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "É o \"livro-caixa\" público de uma criptomoeda: todas as transações ficam registradas ali. A lista é copiada em milhares de computadores ao mesmo tempo, então ninguém precisa confiar em um dono único do registro.",
   "medio": "Blockchain é o registro público e compartilhado das transações de uma criptomoeda, mantido em cópia por milhares de computadores independentes. Os lançamentos são agrupados em blocos, e cada bloco carrega uma assinatura do bloco anterior, formando uma corrente. Por isso mudar um registro antigo obrigaria a refazer todos os blocos posteriores e convencer mais da metade da rede a aceitar a versão nova. A contrapartida é que tudo é público e definitivo: transferência enviada para endereço errado não tem estorno.",
   "expert": "Cada bloco guarda o hash do bloco anterior e a raiz de uma árvore de Merkle com as transações, então alterar qualquer transação muda o hash do bloco e quebra o encadeamento de todos os seguintes. A regra de consenso escolhe a cadeia com maior trabalho acumulado (prova de trabalho) ou maior peso de participação (prova de participação), e é isso que torna a reescrita cara em vez de impossível. A confirmação é probabilística: quanto mais blocos vieram depois do seu, menor a chance de uma reorganização desfazê-lo — daí a prática de esperar um número de confirmações antes de considerar o pagamento final. Registro público não é registro anônimo: os endereços são pseudônimos, e a análise de grafo liga endereços a identidades assim que um ponto de entrada ou de saída é conhecido."
  },
  "en": {
   "iniciante": "It is the public ledger of a cryptocurrency: every transaction is recorded there. The list is copied across thousands of computers at once, so nobody has to trust a single owner of the records.",
   "medio": "A blockchain is the public, shared record of a cryptocurrency's transactions, held in copy by thousands of independent computers. Entries are grouped into blocks, and each block carries a signature of the one before it, forming a chain. That is why changing an old entry would mean redoing every block that came after it and getting more than half the network to accept the new version. The flip side is that everything is public and final: a transfer sent to the wrong address has no chargeback.",
   "expert": "Each block stores the hash of the previous block and the root of a Merkle tree of its transactions, so altering any transaction changes the block hash and breaks the link for every block after it. The consensus rule picks the chain with the most accumulated work (proof of work) or the greatest staked weight (proof of stake), and that is what makes rewriting expensive rather than impossible. Confirmation is probabilistic: the more blocks stacked on top of yours, the smaller the chance a reorganisation undoes it — hence the practice of waiting a set number of confirmations before treating a payment as final. A public ledger is not an anonymous one: addresses are pseudonyms, and graph analysis links them to identities as soon as one on-ramp or off-ramp is known."
  }
 },
 {
  "k": "bolsa",
  "t": "Bolsa de valores",
  "te": "Stock exchange",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "É o mercado organizado onde as pessoas compram e vendem ações e outros papéis. No Brasil é a B3; nos Estados Unidos, a NYSE e a Nasdaq.",
   "medio": "A bolsa é o ambiente que reúne compradores e vendedores de ações e outros ativos com regras, horário definido e preço público. No Brasil é a B3; nos EUA, NYSE e Nasdaq. Você não manda ordem direto para ela: a ordem vai para a corretora, que a encaminha ao sistema da bolsa, e o negócio fica registrado no seu CPF. Essa custódia em nome próprio é o que separa o seu patrimônio do da corretora — se ela quebrar, os ativos continuam seus.",
   "expert": "A bolsa opera um livro central de ofertas que casa ordens por prioridade de preço e depois de tempo, com leilão de abertura e de fechamento formando preço único nas pontas do pregão. No Brasil, a B3 acumula bolsa, câmara de compensação e depositária central, então liquidação e custódia ficam na mesma infraestrutura, com o ativo registrado no CPF do investidor final. A liquidação de ações no mercado à vista ocorre em D+2, o que explica por que o dinheiro da venda não aparece na conta no mesmo dia. Nos EUA o mercado é fragmentado entre várias bolsas e plataformas alternativas, com o roteamento definido por regra de melhor execução — modelo diferente do livro único brasileiro."
  },
  "en": {
   "iniciante": "A stock exchange is the organised market where people buy and sell shares and other securities. In Brazil it is B3; in the United States, the NYSE and Nasdaq.",
   "medio": "An exchange brings buyers and sellers of shares and other assets together under set rules, set hours and a public price. In Brazil that is B3; in the US, the NYSE and Nasdaq. You do not send orders straight to the exchange: the order goes to your broker, the broker routes it to the exchange's system, and the trade is registered under your CPF (the Brazilian taxpayer ID). Holding the assets in your own name is what separates your money from the broker's — if the broker fails, the assets are still yours.",
   "expert": "An exchange runs a central limit order book that matches orders by price priority and then by time, with opening and closing auctions forming a single price at each end of the session. In Brazil, B3 combines the exchange, the clearing house and the central depository, so settlement and custody sit in the same infrastructure, with assets registered under the end investor's CPF. Cash equity trades settle on T+2, which is why the proceeds of a sale do not show up in the account the same day. The US market is fragmented across several exchanges and alternative venues, with routing governed by a best-execution rule — a different model from Brazil's single book."
  }
 },
 {
  "k": "cambio",
  "t": "Câmbio",
  "te": "Exchange rate",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "Câmbio é o preço de uma moeda em relação a outra — quanto custa um dólar em reais, por exemplo. Ele muda o dia inteiro, como o preço de qualquer coisa negociada.",
   "medio": "Câmbio é a taxa de conversão entre duas moedas, e ela oscila durante o pregão como qualquer preço. Se você tem investimento em dólar, o câmbio passa a fazer parte do seu resultado: mesmo com a ação parada lá fora, o dólar subindo aumenta o valor em reais. Isso funciona nos dois sentidos — a ação pode subir 5% e o resultado em reais ficar negativo se o dólar cair mais que isso. Por isso a moeda costuma aparecer na carteira como amortecedor: ela tende a subir quando o mercado local vai mal.",
   "expert": "O retorno de um ativo externo se decompõe em retorno local, variação cambial e o termo cruzado entre os dois — ignorar o cruzado distorce a atribuição quando as duas pernas se movem bastante. Hedge cambial não é grátis: o custo é o diferencial de juros entre as moedas, capturado pelo cupom cambial, e no Brasil esse diferencial é historicamente alto, o que torna a proteção cara em prazos longos. A relação vem da paridade coberta de juros, e desvios dela aparecem como base, sensível a restrição de balanço dos bancos e a estresse de liquidez. Exposição cambial sem hedge tende a diversificar a carteira do investidor brasileiro porque a moeda se valoriza em cenários de aversão a risco, mas o mesmo mecanismo concentra a perda quando o real se aprecia em ciclo favorável."
  },
  "en": {
   "iniciante": "The exchange rate is the price of one currency in another — how many reais a dollar costs, for instance. It moves all day long, like the price of anything that trades.",
   "medio": "The exchange rate is the conversion rate between two currencies, and it moves through the session like any other price. If you hold dollar assets, the exchange rate becomes part of your result: even with the stock flat abroad, a rising dollar lifts the value in reais. It cuts both ways — the stock can gain 5% and your result in reais still be negative if the dollar falls more than that. That is why currency often shows up in a portfolio as a shock absorber: it tends to rise when the local market does badly.",
   "expert": "The return on a foreign asset breaks down into the local return, the currency move and the cross term between them — ignoring the cross term distorts attribution when both legs move sharply. Currency hedging is not free: it costs the interest rate differential between the two currencies, captured by the cupom cambial (Brazil's onshore dollar-linked rate), and that differential has historically been wide here, which makes the protection expensive over long horizons. The relationship comes from covered interest parity, and deviations from it show up as a basis that is sensitive to bank balance-sheet constraints and to liquidity stress. Unhedged currency exposure tends to diversify a Brazilian portfolio because the dollar appreciates in risk-off episodes, but the same mechanism concentrates the loss when the real strengthens in a favourable cycle."
  }
 },
 {
  "k": "capacidade-risco",
  "t": "Capacidade de correr risco",
  "te": "Risk capacity",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É quanto risco a sua vida financeira aguenta de verdade: em quanto tempo você vai precisar do dinheiro, se tem reserva de emergência, se a renda é estável e se pode precisar sacar de repente. É diferente de quanto risco você tolera emocionalmente.",
   "medio": "Capacidade de risco é a metade objetiva do perfil de investidor: prazo até usar o dinheiro, existência de reserva de emergência, estabilidade da renda e probabilidade de um saque inesperado. Ela é medida em fatos, não em disposição — e, quando as duas metades divergem, é a capacidade que manda. Coragem não paga conta: dinheiro que será usado em um ano, aplicado em bolsa, pode simplesmente valer menos no dia em que for preciso, por mais tranquilo que seja o dono. Ela também muda com a vida: emprego novo, filho, financiamento e aposentadoria reposicionam o número sem aviso.",
   "expert": "Capacidade é função do horizonte, do capital humano — estabilidade da renda e correlação dela com o mercado —, da razão entre passivo e patrimônio e da necessidade de liquidez. Renda estável funciona como uma posição implícita em renda fixa no balanço pessoal e por isso aumenta a capacidade de risco do portfólio financeiro; renda cíclica, que cai junto com o mercado, faz o oposto. A alavancagem entra pelo lado do passivo: dívida com prazo mais curto que o do ativo cria risco de refinanciamento e força venda no pior momento. O que limita a capacidade não é a perda média, é a perda no cenário ruim combinada com a necessidade de caixa nesse mesmo cenário — e os dois eventos costumam ser correlacionados."
  },
  "en": {
   "iniciante": "This is how much risk your financial life can actually absorb: how soon you will need the money, whether you have an emergency fund, how steady your income is, and whether you might have to withdraw suddenly. It is not the same as how much risk you can stomach.",
   "medio": "Risk capacity is the objective half of an investor profile: time until the money is needed, whether an emergency fund exists, how stable the income is, and the odds of an unplanned withdrawal. It is measured in facts, not in willingness — and when the two halves disagree, capacity is the one that governs. Nerve does not pay bills: money that will be spent within a year, held in equities, can simply be worth less on the day it is needed, however calm the owner is. Capacity also moves with life: a new job, a child, a mortgage or retirement reset the number without warning.",
   "expert": "Capacity is a function of the horizon, of human capital — how stable the income is and how correlated it is with the market —, of the ratio of liabilities to net worth, and of liquidity needs. Stable income works as an implicit fixed income position on the personal balance sheet and therefore raises the risk capacity of the financial portfolio; cyclical income, which falls alongside the market, does the opposite. Leverage enters through the liability side: debt with a shorter maturity than the assets creates refinancing risk and forces a sale at the worst moment. What limits capacity is not the average loss but the loss in the bad scenario combined with the need for cash in that same scenario — and those two events are usually correlated."
  }
 },
 {
  "k": "carnc-leao",
  "t": "Carnê-leão",
  "te": "Carnê-leão (monthly self-assessed income tax)",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "É um imposto que a pessoa física paga mês a mês sobre certos rendimentos recebidos do exterior, como aluguéis e dividendos. Ninguém desconta na fonte: você mesmo calcula e paga.",
   "medio": "Carnê-leão é o recolhimento mensal de imposto de renda feito pela própria pessoa física sobre rendimentos que não tiveram retenção na fonte, entre eles aluguéis e dividendos recebidos do exterior. O cálculo é feito no programa disponível no site da Receita Federal, que gera o DARF. O vencimento é o último dia útil do mês seguinte ao recebimento, e o atraso gera multa e juros. Dividendos americanos que já sofreram retenção lá fora podem ter compensação aqui conforme a regra vigente, o que evita pagar duas vezes sobre o mesmo valor.",
   "expert": "O carnê-leão incide sobre rendimento recebido de pessoa física ou de fonte no exterior sem retenção na fonte, é apurado pela tabela progressiva mensal e recolhido por DARF até o último dia útil do mês seguinte ao recebimento; o valor apurado depois entra no ajuste anual do IRPF. A Lei 14.754/2023 mudou o desenho para aplicações financeiras no exterior: esses rendimentos passaram a tributação anual definida na declaração, com alíquota própria, o que retirou boa parte desses casos do recolhimento mensal. A compensação do imposto retido lá fora depende de acordo ou reciprocidade com o país de origem e é limitada ao imposto devido aqui sobre o mesmo rendimento. As regras nesse tema mudaram de ano para ano — confirme o tratamento do ano-base com um contador antes de recolher."
  },
  "en": {
   "iniciante": "Carnê-leão is a monthly income tax an individual pays on certain income received from abroad, such as rent and dividends. Nothing is withheld for you: you work it out and pay it yourself.",
   "medio": "Carnê-leão is the monthly income tax an individual computes and pays on income that had no tax withheld at source, including rent and dividends received from abroad. The calculation is done in the program on the Receita Federal website, which issues the DARF payment slip. It falls due on the last business day of the month following receipt, and paying late adds a fine and interest. US dividends already withheld abroad may be offset here under the rules in force, which avoids paying twice on the same amount.",
   "expert": "Carnê-leão applies to income received from another individual or from a foreign source with no withholding at source, is computed on the monthly progressive table and paid by DARF until the last business day of the month after receipt; the amount is then carried into the annual IRPF return. Law 14,754/2023 redesigned the treatment of financial investments held abroad: that income moved to annual taxation settled in the return, at its own rate, which took most of those cases out of the monthly payment. Offsetting tax withheld abroad depends on a treaty or reciprocity with the source country and is capped at the Brazilian tax due on the same income. The rules here have changed from year to year — confirm the treatment for the relevant tax year with an accountant before paying."
  }
 },
 {
  "k": "custodia-cripto",
  "t": "Carteira de cripto",
  "te": "Crypto wallet",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "É onde suas criptomoedas ficam guardadas. Pode ser na corretora, que é mais fácil, ou numa carteira própria, em que só você tem a chave — e a responsabilidade.",
   "medio": "A carteira de cripto guarda as chaves que dão acesso às suas moedas; a moeda em si vive na blockchain. Na corretora, quem guarda a chave é ela: é prático, existe recuperação de senha, e você depende da solidez da empresa. Na carteira própria vale o \"not your keys, not your coins\": ninguém bloqueia nem some com o saldo, mas perder a frase de recuperação significa perder tudo, sem atendimento para recorrer. Carteira de hardware mantém a chave offline e reduz o risco de invasão do computador, sem eliminar o risco de perder a frase.",
   "expert": "O que a carteira guarda é a chave privada; o saldo está na blockchain e pertence a quem consegue assinar com essa chave. Carteiras determinísticas derivam todas as chaves de uma semente representada pela frase de recuperação, então a frase é o ativo — copiá-la é copiar a carteira inteira, e perdê-la é irreversível porque não existe autoridade capaz de reemitir. A custódia em corretora troca esse risco pelo risco de contraparte: o saldo é um registro no banco de dados dela e, em falência, vira disputa de credor. A carteira de hardware mantém a chave em elemento seguro e assina a transação sem expor a chave ao computador, o que protege contra malware mas não contra assinar uma transação maliciosa apresentada como legítima. Esquemas de multiassinatura e divisão da semente removem o ponto único de falha, ao custo de um procedimento de recuperação mais complexo."
  },
  "en": {
   "iniciante": "This is where your cryptocurrencies are kept. It can be at an exchange, which is easier, or in your own wallet, where only you hold the key — and the responsibility.",
   "medio": "A crypto wallet holds the keys that unlock your coins; the coins themselves live on the blockchain. At an exchange, the exchange holds the key: it is convenient, password recovery exists, and you depend on the company staying solvent. In your own wallet the phrase \"not your keys, not your coins\" applies: nobody can freeze or take the balance, but losing the recovery phrase means losing everything, with no support desk to appeal to. A hardware wallet keeps the key offline and cuts the risk of a compromised computer, without removing the risk of losing the phrase.",
   "expert": "What a wallet stores is the private key; the balance sits on the blockchain and belongs to whoever can sign with that key. Deterministic wallets derive every key from a seed represented by the recovery phrase, so the phrase is the asset — copying it copies the whole wallet, and losing it is irreversible because no authority can reissue it. Exchange custody swaps that for counterparty risk: the balance is a row in the exchange's database and, in bankruptcy, becomes a creditor claim. A hardware wallet keeps the key in a secure element and signs transactions without exposing it to the computer, which defends against malware but not against signing a malicious transaction presented as legitimate. Multisignature schemes and seed splitting remove the single point of failure, at the cost of a more complex recovery procedure."
  }
 },
 {
  "k": "cdb",
  "t": "CDB",
  "te": "CDB",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "CDB é um empréstimo que você faz a um banco. Ele devolve o dinheiro com juros no prazo combinado. Se o banco quebrar, o FGC cobre até um limite por CPF.",
   "medio": "No CDB você empresta ao banco e recebe de volta com juros — pode ser pós-fixado em percentual do CDI, prefixado ou atrelado ao IPCA. Tem proteção do FGC até R$ 250 mil por CPF e por instituição, com limite global de R$ 1 milhão a cada quatro anos. Bancos menores pagam taxas maiores justamente porque o risco é maior, e é por isso que o limite do FGC costuma ser a linha que o investidor observa. A liquidez varia: alguns têm resgate diário, outros só no vencimento, e sair antes de um CDB sem liquidez depende de achar quem compre, normalmente com deságio.",
   "expert": "O CDB paga IR na fonte pela tabela regressiva, que parte de 22,5% e cai até 15% conforme o prazo, e há IOF sobre o rendimento em resgates antes de trinta dias. Por isso a comparação precisa ser feita em base líquida equivalente: um CDB de 110% do CDI tributado a 15% pode render menos que uma LCI de 90% do CDI isenta, dependendo do prazo. A cobertura do FGC alcança principal e juros até R$ 250 mil por CPF e por instituição, com teto global de R$ 1 milhão a cada quatro anos, e o pagamento não é imediato — há um processo, e o rendimento para na data da liquidação do banco. O prêmio pago por bancos menores é spread de crédito: acima do limite do FGC ele deixa de ser gratuito e vira risco de contraparte puro."
  },
  "en": {
   "iniciante": "A CDB is a loan you make to a bank. The bank pays it back with interest on the agreed date. If the bank fails, the FGC deposit guarantee covers you up to a limit per taxpayer ID.",
   "medio": "With a CDB you lend to a bank and get paid interest — it can float at a percentage of the CDI, be fixed rate, or be linked to IPCA inflation. It is covered by the FGC deposit guarantee up to R$ 250,000 per CPF per institution, with a global ceiling of R$ 1 million every four years. Smaller banks pay higher rates precisely because their risk is higher, which is why the FGC limit is the line investors tend to watch. Liquidity varies: some allow daily redemption, others only at maturity, and getting out early of one without liquidity depends on finding a buyer, normally at a discount.",
   "expert": "A CDB is taxed at source on the regressive table, which starts at 22.5% and falls to 15% with holding period, and IOF applies to the yield on redemptions inside thirty days. That is why comparisons have to be made on an equivalent net basis: a CDB paying 110% of the CDI taxed at 15% can yield less than an LCI paying 90% of the CDI tax-free, depending on the term. FGC coverage reaches principal and interest up to R$ 250,000 per CPF per institution, with a R$ 1 million global ceiling every four years, and payment is not immediate — there is a process, and the yield stops on the date the bank is wound up. The premium smaller banks pay is a credit spread: above the FGC limit it stops being free and becomes pure counterparty risk."
  }
 },
 {
  "k": "cdi",
  "t": "CDI",
  "te": "CDI",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "É a taxa de juros que os bancos cobram uns dos outros em empréstimos de um dia. Ela virou a régua da renda fixa: \"rende 100% do CDI\" quer dizer acompanhar essa taxa.",
   "medio": "O CDI é a taxa média dos empréstimos de um dia entre bancos e funciona como régua da renda fixa brasileira. Ele anda quase colado na Selic, alguns décimos abaixo, então quando a Selic sobe ou cai o CDI vai junto quase na hora. Cuidado com a leitura do percentual: um CDB que paga 110% do CDI rende 10% a mais que a régua, e não 110% ao ano. E, por ser pós-fixado, o rendimento futuro não está travado — ele acompanha a Selic para cima e para baixo durante todo o prazo.",
   "expert": "Formalmente é a taxa DI de um dia, apurada e divulgada pela B3 a partir das operações de depósito interfinanceiro entre instituições, em base anual de 252 dias úteis. Cumpre dois papéis: benchmark de caixa e taxa de desconto para produtos pós-fixados, cujo fluxo é indexado ao acúmulo diário do índice. O pequeno spread negativo frente à Selic existe porque o DI é interbancário, com risco de contraparte mitigado e volume concentrado, enquanto a Selic meta é instrumento de política — em períodos de liquidez abundante o desconto se alarga. Um papel a 110% do CDI não tem duration de taxa relevante, já que se reprecifica diariamente; o que sobra é risco de crédito e de liquidez, não de marcação."
  },
  "en": {
   "iniciante": "The CDI is the interest rate banks charge one another on overnight loans. It became the yardstick for Brazilian fixed income: \"pays 100% of the CDI\" means tracking that rate.",
   "medio": "The CDI is the average rate on overnight lending between banks and works as the yardstick for Brazilian fixed income. It tracks the Selic policy rate closely, a few tenths below it, so when the Selic moves the CDI follows almost immediately. Read the percentage carefully: a CDB paying 110% of the CDI earns 10% more than the yardstick, not 110% a year. And because it floats, the future yield is not locked in — it follows the Selic up and down for the whole term.",
   "expert": "Formally it is the one-day DI rate, computed and published by B3 from interbank deposit transactions between financial institutions, annualised on a 252 business-day basis. It plays two roles: cash benchmark, and discount rate for floating-rate products whose cash flows are indexed to the daily accumulation of the index. The small negative spread to the Selic exists because the DI is an interbank rate with mitigated counterparty risk and concentrated volume, while the Selic target is a policy instrument — in periods of abundant liquidity the gap widens. A note paying 110% of the CDI has essentially no rate duration since it reprices daily; what remains is credit and liquidity risk, not mark-to-market risk."
  }
 },
 {
  "k": "circuit-breaker",
  "t": "Circuit breaker",
  "te": "Circuit breaker",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "É a pausa automática da bolsa quando o índice cai demais. Na B3, uma queda de 10% para o pregão por 30 minutos. Serve para dar um tempo antes que o pânico se alimente sozinho.",
   "medio": "O circuit breaker interrompe o pregão quando o índice cai além de um limite: na B3, queda de 10% para tudo por 30 minutos. A pausa serve para esfriar o pânico, deixar a informação circular e dar a quem tem ordem aberta a chance de reavaliar. Foi acionado poucas vezes na história da bolsa brasileira, quase sempre em crises globais — em março de 2020 disparou várias vezes no mesmo mês. Enquanto a pausa vale não há formação de preço: as ordens ficam paradas e não é possível vender, o que costuma pegar de surpresa quem tenta sair no meio da queda.",
   "expert": "O mecanismo é escalonado por gatilhos sobre a variação do Ibovespa em relação ao fechamento anterior: o primeiro, em queda de 10%, interrompe o pregão por 30 minutos; os níveis seguintes ampliam a parada e, no gatilho mais severo, a B3 decide sobre a reabertura no dia. A retomada acontece por leilão, o que concentra ordens e costuma produzir um salto de preço na reabertura em vez de retomada contínua. O desenho pressupõe que a queda é de pânico e não de informação: se for informação, a pausa apenas adia a reprecificação e pode gerar efeito ímã, com ordens correndo para a saída à medida que o índice se aproxima do gatilho. Derivativos e ações do mesmo emissor negociadas em outra praça não param junto, então durante a interrupção o hedge fica descasado e o preço de referência continua se formando fora da B3."
  },
  "en": {
   "iniciante": "It is the automatic pause in trading when the index falls too far. On B3, a 10% drop halts the session for 30 minutes. The point is to buy time before panic feeds on itself.",
   "medio": "A circuit breaker halts trading when the index falls past a threshold: on B3, a 10% drop stops everything for 30 minutes. The pause is there to cool panic, let information circulate and give anyone with a live order a chance to reconsider. It has been triggered only a handful of times in the Brazilian market's history, almost always in global crises — in March 2020 it fired several times in the same month. While the halt is on there is no price formation: orders sit still and you cannot sell, which tends to catch out anyone trying to get out mid-fall.",
   "expert": "The mechanism is tiered on the Ibovespa's move against the previous close: the first trigger, a 10% fall, halts trading for 30 minutes; the next tiers extend the halt, and at the most severe one B3 decides whether to reopen that day. Trading resumes through an auction, which pools orders and usually produces a price jump at the reopen rather than a continuous restart. The design assumes the fall is panic rather than information: if it is information, the pause only defers repricing and can create a magnet effect, with orders rushing for the exit as the index approaches the trigger. Derivatives and the same issuer's shares traded in another venue do not halt alongside, so during the interruption hedges sit mismatched and the reference price keeps forming outside B3."
  }
 },
 {
  "k": "come-cotas",
  "t": "Come-cotas",
  "te": "Come-cotas",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "Duas vezes por ano, em maio e em novembro, a Receita cobra imposto de renda adiantado dentro de alguns fundos. Como não há dinheiro separado para isso, ela desconta em cotas: você acorda com menos cotas do que tinha. É o come-cotas, e ele acontece mesmo que você não tenha resgatado nada.",
   "medio": "Atinge fundos de renda fixa, cambiais e multimercados; fundos de ações e ETFs de ações ficam de fora, e é por isso que o juro composto deles trabalha sem interrupção. A cobrança cai em maio e em novembro e aparece no extrato como queda na quantidade de cotas, não como saída de dinheiro. Quem compara fundos de categorias diferentes pelo retorno bruto acaba superestimando os que sofrem a mordida semestral. Em resgates curtos o efeito é pequeno; em prazos longos ele se acumula.",
   "expert": "A antecipação semestral usa a alíquota mínima da tabela: <b>15%</b> para fundos classificados como longo prazo e <b>20%</b> para curto prazo, sobre o rendimento do semestre. No resgate, cobra-se o complemento até a alíquota final da tabela regressiva, de modo que o total pago não aumenta — o que muda é o momento. O custo real é o arrasto fiscal: capital que sairia só no fim deixa de compor desde já, o que em cenários típicos reduz o valor composto em cerca de <b>0,3 a 0,6 ponto percentual ao ano</b>. Fundos de ações e ETFs de ações estão fora do regime, o que explica parte da diferença de resultado em horizontes longos."
  },
  "en": {
   "iniciante": "Twice a year, in May and November, Brazil's tax authority collects income tax in advance inside certain funds. Since there is no cash set aside for it, the tax is taken in units: you simply end up holding fewer units than before. This is come-cotas, and it happens even if you never redeemed anything.",
   "medio": "It hits fixed income, currency and multi-strategy funds. Equity funds and equity ETFs are exempt, so their compounding runs uninterrupted. The charge lands in May and November and shows up as a drop in your unit count rather than a cash withdrawal, which makes it easy to miss. Comparing funds from different categories on gross returns flatters the ones that pay come-cotas. Over short holding periods the effect is small; over long ones it stacks up.",
   "expert": "The semi-annual withholding applies the lowest rate on the table — <b>15%</b> for funds classified as long term, <b>20%</b> for short term — on the period's gain. At redemption the difference up to the final regressive rate is charged, so the total tax paid does not rise; only its timing changes. The real cost is fiscal drag: capital that would otherwise have left at the end stops compounding now, which in typical scenarios trims compounded value by roughly <b>0.3 to 0.6 percentage points a year</b>. Equity funds and equity ETFs sit outside the regime, which accounts for part of their edge over long horizons."
  }
 },
 {
  "k": "commodity",
  "t": "Commodities",
  "te": "Commodities",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "Commodities são produtos básicos negociados no mundo inteiro pelo mesmo preço de referência: petróleo, minério de ferro, soja, ouro, café. Pouco importa quem produziu — uma saca de soja é praticamente igual à outra, então quem manda é a cotação internacional.",
   "medio": "Boa parte do Ibovespa depende delas: Vale, Petrobras, JBS e Suzano pesam muito no índice e têm resultado colado no preço internacional do minério, do petróleo e das proteínas. Por isso a bolsa brasileira sobe e cai junto com essas cotações e junto com a economia chinesa, que é a maior compradora. Quando o índice se mexe e o noticiário local não explica, o preço da commodity costuma explicar. Como tudo é cotado em dólar, o câmbio entra na conta junto com o preço.",
   "expert": "Preço de commodity é preço de equilíbrio global, com oferta rígida no curto prazo — mina e poço não ligam e desligam — e demanda cíclica, o que produz ciclos longos e amplitude alta. Para a carteira brasileira isso vira fator de risco comum: as grandes exportadoras respondem ao mesmo choque, então ter várias delas diversifica menos do que o número de tickers sugere. A cotação em dólar cria um amortecedor parcial para o exportador, que recebe em moeda forte e gasta em real, de forma que queda de preço internacional e desvalorização cambial podem se compensar. A demanda chinesa é o principal termômetro do lado comprador de minério e grãos, e o ciclo de investimento em capacidade é o que governa o lado vendedor com anos de defasagem."
  },
  "en": {
   "iniciante": "Commodities are raw goods traded worldwide at the same reference price: oil, iron ore, soybeans, gold, coffee. Who produced them barely matters — one bag of soybeans is much like another, so the international quote sets the price.",
   "medio": "A large slice of the Ibovespa runs on them: Vale, Petrobras, JBS and Suzano carry heavy index weights and their earnings track global prices for ore, oil and protein. That is why the Brazilian market rises and falls alongside those quotes, and alongside the Chinese economy, its biggest buyer. When the index moves and local news explains nothing, the commodity price usually does. Everything is quoted in dollars, so the exchange rate enters the calculation together with the price.",
   "expert": "Commodity prices clear globally, with supply that is rigid in the short run — mines and wells do not switch on and off — and cyclical demand, producing long cycles and wide swings. For a Brazilian portfolio this becomes a shared risk factor: the big exporters all respond to the same shock, so holding several of them diversifies less than the ticker count implies. Dollar pricing gives exporters a partial buffer, earning hard currency against local-currency costs, so a falling global price and a weakening real can offset each other. Chinese demand is the main gauge on the buy side for ore and grains, while the multi-year capacity investment cycle governs the supply side with a long lag."
  }
 },
 {
  "k": "etf-nome",
  "t": "Como ler o nome de um ETF",
  "te": "How to read an ETF's name",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "O nome de um ETF quase sempre diz duas coisas: quem administra o fundo e o que ele acompanha. Em <b>iShares Core S&P 500</b>, iShares é a marca da BlackRock e o S&P 500 é o índice copiado. Comprando uma cota, você leva um pedacinho de tudo que está nesse índice.",
   "medio": "As palavras do meio classificam a estratégia: <b>Core</b> é a linha principal e mais barata da casa, <b>Total</b> tenta cobrir o mercado inteiro, <b>High Dividend</b> filtra pagadoras de dividendos, <b>Growth</b> e <b>Value</b> separam crescimento de valor, e <b>Hedged</b> indica proteção contra a variação do câmbio. <b>UCITS</b> marca um fundo constituído sob o regime europeu, com regras próprias de composição e transparência. Dois ETFs de nomes parecidos podem seguir índices diferentes, então o nome serve para triagem e quem confirma é a lâmina do fundo.",
   "expert": "O nome segue convenção comercial, não norma: gestora, índice de referência, filtro de estratégia e sufixos de estrutura. <b>Acc</b> (accumulating) reinveste os proventos dentro do fundo e <b>Dist</b> (distributing) paga ao cotista — diferença que muda o fluxo de caixa e o momento em que o imposto aparece. <b>Hedged</b> sinaliza hedge cambial, cujo custo embute o diferencial de juros entre as moedas e se manifesta como retorno menor que o do índice sem hedge. <b>UCITS</b> identifica registro sob o regime europeu; o tratamento tributário de um ETF estrangeiro depende do domicílio do fundo e das regras do país onde o investidor é residente, e para o residente brasileiro quem define é a legislação da Receita Federal sobre aplicações no exterior. O que descreve o produto de fato é o índice replicado, o método de réplica (física ou sintética), o custo total e o tracking difference — não o nome."
  },
  "en": {
   "iniciante": "An ETF's name almost always tells you two things: who runs the fund and what it tracks. In <b>iShares Core S&P 500</b>, iShares is BlackRock's brand and the S&P 500 is the index being copied. Buy one share and you own a sliver of everything in that index.",
   "medio": "The words in the middle classify the strategy: <b>Core</b> is the provider's main, cheapest line, <b>Total</b> aims at the whole market, <b>High Dividend</b> screens for dividend payers, <b>Growth</b> and <b>Value</b> split the style, and <b>Hedged</b> means currency exposure is hedged away. <b>UCITS</b> marks a fund set up under the European regime, with its own composition and disclosure rules. Two ETFs with near-identical names can track different indexes, so the name is a first filter and the fact sheet is what confirms it.",
   "expert": "The naming is a commercial convention, not a standard: issuer, benchmark, strategy screen, and structural suffixes. <b>Acc</b> (accumulating) reinvests income inside the fund while <b>Dist</b> (distributing) pays it out, changing both cash flow and when tax arises. <b>Hedged</b> flags a currency hedge whose cost embeds the interest rate differential between the two currencies and shows up as a lower return than the unhedged index. <b>UCITS</b> identifies registration under the European regime; the tax treatment of a foreign ETF depends on the fund's domicile and on the rules of the investor's country of residence, and for a Brazilian resident that means the Receita Federal rules on foreign holdings. What actually describes the product is the index tracked, the replication method (physical or synthetic), total cost and tracking difference — not the name."
  }
 },
 {
  "k": "divisao-carteira",
  "t": "Como seu dinheiro está dividido",
  "te": "How your money is split",
  "c": "Carteira",
  "ce": "Portfolio",
  "pt": {
   "iniciante": "A barra reparte a carteira em grupos, e cada cor é um grupo: <b>Ações Brasil</b>, <b>Fundos imobiliários</b>, <b>ETFs BR e BDRs</b>, <b>Ações EUA</b>, <b>ETFs e REITs EUA</b>, <b>Renda fixa</b>, <b>Fundos e previdência</b>, <b>Dinheiro em conta</b> e <b>Cripto</b>. Numa olhada você vê onde está a maior parte do seu dinheiro, sem precisar somar nada.",
   "medio": "Cada faixa é um grupo. <b>Ações Brasil</b> são empresas da B3 compradas uma a uma; <b>Fundos imobiliários</b> são os FIIs, que rendem aluguel de imóveis e costumam pagar todo mês; <b>ETFs BR e BDRs</b> reúnem cestas negociadas na B3 e recibos de ações estrangeiras listados aqui; <b>Ações EUA</b> são empresas americanas compradas uma a uma, com o resultado preso àquela empresa; <b>ETFs e REITs EUA</b> são cestas americanas e imóveis lá fora, com cor vizinha da anterior porque saem da mesma conta, embora o risco seja outro — uma empresa pode quebrar, uma cesta inteira não; <b>Renda fixa</b> junta CDB, LCI, LCA, Tesouro e títulos de dívida no exterior, em que você empresta e recebe juros; <b>Fundos e previdência</b> são fundos de investimento e planos PGBL e VGBL, com um gestor decidindo por você; <b>Dinheiro em conta</b> é o saldo parado ou em conta remunerada, aqui e lá fora, que não é investimento mas é patrimônio e entra no total; <b>Cripto</b> é bitcoin e as demais moedas digitais. Os grupos vêm do tipo escolhido no cadastro de cada ativo, e um ativo na faixa errada se ajusta abrindo o ativo na Carteira e corrigindo o tipo.",
   "expert": "A barra agrega por classe, e a agregação esconde o que mais pesa em risco: a diferença entre posição individual e cesta. Duas carteiras com 40% em <b>Ações Brasil</b> podem ter perfis opostos — uma com trinta papéis, outra com dois — porque risco idiossincrático só some com número efetivo de posições, não com o tamanho da fatia. O mesmo contraste separa <b>Ações EUA</b> de <b>ETFs e REITs EUA</b>: mesma conta, mesma moeda, natureza de risco diferente. <b>Dinheiro em conta</b> entra no denominador de todos os percentuais, então ignorar o caixa distorce qualquer leitura de alocação, e <b>Fundos e previdência</b> podem carregar exposição que já aparece em outra faixa, o que subestima a concentração real. Como as faixas derivam do tipo cadastrado, um tipo errado propaga erro para todos os percentuais da tela."
  },
  "en": {
   "iniciante": "The bar splits your portfolio into groups, one colour each: <b>Brazilian stocks</b>, <b>real estate funds</b>, <b>Brazilian ETFs and BDRs</b>, <b>US stocks</b>, <b>US ETFs and REITs</b>, <b>fixed income</b>, <b>funds and pension plans</b>, <b>cash</b> and <b>crypto</b>. One glance shows where most of your money sits, with no adding up required.",
   "medio": "Each band is a group. <b>Brazilian stocks</b> are B3-listed companies bought one by one; <b>real estate funds</b> are FIIs, which pass through rent and usually pay monthly; <b>Brazilian ETFs and BDRs</b> combine baskets traded on B3 with receipts for foreign shares listed locally; <b>US stocks</b> are American companies bought individually, where the outcome is tied to that one company; <b>US ETFs and REITs</b> are American baskets and property abroad, coloured next to the previous group because the money leaves the same account, though the risk differs — a single company can fail, a whole basket cannot; <b>fixed income</b> covers CDB, LCI, LCA, Tesouro Direto and foreign bonds, where you lend and collect interest; <b>funds and pension plans</b> are investment funds plus PGBL and VGBL plans, where a manager decides for you; <b>cash</b> is idle or interest-bearing balances at home and abroad, not an investment but still net worth and part of the total; <b>crypto</b> is bitcoin and the other digital currencies. Groups come from the type you picked when registering each asset, and anything in the wrong band is fixed by opening the asset in Portfolio and changing its type.",
   "expert": "The bar aggregates by asset class, and aggregation hides what matters most for risk: the gap between a single position and a basket. Two portfolios with 40% in <b>Brazilian stocks</b> can be opposites — one holding thirty names, the other two — because idiosyncratic risk disappears through the effective number of positions, not the size of the slice. The same contrast separates <b>US stocks</b> from <b>US ETFs and REITs</b>: same account, same currency, different kind of risk. <b>Cash</b> sits in the denominator of every percentage, so ignoring it distorts any reading of allocation, and <b>funds and pension plans</b> may carry exposure that already appears in another band, understating true concentration. Since the bands derive from the registered asset type, one wrong type propagates through every percentage on the screen."
  }
 },
 {
  "k": "bid-ask",
  "t": "Compra, venda e spread (bid/ask)",
  "te": "Bid, ask and spread",
  "c": "Cotações",
  "ce": "Quotes",
  "pt": {
   "iniciante": "Todo ativo tem dois preços ao mesmo tempo: o <b>bid</b>, que é o maior valor que alguém está disposto a pagar agora, e o <b>ask</b>, que é o menor valor pelo qual alguém aceita vender. A distância entre os dois é o <b>spread</b>. Quem compra com pressa paga o ask e quem vende com pressa recebe o bid, então o spread é o pedaço que fica pelo caminho.",
   "medio": "Em ativos muito negociados o spread é de centavos e quase não se nota; em ativos parados pode chegar a vários por cento, e aí vira um custo invisível pago duas vezes, na entrada e na saída. O ponto médio entre bid e ask é a referência mais honesta de preço — o último negócio pode ter acontecido horas atrás. Ordem a mercado aceita o spread que estiver no livro naquele instante; ordem limitada fixa o preço e corre o risco de não executar. Spread largo costuma vir com pouca profundidade, então uma ordem grande empurra o preço contra você.",
   "expert": "O spread remunera três coisas para quem faz mercado: custo operacional, custo de carregar estoque e risco de negociar contra quem tem informação. Mede-se em valor absoluto ou em pontos-base sobre o ponto médio, e o custo de ida e volta equivale ao spread cheio quando as duas pontas saem a mercado. Somado a ele existe o impacto de mercado: ordem maior que a profundidade do topo do livro consome os níveis seguintes e o preço médio executado piora. Spread e profundidade se deterioram na abertura, no fechamento e em estresse, justamente quando o volume de ordens aumenta. Em ativos ilíquidos, marcar a posição pelo último negócio superestima o valor realizável, porque a saída acontece no bid."
  },
  "en": {
   "iniciante": "Every asset carries two prices at once: the <b>bid</b>, the most anyone will pay right now, and the <b>ask</b>, the least anyone will accept to sell. The gap between them is the <b>spread</b>. Buy in a hurry and you pay the ask; sell in a hurry and you get the bid, so the spread is what stays behind.",
   "medio": "In heavily traded assets the spread is pennies and barely registers; in dormant ones it can reach several percent, becoming an invisible cost paid twice, on the way in and on the way out. The midpoint between bid and ask is the more honest price reference, since the last trade may be hours old. A market order accepts whatever spread is in the book at that instant; a limit order fixes your price and risks not filling. A wide spread usually comes with thin depth, so a large order pushes the price against you.",
   "expert": "The spread compensates a market maker for three things: operating cost, the cost of carrying inventory, and the risk of trading against someone better informed. It is measured in absolute terms or in basis points over the midpoint, and a round trip costs roughly the full spread when both legs go to market. On top of it sits market impact: an order larger than the depth at the top of the book eats through the next levels and worsens the average fill. Spreads widen and depth thins at the open, at the close and under stress, precisely when order flow picks up. In illiquid assets, marking a position at the last trade overstates realisable value, because the exit happens at the bid."
  }
 },
 {
  "k": "concentracao",
  "t": "Concentração",
  "te": "Concentration",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "Concentração é ter muito dinheiro em poucos investimentos. Se os cinco maiores já somam 60% de tudo, a carteira é concentrada. Não é proibido, mas quer dizer que o seu resultado depende de poucas escolhas darem certo.",
   "medio": "Concentração não é erro por si só — foi assim que muita gente ficou rica, e também é assim que muita gente quebrou. A pergunta que resolve é direta: se este ativo virar zero, muda a sua vida? Vale olhar além do nome do papel, porque cinco bancos diferentes reagem quase ao mesmo choque e a carteira está mais concentrada do que a lista sugere. Ela também cresce sozinha: o ativo que mais sobe vai ganhando peso sem nenhuma compra nova.",
   "expert": "O índice de Herfindahl (soma dos quadrados dos pesos) e o número efetivo de posições (1/HHI) medem o que a contagem de tickers esconde: vinte ativos com um deles em 40% dão número efetivo perto de <b>5</b>. A concentração que importa é setorial e de fator, não de emissor — cinco bancos são quase uma posição só, e o mesmo vale para exportadoras expostas à mesma commodity. Concentrar não muda o retorno esperado, muda a dispersão em volta dele: a variância e a probabilidade de ruína sobem juntas. Em carteiras que recebem aportes, os pesos derivam pelo próprio desempenho, então o número efetivo cai com o tempo sem nenhuma decisão de compra."
  },
  "en": {
   "iniciante": "Concentration means holding a lot of money in few investments. If your five largest positions already add up to 60% of everything, the portfolio is concentrated. Nothing forbids it, but it means your outcome rests on a handful of choices working out.",
   "medio": "Concentration is not a mistake in itself — plenty of people got rich this way, and plenty of people went broke the same way. The question that settles it is blunt: if this asset went to zero, would your life change? It pays to look past the ticker, since five different banks react to almost the same shock and the portfolio is more concentrated than the list suggests. It also grows by itself: whatever rises most keeps gaining weight with no new purchase.",
   "expert": "The Herfindahl index (the sum of squared weights) and the effective number of positions (1/HHI) capture what a ticker count hides: twenty holdings with one at 40% give an effective number near <b>5</b>. The concentration that matters is sectoral and factor-based rather than by issuer — five banks are nearly one position, and the same goes for exporters tied to the same commodity. Concentrating does not change expected return, it changes the dispersion around it: variance and the probability of ruin rise together. In portfolios that receive contributions, weights drift through performance alone, so the effective number falls over time without a single buy decision."
  }
 },
 {
  "k": "correlacao",
  "t": "Correlação",
  "te": "Correlation",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "Correlação diz se dois investimentos costumam se mexer juntos. Perto de <b>+1</b> sobem e caem ao mesmo tempo; perto de <b>−1</b> fazem o contrário um do outro; perto de zero, um não diz nada sobre o outro. É o número que mostra se você diversificou de verdade ou só comprou coisas parecidas.",
   "medio": "A diversificação funciona melhor entre ativos de correlação baixa ou negativa — ações brasileiras e dólar, por exemplo, tendem a ir em direções opostas. Correlação alta entre as posições significa que a carteira é, na prática, uma aposta só repetida várias vezes. O número não é fixo: muda com o período medido e com a frequência, e dois ativos podem parecer independentes em janelas mensais e andar colados em dias de pânico. Correlação também não fala de retorno — dois ativos podem ser pouco correlacionados e ambos perderem dinheiro.",
   "expert": "É o coeficiente de Pearson, a covariância dividida pelo produto dos desvios-padrão, limitado entre <b>−1</b> e <b>+1</b>. Captura apenas relação linear: séries com dependência de cauda podem exibir correlação baixa na amostra cheia e se mover juntas nos extremos. Na variância da carteira o que entra é o produto wᵢwⱼσᵢσⱼρᵢⱼ, de modo que um ativo volátil com correlação moderada pode contribuir mais risco que um ativo estável de correlação alta. A estimativa é instável e depende de janela, frequência e regime, e correlações históricas costumam subir em crises por contágio e venda forçada. Correlação não implica causalidade nem permanência: um par que funcionou como proteção por anos deixa de funcionar quando o mecanismo econômico por trás dele muda."
  },
  "en": {
   "iniciante": "Correlation tells you whether two investments tend to move together. Near <b>+1</b> they rise and fall in step; near <b>−1</b> they do the opposite; near zero, one says nothing about the other. It is the number that reveals whether you really diversified or just bought similar things.",
   "medio": "Diversification works best across assets with low or negative correlation — Brazilian equities and the US dollar, for instance, tend to pull in opposite directions. High correlation between holdings means the portfolio is one bet repeated several times. The figure is not fixed: it shifts with the measurement window and frequency, and two assets can look independent in monthly data yet move as one on panic days. Correlation also says nothing about return — two assets can be barely correlated and both lose money.",
   "expert": "It is the Pearson coefficient, covariance divided by the product of standard deviations, bounded between <b>−1</b> and <b>+1</b>. It captures linear relationships only: series with tail dependence can show low full-sample correlation and still move together at the extremes. What enters portfolio variance is the product wᵢwⱼσᵢσⱼρᵢⱼ, so a volatile asset with moderate correlation can contribute more risk than a stable one with high correlation. Estimates are unstable, depending on window, frequency and regime, and historical correlations tend to rise in crises through contagion and forced selling. Correlation implies neither causation nor persistence: a pair that hedged well for years stops working once the economic mechanism behind it changes."
  }
 },
 {
  "k": "corretagem",
  "t": "Corretagem e taxas",
  "te": "Brokerage and fees",
  "c": "Custos",
  "ce": "Costs",
  "pt": {
   "iniciante": "Corretagem é o que a corretora cobra cada vez que você compra ou vende. No Brasil, boa parte das corretoras já zerou essa cobrança para ações, então hoje muita gente opera sem pagar nada por operação.",
   "medio": "Corretagem zero não é operação de graça: continuam os emolumentos e a taxa de liquidação da B3, a taxa de custódia em alguns produtos, o spread de câmbio nas compras no exterior e a taxa de administração dentro de fundos e ETFs. A nota de corretagem abre cada uma dessas linhas, e é nela que dá para conferir o custo real. Em ordens pequenas e frequentes, as parcelas fixas pesam proporcionalmente muito mais do que em ordens maiores e espaçadas.",
   "expert": "Numa corretora sem corretagem, a receita vem de outras pontas: spread de câmbio, remuneração do caixa parado, rebate na distribuição de fundos e, em alguns mercados, pagamento pelo fluxo de ordens. Emolumentos e taxa de liquidação da B3 incidem sobre o volume financeiro e aparecem discriminados na nota; a taxa de custódia sobrevive em produtos específicos. O custo que não vem discriminado é o de execução — spread pago e impacto de mercado —, e em ativos ilíquidos ele supera com folga qualquer corretagem que tenha existido. A comparação útil entre corretoras é pelo custo total de uma ida e volta, câmbio incluído, e não pela linha de corretagem isolada."
  },
  "en": {
   "iniciante": "Brokerage is what your broker charges each time you buy or sell. In Brazil most brokers have dropped it to zero for stocks, so many people now trade without paying anything per order.",
   "medio": "Zero brokerage does not mean a free trade: B3 exchange and settlement fees remain, custody fees survive on some products, currency spreads apply to foreign purchases, and management fees sit inside funds and ETFs. The trade confirmation breaks out each line, and that is where the real cost can be checked. On small, frequent orders the fixed components weigh proportionally far more than on larger, spaced-out ones.",
   "expert": "At a zero-brokerage firm the revenue comes from elsewhere: currency spreads, interest earned on idle cash, distribution rebates on funds and, in some markets, payment for order flow. B3 exchange and settlement fees apply to the traded amount and appear itemised on the confirmation, while custody fees persist on specific products. The cost never itemised is execution — the spread paid plus market impact — and in illiquid assets it comfortably exceeds any brokerage that was ever charged. The useful comparison between brokers is total round-trip cost including currency conversion, not the brokerage line on its own."
  }
 },
 {
  "k": "corretora",
  "t": "Corretora",
  "te": "Broker",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "A corretora é a empresa que dá acesso aos investimentos. Você transfere o dinheiro do banco para a conta dela e compra os papéis por um aplicativo ou site. Ela é o caminho até o mercado, não a dona do que você comprou.",
   "medio": "Os ativos ficam registrados no seu nome, na B3 ou no custodiante, fora do balanço da corretora: se ela quebrar, os papéis continuam seus, embora transferir tudo para outra instituição dê trabalho e demore. Dá para conferir as posições direto na Área do Investidor da B3, sem depender do aplicativo. O que muda de uma corretora para outra é a lista de produtos, o custo, o câmbio e a qualidade do atendimento. Saldo parado na conta da corretora é outra coisa: não é ativo custodiado e segue as regras do produto em que estiver aplicado.",
   "expert": "A corretora é intermediária habilitada junto à B3 e fiscalizada pela CVM e pelo Banco Central; a liquidação e a custódia central ficam na B3, e é essa segregação que mantém os ativos do cliente fora da massa em caso de falência dela. Saldo em conta na corretora tem natureza jurídica distinta: é crédito contra a instituição, não ativo registrado no seu nome. No exterior a estrutura muda conforme o país, e o que protege é o regime local de segregação e o seguro correspondente, não o FGC brasileiro. Transferência de custódia entre corretoras não é venda e não gera imposto, mas costuma zerar o histórico exibido pela instituição nova — preço médio e data de aquisição continuam sendo controle do investidor."
  },
  "en": {
   "iniciante": "A broker is the company that gives you access to investments. You move money from your bank into an account there and buy securities through an app or website. It is the route to the market, not the owner of what you bought.",
   "medio": "Assets are registered in your name at B3 or with the custodian, off the broker's balance sheet: if it fails, the securities stay yours, though moving everything to another institution is slow and tedious. Positions can be checked directly in B3's investor area, without relying on the app. What differs between brokers is the product list, cost, currency conversion and service quality. Idle cash in the broker account is a different matter: it is not a custodied asset and follows the rules of whatever product it sits in.",
   "expert": "A broker is an intermediary authorised at B3 and supervised by the CVM and the central bank; settlement and central custody sit at B3, and that segregation is what keeps client assets out of the estate if the broker fails. A cash balance at the broker has a different legal nature: it is a claim against the institution, not an asset registered in your name. Abroad the structure varies by country, and protection comes from the local segregation regime and its insurance scheme, not from Brazil's FGC. Transferring custody between brokers is not a sale and triggers no tax, but it usually wipes the history shown by the receiving institution — average cost and acquisition date remain the investor's own record to keep."
  }
 },
 {
  "k": "cotacao-atrasada",
  "t": "Cotação com atraso",
  "te": "Delayed quotes",
  "c": "App",
  "ce": "App",
  "pt": {
   "iniciante": "As fontes públicas e gratuitas normalmente mostram o preço com alguns minutos de atraso em relação à bolsa. O número que aparece aqui é real — só não é o deste exato segundo.",
   "medio": "Para acompanhar patrimônio, calcular rentabilidade e planejar aportes, um atraso de 15 minutos não muda conclusão nenhuma. Ele só atrapalha quem compra e vende no mesmo dia, em que a diferença entre dois instantes é justamente o resultado. Na prática, isso significa que pequenas diferenças entre esta tela e a da corretora são esperadas e não indicam erro. Em ativos pouco negociados, o último preço pode ser bem mais antigo que o atraso da fonte.",
   "expert": "Dado em tempo real exige licença de mercado paga, e é por isso que fontes gratuitas entregam o feed defasado. Além do atraso, elas costumam demorar a aplicar ajustes de proventos, desdobramentos e grupamentos, o que distorce a série histórica e qualquer retorno calculado sobre ela. Em ativos ilíquidos soma-se o problema de preço velho: o último negócio pode ser de dias atrás, e usá-lo como marcação subestima a volatilidade e superestima a liquidez. Para patrimônio e para cálculo de imposto, a referência é o preço de fechamento oficial, não o intradiário exibido na tela."
  },
  "en": {
   "iniciante": "Free public price sources usually show quotes a few minutes behind the exchange. The number here is real — it just is not from this exact second.",
   "medio": "For tracking net worth, calculating returns and planning contributions, a 15-minute delay changes no conclusion. It only matters to someone buying and selling within the same day, where the gap between two moments is the whole result. In practice it also means small differences between this screen and your broker's are expected and do not signal an error. In thinly traded assets, the last price can be far older than the feed's delay.",
   "expert": "Real-time data requires a paid market data licence, which is why free sources deliver a delayed feed. Beyond the delay, they are often slow to apply adjustments for dividends, splits and reverse splits, distorting the historical series and any return computed from it. Illiquid assets add the stale-price problem: the last trade may be days old, and marking to it understates volatility while overstating liquidity. For net worth and tax purposes the reference is the official closing price, not the intraday figure on screen."
  }
 },
 {
  "k": "cri-cra",
  "t": "CRI e CRA",
  "te": "CRI and CRA",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "CRI e CRA são títulos de dívida lastreados em recebíveis: do setor imobiliário no caso do CRI, do agronegócio no caso do CRA. Para pessoa física o rendimento é isento de imposto de renda, o que faz uma taxa aparentemente menor render mais do que parece.",
   "medio": "Não têm cobertura do FGC, então o risco é de quem deve lá na ponta e das garantias montadas na operação, não de um banco. A liquidez costuma ser baixa: vender antes do vencimento depende de achar comprador no secundário, muitas vezes com deságio. Como a isenção muda a base, comparar a taxa de um CRI ou CRA com CDB e Tesouro exige trazer todos para retorno líquido. Aqui o nome do banco que distribuiu diz pouco — o que importa é quem é o devedor e o que garante o papel.",
   "expert": "São valores mobiliários emitidos por securitizadoras, com lastro em créditos imobiliários ou do agronegócio; a análise de crédito recai sobre a carteira securitizada e os cedentes, não sobre a securitizadora. A estrutura define o risco: lastro pulverizado ou concentrado em um único devedor, com ou sem subordinação, com alienação fiduciária, fundo de reserva e covenants. Sem FGC e com secundário raso, o spread sobre a NTN-B de prazo equivalente remunera crédito e iliquidez ao mesmo tempo. A isenção de IR para pessoa física é o que sustenta taxas nominalmente menores que as de papéis tributados, e a comparação correta se faz pela taxa equivalente bruta. Regras tributárias de papéis incentivados já foram alteradas por lei mais de uma vez, então o tratamento aplicável depende da data de emissão do título."
  },
  "en": {
   "iniciante": "CRI and CRA are debt securities backed by receivables — real estate receivables for CRI, agribusiness receivables for CRA. For individual investors in Brazil the income is exempt from income tax, which makes a seemingly lower rate worth more than it looks.",
   "medio": "Neither is covered by the FGC deposit guarantee, so the risk sits with the ultimate debtor and the collateral built into the deal, not with a bank. Liquidity is usually thin: selling before maturity means finding a buyer in the secondary market, often at a discount. Because the exemption changes the base, comparing a CRI or CRA rate with a CDB or Tesouro Direto requires putting all of them on an after-tax footing. The name of the distributing bank says little here — what matters is who owes the money and what secures the paper.",
   "expert": "These are securities issued by securitisation companies against real estate or agribusiness credits; credit analysis belongs to the securitised pool and the originators, not to the issuing vehicle. Structure drives risk: granular collateral or a single obligor, with or without subordination, with fiduciary liens, reserve funds and covenants. With no FGC and a shallow secondary market, the spread over a comparable-maturity NTN-B pays for credit and illiquidity at once. The individual income tax exemption is what sustains nominal rates below those of taxable paper, so the correct comparison uses the gross-equivalent yield. Tax rules for incentivised instruments have been changed by legislation more than once, so the treatment that applies depends on the security's issue date."
  }
 },
 {
  "k": "cripto",
  "t": "Criptomoeda",
  "te": "Cryptocurrency",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "Criptomoeda é dinheiro digital que existe numa rede de computadores espalhada pelo mundo, sem banco central por trás. O Bitcoin é o mais conhecido. O preço vem só do que as pessoas estão dispostas a pagar, e por isso oscila muito mais que ação ou renda fixa.",
   "medio": "É o ativo mais volátil desta lista: quedas de 50% ou mais já aconteceram várias vezes. Nas discussões de alocação, a faixa que mais aparece é de 1% a 5% da carteira, com a ideia de que esse dinheiro possa oscilar muito sem afetar planos. Onde a cripto fica guardada também pesa: em corretora, você depende da solvência dela; em carteira própria, perder a chave é perda definitiva. No Brasil as operações são informadas à Receita Federal, e as corretoras locais reportam as movimentações.",
   "expert": "Sem fluxo de caixa não há valor presente a descontar: a avaliação é reflexiva, oferta programada contra demanda, e o preço responde a fluxo e narrativa em vez de lucro. Os riscos se separam em custódia (self-custody, com risco de chave, contra exchange, com risco de contraparte), regulatório e de liquidez em estresse. No Brasil, ganhos são tributados quando as vendas passam de <b>R$ 35 mil no mês</b>; como a legislação sobre ativos virtuais foi alterada nos últimos anos, o limite e a alíquota que valem dependem do ano-calendário e de o ativo estar custodiado dentro ou fora do país. A correlação com ações costuma ser baixa em períodos calmos e subir em quedas fortes, o que reduz o efeito diversificador justamente quando ele seria útil."
  },
  "en": {
   "iniciante": "A cryptocurrency is digital money that lives on a network of computers spread around the world, with no central bank behind it. Bitcoin is the best known. Its price comes purely from what people will pay, which is why it swings far more than stocks or bonds.",
   "medio": "It is the most volatile asset on this list: drops of 50% or more have happened several times. In allocation discussions the range that comes up most often is 1% to 5% of a portfolio, on the reasoning that this money can swing wildly without derailing any plan. Where the coins are kept matters too: on an exchange you depend on its solvency, in self-custody a lost key is a permanent loss. In Brazil these transactions are reported to the Receita Federal, and local exchanges report activity themselves.",
   "expert": "With no cash flow there is nothing to discount: valuation is reflexive, programmed supply against demand, and price responds to flows and narrative rather than earnings. The risks split into custody (self-custody with key risk versus an exchange with counterparty risk), regulation, and liquidity under stress. In Brazil, gains are taxed once monthly sales exceed <b>R$ 35,000</b>; since the legislation on virtual assets has been revised in recent years, the threshold and rate that actually apply depend on the tax year and on whether the asset is held inside or outside the country. Correlation with equities tends to be low in calm periods and to rise in sharp drawdowns, eroding the diversification benefit exactly when it would help."
  }
 },
 {
  "k": "custo-oportunidade",
  "t": "Custo de oportunidade (o que você deixa de ganhar)",
  "te": "Opportunity cost (what you give up)",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Custo de oportunidade é o que você deixou de ganhar por ter escolhido uma coisa em vez de outra. Não aparece como prejuízo em lugar nenhum, mas é dinheiro que ficou na mesa.",
   "medio": "O caso mais comum é dinheiro parado: R$ 50 mil na conta corrente, com o CDI a 13% ao ano, deixam de render uns R$ 6,5 mil em doze meses. O custo existe mesmo quando a escolha é boa — trocar um investimento por outro tem como preço o retorno daquele que ficou para trás. Serve também fora do mercado: quitar uma dívida rende, de forma garantida, o juro que você deixa de pagar. O erro comum é avaliar só o que rendeu, sem olhar a alternativa que existia na mesma época.",
   "expert": "Formalmente, é a taxa de desconto correta para avaliar qualquer decisão: o retorno da melhor alternativa disponível com risco equivalente, e não uma taxa livre de risco genérica. A cláusula de risco equivalente é o que a maioria das comparações ignora — medir uma posição em ações contra o CDI mistura prêmio de risco com erro de escolha. Com capital limitado, o custo relevante é o retorno marginal da última alternativa preterida, o que na prática ordena as opções por retorno ajustado ao risco. Caixa tem valor de opção: manter liquidez custa o retorno abandonado e paga em flexibilidade e capacidade de comprar em quedas, e esse componente não aparece na conta simples de rendimento perdido."
  },
  "en": {
   "iniciante": "Opportunity cost is what you gave up by choosing one thing over another. It never shows up as a loss anywhere, but it is money left on the table.",
   "medio": "The most common case is idle cash: R$ 50,000 sitting in a current account, with the CDI at 13% a year, forgoes around R$ 6,500 over twelve months. The cost exists even when the choice is a good one — swapping one investment for another costs you the return of the one you left. It applies outside markets too: paying down debt earns, with certainty, the interest you stop paying. The usual mistake is judging only what an investment returned, without looking at the alternative available at the time.",
   "expert": "Formally it is the correct discount rate for any decision: the return on the best available alternative of equivalent risk, not a generic risk-free rate. The equivalent-risk clause is what most comparisons drop — measuring an equity position against the CDI conflates a risk premium with a bad choice. Under a capital constraint, the relevant cost is the marginal return of the last alternative passed over, which in practice ranks options by risk-adjusted return. Cash carries option value: holding liquidity costs the forgone return and pays in flexibility and the ability to buy during drawdowns, a component that never appears in the simple arithmetic of lost yield."
  }
 },
 {
  "k": "custodia",
  "t": "Custódia",
  "te": "Custody",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Custódia é onde os seus investimentos ficam guardados, registrados no seu nome. É o cofre: a corretora é a porta por onde você entra, e a custódia é o lugar em que os papéis realmente estão.",
   "medio": "No Brasil, a custódia central de ações, FIIs, ETFs e boa parte da renda fixa é da B3, e dá para conferir posições e movimentações pela Área do Investidor da própria B3, sem depender do que a corretora mostra. É assim que se checa se o extrato bate. Mudar de corretora é transferir custódia, não vender: a posição troca de lugar e o preço médio continua o mesmo. Produtos no exterior seguem estruturas próprias, com outros custodiantes e outras regras.",
   "expert": "A B3 opera como depositária central, com registro escritural e nominativo, e é essa segregação que mantém os ativos do investidor fora do patrimônio do intermediário em caso de falência. A conferência independente pela Área do Investidor existe para esse controle: divergência entre o extrato da corretora e o da depositária é o primeiro indício de erro de lançamento ou de cadastro. Transferência de custódia não é fato gerador de imposto, mas costuma zerar o histórico exibido pela corretora que recebe, e preço médio e data de aquisição permanecem responsabilidade do investidor. No exterior a proteção depende do regime local e da estrutura da conta — omnibus ou segregada —, e é essa estrutura, não o nome da instituição, que determina o desfecho numa quebra."
  },
  "en": {
   "iniciante": "Custody is where your investments are held, registered in your name. Think of it as the vault: the broker is the door you walk through, custody is where the securities actually sit.",
   "medio": "In Brazil, central custody of stocks, FIIs, ETFs and much of fixed income sits at B3, and you can check positions and movements in B3's own investor area rather than relying on what the broker displays. That is how you verify the statement adds up. Switching brokers means transferring custody, not selling: the position changes hands and the average cost stays the same. Products held abroad follow their own structures, with different custodians and different rules.",
   "expert": "B3 acts as central depository, with book-entry registration in the investor's name, and that segregation keeps client assets outside the intermediary's estate if it fails. Independent verification through the investor area exists for exactly this control: a discrepancy between the broker's statement and the depository's is the first sign of a booking or registration error. A custody transfer is not a taxable event, but it typically wipes the history shown by the receiving broker, and average cost and acquisition date remain the investor's own responsibility. Abroad, protection depends on the local regime and on whether the account is omnibus or segregated — that structure, not the institution's name, determines the outcome in a failure."
  }
 },
 {
  "k": "custo-taxas",
  "t": "Custos e taxas",
  "te": "Costs and fees",
  "c": "Custos",
  "ce": "Costs",
  "pt": {
   "iniciante": "Custos são tudo que sai da sua rentabilidade sem aparecer no extrato como perda: taxa de administração, corretagem, custódia, spread de câmbio, IOF e imposto. Você não vê a cobrança acontecer, vê o resultado menor no fim.",
   "medio": "Custo é a única variável do investimento que você conhece de antemão: ninguém sabe quanto a bolsa vai render, mas qualquer um consegue somar quanto paga de taxa. Em prazos longos, uma diferença pequena de taxa vira uma diferença grande de patrimônio, porque ela incide todo ano sobre um valor cada vez maior. A conta precisa somar tudo — administração, performance, corretagem, custódia, câmbio e impostos —, não só a linha mais visível. Quando o custo não aparece com clareza na lâmina, ele costuma estar embutido no spread, na taxa de saída ou no rebate de distribuição.",
   "expert": "A comparação correta é pelo custo total (TER), não pela taxa de administração isolada: entram taxa de performance, corretagem implícita do fundo, spread de câmbio e o tracking difference em relação ao índice. Um TER de <b>2%</b> contra <b>0,3%</b> consome, em <b>20 anos</b>, cerca de <b>um terço</b> do patrimônio final — o efeito é multiplicativo e cresce com o horizonte. O custo tributário segue a mesma lógica com um agravante de timing: come-cotas e giro alto antecipam imposto e retiram da composição capital que só sairia no resgate. O tracking difference é o teste empírico do conjunto, porque mede o que sobrou depois de todas as taxas, e não o que a lâmina informa."
  },
  "en": {
   "iniciante": "Costs are everything that comes out of your return without ever appearing as a loss on your statement: management fees, brokerage, custody, currency spread, IOF and tax. You never see the charge happen, you just see a smaller result at the end.",
   "medio": "Cost is the one variable you know in advance: nobody knows what the market will return, but anyone can add up what they pay. Over long horizons a small fee difference becomes a large wealth difference, because it applies every year to a steadily larger balance. The tally has to include everything — management, performance, brokerage, custody, currency and taxes — not just the most visible line. When the cost is not clearly stated in the fact sheet, it is usually buried in the spread, an exit fee or a distribution rebate.",
   "expert": "The right comparison is total cost (TER), not the management fee alone: it takes in performance fees, the fund's implicit trading costs, currency spread and tracking difference against the index. A TER of <b>2%</b> versus <b>0.3%</b> consumes roughly <b>a third</b> of final wealth over <b>20 years</b> — the effect is multiplicative and grows with the horizon. Tax costs follow the same logic with a timing penalty: come-cotas (a twice-yearly tax withheld inside Brazilian funds) and high turnover pull tax forward, removing from compounding capital that would otherwise leave only at redemption. Tracking difference is the empirical test of the whole package, since it measures what survived every fee rather than what the fact sheet states."
  }
 },
 {
  "k": "darf",
  "t": "DARF",
  "te": "DARF",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "DARF é a guia usada para pagar impostos federais. Quem tem lucro com investimentos fora das faixas isentas precisa calcular o imposto, gerar a guia e pagar por conta própria — a corretora não faz isso no seu lugar.",
   "medio": "Para ganhos em bolsa, o código é <b>6015</b>. O vencimento é o último dia útil do mês seguinte ao do lucro, e atraso gera multa e juros. Valores abaixo de <b>R$ 10</b> não se paga no mês: acumulam para a competência seguinte. A apuração é mensal, o que significa refazer a conta em todo mês em que houve venda com lucro, sem esperar o fim do ano.",
   "expert": "A apuração é mensal e separada por modalidade — operações comuns, day trade, FII e exterior —, e prejuízo de uma modalidade não compensa lucro de outra. O prejuízo acumulado é compensável nos meses seguintes dentro da mesma modalidade, sem prazo de validade, desde que o controle esteja documentado. O cálculo parte do preço médio por ativo, ajustado por desdobramentos, grupamentos e bonificações, e a Receita Federal cruza o declarado com os informes enviados pela B3. Manter preço médio e prejuízo acumulado em controle próprio é o que evita retrabalho, já que o vencimento no último dia útil do mês seguinte não admite apuração retroativa sem multa, e valores abaixo de <b>R$ 10</b> ficam acumulados em vez de gerar guia."
  },
  "en": {
   "iniciante": "A DARF is the payment slip for Brazilian federal taxes. Anyone with investment gains beyond the exempt brackets has to work out the tax, generate the slip and pay it themselves — the broker does not do it for you.",
   "medio": "For stock market gains the code is <b>6015</b>. It falls due on the last business day of the month following the profit, and late payment brings a fine plus interest. Amounts under <b>R$ 10</b> are not paid that month: they roll into the next period. Assessment is monthly, which means redoing the calculation in every month with a profitable sale, rather than waiting for year end.",
   "expert": "Assessment is monthly and split by category — ordinary trades, day trades, FIIs and foreign holdings — and a loss in one category cannot offset a gain in another. Carried-forward losses offset gains in later months within the same category, with no expiry, provided the records support it. The calculation starts from average cost per asset, adjusted for splits, reverse splits and bonus shares, and the Receita Federal cross-checks what you declare against the statements B3 files. Keeping your own record of average cost and accumulated losses is what avoids rework, since the last-business-day deadline leaves no room for retroactive assessment without penalty, and amounts under <b>R$ 10</b> accumulate instead of generating a slip."
  }
 },
 {
  "k": "day-trade",
  "t": "Day trade (compra e venda no mesmo dia)",
  "te": "Day trading (buying and selling the same day)",
  "c": "Comportamento",
  "ce": "Behaviour",
  "pt": {
   "iniciante": "Day trade é comprar e vender o mesmo ativo dentro do mesmo dia, tentando lucrar com a oscilação de curtíssimo prazo. Parece simples visto de fora, e é a forma mais difícil e mais cara de operar.",
   "medio": "Estudos com dados da B3 mostram que a enorme maioria de quem faz day trade de forma persistente perde dinheiro. A tributação também é pior: <b>20%</b> sobre o ganho, sem a faixa de isenção que existe nas operações comuns, e com retenção na fonte. Os custos se multiplicam pela frequência, porque spread, emolumentos e imposto incidem em cada ida e volta, e não uma vez por ano. Resultado de dia isolado diz pouco — o que conta é o acumulado depois de custos e impostos.",
   "expert": "É jogo de soma negativa depois de custos: o ganho de um participante é a perda de outro, e os custos de transação saem do total. A tributação isola o day trade em modalidade própria, com <b>20%</b> sobre o ganho líquido mensal, sem a isenção por valor de venda das operações comuns, com retenção na fonte e prejuízo compensável apenas dentro da mesma modalidade. O custo de execução é o que decide o placar: spread nas duas pontas, impacto de mercado e emolumentos incidem por operação, então a estratégia precisa de expectativa positiva maior que a soma disso antes mesmo do imposto. A literatura empírica sobre a B3 não encontra persistência de desempenho positivo entre operadores individuais, e continuar na amostra não é sinal de habilidade. Alavancagem intradiária amplifica o mesmo processo nos dois sentidos e antecipa a ruína quando chega a sequência de perdas."
  },
  "en": {
   "iniciante": "Day trading means buying and selling the same asset within one day, trying to profit from very short-term swings. It looks simple from the outside, and it is the hardest and most expensive way to trade.",
   "medio": "Studies using B3 data show that the vast majority of persistent day traders lose money. The tax treatment is worse too: <b>20%</b> on the gain, with none of the exemption bracket that ordinary trades get, and with withholding at source. Costs multiply with frequency, since spread, exchange fees and tax apply to every round trip rather than once a year. A single day's result says little — what counts is the cumulative figure after costs and taxes.",
   "expert": "After costs it is a negative-sum game: one participant's gain is another's loss, and transaction costs come out of the total. Tax treatment isolates day trading in its own category at <b>20%</b> on the monthly net gain, without the sales-value exemption available to ordinary trades, with withholding at source and losses offsettable only within the same category. Execution cost decides the outcome: spread on both legs, market impact and exchange fees apply per trade, so the strategy needs a positive expectancy larger than their sum before tax even enters. The empirical literature on B3 finds no persistence of positive performance among individual traders, and still being in the sample is not evidence of skill. Intraday leverage amplifies the same process in both directions and brings ruin forward once a losing streak arrives."
  }
 },
 {
  "k": "debenture",
  "t": "Debênture",
  "te": "Debenture",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "Debênture é um empréstimo que você faz direto a uma empresa, em vez de a um banco. Ela usa o dinheiro no negócio e devolve com juros no prazo combinado.",
   "medio": "Costuma pagar taxa maior que a de um CDB de prazo parecido, e a razão é o risco: não existe FGC aqui, então se a empresa quebrar você entra na fila dos credores. Debêntures incentivadas, ligadas a projetos de infraestrutura, são isentas de imposto de renda para pessoa física. A liquidez no secundário costuma ser limitada, e vender antes do vencimento pode sair com deságio. Quem emite é uma empresa específica, então o que importa é a saúde dela, e não o nome do banco que distribuiu o papel.",
   "expert": "A leitura começa pelo rating e pela escritura: covenants, garantias reais ou fidejussórias, grau de subordinação e cláusulas de vencimento antecipado. O spread sobre a NTN-B de prazo equivalente é o prêmio recebido por crédito e iliquidez somados, e comparar debêntures sem igualar duration e indexador leva a conclusão errada. Sem FGC, a recuperação em caso de default depende da posição na estrutura de capital e da qualidade efetiva das garantias, não do rating no momento da compra. As incentivadas de infraestrutura têm isenção de IR para pessoa física, o que reduz a taxa nominal exigida em equilíbrio — a comparação honesta com papéis tributados usa a taxa equivalente bruta. No secundário há marcação a mercado, então a oscilação da curva de juros pode fazer a venda antecipada render bem menos que a taxa contratada."
  },
  "en": {
   "iniciante": "A debenture is a loan you make directly to a company instead of to a bank. The company puts the money to work and pays it back with interest at the agreed date.",
   "medio": "It usually pays more than a CDB of similar maturity, and the reason is risk: there is no FGC guarantee here, so if the company fails you join the queue of creditors. Infrastructure-linked debentures, known in Brazil as incentivised debentures, are exempt from income tax for individuals. Secondary market liquidity tends to be limited, and selling before maturity can mean accepting a discount. The issuer is one specific company, so what matters is its financial health, not the name of the bank that distributed the paper.",
   "expert": "Analysis starts with the rating and the indenture: covenants, real or personal guarantees, degree of subordination and acceleration clauses. The spread over a comparable-maturity NTN-B is the premium being paid for credit and illiquidity combined, and comparing debentures without matching duration and index leads to the wrong conclusion. Without FGC coverage, recovery in a default depends on position in the capital structure and on how good the collateral really is, not on the rating at purchase. Incentivised infrastructure issues carry income tax exemption for individuals, which lowers the nominal rate required in equilibrium — an honest comparison with taxable paper uses the gross-equivalent yield. The secondary market marks to market, so a shift in the yield curve can make an early sale return far less than the contracted rate."
  }
 },
 {
  "k": "bens-exterior",
  "t": "Declarar bens no exterior",
  "te": "Declaring assets held abroad",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "Quem tem dinheiro ou investimentos fora do Brasil precisa informar isso na declaração anual do imposto de renda, mesmo sem ter vendido nada nem tido lucro. Declarar é obrigação de informar, e não quer dizer necessariamente pagar imposto.",
   "medio": "Os bens no exterior entram na declaração à Receita Federal pelo custo de aquisição, convertido segundo as regras do ano. Além dela existe a CBE, uma declaração separada ao Banco Central, exigida de quem passa de determinado valor em ativos fora do país — o limite e o prazo mudam, então o número vigente precisa ser conferido a cada ano. São duas obrigações independentes: entregar uma não dispensa a outra. Conta em corretora, ações, ETFs, imóveis e saldo em conta contam para esse total.",
   "expert": "São dois regimes distintos: a declaração de bens e direitos no IRPF, com apuração de rendimentos e ganho de capital no exterior conforme as regras em vigor, e a CBE do Banco Central, puramente informativa, com limite próprio e periodicidade anual, além de trimestral acima de certos valores. A legislação sobre aplicações financeiras e entidades controladas no exterior foi reformulada nos últimos anos, mudando o momento da tributação e o tratamento de estruturas offshore, de modo que a regra aplicável depende do ano-calendário. O ganho de capital em moeda estrangeira tem regras próprias de conversão e de isenção conforme a origem dos recursos, e a variação cambial pode gerar ganho tributável mesmo sem ganho na moeda de origem. Acordos de troca automática de informação fazem contas no exterior chegarem às autoridades brasileiras, o que torna a omissão detectável."
  },
  "en": {
   "iniciante": "Anyone holding money or investments outside Brazil must report them on the annual income tax return, even with no sale and no profit. Reporting is a disclosure duty, and it does not automatically mean paying tax.",
   "medio": "Foreign assets go into the Receita Federal return at acquisition cost, converted under that year's rules. Separately there is the CBE, a declaration to the central bank required from anyone above a set value in assets abroad — the threshold and the deadline change, so the current figure has to be checked each year. These are two independent obligations: filing one does not excuse the other. Brokerage accounts, shares, ETFs, property and cash balances all count toward the total.",
   "expert": "Two distinct regimes apply: the assets and rights schedule in the IRPF return, with foreign income and capital gains assessed under the rules in force, and the central bank's CBE, which is purely informational, has its own threshold, and is filed annually plus quarterly above certain values. Legislation on foreign financial investments and controlled entities was overhauled in recent years, changing when income becomes taxable and how offshore structures are treated, so the applicable rule depends on the tax year. Capital gains in foreign currency have their own conversion and exemption rules based on the origin of the funds, and currency movement alone can create a taxable gain with no gain in the original currency. Automatic information exchange agreements deliver foreign account data to the Brazilian authorities, which makes omission detectable."
  }
 },
 {
  "k": "split",
  "t": "Desdobramento e grupamento",
  "te": "Splits and reverse splits",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Desdobramento é quando a empresa divide cada ação em várias; grupamento é o contrário, junta várias em uma. O valor total que você tem não muda — é a mesma pizza cortada em mais ou em menos fatias.",
   "medio": "A quantidade de ações e o preço se ajustam na mesma proporção, então a posição vale o mesmo no dia do evento. O que muda para você é o controle: o preço médio precisa ser ajustado na mesma proporção, senão o imposto sai errado na hora de vender. Desdobramento costuma vir para deixar o lote mais acessível, e grupamento aparece com frequência em papéis de preço muito baixo. Séries históricas não ajustadas mostram uma queda enorme no dia do desdobramento que nunca existiu de verdade.",
   "expert": "É evento societário sem efeito econômico direto: muda a quantidade de ações e o valor nominal, preservando capital social e a participação proporcional de cada acionista. Para imposto não há alienação nem fato gerador; o preço médio por ação é dividido ou multiplicado pelo fator do evento e a data de aquisição original permanece. Derivativos e ordens pendentes são ajustados pelo mesmo fator, e proventos já declarados seguem a data-base anterior ao evento. Em séries históricas, usar preços não ajustados distorce retorno, volatilidade e qualquer indicador calculado sobre eles. Grupamento aparece com frequência em papéis de preço muito baixo, inclusive por exigência de enquadramento, e por si só não altera a situação econômica da empresa."
  },
  "en": {
   "iniciante": "A split is when a company divides each share into several; a reverse split does the opposite, merging several into one. The total value you hold does not change — it is the same pizza cut into more or fewer slices.",
   "medio": "Share count and price adjust by the same factor, so the position is worth the same on the day of the event. What changes for you is record-keeping: your average cost has to be adjusted by the same factor, or the tax calculation comes out wrong when you sell. Splits usually aim to make the trading lot more accessible, while reverse splits often show up in very low-priced shares. Unadjusted price histories show a huge drop on the split date that never actually happened.",
   "expert": "It is a corporate action with no direct economic effect: share count and par value change while share capital and each holder's proportional stake stay the same. For tax purposes there is no disposal and no taxable event; average cost per share is divided or multiplied by the event factor and the original acquisition date carries over. Derivatives and open orders are adjusted by the same factor, and already-declared distributions follow the record date set before the event. In historical series, using unadjusted prices distorts returns, volatility and every indicator built on them. Reverse splits appear frequently in very low-priced shares, sometimes to meet listing requirements, and by themselves change nothing about the company's economics."
  }
 },
 {
  "k": "subscricao",
  "t": "Direito de subscrição",
  "te": "Subscription rights",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Quando uma empresa emite ações novas, quem já é acionista ganha a preferência para comprar antes dos outros. Esse é o direito de subscrição, e ele existe para você poder manter o tamanho da sua fatia na empresa.",
   "medio": "São três caminhos possíveis: exercer e comprar as novas ações pelo preço definido, vender o direito no mercado enquanto ele for negociável, ou não fazer nada. Não fazendo nada, o direito vira pó no fim do prazo e a sua participação encolhe — é a diluição. O direito tem código próprio na B3 e prazo curto, então costuma passar despercebido por quem não acompanha os avisos. Se o preço de subscrição estiver acima do preço de mercado, exercer não faz sentido econômico e o direito tende a não valer nada.",
   "expert": "O direito de preferência decorre da lei das sociedades por ações e é proporcional à participação na data-base do evento. Seu valor teórico é a diferença entre o preço de mercado da ação e o preço de subscrição, ajustada pela proporção da emissão; negociado em separado, é um instrumento com alavancagem embutida e prazo curto, portanto bem mais volátil que a própria ação. Em emissões com sobras, quem exerceu pode pedir rateio das sobras não subscritas. Para imposto, o custo do direito integra o custo de aquisição das ações quando exercido, e a venda do direito apura ganho de capital na modalidade correspondente. Não exercer nem vender produz diluição econômica e de participação, tanto maior quanto mais descontado estiver o preço de subscrição."
  },
  "en": {
   "iniciante": "When a company issues new shares, existing shareholders get first refusal on them. That is a subscription right, and it exists so you can keep your stake in the company the same size.",
   "medio": "There are three paths: exercise and buy the new shares at the set price, sell the right on the market while it is tradable, or do nothing. Doing nothing lets the right expire worthless and shrinks your stake — that is dilution. The right trades under its own B3 ticker with a short window, so it easily slips past anyone not watching corporate action notices. If the subscription price sits above the market price, exercising makes no economic sense and the right tends to be worth nothing.",
   "expert": "The pre-emptive right comes from Brazilian corporate law and is proportional to the holding on the event's record date. Its theoretical value is the difference between the share's market price and the subscription price, scaled by the issue ratio; traded separately it is a short-dated instrument with embedded leverage, and therefore far more volatile than the share itself. In offerings with leftovers, holders who exercised can request an allocation of unsubscribed shares. For tax, the cost of the right forms part of the acquisition cost of the shares when exercised, while selling the right produces a capital gain in the corresponding category. Neither exercising nor selling produces economic and proportional dilution, larger the deeper the discount in the subscription price."
  }
 },
 {
  "k": "diversificacao",
  "t": "Diversificação",
  "te": "Diversification",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "Diversificar é não colocar todos os ovos na mesma cesta: espalhar o dinheiro por vários investimentos diferentes para que um resultado ruim não derrube tudo. Você abre mão de acertar em cheio com um único ativo em troca de não quebrar junto com ele.",
   "medio": "Diversificar de verdade é misturar coisas que reagem de formas diferentes ao mesmo evento: ações, renda fixa, dólar, imóveis. Ter 20 ações do mesmo setor é uma posição só repetida 20 vezes, e o mesmo vale para fundos distintos que carregam os mesmos papéis. O efeito aparece na oscilação da carteira inteira, não no desempenho de cada parte — numa carteira diversificada sempre haverá alguma posição indo mal. O ganho também tem limite: passado certo número de ativos pouco correlacionados, acrescentar mais quase não reduz risco.",
   "expert": "O ganho vem da correlação, não da quantidade: o risco da carteira é √(Σ wᵢwⱼσᵢσⱼρᵢⱼ), e é o termo cruzado que derruba a variância abaixo da média ponderada dos riscos individuais. Por isso 20 ativos altamente correlacionados equivalem a poucos ativos efetivos, e a diversificação real se mede por fator e exposição econômica, não por número de tickers. O que desaparece é o risco idiossincrático; o risco sistemático permanece qualquer que seja o número de posições. Correlações não são estáveis e sobem em crises, por contágio e por venda forçada de liquidez, justamente quando a proteção faria diferença. Sem rebalanceamento os pesos derivam sozinhos e os vencedores reconcentram a carteira, desfazendo parte do efeito."
  },
  "en": {
   "iniciante": "Diversifying means not putting all your eggs in one basket: spreading money across different investments so one bad outcome cannot bring everything down. You give up hitting the jackpot on a single asset in exchange for not going down with it.",
   "medio": "Real diversification mixes things that react differently to the same event: equities, fixed income, the dollar, property. Holding 20 stocks from one sector is a single position repeated 20 times, and the same goes for different funds that own the same names. The benefit shows up in the whole portfolio's swings, not in each part's performance — in a diversified portfolio something is always doing badly. The gain also has a limit: past a certain number of weakly correlated assets, adding more barely reduces risk.",
   "expert": "The benefit comes from correlation, not from count: portfolio risk is √(Σ wᵢwⱼσᵢσⱼρᵢⱼ), and it is the cross term that pulls variance below the weighted average of individual risks. That is why 20 highly correlated holdings behave like a handful of effective ones, and why real diversification is measured by factor and economic exposure rather than ticker count. Idiosyncratic risk is what disappears; systematic risk remains no matter how many positions you hold. Correlations are not stable and rise in crises through contagion and forced liquidation, precisely when protection would matter. Without rebalancing, weights drift on their own and winners re-concentrate the portfolio, undoing part of the effect."
  }
 },
 {
  "k": "divida-liquida",
  "t": "Dívida líquida / EBITDA",
  "te": "Net debt / EBITDA",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "É uma conta que mostra quantos anos de geração de caixa a empresa levaria para pagar tudo o que deve. Quanto maior o número, mais tempo — e mais a empresa depende de as coisas continuarem indo bem.",
   "medio": "Acima de <b>3x</b> costuma acender alerta, mas o limite saudável depende do setor: energia e saneamento, com receita previsível, suportam mais alavancagem que varejo. O número sai do balanço trimestral e varia com sazonalidade, então a tendência ao longo de vários trimestres diz mais que um trimestre isolado. Dívida líquida desconta o caixa da dívida bruta, e por isso uma empresa com muito caixa pode mostrar indicador baixo mesmo devendo bastante. Em ciclo de juros em alta, um indicador que parecia confortável aperta rápido, porque o custo sobe na rolagem.",
   "expert": "Dívida líquida é a dívida bruta onerosa menos caixa e aplicações de liquidez imediata; o EBITDA é o lucro antes de juros, impostos, depreciação e amortização, e a razão entre eles expressa alavancagem em anos de geração operacional. O indicador ignora capex de manutenção e necessidade de capital de giro, então empresas intensivas em capital parecem menos alavancadas do que são — olhar dívida líquida sobre fluxo de caixa livre corrige parte da distorção. O EBITDA ajustado é onde mora a manipulação: exclusões recorrentes de itens ditos não recorrentes inflam o denominador e reduzem o múltiplo artificialmente. Covenants bancários costumam ser escritos sobre esse mesmo indicador, e o rompimento aciona vencimento antecipado, transformando um problema de rentabilidade em problema de liquidez. Setores com receita regulada ou contratada sustentam múltiplos mais altos que setores cíclicos, e bancos e seguradoras ficam de fora da métrica, porque dívida é insumo do negócio — o corte de <b>3x</b> é referência genérica, não regra."
  },
  "en": {
   "iniciante": "This ratio shows how many years of cash generation a company would need to pay off everything it owes. The higher the number, the longer it takes — and the more the company depends on things continuing to go well.",
   "medio": "Above <b>3x</b> usually raises a flag, but the healthy limit depends on the sector: utilities and water companies, with predictable revenue, carry more leverage than retailers. The figure comes from quarterly statements and swings with seasonality, so the trend across several quarters says more than any single quarter. Net debt subtracts cash from gross debt, so a company sitting on a large cash pile can show a low ratio while still owing plenty. In a rising rate cycle a ratio that looked comfortable tightens quickly, because the cost goes up at refinancing.",
   "expert": "Net debt is gross interest-bearing debt minus cash and immediately liquid investments; EBITDA is earnings before interest, taxes, depreciation and amortisation, and their ratio expresses leverage in years of operating generation. The metric ignores maintenance capex and working capital needs, so capital-intensive companies look less leveraged than they are — net debt over free cash flow corrects part of that distortion. Adjusted EBITDA is where the manipulation lives: routinely excluding supposedly non-recurring items inflates the denominator and artificially shrinks the multiple. Bank covenants are often written on this very ratio, and a breach triggers acceleration, turning a profitability problem into a liquidity problem. Sectors with regulated or contracted revenue sustain higher multiples than cyclical ones, and banks and insurers fall outside the metric entirely, since debt is an input to their business — the <b>3x</b> line is a generic reference, not a rule."
  }
 },
 {
  "k": "dividend-yield",
  "t": "Dividend yield (DY)",
  "te": "Dividend yield (DY)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É quanto um investimento pagou de dividendo no último ano em relação ao preço dele. Um DY de 8% quer dizer que quem tinha R$ 100 aplicados recebeu R$ 8 ao longo do período. Serve para comparar rapidamente quanto cada aplicação devolve em dinheiro no bolso.",
   "medio": "O cálculo pega os dividendos dos últimos 12 meses e divide pelo preço atual. Como o numerador é passado e o denominador é presente, o indicador descreve o que já aconteceu e não é promessa de nada. Um DY subindo nem sempre é boa notícia: ele também sobe quando o preço despenca. O que separa uma leitura útil de uma armadilha é a origem do pagamento — lucro recorrente ou distribuição pontual.",
   "expert": "<b>DY = proventos dos 12 meses anteriores / preço</b>. A versão mais informativa é o DY forward ajustado por payout normalizado, porque o realizado carrega eventos não recorrentes e distribuições extraordinárias. Em FIIs, o yield costuma ser lido contra a NTN-B longa: o spread entre os dois é o prêmio de risco que o mercado atribui ao setor imobiliário naquele momento. Yield muito acima dos pares tende a refletir preço em queda ou payout que o caixa não sustenta, não generosidade."
  },
  "en": {
   "iniciante": "It shows how much an investment paid out in dividends over the past year, as a share of its price. An 8% DY means someone holding R$ 100 received R$ 8 during the period. It is a quick way to compare how much cash different holdings hand back to you.",
   "medio": "The maths takes the last 12 months of dividends and divides them by today's price. The numerator looks backwards while the denominator is current, so the figure records what happened rather than what will happen. A rising DY is not automatically good news, because it also rises when the price collapses. What separates a useful reading from a trap is where the payment came from: recurring profit or a one-off distribution.",
   "expert": "<b>DY = trailing 12-month distributions / price</b>. Forward DY adjusted for a normalised payout carries more information than the trailing number, which absorbs non-recurring events and extraordinary distributions. For FIIs the yield is usually read against the long NTN-B, Brazil's inflation-linked government bond: the spread between them is the risk premium the market puts on the property sector at that moment. A yield far above peers normally signals a falling price or a payout cash flow cannot support, not generosity."
  }
 },
 {
  "k": "dividendo",
  "t": "Dividendos",
  "te": "Dividends",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É a fatia do lucro que a empresa reparte com os donos das ações. Se você tem papéis dela, o dinheiro entra na sua conta da corretora sem que você precise vender nada. É a forma mais direta de uma ação devolver dinheiro para quem investiu.",
   "medio": "O pagamento sai do caixa da empresa, então o preço da ação costuma cair no dia em que ela passa a ser negociada sem direito ao provento. No Brasil, a isenção de IR sobre dividendos na pessoa física valeu por muitos anos, mas a legislação mudou e o tratamento depende do ano-calendário do pagamento. Os JCP são outra forma de remunerar o acionista e têm 15% retidos na fonte. Dividendos pagos por empresas americanas a investidores estrangeiros sofrem 30% de retenção nos EUA.",
   "expert": "Dividendo distribui lucro já tributado na empresa; JCP é despesa dedutível para ela e chega ao investidor com 15% de IR retido na fonte, de modo que a comparação entre os dois só fecha depois do imposto. <b>Dividend yield = proventos 12m / preço</b>, e yield alto isolado funciona como alerta: costuma refletir preço em queda ou payout insustentável, a chamada yield trap. A análise se apoia em payout, cobertura por fluxo de caixa e ciclicidade do lucro, não no percentual anunciado. Sobre dividendos de fonte americana pagos a não residentes há 30% de retenção nos EUA. No Brasil, a tributação de dividendos na pessoa física passou por alteração legislativa, então a regra aplicável é a vigente no ano do pagamento."
  },
  "en": {
   "iniciante": "It is the slice of profit a company shares with its shareholders. If you own the shares, the cash lands in your brokerage account without you selling anything. It is the most direct way a stock pays you back.",
   "medio": "The money leaves the company's cash, so the share price usually drops on the day it starts trading without the right to the payment. In Brazil, dividends were free of personal income tax for many years, but the law has changed and the treatment depends on the tax year in which the payment falls. JCP, a Brazilian alternative to dividends, reaches the investor with 15% withheld at source. Dividends paid by US companies to foreign investors carry 30% US withholding.",
   "expert": "A dividend distributes profit already taxed at company level; JCP is deductible for the company and arrives with 15% withheld from the individual, so the two only compare after tax. <b>Dividend yield = trailing 12-month distributions / price</b>, and a high yield on its own is a warning — the classic yield trap, where the cause is a falling price or a payout the business cannot fund. The analysis rests on payout ratio, cash-flow coverage and how cyclical earnings are, not on the headline percentage. US-sourced dividends paid to non-residents are withheld at 30%. Brazilian personal taxation of dividends has been changed by legislation, so the rule that applies is the one in force in the year of payment."
  }
 },
 {
  "k": "dolar-turismo",
  "t": "Dólar comercial, turismo e PTAX",
  "te": "Commercial rate, tourist rate and PTAX",
  "c": "Cotações",
  "ce": "Quotes",
  "pt": {
   "iniciante": "O dólar comercial é o das notícias e dos investimentos, e é o que este app mostra. O turismo é o da casa de câmbio, sempre mais caro, porque embute o custo de entregar dinheiro na sua mão. A PTAX é a cotação oficial calculada pelo Banco Central.",
   "medio": "Quem manda dinheiro para investir lá fora paga o dólar comercial mais o spread da instituição e o IOF — a cotação da tela nunca é o custo final da operação. O turismo aparece na compra de espécie e no cartão pré-pago, com spread bem maior. Para declarar imposto de renda e converter valores oficiais, a referência é a PTAX do dia da operação, e não o número que estava na tela na hora.",
   "expert": "O comercial é a taxa do interbancário, formada em tempo real; o turismo é varejo e carrega spread de distribuição e custo de numerário; a PTAX é apurada pelo Banco Central a partir de consultas a dealers ao longo do dia e divulgada com taxa de compra e taxa de venda. O caso de borda está justamente aí: a Receita Federal especifica qual das duas pontas e qual data-base se aplicam a cada tipo de operação. Como a PTAX é média do dia, ela quase nunca coincide com o câmbio em que a operação foi fechada, e essa diferença aparece depois na apuração como ganho ou perda cambial."
  },
  "en": {
   "iniciante": "The commercial rate is the one in the news and in investing, and it is the one this app shows. The tourist rate is what a bureau de change charges, always higher, because it covers the cost of handing over physical cash. PTAX is the official rate calculated by Brazil's central bank.",
   "medio": "Sending money abroad to invest costs the commercial rate plus the institution's spread plus IOF, so the quote on screen is never the final cost. The tourist rate shows up when buying banknotes or loading a prepaid card, with a much wider spread. For income tax and for converting official amounts, the reference is the PTAX of the day of the transaction, not the live quote at the moment of execution.",
   "expert": "The commercial rate is the interbank rate, formed in real time; the tourist rate is retail and carries a distribution spread and the cost of holding cash; PTAX is compiled by the central bank from dealer surveys through the day and published as both a bid and an ask rate. The edge case lives there: Receita Federal specifies which side of PTAX and which reference date apply to each type of transaction. Because PTAX is a daily average, it almost never matches the rate a transaction actually settled at, and that gap later shows up as an FX gain or loss in the tax calculation."
  }
 },
 {
  "k": "dolar-ptax",
  "t": "Dólar PTAX",
  "te": "PTAX dollar rate",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "É a cotação oficial do dólar, calculada pelo Banco Central uma vez por dia. É ela que vale em contratos e na declaração de imposto de renda, e não o número que fica oscilando na tela.",
   "medio": "O dólar comercial que você vê em tempo real é o do mercado; a PTAX é uma média apurada ao longo do dia e só sai depois do fechamento. Para declarar IR, converter bens no exterior ou liquidar contratos indexados ao câmbio, a referência é a PTAX da data que a regra indicar. Por isso é normal o valor declarado não bater com o que aparecia no extrato da corretora no momento da operação.",
   "expert": "A PTAX é a média das cotações coletadas em quatro janelas de consulta a dealers do mercado de câmbio ao longo do dia, divulgada com taxa de compra e taxa de venda. Para o IR sobre bens e direitos no exterior, a Receita Federal especifica qual das pontas usar — compra ou venda — e qual data-base, conforme a operação. Contratos futuros de dólar liquidam por PTAX, o que concentra interesse no comportamento do câmbio durante as janelas de consulta. E, por ser média, a PTAX não é executável: nenhuma operação fecha exatamente nela."
  },
  "en": {
   "iniciante": "It is the official dollar rate, calculated once a day by Brazil's central bank. It is what counts in contracts and in the income tax return, rather than the number moving on screen.",
   "medio": "The commercial rate you watch live is the market rate; PTAX is an average compiled during the day and only published afterwards. For income tax, for converting assets held abroad and for settling FX-linked contracts, the reference is the PTAX of whichever date the rule specifies. That is why the declared amount routinely differs from what the broker statement showed at the moment of the trade.",
   "expert": "PTAX averages quotes collected in four dealer survey windows spread through the trading day, and is published as a bid rate and an ask rate. For tax on assets held abroad, Receita Federal specifies which side to use — bid or ask — and which reference date, depending on the transaction. Dollar futures settle against PTAX, which concentrates attention on how the rate behaves during those survey windows. Being an average, PTAX is not executable: no trade ever prints exactly at it."
  }
 },
 {
  "k": "dow",
  "t": "Dow Jones e Russell 2000",
  "te": "Dow Jones and Russell 2000",
  "c": "Índices",
  "ce": "Indexes",
  "pt": {
   "iniciante": "O Dow Jones acompanha 30 grandes empresas americanas, das mais antigas e conhecidas. O Russell 2000 acompanha 2.000 empresas pequenas dos Estados Unidos. Os dois são termômetros de pedaços bem diferentes do mesmo mercado.",
   "medio": "O Dow é o índice mais antigo e o mais citado na imprensa, mas é ponderado por preço da ação: quem tem ação cara pesa mais, independentemente do tamanho da empresa. Por causa disso, a referência mais usada para medir o mercado americano como um todo é o S&P 500. O Russell 2000 serve para outra leitura — mostra como vão as empresas menores, que costumam reagir mais ao ciclo doméstico americano e aos juros.",
   "expert": "O Dow usa ponderação por preço com um divisor reajustado a cada desdobramento, troca de componente ou evento societário, para a série não dar salto artificial. O efeito prático é que a mesma variação percentual move o índice mais quando ocorre numa ação de preço alto do que numa empresa muito maior com ação barata. O Russell 2000 é o recorte de menor capitalização de um índice amplo do mercado americano, ponderado por valor de mercado e reconstituído anualmente — a reconstituição concentra volume e mexe no preço de quem entra e de quem sai. A diferença de desempenho entre os dois costuma ser lida como medida de amplitude do mercado."
  },
  "en": {
   "iniciante": "The Dow Jones tracks 30 large American companies, mostly the oldest and best known. The Russell 2000 tracks 2,000 small US companies. Both are thermometers, but for very different slices of the same market.",
   "medio": "The Dow is the oldest index and the one the press quotes most, yet it is price-weighted: a company with an expensive share counts for more regardless of its actual size. Because of that, the S&P 500 is the reference most used to gauge the US market as a whole. The Russell 2000 answers a different question — how smaller companies are doing, and they tend to react more to US domestic conditions and to interest rates.",
   "expert": "The Dow is price-weighted with a divisor that is reset at every split, constituent change or corporate action, so the series does not jump artificially. In practice the same percentage move shifts the index more when it happens in a high-priced share than in a far larger company whose shares are cheap. The Russell 2000 is the small-capitalisation slice of a broad US index, weighted by market value and reconstituted once a year — reconstitution concentrates volume and moves the prices of names entering and leaving. The performance gap between the two is commonly read as a measure of market breadth."
  }
 },
 {
  "k": "drawdown",
  "t": "Drawdown (queda desde o topo)",
  "te": "Drawdown (the fall from the peak)",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "É o tamanho da queda desde o ponto mais alto até o mais baixo. Um drawdown de 30% quer dizer que a carteira chegou a valer 30% menos do que no seu melhor momento. É o número que mostra o susto que o investimento já deu.",
   "medio": "Diferente da volatilidade, o drawdown fala na língua de quem investe: quanto o saldo encolheu em relação ao topo. Funciona como teste de perfil — quem não conseguiria conviver com uma queda de 30% está com uma carteira mais agressiva do que aguenta. O outro lado do indicador é o tempo passado abaixo do topo anterior, que costuma ser bem maior que a duração da queda.",
   "expert": "<b>Drawdown em t = valor em t / máximo acumulado até t − 1</b>, e o máximo drawdown é o pior ponto dessa série no período analisado. A recuperação é assimétrica: uma perda de metade exige dobrar para voltar ao topo. O período submerso — o intervalo entre o pico e a volta a ele — costuma informar mais que a profundidade isolada, e alimenta razões como Calmar e Ulcer. O valor depende da frequência de amostragem: série de fechamento diário mostra drawdown menor que série intradiária, e série mensal menor ainda, então comparar números de fontes diferentes exige checar a base."
  },
  "en": {
   "iniciante": "It is the size of the fall from the highest point to the lowest. A 30% drawdown means the portfolio was at one stage worth 30% less than at its best. It is the number that shows how big a fright the investment has already given.",
   "medio": "Unlike volatility, drawdown speaks the investor's own language: how much the balance shrank against its peak. It works as a self-test — anyone who could not live through a 30% fall is holding a portfolio more aggressive than they can carry. The other half of the picture is time spent below the previous peak, which is usually far longer than the fall itself.",
   "expert": "<b>Drawdown at t = value at t / running maximum up to t − 1</b>, and maximum drawdown is the worst point of that series over the window. Recovery is asymmetric: losing half requires doubling to get back to the peak. The underwater period — the time between the peak and the return to it — usually tells you more than depth alone, and feeds ratios such as Calmar and Ulcer. The figure depends on sampling frequency: daily closing data shows a smaller drawdown than intraday data, and monthly data smaller still, so numbers from different sources need their basis checked before comparison."
  }
 },
 {
  "k": "ebitda",
  "t": "EBITDA (lucro antes de juros, impostos e depreciação)",
  "te": "EBITDA (earnings before interest, taxes, depreciation and amortisation)",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "É o lucro que a operação da empresa gera antes de descontar juros, impostos e o desgaste de máquinas e instalações. Dá uma ideia de quanto dinheiro o negócio em si produz, separado das dívidas e da contabilidade.",
   "medio": "Serve para comparar empresas com estruturas de dívida e situações fiscais diferentes, colocando todas na mesma régua operacional. O múltiplo mais usado a partir dele é dívida líquida sobre EBITDA, que mede alavancagem. O limite é conhecido: o EBITDA ignora os investimentos necessários só para manter o negócio de pé, então empresa intensiva em capital aparenta gerar mais caixa do que gera.",
   "expert": "<b>EBITDA = resultado operacional + depreciação + amortização</b>. Não é fluxo de caixa: ficam de fora o capex de manutenção, a variação de capital de giro e os juros e impostos efetivamente pagos. EV/EBITDA neutraliza a estrutura de capital e por isso vira o múltiplo padrão em comparação entre pares e em fusões e aquisições. O caso de borda é o <i>EBITDA ajustado</i>, medida não contábil e sem definição padronizada: cada empresa decide o que trata como não recorrente, e é aí que a comparação entre pares perde o sentido."
  },
  "en": {
   "iniciante": "It is the profit the company's operations generate before interest, taxes and the wear and tear of machines and buildings are deducted. It gives a sense of how much cash the business itself produces, separate from its debts and its accounting.",
   "medio": "It lets you compare companies with different debt structures and tax situations on the same operating ruler. The multiple built on it is net debt to EBITDA, which measures leverage. Its limit is well known: EBITDA ignores the investment needed simply to keep the business running, so capital-intensive companies look like better cash generators than they are.",
   "expert": "<b>EBITDA = operating result + depreciation + amortisation</b>. It is not cash flow: maintenance capex, working capital movements and the interest and tax actually paid all sit outside it. EV/EBITDA strips out capital structure, which is why it became the standard multiple for peer comparison and for M&A. The edge case is <i>adjusted EBITDA</i>, a non-accounting measure with no standard definition: each company chooses what counts as non-recurring, and that is where peer comparison quietly breaks down."
  }
 },
 {
  "k": "efeito-manada",
  "t": "Efeito manada (herd behavior)",
  "te": "Herd behaviour",
  "c": "Comportamento",
  "ce": "Behaviour",
  "pt": {
   "iniciante": "É a tendência de comprar o que todo mundo está comprando, quase sempre depois de já ter subido muito. A notícia e a conversa chegam quando a alta já aconteceu, e a entrada acaba sendo no preço caro.",
   "medio": "O padrão clássico é comprar na euforia e vender no pânico, o contrário do que constrói resultado. Quem tem uma regra escrita de aporte, com valor e data definidos antes, tende a ser menos afetado, porque a decisão sai do calor do momento. O sinal de alerta mais comum é perceber que o motivo da compra é o desempenho recente do ativo, e não o que ele é.",
   "expert": "O fenômeno tem mais de uma raiz: cascatas informacionais, em que cada participante trata a ação alheia como informação e descarta a própria; risco de carreira dos gestores, para quem errar acompanhado custa menos do que errar sozinho; e retroalimentação de fluxo, quando a entrada de dinheiro valida o preço que atraiu o dinheiro. O efeito agregado aparece como momentum em prazos curtos seguido de reversão em prazos longos. Na pessoa física, ele se mede pela distância entre o retorno do fundo e o retorno do cotista médio, menor porque o dinheiro entra depois da alta e sai depois da queda."
  },
  "en": {
   "iniciante": "It is the pull to buy whatever everyone else is buying, almost always after it has already risen a lot. The news and the chatter arrive once the rise has happened, so the entry point ends up being the expensive one.",
   "medio": "The classic pattern is buying in euphoria and selling in panic, the opposite of what builds results. People who keep a written contribution rule, with the amount and the date set in advance, tend to be less affected, because the decision leaves the heat of the moment. The most common warning sign is noticing that the reason for buying is the asset's recent performance rather than what the asset is.",
   "expert": "The behaviour has several roots: informational cascades, where each participant treats others' actions as information and discards their own; career risk among managers, for whom being wrong in company costs less than being wrong alone; and flow feedback, where incoming money validates the very price that attracted it. In aggregate this shows up as short-horizon momentum followed by long-horizon reversal. For individuals it is measured by the gap between a fund's return and the average investor's return in that fund, which is lower because money arrives after the rise and leaves after the fall."
  }
 },
 {
  "k": "estate-tax",
  "t": "Estate tax (imposto sobre herança nos EUA)",
  "te": "Estate tax (US inheritance tax)",
  "c": "Internacional",
  "ce": "International",
  "pt": {
   "iniciante": "É um imposto americano sobre o que a pessoa deixa quando morre. Para quem não é dos Estados Unidos, ele pode alcançar a parte aplicada em ativos americanos que passar de US$ 60 mil. Não incide sobre o lucro do investimento, e sim sobre o valor transmitido.",
   "medio": "A alíquota chega a 40% sobre o que exceder o limite, e o processo lá é lento: o dinheiro pode ficar travado até a regularização junto ao fisco americano. Alcança ativos com <i>situs</i> americano, como ações de empresas dos EUA e ETFs listados lá, mesmo quando a conta está numa corretora fora do país. É o ponto em que quem acumula valores relevantes lá fora costuma esbarrar no planejamento sucessório.",
   "expert": "O critério é o situs do ativo, não a residência de quem investe: ação de empresa americana e ETF domiciliado nos EUA são bens americanos para esse fim, com alíquota de até 40% sobre o valor transmitido acima do limite de US$ 60 mil aplicável a não residentes. As mitigações que aparecem com mais frequência são ETFs UCITS domiciliados na Irlanda, que replicam os mesmos índices com situs fora dos EUA, conta conjunta com estrutura adequada, seguro de vida e holding offshore. Nenhuma é gratuita: cada uma tem contrapartida do lado brasileiro, em tributação de rendimentos, obrigações acessórias e custo de manutenção. Na prática é um trade-off entre duas jurisdições, decidido caso a caso e com assessoria própria."
  },
  "en": {
   "iniciante": "It is a US tax on what a person leaves behind when they die. For non-Americans it can reach the portion of US assets above US$ 60,000. It falls on the value transferred, not on the investment gain.",
   "medio": "The rate reaches 40% on whatever exceeds the threshold, and the process there is slow: the money can stay locked until matters are settled with the US tax authority. It catches assets with US <i>situs</i>, such as shares in US companies and ETFs listed there, even when the account sits with a broker outside the country. It is the point people run into once a meaningful amount has built up abroad.",
   "expert": "What matters is the situs of the asset, not the residence of the investor: US company shares and US-domiciled ETFs are American property for this purpose, with a rate up to 40% on value transferred above the US$ 60,000 threshold that applies to non-residents. The mitigations that come up most often are Irish-domiciled UCITS ETFs, which track the same indexes with situs outside the US, jointly held accounts with a suitable structure, life insurance, and an offshore holding company. None is free: each has a Brazilian-side counterpart in income taxation, reporting obligations and running cost. It ends up as a trade-off between two tax systems, settled case by case with proper advice."
  }
 },
 {
  "k": "etf",
  "t": "ETF — Exchange Traded Fund (fundo de índice negociado em bolsa)",
  "te": "ETF — Exchange Traded Fund",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É uma cestinha pronta de vários investimentos, comprada e vendida na bolsa como se fosse uma ação. Com uma cota de um ETF do S&P 500, você fica com um pedacinho das 500 maiores empresas americanas de uma vez. Em vez de escolher empresa por empresa, você leva o conjunto.",
   "medio": "É um dos caminhos mais simples e baratos de diversificar: a taxa de administração costuma ser baixa, muitas vezes abaixo de 0,1% ao ano nos ETFs de índice amplo. Como a negociação é em bolsa, entram no custo o spread de compra e venda e a corretagem, que não aparecem na taxa anunciada. E o que se acompanha depois não é só a taxa, e sim o quanto o ETF ficou atrás do índice que promete seguir.",
   "expert": "A comparação relevante é a <i>tracking difference</i> acumulada, e não apenas o tracking error: a primeira mostra o resultado efetivo contra o índice, a segunda só a volatilidade do desvio. Pesam ainda o método de replicação — física completa, amostral ou sintética via swap, esta com risco de contraparte — e a receita de empréstimo de ações, que pode devolver parte da taxa. O domicílio fiscal altera o retorno líquido: um ETF irlandês UCITS reduz a retenção sobre dividendos americanos para 15% e fica fora do alcance do estate tax dos EUA. No Brasil, ETFs de renda variável negociados na B3 não contam com a isenção mensal de ganho de capital que existe para ações."
  },
  "en": {
   "iniciante": "It is a ready-made basket of investments, bought and sold on the exchange just like a share. One unit of an S&P 500 ETF gives you a sliver of the 500 largest US companies at once. Instead of picking company by company, you take the whole set.",
   "medio": "It is one of the simplest and cheapest routes to diversification: the management fee is usually low, often under 0.1% a year on broad index ETFs. Because it trades on an exchange, the bid-ask spread and brokerage add to the cost and never appear in the headline fee. And what you follow afterwards is not only the fee but how far the ETF fell behind the index it promises to track.",
   "expert": "The comparison that matters is cumulative <i>tracking difference</i> rather than tracking error alone: the first shows the actual result against the index, the second only the volatility of the deviation. Replication method weighs in too — full physical, sampled, or synthetic via swap, the last carrying counterparty risk — along with securities lending revenue, which can return part of the fee. Tax domicile changes the net return: an Irish UCITS ETF cuts withholding on US dividends to 15% and sits outside the reach of US estate tax. In Brazil, equity ETFs traded on B3 do not get the monthly capital gains exemption that applies to shares."
  }
 },
 {
  "k": "ethereum",
  "t": "Ethereum (ETH)",
  "te": "Ethereum (ETH)",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "É a segunda maior criptomoeda. Diferente do Bitcoin, que funciona como moeda escassa, o Ethereum é uma plataforma sobre a qual outras aplicações são construídas. O ETH é a ficha usada para pagar o uso dessa plataforma.",
   "medio": "É a base da maior parte dos projetos de finanças descentralizadas e dos tokens que circulam por aí. Quem compra ETH fica exposto ao uso da rede, e não só à escassez da moeda — a tese é diferente da do Bitcoin. A rede opera por participação: quem trava ETH ajuda a validar transações e recebe remuneração na própria moeda. As taxas variam com a demanda, e parte delas é destruída em vez de ir para alguém.",
   "expert": "O Ethereum executa contratos inteligentes numa máquina virtual própria (EVM), e cada operação consome gas pago em ETH, o que torna a taxa uma função da disputa por espaço no bloco. O consenso é por prova de participação: validadores depositam ETH e podem perder parte do depósito por comportamento indevido. Como parte da taxa base é queimada, a emissão líquida pode ficar negativa em períodos de uso intenso e positiva em períodos calmos. Boa parte da atividade migrou para camadas de segunda ordem (rollups), que processam fora e registram prova na rede principal, o que desloca tanto as taxas quanto o risco técnico para essas camadas."
  },
  "en": {
   "iniciante": "It is the second largest cryptocurrency. Unlike Bitcoin, which works as a scarce currency, Ethereum is a platform other applications are built on. ETH is the token used to pay for using that platform.",
   "medio": "It underpins most decentralised finance projects and most of the tokens you come across. Buying ETH is exposure to how much the network gets used, not only to the scarcity of the coin, which makes the case different from Bitcoin's. The network runs on staking: locking up ETH helps validate transactions and earns a return paid in ETH. Fees move with demand, and part of them is destroyed rather than paid to anyone.",
   "expert": "Ethereum runs smart contracts on its own virtual machine (the EVM), and every operation burns gas paid in ETH, which makes the fee a function of competition for block space. Consensus is proof of stake: validators post ETH and can lose part of that deposit for misbehaviour. Because part of the base fee is burned, net issuance can turn negative in periods of heavy use and positive in quiet ones. Much of the activity has moved to layer-two rollups, which process off the main chain and post proofs back to it, shifting both the fees and the technical risk onto those layers."
  }
 },
 {
  "k": "evolucao-patrimonio",
  "t": "Evolução do patrimônio",
  "te": "Portfolio value over time",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "É a linha que mostra quanto a sua carteira valia em cada dia. O app tira uma foto do total toda vez que você abre, e essas fotos viram o gráfico. Serve para ver o caminho percorrido, não só o saldo de hoje.",
   "medio": "A linha sobe por dois motivos diferentes: valorização dos ativos e dinheiro novo aportado. Como o gráfico soma os dois, ele sozinho não responde se o investimento foi bem. Quem separa as duas coisas é o card de rentabilidade, que desconta os aportes. Há ainda um detalhe de leitura: os pontos são registrados nas visitas ao app, então semanas sem abrir ficam sem marcação.",
   "expert": "A série é amostrada por visita, não por pregão: dias sem abertura do app não geram ponto e o traçado apenas interpola visualmente entre as marcações existentes. Isso importa para retorno ponderado pelo tempo (TWR), que pressupõe marcação nos momentos de fluxo — quanto mais espaçados os pontos, maior a distorção quando houve aporte ou resgate no meio do intervalo. O viés também não é aleatório: a frequência de abertura tende a crescer em dias de movimento forte, concentrando pontos nos extremos. Para acompanhar patrimônio a linha cumpre o papel; para atribuição de desempenho, o número de rentabilidade é a referência."
  },
  "en": {
   "iniciante": "It is the line showing what your portfolio was worth on each day. The app takes a snapshot of the total every time you open it, and those snapshots become the chart. It shows the path travelled, not just today's balance.",
   "medio": "The line rises for two different reasons: assets gaining value, and new money you paid in. Since the chart adds both together, it cannot tell you on its own whether the investing went well. The return card is what separates them, because it strips out contributions. One more reading detail: points are recorded on visits to the app, so weeks without opening it leave no marks.",
   "expert": "The series is sampled per visit rather than per trading session: days without opening the app produce no point, and the line simply interpolates between the marks that exist. That matters for time-weighted return, which assumes a valuation at each cash flow — the wider the gaps between points, the greater the distortion when a contribution or withdrawal fell inside one. The bias is not random either: people open the app more on days of sharp movement, so points cluster at extremes. For tracking net worth the line does its job; for performance attribution, the return figure is the reference."
  }
 },
 {
  "k": "swing-cambial",
  "t": "Exposição cambial",
  "te": "Currency exposure",
  "c": "Internacional",
  "ce": "International",
  "pt": {
   "iniciante": "É a parte do seu dinheiro que está em outra moeda, normalmente o dólar. Quando o dólar sobe, essa parte passa a valer mais em reais, mesmo que o investimento lá fora não tenha mudado de preço.",
   "medio": "Funciona como amortecedor: quando o Brasil vai mal, o dólar costuma subir e essa fatia da carteira sobe junto, compensando parte da queda do resto. É uma das poucas proteções que ainda rendem alguma coisa enquanto protegem. O outro lado é que o câmbio oscila bastante, e em períodos de real forte a mesma exposição pesa contra o resultado.",
   "expert": "O dimensionamento usual parte do passivo, e não do ativo: quem gasta em reais e não pretende emigrar raramente carrega mais de 20% a 40% do patrimônio em moeda forte, e acima disso a posição deixa de funcionar como proteção e vira aposta direcional. Travar a exposição com contratos futuros não é de graça — o custo do hedge corresponde ao diferencial de juros entre as duas moedas, historicamente desfavorável para quem parte do real. Também convém separar dois conceitos que costumam ser confundidos: dá para ter ativo estrangeiro com o câmbio travado, e dá para ter exposição a dólar sem sair do Brasil."
  },
  "en": {
   "iniciante": "It is the part of your money held in another currency, usually the dollar. When the dollar rises, that part is worth more in reais even if the investment abroad has not moved at all.",
   "medio": "It works as a shock absorber: when Brazil does badly the dollar tends to rise, and that slice of the portfolio rises with it, cushioning part of the fall elsewhere. It is one of the few protections that still earn something while protecting. The flip side is that exchange rates swing hard, and in periods of a strong real the same exposure drags on the result.",
   "expert": "Sizing normally starts from liabilities rather than assets: someone who spends in reais and does not plan to emigrate rarely holds more than 20% to 40% of their wealth in hard currency, and beyond that the position stops being protection and becomes a directional bet. Hedging the exposure with futures is not free — the cost of the hedge is the interest rate differential between the two currencies, historically unfavourable from the real side. It is also worth keeping two ideas apart: you can hold foreign assets with the currency hedged, and you can hold dollar exposure without leaving Brazil."
  }
 },
 {
  "k": "fgc",
  "t": "FGC",
  "te": "FGC (Brazil's bank deposit guarantee fund)",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "É um fundo, bancado pelos próprios bancos, que devolve o seu dinheiro até R$ 250 mil por banco se a instituição quebrar. Funciona como um seguro da renda fixa bancária, e você não paga nada a mais por ele.",
   "medio": "Cobre poupança, CDB, LCI, LCA, letras de câmbio e o saldo em conta. Não cobre fundos de investimento, ações, debêntures, CRI, CRA nem Tesouro Direto — esse último não precisa, porque é garantido pelo próprio governo. É também o que explica banco pequeno conseguir pagar mais que banco grande no CDB: dentro do teto, o risco de crédito fica com o fundo. O limite vale por CPF e por conglomerado financeiro, então duas marcas do mesmo grupo somam no mesmo teto.",
   "expert": "O teto é de R$ 250 mil por CPF e por conglomerado, com limite global de R$ 1 milhão renovável a cada 4 anos — acionar a garantia consome parte desse teto global. A cobertura alcança principal e juros até a data da intervenção, o que muda a conta de quanto aplicar em um único emissor. O pagamento não é imediato: leva semanas ou meses após a decretação, e nesse intervalo o dinheiro não rende nem está disponível, um custo de oportunidade e um risco de liquidez que a taxa contratada não mostra. Crédito privado como CRI, CRA e debêntures fica fora da cobertura mesmo quando distribuído pelo mesmo banco."
  },
  "en": {
   "iniciante": "FGC is a fund paid for by the banks themselves that gives your money back, up to R$ 250,000 per bank, if the institution fails. It works like insurance on bank fixed income, and costs you nothing extra.",
   "medio": "It covers savings accounts, CDB, LCI, LCA, letras de câmbio and current account balances. It does not cover investment funds, shares, debentures, CRI, CRA or Tesouro Direto — the last one does not need it, being backed by the government itself. It is also why a small bank can pay more than a large one on a CDB: inside the ceiling, the credit risk sits with the fund. The limit applies per taxpayer and per financial conglomerate, so two brands in the same group share one ceiling.",
   "expert": "The ceiling is R$ 250,000 per taxpayer per conglomerate, within a global cap of R$ 1 million that renews every 4 years — using the guarantee consumes part of that global cap. Cover includes principal plus interest accrued to the date of intervention, which changes the arithmetic of how much to place with a single issuer. Payment is not immediate: it takes weeks or months after the regulator steps in, and during that gap the money neither earns nor is available, an opportunity cost and a liquidity risk the contracted rate never shows. Private credit such as CRI, CRA and debentures falls outside the cover even when sold through the same bank."
  }
 },
 {
  "k": "fii",
  "t": "FII (Fundo Imobiliário)",
  "te": "FII (Brazilian listed property fund)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É um jeito de investir em imóveis sem comprar um imóvel: você compra cotas na bolsa, a partir de poucos reais, e recebe uma parte dos aluguéis todo mês. Quem cuida dos imóveis e dos contratos é um gestor profissional.",
   "medio": "Há dois grandes grupos: fundos de tijolo, donos de shoppings, galpões e lajes corporativas, e fundos de papel, que emprestam para o setor imobiliário via CRI. Os rendimentos mensais distribuídos à pessoa física são isentos de IR quando o fundo e o cotista cumprem as condições previstas em lei. A venda da cota com lucro, essa sim, é tributada — a isenção é do rendimento, não do ganho de capital. Vacância e inadimplência aparecem direto no valor distribuído, então o rendimento mensal não é fixo.",
   "expert": "A leitura padrão combina P/VP, vacância física e financeira, cap rate, alavancagem, prazo e indexação dos contratos e concentração de inquilinos — poucos locatários produzem um risco parecido com o de crédito concentrado. Em fundos de papel, o indexador dos CRI define o comportamento no ciclo de juros: carteira em CDI acompanha a Selic de perto, carteira em IPCA sofre marcação quando o juro real longo abre. A isenção de IR sobre os rendimentos é condicionada — fundo negociado em bolsa, número mínimo de cotistas e participação individual pequena, requisitos definidos em lei que um cotista grande rompe sozinho. Já o ganho na venda da cota é tributado, sem a isenção mensal que existe para ações."
  },
  "en": {
   "iniciante": "An FII is a way to invest in property without buying a property: you buy units on the exchange, from a few reais upwards, and receive a share of the rent every month. A professional manager looks after the buildings and the contracts.",
   "medio": "There are two broad families: brick funds, which own shopping centres, warehouses and office floors, and paper funds, which lend to the property sector through CRI notes. Monthly distributions to individuals are free of income tax when the fund and the unitholder meet the conditions set in law. Selling the units at a profit, however, is taxed — the exemption covers the income, not the capital gain. Vacancy and late rent feed straight into the amount distributed, so the monthly payout is not fixed.",
   "expert": "The standard read combines price to book, physical and financial vacancy, cap rate, leverage, contract length and indexation, and tenant concentration — a handful of tenants produces something close to concentrated credit risk. In paper funds the index on the CRI portfolio drives behaviour through the rate cycle: a CDI-linked book tracks Selic closely, while an IPCA-linked book is marked down when long real yields widen. The income tax exemption is conditional — an exchange-traded fund, a minimum number of unitholders and a small individual stake, requirements set in law that one large holder can break alone. The gain on selling units is taxed, without the monthly exemption that shares enjoy."
  }
 },
 {
  "k": "fundo",
  "t": "Fundo de investimento",
  "te": "Investment fund",
  "c": "Fundos",
  "ce": "Funds",
  "pt": {
   "iniciante": "É um condomínio de dinheiro: várias pessoas colocam junto e um gestor profissional decide onde aplicar. Você compra cotas, e o valor delas sobe ou desce conforme os investimentos do fundo. É uma forma de ter uma carteira montada sem montar você mesmo.",
   "medio": "Você paga taxa de administração, fixa e cobrada ao ano sobre o valor aplicado, e às vezes taxa de performance, uma fatia do que passar de um índice combinado. Fundos de renda fixa e multimercado sofrem come-cotas duas vezes por ano: o IR é recolhido antecipadamente e reduz o número de cotas, sem você fazer nada. O outro ponto prático é o prazo de resgate — o D+ do regulamento diz quando o dinheiro cai na conta, e pode ser bem depois do pedido.",
   "expert": "A avaliação só faz sentido contra o benchmark correto e ajustada ao risco: Sharpe, Sortino e alfa de Jensen medem coisas distintas, e um fundo pode bater o índice apenas por carregar mais risco. Do lado operacional, o que costuma escapar é a soma do prazo de cotização com o de liquidação — juntos definem quanto tempo o dinheiro fica fora do seu alcance, e o atraso pesa exatamente nos momentos de estresse. Patrimônio líquido, concentração da carteira e turnover indicam capacidade de gestão e custo implícito de negociação. O come-cotas antecipa o IR e reduz a base que continua composta, então dois fundos com o mesmo retorno bruto e regimes tributários diferentes terminam longe um do outro no longo prazo."
  },
  "en": {
   "iniciante": "It is a pool of money: several people put cash in together and a professional manager decides where to invest it. You buy units, and their value rises or falls with the fund's investments. It is a way to hold a built portfolio without building it yourself.",
   "medio": "You pay a management fee, fixed and charged annually on the amount invested, and sometimes a performance fee, a slice of whatever beats an agreed index. Fixed income and multimarket funds are hit by come-cotas twice a year: tax is collected in advance and cancels units, with nothing for you to do. The other practical point is the redemption timetable — the D+ in the rules says when the money lands, and it can be well after the request.",
   "expert": "Assessment only works against the right benchmark and adjusted for risk: Sharpe, Sortino and Jensen's alpha measure different things, and a fund can beat its index purely by carrying more risk. Operationally, what usually escapes attention is the sum of the pricing period and the settlement period — together they set how long the money is out of reach, and the delay bites precisely in stressed markets. Fund size, portfolio concentration and turnover indicate capacity and the implicit cost of trading. Come-cotas (a twice-yearly tax withheld inside Brazilian funds) pulls tax forward and shrinks the base that keeps compounding, so two funds with the same gross return and different tax treatment end up far apart over long horizons."
  }
 },
 {
  "k": "halving",
  "t": "Halving (corte pela metade da emissão)",
  "te": "Halving (issuance cut in half)",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "É o evento que corta pela metade a quantidade de bitcoins novos criados, e acontece a cada quatro anos, mais ou menos. Faz parte do desenho original da rede: a emissão vai diminuindo com o tempo.",
   "medio": "É escassez programada em código, não decisão de alguém no meio do caminho. Historicamente o evento antecedeu ciclos de alta, mas quatro ocorrências são amostra pequena demais para virar regra. E, como a data é conhecida de antemão, o mercado tem tempo de sobra para precificar o que espera dela.",
   "expert": "A recompensa por bloco cai pela metade em intervalos fixos de blocos; como o protocolo ajusta a dificuldade para manter o ritmo médio de mineração, o intervalo em tempo fica perto de quatro anos. O efeito imediato é na receita dos mineradores, que cai pela metade de um bloco para o outro — operações com custo de energia alto saem do ar até a dificuldade se reajustar. No longo prazo, a remuneração da segurança da rede migra da emissão para as taxas de transação, e essa é a transição estrutural que o desenho impõe. Do ponto de vista de preço, um evento datado e conhecido por todos não é surpresa, o que convive mal com a narrativa de ciclo pós-halving."
  },
  "en": {
   "iniciante": "It is the event that cuts the number of new bitcoins created in half, and it happens roughly every four years. It is part of the network's original design: issuance keeps shrinking over time.",
   "medio": "This is scarcity written into the code, not a decision someone makes along the way. Historically the event came before bull cycles, but four occurrences are far too small a sample to call it a rule. And because the date is known in advance, the market has plenty of time to price in whatever it expects from it.",
   "expert": "The block reward halves at fixed block intervals; since the protocol adjusts difficulty to keep the average mining pace steady, the interval in calendar time lands near four years. The immediate effect is on miner revenue, which halves from one block to the next — operations with high energy costs shut down until difficulty readjusts. Over the long run, paying for network security shifts from issuance to transaction fees, and that is the structural transition the design forces. On price, an event with a known date is not a surprise, which sits awkwardly with the post-halving cycle narrative."
  }
 },
 {
  "k": "home-broker",
  "t": "Home broker (a tela de ordens da corretora)",
  "te": "Home broker (the broker's order screen)",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "É a tela da corretora onde você digita as ordens de compra e venda. Você informa o ativo, a quantidade e o preço, e a ordem segue para o mercado.",
   "medio": "Ordem a mercado executa no melhor preço disponível naquele instante; ordem limitada só executa no preço que você definiu ou melhor, e pode simplesmente não executar. O livro de ofertas mostra quem está comprando e vendendo em cada preço, e é ele que determina se a ordem sai inteira ou em pedaços. Em ativo pouco negociado, uma ordem a mercado pode sair bem longe do preço que aparecia na tela.",
   "expert": "Além de mercado e limitada, existem ordens condicionadas — stop de perda e start de entrada — que só entram no livro quando o preço toca o gatilho, e por isso não garantem execução no nível configurado quando a abertura vem com gap. A B3 abre e fecha em leilão: nesses períodos as ordens se acumulam formando um preço teórico, e ordem a mercado enviada no leilão executa no preço de fechamento do call, não no último negócio do contínuo. O custo real soma corretagem, emolumentos e o spread entre compra e venda, e em ativo ilíquido o spread costuma superar a corretagem. Ordem grande move o próprio preço à medida que consome níveis do livro, efeito que não aparece na simulação."
  },
  "en": {
   "iniciante": "It is the broker's screen where you type buy and sell orders. You enter the asset, the quantity and the price, and the order goes out to the market.",
   "medio": "A market order fills at the best price available right then; a limit order only fills at your price or better, and may not fill at all. The order book shows who is buying and selling at each price, and it decides whether your order fills in one go or in pieces. In a thinly traded asset, a market order can fill a long way from the price shown on screen.",
   "expert": "Beyond market and limit there are conditional orders — stop loss and stop entry — which only reach the book once the price touches the trigger, so they guarantee nothing at the configured level when the market opens with a gap. B3 opens and closes with an auction: orders pile up forming a theoretical price, and a market order sent into the auction fills at the call's closing price, not at the last continuous trade. Real cost is brokerage plus exchange fees plus the bid-ask spread, and in illiquid names the spread usually exceeds the brokerage. A large order moves the price itself as it eats through book levels, an effect that never shows up in a simulation."
  }
 },
 {
  "k": "horizonte",
  "t": "Horizonte de investimento",
  "te": "Investment horizon",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É o prazo em que você vai precisar do dinheiro. Dinheiro para daqui a vinte anos consegue conviver com sobe-e-desce; dinheiro para daqui a um ano, não. Definir o prazo antes evita ter que vender no pior momento.",
   "medio": "O prazo é o que determina o tipo de investimento que cabe: curto prazo pede liquidez e pouca oscilação, longo prazo abre espaço para aceitar oscilação em troca de retorno esperado maior. O erro frequente é misturar horizontes na mesma conta — aí a reserva de emergência acaba aplicada em algo que pode estar no vermelho justamente quando ela é necessária. Separar por objetivo, com uma data aproximada em cada um, resolve boa parte disso.",
   "expert": "A relação entre prazo e risco depende da autocorrelação dos retornos: havendo reversão à média, o risco anualizado cai mais rápido que a raiz do tempo; se os retornos forem independentes, não cai. A chamada diversificação temporal é exatamente esse ponto em disputa — o desvio-padrão do retorno anualizado diminui com o horizonte, enquanto a dispersão do valor final aumenta, e as duas afirmações são verdadeiras ao mesmo tempo. Na prática, o horizonte relevante não é a data do objetivo, e sim a duração dos fluxos: quem vai sacar aos poucos durante anos tem horizonte médio maior do que a data do primeiro saque sugere. E o risco que de fato morde é o de precisar vender dentro de um drawdown, o que liga horizonte a liquidez, não só a volatilidade."
  },
  "en": {
   "iniciante": "It is how long before you need the money. Cash you need in twenty years can live with ups and downs; cash you need in one year cannot. Setting the horizon in advance is what stops you having to sell at the worst moment.",
   "medio": "The horizon is what decides which investments fit: short horizons call for liquidity and little movement, long ones leave room to accept swings in exchange for a higher expected return. The common mistake is mixing horizons in the same pot, which is how an emergency fund ends up invested in something that may be underwater exactly when it is needed. Splitting by goal, each with an approximate date, handles most of that.",
   "expert": "The link between horizon and risk depends on the autocorrelation of returns: with mean reversion, annualised risk falls faster than the square root of time; with independent returns, it does not fall at all. Time diversification is precisely that disputed point — the standard deviation of the annualised return shrinks with the horizon while the dispersion of the final amount grows, and both statements hold at once. In practice the relevant horizon is not the date of the goal but the duration of the cash flows: someone withdrawing gradually over years has a longer average horizon than the first withdrawal date suggests. And the risk that actually bites is being forced to sell inside a drawdown, which ties horizon to liquidity, not only to volatility."
  }
 },
 {
  "k": "bvsp",
  "t": "IBOV e ^BVSP",
  "te": "IBOV and ^BVSP",
  "c": "Índices",
  "ce": "Indexes",
  "pt": {
   "iniciante": "IBOV é o apelido do Ibovespa, o índice da bolsa brasileira. O código ^BVSP é a forma como sites e aplicativos identificam esse índice na hora de buscar a cotação. É um nome técnico para a mesma coisa.",
   "medio": "Índices costumam aparecer com o acento circunflexo na frente: ^BVSP (Ibovespa), ^GSPC (S&P 500), ^IXIC (Nasdaq Composite), ^DJI (Dow Jones). Eles não são ativos para comprar, e sim medidas. Para investir no que o índice acompanha, o caminho é o ETF correspondente, como BOVA11, VOO ou QQQ.",
   "expert": "O circunflexo é convenção de provedor de dados para separar índice de ticker negociável, e cada provedor tem a sua — o mesmo índice muda de código entre fontes, causa comum de erro em planilhas e integrações. Índice não tem livro de ofertas nem liquidez própria: o que se negocia sobre ele são ETFs, contratos futuros (cheio e mini) e opções. O ETF não entrega o índice exatamente, porque taxa, caixa, tributação de dividendos e método de replicação produzem diferença acumulada ao longo do tempo. Comparar carteira com índice de preço quando o veículo reinveste proventos, ou o contrário, embute um viés que cresce com o prazo."
  },
  "en": {
   "iniciante": "IBOV is the nickname for the Ibovespa, Brazil's main stock index. The code ^BVSP is how websites and apps identify that index when fetching a quote. It is a technical name for the same thing.",
   "medio": "Indexes usually carry that caret in front: ^BVSP (Ibovespa), ^GSPC (S&P 500), ^IXIC (Nasdaq Composite), ^DJI (Dow Jones). They are not assets you can buy, they are measures. To invest in what an index tracks, the route is the matching ETF, such as BOVA11, VOO or QQQ.",
   "expert": "The caret is a data-provider convention separating an index from a tradable ticker, and every provider has its own — the same index changes code between sources, a common cause of broken spreadsheets and integrations. An index has no order book and no liquidity of its own: what trades on it are ETFs, futures (full and mini contracts) and options. The ETF does not deliver the index exactly, because fees, cash drag, dividend taxation and replication method build a cumulative gap over time. Comparing a portfolio against a price index while the vehicle reinvests distributions, or the reverse, builds in a bias that grows with the holding period."
  }
 },
 {
  "k": "ibovespa",
  "t": "Ibovespa",
  "te": "Ibovespa",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É o principal termômetro da bolsa brasileira: acompanha as ações mais negociadas do país. Quando o noticiário diz que a bolsa subiu, é dele que está falando.",
   "medio": "Serve de referência para comparação: se a sua carteira de ações rendeu menos que o Ibovespa no mesmo período, você ficou atrás do mercado. A composição é concentrada em poucos setores, sobretudo commodities e bancos, então o índice reage forte a minério, petróleo e juros. Isso também explica por que uma carteira com outro perfil pode se descolar bastante dele sem que nenhum dos dois esteja errado.",
   "expert": "É índice de retorno total: proventos entram como reinvestimento, então comparar com uma carteira sem somar os dividendos recebidos subestima a carteira de forma sistemática. A ponderação é por free float ajustada por critério de liquidez, com carteira teórica rebalanceada quadrimestralmente e exigência mínima de presença em pregão. A concentração em commodities e bancos faz o índice funcionar quase como proxy de câmbio e juros, o que limita seu uso como referência para carteiras de outro recorte — dividendos, small caps ou setores defensivos pedem índice do mesmo perfil."
  },
  "en": {
   "iniciante": "It is the main thermometer of the Brazilian stock market, tracking the country's most traded shares. When the news says the market rose, this is the index it means.",
   "medio": "It serves as a yardstick: if your equity portfolio returned less than the Ibovespa over the same period, you lagged the market. Its composition is concentrated in a few sectors, mainly commodities and banks, so the index reacts strongly to iron ore, oil and interest rates. That also explains why a portfolio with a different profile can drift a long way from it without either being wrong.",
   "expert": "It is a total return index: distributions are treated as reinvested, so comparing it with a portfolio whose dividends are left out understates the portfolio systematically. Weighting is by free float adjusted for a liquidity criterion, with the theoretical portfolio rebalanced every four months and a minimum trading-presence requirement. Concentration in commodities and banks makes the index behave almost as a proxy for the currency and for rates, which limits its use as a benchmark for portfolios of another kind — dividend, small cap or defensive strategies need an index of the same profile."
  }
 },
 {
  "k": "idiv",
  "t": "IDIV, SMLL e outros índices da B3",
  "te": "IDIV, SMLL and other B3 indexes",
  "c": "Índices",
  "ce": "Indexes",
  "pt": {
   "iniciante": "São recortes do mercado brasileiro: o IDIV reúne as empresas que mais pagam dividendos e o SMLL reúne as empresas menores, as small caps. Existem outros, como IBRX-100, ICON (consumo) e IEE (energia elétrica). Cada um mostra como foi um pedaço específico da bolsa.",
   "medio": "Cada recorte tem um ETF que o segue: DIVO11 para o IDIV, SMAL11 para o SMLL. O uso prático é de comparação — uma carteira montada para dividendos se mede contra o IDIV, e não contra o Ibovespa, porque contra o índice errado a conclusão sai torta. Vale o mesmo para carteira de small caps, que num ano de alta de commodities pode parecer fraca só por estar sendo medida contra o índice geral.",
   "expert": "Cada índice tem critério próprio de seleção — liquidez, presença em pregão e, no caso do IDIV, histórico de proventos em relação ao preço —, com carteira teórica revisada periodicamente. Usar a referência errada contamina a atribuição de desempenho: a diferença medida vira em boa parte diferença de fator (dividendo, tamanho, setor) e não habilidade de quem escolheu os papéis. Os ETFs desses recortes têm patrimônio e volume bem menores que os de índice amplo, então spread de negociação e desvio contra o índice tendem a ser maiores. E índice setorial concentra poucos nomes, de modo que o resultado acaba dominado pelas maiores posições."
  },
  "en": {
   "iniciante": "These are slices of the Brazilian market: IDIV gathers the biggest dividend payers and SMLL gathers the smaller companies. There are others, such as IBRX-100, ICON (consumer) and IEE (electric utilities). Each one shows how a specific corner of the exchange performed.",
   "medio": "Each slice has an ETF tracking it: DIVO11 for IDIV, SMAL11 for SMLL. The practical use is comparison — a portfolio built for dividends is measured against IDIV rather than the Ibovespa, because the wrong index gives a crooked conclusion. The same holds for a small cap portfolio, which in a strong commodity year can look weak purely because it is being judged against the broad index.",
   "expert": "Each index has its own selection criteria — liquidity, trading presence and, for IDIV, a history of distributions relative to price — with the theoretical portfolio reviewed periodically. Using the wrong reference contaminates performance attribution: most of the measured difference turns out to be factor difference (dividend, size, sector) rather than skill in picking names. ETFs on these slices carry far smaller assets and volume than broad-index ones, so trading spreads and deviation from the index both tend to be wider. And sector indexes hold few names, which leaves the result dominated by the largest positions."
  }
 },
 {
  "k": "ifix",
  "t": "IFIX",
  "te": "IFIX",
  "c": "Índices",
  "ce": "Indexes",
  "pt": {
   "iniciante": "É o índice dos fundos imobiliários, uma espécie de Ibovespa dos FIIs. Serve para saber se a sua carteira de FIIs foi melhor ou pior que a média do setor.",
   "medio": "Reúne os FIIs mais líquidos da B3, ponderados por valor de mercado. É calculado com os rendimentos reinvestidos, ou seja, é índice de retorno total: a variação divulgada já embute os proventos distribuídos. Como a carteira é dominada pelos fundos maiores, ele descreve melhor os grandes do que o setor inteiro.",
   "expert": "A carteira teórica reúne os FIIs que atendem a critérios de liquidez e presença em pregão, com ponderação por valor de mercado das cotas em circulação e revisão periódica. Por ser índice de retorno total, comparar a variação do IFIX com a variação de preço de uma carteira de FIIs, sem somar os rendimentos recebidos, subestima a carteira de maneira sistemática — e o erro cresce com o prazo e com o yield. A composição mistura fundos de tijolo e de papel, cujos comportamentos divergem no ciclo de juros, então o índice pode esconder dispersão grande entre os componentes. A concentração nos maiores fundos faz o desempenho depender de poucos nomes."
  },
  "en": {
   "iniciante": "It is the index of Brazilian listed property funds, a sort of Ibovespa for FIIs. It tells you whether your FII portfolio did better or worse than the sector average.",
   "medio": "It gathers the most liquid FIIs on B3, weighted by market value. It is calculated with distributions reinvested, which makes it a total return index: the published change already includes the income paid out. Because the portfolio is dominated by the largest funds, it describes the big names better than it describes the whole sector.",
   "expert": "The theoretical portfolio holds the FIIs that meet liquidity and trading-presence criteria, weighted by the market value of units in circulation and reviewed periodically. Being a total return index, comparing the IFIX move with the price move of an FII portfolio, without adding the income received, understates the portfolio systematically — and the error grows with the holding period and with the yield. The composition mixes brick and paper funds, whose behaviour diverges through the rate cycle, so the index can hide wide dispersion among its components. Concentration in the largest funds leaves performance dependent on a handful of names."
  }
 },
 {
  "k": "sharpe",
  "t": "Índice de Sharpe",
  "te": "Sharpe ratio",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "Todo investimento oscila: sobe e desce pelo caminho. O Índice de Sharpe é uma nota que compara quanto ele rendeu a mais com o tamanho desse sobe e desce. Quanto maior a nota, melhor foi o retorno em relação ao sacolejo que o investidor teve de aguentar.",
   "medio": "Sharpe = (retorno do ativo − taxa livre de risco) ÷ volatilidade. Serve para comparar fundos de mandato parecido: entre dois que renderam igual, o de Sharpe maior chegou lá com menos oscilação. Abaixo de zero, o ativo rendeu menos que a taxa livre de risco — no Brasil, o CDI. O número depende inteiramente da janela escolhida, então Sharpe de períodos diferentes não se compara.",
   "expert": "S = (Rp − Rf) / σp, com σp o desvio-padrão dos retornos do próprio período. A medida penaliza igualmente a oscilação para cima e para baixo, o que distorce a leitura de estratégias assimétricas; o Sortino troca σp pelo desvio apenas dos retornos negativos. Em fundos com ativos ilíquidos e marcação suavizada, a volatilidade medida sai artificialmente baixa e o Sharpe, inflado. A anualização por √252 pressupõe retornos independentes, o que séries com autocorrelação não cumprem. No Brasil, Rf costuma ser o CDI."
  },
  "en": {
   "iniciante": "Every investment moves up and down along the way. The Sharpe ratio is a score comparing the extra return an investment delivered against the size of those swings. A higher score means the return came with less of a rough ride.",
   "medio": "Sharpe = (return − risk-free rate) ÷ volatility. It compares funds with a similar mandate: where two returned the same, the one with the higher Sharpe got there with smaller swings. Below zero, the asset returned less than the risk-free rate — in Brazil, the CDI. The figure depends entirely on the window chosen, so Sharpe ratios measured over different periods are not comparable.",
   "expert": "S = (Rp − Rf) / σp, where σp is the standard deviation of the period's own returns. It punishes upside and downside variation alike, which misreads asymmetric strategies; Sortino replaces σp with the deviation of negative returns only. Funds holding illiquid assets with smoothed pricing report artificially low volatility and therefore an inflated Sharpe. Annualising by √252 assumes independent returns, an assumption autocorrelated series break. In Brazil, Rf is normally the CDI."
  }
 },
 {
  "k": "inflacao",
  "t": "Inflação",
  "te": "Inflation",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "Inflação é o encarecimento geral das coisas ao longo do tempo. Com ela, os mesmos R$ 100 compram menos daqui a um ano do que compram hoje. É por isso que dinheiro parado perde valor mesmo sem ninguém tirar nada dele.",
   "medio": "A inflação separa o rendimento nominal, que é o número do extrato, do rendimento real, que é o que sobra depois de descontá-la. Render 10% num ano de inflação de 8% significa ganhar cerca de 1,9% de poder de compra, não 2%. No Brasil o índice oficial é o IPCA, e é contra ele que se mede se a carteira andou para frente. Aplicações pós-fixadas acompanham a alta de juros que costuma vir junto; prefixadas travam uma taxa e ficam expostas se a inflação surpreender.",
   "expert": "Retorno real = (1 + nominal) / (1 + inflação) − 1, a relação de Fisher; a subtração simples só aproxima bem com taxas baixas. No Brasil o IPCA é o índice oficial, e contratos e títulos indexados também usam IGP-M e IPCA-15. Papéis atrelados ao IPCA pagam o índice mais um cupom real, mas a correção entra com defasagem de apuração e divulgação, o que gera ruído de curto prazo no preço. Inflação surpresa transfere riqueza do credor prefixado para o devedor; a esperada já está embutida na curva, e a diferença entre a taxa nominal e a real de mesmo prazo é a inflação implícita."
  },
  "en": {
   "iniciante": "Inflation is the general rise in prices over time. Because of it, the same R$ 100 buys less a year from now than it buys today. That is why money left sitting still loses value even though nobody takes anything from it.",
   "medio": "Inflation separates the nominal return, the figure on your statement, from the real return, what is left once inflation is stripped out. Earning 10% in a year when inflation runs at 8% means gaining roughly 1.9% of purchasing power, not 2%. Brazil's official index is the IPCA, and that is the benchmark for whether a portfolio actually moved forward. Floating-rate holdings follow the interest-rate rises that usually accompany inflation; fixed-rate ones lock a rate and stay exposed if inflation surprises.",
   "expert": "Real return = (1 + nominal) / (1 + inflation) − 1, the Fisher relation; simple subtraction only approximates it well at low rates. In Brazil the IPCA is the official index, while indexed contracts and bonds also use IGP-M and IPCA-15. IPCA-linked paper pays the index plus a real coupon, but the indexation arrives with a measurement and publication lag, adding short-term noise to the price. Unexpected inflation transfers wealth from the fixed-rate lender to the borrower; expected inflation is already priced into the curve, and the gap between the nominal and the real rate of the same maturity is the breakeven inflation."
  }
 },
 {
  "k": "informe-rendimentos",
  "t": "Informe de rendimentos",
  "te": "Informe de rendimentos (annual tax statement)",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "É o papel que o banco ou a corretora manda uma vez por ano dizendo quanto você tinha lá e quanto rendeu. Ele existe para você copiar esses números na declaração do imposto de renda. Costuma ficar disponível no aplicativo da instituição a partir do início do ano.",
   "medio": "Cada instituição emite o seu, e é preciso juntar todos antes de declarar — banco, corretora, previdência. Na declaração, os bens entram na ficha de Bens e Direitos pelo custo de aquisição, não pelo valor de mercado do fim do ano. Ações, fundos e renda fixa têm códigos e grupos próprios dentro dessa ficha. Rendimentos isentos, tributados exclusivamente na fonte e tributáveis vão em fichas diferentes, e o informe já traz essa separação.",
   "expert": "O informe reporta saldo em 31/12, rendimentos por natureza tributária e IR retido na fonte, mas não substitui o controle de custo de aquisição: em renda variável, a apuração mensal de ganho de capital é responsabilidade do contribuinte, não da corretora. Divergências comuns aparecem em posições transferidas entre corretoras, onde o preço médio não viaja junto, e em proventos creditados no virar do ano. O informe da corretora também traz o dedo-duro retido na fonte, que alimenta o cruzamento da Receita Federal. Faltando o informe de uma instituição, a declaração ainda pode ser montada com extratos e notas de corretagem, que são a prova documental."
  },
  "en": {
   "iniciante": "It is the statement a bank or broker sends once a year saying how much you held with them and how much it earned. It exists so you can copy those figures into your income tax return. It normally appears in the institution's app from the start of the year.",
   "medio": "Every institution issues its own, so all of them have to be gathered before filing — bank, broker, pension provider. In the return, holdings go into the Bens e Direitos (assets and rights) section at acquisition cost, not at year-end market value. Shares, funds and fixed income each have their own codes and groups inside that section. Exempt income, income taxed exclusively at source and taxable income go on different forms, and the statement already separates them.",
   "expert": "The statement reports the 31 December balance, income split by tax treatment and tax withheld at source, but it does not replace your own cost-basis records: for equities, the monthly capital gains calculation is the taxpayer's job, not the broker's. Discrepancies turn up most often in positions transferred between brokers, where average cost does not travel with them, and in distributions credited across the year-end boundary. A broker's statement also lists the small withholding known as dedo-duro, which feeds Receita Federal's cross-checking. If an institution's statement never arrives, the return can still be built from account statements and trade notes, which are the documentary evidence."
  }
 },
 {
  "k": "investimento",
  "t": "Investimento",
  "te": "Investment",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Investir é colocar dinheiro em algum lugar esperando que ele cresça com o tempo. Você abre mão de gastar hoje para ter mais lá na frente. Diferente de guardar embaixo do colchão, o dinheiro investido trabalha — mas também pode encolher, e esse é o preço.",
   "medio": "Todo investimento se define por três dimensões que brigam entre si: retorno, risco e liquidez. Melhorar uma quase sempre piora outra — quem quer resgate imediato aceita render menos, quem quer render mais aceita oscilar ou travar prazo. Não existe aplicação que seja ao mesmo tempo a mais rentável, a mais segura e a mais líquida; quando um produto promete as três, a conta está escondida em algum lugar. Antes do produto, o que costuma decidir o resultado é o prazo do objetivo.",
   "expert": "Formalmente, investir é trocar consumo presente por um fluxo de caixa futuro incerto. O preço justo de um ativo é o valor presente desse fluxo, descontado a uma taxa que remunera o tempo — o juro livre de risco — e a incerteza — o prêmio de risco. Daí decorre que alta na taxa de desconto derruba preço sem que nada tenha mudado no negócio, e que ativos de fluxo distante são os mais sensíveis a ela. A parte do risco que a diversificação elimina não é remunerada; só o risco não diversificável entra no prêmio."
  },
  "en": {
   "iniciante": "Investing means putting money somewhere and expecting it to grow over time. You give up spending today to have more later on. Unlike cash under the mattress, invested money works — but it can also shrink, and that is the price of the deal.",
   "medio": "Every investment is defined by three dimensions that pull against each other: return, risk and liquidity. Improving one almost always worsens another — instant access comes with a lower yield, higher yields come with swings or a locked term. Nothing is simultaneously the most profitable, the safest and the most liquid; when a product claims all three, the cost is hidden somewhere. Before the product itself, what usually decides the outcome is the time horizon of the goal.",
   "expert": "Formally, investing exchanges present consumption for an uncertain future cash flow. An asset's fair price is the present value of that flow, discounted at a rate paying for time — the risk-free rate — and for uncertainty — the risk premium. It follows that a rising discount rate cuts the price even when nothing about the business changed, and that assets whose cash flows sit furthest out are the most sensitive to it. Risk that diversification removes earns no compensation; only non-diversifiable risk enters the premium."
  }
 },
 {
  "k": "investir-exterior",
  "t": "Investir no exterior",
  "te": "Investing abroad",
  "c": "Internacional",
  "ce": "International",
  "pt": {
   "iniciante": "É ter uma parte do dinheiro fora do Brasil, em geral em dólar, comprando ações ou fundos de lá. A ideia é não depender só da economia e da moeda de um país. Em troca, entra uma variável nova: além de o investimento subir ou descer, o dólar também mexe no resultado.",
   "medio": "Há três caminhos principais. Corretora internacional (Avenue, Nomad, Inter US, Schwab, IBKR) dá acesso direto a ações e ETFs lá fora. BDRs são recibos negociados na B3 que representam ações estrangeiras. E há ETFs brasileiros que seguem índices de fora, como IVVB11 e NASD11. Custo, tributação e forma de declarar mudam em cada um, e é aí que aparece a diferença de resultado líquido.",
   "expert": "Na conta final pesam o domicílio fiscal do veículo — fundo US-domiciled contra UCITS irlandês —, a retenção de 30% sobre dividendos americanos pagos a brasileiro e o estate tax americano, que atinge não residentes acima de US$ 60 mil em ativos situados nos EUA. Do lado brasileiro há a declaração de capitais brasileiros no exterior ao Banco Central acima do limite vigente, além da apuração própria de ganho de capital em moeda estrangeira. Veículos UCITS irlandeses costumam sofrer retenção menor sobre dividendos americanos e ficam fora do alcance do estate tax. BDR e ETF local resolvem a parte operacional, mas mantêm o investimento dentro do sistema tributário brasileiro, com regras de ganho e de isenção diferentes das da ação à vista."
  },
  "en": {
   "iniciante": "It means holding part of your money outside Brazil, usually in dollars, buying shares or funds abroad. The point is not to depend on a single country's economy and currency. In exchange, a new variable arrives: on top of the investment rising or falling, the dollar moves the result too.",
   "medio": "There are three main routes. An international broker (Avenue, Nomad, Inter US, Schwab, IBKR) gives direct access to foreign shares and ETFs. BDRs are receipts traded on the B3 that represent foreign shares. And Brazilian ETFs track overseas indices, such as IVVB11 and NASD11. Cost, taxation and reporting differ in each, and that is where the gap in net outcome shows up.",
   "expert": "What decides the final number: the vehicle's tax domicile — US-domiciled fund versus Irish UCITS —, the 30% withholding on US dividends paid to a Brazilian holder, and US estate tax, which reaches non-residents holding more than US$ 60,000 in US-situs assets. On the Brazilian side there is the CBE declaration of assets held abroad to the central bank above the prevailing threshold, plus self-assessed capital gains in foreign currency. Irish UCITS vehicles typically face lower withholding on US dividends and sit outside the reach of estate tax. BDRs and local ETFs solve the operational side but keep the investment inside the Brazilian tax system, with gain and exemption rules that differ from those of ordinary shares."
  }
 },
 {
  "k": "iof-regressivo",
  "t": "IOF nos 30 dias",
  "te": "IOF in the first 30 days",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "Se você resgatar uma aplicação de renda fixa antes de completar 30 dias, existe um imposto chamado IOF que morde o rendimento. No primeiro dia ele leva quase tudo e vai caindo a cada dia, até zerar no trigésimo. Passado esse prazo, o IOF não aparece mais.",
   "medio": "O IOF incide sobre o rendimento, nunca sobre o principal, e segue uma tabela regressiva diária: quase todo o ganho no primeiro dia, nada a partir do trigésimo. Ele é descontado antes do imposto de renda, então o IR do resgate curto incide só sobre o que sobrou. Vale para CDB, fundos de renda fixa e títulos do Tesouro, contando dias corridos desde cada aplicação — e cada aporte tem a sua própria contagem. Por isso os 30 dias costumam ser o divisor entre dinheiro de uso imediato e dinheiro aplicado; conta remunerada e Tesouro Selic são as alternativas mais citadas, e o mesmo prazo vale para elas.",
   "expert": "A tabela do IOF sobre resgates de renda fixa é regressiva por dia corrido: 96% do rendimento no primeiro dia, caindo em degraus até 0% no trigésimo. A base é o rendimento, e o IOF é apurado antes do IR, reduzindo a base sobre a qual a alíquota de IR do prazo incide. A contagem corre por aporte, não por conta: em aplicações com aportes sucessivos, cada parcela tem a sua idade e a ordem de consumo segue a regra do produto. Ações, FIIs e ETFs de renda variável não têm esse IOF; ele é específico de aplicações de renda fixa e fundos."
  },
  "en": {
   "iniciante": "Redeem a fixed income investment before it completes 30 days and a tax called IOF bites into the earnings. On day one it takes almost all of them, and it falls every day until it reaches zero on day thirty. After that window IOF no longer appears.",
   "medio": "IOF applies to the earnings, never to the principal, and follows a daily sliding scale: nearly the whole gain on day one, nothing from day thirty onward. It is deducted before income tax, so the income tax on a short redemption only reaches what survived. It covers CDBs, fixed income funds and Tesouro Direto bonds, counting calendar days from each contribution, and every contribution carries its own clock. That is why the 30-day mark usually separates spending money from invested money; a conta remunerada (interest-bearing current account) and Tesouro Selic are the alternatives most often mentioned, and the same rule applies to them.",
   "expert": "The IOF scale on fixed income redemptions is regressive by calendar day: 96% of the earnings on day one, stepping down to 0% on day thirty. The base is the earnings, and IOF is computed before income tax, shrinking the base the maturity-based income tax rate then applies to. The clock runs per contribution, not per account: where money goes in repeatedly, each tranche has its own age and the consumption order follows the product's rule. Shares, FIIs and equity ETFs carry no such IOF; it is specific to fixed income instruments and funds."
  }
 },
 {
  "k": "ipca",
  "t": "IPCA",
  "te": "IPCA",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "IPCA é o índice oficial da inflação no Brasil, calculado pelo IBGE. Quando o noticiário diz que a inflação do ano foi de 4%, é esse número. Ele serve de régua para saber se o dinheiro guardado ganhou ou perdeu poder de compra.",
   "medio": "Vários investimentos são atrelados ao IPCA: Tesouro IPCA+, debêntures, CRI e CRA. Todos pagam a variação do índice mais uma taxa fixa, o juro real, e é essa parte fixa que define o ganho acima da inflação. Como o índice é apurado e divulgado com defasagem, a correção chega ao papel algumas semanas depois do período medido. Comparar um papel IPCA+ com um pós-fixado só faz sentido olhando o prazo: no curto, quem manda é a Selic; no longo, a proteção contra inflação pesa mais.",
   "expert": "O IPCA mede a variação de preços da cesta de famílias com renda de 1 a 40 salários mínimos em regiões metropolitanas selecionadas, com pesos vindos da pesquisa de orçamentos familiares. A meta definida pelo CMN orienta a política monetária, e o Copom reage ao IPCA esperado à frente, não ao acumulado passado, por causa da defasagem de transmissão. O IPCA-15 usa a mesma metodologia com janela de coleta adiantada e funciona como prévia. Títulos indexados corrigem o principal pelo IPCA com defasagem de apuração, o que cria um carrego de curto prazo, positivo ou negativo conforme a inflação corrente."
  },
  "en": {
   "iniciante": "IPCA is Brazil's official inflation index, produced by the statistics agency IBGE. When the news says inflation ran at 4% for the year, that is the figure. It is the yardstick for whether money set aside gained or lost purchasing power.",
   "medio": "Several investments are linked to the IPCA: Tesouro IPCA+, debentures, CRIs and CRAs. They all pay the index plus a fixed rate, the real yield, and that fixed part determines the gain above inflation. Because the index is measured and published with a lag, the indexation reaches the paper some weeks after the period it covers. Comparing an IPCA-linked bond with a floating-rate one only makes sense against a horizon: over short periods the Selic dominates, over long ones the inflation protection weighs more.",
   "expert": "The IPCA tracks prices for households earning 1 to 40 minimum wages in selected metropolitan regions, weighted by the household budget survey. The inflation target set by the CMN steers monetary policy, and the Copom responds to expected IPCA ahead rather than the accumulated past, because of transmission lags. The IPCA-15 uses the same methodology over an earlier collection window and serves as a preview. Indexed bonds restate principal by the IPCA with a measurement lag, producing a short-term carry that turns positive or negative with current inflation."
  }
 },
 {
  "k": "ipo",
  "t": "IPO — Initial Public Offering (estreia da empresa na bolsa)",
  "te": "IPO — Initial Public Offering",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "IPO é a estreia de uma empresa na bolsa: a primeira vez que ela vende ações ao público em geral. Antes disso, só donos e investidores fechados participavam. Depois do IPO, qualquer pessoa pode comprar e vender aquelas ações no dia a dia.",
   "medio": "A oferta é montada por bancos coordenadores, que definem uma faixa de preço e coletam pedidos; se a demanda superar a oferta, o investidor de varejo recebe menos ações do que pediu, no rateio. Historicamente, o resultado de participar de IPO no varejo é irregular, e uma das razões é estrutural: a empresa e os sócios atuais escolhem o momento em que vender é mais vantajoso para eles. Vale distinguir oferta primária, em que o dinheiro entra no caixa da empresa, de secundária, em que vai para o bolso de sócios que estão saindo. O prospecto traz essa divisão e o destino dos recursos.",
   "expert": "O prospecto define oferta base, lote adicional e lote suplementar (greenshoe), este último exercido pelo coordenador para estabilizar o preço nos primeiros pregões. O bookbuilding forma o preço a partir das intenções dos institucionais, e o varejo em geral entra como tomador desse preço. Períodos de lock-up impedem sócios e administradores de vender por um prazo definido em contrato, e o vencimento desse prazo costuma coincidir com aumento de oferta no mercado. A assimetria de informação é máxima no IPO: o histórico público é curto e as demonstrações pró-forma passam por ajustes que não se repetem depois."
  },
  "en": {
   "iniciante": "An IPO is a company's debut on the stock exchange: the first time it sells shares to the general public. Before that, only owners and private investors held a stake. After the IPO, anyone can buy and sell those shares day to day.",
   "medio": "Coordinating banks build the offer, set a price range and collect orders; when demand exceeds supply, retail investors receive fewer shares than they asked for through pro-rata allocation. Historically, retail results from IPOs are uneven, and one reason is structural: the company and its current owners pick the moment when selling suits them best. It is worth separating a primary offer, where the money enters the company's balance sheet, from a secondary one, where it goes to departing shareholders. The prospectus sets out that split and the intended use of proceeds.",
   "expert": "The prospectus defines the base offer, the additional lot and the over-allotment (greenshoe) option, the last exercised by the coordinator to stabilise the price in the opening sessions. Bookbuilding forms the price from institutional indications of interest, and retail generally enters as a price taker. Lock-up periods bar founders and executives from selling for a contractually fixed term, and the expiry of that term often coincides with a jump in supply. Information asymmetry peaks at the IPO: the public track record is short and pro-forma statements carry adjustments that do not recur afterwards."
  }
 },
 {
  "k": "ir-acoes",
  "t": "IR sobre ações",
  "te": "Income tax on shares",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "No Brasil, quem vende até R$ 20 mil em ações dentro de um mês não paga imposto sobre o lucro dessa venda. Passando desse valor de vendas no mês, o imposto é de 15% sobre o ganho. Quem só compra e segura não paga nada: o imposto nasce na venda.",
   "medio": "A isenção de R$ 20 mil olha o total vendido no mês, não o lucro, e vale apenas para ações no mercado à vista — não alcança FII, ETF, BDR nem day trade, que é tributado em 20%. Quem apura é o investidor, não a corretora: o cálculo é mensal e o pagamento sai por DARF até o último dia útil do mês seguinte. Atrasar gera multa e juros sobre o valor devido. O ganho é a diferença entre o preço de venda e o preço médio de compra, já descontadas corretagem e emolumentos.",
   "expert": "Prejuízos compensam ganhos futuros da mesma modalidade, sem prazo de validade, desde que apurados e declarados mês a mês — prejuízo de swing trade não abate ganho de day trade, nem o contrário. A retenção do dedo-duro, de 0,005% na fonte, existe para identificar as operações no cruzamento da Receita Federal e pode ser deduzida do DARF do mês ou compensada adiante. O custo de aquisição é o preço médio ponderado das compras acrescido de corretagem e emolumentos; bonificações e desdobramentos ajustam quantidade e preço médio sem gerar ganho tributável no momento. A isenção mensal soma as vendas de todas as corretoras e se aplica por contribuinte, não por conta. DARF abaixo do valor mínimo de recolhimento não é pago no mês e se acumula para o seguinte."
  },
  "en": {
   "iniciante": "In Brazil, selling up to R$ 20,000 of shares within a single month means no tax on that profit. Sell more than that in the month and the tax is 15% on the gain. Buying and holding costs nothing: the tax is born at the sale.",
   "medio": "The R$ 20,000 exemption looks at the total sold in the month, not at the profit, and covers ordinary share trades only — it does not reach FIIs, ETFs, BDRs or day trading, which is taxed at 20%. The investor does the calculation, not the broker: it runs monthly and payment goes through a DARF by the last business day of the following month. Paying late adds a fine and interest on the amount owed. The gain is the difference between the sale price and the average purchase price, net of brokerage and exchange fees.",
   "expert": "Losses offset future gains of the same category, with no expiry, provided they are calculated and reported month by month — swing trade losses do not offset day trade gains, or the reverse. The dedo-duro, a 0.005% withholding at source, exists so Receita Federal can spot the trades in its cross-checks, and it can be deducted from that month's DARF or carried forward. Cost basis is the weighted average purchase price plus brokerage and exchange fees; bonus shares and splits adjust quantity and average price without creating a taxable gain at that moment. The monthly exemption sums sales across every broker and applies per taxpayer, not per account. A DARF below the minimum collection amount is not paid that month and rolls into the next."
  }
 },
 {
  "k": "jcp",
  "t": "JCP",
  "te": "JCP (interest on equity)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "JCP quer dizer juros sobre capital próprio. É outra maneira de a empresa mandar dinheiro para quem tem ações dela, parecida com o dividendo. A diferença que o acionista sente é que o valor chega já com imposto descontado.",
   "medio": "Diferente do dividendo, o JCP tem 15% de imposto de renda retido na fonte, então o que cai na conta já é líquido. Para a empresa, o JCP é despesa dedutível e reduz o imposto dela — por isso muitas preferem distribuir nessa forma. Na declaração, o JCP entra como rendimento tributável exclusivamente na fonte, em ficha diferente da dos dividendos. Ao comparar duas empresas, o JCP bruto anunciado não é comparável com dividendo bruto sem ajustar a retenção.",
   "expert": "O JCP é limitado pela legislação à aplicação da TJLP sobre contas do patrimônio líquido e ao maior entre 50% do lucro do exercício e 50% das reservas de lucros acumulados. A retenção de 15% na fonte é definitiva para pessoa física residente, o que faz o efeito líquido depender da alíquota efetiva da companhia: o benefício existe quando a economia tributária do lado dela supera a retenção do lado do acionista. Investidores isentos ou imunes podem ter a retenção dispensada por regra específica. O anúncio costuma trazer data-com e data de pagamento bem distantes, e a provisão entra no balanço muito antes de o caixa sair."
  },
  "en": {
   "iniciante": "JCP stands for juros sobre capital próprio, interest on equity. It is another way for a company to send cash to its shareholders, much like a dividend. What the shareholder notices is that the money arrives with tax already deducted.",
   "medio": "Unlike dividends, JCP carries 15% income tax withheld at source, so the amount landing in the account is already net. For the company, JCP is a deductible expense that lowers its own tax bill, which is why many prefer to distribute this way. In the tax return, JCP is reported as income taxed exclusively at source, on a different form from dividends. When comparing two companies, headline gross JCP is not comparable with gross dividends until the withholding is factored in.",
   "expert": "Brazilian law caps JCP at the TJLP long-term rate applied to certain equity accounts, and at the greater of 50% of the year's profit or 50% of accumulated profit reserves. The 15% withholding is final for resident individuals, so the net effect depends on the company's effective tax rate: the benefit exists when the tax saved at company level exceeds the tax withheld at shareholder level. Exempt or immune holders may be spared the withholding under specific rules. Announcements usually set the ex-date and the payment date far apart, and the provision hits the balance sheet well before the cash leaves."
  }
 },
 {
  "k": "juros-compostos",
  "t": "Juros compostos",
  "te": "Compound interest",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Juros compostos são juros que rendem juros. O que você ganhou no primeiro ano passa a render também no segundo, e assim por diante. Por isso o dinheiro cresce devagar no começo e cada vez mais rápido depois, se ficar parado ali.",
   "medio": "A conta é valor final = valor inicial × (1 + taxa)^tempo, com taxa e tempo na mesma unidade — taxa mensal pede tempo em meses. O expoente é o que faz diferença: dobrar o prazo costuma fazer muito mais pelo resultado do que arrancar um ponto a mais de rendimento. Aportes mensais entram como uma soma de parcelas com prazos diferentes, cada uma capitalizada pelo tempo que ficou aplicada. E a mesma matemática vale contra você em dívida de cartão e cheque especial, onde a taxa mensal composta vira um número anual bem maior do que parece.",
   "expert": "Em tempo contínuo, V = V₀·e^(rt), e a taxa contínua se converte na discreta por r = ln(1 + i). A distinção que mais engana é entre média aritmética e média geométrica dos retornos: só a geométrica reproduz o patrimônio final, e a volatilidade corrói o retorno composto num arrasto de aproximadamente σ²/2. Duas séries com a mesma média aritmética terminam em patrimônios diferentes quando as oscilações diferem. Em carteira com aportes, nenhuma das duas médias responde quanto o investidor ganhou: isso exige o fluxo de caixa datado e a taxa interna de retorno."
  },
  "en": {
   "iniciante": "Compound interest is interest that earns interest. What you gained in the first year starts earning in the second, and so on. That is why money grows slowly at first and faster and faster later, as long as it stays put.",
   "medio": "The formula is final value = starting value × (1 + rate)^time, with rate and time in the same unit — a monthly rate needs time in months. The exponent is what matters: doubling the horizon usually does far more for the outcome than squeezing out an extra point of yield. Monthly contributions behave as a sum of tranches with different horizons, each compounded for however long it stayed invested. The same maths runs against you on credit card and overdraft debt, where a compounded monthly rate becomes an annual number far larger than it looks.",
   "expert": "In continuous time, V = V₀·e^(rt), and the continuous rate converts to the discrete one through r = ln(1 + i). The most misleading distinction is between the arithmetic and the geometric mean of returns: only the geometric mean reproduces the ending balance, and volatility erodes compounded return by a drag of roughly σ²/2. Two series with identical arithmetic means end at different balances when their swings differ. In a portfolio with contributions, neither mean answers what the investor actually earned: that requires dated cash flows and an internal rate of return."
  }
 },
 {
  "k": "lci-lca",
  "t": "LCI e LCA",
  "te": "LCI and LCA",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "LCI e LCA são aplicações parecidas com o CDB: você empresta dinheiro ao banco e recebe de volta com juros. A diferença é o destino do dinheiro — crédito imobiliário na LCI, agronegócio na LCA — e o fato de o rendimento chegar sem desconto de imposto de renda para pessoa física. Como o CDB, contam com a proteção do FGC dentro dos limites dele.",
   "medio": "Por não ter IR para pessoa física, a LCI/LCA costuma ser oferecida com percentual do CDI menor que o de um CDB equivalente, e ainda assim terminar com líquido maior. Têm prazo mínimo de carência definido em norma, então não servem para dinheiro que pode ser preciso a qualquer momento. A proteção do FGC vale por CPF e por instituição, dentro do teto e do limite global vigentes. Comparar com CDB exige colocar os dois na mesma base líquida, em vez de olhar só o percentual do CDI anunciado.",
   "expert": "Para comparar, converta a taxa isenta em equivalente bruto: taxa isenta ÷ (1 − alíquota de IR do prazo correspondente na tabela regressiva). Um papel isento a 90% do CDI equivale, num prazo em que o IR seria alto, a bem mais de 90% bruto — o número exato segue o prazo, não o produto. As regras de prazo mínimo de carência, lastro elegível e tratamento tributário já foram alteradas por norma mais de uma vez, e valem as condições vigentes na data de emissão, de modo que papéis antigos e novos convivem sob regras diferentes. A cobertura do FGC tem teto por CPF e instituição e um limite global plurianual, o que torna o risco do emissor relevante acima desses valores. Liquidez no secundário é rara: o resgate antecipado, quando existe, sai a preço negociado com o emissor."
  },
  "en": {
   "iniciante": "LCIs and LCAs work much like a CDB: you lend money to a bank and get it back with interest. What differs is where the money goes — property credit for the LCI, agribusiness for the LCA — and the fact that the return reaches individuals without income tax deducted. Like CDBs, they carry FGC deposit protection within its limits.",
   "medio": "Because individuals pay no income tax on them, LCIs and LCAs are usually offered at a lower percentage of the CDI than an equivalent CDB, and still end up ahead on a net basis. They carry a minimum lock-up set by regulation, so they do not suit money that might be needed at any moment. FGC protection applies per taxpayer and per institution, within the prevailing per-institution cap and overall limit. Comparing them with a CDB means putting both on the same net footing rather than reading the headline percentage of CDI.",
   "expert": "To compare, convert the tax-free rate into a gross equivalent: tax-free rate ÷ (1 − the income tax rate for the matching holding period on the regressive table). A tax-free paper at 90% of the CDI is worth well above 90% gross over a horizon where the tax rate would be high — the exact figure follows the horizon, not the product. Rules on minimum lock-up, eligible collateral and tax treatment have been changed by regulation more than once, and the conditions in force on the issue date govern the paper, so old and new issues coexist under different rules. FGC cover has a per-taxpayer, per-institution cap and a multi-year overall limit, which makes issuer risk real above those amounts. Secondary liquidity is scarce: early exit, where offered, prices at whatever the issuer quotes."
  }
 },
 {
  "k": "liquidez",
  "t": "Liquidez",
  "te": "Liquidity",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Liquidez é a facilidade de transformar um investimento em dinheiro na conta. A poupança tem liquidez alta: você tira hoje. Um imóvel tem liquidez baixa: pode levar meses para vender, e às vezes só vende baixando o preço.",
   "medio": "Liquidez alta costuma vir acompanhada de rendimento menor, porque poder sacar a qualquer hora é uma conveniência que se paga. Reserva de emergência é o caso clássico em que o resgate imediato manda no rendimento; dinheiro de prazo longo pode abrir mão dele em troca de taxa maior. Dois prazos diferentes costumam ser confundidos: carência, que é quando você pode pedir o resgate, e liquidação, que é quando o dinheiro cai. Em fundos isso aparece como D+1, D+30 ou mais, em dias úteis ou corridos conforme o regulamento.",
   "expert": "Liquidez se mede por volume médio negociado, spread entre compra e venda e profundidade do book — o quanto o preço anda para absorver uma ordem do seu tamanho. Ativos ilíquidos embutem prêmio de iliquidez no retorno esperado e sofrem impacto de mercado na venda forçada, que é justamente quando ela é indesejada. Em fundos, o descasamento entre a liquidez prometida ao cotista e a liquidez da carteira é a origem de gate e de fechamento para resgate em momentos de estresse. A marcação de papel sem negociação recorrente vem de modelo, não de preço observado, e o desconto real só aparece na hora da venda."
  },
  "en": {
   "iniciante": "Liquidity is how easily an investment turns back into cash in your account. A savings account is highly liquid: you withdraw today. A property is not: selling can take months, and sometimes only happens after cutting the price.",
   "medio": "High liquidity usually comes with a lower return, because the right to withdraw at any moment is paid for. An emergency fund is the classic case where instant access outranks yield; money with a long horizon can trade that access for a better rate. Two different timings get confused: the lock-up, when you are allowed to request a redemption, and settlement, when the cash actually arrives. In funds this shows up as D+1, D+30 or longer, counted in business or calendar days depending on the rules.",
   "expert": "Liquidity is measured by average traded volume, bid-ask spread and book depth — how far the price moves to absorb an order of your size. Illiquid assets embed an illiquidity premium in expected return and suffer market impact on a forced sale, which is exactly when it hurts. In funds, a mismatch between the liquidity promised to holders and the liquidity of the portfolio is what produces gates and suspended redemptions under stress. Marking a rarely traded instrument comes from a model, not an observed price, and the real discount only surfaces at the point of sale."
  }
 },
 {
  "k": "lote-padrao",
  "t": "Lote e fracionário",
  "te": "Standard lot and odd lot",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Na bolsa brasileira o lote padrão é de 100 ações: as ordens costumam ser de 100, 200, 300. Para comprar menos que isso existe o mercado fracionário, onde dá para levar de 1 ação em diante. O código do papel ganha um F no fim quando é fracionário.",
   "medio": "Lote padrão e fracionário negociam o mesmo ativo em livros de ordens separados, com preços praticamente colados e liquidez bem diferente. No fracionário o spread é maior e a execução pode sair alguns centavos pior; em valores pequenos essa diferença é pequena diante da corretagem e do próprio aporte. Dividendos, JCP, direitos de subscrição e bonificações valem igual nos dois. Quem acumula fracionário até passar de 100 ações não precisa fazer nada: a posição é uma só e pode ser vendida no lote padrão.",
   "expert": "Os dois livros são independentes, então o fracionário pode exibir preço momentaneamente descolado do lote padrão, sobretudo na abertura e no fechamento, e o leilão de fechamento roda em cada um separadamente. Para o imposto de renda não há distinção: o preço médio é único por ativo, e vendas no fracionário somam com as do lote padrão no limite mensal de isenção. Ordens grandes no fracionário andam o preço por falta de profundidade, e o custo de execução pode superar a economia de corretagem. Alguns ativos, como BDRs não patrocinados e papéis de baixa liquidez, praticamente só têm negócio em um dos livros."
  },
  "en": {
   "iniciante": "On the Brazilian exchange the standard lot is 100 shares, so orders usually come in hundreds. To buy fewer than that there is the odd-lot market, where you can take a single share upwards. The ticker gains an F at the end when it trades there.",
   "medio": "Standard and odd lots trade the same asset in separate order books, at prices that track each other closely but with very different liquidity. The odd-lot spread is wider and execution can land a few cents worse; on small amounts that gap is minor next to brokerage and the size of the contribution. Dividends, JCP, subscription rights and bonus shares apply identically in both. Anyone who accumulates odd lots past 100 shares needs to do nothing: it is one position, and it can be sold in the standard book.",
   "expert": "The two books are independent, so the odd-lot price can drift briefly from the standard lot, especially at the open and close, and each runs its own closing auction. For tax there is no distinction: average cost is single per asset, and odd-lot sales count towards the same monthly exemption ceiling as standard-lot sales. Large odd-lot orders move the price for lack of depth, and the execution cost can exceed whatever brokerage was saved. Some instruments, such as unsponsored BDRs and thinly traded shares, effectively trade in only one of the books."
  }
 },
 {
  "k": "lucro-prejuizo",
  "t": "Lucro / prejuízo (não realizado)",
  "te": "Unrealised gain / loss",
  "c": "App",
  "ce": "App",
  "pt": {
   "iniciante": "É a diferença entre o que seus investimentos valem hoje e o que você pagou por eles. Chama-se não realizado porque esse valor ainda não virou dinheiro: ele só se concretiza quando você vende. Até lá o número sobe e desce todo dia junto com o mercado.",
   "medio": "O cálculo compara o valor de mercado atual com o custo de aquisição, somando corretagem e taxas ao custo. Em posições em dólar esse número junta duas coisas diferentes, a variação do ativo e a variação do câmbio — o InvestifyONE mostra o resultado já convertido para a sua moeda base. Proventos recebidos não entram aqui: são resultado realizado e aparecem à parte, senão a conta dobra. Um lucro não realizado grande também carrega um imposto futuro embutido, que só aparece no dia da venda.",
   "expert": "Separe a atribuição por fonte — ativo, moeda e proventos — para saber de onde veio o resultado; sem isso, uma carteira medíocre em dólar pode parecer excelente apenas pela desvalorização do real. O custo de referência muda conforme o método: preço médio ponderado é o que a apuração de IR brasileira exige, mas FIFO e lotes individuais produzem números diferentes de resultado não realizado para a mesma posição. Desdobramento, grupamento e bonificação alteram quantidade e preço médio sem alterar o resultado, e um ajuste mal feito distorce a série inteira. Em posições em moeda estrangeira, o custo em reais fica travado na taxa da data de aquisição, o que faz o resultado contábil divergir do resultado medido na moeda original."
  },
  "en": {
   "iniciante": "It is the gap between what your investments are worth today and what you paid for them. It is called unrealised because the amount is not money yet: it only becomes real when you sell. Until then the figure rises and falls every day with the market.",
   "medio": "The calculation compares current market value against acquisition cost, with brokerage and fees folded into the cost. On dollar positions the number mixes two different things, the asset's move and the currency's move — and InvestifyONE shows the result already converted into your base currency. Distributions received are not counted here: they are realised income and appear separately, otherwise the total double-counts. A large unrealised gain also carries an embedded future tax bill that only shows up on the day you sell.",
   "expert": "Attribute the result by source — asset, currency and distributions — to see where it came from; without that, a mediocre dollar portfolio can look excellent purely because the real weakened. The reference cost depends on the method: weighted average cost is what Brazilian tax reporting requires, while FIFO and specific-lot accounting produce different unrealised figures for the same position. Splits, reverse splits and bonus issues change quantity and average price without changing the result, and one bad adjustment distorts the whole series. For foreign currency positions the cost in reais is locked at the acquisition-date rate, which makes the reported result diverge from the result measured in the original currency."
  }
 },
 {
  "k": "marcacao-mercado",
  "t": "Marcação a mercado",
  "te": "Mark to market",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "Marcação a mercado é o preço pelo qual o seu título valeria se você quisesse vendê-lo hoje, antes do vencimento. Esse preço pode estar acima ou abaixo do que você pagou. É por isso que uma aplicação de renda fixa às vezes aparece no vermelho na tela.",
   "medio": "Um Tesouro IPCA+ pode mostrar prejuízo mesmo sendo renda fixa: se os juros subiram depois da sua compra, quem vende hoje vende mais barato, porque o comprador exige a taxa nova. Levando o título até o vencimento, você recebe exatamente a taxa contratada e a oscilação do meio do caminho deixa de importar. Quanto mais longo o vencimento, maior o balanço do preço para cada movimento de juros. O inverso também vale: queda de juros deixa o título valendo mais do que você pagou.",
   "expert": "ΔP ≈ −Duration modificada × Δy + ½ · Convexidade · Δy². O termo de duration domina em movimentos pequenos; a convexidade positiva dos títulos longos faz o ganho numa queda de taxa superar a perda numa alta de mesma magnitude. Em papéis indexados ao IPCA o preço responde à taxa real, e o principal corrigido pelo índice acumula por fora, o que separa o efeito inflação do efeito juros. No Tesouro Direto a recompra é diária, ao preço do dia e com spread do próprio Tesouro; em CDB e debênture o secundário é ralo e a marcação exibida pode vir de curva de referência, não de negócio fechado."
  },
  "en": {
   "iniciante": "Marking to market is the price your bond would fetch if you sold it today, before maturity. That price can sit above or below what you paid. It is why a fixed income holding sometimes shows red on the screen.",
   "medio": "A Tesouro IPCA+ bond can show a loss despite being fixed income: if rates rose after you bought, anyone selling today sells cheaper, because the buyer demands the new rate. Hold to maturity and you receive exactly the contracted rate, and the swings along the way stop mattering. The longer the maturity, the further the price swings for each move in rates. The reverse holds too: falling rates leave the bond worth more than you paid.",
   "expert": "ΔP ≈ −modified duration × Δy + ½ · convexity · Δy². The duration term dominates for small moves; the positive convexity of long bonds means the gain from a rate fall exceeds the loss from an equal-sized rise. For IPCA-linked paper the price responds to the real rate while index-adjusted principal accrues separately, which isolates the inflation effect from the rate effect. Tesouro Direto buys back daily, at the day's price and with the Treasury's own spread; for CDBs and debentures the secondary market is thin and the mark displayed may come from a reference curve rather than an actual trade."
  }
 },
 {
  "k": "fracionario",
  "t": "Mercado fracionário (F)",
  "te": "Odd-lot market (F)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É o mercado onde se compra menos de 100 ações, desde uma única unidade. O código do papel ganha um F no fim: PETR4F, VALE3F. Serve para quem quer investir valores pequenos sem precisar juntar dinheiro para um lote inteiro.",
   "medio": "O preço acompanha de perto o do lote padrão, mas o livro tem menos ordens, então o spread é maior e a execução pode sair alguns centavos fora. Para aportes mensais pequenos esse é o mercado de uso corrente, e o peso da corretagem costuma superar o da diferença de preço. Ordem a mercado no fracionário é onde o descolamento aparece mais; ordem limitada evita a surpresa ao custo de não executar. Na carteira, as ações compradas com F se somam às do lote padrão: é uma posição só.",
   "expert": "O F identifica o livro, não um ativo distinto — mesmo ISIN, mesmos direitos societários, mesmo preço médio para fins fiscais. A liquidez do fracionário concentra-se em papéis de alto giro; fora deles o livro pode atravessar o pregão com poucas ordens e spread largo o bastante para anular a vantagem de aportar pequeno. O leilão de fechamento roda separado em cada livro, o que explica PETR4 e PETR4F fecharem com preços diferentes no mesmo dia. Para vender acima de 100 ações o lote padrão dá execução melhor, e o excedente não múltiplo de 100 volta ao fracionário."
  },
  "en": {
   "iniciante": "It is the market where you buy fewer than 100 shares, from a single share up. The ticker takes an F at the end: PETR4F, VALE3F. It exists so small amounts can be invested without saving up for a whole lot.",
   "medio": "The price tracks the standard lot closely, but the book holds fewer orders, so the spread is wider and execution can land a few cents off. For small monthly contributions this is the market in everyday use, and brokerage usually outweighs the price difference. Market orders are where the gap shows most; a limit order avoids the surprise at the cost of possibly not filling. In the portfolio, shares bought with the F suffix add to the standard-lot ones: it is a single position.",
   "expert": "The F marks the book, not a separate asset — same ISIN, same shareholder rights, same average cost for tax. Odd-lot liquidity concentrates in heavily traded names; outside them the book can cross a whole session with few orders and a spread wide enough to cancel the benefit of contributing small. The closing auction runs separately in each book, which is why PETR4 and PETR4F can print different closing prices on the same day. Selling more than 100 shares executes better in the standard book, with the remainder that is not a multiple of 100 going back to the odd-lot one."
  }
 },
 {
  "k": "moeda-base",
  "t": "Moeda base",
  "te": "Base currency",
  "c": "App",
  "ce": "App",
  "pt": {
   "iniciante": "Moeda base é a moeda em que você quer ver os totais da sua carteira. Escolhendo real, tudo que está em dólar é convertido pela cotação do dia para aparecer em reais. É só a forma de mostrar o número: seus investimentos continuam exatamente onde estão.",
   "medio": "Trocar a moeda base não mexe em nada da carteira, muda só a régua de medida. Ver os mesmos ativos em dólar ajuda a perceber quanto do ganho em reais veio do investimento e quanto veio apenas do real se desvalorizando. A conversão usa a cotação do momento, então o total em reais se move ao longo do dia mesmo com a bolsa lá fora fechada. Na hora de conferir com o extrato da corretora, cada instituição pode usar uma cotação de referência diferente.",
   "expert": "Mantenha as duas visões: o retorno em moeda local mede a qualidade da escolha dos ativos e o retorno na moeda de consumo mede o poder de compra futuro — são perguntas distintas e podem ter sinais opostos. Converter uma série histórica exige decidir se cada ponto usa a taxa da própria data ou uma taxa fixa; a primeira mistura o efeito câmbio na curva, a segunda o elimina e deixa só o ativo. Para fins fiscais no Brasil nenhuma das duas serve: a apuração usa a PTAX da data que a regra determina, independentemente da moeda base escolhida na tela. A diferença entre o valor exibido e o valor declarado é esperada e não indica erro."
  },
  "en": {
   "iniciante": "Base currency is the currency you want your portfolio totals shown in. Pick the real and everything held in dollars is converted at the day's rate to appear in reais. It is purely how the number is displayed: your investments stay exactly where they are.",
   "medio": "Switching the base currency changes nothing in the portfolio, only the measuring stick. Viewing the same holdings in dollars shows how much of a gain in reais came from the investment and how much came from the real weakening. The conversion uses the current rate, so the total in reais moves through the day even while foreign markets are shut. When reconciling against a broker statement, bear in mind each institution may use a different reference rate.",
   "expert": "Keep both views: return in local currency measures the quality of the asset choices and return in your spending currency measures future purchasing power — different questions that can carry opposite signs. Converting a historical series forces a choice between using each date's own rate or one fixed rate; the first blends the currency effect into the curve, the second strips it out and leaves the asset alone. Neither serves Brazilian tax purposes: the calculation uses the PTAX rate for whichever date the rule specifies, regardless of the base currency picked on screen. A gap between the figure displayed and the figure declared is expected, not an error."
  }
 },
 {
  "k": "movimentacao",
  "t": "Movimentação",
  "te": "Transactions",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Movimentação é cada evento que mexeu no seu dinheiro: um aporte, uma compra, uma venda, um dividendo recebido, uma taxa cobrada. Cada uma tem data e valor. Juntas, elas contam a história da carteira do começo até hoje.",
   "medio": "Sem esse histórico, o máximo que dá para calcular é lucro sobre preço médio — uma foto, não um filme. Com ele dá para separar o que o dinheiro rendeu do que foi aporte novo, medir rentabilidade de verdade e somar quanto se pagou de taxa no ano. É também o registro que sustenta a apuração de imposto, já que o preço médio depende de todas as compras anteriores. Lançamento faltando ou com data errada contamina tudo o que vem depois, então a hora de corrigir é quando o erro aparece.",
   "expert": "O livro de movimentações é o que permite calcular TWR, o retorno da estratégia, imune ao momento dos aportes, e MWR/XIRR, o retorno do bolso do investidor, sensível ao timing. Sem datas e valores de fluxo, nenhum dos dois existe. O TWR quebra a série em subperíodos a cada fluxo e encadeia os retornos; o XIRR resolve a taxa que zera o valor presente do fluxo datado, e pode não convergir quando há muita alternância de sinal. Eventos societários e proventos precisam entrar como movimentações próprias, com data-com e data de pagamento, senão o retorno aparece no subperíodo errado."
  },
  "en": {
   "iniciante": "A transaction is any event that moved your money: a contribution, a purchase, a sale, a dividend received, a fee charged. Each one has a date and an amount. Together they tell the portfolio's story from the beginning to today.",
   "medio": "Without that history, the most you can compute is profit over average price — a snapshot, not a film. With it you can separate what the money earned from what was fresh cash, measure true performance, and total up the year's fees. It is also the record that supports tax reporting, since average cost depends on every earlier purchase. A missing entry or a wrong date contaminates everything downstream, so the moment to fix one is when it surfaces.",
   "expert": "The transaction ledger is what makes TWR possible — the strategy's return, immune to the timing of contributions — alongside MWR/XIRR, the investor's own return, which is sensitive to timing. Without dated flows and amounts, neither exists. TWR breaks the series into sub-periods at every flow and chains the returns; XIRR solves for the rate that zeroes the present value of the dated flows, and may fail to converge when signs alternate often. Corporate actions and distributions need their own entries, with ex-date and payment date, or the return lands in the wrong sub-period."
  }
 },
 {
  "k": "nasdaq",
  "t": "Nasdaq-100",
  "te": "Nasdaq-100",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "É um índice que acompanha as 100 maiores empresas não financeiras listadas na bolsa Nasdaq, nos Estados Unidos. Na prática, é o termômetro das gigantes de tecnologia. Quando se diz que a tecnologia americana subiu ou caiu, costuma ser esse número.",
   "medio": "Por ser concentrado em empresas de crescimento, tende a subir mais que o S&P 500 nos bons momentos e cair mais nos ruins. O peso das maiores companhias é alto, então poucos nomes explicam boa parte do movimento do índice. No Brasil a exposição mais comum é por ETF que replica o índice, como o NASD11, ou por BDR de ETF — e aí o dólar entra no resultado. É um índice concentrado em setor e geografia, não um substituto de índice amplo.",
   "expert": "Beta elevado frente ao S&P 500 e duration implícita alta: como boa parte do valor está em fluxo de caixa distante, o índice é sensível a variações na curva de juros real americana. A ponderação é por capitalização modificada, com regras de rebalanceamento que limitam o peso agregado dos maiores componentes quando ultrapassam um teto. Não é índice puro de tecnologia: a metodologia exclui financeiras, o que traz consumo e saúde para dentro e deixa setores inteiros de fora. Para o investidor brasileiro, o retorno em reais é a composição do índice com o câmbio, e os dois costumam correlacionar negativamente em momentos de aversão a risco global."
  },
  "en": {
   "iniciante": "It is an index tracking the 100 largest non-financial companies listed on the Nasdaq exchange in the United States. In practice it is the gauge of the technology giants. When people say US tech rose or fell, this is usually the number.",
   "medio": "Concentrated in growth companies, it tends to rise more than the S&P 500 in good stretches and fall harder in bad ones. The largest companies carry heavy weights, so a handful of names explains much of the index's movement. From Brazil, the common exposures are an ETF replicating the index, such as NASD11, or a BDR of a foreign ETF — and the dollar then enters the result. It is concentrated by sector and geography, not a stand-in for a broad market index.",
   "expert": "High beta against the S&P 500 and long implied duration: with much of its value in distant cash flows, the index is sensitive to moves in the US real yield curve. Weighting is modified market-cap, with rebalancing rules that cap the combined weight of the largest constituents once they exceed a threshold. It is not a pure technology index: the methodology excludes financials, which pulls in consumer and healthcare names and leaves whole sectors out. For a Brazilian holder, the return in reais is the index compounded with the exchange rate, and the two are often negatively correlated when global risk appetite falls."
  }
 },
 {
  "k": "nivel-conhecimento",
  "t": "Níveis de explicação",
  "te": "Explanation levels",
  "c": "App",
  "ce": "App",
  "pt": {
   "iniciante": "O InvestifyONE explica cada assunto em três profundidades: iniciante, médio e expert. A de iniciante usa palavras do dia a dia e evita termos técnicos. Você escolhe a que combina com você e o app inteiro passa a falar assim.",
   "medio": "Cada nível é um texto próprio, escrito do zero para aquele leitor — não é o texto de iniciante com parágrafos colados no fim. O médio assume que você já conhece os termos básicos e vai direto ao funcionamento prático: quando o número aparece, o que olhar, o que costuma dar errado. A troca fica no menu lateral e vale na hora para o Coach, o glossário e os popups (i) de todas as telas. Só a linguagem muda: cálculos, dados e valores são os mesmos nos três.",
   "expert": "Os três níveis são independentes e autossuficientes: quem lê o expert não precisa ter lido os anteriores, porque o texto já traz o contexto necessário antes de entrar na mecânica. O nível expert prioriza precisão — fórmula, alíquota, prazo, caso de borda e a fronteira entre conceitos próximos — em vez de analogia. A escolha é preferência de exibição gravada no perfil, não controle de acesso: nenhuma função do app fica bloqueada por nível. Mudar de nível reescreve apenas o texto exibido; histórico, cálculos e relatórios continuam idênticos."
  },
  "en": {
   "iniciante": "InvestifyONE explains every topic at three depths: beginner, intermediate and expert. The beginner version uses everyday words and steers clear of technical terms. You pick the one that suits you and the whole app starts speaking that way.",
   "medio": "Each level is its own text, written from scratch for that reader — not the beginner text with extra paragraphs bolted on. The intermediate level assumes you already know the basic terms and goes straight to how things work in practice: when the figure appears, what to look at, what tends to go wrong. You switch in the side menu and it takes effect immediately across the Coach, the glossary and the (i) popups on every screen. Only the language changes: calculations, data and values are the same at all three.",
   "expert": "The three levels are independent and self-contained: reading the expert text requires no prior pass through the others, because it carries the context it needs before reaching the mechanics. The expert level favours precision — formula, tax rate, deadline, edge case and the line between similar concepts — over analogy. The setting is a display preference stored in the profile, not an access control: no feature of the app is gated by level. Switching rewrites only the text on screen; history, calculations and reports stay identical."
  }
 },
 {
  "k": "on-pn",
  "t": "ON, PN e as letras do código",
  "te": "ON, PN and the ticker suffixes",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Uma mesma empresa pode ter dois tipos de ação. A ON, ordinária, dá direito a voto na assembleia. A PN, preferencial, não vota, mas costuma receber dividendo antes e um pouco maior. Na B3 dá para saber pelo número no fim do código: 3 é ON, como PETR3, e 4 é PN, como PETR4.",
   "medio": "Como as duas classes negociam separado, a mesma empresa pode ter preços diferentes de ON e PN no mesmo dia, e a mais líquida nem sempre é a ON. Para quem investe valores pequenos o voto raramente pesa, então a escolha costuma se dar por liquidez e por política de dividendos. Os outros finais também informam: 5 e 6 são classes especiais de PN, 11 é unit — um pacote que junta ON e PN — e 31 a 35 são BDR, sendo o 34 o mais comum. Conferir a classe antes de comprar evita troca por engano, já que os códigos são parecidos e o direito não é o mesmo.",
   "expert": "A diferença de preço entre ON e PN embute o prêmio de controle e o direito de tag along. Desde a Lei 10.303 o tag along mínimo da ON é 80% do valor pago ao controlador em caso de alienação de controle; a PN só tem tag along se o estatuto conceder. No Novo Mercado só existe ON, com tag along de 100%, o que explica empresas converterem PN em ON ao migrar de segmento — a relação de conversão é negociada e costuma opor as duas classes. A PN tem prioridade no reembolso e, conforme o estatuto, dividendo fixo ou mínimo, e pode adquirir direito de voto se a companhia deixar de distribuir dividendos pelo prazo previsto em lei. Units carregam a soma dos direitos das ações que as compõem e podem ser desmembradas."
  },
  "en": {
   "iniciante": "One company can have two kinds of share. ON, ordinary shares, carry a vote at the shareholders' meeting. PN, preferred shares, do not vote but usually receive dividends first and slightly larger. On the B3 the last digit tells you which: 3 is ON, as in PETR3, and 4 is PN, as in PETR4.",
   "medio": "Because the two classes trade separately, the same company can show different ON and PN prices on the same day, and the more liquid one is not always the ON. For small investors the vote rarely matters, so the choice tends to come down to liquidity and dividend policy. Other endings carry information too: 5 and 6 are special PN classes, 11 is a unit — a bundle of ON and PN — and 31 to 35 are BDRs, 34 being the most common. Checking the class before buying avoids picking the wrong one, since the tickers look alike and the rights are not the same.",
   "expert": "The price gap between ON and PN reflects the control premium and tag along rights. Since Lei 10.303, ON shares carry a minimum tag along of 80% of the price paid to the controlling shareholder when control changes hands; PN shares only have tag along if the bylaws grant it. The Novo Mercado segment admits ON shares only, with 100% tag along, which is why companies convert PN into ON when they migrate segment — the conversion ratio is negotiated and routinely sets the two classes against each other. PN shares rank ahead on reimbursement and, depending on the bylaws, carry a fixed or minimum dividend, and they can acquire voting rights if the company stops distributing dividends for the period the law sets. Units bundle the rights of their component shares and can be unbundled."
  }
 },
 {
  "k": "ouro",
  "t": "Ouro",
  "te": "Gold",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "Ouro é o ativo que muita gente procura quando tem medo do que vem pela frente. Ele não paga juros nem dividendos: o único jeito de ganhar é o preço subir depois que você comprou. Por isso funciona mais como reserva de valor do que como fonte de renda.",
   "medio": "No Brasil dá para ter exposição por ETF, como o GOLD11, ou por contratos de ouro negociados na B3. Como o metal é cotado em dólar, para o brasileiro o investimento embute duas apostas ao mesmo tempo: o preço do ouro e o câmbio. Em momentos de estresse global as duas costumam andar juntas para cima, o que amplifica o resultado nos dois sentidos. Ouro físico é um caso à parte: tem custo de guarda, spread de compra e venda alto e liquidez que depende de encontrar comprador.",
   "expert": "Sem fluxo de caixa, o ouro não tem valor presente calculável por desconto; o preço se forma por demanda de reserva, juro real e dólar, e historicamente a correlação com o juro real americano é negativa. O custo de carregar é o juro que se deixa de ganhar, o que explica por que o metal costuma sofrer em ciclos de juro real alto. Na B3, contratos de ouro têm tamanho e vencimento definidos e a rolagem tem custo próprio; ETF de ouro segue o preço à vista menos a taxa de administração. A tributação difere conforme o veículo: ouro como ativo financeiro, ETF e contrato em bolsa seguem regras distintas entre si, e o enquadramento define alíquota e forma de apuração."
  },
  "en": {
   "iniciante": "Gold is the asset many people reach for when they are afraid of what is coming. It pays no interest and no dividends: the only way to gain is for the price to rise after you buy. That makes it more a store of value than a source of income.",
   "medio": "From Brazil, exposure comes through an ETF such as GOLD11 or through gold contracts traded on the B3. Because the metal is priced in dollars, a Brazilian holder is making two bets at once: the gold price and the exchange rate. In global stress episodes the two often move up together, which amplifies the result in both directions. Physical gold is its own case: storage costs, a wide buy-sell spread and liquidity that depends on finding a buyer.",
   "expert": "With no cash flow, gold has no present value derivable by discounting; its price forms from reserve demand, real interest rates and the dollar, and historically it correlates negatively with the US real rate. The carrying cost is the interest forgone, which explains why the metal tends to struggle through cycles of high real rates. On the B3, gold contracts have set sizes and expiries and rolling them carries its own cost, while a gold ETF tracks the spot price less its management fee. Taxation differs by vehicle: gold as a financial asset, a gold ETF and an exchange-traded contract each follow their own rules, and the classification determines the rate and the filing method."
  }
 },
 {
  "k": "pl",
  "t": "P/L (preço/lucro)",
  "te": "P/E (price-to-earnings)",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "O P/L diz quantos anos de lucro a empresa levaria para pagar o preço da ação. P/L 10 significa dez anos de lucro para cobrir o que você paga hoje.",
   "medio": "O P/L divide o preço da ação pelo lucro por ação dos últimos doze meses. Um P/L de 10 quer dizer que, no lucro atual, a empresa levaria dez anos para devolver o preço pago. Número baixo pode ser barganha ou empresa em declínio; número alto pode ser exagero ou expectativa legítima de crescimento. Ele só ganha sentido comparado ao setor e ao histórico da própria empresa.",
   "expert": "P/L = preço por ação ÷ lucro por ação, normalmente com o lucro dos últimos doze meses (trailing) ou o projetado (forward). O inverso, lucro ÷ preço, é o earnings yield, comparável à taxa de um título. P/L baixo tanto sinaliza desconto quanto lucro inflado por evento não recorrente ou expectativa de queda; P/L alto tanto sinaliza sobrepreço quanto crescimento esperado ou lucro deprimido no ano-base. Setores com capital intensivo e ciclos longos operam em faixas de P/L diferentes, então a comparação válida é dentro do setor e contra a média histórica do papel."
  },
  "en": {
   "iniciante": "The P/E tells you how many years of profit the company would need to pay back the share price. A P/E of 10 means ten years of today’s profit to cover what you pay now.",
   "medio": "The P/E divides the share price by earnings per share over the last twelve months. A P/E of 10 means that, at current profit, the company would take ten years to return the price paid. A low number can be a bargain or a business in decline; a high one can be excess or a legitimate expectation of growth. It only makes sense compared with the sector and with the company’s own history.",
   "expert": "P/E = price per share ÷ earnings per share, usually trailing twelve months or forward (projected). Its inverse, earnings ÷ price, is the earnings yield, comparable to a bond rate. A low P/E can signal either a discount or earnings inflated by a one-off, or an expected drop; a high P/E can signal overpricing, expected growth, or depressed base-year earnings. Capital-intensive sectors with long cycles trade in different P/E ranges, so the valid comparison is within the sector and against the stock’s own historical average."
  }
 },
 {
  "k": "pvp",
  "t": "P/VP (preço sobre valor patrimonial)",
  "te": "P/B (price-to-book)",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "O P/VP compara o preço da ação ou da cota com o patrimônio que ela representa. P/VP 0,8 significa pagar R$ 0,80 por cada R$ 1 de patrimônio.",
   "medio": "O P/VP divide o preço pelo valor patrimonial por ação ou por cota. Abaixo de 1, você paga menos do que o patrimônio contábil vale; acima de 1, paga mais. É muito usado em bancos e em FIIs. Em FIIs, P/VP abaixo de 1 pode ser desconto de verdade ou o reflexo de vacância alta e risco de crédito nos inquilinos.",
   "expert": "P/VP = preço ÷ valor patrimonial por ação (ou cota). O valor patrimonial vem do balanço e depende de como os ativos são avaliados: em bancos, o patrimônio é majoritariamente financeiro e o múltiplo dialoga com o ROE (P/VP alto se justifica com ROE persistentemente acima do custo de capital); em FIIs de tijolo, o valor patrimonial reflete laudos de avaliação que podem estar defasados frente ao mercado. Um P/VP abaixo de 1 num FII precisa ser lido junto com vacância, inadimplência, prazo dos contratos e qualidade dos imóveis — o desconto pode ser o mercado precificando um patrimônio superavaliado no laudo."
  },
  "en": {
   "iniciante": "The P/B compares the price of a share or fund unit with the equity it represents. A P/B of 0.8 means paying R$ 0.80 for each R$ 1 of book value.",
   "medio": "The P/B divides the price by book value per share or per unit. Below 1 you pay less than the accounting equity is worth; above 1 you pay more. It is widely used for banks and for FIIs (Brazilian listed real-estate funds). In FIIs, a P/B below 1 can be a genuine discount or the reflection of high vacancy and tenant credit risk.",
   "expert": "P/B = price ÷ book value per share (or unit). Book value comes from the balance sheet and depends on how assets are valued: in banks, equity is mostly financial and the multiple is read together with ROE (a high P/B is justified by ROE persistently above the cost of capital); in bricks-and-mortar FIIs, book value reflects appraisal reports that may lag the market. A P/B below 1 in an FII has to be read alongside vacancy, defaults, lease terms and property quality — the discount may be the market pricing an overvalued appraisal."
  }
 },
 {
  "k": "par-cotacao",
  "t": "Par de cotação (BTC/USD, USD/BRL)",
  "te": "Quote pair (BTC/USD, USD/BRL)",
  "c": "Cotações",
  "ce": "Quotes",
  "pt": {
   "iniciante": "Toda cotação compara duas coisas. USD/BRL é quantos reais custa um dólar; BTC/USD é quantos dólares custa um bitcoin.",
   "medio": "Num par de cotação, a primeira sigla é o que está sendo cotado e a segunda é a moeda em que o preço está escrito. USD/BRL = 5,20 quer dizer que um dólar custa R$ 5,20. Por isso BTC/BRL é um número bem maior que BTC/USD: é o mesmo bitcoin, medido numa régua diferente. Quando o app mostra um ativo em dólar convertido para reais, ele está multiplicando dois pares.",
   "expert": "Na notação BASE/COTAÇÃO, a base é a unidade que se compra e a cotação é a moeda do preço; inverter o par inverte o número (BRL/USD = 1 ÷ USD/BRL). Cotações têm bid e ask, e o spread entre eles é o custo implícito de negociar; a \"cotação\" exibida costuma ser o meio ou o último negócio. Pares sem mercado direto (BTC/BRL, por exemplo, em parte das fontes) são calculados por cruzamento: BTC/USD × USD/BRL, o que soma os dois spreads e os dois horários de fechamento — por isso o valor em reais de um ativo em dólar pode mudar mesmo com o ativo parado."
  },
  "en": {
   "iniciante": "Every quote compares two things. USD/BRL is how many reais one dollar costs; BTC/USD is how many dollars one bitcoin costs.",
   "medio": "In a quote pair, the first code is what is being priced and the second is the currency the price is written in. USD/BRL = 5.20 means one dollar costs R$ 5.20. That is why BTC/BRL is a much bigger number than BTC/USD: same bitcoin, measured with a different ruler. When the app shows a dollar asset converted to reais, it is multiplying two pairs.",
   "expert": "In BASE/QUOTE notation, the base is the unit being bought and the quote is the pricing currency; flipping the pair inverts the number (BRL/USD = 1 ÷ USD/BRL). Quotes carry a bid and an ask, and the spread between them is the implicit cost of trading; the displayed \"price\" is usually the mid or the last trade. Pairs without a direct market (BTC/BRL in some sources) are derived by crossing: BTC/USD × USD/BRL, which adds both spreads and both closing times — which is why the real-denominated value of a dollar asset can move even while the asset itself sits still."
  }
 },
 {
  "k": "patrimonio",
  "t": "Patrimônio",
  "te": "Net worth",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Patrimônio é a soma de tudo que você tem investido. É o número grande no topo do painel.",
   "medio": "O app soma tudo o que você tem, já convertido para a sua moeda base. Se parte do dinheiro está em dólar e o dólar sobe, o seu patrimônio em reais sobe mesmo sem você comprar nada — e cai quando o dólar cai. Investimento sem cotação pública, como fundo e previdência, entra pelo valor que você informou.",
   "expert": "Patrimônio bruto é o valor de mercado de todas as posições convertido à moeda base pela cotação do dia; o líquido desconta o que ainda sairia para transformar tudo em dinheiro: imposto latente sobre o ganho não realizado, taxa de saída ou resgate, come-cotas já provisionado e custos de venda. A diferença entre bruto e líquido cresce com o ganho acumulado e com o prazo em produtos de tabela regressiva. O painel mostra o bruto; para decisões de resgate ou de sucessão, o número relevante é o líquido."
  },
  "en": {
   "iniciante": "Net worth is the sum of everything you have invested. It is the big number at the top of the dashboard.",
   "medio": "The app adds up everything you own, already converted to your base currency. If part of the money is in dollars and the dollar rises, your net worth in reais goes up even though you bought nothing — and it drops when the dollar drops. Investments without a public quote, such as funds and pension plans, come in at the value you entered.",
   "expert": "Gross net worth is the market value of every position converted to the base currency at today’s rate; the net figure subtracts what would still leave to turn it all into cash: latent tax on unrealised gains, exit or redemption fees, come-cotas already provisioned, and selling costs. The gap between gross and net widens with accumulated gains and with time in products on a regressive tax table. The dashboard shows gross; for redemption or estate decisions, the relevant number is net."
  }
 },
 {
  "k": "payout",
  "t": "Payout (fatia do lucro distribuída)",
  "te": "Payout ratio",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "Payout é a fatia do lucro que a empresa entrega aos acionistas em vez de guardar.",
   "medio": "O payout é a porcentagem do lucro distribuída como dividendo e juros sobre capital próprio. Payout perto de 100% deixa pouco para a empresa investir no próprio crescimento; payout muito baixo pode significar dinheiro sendo bem reinvestido — ou só retido. O número precisa ser lido junto com o que a empresa faz com o que guarda.",
   "expert": "Payout = proventos distribuídos ÷ lucro líquido do período. Acima de 100% indica distribuição financiada por reservas, venda de ativos ou dívida, o que não se sustenta. O payout de longo prazo depende da fase da empresa: negócios maduros com pouca oportunidade de reinvestimento tendem a distribuir mais; negócios em expansão retêm para crescer. Uma leitura mais robusta usa o payout sobre o fluxo de caixa livre, porque o lucro contábil pode carregar itens não caixa, e verifica a consistência ao longo de vários anos, não de um exercício."
  },
  "en": {
   "iniciante": "Payout is the slice of profit the company hands to shareholders instead of keeping it.",
   "medio": "The payout ratio is the percentage of profit distributed as dividends and interest on equity. A payout near 100% leaves little for the company to invest in its own growth; a very low payout can mean money being reinvested well — or just retained. The number has to be read together with what the company does with what it keeps.",
   "expert": "Payout = distributions ÷ net income for the period. Above 100% it means distributions financed by reserves, asset sales or debt, which is not sustainable. Long-run payout depends on the company’s stage: mature businesses with few reinvestment opportunities tend to distribute more; expanding ones retain to grow. A more robust reading uses payout over free cash flow, since accounting profit can carry non-cash items, and checks consistency across several years rather than one."
  }
 },
 {
  "k": "perfil-investidor",
  "t": "Perfil de investidor",
  "te": "Investor profile",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É a classificação — conservador, moderado, arrojado ou agressivo — que mede quanto risco combina com você. O InvestifyONE calcula o seu por um questionário e compara com o risco real da sua carteira.",
   "medio": "O perfil vem do questionário de suitability que bancos e corretoras são obrigados a aplicar. O app usa um questionário parecido e coloca o resultado ao lado do risco da carteira que você realmente tem, para mostrar se os dois batem. O teste de verdade é outro: se a carteira cair 30%, você vende em pânico ou aporta mais? O perfil também não é um rótulo permanente — muda quando muda o prazo, a renda ou a reserva.",
   "expert": "O perfil tem três eixos que não se confundem. Capacidade de risco é objetiva: horizonte, renda, patrimônio e liquidez. Tolerância a risco é subjetiva e comportamental: quanto de queda a pessoa suporta sem abandonar o plano. Necessidade de risco é quanto risco a meta exige: se ela já é alcançável com renda fixa, risco extra é assimetria negativa. A carteira tem de respeitar a menor entre capacidade e tolerância — é assim que o app calcula — e a necessidade diz se vale ocupar esse espaço todo."
  },
  "en": {
   "iniciante": "It is the label — conservative, moderate, growth or aggressive — that measures how much risk suits you. InvestifyONE works yours out with a questionnaire and compares it with the real risk of your portfolio.",
   "medio": "The profile comes from the suitability questionnaire that banks and brokers are required to apply. The app uses a similar questionnaire and places the result next to the risk of the portfolio you actually hold, to show whether the two match. The real test is different: if the portfolio drops 30%, do you sell in a panic or add more? The profile is not a permanent tag either — it changes when your horizon, income or reserve changes.",
   "expert": "The profile has three axes that should not be mixed up. Risk capacity is objective: horizon, income, wealth and liquidity. Risk tolerance is subjective and behavioural: how much of a drop the person can take without abandoning the plan. Risk need is how much risk the goal demands: if it is already reachable with fixed income, extra risk is negative asymmetry. The portfolio must respect the lower of capacity and tolerance — that is how the app computes it — and the need tells you whether that whole space is worth using."
  }
 },
 {
  "k": "preco-medio",
  "t": "Preço médio",
  "te": "Average cost",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "É quanto, em média, você pagou por cada unidade do que tem. Comprou 10 ações a R$ 10 e depois 10 a R$ 20: seu preço médio é R$ 15.",
   "medio": "O preço médio é a média ponderada de tudo que você pagou pelas unidades que ainda tem. Ele é a base do lucro ou prejuízo que o app mostra e também do imposto de renda: o ganho tributável é a diferença entre o preço de venda e o preço médio de compra. Vender não muda o preço médio das unidades que sobram; comprar mais, sim.",
   "expert": "Custo de aquisição no Brasil inclui corretagem e emolumentos, então o preço médio fiscal é um pouco maior que o preço de tela. Bonificação em ações e desdobramento alteram a quantidade sem entrada de dinheiro e, portanto, diluem o preço médio; grupamento faz o inverso. Subscrição entra como novo aporte no custo total. Em venda parcial, o custo baixado é proporcional à quantidade vendida ao preço médio vigente; a Receita Federal exige preço médio por ativo, não por lote, sem escolha de FIFO ou LIFO."
  },
  "en": {
   "iniciante": "It is how much, on average, you paid for each unit you hold. Bought 10 shares at R$ 10 and then 10 at R$ 20: your average cost is R$ 15.",
   "medio": "The average cost is the weighted average of everything you paid for the units you still hold. It is the basis of the profit or loss the app shows and of income tax as well: the taxable gain is the difference between the sale price and the average purchase price. Selling does not change the average cost of the remaining units; buying more does.",
   "expert": "Acquisition cost in Brazil includes brokerage and exchange fees, so the tax average cost is slightly higher than the screen price. Stock bonuses and splits change the quantity with no cash in and therefore dilute the average cost; reverse splits do the opposite. Rights subscriptions enter as a new contribution to total cost. On a partial sale, the cost written off is proportional to the quantity sold at the prevailing average; the Receita Federal requires average cost per asset, not per lot, with no FIFO or LIFO election."
  }
 },
 {
  "k": "previdencia",
  "t": "Previdência privada",
  "te": "Private pension (PGBL/VGBL)",
  "c": "Fundos",
  "ce": "Funds",
  "pt": {
   "iniciante": "É um investimento de longo prazo pensado para a aposentadoria, nos formatos PGBL ou VGBL, oferecido por bancos e seguradoras.",
   "medio": "A escolha entre PGBL e VGBL depende de como você declara o imposto de renda. O PGBL permite abater até 12% da renda tributável na declaração completa, mas no resgate o imposto incide sobre o valor todo. O VGBL não abate nada e, no resgate, o imposto incide só sobre o rendimento — o que combina com a declaração simplificada. Nos dois casos, a taxa de administração e a de carregamento pesam no resultado de longo prazo.",
   "expert": "A tabela regressiva chega a 10% após dez anos de cada aporte, contra a progressiva que segue a tabela do IRPF; a escolha é por plano e o horizonte define qual compensa. Não há come-cotas, o que preserva o juro composto frente a fundos abertos, e a portabilidade entre planos é isenta — permite trocar um produto caro por outro melhor sem evento tributável, desde que dentro da mesma modalidade. Na sucessão, os recursos não passam por inventário na maior parte dos casos. Os pontos de atenção são taxa de administração, taxa de carregamento na entrada ou saída, e a qualidade e a estratégia do fundo por trás do plano."
  },
  "en": {
   "iniciante": "It is a long-term investment designed for retirement, in the PGBL or VGBL format, offered by banks and insurers.",
   "medio": "The choice between PGBL and VGBL depends on how you file your income tax. PGBL lets you deduct up to 12% of taxable income on the full tax return, but on withdrawal the tax applies to the whole amount. VGBL deducts nothing and, on withdrawal, tax applies only to the gains — which suits the simplified return. In both cases the management fee and the loading fee weigh on the long-term result.",
   "expert": "The regressive table reaches 10% after ten years for each contribution, versus the progressive table that follows IRPF brackets; the choice is per plan and the horizon decides which one pays off. There is no come-cotas, which preserves compounding compared with open funds, and portability between plans is tax-free — it lets you swap an expensive product for a better one with no taxable event, as long as it stays within the same modality. In succession, the funds usually bypass probate. The points to watch are the management fee, the loading fee on entry or exit, and the quality and strategy of the fund behind the plan."
  }
 },
 {
  "k": "provento",
  "t": "Provento",
  "te": "Income (dividends, interest)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Provento é o dinheiro que o investimento paga para você sem precisar vender nada: dividendo de ação, rendimento de fundo imobiliário, juros de um título.",
   "medio": "Proventos entram como dinheiro novo na conta. Para o juro composto funcionar, esse dinheiro precisa voltar a ser investido — provento parado na conta é rendimento parado. O app registra cada provento como movimentação, e é isso que permite calcular o retorno real da carteira, e não só a variação de preço.",
   "expert": "Os proventos de ações no Brasil são dividendos e juros sobre capital próprio (JCP); FIIs pagam rendimentos mensais; títulos pagam cupom. Cada um tem tratamento fiscal próprio, e a data que importa é a \"data com\" (quem tem o papel nela recebe), não a de pagamento — na \"data ex\" o preço cai aproximadamente pelo valor do provento. Dividend yield alto exige leitura: costuma refletir preço em queda ou distribuição não recorrente (yield trap). Payout, geração de caixa livre e recorrência dizem se o yield é renda ou miragem."
  },
  "en": {
   "iniciante": "Income here means the money an investment pays you without you having to sell anything: a stock dividend, a real-estate fund payout, the interest on a bond.",
   "medio": "Income lands as fresh cash in the account. For compounding to work, that cash has to be invested again — income sitting in the account is return standing still. The app records each payment as a transaction, and that is what allows it to compute the portfolio’s real return, not just the price change.",
   "expert": "Stock income in Brazil comes as dividends and interest on equity (JCP); FIIs pay monthly distributions; bonds pay coupons. Each has its own tax treatment, and the date that matters is the record date (whoever holds the security then gets paid), not the payment date — on the ex-date the price drops by roughly the amount paid. A high dividend yield needs reading: it usually reflects a falling price or a non-recurring distribution (yield trap). Payout, free cash flow generation and recurrence tell you whether the yield is income or a mirage."
  }
 },
 {
  "k": "rebalanceamento-quando",
  "t": "Quando rebalancear",
  "te": "When to rebalance",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É a regra que diz quando ajustar a carteira de volta para a divisão que você escolheu: numa data fixa, como uma vez por ano, ou quando algo se desvia demais do alvo.",
   "medio": "Existem duas regras comuns: por calendário (a cada 6 ou 12 meses) e por desvio (quando uma classe passa de X pontos do alvo). Rebalancear demais gera custo e imposto; de menos deixa a carteira virar outra coisa sem você perceber. A forma mais barata que aparece na prática é direcionar os aportes novos para o que está abaixo do alvo, sem vender nada.",
   "expert": "A literatura aponta bandas de tolerância de cerca de 20% relativas ao peso-alvo (ou 5 pontos percentuais absolutos), checadas em periodicidade anual, como bom equilíbrio entre aderência à alocação e custo de transação e tributário. O ganho do rebalanceamento vem mais do controle de risco do que de um prêmio de retorno: ele impede que a classe que mais subiu domine a carteira. Rebalancear por aportes evita evento tributável; rebalancear por venda em ações no Brasil pode ficar dentro da isenção mensal de vendas quando o volume é pequeno, o que muda o custo efetivo da operação."
  },
  "en": {
   "iniciante": "It is the rule that says when to bring the portfolio back to the split you chose: on a fixed date, such as once a year, or when something drifts too far from target.",
   "medio": "There are two common rules: by calendar (every 6 or 12 months) and by drift (when an asset class moves more than X points away from target). Rebalancing too often creates costs and taxes; too rarely lets the portfolio quietly turn into something else. The cheapest way that shows up in practice is steering new contributions to whatever is below target, without selling anything.",
   "expert": "The literature points to tolerance bands of about 20% relative to the target weight (or 5 absolute percentage points), checked yearly, as a good balance between sticking to the allocation and transaction and tax costs. The gain from rebalancing comes more from risk control than from a return premium: it stops the class that rose most from dominating the portfolio. Rebalancing through contributions avoids a taxable event; rebalancing by selling stocks in Brazil can fall within the monthly sales exemption when volumes are small, which changes the effective cost of the operation."
  }
 },
 {
  "k": "rebalanceamento",
  "t": "Rebalanceamento",
  "te": "Rebalancing",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É voltar a carteira para as porcentagens que você escolheu. Se as ações subiram muito e viraram metade da carteira quando você queria um terço, você vende um pouco delas ou põe dinheiro novo no resto.",
   "medio": "Rebalancear faz você vender o que subiu e comprar o que ficou para trás de forma automática, sem depender de emoção. Uma regra comum é fazer isso a cada 6 ou 12 meses, ou quando alguma classe se desviar mais de 5 pontos do alvo. Aportar no que está abaixo do alvo rebalanceia sem precisar vender nada.",
   "expert": "Rebalanceamento por banda de tolerância supera o por calendário em custo fiscal, porque só age quando o desvio justifica. Aportes direcionados à classe subalocada rebalanceiam sem gerar evento tributável; vendas realizam ganho e podem gerar imposto. O efeito de longo prazo é manter o risco da carteira dentro do que foi decidido — uma carteira 60/40 que nunca é rebalanceada tende a virar 80/20 depois de um ciclo de alta, com o dobro da exposição que a pessoa escolheu."
  },
  "en": {
   "iniciante": "It is bringing the portfolio back to the percentages you chose. If stocks rose a lot and became half the portfolio when you wanted a third, you sell a bit of them or put new money into the rest.",
   "medio": "Rebalancing makes you sell what went up and buy what lagged, automatically, without relying on emotion. A common rule is doing it every 6 or 12 months, or whenever a class drifts more than 5 points from target. Contributing to whatever is below target rebalances with no need to sell.",
   "expert": "Rebalancing by tolerance band beats calendar rebalancing on tax cost, because it acts only when the drift justifies it. Contributions steered to the under-allocated class rebalance with no taxable event; sales realise gains and may trigger tax. The long-run effect is keeping portfolio risk within what was decided — a 60/40 portfolio that is never rebalanced tends to become 80/20 after a bull cycle, with twice the exposure the person chose."
  }
 },
 {
  "k": "regra-4",
  "t": "Regra dos 4%",
  "te": "The 4% rule",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "A regra dos 4% diz que, de um patrimônio bem dividido, dá para retirar 4% por ano por décadas sem o dinheiro acabar.",
   "medio": "Ela vem de estudos feitos com dados americanos e não é uma lei. Serve como referência rápida: R$ 1 milhão a 4% são R$ 40 mil por ano, corrigidos pela inflação. No Brasil, com juro real mais alto, taxas um pouco maiores podem funcionar, mas exigem cuidado com a inflação e com a ordem em que os retornos acontecem.",
   "expert": "A regra nasce dos estudos de Bengen e do Trinity Study com séries americanas de ações e títulos, para um horizonte de 30 anos: retirar 4% do saldo inicial e corrigir a retirada pela inflação a cada ano teria sobrevivido a quase todas as janelas históricas. Os pontos frágeis são o risco de sequência de retornos (quedas nos primeiros anos consomem o capital antes de ele render), a hipótese de custos baixos e a alocação usada nos estudos. Juro real alto amplia a taxa sustentável; horizontes maiores que 30 anos e alocações conservadoras demais a reduzem."
  },
  "en": {
   "iniciante": "The 4% rule says that, from a well-diversified pot, you can withdraw 4% a year for decades without the money running out.",
   "medio": "It comes from studies based on US data and it is not a law. It works as a quick reference: R$ 1 million at 4% is R$ 40 thousand a year, inflation-adjusted. In Brazil, with higher real interest rates, slightly higher rates can work, but they demand care with inflation and with the order in which returns arrive.",
   "expert": "The rule comes from Bengen’s work and the Trinity Study on US stock and bond series over a 30-year horizon: withdrawing 4% of the starting balance and raising the withdrawal with inflation each year would have survived almost every historical window. Its weak points are sequence-of-returns risk (early drops eat capital before it can compound), the low-cost assumption, and the allocation used in the studies. High real rates widen the sustainable rate; horizons beyond 30 years and overly conservative allocations shrink it."
  }
 },
 {
  "k": "reit",
  "t": "REIT (o fundo imobiliário americano)",
  "te": "REIT (the US real-estate trust)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "O REIT é o primo americano do FII: uma empresa de imóveis listada em bolsa que distribui quase todo o lucro aos acionistas.",
   "medio": "Por lei, os REITs distribuem pelo menos 90% do lucro tributável, por isso pagam dividendos altos e frequentes. Para quem investe do Brasil, esses dividendos chegam com retenção de 30% nos Estados Unidos. Eles negociam como ação: preço muda o dia todo e a compra é pela corretora internacional.",
   "expert": "A exigência de distribuir pelo menos 90% do lucro tributável é o que dá ao REIT a isenção de imposto de renda no nível da empresa nos EUA; os 30% de retenção na fonte para o investidor brasileiro incidem sobre o dividendo, e o tratamento na declaração brasileira segue as regras de rendimento do exterior. Na análise, o lucro contábil engana por causa da depreciação dos imóveis: as métricas usadas são FFO e AFFO. Completam a leitura o nível de dívida, o prazo médio ponderado dos contratos (WALT) e o spread entre o cap rate dos imóveis e o Treasury de prazo equivalente."
  },
  "en": {
   "iniciante": "A REIT is the US cousin of the FII: a listed real-estate company that distributes almost all of its profit to shareholders.",
   "medio": "By law, REITs distribute at least 90% of taxable profit, which is why they pay high, frequent dividends. For someone investing from Brazil, those dividends arrive with 30% withheld in the United States. They trade like a stock: the price moves all day and you buy through an international broker.",
   "expert": "The requirement to distribute at least 90% of taxable profit is what gives a REIT its exemption from corporate income tax in the US; the 30% withholding for a Brazilian investor applies to the dividend, and the treatment on the Brazilian return follows the rules for foreign income. In analysis, accounting profit misleads because of property depreciation: the metrics used are FFO and AFFO. The reading is completed by debt level, weighted average lease term (WALT) and the spread between the properties’ cap rate and the Treasury of equivalent maturity."
  }
 },
 {
  "k": "renda-fixa",
  "t": "Renda fixa",
  "te": "Fixed income",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "Renda fixa é quando você empresta dinheiro — para um banco, uma empresa ou o governo — e sabe desde o começo a regra do quanto vai receber de volta.",
   "medio": "\"Fixa\" é a regra, não necessariamente o valor final. Um título IPCA+ tem regra fixa (inflação mais 6%, por exemplo), mas o valor que você recebe depende da inflação que acontecer. E se você vender antes do vencimento, recebe o preço de mercado daquele dia, que pode ser mais ou menos que o combinado. Quem leva até o fim recebe exatamente a regra.",
   "expert": "O preço de um título é o valor presente do fluxo de pagamentos descontado pela curva de juros; quando a taxa de mercado sobe, o preço cai, e vice-versa. Duration mede essa sensibilidade: um título de duration 8 perde cerca de 8% se a taxa subir 1 ponto percentual. Por isso a marcação a mercado pode mostrar perda relevante em títulos longos mesmo sem risco de crédito. Os três indexadores brasileiros — prefixado, pós-fixado atrelado ao CDI/Selic e híbrido IPCA+ — respondem de forma diferente a inflação e a ciclo de juros, e é essa diferença que a alocação em renda fixa explora."
  },
  "en": {
   "iniciante": "Fixed income is when you lend money — to a bank, a company or the government — and know from the start the rule for how much you will get back.",
   "medio": "\"Fixed\" is the rule, not necessarily the final amount. An IPCA+ bond has a fixed rule (inflation plus 6%, say), but what you receive depends on the inflation that actually happens. And if you sell before maturity, you get that day’s market price, which can be more or less than agreed. Whoever holds to the end receives exactly the rule.",
   "expert": "A bond’s price is the present value of its payments discounted by the yield curve; when market rates rise, the price falls, and vice versa. Duration measures that sensitivity: a bond with a duration of 8 loses about 8% if rates rise by 1 percentage point. That is why mark-to-market can show a meaningful loss on long bonds even with no credit risk. Brazil’s three indexers — fixed-rate, floating tied to CDI/Selic, and hybrid IPCA+ — respond differently to inflation and to the rate cycle, and that difference is what fixed-income allocation exploits."
  }
 },
 {
  "k": "renda-passiva",
  "t": "Renda passiva",
  "te": "Passive income",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Renda passiva é o dinheiro que entra sem você precisar trabalhar por ele: aluguel de fundo imobiliário, dividendo de ação, juros de renda fixa.",
   "medio": "Para estimar a renda mensal que um patrimônio gera, a conta é simples: patrimônio × rendimento anual ÷ 12. Com uma regra de retirada de 4% ao ano, R$ 1 milhão gera cerca de R$ 3,3 mil por mês corrigidos pela inflação. Renda passiva de verdade é a que se sustenta sem corroer o patrimônio que a produz.",
   "expert": "A distinção que importa é entre renda distribuída e retorno total: um FII que paga 0,8% ao mês mas cuja cota cai 10% no ano não entregou renda, entregou devolução de capital. A renda sustentável é a fração do retorno total que pode ser consumida mantendo o poder de compra do principal — em termos reais, algo próximo ao juro real de longo prazo. Impostos alteram o líquido: rendimento de FII para pessoa física é isento sob condições, dividendos e JCP têm tratamentos distintos, cupom de renda fixa segue a tabela regressiva. O planejamento parte do gasto mensal desejado e resolve para o patrimônio necessário, não o contrário."
  },
  "en": {
   "iniciante": "Passive income is money that comes in without you working for it: real-estate fund payouts, stock dividends, fixed-income interest.",
   "medio": "To estimate the monthly income a pot generates, the maths is simple: net worth × annual yield ÷ 12. With a 4% a year withdrawal rule, R$ 1 million produces about R$ 3.3 thousand a month, inflation-adjusted. Real passive income is the kind that sustains itself without eroding the pot that produces it.",
   "expert": "The distinction that matters is between distributed income and total return: an FII paying 0.8% a month whose unit falls 10% in the year did not deliver income, it returned capital. Sustainable income is the fraction of total return that can be consumed while preserving the principal’s purchasing power — in real terms, close to the long-run real interest rate. Taxes change the net: FII distributions to individuals are exempt under conditions, dividends and JCP are treated differently, fixed-income coupons follow the regressive table. Planning starts from the desired monthly spend and solves for the required net worth, not the other way round."
  }
 },
 {
  "k": "rentabilidade",
  "t": "Rentabilidade",
  "te": "Return",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Rentabilidade é quanto o seu dinheiro cresceu, em porcentagem. Você pôs R$ 100 e hoje tem R$ 110: a rentabilidade foi de 10%.",
   "medio": "O prazo muda tudo: 10% em um mês é muito diferente de 10% em cinco anos. Para comparar investimentos, use sempre o mesmo período, de preferência \"ao ano\". E compare com uma referência — o CDI para renda fixa, um índice para ações — porque render 8% num ano em que o CDI rendeu 12% não é um bom resultado.",
   "expert": "Em carteiras com aportes e resgates, o retorno simples (saldo final ÷ inicial) engana, porque mistura o efeito do dinheiro novo com o dos preços. O TWR (time-weighted return) neutraliza os fluxos e mede a qualidade das escolhas de ativos; o MWR/TIR (money-weighted, ou XIRR) pondera pelos fluxos e mede o resultado do investidor, incluindo o timing dos aportes. O app calcula os dois: a diferença entre eles é o custo ou o ganho das suas decisões de quando entrar e sair. Rentabilidade real desconta a inflação; rentabilidade líquida desconta imposto e custos."
  },
  "en": {
   "iniciante": "Return is how much your money grew, as a percentage. You put in R$ 100 and today you have R$ 110: the return was 10%.",
   "medio": "The period changes everything: 10% in a month is very different from 10% over five years. To compare investments, always use the same period, ideally \"per year\". And compare against a benchmark — the CDI for fixed income, an index for stocks — because earning 8% in a year when the CDI paid 12% is not a good result.",
   "expert": "In portfolios with contributions and withdrawals, the simple return (final ÷ initial balance) misleads, because it mixes the effect of new money with the effect of prices. TWR (time-weighted return) neutralises the flows and measures the quality of asset choices; MWR/IRR (money-weighted, or XIRR) weights by the flows and measures the investor’s result, including the timing of contributions. The app computes both: the gap between them is the cost or gain of your decisions about when to get in and out. Real return subtracts inflation; net return subtracts tax and costs."
  }
 },
 {
  "k": "reserva-emergencia",
  "t": "Reserva de emergência",
  "te": "Emergency fund",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É o dinheiro guardado para imprevistos — de 6 a 12 meses das suas despesas — em algo que você resgata no mesmo dia sem perder valor.",
   "medio": "Ela não é um investimento: é o que impede você de ter que vender seus investimentos no pior momento. Enquanto ela não estiver pronta, correr risco na carteira é apostar contra si mesmo. O padrão é Tesouro Selic ou fundo DI com taxa baixa e resgate no mesmo dia.",
   "expert": "Tesouro Selic e fundo DI com taxa zero e liquidez D+0 são o padrão porque somam liquidez imediata, risco de crédito soberano e marcação a mercado desprezível. Ficam de fora CDB com carência, LCI/LCA com prazo mínimo e qualquer título marcado a mercado com duration relevante. O tamanho cresce com a volatilidade da renda: autônomo precisa de mais meses que servidor público, e quem tem dependentes ou renda única na casa também. Seguros bem dimensionados reduzem o tamanho necessário sem reduzir a proteção."
  },
  "en": {
   "iniciante": "It is the money set aside for the unexpected — 6 to 12 months of your expenses — in something you can withdraw the same day without losing value.",
   "medio": "It is not an investment: it is what stops you from having to sell your investments at the worst moment. Until it is in place, taking risk in the portfolio is betting against yourself. The standard is Tesouro Selic or a low-fee DI fund with same-day withdrawal.",
   "expert": "Tesouro Selic and zero-fee DI funds with same-day liquidity are the standard because they combine immediate liquidity, sovereign credit risk and negligible mark-to-market. Out go CDBs with lock-ups, LCI/LCA with minimum terms and any bond marked to market with meaningful duration. Size grows with income volatility: a self-employed person needs more months than a civil servant, and so does anyone with dependants or a single income at home. Well-sized insurance reduces the required size without reducing the protection."
  }
 },
 {
  "k": "resgate",
  "t": "Resgate",
  "te": "Withdrawal",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Resgate é tirar dinheiro do investimento de volta para a conta. Pode ser tudo ou só uma parte.",
   "medio": "Resgatar não é o mesmo que perder: o efeito na rentabilidade depende de quando você tira. Resgatar no fundo de uma queda transforma um prejuízo que estava só no papel em prejuízo real. O app registra o resgate como movimentação de saída, e é assim que ele separa o que você tirou do que o investimento rendeu.",
   "expert": "Em fundos, o resgate tem duas datas: cotização (D+0 a D+30, conforme o regulamento) e liquidação financeira; o valor que você recebe é o da cota no dia da cotização, não o do pedido. Em renda fixa antes do vencimento vale a marcação a mercado, que pode ser desfavorável em títulos longos. O resgate é o fato gerador do imposto na maioria dos produtos (com come-cotas antecipando parte em fundos abertos), e a alíquota da tabela regressiva depende do prazo de cada aporte, não da data de abertura da conta."
  },
  "en": {
   "iniciante": "A withdrawal is taking money out of an investment back to your account. It can be all of it or just a part.",
   "medio": "Withdrawing is not the same as losing: the effect on return depends on when you take it out. Withdrawing at the bottom of a drop turns a loss that was only on paper into a real one. The app records the withdrawal as an outflow, and that is how it separates what you took out from what the investment earned.",
   "expert": "In funds, a withdrawal has two dates: unit pricing (D+0 to D+30, depending on the rules) and cash settlement; the amount you receive is the unit value on the pricing date, not on the request date. In fixed income before maturity, mark-to-market applies, which can be unfavourable on long bonds. The withdrawal is the taxable event in most products (with come-cotas prepaying part of it in open funds), and the regressive-table rate depends on the age of each contribution, not on when the account was opened."
  }
 },
 {
  "k": "retorno-anualizado",
  "t": "Retorno anualizado",
  "te": "Annualised return",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "É transformar o ganho de qualquer período em \"quanto seria por ano\", para dar para comparar coisas de prazos diferentes.",
   "medio": "Cuidado ao anualizar períodos curtos: render 3% em um mês não é render 36% no ano, é 42,6% — porque o juro composto multiplica, não soma — e muito provavelmente esse ritmo não vai se repetir. Anualizar menos de um ano infla a impressão de resultado.",
   "expert": "A taxa equivalente composta é (1 + r)^(365/dias) − 1, ou (1 + r)^(12/meses) − 1 em base mensal. Não se confunde com o CAGR calculado sobre os valores de ponta a ponta, que ignora fluxos intermediários, nem com a média aritmética de retornos periódicos, que é sempre maior que a média geométrica quando há volatilidade — e é a geométrica que reflete o crescimento real do capital. Anualizar séries curtas amplifica ruído; em avaliação de gestão, o padrão é reportar retornos anualizados só para janelas de um ano ou mais."
  },
  "en": {
   "iniciante": "It means turning the gain of any period into \"how much that would be per year\", so things with different horizons can be compared.",
   "medio": "Be careful annualising short periods: earning 3% in a month is not 36% a year, it is 42.6% — because compounding multiplies rather than adds — and that pace very likely will not repeat. Annualising less than a year inflates the impression of results.",
   "expert": "The compound equivalent rate is (1 + r)^(365/days) − 1, or (1 + r)^(12/months) − 1 on a monthly basis. It is not the same as a CAGR computed on start-to-end values, which ignores interim flows, nor as the arithmetic mean of periodic returns, which is always higher than the geometric mean when there is volatility — and it is the geometric mean that reflects the real growth of capital. Annualising short series amplifies noise; in manager evaluation the standard is to report annualised returns only for windows of one year or more."
  }
 },
 {
  "k": "risco",
  "t": "Risco",
  "te": "Risk",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Risco é a chance de o resultado ser diferente do que você esperava — inclusive de perder dinheiro.",
   "medio": "Risco não é só \"o preço cair\". Existe risco de crédito (quem te deve não paga), de mercado (o preço oscila), de liquidez (você não consegue vender quando precisa), cambial (a moeda muda) e de inflação (o dinheiro perde poder de compra parado). Um investimento \"seguro\" contra um deles pode estar exposto a outro.",
   "expert": "Volatilidade — o desvio-padrão dos retornos — é a medida mais usada, mas é uma proxy incompleta: trata alta e baixa igualmente, ignora assimetria e caudas gordas, e não captura o drawdown máximo, que é o que o investidor sente. Medidas complementares: VaR e CVaR para perda em cenários adversos, downside deviation e índice de Sortino para penalizar só a queda, e teste de estresse histórico para ver como a carteira teria atravessado 2008 ou 2020. Risco de crédito se mede por rating e spread; risco de liquidez pelo volume negociado e pelo prazo de cotização."
  },
  "en": {
   "iniciante": "Risk is the chance that the outcome differs from what you expected — including losing money.",
   "medio": "Risk is not just \"the price going down\". There is credit risk (whoever owes you does not pay), market risk (the price swings), liquidity risk (you cannot sell when you need to), currency risk (the exchange rate moves) and inflation risk (idle money loses purchasing power). An investment that is \"safe\" against one of them can be exposed to another.",
   "expert": "Volatility — the standard deviation of returns — is the most used measure, but an incomplete proxy: it treats up and down the same, ignores skew and fat tails, and does not capture maximum drawdown, which is what the investor actually feels. Complementary measures: VaR and CVaR for losses in adverse scenarios, downside deviation and the Sortino ratio to penalise only the downside, and historical stress tests to see how the portfolio would have gone through 2008 or 2020. Credit risk is measured by rating and spread; liquidity risk by traded volume and unit-pricing lag."
  }
 },
 {
  "k": "roe",
  "t": "ROE — Return on Equity (retorno sobre o patrimônio)",
  "te": "ROE — Return on Equity",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "O ROE mede quanto de lucro a empresa gera para cada real de patrimônio dos sócios.",
   "medio": "ROE = lucro líquido ÷ patrimônio líquido. Um ROE alto e sustentado ao longo dos anos é sinal de negócio bom. O cuidado é verificar de onde ele vem: dívida alta reduz o patrimônio e infla o ROE, junto com o risco.",
   "expert": "A decomposição DuPont separa o ROE em margem líquida × giro do ativo × alavancagem financeira, o que mostra se o retorno vem de eficiência operacional, de uso intensivo de ativos ou de dívida. ROE acima do custo de capital próprio é o que cria valor; abaixo dele, crescer destrói valor mesmo com lucro positivo. Empresas com patrimônio muito reduzido por recompras ou prejuízos acumulados exibem ROE distorcido, e bancos exigem leitura própria porque a alavancagem é parte do modelo."
  },
  "en": {
   "iniciante": "ROE measures how much profit the company generates for each real of shareholders’ equity.",
   "medio": "ROE = net income ÷ shareholders’ equity. A high ROE sustained over the years is a sign of a good business. The care is checking where it comes from: heavy debt shrinks equity and inflates ROE, along with risk.",
   "expert": "The DuPont decomposition splits ROE into net margin × asset turnover × financial leverage, which shows whether the return comes from operating efficiency, intensive use of assets, or debt. ROE above the cost of equity is what creates value; below it, growing destroys value even with a positive profit. Companies whose equity has been shrunk by buybacks or accumulated losses show a distorted ROE, and banks require their own reading because leverage is part of the model."
  }
 },
 {
  "k": "sp500",
  "t": "S&P 500",
  "te": "S&P 500",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "O S&P 500 é o índice das 500 maiores empresas dos Estados Unidos. É a referência mais usada do mundo para responder \"como foi o mercado?\".",
   "medio": "A forma mais popular de ter um pedaço da economia americana inteira é comprar um ETF que segue o S&P 500: VOO, IVV ou SPY na bolsa americana, ou IVVB11 em reais na B3. Quem compra em reais fica exposto também ao dólar, o que muda o resultado em relação ao índice puro.",
   "expert": "O índice é ponderado por capitalização ajustada por free float, com um comitê de seleção discricionário que exige lucro positivo recente para inclusão — o que o diferencia de índices puramente mecânicos. A concentração nas maiores empresas de tecnologia faz com que poucos nomes respondam por uma fatia grande do retorno, reduzindo a diversificação efetiva. IVVB11 replica o índice em reais, então seu retorno é o do S&P 500 mais a variação cambial, com tributação de ETF de renda variável no Brasil; ETFs comprados nos EUA seguem as regras de ganho de capital no exterior e a retenção de 30% sobre dividendos."
  },
  "en": {
   "iniciante": "The S&P 500 is the index of the 500 largest US companies. It is the world’s most used benchmark for answering \"how did the market do?\".",
   "medio": "The most popular way to own a slice of the whole US economy is buying an ETF that tracks the S&P 500: VOO, IVV or SPY on the US exchange, or IVVB11 in reais on B3. Whoever buys in reais is also exposed to the dollar, which changes the result relative to the pure index.",
   "expert": "The index is weighted by float-adjusted market capitalisation, with a discretionary selection committee that requires recent positive earnings for inclusion — which sets it apart from purely mechanical indexes. Concentration in the largest technology companies means a few names account for a large share of the return, reducing effective diversification. IVVB11 replicates the index in reais, so its return is the S&P 500 plus the currency move, taxed as an equity ETF in Brazil; ETFs bought in the US follow the rules for foreign capital gains and the 30% withholding on dividends."
  }
 },
 {
  "k": "selic",
  "t": "Selic",
  "te": "Selic rate",
  "c": "Economia",
  "ce": "Economy",
  "pt": {
   "iniciante": "A Selic é a taxa básica de juros do Brasil, definida pelo Banco Central. Ela puxa para cima ou para baixo o rendimento de quase toda a renda fixa.",
   "medio": "Quando a Selic sobe, a renda fixa rende mais e as ações tendem a sofrer, porque o dinheiro migra para o que é seguro; quando cai, acontece o contrário. Por isso as reuniões do Copom mexem tanto com a bolsa. O Tesouro Selic, os CDBs pós-fixados e os fundos DI seguem essa taxa quase que dia a dia.",
   "expert": "A Selic meta é definida pelo Copom a cada 45 dias; a Selic efetiva (over) resulta das operações compromissadas de um dia lastreadas em títulos públicos e fica levemente abaixo da meta. O CDI acompanha a Selic over com pequeno desconto e é a referência da maior parte dos produtos pós-fixados. A transmissão para a economia passa pelo crédito e pelo câmbio, com defasagem de alguns trimestres; para a carteira, o efeito imediato é na marcação a mercado dos prefixados e no valor presente dos fluxos futuros das ações."
  },
  "en": {
   "iniciante": "The Selic is Brazil’s base interest rate, set by the Central Bank. It pulls the yield of almost all fixed income up or down.",
   "medio": "When the Selic rises, fixed income pays more and stocks tend to suffer, because money migrates to what is safe; when it falls, the opposite happens. That is why Copom meetings move the stock market so much. Tesouro Selic, floating-rate CDBs and DI funds follow this rate almost day by day.",
   "expert": "The target Selic is set by the Copom every 45 days; the effective (overnight) Selic results from one-day repo operations backed by government bonds and sits slightly below target. The CDI tracks the overnight Selic at a small discount and is the reference for most floating-rate products. Transmission to the economy runs through credit and the exchange rate with a lag of a few quarters; for a portfolio, the immediate effect is on the mark-to-market of fixed-rate bonds and on the present value of stocks’ future cash flows."
  }
 },
 {
  "k": "small-cap",
  "t": "Small cap e blue chip (empresas pequenas e gigantes)",
  "te": "Small caps and blue chips",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Blue chips são as empresas grandes e conhecidas da bolsa. Small caps são as menores: mais arriscadas, e com mais espaço para crescer.",
   "medio": "Small caps sofrem mais em crises e quando o juro sobe, porque dependem mais de crédito e do mercado interno. Em troca, quando a economia melhora elas costumam subir mais que as gigantes. Na B3 existe um índice só delas, o SMLL, e ETFs que o seguem.",
   "expert": "A fronteira entre small e large cap é por valor de mercado e varia por bolsa e por índice; na B3, o SMLL reúne as empresas fora das maiores em capitalização e liquidez. Small caps carregam prêmio de risco de tamanho e de liquidez (spread maior, volume menor, mais difícil sair em queda), maior sensibilidade a ciclo de juros e menor cobertura de analistas — o que produz tanto oportunidades de precificação errada quanto risco de informação. A sobreperformance histórica do fator tamanho é irregular e concentrada em períodos específicos."
  },
  "en": {
   "iniciante": "Blue chips are the big, well-known companies on the exchange. Small caps are the smaller ones: riskier, with more room to grow.",
   "medio": "Small caps suffer more in crises and when rates rise, because they depend more on credit and on the domestic market. In return, when the economy improves they usually rise more than the giants. On B3 there is an index just for them, the SMLL, and ETFs that track it.",
   "expert": "The line between small and large cap is drawn by market value and varies by exchange and by index; on B3, the SMLL gathers the companies outside the top tier in capitalisation and liquidity. Small caps carry a size and liquidity risk premium (wider spreads, lower volume, harder to exit in a sell-off), higher sensitivity to the rate cycle and thinner analyst coverage — which produces both mispricing opportunities and information risk. The historical outperformance of the size factor is irregular and concentrated in specific periods."
  }
 },
 {
  "k": "spread-cambial",
  "t": "Spread cambial e IOF",
  "te": "FX spread and IOF",
  "c": "Custos",
  "ce": "Costs",
  "pt": {
   "iniciante": "É a diferença entre a cotação do dólar que aparece no noticiário e a que a corretora realmente te cobra, mais o imposto que incide na operação de câmbio.",
   "medio": "Para mandar dinheiro para investir fora, o IOF é bem menor que o do cartão de crédito. O que pesa é o spread: a instituição compra dólar a um preço e vende a você um pouco mais caro. Comparar o \"dólar efetivo\" — cotação com spread e IOF somados — entre corretoras mostra diferenças que costumam ir de 0,5% a 2% por operação, o que se repete na volta.",
   "expert": "O custo total de uma remessa é spread sobre a PTAX ou sobre a cotação comercial, mais IOF, mais eventual tarifa fixa; a alíquota de IOF depende da natureza da operação (investimento, cartão, disponibilidade no exterior) e já foi alterada mais de uma vez por decreto. O spread não aparece como tarifa: está embutido na cotação. Como há ida e volta, o custo de câmbio total de um investimento no exterior é aproximadamente o dobro do spread de uma perna, e deve ser comparado com o retorno esperado do diferencial de mercado — em prazos curtos ele pode consumir o ganho."
  },
  "en": {
   "iniciante": "It is the difference between the dollar rate you see on the news and the one the broker actually charges you, plus the tax levied on the exchange transaction.",
   "medio": "To send money abroad to invest, the IOF is much lower than on a credit card. What weighs is the spread: the institution buys dollars at one price and sells to you a bit dearer. Comparing the \"effective dollar\" — rate with spread and IOF added — across brokers shows differences that usually run from 0.5% to 2% per transaction, repeated on the way back.",
   "expert": "The total cost of a remittance is the spread over PTAX or the commercial rate, plus IOF, plus any flat fee; the IOF rate depends on the nature of the transaction (investment, card, funds held abroad) and has been changed by decree more than once. The spread does not show up as a fee: it is built into the rate. Because there is a round trip, the total FX cost of a foreign investment is roughly twice the one-way spread, and should be compared with the expected return from the market differential — over short horizons it can eat the gain."
  }
 },
 {
  "k": "stablecoin",
  "t": "Stablecoin (cripto atrelada a uma moeda)",
  "te": "Stablecoin",
  "c": "Cripto",
  "ce": "Crypto",
  "pt": {
   "iniciante": "Stablecoin é uma criptomoeda feita para valer sempre US$ 1, como USDT e USDC. Serve para guardar valor em dólar dentro do mundo cripto.",
   "medio": "Não é a mesma coisa que dólar no banco: o valor depende da solidez de quem emite e das reservas que essa empresa mantém para honrar os resgates. Já houve stablecoin que perdeu a paridade e não voltou. Ela não rende nada por si só — o que existe são plataformas que pagam para você emprestar a sua, e aí o risco é de outra natureza.",
   "expert": "Três desenhos com riscos distintos: colateralizada em moeda fiduciária (USDC, USDT), que depende de reservas em caixa e títulos e da auditoria delas; cripto-colateralizada com sobrecolateral (DAI), que depende da liquidação automática dos colaterais em queda; e algorítmica, sem lastro pleno, com histórico de colapso. A análise passa por atestações de reserva (frequência, auditor, composição), custodiantes, jurisdição do emissor e mecanismo de resgate direto — quem só pode sair vendendo no mercado secundário assume o risco de desconto em estresse. Para o residente brasileiro, stablecoin é ativo virtual para fins de declaração e de apuração de ganho."
  },
  "en": {
   "iniciante": "A stablecoin is a cryptocurrency built to always be worth US$ 1, such as USDT and USDC. It is used to hold dollar value inside the crypto world.",
   "medio": "It is not the same as dollars in a bank: its value depends on the soundness of the issuer and on the reserves that company keeps to honour redemptions. Stablecoins have lost their peg before and not come back. It earns nothing on its own — what exists are platforms that pay you to lend yours, and then the risk is of a different kind.",
   "expert": "Three designs with distinct risks: fiat-collateralised (USDC, USDT), which depends on cash and bond reserves and their audit; crypto-collateralised with overcollateral (DAI), which depends on automatic liquidation of collateral in a downturn; and algorithmic, without full backing, with a history of collapse. Analysis covers reserve attestations (frequency, auditor, composition), custodians, issuer jurisdiction and the direct redemption mechanism — anyone who can only exit by selling on the secondary market takes on discount risk under stress. For a Brazilian resident, a stablecoin is a virtual asset for reporting and capital-gains purposes."
  }
 },
 {
  "k": "suitability",
  "t": "Suitability (questionário de perfil)",
  "te": "Suitability (profile questionnaire)",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Suitability é o nome técnico do questionário de perfil. Ele existe para a instituição não vender um produto arriscado demais para quem não aguenta a oscilação.",
   "medio": "No Brasil ele é obrigatório por norma da CVM e precisa ser refeito de tempos em tempos, normalmente a cada 24 meses. Se você responde para agradar — dizendo que aguenta mais risco do que aguenta — o resultado fica inútil, porque o único prejudicado por um perfil inflado é você. O app usa um questionário parecido, mas para você se conhecer, não para carimbar.",
   "expert": "A Resolução CVM 30 exige que a instituição avalie objetivos, situação financeira e conhecimento do cliente, classifique o perfil e se abstenha de recomendar produto inadequado sem alerta formal e registro de ciência. O questionário é um instrumento de conformidade da instituição — na prática, muitas o tratam como formalidade de cadastro. O diagnóstico útil separa capacidade objetiva de tolerância comportamental, e o comportamento observado em quedas passadas vale mais do que qualquer resposta em formulário."
  },
  "en": {
   "iniciante": "Suitability is the technical name for the profile questionnaire. It exists so the institution does not sell a product too risky for someone who cannot stand the swings.",
   "medio": "In Brazil it is mandatory under a CVM rule and has to be redone from time to time, usually every 24 months. If you answer to please — claiming more risk tolerance than you have — the result becomes useless, because the only person hurt by an inflated profile is you. The app uses a similar questionnaire, but for you to know yourself, not to stamp a form.",
   "expert": "CVM Resolution 30 requires the institution to assess the client’s objectives, financial situation and knowledge, classify the profile, and refrain from recommending an unsuitable product without a formal warning and acknowledgement on record. The questionnaire is the institution’s compliance instrument — in practice, many treat it as an onboarding formality. A useful diagnosis separates objective capacity from behavioural tolerance, and behaviour observed in past drops is worth more than any answer on a form."
  }
 },
 {
  "k": "tabela-regressiva",
  "t": "Tabela regressiva do IR",
  "te": "Regressive income-tax table",
  "c": "Impostos",
  "ce": "Tax",
  "pt": {
   "iniciante": "Na renda fixa, quanto mais tempo o dinheiro fica aplicado, menor o imposto sobre o ganho: começa em 22,5% e cai até 15% depois de dois anos.",
   "medio": "As faixas são 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias. O prazo conta a partir de cada aporte, não da abertura da conta. Resgatar poucos dias antes de virar a faixa custa caro, porque o imposto incide sobre todo o rendimento acumulado.",
   "expert": "A tabela vale para CDB, RDB, LC, Tesouro Direto, debêntures não incentivadas e fundos de longo prazo; o imposto é retido na fonte pela instituição no resgate ou vencimento, sobre o rendimento nominal (sem correção pela inflação). Em fundos abertos, o come-cotas antecipa semestralmente a menor alíquota da tabela (15% em longo prazo, 20% em curto prazo), e o ajuste para a alíquota efetiva acontece no resgate. Títulos com prazo médio de carteira até 365 dias seguem a tabela de curto prazo, cujo piso é 20%. Nos primeiros 30 dias incide ainda o IOF regressivo, antes do IR."
  },
  "en": {
   "iniciante": "In fixed income, the longer the money stays invested, the lower the tax on the gain: it starts at 22.5% and drops to 15% after two years.",
   "medio": "The brackets are 22.5% up to 180 days, 20% from 181 to 360, 17.5% from 361 to 720 and 15% beyond 720 days. The clock runs from each contribution, not from when the account was opened. Withdrawing a few days before crossing a bracket is expensive, because the tax applies to the whole accumulated gain.",
   "expert": "The table applies to CDB, RDB, LC, Tesouro Direto, non-incentivised debentures and long-term funds; the tax is withheld at source by the institution on withdrawal or maturity, on the nominal gain (no inflation adjustment). In open funds, come-cotas prepays twice a year at the table’s lowest rate (15% for long-term, 20% for short-term funds), with the true-up to the effective rate on withdrawal. Funds whose average portfolio maturity is up to 365 days follow the short-term table, whose floor is 20%. In the first 30 days the regressive IOF also applies, before income tax."
  }
 },
 {
  "k": "tag-along",
  "t": "Tag along (direito de vender junto)",
  "te": "Tag-along rights",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Tag along é o direito de vender a sua ação junto quando alguém compra o controle da empresa, recebendo pelo menos parte do preço que o comprador pagou ao dono anterior.",
   "medio": "Por lei, as ações ON têm no mínimo 80% do valor pago ao controlador. As PN só têm tag along se o estatuto da empresa der. No Novo Mercado da B3 é 100% para todos. É uma proteção que fica invisível até o dia em que a empresa é vendida — e nesse dia faz uma diferença enorme no que você recebe.",
   "expert": "O direito está no art. 254-A da Lei 6.404/76 e obriga o adquirente do controle a fazer oferta pública pelas ações com direito a voto dos minoritários por pelo menos 80% do preço pago por ação do bloco de controle. A base de cálculo é o preço pago pelas ações que integram o bloco, não a cotação em bolsa, e aquisições em etapas ou via holding já foram usadas para reduzir o valor efetivo da oferta. Segmentos de listagem elevam o piso por regulamento: Novo Mercado e Nível 2 exigem 100%, e o Nível 2 estende o direito às preferenciais."
  },
  "en": {
   "iniciante": "Tag-along is the right to sell your share alongside when someone buys control of the company, receiving at least part of the price the buyer paid the previous owner.",
   "medio": "By law, ON (voting) shares get at least 80% of the price paid to the controller. PN (preferred) shares only have tag-along if the company’s bylaws grant it. On B3’s Novo Mercado it is 100% for everyone. It is a protection that stays invisible until the day the company is sold — and on that day it makes a huge difference to what you receive.",
   "expert": "The right sits in article 254-A of Law 6,404/76 and obliges the acquirer of control to make a public offer for minority voting shares at no less than 80% of the price paid per share of the controlling block. The base is the price paid for the shares in the block, not the market quote, and staged acquisitions or purchases through a holding company have been used to shrink the effective offer. Listing segments raise the floor by rulebook: Novo Mercado and Nível 2 require 100%, and Nível 2 extends the right to preferred shares."
  }
 },
 {
  "k": "taxa-administracao",
  "t": "Taxa de administração",
  "te": "Management fee",
  "c": "Custos",
  "ce": "Costs",
  "pt": {
   "iniciante": "É o que o fundo cobra por ano para cuidar do seu dinheiro. Ela é descontada um pouquinho todo dia do valor da cota, por isso você não vê o débito.",
   "medio": "Parece pequena, mas 2% ao ano durante 20 anos consomem cerca de um terço do que você teria acumulado. Em ETFs de índice ela costuma ficar abaixo de 0,3%; em fundos de gestão ativa, entre 1% e 2%; em previdência de banco, às vezes mais. A rentabilidade divulgada pelo fundo já vem líquida dessa taxa.",
   "expert": "A taxa incide sobre o patrimônio líquido, provisionada diariamente pro rata, e independe do resultado — por isso o efeito composto: uma taxa de 2% a.a. sobre um retorno bruto de 8% a.a. consome 25% do retorno em cada ano, e a diferença acumulada cresce geometricamente. Em fundos de fundos há dupla camada (taxa do fundo mais a dos fundos investidos), que o regulamento deve informar como taxa máxima. A comparação correta entre produtos é pelo custo total (TER), que soma administração, performance, custódia e despesas do fundo."
  },
  "en": {
   "iniciante": "It is what the fund charges per year to look after your money. It is deducted a tiny bit every day from the unit value, which is why you never see the debit.",
   "medio": "It looks small, but 2% a year over 20 years eats about a third of what you would have accumulated. In index ETFs it is usually below 0.3%; in actively managed funds, between 1% and 2%; in bank pension plans, sometimes more. The return a fund publishes is already net of this fee.",
   "expert": "The fee is charged on net assets, accrued daily pro rata, and does not depend on results — hence the compounding effect: a 2% p.a. fee on an 8% p.a. gross return consumes 25% of the return every year, and the accumulated gap grows geometrically. In funds of funds there is a double layer (the fund’s fee plus the fees of the underlying funds), which the rules must disclose as a maximum fee. The correct comparison between products is by total expense ratio (TER), which adds management, performance, custody and fund expenses."
  }
 },
 {
  "k": "taxa-performance",
  "t": "Taxa de performance",
  "te": "Performance fee",
  "c": "Custos",
  "ce": "Costs",
  "pt": {
   "iniciante": "É uma taxa extra que alguns fundos cobram quando rendem mais que a referência deles — em geral 20% do que passar do CDI ou do Ibovespa.",
   "medio": "O detalhe que importa é a linha d’água (high-water mark): com ela, o gestor só cobra performance depois de recuperar qualquer prejuízo anterior. Sem ela, ele pode cobrar por recuperar uma perda que ele mesmo causou. A taxa de performance existe para alinhar o gestor ao cotista, mas também incentiva a assumir mais risco quando o fundo está abaixo da meta.",
   "expert": "A cobrança é sobre o excedente ao benchmark, apurada em períodos definidos no regulamento (semestral é comum), e a linha d’água exige que o fundo supere o maior valor histórico de cota ajustado antes de nova cobrança. Sem linha d’água, há cobrança em cima de recuperação, o que transfere risco ao cotista. O benchmark escolhido também importa: um fundo de ações que cobra performance sobre o CDI cobra em cima de um prêmio de risco que o cotista já corre. Fundos com performance assimétrica (o gestor participa do ganho, não da perda) têm incentivo documentado a elevar a volatilidade quando estão abaixo da meta."
  },
  "en": {
   "iniciante": "It is an extra fee some funds charge when they beat their benchmark — usually 20% of whatever exceeds the CDI or the Ibovespa.",
   "medio": "The detail that matters is the high-water mark: with it, the manager only charges performance after recovering any previous loss. Without it, they can charge for recovering a loss they themselves caused. The performance fee exists to align manager and investor, but it also encourages taking more risk when the fund is below target.",
   "expert": "It is charged on the excess over the benchmark, assessed over periods set in the rules (half-yearly is common), and the high-water mark requires the fund to beat its highest adjusted historical unit value before charging again. Without a high-water mark, fees are charged on recoveries, which shifts risk to the investor. The chosen benchmark matters too: an equity fund charging performance over the CDI charges on top of a risk premium the investor already bears. Funds with asymmetric performance fees (the manager shares the gain, not the loss) have a documented incentive to raise volatility when below target."
  }
 },
 {
  "k": "tesouro-direto",
  "t": "Tesouro Direto",
  "te": "Tesouro Direto (Brazilian treasury bonds)",
  "c": "Renda fixa",
  "ce": "Fixed income",
  "pt": {
   "iniciante": "É o programa que deixa você emprestar dinheiro para o governo brasileiro a partir de uns R$ 30. É considerado o investimento mais seguro do país.",
   "medio": "São três famílias: Tesouro Selic (pós-fixado, o padrão para reserva de emergência), Prefixado (taxa travada no dia da compra) e IPCA+ (inflação mais uma taxa fixa, para longo prazo). O Tesouro Selic é o único que praticamente não oscila; os outros dois sobem e descem de preço todo dia, embora entreguem exatamente a regra para quem leva até o vencimento.",
   "expert": "Prefixados (LTN, NTN-F) e IPCA+ (NTN-B) sofrem marcação a mercado diária: o preço é o valor presente dos fluxos pela curva do dia, e a sensibilidade é dada pela duration. Na família IPCA+, a versão com cupom semestral (NTN-B) tem duration menor e fluxo de caixa periódico, com reinvestimento a fazer; a versão Principal (NTN-B Principal) paga tudo no vencimento e tem duration maior. A liquidez é diária por recompra do Tesouro ao preço de mercado; a tributação segue a tabela regressiva na fonte, e a custódia na B3 tem taxa própria com faixa de isenção para o Tesouro Selic."
  },
  "en": {
   "iniciante": "It is the programme that lets you lend money to the Brazilian government from about R$ 30. It is considered the safest investment in the country.",
   "medio": "There are three families: Tesouro Selic (floating, the standard for an emergency fund), Prefixado (rate locked on the day you buy) and IPCA+ (inflation plus a fixed rate, for the long run). Tesouro Selic is the only one that barely moves; the other two rise and fall in price every day, although they deliver exactly the rule to whoever holds to maturity.",
   "expert": "Fixed-rate bonds (LTN, NTN-F) and IPCA+ (NTN-B) are marked to market daily: the price is the present value of the cash flows on the day’s curve, and the sensitivity is given by duration. Within the IPCA+ family, the version with a half-yearly coupon (NTN-B) has lower duration and periodic cash flow that must be reinvested; the Principal version (NTN-B Principal) pays everything at maturity and has higher duration. Liquidity is daily through Treasury buy-back at market price; taxation follows the regressive table withheld at source, and B3 custody carries its own fee with an exemption band for Tesouro Selic."
  }
 },
 {
  "k": "ticker",
  "t": "Ticker (código)",
  "te": "Ticker (symbol)",
  "c": "Básico",
  "ce": "Basics",
  "pt": {
   "iniciante": "Ticker é a sigla do investimento na bolsa. PETR4 é a Petrobras PN, AAPL é a Apple.",
   "medio": "No Brasil, o número no fim do código diz o tipo de papel: 3 é ação ordinária (ON), 4 é preferencial (PN), 11 é unit, BDR ou fundo, e 34 identifica BDR de ação americana. Nos Estados Unidos os códigos são só letras. Para cotar, o app precisa do ticker exato — um dígito errado busca outro papel.",
   "expert": "Os sufixos numéricos da B3 seguem convenção: 3 ON, 4 PN (5 e 6 para classes A e B de PN), 11 para units, FIIs, ETFs e BDRs de ETF, 31/32/33/34/35 para BDRs patrocinados e não patrocinados por classe, e códigos terminados em F para o mercado fracionário. Fontes de cotação usam sufixos próprios (PETR4.SA no padrão Yahoo), e o mesmo emissor pode ter ISIN diferente por classe. Em eventos societários — grupamento, incorporação, troca de ticker — a série histórica pode quebrar, e é por isso que o app guarda o preço médio por posição, não por código."
  },
  "en": {
   "iniciante": "A ticker is the investment’s code on the exchange. PETR4 is Petrobras PN, AAPL is Apple.",
   "medio": "In Brazil, the number at the end of the code tells you the type of security: 3 is a common share (ON), 4 is preferred (PN), 11 is a unit, BDR or fund, and 34 identifies a BDR of a US stock. In the United States, tickers are letters only. To fetch a quote the app needs the exact ticker — one wrong digit fetches another security.",
   "expert": "B3’s numeric suffixes follow a convention: 3 ON, 4 PN (5 and 6 for PN classes A and B), 11 for units, FIIs, ETFs and ETF BDRs, 31/32/33/34/35 for sponsored and unsponsored BDRs by class, and codes ending in F for the odd-lot market. Quote sources use their own suffixes (PETR4.SA in the Yahoo standard), and the same issuer can have a different ISIN per class. In corporate events — reverse splits, mergers, ticker changes — the price history can break, which is why the app stores average cost per position, not per code."
  }
 },
 {
  "k": "tolerancia-risco",
  "t": "Tolerância a risco",
  "te": "Risk tolerance",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Tolerância a risco é quanto de sobe-e-desce você aguenta ver sem perder o sono e sem vender no pior momento.",
   "medio": "É a metade subjetiva do perfil de investidor — a outra é a capacidade, que é objetiva. Quase todo mundo superestima a própria tolerância em mercado de alta e descobre a verdade na primeira queda de 20%. O que você fez da última vez que a carteira caiu diz mais do que qualquer questionário.",
   "expert": "Mede-se por escalas psicométricas e, com mais confiabilidade, por preferência revelada: o comportamento efetivo em drawdowns anteriores. A aversão a perda descrita por Kahneman e Tversky faz a dor de perder pesar cerca de duas vezes o prazer de ganhar o mesmo valor, o que explica vendas em pânico mesmo em carteiras adequadas à capacidade. A tolerância varia com o estado do mercado (procíclica), com a idade e com a experiência acumulada; por isso a alocação deve ser dimensionada para a tolerância no pior momento, não para a declarada na alta."
  },
  "en": {
   "iniciante": "Risk tolerance is how much up-and-down you can watch without losing sleep and without selling at the worst moment.",
   "medio": "It is the subjective half of the investor profile — the other half is capacity, which is objective. Almost everyone overestimates their own tolerance in a rising market and finds out the truth in the first 20% drop. What you did the last time the portfolio fell says more than any questionnaire.",
   "expert": "It is measured with psychometric scales and, more reliably, by revealed preference: actual behaviour in previous drawdowns. The loss aversion described by Kahneman and Tversky makes the pain of losing weigh about twice the pleasure of gaining the same amount, which explains panic selling even in portfolios suited to capacity. Tolerance varies with the market state (procyclical), with age and with accumulated experience; that is why the allocation should be sized for tolerance at the worst moment, not for what was declared at the top."
  }
 },
 {
  "k": "twr",
  "t": "TWR — Time-Weighted Return (retorno da estratégia)",
  "te": "TWR — Time-Weighted Return",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Em português: retorno ponderado pelo tempo, ou \"retorno da estratégia\". É quanto a carteira rendeu ignorando quando você colocou ou tirou dinheiro. Mede a qualidade das escolhas, não a hora dos aportes.",
   "medio": "É o número que fundos e gestores divulgam, e o único justo para comparar com CDI, Ibovespa ou S&P 500 — porque o índice não recebe aportes. O app mostra o TWR ao lado do XIRR: se o TWR é bom e o XIRR é fraco, as escolhas foram boas e o momento dos aportes, ruim; se é o contrário, você acertou o timing mais do que os ativos.",
   "expert": "O TWR encadeia os retornos dos sub-períodos delimitados por cada fluxo: TWR = Π(1 + (V_fim,i − F_i) / V_ini,i) − 1, em que F_i é o fluxo do sub-período. Como cada sub-período é medido sem o efeito do dinheiro que entrou ou saiu, o resultado independe do tamanho e da data dos aportes. Quanto mais frequente a marcação (diária, no caso do app), menor a distorção causada pela premissa de que o fluxo ocorre no fim do sub-período. É a métrica padrão GIPS para avaliação de gestores justamente por isolar a decisão de alocação da decisão de timing do investidor."
  },
  "en": {
   "iniciante": "In plain terms: time-weighted return, or \"the strategy’s return\". It is how much the portfolio earned ignoring when you put money in or took it out. It measures the quality of the choices, not the timing of contributions.",
   "medio": "It is the number funds and managers publish, and the only fair one to compare with the CDI, the Ibovespa or the S&P 500 — because an index receives no contributions. The app shows TWR next to XIRR: if TWR is good and XIRR is weak, the choices were good and the timing of contributions poor; if it is the other way round, you got the timing right more than the assets.",
   "expert": "TWR chains the returns of the sub-periods delimited by each cash flow: TWR = Π(1 + (V_end,i − F_i) / V_start,i) − 1, where F_i is the sub-period’s flow. Because each sub-period is measured without the effect of money coming in or out, the result is independent of the size and date of contributions. The more frequent the valuation (daily, in the app’s case), the smaller the distortion from assuming the flow happens at the end of the sub-period. It is the GIPS standard metric for evaluating managers precisely because it isolates the allocation decision from the investor’s timing decision."
  }
 },
 {
  "k": "unit",
  "t": "Unit (pacote de ações)",
  "te": "Unit (share bundle)",
  "c": "Renda variável",
  "ce": "Equities",
  "pt": {
   "iniciante": "Unit é um pacote que junta vários tipos de ação da mesma empresa num único papel. O código termina em 11 — como SANB11, TAEE11, KLBN11.",
   "medio": "Comprando uma unit você leva, por exemplo, 1 ação ON e 2 PN de uma vez. O final 11 também é usado por FIIs (MXRF11) e ETFs (BOVA11), então é o nome do ativo que diz o que é cada um. Proventos da unit são a soma dos proventos das ações que a compõem.",
   "expert": "A composição da unit está no estatuto ou no prospecto (1 ON + 2 PN em SANB11 e TAEE11; 1 ON + 4 PN em KLBN11), e ela pode ser desmembrada nas ações originais mediante pedido ao escriturador, com prazo e eventual custo. Direitos políticos e econômicos são os das ações subjacentes na proporção; tag along, por exemplo, pode diferir entre a parcela ON e a PN. A liquidez costuma se concentrar na unit, o que faz o preço dela às vezes se descolar da soma das partes — a arbitragem via desmembramento tende a fechar o spread."
  },
  "en": {
   "iniciante": "A unit is a bundle that groups several share types of the same company into a single security. The code ends in 11 — like SANB11, TAEE11, KLBN11.",
   "medio": "Buying one unit gets you, for instance, 1 ON share and 2 PN shares at once. The 11 ending is also used by FIIs (MXRF11) and ETFs (BOVA11), so it is the asset’s name that tells you which is which. Unit income is the sum of the income from the shares it contains.",
   "expert": "The unit’s composition is in the bylaws or prospectus (1 ON + 2 PN in SANB11 and TAEE11; 1 ON + 4 PN in KLBN11), and it can be unbundled into the original shares on request to the registrar, with a lead time and possibly a cost. Political and economic rights are those of the underlying shares in proportion; tag-along, for example, can differ between the ON and PN portions. Liquidity tends to concentrate in the unit, which sometimes lets its price drift from the sum of the parts — arbitrage through unbundling tends to close the spread."
  }
 },
 {
  "k": "vacancia",
  "t": "Vacância",
  "te": "Vacancy",
  "c": "FIIs",
  "ce": "FIIs",
  "pt": {
   "iniciante": "Vacância é a parte dos imóveis do fundo que está vazia, sem inquilino pagando aluguel.",
   "medio": "Há duas medidas: a vacância física conta metros quadrados vazios; a financeira conta a receita que deixou de entrar. A segunda importa mais para o rendimento da sua cota, porque um imóvel pequeno e caro vazio pesa mais do que um grande e barato. Vacância alta e persistente derruba o rendimento mensal e costuma aparecer no preço da cota antes de aparecer no relatório.",
   "expert": "Vacância física = área vaga ÷ área bruta locável; vacância financeira = receita potencial não realizada ÷ receita potencial total. A financeira captura descontos, carências concedidas em renovações e a diferença de valor por metro quadrado entre imóveis. Para leitura prospectiva, o cronograma de vencimento dos contratos e as cláusulas de revisional e rescisão antecipada dizem quanto da receita está exposta nos próximos 12 a 24 meses. Fundos de papel (CRI) não têm vacância, mas têm inadimplência e pré-pagamento, que cumprem papel análogo na análise."
  },
  "en": {
   "iniciante": "Vacancy is the part of the fund’s properties that is empty, with no tenant paying rent.",
   "medio": "There are two measures: physical vacancy counts empty square metres; financial vacancy counts the revenue that failed to come in. The second matters more for your unit’s income, because a small, expensive empty property weighs more than a large, cheap one. High, persistent vacancy drags down the monthly payout and usually shows up in the unit price before it shows up in the report.",
   "expert": "Physical vacancy = vacant area ÷ gross leasable area; financial vacancy = unrealised potential revenue ÷ total potential revenue. The financial measure captures discounts, rent-free periods granted on renewals and the difference in value per square metre across properties. For a forward-looking view, the lease expiry schedule and the rent-review and early-termination clauses say how much revenue is exposed over the next 12 to 24 months. Paper funds (CRI) have no vacancy, but they have defaults and prepayments, which play the analogous role in analysis."
  }
 },
 {
  "k": "market-cap",
  "t": "Valor de mercado (market cap)",
  "te": "Market value (market cap)",
  "c": "Análise",
  "ce": "Analysis",
  "pt": {
   "iniciante": "Valor de mercado é quanto a empresa inteira vale na bolsa: o preço da ação multiplicado pelo número de ações que existem.",
   "medio": "É esse número que separa as large caps (gigantes) das small caps (pequenas). Comparar o preço da ação entre duas empresas não diz nada — uma ação de R$ 5 pode ser de uma empresa maior que uma de R$ 200. Comparar valor de mercado, sim. Os índices ponderados por capitalização, como o S&P 500, dão mais peso a quem vale mais.",
   "expert": "Market cap = preço × ações emitidas; o free float considera só as ações em circulação fora do bloco de controle, e é ele que pondera índices como Ibovespa e S&P 500. O valor de mercado mede o equity; o enterprise value soma a dívida líquida e é a base correta para múltiplos operacionais como EV/EBITDA, porque duas empresas com o mesmo market cap e dívidas diferentes têm tamanhos econômicos diferentes. Recompras reduzem o número de ações e, a preço constante, o market cap; emissões fazem o contrário."
  },
  "en": {
   "iniciante": "Market value is what the whole company is worth on the exchange: the share price multiplied by the number of shares in existence.",
   "medio": "It is this number that separates large caps (giants) from small caps (small ones). Comparing the share price of two companies says nothing — a R$ 5 share can belong to a bigger company than a R$ 200 one. Comparing market value does. Capitalisation-weighted indexes, such as the S&P 500, give more weight to whoever is worth more.",
   "expert": "Market cap = price × shares issued; free float counts only the shares circulating outside the controlling block, and it is what weights indexes such as the Ibovespa and the S&P 500. Market value measures equity; enterprise value adds net debt and is the correct base for operating multiples such as EV/EBITDA, because two companies with the same market cap and different debts have different economic sizes. Buybacks reduce the share count and, at constant price, the market cap; issuances do the opposite."
  }
 },
 {
  "k": "estimado",
  "t": "Valor estimado",
  "te": "Estimated value",
  "c": "App",
  "ce": "App",
  "pt": {
   "iniciante": "Valor estimado é quando o app calcula o valor em vez de buscar um preço pronto — como na renda fixa, em que ele aplica a taxa combinada sobre o tempo que passou.",
   "medio": "A estimativa serve para você ter uma noção do total sem precisar abrir o banco todo dia. O valor oficial é sempre o que aparece no extrato do banco ou da corretora; vale atualizar por lá de vez em quando, principalmente antes de decidir um resgate. O app marca esses valores para você saber que são cálculo, não cotação.",
   "expert": "A estimativa aplica a taxa vigente de CDI ou IPCA, pro rata por dia útil, sobre o valor e a data informados, sem marcação a mercado e sem deduzir IR ou IOF. Em pós-fixados curtos a diferença para o extrato é pequena; em prefixados e IPCA+ longos ela pode ser grande, porque o valor de mercado responde à curva de juros e o estimado não. Em fundos e previdência não há estimativa: o valor é o que você informou, na data que informou, e envelhece até a próxima atualização manual ou importação de extrato."
  },
  "en": {
   "iniciante": "An estimated value is when the app calculates the value instead of fetching a ready price — as in fixed income, where it applies the agreed rate over the time elapsed.",
   "medio": "The estimate is there so you have a sense of the total without opening the bank every day. The official value is always what the bank or broker statement shows; it is worth updating from there now and then, especially before deciding on a withdrawal. The app flags these values so you know they are a calculation, not a quote.",
   "expert": "The estimate applies the current CDI or IPCA rate, pro rata per business day, to the amount and date you entered, with no mark-to-market and no deduction of income tax or IOF. In short floating-rate products the gap to the statement is small; in long fixed-rate and IPCA+ bonds it can be large, because market value responds to the yield curve and the estimate does not. In funds and pension plans there is no estimate: the value is what you entered, on the date you entered it, and it ages until the next manual update or statement import."
  }
 },
 {
  "k": "vies-confirmacao",
  "t": "Viés de confirmação",
  "te": "Confirmation bias",
  "c": "Comportamento",
  "ce": "Behaviour",
  "pt": {
   "iniciante": "Viés de confirmação é procurar só as informações que concordam com o que você já acredita sobre um investimento — e ignorar as que discordam.",
   "medio": "Ele aparece quando você já comprou e passa a ler só notícia boa sobre o papel, ou quando busca no Google \"por que X vai subir\". Um antídoto prático: antes de comprar, escreva quais fatos fariam você reconhecer que errou e vender. Se depois esses fatos aparecerem, a decisão já está tomada.",
   "expert": "É um dos vieses cognitivos mais robustos na literatura de finanças comportamentais e se combina com o efeito dotação (valorizar mais o que já se tem) e com a dissonância cognitiva pós-decisão. Efeitos observáveis: tempo excessivo segurando posições perdedoras, leitura seletiva de resultados trimestrais e resistência a rebalancear o que subiu. Contramedidas com evidência: tese de investimento escrita com critérios de invalidação definidos ex ante, revisão periódica por checklist, regras mecânicas de rebalanceamento e o exercício do pre-mortem — imaginar que a posição deu errado e listar por quê."
  },
  "en": {
   "iniciante": "Confirmation bias is seeking only the information that agrees with what you already believe about an investment — and ignoring what disagrees.",
   "medio": "It shows up when you have already bought and start reading only good news about the stock, or when you google \"why X will go up\". A practical antidote: before buying, write down which facts would make you admit you were wrong and sell. If those facts later appear, the decision is already made.",
   "expert": "It is one of the most robust cognitive biases in the behavioural-finance literature and combines with the endowment effect (valuing more what you already own) and with post-decision cognitive dissonance. Observable effects: holding losing positions too long, selective reading of quarterly results and resistance to rebalancing what has risen. Countermeasures with evidence: a written investment thesis with invalidation criteria set ex ante, periodic checklist reviews, mechanical rebalancing rules and the pre-mortem exercise — imagining the position went wrong and listing why."
  }
 },
 {
  "k": "vix",
  "t": "VIX (o índice do medo)",
  "te": "VIX (the fear index)",
  "c": "Índices",
  "ce": "Indexes",
  "pt": {
   "iniciante": "O VIX é chamado de \"índice do medo\": mede quanto o mercado espera que o S&P 500 balance nos próximos 30 dias.",
   "medio": "Abaixo de 15 costuma indicar calmaria; acima de 30, tensão alta. Ele sobe quando as bolsas caem e aparece nas notícias como termômetro de pânico. Não prevê se o mercado vai subir ou cair — só o tamanho da oscilação que os investidores estão precificando.",
   "expert": "O VIX é a volatilidade implícita anualizada extraída de uma cesta de opções do S&P 500 com vencimento em torno de 30 dias, calculada pela CBOE a partir dos preços de puts e calls fora do dinheiro. Ele mede amplitude esperada, não direção, e carrega um prêmio de risco de variância que o mantém, em média, acima da volatilidade realizada — vender proteção tende a ser lucrativo na maior parte do tempo e catastrófico em cauda. A correlação negativa com o S&P 500 é forte e assimétrica: quedas de mercado elevam o VIX mais do que altas equivalentes o reduzem. Produtos que \"seguem o VIX\" seguem futuros, com custo de rolagem que corrói o valor no longo prazo."
  },
  "en": {
   "iniciante": "The VIX is called the \"fear index\": it measures how much the market expects the S&P 500 to swing over the next 30 days.",
   "medio": "Below 15 usually signals calm; above 30, high tension. It rises when stock markets fall and shows up in the news as a panic thermometer. It does not predict whether the market will go up or down — only the size of the swing investors are pricing in.",
   "expert": "The VIX is the annualised implied volatility extracted from a basket of S&P 500 options expiring around 30 days out, computed by the CBOE from out-of-the-money put and call prices. It measures expected amplitude, not direction, and carries a variance risk premium that keeps it, on average, above realised volatility — selling protection tends to be profitable most of the time and catastrophic in the tail. Its negative correlation with the S&P 500 is strong and asymmetric: market drops lift the VIX more than equivalent rallies lower it. Products that \"track the VIX\" track futures, with a roll cost that erodes value over the long run."
  }
 },
 {
  "k": "volatilidade",
  "t": "Volatilidade",
  "te": "Volatility",
  "c": "Risco",
  "ce": "Risk",
  "pt": {
   "iniciante": "Volatilidade é o tamanho do sobe-e-desce de um investimento. Volatilidade alta quer dizer que o preço balança muito.",
   "medio": "Volatilidade alta não é necessariamente ruim, mas exige prazo: se você vai precisar do dinheiro em seis meses, uma oscilação forte pode te obrigar a vender no pior momento. Ações oscilam mais que renda fixa, e cripto oscila mais que ações. O que muda a conta é quanto tempo você consegue esperar.",
   "expert": "Mede-se pelo desvio-padrão anualizado dos retornos logarítmicos (o diário × √252). A volatilidade é heterocedástica — agrupa-se em regimes de calma e de estresse — e modelos GARCH capturam essa dinâmica melhor que a média móvel simples. Como medida de risco ela é incompleta: simétrica, cega a caudas gordas e a drawdown; por isso se complementa com downside deviation, VaR condicional e drawdown máximo. Para o investidor de longo prazo, o que a volatilidade dimensiona é o tamanho de posição compatível com a tolerância, não a qualidade do ativo."
  },
  "en": {
   "iniciante": "Volatility is the size of an investment’s ups and downs. High volatility means the price swings a lot.",
   "medio": "High volatility is not necessarily bad, but it demands time: if you will need the money in six months, a sharp swing can force you to sell at the worst moment. Stocks swing more than fixed income, and crypto swings more than stocks. What changes the maths is how long you can wait.",
   "expert": "It is measured as the annualised standard deviation of log returns (daily × √252). Volatility is heteroskedastic — it clusters into calm and stress regimes — and GARCH models capture that dynamic better than a simple moving average. As a risk measure it is incomplete: symmetric, blind to fat tails and to drawdown; hence it is complemented with downside deviation, conditional VaR and maximum drawdown. For a long-term investor, what volatility sizes is the position compatible with tolerance, not the quality of the asset."
  }
 },
 {
  "k": "volume",
  "t": "Volume negociado",
  "te": "Trading volume",
  "c": "Cotações",
  "ce": "Quotes",
  "pt": {
   "iniciante": "Volume é quanto dinheiro trocou de mãos naquele ativo no dia.",
   "medio": "Volume alto significa que dá para comprar e vender sem mexer no preço. Volume baixo é sinal de alerta: na hora de sair você pode não achar comprador, ou ter que vender bem abaixo do que vale. Em FIIs e small caps isso faz diferença real.",
   "expert": "Volume financeiro diário e número de negócios medem a liquidez; a medida prática é quantos dias de volume médio a sua posição representa — acima de alguns por cento do volume diário, a própria saída move o preço. O spread bid-ask é o custo implícito de liquidez e cresce quando o volume cai. Em ativos com formador de mercado o volume mostrado pode incluir a atuação dele; em eventos (balanço, inclusão em índice) o volume salta e não representa a liquidez normal. Volume atípico sem notícia é sinal de informação circulando antes do fato."
  },
  "en": {
   "iniciante": "Volume is how much money changed hands in that asset during the day.",
   "medio": "High volume means you can buy and sell without moving the price. Low volume is a warning sign: when it is time to get out you may not find a buyer, or may have to sell well below what it is worth. In FIIs and small caps this makes a real difference.",
   "expert": "Daily traded value and the number of trades measure liquidity; the practical measure is how many days of average volume your position represents — above a few percent of daily volume, your own exit moves the price. The bid-ask spread is the implicit cost of liquidity and widens as volume falls. In assets with a market maker, the displayed volume may include their activity; around events (earnings, index inclusion) volume jumps and does not represent normal liquidity. Unusual volume with no news is a sign of information circulating before the fact."
  }
 },
 {
  "k": "w8ben",
  "t": "W-8BEN (formulário de não residente nos EUA)",
  "te": "W-8BEN (US non-resident form)",
  "c": "Internacional",
  "ce": "International",
  "pt": {
   "iniciante": "O W-8BEN é um formulário que você assina na corretora estrangeira dizendo que não é residente fiscal nos Estados Unidos. Toda corretora internacional pede.",
   "medio": "Ele evita uma retenção de imposto mais pesada e organiza a sua situação com o fisco americano. Vale por três anos e precisa ser renovado — a corretora costuma avisar. Sem ele, os dividendos chegam com desconto maior e a burocracia para recuperar depois é grande.",
   "expert": "Sem W-8BEN válido aplica-se o backup withholding de 24% sobre proventos e, em alguns casos, sobre o bruto da venda; com o formulário, a retenção padrão sobre dividendos para não residentes é de 30%. O Brasil não tem tratado de bitributação com os EUA, então não há alíquota reduzida por tratado; a retenção americana sobre dividendos pode ser compensada parcialmente na apuração brasileira conforme a legislação de rendimentos do exterior. O formulário expira no fim do terceiro ano-calendário após a assinatura e precisa ser refeito em caso de mudança de residência ou de dados cadastrais."
  },
  "en": {
   "iniciante": "The W-8BEN is a form you sign at the foreign broker stating that you are not a US tax resident. Every international broker asks for it.",
   "medio": "It prevents a heavier tax withholding and keeps your standing with the US tax authority in order. It is valid for three years and must be renewed — the broker usually reminds you. Without it, dividends arrive with a bigger deduction and recovering it later is a lot of paperwork.",
   "expert": "Without a valid W-8BEN, backup withholding of 24% applies to income and, in some cases, to the gross proceeds of a sale; with the form, the standard withholding on dividends for non-residents is 30%. Brazil has no double-taxation treaty with the US, so there is no reduced treaty rate; the US withholding on dividends can be partially offset in the Brazilian computation under the rules for foreign income. The form expires at the end of the third calendar year after signing and must be redone if residence or registration details change."
  }
 },
 {
  "k": "xirr",
  "t": "XIRR — Extended Internal Rate of Return (retorno do seu bolso)",
  "te": "XIRR — Extended Internal Rate of Return",
  "c": "Estratégia",
  "ce": "Strategy",
  "pt": {
   "iniciante": "Em português: taxa interna de retorno com datas irregulares, ou \"retorno do seu bolso\". É a taxa anual que leva em conta quanto você aportou e em que data. Responde à pergunta \"quanto eu realmente ganhei por ano\".",
   "medio": "É diferente de dividir o lucro pelo total aportado. Se você colocou R$ 10 mil em janeiro e mais R$ 10 mil em novembro, o segundo aporte quase não teve tempo de render — o XIRR sabe disso, a conta simples não. Também aparece como MWR (money-weighted return) ou TIR. Ao lado do TWR, ele mostra se o seu timing ajudou ou atrapalhou.",
   "expert": "Matematicamente é a taxa r que zera o valor presente líquido dos fluxos datados: Σ CF_i / (1 + r)^(d_i/365) = 0, com o valor atual da carteira entrando como último fluxo positivo. É o MWR em tempo irregular. A equação pode ter múltiplas raízes quando os fluxos alternam de sinal repetidamente, e não converge por Newton-Raphson puro em alguns casos; por isso o app usa Newton-Raphson com bissecção de segurança dentro de um intervalo de taxas plausíveis. Em períodos curtos ou com fluxos muito recentes o XIRR anualizado fica instável — o que não é erro de cálculo, é a anualização de um resultado de poucos dias."
  },
  "en": {
   "iniciante": "In plain terms: internal rate of return with irregular dates, or \"the return in your pocket\". It is the yearly rate that takes into account how much you contributed and on which date. It answers \"how much did I really earn per year\".",
   "medio": "It is different from dividing profit by total contributions. If you put in R$ 10 thousand in January and another R$ 10 thousand in November, the second contribution barely had time to earn — XIRR knows that, the simple maths does not. It also goes by MWR (money-weighted return) or IRR. Next to TWR, it shows whether your timing helped or hurt.",
   "expert": "Mathematically it is the rate r that zeroes the net present value of the dated flows: Σ CF_i / (1 + r)^(d_i/365) = 0, with the current portfolio value entering as the last positive flow. It is the MWR on irregular time. The equation can have multiple roots when the flows repeatedly alternate sign, and pure Newton-Raphson does not converge in some cases; that is why the app uses Newton-Raphson with a bisection safety net inside a range of plausible rates. Over short periods or with very recent flows the annualised XIRR becomes unstable — which is not a calculation error, it is the annualisation of a few days’ result."
  }
 }
];
