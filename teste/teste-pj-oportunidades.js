/* =====================================================================
   teste/teste-pj-oportunidades.js — 3.83: FiscalONE gestor de CNPJ (modulos/pj-oportunidades.js, textos/pj-textos.js).
   Dados FICTÍCIOS. Confere: Fator R abaixo de 28% COM A CONTA (pró-labore a mais, DAS V→III, INSS e IR, o que sobra) e acima
   (está bem); exportação de serviço (DAS pago × estimativa com/sem separar); despesa de casa no Simples ("não reduz o DAS");
   a mistura PF × PJ; o cartão da reforma e o "revisar" no 📥; a DRE do mês e do ano; o pacote do contador (resumo, CSV,
   mailto); a checklist da troca de empresas; o glossário fiscal; o contexto do ✨ sem CPF/CNPJ/razão/dados bancários;
   a visão da casa sem nada de PJ.
   Uso: node teste/teste-pj-oportunidades.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const PJ = (id, data, valor, sub, conta, extra) => Object.assign({ id, data, valor, grupo: 'BANCARIOS', sub, desc: sub.toUpperCase(), fluxo: 'saida', conta, irTexto: 'PJ', origem: 'robo' }, extra || {});
const TF = (id, data, valor, sub, banco, desc) => ({ id: 'tf_' + id, data, valor, banco, desc, forma: 'Debito', origem: 'robo', idRobo: id, sub, irTexto: 'PJ' });
const gastos = [], transferencias = [];
for (let k = 0; k < 12; k++) {
  const m = new Date(Date.UTC(2025, 11 + k, 1)).toISOString().slice(0, 7);
  gastos.push(PJ('rb_bs2usd-f' + k + '-c', m + '-05', 20000, 'Faturamento PJ (Cliente Exemplo)', 'BS2 Internacional', { fluxo: 'entrada', grupo: 'RENDA', moeda: 'USD', valorMoeda: 4000, ptax: 5 }));
  gastos.push(PJ('das' + k, m + '-20', 3225, 'IRPF / DARF', 'BS2 PJ', { desc: 'DAS-SIMPLES' }));
  gastos.push(PJ('df' + k, m + '-20', 600, 'IRPF / DARF', 'BS2 PJ', { desc: 'RECEITA FED-DARF' }));
  gastos.push(PJ('ct' + k, m + '-10', 400, 'Mensalidades / Anuidades', 'BS2 PJ', { desc: 'Pagamento boleto - CONTABILIDADE MODELO' }));
  transferencias.push(TF('bs2-pl' + k, m + '-06', 3000, 'Pró-labore PJ → PF', 'BS2 PJ', 'Débito PIX - FULANO EXEMPLO'));
}
gastos.push(PJ('gh1', '2026-11-04', 50, 'A identificar', 'BS2 PJ', { grupo: 'OUTROS', desc: 'GITHUB INC' }));
gastos.push(PJ('tar1', '2026-11-11', 35, 'Outros (Bancarios)', 'BS2 PJ', { desc: 'TARIFA PACOTE' }));
gastos.push(PJ('rest1', '2026-11-12', 80, 'Restaurante', 'BS2 PJ', { grupo: 'LAZER', desc: 'RESTAURANTE EXEMPLO', irTexto: '' }));
gastos.push({ id: 'pfdas', data: '2026-10-20', valor: 3225, grupo: 'OUTROS', sub: 'Impostos', desc: 'DAS-SIMPLES', fluxo: 'saida', conta: 'Banco Exemplo' });
transferencias.push(TF('bs2-lu1', '2026-11-12', 5000, 'Distribuição de lucros PJ → PF', 'BS2 PJ', 'Débito PIX - FULANO EXEMPLO [lucros]'));
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos, transferencias,
  empresas: [{ id: 'emA', cnpj: '11222333000181', razao: 'FULANO EXEMPLO CONSULTORIA LTDA', fantasia: 'Exemplo Consultoria', regime: 'fator-r', situacao: 'ativa', contasRobo: ['BS2 PJ', 'BS2 Internacional'],
    contador: { nome: 'Contabilidade Modelo', contato: 'contador@exemplo.com' }, docs: [{ id: 'd1', tipo: 'cartao-cnpj', nome: 'cartão', arquivoId: '' }], pix: [],
    contas: [{ internacional: true, iban: '99887766', swift: 'EXMPBRSP', rotuloRobo: 'BS2 Internacional' }] },
    { id: 'emB', cnpj: '33444555000191', razao: 'FULANO ANTIGA ME', regime: 'simples', situacao: 'a-encerrar', contasRobo: ['BS2 PJ antiga'], docs: [], pix: [], contas: [] }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PJOport !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PJ._hoje = PJGestao._hoje = PJOport._hoje = '2026-11-13'; });
    const E = '() => ST.empresas.find((x) => x.id === "emA")';

    console.log('1) Fator R');
    const f1 = await p.evaluate(() => { const e = ST.empresas.find((x) => x.id === 'emA'); return { c: PJOport.regras.fatorR(e, '2026-11'), v: PJOport.simples('V', 240000), iii: PJOport.simples('III', 240000) }; });
    ok(f1.v.das === 38700 && f1.iii.das === 17520, 'tabelas da LC 123 com R$ 240.000 em 12 meses: Anexo V R$ 38.700 (16,125%); Anexo III R$ 17.520 (7,3%)');
    ok(f1.c.k === 'fatorRAbaixo' && f1.c.valor === 12666 && /R\$\s?2\.000,00\/mês a mais de pró-labore \(12 meses: R\$\s?24\.000,00\)/.test(f1.c.frase) && /de R\$\s?38\.700,00 para R\$\s?17\.520,00 no ano \(−R\$\s?21\.180,00\)/.test(f1.c.frase) && /11%: R\$\s?2\.640,00/.test(f1.c.frase) && /27,5%: R\$\s?5\.874,00/.test(f1.c.frase) && /sobra R\$\s?12\.666,00 no ano/.test(f1.c.frase),
      'abaixo de 28% (18%): +R$ 2.000/mês de pró-labore → DAS −21.180; menos INSS 2.640 e IR 5.874 = R$ 12.666 no ano (a conta inteira na frase)');
    const f1b = await p.evaluate(() => { const e = ST.empresas.find((x) => x.id === 'emA'); Transferencia.todas().filter((t) => /bs2-pl/.test(t.id)).forEach((t) => { t.valor = 7000; }); const c = PJOport.regras.fatorR(e, '2026-11'); Transferencia.todas().filter((t) => /bs2-pl/.test(t.id)).forEach((t) => { t.valor = 3000; }); return c; });
    ok(f1b.k === 'fatorROk' && /38% : está bem|38%: está bem/.test(f1b.titulo), 'com pró-labore de 7.000: (7.000 + 600) × 12 ÷ 240.000 = 38% → "está bem" (' + f1b.titulo + ')');

    console.log('2) exportação de serviço');
    const x2 = await p.evaluate(() => PJOport.regras.exportacao(ST.empresas.find((x) => x.id === 'emA'), '2026-11'));
    ok(x2.k === 'exportacao' && /100% da receita veio do exterior/.test(x2.frase) && /seria R\$\s?26\.644,95; sem separar, R\$\s?38\.700,00\. Foi pago R\$\s?38\.700,00/.test(x2.frase) && x2.valor === 12055.05, 'DAS pago 38.700 = sem separar; com a exportação separada seria 26.644,95 (38.700 − 240.000 × 16,125% × 31,15%): aviso, diferença R$ 12.055,05 ' + JSON.stringify(x2));
    const x2b = await p.evaluate(() => { Gasto.todos().filter((g) => /^das\d/.test(g.id)).forEach((g) => { g.valor = 2220; }); return PJOport.regras.exportacao(ST.empresas.find((x) => x.id === 'emA'), '2026-11'); });
    ok(x2b.k === 'exportacaoOk', 'DAS pago perto da estimativa separada: "parece separado"');
    await p.evaluate(() => { Gasto.todos().filter((g) => /^das\d/.test(g.id)).forEach((g) => { g.valor = 3225; }); });

    console.log('3) despesas de casa, mistura, reforma');
    const c3 = await p.evaluate(() => { const e = ST.empresas.find((x) => x.id === 'emA'); return { d: PJOport.regras.despesasCasa(e), m: PJOport.regras.mistura(e, '2026-11'), r: PJOport.regras.reforma(e), real: PJOport.regras.despesasCasa(Object.assign({}, e, { regime: 'real' })) }; });
    ok(/Simples Nacional, o imposto é sobre a RECEITA: passar a despesa para a PJ NÃO reduz o DAS/.test(c3.d.frase) && /Só no Lucro Real/.test(c3.d.frase) && c3.real === null, 'despesa de casa no Simples: "não reduz o DAS" (e no Lucro Real a regra não aparece)');
    ok(c3.m && /Mistura PF × PJ: 2 lançamento/.test(c3.m.titulo) && /DAS-SIMPLES/.test(c3.m.frase) && /RESTAURANTE EXEMPLO/.test(c3.m.frase) && /confusão patrimonial/.test(c3.m.frase), 'mistura: o DAS pago no CPF e o restaurante pago pela PJ → "confusão patrimonial"');
    ok(/2027: começa a CBS/.test(c3.r.frase) && /planalto\.gov\.br|gov\.br\/receitafederal/.test(c3.r.fonte), 'reforma: o que muda e quando, com a fonte oficial');
    ok(/Revisar a reforma tributária com o contador \(Exemplo Consultoria\)/.test(await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'pj') || {}).html || '')), '📥: "Revisar a reforma tributária" (a data de revisar passou)');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="pjo-revisei"]');
    ok(await p.evaluate(() => ST.empresas.find((x) => x.id === 'emA').reformaRevisar === '2027-05-13'), '"Revisei" → lembra de novo em 6 meses (13/05/2027)');
    await p.evaluate(() => fechar('genModal'));

    console.log('4) a tela: Oportunidades, DRE, troca, glossário');
    await p.evaluate(() => { abrirApp('tax'); irPara('t-pj'); render(); });
    const t4 = await p.evaluate(() => ({ hrefs: [...document.querySelectorAll('.pjo-item a')].map((a) => a.href), op: document.querySelector('.pjo-card').innerText, regras: [...document.querySelectorAll('.pjo-item')].map((x) => x.dataset.regra), links: [...document.querySelectorAll('.pjo-item a')].every((a) => /^https:\/\/(www\.)?(planalto|gov|www8\.receita)/.test(a.href)) }));
    ok(t4.regras.join() === 'fatorRAbaixo,exportacao,despesasCasa,mistura,reforma' && t4.links && /Por quê:/.test(t4.op) && /Confirme com o seu contador/.test(t4.op) && /✨ Pergunte à IA/.test(t4.op), 'Oportunidades: 5 regras, cada uma com o porquê, a fonte oficial e "confirme com o seu contador"; botão ✨ ' + t4.regras.join() + ' ' + t4.hrefs.join(' '));
    const d4 = await p.evaluate(() => PJOport.dre(ST.empresas.find((x) => x.id === 'emA'), '2026-11-01', '2026-11-31'));
    ok(d4.receita === 20000 && d4.impostos === 3825 && d4.contador === 400 && d4.software === 50 && d4.bancos === 35 && d4.outros === 80 && d4.resultado === 15610 && d4.prolabore === 3000 && d4.lucros === 5000 && d4.sobra === 7610,
      'DRE nov: 20.000 − impostos 3.825 − (contador 400 + software 50 + bancos 35 + outros 80) = 15.610; para a PF 8.000; ficou na PJ 7.610 ' + JSON.stringify(d4));
    ok(/= Resultado\s+R\$\s?15\.610,00/.test(await p.evaluate(() => document.querySelector('.pjo-dre').innerText)), 'a DRE na tela (mês e ano)');
    ok(await p.evaluate(() => !!document.querySelector('.pjo-troca')), 'troca de empresas: a checklist aparece (a antiga está "a encerrar")');
    await p.click('.pjo-troca [data-p="clientes"]');
    ok(await p.evaluate(() => ST.empresas.find((x) => x.id === 'emA').troca.clientes === '2026-11-13'), 'o passo marcado fica guardado, com a data');
    ok(await p.evaluate(() => ['simples-nacional','anexos-simples','fator-r','das','darf-pj','pro-labore','distribuicao-lucros','exportacao-servicos','ibs-cbs','regime-hibrido','tfe'].every((k) => (GLOSSARIO.find((g) => g.k === k) || {}).c === 'FiscalONE') && /planalto\.gov\.br/.test(GLOSSARIO.find((g) => g.k === 'fator-r').pt.medio)), 'glossário fiscal: os 11 verbetes novos no FiscalONE, com o link oficial');
    await p.click('.pjo-glos [data-info="fator-r"]');
    ok(await p.waitForFunction(() => /28%/.test(document.body.innerText) && /Fator R/.test(document.body.innerText), null, { timeout: 3000 }).then(() => true, () => false), 'tocar em "Fator R" abre o verbete');
    await p.evaluate(() => { document.querySelectorAll('.modal-wrap:not(.hidden)').forEach((m) => fechar(m.id)); });

    console.log('5) pacote do contador');
    await p.click('[data-acao="pjo-pacote"]'); await p.waitForSelector('#genModal:not(.hidden) .pjo-pre');
    const k5 = await p.evaluate(() => ({ t: PJOport._ultimo.texto, csv: PJOport._ultimo.csv }));
    ok(/^Pacote do contador — Exemplo Consultoria — 2026-11/.test(k5.t) && /Receita: R\$\s?20\.000,00/.test(k5.t) && /Resultado: R\$\s?15\.610,00/.test(k5.t) && /Documentos guardados no Cofre: cartão/.test(k5.t), 'resumo: DRE do mês e os documentos do Cofre');
    ok(/^data;descricao;conta;categoria;plano;valor\n/.test(k5.csv) && /2026-11-04;GITHUB INC;BS2 PJ;A identificar;software;50/.test(k5.csv), 'CSV dos lançamentos da PJ com o plano de contas');
    const [d1] = await Promise.all([p.waitForEvent('download'), p.click('[data-acao="pjo-baixar"]')]);
    ok(/Pacote do contador/.test(d1.suggestedFilename()) || /download/.test(d1.suggestedFilename()), 'baixar entrega o arquivo');
    await p.evaluate(() => { const o = location; window.__href = ''; });
    const m5 = await p.evaluate(() => { try { document.querySelector('[data-acao="pjo-email"]').click(); } catch (e) {} return PJOport._ultimoMailto; });
    ok(/^mailto:contador@exemplo\.com\?subject=Pacote%20do%20contador/.test(m5) && /Receita%3A%20R\$|Receita%3A%20R%24/.test(m5), 'e-mail pronto para o contador (mailto:)');

    console.log('6) ✨ contexto e visão da casa');
    const ia = await p.evaluate(() => { ST.appAtual = 'tax'; viewAtual = 't-pj'; return IA.contexto(); });
    ok(/App: FiscalONE · tela: t-pj/.test(ia) && /Empresa \(PJ\): Simples Nacional/.test(ia) && /Fator R: 18%/.test(ia) && !/11222333|11\.222\.333|FULANO|99887766|EXMPBRSP/.test(ia), 'contexto do ✨: regime, Fator R, receita e custos; sem CNPJ, razão social nem dados bancários ' + JSON.stringify(ia));
    const v6 = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; const e = ST.empresas.find((x) => x.id === 'emA');
      const r = { c: PJOport.cartoes(e, '2026-11').length, b: MoneyModulos.html('pj.empresa', { e, mes: '2026-11' }), ia: MoneyModulos.itens('ia.contexto', { app: 'tax', tela: 't-pj' }).filter(Boolean).length, ib: (inboxGrupos().find((g) => g.id === 'pj') || { n: 0 }).n }; Escopo.soCasa = o; return r; });
    ok(v6.c === 0 && v6.b === '' && v6.ia === 0 && v6.ib === 0, 'visão da casa: nenhuma oportunidade, nada na tela, nada no ✨ nem no 📥');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
