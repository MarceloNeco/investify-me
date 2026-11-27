/* =====================================================================
   teste/teste-confirmar-detalhe.js — 3.116: "Confirmar classificação" no 📥 mostra o que falta para decidir.
   Cada grupo: total, quantos, de DD/MM a DD/MM, o último valor e a lista (data, valor, conta/cartão, descrição original);
   a sugestão legível ("Sugestão: Bancários > Tarifa de cartão") e por quê (tipo de loja, categoria do banco, parecido
   já confirmado, robô pela descrição); a compra nas datas e na cidade de uma viagem cadastrada → "Parece da viagem X";
   sem viagem, a cidade no texto do cartão → "Compra em X: foi viagem? Criar a viagem".
   Tudo FICTÍCIO. Uso: node teste/teste-confirmar-detalhe.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { pessoasV: 2 }, posicoes: [], recorrentes: [], gastos: [
  /* um parecido que a pessoa já confirmou */
  { id: 'conf1', data: '2026-09-02', valor: 80, grupo: 'PESSOAL', sub: 'Vestuário', desc: 'MODAEXEMPLO CENTRO', descRobo: 'MODAEXEMPLO CENTRO', fluxo: 'saida', origem: 'robo', confirmadoEm: '2026-09-03T10:00:00Z' }] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Origem && window.Viagem);
    await p.evaluate(() => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget');
      Viagem._hoje = '2026-11-20';
      const C = MoneyNuvem._teste.Caixa, add = (l) => Gasto.add(C.converter(Object.assign({ tipo: 'despesa', confianca: 'palpite', banco: 'Banco Ficticio', forma: 'Debito' }, l)));
      /* 1) robô pela descrição, 3 lançamentos */
      add({ id: 'tf1', data: '2026-11-01', valor: 10, descricao: 'TARIFA EXEMPLO PACOTE', grupo: 'BANCARIOS', categoria: 'Tarifa de cartão' });
      add({ id: 'tf2', data: '2026-11-10', valor: 15, descricao: 'TARIFA EXEMPLO PACOTE', grupo: 'BANCARIOS', categoria: 'Tarifa de cartão' });
      add({ id: 'tf3', data: '2026-11-05', valor: 12, descricao: 'TARIFA EXEMPLO PACOTE', grupo: 'BANCARIOS', categoria: 'Tarifa de cartão' });
      /* 2) tipo de loja (MCC), sem categoria do robô */
      add({ id: 'mc1', data: '2026-10-20', valor: 33.5, descricao: 'DROGA EXEMPLO', grupo: 'OUTROS', categoria: '', confianca: '', contraparte: { mcc: '5912' } });
      /* 3) a categoria que o banco informa */
      add({ id: 'pl1', data: '2026-10-21', valor: 44, descricao: 'MERCADINHO FICTICIO', grupo: 'HABITACAO', categoria: 'Supermercado', cat_pluggy: 'Groceries' });
      /* 4) parecido com um já confirmado */
      add({ id: 'pa1', data: '2026-10-22', valor: 90, descricao: 'MODAEXEMPLO SHOPPING', grupo: 'PESSOAL', categoria: 'Vestuário' });
      /* 5) na viagem cadastrada (datas e cidade batem) */
      Viagem.salvar({ nome: 'Serra Ficticia', destinos: ['Canela'], inicio: '2026-11-12', fim: '2026-11-15' });
      add({ id: 'vg1', data: '2026-11-13', valor: 70, descricao: 'LOJA COLONIAL EXEMPLO CANELABR', grupo: 'HABITACAO', categoria: 'Supermercado', forma: 'Credito' });
      /* 6) sem viagem: a cidade no texto do cartão */
      add({ id: 'cd1', data: '2026-10-02', valor: 25, descricao: 'DOCERIA EXEMPLO GRAMADOBR', grupo: 'LAZER', categoria: 'Restaurante', forma: 'Credito' });
      Store.salvar();
    });
    const g = await p.evaluate(() => {
      const x = (r) => Origem.grupos().find((y) => y.itens.some((g) => g.idRobo === r));
      const um = (r) => { const y = x(r); return y ? { det: (() => { const d = document.createElement('div'); d.innerHTML = Origem.detalhe(y); d.querySelectorAll('li, span, summary').forEach((e) => e.append(' ')); return d.textContent.replace(/\s+/g, ' '); })(), mot: Origem.motivo(y).k, sug: Origem.sugestao(y), vg: Origem.viagem(y) } : null; };
      return { tf: um('tf1'), mc: um('mc1'), pl: um('pl1'), pa: um('pa1'), vg: um('vg1'), cd: um('cd1') };
    });
    console.log('1) total, período, último valor e a lista');
    ok(/3 lançamento\(s\) · R\$ 37,00 · de 01\/11 a 10\/11 · último R\$ 15,00/.test(g.tf.det), 'o grupo diz total, quantos, de quando a quando e o último: ' + g.tf.det.slice(0, 90));
    ok(/10\/11 · R\$ 15,00 · Banco Ficticio · TARIFA EXEMPLO PACOTE/.test(g.tf.det) && /ver os lançamentos/.test(g.tf.det), 'a lista: data, valor, conta e a descrição original');
    console.log('2) a sugestão legível e por quê');
    ok(g.tf.sug === 'Bancários > Tarifa de cartão' && /Sugestão: Bancários > Tarifa de cartão \(o robô sugeriu pela descrição do banco\)/.test(g.tf.det), '"Sugestão: Bancários > Tarifa de cartão (o robô sugeriu pela descrição do banco)"');
    ok(g.mc && g.mc.mot === 'mcc' && /tipo de loja/.test(g.mc.det), 'pelo tipo de loja que o banco informa (MCC): ' + (g.mc && g.mc.mot));
    ok(g.pl && g.pl.mot === 'banco' && /categoria que o banco informa \("Groceries"\)/.test(g.pl.det), 'pela categoria que o banco informa: ' + (g.pl && g.pl.mot));
    ok(g.pa && g.pa.mot === 'parecido' && /parecido com "MODAEXEMPLO CENTRO", que você já confirmou/.test(g.pa.det), 'parecido com um que a pessoa já confirmou: ' + (g.pa && g.pa.mot));
    console.log('3) viagem');
    ok(g.vg && g.vg.vg && g.vg.vg.v && /Parece da viagem Serra Ficticia/.test(g.vg.det), 'nas datas e na cidade da viagem: "Parece da viagem Serra Ficticia"');
    ok(g.cd && g.cd.vg && g.cd.vg.nome === 'Gramado' && /Compra em Gramado: foi viagem\? Criar a viagem/.test(g.cd.det), 'sem viagem, a cidade do cartão: "Compra em Gramado: foi viagem? Criar a viagem"');
    ok(g.tf.vg === null, 'sem cidade, nada de viagem');
    console.log('4) no 📥');
    await p.evaluate(() => abrirInbox()); await p.waitForTimeout(200);
    const m = await p.evaluate(() => { const t = (document.querySelector('#genModal') || {}).textContent || ''; return { t: t.replace(/\s+/g, ' '), botao: !!document.querySelector('#genModal [data-acao="vg-criar"][data-n="Gramado"]'), lista: !!document.querySelector('#genModal details.or-lista') }; });
    ok(/Sugestão: Bancários > Tarifa de cartão/.test(m.t) && /de 01\/11 a 10\/11/.test(m.t) && m.lista && m.botao, 'no 📥: a sugestão, o período, a lista e o botão "Criar a viagem"');
    await p.click('#genModal [data-acao="vg-criar"][data-n="Gramado"]'); await p.waitForTimeout(250);
    const f = await p.evaluate(() => ({ fechou: !document.getElementById('genModal').classList.contains('hidden') && /Nova viagem/.test(document.getElementById('genTitle').textContent) && /Gramado/.test([...document.querySelectorAll('#genModal input')].map((i) => i.value).join(' ')) }));
    ok(f.fechou, '"Criar a viagem" abre o cadastro da viagem');
    console.log('5) 3.116: o débito da fatura do cartão (grupo CARTAO do robô) e as partes que o robô separa');
    const pc = await p.evaluate(() => {
      const C = MoneyNuvem._teste.Caixa;
      const fat = C.converter({ id: 'pf1', tipo: 'despesa', data: '2026-11-08', valor: 900, banco: 'Banco Ficticio', descricao: 'DEB AUTOR SEGURADORA FICTICIA CR', grupo: 'CARTAO', categoria: 'Pagamento da fatura', confianca: 'palpite' });
      const anu = C.converter({ id: 'pf2', tipo: 'despesa', data: '2026-11-08', valor: 9, banco: 'Banco Ficticio', descricao: 'DEB AUTOR SEGURADORA FICTICIA CR (anuidade cartão)', grupo: 'BANCARIOS', categoria: 'Tarifa Cartao Credito', confianca: 'confirmada' });
      Gasto.add(fat); Gasto.add(anu);
      const st = (id) => Origem.status(Gasto.todos().find((g) => g.idRobo === id));
      return { fat: fat.grupo + '|' + fat.sub + '|' + (fat.confianca || '') + '|' + !!fat.revisar, anu: anu.grupo + '|' + anu.sub + '|' + (anu.confianca || ''), st1: st('pf1'), st2: st('pf2') };
    });
    ok(pc.fat === 'OUTROS|Pagamento de fatura||false' && pc.st1 === '', 'grupo CARTAO = "Pagamento de fatura", sem palpite e fora do "Confirmar classificação": ' + pc.fat);
    ok(pc.anu === 'BANCARIOS|Tarifa Cartao Credito|' && pc.st2 === '', 'a anuidade que o robô separou fica como veio (confirmada, fora do "confirmar"): ' + pc.anu);
    console.log('6) 3.116: os avisos do 📥 ("vence em 2 dias") também dizem a data');
    const av = await p.evaluate(() => {
      const h = hojeISO(), d = new Date(h + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 2); const dia = d.toISOString().slice(0, 10);
      ST.recorrentes.push({ id: 'av1', nome: 'Conta Ficticia de Aviso', valor: 77, dia: +dia.slice(8), regra: 'dia', desde: dia, ate: dia, grupo: 'HABITACAO', sub: 'Outros', fluxo: 'saida', estadoPadrao: 'pendente', criadoEm: h });
      const g = inboxGrupos().find((x) => x.id === 'avisos'); const div = document.createElement('div'); div.innerHTML = (g && g.html) || '';
      const li = [...div.querySelectorAll('li')].find((x) => /Conta Ficticia de Aviso/.test(x.textContent));
      return { txt: li ? li.textContent.replace(/\s+/g, ' ') : '', data: I18n.data(dia) };
    });
    ok(av.txt.indexOf('R$ 77,00') >= 0 && av.txt.indexOf(av.data) >= 0, 'o aviso tem o valor e a data: ' + av.txt.slice(0, 90));
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
