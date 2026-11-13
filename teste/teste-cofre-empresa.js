/* =====================================================================
   teste/teste-cofre-empresa.js — 3.77: TaxONE, o "Cofre da empresa" (modulos/cofre-empresa.js). Dados FICTÍCIOS.
   Confere: o menu do TaxONE tem a tela; cadastrar com CNPJ, razão, regime, contador, contas da PJ e Pix; CNPJ errado
   não passa; anexar o cartão CNPJ (arquivo guardado no cofre de arquivos, ligado à empresa) e um alvará com validade
   perto → lembrete no 📥 e "ok, entendi" tira; a coleção fica no cofre reservado; visão da casa não vê; sem senha.
   Uso: node teste/teste-cofre-empresa.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'em-'));
  const cartao = path.join(tmp, 'cartao-cnpj.pdf'), alvara = path.join(tmp, 'alvara.pdf');
  fs.writeFileSync(cartao, '%PDF-1.4\n% cartao cnpj ficticio\n%%EOF\n'); fs.writeFileSync(alvara, '%PDF-1.4\n% alvara ficticio\n%%EOF\n');
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof CofreEmpresa !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('tax'); irPara('t-empresa'); render(); });

    console.log('1) a tela no TaxONE');
    ok(await p.evaluate(() => ABAS.tax.some((a) => a.v === 't-empresa') && appDaView('t-empresa') === 'tax' && /Cofre da empresa/.test(document.querySelector('#view-t-empresa, .view:not(.hidden)').innerText)), 'menu do TaxONE: "Cofre da empresa"; a tela abre');

    console.log('2) cadastrar');
    await p.click('[data-acao="em-editar"]'); await p.waitForSelector('#genModal:not(.hidden) #emCnpj');
    ok(await p.evaluate(() => !/senha|password/i.test(document.getElementById('genBody').querySelectorAll('input,textarea,select').length ? Array.from(document.querySelectorAll('#genBody input,#genBody textarea,#genBody select')).map((x) => x.id + ' ' + x.className + ' ' + (x.placeholder || '')).join(' ') : 'x')), 'nenhum campo de senha no formulário');
    await p.fill('#emCnpj', '11.222.333/0001-80'); await p.fill('#emRazao', 'Empresa Exemplo Ltda');
    await p.click('[data-acao="em-salvar"]');
    ok(await p.evaluate(() => CofreEmpresa.lista().length === 0), 'CNPJ que não confere não passa');
    await p.fill('#emCnpj', '11.222.333/0001-81'); await p.selectOption('#emRegime', 'fator-r');
    await p.fill('#emContNome', 'Contador Fictício'); await p.fill('#emContContato', 'contador@exemplo.com');
    await p.fill('#emContas .em-conta:nth-child(1) .em-banco', 'Banco Modelo'); await p.fill('#emContas .em-conta:nth-child(1) .em-ag', '0001'); await p.fill('#emContas .em-conta:nth-child(1) .em-cc', '12345-6');
    await p.click('[data-acao="em-mais-conta"]');
    await p.fill('#emContas .em-conta:nth-child(2) .em-banco', 'Banco Beta'); await p.fill('#emContas .em-conta:nth-child(2) .em-cc', '999-0');
    await p.fill('#emPix', '11222333000181\nfinanceiro@exemplo.com');
    await p.click('[data-acao="em-salvar"]');
    const e2 = await p.evaluate(() => CofreEmpresa.lista()[0]);
    ok(e2 && e2.cnpj === '11222333000181' && e2.razao === 'Empresa Exemplo Ltda' && e2.regime === 'fator-r' && e2.contador.nome === 'Contador Fictício' && e2.contas.length === 2 && e2.contas[0].agencia === '0001' && e2.pix.length === 2,
      'guardou CNPJ, razão, regime (Fator R), contador, 2 contas da PJ e 2 chaves Pix: ' + JSON.stringify(e2));
    const t2 = await p.evaluate(() => document.querySelector('.em-card').innerText);
    ok(/11\.222\.333\/0001-81/.test(t2) && /Simples com Fator R/.test(t2) && /Banco Modelo · ag\. 0001 · conta 12345-6/.test(t2), 'o cartão da empresa mostra tudo');

    console.log('3) documentos');
    await p.click('.em-card [data-acao="em-doc"]'); await p.waitForSelector('#genModal:not(.hidden) #emDocArq');
    ok(await p.inputValue('#emDocTipo') === 'cartao-cnpj', 'o primeiro proposto é o cartão CNPJ');
    await p.setInputFiles('#emDocArq', cartao); await p.click('[data-acao="em-doc-salvar"]');
    await p.waitForFunction(() => (CofreEmpresa.lista()[0].docs || []).length === 1);
    const d3 = await p.evaluate(() => { const d = CofreEmpresa.lista()[0].docs[0], m = ArquivosFamilia.achar(d.arquivoId); return { d, m }; });
    ok(d3.m && d3.m.ligado === (await p.evaluate(() => CofreEmpresa.lista()[0].id)) && d3.m.tipo === 'empresa' && /Cartão CNPJ/.test(d3.m.nome), 'arquivo guardado no cofre de arquivos, ligado à empresa: ' + (d3.m && d3.m.nome));
    const val = await p.evaluate(() => { const x = new Date(hojeISO() + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 20); return x.toISOString().slice(0, 10); });
    await p.click('.em-card [data-acao="em-doc"]'); await p.waitForSelector('#genModal:not(.hidden) #emDocArq');
    await p.selectOption('#emDocTipo', 'alvara'); await p.evaluate((v) => { document.getElementById('emDocVal').value = v; }, val);
    await p.setInputFiles('#emDocArq', alvara); await p.click('[data-acao="em-doc-salvar"]');
    await p.waitForFunction(() => (CofreEmpresa.lista()[0].docs || []).length === 2);
    const t3 = await p.evaluate(() => document.querySelector('.em-card .em-docs').innerText);
    ok(/Cartão CNPJ/.test(t3) && /Alvará · vence em/.test(t3), 'lista: cartão CNPJ e alvará "vence em …"');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.em-docs [data-acao="em-doc-baixar"] >> nth=0')]);
    const dlPath = path.join(tmp, 'baixado.pdf'); await dl.saveAs(dlPath);
    ok(/% cartao cnpj ficticio/.test(fs.readFileSync(dlPath, 'latin1')), 'tocar no documento baixa o arquivo guardado');

    console.log('4) lembrete no 📥');
    const g4 = await p.evaluate(() => { const g = inboxGrupos().find((x) => x.id === 'avisos'); return g && g.html; });
    ok(g4 && /Alvará · Empresa Exemplo Ltda/.test(g4) && /faltam 20 dias/.test(g4), '📥 Avisos: "Alvará · Empresa Exemplo Ltda — vence em … (faltam 20 dias)"');
    const k = await p.evaluate(() => { const d = CofreEmpresa.lista()[0].docs[1]; ST.config.inboxVistos = ST.config.inboxVistos || {}; ST.config.inboxVistos['emp|' + d.id + '|' + d.validade] = 1; return !(inboxGrupos().find((x) => x.id === 'avisos') || { html: '' }).html.includes('Alvará'); });
    ok(k, '"ok, entendi" tira o lembrete');

    console.log('5) cofre reservado e visão da casa');
    ok(await p.evaluate(() => MoneyModulos.colecoes ? MoneyModulos.colecoes().indexOf('empresas') >= 0 : true), 'a coleção "empresas" é do módulo');
    ok(!/\bempresas\b/.test(fs.readFileSync(path.join(RAIZ, 'modulos/visao-casa.js'), 'utf8').match(/CASA_COLS = \{[^}]*\}/)[0]), '"empresas" não está nas coleções da casa (fica no cofre reservado)');
    const c5 = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; render(); const t = document.querySelector('.view:not(.hidden)').innerText, v = CofreEmpresa.vencendo().length; Escopo.soCasa = o; render(); return { t, v }; });
    ok(/Só o responsável vê/.test(c5.t) && !/Empresa Exemplo/.test(c5.t) && c5.v === 0, 'na visão da casa: nada da empresa, nem lembrete');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
