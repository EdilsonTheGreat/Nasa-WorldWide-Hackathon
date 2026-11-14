# app/ (Marllon e Chandy)

Web app offline para qualquer dispositivo com browser (telemóvel, tablet, PC). 5 ecrãs: painel com o corpo, teste rápido (Amsler, acuidade, 4 perguntas), OCT guiado, gráfico com semáforo, acções e pacote para o médico de voo.

Carregar por esta ordem no `index.html` (sem fetch, sem CDN):
```html
<script src="dados.js"></script>          <!-- gerado pelo simulador: window.FAIXAS, window.ASTRONAUTAS -->
<script src="../motor/regras.js"></script> <!-- window.REGRAS -->
<script src="../motor/motor.js"></script>  <!-- window.Motor -->
```
Exemplo: `Motor.avaliar(Motor.registosDe("DEMO_B", ASTRONAUTAS), 90, FAIXAS, REGRAS)` → cor, motivos e texto. Ver `../docs/EDILSON.md`, secção 4.

## Módulo da câmara: distância ao ecrã (`camara/`)

A câmara **não faz** o teste de Amsler (o teste mede o que a pessoa vê). Serve só para garantir que a acuidade e o Amsler são feitos sempre à mesma distância (30–45 cm), para os resultados serem comparáveis de dia para dia.

- `camara/distancia.js`: `Distancia.iniciar(video, {minCm, maxCm, aoMudar})`, `Distancia.calibrar(40)`, `Distancia.parar()`
- `aoMudar(r)` recebe `{estado: "ok"|"perto"|"longe"|"sem_cara"|"indisponivel", cm, mensagem}`
- Distância = K / (distância entre os olhos em píxeis). Sem calibração, ±15%. Com o botão "Estou a 40 cm", K fica exacto e é guardado no aparelho.
- `camara/vendor/mediapipe/`: detector de caras do Google (Apache-2.0), copiado para funcionar **sem internet**. Não editar.
- Demo: `camara/teste_distancia.html`.
- **Abrir com `abrir_app.command` (Mac) ou `abrir_app.bat` (Windows)**, não com duplo clique no HTML. Com `file://` a câmara fica `indisponivel` e a app mostra "Segura o ecrã a cerca de 40 cm".
- Testado em Chrome automático, com câmara simulada e internet bloqueada: carrega offline, rejeita objectos que não são caras e falha de forma limpa em `file://`.
