/* =====================================================================
   teste/teste-material-escolar.js — 3.102: 📚 Material escolar (modulos/material-escolar.js). Dados FICTÍCIOS.
   Confere: a campanha do ano letivo (nov–fev) e o compromisso anual; as sugestões (papelaria, marketplace na janela, pedido com
   palavras de material) e o que fica fora (fora da janela, posto, conta fixa); ✅ com o filho, ❌, ✂️ parte; a pendente que vira
   definitiva; Dependentes › Material escolar numa linha só; o resumo (total, por filho, por loja, ano anterior); 📥; EN e ES.
   Uso: node teste/teste-material-escolar.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Banco' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [{ id: 'rPrime', nome: 'Assinatura Ficticia', grupo: 'LAZER', sub: 'Streaming', valor: 20, dia: 5, regra: 'dia' }],
  cartoes: [{ id: 'c1', apelido: 'Cartão Ficticio', bandeira: 'visa', fim: '1111', vence: 10, fecha: 3 }],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }, { id: 'p2', tipo: 'casa', papel: 'dependente', nome: 'Duda', apelido: 'Duda' }],
  gastos: [R('m1', '2026-11-20', 89.9, 'KALUNGA FICTICIA'), R('m2', '2026-11-21', 150, 'AMAZON MARKETPLACE'), R('m3', '2026-11-22', 60, 'LOJA QUALQUER', { ficha: { cid: 'x1', produto: 'Caderno 10 materias e estojo', pedido: '123', loja: 'LOJA QUALQUER' } }),
    R('m4', '2026-11-22', 200, 'POSTO FICTICIO'), R('m5', '2026-10-10', 40, 'KALUNGA FICTICIA'), R('m6', '2026-11-05', 20, 'AMAZON PRIME', { recorrenteId: 'rPrime' }),
    R('m0', '2025-12-10', 300, 'PAPELARIA ANTIGA', { grupo: 'DEPENDENTES', sub: 'Material escolar' })],
  cartao_pendentes: [Object.assign(R('pp', '2026-11-23', 70, 'MERCADOLIVRE*LOJAFICTICIA'), { id: 'pa_pp', estado: 'pendente', pendente: true, vistoEm: '2026-11-23' })] };

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
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof MaterialEscolar !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); MaterialEscolar._hoje = '2026-11-24'; abrirApp('budget'); });

    console.log('1) a campanha e o compromisso anual');
    await p.evaluate(() => { irPara('b-material'); render(); });
    ok(await p.evaluate(() => /Material escolar 2027/.test(document.querySelector('[data-acao="me-nova"]').textContent)), 'menu 📚 Material escolar: "+ Material escolar 2027" (ano letivo que vem, a partir de julho)');
    await p.click('[data-acao="me-nova"]');
    const f = await p.evaluate(() => ({ de: document.getElementById('meDe').value, ate: document.getElementById('meAte').value, n: document.querySelectorAll('#meFilhos input:checked').length }));
    ok(f.de === '2026-11-01' && f.ate === '2027-02-28' && f.n === 2, 'a janela já vem de 1º/nov a 28/fev, com os dois filhos marcados ' + JSON.stringify(f));
    await p.click('[data-acao="me-salvar"]'); await p.waitForTimeout(100);
    const c = await p.evaluate(() => { const c = MaterialEscolar.lista()[0], r = Recorrente.todos().find((x) => x.id === c.recId); return { nome: c.nome, r: r && [r.nome, r.grupo, r.sub, r.regra, r.mes, r.valor].join('|') }; });
    ok(c.nome === 'Material escolar 2027' && c.r === 'Material escolar|DEPENDENTES|Material escolar|anual|11|300', 'campanha criada e o compromisso anual (novembro), com o valor do ano anterior (300) ' + c.r);

    console.log('2) as sugestões');
    const s = await p.evaluate(() => MaterialEscolar.sugestoes(MaterialEscolar.lista()[0]).map((x) => x.g.id + (x.pend ? '(pend)' : '') + ':' + x.motivo));
    ok(s.length === 4 && /rb_m1:papelaria/.test(s.join()) && /rb_m2:loja on-line/.test(s.join()) && /rb_m3:o pedido tem material escolar/.test(s.join()) && /pa_pp\(pend\)/.test(s.join()), 'papelaria, marketplace na janela, pedido com caderno/estojo e a pendente do Mercado Livre: ' + s.join(' / '));
    ok(!/m4|m5|m6|m0/.test(s.join()), 'fora: posto, a papelaria de outubro (fora da janela), a assinatura (conta fixa) e o ano passado');
    const inb = await p.evaluate(() => { renderInboxN && renderInboxN(); return MoneyModulos.itens('inbox.grupos', {}).filter((g) => g && g.id === 'confirmar' && /me-inb/.test(g.html)).map((g) => g.html.replace(/<[^>]+>/g, ' ')).join(''); });
    ok(/Material escolar 2027: 4 compras para confirmar/.test(inb), '📥 "Confirmar classificação": Material escolar 2027: 4 compras para confirmar');

    console.log('3) confirmar, não é, parte, pendente');
    await p.evaluate(() => { aberta = null; MaterialEscolar.abrir(MaterialEscolar.lista()[0].id); render(); });
    await p.selectOption('.me-sug[data-g="rb_m1"] .me-filho', 'p1');
    await p.click('.me-sug[data-g="rb_m1"] [data-acao="me-sim"]'); await p.waitForTimeout(80);
    await p.click('.me-sug[data-g="rb_m2"] [data-acao="me-nao"]'); await p.waitForTimeout(80);
    await p.selectOption('.me-sug[data-g="rb_m3"] .me-filho', 'p2');
    await p.click('.me-sug[data-g="rb_m3"] [data-acao="me-parte"]');
    await p.fill('.me-parte-box[data-g="rb_m3"] .me-parte-v', '40');
    await p.evaluate(() => render());   /* 3.104: a tela se redesenha sozinha (conciliação, cotações) no meio da digitação */
    ok(await p.evaluate(() => { const b = document.querySelector('.me-parte-box[data-g="rb_m3"]'); return !!b && !b.hidden && b.querySelector('.me-parte-v').value === '40' && document.querySelector('.me-sug[data-g="rb_m3"] .me-filho').value === 'p2'; }), 'a caixa "✂️ Parte", o valor digitado e o filho escolhido (Duda) continuam lá quando a tela se redesenha (a causa do teste que quebrava 1 vez em 3)');
    await p.click('.me-parte-box[data-g="rb_m3"] [data-acao="me-parte-ok"]'); await p.waitForTimeout(80);
    await p.selectOption('.me-sug[data-g="pa_pp"] .me-filho', 'p1');
    await p.click('.me-sug[data-g="pa_pp"] [data-acao="me-sim"]'); await p.waitForTimeout(80);
    const g = await p.evaluate(() => { const x = (id) => { const g = ST.gastos.find((y) => y.id === id); return g ? [g.grupo, g.sub, g.paraQuem, g.paraQuemId, !!g.material, g.valor].join('|') : '-'; }; return { m1: x('rb_m1'), m2: x('rb_m2'), m3: x('rb_m3'), m3b: x('rb_m3~2') }; });
    ok(g.m1 === 'DEPENDENTES|Material escolar|Bia|p1|true|89.9', '✅ a Kalunga vai para Dependentes › Material escolar, da Bia ' + g.m1);
    ok(g.m2 === 'OUTROS|Sem categoria|||false|150', '❌ a Amazon que não era material fica como estava ' + g.m2);
    ok(g.m3 === 'DEPENDENTES|Material escolar|Duda|p2|true|40' && g.m3b === 'OUTROS|Sem categoria|||false|20', '✂️ parte: 40 de material da Duda; os outros 20 ficam como estavam ' + g.m3 + ' / ' + g.m3b);
    await p.evaluate(() => { const pp = ST.cartao_pendentes[0]; const n = Gasto.add({ data: '2026-11-25', valor: 70, desc: 'MERCADOLIVRE*LOJAFICTICIA', descRobo: 'MERCADOLIVRE*LOJAFICTICIA', fluxo: 'saida', grupo: 'OUTROS', sub: '', cartaoId: 'c1', origem: 'robo' }); pp.estado = 'cobrado'; pp.gastoId = n.id; MaterialEscolar.ligarTudo(); });
    ok(await p.evaluate(() => { const x = ST.gastos.find((y) => y.desc === 'MERCADOLIVRE*LOJAFICTICIA' && y.valor === 70); return !!x.material && x.paraQuem === 'Bia' && x.sub === 'Material escolar'; }), 'a pendente confirmada virou definitiva: a etiqueta e a filha foram para o lançamento novo');

    console.log('4) o resumo');
    await p.evaluate(() => render());
    const r = await p.evaluate(() => { const r = MaterialEscolar.resumo(MaterialEscolar.lista()[0]); return { t: r.total, f: r.porFilho, l: Object.keys(r.porLoja).length, ant: r.anterior && r.anterior.total, txt: document.querySelector('.me-resumo').textContent, rec: Recorrente.todos().find((x) => x.id === MaterialEscolar.lista()[0].recId).valor }; });
    ok(r.t === 199.9 && r.f.Bia === 159.9 && r.f.Duda === 40 && r.l === 3, 'total 199,90; por filho Bia 159,90 e Duda 40,00; por loja (3) ' + JSON.stringify(r.f));
    ok(r.ant === 300 && /Material escolar 2026: R\$\s?300,00/.test(r.txt) && /100,10 a menos/.test(r.txt), 'compara com o ano anterior (300,00 → este ano 100,10 a menos)');
    ok(/📎/.test(r.txt) && r.rec === 199.9, 'a lista marca 📎 a compra com o comprovante; o compromisso anual passa a valer o total (199,90)');
    ok(await p.evaluate(() => MaterialEscolar.sugestoes(MaterialEscolar.lista()[0]).length === 0), 'nada mais para confirmar (o "não é" não volta)');

    console.log('5) EN e ES');
    for (const [l, rx] of [['en', /School supplies 2027|School-supply purchases/], ['es', /Compras del material/]]) {
      await p.evaluate((x) => { I18n.atual = x; render(); }, l);
      ok(rx.test(await p.evaluate(() => document.body.textContent)), l.toUpperCase() + ': a tela do material escolar');
    }
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
