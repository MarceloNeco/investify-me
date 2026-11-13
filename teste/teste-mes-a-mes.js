/* =====================================================================
   teste/teste-mes-a-mes.js — 3.74: o "Mês a mês" refeito (modulos/mes-a-mes.js). Dados FICTÍCIOS.
   Confere: a barra = entrou − gastou − investimento líquido (resgate desconta); sem parte amarela; ★ 📈 🔗 e a frase
   "rescisão investida no mês seguinte"; a linha do toque; a escala de 2,5× o p75 com ⫽; "Sobrou na conta | Dia a dia"
   guardado; a pergunta da ★ (entrada > 2× a média recorrente de 6 meses) no Painel e no 📥, e a resposta; a visão da
   casa com o de antes.
   Uso: node teste/teste-mes-a-mes.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ano = hoje.getFullYear(), mesAtual = hoje.getMonth() + 1;
const mm = (k) => { let y = ano, x = mesAtual + k; while (x < 1) { x += 12; y--; } return y + '-' + String(x).padStart(2, '0'); };
const nome = (t) => t.slice(5, 7) + '/' + t.slice(0, 4);
const gastos = [];
for (let k = -9; k <= 0; k++) {
  gastos.push({ id: 'sal' + k, data: mm(k) + '-05', valor: 10000, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO EXEMPLO', fluxo: 'entrada' });
  gastos.push({ id: 'g' + k, data: mm(k) + '-10', valor: 8000, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'CONTAS EXEMPLO', fluxo: 'saida' });
}
const MR = mm(-5), MI = mm(-4), MG = mm(-2), MB = mm(0);   /* rescisão, investimento grande, resgate, bônus */
gastos.push({ id: 'resc', data: MR + '-20', valor: 30000, grupo: 'RENDA', sub: 'Rescisão', desc: 'RESCISAO EXEMPLO', fluxo: 'entrada' });
gastos.push({ id: 'apl', data: MI + '-03', valor: 100000, grupo: 'INVESTIMENTO', sub: 'Aplicação', desc: 'APLICACAO EXEMPLO', fluxo: 'aplicacao' });
gastos.push({ id: 'resg', data: MG + '-15', valor: -2000, grupo: 'INVESTIMENTO', sub: 'Resgate', desc: 'RESGATE EXEMPLO', fluxo: 'aplicacao', resgate: true });
gastos.push({ id: 'bonus', data: MB + '-01', valor: 25000, grupo: 'RENDA', sub: 'Outros', desc: 'CREDITO EXEMPLO', fluxo: 'entrada' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof MesAMes !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const linhas = () => p.evaluate(() => { const c = document.querySelector('#view-b-painel .mm-card'); if (!c) return null;
      return { modo: c.querySelector('.mm2').dataset.modo, l: [...c.querySelectorAll('.mm-mes')].map((d) => ({ t: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), det: d.querySelector('.mm-det').textContent, quebra: !!d.querySelector('.mm-quebra'), down: !!d.querySelector('.mm-down'), extra: !!d.querySelector('.mm-extra') })), rod: c.textContent.replace(/\s+/g, ' ') }; });

    console.log('1) a barra = entrou − gastou − investimento líquido');
    const a = await linhas(); const de = (t) => a.l.find((x) => x.t.indexOf(nome(t)) === 0);
    ok(a && a.modo === 'conta', 'abre em "Sobrou na conta"');
    ok(/\+R\$ 32\.000,00/.test(de(MR).t) && /−R\$ 98\.000,00/.test(de(MI).t) && /\+R\$ 4\.000,00/.test(de(MG).t) && /\+R\$ 2\.000,00/.test(de(mm(-1)).t),
      'rescisão: 10.000 + 30.000 − 8.000 = +32.000; investimento: 10.000 − 8.000 − 100.000 = −98.000; resgate desconta: +4.000; mês comum +2.000');
    ok(!a.l.some((x) => x.extra), 'nenhuma parte amarela');
    console.log('2) as marcas e a linha do toque');
    ok(/★/.test(de(MR).t) && /🔗/.test(de(MR).t) && !/📈/.test(de(MR).t) && /📈/.test(de(MI).t) && /🔗/.test(de(MI).t) && !/[★📈🔗]/.test(de(mm(-1)).t), '★ e 🔗 no mês da rescisão; 📈 e 🔗 no do investimento; nada no mês comum');
    ok(/rescisão investida no mês seguinte/.test(de(MR).det) && /investimento da rescisão do mês anterior/.test(de(MI).det), 'a frase "rescisão investida no mês seguinte" (e, no outro mês, "investimento da rescisão do mês anterior")');
    ok(/^Entrou R\$ 40\.000,00 · gastou R\$ 8\.000,00 · foi para investimento R\$ 0,00 \(líquido\) · ★ rescisão R\$ 30\.000,00 · 🔗/.test(de(MR).det) && /📈 investiu mais que a renda média do mês \(R\$ 12\.500,00\)/.test(de(MI).det),
      'uma linha só ao tocar: entrou, gastou, investiu e as marcas (' + de(MI).det + ')');
    console.log('3) a escala: 2,5× o p75 e ⫽');
    ok(de(MI).quebra && !de(MR).quebra && !de(mm(-1)).quebra, 'só o mês do investimento grande passa da escala e é cortado com ⫽');
    ok(await p.evaluate(() => MesAMes.escala([2, 2, 4, 27, 32, 98])) === 76.875, 'escala([2,2,4,27,32,98]) = 2,5 × 30,75');
    console.log('4) Dia a dia, guardado');
    await p.click('#view-b-painel [data-acao="mm-modo"][data-m="dia"]'); await p.waitForTimeout(150);
    const d = await linhas(); const dd = (t) => d.l.find((x) => x.t.indexOf(nome(t)) === 0);
    ok(d.modo === 'dia' && /\+R\$ 2\.000,00/.test(dd(MR).t) && /\+R\$ 2\.000,00/.test(dd(MI).t) && /^Entrou recorrente R\$ 10\.000,00 · gastou R\$ 8\.000,00/.test(dd(MR).det),
      'Dia a dia: a renda recorrente menos o gasto (+2.000 no mês da rescisão e no do investimento)');
    ok(/sem renda extraordinária e sem investimento/.test(d.rod), 'o rodapé explica a vista');
    await p.reload(); await p.waitForFunction(() => typeof MesAMes !== 'undefined' && Store.estado);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-painel'); render(); });
    ok((await linhas()).modo === 'dia', 'a escolha fica guardada depois de recarregar');
    console.log('5) a pergunta da ★');
    const q = await p.evaluate(() => ({ ids: MesAMes.perguntas().map((g) => g.id), card: (document.querySelector('#view-b-painel .mm-atencao') || {}).textContent || '', inbox: inboxItens().filter((x) => /renda extraordinária\?/.test(x.nome)).length }));
    ok(q.ids.join() === 'bonus' && /Precisa da sua atenção/.test(q.card) && /R\$ 25\.000,00/.test(q.card) && q.inbox === 1, 'o crédito de 25.000 (> 2× os 10.000 de sempre) pergunta no Painel e no 📥; a rescisão (já ★) não');
    await p.click('#view-b-painel [data-acao="mm-extra-sim"]'); await p.waitForTimeout(150);
    const r5 = await p.evaluate(() => ({ g: Gasto.todos().find((x) => x.id === 'bonus').extra, q: MesAMes.perguntas().length }));
    const it = await p.evaluate((t) => MesAMes.itens(Gasto.todos()).find((m) => m.t === t), MB);
    ok(r5.g === true && r5.q === 0 && it.estrela && it.dia === 2000, 'respondeu "sim": g.extra = true, a pergunta some e o mês ganha ★ (Dia a dia volta a +2.000)');
    console.log('6) visão da casa: como antes');
    const vc = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; render(); const v = document.getElementById('view-b-painel'); const r = { novo: !!v.querySelector('.mm-card'), velho: !!v.querySelector('.mm-mes'), q: MesAMes.perguntas().length }; Escopo.soCasa = o; render(); return r; });
    ok(!vc.novo && vc.velho && vc.q === 0, 'na visão da casa: o Mês a mês de antes e nenhuma pergunta');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
