/* =====================================================================
   teste/teste-google-drive.js — 3.103: a foto do serviço do carro no Google Drive (modulos/google-drive.js = SolverGoogle,
   modulos/carro-drive.js = a parte do app). Dados FICTÍCIOS.
   O GOOGLE É SIMULADO: os scripts accounts.google.com/gsi/client e apis.google.com/js/api.js e a API do Drive (www.googleapis.com) são
   respondidos por este teste; nada sai para a internet.
   Confere: sem a configuração da plataforma nada aparece (nem botão, nem mensagem técnica); a tela escondida do dono (#dono-google,
   só no aparelho) e o master do RootifyONE (solverone-dados/servicos/moneytrio.json); nada do Google carrega antes do toque;
   "📁 Conectar meu Google Drive" (drive.file, token só na memória); a pasta padrão "MoneyTRIO / Carro / <apelido> / AAAA-MM-DD OFICINA"
   (criada uma vez, reaproveitada); "usar uma pasta que já tenho" (Picker); o aviso na 1ª vez; sem internet, a fila; o interruptor
   do RootifyONE; o evento dgo:google.
   Uso: node teste/teste-google-drive.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  veiculos: [{ id: 'vc1', apelido: 'Argo Ficticio', ativo: true, criadoEm: '2026-01-01' }],
  compras_parceladas: [{ id: 'cp1', total: 2360, n: 5, vp: 472, data: '2026-11-12', hora: '', loja: 'OFICINA EXEMPLO', final: '', cartaoId: 'c1', grupo: 'VEICULO', sub: 'Funilaria e pintura', veiculoId: 'vc1', docId: '', desc: 'OFICINA EXEMPLO (OS 4321)', estado: 'ligada', gastoIds: ['rb_p1'], criadoEm: '2026-11-12' }],
  cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'visa', fim: '1111', vence: 10, fecha: 3 }],
  gastos: [{ id: 'rb_p1', data: '2026-11-14', valor: 472, desc: 'OFICINA EXEMPLO (OS 4321) 01/05', descRobo: 'OFICINA EXEMPLO 01/05', fluxo: 'saida', grupo: 'VEICULO', sub: 'Funilaria e pintura', veiculoId: 'vc1', compraId: 'cp1', cartaoId: 'c1', origem: 'robo' },
    { id: 'rb_l1', data: '2026-11-20', valor: 90, desc: 'LAVA RAPIDO FICTICIO', descRobo: 'LAVA RAPIDO FICTICIO', fluxo: 'saida', grupo: 'VEICULO', sub: 'Lavagem', veiculoId: 'vc1', cartaoId: 'c1', origem: 'robo' }] };
const CFG = { clienteId: '123456-teste.apps.googleusercontent.com', chavePicker: 'AIza' + 'Simulada0123456789abcdefghijklmnop', projeto: '123456789012' };
const GSI = `window.google = window.google || {}; google.accounts = { oauth2: {
  initTokenClient: function (o) { window.__tc = o; return { requestAccessToken: function () { window.__pedidos = (window.__pedidos || 0) + 1; setTimeout(function () { o.callback({ access_token: 'tok-simulado', expires_in: 3600 }); }, 0); } }; },
  revoke: function (t, cb) { window.__revogado = t; if (cb) cb(); } } };`;
const GAPI = `window.gapi = { load: function (n, o) { o.callback(); } }; window.google = window.google || {};
  function DocsView(v) { this.v = v; } DocsView.prototype.setSelectFolderEnabled = function (x) { this.pasta = x; return this; }; DocsView.prototype.setMimeTypes = function (m) { this.mime = m; return this; };
  function PickerBuilder() { this.o = {}; } ['addView', 'setOAuthToken', 'setDeveloperKey', 'setAppId', 'setTitle', 'setCallback'].forEach(function (k) { PickerBuilder.prototype[k] = function (x) { this.o[k] = x; return this; }; });
  PickerBuilder.prototype.build = function () { var o = this.o; window.__picker = { token: o.setOAuthToken, chave: o.setDeveloperKey, app: o.setAppId, pasta: o.addView && o.addView.pasta, mime: o.addView && o.addView.mime };
    return { setVisible: function () { setTimeout(function () { o.setCallback({ action: 'picked', docs: [{ id: 'raiz123', name: 'RENEGADE' }] }); }, 0); } }; };
  google.picker = { DocsView: DocsView, PickerBuilder: PickerBuilder, ViewId: { FOLDERS: 'folders' }, Action: { PICKED: 'picked', CANCEL: 'cancel' } };`;

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch(), google = [], drive = [];
  let pastas = [], nArq = 0, master = null;
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', async (r) => {
      const req = r.request(), u = req.url();
      if (u.startsWith(BASE + '/solverone-dados/servicos/moneytrio.json')) return master ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(master) }) : r.fulfill({ status: 404, body: '' });
      if (u.startsWith(BASE)) return r.continue();
      if (u.startsWith('https://accounts.google.com/gsi/client')) { google.push('gsi'); return r.fulfill({ contentType: 'text/javascript', body: GSI }); }
      if (u.startsWith('https://apis.google.com/js/api.js')) { google.push('gapi'); return r.fulfill({ contentType: 'text/javascript', body: GAPI }); }
      if (u.startsWith('https://www.googleapis.com/')) {
        const h = req.headers(), d = { m: req.method(), u, auth: h.authorization || '', corpo: req.postData() || '' }; drive.push(d);
        if (d.auth !== 'Bearer tok-simulado') return r.fulfill({ status: 401, body: '{}' });
        if (/upload\/drive\/v3\/files/.test(u)) { const id = 'arq' + (++nArq); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ id, webViewLink: 'https://drive.google.com/file/d/' + id + '/view' }) }); }
        if (d.m === 'GET') { const q = decodeURIComponent(u.split('q=')[1] || ''); const f = pastas.filter((x) => q.indexOf("name = '" + x.name + "'") >= 0 && q.indexOf("'" + x.pai + "' in parents") >= 0); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ files: f }) }); }
        const meta = JSON.parse(d.corpo || '{}'), id = 'pasta' + (pastas.length + 1); pastas.push({ id, name: meta.name, pai: (meta.parents || [])[0] });
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ id }) });
      }
      return r.abort();
    });
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    let dialogos = 0; p.on('dialog', (d) => { dialogos++; d.accept(); });
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof SolverGoogle !== 'undefined' && typeof CarroDrive !== 'undefined');
    await p.evaluate(async () => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget');
      window.__ev = []; document.addEventListener('dgo:google', (e) => window.__ev.push(e.detail.tipo));
      const m = await ArquivosFamilia.guardar({ nome: 'canhoto 2026-11-12 OFICINA EXEMPLO', tipo: 'comprovante', ano: 2026, ligado: 'cp1', mime: 'image/png' }, new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
      CompraParcelada.achar('cp1').docId = m.id;
      const m2 = await ArquivosFamilia.guardar({ nome: 'recibo lavagem', tipo: 'comprovante', ano: 2026, ligado: 'rb_l1', mime: 'application/pdf' }, new Uint8Array([37, 80, 68, 70]));
      ST.gastos.find((g) => g.id === 'rb_l1').docId = m2.id; Store.salvar(); });
    const carro = () => p.evaluate(() => { irPara('b-carro'); render(); return (document.querySelector('.vc-meus') || {}).textContent || ''; });

    console.log('1) sem a configuração da plataforma, nada aparece');
    let t = await carro();
    ok(!/Google|Drive/.test(t) && !(await p.evaluate(() => SolverGoogle.estado().configurado)), 'a tela do carro não mostra botão nem mensagem do Google');
    ok(await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); return !document.querySelector('.cd-dono') && !document.querySelector('#sgCliente'); }), 'Configurações da família: nenhum campo do Google');
    ok(!google.length, 'nenhum script do Google foi carregado');

    console.log('2) a tela escondida do dono (só neste aparelho)');
    await p.evaluate(() => { location.hash = 'dono-google'; irPara('config'); cfgSecao = 'todos'; render(); const c = document.querySelector('.cd-dono').closest('.cfg-acc'); if (c) c.classList.add('aberta'); });
    ok(await p.evaluate(() => /Ainda não configurado: o botão do Google não aparece para ninguém/.test(document.querySelector('.cd-dono').textContent)), 'com #dono-google: a seção "Google Drive · plataforma" para o dono');
    ok(await p.evaluate(() => { const t = document.querySelector('.cd-dono').textContent; return /SolverONE web/.test(t) && /SolverONE Picker key/.test(t) && /Mostrar chave/.test(t) && /Número do projeto/.test(t); }), 'o passo a passo curto de onde copiar cada um (Credenciais → SolverONE web / SolverONE Picker key → Mostrar chave; Configurações do projeto)');
    ok(/client secret/.test(await p.evaluate(() => SolverGoogle.salvarDono({ clienteId: '123456-teste.apps.googleusercontent.com', chavePicker: 'GOCSPX-segredo', projeto: '123456789012' }))), 'o "client secret" colado no lugar da chave é recusado');
    await p.fill('#sgCliente', CFG.clienteId); await p.fill('#sgChave', CFG.chavePicker); await p.fill('#sgProjeto', CFG.projeto);
    await p.click('[data-acao="sg-dono-salvar"]'); await p.waitForTimeout(150);
    const dono = await p.evaluate(() => ({ e: SolverGoogle.estado(), ls: localStorage.getItem('solver.google.moneytrio') || '', st: JSON.stringify(ST) }));
    ok(dono.e.configurado && /123456-teste/.test(dono.ls) && !/123456-teste|AIzaSimulada/.test(dono.st), 'salvo só neste aparelho (localStorage), fora dos dados da família e da nuvem');
    await p.evaluate(() => { history.replaceState(null, '', location.pathname); });

    console.log('3) "Conectar meu Google Drive"');
    t = await carro();
    ok(/📁 Conectar meu Google Drive/.test(t) && /O app só vê as pastas e os arquivos que ele mesmo criar ou que você escolher\./.test(t) && /usar uma pasta que já tenho no Drive/.test(t), 'o botão, a explicação em uma linha e "usar uma pasta que já tenho no Drive"');
    ok(!google.length, 'o Google ainda não carregou (só no toque)');
    await p.click('[data-acao="cd-conectar"]'); await p.waitForTimeout(150);
    const cx = await p.evaluate(() => ({ tc: window.__tc && { id: window.__tc.client_id, scope: window.__tc.scope }, e: SolverGoogle.estado(), txt: document.querySelector('.vc-meus').textContent }));
    ok(cx.tc && cx.tc.id === CFG.clienteId && cx.tc.scope === 'https://www.googleapis.com/auth/drive.file' && cx.e.conectado && !/Conectar meu Google Drive/.test(cx.txt), 'a tela do Google com um escopo só (drive.file); conectado, o botão some');

    console.log('4) enviar: a pasta do app "MoneyTRIO / Carro / Argo Ficticio / 2026-11-12 OFICINA EXEMPLO"');
    await p.click('[data-acao="cd-enviar"][data-t="f"][data-id="cp1"]'); await p.waitForTimeout(400);
    const nomes = pastas.map((x) => x.pai + '>' + x.name).join(' | ');
    ok(dialogos === 1, 'na 1ª vez do carro, o aviso: a foto sai do cofre cifrado e vai para o Drive (aceito)');
    ok(nomes === 'root>MoneyTRIO | pasta1>Carro | pasta2>Argo Ficticio | pasta3>2026-11-12 OFICINA EXEMPLO', 'as pastas criadas: ' + nomes);
    const up = drive.find((x) => /upload/.test(x.u));
    ok(up && up.auth === 'Bearer tok-simulado' && /"parents":\["pasta4"\]/.test(up.corpo) && /canhoto 2026-11-12 OFICINA EXEMPLO/.test(up.corpo) && /fields=id,webViewLink/.test(up.u), 'o arquivo do cofre sobe para a subpasta do serviço, com o token');
    const f1 = await p.evaluate(() => ({ dr: CompraParcelada.achar('cp1').drive, v: ST.veiculos[0].drive, txt: document.querySelector('.vc-rel').textContent, ev: window.__ev.join(), ls: JSON.stringify(localStorage), st: JSON.stringify(ST) }));
    ok(f1.dr && f1.dr.pastaId === 'pasta4' && f1.dr.link === 'https://drive.google.com/drive/folders/pasta4' && /📁 no Drive ↗/.test(f1.txt) && f1.v.raizNome === 'MoneyTRIO / Carro / Argo Ficticio', 'a ficha guarda a pasta; o botão vira "📁 no Drive ↗"; o carro guarda a pasta do app');
    ok(!/tok-simulado/.test(f1.ls) && !/tok-simulado/.test(f1.st) && /conectado/.test(f1.ev) && /enviado/.test(f1.ev), 'o token fica só na memória; o evento dgo:google avisou "conectado" e "enviado"');

    console.log('5) "usar uma pasta que já tenho" (o seletor do Google)');
    await p.click('[data-acao="cd-pasta"][data-v="vc1"]'); await p.waitForTimeout(200);
    const pk = await p.evaluate(() => ({ pk: window.__picker, v: ST.veiculos[0].drive }));
    ok(pk.pk && pk.pk.pasta === true && pk.pk.mime === 'application/vnd.google-apps.folder' && pk.pk.chave === CFG.chavePicker && pk.pk.app === CFG.projeto && pk.v.raizId === 'raiz123' && pk.v.raizNome === 'RENEGADE', 'o seletor mostra só pastas; a escolhida ("RENEGADE") vira a pasta do carro');
    pastas.push({ id: 'velha', name: '2026-11-20 LAVA RAPIDO FICTICIO', pai: 'raiz123' });
    await carro(); await p.click('[data-acao="cd-enviar"][data-t="g"][data-id="rb_l1"]'); await p.waitForTimeout(300);
    ok(dialogos === 1 && pastas.length === 5 && drive.filter((x) => /upload/.test(x.u)).pop().corpo.indexOf('"parents":["velha"]') >= 0, 'sem o aviso de novo; a subpasta do dia que já existia na pasta dele é reaproveitada (não cria outra)');
    ok(await p.evaluate(() => window.__pedidos === 1), 'a permissão foi pedida uma vez só (vale ~1 hora)');
    /* 3.105: "ou escolher a pasta deste serviço" (o dono já tem uma pasta por serviço): vai direto para ela, sem criar subpasta */
    await p.evaluate(() => { delete ST.gastos.find((x) => x.id === 'rb_l1').drive; render(); }); drive.length = 0; const np = pastas.length;
    ok(await p.evaluate(() => /ou escolher a pasta deste serviço/.test(document.querySelector('.vc-rel').textContent)), 'ao lado de "Enviar ao Drive": "ou escolher a pasta deste serviço"');
    await p.click('[data-acao="cd-enviar-pasta"][data-t="g"][data-id="rb_l1"]'); await p.waitForTimeout(300);
    const sv = await p.evaluate(() => ST.gastos.find((x) => x.id === 'rb_l1'));
    ok(pastas.length === np && !drive.some((x) => x.m === 'POST' && !/upload/.test(x.u)) && drive.some((x) => /upload/.test(x.u) && /"parents":\["raiz123"\]/.test(x.corpo)) && sv.drivePasta.id === 'raiz123' && sv.drive.pastaId === 'raiz123' && dialogos === 1,
      'a pasta escolhida no seletor recebe os arquivos direto (nenhuma pasta criada, sem o aviso de novo); a escolha fica no serviço');

    console.log('6) sem internet, o interruptor e o master do RootifyONE');
    await p.evaluate(() => { delete ST.gastos.find((x) => x.id === 'rb_l1').drive; render(); });
    await ctx.setOffline(true);
    await p.click('[data-acao="cd-enviar"][data-t="g"][data-id="rb_l1"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => CarroDrive.fila().join() === 'g:rb_l1' && /1 envio\(s\) ao Drive esperando a internet/.test((inboxGrupos().find((x) => x.id === 'docs') || {}).html || '')), 'sem internet: fica na fila e o 📥 mostra "1 envio(s) ao Drive esperando a internet"');
    await ctx.setOffline(false);
    await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = (inboxGrupos().find((x) => x.id === 'docs') || {}).html; d.id = 'tInb'; document.body.appendChild(d); });
    await p.click('#tInb [data-acao="cd-fila"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !CarroDrive.fila().length && !!ST.gastos.find((x) => x.id === 'rb_l1').drive), '"Enviar agora" com a internet de volta: subiu e saiu da fila');
    await p.evaluate(() => document.getElementById('tInb').remove());
    ok(await p.evaluate(() => { const o = window.SolverRecursos; window.SolverRecursos = { ligado: (id, d) => id === 'google-drive' ? false : d, valor: (k, d) => d, aoMudar: () => {} }; render(); const r = !SolverGoogle.estado().configurado && !document.querySelector('[data-recurso="google-drive"]'); window.SolverRecursos = o; return r; }), 'com o interruptor "google-drive" desligado no RootifyONE, tudo do Google some');
    master = { google: { clienteId: '999999-plataforma.apps.googleusercontent.com', chavePicker: 'AIza' + 'MasterRootify0123456789abcdefghij', projeto: '999999999999' } };
    await p.evaluate(() => { localStorage.removeItem('solver.google.moneytrio'); SolverGoogle.desconectar(); });
    const ms = await p.evaluate(() => SolverGoogle.configurar({ app: 'moneytrio' }).then((e) => e.configurado));
    ok(ms, 'com o bloco "google" no master do RootifyONE (solverone-dados/servicos/moneytrio.json), vale o da plataforma, sem nada colado');
    ok(await p.evaluate(() => window.__revogado === 'tok-simulado'), '"desconectar" devolve a permissão ao Google');

    console.log('7) o resto');
    ok(await p.evaluate(() => CarroDrive.pasta('2026-11-12', 'Oficina São José & Cia (OS 77)') === '2026-11-12 OFICINA SAO JOSE CIA'), 'o nome da subpasta sem acentos nem símbolos: "2026-11-12 OFICINA SAO JOSE CIA"');
    for (const [l, rx] of [['en', /Connect my Google Drive/], ['es', /Conectar mi Google Drive/]]) {
      await p.evaluate((x) => { I18n.atual = x; render(); }, l);
      ok(rx.test(await carro()), l.toUpperCase() + ': "' + rx.source + '"');
    }
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
