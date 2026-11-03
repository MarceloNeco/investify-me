@echo off
REM ============================================================
REM  MoneyTRIO - abre a pagina de teste num servidor local
REM  Basta dar dois cliques neste arquivo.
REM  Para fechar o servidor depois, feche esta janela preta.
REM ============================================================
cd /d "%~dp0"
echo.
echo   MoneyTRIO - abrindo a pagina de teste...
echo   Deixe esta janela aberta enquanto estiver testando.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8765/TESTE-moneytrio.html
  py -m http.server 8765
  goto fim
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8765/TESTE-moneytrio.html
  python -m http.server 8765
  goto fim
)

echo   Nao encontrei o Python neste computador.
echo.
echo   Sem ele da para testar assim: abra o MoneyTRIO-local.html
echo   com dois cliques. A conferencia automatica do pacote e que
echo   precisa do servidor local.
echo.
pause

:fim
