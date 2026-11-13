/* =====================================================================
   teste/teste-pre-autorizacao.js — 3.80: PRÉ-AUTORIZAÇÕES DO CARTÃO (modulos/pre-autorizacao.js). Dados FICTÍCIOS.
   Entrega do robô simulada com o conversor de verdade (MoneyNuvem._teste.Caixa.converter) e o mesmo caminho do lote
   (pendente → PreAut.receber; definitivo → Gasto.add; no fim, PreAut.entrega() e PreAut.limpar()).
   Confere: pendente → definitivo com OUTRO id (não duplica; o "gastou" só conta o definitivo); caução de locadora fora do
   previsto e liberada depois (aviso no 📥); pendente que some da entrega e é liberado em 7 dias; a soma no saldo previsto,
   na fatura aberta e no previsto da categoria; selos na tela de Lançamentos; visão da casa segue o lançamento.
   Uso: node teste/teste-pre-autorizacao.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  bancos: [{ id: 'bk1', nome: 'Banco Exemplo' }],
  cartoes: [{ id: 'ct1', apelido: 'Cartão Exemplo', bandeira: 'visa', fim: '1234', fecha: 25, vence: 5, bancoId: 'bk1', contaId: 'cc-cartao' }],
  gastos: [{ id: 'g0', data: '2026-11-02', valor: 40, grupo: 'ALIMENTACAO', sub: 'Restaurante', desc: 'RESTAURANTE EXEMPLO', fluxo: 'saida', cartaoId: 'ct1' }] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PreAut !== 'undefined' && window.MoneyNuvem && MoneyNuvem._teste);
    await p.evaluate(() => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      /* o lote da caixa do robô, como no nuvem.js */
      window.LOTE = (itens, dia) => {
        PreAut._hoje = dia; const C = MoneyNuvem._teste.Caixa;
        itens.forEach((l) => { const g = C.converter(Object.assign({ tipo: 'despesa', forma: 'Crédito', conta_cartao: 'cc-cartao', final: '1234', banco: 'Banco Exemplo' }, l));
          if (l.pendente === true) PreAut.receber(g, l); else if (!Gasto.todos().some((x) => x.id === g.id)) Gasto.add(g); });
        if (itens.length) { PreAut.entrega(); PreAut.limpar(); } Store.salvar();   /* lote vazio: o nuvem.js nem chega aqui */
      };
      window.GASTOU = (mes) => Gasto.todos().filter((g) => g.fluxo !== 'entrada' && String(g.data).slice(0, 7) === mes).reduce((s, g) => s + g.valor, 0);
    });

    console.log('1) pendente → definitivo com outro id');
    await p.evaluate(() => LOTE([{ id: 'pend-1', data: '2026-11-08', valor: 250, descricao: 'MERCADO EXEMPLO', grupo: 'HABITACAO', categoria: 'Supermercado', pendente: true, caucao_provavel: false }], '2026-11-08'));
    const a1 = await p.evaluate(() => ({ at: PreAut.ativos().map((x) => [x.id, x.cartaoId, x.valor, x.caucao].join('|')), gastou: GASTOU('2026-11'), ng: Gasto.todos().length }));
    ok(a1.at.length === 1 && a1.at[0] === 'pa_pend-1|ct1|250|false' && a1.gastou === 40 && a1.ng === 1, 'o pendente fica fora do livro: o "gastou" de novembro continua R$ 40 ' + JSON.stringify(a1));
    const a1b = await p.evaluate(() => { Previsao._hoje = '2026-11-08'; const pv = Previsao.previstoMes('HABITACAO', 'Supermercado', '2026-11'); return { gs: PreAut.ativos().map((x) => x.grupo + '/' + x.sub + '/' + x.data + '/' + x.caucao), fixo: pv.fixo, vem: pv.comprometidoAVir.map((c) => c.nome + '|' + c.valor), fat: Banco.faturas('ct1').map((f) => f.vencimento + '|' + f.total + '|' + (f.pendente || 0)) }; });
    ok(a1b.fixo === 250 && a1b.vem.join() === '⏳ MERCADO EXEMPLO|250', 'previsto da categoria: R$ 250 comprometido ("⏳ MERCADO EXEMPLO") ' + JSON.stringify(a1b));
    ok(a1b.fat.join() === '2026-12-05|290|250', 'fatura aberta de 05/12: R$ 40 + R$ 250 pendente = R$ 290: ' + a1b.fat.join());
    await p.evaluate(() => { abrirApp('budget'); irPara('b-lanc'); render(); });
    const t1 = await p.evaluate(() => (document.querySelector('.pa-card') || {}).innerText || '');
    ok(/No cartão, ainda não cobrado/.test(t1) && /MERCADO EXEMPLO/.test(t1) && /⏳ Pendente no cartão/.test(t1), 'Lançamentos: "⏳ Pendente no cartão"');
    await p.evaluate(() => LOTE([{ id: 'def-9', data: '2026-11-10', valor: 252.4, descricao: 'MERCADO EXEMPLO', grupo: 'HABITACAO', categoria: 'Supermercado' },
      { id: 'pend-1', data: '2026-11-08', valor: 250, descricao: 'MERCADO EXEMPLO', grupo: 'HABITACAO', categoria: 'Supermercado', pendente: true, caucao_provavel: false }], '2026-11-10'));
    const a1c = await p.evaluate(() => ({ at: PreAut.ativos().length, p: PreAut.lista()[0], gastou: GASTOU('2026-11'), fat: Banco.faturas('ct1').map((f) => f.total).join(), pv: Previsao.previstoMes('HABITACAO', 'Supermercado', '2026-11').fixo }));
    ok(a1c.at === 0 && a1c.p.estado === 'cobrado' && a1c.p.gastoId === 'rb_def-9' && a1c.gastou === 292.4, 'o definitivo (outro id, R$ 252,40) substitui o pendente; ele veio de novo no mesmo lote e não volta: gastou R$ 292,40, sem dobrar');
    ok(a1c.fat === '292.4' && a1c.pv === 0, 'a fatura e o previsto não contam duas vezes');

    console.log('2) caução de locadora: fora do previsto, liberada depois');
    await p.evaluate(() => LOTE([{ id: 'cau-1', data: '2026-11-12', valor: 1500, descricao: 'LOCADORA EXEMPLO', grupo: 'VEICULO', categoria: 'Aluguel de carro', pendente: true, caucao_provavel: true }], '2026-11-12'));
    const a2 = await p.evaluate(() => ({ c: PreAut.ativos()[0].caucao, pv: Previsao.previstoMes('VEICULO', 'Aluguel de carro', '2026-11').fixo, lim: PreAut.doCartao('ct1'), fat: Banco.faturas('ct1').map((f) => f.vencimento + '|' + f.total).join() }));
    ok(a2.c === true && a2.pv === 0, 'caução: não entra no previsto da categoria');
    ok(a2.lim === 1500 && a2.fat === '2026-12-05|1792.4', 'entra no limite usado (R$ 1.500) e na fatura: ' + a2.fat);
    await p.evaluate(() => { irPara('b-lanc'); render(); });
    ok(/🔒 Caução \(valor bloqueado no limite\)/.test(await p.evaluate(() => document.querySelector('.pa-card').innerText)) && /costuma ser liberado; o valor final vem depois/.test(await p.evaluate(() => document.querySelector('.pa-card').innerText)), 'selo "🔒 Caução (valor bloqueado no limite)" e a nota');
    await p.evaluate(() => LOTE([{ id: 'outro-1', data: '2026-11-14', valor: 30, descricao: 'PADARIA EXEMPLO', grupo: 'ALIMENTACAO', categoria: 'Padaria' }], '2026-11-15'));
    ok(await p.evaluate(() => PreAut.ativos().length === 1), 'sumiu da entrega há 3 dias: ainda espera (7 dias)');
    await p.evaluate(() => LOTE([{ id: 'outro-2', data: '2026-11-19', valor: 30, descricao: 'PADARIA EXEMPLO', grupo: 'ALIMENTACAO', categoria: 'Padaria' }], '2026-11-19'));
    const a2b = await p.evaluate(() => ({ p: PreAut.lista().find((x) => x.id === 'pa_cau-1'), ib: (inboxGrupos().find((g) => g.id === 'avisos') || {}).html || '', fat: Banco.faturas('ct1').map((f) => f.total).join() }));
    ok(a2b.p.estado === 'liberado' && a2b.p.nota === 'liberado (não foi cobrado)', 'em 7 dias sem aparecer e sem definitivo: "liberado (não foi cobrado)"');
    ok(/A caução de LOCADORA EXEMPLO foi liberada/.test(a2b.ib), '📥: "A caução de LOCADORA EXEMPLO foi liberada"');
    ok(await p.evaluate(() => { ST.config.inboxVistos = ST.config.inboxVistos || {}; ST.config.inboxVistos['pa|pa_cau-1'] = 1; return !/caução/.test((inboxGrupos().find((g) => g.id === 'avisos') || { html: '' }).html); }), '"ok, entendi" tira o aviso');

    console.log('3) pendente comum que some');
    await p.evaluate(() => LOTE([{ id: 'pend-2', data: '2026-11-20', valor: 80, descricao: 'LOJA GAMA', grupo: 'PESSOAL', categoria: 'Roupas', pendente: true, caucao_provavel: false }], '2026-11-20'));
    await p.evaluate(() => LOTE([], '2026-11-28'));
    ok(await p.evaluate(() => PreAut.ativos().length === 1), 'sem entrega nova do robô (lote vazio no dia 28 não conta como "sumiu" antes de 7 dias)');
    await p.evaluate(() => LOTE([{ id: 'outro-3', data: '2026-11-27', valor: 10, descricao: 'PADARIA EXEMPLO', grupo: 'ALIMENTACAO', categoria: 'Padaria' }], '2026-11-28'));
    ok(await p.evaluate(() => PreAut.lista().find((x) => x.id === 'pa_pend-2').estado === 'liberado' && !/LOJA GAMA/.test((inboxGrupos().find((g) => g.id === 'avisos') || { html: '' }).html)), 'liberado; e, como não é caução, sem aviso no 📥');

    console.log('4) a soma no saldo previsto');
    const a4 = await p.evaluate(() => {
      ST.saldos_banco = [{ id: 'sb1', tipo: 'conta', banco: 'Banco Exemplo', conta: 'Conta corrente', saldo: 1000, data: '2026-11-28', hist: [] }];
      SaldoPrevisto._hoje = '2026-11-28';
      LOTE([{ id: 'pend-3', data: '2026-11-24', valor: 300, descricao: 'LOJA DELTA', grupo: 'PESSOAL', categoria: 'Roupas', pendente: true, caucao_provavel: false },
        { id: 'cau-2', data: '2026-11-24', valor: 400, descricao: 'HOTEL EXEMPLO', grupo: 'LAZER', categoria: 'Viagem', pendente: true, caucao_provavel: true }], '2026-11-28');
      const c = SaldoPrevisto.contas()[0], ev = SaldoPrevisto.eventos(c), l = SaldoPrevisto.linha(c);
      return { ev: ev.map((e) => e.data + '|' + e.valor + '|' + e.nome), fim: l[l.length - 1].saldo };
    });
    ok(a4.ev.indexOf('2026-12-05|-300|⏳ LOJA DELTA') >= 0 && a4.ev.indexOf('2026-12-05|-400|🔒 HOTEL EXEMPLO') >= 0 && a4.fim === 300, 'saldo previsto: o pendente (R$ 300) e a caução (R$ 400) saem no vencimento da fatura (05/12): 1.000 → 300 ' + JSON.stringify(a4.ev));

    console.log('5) visão da casa');
    const a5 = await p.evaluate(() => { const est = Store.estado; est.visaoCasa = { pessoas: ['pbia'] }; const x = PreAut.lista().find((y) => y.id === 'pa_pend-3');
      Escopo.preparar(est); const antes = Escopo.de('cartao_pendentes', x); est.cartoes[0].usaId = 'pbia'; Escopo.preparar(est); return [antes, Escopo.de('cartao_pendentes', x)]; });
    ok(a5[0] === 'reservado' && a5[1] === 'casa', 'segue a regra do lançamento: cartão dele → reservado; cartão que ela usa → casa');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
