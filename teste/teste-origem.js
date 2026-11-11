/* =====================================================================
   teste/teste-origem.js — 3.65: selos "A confirmar"/"A identificar", confirmar por ORIGEM (CNPJ → id_pessoa → descrição)
   com Desfazer, confiança em lançamento já existente, "Débito em conta", categoria renomeada (Streaming e mídias),
   assinatura que termina / já paga e a cobrança depois do fim, e a Conferência com o banco em três seções (fotos).
   Tudo fictício. Uso: node teste/teste-origem.js   (fotos em /tmp/origem-*.png e /tmp/banco-*.png)
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { pessoasV: 2 }, posicoes: [], recorrentes: [], gastos: [
  { id: 'old1', data: '2026-09-02', valor: 39.9, grupo: 'LAZER', sub: 'Locação de Vídeo/DVD/Midias', desc: 'STREAMING EXEMPLO', fluxo: 'saida' },
  { id: 'old2', data: '2026-09-03', valor: 59.9, grupo: 'LAZER', sub: 'CDs/DVDs/Jogos/Fitas/acessórios', desc: 'LOJA DE JOGOS', fluxo: 'saida' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 800 }]) {
    const W = vp.width; console.log('tela ' + W);
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e))); p.on('dialog', (d) => d.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Origem && window.Categorias);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });
    /* robô: 3 origens "A confirmar" (CNPJ, id_pessoa, descrição) + um "A identificar" + um já editado da mesma origem */
    await p.evaluate(() => {
      const C = MoneyNuvem._teste.Caixa, add = (l) => Gasto.add(C.converter(Object.assign({ tipo: 'despesa', data: '2026-10-10', valor: 20, confianca: 'palpite' }, l)));
      for (let i = 0; i < 4; i++) add({ id: 'cn' + i, descricao: 'FARMACIA NOME ' + i + ' LTDA', grupo: 'SAUDE', categoria: 'Farmácia', contraparte: { cnpj: '11222333000144', nome: 'FARMACIA EXEMPLO' } });
      for (let i = 0; i < 3; i++) add({ id: 'ip' + i, descricao: 'PIX ENVIADO ' + i, grupo: 'OUTROS', categoria: 'Outros', contraparte: { id_pessoa: 'abcdefabcdefabcdefabcdef', nome: 'FULANO TESTE', meio: 'PIX' }, forma: 'Debito' });
      for (let i = 0; i < 3; i++) add({ id: 'de' + i, descricao: 'RAIA EXEMPLO SA 0' + (i + 1) + '/04', grupo: 'SAUDE', categoria: 'Farmácia', forma: 'Debito' });
      add({ id: 'id1', descricao: 'COISA DESCONHECIDA', grupo: 'OUTROS', categoria: '', confianca: 'desconhecido' });
      const ed = add({ id: 'cn9', descricao: 'FARMACIA EDITADA LTDA', grupo: 'SAUDE', categoria: 'Farmácia', contraparte: { cnpj: '11222333000144' } }); ed.editadoPessoa = true; delete ed.confianca;
      Gasto.add(C.converter({ id: 'enc1', tipo: 'despesa', data: '2026-11-10', valor: 0.65, descricao: 'ENCARGOS', grupo: 'BANCARIOS', categoria: 'Outros (Bancários)', forma: 'Debito', confianca: 'palpite' }));
      Store.salvar(); bFiltro = { busca: '', grupos: [], subs: [], quem: [], formas: [], de: '', ate: '', fluxo: '', periodo: 'tudo', favoritos: false, revisar: false, irpf: false, aconfirmar: false, aidentificar: false }; irPara('b-lanc');
    });
    await p.waitForTimeout(300);
    const s1 = await p.evaluate(() => {
      const tr = document.querySelector('[data-bid="rb_cn0"]'), cat = tr && tr.children[1], sel = cat && cat.querySelector('.or-selo'), v = tr && tr.querySelector('td.num');
      const ok1 = !!sel && /A confirmar/.test(sel.textContent) && !!cat.querySelector('.or-ok');
      const r1 = sel ? sel.getBoundingClientRect() : null, rv = v ? v.getBoundingClientRect() : null;
      const ver = document.querySelector('[data-bid="rb_id1"] .or-selo.or-vermelho');
      const chips = [...document.querySelectorAll('.or-aviso [data-bmarca]')].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
      return { ok1, verm: !!ver, chips, semPalpite: !/palpite do robô/.test(document.getElementById('view-b-lanc').textContent), naoCobre: !r1 || !rv || r1.right <= rv.left + 1 || r1.bottom <= rv.top || r1.top >= rv.bottom,
        forma: Gasto.todos().find((g) => g.idRobo === 'ip0').forma + '|' + Gasto.todos().find((g) => g.idRobo === 'de0').forma };
    });
    ok(s1.ok1 && s1.verm && s1.semPalpite, W + ': selo amarelo "A confirmar" com ✓ e vermelho "A identificar" na coluna Categoria (o "palpite do robô" saiu)');
    ok(s1.naoCobre, W + ': o selo não cobre o valor');
    if (W === 1366) {
      ok(s1.chips.some((c) => /A confirmar 1[0-9]/.test(c)) && s1.chips.some((c) => /A identificar 1/.test(c)), 'filtros "A confirmar (N)" e "A identificar (N)": ' + s1.chips.join(' · '));
      ok(s1.forma === 'Pix|Débito em conta', '"Debito" do robô: Pix quando a contraparte diz PIX; senão "Débito em conta" (não cartão de débito)');
      await p.screenshot({ path: '/tmp/origem-1366.png' });
      /* B: confirmar um replica pela origem */
      const b1 = await p.evaluate(() => { document.querySelector('[data-bid="rb_cn0"] .or-ok').click(); return { st: ['cn1', 'cn2', 'cn3'].map((i) => Origem.status(Gasto.todos().find((g) => g.idRobo === i))), ed: Gasto.todos().find((g) => g.idRobo === 'cn9'), toast: [...document.querySelectorAll('.or-toast')].map((t) => t.textContent).join('') }; });
      ok(b1.st.every((x) => x === '') && /Aplicado também a 3 lançamento/.test(b1.toast) && b1.ed.editadoPessoa && !b1.ed.confirmadoEm, 'confirmar 1 pelo CNPJ confirma os outros 3 da mesma origem (aviso com Desfazer); o já editado não é tocado');
      /* corrigir pelo formulário (id_pessoa): muda grupo/categoria/para quem → os outros acompanham */
      await p.evaluate(() => { abrirLancamento(Gasto.todos().find((g) => g.idRobo === 'ip0').id); });
      await p.waitForTimeout(200);
      await p.selectOption('#glGrupo', 'PESSOAL'); await p.waitForTimeout(100);
      await p.evaluate(() => { const s = document.getElementById('glSub'); if (s.tagName === 'SELECT') { const o = document.createElement('option'); o.value = o.textContent = 'Presentes'; s.appendChild(o); } s.value = 'Presentes'; });
      await p.fill('#glParaQuem', 'Fulano');
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
      await p.click('#assetModal .btn.primary'); await p.waitForTimeout(300);
      const b2 = await p.evaluate(() => ['ip1', 'ip2'].map((i) => { const g = Gasto.todos().find((x) => x.idRobo === i); return [g.grupo, g.sub, g.paraQuem, Origem.status(g)].join(','); }));
      ok(b2.every((x) => x === 'PESSOAL,Presentes,Fulano,'), 'corrigir 1 pelo formulário (id_pessoa): os outros da mesma pessoa ganham grupo, categoria e "para quem" (' + b2[0] + ')');
      /* Desfazer volta tudo */
      const b3 = await p.evaluate(() => { document.querySelector('.or-toast [data-acao="or-desfazer"]').click(); return ['ip1', 'ip2'].map((i) => { const g = Gasto.todos().find((x) => x.idRobo === i); return [g.grupo, g.sub, Origem.status(g)].join(','); }); });
      ok(b3.every((x) => x === 'OUTROS,Outros,confirmar'), 'Desfazer volta os outros como estavam ("A confirmar")');
      /* 3.65.1: boleto do Itaú com a descrição genérica (o Itaú não manda quem recebeu): confirmar vale SÓ para ele */
      const b5 = await p.evaluate(() => {
        const C = MoneyNuvem._teste.Caixa, add = (l) => Gasto.add(C.converter(Object.assign({ tipo: 'despesa', data: '2026-11-05', confianca: 'palpite', forma: 'Debito', banco: 'Itaú' }, l)));
        ['bo0', 'bo1', 'bo2'].forEach((id, i) => add({ id, valor: 100 + i, descricao: 'Pagamento de boleto INT PAG TIT ULO ITAU', grupo: 'OUTROS', categoria: 'Boleto' }));
        ['px0', 'px1'].forEach((id, i) => add({ id, valor: 30 + i, descricao: 'PIX ENVIADO', grupo: 'OUTROS', categoria: 'Pix' }));
        const fila = [], antesNv = MoneyNuvem.espelho; MoneyNuvem.espelho = { enfileirar: async (t) => { fila.push(typeof t === 'string' ? t : JSON.stringify(t)); } };
        const g0 = Gasto.todos().find((g) => g.idRobo === 'bo0'), antes = Object.assign({}, g0);
        Gasto.atualizar(g0.id, { grupo: 'HABITACAO', sub: 'Condomínio', confirmadoEm: new Date().toISOString() });
        const novo = Gasto.todos().find((g) => g.id === g0.id); delete novo.confianca;
        Espelho.registrar(novo, antes, { confirmada: true });   /* o caminho do formulário: espelho → Origem.depoisDe */
        const p0 = Gasto.todos().find((g) => g.idRobo === 'px0'), antesP = Object.assign({}, p0);
        Gasto.atualizar(p0.id, { grupo: 'LAZER', sub: 'Restaurante', confirmadoEm: new Date().toISOString() });
        const n2 = Origem.depoisDe(Gasto.todos().find((g) => g.id === p0.id), antesP);
        MoneyNuvem.espelho = antesNv;
        const st = (i) => { const g = Gasto.todos().find((x) => x.idRobo === i); return [g.sub, Origem.status(g)].join(','); };
        return { outros: ['bo1', 'bo2'].map(st), px1: st('px1'), n2, gen: Origem.generica(novo), comCnpj: Origem.generica(Object.assign({}, novo, { contraparte: { cnpj: '11222333000144' } })),
          regra: fila.some((t) => /"regra"\s*:\s*\{/.test(t)), fila: fila.length, grupos: Origem.grupos().filter((x) => /PAG TIT/.test(x.rotulo)).length };
      });
      ok(b5.outros.every((x) => x === 'Boleto,confirmar') && b5.px1 === 'Pix,confirmar' && b5.n2 === 0, 'boleto genérico do Itaú: confirmar como "Condomínio" NÃO muda os outros boletos nem os Pix sem nome (' + b5.outros.join(' | ') + ')');
      ok(b5.gen && !b5.comCnpj, 'genérica só quando não há CNPJ nem id_pessoa (com CNPJ, a origem volta a valer)');
      ok(b5.fila >= 1 && !b5.regra, 'a planilha recebe o lançamento, mas sem "regra" (no robô também está bloqueado)');
      ok(b5.grupos === 2, 'na tela agrupada, cada boleto genérico ainda pendente fica sozinho (' + b5.grupos + ')');
      /* descrição: "RAIA EXEMPLO SA 01/04" e "… 02/04" são a mesma origem; tela agrupada */
      const b4 = await p.evaluate(() => { irPara('b-confirmar'); const linhas = [...document.querySelectorAll('.or-tbl tr')].map((t) => t.textContent.replace(/\s+/g, ' '));
        const raia = Origem.grupos().find((x) => /RAIA EXEMPLO SA/.test(x.rotulo)); const n = Origem.confirmarGrupo(raia.chave);
        return { linhas, n, ch: Origem.chaveDesc('RAIA DROGASIL SA 03/04'), resta: Gasto.todos().filter((g) => /RAIA/.test(g.desc) && Origem.status(g)).length }; });
      ok(b4.ch === 'RAIA DROGASIL SA' && b4.linhas.some((l) => /RAIA EXEMPLO SA\s*3 lançamento/.test(l)), 'tela "A confirmar" agrupada por origem (chave da descrição "RAIA DROGASIL SA 03/04" → "' + b4.ch + '")');
      ok(b4.n === 3 && b4.resta === 0, '"✓ Confirmar todos" confirma os 3 da mesma descrição');
      await p.screenshot({ path: '/tmp/origem-tela-1366.png' });
      /* C: confiança num já existente intocado × editado */
      const c = await p.evaluate(() => { const C = MoneyNuvem._teste.Caixa; const a = Gasto.add({ data: '2026-10-01', valor: 5, grupo: 'LAZER', sub: 'Bar', desc: 'BAR X', origem: 'robo', idRobo: 'x1' }), e = Gasto.add({ data: '2026-10-01', valor: 5, grupo: 'LAZER', sub: 'Bar', desc: 'BAR Y', origem: 'robo', idRobo: 'x2', editadoPessoa: true });
        return [C.marcarConfianca(a, { confianca: 'palpite' }), Origem.status(a), C.marcarConfianca(e, { confianca: 'palpite' }), Origem.status(e)].join(','); });
      ok(c === 'true,confirmar,false,', 'reenvio com confiança: o já existente intocado fica "A confirmar"; o editado pela pessoa, não');
      /* D: aviso de "nenhum cartão" só no crédito */
      const d = await p.evaluate(() => { abrirLancamento(Gasto.todos().find((g) => g.idRobo === 'enc1').id); const a = /não cadastrou nenhum cartão/.test(document.getElementById('assetModalBody').textContent);
        const s = document.getElementById('glForma'); s.value = 'credito'; s.dispatchEvent(new Event('change', { bubbles: true })); const b = /não cadastrou nenhum cartão/.test(document.getElementById('assetModalBody').textContent); fechar('assetModal'); return [a, b]; });
      ok(!d[0] && d[1], 'ENCARGOS (débito em conta) sem o aviso "nenhum cartão"; o aviso só aparece no Crédito');
      /* categoria renomeada */
      const cat = await p.evaluate(() => { const C = MoneyNuvem._teste.Caixa; const g = Gasto.add(C.converter({ id: 'st1', tipo: 'despesa', data: '2026-11-01', valor: 19.9, grupo: 'LAZER', categoria: 'Locação de Vídeo/DVD/Midias', descricao: 'STREAMING' }));
        return { olds: ['old1', 'old2'].map((i) => Gasto.todos().find((x) => x.id === i).sub), novo: g.sub, arv: Gasto.arvore().LAZER.filter((s) => /Locação|CDs/.test(s)).length }; });
      ok(cat.olds.every((x) => x === 'Streaming e mídias') && cat.novo === 'Streaming e mídias' && cat.arv === 0, 'Lazer · "Locação de Vídeo/DVD/Midias" e "CDs/DVDs…" viraram "Streaming e mídias" (migração única); o que chega com o nome velho entra com o novo');
      const ren = await p.evaluate(() => { const n = Categorias.renomear('SAUDE', 'Farmácia', 'Farmácia e higiene'); const g = Gasto.add({ data: '2026-11-02', valor: 1, grupo: 'SAUDE', sub: 'Farmácia', desc: 'X' }); return [n > 0, g.sub, !!document.querySelector('#catGrupo') || true]; });
      ok(ren[0] && ren[1] === 'Farmácia e higiene', '"Renomear categoria": propaga em tudo e o nome antigo vira apelido do novo');
      /* assinaturas que terminam */
      const as = await p.evaluate(() => {
        const r = Recorrente.add({ nome: 'Clube de Vídeo Exemplo', valor: 30, grupo: 'LAZER', sub: 'Streaming e mídias', regra: 'dia', dia: 10, desde: '2025-12-01' });
        Assinaturas.gravar(r.id, { plano: 'mensal', naoRenovar: true, fim: '2026-11-30' }); r.ate = '2026-11-30';
        const futuro = Recorrente.ocorrencias('2026-12-01', '2027-06-30').some((o) => o.r.id === r.id) ? 'tem' : (Recorrente.ocorrencias('2026-11-01', '2026-11-30').some((o) => o.r.id === r.id) ? false : 'nem-nov');
        const pp = Assinaturas.prepaga({ nome: 'Hub de IA Exemplo', pagoAte: '2026-12-05', sub: 'IA e software' });
        const v = Assinaturas.vencendo('2026-11-20').map((x) => x.r.nome + ':' + (x.termina ? 'termina' : 'renova'));
        const g = Gasto.add({ data: '2026-12-10', valor: 30, grupo: 'LAZER', sub: 'Streaming e mídias', desc: 'CLUBE DE VIDEO EXEMPLO' });
        const g2 = Gasto.add({ data: '2026-12-20', valor: 99, grupo: 'PESSOAL', sub: 'IA e software', desc: 'HUB DE IA EXEMPLO' });
        irPara('b-custos'); const txt = document.getElementById('view-b-custos').textContent;
        return { futuro, v, al: Assinaturas.alertas().length, txt: /Clube de Vídeo Exemplo cobrou de novo depois do fim que você marcou — cancelou mesmo\?/.test(txt) && /Hub de IA Exemplo cobrou de novo/.test(txt), pp: /paga até/.test(txt) };
      });
      ok(as.futuro === false, '"Não vou renovar" até 30/11: depois do fim, o compromisso não vale (sem vencimento, sem Futuro, sem atrasado)');
      ok(as.v.indexOf('Clube de Vídeo Exemplo:termina') >= 0 && as.v.indexOf('Hub de IA Exemplo:termina') >= 0 && as.pp, 'aviso "termina em …" um mês antes; a assinatura "já paga até" aparece sem cobrança mensal');
      ok(as.al === 2 && as.txt, 'cobrança depois do fim: "… cobrou de novo depois do fim que você marcou — cancelou mesmo?" (vale para as duas)');
    }
    /* conferência com o banco: 3 seções, duplicado resolvido, cartão com vencimento */
    const sb = await p.evaluate(() => {
      ST.saldos_banco = [];
      SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-x-2026-11-01', banco: 'Banco Alfa', conta: 'alfa', saldo: 3.7, data: '2026-11-01' });   /* o antigo (sem conta_id) */
      SaldoBanco.receber({ tipo: 'saldo', id: 's1', banco: 'Banco Alfa', conta: 'Conta corrente', conta_id: 'ca1', categoria_conta: 'conta', final_conta: '1234', saldo: 3.7, data: '2026-11-10' });
      SaldoBanco.receber({ tipo: 'saldo', id: 's2', banco: 'Banco Alfa', conta: 'Poupança', conta_id: 'ca2', categoria_conta: 'poupanca', final_conta: '5678', saldo: 0, data: '2026-11-10' });
      SaldoBanco.receber({ tipo: 'saldo', id: 's3', banco: 'Banco Alfa', conta: 'BLACK TESTE', conta_id: 'cc1', categoria_conta: 'cartao', final_conta: '6514', saldo: -22725.83, fatura_aberta: -22725.83, vence: '2026-11-25', fecha: '2026-11-18', limite: 50000, disponivel: 27274.17, data: '2026-11-10' });
      SaldoBanco.receber({ tipo: 'saldo', id: 's4', banco: 'Banco Beta', conta: 'VISA TESTE', conta_id: 'cc2', categoria_conta: 'cartao', final_conta: '9392', saldo: -830, data: '2026-11-10' });
      SaldoBanco.receber({ tipo: 'saldo', id: 's5', banco: 'Banco Gama', conta: 'Conta Investimento', conta_id: 'ci1', categoria_conta: 'conta', saldo: 0, data: '2026-11-10' });
      SaldoBanco.receberInvest({ tipo: 'investimento', id: 'i1', banco: 'Banco Gama', conta: 'CDB EXEMPLO 2028', conta_id: 'iv1', classe: 'renda fixa', saldo: 15000, data: '2026-11-10', vencimento: '2028-01-15' });
      Store.salvar(); irPara('b-painel');
      const c = document.querySelector('.sb-card'), t = c.textContent;
      return { secs: [...c.querySelectorAll('.sb-sec span')].map((x) => x.textContent), alfa: (t.match(/Banco Alfa · Conta corrente ···1234/g) || []).length, poup: /Poupança ···5678/.test(t),
        fat: /Fatura aberta R\$\s?22\.725,83/.test(t) && /vence 25\/11/.test(t) && /fecha 18\/11/.test(t) && /limite disponível R\$\s?27\.274,17/.test(t), neg: /-22\.725/.test(t), pill: !!c.querySelector('.sb-pill'),
        semVence: /cadastre o dia no cartão/.test(t), inv: /CDB EXEMPLO 2028/.test(t) && /Ver no InvestifyONE/.test(t) && /Conta Investimento/.test(t.split('Investimentos')[1] || ''), aviso: /o Banco Alfa não compartilhou investimentos pelo Open Finance/.test(t),
        zeradas: !!c.querySelector('.sb-zeradas'), n: ST.saldos_banco.length };
    });
    ok(sb.secs.join('|') === 'Conta corrente e poupança|Cartões de crédito|Investimentos', W + ': três seções com título e total (' + sb.secs.join(' · ') + ')');
    ok(sb.alfa === 1 && sb.poup && sb.n === 6, W + ': o duplicado sumiu: "Banco Alfa · Conta corrente ···1234" e "Poupança ···5678" (o registro antigo sem conta_id saiu)');
    ok(sb.fat && !sb.neg && sb.pill && sb.semVence, W + ': cartão: pílula, fatura aberta POSITIVA, vence e fecha dd/mm, limite disponível; sem vencimento: "cadastre o dia no cartão"');
    ok(sb.inv && sb.aviso && sb.zeradas, W + ': investimentos por banco com "Ver no InvestifyONE" (a conta-investimento vai para lá); aviso do banco que não compartilhou; contas zeradas recolhidas');
    const card = await p.$('.sb-card'); await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: '/tmp/banco-' + W + '.png' });
    const larg = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(larg <= W + 1, W + ': sem rolagem para o lado');
    ok(erros.length === 0, W + ': sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
