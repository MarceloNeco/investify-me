/* =====================================================================
   teste/teste-graficos.js — 3.65.2: gráficos, aporte/resgate, patrimônio de hoje e o formulário do lançamento
   ---------------------------------------------------------------------
   Dados fictícios. Confere, em 1366×768, 1920×1080 e 390×844, nos dois temas:
     · o cartão do gráfico (com a legenda) cabe na tela; o SVG é desenhado na largura real (escala ~1); o texto do eixo
       tem 12 px e contraste AA (≥ 4,5) com o cartão; o zero aparece; o saldo do mês é uma linha roxa que muda com o tema;
       os dois blocos do Fluxo têm título próprio; no Painel, "Para onde foi" e "Mês a mês" lado a lado no computador e
       "Os meses caros" em 12 colunas. Fotos em /tmp/graf2-*.png.
     · aplicação do robô (transferência "APLICACAO …") vira aporte e "Foi para investimento" deixa de ser R$ 0; resgate volta;
       as que já estavam guardadas como transferência migram uma vez.
     · "Patrimônio de hoje" pelos saldos e investimentos do robô (sem a carteira); com a carteira, sem contar duas vezes.
     · formulário: a categoria abre a lista inteira do grupo (a atual marcada); "✓ Confirmar como está" no "A confirmar",
       sem a bandeira de conferir; "Falta: categoria"; "Por qual banco" vem do banco do robô; o valor da linha nunca some.
   Uso (na pasta raiz): node teste/teste-graficos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };

const gastos = [];
const grupos = [['HABITACAO', 'Condomínio'], ['DEPENDENTES', 'Escola'], ['SAUDE', 'Farmácia'], ['VEICULO', 'Combustível'], ['LAZER', 'Restaurante'], ['PESSOAL', 'Roupa']];
for (let m = 1; m <= 10; m++) {
  const mm = String(m).padStart(2, '0');
  grupos.forEach((g, i) => gastos.push({ id: 'g' + m + '_' + i, data: '2026-' + mm + '-1' + i, valor: 300 + i * 120 + m * 9, grupo: g[0], sub: g[1], desc: 'GASTO ' + i, fluxo: 'saida' }));
  gastos.push({ id: 'r' + m, data: '2026-' + mm + '-05', valor: m % 3 ? 5200 : 2600, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO TESTE', fluxo: 'entrada' });
}
gastos.push({ id: 'longo', data: '2026-10-20', valor: 1234.56, grupo: 'LAZER', sub: 'Restaurante', fluxo: 'saida',
  desc: 'PAGAMENTO DE UMA DESCRIÇÃO MUITO LONGA QUE O BANCO MANDOU COM VÁRIAS PALAVRAS E CÓDIGOS 123456 ABCDEF REPETIDOS PARA OCUPAR A LINHA INTEIRA DA TABELA' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [] };

function lum(rgb) { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function contraste(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const novo = async (vp, tema) => {
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (d) => d.accept());
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Viz !== 'undefined');
      await p.evaluate((t) => { I18n.atual = 'pt'; ST.tema = t; aplicarTema(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); }, tema);
      return p;
    };

    console.log('1) aporte e resgate do robô; patrimônio de hoje');
    const p = await novo({ width: 1366, height: 768 }, 'dark');
    const ap = await p.evaluate(() => {
      const C = MoneyNuvem._teste.Caixa;
      const k = { a: C.aporte({ descricao: 'APLICACAO PRIVILEGE INT', grupo: 'INVESTIMENTO' }), r: C.aporte({ descricao: 'RESGATE PRIVILEGE' }), n: C.aporte({ descricao: 'PIX ENVIADO' }), g: C.aporte({ descricao: 'XYZ', grupo: 'INVESTIMENTO' }) };
      /* o que já estava guardado como transferência (a caixa antiga) migra uma vez */
      ST.transferencias = [{ id: 'tf_ap1', data: '2026-01-02', valor: 20000, banco: 'Itaú', desc: 'APLICACAO PRIVILEGE INT', forma: '', origem: 'robo', idRobo: 'ap1' },
        { id: 'tf_rs1', data: '2026-06-10', valor: 5000, banco: 'Itaú', desc: 'RESGATE PRIVILEGE', forma: '', origem: 'robo', idRobo: 'rs1' },
        { id: 'tf_ok', data: '2026-03-03', valor: 300, banco: 'Itaú', desc: 'TED ENTRE CONTAS', forma: '', origem: 'robo', idRobo: 'ok1' }];
      delete ST.config.aportesV;
      const n = C.migrarAplicacoes(), n2 = C.migrarAplicacoes();
      const a1 = Gasto.todos().find((g) => g.id === 'rb_ap1'), r1 = Gasto.todos().find((g) => g.id === 'rb_rs1');
      Store.salvar(); bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; irPara('b-fluxo'); render();
      const kpi = [...document.querySelectorAll('#view-b-fluxo .kpi')].map((x) => x.textContent.replace(/\s+/g, ' '));
      return { k, n, n2, a1: a1 && [a1.fluxo, a1.valor, a1.sub].join('|'), r1: r1 && [r1.fluxo, r1.valor, r1.sub].join('|'), tf: ST.transferencias.map((t) => t.id).join(','), kpi };
    });
    ok(ap.k.a === 'aplicacao' && ap.k.r === 'resgate' && !ap.k.n && ap.k.g === 'aplicacao', 'regra: "APLICACAO …" = aplicação, "RESGATE …" = resgate, grupo INVESTIMENTO sem palavra = aplicação, Pix comum não');
    ok(ap.n === 2 && ap.n2 === 0 && ap.a1 === 'aplicacao|20000|Aplicação' && ap.r1 === 'aplicacao|-5000|Resgate' && ap.tf === 'tf_ok', 'as transferências guardadas migram uma vez: aplicação +20.000 e resgate −5.000 viram aporte; a TED comum fica (' + ap.a1 + ' · ' + ap.r1 + ')');
    ok(ap.kpi.some((x) => /Foi para investimento\s*R\$ 15\.000,00/.test(x)), '"Foi para investimento" = R$ 15.000,00 (antes R$ 0,00): ' + (ap.kpi.find((x) => /investimento/.test(x)) || ''));
    const pat = await p.evaluate(() => {
      ST.saldos_banco = [{ id: 's1', tipo: 'conta', banco: 'Itaú', conta: 'Conta', saldo: 4000, data: '2026-11-10', hist: [] },
        { id: 's2', tipo: 'investimento', banco: 'Itaú', conta: 'CDB TESTE', saldo: 21000, data: '2026-11-10', hist: [] }];
      render(); const k1 = [...document.querySelectorAll('#view-b-fluxo .kpi')].map((x) => x.textContent.replace(/\s+/g, ' ')).find((x) => /Patrimônio de hoje/.test(x));
      return { k1 };
    });
    ok(/R\$ 25\.000,00/.test(pat.k1) && /saldos das contas \+ investimentos do banco/.test(pat.k1), '"Patrimônio de hoje" pelos saldos (4.000) + investimentos do robô (21.000) = R$ 25.000,00, sem "cadastre a carteira": ' + pat.k1);
    await p.close();

    console.log('2) gráficos nas três telas e nos dois temas');
    const corSaldo = {};
    for (const [vp, nome] of [[{ width: 1366, height: 768 }, '1366'], [{ width: 1920, height: 1080 }, '1920'], [{ width: 390, height: 844 }, '390']]) {
      for (const tema of ['dark', 'light']) {
        const q = await novo(vp, tema);
        await q.evaluate(() => { bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; irPara('b-fluxo'); render(); });
        await q.waitForTimeout(500);
        const f = await q.evaluate(() => {
          const svg = document.querySelector('#view-b-fluxo .viz-duplo svg'), card = svg.closest('.card'), vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
          const ax = svg.querySelector('.ax'), cs = getComputedStyle(ax), bg = getComputedStyle(card).backgroundColor;
          const saldo = svg.querySelector('.viz-saldo');
          return { escala: r.width / vb.width, cardH: card.getBoundingClientRect().height, vh: innerHeight, fonte: cs.fontSize, cor: cs.fill, bg,
            zero: svg.querySelectorAll('.viz-zero').length, saldo: saldo ? getComputedStyle(saldo).stroke : '', titulos: [...svg.querySelectorAll('.viz-painel-t')].map((t) => t.textContent),
            leg: !!card.querySelector('.viz-leg'), lado: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        const c = contraste(f.cor, f.bg === 'rgba(0, 0, 0, 0)' ? (tema === 'dark' ? 'rgb(21,28,38)' : 'rgb(255,255,255)') : f.bg);
        ok(Math.abs(f.escala - 1) < 0.03 && f.fonte === '12px' && c >= 4.5, nome + ' ' + tema + ' · Fluxo: desenhado na largura real (escala ' + f.escala.toFixed(2) + '), eixo de 12 px com contraste ' + c.toFixed(1));
        ok(f.cardH <= f.vh - 40 || nome === '390', nome + ' ' + tema + ' · Fluxo: o cartão inteiro com a legenda cabe na tela (' + Math.round(f.cardH) + ' de ' + f.vh + ' px)');
        ok(f.zero >= 1 && f.saldo && f.titulos.join('|') === 'O que você tem|Entrou e saiu, mês a mês' && f.leg && !f.lado, nome + ' ' + tema + ' · zero visível, saldo do mês (' + f.saldo + '), dois blocos com título, legenda, sem rolagem para o lado');
        corSaldo[tema] = f.saldo;
        await q.screenshot({ path: '/tmp/graf2-fluxo-' + nome + '-' + tema + '.png', fullPage: nome === '390' });
        await q.evaluate(() => { irPara('b-painel'); render(); });
        await q.waitForTimeout(400);
        const pn = await q.evaluate(() => {
          const par = document.querySelector('#view-b-painel .painel-par'), cols = par ? getComputedStyle(par).gridTemplateColumns.split(' ').length : 0;
          return { cols, meses: document.querySelectorAll('#view-b-painel .viz-col').length, zero: document.querySelectorAll('#view-b-painel .viz-div-zero').length, lado: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        ok(pn.cols === (vp.width >= 1200 ? 2 : 1) && pn.meses === 12 && pn.zero >= 10 && !pn.lado, nome + ' ' + tema + ' · Painel: ' + pn.cols + ' coluna(s) em "Para onde foi"/"Mês a mês", 12 colunas nos meses, o zero em cada mês');
        await q.screenshot({ path: '/tmp/graf2-painel-' + nome + '-' + tema + '.png', fullPage: true });
        /* o valor da linha nunca some atrás da descrição longa */
        await q.evaluate(() => { irPara('b-lanc'); bFiltro.periodo = 'tudo'; render(); });
        await q.waitForTimeout(300);
        const ln = await q.evaluate(() => { const tr = document.querySelector('[data-bid="longo"]'); if (!tr) return null; const d = tr.querySelector('.desc-txt'), v = tr.querySelector('td.num'); const a = d.getBoundingClientRect(), z = v.getBoundingClientRect(); return { cobre: a.right > z.left + 1 && a.bottom > z.top && a.top < z.bottom, dentro: z.right <= innerWidth + 1 && z.width > 20 }; });
        ok(ln && !ln.cobre && ln.dentro, nome + ' ' + tema + ' · Lançamentos: a descrição longa não cobre o valor e o valor fica na tela');
        ok(q.erros.length === 0, nome + ' ' + tema + ' · sem erro de página' + (q.erros.length ? ': ' + q.erros[0] : ''));
        await q.close();
      }
    }
    ok(corSaldo.dark && corSaldo.light && corSaldo.dark !== corSaldo.light, 'o roxo do saldo muda com o tema (' + corSaldo.dark + ' × ' + corSaldo.light + ')');

    console.log('3) o formulário do lançamento');
    const w = await novo({ width: 1366, height: 768 }, 'dark');
    await w.evaluate(() => {
      const C = MoneyNuvem._teste.Caixa, add = (l) => Gasto.add(C.converter(Object.assign({ tipo: 'despesa', data: '2026-11-05' }, l)));
      add({ id: 'cond', valor: 900, descricao: 'Pagamento de boleto INT PAG TIT ULO ITAU', grupo: 'HABITACAO', categoria: 'Condomínio', confianca: 'palpite', forma: 'Debito', banco: 'Itaú' });
      add({ id: 'desc', valor: 77, descricao: 'COISA SEM NOME', grupo: 'OUTROS', categoria: '', confianca: 'desconhecido', forma: 'Debito', banco: 'Itaú' });
      ['Internet', 'Amortização Apartamento', 'Consórcio'].forEach((sub, i) => Gasto.add({ id: 'hab' + i, data: '2026-10-0' + (i + 1), valor: 100, grupo: 'HABITACAO', sub, desc: 'X', fluxo: 'saida' }));
      Store.salvar(); abrirLancamento('rb_cond');
    });
    await w.waitForSelector('#glSub');
    await w.click('#glSub'); await w.waitForTimeout(150);
    const cb = await w.evaluate(() => ({ itens: [...document.querySelectorAll('#glSubLista li[data-v]')].map((l) => l.textContent), atual: (document.querySelector('#glSubLista li.atual') || {}).textContent || '', arv: (Gasto.arvore().HABITACAO || []).length, aberto: !document.getElementById('glSubLista').hidden }));
    ok(cb.aberto && cb.itens.length === cb.arv && cb.arv > 3 && /✓ Condomínio/.test(cb.atual), 'categoria: ao tocar, abre a lista INTEIRA da Habitação (' + cb.itens.length + '), com "Condomínio" marcada');
    await w.fill('#glSub', 'inter'); await w.waitForTimeout(100);
    const cb2 = await w.evaluate(() => [...document.querySelectorAll('#glSubLista li[data-v]')].map((l) => l.textContent));
    ok(cb2.length >= 1 && cb2.every((x) => /inter/i.test(x)), 'digitar filtra (' + cb2.join(', ') + ')');
    await w.fill('#glSub', 'Categoria Nova Teste'); await w.keyboard.press('Escape');
    ok((await w.inputValue('#glSub')) === 'Categoria Nova Teste', 'texto livre continua valendo');
    const top = await w.evaluate(() => ({ conf: !!document.querySelector('[data-acao="lf-confirmar"]'), selo: /A confirmar/.test((document.querySelector('.lf-topo') || {}).textContent || ''),
      rev: (() => { const r = document.getElementById('glRev'); return r && !r.closest('label').hidden; })(), banco: (document.getElementById('glBanco') || {}).value }));
    ok(top.conf && top.selo && !top.rev, '"A confirmar": selo e "✓ Confirmar como está" no topo; a bandeira "Marcar para conferir" sai');
    ok(top.banco === 'cod:341', '"Por qual banco" já vem com o Itaú (o banco que o robô mandou): ' + top.banco);
    await w.evaluate(() => fechar('assetModal'));
    await w.evaluate(() => abrirLancamento('rb_cond'));
    await w.waitForSelector('[data-acao="lf-confirmar"]'); await w.click('[data-acao="lf-confirmar"]'); await w.waitForTimeout(200);
    const cf = await w.evaluate(() => { const g = Gasto.todos().find((x) => x.id === 'rb_cond'); return { st: Origem.status(g), rev: !!g.revisar, fechou: document.getElementById('assetModal').classList.contains('hidden'), quando: !!g.confirmadoEm }; });
    ok(!cf.st && !cf.rev && cf.fechou && cf.quando, '"✓ Confirmar como está" confirma, tira a marca de conferir e fecha');
    await w.evaluate(() => abrirLancamento('rb_desc')); await w.waitForSelector('#lfFalta');
    const ft = await w.evaluate(() => ({ t: document.getElementById('lfFalta').textContent, marc: [...document.querySelectorAll('.lf-falta')].map((x) => x.id) }));
    ok(/Falta: grupo, categoria/.test(ft.t) && ft.marc.indexOf('glSub') >= 0, '"A identificar": "' + ft.t + '", com o campo destacado');
    await w.selectOption('#glGrupo', 'SAUDE'); await w.fill('#glSub', 'Farmácia'); await w.waitForTimeout(100);
    const ft2 = await w.evaluate(() => ({ t: document.getElementById('lfFalta').textContent, h: document.getElementById('lfFalta').hidden }));
    ok(ft2.h || !/categoria/.test(ft2.t), 'preencheu: o "Falta" atualiza (' + (ft2.h ? 'sumiu' : ft2.t) + ')');
    await w.evaluate(() => document.activeElement && document.activeElement.blur());
    await w.click('[data-acao="gl-salvar"]'); await w.waitForTimeout(200);
    const sv = await w.evaluate(() => { const g = Gasto.todos().find((x) => x.id === 'rb_desc'); const b = Banco.achar(g.bancoId); return { st: Origem.status(g), banco: b && b.cod, sub: g.sub }; });
    ok(!sv.st && sv.sub === 'Farmácia' && sv.banco === '341', 'salvar confirma e cadastra o Itaú como banco do lançamento');
    await w.screenshot({ path: '/tmp/graf2-form.png' });
    ok(w.erros.length === 0, 'formulário: sem erro de página' + (w.erros.length ? ': ' + w.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
