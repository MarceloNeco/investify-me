/* =====================================================================
   teste/teste-pistas-pdf.js — 3.141: 🔑 Dados para abrir PDFs com senha (modulos/pistas-pdf.js). Dados FICTÍCIOS: o CPF 111.444.777-35 e o
   CNPJ 11.222.333/0001-81 são os exemplos de documentação (dígitos certos, de ninguém da família); CEP e nascimento inventados.
   Confere: o pacote para o robô no formato exato (acao 'pistas', id 'pistas-<timestamp>', adicionar/apagar por id); o app guarda só
   {id, rotulo, tipo, final2} (o número inteiro não fica em lugar nenhum do aparelho); a lista mostra o número mascarado; a validação
   (dígito do CPF/CNPJ, CEP 8 dígitos, nascimento DD/MM/AAAA); Apagar com confirmação; sem a nuvem não cadastra; só quem vê tudo
   (quem vê "Só a casa" não vê o cartão nem cadastra); interruptor do RootifyONE; o lugar no mapa do AssistONE; EN e ES; 390 px.
   Uso: node teste/teste-pistas-pdf.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [], gastos: [] };

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
    let dialogo = 'aceita'; p.on('dialog', (d) => { p.ultimoDialogo = d.message(); dialogo === 'aceita' ? d.accept() : d.dismiss(); });
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PistasPdf !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget');
      /* o espelho (nuvem.js) simulado: guarda o que iria, cifrado, para o robô */
      window.MoneyNuvem = window.MoneyNuvem || {}; window.__esp = []; window.__nuvem = true;
      MoneyNuvem.espelho = { enfileirar: async (o) => { if (!window.__nuvem) return false; window.__esp.push(JSON.parse(JSON.stringify(o))); return true; }, enviar: async () => 0 }; });
    /* a sanfona das Configurações dobra os cartões logo depois do render: espera ela e abre o cartão */
    const cfg = async () => { await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); });
      await p.waitForFunction(() => { const c = document.querySelector('.pp-cfg'); return !!c && c.classList.contains('cfg-acc'); });
      await p.evaluate(() => document.querySelector('.pp-cfg').classList.add('aberta')); };
    const novo = async (rot, tipo, valor) => { await cfg(); await p.click('.pp-cfg [data-acao="pp-novo"]'); await p.fill('#ppRotulo', rot); await p.selectOption('#ppTipo', tipo); await p.fill('#ppValor', valor);
      const n = await p.evaluate(() => window.__esp.length); await p.click('[data-acao="pp-salvar"]');
      await p.waitForFunction((k) => window.__esp.length > k || document.querySelector('#toasts .toast'), n); await p.waitForTimeout(50); };

    console.log('1) o cartão em Configurações');
    await cfg();
    const c0 = await p.evaluate(() => { const c = document.querySelector('.pp-cfg'); return c ? { t: c.textContent, rec: c.dataset.recurso, aj: c.dataset.ajuda, perto: !!(document.querySelector('.tc-cfg')) } : null; });
    ok(c0 && /🔑 Dados para abrir PDFs com senha/.test(c0.t) && /Nenhum ainda/.test(c0.t), 'o cartão "🔑 Dados para abrir PDFs com senha" aparece, vazio');
    ok(c0 && /Muitas contas chegam em PDF com senha feita de pedaços do CPF, CNPJ ou CEP\. Cadastre uma vez aqui; o robô da família usa para abrir\. Fica cifrado, só o robô abre; nem o app mostra de novo o número inteiro\./.test(c0.t), 'o ⓘ com o texto pedido');
    ok(c0 && c0.rec === 'pistas-pdf' && c0.aj === 'pistas-pdf', 'data-recurso="pistas-pdf" e data-ajuda="pistas-pdf"');
    ok(await p.evaluate(() => { const a = document.querySelector('.tc-cfg'), b = document.querySelector('.pp-cfg'); return !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }), 'fica logo depois de "Contas de outras pessoas que chegam no meu e-mail"');

    console.log('2) adicionar: o pacote e o que fica no app');
    await novo('Empresa Exemplo', 'cnpj', '11.222.333/0001-81');
    const e1 = await p.evaluate(() => window.__esp.slice(-1)[0]);
    const chaves = e1 ? Object.keys(e1).join(',') : '';
    ok(chaves === 'v,acao,id,em,quem_editou,versao_app,adicionar,apagar' && e1.v === 1 && e1.acao === 'pistas' && /^pistas-\d{13}$/.test(e1.id) && e1.quem_editou === 'app' && e1.versao_app === await p.evaluate(() => String(VERSAO)) && !isNaN(Date.parse(e1.em)),
      'o pacote: {v:1, acao:"pistas", id:"pistas-<timestamp>", em, quem_editou:"app", versao_app, adicionar, apagar} ' + chaves);
    const it1 = await p.evaluate(() => JSON.parse(JSON.stringify(PistasPdf.lista()[0])));
    ok(e1 && e1.apagar.length === 0 && e1.adicionar.length === 1 && JSON.stringify(Object.keys(e1.adicionar[0])) === '["id","rotulo","tipo","valor"]' && e1.adicionar[0].id === it1.id && e1.adicionar[0].rotulo === 'Empresa Exemplo' && e1.adicionar[0].tipo === 'cnpj' && e1.adicionar[0].valor === '11.222.333/0001-81',
      'adicionar: [{id, rotulo, tipo:"cnpj", valor}] com o mesmo id da lista do app');
    ok(JSON.stringify(Object.keys(it1).sort()) === '["criadoEm","final2","id","rotulo","tipo"]' && it1.final2 === '81', 'o app guarda só {id, rotulo, tipo, final2} (final2 = "81")');
    const vaza = await p.evaluate(() => { Store.salvar(); const tudo = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join(' ') + JSON.stringify(ST) + document.body.innerHTML; return /11222333|11\.222\.333|0001-81|000181/.test(tudo); });
    ok(!vaza, 'o número inteiro não fica no aparelho (dados salvos, outras chaves nem na tela)');
    await cfg();
    const l1 = await p.evaluate(() => document.querySelector('.pp-lista').textContent);
    ok(/Empresa Exemplo · CNPJ ••\.•••\.•••\/••••-81/.test(l1), 'a lista: "Empresa Exemplo · CNPJ ••.•••.•••/••••-81" ' + l1.trim());
    await novo('Pessoa Exemplo', 'cpf', '11144477735');
    await novo('CEP Exemplo', 'cep', '01001-000');
    await novo('Nascimento Exemplo', 'nasc', '15/03/1980');
    const ms = await p.evaluate(() => PistasPdf.lista().map((x) => PistasPdf.mascara(x)));
    ok(ms.join(' | ') === '••.•••.•••/••••-81 | •••.•••.•••-35 | •••••-•00 | ••/••/••80', 'as máscaras de CPF, CEP e nascimento: ' + ms.join(' | '));
    ok(await p.evaluate(() => window.__esp.length === 4 && window.__esp.every((e) => e.adicionar.length === 1) && new Set(window.__esp.map((e) => e.id)).size === 4), 'um pacote por cadastro, cada um com o seu id (a fila guarda um por id)');

    console.log('3) validação');
    const v = await p.evaluate(() => [['cpf', '111.444.777-35'], ['cpf', '111.444.777-36'], ['cpf', '111.111.111-11'], ['cnpj', '11.222.333/0001-82'], ['cnpj', '11222333000181'], ['cep', '1234567'], ['cep', '12345-678'], ['nasc', '31/02/1980'], ['nasc', '15/03/1980'], ['nasc', '01/01/2999'], ['nasc', '1980-03-15'], ['rg', '123']].map((x) => x[0] + ':' + x[1] + '=' + PistasPdf.valido(x[0], x[1])));
    ok(v.join(' ') === 'cpf:111.444.777-35=true cpf:111.444.777-36=false cpf:111.111.111-11=false cnpj:11.222.333/0001-82=false cnpj:11222333000181=true cep:1234567=false cep:12345-678=true nasc:31/02/1980=false nasc:15/03/1980=true nasc:01/01/2999=false nasc:1980-03-15=false rg:123=false', 'dígito do CPF/CNPJ, CEP com 8, nascimento que existe e no passado: ' + v.join(' '));
    await cfg();
    const n0 = await p.evaluate(() => window.__esp.length);
    await novo('Errado Exemplo', 'cpf', '111.444.777-36');
    const er = await p.evaluate(() => ({ t: (document.querySelector('#toasts') || {}).textContent || '', n: window.__esp.length, l: PistasPdf.lista().length, aberto: !document.getElementById('genModal').classList.contains('hidden') }));
    ok(er.n === n0 && er.l === 4 && er.aberto && /Esse número não confere/.test(er.t), 'número com dígito errado: avisa, nada vai ao robô, a janela continua aberta');
    await p.evaluate(() => fechar('genModal'));

    console.log('4) apagar (com confirmação)');
    await cfg();
    dialogo = 'recusa'; await p.click('.pp-lista li:first-child [data-acao="pp-apagar"]'); await p.waitForTimeout(80);
    ok(/Apagar "Empresa Exemplo"\? O robô deixa de usar esse dado\./.test(p.ultimoDialogo || '') && await p.evaluate(() => PistasPdf.lista().length === 4 && window.__esp.length === 4), 'pergunta antes; "Cancelar" não apaga nem manda nada');
    dialogo = 'aceita'; await p.click('.pp-lista li:first-child [data-acao="pp-apagar"]'); await p.waitForFunction(() => window.__esp.length === 5);
    const ap = await p.evaluate(() => ({ e: window.__esp.slice(-1)[0], l: PistasPdf.lista().map((x) => x.rotulo) }));
    ok(ap.e.acao === 'pistas' && ap.e.adicionar.length === 0 && ap.e.apagar.length === 1 && ap.e.apagar[0] === it1.id && ap.l.indexOf('Empresa Exemplo') < 0, 'confirmado: apagar:[id] vai ao robô e sai da lista');

    console.log('5) sem nuvem, só quem vê tudo, interruptor');
    await p.evaluate(() => { window.__nuvem = false; });
    const sn = await p.evaluate(async () => { const r = await PistasPdf.adicionar({ rotulo: 'Sem Nuvem', tipo: 'cep', valor: '01001-000' }); return { r: r, l: PistasPdf.lista().length }; });
    ok(sn.r.erro === 'nuvem' && sn.l === 3, 'sem a nuvem da família (o espelho não aceita), não cadastra: o número não teria como chegar ao robô');
    await p.evaluate(() => { window.__nuvem = true; });
    const casa = await p.evaluate(async () => { const o = Escopo.soCasa; Escopo.soCasa = () => true; irPara('config'); cfgSecao = 'todos'; render();
      const r = { card: !!document.querySelector('.pp-cfg'), add: (await PistasPdf.adicionar({ rotulo: 'Casa', tipo: 'cep', valor: '01001-000' })).erro, del: await PistasPdf.apagar(PistasPdf.lista()[0].id), ped: Escopo.de('pistas_pdf', PistasPdf.lista()[0]) };
      Escopo.soCasa = o; return r; });
    ok(!casa.card && casa.add === 'sem-acesso' && casa.del === false, 'quem vê "Só a casa" não vê o cartão, não adiciona nem apaga');
    ok(casa.ped === 'reservado', 'a lista (coleção pistas_pdf) é reservada: nem chega ao aparelho de quem vê só a casa');
    ok(await p.evaluate(() => { const o = window.SolverRecursos; window.SolverRecursos = { ligado: (id, d) => id === 'pistas-pdf' ? false : d, valor: (k, d) => d, aoMudar: () => {} }; irPara('config'); cfgSecao = 'todos'; render(); const r = !document.querySelector('.pp-cfg'); window.SolverRecursos = o; return r; }), 'com o interruptor "pistas-pdf" desligado no RootifyONE, o cartão some');
    const rec = JSON.parse(fs.readFileSync(path.join(RAIZ, 'recursos-do-app.json'), 'utf8')).recursos.find((x) => x.id === 'pistas-pdf');
    const lug = JSON.parse(fs.readFileSync(path.join(RAIZ, 'assistone-mapa.json'), 'utf8')).lugares.find((x) => x.id === 'pistas-pdf');
    ok(!!rec && !!lug && lug.tela === 'config' && lug.secao === 'todos' && lug.nome.es, 'recursos-do-app.json tem "pistas-pdf" e o mapa do AssistONE tem o lugar (Configurações)');

    console.log('6) idiomas e celular');
    for (const [l, rx] of [['en', /Details to open password-protected PDFs/], ['es', /Datos para abrir PDF con contraseña/]]) {
      await p.evaluate((x) => { I18n.atual = x; irPara('config'); cfgSecao = 'todos'; render(); }, l);
      ok(rx.test(await p.evaluate(() => document.querySelector('.pp-cfg').textContent)), l.toUpperCase() + ': o cartão traduzido');
    }
    await p.evaluate(() => { I18n.atual = 'pt'; });
    await p.setViewportSize({ width: 390, height: 800 }); await cfg();
    await p.click('.pp-cfg [data-acao="pp-novo"]'); await p.waitForTimeout(80);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391 && !!document.querySelector('#ppValor')), '390 px: o cartão e a janela sem rolagem para o lado');
    await p.screenshot({ path: path.join(require('os').tmpdir(), 'pistas-390.png') });
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU: ' + (e && e.stack || e)); }
  finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
