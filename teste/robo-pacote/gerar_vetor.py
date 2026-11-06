"""
Gera o vetor fixo vetor-caixa-robo.json (uma vez; o arquivo vai para o repositório).
A chave privada que está no vetor é SÓ DE TESTE: foi criada aqui, não protege nada de ninguém.
Uso: python3 -I teste/robo-pacote/gerar_vetor.py      (só se precisar refazer o vetor)
     python3 -I teste/robo-pacote/gerar_vetor.py --conferir [pacote_do_navegador.txt]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
import pacote_caixa as pc  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQ = os.path.join(AQUI, "vetor-caixa-robo.json")

LANCAMENTOS = [
    {"id": "pluggy-teste-0001", "data": "2026-11-02", "valor": 123.45, "tipo": "despesa", "grupo": "HABITACAO",
     "categoria": "Supermercado", "descricao": "PÃO DE AÇÚCAR — compra teste", "quem": "Alex", "forma": "Crédito",
     "cartao": "Visa teste", "final": "1234", "banco": "Banco Teste", "ir": False, "freq": "Pontual",
     "origem": "pluggy", "cat_pluggy": "Groceries"},
    {"id": "pluggy-teste-0002", "data": "2026-11-01", "valor": 5000, "tipo": "receita", "grupo": "RENDA",
     "categoria": "Salário", "descricao": "Salário teste", "quem": "Alex", "forma": "Pix", "cartao": "", "final": "",
     "banco": "Banco Teste", "ir": True, "freq": "Mensal", "origem": "pluggy", "cat_pluggy": "Salary"},
    {"id": "pluggy-teste-0003", "data": "2026-11-02", "valor": -40.0, "tipo": "despesa", "grupo": "LAZER",
     "categoria": "Restaurante", "descricao": "Estorno teste", "quem": "", "forma": "Crédito", "cartao": "", "final": "1234",
     "banco": "Banco Teste", "ir": False, "freq": "Pontual", "origem": "pluggy", "cat_pluggy": "Restaurants"},
    {"id": "pluggy-teste-0004", "data": "2026-11-03", "valor": 800, "tipo": "transferencia", "grupo": "", "categoria": "",
     "descricao": "Transferência entre contas teste", "quem": "", "forma": "Pix", "cartao": "", "final": "", "banco": "Banco Teste",
     "ir": False, "freq": "Pontual", "origem": "pluggy", "cat_pluggy": "Transfer"},
]


def gerar():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    jwk = pc.jwk_da_privada(priv, "cx-teste")
    pub = {k: jwk[k] for k in ("kty", "alg", "kid", "n", "e")}
    itens = []
    for i, l in enumerate(LANCAMENTOS):
        chave = bytes(range(i, i + 32)); iv = bytes(range(100 + i, 112 + i))   # fixos só para o vetor ser reproduzível no AES
        itens.append({"lancamento": l, "pacote": pc.selar(pub, l, chave, iv)})
    vetor = {"aviso": "VETOR DE TESTE. A chave privada abaixo foi criada só para este teste e não protege nada.",
             "formato": "ver pacote_caixa.py", "chave_publica": pub, "chave_privada_teste": jwk, "itens": itens}
    with open(ARQ, "w", encoding="utf-8") as f:
        json.dump(vetor, f, ensure_ascii=False, indent=1)
    print("OK: vetor gravado em", ARQ)


def conferir(extra=None):
    v = json.load(open(ARQ, encoding="utf-8"))
    priv = pc.privada_do_jwk(v["chave_privada_teste"])
    for it in v["itens"]:
        assert pc.abrir(priv, it["pacote"]) == it["lancamento"], it["lancamento"]["id"]
    # ida e volta no próprio Python
    novo = pc.selar(v["chave_publica"], LANCAMENTOS[0])
    assert pc.abrir(priv, novo) == LANCAMENTOS[0]
    print("OK: Python abre os", len(v["itens"]), "pacotes do vetor e o que ele mesmo fecha")
    if extra:
        dados = json.load(open(extra, encoding="utf-8"))
        assert pc.abrir(priv, dados["pacote"]) == dados["lancamento"]
        print("OK: Python abre o pacote feito no navegador")


if __name__ == "__main__":
    if "--conferir" in sys.argv:
        resto = [a for a in sys.argv[1:] if a != "--conferir"]
        conferir(resto[0] if resto else None)
    else:
        gerar()
        conferir()
