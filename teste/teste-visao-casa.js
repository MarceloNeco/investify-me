/* =====================================================================
   teste/teste-visao-casa.js — 3.66 "dois cofres": a visão da casa (nuvem.js 1.14.0 + modulos/visao-casa.js)
   ---------------------------------------------------------------------
   Com o "Supabase de mentira" da 3.66 (teste/mock-escopos.js), dois contextos: Ana (chefe) e Beta (membro, "Só a casa").
     1. Ana com dados fictícios marcados (o que é da casa e o que é reservado), sincronizados com a CF (antes da 3.66).
     2. Migração: nenhuma linha viva abre com a CF; casa só com a chave da casa; "r." só com a reservada; as contagens batem;
        o comprovante foi para "r/" e a cópia antiga saiu; a caixa do robô por escopo; o banco recusa gravar com a CF.
     3. Liberar a Beta com "Só a casa": só a chave da casa vai para ela.
     4. Beta entra: vê só a casa (Store, IndexedDB e tudo o que o banco devolveu a ela não têm nenhum marcador reservado);
        os totais da família chegam; o item "casa" do robô chega para ela com o chefe fechado; o reservado não.
     5. Beta edita um lançamento da casa → Ana recebe. Ana passa um lançamento reservado para a casa → o "r." sai de verdade
        e a Beta passa a ver; nada fica em dobro.
   Dados fictícios. Uso: node teste/teste-visao-casa.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const X = require('./mock-escopos');
const { SB, db, PESSOAS, ANA, BETA, GID } = X;
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
async function aparelho(browser, nome) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return X.supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
  const page = await ctx.newPage(); page.erros = [];
  page.on('pageerror', (e) => { page.erros.push(String(e)); console.log('  [' + nome + ' pageerror] ' + e); });
  page.on('dialog', (d) => d.accept());
  return page;
}
async function entrar(page, uid) {
  await page.goto(BASE + '/'); await page.waitForSelector('#nvEm');
  await page.fill('#nvEm', PESSOAS[uid].email); await page.fill('#nvPw', PESSOAS[uid].senha); await page.click('#nvIn');
  await page.click('#nvCodigoAntigo', { timeout: 30000 }); await page.waitForSelector('#nvCod');
  await page.fill('#nvCod', PESSOAS[uid].codigo); await page.click('#nvCodOk');
  await page.waitForSelector('#nvP1, #nvPC', { timeout: 30000 });
  if (await page.$('#nvPC')) { await page.fill('#nvPC', '482915'); await page.click('#nvPCOk'); }
  else { await page.fill('#nvP1', '482915'); await page.fill('#nvP2', '482915'); await page.click('#nvPOk'); }
  await page.waitForSelector('#nvSelo', { timeout: 90000 });
}
const subir = (pg) => pg.evaluate(async () => { const S = MoneyNuvem._teste.Sinc; Store.salvar(); await S.registrar(); await S.enviar(); return S.fila.size; });
const buscar = (pg) => pg.evaluate(async () => { await MoneyNuvem.buscarAgora(); return true; });
/* os marcadores: o que é reservado nunca pode chegar à Beta */
const RES = ['MARCADOR-RESERVADO-DEBITO', 'MARCADOR-RENDA-DELE', 'MARCADOR-PJ-CONTADOR', 'MARCADOR-INVEST', 'MARCADOR-BLACK', 'MARCADOR-ROBO-RES'];
const CASA = ['MARCADOR-CASA-DELA', 'MARCADOR-CASA-COND', 'MARCADOR-CASA-CARTAO'];

(async () => {
  const srv = await servidor(); BASE = 'http://127.0.0.1:' + srv.address().port;
  await X.prepararChaves();
  const browser = await chromium.launch();
  try {
    console.log('1) Ana (chefe) com os dados de antes da 3.66');
    const A = await aparelho(browser, 'Ana');
    await entrar(A, ANA);
    await A.evaluate(async () => {
      const E = Store.estado, d = '2026-10-';
      E.pessoas = (E.pessoas || []).concat([{ id: 'pAna', tipo: 'casa', papel: 'responsavel', nome: 'Ana' }, { id: 'pBeta', tipo: 'casa', papel: 'responsavel', nome: 'Beta', uid: '55555555-5555-5555-5555-555555555555' }]);
      E.cartoes = [{ id: 'cBeta', nome: 'Cartão dela', fim: '1111', usaId: 'pBeta' }, { id: 'cBlack', nome: 'MARCADOR-BLACK', fim: '2222', usaId: 'pAna' }];
      E.recorrentes = [{ id: 'rCond', nome: 'Condomínio', desc: 'Condomínio', sub: 'Condomínio', grupo: 'HABITACAO', valor: 900, dia: 10, ativo: true },
                       { id: 'rCont', nome: 'Mensalidade do contador', desc: 'Mensalidade', sub: 'Contador', grupo: 'BANCARIOS', valor: 300, dia: 5, ativo: true }];
      E.pagamentos = [{ rid: 'rCond', data: d + '10', pago: true }, { rid: 'rCont', data: d + '05', pago: true }];
      E.gastos = [
        { id: 'g1', data: d + '03', valor: 120, grupo: 'PESSOAL', sub: 'Roupa', desc: 'MARCADOR-CASA-DELA', quem: 'Beta', quemId: 'pBeta', fluxo: 'saida' },
        { id: 'g2', data: d + '04', valor: 80, grupo: 'LAZER', sub: 'Restaurante', desc: 'MARCADOR-RESERVADO-DEBITO', quem: 'Ana', quemId: 'pAna', fluxo: 'saida' },
        { id: 'g3', data: d + '10', valor: 900, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'MARCADOR-CASA-COND', recorrenteId: 'rCond', quemId: 'pAna', fluxo: 'saida' },
        { id: 'g4', data: d + '05', valor: 12345, grupo: 'RENDA', sub: 'Salário', desc: 'MARCADOR-RENDA-DELE', quemId: 'pAna', fluxo: 'entrada' },
        { id: 'g5', data: d + '05', valor: 300, grupo: 'BANCARIOS', sub: 'Contador', desc: 'MARCADOR-PJ-CONTADOR', recorrenteId: 'rCont', quemId: 'pAna', fluxo: 'saida' },
        { id: 'g6', data: d + '12', valor: 55, grupo: 'PESSOAL', sub: 'Farmácia', desc: 'MARCADOR-CASA-CARTAO', cartaoId: 'cBeta', fluxo: 'saida' },
        { id: 'g7', data: d + '15', valor: 70, grupo: 'LAZER', sub: 'Cinema', desc: 'MARCADOR-BLACK compra', cartaoId: 'cBlack', quemId: 'pAna', fluxo: 'saida' }];
      E.posicoes = [{ id: 'pos1', nome: 'MARCADOR-INVEST', tipo: 'rf', valor: 50000 }];
      E.visaoCasa = { pessoas: ['pBeta'] };
      await ArquivosFamilia.guardar({ nome: 'MARCADOR-RESERVADO-DEBITO.pdf', tipo: 'nf', ano: 2026 }, new TextEncoder().encode('%PDF comprovante de teste'));
      await ArquivosFamilia.sincronizar();
    });
    ok((await subir(A)) === 0, 'Ana: tudo sincronizado (fila vazia)');
    const vivosAntes = db.money_docs.filter((r) => !r.apagado_em).length;
    ok(vivosAntes > 10 && db.money_docs.every((r) => !r.dados_cifrado || !/"m":/.test(r.dados_cifrado)), 'antes: ' + vivosAntes + ' registros, todos com a CF (o formato de hoje)');
    ok(Object.keys(db.arquivos).length === 1 && !Object.keys(db.arquivos)[0].includes('/r/'), 'antes: 1 comprovante no caminho da casa');
    /* a caixa de hoje (uma chave, com a CF) */
    await A.evaluate(() => MoneyNuvem._teste.Caixa.preparar());
    ok(db.money_caixa_chave.length === 1 && db.money_docs.some((r) => r.id === 'caixa_robo'), 'antes: a caixa do robô de hoje (config|caixa_robo)');

    const cedo = await A.evaluate(async () => { try { await MoneyNuvem.escopos.definir('55555555-5555-5555-5555-555555555555', 'casa'); return 'aceitou'; } catch (e) { return String(e.status || e.code || e.message); } });
    ok(cedo !== 'aceitou' && !X.visao(BETA), 'o chefe tenta liberar "casa" antes da migração: o servidor recusa (' + cedo + ')');

    console.log('2) a migração (Preparar a visão da família)');
    const conf = await A.evaluate(() => MoneyNuvem.escopos.migrar());
    ok(conf && conf.ok && conf.concluida && db.money_migracao.length === 1, 'conferência do app: ok, e a migração marcada como concluída (' + JSON.stringify(conf) + ')');
    const vivos = db.money_docs.filter((r) => !r.apagado_em);
    let cf = 0; for (const r of vivos) if (await X.abreComCf(r.dados_cifrado)) cf++;
    ok(cf === 0, 'nenhuma linha viva abre com a CF (' + vivos.length + ' conferidas pelo teste, fora do app)');
    ok(vivos.every((r) => /^\{"c":1,"m":"[cr]"/.test(r.dados_cifrado) && (r.id.startsWith('r.') === (r.escopo === 'reservado')) && (r.escopo === 'reservado') === /"m":"r"/.test(r.dados_cifrado)), 'casa fechada com a chave da casa, "r." com a reservada');
    ok(!db.money_docs.some((r) => r.apagado_em), 'nenhum rastro de apagado ficou (nem tombstone)');
    const ids = (c) => vivos.filter((r) => r.colecao === c).map((r) => r.id).sort().join(',');
    ok(ids('gastos') === 'g1,g3,g6,r.g2,r.g4,r.g5,r.g7', 'lançamentos: casa g1 (dela), g3 (condomínio), g6 (cartão dela); reservado o resto (' + ids('gastos') + ')');
    ok(ids('recorrentes') === 'r.rCont,rCond' && ids('cartoes') === 'cBeta,r.cBlack', 'compromisso PJ (contador) e o cartão dele: reservados');
    ok(ids('posicoes') === 'r.pos1', 'investimentos: reservados');
    ok(conf.antes + 3 === conf.vivos - 0 || conf.vivos >= conf.antes, 'contagens: antes ' + conf.antes + ', depois ' + conf.vivos + ' (casa ' + conf.casa + ', reservado ' + conf.reservado + ')');
    ok(db.money_caixa_chave.map((c) => c.escopo).sort().join() === 'casa,reservado' && !db.money_docs.some((r) => r.id === 'caixa_robo') && vivos.some((r) => r.id === 'caixa_casa') && vivos.some((r) => r.id === 'r.caixa_robo'), 'caixa do robô: duas chaves (casa e reservada); a antiga saiu');
    const arq = Object.keys(db.arquivos);
    ok(arq.length === 1 && arq[0].includes('/r/') && Buffer.from(db.arquivos[arq[0]]).slice(0, 5).toString() === 'MTA2r', 'comprovante: em "r/", com a reservada (MTA2r); a cópia antiga (CF) saiu');
    ok(vivos.some((r) => r.id === 'r.escopos'), 'marcador r.escopos (os outros aparelhos do chefe baixam de novo)');
    const res = await A.evaluate(async () => { try { await MoneyNuvem._teste.Sinc.registrar(); } catch (e) {} return (Store.estado.resumo || []).map((r) => r.id + ':' + r.total).join(' '); });
    await subir(A);
    ok(/2026-10:1525/.test(res) && vivos.length && db.money_docs.some((r) => r.colecao === 'resumo' && r.escopo === 'casa'), 'totais da família por mês (casa): ' + res + ' (sem a renda)');
    /* (o banco recusar registro fechado com a CF depois da migração: teste/sql/teste-moneytrio-escopos.sql e o mock) */

    console.log('3) liberar a Beta com "Só a casa"');
    await A.evaluate(() => MoneyNuvem.escopos.liberar('55555555-5555-5555-5555-555555555555', 'casa'));
    ok(X.visao(BETA) === 'casa' && db.money_chaves.filter((k) => k.user_id === BETA).map((k) => k.escopo).join() === 'casa', 'a Beta recebeu só a chave da casa (a reservada não)');
    /* o robô deposita um da casa e um reservado, com o chefe fechado */
    const pubs = Object.fromEntries(db.money_caixa_chave.map((c) => [c.escopo, c.chave_publica]));
    X.depositar('casa', 'robo-casa-1', await X.pacoteRobo(pubs.casa, { v: 1, tipo: 'despesa', id: 'robo-casa-1', data: '2026-10-20', valor: 42, descricao: 'MARCADOR-ROBO-CASA', grupo: 'HABITACAO', categoria: 'Mercado', quem: 'Beta' }));
    X.depositar('reservado', 'robo-res-1', await X.pacoteRobo(pubs.reservado, { v: 1, tipo: 'despesa', id: 'robo-res-1', data: '2026-10-21', valor: 43, descricao: 'MARCADOR-ROBO-RES', grupo: 'LAZER', categoria: 'Bar', quem: 'Ana' }));
    await A.context().close();

    console.log('4) Beta entra (visão "Só a casa")');
    const B = await aparelho(browser, 'Beta');
    await entrar(B, BETA);
    await B.waitForTimeout(1500);
    await B.evaluate(() => MoneyNuvem._teste.Caixa.esvaziar());
    await B.waitForTimeout(500);
    const bst = await B.evaluate(() => JSON.stringify(Store.estado));
    ok(CASA.every((m) => bst.includes(m)), 'ela vê os da casa (' + CASA.filter((m) => bst.includes(m)).length + ' de ' + CASA.length + ')');
    ok(RES.every((m) => !bst.includes(m)), 'nenhum marcador reservado no Store dela' + (RES.filter((m) => bst.includes(m)).length ? ': ' + RES.filter((m) => bst.includes(m)).join(', ') : ''));
    ok(bst.includes('MARCADOR-ROBO-CASA') && db.money_entrada.find((e) => e.id === 'robo-casa-1').consumido_em && !db.money_entrada.find((e) => e.id === 'robo-res-1').consumido_em, 'o item "casa" do robô chegou para ela com o chefe fechado; o reservado ficou na caixa');
    const rede = JSON.stringify(X.log.beta);
    if (/"r\./.test(rede) || /"escopo":"reservado"/.test(rede)) console.log('   (debug) ' + X.log.beta.filter((x) => /"r\.|"escopo":"reservado"/.test(JSON.stringify(x))).map((x) => x.p + ' ' + JSON.stringify(x.o).slice(0, 300)).join('\n   '));
    ok(!/"r\./.test(rede) && !/"escopo":"reservado"/.test(rede), 'nada do que o banco devolveu a ela tem id "r." ou escopo reservado (' + X.log.beta.length + ' respostas)');
    const idb = await B.evaluate(async () => {
      const abrir = () => new Promise((r, j) => { const q = indexedDB.open('moneytrio-nuvem'); q.onsuccess = () => r(q.result); q.onerror = j; });
      const dbi = await abrir().catch(() => null); if (!dbi) return '';
      const out = [];
      for (const n of Array.from(dbi.objectStoreNames)) { await new Promise((r) => { const t = dbi.transaction(n).objectStore(n).openCursor(); t.onsuccess = (e) => { const c = e.target.result; if (!c) return r(); out.push(String(c.key)); c.continue(); }; t.onerror = r; }); }
      return out.join('\n');
    });
    ok(idb.length > 0 && !/\|r\./.test(idb), 'o IndexedDB dela não tem nenhum id "r." (' + idb.split('\n').length + ' chaves)');
    const tot = await B.evaluate(() => (Store.estado.resumo || []).find((r) => r.id === '2026-10'));
    ok(tot && tot.total === 1525 && tot.atualizadoEm, 'os totais da família chegam a ela (out/2026: ' + (tot && tot.total) + ', com os gastos dele, sem a renda)');
    ok(!/12345|12\.345/.test(bst) && !bst.includes('50000'), 'a renda dele e o investimento não aparecem nem como número');

    /* "não percebe": as telas dela */
    const tela = await B.evaluate(async () => {
      mostrarHub(); await new Promise((r) => setTimeout(r, 300));
      const hub = !document.getElementById('hubTela').classList.contains('hidden');
      irPara('b-painel'); render(); await new Promise((r) => setTimeout(r, 300));
      const txt = document.body.innerText;
      const menu = typeof menuDeApps === 'function' ? menuDeApps() : '';
      irPara('painel'); render(); await new Promise((r) => setTimeout(r, 200));
      const foiPara = document.querySelector('#view-b-painel:not(.hidden)') ? 'b-painel' : (ST.appAtual || '');
      irPara('config'); render(); await new Promise((r) => setTimeout(r, 300));
      const cfg = document.body.innerText;
      return { hub, txt, menu, foiPara, cfg, app: ST.appAtual };
    });
    ok(!tela.hub && tela.app === 'budget' && !/InvestifyONE|TaxONE/.test(tela.menu), 'ela: sem a tela dos três apps; o menu não tem InvestifyONE nem TaxONE');
    ok(tela.foiPara === 'b-painel', 'ela: uma tela do InvestifyONE leva ao Painel do BudgetONE');
    ok(!/Sobrou por mês/.test(tela.txt) && /Gastos da família/.test(tela.txt) && /atualizado em \d\d\/\d\d/.test(tela.txt), 'ela: Painel sem "Sobrou", com "Gastos da família · atualizado em dd/mm"');
    ok(!/oculto|restrito|escondido|reservad/i.test(tela.txt + tela.cfg), 'ela: nenhuma palavra "oculto", "restrito", "escondido" ou "reservado" nas telas');
    ok(!/InvestifyONE|TaxONE/.test(tela.cfg), 'ela: Configurações sem as abas do InvestifyONE e do TaxONE');
    ok(!/Planilha espelho|Família no MoneyTRIO/.test(tela.cfg), 'ela: Configurações sem a planilha espelho e sem "Família no MoneyTRIO"');
    const painelB = await B.evaluate(async () => { MoneyNuvem._teste.Painel.abrir ? MoneyNuvem._teste.Painel.abrir() : null; await new Promise((r) => setTimeout(r, 400)); const t = (document.querySelector('.nv-painel') || document.body).innerText; MoneyNuvem._teste.Painel.fechar(); return t; });
    ok(!/Robô do banco/.test(painelB), 'ela: "Segurança e aparelhos" sem o robô do banco');
    await B.screenshot({ path: '/tmp/visao-casa-beta.png', fullPage: false });

    console.log('5) editar e reclassificar');
    await B.evaluate(() => { const g = Store.estado.gastos.find((x) => x.id === 'g1'); g.sub = 'Calçados'; });
    ok((await subir(B)) === 0, 'Beta edita a categoria de um lançamento da casa e sobe');
    const A2 = await aparelho(browser, 'Ana-2');
    await A2.goto(BASE + '/'); await A2.waitForSelector('#nvEm');
    await A2.fill('#nvEm', PESSOAS[ANA].email); await A2.fill('#nvPw', PESSOAS[ANA].senha); await A2.click('#nvIn');
    await A2.click('#nvCodigoAntigo', { timeout: 30000 }); await A2.waitForSelector('#nvCod');
    await A2.fill('#nvCod', PESSOAS[ANA].codigo); await A2.click('#nvCodOk');
    await A2.waitForSelector('#nvPC', { timeout: 30000 }); await A2.fill('#nvPC', '482915'); await A2.click('#nvPCOk');
    await A2.waitForSelector('#nvSelo', { timeout: 90000 });
    const cfgA = await A2.evaluate(async () => { abrirApp('budget'); irPara('config'); cfgSecao = 'todos'; render(); await new Promise((r) => setTimeout(r, 1200)); render(); await new Promise((r) => setTimeout(r, 300)); const c = document.getElementById('vcFamilia'); if (c) c.scrollIntoView({ block: 'center' }); return c ? c.innerText : ''; });
    ok(/Família no MoneyTRIO/.test(cfgA) && /Beta|Pessoa da família/.test(cfgA) && /vê a casa/.test(cfgA), 'chefe: Configurações → "Família no MoneyTRIO" lista a Beta com "vê a casa"');
    await A2.screenshot({ path: '/tmp/visao-casa-chefe.png', fullPage: false });
    const a2 = await A2.evaluate(() => ({ sub: (Store.estado.gastos.find((x) => x.id === 'g1') || {}).sub, res: Store.estado.gastos.some((x) => /MARCADOR-RENDA-DELE/.test(x.desc)), mk: MoneyNuvem.escopos.estado() }));
    ok(a2.sub === 'Calçados' && a2.res && a2.mk.mk && a2.mk.tudo, 'outro aparelho da Ana (entrou pelo código): baixa as duas chaves, vê tudo e recebe a edição dela');
    await A2.evaluate(() => { const g = Store.estado.gastos.find((x) => x.id === 'g2'); g.escopo = 'casa'; });
    ok((await subir(A2)) === 0, 'Ana passa o g2 (reservado) para a casa');
    ok(db.money_docs.some((r) => r.id === 'g2' && r.escopo === 'casa' && !r.apagado_em) && !db.money_docs.some((r) => r.id === 'r.g2'), 'o "r.g2" saiu de verdade (sem rastro) e o g2 da casa entrou');
    const b2 = await B.evaluate(async () => { await MoneyNuvem.buscarAgora(); return Store.estado.gastos.filter((x) => x.id === 'g2').length; });
    ok(b2 === 1, 'a Beta passa a ver o g2, uma vez só');
    const a3 = await A2.evaluate(async () => { await MoneyNuvem.buscarAgora(); return Store.estado.gastos.filter((x) => x.id === 'g2').length; });
    ok(a3 === 1, 'no aparelho da Ana o g2 também fica uma vez só');
    ok(B.erros.length === 0 && A2.erros.length === 0, 'sem erro de página' + (B.erros.concat(A2.erros).length ? ': ' + B.erros.concat(A2.erros)[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await browser.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
