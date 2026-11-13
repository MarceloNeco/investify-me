/* =====================================================================
   teste/teste-debito-auto.js — 3.77: "NÃO PAGUE: ESTÁ EM DÉBITO AUTOMÁTICO" (modulos/debito-auto.js). Dados FICTÍCIOS.
   Confere: o mesmo recebedor (CNPJ ou nome) de uma conta fixa em débito automático acende o aviso vermelho no
   "Chegou um boleto"; uma conta fixa nova (boleto/agendada) do mesmo recebedor pergunta antes de criar e
   "Salvar mesmo assim" cria; recebedor diferente ou a própria conta em débito automático não avisam.
   Uso: node teste/teste-debito-auto.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
function pdfCom(linhas) {
  const conteudo = 'BT /F1 11 Tf 50 760 Td 14 TL ' + linhas.map((l) => '(' + l + ') Tj T*').join(' ') + ' ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + conteudo.length + ' >>\nstream\n' + conteudo + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const x = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}
const hoje = new Date(), ANO = hoje.getFullYear();
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const venc = new Date(ANO, hoje.getMonth() + 1, 15);
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  gastos: [{ id: 'g1', data: iso(new Date(ANO, hoje.getMonth() - 1, 15)), valor: 1500, grupo: 'OUTROS', sub: 'Outros', desc: 'DEBITO AUTOMATICO ALFASEG', fluxo: 'saida' }],
  recorrentes: [
    { id: 'r-fat', nome: 'Fatura cartão Alfa', valor: 1500, grupo: 'OUTROS', sub: 'Outros', regra: 'dia', dia: 15, estadoPadrao: 'automatico', conta: 'Banco Modelo', fluxo: 'saida' },
    { id: 'r-agua', nome: 'Água Modelo', valor: 90, grupo: 'HABITACAO', sub: 'Água', regra: 'dia', dia: 10, estadoPadrao: 'automatico', conta: 'Banco Modelo', fluxo: 'saida', contraparte: { cnpj: '11222333000181', nome: 'AGUAS DO MODELO' } },
    { id: 'r-luz', nome: 'Luz Beta', valor: 200, grupo: 'HABITACAO', sub: 'Energia', regra: 'dia', dia: 20, estadoPadrao: 'pendente', fluxo: 'saida' }
  ] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mjs': 'text/javascript' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'da-'));
  const boleto = path.join(tmp, 'boleto.pdf');
  fs.writeFileSync(boleto, pdfCom(['Beneficiario: ALFASEG SA C FINANC E INVEST CNPJ 00.000.000/0001-91', 'Vencimento ' + iso(venc).split('-').reverse().join('/'), 'Valor do documento 1.500,00']));
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof DebitoAuto !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-custos'); render(); });

    console.log('1) quem casa');
    const c1 = await p.evaluate(() => {
      const f = (b, ig) => { const c = DebitoAuto.conflito(b, ig); return c ? c.r.id + '|' + c.banco + '|' + c.dia : null; };
      return [f({ nome: 'ALFASEG SA C FINANC E INVEST' }), f({ nome: 'Outro nome', cnpj: '11.222.333/0001-81' }), f({ nome: 'LUZ BETA DISTRIBUIDORA' }),
        f({ nome: 'BANCO SA FINANC CARTAO FATURA' }), f({ nome: 'Fatura cartão Alfa' }, 'r-fat')];
    });
    ok(c1[0] === 'r-fat|Banco Modelo|15', '"ALFASEG SA C FINANC E INVEST" casa com "Fatura cartão Alfa" (débito automático no Banco Modelo, dia 15): ' + c1[0]);
    ok(c1[1] === 'r-agua|Banco Modelo|10', 'pelo CNPJ, mesmo com outro nome: ' + c1[1]);
    ok(c1[2] === null, 'a luz não está em débito automático: não avisa');
    ok(c1[3] === null, 'só palavras genéricas (banco, cartão, fatura, financ): não avisa');
    ok(c1[4] === null, 'a própria conta não avisa sobre si mesma');

    console.log('2) "Chegou um boleto" com o aviso vermelho');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-b-custos [data-acao="cf-adicionar"]').then(() => p.click('#genBody [data-acao="prev-boleto"]'))]);
    await fc.setFiles(boleto); await p.waitForSelector('#genModal:not(.hidden) #pvOc');
    const t2 = await p.evaluate(() => { const a = document.querySelector('#genBody .aviso-vermelho'); return a && { txt: a.innerText, cor: getComputedStyle(a).borderColor }; });
    ok(t2 && /NÃO PAGUE: ESTÁ EM DÉBITO AUTOMÁTICO/.test(t2.txt) && /débito automático em Banco Modelo no dia 15/.test(t2.txt) && /pagar em dobro/.test(t2.txt), 'aviso: "' + (t2 && t2.txt) + '"');
    await p.evaluate(() => fechar('genModal'));

    console.log('3) conta fixa nova do mesmo recebedor pergunta antes');
    await p.evaluate(() => abrirRecorrente(null, { nome: 'Alfaseg boleto', valor: 1490, grupo: 'PESSOAL', sub: 'Seguros', regra: 'dia', dia: 12, estadoPadrao: 'pendente' }));
    await p.waitForSelector('#assetModal [data-acao="rec-salvar"]');
    const n0 = await p.evaluate(() => Recorrente.todos().length);
    await p.click('#assetModal [data-acao="rec-salvar"]');
    await p.waitForSelector('#genModal:not(.hidden) .da-aviso');
    ok(await p.evaluate((n) => Recorrente.todos().length === n, n0), 'não criou antes de perguntar; o aviso vermelho aparece');
    await p.click('#genModal [data-acao="da-salvar"]');
    ok(await p.evaluate((n) => Recorrente.todos().length === n + 1 && Recorrente.todos().some((r) => r.nome === 'Alfaseg boleto'), n0), '"Salvar mesmo assim" cria');
    await p.evaluate(() => abrirRecorrente(null, { nome: 'Academia Gama', valor: 100, grupo: 'PESSOAL', sub: 'Academia', regra: 'dia', dia: 5, estadoPadrao: 'pendente' }));
    await p.waitForSelector('#assetModal [data-acao="rec-salvar"]');
    await p.click('#assetModal [data-acao="rec-salvar"]');
    ok(await p.evaluate(() => Recorrente.todos().some((r) => r.nome === 'Academia Gama') && !document.querySelector('#genModal:not(.hidden) .da-aviso')), 'recebedor sem débito automático: cria direto, sem perguntar');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
