"""
pacote_caixa.py — formato do pacote da CAIXA DO ROBÔ do MoneyTRIO (contrato de 03/Nov/2026)
-------------------------------------------------------------------------------------------
Referência para o financas-robo (Python, biblioteca `cryptography`). O app (nuvem.js, Cifra.abrirPacote)
abre exatamente este formato. O vetor fixo em vetor-caixa-robo.json prova que os dois lados combinam.

Pacote (texto JSON, base64 PADRÃO com "=" no fim, não base64url):
  {"v":1,"k":"<chave AES-256 embrulhada com RSA-OAEP SHA-256 (MGF1 SHA-256, sem label) pela chave pública da caixa>",
   "iv":"<12 bytes aleatórios>","ct":"<AES-256-GCM: texto cifrado + tag de 16 bytes no fim (como o WebCrypto devolve)>"}
Texto aberto = JSON UTF-8 de UM lançamento:
  {id, data 'AAAA-MM-DD' (horário de Brasília), valor (número; positivo; estorno negativo),
   tipo ('despesa'|'receita'|'transferencia'|'fatura'), grupo, categoria, descricao, quem, forma, cartao, final,
   banco, ir, freq, origem, cat_pluggy}
A chave pública da caixa vem de money_caixa_chave.chave_publica (JWK: kty RSA, alg RSA-OAEP-256, n e e em base64url).
Uma chave AES e um iv NOVOS para cada pacote. Depósito: rpc money_robo_depositar(p_grupo, p_itens) com
p_itens = [{"id": <mesmo id do lançamento>, "pacote": <texto acima>, "origem": "pluggy"}] (até 500 por chamada).
A partir do SQL v3 (2026-11-03c): mandar também "impressao": impressao(lancamento) em cada item. Mudou a impressão de
um id que já está na caixa = correção: a caixa reabre o item e o app atualiza o lançamento (a edição da pessoa vence).
"""
import base64
import json
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

OAEP = padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)


def _b64url_int(s: str) -> int:
    return int.from_bytes(base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)), "big")


def _int_b64url(i: int) -> str:
    n = (i.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(i.to_bytes(n, "big")).rstrip(b"=").decode()


def publica_do_jwk(jwk: dict) -> rsa.RSAPublicKey:
    if jwk.get("kty") != "RSA" or jwk.get("alg") != "RSA-OAEP-256":
        raise ValueError("chave da caixa precisa ser RSA-OAEP-256")
    chave = rsa.RSAPublicNumbers(_b64url_int(jwk["e"]), _b64url_int(jwk["n"])).public_key()
    if chave.key_size != 3072:
        raise ValueError("chave da caixa precisa ter 3072 bits")
    return chave


def privada_do_jwk(jwk: dict) -> rsa.RSAPrivateKey:
    """Só para TESTE (a privada de verdade nunca sai do app)."""
    pub = rsa.RSAPublicNumbers(_b64url_int(jwk["e"]), _b64url_int(jwk["n"]))
    return rsa.RSAPrivateNumbers(_b64url_int(jwk["p"]), _b64url_int(jwk["q"]), _b64url_int(jwk["d"]),
                                 _b64url_int(jwk["dp"]), _b64url_int(jwk["dq"]), _b64url_int(jwk["qi"]), pub).private_key()


def jwk_da_privada(priv: rsa.RSAPrivateKey, kid: str) -> dict:
    n = priv.private_numbers()
    return {"kty": "RSA", "alg": "RSA-OAEP-256", "kid": kid, "n": _int_b64url(n.public_numbers.n), "e": _int_b64url(n.public_numbers.e),
            "d": _int_b64url(n.d), "p": _int_b64url(n.p), "q": _int_b64url(n.q), "dp": _int_b64url(n.dmp1), "dq": _int_b64url(n.dmq1), "qi": _int_b64url(n.iqmp)}


def selar(jwk_publica: dict, lancamento: dict, chave_aes: bytes = None, iv: bytes = None) -> str:
    """Fecha um lançamento para a caixa. chave_aes/iv só se passam no teste (no robô: sempre aleatórios)."""
    pub = publica_do_jwk(jwk_publica)
    chave_aes = chave_aes or AESGCM.generate_key(bit_length=256)
    iv = iv or os.urandom(12)
    texto = json.dumps(lancamento, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ct = AESGCM(chave_aes).encrypt(iv, texto, None)          # texto cifrado + tag de 16 bytes
    k = pub.encrypt(chave_aes, OAEP)
    return json.dumps({"v": 1, "k": base64.b64encode(k).decode(), "iv": base64.b64encode(iv).decode(),
                       "ct": base64.b64encode(ct).decode()}, separators=(",", ":"))


def abrir(priv: rsa.RSAPrivateKey, pacote: str) -> dict:
    o = json.loads(pacote)
    if o.get("v") != 1:
        raise ValueError("versão do pacote")
    chave = priv.decrypt(base64.b64decode(o["k"]), OAEP)
    iv = base64.b64decode(o["iv"])
    if len(chave) != 32 or len(iv) != 12:
        raise ValueError("tamanho da chave ou do iv")
    return json.loads(AESGCM(chave).decrypt(iv, base64.b64decode(o["ct"]), None).decode("utf-8"))


def impressao(lancamento: dict) -> str:
    """3.39 (N24): a "impressão digital" do lançamento ABERTO, mandada junto no depósito
    (money_robo_depositar: {"id", "pacote", "origem", "impressao"}). O banco só compara se mudou:
    mudou = o robô corrigiu o lançamento → a caixa reabre e o app atualiza.
    sha256 do JSON com as chaves em ordem, sem espaços, em base64url sem "=" (43 letras)."""
    import hashlib
    texto = json.dumps(lancamento, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(hashlib.sha256(texto).digest()).decode().rstrip("=")
