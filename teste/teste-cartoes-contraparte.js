/* =====================================================================
   teste/teste-cartoes-contraparte.js — 3.65: cartões por conta com vários finais, "Quem usa", contraparte,
   nomes no banco, MCC, categorias novas e a declaração do IR com escolhas. Tudo fictício.
   Uso (na pasta raiz): node teste/teste-cartoes-contraparte.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: {}, posicoes: [], gastos: [], recorrentes: [], pessoas: [
  { id: 'psA', tipo: 'casa', papel: 'responsavel', nome: 'Carlos', meio: 'de Souza', sobrenome: 'Lima', apelido: 'Cacá', banco: [], aliases: ['Cacá'] },
  { id: 'psB', tipo: 'casa', papel: 'responsavel', nome: 'Rita', meio: '', sobrenome: 'Lima', apelido: '', banco: [] },
  { id: 'psC', tipo: 'casa', papel: 'dependente', nome: 'Nina', meio: '', sobrenome: 'Lima', apelido: '', banco: [] }], config: { pessoasV: 2 } };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
  await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e))); p.on('dialog', (d) => d.accept());
  await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Cartoes && window.Contraparte && window.DeclEscolhas);
  await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });

  console.log('cartões por conta');
  const c1 = await p.evaluate(() => {
    const C = MoneyNuvem._teste.Caixa, add = (l) => Gasto.add(C.converter(Object.assign({ tipo: 'despesa', grupo: 'LAZER', categoria: 'Restaurante', banco: 'Banco Teste', cartao: 'MASTERCARD', quem: 'Cacá' }, l)));
    const conta = { id: 'acc-black-1', nome: 'BLACK TESTE MULT' };
    ['6514', '9506', '8341'].forEach((f, i) => add({ id: 'k' + i, data: '2026-10-0' + (i + 1), valor: 100 + i, descricao: 'LOJA ' + i, final: f, conta_cartao: conta }));
    add({ id: 'k9', data: '2026-10-05', valor: 50, descricao: 'LOJA VISA', final: '9392', cartao: 'VISA', conta_cartao: { id: 'acc-visa-2', nome: 'VISA TESTE' } });
    add({ id: 'k10', data: '2026-10-06', valor: 70, descricao: 'LOJA ANTIGA', final: '7777' });   /* sem conta_cartao (dado antigo) */
    const enc = Cartoes.encontrados(); render(); irPara('b-painel');
    return { enc: enc.map((x) => (x.nome || '?') + ':' + x.finais.join(',')), dica: (document.querySelector('.ct-dica') || {}).textContent || '' };
  });
  ok(c1.enc.indexOf('BLACK TESTE MULT:6514,9506,8341') >= 0 && c1.enc.some((x) => /9392/.test(x)), '3 finais da mesma conta viram 1 cartão em "Cartões encontrados" (' + c1.enc.join(' | ') + ')');
  ok(/Encontrei/.test(c1.dica) && /finais 6514, 9506, 8341/.test(c1.dica), 'dica no Painel: "' + c1.dica.slice(0, 110) + '…"');
  /* cadastrar pelo "Dar nome": o formulário vem preenchido; Quem usa = Rita no Visa */
  await p.evaluate(() => { const s = Cartoes.semente(Cartoes.encontrados().find((x) => x.contaId === 'acc-black-1').chave); abrirCartao(null, s); });
  await p.waitForTimeout(200);
  const form = await p.evaluate(() => ({ ap: document.getElementById('ctApelido').value, fins: [...document.querySelectorAll('.ct-f-fim')].map((x) => x.value).join(','), conta: document.getElementById('ctContaId').value, tipos: [...document.querySelectorAll('.ct-f-tipo')].map((x) => x.value).join(',') }));
  ok(form.ap === 'BLACK TESTE MULT' && form.fins === '6514,9506,8341' && form.conta === 'acc-black-1' && /virtual/.test(form.tipos), 'o cadastro abre preenchido (apelido, os 3 finais como virtuais, a conta do cartão)');
  await p.fill('#ctApelido', 'Black'); await p.fill('#ctTitular', 'Carlos');
  await p.selectOption('#ctFecha', '5'); await p.selectOption('#ctVence', '12');
  await p.selectOption('.ct-final:nth-child(1) .ct-f-tipo', 'fisico');
  await p.click('[data-acao="ct-final-mais"]'); await p.fill('.ct-final:last-child .ct-f-fim', '4455'); await p.selectOption('.ct-final:last-child .ct-f-tipo', 'adicional');
  await p.fill('.ct-final:last-child .ct-f-tit', 'Rita');
  await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(100);
  await p.locator('[data-acao="cartao-salvar"]').scrollIntoViewIfNeeded();
  await p.click('[data-acao="cartao-salvar"]'); await p.waitForTimeout(200);
  const c2 = await p.evaluate(() => {
    const c = Banco.cartoes().find((x) => x.contaId === 'acc-black-1'), gs = ['k0', 'k1', 'k2'].map((i) => Gasto.todos().find((g) => g.idRobo === i));
    return { n: Banco.cartoes().length, fins: Cartoes.finais(c).map((f) => f.fim + ':' + f.tipo).join(','), ligados: gs.every((g) => g.cartaoId === c.id), quem: gs.map((g) => g.quem).join(','), id: c.id };
  });
  ok(c2.n === 1 && c2.ligados && c2.fins === '6514:fisico,9506:virtual,8341:virtual,4455:adicional', 'um cartão só para os 3 finais (+ o adicional); as compras antigas ganham o cartão (' + c2.fins + ')');
  ok(c2.quem === 'Cacá,Cacá,Cacá', '"Quem pagou" das compras = o titular (Carlos → mostra o apelido Cacá)');
  const c3 = await p.evaluate((cid) => {
    const C = MoneyNuvem._teste.Caixa;
    const novo = Gasto.add(C.converter({ id: 'k20', tipo: 'despesa', data: '2026-10-20', valor: 30, grupo: 'LAZER', categoria: 'Bar', descricao: 'BAR', final: '1212', conta_cartao: { id: 'acc-black-1', nome: 'BLACK TESTE MULT' }, quem: 'Cacá' }));
    const ad = Gasto.add(C.converter({ id: 'k21', tipo: 'despesa', data: '2026-10-21', valor: 40, grupo: 'LAZER', categoria: 'Bar', descricao: 'BAR 2', final: '4455', conta_cartao: { id: 'acc-black-1' }, quem: 'Cacá' }));
    const c = Banco.cartoes()[0], f = Cartoes.finais(c).find((x) => x.fim === '1212');
    Store.salvar(); irPara('config'); cfgSecao = 'budget'; render();
    const aviso = [...document.querySelectorAll('.ct-novos .ps-q')].map((x) => x.textContent).join(' ');
    const fat = Banco.faturas(c.id).reduce((s, x) => s + x.total, 0);
    return { liga: novo.cartaoId === cid, tipo: f && f.tipo + (f.novo ? '+novo' : ''), aviso, adQuem: ad.quem, fat };
  }, c2.id);
  ok(c3.liga && c3.tipo === 'virtual+novo' && /1212.*virtual \(novo\)/.test(c3.aviso), 'final novo da mesma conta entra sozinho como "virtual (novo)", com aviso discreto para confirmar');
  ok(c3.adQuem === 'Rita', 'compra no adicional (final 4455) vem com "Quem pagou" = a titular do adicional (Rita)');
  ok(c3.fat >= 100 + 101 + 102 + 30 + 40 - 0.01, 'a fatura soma todos os finais do cartão (' + c3.fat + ')');
  /* final sem conta: pergunta uma vez */
  const q = await p.evaluate(() => ({ q: Cartoes.perguntas().map((x) => x.fim), html: [...document.querySelectorAll('.ct-perguntas .ps-q')].map((x) => x.textContent).join(' ') }));
  ok(q.q.indexOf('7777') >= 0 && /final 7777 é de qual cartão/.test(q.html), 'final sem conta do cartão: pergunta "Este final 7777 é de qual cartão?"');
  await p.evaluate((cid) => { document.querySelector('.ct-q-sel[data-fim="7777"]').value = cid; document.querySelector('[data-acao="ct-final-de"][data-fim="7777"]').click(); }, c2.id);
  ok(await p.evaluate((cid) => Gasto.todos().find((g) => g.idRobo === 'k10').cartaoId === cid && Cartoes.perguntas().indexOf('7777') < 0 && !Cartoes.perguntas().length, c2.id), 'respondeu uma vez: a compra entra no cartão e não pergunta de novo');
  /* Quem usa (Visa fica com a Rita) e a parcela da natação */
  const v = await p.evaluate(() => {
    const s = Cartoes.semente(Cartoes.encontrados().find((x) => x.contaId === 'acc-visa-2').chave);
    const c = Banco.salvarCartao({ apelido: 'Visa', fim: s.fim, bandeira: 'visa' }); c.contaId = 'acc-visa-2'; c.titular = 'Carlos'; c.usa = 'Rita'; Pessoas.ligar(c, 'titular', 'titularId'); Pessoas.ligar(c, 'usa', 'usaId'); Cartoes.ligarRetro(c);
    const C = MoneyNuvem._teste.Caixa;
    const g = Gasto.add(C.converter({ id: 'nat8', tipo: 'despesa', data: '2026-11-10', valor: 180, grupo: 'DEPENDENTES', categoria: 'Esportes/Uniformes', descricao: 'ESCOLA DE NATACAO EXEMPLO PARC 08/12', final: '9392', conta_cartao: { id: 'acc-visa-2' }, quem: 'Cacá', para_quem: 'Nina' }));
    const sem = CompromissoDe.doLancamento(g);
    return { quem: g.quem, para: g.paraQuem, antigo: Gasto.todos().find((x) => x.idRobo === 'k9').quem, sem };
  });
  ok(v.quem === 'Rita' && v.para === 'Nina' && v.antigo === 'Rita', '"Quem usa" (Visa com a Rita): quem pagou = Rita, para quem = Nina (e a compra antiga do Visa também)');
  ok(v.sem.ate === '2027-03-10' && v.sem.parcelasFaltam === 4 && v.sem.quem === 'Nina' && v.sem.pagador === 'Rita', '"Virar compromisso" da parcela 08/12: mais 4 parcelas até março (' + v.sem.ate + '), para Nina, pago por Rita');

  console.log('contraparte, nomes no banco e MCC');
  const cp = await p.evaluate(() => {
    const C = MoneyNuvem._teste.Caixa, conv = (l) => C.converter(Object.assign({ tipo: 'despesa', data: '2026-10-10', valor: 200, grupo: 'OUTROS', categoria: '' }, l));
    /* profissional confirmado pelo nome; o CNPJ entra nele */
    Gasto.add(conv({ id: 'pr1', descricao: 'PIX CLINICA EXEMPLO SAUDE', contraparte: { cnpj: '11222333000144', nome: 'CLINICA EXEMPLO SAUDE', meio: 'PIX' } }));
    const r = Profissionais.confirmar(Profissionais.chave('CLINICA EXEMPLO SAUDE'), { nome: 'Clínica Exemplo', grupo: 'SAUDE', sub: 'Consultas', paraQuem: 'Nina', irpf: true });
    /* 1. CNPJ: o nome no banco mudou, mas é o mesmo */
    const g1 = conv({ id: 'pr2', descricao: 'PIX CEX SERVICOS MEDICOS', contraparte: { cnpj: '11222333000144', nome: 'CEX SERVICOS MEDICOS', meio: 'PIX' } });
    /* 2. id_pessoa aprendido num contato */
    const amigo = Pessoas.salvar({ tipo: 'outra', nome: 'Beto Exemplo', apelido: 'Beto' }); amigo.idps = ['abcdefabcdefabcdefabcdef'];
    const g2 = conv({ id: 'pr3', tipo: 'receita', grupo: 'RENDA', categoria: 'Aluguel', descricao: 'PIX RECEBIDO', contraparte: { id_pessoa: 'abcdefabcdefabcdefabcdef', nome: 'ROBERTO E SOBRENOME', meio: 'PIX' } });
    /* 3. nome: só quando bate certinho (nome no banco gerado pelo nome completo) */
    const g3 = conv({ id: 'pr4', descricao: 'PIX', contraparte: { nome: 'CARLOS DE SOUZA', meio: 'PIX' } });
    const g4 = conv({ id: 'pr5', descricao: 'PIX', contraparte: { nome: 'FULANO DESCONHECIDO', meio: 'PIX' } });
    /* MCC: só palpite */
    const g5 = conv({ id: 'mc1', descricao: 'COMPRA 123', final: '6514', contraparte: { mcc: '5912' } });
    const p = Profissionais.lista ? null : (Store.estado.profissionais || []).find((x) => x.id === r.p.id);
    return { g1: [g1.grupo, g1.sub, g1.paraQuem, g1.irpf, g1.reconhecidoPor], g2: [g2.contato, g2.contatoId === amigo.id, g2.reconhecidoPor], g3: [g3.contato, g3.reconhecidoPor], g4: [g4.contato, !!g4.contatoId],
      g5: [g5.grupo, g5.sub, g5.confianca], cnpjs: (p || {}).cnpjs, nomes: Pessoas.nomesDoBanco(Pessoas.porId('psA')), ficha: (() => { irPara('cfg-pessoas'); return document.getElementById('view-cfg-pessoas').textContent; })() };
  });
  ok(cp.cnpjs && cp.cnpjs[0] === '11222333000144', 'ao confirmar o profissional, o CNPJ da outra parte entra nele');
  ok(cp.g1.join('|') === 'SAUDE|Consultas|Nina|true|cnpj', '1º caminho, CNPJ: nome no banco diferente, mesmo profissional (Saúde · Consultas · Nina · IR)');
  ok(cp.g2.join('|') === 'Beto|true|idp', '2º caminho, id_pessoa: o contato é reconhecido mesmo com outro nome no banco');
  ok(cp.g3.join('|') === 'Cacá|nome' && cp.g4.join('|') === 'FULANO DESCONHECIDO|false', '3º caminho, nome: "CARLOS DE SOUZA" bate no nome no banco gerado; nome desconhecido fica "A identificar"');
  ok(cp.nomes.join('|') === 'CARLOS DE SOUZA|CARLOS L|C S LIMA', 'nomes no banco saem do nome completo (' + cp.nomes.join(' · ') + '), sem o apelido');
  ok(cp.g5.join('|') === 'SAUDE|Farmácia|palpite', 'MCC 5912 → Saúde · Farmácia só como palpite (para confirmar)');
  ok(!/abcdefabcdef/.test(cp.ficha) && /CNPJ|Beto/.test(cp.ficha), 'o id_pessoa nunca aparece na tela');

  console.log('categorias e SolverONE');
  const cat = await p.evaluate(() => {
    const C = MoneyNuvem._teste.Caixa;
    Gasto.add(C.converter({ id: 'ia1', tipo: 'despesa', data: '2026-10-11', valor: 500, grupo: 'PESSOAL', categoria: 'IA e software', descricao: 'ANTHROPIC EXEMPLO' }));
    const a = Gasto.arvore(); Pessoas.solverone();
    return { ia: a.PESSOAL.indexOf('IA e software') >= 0, vida: a.PESSOAL.indexOf('Seguro de vida') >= 0, iof: a.BANCARIOS.indexOf('IOF / TED / DOC') >= 0, sol: (Pessoas.achar('SolverONE') || {}).tipo };
  });
  ok(cat.ia && cat.vida && cat.iof && cat.sol === 'empresa', 'categorias Pessoal · IA e software, Pessoal · Seguro de vida, Bancários · IOF / TED / DOC; SolverONE cadastrada como empresa');

  console.log('declaração com escolhas');
  const dec = { exercicio: 2026, anoCalendario: 2025, restituir: 1234.56, pagar: 0, fontes: [], achados: 5,
    pagamentos: [{ codigo: '10', nome: 'CLINICA EXEMPLO SAUDE', doc: '11.222.333/0001-44', valor: 900 }, { codigo: '01', nome: 'ESCOLA DE TESTE', doc: '', valor: 5000 }],
    itensBens: [{ grupo: '01', codigo: '11', desc: 'CASA MINHA CASA MINHA VIDA EM CIDADE EXEMPLO, financiada pela Caixa', antes: 90000, depois: 95000 },
      { grupo: '02', codigo: '01', desc: 'AUTOMOVEL EXEMPLO 2020', antes: 40000, depois: 38000 }, { grupo: '06', codigo: '01', desc: 'CONTA CORRENTE BANCO TESTE', antes: 100, depois: 200 }],
    dividas: [{ codigo: '11', desc: 'FINANCIAMENTO HABITACIONAL CAIXA', antes: 60000, depois: 55000 }] };
  await p.evaluate((d) => { abrirApp('tax'); Gasto.add({ data: '2025-05-05', valor: 900, grupo: 'SAUDE', sub: 'Consultas', desc: 'CLINICA EXEMPLO SAUDE', irpf: true }); abrirDeclaracao(d, true); }, dec);
  await p.waitForTimeout(200);
  const tela = await p.evaluate(() => ({ bens: [...document.querySelectorAll('.de-bem')].map((c) => c.checked).join(','), rest: document.getElementById('deRest').checked, conf: document.getElementById('deConf').checked, liq: /CONTA CORRENTE/.test(document.querySelector('.dec-esc').textContent), div: (document.querySelector('.de-div') || {}).value }));
  ok(tela.bens === 'false,false' && !tela.rest && tela.conf && tela.liq && tela.div === '0', 'escolhas: bens novos desmarcados (confirmar um a um), restituição DESMARCADA, conferir deduções marcado; conta aparece para conferir; a dívida da Caixa já ao lado da casa');
  await p.screenshot({ path: '/tmp/declaracao-escolhas.png', fullPage: false });
  await p.evaluate(() => { document.querySelectorAll('.de-bem').forEach((c) => { c.checked = true; }); const d = document.querySelector('.de-dono[data-i="0"]'); d.value = 'psB'; document.getElementById('deRest').checked = true; });
  await p.click('[data-acao="tx-dec-salvar"]'); await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    const il = (Store.estado.patrimonio_iliquido || []).map((x) => [x.tipo, x.valor, x.dono || '', (x.divida || {}).valor || 0].join(':'));
    const rest = Recorrente.todos().find((r) => /Restitui/.test(r.nome));
    return { il, rest: rest && [rest.valor, rest.grupo, rest.ate].join(':'), conf: (document.getElementById('genBody') || {}).textContent || '' };
  });
  ok(res.il.indexOf('imovel:95000:Rita:55000') >= 0 && res.il.some((x) => /^outro:38000/.test(x)), 'patrimônio sem liquidez: a casa da Rita com a dívida do financiamento ao lado, e o carro (' + res.il.join(' | ') + ')');
  ok(res.rest === '1234.56:RENDA:2026-07-31', 'restituição marcada vira renda prevista na data do lote, a confirmar');
  ok(/Saúde/.test(res.conf) && /Só na declaração: ESCOLA DE TESTE/.test(res.conf) && /Educação/.test(res.conf), 'conferência: saúde bate; a escola está só na declaração');
  ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
