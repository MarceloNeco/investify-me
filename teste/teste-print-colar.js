/* =====================================================================
   teste/teste-print-colar.js — 3.87: "📋 Colar print", "Dividir" e "Loja nova". Dados FICTÍCIOS (o texto e a imagem são
   gerados aqui; nada real).
   Confere: os leitores de texto (2 notificações de compra num print, a notificação cortada, Pix enviado e recebido,
   comprovante); OCR de VERDADE no aparelho (Tesseract local) de uma imagem desenhada no teste → 2 itens na prévia; a
   prévia com "Dividir" (236 = 118 + 118); "⏳ aguardando o banco" na fatura sem contar duas vezes; a conciliação com o
   lançamento do robô (loja igual: vira um só, com a divisão e "conferido com o print"; loja diferente: 📥 "No banco veio
   como: …" e o par confirmado); conta sem robô → lançamento manual (print); a sugestão da última divisão na próxima vez
   (sem aplicar sozinha); o robô mandar de novo não desfaz a divisão; "Loja nova: X. O que é?" vira regra; visão da casa.
   Uso: node teste/teste-print-colar.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'PESSOAL', sub: 'Outros', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  bancos: [{ id: 'bk1', nome: 'Banco Inventado' }],
  cartoes: [{ id: 'c1', apelido: 'Itaú Ficticio', bandeira: 'visa', fim: '1111', vence: 10, fecha: 3 }],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }, { id: 'p2', tipo: 'casa', papel: 'dependente', nome: 'Duda', apelido: 'Duda' }, { id: 'p3', tipo: 'casa', papel: 'responsavel', nome: 'Ana', apelido: 'Ana' }],
  gastos: [R('old1', '2026-10-20', 80, 'MERCADO FICTICIO', { grupo: 'HABITACAO', sub: 'Mercado', editadoPessoa: true })] };
const NOTIF = 'Itaú • agora\nCompra aprovada de R$ 236,00 em LOJA FICTICIA BELEZA no dia 14/11 às 12:50 no seu cartão Itau\n' +
  'Itaú • 12:57\nR$ 58,90 em SALAO IMAGINARIO… 12:57';

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.gz': 'application/gzip' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PrintColar !== 'undefined' && typeof Divisao !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PrintColar._hoje = '2026-11-14'; abrirApp('budget'); irPara('b-lanc'); render(); });

    console.log('1) os leitores de texto');
    const l1 = await p.evaluate((t) => PrintColar.itensDoTexto(t, '2026-11-14'), NOTIF);
    ok(l1.length === 2 && l1[0].tipo === 'compra' && l1[0].valor === 236 && l1[0].loja === 'LOJA FICTICIA BELEZA' && l1[0].data === '2026-11-14' && l1[0].hora === '12:50' && l1[0].banco === 'Itaú', '1ª notificação: R$ 236,00 em LOJA FICTICIA BELEZA, 14/11 12:50, Itaú: ' + JSON.stringify(l1[0]));
    ok(l1[1] && l1[1].valor === 58.9 && l1[1].loja === 'SALAO IMAGINARIO' && l1[1].hora === '12:57', 'a notificação cortada: R$ 58,90 em SALAO IMAGINARIO… 12:57: ' + JSON.stringify(l1[1]));
    const l2 = await p.evaluate(() => [PrintColar.itensDoTexto('Pix enviado\nVocê enviou um Pix de R$ 45,00 para FULANO DE TESTE em 13/11', '2026-11-14'), PrintColar.itensDoTexto('Pix recebido: você recebeu R$ 300,00 de CICLANO EXEMPLO', '2026-11-14'),
      PrintColar.itensDoTexto('Comprovante de pagamento\nBeneficiário: CONDOMINIO FICTICIO\nValor pago: R$ 1.250,00\nData: 10/11/2026 09:15', '2026-11-14')]);
    ok(l2[0].length === 1 && l2[0][0].tipo === 'pix-env' && l2[0][0].valor === 45 && /FULANO DE TESTE/.test(l2[0][0].loja), 'Pix enviado: 45,00 para FULANO DE TESTE');
    ok(l2[1].length === 1 && l2[1][0].tipo === 'pix-rec' && l2[1][0].valor === 300 && /CICLANO EXEMPLO/.test(l2[1][0].loja), 'Pix recebido: 300,00 de CICLANO EXEMPLO');
    ok(l2[2].length === 1 && l2[2][0].valor === 1250 && l2[2][0].loja === 'CONDOMINIO FICTICIO' && l2[2][0].data === '2026-11-10', 'comprovante: 1.250,00 para CONDOMINIO FICTICIO em 10/11/2026');

    console.log('2) OCR no aparelho de uma imagem desenhada aqui → a prévia');
    await p.evaluate(async (t) => {
      const c = document.createElement('canvas'); c.width = 1400; c.height = 420; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111'; x.font = '34px Arial';
      t.split('\n').forEach((l, i) => x.fillText(l, 30, 70 + i * 80));
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      window._t0 = Date.now(); PrintColar.processar([new File([blob], 'print.png', { type: 'image/png' })]);
    }, NOTIF);
    await p.waitForFunction(() => document.querySelectorAll('#pcItens .pc-item').length > 0 && !document.getElementById('genModal').classList.contains('hidden'), null, { timeout: 120000 });
    const pv = await p.evaluate(() => ({ n: document.querySelectorAll('#pcItens .pc-item').length, v: [...document.querySelectorAll('#pcItens [data-pc="valor"]')].map((e) => e.value), l: [...document.querySelectorAll('#pcItens [data-pc="loja"]')].map((e) => e.value), onde: [...document.querySelectorAll('#pcItens [data-pc="onde"]')].map((e) => e.value), seg: Math.round((Date.now() - window._t0) / 1000), guardar: !!document.getElementById('pcGuardar') }));
    ok(pv.n === 2 && pv.v.join('|') === '236|58,9' && /LOJA FICTICIA BELEZA/.test(pv.l[0]) && /SALAO IMAGINARIO/.test(pv.l[1]), 'o OCR leu os 2 itens (' + pv.seg + ' s): ' + JSON.stringify(pv.v) + ' ' + JSON.stringify(pv.l));
    ok(pv.onde.every((x) => x === 'c:c1') && pv.guardar, 'o cartão do Itaú que o robô traz já vem escolhido; a opção de guardar como comprovante (desmarcada)');

    console.log('3) Dividir na prévia e lançar');
    await p.click('#pcItens .pc-item:first-child [data-acao="pc-dividir"]');
    await p.evaluate(() => { const ls = [...document.querySelectorAll('#pcItens .pc-item:first-child [data-dvparte]')];
      const put = (l, k, v) => { const e = l.querySelector('[data-dv="' + k + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
      put(ls[0], 'paraQuem', 'Bia'); put(ls[0], 'nota', 'corte de cabelo'); put(ls[0], 'valor', '118'); ls[0].querySelector('[data-dv="grupo"]').value = 'DEPENDENTES'; put(ls[0], 'sub', 'Salão');
      put(ls[1], 'paraQuem', 'Duda'); put(ls[1], 'nota', 'corte de cabelo'); put(ls[1], 'valor', '100'); ls[1].querySelector('[data-dv="grupo"]').value = 'DEPENDENTES'; put(ls[1], 'sub', 'Salão'); });
    ok(/falta R\$ 18,00/.test(await p.evaluate(() => document.querySelector('#pcItens .dv-soma').textContent)), 'a soma ao vivo: "falta R$ 18,00"');
    await p.click('#genBody [data-acao="pc-lancar"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.getElementById('genModal').classList.contains('hidden') && PrintColar.pendentes().length === 0), 'a soma não fecha: não lança');
    await p.evaluate(() => { const e = document.querySelectorAll('#pcItens .pc-item:first-child [data-dv="valor"]')[1]; e.value = '118'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.click('#genBody [data-acao="pc-lancar"]'); await p.waitForTimeout(200);
    const p3 = await p.evaluate(() => ({ pend: PrintColar.pendentes().map((x) => x.desc + '|' + x.valor + '|' + (x.partes ? x.partes.length : 0) + '|' + x.cartaoId), fat: PreAut.doCartao('c1'), gastos: ST.gastos.length, selo: (document.querySelector('#view-b-lanc .pa-card') || {}).textContent || '' }));
    ok(p3.pend.length === 2 && /LOJA FICTICIA BELEZA\|236\|2\|c1/.test(p3.pend[0]) && /SALAO IMAGINARIO\|58.9\|0\|c1/.test(p3.pend[1]) && p3.gastos === 1, 'os 2 ficam "aguardando o banco" (a divisão guardada) e não entram no "gastou": ' + p3.pend.join(' ; '));
    ok(p3.fat === 294.9 && /aguardando o banco \(print\)/.test(p3.selo), 'entram na fatura do cartão (294,90) com o selo "⏳ aguardando o banco (print)"');

    console.log('4) conciliação com o robô');
    await p.evaluate(() => { Gasto.add({ id: 'rb_x1', idRobo: 'x1', data: '2026-11-15', valor: 236, desc: 'LOJA FICTICIA BELEZA LTDA', descRobo: 'LOJA FICTICIA BELEZA LTDA', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }); });
    await p.waitForTimeout(100);
    const c4 = await p.evaluate(() => ({ g: ST.gastos.filter((g) => g.id.indexOf('rb_x1') === 0).map((g) => g.id + '|' + g.valor + '|' + g.paraQuem + '|' + g.grupo + '|' + /conferido com o print/.test(g.obs || '')), fat: PreAut.doCartao('c1'), pend: PrintColar.pendentes().length }));
    ok(c4.g.join() === 'rb_x1|118|Bia|DEPENDENTES|true,rb_x1~2|118|Duda|DEPENDENTES|true' && c4.pend === 1 && c4.fat === 58.9, 'loja igual (valor exato, 1 dia depois, mesmo cartão): vira um só, fica o id do robô, com a divisão e "conferido com o print"; a fatura não conta duas vezes: ' + c4.g.join(' ; '));
    await p.evaluate(() => { Gasto.add({ id: 'rb_x2', idRobo: 'x2', data: '2026-11-14', valor: 58.9, desc: 'FC SERVICOS ESTETICOS', descRobo: 'FC SERVICOS ESTETICOS', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }); });
    await p.waitForTimeout(100);
    const inb = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'confirmar') || {}).html || '');
    ok(/No banco veio como: FC SERVICOS ESTETICOS/.test(inb) && /É o mesmo/.test(inb), 'loja diferente: o 📥 mostra "No banco veio como: FC SERVICOS ESTETICOS" e pede para confirmar o par');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="pc-par"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => PrintColar.pendentes().length === 0 && PreAut.doCartao('c1') === 0 && /conferido com o print/.test(ST.gastos.find((g) => g.id === 'rb_x2').obs)), '"É o mesmo": os dois viram um só');
    await p.evaluate(() => fechar('genModal'));

    console.log('5) conta que o robô não traz');
    await p.evaluate(() => PrintColar.abrirPrevia(PrintColar.itensDoTexto('Pix enviado: você enviou R$ 45,00 para FULANO DE TESTE', '2026-11-14')));
    const op = await p.evaluate(() => [...document.querySelectorAll('#pcItens [data-pc="onde"] option')].map((o) => o.value + '=' + o.textContent));
    ok(op.some((x) => /^m:bk1=.*Banco Inventado · à mão/.test(x)), 'a conta "Banco Inventado" aparece como "à mão": ' + op.join(' ; '));
    await p.evaluate(() => { document.querySelector('#pcItens [data-pc="onde"]').value = 'm:bk1'; });
    await p.click('#genBody [data-acao="pc-lancar"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const g = ST.gastos.find((x) => x.origem === 'print'); return !!g && g.valor === 45 && g.forma === 'manual (print)' && g.conta === 'Banco Inventado' && PrintColar.pendentes().length === 0; }), 'vira lançamento na hora: "manual (print)", na conta escolhida, sem esperar o banco');

    console.log('5b) Ctrl+V com a imagem em Lançamentos; o "Compartilhar" do Android');
    await p.evaluate((t) => { PrintColar._ocr = async () => t; irPara('b-lanc'); render();
      const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'print.png', { type: 'image/png' }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); }, NOTIF);
    await p.waitForFunction(() => document.querySelectorAll('#pcItens .pc-item').length === 2, null, { timeout: 10000 });
    ok(true, 'Ctrl+V de uma imagem em Lançamentos abre a prévia com os 2 itens');
    await p.click('#genBody [data-acao="pc-cancelar"]');
    ok(await p.evaluate(() => PrintColar.pendentes().length === 0 && document.getElementById('genModal').classList.contains('hidden')), '"Cancelar": nada é lançado e a imagem não fica guardada');
    await p.evaluate(async (t) => {
      const c = document.createElement('canvas'); c.width = 1400; c.height = 420; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111'; x.font = '34px Arial'; t.split('\n').forEach((l, i) => x.fillText(l, 30, 70 + i * 80));
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      await (await caches.open('partilha-moneytrio')).put('./partilha/1', new Response(blob, { headers: { 'content-type': 'image/png' } }));
    }, NOTIF);
    await p.goto(BASE + '/?print=1');
    await p.waitForFunction(() => document.querySelectorAll('#pcItens .pc-item').length === 2, null, { timeout: 120000 });
    ok(await p.evaluate(async () => !/print=1/.test(location.search) && (await (await caches.open('partilha-moneytrio')).keys()).length === 0), 'a imagem compartilhada (o sw.js guarda em ./?compartilhar=1 e abre ./?print=1) é lida, apagada na hora, e a prévia abre com os 2 itens');
    await p.click('#genBody [data-acao="pc-cancelar"]');
    await p.evaluate(() => { I18n.atual = 'pt'; PrintColar._hoje = '2026-11-14'; });

    console.log('6) a última divisão na próxima vez (sem aplicar sozinha)');
    await p.evaluate(() => { Gasto.add({ id: 'rb_x3', idRobo: 'x3', data: '2026-12-12', valor: 240, desc: 'LOJA FICTICIA BELEZA LTDA', descRobo: 'LOJA FICTICIA BELEZA LTDA', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }); });
    const s6 = await p.evaluate(() => ({ g: ST.gastos.find((g) => g.id === 'rb_x3'), inb: (inboxGrupos().find((g) => g.id === 'confirmar') || {}).html || '' }));
    ok(!s6.g.divisao && /dividir como da última vez\?/.test(s6.inb) && /corte de cabelo Bia R\$ 120,00 \+ corte de cabelo Duda R\$ 120,00/.test(s6.inb), 'a mesma loja de novo (240): o 📥 sugere "dividir como da última vez?" (120 + 120), sem aplicar sozinho');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="dv-sugerida"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => ST.gastos.filter((g) => g.id.indexOf('rb_x3') === 0).map((g) => g.valor + g.paraQuem).join() === '120Bia,120Duda'), '"Dividir assim": 120 Bia + 120 Duda');
    await p.evaluate(() => fechar('genModal'));
    const r6 = await p.evaluate(() => { const ja = ST.gastos.find((g) => g.id === 'rb_x3'); return [MoneyNuvem.corrigirRobo(ja, Object.assign({}, ja, { valor: 240, grupo: 'OUTROS', sub: 'Sem categoria', paraQuem: '' })), ST.gastos.filter((g) => g.id.indexOf('rb_x3') === 0).map((g) => g.valor + g.paraQuem).join()]; });
    ok(r6[0] === '' && r6[1] === '120Bia,120Duda', 'o robô mandar o mesmo lançamento de novo (240) não desfaz a divisão: ' + JSON.stringify(r6));
    await p.evaluate(() => abrirLancamento('rb_x3'));
    ok(/Dividido em 2 partes/.test(await p.evaluate(() => document.getElementById('assetModalBody').textContent)), 'na edição do lançamento: "✂️ Dividido em 2 partes · mudar"');
    await p.click('#assetModalBody [data-acao="dv-abrir"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !!document.querySelector('#genBody [data-acao="dv-ultima"]') && !!document.querySelector('#genBody [data-acao="dv-juntar"]')), 'a janela "Dividir": "Usar a última divisão desta loja" e "Desfazer a divisão"');
    await p.click('#genBody [data-acao="dv-juntar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => ST.gastos.filter((g) => g.id.indexOf('rb_x3') === 0).map((g) => g.valor + '|' + !!g.divisao).join() === '240|false'), '"Desfazer a divisão": volta a ser um só (240)');
    await p.evaluate(() => { fechar('genModal'); fechar('assetModal'); });

    console.log('7) loja nova vira regra');
    await p.evaluate(() => { Gasto.add({ id: 'rb_x4', idRobo: 'x4', data: '2026-11-16', valor: 12.5, desc: 'PADARIA INVENTADA', descRobo: 'PADARIA INVENTADA', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }); });
    const i7 = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'confirmar') || {}).html || '');
    ok(/Loja nova: PADARIA INVENTADA\. O que é\?/.test(i7) && !/A identificar[^<]*PADARIA/.test(i7), 'o 📥: "🏪 Loja nova: PADARIA INVENTADA. O que é?" (no lugar do "A identificar")');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="ln-abrir"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !!document.getElementById('lnGrupo') && !!document.getElementById('lnPara') && !!document.querySelector('#genBody [data-acao="ln-dividir"]')), 'a pergunta tem o grupo, a categoria, para quem e "Dividir"');
    await p.evaluate(() => { document.getElementById('lnGrupo').value = 'HABITACAO'; document.getElementById('lnSub').value = 'Padaria'; document.getElementById('lnPara').value = 'Ana'; });
    await p.click('#genBody [data-acao="ln-salvar"]'); await p.waitForTimeout(150);
    await p.evaluate(() => { Gasto.add({ id: 'rb_x5', idRobo: 'x5', data: '2026-11-18', valor: 9.9, desc: 'PADARIA INVENTADA', descRobo: 'PADARIA INVENTADA', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }); });
    const r7 = await p.evaluate(() => ['rb_x4', 'rb_x5'].map((id) => { const g = ST.gastos.find((x) => x.id === id); return g.grupo + '|' + g.sub + '|' + g.paraQuem + '|' + Origem.status(g); }));
    ok(r7.join() === 'HABITACAO|Padaria|Ana|,HABITACAO|Padaria|Ana|' && await p.evaluate(() => LojaNova.lojas().length === 0), 'a resposta classifica a loja e vira regra: o próximo da PADARIA INVENTADA já chega como Habitação › Padaria (Ana): ' + r7.join(' ; '));

    console.log('8) visão da casa');
    const c8 = await p.evaluate(() => { Escopo.preparar({ visaoCasa: { pessoas: ['p1', 'p2'] }, cartoes: [], recorrentes: [], gastos: [] });
      return ST.gastos.filter((g) => g.id.indexOf('rb_x1') === 0).map((g) => Escopo.de('gastos', g)).join() + '|' + Escopo.de('gastos', ST.gastos.find((g) => g.id === 'rb_x5')); });
    ok(c8 === 'casa,casa|reservado', 'as partes da divisão seguem a pessoa: os cortes da Bia e da Duda são da casa; a padaria da Ana (fora da visão) fica reservada: ' + c8);
    await p.evaluate(() => { Escopo.soCasa = () => true; irPara('b-lanc'); render(); });
    ok(await p.evaluate(() => !!document.querySelector('#view-b-lanc [data-acao="pc-colar"]')), 'na visão da casa o "📋 Colar print" continua (cada um lança o seu)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
