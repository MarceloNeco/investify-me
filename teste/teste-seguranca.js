/* =====================================================================
   teste/teste-seguranca.js — 3.65: a tela "Segurança e aparelhos" (nuvem.js 1.12.0) e a jornada entre apps
   ---------------------------------------------------------------------
   Com o "Supabase de mentira" (teste/mock-sol.js):
     1. jornada entre apps: a pessoa já usa o OmniLifeONE (um aparelho com app='omnilife') e a conta ainda não tem PIN da
        conta → a primeira vez no MoneyTRIO diz "Você já usa o OmniLifeONE…" e avisa que o PIN escolhido também vale lá;
        a tela do PIN diz "Crie o PIN da sua conta SolverONE";
     2. o selo "Tudo guardado" saiu: ícone discreto no topo + item "☁️ Dados salvos · hoje hh:mm" no menu do perfil;
     3. a tela larga: 5 seções; 1 coluna no celular, 2 no notebook, 3 em telas grandes; sem rolagem para o lado; prints em
        1366×768, 1920×1080, 2560×1440 e celular (/tmp/seg-*.png);
     4. aparelhos: "este aparelho", os apps de cada aparelho ("… · MoneyTRIO e OmniLifeONE"), pedido simulado de app='omnilife'
        vira o aviso "1 aparelho pedindo para entrar · Ver e aprovar";
     5. robô: "Robô da família, autorizado em …" (sem "(e-mail não registrado)"), "Buscar agora", e-mail no Avançado;
     6. Sair: "Sair da conta"; no Avançado, "Sair e apagar a cópia deste aparelho" e "Usar só neste aparelho";
     7. Configurações também abre a tela.
   Dados fictícios. Uso: node teste/teste-seguranca.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { SB, db, supabase, prepararChaves, PESSOAS, ANA, agora } = require('./mock-sol');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
let BASE = '';
function servidor() {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
  const s = http.createServer((req, res) => {
    const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}
const PIN = '582914';
const id = (n) => '99999999-0000-0000-0000-00000000000' + n;

(async () => {
  const srv = await servidor(); BASE = 'http://localhost:' + srv.address().port;
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
    const P = await ctx.newPage(); const erros = [];
    P.on('pageerror', (e) => { erros.push(String(e)); console.log('  [pageerror] ' + e); });
    P.on('dialog', (d) => d.accept());

    console.log('1) jornada entre apps: já usa o OmniLifeONE, conta sem PIN da conta');
    db.sol_aparelhos.push({ id: id(1), user_id: ANA, nome: 'Android · Chrome', app: 'omnilife', como: 'primeiro', aprovado_por: null, criado_em: '2026-11-01T12:00:00Z', visto_em: '2026-11-10T21:30:00Z', removido_em: null });
    await P.goto(BASE + '/'); await P.waitForSelector('#nvEm');
    await P.fill('#nvEm', PESSOAS[ANA].email); await P.fill('#nvPw', PESSOAS[ANA].senha); await P.click('#nvIn');
    await P.waitForSelector('#nvApOutro', { timeout: 20000 });
    const ja = await P.textContent('#nvJaUsa').catch(() => '');
    ok(/Você já usa o OmniLifeONE\. Aprove por um aparelho seu \(pode ser o OmniLifeONE neste mesmo celular\) e use o mesmo PIN da sua conta\./.test(ja), 'primeira vez: "Você já usa o OmniLifeONE. Aprove por um aparelho seu (pode ser o OmniLifeONE neste mesmo celular)…"');
    ok(/o PIN que você escolher aqui também passa a valer no OmniLifeONE/.test(ja), 'conta sem PIN da conta: avisa que o PIN escolhido também vale no OmniLifeONE');
    await P.screenshot({ path: '/tmp/seg-jornada.png' });
    await P.click('#nvCodigoAntigo', { timeout: 20000 }); await P.waitForSelector('#nvCod');
    await P.fill('#nvCod', PESSOAS[ANA].codigo); await P.click('#nvCodOk');
    await P.waitForSelector('#nvP1');
    ok(/Crie o PIN da sua conta SolverONE/.test(await P.textContent('.nv-card h2')) && /vale no MoneyTRIO, no OmniLifeONE e nos próximos apps/.test(await P.textContent('#nvPinUm')), 'tela do PIN: "Crie o PIN da sua conta SolverONE. Ele vale no MoneyTRIO, no OmniLifeONE e nos próximos apps"');
    ok(/também passa a valer no OmniLifeONE/.test(await P.textContent('#nvPinOutros').catch(() => '')), 'a tela do PIN repete o aviso do OmniLifeONE');
    await P.fill('#nvP1', PIN); await P.fill('#nvP2', PIN); await P.click('#nvPOk');
    await P.waitForSelector('#nvSelo', { timeout: 90000 });
    ok(!!(db.sol_pin_conta || []).find((p) => p.user_id === ANA), 'o PIN escolhido virou o PIN da conta (vale nos dois apps)');

    console.log('2) o selo saiu: ícone discreto no topo + item no menu do perfil');
    ok(await P.evaluate(() => document.getElementById('nvSelo').classList.contains('nv-selo-solto') && document.getElementById('nvSelo').getBoundingClientRect().top < 60), 'na tela inicial (sem a barra do topo): o ícone fica discreto no canto de cima');
    await P.evaluate(() => { Assist.marcarTutorial(); abrirApp('budget'); ST.config.assistOne = false; AssistOne.aplicar(); }); await P.waitForTimeout(300);
    const selo = await P.evaluate(() => { const e = document.getElementById('nvSelo'); return { topo: !!e.closest('.topbar-actions'), txt: e.textContent, est: e.getAttribute('data-estado'), w: e.getBoundingClientRect().width }; });
    ok(selo.topo && selo.w < 60 && /Dados salvos · hoje \d\d:\d\d/.test(selo.txt), 'ícone no topo, ao lado do perfil (' + Math.round(selo.w) + 'px), lido como "Dados salvos · hoje hh:mm"');
    ok(!(await P.$('.nv-selo')), 'a pílula "Tudo guardado" não aparece mais');
    await P.evaluate(() => alternarPerfilMenu()); await P.waitForSelector('[data-perfil="nuvem"]');
    const item = await P.textContent('[data-perfil="nuvem"]');
    ok(/☁️\s*Dados salvos · hoje \d\d:\d\d\s*Segurança e aparelhos/.test(item), 'menu do perfil: "☁️ Dados salvos · hoje hh:mm" · Segurança e aparelhos');
    await P.evaluate(() => { const S = MoneyNuvem._teste.Sinc; S.fila.set('x|teste', { cif: null, t: Date.now() }); MoneyNuvem._teste.Painel.atualizar(); });
    ok(await P.evaluate(() => document.querySelector('[data-perfil="nuvem"]').classList.contains('nv-est-enviando') && document.getElementById('nvSelo').getAttribute('data-estado') === 'enviando'), 'guardando: o item fica amarelo e o ícone também');
    await P.evaluate(() => { const S = MoneyNuvem._teste.Sinc; S.fila.set('x|teste', { cif: null, t: Date.now(), recusado: true }); MoneyNuvem._teste.Painel.atualizar(); });
    ok(await P.evaluate(() => document.querySelector('[data-perfil="nuvem"]').classList.contains('nv-est-erro')), 'com erro: o item fica vermelho');
    await P.evaluate(() => { const S = MoneyNuvem._teste.Sinc; S.fila.delete('x|teste'); MoneyNuvem._teste.Painel.atualizar(); });
    await P.click('[data-perfil="nuvem"]'); await P.waitForSelector('.nv-painel .nv-largo');
    ok(true, 'o item do menu abre "Segurança e aparelhos"');

    console.log('3) aparelhos, pedido do OmniLifeONE, robô');
    const meu = db.sol_aparelhos.find((a) => a.user_id === ANA && a.app === 'moneytrio');
    db.sol_aparelhos.push({ id: id(2), user_id: ANA, nome: meu.nome, app: 'omnilife', como: 'primeiro', aprovado_por: null, criado_em: '2026-11-02T12:00:00Z', visto_em: '2026-11-09T08:15:00Z', removido_em: null });
    db.sol_acesso_pedidos.push({ id: id(3), user_id: ANA, nome: 'iPhone · Safari', app: 'omnilife', pub: { x: 'a', y: 'b' }, compromisso: 'c', grupo_id: null, pub_a: null, n_a: null, n_b: null, desafio_por: null,
      criado_em: agora(), expira_em: new Date(Date.now() + 10 * 60000).toISOString(), estado: 'aberto', resposta: null });
    await P.evaluate(() => { const T = MoneyNuvem._teste; T.Caixa.ligada = true; T.Caixa.ultimos = { quando: Date.now(), novos: 3 };
      T.Painel._robos = [{ user_id: '33333333-3333-3333-3333-333333333333', nome: 'robo@teste.com', criado_em: '2026-11-03T14:00:00Z', desligado_em: null }];
      T.Painel.robos = async function () {}; T.Aparelhos._vistos = {}; T.Painel.fechar(); T.Painel.abrir(); });
    await P.waitForFunction(() => /MoneyTRIO e OmniLifeONE/.test((document.querySelector('#nvAps') || {}).textContent || ''), null, { timeout: 15000 });
    await P.waitForSelector('#nvApVer', { timeout: 15000 });
    const aps = await P.textContent('#nvAps');
    ok(/este aparelho/.test(aps) && /MoneyTRIO e OmniLifeONE/.test(aps), 'a lista mostra "este aparelho" e os apps de cada aparelho ("… · MoneyTRIO e OmniLifeONE")');
    ok(/Android · Chrome · OmniLifeONE/.test(aps) && /visto por último/.test(aps), 'o celular só do OmniLifeONE aparece com "visto por último"');
    ok(/1 aparelho pedindo para entrar · Ver e aprovar/.test(await P.textContent('#nvApAviso')), 'pedido simulado de app=omnilife: "1 aparelho pedindo para entrar · Ver e aprovar"');
    ok(!(await P.$('#nvPedido')), 'com a tela aberta, o balão do pedido não fica por cima dela');
    const robo = await P.textContent('#nvSecRobo');
    ok(/Recebendo do robô · última entrega hoje \d\d:\d\d · 3 novos/.test(robo) && /Robô da família, autorizado em 03\/Nov\/2026/.test(robo) && !/não registrado/.test(robo), 'robô: "Recebendo do robô · última entrega hoje hh:mm · 3 novos" e "Robô da família, autorizado em 03/Nov/2026"');
    ok(await P.evaluate(() => !document.querySelector('#nvRoboAv').open && !!document.querySelector('#nvRoboAv #nvRoboEmail') && !!document.querySelector('#nvCaixaJa')), 'e-mail e "autorizar" ficam no Avançado (fechado); "Buscar agora" à vista');
    ok(await P.evaluate(() => !document.querySelector('#nvSairAv').open && !!document.querySelector('#nvSairAv #nvDesc') && !!document.querySelector('#nvSairAv #nvIrLocal') && !!document.querySelector('#nvSecSair > #nvSair')), 'Sair: "Sair da conta" à vista; "apagar a cópia" e "só neste aparelho" no Avançado');
    ok(await P.evaluate(() => !document.querySelector('#nvPin').classList.contains('nv-hidden') && /Bloquear agora/.test(document.querySelector('#nvTrancar').textContent)), 'PIN e digital: "Trocar o PIN" (a conta tem PIN) e "🔒 Bloquear agora"');
    ok(await P.evaluate(() => /Entrar com a digital num aparelho novo/.test(document.querySelector('#nvApAv').textContent) || !document.querySelector('#nvApPk')), 'a passkey (quando há leitor) fica no Avançado com o nome novo');

    console.log('4) larguras e prints');
    const medir = () => P.evaluate(() => { const g = document.querySelector('.nv-grade'), c = document.querySelector('.nv-largo');
      return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, secs: g.children.length, lado: c.scrollWidth > c.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, w: Math.round(c.getBoundingClientRect().width) }; });
    for (const [vp, cols, nome] of [[{ width: 1366, height: 768 }, 2, '1366'], [{ width: 1920, height: 1080 }, 3, '1920'], [{ width: 2560, height: 1440 }, 3, '2560'], [{ width: 390, height: 844 }, 1, 'celular']]) {
      await P.setViewportSize(vp); await P.waitForTimeout(300);
      const m = await medir();
      ok(m.secs === 5 && m.cols === cols && !m.lado, nome + ': ' + m.cols + ' coluna(s), 5 seções, sem rolagem para o lado (cartão ' + m.w + 'px)');
      if (nome === 'celular') { await P.setViewportSize({ width: 390, height: 2300 }); await P.waitForTimeout(200); }
      await P.screenshot({ path: '/tmp/seg-' + nome + '.png' });
    }
    await P.setViewportSize({ width: 1366, height: 768 });
    await P.click('#nvApVer'); await P.waitForSelector('#nvPedido');
    ok(/iPhone · Safari · OmniLifeONE/.test(await P.textContent('#nvPedido')), '"Ver e aprovar" leva ao pedido, que diz de qual app ele vem (OmniLifeONE)');
    await P.click('#nvPedidoX');

    console.log('5) Configurações também abre');
    await P.evaluate(() => { abrirApp('budget'); irPara('config'); cfgSecao = 'todos'; render(); });
    await P.waitForSelector('#cfgSeguranca [data-acao="nuvem-painel"]');
    await P.click('#cfgSeguranca [data-acao="nuvem-painel"]'); await P.waitForSelector('.nv-painel .nv-largo');
    ok(true, 'Configurações → "🔐 Segurança e aparelhos · Abrir" (o botão fica no cabeçalho, à vista mesmo com o cartão fechado)');
    await P.click('#nvFechar');
    ok(!(await P.$('.nv-painel')), '✕ fecha a tela');
    ok(erros.length === 0, 'sem erro de página');
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await browser.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
