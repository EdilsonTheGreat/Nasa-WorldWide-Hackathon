@echo off
REM Windows: duplo clique para abrir a app SEM internet.
REM Cria um servidor local (http://localhost:8000) porque o browser
REM nao deixa usar a camara nem carregar o modelo a partir de file://.
cd /d "%~dp0"
echo A abrir a app em http://localhost:8000/app/ (fecha esta janela para parar)
start "" "http://localhost:8000/app/camara/teste_visao.html"
python -m http.server 8000
