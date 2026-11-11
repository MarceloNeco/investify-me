# Contrato do robô com a caixa por escopo (MoneyTRIO 3.66, SQL v4 `2026-11-12-moneytrio-escopos.sql`)

## 1. As chaves públicas: uma por escopo

```
GET money_caixa_chave?grupo_id=eq.<grupo>&select=escopo,chave_publica
→ [{ "escopo": "reservado", "chave_publica": {kty,n,e,alg:"RSA-OAEP-256",kid} },
   { "escopo": "casa",      "chave_publica": {...} }]          ← a "casa" só existe depois da migração do chefe
```

- Leia as chaves **a cada rodada**, sem cache entre rodadas. Na migração, o app do chefe troca as duas, e o `kid` muda.
- Sem linha `casa`, porque a migração ainda não rodou: mande **tudo** como `reservado`, com a chave `reservado`. É o que acontece
  hoje com a chave única: depois do SQL v4, a linha que já existe vira `reservado`.
- Nunca use a chave de um escopo para fechar um item do outro.

## 2. O escopo de cada item

| Escopo | Quando |
|---|---|
| `casa` | `quem` = Beta (PLUGGY_ITENS_FAMILIA) |
| `casa` | cartão com CARTAO_QUEM = Beta |
| `casa` | transferência entre a família (dele para ela ou dela para ele) |
| `reservado` | **todo o resto** |
| `reservado` | **compromisso ou despesa PJ** (contador, DAS, TFE, Contabilizei e afins), **mesmo saindo do banco da Beta** |
| `reservado` | **na dúvida** |

O pagamento de conta da casa que sai do débito dele chega `reservado`. O app do chefe reclassifica para `casa`.

## 3. O depósito

```
rpc money_robo_depositar(p_grupo uuid, p_itens jsonb)
p_itens = [{ "id": "...", "pacote": "{\"v\":1,\"k\":…,\"iv\":…,\"ct\":…}", "origem": "...", "impressao": "...",
             "escopo": "casa" | "reservado" }]
```

- O pacote tem o mesmo formato de hoje, fechado com a chave pública **do escopo do item**.
- `escopo` ausente ou vazio vale `reservado`. Qualquer outro valor dá erro `22023`.
- **Reenvio:** mesmo `id`. Se o escopo mudou (ex.: CARTAO_QUEM mudou), mande com o escopo novo e o pacote fechado com a chave
  nova: o item troca de escopo na caixa. Com o mesmo escopo, a regra da `impressao` continua a de hoje.
- Nada mais muda: os limites de 500 itens e 20 mil pendentes, os erros e a função `money_sou_robo`.

## 4. Ordem

1. O dono aplica o SQL v4. O robô de hoje continua funcionando: sem `escopo`, tudo vira `reservado`, e o chefe lê tudo.
2. Robô novo: lê as chaves com `escopo`; enquanto não houver `casa`, manda tudo `reservado`.
3. App 3.66 no ar. O chefe roda "Preparar a visão da família": nascem as duas chaves novas, a antiga sai e os pacotes já lidos
   são apagados.
4. Na rodada seguinte, o robô já vê a `casa` e passa a separar.
