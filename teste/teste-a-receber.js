/* =====================================================================
   teste/teste-a-receber.js — 3.79: VALORES A RECEBER (modulos/a-receber.js). Dados FICTÍCIOS.
   Confere: "↩ Pedi estorno disto" numa compra 10× de R$ 600 preenche R$ 6.000 em 10× no cartão; o estorno de R$ 6.000 de
   uma vez marca "recebido" e avisa "Caiu o estorno"; o estorno parcela a parcela fica "recebido em parte: X de Y";
   sem crédito em 30 dias → "Precisa da sua atenção" e 📥 "ainda não estornou … Cobrar de novo?"; "Cobrei de novo"
   empurra 30 dias e volta depois; crédito sem cadastro → "Parece um estorno de …. Marcar?"; visão da casa segue o
   lançamento de origem; tela "A receber" com o total pendente e a restituição do IR.
   Uso: node teste/teste-a-receber.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const CP = { cnpj: '11222333000181', nome: 'HOTEL EXEMPLO' };
const C = { cartaoId: 'ct1', forma: 'Cartão de crédito', formaId: 'credito', fluxo: 'saida' };
const gastos = [
  Object.assign({ id: 'h1', data: '2026-09-05', valor: 600, grupo: 'LAZER', sub: 'Viagem', desc: 'HOTEL EXEMPLO 01/10', contraparte: CP }, C),
  Object.assign({ id: 'p1', data: '2026-09-06', valor: 1200, grupo: 'LAZER', sub: 'Viagem', desc: 'POUSADA GAMA', }, C),
  { id: 'lb', data: '2026-10-01', valor: 300, grupo: 'PESSOAL', sub: 'Roupas', desc: 'LOJA BETA', fluxo: 'saida' }
];
const recorrentes = [{ id: 'rir', nome: 'Restituição do IR 2027', valor: 2500, grupo: 'RENDA', sub: 'Restituição IR', fluxo: 'entrada', regra: 'anual', mes: 7, dia: 31, desde: '2027-07-01', ate: '2027-07-31' }];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes, cartoes: [{ id: 'ct1', apelido: 'Cartão Exemplo', bandeira: 'visa', fim: '1234', fecha: 25, vence: 5 }] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof AReceber !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); AReceber._hoje = '2026-10-10'; abrirApp('budget'); irPara('b-lanc'); render(); });
    const credito = (id, data, valor, desc, extra) => p.evaluate((a) => { Gasto.add(Object.assign({ id: a.id, data: a.data, valor: a.valor, estorno: true, grupo: 'LAZER', sub: 'Viagem', desc: a.desc, cartaoId: 'ct1', fluxo: 'saida', origem: 'robo' }, a.extra || {})); }, { id, data, valor, desc, extra });

    console.log('1) "Pedi estorno disto" na compra 10× de R$ 600');
    await p.evaluate(() => abrirLancamento('h1')); await p.waitForSelector('#assetModal [data-acao="ar-pedir"]');
    await p.click('#assetModal [data-acao="ar-pedir"]'); await p.waitForSelector('#genModal:not(.hidden) #arQuem');
    const f1 = await p.evaluate(() => ({ quem: arQuem.value, total: arTotal.value, n: arParc.value, onde: arOnde.value, tipo: arTipo.value, cnpj: arCnpj.value }));
    ok(f1.quem === 'HOTEL EXEMPLO' && Number(f1.total) === 6000 && f1.n === '10' && f1.onde === 'c:ct1' && f1.tipo === 'estorno' && f1.cnpj === '11222333000181', 'já preenchido: HOTEL EXEMPLO, R$ 6.000 em 10×, no Cartão Exemplo, estorno, CNPJ: ' + JSON.stringify(f1));
    await p.fill('#arProt', 'Protocolo 123'); await p.click('[data-acao="ar-salvar"]');
    const x1 = await p.evaluate(() => AReceber.lista()[0]);
    ok(x1 && x1.total === 6000 && x1.parcelas === 10 && x1.valorParcela === 600 && x1.gastoId === 'h1' && x1.estado === 'aguardando' && x1.pedidoEm === '2026-10-10', 'guardado: aguardando, pedido em 10/10');

    console.log('2) o estorno de R$ 6.000 de uma vez');
    await credito('e1', '2026-10-15', 6000, '↩ HOTEL EXEMPLO', { contraparte: { cnpj: '11222333000181', nome: 'HOTEL EXEMPLO' } });
    await p.waitForFunction(() => AReceber.lista()[0].estado === 'recebido');
    const g2 = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'receber') || {}).html || '');
    ok(/Caiu o estorno de HOTEL EXEMPLO: R\$\s?6\.000,00/.test(g2), '📥: "Caiu o estorno de HOTEL EXEMPLO: R$ 6.000,00"');
    ok(await p.evaluate(() => { const x = AReceber.lista()[0]; ST.config.inboxVistos = ST.config.inboxVistos || {}; ST.config.inboxVistos['ar|' + x.id + '|e1'] = 1; return !/Caiu o estorno/.test((inboxGrupos().find((g) => g.id === 'receber') || { html: '' }).html); }), '"ok, entendi" tira o aviso');

    console.log('3) parcela a parcela: recebido em parte');
    await p.evaluate(() => AReceber.salvar({ quem: 'POUSADA GAMA', tipo: 'estorno', total: 1200, parcelas: 2, valorParcela: 600, ondeCartaoId: 'ct1', pedidoEm: '2026-10-10', origem: Origem.origemDe(Gasto.todos().find((g) => g.id === 'p1')) }));
    await credito('e2', '2026-10-20', 600, '↩ POUSADA GAMA');
    const x3 = await p.evaluate(() => { AReceber.vigiar(); const x = AReceber.lista().find((y) => y.quem === 'POUSADA GAMA'); return { e: x.estado, r: AReceber.recebido(x), f: AReceber.restante(x) }; });
    ok(x3.e === 'parcial' && x3.r === 600 && x3.f === 600, 'R$ 600 de R$ 1.200: "recebido em parte"');
    await p.evaluate(() => { irPara('b-receber'); render(); });
    const t3 = await p.evaluate(() => document.querySelector('#view-b-receber, .view:not(.hidden)').innerText);
    ok(/recebido em parte: R\$\s?600,00 de R\$\s?1\.200,00/.test(t3) && /Pendente[\s\S]*R\$\s?600,00/.test(t3), 'tela "A receber": "recebido em parte: R$ 600,00 de R$ 1.200,00" e pendente R$ 600');
    ok(/Restituição do IR 2027/.test(t3), 'e "Também a receber": a restituição do IR prevista');
    await credito('e3', '2026-10-25', 600, '↩ POUSADA GAMA 2/2');
    ok(await p.evaluate(() => { AReceber.vigiar(); return AReceber.lista().find((y) => y.quem === 'POUSADA GAMA').estado === 'recebido'; }), 'a 2ª parcela fecha: recebido');

    console.log('4) sem crédito em 30 dias: aviso mensal até resolver');
    await p.evaluate(() => AReceber.salvar({ quem: 'COMPANHIA AEREA DELTA', tipo: 'contestacao', total: 900, parcelas: 1, ondeCartaoId: 'ct1', pedidoEm: '2026-10-10' }));
    ok(await p.evaluate(() => { AReceber._hoje = '2026-11-05'; return AReceber.atrasados().length === 0; }), 'no dia 05/11 (26 dias): ainda não');
    await p.evaluate(() => { AReceber._hoje = '2026-11-12'; irPara('b-painel'); render(); });
    const a4 = await p.evaluate(() => ({ at: (document.querySelector('.ar-atencao') || {}).innerText || '', ib: (inboxGrupos().find((g) => g.id === 'receber') || {}).html || '' }));
    ok(/COMPANHIA AEREA DELTA ainda não estornou R\$\s?900,00 \(pedido em 10\/Out\/2026\)\. Cobrar de novo\?/.test(a4.at), '"Precisa da sua atenção": ' + JSON.stringify(a4.at));
    ok(/ainda não estornou/.test(a4.ib) && /ar-cobrei/.test(a4.ib) && /ar-recebi/.test(a4.ib) && /ar-desisti/.test(a4.ib), '📥: o mesmo aviso, com "Já recebi", "Cobrei de novo (+30 dias)" e "Desisti"');
    await p.click('.ar-atencao [data-acao="ar-cobrei"]');
    ok(await p.evaluate(() => AReceber.atrasados().length === 0 && AReceber.lista().find((x) => x.quem === 'COMPANHIA AEREA DELTA').adiadoAte === '2026-12-12'), '"Cobrei de novo": some e volta em 12/12');
    ok(await p.evaluate(() => { AReceber._hoje = '2026-12-13'; return AReceber.atrasados().length === 1; }), 'em 13/12 volta (todo mês até resolver)');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    await p.click('.ar-atencao [data-acao="ar-recebi"]');
    ok(await p.evaluate(() => { const x = AReceber.lista().find((y) => y.quem === 'COMPANHIA AEREA DELTA'); return x.estado === 'recebido' && AReceber.atrasados().length === 0; }), '"Já recebi" resolve');

    console.log('5) crédito sem cadastro vira sugestão');
    await p.evaluate(() => { AReceber._hoje = '2026-10-25'; Gasto.add({ id: 'e4', data: '2026-10-20', valor: 300, estorno: true, grupo: 'PESSOAL', sub: 'Roupas', desc: '↩ LOJA BETA', fluxo: 'saida', estornoDe: 'lb', origem: 'robo' }); });
    const s5 = await p.evaluate(() => AReceber.sugestoes().map((s) => s.quem + '|' + s.valor));
    ok(s5.length === 1 && s5[0] === 'LOJA BETA|300', 'sugestão: "Parece um estorno de LOJA BETA" (R$ 300): ' + JSON.stringify(s5));
    ok(/Parece um estorno de LOJA BETA\. Marcar\?/.test((await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'receber') || {}).html || ''))), '📥 mostra a sugestão');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="ar-marcar"]');
    ok(await p.evaluate(() => { const x = AReceber.lista().find((y) => y.quem === 'LOJA BETA'); return x && x.estado === 'recebido' && x.total === 300 && AReceber.sugestoes().length === 0; }), '"Marcar" guarda como recebido e a sugestão some');

    console.log('6) visão da casa e "+ Adicionar"');
    const c6 = await p.evaluate(() => { const est = Store.estado; est.visaoCasa = { pessoas: ['pbia'] }; est.cartoes[0].usaId = 'pbia'; Escopo.preparar(est);
      const x = AReceber.lista().find((y) => y.gastoId === 'h1'), z = AReceber.lista().find((y) => y.quem === 'COMPANHIA AEREA DELTA');
      return [Escopo.de('a_receber', x), Escopo.de('a_receber', z), Escopo.de('a_receber', Object.assign({}, z, { escopo: 'casa' }))]; });
    ok(c6[0] === 'casa' && c6[1] === 'reservado' && c6[2] === 'casa', 'o pedido segue o lançamento de origem (cartão que ela usa → casa); sem lançamento, reservado; marcado à mão, vale a marca: ' + c6.join(','));
    await p.evaluate(() => { fechar('genModal'); AReceber.salvar({ quem: 'LOJA OMEGA', tipo: 'devolucao', total: 150, pedidoEm: '2026-10-20' }); irPara('b-custos'); render(); });
    ok(/A receber: R\$\s?150,00 · 1 pedido/.test(await p.evaluate(() => (document.querySelector('#view-b-custos .ar-topo') || {}).innerText || '')), 'cartão "A receber: R$ 150,00 · 1 pedido(s)" no topo de Contas fixas');
    await p.click('#view-b-custos [data-acao="cf-adicionar"]');
    ok(await p.evaluate(() => !!document.querySelector('#genBody [data-acao="ar-novo"]')), '"+ Adicionar" tem "Valor a receber (estorno, reembolso)"');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
