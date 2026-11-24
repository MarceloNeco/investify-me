/* =====================================================================
   teste/teste-fotos-aparelho.js — 3.106: as fotos de leitura ficam no aparelho (ou no Drive), não no Storage (arquivos.js 1.1.0)
   ---------------------------------------------------------------------
   Decisão do dono: a foto do canhoto, do print e da OS (guardar com soAqui) não sobe para o bucket money-arquivos; fica só no
   IndexedDB deste aparelho por 90 dias. Com o Google Drive conectado, o original vai também para o Drive e o 📎 abre lá.
   "Enviar ao Drive" e o 📄 do carro somem quando a foto não está mais aqui. Os documentos (NF, contrato…) continuam subindo.
   Com uma nuvem e um Drive de mentira. Dados fictícios. Uso: node teste/teste-fotos-aparelho.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [], veiculos: [{ id: 'v1', apelido: 'Carro Ficticio' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.ArquivosFamilia && ArquivosFamilia.aqui);
    await p.evaluate(() => { I18n.atual = 'pt';
      /* uma nuvem de mentira: o que subir fica anotado */
      window.__subiu = []; MoneyNuvem.arquivos.ativo = () => true; MoneyNuvem.arquivos.cifrar = async (x) => x; MoneyNuvem.arquivos.decifrar = async (x) => x;
      MoneyNuvem.arquivos.subir = async (id) => { window.__subiu.push(id); }; MoneyNuvem.arquivos.baixar = async () => null; });

    console.log('1) a foto de leitura fica só no aparelho; o documento sobe');
    const r1 = await p.evaluate(async () => {
      const foto = await ArquivosFamilia.guardar({ nome: 'canhoto 2026-11-20 Oficina Exemplo', tipo: 'comprovante', ano: 2026, ligado: 'f1', mime: 'image/jpeg', soAqui: true }, new Uint8Array([1, 2, 3]));
      const doc = await ArquivosFamilia.guardar({ nome: 'nota.pdf', tipo: 'nf', ano: 2026 }, new Uint8Array([4, 5, 6]));
      await new Promise((r) => setTimeout(r, 300)); await ArquivosFamilia.sincronizar();
      return { foto, doc, subiu: window.__subiu.slice(), aqui: ArquivosFamilia.aqui(foto.id), ler: Array.from(await ArquivosFamilia.ler(foto.id) || []) };
    });
    ok(r1.foto.soAqui && /^\d{4}-\d\d-\d\d$/.test(r1.foto.expira) && r1.subiu.indexOf(r1.foto.id) < 0, 'a foto (soAqui, vale até ' + r1.foto.expira + ') NÃO sobe para o Storage');
    ok(r1.subiu.indexOf(r1.doc.id) >= 0, 'o documento (NF) continua subindo para o Storage');
    ok(r1.aqui && r1.ler.join() === '1,2,3', 'a foto abre deste aparelho (IndexedDB)');
    const dias = Math.round((Date.parse(r1.foto.expira) - Date.now()) / 86400000);
    ok(dias >= 89 && dias <= 90, 'fica 90 dias (' + dias + ')');

    console.log('2) passados 90 dias, sai do aparelho; o 📄 e o "Enviar ao Drive" somem');
    const r2 = await p.evaluate(async (id) => {
      const antes = ArquivosFamilia.disponivel(id);
      const n = await ArquivosFamilia.limpar('2099-01-01');
      return { antes, n, depois: ArquivosFamilia.disponivel(id), aqui: ArquivosFamilia.aqui(id), ler: await ArquivosFamilia.ler(id) };
    }, r1.foto.id);
    ok(r2.antes && r2.n >= 1 && !r2.aqui && !r2.depois && !r2.ler, 'a limpeza tira a foto vencida; ela deixa de estar disponível');
    ok(await p.evaluate(() => ArquivosFamilia.disponivel(ArquivosFamilia.lista({ tipo: 'nf' })[0].id)), 'o documento continua disponível (está na nuvem)');
    const r3 = await p.evaluate(async (id) => {
      ST.gastos.push({ id: 'g1', data: '2026-11-20', valor: 300, desc: 'OFICINA EXEMPLO', grupo: 'VEICULO', sub: 'Manutenção', veiculoId: 'v1', docId: id, fluxo: 'saida' });
      window.__tc = 1; SolverGoogle.configurar({ app: 'moneytrio', clienteId: '123456-teste.apps.googleusercontent.com', chavePicker: 'AIza' + 'x'.repeat(35), projeto: '123456789012' });
      await new Promise((r) => setTimeout(r, 50));
      const semFoto = CarroDrive.botao('g', 'g1');
      const nova = await ArquivosFamilia.guardar({ nome: 'canhoto nova', tipo: 'comprovante', ano: 2026, ligado: 'g2', mime: 'image/jpeg', soAqui: true }, new Uint8Array([7]));
      ST.gastos.push({ id: 'g2', data: '2026-11-21', valor: 100, desc: 'OFICINA EXEMPLO', grupo: 'VEICULO', sub: 'Manutenção', veiculoId: 'v1', docId: nova.id, fluxo: 'saida' });
      return { semFoto, comFoto: CarroDrive.botao('g', 'g2') };
    }, r1.foto.id);
    ok(!/Enviar ao Drive/.test(r3.semFoto) && /Enviar ao Drive/.test(r3.comFoto), '"Enviar ao Drive" só aparece quando a foto está neste aparelho');

    console.log('3) com o Drive conectado, o original vai para o Drive e o 📎 abre lá');
    const r4 = await p.evaluate(async () => {
      const G = SolverGoogle, ant = { estado: G.estado, gs: G.garantirSubpasta, env: G.enviar }; const pastas = [];
      G.estado = () => ({ configurado: true, conectado: true, expiraEm: Date.now() + 3600000 });
      G.garantirSubpasta = async (pai, nome) => { pastas.push(pai + '/' + nome); return { id: 'p-' + nome }; };
      G.enviar = async (o) => ({ id: 'arq1', link: 'https://drive.google.com/file/d/ARQUIVO_FICTICIO/view', pasta: o.pastaId, nome: o.nome });
      const m = await ArquivosFamilia.guardar({ nome: 'print 2026-11-22', tipo: 'comprovante', ano: 2026, ligado: 'x', mime: 'image/png', soAqui: true }, new Uint8Array([9]));
      await new Promise((r) => setTimeout(r, 100));
      const abriu = []; const wo = window.open; window.open = (u) => { abriu.push(u); };
      await ArquivosFamilia.limpar('2099-01-01'); await ArquivosFamilia.baixar(m.id);
      window.open = wo; Object.assign(G, { estado: ant.estado, garantirSubpasta: ant.gs, enviar: ant.env });
      return { drive: m.drive, pastas, abriu, disp: ArquivosFamilia.disponivel(m.id) };
    });
    ok(r4.drive && r4.drive.id === 'arq1' && r4.pastas.join() === 'root/MoneyTRIO,p-MoneyTRIO/Fotos lidas', 'a foto foi para o Drive em MoneyTRIO/Fotos lidas');
    ok(r4.disp && r4.abriu[0] === 'https://drive.google.com/file/d/ARQUIVO_FICTICIO/view', 'mesmo depois de sair do aparelho, o 📎 abre o original no Drive');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
