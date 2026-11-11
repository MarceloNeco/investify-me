/* =====================================================================
   teste/teste-pessoas-espelho.js — 3.64: pessoas, IR do robô, tipo desconhecido, estorno, saldo do banco,
   indicadores, palpite e planilha espelho (nuvem.js 1.11.0; modulos/pessoas, espelho, saldo-banco, indicadores)
   ---------------------------------------------------------------------
   A. Neste aparelho (sem nuvem), com dados de mentira:
      IR "IRPF (saúde…)" → irpf; 'saldo' e tipo desconhecido nunca viram lançamento; estorno negativo na categoria do
      original (abate o "Para onde foi", não é renda) e a migração dos antigos; conferência com o saldo do banco;
      indicadores do mês; pessoas (migração dos apelidos, PJ empresa, renomear muda em tudo, campo com texto livre e
      "+ cadastrar", "é a mesma pessoa?"); quem pagou × para quem; IR pelo beneficiário; profissional; palpite.
   B. Com a nuvem (o Supabase de mentira de teste/mock-sol.js): o pacote do espelho igual ao vetor
      (teste/espelho/vetor-espelho.json); a fila sem internet (fechada no IndexedDB) e o envio ao voltar; o robô abre
      o pacote com a privada dele; membro sem permissão e robô sem chave: a fila espera; membros da família no cadastro.
   Tudo fictício. Uso (na pasta raiz): node teste/teste-pessoas-espelho.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const { SB, M, db, supabase, prepararChaves, PESSOAS, ANA, GID } = require('./mock-sol');
const RAIZ = path.join(__dirname, '..');
const VETOR = JSON.parse(fs.readFileSync(path.join(__dirname, 'espelho', 'vetor-espelho.json'), 'utf8'));
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
function servidor() {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
  const s = http.createServer((req, res) => {
    const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}
/* o robô abre o pacote (como o Python dele): ECDH com a privada → HKDF → AES-GCM */
function abrirComoRobo(pacote, gid) {
  const pk = JSON.parse(pacote), ec = crypto.createECDH('prime256v1'); ec.setPrivateKey(Buffer.from(VETOR.robo_privada_hex, 'hex'));
  const seg = ec.computeSecret(Buffer.concat([Buffer.from([4]), Buffer.from(pk.epk.x, 'base64url'), Buffer.from(pk.epk.y, 'base64url')]));
  const k = Buffer.from(crypto.hkdfSync('sha256', seg, Buffer.alloc(32), Buffer.from('money-espelho-v1|' + gid), 32));
  const raw = Buffer.from(pk.ct, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(pk.iv, 'base64'));
  d.setAAD(Buffer.from(gid)); d.setAuthTag(raw.subarray(raw.length - 16));
  return JSON.parse(Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString('utf8'));
}
const IND_HOJE = '2027-03-15', mes = '2027-03', mesAnt = '2027-02';   /* indicadores: meses só deles (o resto do teste é de 2026) */
const LOCAL = { v: 1, config: {}, posicoes: [], gastos: [
  { id: 'a1', data: '2026-09-02', valor: 80, grupo: 'HABITACAO', sub: 'Mercado', desc: 'MERCADO EXEMPLO', quem: 'Zeca', fluxo: 'saida' },
  { id: 'a2', data: '2026-09-03', valor: 60, grupo: 'LAZER', sub: 'Cinema', desc: 'CINEMA EXEMPLO', quem: 'zeca', fluxo: 'saida' },
  { id: 'a3', data: '2026-09-04', valor: 90, grupo: 'PESSOAL', sub: 'Roupa', desc: 'LOJA EXEMPLO', quem: 'Lulu', fluxo: 'saida' },
  { id: 'a4', data: '2026-09-05', valor: 5000, grupo: 'RENDA', sub: 'Serviços', desc: 'NOTA FISCAL', quem: 'PJ', fluxo: 'entrada' },
  { id: 'a5', data: '2026-09-06', valor: 40, grupo: 'LAZER', sub: 'Bar', desc: 'BAR EXEMPLO', quem: 'ZECA M', fluxo: 'saida' },
  { id: 'a6', data: '2026-09-07', valor: 30, grupo: 'PESSOAL', sub: 'Presente', desc: 'LOJA DOIS', quem: 'Vizinho Teo', fluxo: 'saida' }],
  recorrentes: [{ id: 'r1', nome: 'Escola Exemplo', valor: 900, grupo: 'DEPENDENTES', sub: 'Escola', regra: 'dia', dia: 5, quem: 'Lulu', pagador: 'Zeca' }] };

async function parteA(b, BASE) {
  console.log('A. neste aparelho (sem nuvem)');
  for (const vp of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e))); p.on('dialog', (d) => d.accept()); p.on('console', (m) => { if (m.type() === 'log') console.log('    [página] ' + m.text()); });
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 1 && window.Pessoas);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });
    await p.waitForTimeout(400);
    const W = vp.width;
    if (W === 1366) {
      /* ---- IR do robô e tipos ---- */
      const ir = await p.evaluate(() => { const C = MoneyNuvem._teste.Caixa, base = { id: 'x', data: '2026-10-05', valor: 250, tipo: 'despesa', grupo: 'SAUDE', categoria: 'Terapias (TO/Fono/Psicopedagogia)', descricao: 'CLINICA EXEMPLO' };
        const c = (ir) => C.converter(Object.assign({}, base, { ir: ir }));
        return { saude: c('IRPF (saúde - dependente)'), irpf: c('IRPF').irpf, edu: c('irpf (educação)').irpf, sim: c('sim').irpf, vazio: c('').irpf, nao: c('não').irpf, verdade: c(true).irpf,
          saldo: C.converter({ id: 's', tipo: 'saldo', valor: 10 }), outro: C.converter({ id: 'q', tipo: 'investimento', valor: 10 }), conhece: Object.keys(C.TIPOS) }; });
      ok(ir.saude.irpf === true && ir.saude.irTexto === 'IRPF (saúde - dependente)' && ir.irpf && ir.edu && ir.sim && ir.verdade && !ir.vazio && !ir.nao,
        'IR do robô: "IRPF (saúde…)", "IRPF", "irpf (educação)", "sim" e true marcam o IR; vazio e "não" não; o texto fica guardado (irTexto)');
      ok(ir.saldo === null && ir.outro === null, "tipo 'saldo' e tipo desconhecido nunca viram lançamento (converter devolve null)");
      /* ---- pessoas: migração ---- */
      const mig = await p.evaluate(() => { Pessoas.migrar(); Store.salvar(); const l = Pessoas.todas();
        return { n: l.length, nomes: l.map((x) => Pessoas.rotulo(x) + ':' + x.tipo).sort(), zecaMesmo: Gasto.todos().find((g) => g.id === 'a1').quemId === Gasto.todos().find((g) => g.id === 'a2').quemId,
          pj: (l.find((x) => x.nome === 'PJ') || {}).tipo, rec: Recorrente.todos()[0], revisar: ST.config.pessoasRevisar, solto: Gasto.todos().find((g) => g.id === 'a5') }; });
      ok(mig.zecaMesmo && mig.pj === 'empresa' && mig.revisar === true && mig.rec.quemId && mig.rec.pagadorId,
        'migração: "Zeca" e "zeca" viram a mesma pessoa, "PJ" vira empresa, o compromisso guarda o ID de "para quem" e de "quem paga", o dono revisa uma vez (' + mig.nomes.join(', ') + ')');
      ok(mig.n === 4 && mig.nomes.indexOf('Vizinho Teo:casa') >= 0 && !mig.solto.quemId, 'migração: 4 pessoas (Zeca, Lulu, PJ, Vizinho Teo com o nome inteiro de apelido); "ZECA M" fica sem pessoa, para perguntar');
      /* ---- renomear muda em tudo ---- */
      const ren = await p.evaluate(() => {
        const z = Pessoas.achar('Zeca'); Pessoas.salvar({ id: z.id, tipo: 'casa', papel: 'responsavel', nome: 'Carlos', sobrenome: 'Exemplo', apelido: '', banco: (z.banco || []).concat(['ZECA']) });
        const l = Pessoas.achar('Lulu'); Pessoas.salvar({ id: l.id, tipo: 'casa', papel: 'dependente', nome: 'Lulu', banco: l.banco });
        Store.salvar(); render();
        const l2 = Pessoas.achar('Lulu'); Pessoas.salvar({ id: l2.id, tipo: 'casa', papel: 'dependente', nome: 'Luiza', apelido: 'Lu', banco: [] });
        const velho = Gasto.arruma({ data: '2026-09-09', valor: 1, grupo: 'PESSOAL', sub: 'X', desc: 'Y', quem: 'Lulu' });   /* chega de outro aparelho com o nome velho */
        Pessoas.salvar({ id: l2.id, tipo: 'casa', papel: 'dependente', nome: 'Lulu', apelido: '', banco: Pessoas.porId(l2.id).banco });
        return { g1: Gasto.todos().find((g) => g.id === 'a1').quem, g2: Gasto.todos().find((g) => g.id === 'a2').quem, rec: Recorrente.todos()[0].pagador, achaZeca: Pessoas.rotulo(Pessoas.achar('zeca')), velho: [velho.quem, velho.quemId === l2.id] };
      });
      ok(ren.g1 === 'Carlos' && ren.g2 === 'Carlos' && ren.rec === 'Carlos' && ren.achaZeca === 'Carlos' && ren.velho.join('|') === 'Lu|true', 'renomear "Zeca" para "Carlos" muda nos lançamentos e no compromisso na hora; "zeca" (o apelido do banco) continua achando a pessoa; o nome de antes também (registro que chega de outro aparelho)');
      /* ---- "é a mesma pessoa?" e "A identificar" ---- */
      await p.evaluate(() => { Gasto.add({ data: '2026-09-08', valor: 25, grupo: 'PESSOAL', sub: 'Presente', desc: 'PIX AVULSO', quem: 'Fulano Tal' }); Store.salvar(); irPara('cfg-pessoas'); }); await p.waitForTimeout(300);
      const tel = await p.evaluate(() => ({ q: [...document.querySelectorAll('#view-cfg-pessoas .ps-q')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), rev: !!document.querySelector('.ps-revise') }));
      ok(tel.q.some((t) => /ZECA M/.test(t) && /Carlos\?/.test(t)) && tel.q.some((t) => /Fulano Tal/.test(t)) && tel.rev,
        'tela das pessoas: "ZECA M" pergunta "é Carlos?" (parecido, sem certeza: não entra como certo e a migração não cria outra pessoa); "Fulano Tal" (chegou depois) fica em "A identificar"; aviso de revisar a lista');
      await p.screenshot({ path: '/tmp/pessoas-1366.png', fullPage: true });
      await p.click('[data-acao="ps-e-sim"][data-texto="ZECA M"]'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => Gasto.todos().find((g) => g.id === 'a5').quem === 'Carlos' && !!Gasto.todos().find((g) => g.id === 'a5').quemId), '"Sim" uma vez: o lançamento de "ZECA M" vira Carlos e o nome entra nos apelidos do banco');
      /* ---- campo com texto livre ---- */
      await p.evaluate(() => { irPara('b-lanc'); abrirLancamento(); }); await p.waitForTimeout(300);
      await p.fill('#glValor', '45'); await p.fill('#glDesc', 'FARMACIA TESTE');
      await p.fill('#glQuem', 'zeca'); await p.dispatchEvent('#glQuem', 'input');
      const dica1 = await p.evaluate(() => (document.querySelector('#glQuem + .ps-dica') || {}).textContent || '');
      await p.fill('#glParaQuem', 'Prima Nina'); await p.dispatchEvent('#glParaQuem', 'input');
      const dica2 = await p.evaluate(() => (document.querySelector('#glParaQuem + .ps-dica') || {}).textContent || '');
      ok(!/cadastrar/.test(dica1) && /cadastrar esta pessoa/.test(dica2), 'campo de pessoa: "zeca" bate no apelido (sem aviso); "Prima Nina" não bate e mostra "+ cadastrar esta pessoa"');
      await p.evaluate(() => salvarLancamento ? 0 : 0).catch(() => {});
      await p.click('#assetModal .btn.primary'); await p.waitForTimeout(300);
      const novo = await p.evaluate(() => Gasto.todos().find((g) => g.desc === 'FARMACIA TESTE'));
      ok(novo && novo.quem === 'Carlos' && novo.quemId && novo.paraQuem === 'Prima Nina' && !novo.paraQuemId, 'salvo: "zeca" virou Carlos (com o ID); "Prima Nina" ficou como texto livre, sem obrigar cadastro');
      /* ---- quem pagou × para quem; IR pelo beneficiário ---- */
      const pg = await p.evaluate(() => {
        const r = Recorrente.todos()[0], g = Pagamento.lancar({ data: '2026-10-05', valor: 900, r: r });
        const g2 = Gasto.add({ data: '2026-10-06', valor: 300, grupo: 'SAUDE', sub: 'Consultas', desc: 'CONSULTA X', quem: 'Lulu', paraQuem: 'Carlos', irpf: true });
        return { quem: g && g.quem, para: g && g.paraQuem, dep: Tax.daPessoa(g, 'Carlos'), depOutro: Tax.daPessoa(g, 'Lulu'), adulto: Tax.daPessoa(g2, 'Carlos'), adultoPagou: Tax.daPessoa(g2, 'Lulu') };
      });
      ok(pg.quem === 'Carlos' && pg.para === 'Lulu', 'pagamento do compromisso: "Quem paga" vira quem pagou (Carlos) e "Para quem é" vira o beneficiário (Lulu)');
      ok(pg.dep && !pg.depOutro && pg.adulto && !pg.adultoPagou, 'IR: gasto de dependente (Lulu) vale para quem pagou (Carlos); de adulto, vale para o beneficiário, não para quem pagou');
      /* ---- profissional: beneficiário fica, pagante vem da conta ---- */
      const pr = await p.evaluate(() => {
        Gasto.add({ id: 'p1', data: '2026-10-07', valor: 400, grupo: 'OUTROS', sub: '', desc: 'PIX CLINICA REABILITA EXEMPLO', quem: 'Carlos', origem: 'robo', idRobo: 'p1' });
        const r = Profissionais.confirmar(Profissionais.chave('CLINICA REABILITA EXEMPLO'), { nome: 'Clínica Exemplo', grupo: 'SAUDE', sub: SUB_TERAPIAS, paraQuem: 'lulu', irpf: true });
        const g = Gasto.add({ data: '2026-10-14', valor: 400, grupo: 'OUTROS', sub: '', desc: 'PIX CLINICA REABILITA EXEMPLO', quem: 'Prima Nina', origem: 'robo', idRobo: 'p2' });
        const g1 = Gasto.todos().find((x) => x.id === 'p1');
        return { g1: [g1.quem, g1.paraQuem, g1.sub, g1.irpf, !!g1.paraQuemId], g2: [g.quem, g.paraQuem, g.sub, g.irpf], arv: Gasto.arvore().SAUDE.indexOf(SUB_TERAPIAS) >= 0 };
      });
      ok(pr.g1.join('|') === 'Carlos|Lulu|' + 'Terapias (TO/Fono/Psicopedagogia)|true|true' && pr.g2.join('|') === 'Prima Nina|Lulu|Terapias (TO/Fono/Psicopedagogia)|true' && pr.arv,
        'profissional confirmado: "Para quem" vira a pessoa (Lulu, com ID), categoria Terapias com IR; outra pessoa pagando o mesmo profissional muda só o "quem pagou"');
      /* ---- estorno ---- */
      const es = await p.evaluate(() => {
        const C = MoneyNuvem._teste.Caixa;
        Gasto.add({ id: 'o1', data: '2026-10-01', valor: 300, grupo: 'LAZER', sub: 'Restaurante', desc: 'RESTAURANTE EXEMPLO', origem: 'robo', idRobo: 'o1', descRobo: 'RESTAURANTE EXEMPLO' });
        const antes = Gasto.porChave(Gasto.todos().filter((g) => g.fluxo === 'saida'), 'grupo').find((x) => x.chave === 'LAZER').valor;
        const ent0 = Gasto.todos().filter((g) => g.fluxo === 'entrada').reduce((s, g) => s + g.valor, 0);
        const e = Gasto.add(C.converter({ id: 'e1', data: '2026-10-10', valor: -100, tipo: 'despesa', grupo: 'RENDA', categoria: 'Estorno', descricao: 'RESTAURANTE EXEMPLO' }));
        const sem = C.converter({ id: 'e2', data: '2026-10-10', valor: -20, tipo: 'despesa', grupo: 'PESSOAL', categoria: 'Roupa', descricao: 'NADA PARECIDO' });
        const depois = Gasto.porChave(Gasto.todos().filter((g) => g.fluxo === 'saida'), 'grupo').find((x) => x.chave === 'LAZER').valor;
        const ent1 = Gasto.todos().filter((g) => g.fluxo === 'entrada').reduce((s, g) => s + g.valor, 0);
        /* um estorno de antes (Renda · Estorno) */
        ST.gastos.push(Gasto.arruma({ id: 'rb_v1', data: '2026-10-11', valor: 50, grupo: 'RENDA', sub: 'Estorno', desc: '↩ Estorno · Restaurante · RESTAURANTE EXEMPLO', origem: 'robo', idRobo: 'v1', revisar: true }));
        delete ST.config.estornosV; const nm = C.migrarEstornos(); const v = Gasto.todos().find((g) => g.id === 'rb_v1');
        return { e: [e.grupo, e.sub, e.valor, e.estorno, e.estornoDe], antes, depois, ent0, ent1, sem: [sem.grupo, sem.sub, sem.valor], nm, v: [v.grupo, v.sub, v.valor, v.estorno, v.revisar] };
      });
      ok(es.e.join('|') === 'LAZER|Restaurante|-100|true|o1', 'estorno: lançamento NEGATIVO na categoria do gasto de origem (Lazer · Restaurante), ligado a ele');
      ok(Math.abs(es.antes - es.depois - 100) < 0.01 && es.ent0 === es.ent1, 'estorno abate 100 do "Para onde foi" (Lazer ' + es.antes + ' → ' + es.depois + ') e não conta como renda');
      ok(es.sem.join('|') === 'PESSOAL|Roupa|-20', 'estorno sem original nos 120 dias: fica na categoria que o robô mandou');
      ok(es.nm === 1 && es.v.join('|') === 'LAZER|Restaurante|-50|true|false', 'migração: o estorno antigo (Renda · Estorno) vira negativo na categoria do original');
      /* ---- conferência com o saldo do banco ---- */
      const sb = await p.evaluate(() => {
        SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-c1-2026-10-01', banco: 'Banco Teste', conta: 'Corrente', dono: 'Carlos', saldo: 1000, data: '2026-10-01', moeda: 'BRL' });
        Gasto.add({ data: '2026-10-03', valor: 200, grupo: 'HABITACAO', sub: 'Mercado', desc: 'MERCADO BT', conta: 'Banco Teste', origem: 'robo', idRobo: 'bt1' });
        Gasto.add({ data: '2026-10-04', valor: 500, grupo: 'RENDA', sub: 'Serviços', desc: 'PIX RECEBIDO', conta: 'Banco Teste', origem: 'robo', idRobo: 'bt2' });
        SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-c1-2026-10-05', banco: 'Banco Teste', conta: 'Corrente', saldo: 1300, data: '2026-10-05' });
        const c1 = SaldoBanco.conferir(SaldoBanco.contas()[0]);
        SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-c1-2026-10-08', banco: 'Banco Teste', conta: 'Corrente', saldo: 1250, data: '2026-10-08' });
        SaldoBanco.receber({ tipo: 'saldo', id: 'saldo-k1-2026-10-08', banco: 'Banco Teste', conta: 'Cartão Visa', saldo: -830, data: '2026-10-08' });
        const c2 = SaldoBanco.conferir(SaldoBanco.contas()[0]);
        const n0 = Gasto.todos().length; Store.salvar(); irPara('b-painel');
        const card = (document.querySelector('.sb-card') || {}).textContent || '';
        return { c1, c2, n: Gasto.todos().length === n0, card, hist: SaldoBanco.contas()[0].hist.length, ab: SaldoBanco.contas()[0].abertura };
      });
      ok(sb.c1.dif === 0 && sb.c1.app === 1300, 'saldo: abertura 1.000 + 500 − 200 = 1.300 pelo app, igual ao banco (bate)');
      ok(Math.abs(sb.c2.dif + 50) < 0.01 && sb.c2.desde === '2026-10-05' && /diferença de/.test(sb.card) && /05\/10/.test(sb.card) && /fatura em aberto/.test(sb.card),
        'saldo: o banco diz 1.250 → "diferença de R$ -50 desde 05/10" no Painel, com o link para os lançamentos; cartão mostra a fatura em aberto');
      ok(sb.n && sb.hist === 3 && sb.ab.saldo === 1000, "saldo nunca vira lançamento; histórico por conta; o primeiro saldo é o ajuste de abertura");
      /* ---- indicadores ---- */
      const ind = await p.evaluate(([mes, mesAnt]) => {
        const d = (m, dia) => m + '-' + String(dia).padStart(2, '0');
        [[mes, 10000, 7000, 2000], [mesAnt, 10000, 8000, 4500]].forEach(([m, r, g, dv]) => {
          Gasto.add({ data: d(m, 2), valor: r, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO TESTE' });
          Gasto.add({ data: d(m, 3), valor: dv, grupo: 'HABITACAO', sub: 'Financiamento', desc: 'PRESTACAO CASA' });
          Gasto.add({ data: d(m, 4), valor: g - dv, grupo: 'HABITACAO', sub: 'Mercado', desc: 'MERCADO MES' });
        });
        ST.posicoes.push({ id: 'pos1', tipo: 'caixa', nome: 'Conta remunerada', ticker: 'BRL', qtd: 1, moeda: 'BRL', valorManual: 15000, preco: 15000, pm: 15000 });
        const c = Indicadores.calcular('2027-03-15');
        return { poup: [c.poup.a, c.poup.b], div: [c.div.a, c.div.b], fp: Indicadores.frase('poup', c.poup.a, c.poup.b), fd: Indicadores.frase('div', c.div.a, c.div.b),
          faixa: [Indicadores.faixaDividas(0.2), Indicadores.faixaDividas(0.35), Indicadores.faixaDividas(0.45)], res: c.reserva, peso: Indicadores.pesoGrupos(Gasto.todos().filter((g) => (g.data || '').slice(0, 7) === mes)) };
      }, [mes, mesAnt]);
      ok(Math.abs(ind.poup[0] - 0.3) < 1e-9 && Math.abs(ind.poup[1] - 0.2) < 1e-9 && ind.fp === 'Sobrou 30% da renda (mês passado: 20%).', 'taxa de poupança: 30% × 20% e a frase "' + ind.fp + '"');
      ok(Math.abs(ind.div[0] - 0.2) < 1e-9 && Math.abs(ind.div[1] - 0.45) < 1e-9 && /faixa saudável/.test(ind.fd) && ind.faixa.join() === 'ok,atencao,alto', 'dívidas e parcelas: 20% (saudável) × 45% e as faixas de leitura como referência — "' + ind.fd + '"');
      ok(ind.res.liquido >= 1250 && ind.res.media > 0 && ind.res.meses != null, 'meses de reserva: liquidez imediata (' + Math.round(ind.res.liquido) + ') ÷ gasto médio de 6 meses (' + Math.round(ind.res.media) + ') = ' + (ind.res.meses || 0).toFixed(1));
      ok(ind.peso.length && ind.peso[0].grupo === 'HABITACAO' && Math.abs(ind.peso[0].pct - 0.7) < 1e-9, 'peso de cada grupo na renda: Habitação 70% no mês');
      const painel = await p.evaluate(() => { irPara('b-painel'); return { ind: !!document.querySelector('.ind-card'), peso: ((document.querySelector('.ind-peso') || {}).textContent || '') }; });
      ok(painel.ind && /Peso na renda/.test(painel.peso), 'Painel: o cartão dos indicadores e o "Peso na renda" no "Para onde foi"');
      /* ---- palpite ---- */
      const pa = await p.evaluate(() => {
        const C = MoneyNuvem._teste.Caixa;
        const g = C.converter({ id: 'pp1', data: '2026-10-09', valor: 70, tipo: 'despesa', grupo: 'LAZER', categoria: 'Bar', descricao: 'BAR NOVO', confianca: 'palpite' });
        const velho = C.converter({ id: 'pp2', data: '2026-10-09', valor: 70, tipo: 'despesa', grupo: 'LAZER', categoria: 'Bar', descricao: 'BAR VELHO' });
        if (g.confianca) g.revisar = true; Gasto.add(g);
        const tot0 = JSON.stringify(Gasto.porChave(Gasto.todos().filter((x) => x.fluxo === 'saida'), 'grupo'));
        bFiltro = { busca: '', grupos: [], subs: [], quem: [], formas: [], de: '', ate: '', fluxo: '', periodo: 'tudo', favoritos: false, revisar: true, irpf: false }; irPara('b-lanc');
        const linha = (document.querySelector('[data-bid="rb_pp1"] .esp-palpite') || {}).textContent || '';
        document.querySelector('[data-bid="rb_pp1"] [data-acao="esp-confirmar"]').click();
        const depois = Gasto.todos().find((x) => x.id === 'rb_pp1');
        const tot1 = JSON.stringify(Gasto.porChave(Gasto.todos().filter((x) => x.fluxo === 'saida'), 'grupo'));
        const txt = Espelho.texto(depois, 'upsert', { regra: Espelho.regraDe(depois, true) });
        return { conf: g.confianca, rev: g.revisar, velho: velho.confianca, linha, depois: [depois.confianca, depois.revisar], igual: tot0 === tot1, txt };
      });
      ok(pa.conf === 'palpite' && pa.rev && pa.velho === undefined, "palpite do robô: lançamento novo marcado para conferir; sem o campo (dado antigo) não é palpite");
      ok(/palpite do robô/.test(pa.linha) && /Confirmar categoria/.test(pa.linha) && pa.depois[0] === undefined && pa.depois[1] === false && pa.igual,
        'a linha mostra "palpite do robô · ✓ Confirmar categoria"; um toque confirma; Painel e gráficos não mudam');
      ok(pa.txt.regra && pa.txt.regra.confirmada === true && pa.txt.regra.desc === 'BAR NOVO' && pa.txt.id === 'pp1' && pa.txt.quem_editou === 'app' && pa.txt.valor === 70 && pa.txt.tipo === 'despesa',
        'o pacote da confirmação leva a regra {desc, grupo, categoria, confirmada: true} e o id do robô');
      const manual = await p.evaluate(() => { const g = Gasto.todos().find((x) => x.desc === 'FARMACIA TESTE'); return [Espelho.texto(g).id, Espelho.texto(g).para_quem, Espelho.linkValido('https://docs.google.com/spreadsheets/d/abc123/edit'), Espelho.linkValido('https://exemplo.com/spreadsheets/x'), Espelho.linkValido('javascript:alert(1)')]; });
      ok(manual[0].indexOf('app_') === 0 && manual[1] === 'Prima Nina' && manual[2] && !manual[3] && !manual[4], 'lançamento feito no app vai como "app_<id>" com "para_quem"; o link da planilha só aceita docs.google.com/spreadsheets');
      /* ---- configurações: pessoas e planilha ---- */
      const cf = await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); return { ps: !!document.querySelector('[data-irpara="cfg-pessoas"]'), esp: !!document.querySelector('#espLink') }; });
      ok(cf.ps && cf.esp, 'Configurações → Compartilhadas: "Pessoas da família" e "Planilha espelho"');
      await p.evaluate(() => document.querySelector('#espLink').closest('.cfg-acc').classList.add('aberta'));
      await p.fill('#espLink', 'https://exemplo.com/x'); await p.click('[data-acao="esp-link"]'); await p.waitForTimeout(150);
      const ruim = await p.evaluate(() => ST.config.espelhoLink || '');
      await p.evaluate(() => document.querySelector('#espLink').closest('.cfg-acc').classList.add('aberta'));
      await p.fill('#espLink', 'https://docs.google.com/spreadsheets/d/abc123/edit'); await p.click('[data-acao="esp-link"]'); await p.waitForTimeout(150);
      const bom = await p.evaluate(() => { window.__aberto = null; window.open = (u, alvo, op) => { window.__aberto = [u, alvo, op]; return null; };
        alternarPerfilMenu(); return { link: ST.config.espelhoLink, menu: /Planilha espelho/.test(document.querySelector('#perfilMenu').textContent) }; });
      await p.click('[data-perfil="espelho"]');
      const aba = await p.evaluate(() => window.__aberto);
      ok(!ruim && bom.link && bom.menu && aba && /^https:\/\/docs\.google\.com\/spreadsheets\//.test(aba[0]) && aba[1] === '_blank' && /noopener/.test(aba[2]), 'link de fora recusado; o da planilha fica salvo e "📄 Planilha espelho" no menu do perfil abre numa aba nova (noopener)');
    } else {
      /* celular: a tela das pessoas e o formulário cabem */
      await p.evaluate(() => { Pessoas.migrar(); irPara('cfg-pessoas'); }); await p.waitForTimeout(300);
      await p.click('[data-acao="ps-novo"]'); await p.waitForTimeout(200);
      await p.selectOption('#psTipo', 'empresa'); await p.waitForTimeout(100);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cnpj: !document.querySelector('#psCnpj').closest('.ps-so-empresa').hidden, sob: document.querySelector('#psSobrenome').closest('.ps-nao-empresa').hidden, cpf: /\bCPF\b/.test(document.querySelector('.ps-form').textContent.replace('CPF o app não pede', '')) }));
      ok(m.sw <= 391 && m.cnpj && m.sob && !m.cpf, 'celular: tela das pessoas sem rolar para o lado; empresa pede CNPJ (opcional) e esconde sobrenome; nenhum campo de CPF');
      await p.fill('#psNome', 'Escola Teste'); await p.fill('#psCnpj', '00.000.000/0001-00'); await p.click('[data-acao="ps-salvar"]'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => { const e = Pessoas.achar('Escola Teste'); return !!e && e.tipo === 'empresa' && e.cnpj === '00.000.000/0001-00'; }), 'empresa cadastrada com CNPJ');
      await p.screenshot({ path: '/tmp/pessoas-390.png', fullPage: true });
    }
    ok(erros.length === 0, 'sem erro de página (' + W + ')' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  }
}

async function parteB(b, BASE) {
  console.log('B. com a nuvem (Supabase de mentira)');
  const E = { chave: 'tem', nega: false, pacotes: [] };
  db.sol_grupo_membros = [{ id: 'm1', grupo_id: GID, user_id: ANA, perfil_id: null, apelido: 'Ana', papel: 'chefe', status: 'ativo' }, { id: 'm2', grupo_id: GID, user_id: null, perfil_id: 'pf-teo', apelido: 'Teo', papel: 'crianca', status: 'ativo' }];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(SB)) {
      const j = (st, o) => route.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
      if (/\/rest\/v1\/rpc\/money_espelho_chave_de$/.test(u)) return E.nega ? j(403, { code: '42501', message: 'Só chefe ou responsável da família.' }) : j(200, E.chave === 'tem' ? VETOR.robo_publica_jwk : null);
      if (/\/rest\/v1\/rpc\/money_espelho_depositar$/.test(u)) { if (E.nega) return j(403, { code: '42501' }); const c = JSON.parse(route.request().postData()); E.pacotes.push(...c.p_pacotes); return j(200, c.p_pacotes.length); }
      if (/\/rest\/v1\/sol_grupo_membros\?/.test(u)) { const g = new URL(u).searchParams.get('grupo_id'); return j(200, db.sol_grupo_membros.filter((m) => 'eq.' + m.grupo_id === g)); }
      return supabase(route);
    }
    if (u.startsWith(BASE)) return route.continue(); return route.abort();
  });
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e))); p.on('dialog', (d) => d.accept());
  M.semPin = true;
  await p.goto(BASE + '/'); await p.waitForSelector('#nvEm');
  await p.fill('#nvEm', PESSOAS[ANA].email); await p.fill('#nvPw', PESSOAS[ANA].senha); await p.click('#nvIn');
  await p.click('#nvCodigoAntigo', { timeout: 20000 }); await p.waitForSelector('#nvCod');
  await p.fill('#nvCod', PESSOAS[ANA].codigo); await p.click('#nvCodOk');
  await p.waitForSelector('#nvP1'); await p.fill('#nvP1', '736251'); await p.fill('#nvP2', '736251'); await p.click('#nvPOk');
  await p.waitForSelector('#nvSelo', { timeout: 90000 });
  M.semPin = false;
  await p.waitForFunction(() => MoneyNuvem.iniciado && window.Pessoas, null, { timeout: 30000 });
  /* o vetor: mesma efêmera e mesmo iv → o mesmo pacote */
  const vet = await p.evaluate(async (V) => {
    const hex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
    const b64u = (u8) => btoa(String.fromCharCode.apply(null, u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const pk = JSON.parse(V.pacote);
    return MoneyNuvem.espelho.selar(V.texto_aberto, V.robo_publica_jwk, V.grupo_id, { efemera: { d: b64u(hex(V.efemera_privada_hex)), x: pk.epk.x, y: pk.epk.y }, iv: hex(V.iv_hex) });
  }, VETOR);
  ok(vet === VETOR.pacote, 'espelho: o app fecha o texto do vetor e dá EXATAMENTE o pacote do vetor (mesma efêmera e iv → mesmo ct)');
  ok(JSON.stringify(abrirComoRobo(vet, VETOR.grupo_id)) === VETOR.texto_aberto, 'o robô (crypto do Node, como o Python) abre o pacote com a privada dele');
  /* sem internet: fica na fila, fechada */
  await ctx.setOffline(true);
  const fila = await p.evaluate(async () => {
    const g = Gasto.add({ data: '2026-10-20', valor: 123.45, grupo: 'LAZER', sub: 'Cinema', desc: 'CINEMA FILA', quem: 'Ana' });
    Espelho.registrar(g, null); await new Promise((r) => setTimeout(r, 400));
    const k = 'espelho|' + MoneyNuvem._teste.Sinc.gid, cru = await MoneyNuvem._teste.IDB.get('kv', k);
    return { n: await MoneyNuvem.espelho.pendentes(), claro: JSON.stringify(cru).indexOf('CINEMA FILA') >= 0, id: g.id };
  });
  ok(fila.n === 1 && !fila.claro && E.pacotes.length === 0, 'sem internet: a edição fica na fila do aparelho (fechada com a chave da família, nada em claro) e nada é mandado');
  await ctx.setOffline(false);
  const n1 = await p.evaluate(() => MoneyNuvem.espelho.enviar());
  const aberto = E.pacotes.length ? abrirComoRobo(E.pacotes[0], GID) : {};
  ok(n1 === 1 && E.pacotes.length === 1 && aberto.id === 'app_' + fila.id && aberto.descricao === 'CINEMA FILA' && aberto.valor === 123.45 && aberto.quem_editou === 'app' && !aberto.regra,
    'voltou a internet: o pacote vai, o robô abre (id app_…, valor positivo, sem regra porque não veio do robô) e a fila esvazia');
  ok(await p.evaluate(() => MoneyNuvem.espelho.pendentes()) === 0, 'fila vazia depois do envio');
  /* correção do robô sem edição da pessoa: nenhum pacote */
  const antes = E.pacotes.length;
  await p.evaluate(async () => { const C = MoneyNuvem._teste.Caixa; const g = Gasto.add(C.converter({ id: 'rx1', data: '2026-10-21', valor: 50, tipo: 'despesa', grupo: 'LAZER', categoria: 'Bar', descricao: 'BAR R' })); C.corrigir(g, C.converter({ id: 'rx1', data: '2026-10-21', valor: 55, tipo: 'despesa', grupo: 'LAZER', categoria: 'Bar', descricao: 'BAR R' })); await MoneyNuvem.espelho.enviar(); });
  ok(E.pacotes.length === antes, 'correção feita pelo robô (sem a pessoa mexer) não gera pacote');
  /* sem permissão e sem chave: a fila espera */
  E.nega = true;
  const sp = await p.evaluate(async () => { const g = Gasto.todos().find((x) => x.desc === 'CINEMA FILA'); Espelho.registrar(Object.assign({}, g, { valor: 130 }), g); await new Promise((r) => setTimeout(r, 300)); const n = await MoneyNuvem.espelho.enviar(); return { n, pend: await MoneyNuvem.espelho.pendentes(), est: MoneyNuvem.espelho.estado().problema }; });
  ok(sp.n === 0 && sp.pend === 1 && sp.est === 'sempermissao', 'membro sem permissão (o banco recusa): nada vai, a fila espera e o app não insiste');
  E.nega = false; E.chave = 'nao';
  const sc = await p.evaluate(async () => ({ n: await MoneyNuvem.espelho.enviar(), pend: await MoneyNuvem.espelho.pendentes(), est: MoneyNuvem.espelho.estado().problema }));
  ok(sc.n === 0 && sc.pend === 1 && sc.est === 'semchave', 'o robô ainda não publicou a chave: a fila espera');
  E.chave = 'tem';
  /* robô: lançamento dele com a categoria mudada pela pessoa → regra */
  const rg = await p.evaluate(async () => {
    const C = MoneyNuvem._teste.Caixa; const g = Gasto.add(C.converter({ id: 'rr1', data: '2026-10-22', valor: 80, tipo: 'despesa', grupo: 'OUTROS', categoria: '', descricao: 'PIX LOJA QUALQUER LTDA' }));
    const antes = Object.assign({}, g); Gasto.atualizar(g.id, { grupo: 'PESSOAL', sub: 'Presente', paraQuem: 'Teo', editadoPessoa: true });
    Espelho.registrar(Gasto.todos().find((x) => x.id === g.id), antes); await new Promise((r) => setTimeout(r, 300));
    return MoneyNuvem.espelho.enviar();
  });
  const ult = E.pacotes.map((x) => abrirComoRobo(x, GID)).find((x) => x.id === 'rr1') || {};
  ok(rg >= 0 && ult.regra && ult.regra.desc === 'PIX LOJA QUALQUER LTDA' && ult.regra.grupo === 'PESSOAL' && ult.regra.categoria === 'Presente' && ult.regra.para_quem === 'Teo' && ult.para_quem === 'Teo',
    'lançamento do robô com a categoria mudada pela pessoa: o pacote leva a regra {desc original, grupo, categoria, para_quem}');
  /* membros da família no cadastro */
  const mb = await p.evaluate(async () => { delete ST.config.pessoasPre; const n = await Pessoas.trazerDaFamilia(); const teo = Pessoas.achar('Teo'), ana = Pessoas.achar('Ana'); return { n, teo: teo && [teo.tipo, teo.papel, teo.perfil], ana: ana && [ana.papel, !!ana.uid] }; });
  ok(mb.teo && mb.teo.join('|') === 'casa|dependente|pf-teo' && mb.ana && mb.ana.join('|') === 'responsavel|true', 'cadastro pré-preenchido com os membros da família na plataforma (criança = dependente, chefe = responsável)');
  ok(erros.length === 0, 'sem erro de página (nuvem)' + (erros.length ? ': ' + erros.join(' | ') : ''));
  await ctx.close();
}

(async () => {
  const s = await servidor(), BASE = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch();
  await prepararChaves();
  try { await parteA(b, BASE); await parteB(b, BASE); }
  catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); s.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
