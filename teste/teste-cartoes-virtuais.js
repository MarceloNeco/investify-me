/* =====================================================================
   teste/teste-cartoes-virtuais.js — 3.102: cartões virtuais sem bagunça (modulos/cartoes.js 1.1.0). Dados FICTÍCIOS (finais inventados).
   Confere: um cartão por fatura no rótulo (com vários finais, só o nome); final novo da mesma conta entra sozinho e vira UMA
   pergunta discreta no 📥 por cartão (tipo + quem usa); a resposta muda o "Quem pagou" das compras não mexidas; o "quem usa" do
   final vale para as próximas; finais virtuais sem compra há mais de 6 meses vão para "antigos" (não perguntados, nunca apagados).
   Uso: node teste/teste-cartoes-virtuais.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor, fim, cid, extra) => Object.assign({ id, idRobo: id, data, valor, desc: 'LOJA FICTICIA ' + id, descRobo: 'LOJA FICTICIA ' + id, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: cid, finalCartao: fim, quem: 'Titular Ficticio' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  pessoas: [{ id: 'pt', tipo: 'casa', papel: 'responsavel', nome: 'Titular Ficticio', apelido: 'Titular Ficticio' }, { id: 'pc', tipo: 'casa', papel: 'responsavel', nome: 'Carla Ficticia', apelido: 'Carla' }],
  cartoes: [{ id: 'cv', apelido: 'Visa Ficticio', bandeira: 'visa', fim: '1111', vence: 10, fecha: 3, contaId: 'contaV', titular: 'Titular Ficticio', titularId: 'pt', finais: [{ fim: '1111', tipo: 'fisico' }] },
    { id: 'cm', apelido: 'Master Ficticio', bandeira: 'master', fim: '2222', vence: 10, fecha: 3, contaId: 'contaM', titular: 'Titular Ficticio', titularId: 'pt',
      finais: [{ fim: '2222', tipo: 'fisico' }, { fim: '3301', tipo: 'virtual', novo: true }, { fim: '3302', tipo: 'unico' }, { fim: '3303', tipo: 'virtual', novo: true }] }],
  gastos: [G('a1', '2026-11-20', 50, '3301', 'cm'), G('a2', '2026-03-01', 30, '3302', 'cm'), G('a3', '2026-02-01', 20, '3303', 'cm'), G('a4', '2026-11-10', 80, '2222', 'cm'),
    G('b1', '2026-11-21', 40, '4404', 'cv'), G('b2', '2026-11-22', 60, '4404', 'cv', { quem: 'Outra Pessoa', editadoPessoa: true })] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Cartoes !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Cartoes._hoje = '2026-11-24'; abrirApp('budget'); });

    console.log('1) um cartão por fatura');
    ok(await p.evaluate(() => Banco.rotuloCartao('cv') === 'Visa Ficticio ••1111' && Banco.rotuloCartao('cm') === 'Master Ficticio'), 'um final: "Visa Ficticio ••1111"; vários finais na mesma fatura: só "Master Ficticio" (os finais ficam no detalhe)');
    const robo = await p.evaluate(() => { const g = {}; const c = Cartoes.doRobo({ final: '4404', conta_cartao: { id: 'contaV', nome: 'Visa' } }, g); return { c: c && c.id, g: g.cartaoId, fins: Cartoes.finais(c).map((f) => f.fim + (f.novo ? '*' : '')).join(','), rot: Banco.rotuloCartao('cv') }; });
    ok(robo.c === 'cv' && robo.g === 'cv' && robo.fins === '1111,4404*' && robo.rot === 'Visa Ficticio', 'final novo da mesma conta entra sozinho no Visa (marcado como novo) e o rótulo vira só o nome ' + JSON.stringify(robo));
    const sel = await p.evaluate(() => { irPara('config'); render(); return [...document.querySelectorAll('td b')].map((x) => x.textContent).filter((t) => /Ficticio/.test(t)); });
    ok(sel.join('|') === 'Visa Ficticio|Master Ficticio', 'Configurações → Seus cartões: uma linha por fatura, sem os finais ' + sel.join('|'));

    console.log('2) a pergunta discreta no 📥');
    const inb = await p.evaluate(() => { const g = MoneyModulos.itens('inbox.grupos', {}).filter((x) => x && /ct-inb/.test(x.html)); return { n: g.reduce((s, x) => s + x.n, 0), txt: g.map((x) => x.html.replace(/<[^>]+>/g, ' ')).join(' '), grupo: g.map((x) => x.id).join() }; });
    ok(inb.n === 2 && inb.grupo === 'confirmar' && /Final ••4404 novo no Visa Ficticio/.test(inb.txt) && /Final ••3301 novo no Master Ficticio/.test(inb.txt), 'uma pergunta por cartão em "Confirmar classificação": ••4404 no Visa e ••3301 no Master');
    ok(!/3303/.test(inb.txt) && /Virtual de uso único, virtual permanente ou adicional\? Quem usa\? Pode responder depois/.test(inb.txt), 'o virtual antigo (••3303, sem compra há 9 meses) não é perguntado; o texto diz que dá para responder depois');
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'tInb'; d.innerHTML = '<ul>' + MoneyModulos.itens('inbox.grupos', {}).filter((x) => x && /ct-inb/.test(x.html)).map((x) => x.html).join('') + '</ul>'; document.body.appendChild(d); });
    await p.selectOption('#tInb .ct-inb[data-c="cv"] .ct-inb-f[data-fim="4404"] .ct-inb-tipo', 'permanente');
    await p.fill('#tInb .ct-inb[data-c="cv"] .ct-inb-f[data-fim="4404"] .ct-inb-usa', 'Carla');
    await p.click('#tInb .ct-inb[data-c="cv"] [data-acao="ct-inb-ok"]'); await p.waitForTimeout(80);
    const r = await p.evaluate(() => { const f = Cartoes.finais(Cartoes.doFinal('4404')).find((x) => x.fim === '4404'); const q = (id) => ST.gastos.find((g) => g.id === id).quem; return { f: [f.tipo, f.usa, f.usaId, !!f.novo].join('|'), b1: q('b1'), b2: q('b2'), qp: Cartoes.quemPagou(Cartoes.doFinal('4404'), '4404'), a1: q('a1') }; });
    ok(r.f === 'permanente|Carla|pc|false', 'a resposta: virtual permanente, quem usa = Carla (ligada à pessoa) e o final deixa de ser novo ' + r.f);
    ok(r.b1 === 'Carla' && r.b2 === 'Outra Pessoa' && r.qp === 'Carla' && r.a1 === 'Titular Ficticio', '"Quem pagou": a compra do ••4404 passa a ser da Carla; a que a pessoa mexeu fica; as próximas também vêm da Carla; outro final não muda');
    ok(await p.evaluate(() => MoneyModulos.itens('inbox.grupos', {}).filter((x) => x && /ct-inb/.test(x.html)).reduce((s, x) => s + x.n, 0) === 1), 'sobra só a pergunta do Master');

    console.log('3) os antigos no detalhe (escondidos, nunca apagados)');
    await p.evaluate(() => abrirCartao('cm'));
    const fm = await p.evaluate(() => ({ ativos: [...document.querySelectorAll('.ct-finais:not(.ct-finais-antigos) .ct-f-fim')].map((x) => x.value).join(','), antigos: [...document.querySelectorAll('.ct-finais-antigos .ct-f-fim')].map((x) => x.value).join(','), sum: (document.querySelector('.ct-antigos summary') || {}).textContent || '' }));
    ok(fm.ativos === '2222,3301' && fm.antigos === '3302,3303' && /Antigos \(virtuais sem compra há mais de 6 meses\): 2/.test(fm.sum), 'no cadastro do Master: ativos 2222 e 3301; "Antigos" (recolhido) com 3302 e 3303 ' + JSON.stringify(fm));
    await p.click('[data-acao="cartao-salvar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => Cartoes.finais(Banco.acharCartao('cm')).map((f) => f.fim).join(',') === '2222,3301,3302,3303' && ST.gastos.find((g) => g.id === 'a2').cartaoId === 'cm'), 'salvar o cadastro não apaga os antigos; o histórico continua ligado ao cartão');
    ok(await p.evaluate(() => [...document.querySelectorAll('.ct-f-fim')].every((x) => x.maxLength === 4) && !/\d{13,}/.test(JSON.stringify(ST.cartoes))), 'só os 4 últimos dígitos: nenhum número inteiro guardado');
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
