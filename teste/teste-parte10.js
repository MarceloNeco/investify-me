/* =====================================================================
   teste/teste-parte10.js — 3.46: assinaturas (N29 b), compromisso de lançamento e de contrato PDF,
   época do ano e boleto em PDF (N28) (Chromium headless, Playwright, "só neste aparelho")
   Uso (na pasta raiz): node teste/teste-parte10.js
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
const mais = (n) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return iso(d); };
/* 14 meses de conta de luz, janeiro mais caro */
const gastos = [];
for (let k = 1; k <= 14; k++) { const d = new Date(ANO, hoje.getMonth() - k, 15); gastos.push({ id: 'e' + k, data: iso(d), valor: d.getMonth() === 0 ? 600 : 400, grupo: 'HABITACAO', sub: 'Energia', desc: 'ENEL', fluxo: 'saida' }); }
gastos.push({ id: 'gx', data: mais(-2), valor: 89.9, grupo: 'PESSOAL', sub: 'Academia', desc: 'SMARTFIT MENSALIDADE', quem: 'Alex', fluxo: 'saida' });
const vEnergia = new Date(ANO, hoje.getMonth() + 1, 15);
const LOCAL = { v: 1, posicoes: [], config: {}, gastos, recorrentes: [
  { id: 'r-yt', nome: 'YouTube Premium', valor: 26.9, grupo: 'LAZER', sub: 'Assinaturas', regra: 'dia', dia: 3 },
  { id: 'r-luz', nome: 'Conta de luz', valor: 430, grupo: 'HABITACAO', sub: 'Energia', regra: 'dia', dia: 15, varia: true } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p10-'));
  const contrato = path.join(tmp, 'contrato.pdf');
  fs.writeFileSync(contrato, pdfCom(['COLEGIO EXEMPLO', 'Contrato de prestacao de servicos educacionais - ano letivo de ' + (ANO + 1), 'Aluno: Bia Souza',
    'Anuidade R$ 36.000,00 em 12 parcelas de R$ 3.000,00', 'Vencimento todo dia 05 de cada mes', 'Matricula R$ 3.000,00']));
  const boleto = path.join(tmp, 'boleto.pdf');
  fs.writeFileSync(boleto, pdfCom(['Beneficiario: ENEL DISTRIBUICAO SAO PAULO CNPJ 61.695.227/0001-93', 'Vencimento ' + iso(vEnergia).split('-').reverse().join('/'), 'Valor do documento 412,37']));
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      const semToasts = () => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 2 && window.Previsto);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); custosAba = 'recorrentes'; render(); });

      console.log(' assinaturas');
      const c = await p.evaluate(() => Assinaturas.comparar(26.9, 269));
      ok(c.anoMensal === 322.8 && c.economia === 53.8 && c.pct === 17 && c.melhor === 'anual', 'anual R$ 269 × mensal R$ 26,90 = R$ 322,80/ano: o anual economiza R$ 53,80 (17%)');
      ok(await p.evaluate(() => Assinaturas.proxima({ renova: '2025-01-10', plano: 'anual' }, '2026-11-06')) === '2027-01-10' && await p.evaluate(() => Assinaturas.proxima({ renova: '2026-10-31', plano: 'mensal' }, '2026-11-06')) === '2026-11-30', 'passada a data, a próxima renovação é calculada (anual +1 ano; mensal +1 mês, 31/10 → 30/11)');
      await p.evaluate(() => abrirRecorrente('r-yt', null, { abrirMais: true })); await p.waitForSelector('#asLiga');
      ok(await p.isChecked('#asLiga'), 'YouTube Premium já vem marcado "É uma assinatura"');
      await p.selectOption('#asPlano', 'anual');
      const ren = mais(10);
      await p.fill('#asRenovaTxt', ren.split('-').reverse().join('/')); await p.press('#asRenovaTxt', 'Tab');
      await p.fill('#asMensal', '26.90'); await p.fill('#asAnual', '269');
      ok(/o anual sai R\$\s?53,80 \(17%\) mais barato/.test(await p.textContent('#asComp')), 'a comparação aparece enquanto digita');
      await semToasts(); await p.click('#assetModal [data-acao="rec-salvar"]');
      ok(await p.evaluate(() => JSON.stringify(Store.estado.assinaturas)) === JSON.stringify([{ id: 'r-yt', plano: 'anual', renova: ren, precoMensal: 26.9, precoAnual: 269 }]), 'salvo: anual, renova ' + ren + ', os dois preços');
      ok(/Assinatura renova: YouTube Premium \(anual\)/.test(await p.textContent('#view-b-custos')), 'Custos avisa antes de renovar (anual: 30 dias antes)');
      ok(/📺 anual · renova/.test(await p.textContent('#view-b-custos')), 'a linha do compromisso mostra "📺 anual · renova …"');

      console.log(' compromisso a partir de lançamento e de contrato');
      await p.evaluate(() => { irPara('b-lanc'); bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; render(); abrirLancamento('gx'); });
      await p.waitForSelector('#assetModal [data-acao="cdl-lanc"]');
      await semToasts(); await p.click('#assetModal [data-acao="cdl-lanc"]'); await p.waitForSelector('#assetModal #rcNome');
      const fl = await p.evaluate(() => lerFormRecorrente());
      ok(fl.nome === 'SMARTFIT MENSALIDADE' && fl.valor === 89.9 && fl.grupo === 'PESSOAL' && fl.sub === 'Academia' && fl.quem === 'Alex' && fl.dia === Number(mais(-2).slice(8)), '"Virar compromisso" abre o formulário preenchido pelo lançamento');
      await p.click('#assetModal .f-actions [data-close="assetModal"]');
      ok(await p.evaluate((a) => { const k = CompromissoDe.lerContrato('COLEGIO EXEMPLO\nano letivo de ' + a + '\nAluno: Bia Souza\nAnuidade R$ 36.000,00 em 12 parcelas de R$ 3.000,00\nVencimento todo dia 05\nMatricula R$ 3.000,00'); return [k.escola, k.aluno, k.ano, k.parcelas, k.parcela, k.dia, k.anuidade, k.matricula].join('|'); }, ANO + 1) === 'Colegio Exemplo|Bia|' + (ANO + 1) + '|12|3000|5|36000|3000', 'lê o contrato por modelo: escola, aluno, ano, 12 × R$ 3.000, dia 5, anuidade e matrícula');
      ok(await p.evaluate(() => { const s2 = CompromissoDe.sementeContrato({ ano: 2027, parcelas: 11, parcela: 3000, dia: 5, aluno: 'Bia' }); return s2.desde + '|' + s2.ate; }) === '2027-02-01|2027-12-31', '11 parcelas: de fevereiro a dezembro');
      await p.evaluate(() => { irPara('b-custos'); }); await p.waitForFunction(() => window.scrollY === 0);
      await semToasts();
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-b-custos [data-acao="cf-adicionar"]').then(() => p.click('#genBody [data-acao="cdl-contrato"]'))]);   /* 3.76: "+ Adicionar" */
      await fc.setFiles(contrato); await p.waitForSelector('#assetModal:not(.hidden) #rcNome');
      const fc2 = await p.evaluate(() => lerFormRecorrente());
      ok(fc2.nome === 'Escola Bia ' + (ANO + 1) && fc2.valor === 3000 && fc2.dia === 5 && fc2.grupo === 'DEPENDENTES' && fc2.quem === 'Bia' && fc2.irpf && fc2.desde === (ANO + 1) + '-01-01' && fc2.ate === (ANO + 1) + '-12-31' && /Exemplo/.test(fc2.obs), 'contrato PDF → "Novo compromisso" preenchido (Escola Bia ' + (ANO + 1) + ', R$ 3.000, dia 5, jan–dez, IR)');
      ok(await p.evaluate(() => (Store.estado.arquivos || []).some((a) => a.tipo === 'contrato')), 'o PDF do contrato fica guardado');
      await p.click('#assetModal .f-actions [data-close="assetModal"]');

      console.log(' época do ano e boleto (N28)');
      const pw = await p.evaluate(() => Previsto.pesos(Recorrente.achar('r-luz')));
      ok(pw && pw.n >= 12 && pw.pesos[1] > 1.3 && pw.pesos[6] < 1, 'com 14 meses: janeiro pesa mais (' + (pw && pw.pesos[1]) + ')');
      await p.evaluate(() => abrirRecorrente('r-luz', null, { abrirMais: true })); await p.waitForSelector('#pvSaz');
      await p.check('#pvSaz'); await semToasts(); await p.click('#assetModal [data-acao="rec-salvar"]');
      const oJan = await p.evaluate((a) => { const o = Recorrente.ocorrencia(Recorrente.achar('r-luz'), a + '-01-15'); return { v: o.valor, f: o.previstoFonte, h: linhaOcorrencia(o) }; }, ANO + 1);
      ok(oJan.f === 'sazonal' && oJan.v > 430 * 1.3 && /previsto pela época do ano/.test(oJan.h), 'janeiro que vem: previsto pela época do ano (R$ ' + oJan.v + ')');
      ok(await p.evaluate(() => { const r = Previsto.linhaDigitavel('34191090012345678901234567890127' + '7' + '1000' + '0000041237'); return r.valor === 412.37 && r.venc === '2025-02-22'; }), 'linha digitável: valor nos 10 últimos e vencimento pelo fator (fator 1000 = 22/02/2025)');
      await semToasts();
      const [fc3] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-b-custos [data-acao="cf-adicionar"]').then(() => p.click('#genBody [data-acao="prev-boleto"]'))]);   /* 3.76: "+ Adicionar" */
      await fc3.setFiles(boleto); await p.waitForSelector('#genModal:not(.hidden) #pvOc');
      ok(await p.inputValue('#pvValor') === '412.37' && /Conta de luz/.test(await p.$eval('#pvOc', (s) => s.options[s.selectedIndex].text)), 'boleto lido: R$ 412,37 e proposto para a "Conta de luz" do vencimento');
      await semToasts(); await p.click('[data-acao="prev-boleto-ok"]');
      const oB = await p.evaluate((d) => { const o = Recorrente.ocorrencia(Recorrente.achar('r-luz'), d); return { v: o.valor, f: o.previstoFonte, real: o.realizado }; }, iso(vEnergia));
      ok(oB.v === 412.37 && oB.f === 'boleto' && !oB.real, 'o boleto vira o previsto daquele mês (ainda não é o realizado)');
      ok(await p.evaluate((d) => { Pagamento.marcar('r-luz', d, 'confirmado', { valor: 415 }); return Recorrente.ocorrencia(Recorrente.achar('r-luz'), d).valor; }, iso(vEnergia)) === 415, 'o pagamento de verdade ainda ganha do boleto');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
