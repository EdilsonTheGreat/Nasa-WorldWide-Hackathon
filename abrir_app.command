#!/bin/bash
# Mac: duplo clique para abrir a app SEM internet.
# Cria um pequeno servidor local (http://localhost:8000) porque o browserexit
# não deixa usar a câmara nem carregar o modelo a partir de file://.
cd "$(dirname "$0")"
PORTA=8000
echo "A abrir a app em http://localhost:$PORTA/app/ (fecha esta janela para parar)"
( sleep 1; open "http://localhost:$PORTA/app/camara/teste_visao.html" ) &
python3 -m http.server $PORTA
