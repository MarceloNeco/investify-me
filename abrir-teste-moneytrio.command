#!/bin/bash
# ============================================================
#  MoneyTRIO - abre a pagina de teste num servidor local
#  Dois cliques neste arquivo.
#  Na primeira vez o Mac pode recusar: clique com o botao
#  direito > Abrir > Abrir.
#  Para fechar o servidor depois, feche a janela do Terminal.
# ============================================================
cd "$(dirname "$0")" || exit 1
echo ""
echo "  MoneyTRIO - abrindo a pagina de teste..."
echo "  Deixe esta janela aberta enquanto estiver testando."
echo ""

if command -v python3 >/dev/null 2>&1; then
  ( sleep 1; open "http://localhost:8765/TESTE-moneytrio.html" ) &
  python3 -m http.server 8765
else
  echo "  Nao encontrei o Python neste computador."
  echo ""
  echo "  Sem ele da para testar assim: abra o MoneyTRIO-local.html"
  echo "  com dois cliques. A conferencia automatica do pacote e que"
  echo "  precisa do servidor local."
  echo ""
  read -r -p "  Aperte Enter para fechar."
fi
