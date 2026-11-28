/* =====================================================================
   teste/teste-3144-estornos.js — 3.144: estornos do cartão. Dados FICTÍCIOS (valores, pedidos e cartão inventados).
   Confere:
   - duas compras EBN*HOSTINGER iguais no mesmo cartão; o robô manda a compra (comprovante) e depois o ESTORNO de só uma,
     com compra_id: o pedido "A receber" liga à compra certa, e só ela ganha "⏳ estorno a receber R$ X";
   - o total a receber aparece no Painel e no 📥;
   - o crédito cai com valor um pouco menor (câmbio/IOF): fecha o pedido, "✓ estorno recebido em dd/mm" na compra,
     e o crédito vira estorno da compra (mesma categoria: os dois se anulam); a outra compra continua sem marca;
   - sem compra_id: a única compra da mesma loja, valor e final; com duas iguais, não chuta;
   - a pessoa já tinha pedido "↩ Pedi estorno": o estorno do robô usa o mesmo pedido (não duplica);
   - passou do prazo (45 dias): no 📥, [Já recebi] [Adiar 15 dias] [Desistir]; "Adiar 15 dias" empurra 15 dias;
   - textos em ES; nenhum erro na página.
   Uso: node teste/teste-3144-estornos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const K = { cartaoId: 'ct1', forma: 'Cartão de crédito', formaId: 'credito', fluxo: 'saida', origem: 'robo' };
const G = (id, data, valor, desc, extra) => Object.assign({ id, data, valor, grupo: 'PESSOAL', sub: 'Assinaturas', desc, descRobo: desc }, K, extra || {});
const gastos = [
  G('gh1', '2026-10-05', 123.45, 'EBN*HOSTINGER'),
  G('gh2', '2026-10-20', 123.45, 'EBN*HOSTINGER'),
  G('gx1', '2026-10-12', 50, 'LOJA EXEMPLO XIS'),
  G('gd1', '2026-10-14', 80, 'LOJA DUPLA EXEMPLO'),
  G('gd2', '2026-10-15', 80, 'LOJA DUPLA EXEMPLO'),
  G('gm1', '2026-10-16', 70, 'LOJA EME EXEMPLO')
];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [], cartoes: [{ id: 'ct1', apelido: 'Cartão Exemplo', bandeira: 'visa', fim: '4321', fecha: 25, vence: 5 }] };
const CP = (id, subtipo, extra) => Object.assign({ id, tipo: 'comprovante', subtipo, remetente: 'nao-responda@exemplo.com', assunto: 'Assunto de exemplo' }, extra || {});

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.clock.setFixedTime(new Date('2026-10-25T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof AReceber !== 'undefined' && typeof Comprovantes !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); AReceber._hoje = '2026-10-25'; Comprovantes._hoje = '2026-10-25'; abrirApp('budget'); irPara('b-lanc'); render(); });
    const linha = (id) => p.evaluate((id) => MoneyModulos.html('lancamento.linha', { g: Gasto.todos().find((g) => g.id === id) }), id);

    console.log('1) a compra e o estorno do robô, com compra_id');
    await p.evaluate((c) => { Comprovantes.receber(c[0]); Comprovantes.receber(c[1]); }, [
      CP('ebanx-PED2', 'compra', { data: '2026-10-20', valor: 123.45, loja: 'Hostinger', pedido: 'PED2', cartao_final: '4321', produto: 'Hospedagem de exemplo' }),
      CP('ebanx-estorno-PED2', 'estorno', { data: '2026-10-24', valor: 123.45, loja: 'Hostinger', pedido: 'PED2', cartao_final: '4321', compra_id: 'ebanx-PED2', id_unico: 'ebanx-estorno-PED2', observacao: 'O IOF não é devolvido.' })]);
    const a1 = await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'ebanx-PED2'); const ar = AReceber.lista(); return { compra: c && c.gastoId, n: ar.length, g: ar[0] && ar[0].gastoId, tot: ar[0] && ar[0].total, onde: ar[0] && ar[0].ondeCartaoId }; });
    ok(a1.compra === 'gh2', 'a compra do comprovante liga ao lançamento de 20/10 (' + a1.compra + ')');
    ok(a1.n === 1 && a1.g === 'gh2' && a1.tot === 123.45 && a1.onde === 'ct1', 'o estorno vira 1 pedido "A receber" ligado à MESMA compra (gh2), R$ 123,45, no cartão final 4321: ' + JSON.stringify(a1));
    const l1 = await linha('gh2'), l0 = await linha('gh1');
    ok(/⏳ estorno a receber R\$\s?123,45/.test(l1), 'a compra estornada mostra "⏳ estorno a receber R$ 123,45"');
    ok(!/estorno/.test(l0), 'a outra compra igual (05/10) fica sem marca');
    await p.evaluate(() => { Comprovantes.receber({ id: 'ebanx-estorno-PED2', tipo: 'comprovante', subtipo: 'estorno', data: '2026-10-24', valor: 123.45, loja: 'Hostinger', pedido: 'PED2', cartao_final: '4321', compra_id: 'ebanx-PED2' }); });
    ok(await p.evaluate(() => AReceber.lista().length === 1), 'o mesmo estorno de novo não duplica o pedido');

    console.log('2) o total no Painel e no 📥');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    const pain = await p.evaluate(() => (document.querySelector('.ar-painel') || {}).innerText || '');
    ok(/Estornos e reembolsos a receber: R\$\s?123,45 · 1 pedido/.test(pain), 'Painel: ' + JSON.stringify(pain));
    await p.evaluate(() => abrirInbox());
    const ib = await p.evaluate(() => (document.querySelector('.ar-inbox-total') || {}).innerText || '');
    ok(/A receber \(estornos e reembolsos\): R\$\s?123,45 · 1 pedido/.test(ib), '📥: ' + JSON.stringify(ib));
    await p.evaluate(() => { document.querySelectorAll('.modal-wrap:not(.hidden)').forEach((m) => fechar(m.id)); });

    console.log('3) o crédito cai um pouco menor (câmbio, IOF): fecha, marca e anula');
    await p.evaluate(() => { AReceber._hoje = '2026-11-10'; Gasto.add({ id: 'gc1', data: '2026-11-10', valor: 119.9, estorno: true, grupo: 'OUTROS', sub: 'Sem categoria', desc: 'EBN*HOSTINGER', descRobo: 'EBN*HOSTINGER', cartaoId: 'ct1', fluxo: 'saida', origem: 'robo' }); });
    await p.waitForTimeout(50);
    const a3 = await p.evaluate(() => { AReceber.vigiar(); const x = AReceber.lista()[0], c = Gasto.todos().find((g) => g.id === 'gc1'); return { est: x.estado, falta: AReceber.restante(x), de: c.estornoDe, cat: c.grupo + '/' + c.sub, v: c.valor }; });
    ok(a3.est === 'recebido' && a3.falta === 0, 'R$ 119,90 de R$ 123,45 (97 %) fecha o pedido: ' + JSON.stringify(a3));
    ok(a3.de === 'gh2' && a3.cat === 'PESSOAL/Assinaturas' && a3.v < 0, 'o crédito vira estorno da compra gh2, na mesma categoria, negativo (os dois se anulam)');
    ok(/✓ estorno recebido em 10\/Nov\/2026/.test(await linha('gh2')), 'a compra mostra "✓ estorno recebido em 10/Nov/2026"');
    ok(!/estorno/.test(await linha('gh1')), 'a outra compra continua sem marca');
    ok(await p.evaluate(() => AReceber.abertos().length === 0 && !MoneyModulos.html('budget.painel', {}).includes('ar-painel')), 'nada mais a receber: o total sai do Painel');

    console.log('4) sem compra_id: a única compra parecida; com duas iguais, não chuta');
    await p.evaluate(() => {
      Comprovantes.receber({ id: 'est-x', tipo: 'comprovante', subtipo: 'estorno', data: '2026-11-11', valor: 50, loja: 'Loja Exemplo Xis', cartao_final: '4321' });
      Comprovantes.receber({ id: 'est-d', tipo: 'comprovante', subtipo: 'estorno', data: '2026-11-11', valor: 80, loja: 'Loja Dupla Exemplo', cartao_final: '4321' });
    });
    const a4 = await p.evaluate(() => { const ar = (id) => AReceber.achar(Comprovantes.lista().find((c) => c.id === id).arId); return { x: ar('est-x').gastoId, d: ar('est-d').gastoId }; });
    ok(a4.x === 'gx1', 'loja, valor e final batem com uma compra só: liga (' + a4.x + ')');
    ok(a4.d === '', 'duas compras iguais (80,00) sem compra_id: não liga a nenhuma (' + JSON.stringify(a4.d) + ')');

    console.log('5) a pessoa já tinha pedido o estorno; o robô usa o mesmo pedido');
    await p.evaluate(() => { const g = Gasto.todos().find((x) => x.id === 'gm1'); AReceber.salvar(AReceber.deGasto(g)); });
    const n5 = await p.evaluate(() => AReceber.lista().length);
    await p.evaluate(() => { Comprovantes.receber({ id: 'est-m', tipo: 'comprovante', subtipo: 'estorno', data: '2026-11-12', valor: 70, loja: 'Loja Eme Exemplo', cartao_final: '4321' }); });
    const a5 = await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'est-m'); const l = AReceber.lista().filter((x) => x.gastoId === 'gm1'); return { n: AReceber.lista().length, l: l.length, mesmo: l[0] && l[0].id === c.arId }; });
    ok(a5.n === n5 && a5.l === 1 && a5.mesmo, 'um pedido só para a compra gm1, e o comprovante aponta para ele: ' + JSON.stringify(a5));

    console.log('6) passou do prazo (45 dias): [Já recebi] [Adiar 15 dias] [Desistir]');
    await p.evaluate(() => { AReceber._hoje = '2026-12-26'; });   /* o pedido de gx1 foi em 11/11: 45 dias = 26/12 ainda no prazo */
    ok(await p.evaluate(() => !AReceber.atrasados().some((x) => x.gastoId === 'gx1')), 'em 26/12 (45 dias) ainda no prazo');
    await p.evaluate(() => { AReceber._hoje = '2026-12-27'; });
    const ib6 = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'receber') || {}).html || '');
    ok(/Loja Exemplo Xis ainda não estornou/.test(ib6) && />✓ Já recebi</.test(ib6) && />Adiar 15 dias</.test(ib6) && />Desistir</.test(ib6), '📥 em 27/12: "ainda não estornou" com Já recebi, Adiar 15 dias e Desistir');
    const idx = await p.evaluate(() => AReceber.lista().find((x) => x.gastoId === 'gx1').id);
    await p.evaluate((id) => { const b = document.createElement('button'); b.dataset.acao = 'ar-cobrei'; b.dataset.id = id; document.body.appendChild(b); b.click(); b.remove(); }, idx);
    ok(await p.evaluate((id) => AReceber.achar(id).adiadoAte === '2027-01-11' && !AReceber.atrasados().some((x) => x.id === id), idx), '"Adiar 15 dias": volta em 11/01/2027');

    console.log('7) ES');
    const es = await p.evaluate(() => { I18n.atual = 'es'; const h = MoneyModulos.html('lancamento.linha', { g: Gasto.todos().find((g) => g.id === 'gx1') }) + (inboxGrupos().find((g) => g.id === 'receber') || {}).html; I18n.atual = 'pt'; return h; });
    ok(/reembolso por recibir/.test(es), 'ES: "reembolso por recibir" na compra');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU (exceção): ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
