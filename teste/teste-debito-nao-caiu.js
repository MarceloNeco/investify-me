/* =====================================================================
   teste/teste-debito-nao-caiu.js — 3.100: o débito automático que não caiu. Dados FICTÍCIOS.
   Caso (como o do dono, com valores trocados): a conta de energia no débito automático do CARTÃO ("PCAUT ENERGIA", dias 4–8);
   caiu em setembro e outubro; em novembro não caiu; o Pix pago depois do vencimento (Habitação › Luz) fecha a conta. Confere: o
   alerta vermelho no 1º dia útil depois do vencimento; Contas do mês deixa de dizer "paga"; o "não pague" some e o boleto diz
   "pague"; o e-mail de aviso de atraso vira alerta; o Pix fecha sozinho; "Já paguei"; o lembrete 3 dias antes; a do dia ainda
   não acusa; visão da casa; EN/ES.
   Uso: node teste/teste-debito-nao-caiu.js
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
  recorrentes: [REC('rLuz', 'Energia Enel', 'Luz', 9, 450, { cnpj: '11222333000181' }), REC('rAgua', 'Agua Ficticia', 'Água', 15, 120),
    REC('rNet', 'Internet Ficticia', 'Internet', 25, 100, { cnpj: '99888777000166' }), REC('rTel', 'Telefone Ficticio', 'Telefone', 23, 80), REC('rGas', 'Gas Ficticio', 'Gás', 12, 60)],
  gastos: [R('s9', '2026-09-06', 440, 'PCAUT ENERGIA 0000'), R('s10', '2026-10-06', 455, 'PCAUT ENERGIA 0000'),
    R('a9', '2026-09-15', 118, 'DEB AUT AGUA FICTICIA', { sub: 'Água', cartaoId: undefined }), R('a10', '2026-10-15', 121, 'DEB AUT AGUA FICTICIA', { sub: 'Água', cartaoId: undefined }),
    R('t10', '2026-10-23', 80, 'DEB AUT TELEFONE FICTICIO', { sub: 'Telefone', cartaoId: undefined }),
    R('n9', '2026-09-25', 100, 'DEB AUT INTERNET FICTICIA', { sub: 'Internet', cartaoId: undefined }), R('n10', '2026-10-25', 100, 'DEB AUT INTERNET FICTICIA', { sub: 'Internet', cartaoId: undefined })] };

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
    await p.clock.setFixedTime(new Date('2026-11-23T10:00:00-03:00'));   /* segunda-feira, 23/11 */
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof DebitoNaoCaiu !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-custos'); render(); });
    await p.waitForTimeout(2500);   /* a conciliação automática (modulos/conciliacao.js) roda 1,2 s depois de abrir */
    const inbox = () => p.evaluate(() => (inboxGrupos().find((x) => x.id === 'atrasadas') || {}).html || '');
    const nc = () => p.evaluate(() => DebitoNaoCaiu.naoCaiu().map((x) => x.r.id + '|' + x.data));
    const st = (rid) => p.evaluate((r) => (ContasMes.itens().find((x) => x.r.id === r) || {}).status, rid);

    console.log('1) não caiu: o alerta');
    let l = await nc();
    ok(l.includes('rLuz|2026-11-09') && !l.some((x) => /2026-10/.test(x)), 'novembro não caiu (setembro e outubro caíram no cartão como "PCAUT ENERGIA"): ' + l.join());
    ok(l.includes('rAgua|2026-11-15') && !l.some((x) => /^rTel/.test(x)) && !l.some((x) => /^rNet/.test(x)), 'a da água (15/11) também; a do telefone vence hoje e a da internet ainda vai vencer: não acusam');
    let ib = await inbox();
    ok(/O débito automático de Energia Enel \(R\$\s?450,00, venceu em 09\/Nov\/2026\) não apareceu no banco\. Pague hoje para evitar multa e corte\./.test(ib) && /data-acao="dnc-paguei"/.test(ib) && /data-acao="dnc-debitado"/.test(ib), '📥 em vermelho: "O débito automático de Energia Enel (R$ 450,00, venceu em 09/Nov/2026) não apareceu no banco. Pague hoje…" com [Já paguei] [Foi debitado]');
    ok(await st('rLuz') === 'atrasada', 'Contas do mês: a conta de energia deixa de aparecer como paga (atrasada)');
    ok(/Internet Ficticia vence 25\/Nov no débito automático: confira o saldo ou o limite\./.test(ib), '3 dias antes: "Internet Ficticia vence 25/Nov no débito automático: confira o saldo ou o limite."');
    ok(!l.some((x) => /^rGas/.test(x)) && await st('rGas') === 'paga', 'débito que o app nunca viu cair (de um banco que o robô não traz): não vira alarme falso; segue como antes');
    ok(await st('rTel') === 'debito', 'a do dia (telefone, vence hoje) fica "no débito", sem alarme');

    console.log('2) o "não pague" só até o vencimento');
    ok(await p.evaluate(() => DebitoAuto.conflito({ nome: 'Fatura Enel', cnpj: '11.222.333/0001-81' }) === null && !!DebitoAuto.conflito({ nome: 'Internet', cnpj: '99.888.777/0001-66' })), 'o boleto da energia não diz mais "não pague" (o débito não caiu); o da internet (ainda a vencer) continua dizendo');
    await p.evaluate(() => Comprovantes.receber({ id: 'evid-bol', tipo: 'comprovante', subtipo: 'boleto', data: '2026-11-20', vencimento: '2026-11-25', valor: 468.50, loja: 'Energia Enel', cnpj: '11.222.333/0001-81' }));
    ok(await p.evaluate(() => /O débito automático não caiu: pague este boleto/.test(Comprovantes.situacao(Comprovantes.lista().find((x) => x.id === 'evid-bol')))), 'o boleto que chegou por e-mail diz "⚠️ O débito automático não caiu: pague este boleto"');
    await p.evaluate(() => Comprovantes.receber({ id: 'evid-aviso', tipo: 'comprovante', subtipo: 'outro', data: '2026-11-23', loja: 'Enel', remetente: 'cobranca@exemplo.invalid', assunto: 'Enel: Aviso Importante', descricao: 'Identificamos que você tem contas em atraso.' }));
    ib = await inbox();
    ok(/📧 Aviso de atraso por e-mail: Energia Enel — Enel: Aviso Importante/.test(ib), 'o e-mail de aviso de atraso vira alerta urgente, ligado à conta');

    console.log('3) o pagamento depois do vencimento fecha a conta');
    await p.evaluate(() => { Gasto.add({ id: 'rb_pix', idRobo: 'pix', data: '2026-11-23', valor: 468.50, desc: 'PIX ENEL DISTRIBUICAO', descRobo: 'PIX ENEL DISTRIBUICAO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Luz', origem: 'robo', conta: 'Banco Ficticio' }); DebitoNaoCaiu.fechar(); });
    l = await nc();
    ok(!l.some((x) => /^rLuz/.test(x)) && await st('rLuz') === 'paga' && await p.evaluate(() => Pagamento.achar('rLuz', '2026-11-09').gastoId === 'rb_pix'), 'o Pix de R$ 468,50 (com multa) em 23/11 fecha a ocorrência de 09/11: paga');
    ok(!/Energia Enel \(R\$/.test(await inbox()), 'o alerta da energia sai do 📥');
    await p.evaluate(() => abrirInbox());
    await p.click('#genBody .dnc-item [data-acao="dnc-paguei"][data-r="rAgua"]'); await p.waitForTimeout(250);
    await p.evaluate(() => fechar('genModal'));
    ok(!(await nc()).length && await st('rAgua') === 'paga', '"Já paguei" (a da água): sai do 📥 e fica paga');
    await p.evaluate(() => abrirInbox());
    await p.click('#genBody .dnc-email [data-acao="dnc-email-ok"]'); await p.waitForTimeout(250);
    await p.evaluate(() => fechar('genModal'));
    ok(!/Aviso de atraso por e-mail/.test(await inbox()), '"Entendi" tira o aviso do e-mail');

    console.log('4) visão da casa e idiomas');
    await p.evaluate(() => { Pagamento.limpar('rAgua', '2026-11-15'); });
    ok(await p.evaluate(() => { Escopo.soCasa = () => true; const n = DebitoNaoCaiu.naoCaiu().length; Escopo.soCasa = () => false; return n === 0 && DebitoNaoCaiu.naoCaiu().length === 1; }), 'na visão da casa não aparece (é do chefe); fora dela, sim');
    ok(await p.evaluate(() => { I18n.atual = 'en'; const a = (inboxGrupos().find((x) => x.id === 'atrasadas') || {}).html; I18n.atual = 'es'; const b = (inboxGrupos().find((x) => x.id === 'atrasadas') || {}).html; I18n.atual = 'pt'; return /did not show up at the bank/.test(a) && /no apareció en el banco/.test(b); }), 'EN e ES (rascunho)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
