/* =====================================================================
   teste/teste-inbox.js — 3.76: o 📥 vira a lista de pendências, em grupos com contador, resolvidas ali mesmo.
   Dados FICTÍCIOS. Confere: os grupos e os contadores; o número do sino = a soma da lista; confirmar a categoria em
   linha; conta atrasada "Já paguei"; aviso "ok, entendi"; "Parece conta fixa" e "Documentos para subir" no 📥; sem o
   botão "Ver compromissos"; a lista se refaz sem fechar.
   Uso: node teste/teste-inbox.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), z = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
const dia = (k) => { const d = new Date(hoje); d.setDate(d.getDate() + k); return iso(d); };
const mes = (k) => { const d = new Date(hoje.getFullYear(), hoje.getMonth() + k, 10); return iso(d); };
const gastos = [
  { id: 'a1', data: dia(-3), valor: 55, grupo: 'ALIMENTACAO', sub: 'Mercado', desc: 'MERCADINHO EXEMPLO', fluxo: 'saida', confianca: 'palpite', origem: 'robo' },
  { id: 'a2', data: dia(-2), valor: 45, grupo: 'ALIMENTACAO', sub: 'Mercado', desc: 'MERCADINHO EXEMPLO', fluxo: 'saida', confianca: 'palpite', origem: 'robo' },
  { id: 'r1', data: dia(-4), valor: 300, grupo: 'OUTROS', sub: 'Outros', desc: 'TRANSFERENCIA EXEMPLO', fluxo: 'saida', revisar: true }
];
[-3, -2, -1].forEach((k) => gastos.push({ id: 'cl' + k, data: mes(k), valor: 1200, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'COLEGIO EXEMPLO', fluxo: 'saida', contraparte: { cnpj: '00000000000272' } }));
const recorrentes = [
  { id: 'rcA', nome: 'Condomínio Exemplo', grupo: 'HABITACAO', sub: 'Condomínio', valor: 800, dia: +dia(-5).slice(8, 10), regra: 'dia', criadoEm: dia(-7), estadoPadrao: 'pendente' },
  { id: 'rcB', nome: 'Internet Exemplo', grupo: 'HABITACAO', sub: 'Internet', valor: 120, dia: +dia(1).slice(8, 10), regra: 'dia', criadoEm: dia(-7), estadoPadrao: 'pendente' }
];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes, cartoes: [{ id: 'ctP', apelido: 'Cartão Porto', banco: 'Porto Bank', bandeira: 'visa', fim: '0000', fecha: 25, vence: 5 }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 800 }]) {
      console.log('tela ' + vp.width);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof inboxGrupos === 'function');
      await p.evaluate(() => { I18n.atual = 'pt'; ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); renderInboxN(); abrirInbox(); });
      const ler = () => p.evaluate(() => ({ grupos: [...document.querySelectorAll('#genBody .inb-grupo')].map((d) => d.dataset.inbgrupo + ':' + d.querySelector('.inb-n').textContent),
        sino: document.getElementById('inboxN').textContent, soma: inboxContagem(), aberto: !document.getElementById('genModal').classList.contains('hidden'), txt: document.getElementById('genBody').textContent }));
      const a = await ler();
      console.log('   ', a.grupos.join(' '));
      ok(a.grupos.join(' ') === 'confirmar:2 atrasadas:1 contafixa:1 docs:1 avisos:1', 'os grupos, na ordem, com contador: Confirmar classificação (1 origem + 1 marcado), Contas atrasadas, Parece conta fixa, Documentos, Avisos');
      ok(a.sino === String(a.soma) && a.soma === 6, 'o número do sino (' + a.sino + ') é a soma da lista');
      ok(!/Ver compromissos/.test(a.txt) && /Confirme ou corrija aqui mesmo|confirme ou corrija aqui mesmo/.test(a.txt), 'sem o botão "Ver compromissos"; cada grupo diz numa frase o que é e o que fazer');
      console.log('   ações em linha');
      await p.click('#genBody [data-acao="or-confirmar-grupo"]'); await p.waitForTimeout(400);
      const b1 = await ler();
      ok(b1.aberto && /confirmar:1/.test(b1.grupos.join(' ')) && b1.sino === '5' && await p.evaluate(() => Gasto.todos().filter((g) => /MERCADINHO/.test(g.desc)).every((g) => !Origem.status(g))), 'confirmar a categoria (✓): os dois do MERCADINHO saem de "A confirmar", a lista se refaz aberta e o sino cai para 5');
      await p.click('#genBody [data-acao="inb-pago"]'); await p.waitForTimeout(400);
      const b2 = await ler();
      ok(b2.aberto && !/atrasadas/.test(b2.grupos.join(' ')) && b2.sino === '4', '"Já paguei" na conta atrasada: o grupo some e o sino cai para 4');
      await p.click('#genBody [data-acao="inb-visto"]'); await p.waitForTimeout(400);
      const b3 = await ler();
      ok(!/avisos/.test(b3.grupos.join(' ')) && b3.sino === '3', '"ok, entendi" no aviso: sai da lista (e do sino)');
      await p.click('#genBody [data-grev]'); await p.waitForTimeout(400);
      ok((await ler()).sino === '2' && await p.evaluate(() => !Gasto.todos().find((g) => g.id === 'r1').revisar), '"✓ Conferido" no marcado para conferir');
      await p.click('#genBody [data-acao="cfs-nao"]'); await p.waitForTimeout(400);
      const b5 = await ler();
      ok(b5.grupos.join(' ') === 'docs:1' && b5.sino === '1', '"Não é" na sugestão de conta fixa: sobra só o documento');
      ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
