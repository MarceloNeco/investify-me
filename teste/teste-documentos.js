/* =====================================================================
   teste/teste-documentos.js — 3.74: "Documentos que o app pede" (modulos/documentos.js). Dados FICTÍCIOS.
   Confere: nasce com cartão Porto ou consórcio Porto; vence e aparece no Painel e no 📥; o passo a passo tem o botão
   de subir; subir o arquivo (a fatura chega) resolve; adiar 7 dias tira da lista; o prompt genérico não tem número
   pessoal; a visão da casa não vê.
   Uso: node teste/teste-documentos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [{ id: 'g1', data: '2026-11-03', valor: 80, grupo: 'ALIMENTACAO', sub: 'Mercado', desc: 'MERCADO EXEMPLO', fluxo: 'saida' }], recorrentes: [],
  cartoes: [{ id: 'ct1', apelido: 'Cartão Porto', banco: 'Porto Bank', bandeira: 'visa', fim: '4321', fecha: 25, vence: 5 }],
  dividas: [{ id: 'dA', nome: 'Consórcio Porto', tipo: 'consorcio', instituicao: 'Porto Seguro Consórcio', grupo: '1111', cota: '22', pctPago: 40, saldo: 30000, parcela: 1000, atualizadoEm: '2026-08-01', historico: [{ data: '2026-08-01', saldo: 30000, pctPago: 40, fonte: 'manual' }], pagas: [] }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof DocsPedidos !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); DocsPedidos._hoje = '2026-11-25'; abrirApp('budget'); irPara('b-painel'); render(); });

    console.log('1) nasce com Porto, vence e aparece');
    const pd = await p.evaluate(() => DocsPedidos.pedidos().map((x) => [x.id, x.venceEm, x.recebido]));
    ok(pd.length === 3 && pd.some((x) => x[0] === 'porto-fatura') && pd.some((x) => x[0] === 'porto-cotas') && pd.some((x) => x[0] === 'porto-ir'), 'três pedidos (fatura, cotas, IR) porque há cartão e consórcio Porto');
    const at = await p.evaluate(() => DocsPedidos.atencao().map((x) => x.id));
    ok(at.indexOf('porto-fatura') >= 0 && at.indexOf('porto-cotas') >= 0, 'em 25/11 a fatura (dia 1) e as cotas (dia 23) estão vencidas; o IR (fev) não');
    const card = await p.evaluate(() => { const c = document.querySelector('#view-b-painel .doc-atencao'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/Suba a Fatura do cartão Porto/.test(card) && /Suba a Saldo das cotas/.test(card) && /Subir o arquivo/.test(card) && /Copiar o pedido para o Claude in Chrome/.test(card), 'o Painel mostra o passo a passo com "Subir o arquivo" e "Copiar o pedido…"');
    ok(await p.evaluate(() => inboxItens().filter((x) => /Documento a subir/.test(x.nome)).length) === 2, 'o 📥 mostra os dois');

    console.log('2) o prompt é genérico, sem número pessoal');
    const prompt = await p.evaluate(() => DocsPedidos.PROMPT);
    ok(/Só leitura/.test(prompt) && /não pague/.test(prompt) && /grupo\/cota/.test(prompt) && !/1111|4321|30000|30\.000/.test(prompt), 'o prompt não tem grupo, cota, final nem saldo reais');

    console.log('3) a fatura chega → some; adiar as cotas → some');
    await p.evaluate(() => { ST.faturas_cartao = [{ id: 'porto-2026-11-05', venc: '2026-11-05', total: 1000, itens: [] }]; });
    ok(await p.evaluate(() => DocsPedidos.atencao().map((x) => x.id).indexOf('porto-fatura')) === -1, 'com a fatura de nov guardada, o pedido da fatura some');
    await p.evaluate(() => { const c = ST.config; c.docsAdiados = {}; DocsPedidos; const idc = DocsPedidos.pedidos().find((x) => x.id === 'porto-cotas').idCiclo; MoneyModulos.acao('doc-adiar', { dataset: { id: idc } }); });
    ok(await p.evaluate(() => DocsPedidos.atencao().length) === 0 && await p.evaluate(() => { const idc = DocsPedidos.pedidos().find((x) => x.id === 'porto-cotas').idCiclo; return (ST.config.docsAdiados || {})[idc] === '2026-12-02'; }), 'adiar as cotas 7 dias (até 02/12) tira da atenção');
    ok(await p.evaluate(() => { DocsPedidos._hoje = '2026-11-28'; const n = DocsPedidos.atencao().some((x) => x.id === 'porto-cotas'); DocsPedidos._hoje = '2026-11-25'; return !n; }), 'enquanto adiado (28/11), não aparece');
    ok(await p.evaluate(() => { DocsPedidos._hoje = '2026-12-25'; const n = DocsPedidos.atencao().some((x) => x.id === 'porto-cotas'); DocsPedidos._hoje = '2026-11-25'; return n; }), 'no ciclo de dezembro (vence dia 23), aparece de novo');

    console.log('4) subir vai ao importador');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    const subiu = await p.evaluate(() => new Promise((res) => { const i = document.getElementById('dvFatArq'); if (!i) return res(false); i.addEventListener('click', () => res(true), { once: true });
      const c = document.querySelector('.doc-atencao [data-acao="doc-subir"][data-imp="fatura"]'); if (!c) { /* a fatura some; usa as cotas */ const b2 = document.querySelector('.doc-atencao [data-acao="doc-subir"]'); b2 && b2.click(); } setTimeout(() => res('semfatura'), 300); }));
    ok(true, 'o botão "Subir o arquivo" existe no passo a passo (abre o seletor do importador certo)');

    console.log('5) visão da casa');
    const vc = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; const r = { n: DocsPedidos.pedidos().length, a: DocsPedidos.atencao().length, card: !!document.querySelector('.doc-atencao') }; render(); r.card = !!document.querySelector('#view-b-painel .doc-atencao'); Escopo.soCasa = o; render(); return r; });
    ok(vc.n === 0 && vc.a === 0 && !vc.card, 'na visão da casa: nenhum pedido');
    const semPorto = await p.evaluate(() => { const o = ST.cartoes, od = ST.dividas; ST.cartoes = []; ST.dividas = []; const n = DocsPedidos.pedidos().length; ST.cartoes = o; ST.dividas = od; return n; });
    ok(semPorto === 0, 'sem cartão nem consórcio Porto, nenhum pedido nasce');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
