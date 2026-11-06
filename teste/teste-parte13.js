/* =====================================================================
   teste/teste-parte13.js — 3.54: contrato com boleto de banco, "já está no livro", "já existe", Desfazer,
   e vencimentos passados conferidos sozinhos (conciliacao.js + "sem conferência").
   Nomes fictícios; as tabelas do contrato vêm de teste/teste-contrato-fgts.js (mesmo layout literal).
   Uso (na pasta raiz): node teste/teste-parte13.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
/* as mesmas tabelas literais do outro teste (uma fonte só) */
const fonte = fs.readFileSync(path.join(__dirname, 'teste-contrato-fgts.js'), 'utf8');
const ESCOLAR = eval(fonte.match(/const ESCOLAR = (\[[\s\S]*?\]);/)[1]);
const AMPLIADO = eval(fonte.match(/const AMPLIADO = (\[[\s\S]*?\]);/)[1]);
/* boleto de banco: rótulos em colunas, valores na linha de baixo ou à direita (dados fictícios) */
const BOLETO_BANCO = [
  'Local de pagamento                                                      Vencimento',
  'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO                              30/10/2026',
  'Beneficiário                                                            Agência/Código do beneficiário',
  'ASSOCIAÇÃO EDUCACIONAL EXEMPLO CNPJ 00.000.000/0001-00                 0000/000000-0',
  'Data do documento   Nº do documento   Espécie doc.   Aceite   Data processamento   Nosso número',
  '20/10/2026          000123            DM             N        20/10/2026           00000001',
  '(=) Valor do documento                                                  1.534,00',
  '(-) Desconto / Abatimento                                               121,00',
  '(=) Valor cobrado                                                       1.413,00',
  'Instruções: 1ª Parcela da Anuidade 2027. Não receber após o vencimento.',
  'Pagador: XXXXXXXX XXXXX XXXXX'];

/* o boleto REAL da escola (pdftotext -layout, espaços originais; nome, CPF, endereço, CNPJ, códigos e site trocados) */
const BOLETO_REAL = [
  '                                                                                      COLÉGIO ESCOLA EXEMPLO',
  '                                                                                       Rua Escola Exemplo, 36',
  '                                                                                   BAIRRO - São Paulo/SP',
  '                                                                                     Cnpj: 00.000.000/0000-00',
  '                                                                                       Fone: (11) 0000-0000',
  '                                                                                Site: http://escolaexemplo.com.br/',
  '                                                                              Email: tesouraria@escolaexemplo.com.br',
  'Aluno ALUNO XXXX                                                                                                      Matricula    00000000',
  'Curso Ensino Fundamental - Anos Iniciais                                   Série / Turma 3º Ano _ Manhã                          Numero',
  'Tipo Parcela                                    Parcela                    Valor Bruto                  Descontos                Valor a Pagar',
  '1ª Parcela da Anuidade -                           1                               1.534,00                     121,00                                            1.413,00',
  'EFAI',
  'Observações:                                                                                                                                              Valor do Documento',
  '  1) APÓS O VENCIMENTO COBRAR MULTA DE 2,00% ao mês                                                                                                               1.413,00',
  '  2) COBRAR MORA DE 0,033% a.d.',
  '                                           033-7                                                                                                              Recibo do Pagador',
  'Beneficiário                                                                                                                                  CNPJ',
  '                          ASSOC XXXX "COLEGIO ESCOLA EXEMPLO"                                   00.000.000/0000-00                                                               00.000.000/0000-00',
  '                          Rua Escola Exemplo, 36 - BAIRRO - Cep: 00000-000',
  'Vencimento                Agencia/Código do Beneficiário    Carteira                                  Especie    Quantidade                   Valor do Documento',
  '     30/10/2026                  0000/0000000                                  5                          R$                                                                            1.534,00',
  '(-) Desconto/Abatimento           (-) Outras Deduções                              (+) Mora/Multa/Juros                                       (+) Outros Acréscimos',
  'Data do Documento                 Nosso Número                                     Número do documento                                        (=) Valor Cobrado',
  '28/10/2026                                                             0000000                            0000000',
  '',
  'Local de Pagamento                                                                                                     Vencimento',
  'PAGÁVEL EM QUALQUER BANCO                                                                                              30/10/2026',
  'Valor do Documento 1.534,00',
  '(-) Desconto / Abatimento',
  '121,00',
  '(=) Valor Cobrado'];
/* a amostra oficial do boleto (teste/amostras/, trazida da sessão principal; dados trocados) */
const BOLETO_AMOSTRA = fs.readFileSync(path.join(__dirname, 'amostras', 'boleto-matricula-layout.txt'), 'utf8');
const hoje = new Date();
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const mesAtras = (n, dia) => iso(new Date(hoje.getFullYear(), hoje.getMonth() - n, dia));
/* conciliação: "Aluguel" cadastrado HOJE (importado), pago pelo robô nos últimos 4 meses (um com outra categoria,
   só o nome bate; um 3 dias depois; um com 5% a mais); 5 meses atrás não tem pagamento → "sem conferência".
   "Condomínio" cadastrado há 1 ano, sem pagamento no mês passado → continua "atrasado" (como antes). */
const gastos = [
  { id: 'a1', data: mesAtras(1, 5), valor: 2500, grupo: 'HABITACAO', sub: 'Aluguel', desc: 'PIX ALUGUEL', fluxo: 'saida' },
  { id: 'a2', data: mesAtras(2, 8), valor: 2500, grupo: 'OUTROS', sub: 'Sem categoria', desc: 'TED ALUGUEL APTO', fluxo: 'saida' },
  { id: 'a3', data: mesAtras(3, 5), valor: 2625, grupo: 'HABITACAO', sub: 'Aluguel', desc: 'ALUGUEL', fluxo: 'saida' },
  { id: 'a4', data: mesAtras(4, 4), valor: 2500, grupo: 'HABITACAO', sub: 'Aluguel', desc: 'ALUGUEL', fluxo: 'saida' },
  { id: 'c2', data: mesAtras(2, 10), valor: 800, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'CONDOMINIO', fluxo: 'saida' },
  /* o robô já trouxe o boleto da matrícula pago */
  { id: 'rb', data: '2026-10-30', valor: 1413, grupo: 'OUTROS', sub: 'Sem categoria', desc: 'ASSOCIACAO EDU EXEMPLO', fluxo: 'saida' }];
const umAno = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1).toISOString();
const LOCAL = { v: 1, config: {}, posicoes: [], gastos, recorrentes: [
  { id: 'r-alu', nome: 'Aluguel', valor: 2500, grupo: 'HABITACAO', sub: 'Aluguel', regra: 'dia', dia: 5, estadoPadrao: 'pendente', criadoEm: iso(hoje) + 'T09:00:00.000Z' },
  { id: 'r-con', nome: 'Condomínio', valor: 800, grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 10, estadoPadrao: 'pendente', criadoEm: umAno },
  /* o que o dono já tinha cadastrado da escola */
  { id: 'r-esc', nome: 'Escola Ana 2027', valor: 3067, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 10, desde: '2027-01-01', ate: '2027-12-31', irpf: true },
  { id: 'r-a1', nome: 'Ampliado Ana 1º sem', valor: 1104, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 25, desde: '2027-02-01', ate: '2027-06-30' },
  { id: 'r-a2', nome: 'Ampliado Ana 2º sem', valor: 1104, grupo: 'DEPENDENTES', sub: 'Escola', quem: 'Ana', regra: 'dia', dia: 25, desde: '2027-08-01', ate: '2027-12-31' }] };

(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      const semToasts = () => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 5 && window.Conciliacao);
      await p.evaluate(() => { I18n.atual = 'pt'; });

      console.log(' vencimentos passados (conciliacao.js)');
      await p.waitForFunction(() => (Store.estado.pagamentos || []).length >= 4, null, { timeout: 8000 }).catch(() => {});
      const pg = await p.evaluate(() => Store.estado.pagamentos.filter((x) => x.rid === 'r-alu').map((x) => x.estado + ':' + x.gastoId).sort());
      ok(pg.join() === 'confirmado:a1,confirmado:a2,confirmado:a3,confirmado:a4', 'sozinho, ao abrir: os 4 aluguéis pagos batem (categoria, nome com outra categoria, 3 dias depois, 5% a mais) (' + pg.join() + ')');
      const est = await p.evaluate((d) => Recorrente.ocorrencia(Recorrente.achar('r-alu'), d).estado, mesAtras(5, 5));
      ok(est === 'semconf', 'o que venceu ANTES do cadastro e não bateu fica "sem conferência" (' + est + ')');
      const at = await p.evaluate(() => Recorrente.atrasados().map((o) => o.r.id + '@' + o.data));
      ok(!at.some((x) => /^r-alu/.test(x)) && at.some((x) => /^r-con/.test(x)), 'atrasados: nenhum do Aluguel importado; o Condomínio (cadastrado há 1 ano) continua atrasado no mês sem pagamento (' + at.join(', ') + ')');
      ok(await p.evaluate(() => Object.keys(ESTADOS_PG).indexOf('semconf') >= 0 && !document.body.innerHTML.includes('data-est="semconf"')), '"sem conferência" não aparece como opção para marcar à mão');

      console.log(' contrato + boleto de banco');
      const bo = await p.evaluate((t) => CompromissoDe.lerModelo(t), BOLETO_BANCO.join('\n'));
      ok(bo && bo.tipo === 'boleto' && bo.bruto === 1534 && bo.desconto === 121 && bo.pagar === 1413 && bo.venc === '2026-10-30', 'boleto de banco (rótulos em colunas): documento 1.534, desconto 121, a pagar 1.413, vencimento 30/10/2026 (' + JSON.stringify(bo && [bo.bruto, bo.desconto, bo.pagar, bo.venc]) + ')');
      const br = await p.evaluate((t) => CompromissoDe.lerModelo(t), BOLETO_REAL.join('\n'));
      ok(br && br.tipo === 'boleto' && br.bruto === 1534 && br.desconto === 121 && br.pagar === 1413 && br.venc === '2026-10-30', 'boleto REAL (layout literal): bruto 1.534, desconto 121, a pagar 1.413 e vencimento 30/10/2026 — não a "Data do Documento" 28/10 (' + JSON.stringify(br && [br.bruto, br.desconto, br.pagar, br.venc]) + ')');
      const ba = await p.evaluate((ts) => { const b = CompromissoDe.lerModelo(ts[1]); const q = CompromissoDe.planoModelo([CompromissoDe.lerModelo(ts[0]), b]); return { b: [b.tipo, b.bruto, b.desconto, b.pagar, b.venc], g: [q.gasto.valor, q.gasto.data, q.gasto.desc] }; }, [ESCOLAR.join('\n'), BOLETO_AMOSTRA]);
      ok(ba.b.join() === 'boleto,1534,121,1413,2026-10-30' && ba.g.join() === '1413,2026-10-30,Matrícula 2027 (1ª parcela da anuidade)',
        'amostra teste/amostras/boleto-matricula-layout.txt: 1ª parcela R$ 1.413 (nunca 1.534 nem o "Valor Cobrado" vazio), vencimento 30/10/2026, "Matrícula 2027 (1ª parcela da anuidade)" (' + JSON.stringify(ba) + ')');
      const brp = await p.evaluate((ts) => { const q = CompromissoDe.planoModelo(ts.map((t) => CompromissoDe.lerModelo(t))); return [q.gasto.valor, q.gasto.data, q.gasto.desc, q.itens[0].escolhida, q.itens[0].opcoes.length]; }, [ESCOLAR.join('\n'), BOLETO_REAL.join('\n')]);
      ok(brp[0] === 1413 && brp[1] === '2026-10-30' && brp[2] === 'Matrícula 2027 (1ª parcela da anuidade)' && brp[3] === 0 && brp[4] === 2, 'contrato + boleto real: 1ª parcela R$ 1.413 em 30/10/2026, "Matrícula 2027 (1ª parcela da anuidade)"; o "3º Ano" do boleto pré-seleciona "1º ao 5º"');
      const pl = await p.evaluate((ts) => { const q = CompromissoDe.planoModelo(ts.map((t) => CompromissoDe.lerModelo(t))); return { g: q.gasto && [q.gasto.valor, q.gasto.data, q.gasto.desc, q.gasto.jaLancado && q.gasto.jaLancado.id], ja: q.itens.map((i) => CompromissoDe.jaExistem(i.semente(i.escolhida >= 0 ? i.escolhida : 1)).map((r) => r.id).join('+')) }; },
        [ESCOLAR.join('\n'), AMPLIADO.join('\n'), BOLETO_BANCO.join('\n')]);
      ok(pl.g[0] === 1413 && pl.g[1] === '2026-10-30' && pl.g[2] === 'Matrícula 2027 (1ª parcela da anuidade)', 'com boleto no lote: 1ª parcela com o valor a pagar e o vencimento do boleto, nome "Matrícula 2027 (1ª parcela da anuidade)"');
      ok(pl.g[3] === 'rb', '"já está no livro": acha o pagamento do robô (mesmo valor, 30/10, "ASSOCIACAO EDU EXEMPLO")');
      ok(pl.ja[0] === 'r-esc' && pl.ja[1] === 'r-a1+r-a2', '"já existe": a escola e os 2 cadastros do ampliado (' + pl.ja.join(' | ') + ')');

      const abrirLote = async () => {
        await p.evaluate(() => { abrirApp('budget'); irPara('b-custos'); custosAba = 'recorrentes'; render(); });
        await p.waitForFunction(() => window.scrollY === 0); await semToasts();
        const ts = [ESCOLAR, AMPLIADO, BOLETO_BANCO].map((l) => l.join('\n'));
        await p.evaluate((ts) => { /* sem PDF: o mesmo caminho da tela, a partir do texto já lido */
          window.__plano = CompromissoDe.planoModelo(ts.map((t) => CompromissoDe.lerModelo(t))); }, ts);
      };
      await abrirLote();
      /* o caminho real: escolher os PDFs (o leitor de PDF já é testado em teste-contrato-fgts.js); aqui o texto entra direto */
      await p.evaluate(() => CompromissoDe.mostrarPlano(window.__plano));
      await p.waitForSelector('#genModal:not(.hidden) .cdl-item');
      const prev = await p.evaluate(() => ({ itens: Array.from(document.querySelectorAll('#genBody .cdl-item')).map((el) => ({ ck: el.querySelector('.cdl-criar').checked, ja: (el.querySelector('.cdl-ja') || {}).textContent || '' })),
        g: document.getElementById('cdlGasto').checked, gl: (document.querySelector('.cdl-jalancado') || {}).textContent || '', desc: document.getElementById('cdlGDesc').value }));
      ok(prev.itens.every((i) => !i.ck) && /^Já cadastrado: Escola Ana 2027 · /.test(prev.itens[0].ja) && /Ampliado Ana 1º sem.*Ampliado Ana 2º sem/.test(prev.itens[1].ja), 'prévia: os dois vêm DESMARCADOS com "Já cadastrado: …" (3.60)');
      ok(!prev.g && /Já está no livro: .*ASSOCIACAO EDU EXEMPLO/.test(prev.gl) && prev.desc === 'Matrícula 2027 (1ª parcela da anuidade)', 'prévia: a 1ª parcela vem desmarcada, mostrando o lançamento do robô; o nome do lançamento é editável');
      /* escola: atualizar o existente; ampliado: manter; e lançar a parcela mesmo assim, com outro nome */
      /* 3.60: as escolhas ficam em "mudar" e os campos em "ver detalhes" */
      await p.click('#genBody .cdl-item[data-k="0"] .cdl-mudar'); await p.check('#genBody input[name="cdlJa0"][value="r-esc"]');
      await p.click('#genBody .cdl-item[data-k="1"] .cdl-det'); await p.selectOption('#genBody .cdl-item[data-k="1"] .cdl-op', '1');
      await p.click('#genBody .cdl-gasto .cdl-det'); await p.check('#cdlGasto'); await p.fill('#cdlGDesc', 'Matrícula 2027 Ana');
      const nRec = await p.evaluate(() => Store.estado.recorrentes.length), nG = await p.evaluate(() => Store.estado.gastos.length);
      await semToasts(); await p.click('#genBody [data-acao="cdl-criar"]');
      await p.waitForFunction(() => document.getElementById('genModal').classList.contains('hidden'));
      const dep = await p.evaluate(() => ({ n: Store.estado.recorrentes.length, esc: (({ valor, aConfirmar, dia }) => ({ valor, aConfirmar, dia }))(Recorrente.achar('r-esc')), g: Store.estado.gastos.length, gd: Store.estado.gastos[Store.estado.gastos.length - 1].desc }));
      ok(dep.n === nRec && dep.esc.aConfirmar === true && dep.esc.valor === 3067 && dep.g === nG + 1 && dep.gd === 'Matrícula 2027 Ana', 'Criar: nenhum compromisso duplicado; a escola existente foi atualizada (a confirmar); o lançamento usa o nome editado');
      ok(await p.isVisible('#toasts .cdl-desfazer button'), 'aparece "↩ Desfazer"');
      await p.click('#toasts .cdl-desfazer button');
      const des = await p.evaluate(() => ({ n: Store.estado.recorrentes.length, conf: !!Recorrente.achar('r-esc').aConfirmar, g: Store.estado.gastos.length }));
      ok(des.n === nRec && !des.conf && des.g === nG, 'Desfazer: o lançamento sai e a escola volta a ser como era');
      /* criar mesmo assim */
      await p.evaluate(() => CompromissoDe.mostrarPlano(window.__plano)); await p.waitForSelector('#genModal:not(.hidden) .cdl-item');
      await p.click('#genBody .cdl-item[data-k="0"] .cdl-mudar'); await p.check('#genBody input[name="cdlJa0"][value="criar"]');
      await p.click('#genBody .cdl-item[data-k="1"] .cdl-det'); await p.selectOption('#genBody .cdl-item[data-k="1"] .cdl-op', 'nao');
      await semToasts(); await p.click('#genBody [data-acao="cdl-criar"]'); await p.waitForFunction(() => document.getElementById('genModal').classList.contains('hidden'));
      ok(await p.evaluate((n) => Store.estado.recorrentes.length === n + 1, nRec), '"criar mesmo assim": cria um novo, só quando a pessoa escolhe');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
