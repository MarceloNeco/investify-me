/* =====================================================================
   teste/teste-comprovantes.js — 3.95: os comprovantes do e-mail que o robô manda (tipo "comprovante"). Dados FICTÍCIOS.
   Confere cada subtipo: compra (casa com o cartão; parcelado pela 1ª parcela; desempate pelo final; pendente do robô liga
   quando o lançamento chega; ficha no lançamento; sugestão de categoria), reembolso (Valores a receber, sai quando o crédito
   cai), nota fiscal (liga à compra e à despesa médica, com nº/CNPJ/prestador), recibo do exterior (recibo × cartão com IOF),
   boleto (📥 2 dias antes; "não pague" com débito automático; some quando pago), outro (a pessoa diz o que é), foto a ler;
   nada duplica, nenhum vira lançamento, escopo da caixa (visão da casa) e PT/EN/ES.
   Uso: node teste/teste-comprovantes.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Banco Ficticio' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  recorrentes: [{ id: 'rCond', nome: 'Condominio Ficticio', grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 10, valor: 650, fluxo: 'saida', forma: 'debaut', estadoPadrao: 'automatico', ativo: true }],
  cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3 }, { id: 'c2', apelido: 'Outro Ficticio', bandeira: 'master', fim: '9876', vence: 10, fecha: 3 }],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }],
  gastos: [R('g0', '2026-10-10', 97, 'KVN *CURSO FICTICIO', { grupo: 'PESSOAL', sub: 'Cursos' }), R('g1', '2026-11-10', 97, 'KVN *CURSO FICTICIO'),
    R('g2', '2026-11-12', 45.9, 'AMAZON MARKETPLACE'), R('g3', '2026-11-12', 45.9, 'PADARIA INVENTADA', { cartaoId: 'c2' }),
    R('g5', '2026-11-05', 350, 'CLINICA FICTICIA', { grupo: 'SAUDE', sub: 'Psicologia', contraparte: { nome: 'Clinica Ficticia', cnpj: '11222333000181' } }),
    R('g6', '2026-11-14', 115.2, 'ANTHROPIC* CLAUDE'), R('g7', '2026-11-14', 4.03, 'IOF COMPRA EXTERIOR')],
  cartao_pendentes: [Object.assign(R('p9', '2026-11-16', 59.9, 'HOTMART*PRODUTO FICTICIO'), { id: 'pa_p9', estado: 'pendente', pendente: true, vistoEm: '2026-11-16' })] };
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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Comprovantes !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render();
      Comprovantes._hoje = '2026-11-18'; ReciboExterior._ptax = async () => ({ '2026-11-14': 5.5 }); });
    const rec = (l, esc) => p.evaluate((a) => Comprovantes.receber(a[0], a[1]), [l, esc]);
    const cp = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Comprovantes.lista().find((x) => x.id === 'evid-' + i) || null)), id);
    const g = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Gasto.todos().find((x) => x.id === i) || null)), id);
    const inbox = () => p.evaluate(() => (inboxGrupos().find((x) => x.id === 'comprovantes') || {}).html || '');
    const nG0 = await p.evaluate(() => Gasto.todos().length);

    console.log('1) compra');
    await rec(C('kvn', 'compra', { data: '2026-11-10', valor: 291, parcelas: 3, valor_parcela: 97, loja: 'Kirvano', produto: 'Curso Ficticio de Exemplo', pedido: 'KV-0001', descritor_fatura: 'KVN *CURSO FICTICIO', final: '1234' }));
    let x = await cp('kvn'), gg = await g('rb_g1');
    ok(x.gastoId === 'rb_g1' && gg.ficha && gg.ficha.produto === 'Curso Ficticio de Exemplo' && gg.ficha.pedido === 'KV-0001', 'parcelado 3x: casa com a 1ª parcela (R$ 97) pelo valor e a data; a ficha (produto, pedido) vai para o lançamento');
    ok(x.sugestao && x.sugestao.grupo === 'PESSOAL' && x.sugestao.sub === 'Cursos', 'sugere a categoria que já foi usada para a mesma loja (Pessoal · Cursos)');
    await rec(C('amz', 'compra', { data: '2026-11-12', valor: 45.9, loja: 'Amazon', produto: 'Livro de exemplo', pedido: 'D01-0000000-0000001', final: '1234' }));
    ok((await cp('amz')).gastoId === 'rb_g2', 'dois lançamentos de R$ 45,90 no mesmo dia: o final do cartão e a loja desempatam');
    await rec(C('hot', 'compra', { data: '2026-11-16', valor: 59.9, loja: 'Hotmart', produto: 'Produto Ficticio', descritor_fatura: 'HOTMART*PRODUTO FICTICIO', final: '1234' }));
    x = await cp('hot');
    ok(!x.gastoId && x.pendId === 'pa_p9', 'compra ainda pendente no banco: liga à pendente do robô e espera');
    await p.evaluate(() => { ST.cartao_pendentes = []; Gasto.add({ id: 'rb_g8', idRobo: 'g8', data: '2026-11-17', valor: 59.9, desc: 'HOTMART*PRODUTO FICTICIO', descRobo: 'HOTMART*PRODUTO FICTICIO', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' }); MoneyModulos.emitir ? MoneyModulos.emitir('gasto.novo', {}) : Comprovantes.ligarTudo(); });
    await p.evaluate(() => Comprovantes.ligarTudo());
    ok((await cp('hot')).gastoId === 'rb_g8', 'o lançamento definitivo chegou: a compra liga a ele');
    await p.evaluate(() => { abrirInbox(); });
    await p.click('#genBody [data-cp="evid-kvn"] [data-acao="cp-cat"]'); await p.waitForTimeout(300);
    ok((await g('rb_g1')).grupo === 'PESSOAL' && (await cp('kvn')).estado === 'ok' && !/Curso Ficticio de Exemplo/.test(await inbox()), '"Usar Pessoal · Cursos" no 📥: aplica no lançamento e sai do 📥');
    await p.evaluate(() => fechar('genModal'));
    ok(await p.evaluate(() => { abrirLancamento('rb_g1'); return /Comprovante do e-mail/.test(document.querySelector('#assetModal').textContent) && /KV-0001/.test(document.querySelector('#assetModal').textContent); }), 'a edição do lançamento mostra a ficha do comprovante (produto, pedido)');
    await p.evaluate(() => fechar('assetModal'));

    console.log('2) reembolso');
    await rec(C('reemb', 'reembolso', { data: '2026-11-15', valor: 30, loja: 'Amazon', referencia: 'REF-0002', final: '1234' }));
    x = await cp('reemb');
    let ar = await p.evaluate((id) => JSON.parse(JSON.stringify(AReceber.achar(id))), x.arId);
    ok(ar && ar.total === 30 && ar.ondeCartaoId === 'c1' && ar.protocolo === 'REF-0002' && ar.estado === 'aguardando', 'vira item em "Valores a receber" com o cartão do final e a referência');
    await p.evaluate(() => { Gasto.add({ id: 'rb_g9', idRobo: 'g9', data: '2026-11-17', valor: -30, desc: 'AMAZON ESTORNO', descRobo: 'AMAZON ESTORNO', fluxo: 'saida', grupo: 'OUTROS', sub: '', origem: 'robo', cartaoId: 'c1', estorno: true }); AReceber.vigiar(); });
    ar = await p.evaluate((id) => JSON.parse(JSON.stringify(AReceber.achar(id))), x.arId);
    ok(ar.estado === 'recebido', 'o crédito caiu: o item a receber sai');

    console.log('3) nota fiscal');
    await rec(C('nf1', 'nota_fiscal', { data: '2026-11-11', valor: 291, loja: 'Kirvano', produto: 'Curso Ficticio de Exemplo', numero: 'NF-101', cnpj: '00.000.000/0001-91' }));
    x = await cp('nf1');
    ok(x.compraId === 'evid-kvn' && (await g('rb_g1')).ficha.nf === 'NF-101' && x.estado === 'ok', 'a nota liga à compra do mesmo produto (valor da NF diferente da parcela) e o nº vai para a ficha');
    await rec(C('nf2', 'nota_fiscal', { data: '2026-11-08', valor: 350, loja: 'Clinica Ficticia', numero: 'NFS-55', cnpj: '11.222.333/0001-81' }));
    const nf = await p.evaluate(() => { const g = Gasto.todos().find((x) => x.id === 'rb_g5'); return { e: NfIr.estado(g), d: NfIr.dados(g), r: NfIr.reg('rb_g5') }; });
    ok((await cp('nf2')).nfGastoId === 'rb_g5' && nf.e === 'recebida' && nf.d.prof === 'Clinica Ficticia' && nf.d.doc === '11.222.333/0001-81' && nf.r.nf === 'NFS-55', 'despesa médica: a nota fica "recebida", com o prestador, o CNPJ e o nº para o IR');

    console.log('4) recibo do exterior');
    await rec(C('ant', 'recibo_exterior', { data: '2026-11-14', valor: 20, moeda: 'USD', loja: 'Anthropic, PBC', numero: '2345-0000' }));
    await p.waitForTimeout(200);
    const rx = await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'evid-ant'), r = ReciboExterior.lista().find((y) => y.id === c.reciboId); return r && { g: r.gastoId, iof: r.iofId, cb: r.cambio }; });
    ok(rx && rx.g === 'rb_g6' && rx.iof === 'rb_g7' && rx.cb === 5.5, 'vai para o recibo × cartão: o lançamento do cartão, o IOF e o câmbio');

    console.log('5) boleto');
    await rec(C('esc', 'boleto', { data: '2026-11-14', valor: 800, loja: 'Escola Ficticia', vencimento: '2026-11-25', linha: '00000.00000 00000.000000 00000.000000 0 00000000000000' }));
    ok(!/Escola Ficticia/.test(await inbox()), 'boleto com vencimento longe ainda não aparece no 📥');
    await p.evaluate(() => { Comprovantes._hoje = '2026-11-23'; });
    ok(/Boleto · Escola Ficticia · R\$\s?800,00/.test(await inbox()) && /vence em 25\/Nov\/2026/.test(await inbox()), '2 dias antes: "Boleto · Escola Ficticia · R$ 800,00 … vence em 25/Nov/2026" no 📥');
    await rec(C('cond', 'boleto', { data: '2026-11-14', valor: 650, loja: 'Condominio Ficticio', vencimento: '2026-11-24' }));
    ok(/NÃO PAGUE: ESTÁ EM DÉBITO AUTOMÁTICO/.test(await inbox()), 'a mesma conta está no débito automático: "⛔ NÃO PAGUE"');
    await p.evaluate(() => { Gasto.add({ id: 'rb_g10', idRobo: 'g10', data: '2026-11-24', valor: 800, desc: 'PAG BOLETO ESCOLA', descRobo: 'PAG BOLETO ESCOLA', fluxo: 'saida', grupo: 'DEPENDENTES', sub: 'Escola', origem: 'robo' }); Comprovantes.ligarTudo(); });
    ok((await cp('esc')).pagoId === 'rb_g10' && !/Escola Ficticia/.test(await inbox()), 'o pagamento apareceu: o boleto sai');

    console.log('6) outro e foto a ler');
    await rec(C('out', 'outro', { data: '2026-11-15', valor: 12, descricao: 'Mensagem sem tipo claro' }));
    await rec(C('foto', 'compra', { data: '2026-11-15', valor: 77.7, loja: 'Loja Ficticia', fotos_a_ler: ['foto-canhoto-1.jpg'] }));
    let ib = await inbox();
    ok(/Outro ·/.test(ib) && /data-acao="cp-tipo"/.test(ib) && /Foto a ler: abrir o Conferir canhotos/.test(ib) && /data-acao="cn-abrir"/.test(ib), '"outro" pede para dizer o que é; a foto a ler abre o 🧾 Conferir canhotos');
    await p.evaluate(() => abrirInbox());
    await p.click('#genBody [data-cp="evid-out"] [data-acao="cp-tipo"][data-v="boleto"]'); await p.waitForTimeout(300);
    ok((await cp('out')).subtipo === 'boleto', 'a pessoa diz que é boleto e ele passa a ser tratado como boleto');
    await p.click('#genBody [data-cp="evid-foto"] [data-acao="cp-foto-ok"]'); await p.waitForTimeout(300);
    ok(!/foto-canhoto|Foto a ler/.test(await inbox()), '"Já li a foto": sai do 📥');
    await p.evaluate(() => fechar('genModal'));

    console.log('7) sem duplicar, sem lançamento, telas, escopo');
    const n0 = await p.evaluate(() => Comprovantes.lista().length);
    await rec(C('kvn', 'compra', { data: '2026-11-10', valor: 291, parcelas: 3, valor_parcela: 97, loja: 'Kirvano', produto: 'Curso Ficticio de Exemplo', pedido: 'KV-0001', descritor_fatura: 'KVN *CURSO FICTICIO', final: '1234' }));
    ok(await p.evaluate(() => Comprovantes.lista().length) === n0 && (await cp('kvn')).estado === 'ok' && (await cp('kvn')).gastoId === 'rb_g1', 'o mesmo comprovante de novo: atualiza, não duplica, não perde o que a pessoa decidiu');
    ok(await p.evaluate(() => Gasto.todos().length) === nG0 + 3, 'nenhum comprovante virou lançamento (só os 3 do banco que o teste pôs)');
    await p.evaluate(() => { irPara('b-lanc'); render(); });
    ok(await p.evaluate(() => !!document.querySelector('#view-b-lanc [data-acao="cp-abrir"]')), 'Lançamentos: "🧾 Comprovantes a conferir"');
    await p.click('#view-b-lanc [data-acao="cp-abrir"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.querySelectorAll('#cpLista .cp-item').length === 11 && /Em Valores a receber/.test(document.getElementById('cpLista').textContent)), 'a lista mostra todos, com a situação de cada um');
    await p.evaluate(() => fechar('genModal'));
    await rec(C('casa1', 'compra', { data: '2026-11-15', valor: 11, loja: 'Mercado Ficticio' }), 'casa');
    ok(await p.evaluate(() => Escopo.de('comprovantes', Comprovantes.lista().find((x) => x.id === 'evid-casa1')) === 'casa' && Escopo.de('comprovantes', Comprovantes.lista().find((x) => x.id === 'evid-kvn')) === 'reservado'), 'visão da casa: segue o escopo da caixa do robô (reservado por padrão)');
    ok(await p.evaluate(() => { Escopo.soCasa = () => true; const r = Comprovantes.abertos().map((x) => x.id).join(); Escopo.soCasa = () => false; return r === 'evid-casa1'; }), 'na visão da casa só aparece o da casa');
    ok(await p.evaluate(() => { const x = Comprovantes.lista().find((y) => y.id === 'evid-esc'); I18n.atual = 'en'; const a = Comprovantes.situacao(x) + Comprovantes.frase(x); I18n.atual = 'es'; const b = Comprovantes.frase(x); I18n.atual = 'pt'; return /Paid:/.test(a) && /Bank slip/.test(a) && /Boleto/.test(b) && FRASES_ES['Comprovantes a conferir'] && FRASES_EN['Comprovantes do e-mail']; }), 'textos em EN e ES (rascunho)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
