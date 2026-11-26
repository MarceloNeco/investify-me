/* =====================================================================
   teste/teste-pessoas-email.js — 3.124: Pessoas da família — o e-mail opcional (só de quem entra no app, liga ao convite) e a ficha
   do dono ligada à conta logada sem criar ficha repetida. Dados FICTÍCIOS (nomes e e-mails inventados, domínio .invalid).
   Uso: node teste/teste-pessoas-email.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2 }, posicoes: [], gastos: [], recorrentes: [],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Fulaninho', meio: '', sobrenome: '', apelido: '', banco: [] },
    { id: 'p2', tipo: 'casa', papel: 'responsavel', nome: 'Beltrana', meio: '', sobrenome: 'Exemplo', apelido: '', banco: [], email: 'beltrana@exemplo.invalid' }] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Pessoas);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });

    console.log('1) o e-mail opcional na ficha');
    await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="zzAbrir" data-acao="ps-abrir" data-id="p1">x</button>'); document.getElementById('zzAbrir').click(); }); await p.waitForTimeout(250);
    const f = await p.evaluate(() => { const e = document.getElementById('psEmail'); const lab = e && e.closest('label'); return { tem: !!e, tipo: e && e.type, dica: lab ? lab.textContent : '' }; });
    ok(f.tem && f.tipo === 'email' && /Só para quem vai entrar no MoneyTRIO: liga esta ficha ao convite da família/.test(f.dica), 'a ficha da família tem "E-mail (opcional)" com a explicação');
    await p.evaluate(() => { document.getElementById('psEmail').value = 'nao-e-email'; }); await p.click('[data-acao="ps-salvar"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !Pessoas.porId('p1').email), 'um e-mail que não parece e-mail não é guardado');
    await p.evaluate(() => { document.getElementById('psEmail').value = 'Fulano@Exemplo.invalid '; }); await p.click('[data-acao="ps-salvar"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => Pessoas.porId('p1').email === 'fulano@exemplo.invalid'), 'o e-mail é guardado limpo (minúsculas, sem espaço)');
    ok(await p.evaluate(() => { const r = Pessoas.salvar({ id: 'p9', tipo: 'outra', nome: 'Inquilino Ficticio', email: 'inq@exemplo.invalid' }); return !r.email; }), 'quem não é da família (tipo "Outras pessoas") não guarda e-mail');

    console.log('2) o convite e a conta logada: nada de ficha repetida');
    const n0 = await p.evaluate(() => ST.pessoas.length);
    const r = await p.evaluate(() => {
      const real = window.MoneyNuvem; window.MoneyNuvem = Object.assign(Object.create(real || {}), { escopos: Object.assign({}, real && real.escopos, { eu: () => 'u-fulano' }), email: () => 'fulano@exemplo.invalid', nomePessoa: () => 'Fulano da Silva Ficticio' });
      const n = Pessoas.prepreencher([{ user_id: 'u-fulano', apelido: 'Fulano', papel: 'chefe' }, { user_id: 'u-beltrana', apelido: 'Bel', papel: 'responsavel', email: 'beltrana@exemplo.invalid' }], []);
      return { n, p1: Pessoas.porId('p1').uid, p2: Pessoas.porId('p2').uid, total: ST.pessoas.length };
    });
    ok(r.n === 0 && r.total === n0, 'os 2 membros do convite acham as fichas que já existem (nenhuma ficha nova)');
    ok(r.p1 === 'u-fulano', 'a conta logada liga à ficha do dono pelo e-mail da conta ("Fulaninho"), mesmo com outro nome');
    ok(r.p2 === 'u-beltrana', 'o membro convidado liga à ficha com o mesmo e-mail ("Beltrana")');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
