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
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [], visaoCasa: { pessoas: ['pDela'] } };

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
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
