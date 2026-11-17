/* =====================================================================
   teste/teste-print-pluggy.js — 3.90: a conciliação do print com o que o banco manda DE VERDADE (o caso de 14/11, com nomes
   FICTÍCIOS). O Itaú cola loja + cidade + "BR" ("LOJABRILHOGUARUJABR", "MARIANA TESTESAO PAULOBR"), manda a compra primeiro
   como PENDENTE (pré-autorização) e dias depois como postada, e o cartão vem sem o final ("VISA"); a notificação diz só "seu
   cartão Itau".
   Confere: a loja pela forma compacta (prefixo, 5+ letras) e a regra das palavras como alternativa; "às 12:50" vira a hora sem
   entrar na loja; sem o final, qualquer cartão do mesmo banco (e o lançamento sem cartão); print → pendente → postada SEM CONTAR
   DUAS VEZES na fatura e no previsto, com a classificação e a divisão indo junto até o lançamento postado; a pendente mandada de
   novo guarda a classificação; pendente antes do print; dois candidatos → pergunta no 📥; com o final no print, só o mesmo final.
   Uso: node teste/teste-print-pluggy.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  bancos: [{ id: 'bk1', nome: 'Itaú' }],
  cartoes: [{ id: 'c1', apelido: 'Itaú Ficticio', bancoId: 'bk1', bandeira: 'visa', fim: '1111', vence: 10, fecha: 3 }, { id: 'c2', apelido: 'Itaú Ficticio Black', bancoId: 'bk1', bandeira: 'master', fim: '2222', vence: 10, fecha: 3 }],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }, { id: 'p2', tipo: 'casa', papel: 'dependente', nome: 'Duda', apelido: 'Duda' }, { id: 'p3', tipo: 'casa', papel: 'responsavel', nome: 'Ana', apelido: 'Ana' }],
  gastos: [{ id: 'rb_old1', idRobo: 'old1', data: '2026-10-20', valor: 80, desc: 'MERCADO FICTICIO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Mercado', origem: 'robo', cartaoId: 'c1', conta: 'Itau', editadoPessoa: true },
    { id: 'rb_old2', idRobo: 'old2', data: '2026-10-21', valor: 30, desc: 'FARMACIA FICTICIA', fluxo: 'saida', grupo: 'SAUDE', sub: 'Farmácia', origem: 'robo', cartaoId: 'c2', conta: 'Itau', editadoPessoa: true }] };
const NOTIF = 'Itaú • agora\nCompra aprovada de R$ 236,00 em LOJABRILHO no dia 14/11 às 12:50 no seu cartão Itau\nItaú • 12:57\nR$ 58,90 em MARIANA TESTE 12:57';
/* o que o robô entrega (pendente do Pluggy, VISA sem o final) */
const PEND = (id, valor, desc, data) => ({ id: 'rb_' + id, idRobo: id, data: data || '2026-11-14', valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', conta: 'Itau', cartaoNome: 'VISA' });

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PrintColar !== 'undefined' && typeof PreAut !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PrintColar._hoje = '2026-11-14'; PreAut._hoje = '2026-11-14'; abrirApp('budget'); irPara('b-lanc'); render(); });
    const lancar = async (texto, onde, dividir) => {
      await p.evaluate((t) => PrintColar.abrirPrevia(PrintColar.itensDoTexto(t, '2026-11-14')), texto);
      await p.evaluate((o) => { document.querySelectorAll('#pcItens [data-pc="onde"]').forEach((s) => { s.value = o; }); document.querySelectorAll('#pcItens [data-pc="grupo"]').forEach((s) => { s.value = 'PESSOAL'; }); document.querySelectorAll('#pcItens [data-pc="sub"]').forEach((s) => { s.value = 'Salão'; }); }, onde);
      if (dividir) {
        await p.click('#pcItens .pc-item:first-child [data-acao="pc-dividir"]');
        await p.evaluate(() => { const ls = [...document.querySelectorAll('#pcItens .pc-item:first-child [data-dvparte]')]; const put = (l, k, v) => { const e = l.querySelector('[data-dv="' + k + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
          put(ls[0], 'paraQuem', 'Bia'); put(ls[0], 'nota', 'corte'); put(ls[0], 'valor', '118'); put(ls[1], 'paraQuem', 'Duda'); put(ls[1], 'nota', 'corte'); put(ls[1], 'valor', '118'); });
      }
      await p.click('#genBody [data-acao="pc-lancar"]'); await p.waitForTimeout(150);
    };
    const estado = () => p.evaluate(() => ({ fat1: PreAut.doCartao('c1'), ativos: PreAut.ativos().map((x) => (x.doPrint ? 'print:' : 'robo:') + x.desc + '=' + x.valor).sort(), prev: PreAut.comprometidos('PESSOAL', 'Salão', '2026-11').map((x) => x.valor).join('+'), gastos: ST.gastos.filter((g) => g.data >= '2026-11-01').map((g) => g.id + '|' + g.valor + '|' + (g.paraQuem || '')).sort() }));

    console.log('1) a loja e a hora');
    const l = await p.evaluate(() => [PrintColar.lojaParecida('LOJABRILHO', 'LOJABRILHOGUARUJABR'), PrintColar.lojaParecida('MARIANA TESTE', 'MARIANA TESTESAO PAULOBR'), PrintColar.lojaParecida('MARIANA TESTE…', 'MARIANA TESTESAO PAULOBR'),
      PrintColar.lojaParecida('RAIA DROGASIL', 'DROGASIL RAIA SA'), PrintColar.lojaParecida('LOJA ALFA', 'OUTRA COISA'), PrintColar.lojaParecida('ABC', 'ABCDEFGH')]);
    ok(l.join() === 'true,true,true,true,false,false', 'a forma compacta casa "LOJABRILHO" × "LOJABRILHOGUARUJABR" e "MARIANA TESTE" × "MARIANA TESTESAO PAULOBR" (também com "…"); as palavras continuam valendo; loja diferente ou curta demais não: ' + l.join());
    const it = await p.evaluate((t) => PrintColar.itensDoTexto(t, '2026-11-14').map((x) => x.loja + '|' + x.hora + '|' + x.data + '|' + x.valor), NOTIF);
    ok(it.join(' ; ') === 'LOJABRILHO|12:50|2026-11-14|236 ; MARIANA TESTE|12:57|2026-11-14|58.9', '"às 12:50" vira a hora, sem entrar na loja: ' + it.join(' ; '));

    console.log('2) print → pendente do robô → postada, sem contar duas vezes');
    await lancar(NOTIF, 'c:c1', true);
    let e = await estado();
    ok(e.fat1 === 294.9 && e.ativos.length === 2 && e.prev === '236+58.9', 'o print: 2 aguardando o banco no cartão c1 (294,90) e no previsto de Pessoal › Salão: ' + JSON.stringify(e));
    await p.evaluate((x) => { PreAut.receber(x[0], { pendente: true }); PreAut.receber(x[1], { pendente: true }); }, [PEND('p1', 236, 'LOJABRILHOGUARUJABR'), PEND('p2', 58.9, 'MARIANA TESTESAO PAULOBR')]);
    e = await estado();
    ok(e.fat1 === 294.9 && e.ativos.join() === 'robo:LOJABRILHOGUARUJABR=236,robo:MARIANA TESTESAO PAULOBR=58.9' && e.prev === '236+58.9', 'a pendente do robô (VISA sem o final) chegou: o print e a pendente viraram um só; a fatura continua 294,90 e o previsto 236 + 58,90 (nada em dobro): ' + JSON.stringify(e));
    const r2 = await p.evaluate(() => PreAut.ativos().map((x) => [x.grupo, x.sub, x.cartaoId, (x.partes || []).length, /conferido com o print/.test(x.obs)].join('|')));
    ok(r2.join() === 'PESSOAL|Salão|c1|2|true,PESSOAL|Salão|c1|0|true', 'a pendente ficou com a classificação, a divisão, o cartão escolhido e a nota: ' + r2.join(' ; '));
    await p.evaluate((x) => PreAut.receber(x, { pendente: true }), PEND('p1', 236, 'LOJABRILHOGUARUJABR'));
    ok(await p.evaluate(() => { const r = PreAut.ativos().find((x) => /LOJABRILHO/.test(x.desc)); return r.grupo === 'PESSOAL' && r.sub === 'Salão' && r.partes.length === 2 && r.cartaoId === 'c1' && PreAut.doCartao('c1') === 294.9; }), 'o robô mandou a pendente de novo: a classificação da pessoa continua');
    await p.evaluate(() => { PreAut._hoje = '2026-11-17'; PrintColar._hoje = '2026-11-17';
      Gasto.add({ id: 'rb_q1', idRobo: 'q1', data: '2026-11-17', valor: 236, desc: 'LOJABRILHOGUARUJABR', descRobo: 'LOJABRILHOGUARUJABR', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', conta: 'Itau', cartaoNome: 'VISA' }); });
    await p.waitForTimeout(150);
    e = await estado();
    const g3 = await p.evaluate(() => ST.gastos.filter((g) => g.id.indexOf('rb_q1') === 0).map((g) => g.id + '|' + g.valor + '|' + g.paraQuem + '|' + g.grupo + '|' + /conferido com o print/.test(g.obs)).join(' ; '));
    ok(g3 === 'rb_q1|118|Bia|PESSOAL|true ; rb_q1~2|118|Duda|PESSOAL|true' && e.fat1 === 58.9 && e.prev === '58.9', 'a postada chegou: substituiu a pendente (3.80) e levou a classificação e a divisão; só ela conta (a fatura fica 58,90 do que falta): ' + g3);

    console.log('3) a pendente antes do print');
    await p.evaluate((x) => { PreAut._hoje = '2026-11-15'; PrintColar._hoje = '2026-11-15'; PreAut.receber(x, { pendente: true }); }, PEND('p3', 99.9, 'LOJA SOLFICTICIASANTOSBR', '2026-11-15'));
    await lancar('Compra aprovada de R$ 99,90 em LOJA SOLFICTICIA no dia 15/11 às 09:10 no seu cartão Itau', 'c:c2', false);
    ok(await p.evaluate(() => { const r = PreAut.ativos().filter((x) => /SOLFICTICIA/.test(x.desc)); return r.length === 1 && !r[0].doPrint && r[0].cartaoId === 'c2' && r[0].sub === 'Salão' && PrintColar.pendentes().every((x) => !/SOLFICTICIA/.test(x.desc)); }), 'sem o final no print, o outro cartão do mesmo banco (c2) casa com a pendente que já estava lá: um só, com a classificação');

    console.log('4) dois candidatos: pergunta no 📥');
    await p.evaluate((x) => { PreAut.receber(x[0], { pendente: true }); PreAut.receber(x[1], { pendente: true }); }, [PEND('p4', 50, 'PADARIA FICTICIAGUARUJABR', '2026-11-15'), PEND('p5', 50, 'PADARIA FICTICIASANTOSBR', '2026-11-16')]);
    await lancar('Compra aprovada de R$ 50,00 em PADARIA FICTICIA no dia 15/11 às 08:00 no seu cartão Itau', 'c:c1', false);
    const i4 = await p.evaluate(() => ({ pend: PrintColar.pendentes().filter((x) => /PADARIA/.test(x.desc)).length, inb: (inboxGrupos().find((g) => g.id === 'confirmar') || {}).html || '' }));
    ok(i4.pend === 1 && /No banco \(ainda pendente\) veio como: PADARIA FICTICIA/.test(i4.inb) && /É o mesmo/.test(i4.inb), 'duas pendentes parecidas (50,00): não une sozinho; o 📥 pergunta "No banco (ainda pendente) veio como: …"');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="pc-par"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => PrintColar.pendentes().filter((x) => /PADARIA/.test(x.desc)).length === 0 && PreAut.ativos().filter((x) => /PADARIA/.test(x.desc) && x.doPrintClass).length === 1), '"É o mesmo": une com a escolhida; a outra pendente continua do robô');
    await p.evaluate(() => fechar('genModal'));

    console.log('5) com o final no print, só o mesmo final');
    await p.evaluate(() => { Gasto.add({ id: 'rb_q9', idRobo: 'q9', data: '2026-11-15', valor: 77, desc: 'LIVRARIA FICTICIA', descRobo: 'LIVRARIA FICTICIA', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', conta: 'Itau', cartaoId: 'c1', finalCartao: '1111' }); });
    await lancar('Compra aprovada de R$ 77,00 em LIVRARIA FICTICIA no dia 15/11 às 10:00 no seu cartão Itau final 2222', 'c:c2', false);
    ok(await p.evaluate(() => PrintColar.pendentes().some((x) => /LIVRARIA/.test(x.desc) && x.final === '2222') && !/conferido/.test(ST.gastos.find((g) => g.id === 'rb_q9').obs || '')), 'o print diz "final 2222": o lançamento do cartão final 1111 não é o mesmo');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
