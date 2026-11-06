/* =====================================================================
   teste/teste-compromisso.js — 3.37: "Novo compromisso" mais simples (N23, N26, N29) (Chromium headless, Playwright)
   Confere: na frente só O quê, Valor e Dia ("Mais opções" fechado); abre no topo; sugestões enquanto digita
   (histórico, dicionário, pessoa do nome, Casa); "Como paga" com rótulos claros; meses de fora; não fecha ao
   tocar fora; rascunho ao cancelar e "Continuar de onde parou"; "Salvar e copiar"; aviso de repetido;
   conta de acesso / cartão / observação com aviso de senha; Clonar; Rolar para o próximo ano.
   Uso (na pasta raiz): node teste/teste-compromisso.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ANO = hoje.getFullYear();
const dt = (k, d) => { const x = new Date(ANO, hoje.getMonth() - k, d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const gastos = [];
for (let k = 1; k <= 4; k++) gastos.push({ id: 'e' + k, data: dt(k, 5), valor: 3100, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'Escola Ana mensalidade', quem: 'Ana', irpf: true, fluxo: 'saida', per: 'Mensal' });
const LOCAL = { v: 1, posicoes: [], gastos, config: {}, recorrentes: [
  { id: 'r-amp', nome: 'Ampliado Ana 1º sem', valor: 900, grupo: 'DEPENDENTES', sub: 'Escola', regra: 'dia', dia: 10, quem: 'Ana', desde: ANO + '-01-01', ate: ANO + '-12-31' },
  { id: 'r-seg', nome: 'Seguro Auto ' + ANO, valor: 2400, grupo: 'VEICULO', sub: 'Seguro Auto', regra: 'anual', mes: 3, dia: 10, desde: ANO + '-01-01', ate: ANO + '-12-31' } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 2);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); custosAba = 'recorrentes'; render(); });
      const recs = () => p.evaluate(() => Store.estado.recorrentes.map((r) => JSON.parse(JSON.stringify(r))));
      const novo = async () => { await p.click('#view-b-custos [data-acao="rec-novo"]'); await p.waitForSelector('#assetModal:not(.hidden) #rcNome'); };

      /* (a)(l) frente simples, no topo */
      await novo();
      ok(await p.isVisible('#rcNome') && await p.isVisible('#rcValor') && await p.isVisible('#rcDia'), 'na frente: O quê, Valor e Dia');
      ok(!(await p.isVisible('#rcGrupo')) && !(await p.getAttribute('#rcMais', 'open')), '"Mais opções" vem fechado');
      ok(await p.evaluate(() => (document.querySelector('#assetModal .modal') || {}).scrollTop === 0), 'abre no topo');
      ok(/Não escreva senha aqui/.test(await p.textContent('#rcMais')), 'aviso fixo de não pôr senha');
      /* (f)(g)(i) sugestão */
      await p.fill('#rcNome', 'Escola Ana'); await p.waitForSelector('.rc-sug');
      const sug = await p.textContent('.rc-sug');
      ok(/Dependentes/.test(sug) && /Ana/.test(sug) && /IR/.test(sug) && /dia 5/.test(sug) && /3\.100/.test(sug), 'sugestão à vista: Dependentes · Escola · Ana · IR · dia 5 · R$ 3.100');
      await p.click('[data-acao="rec-sug-usar"]');
      const anoEsc = ANO + (hoje.getMonth() + 1 >= 7 ? 1 : 0);
      const f = await p.evaluate(() => lerFormRecorrente());
      ok(f.grupo === 'DEPENDENTES' && f.quem === 'Ana' && f.irpf && f.dia === 5 && f.valor === 3100, '"Usar" preenche grupo, para quem, IR, dia e valor');
      ok(f.desde === anoEsc + '-01-01' && f.ate === anoEsc + '-12-31', 'escola sugere 01/jan a 31/dez de ' + anoEsc);
      /* (m) tocar fora não fecha; cancelar guarda rascunho */
      await p.mouse.click(3, vp.height - 3);
      ok(await p.isVisible('#assetModal #rcNome'), 'tocar fora NÃO fecha');
      await p.click('#assetModal .f-actions [data-close="assetModal"]');
      ok(!(await p.isVisible('#assetModal')), 'Cancelar fecha');
      await novo();
      ok(await p.isVisible('.rc-rasc'), 'ao abrir de novo: "Você tinha começado este compromisso"');
      await p.click('[data-acao="rec-rasc-usar"]');
      ok(await p.inputValue('#rcNome') === 'Escola Ana' && await p.inputValue('#rcValor') === '3100', '"Continuar de onde parou" devolve o que foi digitado');
      ok(await p.evaluate(() => !Object.keys(localStorage).concat(Object.keys(sessionStorage)).some((k) => /rascunho/i.test(k))), 'rascunho fica só na memória (nada de finança solta no aparelho)');
      /* (h) Como paga */
      const rot = await p.$$eval('.rc-radio b', (e) => e.map((x) => x.textContent));
      ok(rot.join('|') === 'Eu pago (boleto ou Pix)|Débito automático|Agendado no banco', '"Como paga" com rótulos claros');
      /* (j) meses de fora */
      await p.click('[data-rcmes="7"]');
      ok(await p.inputValue('#rcFora') === '7' && /menos Jul/.test(await p.textContent('#rcResumo')), 'tirar julho: fileira de 12 meses e o resumo diz "menos Jul"');
      /* N29 */
      await p.fill('#rcConta', 'outro.email@exemplo.com'); await p.fill('#rcCartao', 'Itaú Black final 6514'); await p.fill('#rcObs', 'renova em fevereiro');
      /* (k) Salvar e copiar */
      await p.click('[data-acao="rec-salvar-copiar"]');
      await p.waitForSelector('#assetModal:not(.hidden) #rcNome');
      ok(/cópia/.test(await p.textContent('#assetModalTitle')) && await p.inputValue('#rcNome') === 'Escola Ana', '"Salvar e copiar" salva e abre outro igual');
      let R = await recs(); const esc = R.find((r) => r.nome === 'Escola Ana');
      ok(esc && esc.fora.join() === '7' && esc.conta === 'outro.email@exemplo.com' && esc.cartao === 'Itaú Black final 6514' && esc.obs === 'renova em fevereiro' && esc.pagador === '', 'salvo com meses de fora, conta de acesso, cartão e observação');
      ok(await p.evaluate((a) => Recorrente.datasNoMes(Recorrente.achar(Store.estado.recorrentes.find((r) => r.nome === 'Escola Ana').id), a, 7).length === 0, anoEsc), 'julho não tem vencimento');
      /* (n) aviso de repetido */
      await p.fill('#rcNome', 'Ampliado Ana 2º sem'); await p.fill('#rcValor', '900');
      await p.evaluate((a) => { document.getElementById('rcDesde').value = a + '-08-01'; document.getElementById('rcAte').value = a + '-12-31'; }, ANO);
      await p.click('#assetModal [data-acao="rec-salvar"]');
      await p.waitForSelector('#genModal:not(.hidden) [data-acao="rec-rep-salvar"]');
      const av = await p.textContent('#genBody');
      ok(/Parece repetido/.test(av) && /Ampliado Ana 1º sem/.test(av) && /já cobre/.test(av), 'aviso: "Parece repetido: Ampliado Ana 1º sem … já cobre …"');
      await p.click('[data-acao="rec-rep-salvar"]');
      R = await recs();
      ok(R.some((r) => r.nome === 'Ampliado Ana 2º sem'), '"Salvar assim mesmo" salva');
      ok((await p.textContent('#view-b-custos')).includes('repetido?'), 'a lista de Recorrentes marca "⚠ repetido?"');
      /* N26 clonar */
      await p.click('[data-recclone="r-seg"]'); await p.waitForSelector('#assetModal:not(.hidden) #rcNome');
      ok(await p.inputValue('#rcNome') === 'Seguro Auto ' + ANO && /cópia/.test(await p.textContent('#assetModalTitle')), 'Clonar abre um novo com tudo preenchido');
      await p.click('#assetModal .f-actions [data-close="assetModal"]');
      /* N26 rolar */
      await p.click('[data-recrolar="r-seg"]'); await p.waitForSelector('#genModal:not(.hidden) [data-acao="rec-rolar-ok"]');
      ok((await p.textContent('#genBody')).includes('Seguro Auto ' + (ANO + 1)), 'Rolar mostra o nome do ano que vem');
      await p.click('[data-acao="rec-rolar-ok"]');
      R = await recs(); const rol = R.find((r) => r.rolouDe === 'r-seg');
      ok(rol && rol.nome === 'Seguro Auto ' + (ANO + 1) && rol.desde === (ANO + 1) + '-01-01' && rol.ate === (ANO + 1) + '-12-31' && rol.aConfirmar, 'rolado: nome, datas 1 ano à frente e "a confirmar"');
      ok((await p.textContent('#view-b-custos')).includes('a confirmar'), 'a lista mostra "⚠ a confirmar"');
      await p.click('[data-recedit="' + rol.id + '"]'); await p.waitForSelector('#assetModal:not(.hidden) #rcNome');
      ok(/A confirmar/.test(await p.textContent('#assetModalBody')), 'o formulário avisa "A confirmar"');
      await p.click('#assetModal [data-acao="rec-salvar"]');
      ok(!(await recs()).find((r) => r.id === rol.id).aConfirmar, 'salvar tira o "a confirmar"');
      /* dicionário: Aluguel é da casa */
      await novo(); await p.click('[data-acao="rec-rasc-fora"]').catch(() => {});
      await p.fill('#rcNome', 'Aluguel apartamento'); await p.waitForSelector('.rc-sug');
      ok(/Habitação/.test(await p.textContent('.rc-sug')) && /Casa \(família toda\)/.test(await p.textContent('.rc-sug')), 'Aluguel: Habitação e "Casa (família toda)"');
      await p.click('#assetModal .f-actions [data-close="assetModal"]');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
