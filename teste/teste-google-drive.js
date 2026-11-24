/* =====================================================================
   teste/teste-google-drive.js — 3.103: a foto do serviço do carro no Google Drive (modulos/google-drive.js). Dados FICTÍCIOS.
   O GOOGLE É SIMULADO (o dono ainda não criou o projeto no Google Cloud): os scripts accounts.google.com/gsi/client e
   apis.google.com/js/api.js e a API do Drive (www.googleapis.com) são respondidos por este teste; nada sai para a internet.
   Confere: Configurações → Google Drive (valida o que se cola, recusa o "client secret"); nada do Google carrega antes de usar;
   escopo drive.file; token só na memória; "📁 Pasta no Drive" (Picker); "📁 Enviar ao Drive": aviso na 1ª vez, a subpasta
   "AAAA-MM-DD OFICINA" (criada uma vez, reaproveitada), o upload com o token, o link na ficha; sem internet, a fila no 📥.
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
const GSI = `window.google = window.google || {}; google.accounts = { oauth2: {
  initTokenClient: function (o) { window.__tc = o; return { requestAccessToken: function () { window.__pedidos = (window.__pedidos || 0) + 1; setTimeout(function () { o.callback({ access_token: 'tok-simulado', expires_in: 3600 }); }, 0); } }; },
  revoke: function (t, cb) { window.__revogado = t; if (cb) cb(); } } };`;
const GAPI = `window.gapi = { load: function (n, o) { window.__gapi = n; o.callback(); } }; window.google = window.google || {};
  function DocsView(v) { this.v = v; } DocsView.prototype.setSelectFolderEnabled = function (x) { this.pasta = x; return this; }; DocsView.prototype.setMimeTypes = function (m) { this.mime = m; return this; };
  function PickerBuilder() { this.o = {}; } ['addView', 'setOAuthToken', 'setDeveloperKey', 'setAppId', 'setTitle', 'setCallback'].forEach(function (k) { PickerBuilder.prototype[k] = function (x) { this.o[k] = x; return this; }; });
  PickerBuilder.prototype.build = function () { var o = this.o; window.__picker = { token: o.setOAuthToken, chave: o.setDeveloperKey, app: o.setAppId, pasta: o.addView && o.addView.pasta, mime: o.addView && o.addView.mime };
    return { setVisible: function () { setTimeout(function () { o.setCallback({ action: 'picked', docs: [{ id: 'raiz123', name: 'CARRO ARGO' }] }); }, 0); } }; };
  google.picker = { DocsView: DocsView, PickerBuilder: PickerBuilder, ViewId: { FOLDERS: 'folders' }, Action: { PICKED: 'picked', CANCEL: 'cancel' } };`;

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch(), google = [], drive = [];
  let pastas = [], nArq = 0;
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', async (r) => {
      const req = r.request(), u = req.url();
      if (u.startsWith(BASE)) return r.continue();
      if (u.startsWith('https://accounts.google.com/gsi/client')) { google.push('gsi'); return r.fulfill({ contentType: 'text/javascript', body: GSI }); }
      if (u.startsWith('https://apis.google.com/js/api.js')) { google.push('gapi'); return r.fulfill({ contentType: 'text/javascript', body: GAPI }); }
      if (u.startsWith('https://www.googleapis.com/')) {
        const h = req.headers(), d = { m: req.method(), u, auth: h.authorization || '', corpo: req.postData() || '' }; drive.push(d);
        if (d.auth !== 'Bearer tok-simulado') return r.fulfill({ status: 401, body: '{}' });
        if (/upload\/drive\/v3\/files/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'arq' + (++nArq) }) });
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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof GoogleDrive !== 'undefined' && typeof ArquivosFamilia !== 'undefined');
    await p.evaluate(async () => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget');
      const m = await ArquivosFamilia.guardar({ nome: 'canhoto 2026-11-12 OFICINA EXEMPLO', tipo: 'comprovante', ano: 2026, ligado: 'cp1', mime: 'image/png' }, new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
      CompraParcelada.achar('cp1').docId = m.id;
      const m2 = await ArquivosFamilia.guardar({ nome: 'recibo lavagem', tipo: 'comprovante', ano: 2026, ligado: 'rb_l1', mime: 'application/pdf' }, new Uint8Array([37, 80, 68, 70]));
      ST.gastos.find((g) => g.id === 'rb_l1').docId = m2.id; Store.salvar(); });

    console.log('1) Configurações → Google Drive');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); const c = document.querySelector('.gd-cfg').closest('.cfg-acc'); if (c) c.classList.add('aberta'); });
    ok(await p.evaluate(() => !!document.querySelector('.gd-cfg') && /Ainda não configurado/.test(document.querySelector('.gd-cfg').textContent) && /Passo a passo no Google Cloud/.test(document.querySelector('.gd-cfg').textContent)), 'a seção "📁 Google Drive" aparece, com o passo a passo e "Ainda não configurado"');
    const ruim = await p.evaluate(() => [GoogleDrive.salvarConfig({ clientId: 'abc', apiKey: 'AIza' + 'x'.repeat(35), appId: '123456789012' }), GoogleDrive.salvarConfig({ clientId: '123-abc.apps.googleusercontent.com', apiKey: 'GOCSPX-segredo', appId: '123456789012' })]);
    ok(/termina em \.apps\.googleusercontent\.com/.test(ruim[0]) && /começa com AIza/.test(ruim[1]) && !(await p.evaluate(() => GoogleDrive.pronto())), 'valida o que se cola: ID do cliente errado e o "client secret" no lugar da chave são recusados');
    await p.fill('#gdClient', '123456-teste.apps.googleusercontent.com'); await p.fill('#gdKey', 'AIza' + 'Simulada0123456789abcdefghijklmnop'); await p.fill('#gdApp', '123456789012');
    await p.click('[data-acao="gd-salvar"]'); await p.waitForTimeout(80);
    ok(await p.evaluate(() => GoogleDrive.pronto() && /Configurado\. A permissão é pedida num toque/.test(document.querySelector('.gd-cfg').textContent)), 'salvo: "Configurado. A permissão é pedida num toque, na hora de enviar."');
    ok(!google.length, 'nenhum script do Google foi carregado só por configurar ou abrir o app');

    console.log('2) a pasta do carro (Picker)');
    await p.evaluate(() => { irPara('b-carro'); render(); });
    await p.click('[data-acao="gd-pasta"][data-v="vc1"]'); await p.waitForTimeout(150);
    const pk = await p.evaluate(() => ({ d: ST.veiculos[0].drive, pk: window.__picker, tc: window.__tc && { id: window.__tc.client_id, scope: window.__tc.scope }, txt: document.querySelector('.vc-meus').textContent }));
    ok(pk.tc && pk.tc.scope === 'https://www.googleapis.com/auth/drive.file' && pk.tc.id === '123456-teste.apps.googleusercontent.com', 'Conectar Google com o ID do cliente e um escopo só: drive.file');
    ok(pk.pk && pk.pk.token === 'tok-simulado' && pk.pk.app === '123456789012' && pk.pk.pasta === true && pk.pk.mime === 'application/vnd.google-apps.folder', 'o seletor do Google mostra só pastas, com o token, a chave e o número do projeto');
    ok(pk.d && pk.d.raizId === 'raiz123' && /📁 CARRO ARGO/.test(pk.txt), 'a pasta escolhida fica no carro: "📁 CARRO ARGO"');

    console.log('3) enviar ao Drive');
    await p.click('[data-acao="gd-enviar"][data-t="f"][data-id="cp1"]'); await p.waitForTimeout(300);
    const e1 = await p.evaluate(() => ({ dr: CompraParcelada.achar('cp1').drive, txt: document.querySelector('.vc-rel').textContent, ls: localStorage.getItem('investifyme.dados.v1') || '' }));
    const busca = drive.find((x) => x.m === 'GET'), cria = drive.find((x) => x.m === 'POST' && !/upload/.test(x.u)), up = drive.find((x) => /upload/.test(x.u));
    ok(dialogos === 1, 'na 1ª vez do carro, o aviso: a foto sai do cofre cifrado e vai para o Drive (aceito)');
    ok(busca && /name = '2026-11-12 OFICINA EXEMPLO'/.test(decodeURIComponent(busca.u)) && /'raiz123' in parents/.test(decodeURIComponent(busca.u)) && cria && JSON.parse(cria.corpo).name === '2026-11-12 OFICINA EXEMPLO', 'a subpasta "2026-11-12 OFICINA EXEMPLO" dentro da pasta do carro (sem o nº da OS), criada porque não existia');
    ok(up && up.auth === 'Bearer tok-simulado' && /"parents":\["pasta1"\]/.test(up.corpo) && /canhoto 2026-11-12 OFICINA EXEMPLO/.test(up.corpo), 'o arquivo do cofre sobe para a subpasta, com o token');
    ok(e1.dr && e1.dr.pastaId === 'pasta1' && e1.dr.link === 'https://drive.google.com/drive/folders/pasta1' && e1.dr.arquivos.length === 1 && /📁 no Drive ↗/.test(e1.txt), 'a ficha guarda a pasta e o arquivo; o botão vira o link "📁 no Drive ↗"');
    ok(!/tok-simulado/.test(e1.ls) && !/tok-simulado/.test(JSON.stringify(await p.evaluate(() => ST))), 'o token fica só na memória: nem no aparelho nem nos dados que vão à nuvem');
    drive.length = 0;
    await p.evaluate(() => { CompraParcelada.achar('cp1').data = '2026-11-12'; ST.gastos.find((g) => g.id === 'rb_l1').data = '2026-11-12'; ST.gastos.find((g) => g.id === 'rb_l1').descRobo = 'OFICINA EXEMPLO'; render(); });
    await p.click('[data-acao="gd-enviar"][data-t="g"][data-id="rb_l1"]'); await p.waitForTimeout(300);
    ok(dialogos === 1 && !drive.some((x) => x.m === 'POST' && !/upload/.test(x.u)) && drive.some((x) => /upload/.test(x.u) && /"parents":\["pasta1"\]/.test(x.corpo)), 'o 2º envio do mesmo dia e oficina: sem o aviso de novo e na MESMA subpasta (não cria outra)');
    ok(await p.evaluate(() => window.__pedidos === 1), 'a permissão foi pedida uma vez só (o token vale por ~1 hora)');

    console.log('4) sem internet: a fila');
    await p.evaluate(() => { const g = ST.gastos.find((x) => x.id === 'rb_l1'); delete g.drive; render(); });
    await ctx.setOffline(true);
    await p.click('[data-acao="gd-enviar"][data-t="g"][data-id="rb_l1"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => GoogleDrive.fila().join() === 'g:rb_l1' && /1 envio\(s\) ao Drive esperando a internet/.test((inboxGrupos().find((x) => x.id === 'docs') || {}).html || '')), 'sem internet: fica na fila e o 📥 mostra "1 envio(s) ao Drive esperando a internet"');
    await ctx.setOffline(false);
    await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = (inboxGrupos().find((x) => x.id === 'docs') || {}).html; d.id = 'tInb'; document.body.appendChild(d); });
    await p.click('#tInb [data-acao="gd-fila"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !GoogleDrive.fila().length && !!ST.gastos.find((x) => x.id === 'rb_l1').drive), '"Enviar agora" com a internet de volta: subiu e saiu da fila');

    console.log('5) o resto');
    ok(await p.evaluate(() => GoogleDrive.nomePasta('2026-11-12', 'Oficina São José & Cia (OS 77)') === '2026-11-12 OFICINA SAO JOSE CIA'), 'o nome da subpasta sem acentos nem símbolos: "2026-11-12 OFICINA SAO JOSE CIA"');
    await p.evaluate(() => { GoogleDrive.desconectar(); });
    ok(await p.evaluate(() => window.__revogado === 'tok-simulado' && !GoogleDrive.conectado()), '"Desconectar o Google" devolve a permissão');
    for (const [l, rx] of [['en', /Send to Drive|on Drive|Drive folder/], ['es', /Enviar a Drive|en Drive|Carpeta en Drive/]]) {
      await p.evaluate((x) => { I18n.atual = x; render(); }, l);
      ok(rx.test(await p.evaluate(() => document.querySelector('.vc-meus').textContent + document.querySelector('.vc-rel').textContent)), l.toUpperCase() + ': os botões do Drive');
    }
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
