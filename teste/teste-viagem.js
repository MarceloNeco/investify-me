/* =====================================================================
   teste/teste-viagem.js — 3.98: viagem por janela de tempo. Dados FICTÍCIOS (o caso real, com nomes e valores trocados).
   Caso: janela 18–22/11 (margem 1 dia); passagens compradas meses antes; hotel pago antes, com estorno; extras do hotel no dia
   da saída; restaurante e loja de chocolate no destino; uma assinatura e uma parcela antiga na janela (ficam fora); o posto
   no cartão de quem não foi (fora); conta fixa e PJ (fora); uma compra pendente (entra quando virar definitiva, sem dobrar).
   Confere: a sugestão no 📥 ("Parece que você está viajando (Gramado…)"), sem confundir com a cidade de casa; o cadastro (evento
   da viagem, escopo da casa); o que entra e o que fica fora; ✅/❌/✂️ e "Confirmar todos"; regra por loja; a categoria não muda;
   o resumo (total, por categoria, dia, pessoa e cartão, antes/durante/depois, previsto × realizado, por dia e por pessoa); ✈️ no
   Mês a mês; visão da casa; EN/ES.
   Uso: node teste/teste-viagem.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Banco Ficticio' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'titular', nome: 'Ana Ficticia', apelido: 'Ana' }, { id: 'p2', tipo: 'casa', papel: 'conjuge', nome: 'Beto Ficticio', apelido: 'Beto' }, { id: 'p3', tipo: 'casa', papel: 'outro', nome: 'Caio Ficticio', apelido: 'Caio' }],
  cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3, titularId: 'p1', titular: 'Ana' }, { id: 'c2', apelido: 'Cartao do Caio', bandeira: 'master', fim: '9876', vence: 10, fecha: 3, titularId: 'p3', titular: 'Caio' }],
  recorrentes: [{ id: 'rViagem', nome: 'Viagem: Serra', grupo: 'LAZER', sub: 'Viagens', regra: 'dia', dia: 18, valor: 3000, fluxo: 'saida', desde: '2026-11-18', ate: '2026-11-18', estadoPadrao: 'pendente', ativo: true },
    { id: 'rCond', nome: 'Condominio Ficticio', grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 19, valor: 900, fluxo: 'saida', ativo: true }],
  gastos: [
    /* a cidade de casa (antes e durante): não vira viagem */
    R('h1', '2026-09-05', 20, 'PADARIA BAIRROSAOPAULOBR'), R('h2', '2026-09-12', 30, 'MERCADO VILASAOPAULOBR'), R('h3', '2026-09-20', 25, 'FARMACIA CENTROSAOPAULOBR'),
    R('h4', '2026-11-03', 22, 'PADARIA BAIRROSAOPAULOBR'), R('h5', '2026-11-05', 31, 'MERCADO VILASAOPAULOBR'), R('h6', '2026-11-07', 27, 'FARMACIA CENTROSAOPAULOBR'),
    /* antes */
    R('a1', '2026-08-10', 1800, 'LATAM AIRLINES BRASIL'), R('a2', '2026-10-01', 1200, 'HOTEL SERRA FICTICIA', { grupo: 'LAZER', sub: 'Hospedagem' }),
    /* durante (janela 17–23/11) */
    R('d1', '2026-11-22', 180, 'HOTEL SERRA FICTICIAGRAMADOBR'), R('d2', '2026-11-19', 230, 'RESTAURANTE SABOR SERRAGRAMADOBR', { grupo: 'LAZER', sub: 'Restaurantes' }),
    R('d3', '2026-11-20', 150, 'CHOCOLATES FICTICIOSGRAMADOBR'), R('d6', '2026-11-21', 300, 'MERCADO FICTICIO'),
    R('d4', '2026-11-19', 55.9, 'NETFLIX.COM', { grupo: 'LAZER', sub: 'Assinaturas' }), R('d5', '2026-11-20', 99, 'LOJA ANTIGA 03/10'),
    R('d7', '2026-11-20', 250, 'POSTO SERRA GRAMADOBR', { cartaoId: 'c2', grupo: 'VEICULO', sub: 'Combustível' }),
    R('d8', '2026-11-19', 900, 'CONDOMINIO FICTICIO', { recorrenteId: 'rCond', grupo: 'HABITACAO', sub: 'Condomínio' }),
    R('d9', '2026-11-19', 400, 'CONTABILIDADE FICTICIA', { empresaId: 'e1', pj: true }),
    /* depois: o estorno do hotel */
    R('a3', '2026-11-25', -200, 'HOTEL SERRA FICTICIA ESTORNO', { estorno: true })],
  cartao_pendentes: [Object.assign(R('px', '2026-11-21', 120, 'CAFE COLONIALGRAMADOBR'), { id: 'pa_px', estado: 'pendente', pendente: true, vistoEm: '2026-11-21' })] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Viagem !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); Viagem._hoje = '2026-11-24'; });
    const inbox = () => p.evaluate(() => (inboxGrupos().find((g) => g.id === 'viagem') || {}).html || '');
    const g = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Gasto.todos().find((x) => x.id === i) || null)), id);

    console.log('1) a sugestão no 📥');
    const det = await p.evaluate(() => Viagem.detectar().map((s) => s.nome + '|' + s.de + '|' + s.ate));
    ok(det.length === 1 && det[0] === 'Gramado|2026-11-19|2026-11-22', 'gastos seguidos numa cidade que não é a de casa: Gramado, 19–22/11 (a cidade de casa não vira viagem): ' + det.join());
    ok(/Parece que você está viajando \(Gramado, 19–22\/Nov\)\. Criar a viagem\?/.test(await inbox()), '📥: "Parece que você está viajando (Gramado, 19–22/Nov). Criar a viagem?"');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="vg-criar"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('vgDest').value === 'Gramado' && document.getElementById('vgIni').value === '2026-11-19' && document.getElementById('vgFim').value === '2026-11-22'), '"Criar a viagem" abre o cadastro com o destino e as datas');

    console.log('2) o cadastro');
    await p.evaluate(() => { const s = (id, v) => { document.getElementById(id).value = v; };
      s('vgNome', 'Serra em novembro'); s('vgIni', '2026-11-18'); s('vgFim', '2026-11-22'); s('vgHotel', 'Hotel Serra Ficticia'); s('vgLink', 'https://exemplo.invalid/roteiro');
      document.querySelectorAll('#vgPess input').forEach((x) => { x.checked = x.value === 'p1' || x.value === 'p2'; }); });
    ok(await p.evaluate(() => document.getElementById('vgOrc').value === '3000'), 'o orçamento vem do planejado em Viagens (R$ 3.000)');
    await p.click('#genBody [data-acao="vg-salvar"]'); await p.waitForTimeout(300);
    const v0 = await p.evaluate(() => JSON.parse(JSON.stringify(Viagem.lista()[0])));
    ok(v0 && v0.antes === 1 && v0.depois === 1 && v0.orcamento === 3000 && v0.link === 'https://exemplo.invalid/roteiro' && v0.pessoas.join() === 'p1,p2' && !!v0.eventoId, 'salva com margem de 1 dia, orçamento, link do roteiro, quem foi e o evento da viagem (sai da média do mês)');
    ok(await p.evaluate(() => Escopo.de('viagens', Viagem.lista()[0]) === 'casa'), 'quem foi é da casa: a viagem é da casa');
    ok(!/Parece que você está viajando/.test(await inbox()), 'com a viagem criada, o 📥 não pergunta mais');

    console.log('3) o que entra e o que fica fora');
    const sg = await p.evaluate(() => Viagem.sugestoes(Viagem.lista()[0]).map((s) => s.g.id + ':' + s.fase + (s.pend ? ':pend' : '') + (s.estorno ? ':est' : '')));
    const tem = (id) => sg.some((x) => x.indexOf(id + ':') === 0);
    ok(tem('rb_a1') && tem('rb_a2') && sg.includes('rb_a1:antes'), 'antes: a passagem (meses antes) e o hotel pago antes');
    ok(tem('rb_d1') && tem('rb_d2') && tem('rb_d3') && tem('rb_d6'), 'durante: extras do hotel no dia da saída, restaurante, loja de chocolate (a cidade no texto do banco) e o mercado');
    ok(sg.includes('pa_px:durante:pend'), 'a compra pendente aparece (⏳), para entrar quando virar definitiva');
    ok(sg.includes('rb_a3:depois:est'), 'o estorno do hotel aparece ligado à viagem');
    ok(!tem('rb_d4') && !tem('rb_d5') && !tem('rb_d7') && !tem('rb_d8') && !tem('rb_d9') && !sg.some((x) => /rb_h/.test(x)), 'ficam fora: a assinatura, a parcela antiga (3/10), o posto no cartão de quem não foi, a conta fixa, a PJ e os gastos de casa: ' + sg.join());
    ok(await p.evaluate(() => Viagem.fora(Viagem.lista()[0], Gasto.todos().find((x) => x.id === 'rb_d5'), 'durante') === 'parcela' && Viagem.fora(Viagem.lista()[0], Gasto.todos().find((x) => x.id === 'rb_d4'), 'durante') === 'assinatura'), 'o motivo: "parcela" e "assinatura"');

    console.log('4) confirmar: ✅ ❌ ✂️ e todos');
    await p.evaluate(() => { Viagem.abrir(Viagem.lista()[0].id); render(); });
    ok(await p.evaluate(() => /Gastos da viagem: confirme \(8\)/.test(document.getElementById('view-b-viagens').textContent)), 'tela da viagem: "Gastos da viagem: confirme (8)"');
    await p.click('#view-b-viagens .vg-sug[data-g="rb_d6"] [data-acao="vg-nao"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const v = Viagem.lista()[0], o = Origem.origemDe(Gasto.todos().find((x) => x.id === 'rb_d6')); return v.decisoes.rb_d6 === 'nao' && ST.config.viagemRegras[o] === 'nao'; }), '❌ "Não é": sai e vira regra da loja');
    await p.evaluate(() => { Gasto.add({ id: 'rb_d10', idRobo: 'd10', data: '2026-11-21', valor: 45, desc: 'MERCADO FICTICIO', descRobo: 'MERCADO FICTICIO', fluxo: 'saida', grupo: 'OUTROS', sub: '', origem: 'robo', cartaoId: 'c1' }); });
    ok(await p.evaluate(() => !Viagem.sugestoes(Viagem.lista()[0]).some((s) => s.g.id === 'rb_d10')), 'a mesma loja de novo: não é sugerida (a regra vale)');
    await p.click('#view-b-viagens .vg-sug[data-g="rb_d1"] [data-acao="vg-parte"]');
    await p.fill('#view-b-viagens .vg-parte-box[data-g="rb_d1"] .vg-parte-v', '100');
    await p.click('#view-b-viagens .vg-parte-box[data-g="rb_d1"] [data-acao="vg-parte-ok"]'); await p.waitForTimeout(200);
    const pt1 = await p.evaluate(() => Gasto.todos().filter((x) => x.id === 'rb_d1' || x.id.indexOf('rb_d1~') === 0).map((x) => x.id + '=' + x.valor + ':' + (x.viagem ? 'v' : '-')).sort());
    ok(pt1.join() === 'rb_d1=100:v,rb_d1~2=80:-', '✂️ "Parte": divide em 100 (da viagem) + 80 (fora): ' + pt1.join());
    await p.click('#view-b-viagens [data-acao="vg-todos"]'); await p.waitForTimeout(300);
    const d2 = await g('rb_d2');
    ok(d2.viagem && d2.grupo === 'LAZER' && d2.sub === 'Restaurantes' && d2.evento, '"Confirmar todos": a etiqueta da viagem; a categoria continua Restaurantes');
    ok(await p.evaluate(() => Viagem.sugestoes(Viagem.lista()[0]).length === 0), 'nada mais para confirmar');

    console.log('5) a pendente vira definitiva (sem dobrar)');
    let r = await p.evaluate(() => Viagem.resumo(Viagem.lista()[0]));
    ok(r.total === 3280 && r.pendentes === 120, 'total 1.800 + 1.200 + 100 + 230 + 150 − 200 = R$ 3.280; a pendente (120) ainda não conta: ' + r.total + ' / ' + r.pendentes);
    await p.evaluate(() => { const g = Gasto.add({ id: 'rb_def', idRobo: 'def', data: '2026-11-22', valor: 120, desc: 'CAFE COLONIALGRAMADOBR', descRobo: 'CAFE COLONIALGRAMADOBR', fluxo: 'saida', grupo: 'OUTROS', sub: '', origem: 'robo', cartaoId: 'c1' }); PreAut.substituir(Gasto.todos().find((x) => x.id === 'rb_def')); Viagem.ligarTudo(); });
    r = await p.evaluate(() => Viagem.resumo(Viagem.lista()[0]));
    ok(r.total === 3400 && r.pendentes === 0 && (await g('rb_def')).viagem, 'o definitivo chegou: entra na viagem uma vez (R$ 3.400), sem dobrar');

    console.log('6) o resumo');
    ok(r.porCat['Lazer · Restaurantes'] === 230 && r.porCat['Lazer · Hospedagem'] === 1200, 'por categoria (Restaurantes 230, Hospedagem 1.200)');
    ok(r.porDia['2026-11-19'] === 230 && r.porDia['2026-08-10'] === 1800 && r.porCartao['Cartao Ficticio ••1234'] === 3400 && r.porPessoa.todos === 3400, 'por dia, por cartão e por pessoa');
    ok(r.fases.antes === 3000 && r.fases.durante === 600 && r.fases.depois === -200, 'antes 3.000 · durante 600 · depois −200 (o estorno)');
    ok(r.orcamento === 3000 && r.diferenca === 400 && r.dias === 5 && r.porDiaMedio === 680 && r.porPessoaMedio === 1700, 'previsto 3.000 × realizado 3.400 (passou 400); por dia 680 (5 dias); por pessoa 1.700 (2 pessoas)');
    await p.evaluate(() => render());
    const tx = await p.evaluate(() => document.getElementById('view-b-viagens').textContent);
    ok(/Previsto R\$\s?3\.000,00 × realizado R\$\s?3\.400,00 · passou R\$\s?400,00/.test(tx) && /Por categoria/.test(tx) && /Por cartão/.test(tx), 'a tela mostra o previsto × realizado e os blocos');
    ok(await p.evaluate(() => Viagem.noMes('2026-11') && !Viagem.noMes('2026-10')), 'Mês a mês: ✈️ em novembro');
    ok(await p.evaluate(() => { abrirLancamento('rb_d2'); const t = document.getElementById('assetModal').textContent; fechar('assetModal'); return /Da viagem: Serra em novembro/.test(t); }), 'a edição do lançamento mostra "✈️ Da viagem: Serra em novembro"');

    console.log('7) visão da casa e idiomas');
    await p.evaluate(() => { Viagem.salvar({ nome: 'Congresso', destinos: ['Recife'], inicio: '2026-10-05', fim: '2026-10-07', pessoas: ['p3'], escopo: 'reservado' }); });
    ok(await p.evaluate(() => { Escopo.soCasa = () => true; const n = Viagem.lista().filter((v) => Escopo.de('viagens', v) === 'casa').length; Escopo.soCasa = () => false; return n === 1; }), 'a viagem marcada como reservada fica fora da visão da casa');
    ok(await p.evaluate(() => { I18n.atual = 'en'; render(); const a = document.getElementById('view-b-viagens').textContent; I18n.atual = 'es'; render(); const b = document.getElementById('view-b-viagens').textContent; I18n.atual = 'pt'; render(); return /Trip summary/.test(a) && /Resumen del viaje/.test(b); }), 'EN e ES (rascunho)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
