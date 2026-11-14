# app/ (Marllon e Chandy)

Web app offline para qualquer dispositivo com browser (telemóvel, tablet, PC). 5 ecrãs: painel com o corpo, teste rápido (Amsler, acuidade, 4 perguntas), OCT guiado, gráfico com semáforo, acções e pacote para o médico de voo.

Carregar por esta ordem no `index.html` (sem fetch, sem CDN):
```html
<script src="dados.js"></script>          <!-- gerado pelo simulador: window.FAIXAS, window.ASTRONAUTAS -->
<script src="../motor/regras.js"></script> <!-- window.REGRAS -->
<script src="../motor/motor.js"></script>  <!-- window.Motor -->
```
Exemplo: `Motor.avaliar(Motor.registosDe("DEMO_B", ASTRONAUTAS), 90, FAIXAS, REGRAS)` → cor, motivos e texto. Ver `../docs/EDILSON.md`, secção 4.
