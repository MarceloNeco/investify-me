/* =====================================================================
   teste/teste-fatura-conferencia.js — 3.122: a conferência da fatura do cartão que o robô manda (modulos/fatura-conferencia.js).
   Dados FICTÍCIOS. Confere: a linha da fatura no 📥 com "💳 Conferência: 38 de 40 casados · 2 só na fatura · 1 só no banco · ⚠️ encargos";
   aberta: os encargos, o limite, as próximas faturas, o que está só na fatura e só no banco, a leitura incompleta e os avisos; o mesmo
   bloco no detalhe do lançamento que pagou a fatura; sem ficha de fatura, nada.
   Uso: node teste/teste-fatura-conferencia.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const FICHA = { lancamentos: Array.from({ length: 40 }, (_, i) => ({ data: '2026-10-' + ('0' + (i % 28 + 1)).slice(-2), descricao: 'COMPRA FICTICIA ' + i, valor: 10 + i })),
  multa_atraso: 0, juros_mora: 3.4, juros_rotativo: 0, iof_internacional: 1.25, limite_utilizado: 4200, proximas_faturas: [{ vencimento: '2026-12-10', valor: 900 }, { vencimento: '2027-01-10', valor: 650 }],
  conferencia: { casados: 38, lancamentos_na_fatura: 40, so_na_fatura: [{ data: '2026-10-12', descricao: 'LOJA SO NA FATURA', valor: 55.5 }, { data: '2026-10-20', descricao: 'OUTRA SO NA FATURA', valor: 12 }],
    so_no_banco: [{ data: '2026-10-25', descricao: 'SO NO BANCO FICT', valor: 30 }], leitura_completa: false, atencao: ['Uma compra internacional sem o câmbio no extrato'] } };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify({ v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [] }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-08T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.FaturaConf && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    await p.evaluate((f) => Comprovantes.receber({ id: 'cp-fat-1', subtipo: 'fatura', loja: 'Cartão Ficticio', valor: 1234.5, data: '2026-11-01', vencimento: '2026-11-10', ficha: f }), FICHA);

    console.log('1) no 📥');
    const inb = await p.evaluate(() => { const g = inboxGrupos().find((x) => x.id === 'comprovantes'); const d = document.createElement('div'); d.innerHTML = (g && g.html) || ''; const s = d.querySelector('.fcf summary'); const c = d.querySelector('.fcf-c'); return { s: s ? s.textContent : '', c: c ? c.textContent.replace(/\s+/g, ' ') : '' }; });
    ok(inb.s === '💳 Conferência: 38 de 40 casados · 2 só na fatura · 1 só no banco · ⚠️ encargos · ⚠️ leitura incompleta', 'a linha da fatura: "' + inb.s + '"');
    ok(/Encargos: juros de mora R\$\s?3,40 · IOF internacional R\$\s?1,25/.test(inb.c) && !/multa por atraso/.test(inb.c), 'aberta: os encargos (só os que têm valor)');
    ok(/Limite utilizado: R\$\s?4\.200,00/.test(inb.c) && /Próximas faturas: 10\/Dez R\$\s?900,00 · 10\/Jan R\$\s?650,00/.test(inb.c), 'o limite utilizado e as próximas faturas: ' + (inb.c.match(/Próximas[^Só]*/) || [''])[0]);
    ok(/Só na fatura \(não veio do banco\):.*12\/Out · LOJA SO NA FATURA · R\$\s?55,50/.test(inb.c) && /Só no banco \(não está na fatura\):.*SO NO BANCO FICT · R\$\s?30,00/.test(inb.c), 'o que está só na fatura e só no banco, com data, descrição e valor');
    ok(/A leitura do PDF não foi completa/.test(inb.c) && /⚠️ Uma compra internacional sem o câmbio no extrato/.test(inb.c), 'a leitura incompleta e os avisos do robô');

    console.log('2) no detalhe do lançamento que pagou a fatura');
    const det = await p.evaluate(() => { Gasto.add({ id: 'rb_fat', data: '2026-11-10', valor: 1234.5, desc: 'PAGTO FATURA FICT', fluxo: 'saida', grupo: 'OUTROS', sub: 'Pagamento de fatura', origem: 'robo' }); Comprovantes.ligarTudo();
      const d = document.createElement('div'); d.innerHTML = MoneyModulos.html('lancamento.form', { g: Gasto.todos().find((g) => g.id === 'rb_fat') }); return (d.querySelector('.fcf summary') || {}).textContent || ''; });
    ok(/38 de 40 casados/.test(det), 'o lançamento do pagamento mostra a mesma conferência: ' + det);
    ok(await p.evaluate(() => FaturaConf.de({ ficha: { consumo_kwh: 100 } }) === null && FaturaConf.bloco({}) === ''), 'sem ficha de fatura: nada');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
