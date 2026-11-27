/* =====================================================================
   teste/teste-conta-servicos.js — 3.136: serviço novo ou aumento na conta recorrente (modulos/conta-servicos.js) e a ficha
   inteira do robô (modulos/comprovantes.js 1.5.0). Dados FICTÍCIOS.
   Confere: o serviço novo no 📥 ("Você contratou?") · "Não pedi" com o passo a passo, guardado até o valor sumir da fatura seguinte ·
   "Sim, contratei" não pergunta de novo · o aumento ("subiu de … para … (+n%)", com "ver o que mudou" e o serviço que saiu) · nada
   mudou = nenhum aviso · "serviços desta fatura" na ficha · a conta paga no cartão liga à cobrança e nunca pede "pague" · a ficha
   inteira (no topo ou em "ficha"; lista de 300 lançamentos inteira) · cartao_final.
   Uso: node teste/teste-conta-servicos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor) => ({ id: 'rb_' + id, idRobo: id, data, valor, desc: 'OPERADORA EXEMPLO', descRobo: 'OPERADORA EXEMPLO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Telefone', origem: 'robo', cartaoId: 'c1', finalCartao: '1234' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [{ id: 'c1', apelido: 'Cartão Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3 }],
  gastos: [G('v1', '2026-11-12', 89.9)] };
const IT = (d, v, inc) => ({ descricao: d, quantidade: 1, valor: v, incluso: !!inc });
const FAT = (id, ref, total, extra) => Object.assign({ id, tipo: 'comprovante', subtipo: 'fatura', loja: 'Operadora Exemplo', valor: total, data: ref.slice(3) + '-' + ref.slice(0, 2) + '-05', vencimento: ref.slice(3) + '-' + ref.slice(0, 2) + '-15', referencia: ref, moeda: 'BRL' }, extra);

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-16T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Comprovantes && window.ContaServicos);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const inbox = () => p.evaluate(() => { abrirInbox(); return document.getElementById('genModal').textContent.replace(/\s+/g, ' '); });
    const rec = (l) => p.evaluate((x) => Comprovantes.receber(x), l);
    const cp = (id) => p.evaluate((i) => Comprovantes.lista().find((x) => x.id === i), id);

    console.log('1) a fatura com serviço novo (campos no topo do item, como o robô manda agora)');
    await rec(FAT('op-a-2026-11', '11/2026', 89.9, { pago_no_cartao: true, debito_automatico: true, cartao_final: '1234', conta_chave: 'operadora-000111222',
      itens_conta: [IT('Plano Exemplo', 80), IT('Serviço de Música Exemplo', 9.9), IT('Bônus Exemplo', 0, true)],
      mudancas_conta: { referencia_anterior: '10/2026', servicos_novos: [{ descricao: 'Serviço de Música Exemplo', valor: 9.9 }], servicos_que_sairam: ['Revista Exemplo'], aumentos: [], total_anterior: 80, total_atual: 89.9, variacao_pct: 12.4 } }));
    const a = await cp('op-a-2026-11');
    ok(a.ficha && a.ficha.itens_conta.length === 3 && a.ficha.conta_chave === 'operadora-000111222' && a.ficha.mudancas_conta && a.final === '1234', 'a ficha inteira chega (itens_conta, conta_chave, mudancas_conta) e cartao_final vale como final');
    ok(a.noCartao && a.pagoId === 'rb_v1' && a.estado === 'ok' && !(await p.evaluate(() => Comprovantes.pendencias().some((x) => x.id === 'op-a-2026-11'))), 'paga no cartão: liga à cobrança no cartão (mesmo valor e final) e não pede "pague"');
    let t = await inbox();
    ok(/Operadora Exemplo \(conta ···222\): serviço novo na fatura de 11\/2026 — 'Serviço de Música Exemplo R\$\s?9,90'\. Você contratou\?/.test(t) && /Sim, contratei/.test(t) && /Não pedi/.test(t), '📥: "Operadora Exemplo (conta ···222): serviço novo na fatura de 11/2026 — \'Serviço de Música Exemplo R$ 9,90\'. Você contratou?" [Sim, contratei] [Não pedi]');
    ok(/Operadora Exemplo subiu de R\$\s?80,00 para R\$\s?89,90 \(\+12%\)/.test(t), 'o aumento: "Operadora Exemplo subiu de R$ 80,00 para R$ 89,90 (+12%)"');
    ok(/ver o que mudou/.test(t) && /saiu: Revista Exemplo/.test(t) && /Total: R\$\s?80,00 → R\$\s?89,90 \(antes: 10\/2026\)/.test(t), '"ver o que mudou": o serviço que saiu (só informação) e o total de antes e de agora');

    console.log('2) "Não pedi": o passo a passo, guardado até o valor sumir');
    await p.click('#genModal .csv-novo [data-acao="csv-nao"]'); await p.waitForTimeout(150);
    t = await inbox();
    ok(!/Você contratou\?/.test(t) && /Contestando: Operadora Exemplo \(···222\) — 'Serviço de Música Exemplo R\$\s?9,90'/.test(t) && /Como contestar/.test(t) && /1331/.test(t) && /não clique em links do e-mail/.test(t), 'sai a pergunta e fica "Contestando…" com o passo a passo (app oficial, central, ANATEL 1331)');
    ok(await p.evaluate(() => !!document.querySelector('#genModal .csv-contestado details.csv-passos[open]')), 'o passo a passo já aparece aberto');
    await rec(FAT('op-a-2026-12', '12/2026', 89.9, { conta_chave: 'operadora-000111222', itens_conta: [IT('Plano Exemplo', 80), IT('Serviço de Música Exemplo', 9.9)] }));
    t = await inbox();
    ok(/Contestando: Operadora Exemplo/.test(t) && /ainda aparece na fatura de 12\/2026/.test(t), 'a fatura seguinte ainda cobra: "ainda aparece na fatura de 12/2026"');
    ok(!/Você contratou\?/.test(t) && !/subiu de R\$\s?89/.test(t), 'nada mudou (sem mudancas_conta) = nenhum aviso novo');
    await rec(FAT('op-a-2027-01', '01/2027', 80, { conta_chave: 'operadora-000111222', itens_conta: [IT('Plano Exemplo', 80)] }));
    t = await inbox();
    ok(!/Contestando: Operadora Exemplo/.test(t) && await p.evaluate(() => !Object.keys(ST.config.contaServicos.contestados).length), 'o serviço sumiu da fatura de 01/2027: o aviso some sozinho');
    ok(!/Serviço de Música Exemplo R\$\s?9,90'\. Você contratou/.test(t), 'e a pergunta daquela fatura não volta');

    console.log('3) "Sim, contratei" vira regra (a ficha dentro de "ficha" também vale)');
    await rec(FAT('op-b-2026-11', '11/2026', 120, { ficha: { conta_chave: 'operadora-000333444', itens_conta: [IT('Internet Exemplo', 100), IT('Pacote Filmes Exemplo', 20)],
      mudancas_conta: { servicos_novos: ['Pacote Filmes Exemplo'], total_anterior: 100, total_atual: 120 } } }));
    t = await inbox();
    ok(/conta ···444\): serviço novo na fatura de 11\/2026 — 'Pacote Filmes Exemplo R\$\s?20,00'/.test(t), 'o serviço novo só com o nome: o valor vem da lista de serviços (R$ 20,00)');
    await p.click('#genModal .csv-novo [data-acao="csv-sim"]'); await p.waitForTimeout(150);
    await rec(FAT('op-b-2026-12', '12/2026', 120, { ficha: { conta_chave: 'operadora-000333444', itens_conta: [IT('Internet Exemplo', 100), IT('Pacote Filmes Exemplo', 20)], mudancas_conta: { servicos_novos: ['Pacote Filmes Exemplo'] } } }));
    t = await inbox();
    ok(!/Pacote Filmes Exemplo R\$\s?20,00'\. Você contratou/.test(t) && await p.evaluate(() => ST.config.contaServicos.aceitos['operadora-000333444']['pacote filmes exemplo'] === 1), '"Sim, contratei": esse serviço dessa conta não pergunta mais');
    await p.click('#genModal .csv-aumento [data-acao="csv-ok"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => [...document.querySelectorAll('#genModal .csv-aumento')].length) <= 1 && await p.evaluate(() => Object.keys(ST.config.contaServicos.vistos).length === 1), '"Entendi" tira o aviso do aumento');

    console.log('4) a ficha do lançamento e a ficha inteira');
    const fic = await p.evaluate(() => { document.querySelectorAll('.modal:not(.hidden)').forEach((m) => m.classList.add('hidden')); abrirLancamento('rb_v1'); const d = document.querySelector('.csv-servicos'); return d ? d.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/serviços desta fatura \(3\)/.test(fic) && /Serviço de Música Exemplo · R\$\s?9,90/.test(fic) && /Bônus Exemplo · incluso/.test(fic), 'na ficha do lançamento que pagou a conta: "🧾 serviços desta fatura (3)", com o valor e o "incluso"');
    await rec({ id: 'fat-cartao-x', tipo: 'comprovante', subtipo: 'outro', loja: 'Banco Exemplo', data: '2026-11-10', lancamentos: Array.from({ length: 300 }, (_, i) => ({ data: '2026-10-' + String(1 + i % 28).padStart(2, '0'), descricao: 'LOJA ' + i, valor: i + 1 })) });
    ok((await cp('fat-cartao-x')).ficha.lancamentos.length === 300, 'fichaLimpa não corta: os 300 lançamentos da fatura chegam inteiros');
    await rec({ id: 'compra-x', tipo: 'comprovante', subtipo: 'compra', loja: 'Loja Exemplo', valor: 100, data: '2026-11-10', itens: Array.from({ length: 80 }, (_, i) => ({ produto: 'Item Exemplo ' + i, quantidade: 1, valor: 1.25 })) });
    ok((await cp('compra-x')).itens.length === 80, 'os itens da compra: 80 chegam inteiros');
    await rec({ id: 'stripe-exemplo-1', tipo: 'comprovante', subtipo: 'recibo_exterior', loja: 'Servico Exemplo', moeda: 'USD', valor: 20, data: '2026-11-10', numero: '0001', cartao_final: '1234' });
    ok((await cp('stripe-exemplo-1')).final === '1234' && (await cp('stripe-exemplo-1')).moeda === 'USD', 'recibo do exterior pela Stripe: cartao_final e USD');
    ok(await p.evaluate(() => { abrirInbox(); return document.documentElement.scrollWidth <= 391; }), 'celular (390): o 📥 não rola para o lado');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
