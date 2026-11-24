/* =====================================================================
   teste/teste-conta-atraso.js — 3.102: a conta paga com atraso (modulos/debito-nao-caiu.js 1.1.0, contas-mes 1.2.0). Dados FICTÍCIOS.
   Caso (como o do dono, com valores trocados): a energia no débito automático do cartão não caiu em novembro (venceu 9/11) e foi
   paga por Pix em 23/11, pelo valor da conta. Confere: "Paga com atraso (Pix em 23/11)", não "paga"; o débito normal no cartão não
   conta como atraso; "Já paguei" depois do vencimento; 📥 "Ver com o banco" com anotação e Resolvido; na conta de dezembro, o aviso
   de multa e juros, o "confirme que o débito automático está ativo" 3 dias antes e a multa destacada no e-mail da conta; EN/ES.
   Uso: node teste/teste-conta-atraso.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'HABITACAO', sub: 'Luz', origem: 'robo', cartaoId: 'c1', conta: 'Banco Ficticio' }, extra || {});
const REC = (id, nome, sub, dia, valor, extra) => Object.assign({ id, nome, grupo: 'HABITACAO', sub, regra: 'dia', dia, valor, varia: true, fluxo: 'saida', estadoPadrao: 'automatico', forma: 'debaut', ativo: true, criadoEm: '2026-08-01', desde: '2026-08-01' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'visa', fim: '1111', vence: 15, fecha: 8 }],
  recorrentes: [REC('rLuz', 'Energia Ficticia', 'Luz', 9, 300, { cartaoId: 'c1' }), REC('rAgua', 'Saneamento Exemplo', 'Água', 15, 120)],
  gastos: [R('s9', '2026-09-06', 290, 'PCAUT ENERGIA 0000'), R('s10', '2026-10-06', 310, 'PCAUT ENERGIA 0000'),
    R('a9', '2026-09-15', 118, 'DEB AUT SANEAMENTO EXEMPLO', { sub: 'Água', cartaoId: undefined }), R('a10', '2026-10-15', 121, 'DEB AUT SANEAMENTO EXEMPLO', { sub: 'Água', cartaoId: undefined }),
    R('pix', '2026-11-23', 305.4, 'PIX ENERGIA FICTICIA', { cartaoId: undefined, forma: 'Pix' })] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-24T10:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof DebitoNaoCaiu !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-custos'); render(); });
    await p.waitForTimeout(2500);
    const inbox = () => p.evaluate(() => { DebitoNaoCaiu.fechar(); return (inboxGrupos().find((x) => x.id === 'atrasadas') || {}).html || ''; });
    const it = (rid, mes) => p.evaluate(([r, m]) => { const x = ContasMes.itens().find((y) => y.r.id === r && (!m || y.data.slice(0, 7) === m)); return x ? { st: x.status, at: x.atraso, av: x.aviso || '' } : null; }, [rid, mes]);

    console.log('1) paga com atraso, não "paga"');
    let ib = await inbox();
    const nov = await it('rLuz');
    ok(nov && nov.st === 'pagaatraso' && nov.at && nov.at.em === '2026-11-23' && nov.at.como === 'Pix', 'o Pix de 23/11 fecha a conta de novembro como "paga com atraso" (Pix em 23/11) ' + JSON.stringify(nov));
    await p.evaluate(() => render());
    const tela = await p.evaluate(() => [...document.querySelectorAll('.cm-linha')].map((x) => x.textContent).find((t) => /Energia Ficticia/.test(t)) || '');
    ok(/Paga com atraso/.test(tela) && /paga com atraso \(Pix em 23\/Nov\)/.test(tela) && !/✓ Paga/.test(tela), 'Contas fixas mostra "⚠ Paga com atraso" e "paga com atraso (Pix em 23/Nov)" ' + tela.replace(/\s+/g, ' ').slice(0, 160));
    ok(await p.evaluate(() => { const r = ContasMes.resumo(ContasMes.itens()); return r.nPagas >= 1; }), 'no resumo do mês ela conta como paga (o dinheiro saiu)');
    ok(await p.evaluate(() => DebitoNaoCaiu.atraso(Recorrente.ocorrencias('2026-10-01', '2026-10-31').find((o) => o.r.id === 'rLuz')) === null), 'outubro (o débito normal no cartão, "PCAUT ENERGIA") não é atraso');

    console.log('2) "Ver com o banco" com anotação e Resolvido');
    ok(/Ver com o banco por que o débito automático de Energia Ficticia não caiu/.test(ib) && /paga com atraso \(Pix em 23\/Nov\/2026\)/.test(ib), '📥 "Ver com o banco por que o débito automático de Energia Ficticia não caiu" (venceu em 09/11, paga com atraso por Pix em 23/11)');
    await p.evaluate((h) => { const d = document.createElement('div'); d.id = 'tInb'; d.innerHTML = '<ul>' + h + '</ul>'; document.body.appendChild(d); }, ib);
    await p.fill('#tInb .dnc-nota', 'banco disse que o cadastro venceu');
    await p.click('#tInb .dnc-banco [data-acao="dnc-nota-ok"]'); await p.waitForTimeout(80);
    ok(await p.evaluate(() => DebitoNaoCaiu.bancoDe('rLuz', '2026-11-09').nota === 'banco disse que o cadastro venceu'), 'a anotação fica guardada (o item continua no 📥)');
    ok(/banco disse que o cadastro venceu/.test(await inbox()), 'e aparece de novo ao abrir o 📥');

    console.log('3) "Já paguei" depois do vencimento');
    await p.evaluate(() => { DebitoNaoCaiu.jaPaguei('rAgua', '2026-11-15', 'ja-paguei'); });
    const ag = await it('rAgua');
    ok(ag && ag.st === 'pagaatraso' && ag.at.em === '2026-11-24', '"Já paguei" em 24/11 numa conta que venceu 15/11: paga com atraso (24/11) ' + JSON.stringify(ag));
    await p.evaluate(() => { document.getElementById('tInb').remove(); });
    ib = await inbox();
    await p.evaluate((h) => { const d = document.createElement('div'); d.id = 'tInb'; d.innerHTML = '<ul>' + h + '</ul>'; document.body.appendChild(d); }, ib);
    await p.click('#tInb .dnc-banco [data-k="rLuz|2026-11-09"][data-acao="dnc-resolvido"]'); await p.waitForTimeout(80);
    ib = await inbox();
    ok(!/Energia Ficticia não caiu/.test(ib) && /Saneamento Exemplo/.test(ib), '"Resolvido" tira a da energia; a da água continua');

    console.log('4) a conta de dezembro');
    await p.evaluate(() => { DebitoNaoCaiu._hoje = '2026-12-06'; ContasMes._hoje = '2026-12-06'; });
    ib = await inbox();
    ok(/Energia Ficticia vence 09\/Dez no débito automático: confira o saldo ou o limite\. Confirme que o débito automático está ativo \(o de Nov não caiu\)\./.test(ib), '3 dias antes: "… Confirme que o débito automático está ativo (o de Nov não caiu)."');
    ok(/pode vir multa e juros da conta de Nov \(paga com atraso\)/.test(ib), '… e "pode vir multa e juros da conta de Nov (paga com atraso)"');
    let dez = await it('rLuz', '2026-12');
    ok(dez && /pode vir multa e juros da conta de Nov/.test(dez.av), 'Contas fixas, dezembro: o mesmo aviso na linha da conta');
    await p.evaluate(() => Comprovantes.receber({ id: 'evid-conta', tipo: 'comprovante', subtipo: 'boleto', data: '2026-12-02', vencimento: '2026-12-09', valor: 318.2, loja: 'Energia Ficticia', assunto: 'Sua conta de energia chegou', descricao: 'Consumo do mês. Multa por atraso R$ 6,11. Juros de mora R$ 0,73.' }));
    dez = await it('rLuz', '2026-12');
    ok(dez && /multa por atraso: R\$\s?6,84 \(da conta de Nov\)/.test(dez.av), 'a conta de dezembro chegou com a multa e os juros destacados: "multa por atraso: R$ 6,84 (da conta de Nov)" ' + (dez && dez.av));
    ok(await p.evaluate(() => DebitoNaoCaiu.avisoMulta(Recorrente.ocorrencias('2026-12-01', '2026-12-31').find((o) => o.r.id === 'rAgua')).texto === 'pode vir multa e juros da conta de Nov (paga com atraso)'), 'a da água (sem e-mail de multa) só avisa que pode vir');

    console.log('5) EN e ES');
    await p.evaluate(() => { I18n.atual = 'en'; });
    const en = await p.evaluate(() => DebitoNaoCaiu.avisoMulta(Recorrente.ocorrencias('2026-12-01', '2026-12-31').find((o) => o.r.id === 'rAgua')).texto);
    ok(/late fees and interest from the Nov bill may come \(paid late\)/.test(en), 'EN: o aviso da multa ' + en);
    await p.evaluate(() => { I18n.atual = 'es'; });
    ok(/Consulta con el banco por qué no se hizo el débito automático de Saneamento Exemplo/.test(await p.evaluate(() => { DebitoNaoCaiu._hoje = '2026-11-24'; return (inboxGrupos().find((x) => x.id === 'atrasadas') || {}).html || ''; })), 'ES: "Consulta con el banco…"');
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
