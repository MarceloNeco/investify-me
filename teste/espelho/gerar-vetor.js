/* =====================================================================
   teste/espelho/gerar-vetor.js — vetor de teste do pacote da PLANILHA ESPELHO (app → robô), contrato v1 (11/Nov/2026)
   ---------------------------------------------------------------------
   Feito com o crypto do Node (outra implementação, diferente do WebCrypto do app), para os dois lados conferirem:
   o robô (Python) tem de ABRIR este pacote com a privada derivada da senha de teste; o app (navegador) tem de FECHAR
   igual (mesma efêmera e mesmo iv → mesmo ct). Tudo fictício: a senha é de teste, o grupo e o lançamento são inventados.
     privada do robô: d = int(HKDF-SHA256(ikm = utf8(ROBO_SENHA), salt = 32 bytes zero, info = "money-espelho-v1", 32 bytes)) mod n
     pacote: ECDH(efêmera, pública do robô) → 32 bytes (x) → HKDF-SHA256(salt = 32 bytes zero, info = "money-espelho-v1|" + grupo_id,
             32 bytes) → AES-256-GCM(iv 12 bytes, AAD = utf8(grupo_id)); ct = base64(cifrado ‖ etiqueta de 16 bytes)
     {"v":1, "epk":{"x","y"} (base64url, como no JWK), "iv": base64, "ct": base64}
   Uso: node teste/espelho/gerar-vetor.js  → grava teste/espelho/vetor-espelho.json
   ===================================================================== */
'use strict';
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');   /* ordem da curva P-256 */
const hkdf = (ikm, info) => Buffer.from(crypto.hkdfSync('sha256', ikm, Buffer.alloc(32), Buffer.from(info, 'utf8'), 32));
const b64u = (b) => Buffer.from(b).toString('base64url');
function privadaDaSenha(senha) {
  const d = BigInt('0x' + hkdf(Buffer.from(senha, 'utf8'), 'money-espelho-v1').toString('hex')) % N;
  if (d === 0n) throw new Error('d = 0');
  return Buffer.from(d.toString(16).padStart(64, '0'), 'hex');
}
const ROBO_SENHA = 'senha-de-teste-do-robo-NAO-E-REAL';
const GRUPO = '22222222-2222-2222-2222-222222222222';
const robo = crypto.createECDH('prime256v1'); robo.setPrivateKey(privadaDaSenha(ROBO_SENHA));
const pubRobo = robo.getPublicKey();   /* 0x04 ‖ x ‖ y */
const EFEMERA = Buffer.from('6a1f3c2e9b8d7a6f5e4d3c2b1a0918273645546372819a0b1c2d3e4f5a6b7c8d', 'hex');
const ef = crypto.createECDH('prime256v1'); ef.setPrivateKey(EFEMERA);
const epk = ef.getPublicKey();
const IV = Buffer.from('0102030405060708090a0b0c', 'hex');
const texto = { v: 1, acao: 'upsert', id: 'rb_pluggy-teste-0001', em: '2026-11-11T12:00:00.000Z', quem_editou: 'app',
  data: '2026-11-10', valor: 87.4, tipo: 'despesa', grupo: 'HABITACAO', categoria: 'Supermercado', descricao: 'Mercado do bairro',
  freq: 'Pontual', quem: '', forma: 'Credito', cartao: 'Visa final 1234', ir: '', banco: 'Banco X',
  regra: { desc: 'COMPRA CARTAO MERCADO EXEMPLO LTDA', grupo: 'HABITACAO', categoria: 'Supermercado' } };
const claro = Buffer.from(JSON.stringify(texto), 'utf8');
const chave = hkdf(ef.computeSecret(pubRobo), 'money-espelho-v1|' + GRUPO);
const c = crypto.createCipheriv('aes-256-gcm', chave, IV); c.setAAD(Buffer.from(GRUPO, 'utf8'));
const ct = Buffer.concat([c.update(claro), c.final(), c.getAuthTag()]);
const pacote = { v: 1, epk: { x: b64u(epk.subarray(1, 33)), y: b64u(epk.subarray(33)) }, iv: IV.toString('base64'), ct: ct.toString('base64') };
/* confere abrindo do lado do robô (como o Python vai fazer) */
const k2 = hkdf(robo.computeSecret(Buffer.concat([Buffer.from([4]), Buffer.from(pacote.epk.x, 'base64url'), Buffer.from(pacote.epk.y, 'base64url')])), 'money-espelho-v1|' + GRUPO);
const raw = Buffer.from(pacote.ct, 'base64'), dc = crypto.createDecipheriv('aes-256-gcm', k2, Buffer.from(pacote.iv, 'base64'));
dc.setAAD(Buffer.from(GRUPO, 'utf8')); dc.setAuthTag(raw.subarray(raw.length - 16));
const aberto = Buffer.concat([dc.update(raw.subarray(0, raw.length - 16)), dc.final()]).toString('utf8');
if (aberto !== JSON.stringify(texto)) throw new Error('não abriu igual');
const vetor = {
  _o_que_e: 'Vetor de teste do pacote da planilha espelho (app → robô), contrato v1. Tudo fictício (senha de teste, grupo e lançamento inventados).',
  robo_senha_de_teste: ROBO_SENHA,
  robo_privada_hex: privadaDaSenha(ROBO_SENHA).toString('hex'),
  robo_publica_jwk: { kty: 'EC', crv: 'P-256', x: b64u(pubRobo.subarray(1, 33)), y: b64u(pubRobo.subarray(33)) },
  grupo_id: GRUPO,
  efemera_privada_hex: EFEMERA.toString('hex'),
  iv_hex: IV.toString('hex'),
  chave_aes_hex: chave.toString('hex'),
  pacote: JSON.stringify(pacote),
  texto_aberto: JSON.stringify(texto)
};
fs.writeFileSync(path.join(__dirname, 'vetor-espelho.json'), JSON.stringify(vetor, null, 2) + '\n');
console.log('vetor gravado: o pacote abre com a privada derivada da senha de teste e dá o texto esperado.');
