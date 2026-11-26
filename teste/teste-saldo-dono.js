/* =====================================================================
   teste/teste-saldo-dono.js — 3.86: o aviso de saldo diz DE QUEM é a conta e DE QUANDO são os dados; "Já agendei".
   Dados FICTÍCIOS. Confere: "Banco Ficticio do Fulano ···1292" (sem repetir o banco, com o apelido da pessoa),
   "dados de 13/11 14:44" e, passadas 24 h, "pode estar desatualizado"; "Já agendei" soma como entrada planejada, o
   aviso some, o lançamento real o substitui sem contar duas vezes, e sem o real até 2 dias depois o aviso volta; a
   conta atrasada do 📥 diz a conta e a data; visão da casa sem nada disso.
   Uso: node teste/teste-saldo-dono.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos: [{ id: 'g1', data: '2026-10-05', valor: 50, grupo: 'PESSOAL', sub: 'Outros', desc: 'LOJA FICTICIA', fluxo: 'saida' }],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', apelido: 'Fulano' }, { id: 'p2', tipo: 'casa', papel: 'responsavel', nome: 'Beltrana', apelido: 'Beltrana' }] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof SaldoPrevisto !== 'undefined');
    await p.evaluate(() => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      SaldoPrevisto._hoje = '2026-11-14'; SaldoPrevisto._agora = new Date(2026, 10, 14, 10, 0).getTime();
      /* o robô manda o saldo pela caixa (SaldoBanco.receber), com o horário de quando leu */
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-bf', conta_id: 'bf1', banco: 'Banco Ficticio', conta: 'banco ficticio', categoria_conta: 'conta', final_conta: '1292', dono: 'Fulano', saldo: 500, data: '2026-11-13', atualizado_em: new Date(2026, 10, 13, 14, 44).toISOString() });
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-ci', conta_id: 'ci1', banco: 'Caixa Imaginaria', conta: 'CAIXA IMAGINARIA', categoria_conta: 'conta', final_conta: '5419', dono: 'Beltrana', saldo: 300, data: '2026-11-12', atualizado_em: new Date(2026, 10, 12, 8, 5).toISOString() });
      const um = (id, nome, valor, data, conta) => ({ id, nome, valor, dia: Number(data.slice(8)), regra: 'dia', desde: data, ate: data, grupo: 'HABITACAO', sub: 'Outros', fluxo: 'saida', estadoPadrao: 'pendente', conta, criadoEm: '2026-11-01' });
      ST.recorrentes = [um('bol', 'Boleto Ficticio', 2000, '2026-11-25', 'Banco Ficticio'), um('luz', 'Luz Ficticia', 400, '2026-11-10', 'Caixa Imaginaria')];
      abrirApp('budget'); irPara('b-painel'); render();
    });

    console.log('1) de quem é a conta e de quando são os dados');
    const n = await p.evaluate(() => SaldoPrevisto.contas().map((c) => SaldoPrevisto.nome(c) + ' | ' + SaldoPrevisto.dados(c).txt + ' | ' + SaldoPrevisto.dados(c).velho));
    ok(n[0] === 'Banco Ficticio do Fulano ···1292 | dados de 13/11 14:44 | false', 'o nome sem repetir o banco, com o dono, e a data dos dados: ' + n[0]);
    ok(n[1] === 'Caixa Imaginaria da Beltrana ···5419 | dados de 12/11 08:05 | true', 'a outra conta: "da Beltrana" e mais de 24 h → desatualizado: ' + n[1]);
    const at = await p.evaluate(() => { const el = document.querySelector('#view-b-painel .sp-atencao'); return el ? { txt: el.textContent.replace(/\s+/g, ' '), velho: !!el.querySelector('.sp-velho'), botao: !!el.querySelector('[data-acao="sp-ajustar"][data-onde="atencao"]') } : null; });
    ok(at && /Sua conta Banco Ficticio do Fulano ···1292 fica negativa em 25\/11/.test(at.txt) && /dados de 13\/11 14:44/.test(at.txt) && at.botao, '"Precisa da sua atenção": "Sua conta Banco Ficticio do Fulano ···1292 fica negativa em 25/11", "dados de 13/11 14:44" e o botão "Já agendei"');
    await p.evaluate(() => { SaldoPrevisto._agora = new Date(2026, 10, 14, 16, 0).getTime(); render(); });
    const v2 = await p.evaluate(() => { const el = document.querySelector('#view-b-painel .sp-atencao .sp-dados'); return el ? el.textContent + '|' + el.classList.contains('sp-velho') + '|' + getComputedStyle(el).color : ''; });
    ok(/dados de 13\/11 14:44 · pode estar desatualizado\|true\|rgb/.test(v2), 'passou de 24 h: "pode estar desatualizado" em amarelo: ' + v2);
    const inb = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'saldo') || {}).html || '').then((h) => h.replace(/<[^>]+>/g, ''));   /* 3.116: o nome da pessoa virou botão */
    ok(/Banco Ficticio do Fulano/.test(inb) && /dados de 13\/11 14:44 · pode estar desatualizado/.test(inb) && /Já agendei/.test(inb), 'no 📥 também: o dono, a data dos dados e "Já agendei"');

    console.log('2) "Já agendei"');
    await p.click('#view-b-painel .sp-atencao [data-acao="sp-ajustar"]'); await p.waitForTimeout(150);
    await p.evaluate(() => { const box = document.querySelector('#view-b-painel .sp-atencao .sp-form'); box.querySelector('.sp-valor').value = '2000'; box.querySelector('[id^="spData"]').value = '2026-11-18'; });
    await p.click('#view-b-painel .sp-atencao [data-acao="sp-salvar"]'); await p.waitForTimeout(150);
    const j = await p.evaluate(() => { const c = SaldoPrevisto.contas()[0]; return { alerta: SaldoPrevisto.alerta(c), fim: SaldoPrevisto.linha(c).slice(-1)[0].saldo, card: !!document.querySelector('#view-b-painel .sp-atencao'), ev: SaldoPrevisto.eventos(c).map((e) => e.data + '=' + e.valor).join() }; });
    ok(!j.alerta && j.fim === 500 && j.ev === '2026-11-18=2000,2026-11-25=-2000', 'o resgate agendado (2.000 em 18/11) entra como planejado e o aviso some: ' + j.ev);
    await p.evaluate(() => { ST.gastos.push({ id: 'rb_x1', data: '2026-11-17', valor: 2000, grupo: 'INVESTIMENTO', sub: 'Resgate', desc: 'RESGATE CDB FICTICIO', fluxo: 'entrada', conta: 'Banco Ficticio', origem: 'robo' });
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-bf', conta_id: 'bf1', banco: 'Banco Ficticio', conta: 'banco ficticio', categoria_conta: 'conta', final_conta: '1292', dono: 'Fulano', saldo: 2500, data: '2026-11-17', atualizado_em: new Date(2026, 10, 17, 9, 0).toISOString() });
      SaldoPrevisto._hoje = '2026-11-17'; });
    const r2 = await p.evaluate(() => { const c = SaldoPrevisto.contas()[0]; return { fim: SaldoPrevisto.linha(c).slice(-1)[0].saldo, ev: SaldoPrevisto.eventos(c).map((e) => e.data + '=' + e.valor).join(), alerta: !!SaldoPrevisto.alerta(c) }; });
    ok(r2.fim === 500 && r2.ev === '2026-11-25=-2000' && !r2.alerta, 'o resgate real chegou (17/11, saldo 2.500): o planejado sai, sem contar duas vezes (fica 500 depois do boleto): ' + r2.ev);
    await p.evaluate(() => { ST.gastos = ST.gastos.filter((g) => g.id !== 'rb_x1'); SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-bf', conta_id: 'bf1', banco: 'Banco Ficticio', conta: 'banco ficticio', categoria_conta: 'conta', final_conta: '1292', dono: 'Fulano', saldo: 500, data: '2026-11-19', atualizado_em: new Date(2026, 10, 19, 9, 0).toISOString() }); SaldoPrevisto._hoje = '2026-11-20'; });
    ok(await p.evaluate(() => !SaldoPrevisto.alerta(SaldoPrevisto.contas()[0])), 'sem o real, ainda conta até 2 dias depois da data (20/11)');
    await p.evaluate(() => { SaldoPrevisto._hoje = '2026-11-21'; });
    ok(await p.evaluate(() => !!SaldoPrevisto.alerta(SaldoPrevisto.contas()[0])), 'em 21/11, sem o real, o aviso volta');

    console.log('3) os outros avisos que dependem do banco');
    const d = await p.evaluate(() => inboxDadosConta(ST.recorrentes.find((r) => r.id === 'luz')));
    ok(d === ' · conta Caixa Imaginaria da Beltrana ···5419 · dados de 12/11 08:05 · pode estar desatualizado', 'a conta atrasada diz a conta (com o dono) e a data dos dados: ' + d);

    console.log('3b) 3.116: o pior dia, "ver por quê", a conta inteira e o nome que abre a pessoa');
    const q = await p.evaluate(() => {
      SaldoPrevisto._hoje = '2026-11-14';
      /* conta de banco conhecido, com agência e número inteiros (FICTÍCIOS): o dígito vai depois do hífen */
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-it', conta_id: 'it1', banco: 'Itau Ficticio', conta: 'itau ficticio', categoria_conta: 'conta', final_conta: '0123', numero_conta: '000123', agencia: '0001', dono: 'Fulano', saldo: 100, data: '2026-11-14', atualizado_em: new Date(2026, 10, 14, 9, 0).toISOString() });
      const um = (id, nome, valor, data) => ({ id, nome, valor, dia: Number(data.slice(8)), regra: 'dia', desde: data, ate: data, grupo: 'HABITACAO', sub: 'Outros', fluxo: 'saida', estadoPadrao: 'pendente', conta: 'Itau Ficticio', criadoEm: '2026-11-01' });
      ST.recorrentes.push(um('it-a', 'Conta Ficticia A', 300, '2026-11-20'), um('it-b', 'Conta Ficticia B', 700, '2026-11-22'), um('it-c', 'Conta Ficticia C', 50, '2026-11-21'), um('it-d', 'Conta Ficticia D', 900, '2026-12-05'));
      const c = SaldoPrevisto.contas().find((x) => /Itau/.test(x.banco || x.nome || '') || x.numero === '000123'), a = SaldoPrevisto.alerta(c);
      const outra = Object.assign({}, c, { banco: 'Banco Ficticio', numero: '98765', agencia: '' });
      return { conta: SaldoPrevisto.conta(c), outra: SaldoPrevisto.conta(outra), semNumero: SaldoPrevisto.conta({ final: '4321' }), a, porque: SaldoPrevisto.porque(c, a).map((e) => e.nome + '=' + e.valor).join() };
    });
    ok(q.conta === 'ag. 0001 · conta 00012-3', 'banco conhecido: agência e conta inteiras, com o dígito depois do hífen: ' + q.conta);
    ok(q.outra === 'conta 98765' && q.semNumero === '···4321', 'outro banco: o número como veio; sem o número inteiro, o final: ' + q.outra + ' / ' + q.semNumero);
    ok(q.a && q.a.dia === '2026-11-20' && q.a.piorDia === '2026-12-05' && q.a.pior === -1850, 'o primeiro dia negativo (20/11) e o pior dia (05/12, −1.850): ' + (q.a && q.a.dia + ' ' + q.a.piorDia + ' ' + q.a.pior));
    ok(q.porque === 'Conta Ficticia D=-900,Conta Ficticia B=-700,Conta Ficticia A=-300,Conta Ficticia C=-50', '"ver por quê": as maiores saídas até o pior dia: ' + q.porque);
    const inb2 = await p.evaluate(() => { abrirInbox(); return (document.querySelector('#genModal') || {}).textContent || ''; });
    ok(/fica negativa em 20\/11 \(−R\$ 200,00\) e chega a −R\$ 1\.850,00 em 05\/12/.test(inb2) && /cobre o pior dia \+ 5% de folga/.test(inb2) && /ver por quê/.test(inb2) && /ag\. 0001 · conta 00012-3/.test(inb2), 'no 📥: primeiro dia negativo, o pior dia, a folga, "ver por quê" e a conta inteira');
    await p.click('#genModal .sp-pessoa[data-id="p1"] >> nth=0'); await p.waitForTimeout(250);
    const ps = await p.evaluate(() => ({ fechou: document.getElementById('genModal').classList.contains('hidden'), tela: !!document.querySelector('#view-cfg-pessoas:not(.hidden)'), foco: document.activeElement && document.activeElement.id, dica: /aparece no lugar do nome em todo o app \(deixe vazio para usar o nome\)/.test(document.body.textContent) }));
    ok(ps.fechou && ps.tela && ps.foco === 'psApelido' && ps.dica, 'tocar no nome abre a pessoa em Configurações › Pessoas (apelido em foco, com a explicação): ' + JSON.stringify(ps));
    /* 3.116: a conta inteira só para o PRÓPRIO dono; outro membro (uid diferente) e a visão da casa veem o final */
    const vis = await p.evaluate(() => {
      const c = SaldoPrevisto.contas().find((x) => x.numero === '000123'), ps = Pessoas.todas(), f = ps.find((x) => x.id === 'p1');
      const eu0 = MoneyNuvem.escopos.eu; const r = {};
      f.uid = 'uid-ficticio-fulano'; MoneyNuvem.escopos.eu = () => 'uid-ficticio-fulano'; r.dono = SaldoBanco.rotulo(c);
      MoneyNuvem.escopos.eu = () => 'uid-ficticio-outro'; r.outro = SaldoBanco.rotulo(c); r.curto = SaldoBanco.rotulo(c, { curto: true });
      MoneyNuvem.escopos.eu = eu0; delete f.uid; return r;
    });
    ok(/ag\. 0001 · conta 00012-3$/.test(vis.dono) && /···0123$/.test(vis.outro), 'o dono vê "ag. 0001 · conta 00012-3"; outro membro da família vê só "···0123": ' + vis.dono + ' / ' + vis.outro);
    await p.evaluate(() => { ST.recorrentes = ST.recorrentes.filter((r) => !/^it-/.test(r.id)); abrirApp('budget'); irPara('b-painel'); render(); });

    console.log('4) visão da casa');
    await p.evaluate(() => { Escopo.soCasa = () => true; render(); });
    ok(await p.evaluate(() => SaldoPrevisto.contas().length === 0 && !document.querySelector('#view-b-painel .sp-atencao') && inboxDadosConta(ST.recorrentes[1]) === '' && !(inboxGrupos().find((g) => g.id === 'saldo'))), 'nada de saldo, conta do chefe nem data dos dados');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
