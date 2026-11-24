/* =====================================================================
   teste/teste-robo-3104.js — 3.104: o que o robô passou a mandar (comprovantes 1.2.0, recibo-exterior 1.0.1). Dados FICTÍCIOS.
   Confere: o subtipo "fatura" é conta a pagar (📥 2 dias antes, "Já paguei", liga sozinha ao pagamento pelo valor, "⛔ não pague" com
   o débito automático ativo antes do vencimento, "pague" quando o débito não caiu); "links" vira 📎 (só https do Google Drive/Docs);
   o vencimento fica; o recibo do exterior em REAIS casa pelo valor em reais, sem câmbio nem IOF; o de US$ continua como antes.
   Uso: node teste/teste-robo-3104.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Banco Ficticio' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  recorrentes: [{ id: 'rTel', nome: 'Telefone Exemplo', grupo: 'HABITACAO', sub: 'Telefone', regra: 'dia', dia: 25, valor: 89.9, fluxo: 'saida', forma: 'debaut', estadoPadrao: 'automatico', ativo: true, cnpj: '99888777000166', criadoEm: '2026-08-01', desde: '2026-08-01' }],
  cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'master', fim: '1234', vence: 10, fecha: 3 }],
  gastos: [R('ia1', '2026-11-12', 110, 'ANTHROPIC* CLAUDE'), R('ia2', '2026-11-12', 110, 'OUTRA LOJA FICTICIA'), R('usd', '2026-11-03', 115.2, 'SERVICO EXTERIOR FICTICIO'), R('iof', '2026-11-03', 4.03, 'IOF COMPRA EXTERIOR'),
    R('cond', '2026-11-19', 412.5, 'PIX CONDOMINIO EXEMPLO', { cartaoId: undefined, forma: 'Pix' }),
    R('t9', '2026-09-25', 89.9, 'DEB AUT TELEFONE EXEMPLO', { cartaoId: undefined, sub: 'Telefone', grupo: 'HABITACAO' }), R('t10', '2026-10-25', 89.9, 'DEB AUT TELEFONE EXEMPLO', { cartaoId: undefined, sub: 'Telefone', grupo: 'HABITACAO' })] };
const C = (id, subtipo, extra) => Object.assign({ id: 'evid-' + id, tipo: 'comprovante', subtipo, remetente: 'nao-responda@exemplo.com', assunto: 'Assunto de exemplo' }, extra || {});

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e) + ' @ ' + String(e.stack || '').split('\n').slice(1, 12).join(' | ')));
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Comprovantes !== 'undefined' && typeof ReciboExterior !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render();
      Comprovantes._hoje = '2026-11-24'; ReciboExterior._ptax = async () => ({ '2026-11-03': 5.5 }); });
    const rec = (l) => p.evaluate((a) => Comprovantes.receber(a), l);
    const cp = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Comprovantes.lista().find((x) => x.id === 'evid-' + i) || null)), id);
    const sit = (id) => p.evaluate((i) => Comprovantes.situacao(Comprovantes.lista().find((x) => x.id === 'evid-' + i)), id);
    const inbox = () => p.evaluate(() => (inboxGrupos().find((x) => x.id === 'comprovantes') || {}).html || '');

    console.log('1) fatura: conta a pagar');
    await rec(C('tel', 'fatura', { loja: 'Telefone Exemplo', cnpj: '99.888.777/0001-66', valor: 89.9, vencimento: '2026-11-25', data: '2026-11-15', links: ['https://drive.google.com/file/d/ARQUIVO_FICTICIO/view', 'javascript:alert(1)', 'https://site-qualquer.exemplo/x.pdf'] }));
    const t = await cp('tel');
    ok(t && t.subtipo === 'fatura' && t.vencimento === '2026-11-25', 'o subtipo "fatura" fica como fatura (antes virava "outro"), com o vencimento');
    ok(t.links.length === 1 && t.links[0] === 'https://drive.google.com/file/d/ARQUIVO_FICTICIO/view', '"links": só o https do Google Drive fica (o javascript: e o site qualquer são recusados)');
    let ib = await inbox();
    ok(/Fatura ou conta · Telefone Exemplo/.test(ib) && /⛔/.test(ib) && /data-acao="cp-ok"[^>]*>Já paguei/.test(ib), '📥 (vence amanhã): "Fatura ou conta", com o "⛔ não pague" (a conta está no débito automático e ainda não venceu) e "Já paguei"');
    ok(/<a class="small cp-link" href="https:\/\/drive\.google\.com\/file\/d\/ARQUIVO_FICTICIO\/view" target="_blank" rel="noopener noreferrer">📎 arquivo ↗<\/a>/.test(ib), 'o 📎 abre o arquivo no Drive (link seguro: nova aba, sem passar o app)');
    await p.evaluate(() => { Comprovantes._hoje = '2026-11-27'; DebitoNaoCaiu._hoje = '2026-11-27'; });
    ok(/O débito automático não caiu: pague/.test(await sit('tel')) && !/⛔/.test(await sit('tel')), 'passou o vencimento e o débito não caiu: some o "não pague" e aparece "pague" (3.100)');
    await p.evaluate(() => { Comprovantes._hoje = '2026-11-24'; DebitoNaoCaiu._hoje = null; });
    await rec(C('cond', 'fatura', { loja: 'Condominio Exemplo', valor: 412.5, vencimento: '2026-11-20', data: '2026-11-10' }));
    ok(/Pago: PIX CONDOMINIO EXEMPLO/.test(await sit('cond')) && (await cp('cond')).estado === 'ok', 'a fatura do condomínio liga sozinha ao Pix do mesmo valor (até 5 dias do vencimento) e sai do 📥');
    await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'evid-tel'); c.estado = 'novo'; });
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'tInb'; d.innerHTML = '<ul>' + ((inboxGrupos().find((x) => x.id === 'comprovantes') || {}).html || '') + '</ul>'; document.body.appendChild(d); });
    await p.click('#tInb [data-cp="evid-tel"] [data-acao="cp-ok"]'); await p.waitForTimeout(80);
    ok((await cp('tel')).estado === 'ok' && !/evid-tel/.test(await inbox()), '"Já paguei" tira a fatura do 📥');

    console.log('2) recibo do exterior em reais');
    await rec(C('ant', 'recibo_exterior', { data: '2026-11-12', valor: 110, moeda: 'BRL', loja: 'Anthropic, PBC', numero: '2345-0001' }));
    const r1 = await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'evid-ant'), r = ReciboExterior.lista().find((y) => y.id === c.reciboId); return r && { moeda: r.moeda, g: r.gastoId, iof: r.iofId, cb: r.cambio || 0 }; });
    ok(r1 && r1.moeda === 'BRL' && r1.g === 'rb_ia1' && !r1.iof && !r1.cb, 'R$ 110,00 da Anthropic casa com o lançamento de R$ 110,00 da Anthropic (o outro de R$ 110,00 é de outra loja), sem IOF nem câmbio');
    ok(/Em Recibo × cartão \(em reais: sem câmbio nem IOF\)/.test(await sit('ant')), 'o comprovante diz "Em Recibo × cartão (em reais: sem câmbio nem IOF)"');
    const fr = await p.evaluate(() => (inboxGrupos().find((x) => x.id === 'docs') || {}).html || '');
    ok(/Recibo R\$ 110,00 = cartão R\$\s?110,00 \(em reais: sem câmbio nem IOF\)/.test(fr), '📥: "Recibo R$ 110,00 = cartão R$ 110,00 (em reais: sem câmbio nem IOF)"');
    await rec(C('usd', 'recibo_exterior', { data: '2026-11-03', valor: 20, moeda: 'USD', loja: 'Servico Exterior Ficticio', numero: 'X-77' }));
    const r2 = await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'evid-usd'), r = ReciboExterior.lista().find((y) => y.id === c.reciboId); return r && { g: r.gastoId, iof: r.iofId, cb: r.cambio }; });
    ok(r2 && r2.g === 'rb_usd' && r2.iof === 'rb_iof' && r2.cb === 5.5, 'o recibo em US$ continua como antes: casa pelo serviço, com o IOF e a PTAX');

    console.log('3) EN e ES');
    for (const [l, rx] of [['en', /Bill · Telefone Exemplo/], ['es', /Factura o recibo · Telefone Exemplo/]]) {
      await p.evaluate((x) => { I18n.atual = x; }, l);
      ok(rx.test(await p.evaluate(() => Comprovantes.frase(Comprovantes.lista().find((x) => x.id === 'evid-tel')))), l.toUpperCase() + ': o nome do subtipo');
    }
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
