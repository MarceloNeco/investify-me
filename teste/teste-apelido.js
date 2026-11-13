/* =====================================================================
   teste/teste-apelido.js — 3.68: o apelido da loja/pessoa por origem (modulos/apelido.js). Dados fictícios.
   Confere: o campo na edição; o apelido vale para os outros lançamentos da mesma origem (CNPJ, chave da descrição),
   antigos e novos; descrição genérica do banco vale só para aquele; a lista mostra o apelido e o nome original fica no
   title, na edição e na busca; o cofre (casa × reservado) segue o lançamento.
   Uso: node teste/teste-apelido.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const d = new Date().toISOString().slice(0, 8);
const gastos = [
  { id: 'p1', data: d + '02', valor: 12, grupo: 'HABITACAO', sub: 'Padaria', desc: 'Pagamento de Pix QR Code PANIFICADORA EXEMPLO LTDA', fluxo: 'saida', quemId: 'pDela', contraparte: { cnpj: '00000000000191', nome: 'PANIFICADORA EXEMPLO LTDA' } },
  { id: 'p2', data: d + '05', valor: 15, grupo: 'HABITACAO', sub: 'Padaria', desc: 'PANIFICADORA EXEMPLO 05/11', fluxo: 'saida', quemId: 'pDele', contraparte: { cnpj: '00000000000191' } },
  { id: 'm1', data: d + '03', valor: 40, grupo: 'HABITACAO', sub: 'Mercado', desc: 'MERCADINHO MODELO 03/11', fluxo: 'saida', quemId: 'pDele' },
  { id: 'm2', data: d + '09', valor: 55, grupo: 'HABITACAO', sub: 'Mercado', desc: 'MERCADINHO MODELO 09/11', fluxo: 'saida', quemId: 'pDele' },
  { id: 'x1', data: d + '04', valor: 30, grupo: 'OUTROS', sub: 'Outros', desc: 'PIX ENVIADO', fluxo: 'saida', quemId: 'pDele' },
  { id: 'x2', data: d + '06', valor: 31, grupo: 'OUTROS', sub: 'Outros', desc: 'PIX ENVIADO', fluxo: 'saida', quemId: 'pDele' }];
/* 3.69: conta fixa para boleto genérico — o condomínio (valor varia) e os pagamentos dos meses anteriores */
const mAnt = (k) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - k); return x.toISOString().slice(0, 8); };
[[3, 2400], [2, 2614.78], [1, 2890]].forEach(([k, v]) => gastos.push({ id: 'cd' + k, data: mAnt(k) + '10', valor: v, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'INT PAG TIT 341', fluxo: 'saida', recorrenteId: 'rCond' }));
gastos.push({ id: 'b1', data: d + '12', valor: 2700, grupo: 'OUTROS', sub: 'Outros', desc: 'INT PAG TIT 341', fluxo: 'saida', origem: 'robo', confianca: 'palpite' });
gastos.push({ id: 'b2', data: d + '12', valor: 900, grupo: 'OUTROS', sub: 'Outros', desc: 'INT PAG TIT 341', fluxo: 'saida' });
gastos.push({ id: 'b3', data: d + '13', valor: 2650, grupo: 'OUTROS', sub: 'Outros', desc: 'INT PAG TIT 341', fluxo: 'saida' });
const recorrentes = [{ id: 'rCond', nome: 'Condomínio Exemplo', grupo: 'HABITACAO', sub: 'Condomínio', valor: 2500, dia: 10, regra: 'dia', per: 'Mensal', criadoEm: '2025-01-01' }];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes, visaoCasa: { pessoas: ['pDela'] } };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Apelido !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const apelidar = async (id, nome) => { await p.evaluate((i) => abrirLancamento(i), id); await p.waitForTimeout(120); await p.fill('#glApelido', nome); await p.click('[data-acao="gl-salvar"]'); await p.waitForTimeout(150); };
    const linha = (id) => p.evaluate((i) => { const s = document.querySelector('tr[data-bid="' + i + '"] .desc-txt'); return s ? { t: s.textContent, title: s.title } : null; }, id);

    console.log('1) o campo e a origem por CNPJ');
    await p.evaluate(() => abrirLancamento('p1')); await p.waitForTimeout(120);
    const campo = await p.evaluate(() => ({ tem: !!document.querySelector('#glApelido'), desc: document.querySelector('#glDesc').value }));
    ok(campo.tem && /PANIFICADORA EXEMPLO LTDA/.test(campo.desc), 'a edição tem o campo "Apelido" e a descrição original continua lá');
    await p.evaluate(() => fechar('assetModal'));
    await apelidar('p1', 'Padaria Exemplo');
    const l1 = await linha('p1'), l2 = await linha('p2');
    ok(l1.t === 'Padaria Exemplo' && /Pagamento de Pix QR Code PANIFICADORA/.test(l1.title), 'a lista mostra "Padaria Exemplo" sem o "Pagamento de Pix QR Code"; o nome original no title');
    ok(l2.t === 'Padaria Exemplo', 'o outro lançamento do mesmo CNPJ também mostra o apelido');
    const novo = await p.evaluate(() => { Gasto.add({ id: 'p3', data: hojeISO(), valor: 9, grupo: 'HABITACAO', sub: 'Padaria', desc: 'PANIF EXEMPLO', fluxo: 'saida', contraparte: { cnpj: '00000000000191' } }); render(); return Apelido.de(Gasto.todos().find((g) => g.id === 'p3')); });
    ok(novo === 'Padaria Exemplo', 'um lançamento novo da mesma origem já chega com o apelido');

    console.log('2) a origem pela chave da descrição e a descrição genérica');
    await apelidar('m1', 'Mercado do bairro');
    ok((await linha('m2')).t === 'Mercado do bairro', '"MERCADINHO MODELO 09/11" (mesma chave da descrição) mostra o apelido');
    await apelidar('x1', 'Aluguel da vaga');
    ok((await linha('x1')).t === 'Aluguel da vaga' && (await linha('x2')).t === 'PIX ENVIADO', '"PIX ENVIADO" é genérico: o apelido vale só para aquele lançamento');

    console.log('3) a busca aceita o nome original e o apelido');
    const busca = await p.evaluate(() => ['panificadora', 'padaria exemplo'].map((t) => Gasto.filtrar({ busca: t }).length));
    ok(busca[0] === 2 && busca[1] === 3, 'buscar "panificadora" acha os 2 com esse nome no banco; "padaria exemplo" acha os 3 com o apelido');

    console.log('4) apagar o apelido volta o nome do banco');
    await apelidar('m2', '');
    ok((await linha('m1')).t === 'MERCADINHO MODELO 03/11', 'apelido vazio: a lista volta a mostrar a descrição do banco');

    console.log('5) o cofre segue o lançamento');
    const esc = await p.evaluate(() => { const vc = Store.estado.visaoCasa; Store.estado.visaoCasa = { pessoas: ['pDela'] }; ST.gastos.find((g) => g.id === 'p1').quemId = 'pDela'; Escopo.preparar(Store.estado); const r = ST.apelidos.map((a) => a.nome + '=' + Escopo.de('apelidos', a)).sort(); Store.estado.visaoCasa = vc; return r; });
    ok(esc.join(',') === 'Aluguel da vaga=reservado,Padaria Exemplo=casa', 'Padaria Exemplo é da casa (um lançamento dela tem essa origem); o resto fica reservado (' + esc.join(', ') + ')');
    console.log('6) conta fixa para boleto genérico (3.69)');
    const cf = await p.evaluate(() => { const G = (i) => Gasto.todos().find((g) => g.id === i); const f = Apelido.faixa(Recorrente.achar('rCond'));
      return { f, b1: Apelido.contasFixas(G('b1')).map((x) => x.r.nome), b2: Apelido.contasFixas(G('b2')).length, t: Apelido.texto(G('b1')) }; });
    ok(Math.abs(cf.f.min - 2040) < 0.01 && Math.abs(cf.f.max - 3323.5) < 0.01 && cf.f.n === 3, 'faixa do condomínio (2.400 / 2.614,78 / 2.890 ±15%) = 2.040 a 3.323,50');
    ok(cf.b1.join() === 'Condomínio Exemplo' && cf.t === 'Condomínio Exemplo', '"INT PAG TIT" de 2.700 no dia 12 casa com o condomínio (vence dia 10): a lista mostra "Condomínio Exemplo"');
    ok(cf.b2 === 0, 'o boleto de 900 no mesmo dia não casa');
    await p.evaluate(() => { irPara('b-lanc'); render(); });
    const sel = await p.evaluate(() => { const tr = document.querySelector('tr[data-bid="b1"]'); return tr ? tr.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/A confirmar conta fixa Condomínio Exemplo/.test(sel), 'na lista: selo amarelo "A confirmar" com a conta fixa');
    ok(await p.evaluate(() => !Gasto.todos().find((g) => g.id === 'b1').recorrenteId && !Apelido.de(Gasto.todos().find((g) => g.id === 'b1'))), 'nada gravado antes de confirmar');
    const dois = await p.evaluate(() => { Recorrente.add({ id: 'rCont', nome: 'Contabilidade Exemplo', grupo: 'BANCARIOS', sub: 'Contador', valor: 2700, dia: 10, regra: 'dia', per: 'Mensal', criadoEm: '2025-01-01' }); render();
      const g = Gasto.todos().find((x) => x.id === 'b1'); const tr = document.querySelector('tr[data-bid="b1"]');
      return { n: Apelido.contasFixas(g).map((x) => x.r.nome).sort().join(' | '), t: Apelido.texto(g), bts: tr ? tr.querySelectorAll('[data-acao="ap-conta"]').length : 0 }; });
    ok(dois.n === 'Condomínio Exemplo | Contabilidade Exemplo' && dois.t === 'INT PAG TIT 341' && dois.bts === 2, 'duas contas fixas casam: não escolhe, mostra as duas para tocar');
    await p.click('tr[data-bid="b1"] [data-acao="ap-conta"][data-rid="rCond"]'); await p.waitForTimeout(150);
    const lig = await p.evaluate(() => { const G = (i) => Gasto.todos().find((g) => g.id === i); const o = Recorrente.ocorrencias(G('b1').data.slice(0, 8) + '01', G('b1').data.slice(0, 8) + '28').find((x) => x.r.id === 'rCond');
      return { rid: G('b1').recorrenteId, ap1: Apelido.de(G('b1')), ap3: Apelido.de(G('b3')), est: o && o.estado, t3: Apelido.contasFixas(G('b3')).map((x) => x.r.id).join() }; });
    ok(lig.rid === 'rCond' && lig.ap1 === 'Condomínio Exemplo' && lig.est === 'confirmado', 'confirmar liga ao compromisso (pagamento conciliado) e grava o apelido');
    ok(lig.ap3 === '' && lig.t3 === 'rCont', 'o apelido vale só para aquele lançamento; o outro "INT PAG TIT" não ganha apelido e não sugere mais o condomínio (o vencimento do mês já foi pago), só a contabilidade');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
