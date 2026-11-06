/* =====================================================================
   teste/teste-parte6.js — 3.42: N37 agendamentos que vencem + N40 NF pendente e pasta do IR
   (Chromium headless, Playwright, modo "só neste aparelho"; a parte da nuvem está em teste-nuvem.js)
   Uso (na pasta raiz): node teste/teste-parte6.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ANO = hoje.getFullYear();
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const mais = (n) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return iso(d); };
const dataG = mais(-3);
/* um PDF de verdade, com texto (como a NF eletrônica), feito aqui mesmo */
function pdfCom(texto) {
  const conteudo = 'BT /F1 12 Tf 50 750 Td (' + texto + ') Tj ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + conteudo.length + ' >>\nstream\n' + conteudo + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n', offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const x = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}
const LOCAL = { v: 1, posicoes: [], config: {}, gastos: [
  { id: 'gd1', data: dataG, valor: 350, grupo: 'SAUDE', sub: 'Dentista', quem: 'Ana', desc: 'PIX CLINICA ODONTO SORRISO', irpf: true, fluxo: 'saida' },
  { id: 'gp1', data: mais(-10), valor: 420, grupo: 'SAUDE', sub: 'Pediatra', quem: 'Ana', desc: 'PIX DRA PEDIATRA', irpf: true, fluxo: 'saida' },
  { id: 'gm1', data: mais(-5), valor: 80, grupo: 'PESSOAL', sub: 'Mercado', desc: 'mercado', fluxo: 'saida' } ],
  recorrentes: [{ id: 'r-ted', nome: 'TED Caixa', valor: 700, grupo: 'HABITACAO', sub: 'Aluguel', regra: 'dia', dia: 10, estadoPadrao: 'agendado' }] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
  const nf1 = path.join(tmp, 'nota-123.pdf'); fs.writeFileSync(nf1, pdfCom('NFS-e Clinica Odonto Sorriso Valor total R$ 350,00 Emissao ' + dataG.split('-').reverse().join('/')));
  const inf = path.join(tmp, 'informe empresa.pdf'); fs.writeFileSync(inf, pdfCom('Informe de rendimentos'));
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block', acceptDownloads: true });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));   /* tutorial visto: o AssistONE não se apresenta por cima dos botões */
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      /* avisos (toasts) por cima dos botões: tira antes de cada toque */
      const semJanelas = () => p.evaluate(() => { document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode && e.parentNode.removeChild(e)); });
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.gastos || []).length === 3 && window.NfIr);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });

      console.log(' N37 agendamentos');
      ok(await p.evaluate(() => [Agendamentos.maisMeses('2026-01-31', 1), Agendamentos.maisMeses('2026-11-30', 12), Agendamentos.maisMeses('2024-02-29', 12)].join()) === '2026-02-28,2027-11-30,2025-02-28', 'somar meses respeita o fim do mês (31/01 + 1 = 28/02)');
      await p.evaluate(() => { irPara('b-custos'); custosAba = 'recorrentes'; render(); abrirRecorrente('r-ted', null, { abrirMais: true }); });
      await p.waitForSelector('#agBox');
      ok(await p.isVisible('#agBox'), '"Agendado no banco": aparece "o agendamento vale até"');
      await p.click('#assetModalBody input[name="rcEstadoR"][value="pendente"]');
      ok(!(await p.isVisible('#agBox')), 'trocar para "Eu pago" esconde o campo');
      await p.click('#assetModalBody input[name="rcEstadoR"][value="agendado"]');
      const ate = mais(20);
      await p.fill('#agAteTxt', ate.split('-').reverse().join('/')); await p.press('#agAteTxt', 'Tab');
      await p.click('#assetModal [data-acao="rec-salvar"]');
      const reg = await p.evaluate(() => JSON.parse(JSON.stringify(Store.estado.agendamentos || [])));
      ok(reg.length === 1 && reg[0].id === 'r-ted' && reg[0].ate === ate && reg[0].ciclo === 12, 'salvo: vale até ' + ate + ', renova a cada 12 meses');
      await p.waitForSelector('.ag-aviso');
      ok(/Renovar o agendamento: TED Caixa/.test(await p.textContent('.ag-aviso')), 'Custos avisa "Renovar o agendamento" (falta menos de 1 mês)');
      ok(await p.evaluate(() => MoneyModulos.itens('fita.budget').some((a) => /Renovar o agendamento/.test(a.texto))), 'e a fita do BudgetONE também');
      ok(/agendado até/.test(await p.textContent('#view-b-custos')), 'a linha do compromisso mostra "agendado até"');
      await semJanelas();
      await p.click('.ag-aviso [data-acao="agend-renovei"]');
      const reg2 = await p.evaluate(() => JSON.parse(JSON.stringify(Store.estado.agendamentos[0])));
      ok(reg2.ate === await p.evaluate((a) => Agendamentos.maisMeses(a, 12), ate) && reg2.renovadoEm, '"Renovei" empurra 12 meses');
      ok(!(await p.$('.ag-aviso')), 'e o aviso some');

      console.log(' N40 NF pendente e pasta do IR');
      ok(await p.evaluate(() => [NfIr.estado(Gasto.todos().find((g) => g.id === 'gd1')), NfIr.estado(Gasto.todos().find((g) => g.id === 'gm1'))].join()) === 'aguardando,', 'gasto com IR nasce "NF aguardando"; gasto sem IR não tem NF');
      ok(await p.evaluate(() => NfIr.nomeArquivo(Gasto.todos().find((g) => g.id === 'gd1'))) === dataG + ' Dentista Ana.pdf', 'nome do arquivo: "' + dataG + ' Dentista Ana.pdf"');
      await p.evaluate(() => { irPara('b-lanc'); bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; render(); });
      ok(/2 notas fiscais faltando/.test(await p.textContent('#view-b-lanc .nf-topo')), 'Lançamentos: "2 notas fiscais faltando"');
      ok((await p.$$('#view-b-lanc .nf-falta')).length === 2, 'as duas linhas mostram "🧾 NF aguardando"');
      await semJanelas();
      await p.click('#view-b-lanc .nf-topo');
      await p.waitForSelector('#view-b-nfs');
      await p.waitForFunction(() => window.scrollY === 0);   /* irPara rola suave até o topo: espera parar antes de tocar */
      ok(/Dentista · Ana/.test(await p.textContent('#view-b-nfs')) && /Pediatra · Ana/.test(await p.textContent('#view-b-nfs')), 'tela "NFs que faltam", por profissional');
      /* subir o PDF: o app lê, propõe o gasto e guarda */
      await semJanelas();
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-b-nfs [data-acao="nf-subir"]')]);
      await fc.setFiles([nf1]);
      await p.waitForSelector('#genModal:not(.hidden) .nf-sel');
      ok(await p.inputValue('#genBody .nf-sel') === 'gd1', 'o PDF (R$ 350,00, data e "Odonto Sorriso") foi ligado sozinho ao gasto do dentista');
      await p.click('#genBody [data-acao="nf-guardar"]');
      await p.waitForFunction(() => (Store.estado.arquivos || []).length === 1);
      const arq = await p.evaluate(() => JSON.parse(JSON.stringify(Store.estado.arquivos[0])));
      ok(arq.nome === dataG + ' Dentista Ana.pdf' && arq.tipo === 'nf' && arq.ano === ANO && arq.ligado === 'gd1' && !arq.nuvem, 'guardado na Pasta do IR ' + ANO + ' como "' + arq.nome + '"');
      ok(await p.evaluate(() => NfIr.estado(Gasto.todos().find((g) => g.id === 'gd1'))) === 'recebida', 'e a NF do dentista deu baixa');
      ok(await p.evaluate(() => JSON.stringify(localStorage).indexOf('NFS-e') < 0), 'os bytes do PDF não vão para o localStorage (ficam no IndexedDB)');
      /* recebi sem arquivo */
      await p.evaluate(() => render());
      await semJanelas();
      await p.click('#view-b-nfs [data-acao="nf-recebi"][data-id="gp1"]');
      ok(await p.evaluate(() => NfIr.faltam().length) === 0 && /Nenhuma NF faltando/.test(await p.textContent('#view-b-nfs')), '"Recebi" com um toque: nada mais faltando');
      /* pasta do IR */
      await p.evaluate(() => { abrirApp('tax'); irPara('t-deducoes'); });
      ok(/Pasta do IR \d{4}: 1 arquivo/.test(await p.textContent('#view-t-deducoes')), 'TaxONE → Deduções mostra "Pasta do IR"');
      await p.evaluate(() => irPara('t-pasta-ir'));
      await p.waitForSelector('#view-t-pasta-ir');
      await p.waitForFunction(() => window.scrollY === 0);
      ok((await p.textContent('#view-t-pasta-ir')).includes(dataG + ' Dentista Ana.pdf'), 'a pasta lista a NF');
      await semJanelas();
      const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-t-pasta-ir [data-acao="ir-subir"][data-tipo="informe"]')]);
      await fc2.setFiles([inf]);
      await p.waitForFunction(() => (Store.estado.arquivos || []).length === 2);
      ok(/Informes de rendimentos/.test(await p.textContent('#view-t-pasta-ir')) && /Informe informe empresa\.pdf/.test(await p.textContent('#view-t-pasta-ir')), 'informe de rendimentos guardado na mesma pasta');
      await semJanelas();
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#view-t-pasta-ir tr[data-acao="ir-baixar"] >> nth=0')]);
      const dlPath = await dl.path();
      ok(/\.pdf$/.test(dl.suggestedFilename()) && fs.readFileSync(dlPath).slice(0, 5).toString() === '%PDF-', 'baixar entrega o PDF inteiro, com o nome guardado (' + dl.suggestedFilename() + ')');
      await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.arquivos || []).length === 2 && window.ArquivosFamilia);
      ok(await p.evaluate(async () => { const b2 = await ArquivosFamilia.ler(Store.estado.arquivos[0].id); return b2 && b2.length > 100; }), 'depois de recarregar, o arquivo continua no aparelho');
      ok(await p.evaluate(() => NfIr.propor(NfIr.lerPdf('Total 1.234,56 em 05/11/2026 Dra Fulana Pediatria'), 'x.pdf', [{ id: 'a', valor: 1234.56, data: '2026-11-04', sub: 'Pediatra', desc: 'FULANA' }, { id: 'b', valor: 99, data: '2026-01-01', sub: 'Outro' }])[0].g.id) === 'a', 'proposta sem IA: valor igual + data perto + nome');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(await p.evaluate(() => { abrirApp('tax'); irPara('t-pasta-ir'); return AssistOne.html('').includes('📍 Pasta do IR'); }), 'o AssistONE chama a tela pelo nome (Pasta do IR), não pelo código');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
