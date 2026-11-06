/* =====================================================================
   teste/teste-parte14.js — 3.59: boleto lido como o app lê (PdfTexto/pdf.js), "já existe" só do mesmo tipo,
   iguais entre si ("2 iguais" + apagar o repetido) e a tela "Conferir o que foi lido" (390, 1366, 1920, com fotos)
   ---------------------------------------------------------------------
   Amostras: teste/amostras/boleto-matricula-pdfjs.txt (o texto EXATO do PdfTexto.extrair, dados fictícios) e
   teste/amostras/boleto-matricula-layout.txt (pdftotext -layout). As duas têm de dar 1.413 em 30/10/2026.
   Uso (na pasta raiz): node teste/teste-parte14.js        Fotos em <pasta temporária>/parte14-*.png
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const AMOSTRA = (n) => fs.readFileSync(path.join(__dirname, 'amostras', n), 'utf8');
const PDFJS = AMOSTRA('boleto-matricula-pdfjs.txt'), LAYOUT = AMOSTRA('boleto-matricula-layout.txt');
const SAIDA = fs.mkdtempSync(path.join(os.tmpdir(), 'parte14-'));

/* o contrato escolar e o do período ampliado: as mesmas tabelas literais do teste-contrato-fgts (uma fonte só; dados fictícios) */
const P13 = fs.readFileSync(path.join(__dirname, 'teste-contrato-fgts.js'), 'utf8');
const lista = (nome) => { const m = P13.match(new RegExp('const ' + nome + ' = (\\[[\\s\\S]*?\\]);')); return m ? eval(m[1]) : null; };   // eslint-disable-line no-eval

/* o que o dono tinha: a escola em dobro (uma "a confirmar" de 06/11), o ampliado em 2 semestres, o lanche, e o pagamento do robô */
const LOCAL = { v: 1, config: {}, posicoes: [],
  gastos: [{ id: 'rb', data: '2026-10-30', valor: 1413, grupo: 'DEPENDENTES', sub: 'Escola/Faculdade', desc: 'Pagamento de boleto ASSOC EXEMPLO ESCOLA', fluxo: 'saida' },
    { id: 'outro', data: '2026-10-20', valor: 1413.5, grupo: 'HABITACAO', sub: 'Energia', desc: 'LUZ', fluxo: 'saida' }],
  recorrentes: [
    { id: 'r-esc', nome: 'Escola Ana 2027', valor: 3067, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 10, desde: '2027-01-01', ate: '2027-12-31', irpf: true, criadoEm: '2026-10-01T10:00:00.000Z' },
    { id: 'r-esc2', nome: 'Escola Ana 2027', valor: 3067, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 10, desde: '2027-01-01', ate: '2027-12-31', irpf: true, aConfirmar: true, origem: 'contrato', criadoEm: '2026-11-06T10:00:00.000Z' },
    { id: 'r-a1', nome: 'Ampliado Ana 1º sem', valor: 1104, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 25, desde: '2027-02-01', ate: '2027-06-30' },
    { id: 'r-a2', nome: 'Ampliado Ana 2º sem', valor: 1104, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 25, desde: '2027-08-01', ate: '2027-12-31' },
    { id: 'r-lan', nome: 'Café Exemplo (lanche da escola)', valor: 300, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 5, desde: '2026-01-01', ate: '2027-12-31' }] };

(async () => {
  const ESCOLAR = lista('ESCOLAR'), AMPLIADO = lista('AMPLIADO');
  ok(Array.isArray(ESCOLAR) && Array.isArray(AMPLIADO), 'contratos de exemplo (teste-contrato-fgts) carregados');
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const abrirApp = async (vp) => {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 5 && window.CompromissoDe);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); });
    return { ctx, p };
  };
  try {
    console.log('1) boleto como o app lê (PdfTexto/pdf.js) e como o pdftotext -layout lê');
    const { ctx, p } = await abrirApp({ width: 1366, height: 768 });
    const lido = await p.evaluate((ts) => ts.map((t) => { const o = CompromissoDe.lerModelo(t); return o && [o.tipo, o.bruto, o.desconto, o.pagar, o.venc].join(); }), [PDFJS, LAYOUT]);
    ok(lido[0] === 'boleto,1534,121,1413,2026-10-30', 'amostra do PdfTexto: bruto 1.534, desconto 121, a pagar 1.413, vencimento 30/10/2026 (' + lido[0] + ')');
    ok(lido[1] === 'boleto,1534,121,1413,2026-10-30', 'amostra do pdftotext -layout continua igual (' + lido[1] + ')');
    const g = await p.evaluate((ts) => { const q = CompromissoDe.planoModelo(ts.map((t) => CompromissoDe.lerModelo(t))); return { v: q.gasto.valor, d: q.gasto.data, c: q.gasto.confira, ja: q.gasto.jaLancado && q.gasto.jaLancado.id }; }, [ESCOLAR.join('\n'), PDFJS]);
    ok(g.v === 1413 && g.d === '2026-10-30' && !g.c, 'contrato + boleto do PdfTexto: 1ª parcela R$ 1.413 em 30/10/2026, sem o aviso "confira o valor" (' + JSON.stringify(g) + ')');
    ok(g.ja === 'rb', '"já está no livro": acha o pagamento REAL do robô (30/10, R$ 1.413, "Pagamento de boleto … ESCOLA") (' + g.ja + ')');
    console.log('2) "já existe": só o mesmo tipo, iguais agrupados');
    const ja = await p.evaluate((ts) => { const q = CompromissoDe.planoModelo(ts.map((t) => CompromissoDe.lerModelo(t)));
      return q.itens.map((it) => { const l = CompromissoDe.jaExistem(it.semente(it.escolhida >= 0 ? it.escolhida : 0)); return { ids: l.map((r) => r.id).sort().join('+'), g: CompromissoDe.agrupar(l).map((g) => g.r.id + (g.iguais.length ? '=' + g.iguais.map((x) => x.id).join('') : '')).join(' ') }; }); },
      [ESCOLAR.join('\n'), AMPLIADO.join('\n'), PDFJS]);
    ok(ja[0].ids === 'r-esc+r-esc2' && ja[1].ids === 'r-a1+r-a2', 'mensalidade × mensalidade e ampliado × ampliado; o lanche da escola nunca entra (' + JSON.stringify(ja) + ')');
    ok(ja[0].g === 'r-esc=r-esc2' && ja[1].g === 'r-a1 r-a2', 'as 2 escolas iguais viram um grupo e o repetido é a "a confirmar"; os 2 semestres do ampliado não são iguais (' + ja.map((x) => x.g).join(' | ') + ')');
    ok(await p.evaluate(() => ['Calu Café (lanche da escola)', 'Cantina', 'Uniforme escolar'].every((n) => CompromissoDe.tipoComp(n) === 'outro') && CompromissoDe.tipoComp('Escola Ana 2027') === 'escolar' && CompromissoDe.tipoComp('Período ampliado Ana 2027') === 'ampliado'), 'lanche, cantina e uniforme são de outro tipo');
    await ctx.close();

    console.log('3) a tela "Conferir o que foi lido"');
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
      const { ctx: c2, p: q } = await abrirApp(vp);
      const abrirTela = () => q.evaluate((ts) => { CompromissoDe.mostrarPlano(CompromissoDe.planoModelo(ts.map((t) => CompromissoDe.lerModelo(t)))); }, [ESCOLAR.join('\n'), AMPLIADO.join('\n'), PDFJS]);
      await abrirTela(); await q.waitForSelector('#genModal:not(.hidden) .cdl-tela');
      const t = await q.evaluate(() => {
        const corpo = document.getElementById('genBody'), m = { width: document.querySelector('#genModal .modal').offsetWidth };   /* offsetWidth: sem a animação de abrir */
        const secs = [...corpo.querySelectorAll('.cdl-sec')].map((e) => e.getBoundingClientRect());
        const linhas = [...corpo.querySelectorAll('.cdl-ja-linha')].map((li) => li.closest('.cdl-item').dataset.k + ':' + li.querySelector('.cdl-ja-txt').textContent + (li.querySelector('.cdl-iguais') ? ' [' + li.querySelector('.cdl-iguais').textContent + ']' : ''));
        return { titulo: document.getElementById('genTitle').textContent, tits: [...corpo.querySelectorAll('.cdl-tit')].map((e) => e.textContent), ps: corpo.querySelectorAll('p').length,
          W: innerWidth, mw: Math.round(m.width), ladoALado: secs.some((r, i) => secs.some((o, j) => j !== i && Math.abs(o.top - r.top) < 2)), sobra: corpo.scrollWidth - corpo.clientWidth,
          linhas, apagar: corpo.querySelectorAll('.cdl-apagar').length, seg: [...corpo.querySelectorAll('.cdl-item[data-k="0"] .cdl-pil span')].map((e) => e.textContent).join('|'),
          cks: [...corpo.querySelectorAll('.cdl-cab input[type=checkbox]')].map((e) => e.checked), radioGrande: [...corpo.querySelectorAll('.cdl-pil')].some((e) => e.offsetHeight > 40), cortado: [...corpo.querySelectorAll('.cdl-pil span')].some((e) => e.scrollWidth > e.clientWidth + 1) };
      });
      const nome = vp.width + 'px';
      ok(t.titulo === 'Conferir o que foi lido' && t.ps <= 1, nome + ': título "Conferir o que foi lido" e no máximo uma linha de texto no topo (' + t.ps + ' parágrafo)');
      ok(/^Mensalidades 2027 · \d+ × R\$ [\d.,]+ · dia \d+$/.test(t.tits[0]) && t.tits[1] === 'Período ampliado 2027' && /^Matrícula 2027 \(1ª parcela\) · R\$ 1\.413,00 · 30\/10$/.test(t.tits[2]), nome + ': cabeçalhos claros com checkbox: ' + t.tits.join(' | '));
      ok(t.linhas.length === 3 && /^0:Escola Ana 2027 · R\$ 3\.067,00 · dia 10 · ativo \[2 iguais\]$/.test(t.linhas[0]) && t.linhas.filter((x) => /^1:Ampliado Ana [12]º sem/.test(x)).length === 2 && !t.linhas.some((x) => /lanche|Café/i.test(x)),
        nome + ': "já existe" compacto, uma linha por existente, cada um uma vez, sem o lanche (' + t.linhas.join(' | ') + ')');
      ok(t.apagar === 1 && t.seg === 'Manter|Atualizar este|Criar novo|Apagar o repetido' && !t.radioGrande && !t.cortado, nome + ': botões segmentados (sem cortar o texto) Manter · Atualizar este · Criar novo, e "Apagar o repetido" nas 2 iguais (' + t.seg + ')');
      ok(t.cks.join() === 'false,false,false', nome + ': o que já existe (ou já está no livro) vem desmarcado');
      ok(t.sobra <= 1, nome + ': sem rolagem para o lado dentro da janela');
      if (vp.width >= 1024) ok(t.mw >= Math.min(960, t.W * 0.92) - 2 && t.ladoALado, nome + ': usa a largura (' + t.mw + ' px) com seções lado a lado');
      await q.screenshot({ path: path.join(SAIDA, 'parte14-' + vp.width + '.png') });
      if (vp.width === 1366) {
        /* teclado: "Criar novo" pelo espaço marca a seção; "Manter" desmarca */
        await q.focus('#genBody input[name="cdlJa0"][value="criar"]'); await q.keyboard.press('Space');
        ok(await q.evaluate(() => document.querySelector('.cdl-item[data-k="0"] .cdl-criar').checked), 'teclado: "Criar novo" (espaço) marca a seção');
        await q.check('#genBody input[name="cdlJa0"][value=""]');
        ok(await q.evaluate(() => !document.querySelector('.cdl-item[data-k="0"] .cdl-criar').checked), '"Manter" desmarca a seção');
        /* apagar o repetido e manter o resto */
        await q.check('#genBody .cdl-apagar'); await q.selectOption('#genBody .cdl-item[data-k="1"] .cdl-op', '1'); await q.check('#genBody input[name="cdlJa1"][value=""]');
        const n0 = await q.evaluate(() => Store.estado.recorrentes.length);
        await q.click('#genBody [data-acao="cdl-criar"]'); await q.waitForFunction(() => document.getElementById('genModal').classList.contains('hidden'));
        const d1 = await q.evaluate(() => ({ n: Store.estado.recorrentes.length, fica: !!Recorrente.achar('r-esc'), saiu: !Recorrente.achar('r-esc2'), g: Store.estado.gastos.length }));
        ok(d1.n === n0 - 1 && d1.fica && d1.saiu && d1.g === 2, 'Criar com "Apagar o repetido": sai a escola "a confirmar", fica a outra; nada mais muda (' + JSON.stringify(d1) + ')');
        await q.click('#toasts .cdl-desfazer button');
        ok(await q.evaluate((n) => Store.estado.recorrentes.length === n && !!Recorrente.achar('r-esc2'), n0), 'Desfazer devolve o repetido apagado');
        /* atualizar este */
        await abrirTela(); await q.waitForSelector('#genModal:not(.hidden) .cdl-tela');
        await q.check('#genBody input[name="cdlJa0"][value="r-esc"]'); await q.selectOption('#genBody .cdl-item[data-k="1"] .cdl-op', 'nao');
        await q.click('#genBody [data-acao="cdl-criar"]'); await q.waitForFunction(() => document.getElementById('genModal').classList.contains('hidden'));
        ok(await q.evaluate((n) => Store.estado.recorrentes.length === n && Recorrente.achar('r-esc').aConfirmar === true, n0), '"Atualizar este": atualiza a escola existente (a confirmar), sem criar outra');
        /* inglês */
        await q.evaluate(() => { I18n.atual = 'en'; }); await abrirTela(); await q.waitForSelector('#genModal:not(.hidden) .cdl-tela');
        const en = await q.evaluate(() => [document.getElementById('genTitle').textContent, ...[...document.querySelectorAll('#genBody .cdl-tit')].map((e) => e.textContent), [...document.querySelectorAll('#genBody .cdl-item[data-k="0"] .cdl-pil span')].map((e) => e.textContent).join('|')]);
        ok(en[0] === 'Check what was read' && /^Monthly fees 2027/.test(en[1]) && en[2] === 'Extended day 2027' && /^Enrolment 2027 \(1st instalment\)/.test(en[3]) && /^Keep\|Update this\|Create new/.test(en[4]), 'em inglês: ' + en.join(' | '));
        await q.screenshot({ path: path.join(SAIDA, 'parte14-1366-en.png') });
      }
      ok(q.erros.length === 0, nome + ': sem erro de página' + (q.erros.length ? ': ' + q.erros.join(' | ') : ''));
      await c2.close();
    }
  } catch (e) { falhas++; console.error('ERRO NO TESTE:', e); }
  finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s). Fotos em ' + SAIDA);
  process.exit(falhas ? 1 : 0);
})();
