/* =====================================================================
   teste/teste-importar-compromissos.js — 3.33: Importar compromissos (Chromium headless, Playwright)
   Modo "só neste aparelho" (o gravar com a nuvem passa pelo mesmo Store.salvar, coberto em teste-nuvem.js).
   Confere: arquivo válido → prévia; o que já existe e as linhas com problema vêm desmarcados; importa só os
   marcados; nada é trocado nem apagado; arquivo inválido avisa; 390x800 e 1366x768 sem erro de página.
   Uso (na pasta raiz): node teste/teste-importar-compromissos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, posicoes: [], gastos: [], recorrentes: [{ id: 'r-ja', nome: 'Condomínio Jardim', valor: 2700, grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 10 }], config: {} };
const ARQ = { tipo: 'moneytrio-compromissos', versao: 1, criado_em: '2026-11-03', itens: [
  { nome: 'Condomínio Jardim', valor: 2700, grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 10, cada: 1, quem: 'Neco', estadoPadrao: 'pendente', desde: '', ate: '', irpf: false, avisar: true },
  { nome: 'Escola Ana 2027', valor: 3100, grupo: 'DEPENDENTES', sub: 'Escola', regra: 'dia', dia: 5, cada: 1, quem: 'Ana', desde: '2027-01-01', ate: '2027-12-31', irpf: true },
  { nome: 'YouTube Premium', valor: 26.9, grupo: 'LAZER', sub: 'Assinaturas', regra: 'dia', dia: 3, quem: 'Neco' },
  { nome: 'Coisa sem grupo', valor: 50, grupo: 'NAO_EXISTE', sub: 'X', regra: 'dia', dia: 1 },
  { nome: 'Valor zerado', valor: 0, grupo: 'PESSOAL', sub: 'Y', regra: 'dia', dia: 1 } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imp-'));
  const valido = path.join(tmp, 'compromissos.json'); fs.writeFileSync(valido, JSON.stringify(ARQ));
  const invalido = path.join(tmp, 'outro.json'); fs.writeFileSync(invalido, JSON.stringify({ tipo: 'outra-coisa', itens: [] }));
  const quebrado = path.join(tmp, 'quebrado.json'); fs.writeFileSync(quebrado, '{isto não é json');
  const b = await chromium.launch();
  try {
    { /* quem ainda não tem nenhum compromisso também vê o botão (a tela vazia de Custos) */
      const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript(() => { localStorage.setItem('moneytrio.soNesteAparelho', '1'); });
      const p = await ctx.newPage(); await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado);
      await p.evaluate(() => { abrirApp('budget'); irPara('b-custos'); });
      ok(await p.waitForSelector('#view-b-custos [data-acao="rec-importar"]', { timeout: 10000 }).then(() => true).catch(() => false), 'Custos sem nenhum compromisso (tela vazia) também tem "Importar compromissos"');
      await ctx.close();
    }
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && Array.isArray(Store.estado.recorrentes) && Store.estado.recorrentes.length === 1);
      await p.evaluate(() => { abrirApp('budget'); irPara('b-custos'); });
      await p.waitForSelector('#view-b-custos [data-acao="rec-importar"]');
      ok(true, 'Custos tem o botão "Importar compromissos"');
      const abrirArquivo = async (arq) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-b-custos [data-acao="rec-importar"]')]); await fc.setFiles(arq); };
      await abrirArquivo(quebrado); await p.waitForSelector('#genModal:not(.hidden) .imp-erro');
      ok(/não é um JSON válido/.test(await p.textContent('.imp-erro')), 'arquivo quebrado: avisa que não é JSON válido');
      await p.click('#genModal [data-close="genModal"] >> nth=-1');
      await abrirArquivo(invalido); await p.waitForSelector('#genModal:not(.hidden) .imp-erro');
      ok(/não é uma lista de compromissos/.test(await p.textContent('.imp-erro')), 'arquivo de outro tipo: avisa e não importa nada');
      await p.click('#genModal [data-close="genModal"] >> nth=-1');
      await abrirArquivo(valido); await p.waitForSelector('#genModal:not(.hidden) .imp-tbl');
      const linhas = await p.$$eval('.imp-tbl tbody tr', (trs) => trs.map((tr) => ({ ck: tr.querySelector('.imp-ck').checked, txt: tr.textContent })));
      ok(linhas.length === 5, 'prévia em tabela com as 5 linhas do arquivo');
      ok(!linhas[0].ck && /já existe: Condomínio Jardim/.test(linhas[0].txt), 'o que já existe vem DESMARCADO com o aviso "já existe"');
      ok(linhas[1].ck && linhas[2].ck, 'os novos vêm marcados');
      ok(!linhas[3].ck && /grupo inválido/.test(linhas[3].txt), 'grupo inválido: desmarcado e avisado');
      ok(!linhas[4].ck && /valor zero/.test(linhas[4].txt), 'valor zero: desmarcado e avisado');
      ok(/01\/Jan\/2027|01\/01\/2027/.test(linhas[1].txt) && /Ana/.test(linhas[1].txt) && /✓/.test(linhas[1].txt), 'a prévia mostra período, quem e IR');
      ok((await p.textContent('#impOk')).trim() === 'Importar 2 marcados', 'botão "Importar 2 marcados"');
      const lay = await p.evaluate(() => { const m = document.querySelector('#genModal .modal'), w = document.querySelector('#genModal .tbl-fixa'); return { modal: m.getBoundingClientRect().width, cabe: w.scrollWidth <= w.clientWidth + 1 }; });
      if (vp.width >= 1024) {
        ok(lay.modal > 900 && lay.cabe, '1366 px: a janela usa a largura (' + Math.round(lay.modal) + ' px) e todas as colunas cabem, sem rolagem para o lado');
        const fixo = await p.evaluate(() => { const w = document.querySelector('#genModal .tbl-fixa'); w.style.maxHeight = '120px'; w.scrollTop = 80; const th = w.querySelector('thead th'); return Math.abs(th.getBoundingClientRect().top - w.getBoundingClientRect().top) < 3 && w.scrollTop > 0; });
        ok(fixo, '1366 px: o cabeçalho da tabela fica fixo ao rolar');
        await p.evaluate(() => { document.querySelector('#genModal .tbl-fixa').style.maxHeight = ''; });
      } else ok(lay.modal <= vp.width, '390 px: a janela continua do tamanho da tela, como antes (' + Math.round(lay.modal) + ' px)');
      const sobra = await p.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
      ok(sobra <= 1, 'a página não rola para o lado (a tabela rola dentro da janela)');
      await p.click('#impOk');
      await p.waitForFunction(() => Store.estado.recorrentes.length === 3);
      const recs = await p.evaluate(() => Store.estado.recorrentes.map((r) => ({ id: r.id, nome: r.nome, grupo: r.grupo, irpf: r.irpf, desde: r.desde })));
      ok(recs[0].id === 'r-ja' && recs.some((r) => r.nome === 'Escola Ana 2027' && r.grupo === 'DEPENDENTES' && r.irpf && r.desde === '2027-01-01') && recs.some((r) => r.nome === 'YouTube Premium'), 'importou só os 2 marcados; o que já existia ficou igual');
      ok(/2 compromissos importados\. Você pode editar cada um em Recorrentes\./.test(await p.textContent('#toasts')), 'mensagem final "2 compromissos importados…"');
      ok(JSON.parse(await p.evaluate(() => localStorage.getItem('investifyme.dados.v1'))).recorrentes.length === 3, 'modo só neste aparelho: gravado no aparelho');
      /* janela pequena depois da grande: não fica larga */
      await p.evaluate(() => { abrir('genModal'); }); 
      ok(!(await p.evaluate(() => document.getElementById('genModal').classList.contains('larga'))), 'outra janela aberta depois volta ao tamanho normal');
      await p.evaluate(() => fechar('genModal'));
      if (vp.width >= 1024) {
        await p.evaluate(() => { for (let i = 0; i < 40; i++) Gasto.add({ data: '2026-10-0' + (1 + i % 9), valor: 10 + i, grupo: 'LAZER', sub: 'Cinema', desc: 'teste ' + i }); Store.salvar(); irPara('b-lanc'); });
        await p.waitForTimeout(500);
        const fixoPag = await p.evaluate(() => { const th = document.querySelector('#view-b-lanc table.tbl-lanc thead th'); if (!th) return 'sem tabela'; window.scrollTo(0, 900); const tp = document.querySelector('.topbar').getBoundingClientRect().bottom; return Math.abs(th.getBoundingClientRect().top - tp) < 4 ? true : th.getBoundingClientRect().top + ' vs ' + tp; });
        ok(fixoPag === true, '1366 px: em Lançamentos o cabeçalho da tabela fica fixo logo abaixo do topo (' + fixoPag + ')');
        await p.evaluate(() => window.scrollTo(0, 0));
      }
      await p.evaluate(() => irPara('config')); await p.waitForTimeout(300);
      ok(!!(await p.$('#view-config [data-acao="rec-importar"]')) || /Importar compromissos/.test(await p.textContent('#view-config')), 'Configurações também tem "Importar compromissos" (perto do backup)');
      ok(erros.length === 0, 'nenhum erro de página (' + erros.length + ')' + (erros[0] ? ': ' + erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.error('ERRO NO TESTE:', e); }
  finally { await b.close(); srv.close(); }
  console.log('\n' + (falhas ? '✗ ' + falhas + ' falha(s), ' : '✓ ') + oks + ' verificações ok.');
  process.exit(falhas ? 1 : 0);
})();
