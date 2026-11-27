/* =====================================================================
   teste/teste-3131.js — 3.131: Bancos e cartões legíveis, cartões encontrados por conta, fatura a pagar × limite usado, e a ficha
   de fora ("Inquilino") que não é da casa. Dados FICTÍCIOS.
   Uso: node teste/teste-3131.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, fim, conta, band, cc) => Object.assign({ id, data, valor: 50, grupo: 'PESSOAL', sub: 'Outros', desc: 'LOJA EXEMPLO', fluxo: 'saida', origem: 'robo', finalCartao: fim, conta, cartaoNome: band }, cc ? { contaCartao: cc } : {});
const gastos = [
  G('g1', '2026-11-01', '1101', 'Banco Alfa', 'Mastercard Black', { id: 'cc-a', nome: 'Black Exemplo' }),
  G('g2', '2026-11-02', '2202', 'Banco Alfa', 'Mastercard Black', { id: 'cc-a', nome: 'Black Exemplo' }),
  G('g3', '2026-10-02', '2202', 'Banco Alfa', 'Mastercard Black'),               /* compra antiga do mesmo final, sem conta_cartao */
  G('g4', '2026-11-03', '3303', 'Banco Beta', 'Visa'), G('g5', '2026-11-04', '3304', 'Banco Beta', 'Visa'),   /* virtuais sem conta: um cartão provável */
  G('g6', '2026-11-05', '5505', 'Banco Beta', 'Visa Platinum', { id: 'cc-b', nome: 'Platinum Exemplo' })
];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos,
  terceiros: [{ id: 't1', marcador: 'CONDOMINIO EXEMPLO', acao: 'processar', paraQuem: 'Inquilina' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
      const W = vp.width; console.log('tela ' + W);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.SaldoBanco && window.Cartoes && window.Pessoas);
      await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
        Banco.adicionar('341', '');
        ST.saldos_banco = [];
        SaldoBanco.receber({ tipo: 'saldo', id: 's1', banco: 'Itaú', conta: 'Conta corrente', conta_id: 'ca1', categoria_conta: 'conta', numero_conta: '000123', agencia: '0001', saldo: 1000, data: hojeISO() });
        Store.salvar(); abrirApp('budget'); irPara('config'); render(); });
      await p.waitForTimeout(200);

      /* 1) a linha do banco */
      const bk = await p.evaluate(() => { const c = document.querySelector('.bk-cel'); if (!c) return null; const cs = [...c.querySelectorAll('.t-sub')];
        return { txt: c.innerText, linhas: cs.map((x) => x.textContent), cortado: cs.some((x) => getComputedStyle(x).textOverflow === 'ellipsis' && x.scrollWidth > x.clientWidth + 1), bloco: cs.every((x) => getComputedStyle(x).display === 'block') }; });
      ok(bk && bk.linhas.some((x) => x === 'Ag. 0001 · Conta 00012-3'), W + ': a agência e a conta em linha própria: "Ag. 0001 · Conta 00012-3"');
      ok(bk && bk.linhas.some((x) => /^cód\. 341 · CNPJ /.test(x)) && bk.bloco && !bk.cortado, W + ': o código e o CNPJ em outra linha, sem grudar nem cortar com reticências: ' + (bk && bk.linhas.join(' | ')));

      /* 2) os cartões encontrados, por conta */
      const enc = await p.evaluate(() => Cartoes.encontrados().map((x) => x.chave + ':' + x.finais.slice().sort().join('+')).sort());
      ok(enc.join(' ') === 'b:banco beta|visa:3303+3304 c:cc-a:1101+2202 c:cc-b:5505', W + ': 5 finais viram 3 cartões: a conta cc-a (o 2202 antigo, sem conta, vai junto), a cc-b e os virtuais do mesmo banco e bandeira: ' + enc.join(' '));
      const ct = await p.evaluate(() => { const c = document.querySelector('.ct-encontrados'); return c ? { tit: c.querySelector('b').textContent, n: c.querySelectorAll('li').length, bt: c.querySelectorAll('[data-acao="ct-encontrado"]').length } : null; });
      ok(ct && /Encontrei 3 cartões nas suas compras/.test(ct.tit) && ct.n === 3 && ct.bt === 3, W + ': "Encontrei 3 cartões nas suas compras", um "Cadastrar" por conta');
      await p.evaluate(() => document.querySelector('.ct-encontrados [data-acao="ct-encontrado"][data-chave="c:cc-a"]').click()); await p.waitForTimeout(200);
      const fs1 = await p.evaluate(() => [...document.querySelectorAll('#assetModal .ct-f-fim, .ct-finais .ct-f-fim')].map((x) => x.value).filter(Boolean).sort().join('+'));
      ok(fs1 === '1101+2202', W + ': "Cadastrar" abre o cartão já com os finais da conta (1101 e 2202): ' + fs1);
      await p.evaluate(() => { document.querySelectorAll('.modal:not(.hidden)').forEach((m) => m.classList.add('hidden')); });

      /* 3) fatura a pagar × limite usado */
      const sb = await p.evaluate(() => {
        SaldoBanco.receber({ tipo: 'saldo', id: 'k1', banco: 'Banco Alfa', conta: 'BLACK EXEMPLO', conta_id: 'cc-a', categoria_conta: 'cartao', final_conta: '1101', saldo: -9000, limite_usado: -9000, fatura_aberta: -3700, fatura_fechada: true, vence: '2026-12-10', data: hojeISO() });
        SaldoBanco.receber({ tipo: 'saldo', id: 'k2', banco: 'Banco Beta', conta: 'PLATINUM EXEMPLO', conta_id: 'cc-b', categoria_conta: 'cartao', final_conta: '5505', saldo: -6700, limite_usado: -6700, fatura_aberta: -6700, fatura_fechada: false, data: hojeISO() });
        const r1 = SaldoBanco.contas().find((x) => x.id === 'sb_cc-a'), r2 = SaldoBanco.contas().find((x) => x.id === 'sb_cc-b');
        return { f1: SaldoBanco.faturaAPagar(r1), u1: SaldoBanco.limiteUsado(r1), f2: SaldoBanco.faturaAPagar(r2), u2: SaldoBanco.limiteUsado(r2), conf: SaldoBanco.conferir(r2).banco };
      });
      ok(sb.f1 === 3700 && sb.u1 === 9000, W + ': fatura fechada: "a pagar" R$ 3.700 e, à parte, limite usado R$ 9.000 (com as parcelas futuras)');
      ok(sb.f2 === null && sb.u2 === 6700 && sb.conf === null, W + ': fatura_fechada=false: o número é só "limite usado", nunca "fatura"');
      await p.evaluate(() => { irPara('b-painel'); render(); });
      await p.waitForTimeout(200);
      const t = await p.evaluate(() => { const c = document.querySelector('.sb-card'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
      ok(/Fatura a pagar R\$\s?3\.700,00 \(vence 10\/12\)/.test(t) && /Limite usado R\$\s?9\.000,00 \(inclui parcelas futuras\)/.test(t) && /Limite usado R\$\s?6\.700,00/.test(t) && !/Fatura a pagar R\$\s?6\.700/.test(t) && !/Fatura a pagar R\$\s?9\.000/.test(t),
        W + ': na Conferência com o banco: "Fatura a pagar R$ 3.700,00 (vence 10/12)" e "Limite usado R$ 9.000,00 (inclui parcelas futuras)"; o cartão sem fatura fechada só mostra o limite usado');
      const ev = await p.evaluate(() => { SaldoPrevisto._hoje = '2026-11-27';
        ST.saldos_banco.push({ id: 'sbx', tipo: 'conta', banco: 'Banco Alfa', conta: 'Conta corrente', final: '0001', saldo: 20000, data: '2026-11-27', hist: [] });
        const c = SaldoPrevisto.contas().find((x) => x.id === 'sbx'); return SaldoPrevisto.eventos(c).filter((e) => /^Fatura/.test(e.nome)).map((e) => e.data + ':' + e.valor); });
      ok(ev.join() === '2026-12-10:-3700', W + ': o saldo previsto tira só a FATURA a pagar no vencimento (R$ 3.700 em 10/12), não o limite usado: ' + ev.join());

      /* 4) a ficha que nasce de terceiro é "outra"; "Esta pessoa é da família?" */
      /* a migração dos nomes soltos roda ao abrir (como num aparelho novo): o "para quem" da lista de terceiros vira ficha */
      const mig = await p.evaluate(() => { const x = (ST.pessoas || []).find((q) => /inquilin/i.test(q.nome)); return x ? x.tipo : 'nenhuma'; });
      ok(mig === 'outra', W + ': a ficha que nasce da lista de terceiros ("para quem: Inquilina") nasce "outra", nunca "casa": ' + mig);
      ok(await p.evaluate(() => Pessoas.pareceDeFora('Inquilino') && Pessoas.pareceDeFora('Prestador Exemplo') && Pessoas.pareceDeFora('Locatária') && !Pessoas.pareceDeFora('Ana Exemplo')), W + ': nomes de fora: inquilino, prestador, locatária (e "Ana Exemplo" não)');
      await p.evaluate(() => { ST.pessoas.push({ id: 'pinq', tipo: 'casa', papel: '', nome: 'Inquilino', banco: [] }, { id: 'pana', tipo: 'casa', papel: 'dependente', nome: 'Ana Exemplo', banco: [] });
        ST.visaoCasa = { pessoas: ['pinq', 'pana'] }; Store.salvar(); });
      await p.evaluate(() => { const real = window.MoneyNuvem || {};
        window.MoneyNuvem = Object.assign(Object.create(real), { iniciado: true, local: true, nomePessoa: () => 'Fulano de Tal',
          escopos: { estado: () => ({ mk: true, tudo: true, feito: false, pin: true }), eu: () => 'u1', visoes: () => Promise.resolve([]), pinConta: () => Promise.resolve(false), criarPinConta: () => {} } });
        irPara('config'); cfgSecao = 'todos'; render(); });
      await p.waitForTimeout(300);
      const html = await p.evaluate(() => (document.querySelector('.vc-pessoas') || {}).innerHTML || '');
      ok(/vc-de-fora/.test(html) && /Esta pessoa é da família\?/.test(html) && (html.match(/data-acao="vc-de-fora"/g) || []).length === 1, W + ': em "Quem é da casa", só o Inquilino ganha "Esta pessoa é da família?" com "Não, é de fora"');
      await p.evaluate(() => { const bt = document.createElement('button'); bt.dataset.acao = 'vc-de-fora'; bt.dataset.id = 'pinq'; document.body.appendChild(bt); bt.click(); bt.remove(); });
      const de = await p.evaluate(() => ({ t: ST.pessoas.find((x) => x.id === 'pinq').tipo, m: ST.visaoCasa.pessoas.join() }));
      ok(de.t === 'outra' && de.m === 'pana', W + ': "Não, é de fora": vira "Outras pessoas" e sai da lista da casa');
      ok(!p.erros.length, W + ': sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
