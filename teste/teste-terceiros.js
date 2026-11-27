/* =====================================================================
   teste/teste-terceiros.js — 3.105: 📋 contas de outras pessoas que chegam no e-mail (modulos/terceiros.js). Dados FICTÍCIOS (nenhum nome real).
   Confere: "Não é meu" no comprovante; os marcadores saem do próprio comprovante (titular e código do cliente) e a pessoa confirma;
   "ignorar" tira do 📥 (e o que chegar depois também); a lista inteira vai para o robô pelo espelho (o mesmo canal das correções);
   Configurações: ver, trocar para "processar" (o comprovante volta com "para quem", e o lançamento ligado também), apagar; nomes só no
   aparelho; interruptor do RootifyONE; EN e ES.
   Uso: node teste/teste-terceiros.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [],
  gastos: [{ id: 'rb_pg', idRobo: 'pg', data: '2026-11-20', valor: 81.5, desc: 'PIX TELEFONIA EXEMPLO', descRobo: 'PIX TELEFONIA EXEMPLO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Telefone', origem: 'robo' }] };
const C = (id, extra) => Object.assign({ id: 'evid-' + id, tipo: 'comprovante', subtipo: 'fatura', loja: 'Telefonia Exemplo', remetente: 'faturas@telefonia.exemplo', assunto: 'Sua fatura chegou', valor: 79.9, vencimento: '2026-11-25', data: '2026-11-15',
  descricao: 'Titular: Tia Exemplo Ficticia, Código do cliente: 123456789. Valor a pagar R$ 79,90.' }, extra || {});

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Terceiros !== 'undefined' && typeof Comprovantes !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); Comprovantes._hoje = '2026-11-24';
      /* o espelho (nuvem.js) simulado: guarda o que iria, cifrado, para o robô */
      window.MoneyNuvem = window.MoneyNuvem || {}; window.__esp = []; MoneyNuvem.espelho = { enfileirar: async (o) => { window.__esp.push(JSON.parse(JSON.stringify(o))); return true; }, enviar: async () => 0 }; });
    const cp = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Comprovantes.lista().find((x) => x.id === 'evid-' + i) || null)), id);
    const inbox = () => p.evaluate(() => (inboxGrupos().find((x) => x.id === 'comprovantes') || {}).html || '');

    console.log('1) "Não é meu" no comprovante');
    await p.evaluate((c) => Comprovantes.receber(c), C('a'));
    ok(/Não é meu \(conta de outra pessoa\)/.test(await inbox()), 'o comprovante no 📥 tem "Não é meu (conta de outra pessoa)"');
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'tInb'; d.innerHTML = '<ul>' + ((inboxGrupos().find((x) => x.id === 'comprovantes') || {}).html || '') + '</ul>'; document.body.appendChild(d); });
    await p.click('#tInb [data-acao="tc-nao-meu"]'); await p.waitForTimeout(80);
    const f = await p.evaluate(() => ({ m: [...document.querySelectorAll('#tcMarc input')].map((i) => i.value + (i.checked ? '*' : '')), t: document.querySelector('.tc-form').textContent }));
    ok(f.m.join('|') === 'Tia Exemplo Ficticia*|123456789*', 'os marcadores saem do comprovante e vêm marcados: o titular e o código do cliente ' + f.m.join('|'));
    ok(/Os nomes ficam só no seu aparelho e no pacote cifrado para o robô/.test(f.t), 'o aviso de privacidade no próprio formulário');
    await p.fill('#tcNome', 'Tia Exemplo');
    await p.click('[data-acao="tc-salvar"]'); await p.waitForTimeout(100);
    ok((await cp('a')).estado === 'dispensado' && !/evid-a/.test(await inbox()), '❌ Ignorar: o comprovante sai do 📥 (dispensado)');
    const e1 = await p.evaluate(() => window.__esp.slice(-1)[0]);
    ok(e1 && e1.acao === 'terceiros' && e1.id === 'terceiros' && JSON.stringify(e1.lista) === JSON.stringify([{ nome: 'Tia Exemplo', marcadores: ['Tia Exemplo Ficticia', '123456789'], acao: 'ignorar' }]), 'para o robô, pelo espelho: {"acao":"terceiros","lista":[{nome, marcadores, acao: "ignorar"}]} ' + JSON.stringify(e1 && e1.lista));

    console.log('2) o que chega depois');
    await p.evaluate((c) => Comprovantes.receber(c), C('b', { data: '2026-12-15', vencimento: '2026-12-25', descricao: 'Fatura de dezembro. Cód. cliente: 123456789' }));
    ok((await cp('b')).estado === 'dispensado' && !/evid-b/.test(await inbox()), 'a fatura do mês seguinte (o mesmo código do cliente) é ignorada sozinha');
    await p.evaluate((c) => Comprovantes.receber(c), C('c', { loja: 'Outra Empresa Exemplo', descricao: 'Titular: Pessoa Da Casa Exemplo. Cliente 555', valor: 40 }));
    ok((await cp('c')).estado === 'novo', 'a conta de outra pessoa (outro titular, outro código) não é afetada');

    console.log('3) Configurações: ver, trocar, apagar');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); const c = document.querySelector('.tc-cfg').closest('.cfg-acc'); if (c) c.classList.add('aberta'); });
    const cfg = await p.evaluate(() => document.querySelector('.tc-cfg').textContent);
    ok(/Contas de outras pessoas que chegam no meu e-mail/.test(cfg) && /Tia Exemplo · ❌ ignorar · Tia Exemplo Ficticia, 123456789/.test(cfg), 'a lista em Configurações: "Tia Exemplo · ❌ ignorar · Tia Exemplo Ficticia, 123456789"');
    await p.evaluate(() => { const c = Comprovantes.lista().find((x) => x.id === 'evid-a'); c.pagoId = 'rb_pg'; });
    await p.click('.tc-cfg [data-acao="tc-trocar"]'); await p.waitForTimeout(100);
    const tr = await p.evaluate(() => ({ a: Comprovantes.lista().find((x) => x.id === 'evid-a'), g: ST.gastos.find((x) => x.id === 'rb_pg'), esp: window.__esp.slice(-1)[0] }));
    ok(tr.a.estado === 'novo' && tr.a.paraQuem === 'Tia Exemplo' && tr.g.paraQuem === 'Tia Exemplo', '👤 Processar: o comprovante volta (com "para quem" = Tia Exemplo) e o lançamento ligado (o Pix) também ganha o "para quem"');
    ok(tr.esp.lista[0].acao === 'processar' && tr.esp.lista[0].para_quem === 'Tia Exemplo', 'o robô recebe a lista nova (processar, para_quem)');
    ok(/👤 para Tia Exemplo/.test(await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = (inboxGrupos().find((x) => x.id === 'comprovantes') || {}).html || ''; return d.textContent; })), 'no 📥, o comprovante mostra "👤 para Tia Exemplo"');
    await p.evaluate(() => { const c = document.querySelector('.tc-cfg').closest('.cfg-acc'); if (c) c.classList.add('aberta'); });
    await p.click('.tc-cfg [data-acao="tc-tirar"]'); await p.waitForTimeout(100);
    const ap = await p.evaluate(() => ({ n: Terceiros.lista().length, b: Comprovantes.lista().find((x) => x.id === 'evid-b').estado, esp: window.__esp.slice(-1)[0] }));
    ok(ap.n === 0 && ap.b === 'novo' && ap.esp.lista.length === 0, 'Apagar: a lista fica vazia, o comprovante ignorado volta, e o robô recebe a lista vazia');

    console.log('4) privacidade, interruptor, idiomas');
    await p.evaluate(() => Terceiros.salvar({ nome: 'Tia Exemplo', marcadores: ['123456789'], acao: 'ignorar' }));
    const pv = await p.evaluate(() => ({ ls: Object.keys(localStorage).filter((k) => !/investifyme\.dados/.test(k)).map((k) => localStorage.getItem(k)).join(' '), rod: document.querySelector('.footer-legal').textContent }));
    ok(!/Tia Exemplo/.test(pv.ls) && /Os nomes de terceiros que você marca como "conta de outra pessoa"[\s\S]*ficam só no seu aparelho e no pacote cifrado para o robô/.test(pv.rod), 'o nome fica só nos dados da família (fora de outras chaves do aparelho); a política de privacidade do rodapé ganhou a linha');
    ok(await p.evaluate(() => { const o = window.SolverRecursos; window.SolverRecursos = { ligado: (id, d) => id === 'terceiros' ? false : d, valor: (k, d) => d, aoMudar: () => {} }; irPara('config'); cfgSecao = 'todos'; render(); const r = !document.querySelector('.tc-cfg') && Terceiros.botao(Comprovantes.lista()[0]) === ''; window.SolverRecursos = o; return r; }), 'com o interruptor "terceiros" desligado no RootifyONE, a lista e o botão somem');
    for (const [l, rx] of [['en', /Other people’s bills that arrive in my e-mail/], ['es', /Facturas de otras personas que llegan a mi correo/]]) {
      await p.evaluate((x) => { I18n.atual = x; irPara('config'); cfgSecao = 'todos'; render(); }, l);
      ok(rx.test(await p.evaluate(() => (document.querySelector('.tc-cfg') || {}).textContent || '')), l.toUpperCase() + ': a seção da lista');
    }
    /* 3.126: o marcador composto "A + B" (as duas partes precisam aparecer) e a dica na tela */
    const cmp = await p.evaluate(() => { I18n.atual = 'pt'; const it = Terceiros.salvar({ nome: 'Casa Ficticia da Tia', marcadores: ['LUZ FICTICIA + RUA EXEMPLO'], acao: 'ignorar' });
      const a = Terceiros.casa({ loja: 'LUZ FICTICIA', descricao: 'Unidade na RUA EXEMPLO 10' }), b0 = Terceiros.casa({ loja: 'LUZ FICTICIA', descricao: 'Unidade na OUTRA RUA 5' });
      Terceiros.tirar(it.id); return { a: a && a.nome, b: b0 && b0.nome }; });
    ok(cmp.a === 'Casa Ficticia da Tia' && !cmp.b, '"LUZ FICTICIA + RUA EXEMPLO" só reconhece o e-mail que tem as duas partes');
    const dica = await p.evaluate(() => { const it = Terceiros.salvar({ nome: 'Dica Ficticia', marcadores: ['MARCADOR FICTICIO'], acao: 'ignorar' }); document.body.insertAdjacentHTML('beforeend', '<button id="zzTc" data-acao="tc-editar" data-id="' + it.id + '">x</button>'); document.getElementById('zzTc').click();
      const t = (document.querySelector('#genBody .tc-composto') || {}).textContent || ''; Terceiros.tirar(it.id); fechar('genModal'); return t; });
    ok(/junte duas palavras com "\+"/.test(dica) && /FORNECEDOR \+ ENDEREÇO/.test(dica), 'o formulário explica o marcador composto: ' + dica.slice(0, 80));
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
