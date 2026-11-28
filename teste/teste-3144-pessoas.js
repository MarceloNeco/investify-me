/* =====================================================================
   teste/teste-3144-pessoas.js — 3.144: feedback do dono em Pessoas. Dados FICTÍCIOS (nomes, bancos e valores inventados).
   Confere:
   1) o titular que o robô manda ("Zeca", rótulo antigo) aparece pelo nome atual da ficha ("Carlos") no Painel; um rótulo sem ficha,
      parecido com alguém, vira "É a Bia?" (e não aparece cru); confirmar liga e passa a mostrar o nome;
   2) editar abre numa folha própria: lista atrás travada, faixa "Editando", [Cancelar] [Salvar] fixos; Cancelar, Esc e o Voltar do
      celular fecham e a lista volta para o mesmo ponto; com mudança não salva, pergunta antes; Salvar grava e fecha;
      no celular a folha ocupa a tela; no computador é um painel;
   3) campos: Nome, "Como aparece no extrato/Pix" em chips (Enter põe, ✕ tira, sugestão dos lançamentos), "Mais detalhes" fechado com
      o nome completo, e o e-mail atrás de "Convidar para o MoneyTRIO"; sem Apelido, Nome do meio, Sobrenome nem "Também chamado";
   5) o desenho: três partes (Família, Pessoas próximas, Empresas) com "+ Adicionar" cada; papel como texto; a relação em 1 toque e a regra
      só no app (Pix para a diarista vira Habitação › Diarista); toda a Família na parte da casa, nenhuma pessoa próxima; "é X (sogra)?".
   4) migração sem perder nada: da família, o nome do cadastro → Nome (o apelido, código do robô, vai para os nomes antigos); nome + meio +
      sobrenome → nome completo; o antigo fica guardado; os nomes velhos ainda acham.
   Uso: node teste/teste-3144-pessoas.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const pessoas = [
  { id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Carlos', meio: 'Pereira', sobrenome: 'Exemplo', apelido: '', banco: [], aliases: ['Zeca'] },
  { id: 'p2', tipo: 'casa', papel: 'responsavel', nome: 'Beatriz', meio: '', sobrenome: 'Teste', apelido: 'Bia', banco: [], aliases: [] },
  { id: 'p3', tipo: 'casa', papel: 'dependente', nome: 'Dudu', meio: '', sobrenome: '', apelido: '', banco: [], aliases: [] }
];
for (let i = 0; i < 25; i++) pessoas.push({ id: 'po' + i, tipo: 'outra', papel: '', nome: 'Vizinho Ficticio ' + String.fromCharCode(65 + i), meio: '', sobrenome: '', apelido: '', banco: [], aliases: [] });
const gastos = [{ id: 'g1', data: '2026-11-10', valor: 50, grupo: 'OUTROS', sub: 'Pix', desc: 'PIX ENVIADO CARLOS P EXEMPLO', fluxo: 'saida', contraparte: { nome: 'CARLOS P EXEMPLO' } }];
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2 }, posicoes: [], gastos, recorrentes: [], pessoas };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    let dialogo = 'accept', perguntou = 0; p.on('dialog', (d) => { perguntou++; d[dialogo](); });
    await p.clock.setFixedTime(new Date('2026-11-28T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Pessoas !== 'undefined' && typeof Folha !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });

    console.log('4) migração sem perder nada');
    const m = await p.evaluate(() => { const a = Pessoas.porId('p1'), b = Pessoas.porId('p2'), c = Pessoas.porId('p3');
      return { a: [a.nome, a.completo, Pessoas.rotulo(a), a.antes3144 && a.antes3144.sobrenome], b: [b.nome, b.completo, Pessoas.rotulo(b), b.antes3144 && b.antes3144.apelido, (b.aliases || []).join()], c: [c.nome, c.completo, Pessoas.rotulo(c)],
        acha: ['Zeca', 'Carlos', 'Carlos Exemplo', 'Carlos Pereira Exemplo', 'Beatriz', 'Bia'].map((t) => (Pessoas.achar(t) || {}).id).join(',') }; });
    ok(m.a.join('|') === 'Carlos|Carlos Pereira Exemplo|Carlos|Exemplo', 'sem apelido: Nome "Carlos", nome completo "Carlos Pereira Exemplo", o sobrenome antigo guardado: ' + JSON.stringify(m.a));
    ok(m.b.join('|') === 'Beatriz|Beatriz Teste|Beatriz|Bia|Bia', 'com apelido (código do robô): Nome "Beatriz", nome completo "Beatriz Teste", "Bia" nos nomes antigos e guardado: ' + JSON.stringify(m.b));
    ok(m.c.join('|') === 'Dudu||Dudu', 'só o nome: fica "Dudu", sem nome completo');
    ok(m.acha === 'p1,p1,p1,p1,p2,p2', 'os nomes velhos e o nome completo ainda acham a pessoa: ' + m.acha);

    console.log('1) o titular do robô pelo nome atual');
    await p.evaluate(() => {
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-c1-2026-11-28', banco: 'Banco Exemplo', conta: 'Conta corrente', conta_id: 'c1', categoria_conta: 'conta', final_conta: '1111', dono: 'Zeca', saldo: 1000, data: '2026-11-28' });
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-c2-2026-11-28', banco: 'Outro Banco Exemplo', conta: 'Conta corrente', conta_id: 'c2', categoria_conta: 'conta', final_conta: '2222', dono: 'BIA T', saldo: 500, data: '2026-11-28' });
      Store.salvar(); irPara('b-painel'); render(); });
    const sb = await p.evaluate(() => [...document.querySelectorAll('.sb-card tr')].map((r) => r.innerText.replace(/\s+/g, ' ')).filter((t) => /1111|2222/.test(t)));
    const l1 = sb.find((t) => /1111/.test(t)) || '', l2 = sb.find((t) => /2222/.test(t)) || '';
    ok(/Carlos · lido em/.test(l1) && !/Zeca/.test(l1), 'conta ···1111: "Carlos", não "Zeca": ' + JSON.stringify(l1));
    ok(/É Beatriz\?/.test(l2) && !/BIA T/.test(l2), 'conta ···2222 (rótulo "BIA T", sem ficha): pergunta "É Beatriz?" (sem artigo: o gênero não está na ficha), e o rótulo cru não aparece: ' + JSON.stringify(l2));
    await p.click('[data-acao="ps-titular-sim"]'); await p.waitForTimeout(150);
    const l2b = await p.evaluate(() => [...document.querySelectorAll('.sb-card tr')].map((r) => r.innerText.replace(/\s+/g, ' ')).find((t) => /2222/.test(t)) || '');
    ok(/Beatriz · lido em/.test(l2b) && !/É Beatriz/.test(l2b), 'confirmado: a conta mostra "Beatriz": ' + JSON.stringify(l2b));
    ok(await p.evaluate(() => SaldoPrevisto.dono({ dono: 'Zeca' }).nome === 'Carlos' && SaldoPrevisto.dono({ dono: 'Nome Que Ninguem Tem' }).nome === ''), 'saldo previsto: "Zeca" vira "Carlos"; rótulo desconhecido não aparece cru');

    console.log('2) editar numa folha própria');
    await p.evaluate(() => { irPara('cfg-pessoas'); render(); });
    await p.evaluate(() => { const r = document.querySelector('[data-ps="po20"]'); r.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(100);
    const y0 = await p.evaluate(() => scrollY);
    await p.click('[data-ps="po20"] [data-acao="ps-editar"]'); await p.waitForTimeout(100);
    const f = await p.evaluate(() => { const fo = document.querySelector('#folhaEditar .folha'), r = fo && fo.getBoundingClientRect(), pe = document.querySelector('.folha-pe').getBoundingClientRect();
      return { aberta: !!fo, trava: document.body.classList.contains('folha-travada'), selo: (document.querySelector('.folha-selo') || {}).textContent, tit: (document.getElementById('folhaTit') || {}).textContent,
        w: r && Math.round(r.width), h: r && Math.round(r.height), pe: Math.round(pe.bottom), lista: !document.querySelector('.ps-grupo .ps-form'), focoNaFolha: !!document.activeElement.closest('#folhaEditar') }; });
    ok(f.aberta && f.trava && /Editando/.test(f.selo) && f.tit === 'Editar · Vizinho', 'abre a folha "Editando · Editar · Vizinho" (o nome que já aparecia), com a lista travada: ' + JSON.stringify(f));
    ok(f.w === 390 && f.h === 800 && f.pe === 800, 'no celular (390 px) a folha ocupa a tela, com os botões fixos embaixo');
    ok(f.lista && f.focoNaFolha, 'o formulário não está no meio da lista e o foco está na folha');
    await p.click('#folhaCancelar'); await p.waitForTimeout(100);
    ok(await p.evaluate((y) => !document.getElementById('folhaEditar') && !document.body.classList.contains('folha-travada') && Math.abs(scrollY - y) < 2, y0), 'Cancelar fecha e a lista volta para o mesmo ponto');
    await p.click('[data-ps="po20"] [data-acao="ps-editar"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !document.getElementById('folhaEditar')), 'Esc = Cancelar');
    await p.click('[data-ps="po20"] [data-acao="ps-editar"]'); await p.waitForTimeout(100);
    await p.goBack(); await p.waitForTimeout(200);
    ok(await p.evaluate((y) => !document.getElementById('folhaEditar') && viewAtual === 'cfg-pessoas' && Math.abs(scrollY - y) < 2, y0), 'o Voltar do celular = Cancelar (continua em Pessoas, no mesmo ponto)');
    await p.click('[data-ps="po20"] [data-acao="ps-editar"]'); await p.fill('#psNome', 'Vizinho Mudado');
    dialogo = 'dismiss'; perguntou = 0; await p.click('#folhaCancelar'); await p.waitForTimeout(100);
    ok(perguntou === 1 && await p.evaluate(() => !!document.getElementById('folhaEditar')), 'com mudança não salva, Cancelar pergunta "Sair sem salvar?"; "não" fica na folha');
    dialogo = 'accept'; await p.click('#folhaSalvar'); await p.waitForTimeout(150);
    ok(await p.evaluate((y) => !document.getElementById('folhaEditar') && Pessoas.rotulo(Pessoas.porId('po20')) === 'Vizinho Mudado' && Math.abs(scrollY - y) < 40, y0), 'Salvar grava "Vizinho Mudado", fecha e volta para perto do mesmo ponto');

    console.log('3) campos novos');
    await p.click('[data-ps="p1"] [data-acao="ps-editar"]'); await p.waitForTimeout(100);
    const c = await p.evaluate(() => ({ nome: document.getElementById('psNome').value, velhos: ['psApelido', 'psMeio', 'psSobrenome', 'psAliases'].filter((id) => document.getElementById(id)),
      maisAberto: document.querySelector('.ps-mais').open, completo: document.getElementById('psCompleto').value, emailOculto: document.querySelector('.ps-email').hidden,
      convidar: !!document.querySelector('[data-ps-convidar]'), sug: [...document.querySelectorAll('.ps-chip-sug')].map((x) => x.textContent) }));
    ok(c.nome === 'Carlos' && !c.velhos.length, 'Nome "Carlos"; sem Apelido, Nome do meio, Sobrenome nem "Também chamado": ' + JSON.stringify(c.velhos));
    ok(c.maisAberto === false && c.completo === 'Carlos Pereira Exemplo', '"Mais detalhes" fechado, com o nome completo');
    ok(c.emailOculto && c.convidar, 'o e-mail fica atrás de "Convidar para o MoneyTRIO"');
    ok(c.sug.join('|') === '+ CARLOS P EXEMPLO', 'sugestão só dos lançamentos: "+ CARLOS P EXEMPLO" (os jeitos do nome completo já são reconhecidos sozinhos): ' + JSON.stringify(c.sug));
    await p.click('.ps-chip-sug >> text=CARLOS P EXEMPLO');
    await p.fill('#psBancoNovo', 'C PEREIRA EXEMPLO'); await p.press('#psBancoNovo', 'Enter');
    await p.fill('#psBancoNovo', 'APAGAR ESTE'); await p.press('#psBancoNovo', 'Enter');
    await p.click('[data-pschip-tirar="APAGAR ESTE"]');
    await p.click('[data-ps-convidar]');
    ok(await p.evaluate(() => !document.querySelector('.ps-email').hidden), '"Convidar para o MoneyTRIO" mostra o campo do e-mail');
    await p.click('#folhaSalvar'); await p.waitForTimeout(150);
    const s3 = await p.evaluate(() => { const x = Pessoas.porId('p1'); return { banco: x.banco, aliases: x.aliases, achou: (Pessoas.achar('C PEREIRA EXEMPLO') || {}).id }; });
    ok(JSON.stringify(s3.banco) === '["CARLOS P EXEMPLO","C PEREIRA EXEMPLO"]' && s3.achou === 'p1', 'salvo: os 2 nomes do extrato (o tirado não), e o extrato acha a pessoa: ' + JSON.stringify(s3.banco));
    ok(s3.aliases.indexOf('Zeca') >= 0, 'os nomes antigos continuam guardados (sem campo): ' + JSON.stringify(s3.aliases));

    console.log('5) o desenho: Família, Pessoas próximas e Empresas');
    await p.setViewportSize({ width: 390, height: 800 });
    await p.evaluate(() => { irPara('cfg-pessoas'); render(); });
    const t5 = await p.evaluate(() => ({ grupos: [...document.querySelectorAll('.ps-grupo')].map((g) => g.dataset.grupo + ':' + g.querySelector('h3').textContent + ':' + (g.querySelector('[data-acao="ps-novo"]') || {}).dataset.tipo),
      seletores: document.querySelectorAll('.ps-papel-sel, .ps-revise').length, papel: (document.querySelector('[data-ps="p1"] .t-sub') || {}).textContent || '' }));
    ok(t5.grupos.join('|') === 'casa:Família:casa|outra:Pessoas próximas:outra|empresa:Empresas e instituições:empresa', 'três partes, cada uma com o seu "+ Adicionar": ' + JSON.stringify(t5.grupos));
    ok(t5.seletores === 0 && /^Responsável/.test(t5.papel), 'sem seletor Responsável/Dependente aberto nem "Confirme"; o papel aparece como texto: ' + JSON.stringify(t5.papel));
    await p.click('.ps-grupo[data-grupo="outra"] [data-acao="ps-novo"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.getElementById('psTipo').value === 'outra' && !document.querySelector('.ps-so-outra').hidden && document.querySelector('.ps-regra').hidden), '"+ Adicionar" de Pessoas próximas já vem com o tipo e mostra "Quem é para você"');
    await p.fill('#psNome', 'Diarista Exemplo'); await p.click('input[name="psRelacao"][value="diarista"]');
    const rg = await p.evaluate(() => ({ vis: !document.querySelector('.ps-regra').hidden, txt: document.getElementById('psRegraTxt').textContent }));
    ok(rg.vis && /Pix para esta pessoa vira Habitação › Diarista/.test(rg.txt), 'diarista em 1 toque: "Pix para esta pessoa vira Habitação › Diarista": ' + JSON.stringify(rg.txt));
    await p.fill('#psBancoNovo', 'DIARISTA EXEMPLO SILVA'); await p.press('#psBancoNovo', 'Enter');
    await p.click('#folhaSalvar'); await p.waitForTimeout(150);
    await p.evaluate(() => { Pessoas.salvar({ tipo: 'outra', nome: 'Inquilina Exemplo', banco: ['INQUILINA EXEMPLO COSTA'], relacao: 'inquilino' }); Pessoas.salvar({ tipo: 'outra', nome: 'Sogra Exemplo', banco: ['SOGRA EXEMPLO LIMA'], relacao: 'sogra' }); });
    const r5 = await p.evaluate(() => {
      const a = Gasto.add({ id: 'gx1', data: '2026-11-20', valor: 180, grupo: 'OUTROS', sub: 'Sem categoria', desc: 'PIX ENVIADO DIARISTA EXEMPLO SILVA', contato: 'DIARISTA EXEMPLO SILVA', origem: 'robo' });
      const b = Gasto.add({ id: 'gx2', data: '2026-11-20', valor: 1500, grupo: 'RENDA', sub: 'Extrato bancário', desc: 'PIX RECEBIDO INQUILINA EXEMPLO COSTA', contato: 'INQUILINA EXEMPLO COSTA', origem: 'robo' });
      const c = Gasto.add({ id: 'gx3', data: '2026-11-20', valor: 300, grupo: 'RENDA', sub: 'Extrato bancário', desc: 'PIX RECEBIDO SOGRA EXEMPLO LIMA', contato: 'SOGRA EXEMPLO LIMA', origem: 'robo' });
      const d = Gasto.add({ id: 'gx4', data: '2026-11-21', valor: 90, grupo: 'LAZER', sub: 'Cinema', desc: 'PIX ENVIADO DIARISTA EXEMPLO SILVA', contato: 'DIARISTA EXEMPLO SILVA', origem: 'robo' });
      return [a, b, c, d].map((g) => g.grupo + '/' + g.sub); });
    ok(r5[0] === 'HABITACAO/Diarista' && r5[1] === 'RENDA/Aluguel recebido', 'Pix sem categoria: para a diarista vira Habitação › Diarista; da inquilina vira Renda › Aluguel recebido: ' + JSON.stringify(r5));
    ok(r5[2] === 'RENDA/Extrato bancário' && r5[3] === 'LAZER/Cinema', 'o que não tem regra (Pix que vem da sogra) e o que já tem categoria ficam como estão');
    ok(await p.evaluate(() => /Pix → Habitação › Diarista/.test(document.querySelector('[data-ps]') && [...document.querySelectorAll('.ps-grupo[data-grupo="outra"] .t-sub')].map((x) => x.textContent).join('|'))), 'a linha da diarista mostra "Diarista · … · Pix → Habitação › Diarista"');
    const vc = await p.evaluate(() => { Escopo.preparar(Store.estado); return Escopo.pessoasDela().sort().join(','); });
    ok(vc === 'p1,p2,p3', 'parte da casa: toda a Família (p1, p2, p3), sem marcar nada; nenhuma pessoa próxima: ' + vc);
    const q5 = await p.evaluate(() => { const s = Pessoas.porId(Pessoas.achar('Sogra Exemplo').id); Gasto.add({ id: 'gx5', data: '2026-11-22', valor: 10, grupo: 'PESSOAL', sub: 'Presente', desc: 'X', quem: 'Sogra Exempl', origem: 'manual' });
      irPara('cfg-pessoas'); render(); return [...document.querySelectorAll('.ps-q')].map((x) => x.innerText.replace(/\s+/g, ' ')).join('|'); });
    ok(/Sogra Exemplo \(sogra\)\?.*Sim, é Sogra Exemplo/.test(q5), 'nome solto parecido vira "é Sogra Exemplo (sogra)? [Sim, é Sogra Exemplo]": ' + JSON.stringify(q5));

    console.log('2b) no computador, um painel');
    await p.setViewportSize({ width: 1366, height: 900 }); await p.click('[data-ps="p2"] [data-acao="ps-editar"]'); await p.waitForTimeout(100);
    const d = await p.evaluate(() => { const r = document.querySelector('#folhaEditar .folha').getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.left), sw: document.documentElement.scrollWidth }; });
    ok(d.w <= 680 && d.x > 300 && d.sw <= 1366, 'no computador a folha é um painel no meio (' + d.w + ' px)');
    await p.click('#folhaCancelar');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU (exceção): ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
