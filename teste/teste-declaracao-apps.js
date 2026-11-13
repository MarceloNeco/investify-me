/* =====================================================================
   teste/teste-declaracao-apps.js — 3.70: a declaração do IR preenche o InvestifyONE e o BudgetONE (pedido do dono).
   Texto FICTÍCIO no formato do PdfTexto {linhas:true}: 9 bens variados (um vendido, uma conta do cônjuge, um que já
   existe na carteira, um consórcio com 8 linhas de discriminação, um apartamento com endereço depois da localização),
   2 dependentes, 1 fonte e 2 pagamentos que parecem conta fixa. Uso: node teste/teste-declaracao-apps.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TEXTO = [
  'DECLARACAO DE AJUSTE ANUAL', 'EXERCICIO 2026 ANO-CALENDARIO 2025', 'NOME: FULANO EXEMPLO',
  'DEPENDENTES', '21 BELTRANO EXEMPLO 01/02/2015 000.000.001-91', '21 SICRANA EXEMPLO 03/04/2018 000.000.002-72',
  'RENDIMENTOS TRIBUTAVEIS RECEBIDOS DE PESSOA JURIDICA PELO TITULAR',
  'EMPRESA EXEMPLO LTDA 120.000,00 13.000,00 20.000,00 10.000,00 1.500,00', 'CNPJ/CPF: 00.000.000/0001-91',
  'TOTAL 120.000,00 13.000,00 20.000,00 10.000,00 1.500,00',
  'PAGAMENTOS EFETUADOS', 'Titular',
  '01 ESCOLA EXEMPLO LTDA 00.000.000/0002-72 24.000,00 0,00',
  '26 PLANO SAUDE EXEMPLO SA 00.000.000/0003-53 12.000,00 0,00',
  'TOTAL 36.000,00 0,00',
  'DECLARACAO DE BENS E DIREITOS', 'GRUPO CODIGO DISCRIMINACAO SITUACAO EM', '31/12/2024 31/12/2025',
  '03 01 AVENUE GOOG - ALPHABET INC - CLASS C - QTDE 26 10.000,00 13.000,00', '249 - Estados Unidos da America',
  '03 01 AVENUE MSFT - MICROSOFT CORP - QTD 300,00 400,00', 'E 0,14', '249 - Estados Unidos da America',
  '07 99 AVENUE ETF (ETF TFLO) - ISHARES TREASURY FLOATING RATE BOND ETF - QTDE 10 0,00 2.500,00', '249 - Estados Unidos da America',
  '07 01 FUNDO EXEMPLO RENDA FIXA REFERENCIADO DI 40.000,00 50.000,00', '105 - Brasil', 'CNPJ: 00.000.000/0004-34',
  '06 01 CONTA CORRENTE CONJUGE BANCO EXEMPLO AG 0001 CC 12345-6 2.000,00 3.000,00', '105 - Brasil',
  '04 01 POUPANCA BANCO EXEMPLO AG 0001 7.000,00 8.000,00', '105 - Brasil',
  '99 05 CONSORCIO VEICULO SEGURADORA EXEMPLO - GRUPO AB123 15.000,00 20.000,00',
  '/ COTA 111 / CONTRATO 999999', '/ PARCELAS PAGAS 30 DE 72', '/ INICIO 10-JAN-2023 FIM JAN-2029',
  '/ SALDO DEVEDOR: 2023 R$ 40.000,00', '/ 2024 R$ 35.000,00', '/ 2025 R$ 30.000,00',
  '- VALOR ATUAL CREDITO R$ 50.000,00', '105 - Brasil',
  '01 11 APARTAMENTO EXEMPLO QUITADO VIA CONSORCIO 200.000,00 200.000,00', '105 - Brasil',
  'RUA EXEMPLO 123 APTO 45', 'IPTU 000.000.000-0 MATRICULA 99999',
  '03 01 AVENUE AAPL - APPLE INC - QTDE 5 5.000,00 0,00', '249 - Estados Unidos da America',
  '02 01 JEEP RENEGADE 1.8 PCD 2019-2019, PLACA AAA0A00 40.000,00 35.000,00', '105 - Brasil',
  '01 12 AP PLANTA R$ 1.291.315 CONSTRUTORA EXEMPLO 100.000,00 150.000,00', '105 - Brasil',
  '99 06 PREVIDENCIA VGBL SEGURADORA EXEMPLO - CERTIFICADO 123 10.000,00 12.000,00', '105 - Brasil',
  '99 06 OUTROS BENS E DIREITOS (99.06) - CONTA 456 - CERTIFICADO 789 1.000,00 1.100,00', '105 - Brasil',
  'TOTAL 279.300,00 296.900,00',
  'DIVIDAS E ONUS REAIS', 'Sem Informacoes',
  'RESUMO', 'RENDIMENTOS TRIBUTAVEIS', 'Recebidos de Pessoa Juridica pelo titular 120.000,00', 'TOTAL 120.000,00',
  'IMPOSTO DEVIDO', 'Total do imposto devido 18.000,00', 'Imposto retido na fonte do titular 20.000,00', 'IMPOSTO A RESTITUIR 2.000,00'
].join('\n');
const LOCAL = { v: 1, config: { fitaLigada: false }, gastos: [], recorrentes: [],
  posicoes: [{ id: 'pos1', ticker: 'GOOG', nome: 'Alphabet', tipo: 'acao-us', inst: 'AVENUE', qtd: 20, pm: 100, moeda: 'USD' }],
  pessoas: [{ id: 'pA', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', sobrenome: 'Exemplo' }, { id: 'pB', tipo: 'casa', papel: 'responsavel', nome: 'Ciclana', sobrenome: 'Exemplo' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.DeclEscolhas && window.ImportarPosicoes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Mercado.cambio.USD = { p: 5, var: 0 }; abrirApp('tax'); irPara('t-declaracoes'); render(); });

    console.log('1) a leitura');
    const d = await p.evaluate((t) => Tax.lerDeclaracao(t), TEXTO);
    const cons = d.itensBens.find((x) => x.grupo === '99');
    ok(d.itensBens.length === 13, '13 bens lidos');
    ok(/SALDO DEVEDOR: 2023 R\$ 40\.000,00 \/ 2024 R\$ 35\.000,00 \/ 2025 R\$ 30\.000,00 - VALOR ATUAL CREDITO R\$ 50\.000,00$/.test(cons.desc) && cons.local === 'Brasil', 'a discriminação de 8 linhas veio inteira (até o valor do crédito): …' + cons.desc.slice(-90));
    const ap = d.itensBens.find((x) => x.grupo === '01');
    ok(!/RUA|IPTU|MATRICULA/.test(ap.desc), 'o endereço, o IPTU e a matrícula depois da localização não entram');
    ok(d.dependentesNomes.join() === 'Beltrano,Sicrana' && d.fontes.length === 1, '2 dependentes e 1 fonte');

    console.log('2) a tela de importação');
    await p.evaluate((dd) => abrirDeclaracao(dd, true), d); await p.waitForTimeout(200);
    const t = await p.evaluate(() => {
      const ps = DeclEscolhas.posicoes(txDec).lista.map((x) => ({ t: x.item.ticker, tipo: x.item.tipo, q: x.item.qtd, pm: x.item.pm, moeda: x.item.moeda, m: x.marcado, ja: x.jaExiste, dono: x.dono, val: x.bem.depois }));
      const rows = [...document.querySelectorAll('.dec-pos li')].map((tr) => ({ ck: tr.querySelector('.de-pos').checked, txt: tr.textContent, dono: tr.querySelector('.de-pos-dono').value }));
      return { ps, rows, pos: document.getElementById('dePos') && document.getElementById('dePos').checked, base: (document.querySelector('.dec-base') || {}).textContent, deps: (document.getElementById('deDeps') || {}).checked,
        fontes: [...document.querySelectorAll('.de-fonte')].map((c) => c.checked), comps: [...document.querySelectorAll('.de-comp')].map((c) => c.checked), conferir: (document.querySelector('.dec-esc') || {}).textContent };
    });
    const by = (tk) => t.ps.find((x) => x.t === tk) || {};
    ok(by('GOOG').tipo === 'acao-us' && by('GOOG').q === 26 && by('GOOG').ja && !by('GOOG').m, 'GOOG: ação no exterior, 26 un.; já existe na carteira → desmarcada ("já existe: atualizar?")');
    ok(by('MSFT').q === 0.14 && by('MSFT').moeda === 'USD' && Math.abs(by('MSFT').pm - 400 / 0.14 / 5) < 0.01 && by('MSFT').m, 'MSFT: o "QTD" cortado no fim da linha virou 0,14; preço médio em dólar (R$ 400 ÷ 0,14 ÷ 5)');
    ok(by('TFLO').tipo === 'etf-us' && by('TFLO').q === 10, 'TFLO: ETF no exterior, 10 un.');
    ok(!t.ps.some((x) => x.t === 'AAPL'), 'AAPL vendida (31/12 = 0) não vira posição');
    const fundo = t.ps.find((x) => x.tipo === 'fundo'), conta = t.ps.find((x) => x.tipo === 'caixa'), poup = t.ps.find((x) => x.tipo === 'renda-fixa');
    ok(fundo && fundo.pm === 50000 && conta && conta.moeda === 'BRL' && conta.q === 3000 && poup && poup.pm === 8000, 'fundo (50.000), conta corrente (caixa em R$, 3.000) e poupança (renda fixa, 8.000)');
    ok(conta.dono === 'pB' && t.rows.some((r) => /CONTA CORRENTE CONJUGE/.test(r.txt) && r.dono === 'pB'), 'a conta do cônjuge já vem com a Ciclana escolhida em "De quem é"');
    ok(t.ps.length === 6 && !t.ps.some((x) => x.tipo === 'outro'), 'consórcio e apartamento não viram posição (ficam no patrimônio sem liquidez)');
    ok(t.pos && t.deps && t.fontes.join() === 'true' && t.comps.join() === 'false,false', 'escolhas: carteira, dependentes e a fonte marcados; as contas fixas (escola, plano) desmarcadas');
    ok(/A declaração de 2027 já começa com 12 bens, 2 dependentes e 1 fontes desta/.test(t.base), 'a base da próxima: "' + t.base + '"');

    console.log('3) salvar');
    await p.evaluate(() => { document.querySelectorAll('.de-comp')[0].checked = true; });
    await p.click('[data-acao="tx-dec-salvar"]'); await p.waitForTimeout(300);
    const s1 = await p.evaluate(() => ({ pos: ST.posicoes.map((x) => ({ t: x.ticker, tipo: x.tipo, esc: x.escopo, dono: x.donoId, ref: !!x.decRef })), pess: Pessoas.todas().filter((x) => x.papel === 'dependente').map((x) => x.nome).sort(),
      rec: Recorrente.todos().map((r) => ({ n: r.nome, g: r.grupo, v: r.valor, e: r.escopo })), il: (ST.patrimonio_iliquido || []).length }));
    ok(s1.pos.length === 6 && s1.pos.filter((x) => x.t === 'GOOG').length === 1, 'carteira: 5 posições novas + a GOOG que já existia (não duplicou)');
    ok(s1.pos.filter((x) => x.esc === 'reservado').length === 5 && s1.pos.some((x) => x.dono === 'pB'), 'as novas no cofre reservado; a conta com a dona escolhida');
    ok(s1.pess.join() === 'Beltrano,Sicrana', 'dependentes cadastrados em Pessoas');
    ok(s1.rec.some((r) => r.g === 'RENDA' && r.v === 10000 && r.e === 'reservado') && s1.rec.some((r) => /ESCOLA/.test(r.n) && r.v === 2000 && r.e === 'reservado'), 'a fonte virou renda (120.000 ÷ 12) e a escola marcada virou compromisso (24.000 ÷ 12), reservados');
    const vc = await p.evaluate(() => { Escopo.preparar(Store.estado); return { pos: ST.posicoes.filter((x) => x.escopo).map((x) => Escopo.de('posicoes', x)), rec: Recorrente.todos().map((r) => Escopo.de('recorrentes', r)) }; });
    ok(vc.pos.every((x) => x === 'reservado') && vc.rec.every((x) => x === 'reservado'), 'visão da casa: posições, renda e compromisso da declaração ficam todos fora (reservado)');

    console.log('4) importar de novo não duplica');
    await p.evaluate((dd) => { fechar('genModal'); abrirDeclaracao(dd, true); }, d); await p.waitForTimeout(200);
    const t2 = await p.evaluate(() => ({ marc: DeclEscolhas.posicoes(txDec).lista.filter((x) => x.marcado).length, deps: (document.getElementById('deDeps') || {}).disabled, fontes: [...document.querySelectorAll('.de-fonte')].map((c) => c.checked) }));
    ok(t2.marc === 0 && t2.deps && t2.fontes.join() === 'false', 'na segunda vez tudo vem desmarcado (já existe)');
    await p.click('[data-acao="tx-dec-salvar"]'); await p.waitForTimeout(300);
    const s2 = await p.evaluate(() => ({ pos: ST.posicoes.length, dep: Pessoas.todas().filter((x) => x.papel === 'dependente').length, rec: Recorrente.todos().length }));
    ok(s2.pos === 6 && s2.dep === 2 && s2.rec === s1.rec.length, 'salvar de novo não duplica nada (' + JSON.stringify(s2) + ')');
    console.log('5) a leitura roda no Fundo');
    const f = await p.evaluate(async (t) => { fechar('assetModal'); abrirApp('budget'); irPara('b-painel'); render();
      const orig = PdfTexto.extrair; let liberar; PdfTexto.extrair = () => new Promise((r) => { liberar = () => r(t); });
      const pr = importarDeclaracao([{ name: 'declaracao-exemplo.pdf', type: 'application/pdf' }]);
      await new Promise((r) => setTimeout(r, 50));
      const durante = { ativa: Fundo.ativa('declaracao'), trava: !!navigator.wakeLock ? 'ok' : 'sem wakeLock', pilula: !document.getElementById('fundoPill').hidden && !document.getElementById('fundoPill').classList.contains('hidden') };
      liberar(); await pr; PdfTexto.extrair = orig;
      const depois = { pronta: !!(Fundo.estado('declaracao') || {}).pronto, app: ST.appAtual };
      document.getElementById('fundoPill').click(); await new Promise((r) => setTimeout(r, 200));
      return { durante, depois, abriu: ST.appAtual === 'tax' && !document.getElementById('assetModal').classList.contains('hidden') && !!document.querySelector('.dec-esc'), limpo: !Fundo.estado('declaracao') }; }, TEXTO);
    ok(f.durante.ativa && f.durante.pilula, 'enquanto lê, a tarefa está no Fundo e a pílula aparece (' + JSON.stringify(f.durante) + ')');
    ok(f.depois.pronta && f.depois.app === 'budget', 'a pessoa saiu para o BudgetONE: a leitura termina mesmo assim e fica pronta na pílula');
    ok(f.abriu && f.limpo, 'tocar na pílula leva de volta ao FiscalONE, com a declaração e as escolhas abertas');
    console.log('6) os ajustes vistos com a declaração real (dados fictícios)');
    const tp = await p.evaluate((dd) => DeclEscolhas.bens(dd).map((x) => x.b.grupo + '.' + x.b.codigo + '=' + x.tipo + '|' + x.nome), d);
    const tipo = (pre) => (tp.find((x) => x.indexOf(pre) === 0) || '');
    ok(/^01\.11=imovel\|APARTAMENTO EXEMPLO QUITADO VIA CONSORCIO$/.test(tipo('01.11')) && /^01\.12=imovel\|AP PLANTA$/.test(tipo('01.12')), 'imóvel com "consórcio" na descrição continua imóvel; "AP PLANTA R$ 1.291.315" → "AP PLANTA" (' + tipo('01.12') + ')');
    ok(/^02\.01=outro\|JEEP RENEGADE 1\.8 PCD 2019-2019$/.test(tipo('02.01')), 'veículo: "JEEP RENEGADE 1.8 PCD 2019-2019" (o ponto do número não corta o nome)');
    ok(/^99\.05=outro\|CONSORCIO VEICULO SEGURADORA EXEMPLO$/.test(tipo('99.05')), 'consórcio (99.05): "CONSORCIO VEICULO SEGURADORA EXEMPLO"');
    const prev = tp.filter((x) => x.indexOf('99.06') === 0);
    ok(prev.some((x) => /=previdencia\|PREVIDENCIA VGBL SEGURADORA EXEMPLO$/.test(x)) && prev.some((x) => /=outro\|OUTROS BENS E DIREITOS \(99\.06\)$/.test(x)), '99.06: com VGBL → previdência; "OUTROS BENS E DIREITOS (99.06) - CONTA…" → outro');
    const sem = await p.evaluate((dd) => { fechar('genModal'); const guard = Mercado.cambio.USD; delete Mercado.cambio.USD; abrirDeclaracao(dd, true);
      const campo = document.getElementById('deDolar'), ps = DeclEscolhas.posicoes(txDec).lista;
      const r = { vazio: campo && campo.value === '', usd: ps.filter((x) => /AVENUE/.test(x.bem.desc)).map((x) => ({ m: x.marcado, pr: x.problema, pm: x.item.pm })),
        ck: [...document.querySelectorAll('.de-pos')].filter((c) => /AVENUE|MSFT|TFLO/.test(c.closest('li').textContent)).map((c) => c.checked + '/' + c.disabled) };
      campo.value = '5,10'; campo.dispatchEvent(new Event('input', { bubbles: true }));
      const ps2 = DeclEscolhas.posicoes(txDec).lista.filter((x) => /AVENUE/.test(x.bem.desc));
      r.depois = ps2.map((x) => ({ t: x.item.ticker, m: x.marcado, pm: x.item.pm, pr: x.problema }));
      r.liCk = [...document.querySelectorAll('.de-pos')].filter((c) => /MSFT/.test(c.closest('li').textContent)).map((c) => c.disabled);
      Mercado.cambio.USD = guard; fechar('assetModal'); return r; }, d);
    ok(sem.vazio && sem.usd.length >= 3 && sem.usd.every((x) => !x.m && /falta o dólar/.test(x.pr)) && sem.ck.every((x) => x === 'false/true'), 'sem câmbio: o campo do dólar vem vazio e o que é em dólar fica desmarcado, com "falta o dólar" (nunca pm = 0)');
    const ms = sem.depois.find((x) => x.t === 'MSFT');
    ok(!ms.pr && Math.abs(ms.pm - 400 / 0.14 / 5.1) < 0.01 && sem.liCk[0] === false, 'preenchido o dólar de 31/12 (5,10), a lista se refaz: o problema some e a MSFT fica liberada, pm = 400 ÷ 0,14 ÷ 5,10 (desmarcada só porque já foi importada no passo 3)');
    const dep = await p.evaluate((dd) => { Store.estado.pessoas = Pessoas.todas().filter((x) => x.papel !== 'dependente');
      Pessoas.salvar({ tipo: 'casa', papel: 'dependente', nome: 'Bel', apelido: 'Beltrano' }); Pessoas.salvar({ tipo: 'casa', papel: 'dependente', nome: 'Sicrana Maria', sobrenome: 'Exemplo' });
      const n0 = Pessoas.todas().length, b = DeclEscolhas.budget(dd); DeclEscolhas.aplicar(dd, { bens: [], deps: true, fontes: [], comps: [], pos: null, usd: 5 });
      return { ja: b.deps.map((x) => x.nome + '=' + x.ja), criou: Pessoas.todas().length - n0 }; }, d);
    ok(dep.ja.join() === 'Beltrano=true,Sicrana=true' && dep.criou === 0, 'dependente que já existe pelo apelido ("Bel", apelido Beltrano) ou pelo primeiro nome ("Sicrana Maria"): não cria outra pessoa (' + dep.ja.join(', ') + ')');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
