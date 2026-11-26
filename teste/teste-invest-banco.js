/* =====================================================================
   teste/teste-invest-banco.js — 3.119: os investimentos que o robô manda do banco entram na Carteira do InvestifyONE. Dados FICTÍCIOS.
   Confere: uma posição por conta_id, sem duplicar quando chega o saldo do dia seguinte; o papel já cadastrado à mão é casado (não
   cria outro); saldo zero não cria posição; saldo mais velho não passa por cima; o valor da Carteira e do patrimônio é o do banco;
   o selo "veio do banco" e o quadro por banco e produto, com liquidez e vencimento. Foto em /tmp/invest-banco.png.
   Uso: node teste/teste-invest-banco.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const MANUAL = { id: 'm1', ticker: 'CDB FICTICIO 2028', nome: 'CDB Ficticio 2028', tipo: 'renda-fixa', inst: 'Banco Ficticio', qtd: 1, pm: 1000, ix: 'cdi', taxa: 100, moeda: 'BRL', data: '2026-01-02' };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [MANUAL], gastos: [] };
const inv = (id, conta, classe, subtipo, saldo, data, venc) => ({ tipo: 'investimento', id: 'inv-' + id + '-' + data, conta_id: id, banco: 'Banco Ficticio', conta, classe, subtipo, saldo, data, dono: 'Pessoa Teste', moeda: 'BRL', vencimento: venc || '', taxa: null, indexador: '' });

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
    await p.clock.setFixedTime(new Date('2026-11-25T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.InvestBanco && window.SaldoBanco);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); });

    await p.evaluate((l) => { l.forEach((x) => SaldoBanco.receberInvest(x)); }, [
      inv('fic-a', 'CDB Ficticio 2028', 'FIXED_INCOME', 'CDB', 1234.56, '2026-11-24', '2028-03-15'),
      inv('fic-b', 'Fundo Ficticio DI', 'MUTUAL_FUND', 'Fundo DI', 500, '2026-11-24'),
      inv('fic-z', 'Conta Investimento Ficticia', 'FIXED_INCOME', '', 0, '2026-11-24')]);
    await p.waitForTimeout(50);
    let r = await p.evaluate(() => ST.posicoes.map((x) => ({ id: x.id, tipo: x.tipo, v: x.valorManual, ch: x.doBanco && x.doBanco.chave, h: (x.historicoManual || []).length })));
    ok(r.length === 2, 'duas posições: o papel cadastrado à mão e o fundo novo (o saldo zero não cria): ' + r.map((x) => x.id).join(', '));
    const m1 = r.find((x) => x.id === 'm1');
    ok(m1 && m1.ch === 'fic-a' && m1.v === 1234.56, 'o CDB que já estava cadastrado à mão foi casado com o do banco (não criou outro) e ganhou o saldo do banco');
    const fb = r.find((x) => x.id === 'bk_fic-b');
    ok(fb && fb.tipo === 'fundo' && fb.v === 500, 'o fundo novo entrou com id fixo pelo conta_id (bk_fic-b), tipo Fundo e o saldo do banco');

    await p.evaluate((l) => { l.forEach((x) => SaldoBanco.receberInvest(x)); }, [
      inv('fic-a', 'CDB Ficticio 2028', 'FIXED_INCOME', 'CDB', 1240, '2026-11-25', '2028-03-15'),
      inv('fic-b', 'Fundo Ficticio DI', 'MUTUAL_FUND', 'Fundo DI', 501, '2026-11-25')]);
    await p.waitForTimeout(50);
    r = await p.evaluate(() => ST.posicoes.map((x) => ({ id: x.id, v: x.valorManual, h: (x.historicoManual || []).length })));
    ok(r.length === 2 && r.find((x) => x.id === 'm1').v === 1240 && r.find((x) => x.id === 'bk_fic-b').h === 2, 'o saldo do dia seguinte atualiza as mesmas posições, sem duplicar, e guarda o histórico');
    const n = await p.evaluate((x) => { SaldoBanco.receberInvest(x); return InvestBanco.sincronizar(); }, inv('fic-b', 'Fundo Ficticio DI', 'MUTUAL_FUND', 'Fundo DI', 10, '2026-11-20'));
    ok(n === 0 && await p.evaluate(() => ST.posicoes.find((x) => x.id === 'bk_fic-b').valorManual) === 501, 'um saldo mais velho não passa por cima do de hoje');

    const c = await p.evaluate(() => ({ m1: calc(ST.posicoes.find((x) => x.id === 'm1')).valorBase, tot: totais().valor, pat: patrimonioHoje().invest }));
    ok(Math.abs(c.m1 - 1240) < 0.01 && Math.abs(c.tot - 1741) < 0.01 && Math.abs(c.pat - 1741) < 0.01, 'a Carteira e o patrimônio somam o saldo do banco (R$ 1.741,00), não a estimativa pela taxa: ' + JSON.stringify(c));

    await p.evaluate(() => { abrirApp('investify'); irPara('carteira'); render(); });
    await p.waitForTimeout(200);
    const t = await p.evaluate(() => { const q = document.querySelector('.ib-quadro'); return { selos: document.querySelectorAll('.badge.banco').length, q: q ? q.textContent.replace(/\s+/g, ' ') : '' }; });
    ok(t.selos >= 2, 'o selo "🏦 veio do banco" nas duas linhas da Carteira (' + t.selos + ')');
    ok(/Veio do banco/.test(t.q) && /Banco Ficticio/.test(t.q) && /CDB/.test(t.q) && /Fundo DI/.test(t.q), 'o quadro "Veio do banco": por banco e por produto (CDB, Fundo DI)');
    ok(/vence 15\/03\/2028/.test(t.q) && /Liquidez: no vencimento/.test(t.q) && /Liquidez: em 1 dia/.test(t.q), 'com a liquidez (no vencimento; em 1 dia útil para o fundo DI) e o vencimento');
    await p.screenshot({ path: '/tmp/invest-banco.png', fullPage: false });
    await p.evaluate(() => { I18n.atual = 'en'; });
    ok(/from the bank/.test(await p.evaluate(() => InvestBanco.selo())), 'o selo em inglês: "from the bank"');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
