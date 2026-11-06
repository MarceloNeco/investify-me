/* =====================================================================
   teste/teste-parte8.js — 3.44: N38 plano de saúde, reembolso estimado e IR (Chromium headless, Playwright)
   Confere: tipo e especialidade do gasto sem IA; reembolso = menor entre gasto e tabela (especialidade ganha
   do tipo); sem reembolso, volta 0 e tudo fica para o IR; quem o plano cobre; leitura da apólice (PDF) por
   modelo, com a pessoa conferindo; pontos em Lançamentos, Custos e TaxONE → Deduções; 390 e 1366.
   Uso (na pasta raiz): node teste/teste-parte8.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const ANO = new Date().getFullYear();
/* um PDF de verdade, com várias linhas de texto */
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
const d = (m, dd) => ANO + '-' + String(m).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
const LOCAL = { v: 1, posicoes: [], config: {}, recorrentes: [], gastos: [
  { id: 's1', data: d(1, 10), valor: 450, grupo: 'SAUDE', sub: 'Pediatra', quem: 'Bia', desc: 'PIX DRA MARIANA PEDIATRA', irpf: true, fluxo: 'saida' },
  { id: 's2', data: d(1, 20), valor: 300, grupo: 'SAUDE', sub: 'Consulta', quem: 'Alex', desc: 'CONSULTA DERMATO', irpf: true, fluxo: 'saida' },
  { id: 's3', data: d(2, 5), valor: 120, grupo: 'SAUDE', sub: 'Exames', quem: 'Alex', desc: 'LABORATORIO FLEURY', irpf: true, fluxo: 'saida' },
  { id: 's4', data: d(2, 8), valor: 200, grupo: 'SAUDE', sub: 'Psicólogo', quem: 'Carla', desc: 'PIX PSICOLOGA ANA', irpf: true, fluxo: 'saida' },
  { id: 'm1', data: d(2, 9), valor: 50, grupo: 'PESSOAL', sub: 'Mercado', desc: 'mercado', fluxo: 'saida' } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-'));
  const ap = path.join(tmp, 'politica.pdf');
  fs.writeFileSync(ap, pdfCom(['Porto Seguro Saude - Plano Empresarial', 'Coparticipacao: nao', 'Tabela de reembolso por evento',
    'Consulta medica eletiva .......... R$ 180,00', 'Consulta pediatria ................ R$ 220,00', 'Exames laboratoriais .............. R$ 60,00',
    'Sessao de terapia ................. R$ 90,00', 'Odontologia: sem cobertura']));
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      const semToasts = () => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.gastos || []).length === 5 && window.Saude);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });
      const tp = await p.evaluate(() => Gasto.todos().map((g) => { const x = Saude.tipoDe(g); return x.tipo + '/' + x.esp; }));
      ok(tp.slice(0, 4).join() === 'consulta/pediatra,consulta/dermatologista,exame/,terapia/psicologo', 'tipo e especialidade sem IA: pediatra, dermato, exame, psicóloga');
      ok(await p.evaluate(() => Saude.estimar(Gasto.todos()[0])) === null, 'sem plano cadastrado, nada estimado');
      await p.evaluate(() => { irPara('b-custos'); custosAba = 'recorrentes'; render(); });
      ok(/Cadastre o plano de saúde/.test(await p.textContent('#view-b-custos')), 'Custos convida a cadastrar o plano');
      await p.evaluate(() => irPara('b-saude')); await p.waitForSelector('#view-b-saude');
      await p.waitForFunction(() => window.scrollY === 0);
      await semToasts(); await p.click('[data-acao="saude-novo"]'); await p.waitForSelector('#sdForm');
      /* ler a apólice */
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-acao="saude-apolice"]')]);
      await fc.setFiles([ap]);
      await p.waitForFunction(() => /Preenchido pela apólice/.test((document.getElementById('sdForm') || {}).textContent || ''));
      const f = await p.evaluate(() => ({ op: sdOp.value, cop: sdCop.checked, ree: sdRee.checked, c: sdT_consulta.value, e: sdT_exame.value, t: sdT_terapia.value, o: sdT_odonto.value, esp: sdEsp.value }));
      ok(f.op === 'Porto Saúde' && f.cop === false && f.ree === true, 'apólice: operadora Porto, sem coparticipação, com reembolso');
      ok(f.c === '180' && f.e === '60' && f.t === '90' && f.o === '', 'apólice: consulta 180, exame 60, terapia 90 (odonto sem valor)');
      ok(/pediatra = 220/.test(f.esp), 'apólice: pediatria 220 por especialidade');
      await p.fill('#sdMem', 'Bia, Alex'); await p.selectOption('#sdTit', 'PJ');
      await semToasts(); await p.click('[data-acao="saude-salvar"]');
      const pl = await p.evaluate(() => JSON.parse(JSON.stringify(Store.estado.saude_planos[0])));
      ok(pl.operadora === 'Porto Saúde' && pl.titular === 'PJ' && pl.membros.join() === 'Bia,Alex' && pl.reembolso && pl.esp.pediatra === 220 && !!pl.apolice, 'plano salvo, com a apólice guardada');
      const est = await p.evaluate(() => Gasto.todos().map((g) => { const e = Saude.estimar(g); return e ? e.volta + '/' + e.ir : '-'; }));
      ok(est.join() === '220/230,180/120,60/60,-,-', 'pediatra 450 → volta 220 (especialidade), IR 230; consulta 300 → 180/120; exame 120 → 60/60; Carla fora do plano; mercado não é saúde');
      ok(await p.evaluate((a) => JSON.stringify(Saude.doAno(a)), ANO) === JSON.stringify({ gasto: 1070, volta: 460, ir: 610, n: 4 }), 'no ano: R$ 1.070 de saúde, volta ~R$ 460, fica para o IR ~R$ 610 (Carla inteira)');
      ok(/Volta \(estimado\)\s*R\$\s?460,00/.test(await p.textContent('#view-b-saude')), 'tela do plano mostra o resumo do ano');
      await p.evaluate(() => { irPara('b-lanc'); bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; render(); });
      ok(/volta ~R\$\s?220,00 · IR R\$\s?230,00 \(estimado\)/.test(await p.textContent('#view-b-lanc')), 'Lançamentos: "↩ volta ~R$ 220,00 · IR R$ 230,00 (estimado)"');
      await p.evaluate(() => { abrirApp('tax'); irPara('t-deducoes'); });
      ok(/Saúde \d{4}: R\$\s?1\.070,00 · volta ~R\$\s?460,00 · fica para o IR ~R\$\s?610,00/.test(await p.textContent('#view-t-deducoes')), 'TaxONE → Deduções mostra saúde, reembolso e o que fica para o IR');
      /* sem reembolso: volta 0 */
      ok(await p.evaluate(() => { Store.estado.saude_planos[0].reembolso = false; const e = Saude.estimar(Gasto.todos()[0]); Store.estado.saude_planos[0].reembolso = true; return e.volta === 0 && e.ir === 450; }), 'plano sem reembolso: nada volta, os R$ 450 ficam para o IR');
      ok(await p.evaluate(() => { const r = Saude.lerApolice('Alice Saude\nEste plano nao possui reembolso\nConsulta R$ 100,00'); return r.operadora === 'Alice' && r.reembolso === false; }), 'modelo "sem reembolso" (Alice)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
