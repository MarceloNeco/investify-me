/* =====================================================================
   teste/teste-canhotos.js — 3.92: "🧾 Conferir canhotos" (Leitura.lerVarios do Leitor OCR, motor 1.12.0). Dados FICTÍCIOS.
   Confere: o motor carrega só quando usado, contrato 1, sem a consulta do CNPJ na internet; OCR de VERDADE numa foto desenhada
   aqui com dois canhotos; a separação em 4 grupos (✅ casou com o lançamento e com a PENDENTE do robô; 🟡 valor não 'alta' ou
   empate; ➕ não veio do banco; ❓ valor em dúvida com as opções); o desempate pelo final, pela loja e pela hora; "mesmaCompra"
   conta uma vez; classificar e ✂️ dividir no casado vai para o lançamento do banco (e da pendente para o postado); nada
   duplicado; "Lançar à mão" e "Esperar o banco".
   Uso: node teste/teste-canhotos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  cartoes: [{ id: 'c1', apelido: 'Itaú Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3 }, { id: 'c2', apelido: 'Outro Ficticio', bandeira: 'master', fim: '9876', vence: 10, fecha: 3 }],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }, { id: 'p2', tipo: 'casa', papel: 'dependente', nome: 'Duda', apelido: 'Duda' }],
  gastos: [R('g1', '2026-11-14', 120.51, 'AUTO POSTO EXEMPLO'), R('g2', '2026-11-15', 45, 'PADARIA INVENTADA'), R('g3', '2026-11-15', 45, 'LIVRARIA FICTICIA', { cartaoId: 'c2' }),
    R('g4', '2026-11-12', 80, 'FARMACIA FICTICIA')],
  cartao_pendentes: [Object.assign(R('p9', '2026-11-16', 236, 'LOJABRILHOGUARUJABR', { cartaoId: undefined }), { id: 'pa_p9', estado: 'pendente', pendente: true, vistoEm: '2026-11-16' })] };
const IT = (papel, valor, extra) => Object.assign({ arquivo: 'foto.jpg', papel, documento: 'cartao', valor, opcoes: [], data: '14/11/2026', hora: null, loja: null, cnpj: null, bandeira: null, tipo: 'credito', parcelas: 1, final: null, nsu: null, aut: null, doc: null, mesmaCompra: null,
  confianca: { valor: valor == null ? 'baixa' : 'alta', data: 'alta' } }, extra || {});

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch(), fora = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); fora.push(u); return r.abort(); });
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Canhotos !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });

    console.log('1) o motor e o OCR de verdade');
    ok(await p.evaluate(() => !(window.Leitura && Leitura.lerVarios) && !!document.querySelector('#view-b-lanc [data-acao="cn-abrir"]')), '"🧾 Conferir canhotos" em Lançamentos; o motor só carrega quando usado');
    const real = await p.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1400; c.height = 900; const x = c.getContext('2d');
      x.fillStyle = '#5a4632'; x.fillRect(0, 0, c.width, c.height);
      const papel = (x0, linhas) => { x.fillStyle = '#fff'; x.fillRect(x0, 60, 560, 760); x.fillStyle = '#000'; x.font = 'bold 34px monospace'; linhas.forEach((l, i) => x.fillText(l, x0 + 30, 140 + i * 70)); };
      papel(60, ['AUTO POSTO EXEMPLO', 'CREDITO A VISTA', 'VISA ****1234', '14/11/2026 14:41', 'VALOR R$ 120,51', 'AUT A1B2C3', 'VIA CLIENTE']);
      papel(760, ['PADARIA INVENTADA', 'DEBITO', 'MASTER ****9876', '15/11/2026 08:02', 'VALOR R$ 45,00', 'AUT Z9Y8X7', 'VIA CLIENTE']);
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      const t0 = Date.now();
      await Canhotos.processar([new File([blob], 'canhotos.png', { type: 'image/png' })]);
      return { seg: Math.round((Date.now() - t0) / 1000), contrato: Leitura.lerVarios && Leitura.lerVarios.contrato, cnpj: Leitura.consultaCnpjLigada(), versao: Leitura.versao, titulo: document.getElementById('genTitle').textContent, txt: document.getElementById('genBody').textContent };
    });
    ok(real.contrato === 1 && real.versao === '1.12.0' && real.cnpj === false, 'o motor 1.12.0, contrato 1, com a consulta do CNPJ na internet desligada');
    ok(real.titulo === 'Conferir canhotos' && /120,51|45,00|Valor em dúvida/.test(real.txt), 'o OCR no aparelho leu a foto com os dois canhotos (' + real.seg + ' s) e abriu o resultado: ' + real.txt.replace(/\s+/g, ' ').slice(0, 220));
    ok(!fora.some((u) => /receita|brasilapi|cnpj/i.test(u)), 'nenhuma consulta de CNPJ na internet');
    await p.evaluate(() => fechar('genModal'));

    console.log('2) os 4 grupos');
    const g = await p.evaluate((x) => { const r = Canhotos.classificar(x); return { casou: r.casou.map((y) => y.it.papel + '=' + y.g.id), parecido: r.parecido.map((y) => y.it.papel + ':' + y.cs.length), novo: r.novo.map((y) => y.it.papel), duvida: r.duvida.map((y) => y.it.papel + ':' + y.it.opcoes.join('/')) }; },
      [IT(1, 120.51, { loja: 'AUTO POSTO EXEMPLO', final: '1234', hora: '14:41' }), IT(2, 45, { data: '15/11/2026', final: '1234', loja: 'PADARIA INVENTADA' }), IT(3, 45, { data: '15/11/2026' }),
        IT(4, 80, { data: '12/11/2026', confianca: { valor: 'media' } }), IT(5, 33.3, { data: '13/11/2026' }), IT(6, null, { opcoes: [18.9, 16.9] }),
        IT(7, 120.51, { mesmaCompra: 1, documento: 'nfce' }), IT(8, 236, { data: '16/11/2026', loja: 'LOJABRILHO' })]);
    ok(g.casou.join() === '1=rb_g1,2=rb_g2,8=pa_p9', '✅ casou: o posto (valor alto, data, final e loja), a padaria (o final e a loja desempatam entre duas compras de R$ 45) e a PENDENTE do robô (236): ' + g.casou.join());
    ok(g.parecido.join() === '3:1,4:1', '🟡 parecido: o 2º de R$ 45 sem nada para desempatar (só sobra a livraria) e o de R$ 80 com o valor lido uma vez só (não casa sozinho): ' + g.parecido.join());
    ok(g.novo.join() === '5' && g.duvida.join() === '6:18.9/16.9', '➕ não veio do banco (33,30) e ❓ valor em dúvida com as opções 18,90 / 16,90');
    ok(!/7/.test(g.casou.concat(g.parecido, g.novo, g.duvida).join()), '"mesmaCompra": o cupom do mesmo posto conta uma vez');

    console.log('3) classificar, dividir, lançar à mão e esperar o banco (nada duplicado)');
    const n0 = await p.evaluate(() => ST.gastos.length);
    await p.evaluate((x) => { Canhotos._ler = async () => x; return Canhotos.processar([new File([new Uint8Array([1])], 'f.png', { type: 'image/png' })]); },
      [IT(1, 120.51, { loja: 'AUTO POSTO EXEMPLO', final: '1234' }), IT(8, 236, { data: '16/11/2026', loja: 'LOJABRILHO' }), IT(5, 33.3, { data: '13/11/2026', final: '1234' }), IT(9, 12, { data: '13/11/2026', final: '9876' }), IT(6, null, { opcoes: [80] , data: '12/11/2026'})]);
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="0"] [data-acao="cn-classe"]');
    await p.evaluate(() => { const c = document.querySelector('#genBody .cn-item[data-grupo="casou"][data-i="0"]'); c.querySelector('[data-cn="grupo"]').value = 'VEICULO'; c.querySelector('[data-cn="sub"]').value = 'Combustível'; c.querySelector('[data-cn="quem"]').value = 'Bia'; });
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="0"] [data-acao="cn-aplicar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => { const x = ST.gastos.find((y) => y.id === 'rb_g1'); return x.grupo === 'VEICULO' && x.sub === 'Combustível' && x.paraQuem === 'Bia' && /conferido com o canhoto/.test(x.obs); }), 'a classificação foi para o lançamento do banco (o mesmo id), com "conferido com o canhoto"');
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="1"] [data-acao="cn-classe"]');
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="1"] [data-acao="cn-dividir"]');
    await p.evaluate(() => { const ls = [...document.querySelectorAll('#genBody .cn-item[data-grupo="casou"][data-i="1"] [data-dvparte]')]; const put = (l, k, v) => { const e = l.querySelector('[data-dv="' + k + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
      put(ls[0], 'paraQuem', 'Bia'); put(ls[0], 'valor', '118'); put(ls[1], 'paraQuem', 'Duda'); put(ls[1], 'valor', '118'); });
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="1"] [data-acao="cn-aplicar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => { const r = PreAut.lista().find((x) => x.id === 'pa_p9'); return r.doPrintClass && r.partes.length === 2 && r.estado === 'pendente'; }), 'na PENDENTE do robô, a divisão fica guardada nela (vai para o postado quando ele chegar)');
    await p.evaluate(() => { Gasto.add({ id: 'rb_q9', idRobo: 'q9', data: '2026-11-18', valor: 236, desc: 'LOJABRILHOGUARUJABR', descRobo: 'LOJABRILHOGUARUJABR', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', conta: 'Itau' }); });
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => ST.gastos.filter((x) => x.id.indexOf('rb_q9') === 0).map((x) => x.valor + x.paraQuem).join() === '118Bia,118Duda'), 'o postado chegou: substituiu a pendente e levou a divisão (118 Bia + 118 Duda)');
    await p.evaluate(() => { const c = document.querySelector('#genBody .cn-item[data-grupo="novo"][data-i="0"]'); c.querySelector('[data-cn="cartao"]').value = 'c1'; });
    await p.click('#genBody .cn-item[data-grupo="novo"][data-i="0"] [data-acao="cn-amao"]'); await p.waitForTimeout(100);
    await p.evaluate(() => { const c = document.querySelector('#genBody .cn-item[data-grupo="novo"][data-i="0"]'); c.querySelector('[data-cn="cartao"]').value = 'c2'; });
    await p.click('#genBody .cn-item[data-grupo="novo"][data-i="0"] [data-acao="cn-esperar"]'); await p.waitForTimeout(100);
    const r3 = await p.evaluate(() => ({ novos: ST.gastos.filter((x) => x.origem === 'canhoto').map((x) => x.valor + '|' + x.cartaoId), esperar: PrintColar.pendentes().map((x) => x.valor + '|' + x.cartaoId) }));
    ok(r3.novos.join() === '33.3|c1' && r3.esperar.join() === '12|c2', '"Lançar à mão" cria um lançamento (33,30, cartão final 1234); "Esperar o banco" vira "⏳ aguardando o banco" (12,00)');
    await p.click('#genBody .cn-item[data-grupo="duvida"][data-i="0"] [data-acao="cn-valor"][data-v="80"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => /Parecido, confirme/.test(document.getElementById('genBody').textContent) && /FARMACIA FICTICIA/.test(document.getElementById('genBody').textContent)), '❓ escolhendo 80,00 entre as opções: vai para 🟡 com a farmácia de R$ 80 para confirmar');
    await p.click('#genBody .cn-item[data-grupo="parecido"] [data-acao="cn-confirmar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate((n) => /conferido com o canhoto/.test(ST.gastos.find((x) => x.id === 'rb_g4').obs || '') && ST.gastos.length === n + 3, n0), '"É este": liga ao lançamento do banco; só o "Lançar à mão", o postado do robô e a 2ª parte da divisão entraram — nada duplicado');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
