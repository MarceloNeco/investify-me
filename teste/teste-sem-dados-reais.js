/* =====================================================================
   teste/teste-sem-dados-reais.js — nenhum nome ou valor real da família no repositório (regra permanente, 06/Nov/2026)
   ---------------------------------------------------------------------
   O repositório é PÚBLICO. Antes de cada commit, este teste procura em teste/, modulos/, textos/, *.md e index.html
   as palavras proibidas (nomes da família, escola, empregadores, saldos). A lista guarda só o HASH (SHA-256, 16 primeiros
   caracteres) de cada palavra, em minúsculas e sem acento: o nome em si nunca entra no repositório.
   Achou? Troque por um fictício (Ana, Bia, Alex, Paulo, Carla; "Escola Exemplo"; "Empresa A"; valores redondos).
   Para acrescentar uma palavra: node -e "console.log(require('crypto').createHash('sha256').update('palavra').digest('hex').slice(0,16))"
   (em minúsculas e sem acento) e ponha o resultado em PROIBIDAS, com um comentário do que É (nunca a palavra).
   Exceção conhecida: "Seguro Auto <apelido>" no teste da migração antiga (o próprio código do app tem esse nome);
   o apelido não está na lista.
   Uso (na pasta raiz): node teste/teste-sem-dados-reais.js
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RAIZ = path.join(__dirname, '..');
const PROIBIDAS = {
  '2b2a0ff8f9def3f1': 'nome de criança da família',
  '926dc6fb2c9459c7': 'nome de adulto da família',
  'bb7bd9c2a0a2b943': 'nome da escola',
  'c1b425f9ff48b6e7': 'empregador 1',
  '64469c596b2d8211': 'empregador 2',
  'e8522fd87f748c38': 'empregador 3',
  '2ec9e89385846f3c': 'saldo 1', '156b26beb53892fd': 'saldo 1',
  '1500e5738cf089c9': 'saldo 2', '90ba987cf7383b30': 'saldo 2'
};
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex').slice(0, 16);
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function arquivos() {
  const out = [];
  const andar = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git/.test(e.name)) andar(p); }
    else if (/\.(js|md|json|py|html|txt|sql)$/.test(e.name)) out.push(p);
  });
  ['teste', 'modulos', 'textos', 'supabase'].forEach((d) => { if (fs.existsSync(path.join(RAIZ, d))) andar(path.join(RAIZ, d)); });
  fs.readdirSync(RAIZ).filter((f) => /\.(md|html|txt)$/.test(f)).forEach((f) => out.push(path.join(RAIZ, f)));
  return out;
}
let achados = 0;
arquivos().forEach((f) => {
  fs.readFileSync(f, 'utf8').split('\n').forEach((linha, i) => {
    const toks = norm(linha).match(/[a-z]+|\d[\d.,]*\d/g) || [];
    toks.forEach((t) => { const k = hash(t); if (PROIBIDAS[k]) { achados++; console.log('  ✗ ' + path.relative(RAIZ, f) + ':' + (i + 1) + ' — ' + PROIBIDAS[k]); } });
  });
});
console.log(achados ? '\n' + achados + ' dado(s) real(is) encontrado(s): troque por fictício antes do commit.' : '✓ nenhum nome ou valor real da família no repositório.');
process.exit(achados ? 1 : 0);
