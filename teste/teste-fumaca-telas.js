/* =====================================================================
   teste/teste-fumaca-telas.js — teste de fumaça para ARRUMAÇÃO INTERNA (3.48)
   ---------------------------------------------------------------------
   Compara as telas principais de duas cópias do app — a de ANTES (outra pasta, ex.: uma cópia do main) e a
   de agora (esta pasta) — em 390 e 1366 px: foto da tela, em português e em inglês, e o HTML desenhado.
   Também abre cada verbete do glossário e cada aula do Coach nas duas cópias e compara o texto.
   Tem de dar igual (o número da versão vira 0.00, "N versões" e a lista "O que há de novo" sai, nas duas), e sem nenhum erro de página. Serve para mudanças que "não mudam nada para você".
   Uso (na pasta raiz):
     git worktree add /tmp/antes origin/main        (uma cópia do que está publicado)
     node teste/teste-fumaca-telas.js /tmp/antes
     git worktree remove /tmp/antes
   As fotos diferentes ficam em <pasta temporária>/fumaca-*.png para olhar.
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const AGORA = path.join(__dirname, '..'), ANTES = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(ANTES, 'index.html'))) { console.log('Uso: node teste/teste-fumaca-telas.js <pasta da cópia de antes>'); process.exit(2); }
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
function servidor(raiz) {
  const srv = http.createServer((q, s) => { const p = path.join(raiz, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(raiz) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}
/* dados fixos (sem data de hoje nos valores) para as duas cópias desenharem o mesmo */
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [
  { id: 'p1', ticker: 'PETR4', nome: 'Petrobras', tipo: 'acao', inst: 'Corretora X', qtd: 100, pm: 30.5, moeda: 'BRL' },
  { id: 'p2', ticker: 'CDB X', nome: 'CDB X', tipo: 'rf', inst: 'Banco X', qtd: 1, pm: 10000, moeda: 'BRL' } ],
  gastos: [{ id: 'g1', data: '2026-10-05', valor: 120, grupo: 'HABITACAO', sub: 'Energia', desc: 'LUZ', fluxo: 'saida' },
    { id: 'g2', data: '2026-10-10', valor: 3000, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'ESCOLA', quem: 'Ana', irpf: true, fluxo: 'saida' }],
  recorrentes: [{ id: 'r1', nome: 'Aluguel', valor: 2500, grupo: 'HABITACAO', sub: 'Aluguel', regra: 'dia', dia: 5 }],
  patrimonio_iliquido: [{ id: 'il1', nome: 'FGTS — Exemplo', tipo: 'fgts', inst: 'Exemplo', valor: 1000, data: '2026-10-30', obs: '' }] };
const TELAS = [['investify', 'painel'], ['investify', 'carteira'], ['investify', 'coach'], ['budget', 'b-painel'], ['budget', 'b-custos'],
  ['budget', 'b-lanc'], ['tax', 't-painel'], ['tax', 't-deducoes'], ['investify', 'glossario'], ['investify', 'config']];

(async () => {
  const sA = await servidor(ANTES), sB = await servidor(AGORA);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fumaca-'));
  const b = await chromium.launch();
  async function foto(srv, vp, lang, tela) {
    const BASE = 'http://127.0.0.1:' + srv.address().port;
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-06T10:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.posicoes || []).length === 2);
    await p.evaluate((a) => { I18n.atual = a.lang; abrirApp(a.tela[0]); irPara(a.tela[1]); }, { lang, tela });
    await p.evaluate(() => {
      document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)); window.scrollTo(0, 0);
      /* a lista "O que há de novo" ganha a versão nova de propósito: sai das duas cópias */
      document.querySelectorAll('ol.mudancas').forEach((e) => e.parentNode.removeChild(e));
      /* o número da versão muda de propósito: troca pelo mesmo texto nas duas cópias */
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) n.nodeValue = n.nodeValue.split(VERSAO).join('0.00').replace(/\b\d+ (versões|versions)\b/g, 'N $1');
    });
    /* foto só depois de imagens e fontes prontas (senão a mesma tela sai diferente por carregar a tempo ou não) */
    await p.waitForFunction(() => Array.from(document.images).every((i) => i.complete) && document.fonts.status === 'loaded');
    await p.waitForTimeout(150);
    const png = await p.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
    const html = await p.evaluate(() => { const v = document.querySelector('.view:not(.hidden)') || document.body; return v.innerHTML.replace(/\?v=[\w.]+/g, ''); });
    const css = await p.evaluate(() => { const v = document.querySelector('.view:not(.hidden) .card') || document.body; const c = getComputedStyle(v); return [c.backgroundColor, c.color, c.borderRadius, c.padding, c.fontFamily].join('|'); });
    await ctx.close();
    return { png, html, css, erros };
  }
  /* todo o conteúdo de explicação: cada verbete do glossário (3 níveis × PT/EN, como abre no ⓘ) e cada aula do Coach */
  async function conteudo(srv) {
    const BASE = 'http://127.0.0.1:' + srv.address().port;
    const ctx = await b.newContext({ serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.posicoes || []).length === 2);
    const r = await p.evaluate(() => {
      const out = [];
      ['pt', 'en'].forEach((L) => { I18n.atual = L; ['iniciante', 'medio', 'expert'].forEach((nv) => { ST.nivel = nv;
        GLOSSARIO.map((g) => g.k).sort().forEach((k) => { abrirInfo(k); out.push(k + '|' + $('#infoTitle').textContent + '|' + $('#infoBody').innerHTML); });
        abrirApp('investify'); COACH.forEach((c) => { coachAtual = c.id; irPara('coach'); out.push(c.id + '|' + document.getElementById('view-coach').innerHTML); }); }); });
      return { n: GLOSSARIO.length + '/' + COACH.length, txt: out.join('\n') };
    });
    await ctx.close();
    return Object.assign(r, { erros });
  }
  try {
    console.log('conteúdo do glossário e do Coach');
    const cA = await conteudo(sA), cB = await conteudo(sB);
    ok(cA.n === cB.n && cA.txt === cB.txt, 'glossário e Coach iguais (' + cB.n + ' verbetes/aulas, 3 níveis, PT e EN; ' + Math.round(cB.txt.length / 1024) + ' KB de texto)');
    ok(cB.erros.length === 0, 'glossário e Coach: sem erro de página' + (cB.erros.length ? ': ' + cB.erros.join(' | ') : ''));
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      for (const lang of ['pt', 'en']) {
        console.log('tela ' + vp.width + 'x' + vp.height + ' · ' + lang);
        for (const tela of TELAS) {
          let A = await foto(sA, vp, lang, tela), B = await foto(sB, vp, lang, tela);
          const nome = tela[1] + ' ' + vp.width + ' ' + lang;
          /* HTML e estilo iguais e só a foto diferente: tira as duas de novo uma vez (ex.: a borda do aviso laranja de Deduções em 390 px
             às vezes sai 2 px diferente, com HTML e estilo iguais) */
          if (Buffer.compare(A.png, B.png) !== 0 && A.html === B.html && A.css === B.css) { A = await foto(sA, vp, lang, tela); B = await foto(sB, vp, lang, tela); }
          const igual = Buffer.compare(A.png, B.png) === 0;
          if (!igual) { fs.writeFileSync(path.join(tmp, 'fumaca-antes-' + nome.replace(/ /g, '-') + '.png'), A.png); fs.writeFileSync(path.join(tmp, 'fumaca-agora-' + nome.replace(/ /g, '-') + '.png'), B.png); }
          ok(igual && A.html === B.html && A.css === B.css, nome + ': mesma foto, mesmo HTML e mesmo estilo' + (igual ? '' : ' (fotos em ' + tmp + ')'));
          ok(B.erros.length === 0, nome + ': sem erro de página' + (B.erros.length ? ': ' + B.erros.join(' | ') : ''));
        }
      }
    }
  } finally { await b.close(); sA.close(); sB.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
