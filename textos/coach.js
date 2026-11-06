/* =====================================================================
   textos/coach.js — as aulas do Coach (3 textos por idioma: iniciante, médio, expert)   3.51 · 06/Nov/2026
   ---------------------------------------------------------------------
   Saiu do index.html na 3.51 (arrumação interna). Carregado ANTES do código do app (é uma const global).
   Mudou aqui? Troque o ?v= no index.html e no sw.js (teste/teste-modulos.js confere).
   ===================================================================== */
const COACH = [

{id:"comecar", ic:"🚀", t:"Por que investir", te:"Why invest", lead:"O ponto de partida: o que investir resolve na sua vida.", leade:"The starting point: what investing solves in your life.",
 n:{
 iniciante:`
 <p>Dinheiro parado na conta corrente não fica do mesmo tamanho: ele encolhe. Como os preços sobem todo ano — isso é a <i data-info="inflacao">inflação</i> —, os mesmos R$ 10.000 compram menos coisas a cada ano que passa. Investir é, antes de tudo, impedir esse encolhimento. Depois, se der certo, é fazer o dinheiro crescer.</p>
 <p>A ideia por trás de qualquer investimento é simples: você empresta ou entrega seu dinheiro para alguém que vai usá-lo para produzir algo — um banco, uma empresa, o governo — e recebe uma parte do resultado em troca.</p>
 <h4>Os três lugares onde seu dinheiro pode estar</h4>
 <ul>
   <li><b>Emprestando</b> (renda fixa): você empresta e recebe juros. É mais previsível.</li>
   <li><b>Sendo sócio</b> (ações, fundos imobiliários): você vira dono de um pedaço e recebe lucro e valorização. Oscila mais.</li>
   <li><b>Guardando valor</b> (dólar, ouro, cripto): você troca de moeda ou de forma de guardar, apostando na proteção.</li>
 </ul>
 <p>Uma carteira saudável normalmente tem os três, em proporções diferentes conforme o seu momento de vida.</p>
 <div class="callout"><b>Primeiro passo prático:</b> antes de escolher qualquer investimento, descubra quanto sobra por mês. Investir R$ 300 todo mês com constância vence investir R$ 5.000 uma vez só e nunca mais.</div>`,
 medio:`
 <p>Três variáveis explicam quase todo o resultado de longo prazo: <b>quanto você aporta</b>, <b>por quanto tempo</b> e <b>a que taxa</b>. No começo, o aporte domina; depois de uns oito a dez anos, o rendimento passa a crescer mais que o próprio aporte. Isso muda a estratégia: no início, vale mais aumentar renda e cortar custo do que caçar o investimento perfeito.</p>
 <h4>Retorno nominal x retorno real</h4>
 <p>Render 12% com inflação de 5% não é ganhar 7% — é ganhar 6,7%, porque a conta é multiplicativa: (1,12 ÷ 1,05) − 1. O Brasil é um dos poucos países em que o juro real (acima da inflação) é alto de forma persistente, e isso torna a renda fixa daqui competitiva com a bolsa em vários períodos.</p>
 <h4>O trio que não se resolve</h4>
 <p>Retorno, risco e <i data-info="liquidez">liquidez</i> formam um triângulo: melhorar um piora outro. Quem promete os três juntos está escondendo alguma coisa — quase sempre risco de crédito ou de liquidez.</p>
 <div class="callout"><b>Regra útil:</b> escolha o investimento pelo prazo do objetivo, não pelo rendimento anunciado. Dinheiro de 6 meses e dinheiro de 20 anos não moram no mesmo lugar.</div>`,
 expert:`
 <p>Formalmente, o retorno exigido de um ativo é a soma da taxa livre de risco com prêmios: prazo (term premium), crédito, liquidez e risco de mercado. No Brasil, o juro real ex-ante da NTN-B longa funciona como piso de oportunidade: qualquer tese de renda variável precisa oferecer prêmio convincente sobre esse piso, ajustado à volatilidade.</p>
 <p>A relevância do aporte frente ao retorno pode ser formalizada: com aportes constantes A, taxa r e horizonte t, o valor acumulado é A·[(1+r)^t − 1]/r. A derivada em relação a r só supera a derivada em relação a A quando r·t cruza um limiar — na prática, entre 8 e 12 anos para taxas reais de 4% a 6% a.a.</p>
 <p>Isso significa que otimizar alocação com poupança baixa é otimizar a variável errada. Trate taxa de poupança como decisão de primeira ordem e alocação como de segunda.</p>`},
 en:{
 iniciante:`<p>Money sitting in a current account does not stay the same size: it shrinks. Because prices go up every year — that is <i data-info="inflacao">inflation</i> — the same R$ 10,000 buys fewer things with each passing year. Investing is, first of all, stopping that shrinkage. Then, if it goes well, it is making the money grow.</p>
 <p>The idea behind any investment is simple: you lend or hand your money to someone who will use it to produce something — a bank, a company, the government — and you receive a share of the result in return.</p>
 <h4>The three places your money can be</h4>
 <ul>
   <li><b>Lending</b> (fixed income): you lend and receive interest. More predictable.</li>
   <li><b>Being a partner</b> (stocks, real-estate funds): you own a piece and receive profit and appreciation. Swings more.</li>
   <li><b>Storing value</b> (dollars, gold, crypto): you swap currency or the way you keep value, betting on protection.</li>
 </ul>
 <p>A healthy portfolio usually has all three, in different proportions depending on your stage of life.</p>
 <div class="callout"><b>First practical step:</b> before choosing any investment, find out how much is left over each month. Investing R$ 300 every month, consistently, beats investing R$ 5,000 once and never again.</div>`,
 medio:`<p>Three variables explain almost all of the long-term result: <b>how much you contribute</b>, <b>for how long</b> and <b>at what rate</b>. At the start, the contribution dominates; after eight to ten years, the return starts growing faster than the contribution itself. That changes the strategy: early on, raising income and cutting costs is worth more than hunting for the perfect investment.</p>
 <h4>Nominal return vs real return</h4>
 <p>Earning 12% with 5% inflation is not earning 7% — it is earning 6.7%, because the maths is multiplicative: (1.12 ÷ 1.05) − 1. Brazil is one of the few countries where the real interest rate (above inflation) is persistently high, and that makes local fixed income competitive with the stock market over many periods.</p>
 <h4>The trio that cannot be solved</h4>
 <p>Return, risk and <i data-info="liquidez">liquidity</i> form a triangle: improving one worsens another. Whoever promises all three together is hiding something — almost always credit or liquidity risk.</p>
 <div class="callout"><b>Useful rule:</b> choose the investment by the goal’s time horizon, not by the advertised return. Six-month money and twenty-year money do not live in the same place.</div>`,
 expert:`<p>Formally, the required return of an asset is the risk-free rate plus premiums: term, credit, liquidity and market risk. In Brazil, the ex-ante real yield of the long NTN-B works as an opportunity floor: any equity thesis has to offer a convincing premium over that floor, adjusted for volatility.</p>
 <p>The weight of contributions versus returns can be formalised: with constant contributions A, rate r and horizon t, the accumulated value is A·[(1+r)^t − 1]/r. The derivative with respect to r only exceeds the derivative with respect to A once r·t crosses a threshold — in practice, between 8 and 12 years for real rates of 4% to 6% a year.</p>
 <p>This means optimising allocation with a low savings rate is optimising the wrong variable. Treat the savings rate as a first-order decision and allocation as second-order.</p>`}},

{id:"juros", ic:"📈", t:"Juros compostos", te:"Compound interest", lead:"A força que faz o dinheiro crescer sozinho — e que também trabalha contra você nas dívidas.", leade:"The force that makes money grow on its own — and that also works against you in debt.",
 n:{
 iniciante:`
 <p><i data-info="juros-compostos">Juros compostos</i> são juros que rendem juros. No primeiro ano, R$ 10.000 a 10% viram R$ 11.000. No segundo, os 10% incidem sobre R$ 11.000, e não mais sobre R$ 10.000. Parece pouco, mas o efeito acelera com o tempo.</p>
 <p>Veja R$ 10.000 investidos a 10% ao ano, sem novos aportes:</p>
 <ul>
   <li>5 anos → cerca de R$ 16.100</li>
   <li>10 anos → cerca de R$ 25.900</li>
   <li>20 anos → cerca de R$ 67.300</li>
   <li>30 anos → cerca de R$ 174.500</li>
 </ul>
 <p>Repare: nos primeiros 10 anos, o dinheiro rendeu R$ 15.900. Nos 10 últimos, rendeu mais de R$ 107.000. O mesmo investimento, a mesma taxa — o que mudou foi o tempo acumulado.</p>
 <div class="callout"><b>Regra do 72:</b> divida 72 pela taxa anual e você descobre em quantos anos o dinheiro dobra. A 12% ao ano, dobra a cada 6 anos.</div>
 <p>O outro lado da moeda: essa mesma força trabalha contra você no rotativo do cartão e no cheque especial. Quitar uma dívida de 300% ao ano é o melhor "investimento" disponível no mercado.</p>`,
 medio:`
 <p>A fórmula é V = V₀·(1+i)^n, e o expoente é o que faz a diferença. Com aportes mensais, a conta vira V = A·[(1+i)^n − 1]/i, com i na mesma unidade de tempo do aporte.</p>
 <h4>O que destrói os juros compostos</h4>
 <ul>
   <li><b>Taxas:</b> 2% de <i data-info="taxa-administracao">taxa de administração</i> ao ano parecem irrelevantes, mas em 30 anos consomem cerca de um terço do patrimônio final.</li>
   <li><b>Imposto antecipado:</b> o <i data-info="come-cotas">come-cotas</i> tira dinheiro do bolo antes da hora, e o que saiu não rende mais.</li>
   <li><b>Interromper:</b> sacar no meio reinicia o efeito. É por isso que reserva de emergência existe — para você não precisar mexer no que está composto.</li>
 </ul>
 <h4>Nominal x real, de novo</h4>
 <p>Projeções em termos nominais impressionam e enganam. R$ 1 milhão daqui a 30 anos, com inflação de 4,5% ao ano, tem o poder de compra de cerca de R$ 267 mil hoje. Nas projeções do InvestifyONE, você pode acompanhar as duas visões.</p>`,
 expert:`
 <p>Em tempo contínuo, V = V₀·e^(rt). A distinção crítica é entre média aritmética e geométrica: o retorno composto realizado é aproximadamente μ − σ²/2 (volatility drag). Uma carteira com μ = 12% e σ = 30% compõe a cerca de 7,5%, não 12%.</p>
 <p>Consequência prática: reduzir volatilidade tem valor composto próprio, independentemente do retorno esperado. É o argumento matemático para diversificação e rebalanceamento — eles elevam a média geométrica sem exigir previsão.</p>
 <p>Em projeções, prefira simulação de Monte Carlo com bootstrap de retornos históricos a uma taxa fixa: a mediana e o percentil 10 dizem mais que o valor esperado, especialmente sob risco de sequência de retornos na fase de retirada.</p>`},
 en:{
 iniciante:`<p><i data-info="juros-compostos">Compound interest</i> is interest that earns interest. In the first year, R$ 10,000 at 10% becomes R$ 11,000. In the second, the 10% applies to R$ 11,000, no longer to R$ 10,000. It sounds small, but the effect accelerates over time.</p>
 <p>Take R$ 10,000 invested at 10% a year, with no new contributions:</p>
 <ul>
   <li>5 years → about R$ 16,100</li>
   <li>10 years → about R$ 25,900</li>
   <li>20 years → about R$ 67,300</li>
   <li>30 years → about R$ 174,500</li>
 </ul>
 <p>Notice: in the first 10 years the money earned R$ 15,900. In the last 10, it earned more than R$ 107,000. Same investment, same rate — what changed was the accumulated time.</p>
 <div class="callout"><b>Rule of 72:</b> divide 72 by the yearly rate and you get how many years it takes for the money to double. At 12% a year, it doubles every 6 years.</div>
 <p>The other side of the coin: this same force works against you on revolving credit-card debt and overdrafts. Paying off a debt at 300% a year is the best "investment" available on the market.</p>`,
 medio:`<p>The formula is V = V₀·(1+i)^n, and the exponent is what makes the difference. With monthly contributions, it becomes V = A·[(1+i)^n − 1]/i, with i in the same time unit as the contribution.</p>
 <h4>What destroys compound interest</h4>
 <ul>
   <li><b>Fees:</b> a 2% yearly <i data-info="taxa-administracao">management fee</i> looks irrelevant, but over 30 years it eats about a third of the final amount.</li>
   <li><b>Early tax:</b> <i data-info="come-cotas">come-cotas</i> takes money out of the pot ahead of time, and what left no longer earns.</li>
   <li><b>Interrupting:</b> withdrawing midway restarts the effect. That is why an emergency fund exists — so you never have to touch what is compounding.</li>
 </ul>
 <h4>Nominal vs real, again</h4>
 <p>Projections in nominal terms impress and mislead. R$ 1 million thirty years from now, with 4.5% yearly inflation, has the purchasing power of about R$ 267 thousand today. In InvestifyONE’s projections you can follow both views.</p>`,
 expert:`<p>In continuous time, V = V₀·e^(rt). The critical distinction is between arithmetic and geometric mean: the realised compound return is approximately μ − σ²/2 (volatility drag). A portfolio with μ = 12% and σ = 30% compounds at about 7.5%, not 12%.</p>
 <p>Practical consequence: reducing volatility has compounding value of its own, regardless of expected return. That is the mathematical argument for diversification and rebalancing — they raise the geometric mean without requiring forecasts.</p>
 <p>For projections, prefer Monte Carlo simulation with bootstrapped historical returns over a fixed rate: the median and the 10th percentile say more than the expected value, especially under sequence-of-returns risk in the withdrawal phase.</p>`}},

{id:"reserva", ic:"🛟", t:"Reserva de emergência", te:"Emergency fund", lead:"O colchão que impede você de vender investimento no pior momento.", leade:"The cushion that keeps you from selling an investment at the worst moment.",
 n:{
 iniciante:`
 <p>A <i data-info="reserva-emergencia">reserva de emergência</i> é um dinheiro guardado para imprevistos: desemprego, conserto de carro, problema de saúde. Ela não existe para render — existe para estar lá.</p>
 <h4>Quanto guardar</h4>
 <ul>
   <li>Servidor público ou renda muito estável: 3 a 6 meses de despesas.</li>
   <li>CLT: 6 meses.</li>
   <li>Autônomo, PJ ou renda variável: 9 a 12 meses.</li>
 </ul>
 <p>A conta é sobre <b>despesas</b> mensais, não sobre salário.</p>
 <h4>Onde deixar</h4>
 <p>Precisa de três coisas: sacar no mesmo dia, não oscilar e ser seguro. Três opções servem bem: Tesouro Selic, CDB de banco sólido com liquidez diária, ou conta remunerada que renda perto de 100% do <i data-info="cdi">CDI</i>.</p>
 <div class="callout warn"><b>Não serve como reserva:</b> ações, fundos imobiliários, cripto, previdência e qualquer CDB com prazo de carência. Todos podem estar no vermelho ou travados justo no dia em que você precisar.</div>`,
 medio:`
 <p>Atenção ao <i data-info="iof-regressivo">IOF dos 30 dias</i>: resgates antes disso perdem boa parte do rendimento. Se a reserva é nova, deixe uma primeira fatia em conta remunerada com liquidez imediata e vá migrando o excedente para Tesouro Selic.</p>
 <p>Sobre o Tesouro Selic: ele tem oscilação mínima, mas não é exatamente zero — há um pequeno ágio/deságio diário. Para prazos de dias, a diferença é irrelevante; é o ativo mais adequado do mercado brasileiro para caixa.</p>
 <h4>Reserva em dólar?</h4>
 <p>Se as suas despesas são em reais, a reserva também deve ser em reais. Dólar oscila 15% num semestre sem aviso, e uma emergência no mês errado vira prejuízo. Exposição cambial é estratégia de carteira, não de caixa — a não ser que você tenha gastos recorrentes em dólar.</p>
 <div class="callout"><b>Checkpoint:</b> só depois que a reserva estiver completa é que vale a pena olhar para renda variável. Sem ela, qualquer imprevisto vira venda forçada.</div>`,
 expert:`
 <p>Dimensione a reserva pela volatilidade da renda e pela correlação entre choque de renda e choque de mercado. Para quem trabalha em setor cíclico, essa correlação é positiva — a chance de perder o emprego coincide com o mercado em baixa —, o que justifica reserva maior que a regra genérica.</p>
 <p>Em regime de juro real elevado, o custo de oportunidade de manter caixa é modesto: com Selic em dois dígitos e inflação controlada, a reserva rende juro real positivo, o que enfraquece o argumento de minimizá-la.</p>
 <p>Considere ainda linhas de crédito pré-aprovadas com custo conhecido (crédito com garantia de investimento, por exemplo) como camada complementar — nunca substituta, porque disponibilidade de crédito some justamente em crises sistêmicas.</p>`},
 en:{
 iniciante:`<p>The <i data-info="reserva-emergencia">emergency fund</i> is money set aside for the unexpected: unemployment, a car repair, a health problem. It does not exist to earn — it exists to be there.</p>
 <h4>How much to keep</h4>
 <ul>
   <li>Civil servant or very stable income: 3 to 6 months of expenses.</li>
   <li>Salaried employee: 6 months.</li>
   <li>Self-employed, contractor or variable income: 9 to 12 months.</li>
 </ul>
 <p>The maths is about monthly <b>expenses</b>, not salary.</p>
 <h4>Where to keep it</h4>
 <p>It needs three things: same-day withdrawal, no swings, and safety. Three options serve well: Tesouro Selic, a daily-liquidity CDB from a solid bank, or an interest-bearing account paying close to 100% of the <i data-info="cdi">CDI</i>.</p>
 <div class="callout warn"><b>Not suitable as a reserve:</b> stocks, real-estate funds, crypto, pension plans and any CDB with a lock-up period. All of them can be in the red or locked precisely on the day you need them.</div>`,
 medio:`<p>Watch the <i data-info="iof-regressivo">30-day IOF</i>: withdrawals before that lose a good part of the return. If the fund is new, keep a first slice in an interest-bearing account with immediate liquidity and move the excess to Tesouro Selic over time.</p>
 <p>About Tesouro Selic: its swing is minimal, but not exactly zero — there is a small daily premium/discount. For horizons of days the difference is irrelevant; it is the most suitable cash asset in the Brazilian market.</p>
 <h4>A reserve in dollars?</h4>
 <p>If your expenses are in reais, the reserve should be in reais too. The dollar can swing 15% in a semester without warning, and an emergency in the wrong month turns into a loss. Currency exposure is a portfolio strategy, not a cash strategy — unless you have recurring expenses in dollars.</p>
 <div class="callout"><b>Checkpoint:</b> only after the reserve is complete is it worth looking at equities. Without it, any surprise becomes a forced sale.</div>`,
 expert:`<p>Size the reserve by income volatility and by the correlation between an income shock and a market shock. For someone working in a cyclical sector that correlation is positive — the chance of losing the job coincides with a falling market — which justifies a larger reserve than the generic rule.</p>
 <p>Under a high real-rate regime, the opportunity cost of holding cash is modest: with a double-digit Selic and inflation under control, the reserve earns a positive real return, which weakens the argument for minimising it.</p>
 <p>Consider pre-approved credit lines with a known cost (loans secured by investments, for instance) as a complementary layer — never a substitute, because credit availability disappears precisely in systemic crises.</p>`}},

{id:"rendafixa", ic:"🏦", t:"Renda fixa brasileira", te:"Brazilian fixed income", lead:"Tesouro, CDB, LCI, LCA: onde mora a previsibilidade.", leade:"Tesouro, CDB, LCI, LCA: where predictability lives.",
 n:{
 iniciante:`
 <p>Na <i data-info="renda-fixa">renda fixa</i>, você empresta dinheiro e já sabe a regra do quanto vai receber. Quem pega emprestado pode ser o governo (<i data-info="tesouro-direto">Tesouro Direto</i>), um banco (<i data-info="cdb">CDB</i>, <i data-info="lci-lca">LCI, LCA</i>) ou uma empresa (<i data-info="debenture">debênture</i>).</p>
 <h4>Três tipos de regra</h4>
 <ul>
   <li><b>Pós-fixado</b> (100% do CDI, Tesouro Selic): acompanha os juros do país. Sobe se a Selic sobe. Quase não oscila.</li>
   <li><b>Prefixado</b> (12% ao ano): taxa travada hoje. Bom se os juros caírem depois; ruim se subirem.</li>
   <li><b>IPCA+</b> (inflação + 6%): protege o poder de compra e ainda entrega um ganho real por cima. É o formato mais indicado para objetivos de longo prazo.</li>
 </ul>
 <h4>Segurança</h4>
 <p>Tesouro Direto é garantido pelo governo federal. CDB, LCI e LCA têm o <i data-info="fgc">FGC</i>, que devolve até R$ 250 mil por banco se a instituição quebrar. Debêntures, CRI e CRA não têm essa proteção — rendem mais justamente por isso.</p>
 <div class="callout"><b>Atalho mental:</b> banco pequeno que paga muito acima dos outros está pagando pelo risco dele. Dentro do limite do FGC, pode fazer sentido; acima, não.</div>`,
 medio:`
 <p>Compare sempre o <b>líquido</b>. Um CDB de 110% do CDI para 1 ano, com IR de 17,5% (<i data-info="tabela-regressiva">tabela regressiva</i>), rende menos que uma LCI de 95% isenta. A conversão é direta: taxa isenta ÷ (1 − alíquota) dá o equivalente bruto — 95% ÷ 0,825 ≈ 115% do CDI.</p>
 <h4>Marcação a mercado</h4>
 <p>Prefixados e IPCA+ oscilam antes do vencimento. Se os juros sobem depois da sua compra, o preço de venda hoje cai — isso é <i data-info="marcacao-mercado">marcação a mercado</i>. Levando até o vencimento, você recebe exatamente a taxa contratada. O efeito é maior quanto mais longo o título.</p>
 <h4>Como escolher o prazo</h4>
 <p>Case o vencimento com o objetivo. Faculdade da filha em 2034? Tesouro IPCA+ 2035. Reserva? Selic. Quer travar juro alto sem precisar do dinheiro? Prefixado, aceitando a oscilação no meio do caminho.</p>
 <div class="callout"><b>No InvestifyONE:</b> ao cadastrar renda fixa, você informa indexador e taxa, e o app estima o valor atual com o CDI e o IPCA vindos do Banco Central. É estimativa — o número oficial é o do extrato.</div>`,
 expert:`
 <p>O preço de um título é o valor presente do fluxo descontado pela ETTJ. A sensibilidade é dada pela duration modificada: ΔP ≈ −D*·Δy + ½·C·Δy². Uma NTN-B 2045 com duration de ~12 anos perde cerca de 12% com alta de 1 p.p. na taxa real.</p>
 <p>Para carteiras de renda fixa, decida deliberadamente a duration em função do passivo (liability-driven investing). Casar duration de ativo e passivo imuniza a carteira contra variações paralelas da curva.</p>
 <p>No crédito privado, o spread sobre o título público de prazo equivalente é o prêmio pago pelo risco. Avalie se ele cobre a perda esperada (PD × LGD) mais prêmio de liquidez; em ciclos de compressão de spread, frequentemente não cobre.</p>`},
 en:{
 iniciante:`<p>In <i data-info="renda-fixa">fixed income</i>, you lend money and already know the rule for how much you will get back. The borrower can be the government (<i data-info="tesouro-direto">Tesouro Direto</i>), a bank (<i data-info="cdb">CDB</i>, <i data-info="lci-lca">LCI, LCA</i>) or a company (<i data-info="debenture">debenture</i>).</p>
 <h4>Three kinds of rule</h4>
 <ul>
   <li><b>Floating</b> (100% of CDI, Tesouro Selic): tracks the country’s interest rate. Rises if the Selic rises. Barely swings.</li>
   <li><b>Fixed rate</b> (12% a year): rate locked today. Good if rates fall later; bad if they rise.</li>
   <li><b>IPCA+</b> (inflation + 6%): protects purchasing power and still delivers a real gain on top. It is the format best suited to long-term goals.</li>
 </ul>
 <h4>Safety</h4>
 <p>Tesouro Direto is guaranteed by the federal government. CDB, LCI and LCA have the <i data-info="fgc">FGC</i>, which returns up to R$ 250 thousand per bank if the institution fails. Debentures, CRI and CRA do not have that protection — they pay more precisely because of it.</p>
 <div class="callout"><b>Mental shortcut:</b> a small bank paying far above the others is paying for its own risk. Within the FGC limit that can make sense; above it, it does not.</div>`,
 medio:`<p>Always compare the <b>net</b>. A CDB at 110% of CDI for 1 year, with 17.5% income tax (<i data-info="tabela-regressiva">regressive table</i>), pays less than a tax-exempt LCI at 95%. The conversion is direct: exempt rate ÷ (1 − tax rate) gives the gross equivalent — 95% ÷ 0.825 ≈ 115% of CDI.</p>
 <h4>Mark-to-market</h4>
 <p>Fixed-rate and IPCA+ bonds swing before maturity. If rates rise after your purchase, today’s selling price falls — that is <i data-info="marcacao-mercado">mark-to-market</i>. Holding to maturity, you receive exactly the contracted rate. The effect is bigger the longer the bond.</p>
 <h4>How to choose the term</h4>
 <p>Match the maturity to the goal. Your daughter’s university in 2034? Tesouro IPCA+ 2035. Emergency fund? Selic. Want to lock in a high rate without needing the money? Fixed rate, accepting the swings along the way.</p>
 <div class="callout"><b>In InvestifyONE:</b> when you register fixed income, you enter the index and the rate, and the app estimates the current value using the CDI and IPCA from the Central Bank. It is an estimate — the official number is on the statement.</div>`,
 expert:`<p>A bond’s price is the present value of its cash flows discounted by the term structure. Sensitivity is given by modified duration: ΔP ≈ −D*·Δy + ½·C·Δy². An NTN-B 2045 with a duration of ~12 years loses about 12% on a 1 p.p. rise in the real rate.</p>
 <p>For fixed-income portfolios, decide duration deliberately as a function of the liability (liability-driven investing). Matching asset and liability duration immunises the portfolio against parallel shifts of the curve.</p>
 <p>In private credit, the spread over the government bond of equivalent maturity is the premium paid for risk. Assess whether it covers expected loss (PD × LGD) plus a liquidity premium; in spread-compression cycles, it frequently does not.</p>`}},

{id:"acoes", ic:"📊", t:"Ações", te:"Stocks", lead:"Virar sócio de empresas: como funciona, o que olhar e quanto ter.", leade:"Becoming a partner in companies: how it works, what to look at and how much to hold.",
 n:{
 iniciante:`
 <p>Uma <i data-info="acao">ação</i> é um pedacinho de uma empresa. Com R$ 40 você compra uma ação do Itaú e vira sócio — bem pequeno, mas com os mesmos direitos proporcionais de qualquer outro acionista.</p>
 <h4>Como você ganha</h4>
 <ul>
   <li><b>Valorização:</b> a empresa cresce, vale mais, e a ação sobe.</li>
   <li><b><i data-info="dividendo">Dividendos</i>:</b> parte do lucro cai na sua conta, em dinheiro.</li>
 </ul>
 <h4>Como você perde</h4>
 <p>A empresa vai mal, o setor entra em crise, o país trava, ou você simplesmente comprou caro demais. Quedas de 30% a 50% acontecem — não como exceção, mas como parte normal do funcionamento da bolsa.</p>
 <h4>Entendendo os códigos</h4>
 <p>No Brasil, o número final do <i data-info="ticker">ticker</i> indica o tipo: 3 é ação ordinária (com voto), 4 é preferencial (preferência nos dividendos), 11 é unit. Nos EUA, o código é o nome abreviado: AAPL, MSFT, KO.</p>
 <div class="callout warn"><b>Regra de sobrevivência:</b> só coloque em ações o dinheiro que você não vai precisar nos próximos 5 anos. Prazo curto e bolsa não combinam.</div>`,
 medio:`
 <p>Duas escolas convivem. A primeira é comprar o mercado inteiro via <i data-info="etf">ETF</i> e não tentar escolher vencedores. A segunda é analisar empresa por empresa. Para a maioria das pessoas, a primeira entrega mais resultado com menos tempo gasto — e os dados de fundos ativos no mundo inteiro sustentam isso.</p>
 <h4>Se for escolher, o mínimo que se olha</h4>
 <ul>
   <li><i data-info="pl">P/L</i> e <i data-info="pvp">P/VP</i> comparados ao setor e ao histórico da própria empresa.</li>
   <li><i data-info="roe">ROE</i> consistente acima de 15% por vários anos.</li>
   <li><i data-info="divida-liquida">Dívida líquida/EBITDA</i> sob controle para o setor.</li>
   <li>Receita e lucro crescendo em prazo de 5 a 10 anos, não em um trimestre.</li>
 </ul>
 <h4>Quantas ações ter</h4>
 <p>Menos de 8 concentra demais; mais de 20 vira um índice caro de acompanhar. Entre 10 e 15, de setores diferentes, é faixa razoável para carteira própria.</p>
 <div class="callout"><b>Sobre dividendos:</b> <i data-info="dividend-yield">DY</i> alto demais costuma ser sinal de preço caindo, não de generosidade. Cheque se o lucro cobre o que está sendo distribuído.</div>`,
 expert:`
 <p>Preço = valor presente dos fluxos de caixa livres ao acionista descontados ao custo de capital próprio. Múltiplos são atalhos que embutem premissas de crescimento e retorno sobre capital; explicitá-las (via fórmula de Gordon implícita) revela o que o mercado está precificando.</p>
 <p>Evidência de fatores: tamanho, valor, momentum, qualidade e baixo risco apresentam prêmios históricos, com instabilidade relevante e períodos longos de underperformance. Exposição fatorial deliberada exige disciplina que a maioria abandona no pior momento possível.</p>
 <p>No mercado brasileiro, a concentração setorial do índice (commodities e bancos) significa que uma carteira "diversificada" de ações locais carrega beta elevado a preços de commodities e ao ciclo de crédito doméstico. Diversificação real exige saída do país, não só do setor.</p>`},
 en:{
 iniciante:`<p>A <i data-info="acao">share</i> is a small piece of a company. With R$ 40 you buy one Itaú share and become a partner — a very small one, but with the same proportional rights as any other shareholder.</p>
 <h4>How you gain</h4>
 <ul>
   <li><b>Appreciation:</b> the company grows, is worth more, and the share rises.</li>
   <li><b><i data-info="dividendo">Dividends</i>:</b> part of the profit lands in your account, in cash.</li>
 </ul>
 <h4>How you lose</h4>
 <p>The company does badly, the sector hits a crisis, the country stalls, or you simply paid too much. Drops of 30% to 50% happen — not as an exception, but as a normal part of how the stock market works.</p>
 <h4>Understanding the codes</h4>
 <p>In Brazil, the last number of the <i data-info="ticker">ticker</i> indicates the type: 3 is a common share (with voting rights), 4 is preferred (priority on dividends), 11 is a unit. In the US, the code is an abbreviated name: AAPL, MSFT, KO.</p>
 <div class="callout warn"><b>Survival rule:</b> only put into stocks the money you will not need in the next 5 years. Short horizons and the stock market do not mix.</div>`,
 medio:`<p>Two schools coexist. The first is buying the whole market through an <i data-info="etf">ETF</i> and not trying to pick winners. The second is analysing company by company. For most people, the first delivers more result with less time spent — and the data on active funds worldwide backs that up.</p>
 <h4>If you do pick, the minimum to look at</h4>
 <ul>
   <li><i data-info="pl">P/E</i> and <i data-info="pvp">P/B</i> compared with the sector and the company’s own history.</li>
   <li><i data-info="roe">ROE</i> consistently above 15% over several years.</li>
   <li><i data-info="divida-liquida">Net debt/EBITDA</i> under control for the sector.</li>
   <li>Revenue and profit growing over 5 to 10 years, not over one quarter.</li>
 </ul>
 <h4>How many stocks to hold</h4>
 <p>Fewer than 8 concentrates too much; more than 20 becomes an expensive-to-follow index. Between 10 and 15, from different sectors, is a reasonable range for a self-managed portfolio.</p>
 <div class="callout"><b>On dividends:</b> a <i data-info="dividend-yield">yield</i> that is too high is usually a sign of a falling price, not generosity. Check whether profit covers what is being distributed.</div>`,
 expert:`<p>Price = present value of free cash flows to equity discounted at the cost of equity. Multiples are shortcuts that embed assumptions about growth and return on capital; making them explicit (through the implied Gordon formula) reveals what the market is pricing.</p>
 <p>Factor evidence: size, value, momentum, quality and low risk show historical premiums, with meaningful instability and long periods of underperformance. Deliberate factor exposure demands a discipline most people abandon at the worst possible moment.</p>
 <p>In the Brazilian market, the index’s sector concentration (commodities and banks) means a "diversified" portfolio of local stocks carries high beta to commodity prices and to the domestic credit cycle. Real diversification requires leaving the country, not just the sector.</p>`}},

{id:"codigos", ic:"🔤", t:"Códigos, índices e cotações", te:"Codes, indexes and quotes", lead:"Por que PETR3 e PETR4 são a mesma empresa com preços diferentes — e o que significam IBOV, ^BVSP, BTC/USD.", leade:"Why PETR3 and PETR4 are the same company at different prices — and what IBOV, ^BVSP and BTC/USD mean.",
 n:{
 iniciante:`
 <p>Todo investimento tem um apelido curto, o <i data-info="ticker">ticker</i>. Aprender a ler esse código evita comprar a coisa errada.</p>
 <h4>No Brasil, o número no fim conta a história</h4>
 <ul>
   <li><b>3 — ação ordinária (<i data-info="acao-on">ON</i>):</b> PETR3, VALE3, BBAS3. Dá direito a voto na empresa.</li>
   <li><b>4 — ação preferencial (<i data-info="acao-pn">PN</i>):</b> PETR4, ITUB4, BBDC4. Sem voto, com preferência nos dividendos.</li>
   <li><b>5 e 6 — PNA e PNB:</b> variações da preferencial, com regras próprias de cada empresa.</li>
   <li><b>11 — <i data-info="unit">unit</i>, FII ou ETF:</b> SANB11 é uma unit, MXRF11 é um fundo imobiliário, BOVA11 é um ETF. O nome do ativo desempata.</li>
   <li><b>34 — <i data-info="bdr">BDR</i>:</b> AAPL34 é a Apple negociada aqui, em reais.</li>
   <li><b>F no fim — <i data-info="fracionario">fracionário</i>:</b> PETR4F é a mesma ação comprada em quantidade menor que 100.</li>
 </ul>
 <p>Nos Estados Unidos é mais simples: o código é uma abreviação do nome, de 1 a 5 letras — AAPL (Apple), KO (Coca-Cola), V (Visa), BRK.B (Berkshire classe B).</p>
 <div class="callout"><b>Por que PETR3 e PETR4 têm preços diferentes?</b> São dois tipos de ação da mesma empresa, com direitos diferentes, negociados separadamente. Nenhuma é "melhor": a PN costuma ter mais liquidez, a ON tem voto e mais proteção se a empresa for vendida.</div>`,
 medio:`
 <h4>Índices: o termômetro, não o investimento</h4>
 <p>Índice é uma média que serve de referência. Você não compra um índice — compra o ETF que o segue.</p>
 <ul>
   <li><b><i data-info="ibovespa">Ibovespa</i></b> (código <i data-info="bvsp">^BVSP</i>, apelido IBOV) → ETF <b>BOVA11</b></li>
   <li><b><i data-info="ifix">IFIX</i></b>, dos fundos imobiliários → não tem ETF; serve de comparação</li>
   <li><b><i data-info="idiv">IDIV</i></b> (dividendos) → <b>DIVO11</b> · <b>SMLL</b> (empresas menores) → <b>SMAL11</b></li>
   <li><b><i data-info="sp500">S&P 500</i></b> (^GSPC) → <b>VOO</b>, <b>IVV</b> ou <b>IVVB11</b> em reais</li>
   <li><b><i data-info="nasdaq">Nasdaq-100</i></b> (^NDX) → <b>QQQ</b> ou <b>NASD11</b></li>
   <li><b><i data-info="dow">Dow Jones</i></b> (^DJI) e <b>Russell 2000</b> (^RUT) → menos usados como referência de carteira</li>
 </ul>
 <p>O acento circunflexo (^) na frente é a convenção que os sistemas de cotação usam para dizer "isto é um índice, não um papel negociável".</p>
 <h4>Como ler uma cotação</h4>
 <p>Toda cotação é um <i data-info="par-cotacao">par</i>: USD/BRL é quantos reais custa um dólar; BTC/USD, quantos dólares custa um bitcoin. Por isso o mesmo Bitcoin aparece como "US$ 78 mil" ou "R$ 400 mil" — muda só a régua.</p>
 <p>Ainda na tela de cotação: <i data-info="bid-ask">bid</i> é quanto pagam por ele agora, <i data-info="bid-ask">ask</i> é por quanto vendem, e a diferença (o spread) é um custo que você paga sem ver. O <i data-info="volume">volume</i> mostra se o ativo é negociado de verdade.</p>
 <div class="callout"><b>Dólar:</b> o <i data-info="dolar-turismo">comercial</i> é o das notícias e dos investimentos; o turismo é o da casa de câmbio, sempre mais caro; a <i data-info="dolar-ptax">PTAX</i> é a média oficial do Banco Central, usada no imposto de renda.</div>`,
 expert:`
 <p>ON e PN não são só uma questão de voto: o spread histórico entre as duas classes precifica a probabilidade de evento de controle e o diferencial de liquidez. Empresas listadas no Novo Mercado têm apenas ON, com <b>tag along</b> de 100%; fora dele, a PN pode ter tag along reduzido ou nulo, o que justifica desconto estrutural.</p>
 <p>Sobre índices: o Ibovespa é ponderado por free float ajustado por liquidez e rebalanceado quadrimestralmente, com concentração relevante em commodities e bancos — o que significa que uma carteira "diversificada" em ações locais carrega beta alto ao ciclo de commodities. O S&P 500 é ponderado por capitalização com comitê discricionário; o Dow Jones é ponderado por preço, um critério sem fundamento econômico que sobrevive por tradição.</p>
 <p>Em cripto, a cotação BRL raramente é um mercado independente: normalmente é a paridade em dólar multiplicada pelo câmbio, com um prêmio ou desconto local que reflete custo de arbitragem e restrições de fluxo. Diferenças persistentes entre exchanges indicam fricção de liquidez, não oportunidade livre de risco.</p>
 <p>O <i data-info="vix">VIX</i>, por fim, é volatilidade implícita anualizada das opções do S&P 500 — mede amplitude esperada, nunca direção, e embute prêmio de risco de variância que o mantém, em média, acima da volatilidade realizada.</p>`},
 en:{
 iniciante:`<p>Every investment has a short nickname, the <i data-info="ticker">ticker</i>. Learning to read that code avoids buying the wrong thing.</p>
 <h4>In Brazil, the number at the end tells the story</h4>
 <ul>
   <li><b>3 — common share (<i data-info="acao-on">ON</i>):</b> PETR3, VALE3, BBAS3. Gives voting rights in the company.</li>
   <li><b>4 — preferred share (<i data-info="acao-pn">PN</i>):</b> PETR4, ITUB4, BBDC4. No vote, priority on dividends.</li>
   <li><b>5 and 6 — PNA and PNB:</b> variations of the preferred share, with each company’s own rules.</li>
   <li><b>11 — <i data-info="unit">unit</i>, FII or ETF:</b> SANB11 is a unit, MXRF11 is a real-estate fund, BOVA11 is an ETF. The asset’s name breaks the tie.</li>
   <li><b>34 — <i data-info="bdr">BDR</i>:</b> AAPL34 is Apple traded here, in reais.</li>
   <li><b>F at the end — <i data-info="fracionario">odd lot</i>:</b> PETR4F is the same share bought in quantities under 100.</li>
 </ul>
 <p>In the United States it is simpler: the code is an abbreviation of the name, 1 to 5 letters — AAPL (Apple), KO (Coca-Cola), V (Visa), BRK.B (Berkshire class B).</p>
 <div class="callout"><b>Why do PETR3 and PETR4 have different prices?</b> They are two share types of the same company, with different rights, traded separately. Neither is "better": the PN usually has more liquidity, the ON has a vote and more protection if the company is sold.</div>`,
 medio:`<h4>Indexes: the thermometer, not the investment</h4>
 <p>An index is an average that serves as a reference. You do not buy an index — you buy the ETF that tracks it.</p>
 <ul>
   <li><b><i data-info="ibovespa">Ibovespa</i></b> (code <i data-info="bvsp">^BVSP</i>, nickname IBOV) → ETF <b>BOVA11</b></li>
   <li><b><i data-info="ifix">IFIX</i></b>, for real-estate funds → no ETF; used as a comparison</li>
   <li><b><i data-info="idiv">IDIV</i></b> (dividends) → <b>DIVO11</b> · <b>SMLL</b> (smaller companies) → <b>SMAL11</b></li>
   <li><b><i data-info="sp500">S&P 500</i></b> (^GSPC) → <b>VOO</b>, <b>IVV</b> or <b>IVVB11</b> in reais</li>
   <li><b><i data-info="nasdaq">Nasdaq-100</i></b> (^NDX) → <b>QQQ</b> or <b>NASD11</b></li>
   <li><b><i data-info="dow">Dow Jones</i></b> (^DJI) and <b>Russell 2000</b> (^RUT) → less used as portfolio benchmarks</li>
 </ul>
 <p>The caret (^) in front is the convention quote systems use to say "this is an index, not a tradable security".</p>
 <h4>How to read a quote</h4>
 <p>Every quote is a <i data-info="par-cotacao">pair</i>: USD/BRL is how many reais one dollar costs; BTC/USD, how many dollars one bitcoin costs. That is why the same Bitcoin shows up as "US$ 78 thousand" or "R$ 400 thousand" — only the ruler changes.</p>
 <p>Still on the quote screen: <i data-info="bid-ask">bid</i> is what buyers pay for it now, <i data-info="bid-ask">ask</i> is what sellers want, and the difference (the spread) is a cost you pay without seeing it. <i data-info="volume">Volume</i> shows whether the asset is really traded.</p>
 <div class="callout"><b>Dollar:</b> the <i data-info="dolar-turismo">commercial</i> rate is the one in the news and in investments; the tourist rate is the exchange bureau’s, always dearer; <i data-info="dolar-ptax">PTAX</i> is the Central Bank’s official average, used for income tax.</div>`,
 expert:`<p>ON and PN are not just a matter of voting: the historical spread between the two classes prices the probability of a control event and the liquidity differential. Companies listed on the Novo Mercado have only ON shares, with 100% <b>tag along</b>; outside it, the PN can have reduced or no tag-along, which justifies a structural discount.</p>
 <p>On indexes: the Ibovespa is weighted by liquidity-adjusted free float and rebalanced every four months, with meaningful concentration in commodities and banks — which means a "diversified" portfolio of local stocks carries high beta to the commodity cycle. The S&P 500 is capitalisation-weighted with a discretionary committee; the Dow Jones is price-weighted, a criterion with no economic basis that survives by tradition.</p>
 <p>In crypto, the BRL quote is rarely an independent market: it is usually the dollar parity multiplied by the exchange rate, with a local premium or discount reflecting arbitrage cost and flow restrictions. Persistent differences between exchanges indicate liquidity friction, not a risk-free opportunity.</p>
 <p>The <i data-info="vix">VIX</i>, finally, is the annualised implied volatility of S&P 500 options — it measures expected amplitude, never direction, and embeds a variance risk premium that keeps it, on average, above realised volatility.</p>`}},

{id:"fiis", ic:"🏢", t:"Fundos imobiliários", te:"Real-estate funds (FIIs)", lead:"Aluguel todo mês sem comprar imóvel, sem inquilino e sem reforma.", leade:"Rent every month without buying a property, a tenant or a renovation.",
 n:{
 iniciante:`
 <p>Um <i data-info="fii">fundo imobiliário</i> junta o dinheiro de milhares de pessoas para comprar galpões, shoppings ou prédios de escritório. Você compra cotas na bolsa, como se fossem ações, e recebe sua parte do aluguel todo mês.</p>
 <h4>Por que muita gente gosta</h4>
 <ul>
   <li>Entrada baixa: a partir de R$ 10 por cota em vários fundos.</li>
   <li>Rendimento mensal, isento de IR para pessoa física dentro das regras da lei.</li>
   <li>Vende em minutos, diferente de um imóvel de verdade.</li>
   <li>Um único fundo pode ter 40 imóveis e 200 inquilinos, o que dilui o risco de ficar vazio.</li>
 </ul>
 <h4>Os dois grandes tipos</h4>
 <p><b>Tijolo:</b> o fundo é dono dos imóveis e vive do aluguel. <b>Papel:</b> o fundo empresta para o setor imobiliário e vive dos juros.</p>
 <div class="callout warn"><b>Atenção:</b> o rendimento mensal é isento, mas o lucro na <i data-info="ir-acoes">venda da cota</i> é tributado em 20%, sem faixa de isenção. Muita gente esquece disso na declaração.</div>`,
 medio:`
 <p>Indicadores que importam: <i data-info="pvp">P/VP</i> (pagar abaixo de 1 pode ser desconto ou aviso), <i data-info="vacancia">vacância</i> física e financeira, prazo e indexação dos contratos, e concentração — um fundo com um único inquilino em um único imóvel é uma aposta, não um fundo diversificado.</p>
 <h4>Papel x tijolo em ciclos diferentes</h4>
 <p>Fundos de papel indexados ao CDI brilham com juro alto; os indexados ao IPCA protegem inflação. Fundos de tijolo sofrem com juro alto (o investidor migra para renda fixa e o preço da cota cai) e se recuperam quando o juro cede.</p>
 <h4>Quantos ter</h4>
 <p>Entre 8 e 12 fundos, misturando segmentos (logística, shopping, lajes, papel), já entrega diversificação decente. Ou use um fundo de fundos, aceitando a camada extra de taxa.</p>
 <div class="callout"><b>Comparação útil:</b> antes de comprar um FII pelo yield, olhe a NTN-B longa. Se o título público paga IPCA + 7% sem risco de vacância, o FII precisa oferecer bem mais para compensar.</div>`,
 expert:`
 <p>A isenção dos rendimentos exige fundo com no mínimo 50 cotistas, cotas negociadas exclusivamente em bolsa e cotista com menos de 10% do fundo. Mudanças legislativas nesse desenho são risco relevante de tese.</p>
 <p>Em fundos de tijolo, avalie cap rate de aquisição versus custo de reposição, WALT, escadinha de vencimentos e cláusulas de reajuste (IPCA vs IGP-M) e de revisional. Em fundos de papel, a análise é de crédito: LTV das operações, subordinação das cotas de CRI, e duration frente ao ciclo de juros.</p>
 <p>Emissões subsequentes com custo de captação acima do cap rate dos ativos adquiridos destroem valor por cota — monitore o histórico de emissões e o gap de yield antes de exercer direito de preferência.</p>`},
 en:{
 iniciante:`<p>A <i data-info="fii">real-estate fund</i> pools the money of thousands of people to buy warehouses, shopping centres or office buildings. You buy units on the exchange, as if they were shares, and receive your slice of the rent every month.</p>
 <h4>Why many people like them</h4>
 <ul>
   <li>Low entry: from R$ 10 per unit in several funds.</li>
   <li>Monthly income, exempt from income tax for individuals within the rules of the law.</li>
   <li>Sells in minutes, unlike an actual property.</li>
   <li>A single fund can hold 40 properties and 200 tenants, which dilutes the risk of sitting empty.</li>
 </ul>
 <h4>The two big types</h4>
 <p><b>Bricks:</b> the fund owns the properties and lives off the rent. <b>Paper:</b> the fund lends to the real-estate sector and lives off the interest.</p>
 <div class="callout warn"><b>Watch out:</b> the monthly income is exempt, but the profit on <i data-info="ir-acoes">selling the unit</i> is taxed at 20%, with no exemption band. Many people forget that on the tax return.</div>`,
 medio:`<p>Indicators that matter: <i data-info="pvp">P/B</i> (paying below 1 can be a discount or a warning), physical and financial <i data-info="vacancia">vacancy</i>, lease terms and indexation, and concentration — a fund with a single tenant in a single property is a bet, not a diversified fund.</p>
 <h4>Paper vs bricks across cycles</h4>
 <p>Paper funds indexed to the CDI shine when rates are high; those indexed to the IPCA protect against inflation. Bricks funds suffer when rates are high (investors migrate to fixed income and the unit price falls) and recover when rates ease.</p>
 <h4>How many to hold</h4>
 <p>Between 8 and 12 funds, mixing segments (logistics, malls, offices, paper), already delivers decent diversification. Or use a fund of funds, accepting the extra layer of fees.</p>
 <div class="callout"><b>Useful comparison:</b> before buying an FII for its yield, look at the long NTN-B. If the government bond pays IPCA + 7% with no vacancy risk, the FII has to offer a lot more to make up for it.</div>`,
 expert:`<p>The income exemption requires a fund with at least 50 unitholders, units traded exclusively on the exchange, and no unitholder above 10% of the fund. Legislative changes to this design are a material thesis risk.</p>
 <p>In bricks funds, assess acquisition cap rate versus replacement cost, WALT, the lease-expiry ladder, and indexation (IPCA vs IGP-M) and rent-review clauses. In paper funds the analysis is credit: LTV of the operations, subordination of the CRI tranches, and duration against the rate cycle.</p>
 <p>Follow-on offerings with a cost of capital above the cap rate of the acquired assets destroy value per unit — monitor the issuance history and the yield gap before exercising pre-emptive rights.</p>`}},

{id:"etfs", ic:"🧺", t:"ETFs: a cesta pronta", te:"ETFs: the ready-made basket", lead:"A forma mais simples e barata de ter o mercado inteiro.", leade:"The simplest and cheapest way to own the whole market.",
 n:{
 iniciante:`
 <p>Um <i data-info="etf">ETF</i> é uma cesta de investimentos negociada como uma ação. Comprando uma cota do VOO ou do IVVB11, você compra um pedacinho das 500 maiores empresas americanas de uma vez só.</p>
 <h4>Por que isso resolve muita coisa</h4>
 <ul>
   <li>Uma ordem só e você fica diversificado.</li>
   <li>Custo baixíssimo: muitos cobram menos de 0,1% ao ano.</li>
   <li>Você não precisa acertar qual empresa vai bem — fica com todas.</li>
   <li>Sem <i data-info="come-cotas">come-cotas</i> em ETFs de ações.</li>
 </ul>
 <h4>Os mais conhecidos</h4>
 <p>Na bolsa brasileira, em reais: <b>BOVA11</b> (Ibovespa), <b>IVVB11</b> (S&P 500), <b>SMAL11</b> (empresas menores). Na bolsa americana, em dólar: <b>VOO</b> ou <b>IVV</b> (S&P 500), <b>QQQ</b> (Nasdaq), <b>VT</b> (mundo inteiro).</p>
 <div class="callout"><b>Combinação clássica:</b> um ETF global em dólar + renda fixa brasileira já é uma carteira defensável para a maior parte das pessoas, com meia dúzia de decisões por ano.</div>`,
 medio:`
 <p>ETFs de ações no Brasil pagam 15% de IR sobre o ganho, <b>sem</b> a isenção de R$ 20 mil mensais das ações à vista. ETFs de renda fixa seguem tabela própria. Nos EUA, a venda com lucro é tributada no Brasil conforme as regras de aplicações no exterior, e dividendos pagos por ETFs americanos sofrem retenção de 30% na fonte.</p>
 <h4>IVVB11 ou VOO?</h4>
 <p>IVVB11 é prático: compra em reais, pela corretora brasileira, e já te dá exposição ao S&P 500 e ao dólar. Custa um pouco mais caro em taxa e você não recebe os dividendos em dólar (eles são reinvestidos). VOO custa menos e paga dividendos, mas exige conta no exterior, remessa e declaração adicional. Para valores menores ou para começar, IVVB11 simplifica a vida.</p>
 <h4>O que olhar num ETF</h4>
 <p>Taxa de administração, patrimônio (fundos pequenos podem fechar), liquidez diária e aderência ao índice.</p>`,
 expert:`
 <p>Para investidor brasileiro com conta no exterior, ETFs UCITS domiciliados na Irlanda (CSPX, VWRA) reduzem a retenção sobre dividendos de subjacentes americanos de 30% para 15% no nível do fundo e ficam fora do alcance do estate tax americano, ao custo de menor liquidez e spread maior.</p>
 <p>Avalie tracking difference (diferença acumulada de retorno) em vez de tracking error (volatilidade da diferença): o primeiro captura o custo real de replicação, incluindo receita de empréstimo de ações e eficiência tributária.</p>
 <p>Em ETFs sintéticos, existe risco de contraparte do swap, mitigado por colateral. Em ETFs de renda fixa, atenção ao descolamento entre preço em bolsa e NAV em momentos de estresse de liquidez do subjacente.</p>`},
 en:{
 iniciante:`<p>An <i data-info="etf">ETF</i> is a basket of investments traded like a share. Buying one unit of VOO or IVVB11, you buy a small piece of the 500 largest US companies at once.</p>
 <h4>Why this solves a lot</h4>
 <ul>
   <li>One order and you are diversified.</li>
   <li>Very low cost: many charge less than 0.1% a year.</li>
   <li>You do not need to guess which company will do well — you hold all of them.</li>
   <li>No <i data-info="come-cotas">come-cotas</i> on equity ETFs.</li>
 </ul>
 <h4>The best known</h4>
 <p>On the Brazilian exchange, in reais: <b>BOVA11</b> (Ibovespa), <b>IVVB11</b> (S&P 500), <b>SMAL11</b> (smaller companies). On the US exchange, in dollars: <b>VOO</b> or <b>IVV</b> (S&P 500), <b>QQQ</b> (Nasdaq), <b>VT</b> (whole world).</p>
 <div class="callout"><b>Classic combination:</b> one global ETF in dollars + Brazilian fixed income is already a defensible portfolio for most people, with half a dozen decisions a year.</div>`,
 medio:`<p>Equity ETFs in Brazil pay 15% income tax on the gain, <b>without</b> the R$ 20 thousand monthly exemption that cash-market stocks have. Fixed-income ETFs follow their own table. In the US, a profitable sale is taxed in Brazil under the rules for foreign investments, and dividends paid by US ETFs suffer 30% withholding at source.</p>
 <h4>IVVB11 or VOO?</h4>
 <p>IVVB11 is practical: you buy in reais, through your Brazilian broker, and it already gives you exposure to the S&P 500 and to the dollar. It costs a bit more in fees and you do not receive the dividends in dollars (they are reinvested). VOO costs less and pays dividends, but requires an account abroad, a remittance and extra tax reporting. For smaller amounts, or to get started, IVVB11 makes life simpler.</p>
 <h4>What to look at in an ETF</h4>
 <p>Management fee, assets under management (small funds can close), daily liquidity and how closely it tracks the index.</p>`,
 expert:`<p>For a Brazilian investor with an account abroad, Irish-domiciled UCITS ETFs (CSPX, VWRA) reduce the withholding on dividends from US underlyings from 30% to 15% at fund level and sit outside the reach of US estate tax, at the cost of lower liquidity and wider spreads.</p>
 <p>Assess tracking difference (accumulated return gap) rather than tracking error (volatility of the gap): the former captures the real cost of replication, including securities-lending revenue and tax efficiency.</p>
 <p>In synthetic ETFs there is swap counterparty risk, mitigated by collateral. In fixed-income ETFs, watch the gap between exchange price and NAV in moments of liquidity stress in the underlying.</p>`}},

{id:"exterior", ic:"🇺🇸", t:"Investir nos Estados Unidos", te:"Investing in the United States", lead:"Conta no exterior, dólar parado, ações americanas e o que a Receita quer saber.", leade:"An account abroad, idle dollars, US stocks and what the tax authority wants to know.",
 n:{
 iniciante:`
 <p>Existem três caminhos para ter dinheiro aplicado lá fora, do mais simples ao mais completo:</p>
 <ol>
   <li><b>ETF brasileiro</b> (IVVB11, NASD11): compra em reais, pela sua corretora de sempre. Nada muda na sua declaração além do normal.</li>
   <li><b><i data-info="bdr">BDRs</i></b> (AAPL34, MSFT34): ações americanas negociadas em reais na B3.</li>
   <li><b>Conta em corretora internacional</b> (Avenue, Nomad, Inter US, BB Americas, Schwab): você envia dólares e compra as ações de verdade, na bolsa americana.</li>
 </ol>
 <h4>Dólar parado em conta também é investimento</h4>
 <p>Se você tem dólares parados numa conta lá fora, isso conta no seu patrimônio e varia com o câmbio. No InvestifyONE, cadastre como tipo <b>Dinheiro parado em conta</b>, informando o valor em dólar — o app converte para reais pela cotação do dia.</p>
 <div class="callout warn"><b>Importante:</b> dólar parado não rende nada e ainda perde para a inflação americana. Se a intenção é mantê-lo por muito tempo, vale pelo menos colocar num fundo de caixa (money market) ou em Treasuries curtos.</div>`,
 medio:`
 <p><b>Abrindo a conta:</b> você assina o <i data-info="w8ben">W-8BEN</i> declarando não ser residente fiscal nos EUA. Ele vale três anos.</p>
 <h4>Os custos escondidos da remessa</h4>
 <p>Compare o <i data-info="spread-cambial">dólar efetivo</i>, não a cotação anunciada: spread da instituição mais IOF. A diferença entre a melhor e a pior opção costuma ser de 0,5% a 2% em cada envio — em remessas grandes, isso supera qualquer economia de corretagem.</p>
 <h4>Impostos, em resumo</h4>
 <ul>
   <li><b>Dividendos americanos:</b> 30% retidos na fonte, automaticamente.</li>
   <li><b>Ganho na venda:</b> tributado no Brasil segundo as regras de aplicações financeiras no exterior, que mudaram com a Lei 14.754/2023 — hoje a apuração é anual, na declaração.</li>
   <li><b>Declaração:</b> os ativos vão na ficha de Bens e Direitos, pelo custo em reais na data de cada compra. Acima de certo valor, há também a <i data-info="bens-exterior">CBE do Banco Central</i>.</li>
 </ul>
 <div class="callout"><b>Guarde tudo:</b> extrato de cada remessa com a cotação do dia e nota de cada compra. Sem isso, calcular o custo de aquisição anos depois vira pesadelo.</div>`,
 expert:`
 <p>A Lei 14.754/2023 alterou o regime de aplicações financeiras no exterior para tributação anual, eliminando a isenção mensal e o diferimento que existiam. Para entidades controladas no exterior, aplica-se transparência fiscal opcional. Confirme com contador a apuração do ano-base antes de estruturar qualquer coisa.</p>
 <p>O <i data-info="estate-tax">estate tax</i> americano alcança situs assets acima de US$ 60 mil para não residentes, com alíquotas progressivas até 40%. Mitigações: ETFs UCITS (situs irlandês), estruturas societárias, ou seguro. Cada rota tem implicação distinta na tributação brasileira.</p>
 <p>Sobre caixa em dólar: money market funds e T-Bills curtos capturam a taxa livre de risco americana. Manter saldo ocioso em conta corrente equivale a doar o carry — relevante quando a taxa americana está longe de zero.</p>`},
 en:{
 iniciante:`<p>There are three routes to having money invested abroad, from the simplest to the most complete:</p>
 <ol>
   <li><b>Brazilian ETF</b> (IVVB11, NASD11): you buy in reais, through your usual broker. Nothing changes on your tax return beyond the normal.</li>
   <li><b><i data-info="bdr">BDRs</i></b> (AAPL34, MSFT34): US stocks traded in reais on B3.</li>
   <li><b>Account at an international broker</b> (Avenue, Nomad, Inter US, BB Americas, Schwab): you send dollars and buy the actual shares on the US exchange.</li>
 </ol>
 <h4>Idle dollars in an account are an investment too</h4>
 <p>If you have dollars sitting in an account abroad, that counts in your net worth and moves with the exchange rate. In InvestifyONE, register it as the type <b>Cash sitting in an account</b>, entering the amount in dollars — the app converts it to reais at the day’s rate.</p>
 <div class="callout warn"><b>Important:</b> idle dollars earn nothing and still lose to US inflation. If the plan is to keep them for a long time, it is worth at least putting them in a money-market fund or in short Treasuries.</div>`,
 medio:`<p><b>Opening the account:</b> you sign the <i data-info="w8ben">W-8BEN</i> declaring you are not a US tax resident. It is valid for three years.</p>
 <h4>The hidden costs of the remittance</h4>
 <p>Compare the <i data-info="spread-cambial">effective dollar</i>, not the advertised rate: the institution’s spread plus IOF. The difference between the best and the worst option is usually 0.5% to 2% on each transfer — on large remittances, that beats any brokerage saving.</p>
 <h4>Taxes, in short</h4>
 <ul>
   <li><b>US dividends:</b> 30% withheld at source, automatically.</li>
   <li><b>Gain on sale:</b> taxed in Brazil under the rules for financial investments abroad, which changed with Law 14,754/2023 — today the computation is yearly, on the tax return.</li>
   <li><b>Reporting:</b> the assets go on the Assets and Rights schedule, at the cost in reais on the date of each purchase. Above a certain amount there is also the <i data-info="bens-exterior">Central Bank’s CBE</i>.</li>
 </ul>
 <div class="callout"><b>Keep everything:</b> the statement of each remittance with the day’s rate and the note for each purchase. Without them, calculating the acquisition cost years later becomes a nightmare.</div>`,
 expert:`<p>Law 14,754/2023 changed the regime for financial investments abroad to yearly taxation, eliminating the monthly exemption and the deferral that existed. For controlled entities abroad, optional tax transparency applies. Confirm the computation for the base year with an accountant before structuring anything.</p>
 <p>US <i data-info="estate-tax">estate tax</i> reaches situs assets above US$ 60 thousand for non-residents, with progressive rates up to 40%. Mitigations: UCITS ETFs (Irish situs), corporate structures, or insurance. Each route has a distinct implication for Brazilian taxation.</p>
 <p>On dollar cash: money-market funds and short T-Bills capture the US risk-free rate. Keeping an idle balance in a current account is equivalent to giving away the carry — relevant when the US rate is far from zero.</p>`}},

{id:"cambio", ic:"💱", t:"Dólar e proteção cambial", te:"The dollar and currency protection", lead:"Por que ter parte do patrimônio em moeda forte muda o comportamento da carteira.", leade:"Why holding part of your wealth in a hard currency changes how the portfolio behaves.",
 n:{
 iniciante:`
 <p>Quando o Brasil passa por turbulência, duas coisas costumam acontecer juntas: a bolsa cai e o dólar sobe. Quem tem uma parte em dólar sente menos a queda, porque um lado compensa o outro.</p>
 <p>É por isso que exposição cambial é chamada de proteção, e não de aposta. Você não está torcendo pelo dólar — está reduzindo a chance de todo o seu patrimônio depender de um único país.</p>
 <h4>Quanto ter</h4>
 <p>Não existe número mágico. Entre 20% e 40% do patrimônio em moeda forte é a faixa que aparece com mais frequência em carteiras diversificadas de quem vive no Brasil.</p>
 <h4>Formas de ter dólar</h4>
 <ul>
   <li>Dólar parado em conta no exterior (proteção pura, mas não rende).</li>
   <li>Ações e ETFs americanos (proteção + crescimento).</li>
   <li>IVVB11 e BDRs, em reais (proteção indireta, sem sair do Brasil).</li>
   <li>Fundos cambiais (simples, com taxa).</li>
 </ul>`,
 medio:`
 <p>Quando você investe lá fora, seu resultado tem duas pernas: o que a ação fez em dólar e o que o dólar fez em reais. Um ano com ação de +10% em dólar e real se valorizando 12% termina negativo em reais. O InvestifyONE mostra o resultado convertido; vale sempre olhar o retorno também na moeda de origem.</p>
 <h4>Um erro comum</h4>
 <p>Comprar dólar depois de uma alta forte, por medo. Historicamente, quem compra moeda em pânico compra no topo do ciclo. Exposição cambial funciona como política permanente da carteira, definida em percentual e mantida por rebalanceamento — não como reação a manchete.</p>
 <h4>Hedge cambial</h4>
 <p>Fundos "com hedge" neutralizam a variação do dólar para você capturar só o retorno do ativo. Faz sentido para prazos curtos ou objetivos em reais. Para longo prazo, o hedge no Brasil custa caro (paga-se o diferencial de juros) e remove justamente a proteção que você queria.</p>`,
 expert:`
 <p>Decomponha: R_BRL = (1+R_local)·(1+ΔFX) − 1. O termo cruzado é material em janelas voláteis e normalmente ignorado em relatórios simplificados.</p>
 <p>O custo do hedge é aproximadamente o diferencial de juros coberto (cupom cambial). Com Selic muito acima da Fed Funds, o carry negativo de proteger torna o hedge caro para horizontes longos.</p>
 <p>Dimensione a exposição pelo passivo: consumo futuro em reais, fração de bens importados na cesta, planos de estudo ou residência no exterior. Uma alocação cambial coerente com o passivo é hedge; acima disso, é posição direcional — legítima, mas deve ser reconhecida como tal.</p>`},
 en:{
 iniciante:`<p>When Brazil goes through turbulence, two things usually happen together: the stock market falls and the dollar rises. Whoever holds a part in dollars feels the drop less, because one side offsets the other.</p>
 <p>That is why currency exposure is called protection, not a bet. You are not rooting for the dollar — you are reducing the chance of your entire wealth depending on a single country.</p>
 <h4>How much to hold</h4>
 <p>There is no magic number. Between 20% and 40% of wealth in a hard currency is the range that appears most often in diversified portfolios of people who live in Brazil.</p>
 <h4>Ways to hold dollars</h4>
 <ul>
   <li>Idle dollars in an account abroad (pure protection, but it earns nothing).</li>
   <li>US stocks and ETFs (protection + growth).</li>
   <li>IVVB11 and BDRs, in reais (indirect protection, without leaving Brazil).</li>
   <li>Currency funds (simple, with a fee).</li>
 </ul>`,
 medio:`<p>When you invest abroad, your result has two legs: what the stock did in dollars and what the dollar did in reais. A year with a stock at +10% in dollars and the real appreciating 12% ends negative in reais. InvestifyONE shows the converted result; it is always worth looking at the return in the original currency as well.</p>
 <h4>A common mistake</h4>
 <p>Buying dollars after a sharp rise, out of fear. Historically, whoever buys currency in a panic buys at the top of the cycle. Currency exposure works as a permanent portfolio policy, set as a percentage and kept through rebalancing — not as a reaction to a headline.</p>
 <h4>Currency hedging</h4>
 <p>"Hedged" funds neutralise the dollar’s move so you capture only the asset’s return. That makes sense for short horizons or goals in reais. For the long run, hedging in Brazil is expensive (you pay the interest-rate differential) and removes precisely the protection you wanted.</p>`,
 expert:`<p>Decompose: R_BRL = (1+R_local)·(1+ΔFX) − 1. The cross term is material in volatile windows and usually ignored in simplified reports.</p>
 <p>The cost of hedging is approximately the covered interest differential (cupom cambial, the onshore dollar rate). With the Selic far above Fed Funds, the negative carry of protecting makes hedging expensive over long horizons.</p>
 <p>Size the exposure by the liability: future consumption in reais, the share of imported goods in the basket, plans to study or live abroad. A currency allocation coherent with the liability is a hedge; above that, it is a directional position — legitimate, but it should be recognised as such.</p>`}},

{id:"fundos", ic:"📁", t:"Fundos e previdência", te:"Funds and pension plans", lead:"Quando delegar faz sentido, e o que olhar antes de assinar.", leade:"When delegating makes sense, and what to look at before signing.",
 n:{
 iniciante:`
 <p>Um <i data-info="fundo">fundo de investimento</i> é um bolo de dinheiro de várias pessoas, gerido por um profissional. Você compra cotas e o valor delas sobe ou desce conforme o gestor acerta ou erra.</p>
 <h4>O que você paga</h4>
 <ul>
   <li><i data-info="taxa-administracao">Taxa de administração</i>: fixa, todo ano, aconteça o que acontecer.</li>
   <li><i data-info="taxa-performance">Taxa de performance</i>: um pedaço do que superar o benchmark.</li>
   <li><i data-info="come-cotas">Come-cotas</i>: imposto antecipado em maio e novembro, em fundos que não são de ações.</li>
 </ul>
 <h4>Previdência privada</h4>
 <p>É um fundo pensado para a aposentadoria, com duas versões. <b>PGBL</b> permite abater até 12% da renda tributável — só serve para quem faz declaração completa. <b>VGBL</b> não abate nada, mas o imposto no resgate incide só sobre o rendimento.</p>
 <div class="callout"><b>Vantagem real da previdência:</b> não tem come-cotas e a portabilidade entre planos é livre e isenta. Você pode trocar um plano caro por um barato sem pagar imposto no caminho.</div>`,
 medio:`
 <p>O primeiro filtro de qualquer fundo é o custo. Um multimercado cobrando 2% + 20% precisa bater o CDI com folga consistente só para empatar com um Tesouro Selic. A maioria não consegue por períodos longos.</p>
 <h4>Como avaliar de verdade</h4>
 <ul>
   <li>Retorno <b>líquido</b> contra o benchmark correto, em janelas de 3 e 5 anos — não em 12 meses.</li>
   <li><i data-info="sharpe">Sharpe</i> e <i data-info="drawdown">drawdown</i> máximo: quanto de sofrimento o resultado custou.</li>
   <li>Prazo de resgate (D+30 significa dinheiro na conta um mês depois).</li>
   <li>Se o gestor que fez o histórico ainda está lá.</li>
 </ul>
 <h4>Previdência: escolha a tabela certa</h4>
 <p>Para prazo acima de 10 anos, tabela <b>regressiva</b> leva o IR a 10% — a menor alíquota disponível em qualquer investimento no Brasil. Tabela progressiva só faz sentido se você espera renda baixa na aposentadoria ou resgate em prazo curto.</p>
 <div class="callout warn"><b>Cheque hoje:</b> planos de previdência antigos de banco costumam cobrar taxa de administração de 2% a 3% e ainda taxa de carregamento. A portabilidade para um plano de 0,5% muda o resultado final de forma dramática, e é gratuita.</div>`,
 expert:`
 <p>Separe alfa de beta disfarçado: boa parte da performance de multimercados é explicada por exposições a fatores e a carrego de juros locais, replicáveis a custo baixo. Rode uma regressão simples contra CDI, Ibovespa, dólar e IMA-B antes de pagar por gestão ativa.</p>
 <p>Na previdência, a ausência de come-cotas gera diferimento fiscal cujo valor presente cresce com prazo e taxa. Com 20 anos e retorno de 10% a.a., o diferimento compensa um spread de taxa de administração na casa de 0,5 a 0,8 p.p. frente a um fundo tributável equivalente — acima disso, o plano destrói valor.</p>
 <p>A portabilidade isenta é uma opção real valiosa: permite migrar gestão sem evento tributário, algo indisponível em fundos comuns. Considere-a ao comparar veículos de acumulação de longuíssimo prazo.</p>`},
 en:{
 iniciante:`<p>An <i data-info="fundo">investment fund</i> is a pool of money from many people, managed by a professional. You buy units and their value rises or falls as the manager gets it right or wrong.</p>
 <h4>What you pay</h4>
 <ul>
   <li><i data-info="taxa-administracao">Management fee</i>: fixed, every year, whatever happens.</li>
   <li><i data-info="taxa-performance">Performance fee</i>: a slice of whatever beats the benchmark.</li>
   <li><i data-info="come-cotas">Come-cotas</i>: tax taken in advance in May and November, in funds that are not equity funds.</li>
 </ul>
 <h4>Private pension</h4>
 <p>It is a fund designed for retirement, in two versions. <b>PGBL</b> lets you deduct up to 12% of taxable income — only useful for whoever files the full return. <b>VGBL</b> deducts nothing, but the tax on withdrawal applies only to the gains.</p>
 <div class="callout"><b>The real advantage of pension plans:</b> no come-cotas, and portability between plans is free and tax-exempt. You can swap an expensive plan for a cheap one without paying tax along the way.</div>`,
 medio:`<p>The first filter for any fund is cost. A multi-strategy fund charging 2% + 20% needs to beat the CDI consistently and by a wide margin just to tie with Tesouro Selic. Most cannot over long periods.</p>
 <h4>How to really assess one</h4>
 <ul>
   <li><b>Net</b> return against the correct benchmark, over 3- and 5-year windows — not 12 months.</li>
   <li><i data-info="sharpe">Sharpe</i> and maximum <i data-info="drawdown">drawdown</i>: how much suffering the result cost.</li>
   <li>Redemption period (D+30 means money in the account a month later).</li>
   <li>Whether the manager who built the track record is still there.</li>
 </ul>
 <h4>Pension: choose the right table</h4>
 <p>For horizons above 10 years, the <b>regressive</b> table takes income tax down to 10% — the lowest rate available in any investment in Brazil. The progressive table only makes sense if you expect a low income in retirement or a withdrawal in the short term.</p>
 <div class="callout warn"><b>Check today:</b> old bank pension plans usually charge management fees of 2% to 3% and a loading fee on top. Portability to a 0.5% plan changes the final result dramatically, and it is free.</div>`,
 expert:`<p>Separate alpha from disguised beta: a good part of multi-strategy funds’ performance is explained by factor exposures and by local interest-rate carry, replicable at low cost. Run a simple regression against CDI, Ibovespa, the dollar and IMA-B before paying for active management.</p>
 <p>In pension plans, the absence of come-cotas creates a tax deferral whose present value grows with horizon and rate. Over 20 years at a 10% a year return, the deferral offsets a management-fee spread of around 0.5 to 0.8 p.p. against an equivalent taxable fund — above that, the plan destroys value.</p>
 <p>Tax-free portability is a valuable real option: it allows switching managers with no taxable event, something unavailable in ordinary funds. Consider it when comparing very-long-term accumulation vehicles.</p>`}},

{id:"cripto", ic:"₿", t:"Criptomoedas", te:"Cryptocurrencies", lead:"O ativo mais volátil da carteira: como dimensionar sem se machucar.", leade:"The most volatile asset in the portfolio: how to size it without getting hurt.",
 n:{
 iniciante:`
 <p><i data-info="cripto">Criptomoedas</i> são dinheiro digital que funciona numa rede de computadores, sem banco central. O Bitcoin é o mais antigo e o maior.</p>
 <h4>O que esperar</h4>
 <p>Quedas de 50% a 80% já aconteceram várias vezes, e altas explosivas também. Não existe lucro, dividendo ou fluxo de caixa por trás — o preço é definido só por quanto alguém está disposto a pagar.</p>
 <h4>Como dimensionar</h4>
 <p>A recomendação mais comum é manter entre 1% e 5% do patrimônio, com uma pergunta honesta antes: se esse valor virar zero, sua vida muda? Se a resposta for sim, é demais.</p>
 <h4>Onde guardar</h4>
 <p>Começando, deixar na corretora (Binance, Mercado Bitcoin, Coinbase) é o caminho prático. Com valores maiores, vale estudar <i data-info="custodia-cripto">carteira própria</i> — onde só você tem a chave e a responsabilidade.</p>
 <div class="callout warn"><b>Golpes:</b> nenhum investimento sério promete rendimento fixo diário em cripto. Se prometeram, é pirâmide.</div>`,
 medio:`
 <p>No Brasil, a venda de cripto acima de R$ 35 mil no mês é tributada em 15% sobre o ganho; abaixo disso, há isenção. Operações em exchanges estrangeiras exigem declaração específica, e há obrigação acessória mensal quando os valores passam o limite da Receita.</p>
 <h4>As <i data-info="stablecoin">stablecoins</i></h4>
 <p>USDT e USDC tentam valer sempre US$ 1 e são usadas como dólar dentro do mundo cripto. Não são iguais a dólar no banco: dependem das reservas de quem emite, e já houve casos de perda de paridade.</p>
 <h4>Bitcoin x o resto</h4>
 <p>O Bitcoin tem oferta limitada, histórico mais longo e ETFs regulados. As demais moedas são apostas em projetos específicos, com risco muito maior de desaparecerem. Concentrar a fatia cripto em BTC e, no máximo, ETH é a escolha mais conservadora dentro da classe.</p>`,
 expert:`
 <p>Sem fluxo de caixa, a avaliação é reflexiva: modelos como stock-to-flow e Metcalfe têm poder explicativo frágil fora da amostra. Trate a alocação como opção convexa dimensionada por Kelly fracionário, não por convicção direcional.</p>
 <p>Correlação com ativos de risco subiu materialmente desde 2020 — a tese de "ouro digital" descorrelacionado não se sustenta nos dados recentes. O benefício de diversificação é menor do que o marketing sugere.</p>
 <p>Risco operacional domina: custódia, chaves, contraparte de exchange e risco regulatório. ETFs spot regulados transferem custódia para instituições auditadas ao custo da taxa de administração e da impossibilidade de autocustódia.</p>`},
 en:{
 iniciante:`<p><i data-info="cripto">Cryptocurrencies</i> are digital money that runs on a network of computers, with no central bank. Bitcoin is the oldest and the largest.</p>
 <h4>What to expect</h4>
 <p>Drops of 50% to 80% have happened several times, and explosive rallies too. There is no profit, dividend or cash flow behind it — the price is set only by how much someone is willing to pay.</p>
 <h4>How to size it</h4>
 <p>The most common guidance is keeping between 1% and 5% of wealth, with an honest question first: if this amount goes to zero, does your life change? If the answer is yes, it is too much.</p>
 <h4>Where to keep it</h4>
 <p>Starting out, leaving it at the exchange (Binance, Mercado Bitcoin, Coinbase) is the practical route. With larger amounts it is worth studying a <i data-info="custodia-cripto">wallet of your own</i> — where only you hold the key and the responsibility.</p>
 <div class="callout warn"><b>Scams:</b> no serious investment promises a fixed daily return in crypto. If they promised one, it is a pyramid.</div>`,
 medio:`<p>In Brazil, selling crypto above R$ 35 thousand in a month is taxed at 15% on the gain; below that there is an exemption. Trades on foreign exchanges require specific reporting, and there is a monthly filing obligation when amounts exceed the Receita’s threshold.</p>
 <h4><i data-info="stablecoin">Stablecoins</i></h4>
 <p>USDT and USDC try to always be worth US$ 1 and are used as dollars inside the crypto world. They are not the same as dollars in a bank: they depend on the issuer’s reserves, and there have been cases of losing the peg.</p>
 <h4>Bitcoin vs the rest</h4>
 <p>Bitcoin has a capped supply, the longest track record and regulated ETFs. The other coins are bets on specific projects, with a much higher risk of disappearing. Concentrating the crypto slice in BTC and, at most, ETH is the most conservative choice within the class.</p>`,
 expert:`<p>With no cash flow, valuation is reflexive: models such as stock-to-flow and Metcalfe have fragile out-of-sample explanatory power. Treat the allocation as a convex option sized by fractional Kelly, not by directional conviction.</p>
 <p>Correlation with risk assets has risen materially since 2020 — the "uncorrelated digital gold" thesis does not hold up in recent data. The diversification benefit is smaller than the marketing suggests.</p>
 <p>Operational risk dominates: custody, keys, exchange counterparty and regulatory risk. Regulated spot ETFs transfer custody to audited institutions at the cost of the management fee and of giving up self-custody.</p>`}},

{id:"alocacao", ic:"🧩", t:"Montando sua carteira", te:"Building your portfolio", lead:"A decisão que mais importa: quantos por cento em cada coisa.", leade:"The decision that matters most: what percentage goes in each thing.",
 n:{
 iniciante:`
 <p><i data-info="alocacao">Alocação</i> é decidir as fatias do bolo: quanto em renda fixa, quanto em ações, quanto em dólar, quanto em imóveis. Essa decisão pesa mais no resultado final do que escolher a ação certa.</p>
 <h4>Três modelos para se inspirar</h4>
 <ul>
   <li><b>Conservador:</b> 60% renda fixa, 10% FIIs, 5% ações BR, 15% exterior, 10% caixa.</li>
   <li><b>Moderado:</b> 35% renda fixa, 15% FIIs, 15% ações BR, 30% exterior, 5% caixa.</li>
   <li><b>Arrojado:</b> 15% renda fixa, 10% FIIs, 22% ações BR, 45% exterior e cripto, 8% caixa.</li>
 </ul>
 <p>São pontos de partida, não receitas. O que define a sua é o prazo dos seus objetivos e o quanto você aguenta ver a carteira cair sem vender.</p>
 <h4><i data-info="rebalanceamento">Rebalancear</i></h4>
 <p>Uma vez por ano, confira as fatias. Se ações viraram 40% quando você queria 25%, direcione os próximos aportes para o que ficou pequeno. Isso faz você comprar barato e vender caro automaticamente.</p>`,
 medio:`
 <p>Monte por objetivo, não por produto. Cada meta tem prazo, e o prazo define o risco aceitável:</p>
 <ul>
   <li>Reserva (sempre): Tesouro Selic ou CDB de liquidez diária.</li>
   <li>Objetivo em 2 a 4 anos (carro, entrada de imóvel): renda fixa casada com o prazo.</li>
   <li>Objetivo em 5 a 10 anos: mistura, com renda variável limitada.</li>
   <li>Aposentadoria: ações, ETFs globais, IPCA+ longo e previdência.</li>
 </ul>
 <h4>Rebalanceamento por banda</h4>
 <p>Em vez de data fixa, use tolerância: rebalanceie quando alguma classe se afastar mais de 5 pontos percentuais do alvo. Gera menos operação, menos imposto e captura melhor os extremos.</p>
 <div class="callout"><b>No InvestifyONE:</b> a aba Prognóstico tem o simulador de alocação. Defina os alvos e ele mostra, em reais, quanto falta ou sobra em cada classe — e quanto do próximo aporte deveria ir para onde.</div>`,
 expert:`
 <p>Otimização média-variância é notoriamente sensível a erros de estimativa, especialmente nos retornos esperados. Alternativas mais robustas: risk parity, mínimo variância com restrições, ou Black-Litterman ancorado em equilíbrio de mercado com views explícitas e níveis de confiança.</p>
 <p>Para o investidor brasileiro, duas exposições estruturais merecem tratamento deliberado: capital humano (renda em reais, correlacionada ao ciclo doméstico) e concentração geográfica. Ambas argumentam por alocação internacional acima do peso do Brasil no PIB global.</p>
 <p>Rebalanceamento gera um prêmio (rebalancing bonus) proporcional à dispersão e à baixa correlação entre classes, líquido de custo fiscal e de transação. Em contas tributáveis, rebalanceie preferencialmente por fluxo de aportes e por localização de ativos (asset location) entre veículos com regimes fiscais distintos.</p>`},
 en:{
 iniciante:`<p><i data-info="alocacao">Allocation</i> is deciding the slices of the pie: how much in fixed income, how much in stocks, how much in dollars, how much in real estate. This decision weighs more on the final result than picking the right stock.</p>
 <h4>Three models for inspiration</h4>
 <ul>
   <li><b>Conservative:</b> 60% fixed income, 10% FIIs, 5% Brazilian stocks, 15% abroad, 10% cash.</li>
   <li><b>Moderate:</b> 35% fixed income, 15% FIIs, 15% Brazilian stocks, 30% abroad, 5% cash.</li>
   <li><b>Growth:</b> 15% fixed income, 10% FIIs, 22% Brazilian stocks, 45% abroad and crypto, 8% cash.</li>
 </ul>
 <p>These are starting points, not recipes. What defines yours is the horizon of your goals and how much you can watch the portfolio fall without selling.</p>
 <h4><i data-info="rebalanceamento">Rebalancing</i></h4>
 <p>Once a year, check the slices. If stocks became 40% when you wanted 25%, steer the next contributions to whatever got small. That makes you buy low and sell high automatically.</p>`,
 medio:`<p>Build by goal, not by product. Each goal has a horizon, and the horizon defines the acceptable risk:</p>
 <ul>
   <li>Emergency fund (always): Tesouro Selic or a daily-liquidity CDB.</li>
   <li>Goal in 2 to 4 years (car, home down payment): fixed income matched to the term.</li>
   <li>Goal in 5 to 10 years: a mix, with limited equities.</li>
   <li>Retirement: stocks, global ETFs, long IPCA+ and pension plans.</li>
 </ul>
 <h4>Rebalancing by band</h4>
 <p>Instead of a fixed date, use tolerance: rebalance when any class drifts more than 5 percentage points from target. It generates fewer trades, less tax, and captures extremes better.</p>
 <div class="callout"><b>In InvestifyONE:</b> the Outlook tab has the allocation simulator. Set the targets and it shows, in reais, how much is missing or in excess in each class — and how much of the next contribution should go where.</div>`,
 expert:`<p>Mean-variance optimisation is notoriously sensitive to estimation error, especially in expected returns. More robust alternatives: risk parity, constrained minimum variance, or Black-Litterman anchored on market equilibrium with explicit views and confidence levels.</p>
 <p>For the Brazilian investor, two structural exposures deserve deliberate treatment: human capital (income in reais, correlated with the domestic cycle) and geographic concentration. Both argue for an international allocation above Brazil’s weight in global GDP.</p>
 <p>Rebalancing generates a premium (rebalancing bonus) proportional to dispersion and low correlation between classes, net of tax and transaction costs. In taxable accounts, rebalance preferably through contribution flows and through asset location across vehicles with different tax regimes.</p>`}},

{id:"impostos", ic:"🧾", t:"Impostos sem sofrimento", te:"Taxes without pain", lead:"O que é isento, o que é tributado e o que você precisa guardar.", leade:"What is exempt, what is taxed and what you need to keep.",
 n:{
 iniciante:`
 <p>Um mapa rápido do que o Leão cobra:</p>
 <ul>
   <li><b>Ações à vista:</b> vendeu até R$ 20 mil no mês? Lucro isento. Acima disso, 15% sobre o ganho, pago por <i data-info="darf">DARF</i>.</li>
   <li><b>FIIs:</b> rendimento mensal isento; lucro na venda da cota paga 20%, sem isenção.</li>
   <li><b>ETFs:</b> 15% sobre o ganho, sem isenção.</li>
   <li><b>Renda fixa:</b> <i data-info="tabela-regressiva">tabela regressiva</i>, de 22,5% a 15%, retida na fonte — você não precisa fazer nada.</li>
   <li><b>LCI, LCA, debênture incentivada, poupança:</b> isentos de IR.</li>
   <li><b>Cripto:</b> vendas de até R$ 35 mil no mês são isentas; acima, 15% sobre o ganho.</li>
 </ul>
 <div class="callout"><b>O que fazer hoje:</b> crie uma pasta e guarde todas as notas de corretagem e informes de rendimento. Em março, isso faz diferença entre meia hora e um fim de semana perdido.</div>`,
 medio:`
 <p><b>Você é o responsável pela apuração</b> em ações, FIIs, ETFs e cripto. A corretora não recolhe por você — ela só retém o "dedo-duro" de 0,005%, que existe para a Receita cruzar as informações.</p>
 <h4>Fluxo mensal</h4>
 <ol>
   <li>Some as vendas do mês, por modalidade.</li>
   <li>Calcule o lucro contra o <i data-info="preco-medio">preço médio</i>.</li>
   <li>Abata prejuízos acumulados da mesma modalidade.</li>
   <li>Se sobrou lucro tributável, gere a DARF (código 6015) e pague até o último dia útil do mês seguinte.</li>
 </ol>
 <h4>Na declaração anual</h4>
 <p>Bens e Direitos vai pelo <b>custo de aquisição</b>, não pelo valor de mercado. Ativos no exterior entram convertidos pela cotação da data de cada compra. Dividendos isentos e JCP têm fichas próprias.</p>
 <div class="callout warn"><b>Prejuízo só compensa se declarado.</b> Mês que fechou no vermelho precisa ser registrado para abater lucro futuro — sem prazo de validade, mas sem registro não existe.</div>`,
 expert:`
 <p>Compensação de prejuízo é segregada por modalidade: comum, day trade, FII e exterior não se misturam. O controle mês a mês no Carnê-Leão/e-CAC é o que sustenta a compensação em eventual malha.</p>
 <p>Planejamento legítimo inclui: realizar prejuízo antes do fim do ano para compensar ganhos (tax-loss harvesting), respeitar o limite de R$ 20 mil por mês em ações, alocar ativos de alta rotatividade em veículos com diferimento, e usar previdência com tabela regressiva para renda de longuíssimo prazo.</p>
 <p>Para aplicações no exterior, a Lei 14.754/2023 instituiu apuração anual em ficha específica. A escolha entre transparência fiscal de entidades controladas e tributação no resgate exige projeção de fluxo — vale a conta com contador especializado quando os valores justificam.</p>`},
 en:{
 iniciante:`<p>A quick map of what the tax authority charges:</p>
 <ul>
   <li><b>Cash-market stocks:</b> sold up to R$ 20 thousand in the month? Profit exempt. Above that, 15% on the gain, paid by <i data-info="darf">DARF</i>.</li>
   <li><b>FIIs:</b> monthly income exempt; profit on selling the unit pays 20%, with no exemption.</li>
   <li><b>ETFs:</b> 15% on the gain, no exemption.</li>
   <li><b>Fixed income:</b> <i data-info="tabela-regressiva">regressive table</i>, from 22.5% to 15%, withheld at source — you do not need to do anything.</li>
   <li><b>LCI, LCA, incentivised debentures, savings account:</b> exempt from income tax.</li>
   <li><b>Crypto:</b> sales of up to R$ 35 thousand in the month are exempt; above that, 15% on the gain.</li>
 </ul>
 <div class="callout"><b>What to do today:</b> create a folder and keep every brokerage note and income statement. In March, that is the difference between half an hour and a lost weekend.</div>`,
 medio:`<p><b>You are responsible for the computation</b> in stocks, FIIs, ETFs and crypto. The broker does not collect it for you — it only withholds the 0.005% "informer" tax, which exists so the Receita can cross-check the information.</p>
 <h4>Monthly flow</h4>
 <ol>
   <li>Add up the month’s sales, by category.</li>
   <li>Compute the profit against the <i data-info="preco-medio">average cost</i>.</li>
   <li>Deduct accumulated losses from the same category.</li>
   <li>If taxable profit remains, generate the DARF (code 6015) and pay by the last business day of the following month.</li>
 </ol>
 <h4>On the annual return</h4>
 <p>Assets and Rights go in at <b>acquisition cost</b>, not market value. Assets abroad enter converted at the rate on the date of each purchase. Exempt dividends and JCP have their own schedules.</p>
 <div class="callout warn"><b>A loss only offsets if it is declared.</b> A month that closed in the red has to be recorded to offset future profit — with no expiry date, but with no record it does not exist.</div>`,
 expert:`<p>Loss offsetting is segregated by category: regular, day trade, FII and abroad do not mix. Month-by-month control in Carnê-Leão/e-CAC is what sustains the offset in an eventual audit.</p>
 <p>Legitimate planning includes: realising losses before year-end to offset gains (tax-loss harvesting), respecting the R$ 20 thousand monthly limit in stocks, placing high-turnover assets in vehicles with deferral, and using pension plans with the regressive table for very-long-term income.</p>
 <p>For investments abroad, Law 14,754/2023 established yearly computation on a specific schedule. The choice between tax transparency of controlled entities and taxation on withdrawal requires a cash-flow projection — worth doing the maths with a specialised accountant when the amounts justify it.</p>`}},

{id:"comportamento", ic:"🧠", t:"O jogo mental", te:"The mental game", lead:"Onde a maior parte do dinheiro é perdida: não na escolha, no comportamento.", leade:"Where most money is lost: not in the choice, in the behaviour.",
 n:{
 iniciante:`
 <p>A maior parte dos prejuízos não vem de escolher o investimento errado. Vem de comprar depois que subiu muito e vender depois que caiu muito.</p>
 <h4>Os quatro erros mais caros</h4>
 <ul>
   <li><b>Entrar na euforia:</b> comprar porque todo mundo está ganhando. Quando a notícia chegou até você, a alta já aconteceu.</li>
   <li><b>Vender no pânico:</b> transformar queda temporária em prejuízo definitivo.</li>
   <li><b>Mexer demais:</b> cada troca tem custo e imposto. Carteira não é jardim que precisa de poda semanal.</li>
   <li><b>Buscar o "melhor" investimento:</b> gastar meses pesquisando em vez de começar com o suficientemente bom.</li>
 </ul>
 <div class="callout"><b>Antídoto simples:</b> escreva sua regra de aporte — quanto, quando e em quê — e siga mesmo quando a manchete disser o contrário. Regra escrita vence emoção do dia.</div>`,
 medio:`
 <p>Alguns vieses já identificados e nomeados, que atacam todo mundo:</p>
 <ul>
   <li><i data-info="aversao-perda">Aversão à perda</i>: perder dói cerca de duas vezes mais do que ganhar alegra. Resultado: você segura o prejuízo esperando "voltar ao que pagou" e realiza lucro cedo demais.</li>
   <li><i data-info="vies-confirmacao">Viés de confirmação</i>: depois de comprar, você só lê o que concorda com você.</li>
   <li><b>Ancoragem:</b> o preço que você pagou vira referência emocional, embora o mercado não saiba nem se importe com ele.</li>
   <li><b>Excesso de confiança:</b> acertar duas vezes seguidas parece habilidade e costuma ser sorte.</li>
 </ul>
 <h4>Defesas práticas</h4>
 <p>Aporte automático no mesmo dia do mês. Revisão da carteira em datas marcadas, não quando bate a ansiedade. Um diário curto com o motivo de cada compra — reler seis meses depois é o teste mais honesto que existe.</p>`,
 expert:`
 <p>O gap comportamental — diferença entre o retorno do fundo e o retorno do cotista médio — é documentado em ordem de 1 a 2 p.p. ao ano em vários mercados, atribuído a fluxo pró-cíclico. É uma perda maior que a de boa parte das taxas que se discute.</p>
 <p>Prospect theory explica a assimetria: função de valor côncava em ganhos, convexa em perdas, com ponto de referência móvel. O efeito disposição decorre diretamente disso.</p>
 <p>Mitigação estrutural funciona melhor que força de vontade: automatizar aportes, definir política de investimento por escrito (IPS) com bandas de rebalanceamento, e reduzir a frequência de checagem — a utilidade percebida cai com o monitoramento frequente de ativos voláteis (myopic loss aversion).</p>`},
 en:{
 iniciante:`<p>Most losses do not come from choosing the wrong investment. They come from buying after it rose a lot and selling after it fell a lot.</p>
 <h4>The four most expensive mistakes</h4>
 <ul>
   <li><b>Joining the euphoria:</b> buying because everyone is winning. By the time the news reached you, the rise already happened.</li>
   <li><b>Selling in a panic:</b> turning a temporary drop into a permanent loss.</li>
   <li><b>Fiddling too much:</b> every switch has a cost and a tax. A portfolio is not a garden that needs weekly pruning.</li>
   <li><b>Hunting for the "best" investment:</b> spending months researching instead of starting with good enough.</li>
 </ul>
 <div class="callout"><b>Simple antidote:</b> write down your contribution rule — how much, when and into what — and follow it even when the headline says otherwise. A written rule beats the emotion of the day.</div>`,
 medio:`<p>Some biases already identified and named, which attack everyone:</p>
 <ul>
   <li><i data-info="aversao-perda">Loss aversion</i>: losing hurts about twice as much as winning pleases. Result: you hold the loss waiting to "get back to what you paid" and take profits too early.</li>
   <li><i data-info="vies-confirmacao">Confirmation bias</i>: after buying, you only read what agrees with you.</li>
   <li><b>Anchoring:</b> the price you paid becomes an emotional reference, although the market neither knows nor cares about it.</li>
   <li><b>Overconfidence:</b> getting it right twice in a row feels like skill and is usually luck.</li>
 </ul>
 <h4>Practical defences</h4>
 <p>Automatic contribution on the same day of the month. Portfolio review on set dates, not when anxiety strikes. A short journal with the reason for each purchase — rereading it six months later is the most honest test there is.</p>`,
 expert:`<p>The behaviour gap — the difference between a fund’s return and the average unitholder’s return — is documented at around 1 to 2 p.p. a year across several markets, attributed to pro-cyclical flows. It is a bigger loss than most of the fees people argue about.</p>
 <p>Prospect theory explains the asymmetry: a value function concave in gains, convex in losses, with a moving reference point. The disposition effect follows directly from it.</p>
 <p>Structural mitigation works better than willpower: automate contributions, set a written investment policy (IPS) with rebalancing bands, and reduce checking frequency — perceived utility falls with frequent monitoring of volatile assets (myopic loss aversion).</p>`}},

{id:"perfil", ic:"🧭", t:"Seu perfil de investidor", te:"Your investor profile", lead:"Quanto risco combina com você — e por que a resposta tem duas metades.", leade:"How much risk suits you — and why the answer has two halves.",
 n:{
 iniciante:`
 <p>Toda corretora pergunta, antes de você investir, se o seu perfil é <b>conservador</b>, <b>moderado</b>, <b>arrojado</b> ou <b>agressivo</b>. Parece burocracia, e na maioria das vezes é tratada como tal. Mas a pergunta por trás é a mais importante de todas: <i>quanto de risco cabe na sua vida?</i></p>
 <h4>Os quatro perfis, em uma frase cada</h4>
 <ul>
   <li><b>Conservador</b> — preservar o que já tem vale mais do que crescer rápido. Quedas de até 5% nos piores momentos.</li>
   <li><b>Moderado</b> — aceita balanço em troca de render acima da renda fixa. Quedas de 10% a 15% em crises.</li>
   <li><b>Arrojado</b> — prioriza crescimento e aguenta anos ruins pelo caminho. Quedas de 20% a 30%.</li>
   <li><b>Agressivo</b> — busca o retorno máximo e convive com perdas grandes. Quedas de 40% ou mais fazem parte.</li>
 </ul>
 <h4>O detalhe que quase ninguém conta</h4>
 <p>O perfil tem duas metades, e elas podem discordar:</p>
 <ul>
   <li>A <i data-info="capacidade-risco">capacidade</i> é o que a sua situação permite: prazo, reserva de emergência, estabilidade da renda, chance de precisar sacar.</li>
   <li>A <i data-info="tolerancia-risco">tolerância</i> é o que você aguenta ver: se a carteira cair 20% em um mês, você vende ou dorme tranquilo?</li>
 </ul>
 <p>Quando as duas discordam, <b>vale a menor</b>. Coragem não paga conta no mês seguinte, e uma carteira que faz você vender no pior dia não serve por mais bem montada que esteja.</p>
 <div class="callout"><b>Faça o teste no app:</b> abra o <b>Painel</b> e clique em <i>Descobrir meu perfil</i>. São dez perguntas e leva dois minutos. Nada sai do seu aparelho.</div>`,
 medio:`
 <p>O questionário oficial se chama <i data-info="suitability">suitability</i> e é exigido pela CVM. Ele existe para impedir que te vendam um produto arriscado demais — não para te dizer o que fazer. Use-o como diagnóstico próprio.</p>
 <h4>Por que responder honestamente é difícil</h4>
 <p>Em mercado de alta, quase todo mundo se declara arrojado. A tolerância declarada é sempre maior que a revelada: o que importa não é o que você diz que faria numa queda de 30%, é o que você <b>já fez</b> numa. Se nunca passou por uma, considere um perfil mais conservador que o resultado — você ainda não tem dado sobre si mesmo.</p>
 <h4>O perfil não é permanente</h4>
 <p>Ele muda quando muda a vida: a reserva ficou pronta, o emprego ficou estável, o prazo encurtou porque a meta chegou perto. Refaça o teste a cada um ou dois anos, e sempre depois de uma mudança grande — casamento, filho, troca de emprego, herança, aposentadoria à vista.</p>
 <h4>Perfil x carteira: o que o app compara</h4>
 <p>O InvestifyONE dá uma nota de risco de 0 a 100 para cada tipo de ativo (caixa 5, renda fixa 15, previdência 32, FII 55, ETF 60, ação 75, cripto 100) e faz a média ponderada pelo valor que você tem em cada um. Essa nota vira um perfil — e ele compara com o seu. Quando a carteira está mais arriscada que o perfil, aparece um aviso no painel. Não é erro automático: é um convite a decidir de propósito, em vez de por acidente.</p>`,
 expert:`
 <h4>Os três eixos (e o que o app usa)</h4>
 <p>A literatura de planejamento financeiro separa <b>capacidade</b> (objetiva), <b>tolerância</b> (comportamental) e <b>necessidade</b> de risco — esta última quase sempre ignorada. Se a meta já é atingível com juro real de renda fixa, correr risco adicional é assimetria negativa: você arrisca não bater uma meta que já estava garantida. O app modela capacidade e tolerância e toma o mínimo; a necessidade fica na aba Prognóstico, comparando a projeção com as metas.</p>
 <h4>Capital humano</h4>
 <p>Renda estável e pouco correlacionada com o mercado funciona como uma posição implícita em renda fixa, e aumenta a capacidade de risco do portfólio financeiro. Quem trabalha em setor cíclico, tem renda variável ou concentra patrimônio em ações da própria empresa está duplamente exposto — a carteira precisa compensar isso, não repetir.</p>
 <h4>Limites do modelo de pontos</h4>
 <p>Questionários somam pontos e assumem independência entre respostas, o que não se sustenta: prazo e liquidez são correlacionados, e experiência declarada é proxy fraca de comportamento. Métricas melhores existem — aversão relativa implícita, bandas de certainty equivalent, análise do drawdown efetivamente suportado no histórico — mas exigem dados que o app não tem. O uso correto do resultado é como piso de sanidade, não como otimizador.</p>`},
 en:{
 iniciante:`<p>Every broker asks, before you invest, whether your profile is <b>conservative</b>, <b>moderate</b>, <b>growth</b> or <b>aggressive</b>. It looks like paperwork, and most of the time it is treated as such. But the question behind it is the most important of all: <i>how much risk fits in your life?</i></p>
 <h4>The four profiles, one sentence each</h4>
 <ul>
   <li><b>Conservative</b> — preserving what you have is worth more than growing fast. Drops of up to 5% in the worst moments.</li>
   <li><b>Moderate</b> — accepts swings in exchange for beating fixed income. Drops of 10% to 15% in crises.</li>
   <li><b>Growth</b> — prioritises growth and can take bad years along the way. Drops of 20% to 30%.</li>
   <li><b>Aggressive</b> — seeks maximum return and lives with large losses. Drops of 40% or more are part of it.</li>
 </ul>
 <h4>The detail almost nobody tells you</h4>
 <p>The profile has two halves, and they can disagree:</p>
 <ul>
   <li><i data-info="capacidade-risco">Capacity</i> is what your situation allows: horizon, emergency fund, income stability, chance of needing to withdraw.</li>
   <li><i data-info="tolerancia-risco">Tolerance</i> is what you can stand to watch: if the portfolio drops 20% in a month, do you sell or sleep soundly?</li>
 </ul>
 <p>When the two disagree, <b>the lower one wins</b>. Courage does not pay next month’s bills, and a portfolio that makes you sell on the worst day is no good however well built it is.</p>
 <div class="callout"><b>Take the test in the app:</b> open the <b>Dashboard</b> and click <i>Find my profile</i>. It is ten questions and takes two minutes. Nothing leaves your device.</div>`,
 medio:`<p>The official questionnaire is called <i data-info="suitability">suitability</i> and is required by the CVM. It exists to stop you being sold a product that is too risky — not to tell you what to do. Use it as your own diagnosis.</p>
 <h4>Why answering honestly is hard</h4>
 <p>In a rising market, almost everyone declares themselves growth-oriented. Declared tolerance is always higher than revealed tolerance: what matters is not what you say you would do in a 30% drop, it is what you <b>already did</b> in one. If you have never been through one, consider a more conservative profile than the result — you have no data on yourself yet.</p>
 <h4>The profile is not permanent</h4>
 <p>It changes when life changes: the emergency fund got done, the job became stable, the horizon shortened because the goal got close. Redo the test every year or two, and always after a big change — marriage, a child, a job change, an inheritance, retirement in sight.</p>
 <h4>Profile vs portfolio: what the app compares</h4>
 <p>InvestifyONE gives a risk score from 0 to 100 to each asset type (cash 5, fixed income 15, pension 32, FII 55, ETF 60, stock 75, crypto 100) and takes the average weighted by how much you hold in each. That score becomes a profile — and it is compared with yours. When the portfolio is riskier than the profile, a warning appears on the dashboard. It is not an automatic error: it is an invitation to decide on purpose rather than by accident.</p>`,
 expert:`<h4>The three axes (and what the app uses)</h4>
 <p>The financial-planning literature separates risk <b>capacity</b> (objective), <b>tolerance</b> (behavioural) and <b>need</b> — the last one almost always ignored. If the goal is already reachable with the real yield of fixed income, taking extra risk is negative asymmetry: you risk missing a goal that was already secured. The app models capacity and tolerance and takes the minimum; the need sits in the Outlook tab, comparing the projection with the goals.</p>
 <h4>Human capital</h4>
 <p>Stable income with low correlation to the market works as an implicit fixed-income position, and raises the risk capacity of the financial portfolio. Whoever works in a cyclical sector, has variable income or concentrates wealth in their own employer’s shares is doubly exposed — the portfolio has to compensate for that, not repeat it.</p>
 <h4>Limits of the points model</h4>
 <p>Questionnaires add up points and assume independence between answers, which does not hold: horizon and liquidity are correlated, and declared experience is a weak proxy for behaviour. Better metrics exist — implied relative risk aversion, certainty-equivalent bands, analysis of the drawdown actually endured in the past — but they require data the app does not have. The correct use of the result is as a sanity floor, not as an optimiser.</p>`}},

{id:"movimentacoes", ic:"🧾", t:"Movimentações e rentabilidade de verdade", te:"Transactions and real return", lead:"Por que registrar aportes, vendas e dividendos muda tudo no cálculo.", leade:"Why recording contributions, sales and dividends changes everything in the calculation.",
 n:{
 iniciante:`
 <p>Enquanto o app só sabe <i>quanto</i> você tem de cada ativo e por <i data-info="preco-medio">quanto pagou em média</i>, ele consegue mostrar lucro — mas não consegue mostrar <b>rentabilidade de verdade</b>. A diferença importa mais do que parece.</p>
 <h4>Um exemplo</h4>
 <p>Você tinha R$ 10.000 e no fim do ano tem R$ 15.000. Rendeu 50%? Só se você não colocou mais nada. Se aportou R$ 4.000 em julho, o rendimento foi de cerca de R$ 1.000 sobre um capital que variou no tempo — coisa de 8%, não 50%.</p>
 <p>A aba <b>Movimentações</b> guarda cada evento com data e valor: aporte, compra, venda, resgate, dividendo, juro, taxa e imposto. Com essas datas o app consegue calcular quanto o seu dinheiro realmente rendeu.</p>
 <h4>Os tipos de lançamento</h4>
 <ul>
   <li><b>Aporte e resgate</b> — dinheiro entrando ou saindo da instituição.</li>
   <li><b>Compra e venda</b> — troca de dinheiro por ativo dentro da mesma conta.</li>
   <li><b>Aplicação e resgate de fundo</b> — para fundos e previdência, onde se lança valor, não cotas.</li>
   <li><b>Provento e juros</b> — dividendos, rendimentos de FII, juros de conta remunerada.</li>
   <li><b>Taxa e imposto</b> — tudo que sai da sua rentabilidade sem ser perda de mercado.</li>
 </ul>
 <div class="callout"><b>Não precisa reconstruir o passado inteiro.</b> O app já criou um lançamento de saldo inicial para cada ativo que você cadastrou. A partir de hoje, registre o que acontecer — em alguns meses o histórico fica útil sozinho.</div>`,
 medio:`
 <h4>Duas formas de medir retorno</h4>
 <ul>
   <li><b>TWR</b> (retorno ponderado pelo tempo): mede a qualidade da estratégia, ignorando quando você aportou. É o número que fundos divulgam, e o único justo para comparar com CDI, Ibovespa ou S&amp;P 500.</li>
   <li><b>XIRR</b> ou MWR (ponderado pelo dinheiro): mede o retorno do <i>seu bolso</i>, levando em conta o tamanho e a data de cada aporte. É o número que responde "quanto eu realmente ganhei".</li>
 </ul>
 <p>Os dois são úteis e quase nunca são iguais. Quando o XIRR fica bem abaixo do TWR, é sinal de que você aportou nos momentos errados — comprando depois da alta, parando de aportar nas quedas.</p>
 <h4>Custos aparecem aqui</h4>
 <p>Taxa de administração de fundo e previdência não vem em extrato como "taxa": ela já está descontada da cota. Por isso, o valor que você vê é líquido dela. Já corretagem, custódia, spread de câmbio, IOF e IR aparecem — e valem ser lançados. Somar os custos do ano costuma ser o exercício mais revelador da carteira inteira.</p>`,
 expert:`
 <h4>Mecânica do cálculo</h4>
 <p>TWR encadeia sub-períodos delimitados por cada fluxo: <code>Π(1 + (V_fim − F) / V_ini) − 1</code>. Com preços diários registrados, o encadeamento é diário e a distorção some. MWR resolve <code>Σ CF_i / (1+r)^(d_i/365) = 0</code> por Newton-Raphson, com bisseção de fallback quando há troca de sinal múltipla — carteiras com resgates grandes podem ter mais de uma raiz.</p>
 <h4>Preço médio e apuração</h4>
 <p>O app reconstrói quantidade e custo por média ponderada móvel, que é o critério aceito pela Receita para ações. Atenção: para ativos no exterior, o custo de aquisição é convertido pela cotação do dia da compra e o ganho apurado em reais, então o mesmo lote tem preço médio diferente em dólar e em reais. Os dois números são necessários: um para decisão, outro para o IR.</p>
 <h4>Deduplicação na importação</h4>
 <p>A chave usada é data + tipo + ticker + instituição + quantidade + valor. Ela evita reimportar o mesmo extrato, mas não distingue duas operações idênticas no mesmo dia — caso real em execuções parciais. Nesses casos o app importa uma e avisa; conferir pela quantidade total é mais seguro que pelo número de linhas.</p>`},
 en:{
 iniciante:`<p>As long as the app only knows <i>how much</i> you hold of each asset and at <i data-info="preco-medio">what average price</i>, it can show profit — but it cannot show <b>real return</b>. The difference matters more than it seems.</p>
 <h4>An example</h4>
 <p>You had R$ 10,000 and at year-end you have R$ 15,000. Did it earn 50%? Only if you added nothing. If you contributed R$ 4,000 in July, the earnings were about R$ 1,000 on capital that varied over time — something like 8%, not 50%.</p>
 <p>The <b>Transactions</b> tab keeps every event with date and amount: contribution, purchase, sale, withdrawal, dividend, interest, fee and tax. With those dates the app can compute how much your money really earned.</p>
 <h4>The entry types</h4>
 <ul>
   <li><b>Contribution and withdrawal</b> — money entering or leaving the institution.</li>
   <li><b>Purchase and sale</b> — swapping money for an asset within the same account.</li>
   <li><b>Fund investment and redemption</b> — for funds and pension plans, where you enter an amount, not units.</li>
   <li><b>Income and interest</b> — dividends, FII payouts, interest from an interest-bearing account.</li>
   <li><b>Fee and tax</b> — everything that leaves your return without being a market loss.</li>
 </ul>
 <div class="callout"><b>No need to rebuild the whole past.</b> The app already created an opening-balance entry for each asset you registered. From today on, record what happens — in a few months the history becomes useful on its own.</div>`,
 medio:`<h4>Two ways to measure return</h4>
 <ul>
   <li><b>TWR</b> (time-weighted return): measures the quality of the strategy, ignoring when you contributed. It is the number funds publish, and the only fair one to compare with the CDI, Ibovespa or S&amp;P 500.</li>
   <li><b>XIRR</b> or MWR (money-weighted): measures the return in <i>your pocket</i>, taking into account the size and date of each contribution. It is the number that answers "how much did I really earn".</li>
 </ul>
 <p>Both are useful and they are almost never equal. When XIRR sits well below TWR, it is a sign you contributed at the wrong moments — buying after the rise, stopping contributions in the drops.</p>
 <h4>Costs show up here</h4>
 <p>Fund and pension management fees do not appear on the statement as "fee": they are already deducted from the unit value. That is why the value you see is net of them. Brokerage, custody, FX spread, IOF and income tax do appear — and are worth recording. Adding up the year’s costs is usually the most revealing exercise in the whole portfolio.</p>`,
 expert:`<h4>Calculation mechanics</h4>
 <p>TWR chains sub-periods delimited by each flow: <code>Π(1 + (V_end − F) / V_start) − 1</code>. With daily prices recorded, the chaining is daily and the distortion vanishes. MWR solves <code>Σ CF_i / (1+r)^(d_i/365) = 0</code> by Newton-Raphson, with bisection as a fallback when there are multiple sign changes — portfolios with large withdrawals can have more than one root.</p>
 <h4>Average cost and computation</h4>
 <p>The app rebuilds quantity and cost by moving weighted average, which is the criterion the Receita accepts for stocks. Note: for assets abroad, the acquisition cost is converted at the rate on the purchase date and the gain is computed in reais, so the same lot has a different average cost in dollars and in reais. Both numbers are needed: one for decisions, the other for income tax.</p>
 <h4>Deduplication on import</h4>
 <p>The key used is date + type + ticker + institution + quantity + amount. It prevents re-importing the same statement, but does not distinguish two identical operations on the same day — a real case in partial fills. In those cases the app imports one and warns; checking by total quantity is safer than by number of lines.</p>`}},

{id:"usar-app", ic:"🧭", t:"Como usar o InvestifyONE", te:"How to use InvestifyONE", lead:"Tour rápido pelas abas e pelo que cada número significa.", leade:"A quick tour of the tabs and of what each number means.",
 n:{
 iniciante:`
 <h4>1. Cadastre o que você tem</h4>
 <p>Na aba <b>Carteira</b>, clique em <b>Novo investimento</b>. Comece a digitar o nome ou o código (PETR4, AAPL, Bitcoin, CDB…) e escolha da lista de sugestões — o tipo é preenchido sozinho. Informe quantidade e preço médio; para renda fixa, fundos e previdência, informe o valor aplicado.</p>
 <h4>2. Veja o painel</h4>
 <p>A aba <b>Painel</b> soma tudo, mostra o resultado do dia, o lucro acumulado e como o dinheiro está dividido por tipo, por país e por moeda.</p>
 <h4>3. Atualize as cotações</h4>
 <p>O botão <b>⟳ Atualizar</b>, no topo, busca os preços nas fontes públicas. Ao lado dele fica a data e a hora da última atualização. O app também atualiza sozinho de tempos em tempos com a aba aberta.</p>
 <h4>4. Aprenda no caminho</h4>
 <p>Os ícones <span class="info-dot" style="pointer-events:none">i</span> espalhados pelo app abrem uma explicação curta do termo, no nível que você escolheu no menu.</p>
 <div class="callout"><b>Seus dados são seus:</b> tudo fica salvo no seu navegador. Em <b>Configurações</b>, exporte um arquivo de backup de vez em quando — e, se quiser, ligue a sincronização com o Google Drive.</div>`,
 medio:`
 <h4>Preços automáticos e manuais</h4>
 <p>Ações brasileiras, ETFs, FIIs, ações americanas, cripto e moedas buscam preço sozinhos. Fundos e previdência não têm fonte pública: você atualiza o valor pelo botão <b>Atualizar valor</b> na linha do ativo, com a data registrada. Renda fixa é estimada pelo app com CDI e IPCA do Banco Central.</p>
 <h4>Etiquetas das linhas</h4>
 <ul>
   <li><span class="badge live">auto</span> preço buscado na fonte pública.</li>
   <li><span class="badge est">estimado</span> calculado pelo app a partir da taxa e do tempo.</li>
   <li><span class="badge man">manual</span> valor que você informou.</li>
 </ul>
 <h4>Chaves de API</h4>
 <p>Em Configurações você pode colar duas chaves gratuitas: <b>brapi</b> (libera FIIs, ETFs e BDRs brasileiros) e <b>Twelve Data</b> (libera ações e ETFs dos EUA). O passo a passo está lá. Sem elas, o app segue funcionando com o que é aberto.</p>`,
 expert:`
 <h4>Arquitetura</h4>
 <p>Aplicação estática, sem servidor. Os dados vivem em localStorage, com espelho em cookie (limitado a 4 KB, só as posições) e sincronização opcional com o Google Drive via <code>drive.appdata</code> — um escopo que dá acesso exclusivamente à pasta privada do próprio app, invisível para outros aplicativos e para o seu Drive normal.</p>
 <h4>Fontes</h4>
 <p>AwesomeAPI (câmbio), CoinGecko (cripto), brapi (B3), Twelve Data com alternativas Finnhub e Alpha Vantage (EUA) e a API de séries do Banco Central (Selic, CDI, IPCA). Cotações são cacheadas por padrão de 10 minutos para poupar cota das APIs; o botão Atualizar força a busca.</p>
 <h4>Limitações conhecidas</h4>
 <p>Sem histórico de cotações (a projeção usa taxa paramétrica, não Monte Carlo com séries reais), e sem apuração automática de IR. O valor de renda fixa é estimativa pro rata, sem marcação a mercado nem dedução de IR.</p>`},
 en:{
 iniciante:`<h4>1. Register what you have</h4>
 <p>In the <b>Portfolio</b> tab, click <b>New investment</b>. Start typing the name or the code (PETR4, AAPL, Bitcoin, CDB…) and pick from the suggestion list — the type fills itself in. Enter quantity and average price; for fixed income, funds and pension plans, enter the amount invested.</p>
 <h4>2. Look at the dashboard</h4>
 <p>The <b>Dashboard</b> tab adds everything up, shows the day’s result, the accumulated profit and how the money is split by type, by country and by currency.</p>
 <h4>3. Refresh the quotes</h4>
 <p>The <b>⟳ Refresh</b> button at the top fetches prices from public sources. Next to it is the date and time of the last update. The app also refreshes on its own from time to time while the tab is open.</p>
 <h4>4. Learn along the way</h4>
 <p>The <span class="info-dot" style="pointer-events:none">i</span> icons scattered around the app open a short explanation of the term, at the level you chose in the menu.</p>
 <div class="callout"><b>Your data is yours:</b> everything is saved in your browser. In <b>Settings</b>, export a backup file now and then — and, if you want, turn on sync with Google Drive.</div>`,
 medio:`<h4>Automatic and manual prices</h4>
 <p>Brazilian stocks, ETFs, FIIs, US stocks, crypto and currencies fetch prices on their own. Funds and pension plans have no public source: you update the value through the <b>Update value</b> button on the asset’s row, with the date recorded. Fixed income is estimated by the app using the CDI and IPCA from the Central Bank.</p>
 <h4>Row labels</h4>
 <ul>
   <li><span class="badge live">auto</span> price fetched from a public source.</li>
   <li><span class="badge est">estimated</span> computed by the app from the rate and the time elapsed.</li>
   <li><span class="badge man">manual</span> a value you entered.</li>
 </ul>
 <h4>API keys</h4>
 <p>In Settings you can paste two free keys: <b>brapi</b> (unlocks Brazilian FIIs, ETFs and BDRs) and <b>Twelve Data</b> (unlocks US stocks and ETFs). The step-by-step is there. Without them, the app keeps working with what is open.</p>`,
 expert:`<h4>Architecture</h4>
 <p>A static application, with no server. Data lives in localStorage, with a cookie mirror (limited to 4 KB, positions only) and optional sync with Google Drive through <code>drive.appdata</code> — a scope that grants access exclusively to the app’s own private folder, invisible to other apps and to your regular Drive.</p>
 <h4>Sources</h4>
 <p>AwesomeAPI (exchange rates), CoinGecko (crypto), brapi (B3), Twelve Data with Finnhub and Alpha Vantage as alternatives (US) and the Central Bank’s series API (Selic, CDI, IPCA). Quotes are cached for 10 minutes by default to save API quota; the Refresh button forces a fetch.</p>
 <h4>Known limitations</h4>
 <p>No quote history (the projection uses a parametric rate, not Monte Carlo with real series) and no automatic income-tax computation. The fixed-income value is a pro rata estimate, with no mark-to-market and no tax deduction.</p>`}}
];
