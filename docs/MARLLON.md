# How to connect the interface (UI) to the backend. For Marllon and his Claude

> **UPDATE (Nov 14): your interface is already integrated in `app/visao/`.** Read `app/visao/README.md`: it says which screens use real data, which still use sample values, and what is left to design (pre-exam questionnaire, distance calibration, profile creation). What follows below is the reference for the backend functions.
>
> Read `CLAUDE.md` at the root first. The backend is ready and tested; the UI only needs to **call these functions**. No logic needs to be rewritten.

## 1. Scripts to load in your HTML (in this order, paths relative to `app/`)
```html
<script src="dados.js"></script>                          <!-- FAIXAS, ASTRONAUTAS (simulated) -->
<script src="../motor/regras.js"></script>                <!-- REGRAS (thresholds and phrases) -->
<script src="../motor/motor.js"></script>                 <!-- Motor  (traffic-light color) -->
<script src="../motor/modelo.js"></script>                <!-- Modelo (prediction that learns from each exam) -->
<script src="armazenamento.js"></script>                  <!-- Armazem (profiles and tests stored on the device) -->
<script src="camara/vendor/mediapipe/face_detection.js"></script>
<script src="camara/distancia.js"></script>               <!-- Distancia (camera) -->
```
No `fetch`, no CDN. The camera only works when opened with `abrir_app.command` / `abrir_app.bat` (http://localhost).

## 2. Profiles and data (`Armazem`)
| Call | Returns |
|---|---|
| `Armazem.perfis()` | `[{id, testes, ultimo_dia, tem_oct}]` for the saved real astronauts |
| `Armazem.registosDe(id)` | records sorted by day |
| `Armazem.guardar({astronauta_id, dia, ...fields})` | saves; merges with the record for the same day. Fields: `oct_um`, `amsler_od`, `amsler_oe`, `amsler_zonas`, `amsler_centro`, `acuidade_linha`, `acuidade_com_oculos`, `melhora_com_oculos`, `perg_focar`, `perg_contraste`, `perg_dor_cabeca`, `perg_visao_dupla`, `distancia_cm`, `sem_camara` |
| `Armazem.apagarPerfil(id)` | deletes the profile |
| `Armazem.avaliar(id, dia)` | `{semaforo, modelo}` (see below) |
| `Armazem.normalizarId(nome)` | `"  marllon "` → `"MARLLON"` |

**Simulated** astronauts (demo A, B, C): `Motor.avaliar(Motor.registosDe("DEMO_B", ASTRONAUTAS), 90, FAIXAS, REGRAS)` and `Modelo.treinar(Motor.registosDe("DEMO_B", ASTRONAUTAS), FAIXAS, 90)`.

## 3. What to show on the result screen
`semaforo` (from `Motor.avaliar`):
```js
{ cor_final: "verde"|"amarelo"|"vermelho"|"a_calibrar",
  texto: "Repete daqui a 3 dias. ...",      // sentence for the astronaut
  proximo_teste_dias: 3,
  motivos: ["Retina +16%, acima do esperado ...", ...],
  sinais: { oct: {cor, delta_pct, z, motivo}, amsler: {cor, zonas_novas, motivo}, acuidade: {cor, perda, motivo} } }
```
(`verde` = green, `amarelo` = yellow, `vermelho` = red, `a_calibrar` = calibrating. The engine writes its texts in Portuguese; `app/visao/ligacao.js` translates them for the interface.)

`modelo` (from `Modelo.treinar`): `{ texto, avisos: [...], previsao: {dia: 150, delta_pct, min, max}, dia_amarelo, dia_vermelho }`. It is informational: **it does not change the color**.

## 3b. OCT: simulated astronauts only
The team decided **not to record OCT** for real astronauts (there is no OCT device in the demo). Do not create an OCT entry screen. The OCT signal and the retina prediction appear only for the simulated astronauts (DEMO_A, DEMO_B, DEMO_C). For real profiles, `sinais.oct.cor` is `"a_calibrar"` and does not count toward the final color; `modelo.previsao` is `null` and `modelo.avisos` contains the personal-pattern warnings.

## 4. Chart (screen 4, simulated astronauts)
- Expected range: `FAIXAS.p10[dia]`, `p90[dia]`, `p97[dia]` (days 0..180), as percentage change.
- Astronaut curve: for each record with `oct_um`, `(oct_um − base) / base × 100`, where `base` = the first `oct_um`.
- Prediction: `Modelo.prever(estado, dia)` for future days (`estado` = `Modelo.treinar(...).estado`).

## 5. Camera
```js
Distancia.iniciar(videoEl, { minCm: 30, maxCm: 45, pastaModelo: "camara/vendor/mediapipe/",
  aoMudar: function (r) { /* r.estado: ok | perto | longe | sem_cara | indisponivel ; r.cm ; r.mensagem */ } });
Distancia.calibrar(40);  Distancia.parar();
```
(`perto` = too close, `longe` = too far, `sem_cara` = no face detected, `indisponivel` = camera unavailable.)

## 5b. No authentication
The challenge cannot have authentication: you pick the profile from the list and go in (no password and no face recognition). The old `Rosto` module (`camara/rosto.js` + `camara/vendor/faceapi/`) was removed from the project.

## 5c. Team profiles and pre-exam questionnaire
- `Armazem.perfis()` already returns CHANDY, EDILSON, LUKANGA, MARLLON, NEYDE, and SHEINAZE (`Armazem.EQUIPA`); `Armazem.criarPerfil(nome)` creates others.
- Questionnaire (VISION GUARD): the questions and options are in `REGRAS.prontidao.perguntas`; build the UI from there. `Motor.prontidao(respostas, REGRAS)` → `{estado: verde|amarelo|vermelho, ressalvas, alerta_clinico, sintomas, texto, texto_alerta}`. Red = do not proceed to the test. `alerta_clinico` = always show `texto_alerta`, even without a test. Save with the test: `pre_exame`, `prontidao`, `ressalvas`, `alerta_clinico`.

## 6. Full working example
`app/camara/teste_visao.html` + `teste_visao.js`: profiles, pre-exam questionnaire, distance, Amsler per eye, near reading, backup glasses, 4 questions, traffic light, and model warnings. You can copy the logic blocks and change only the HTML/CSS. The markers `window.__passo`, `window.__resultado`, and `window.__modelo` are used by automated tests: keep them if you can.

## 7. Prompt to paste into your Claude
> Read `CLAUDE.md` and `docs/MARLLON.md`. I have my UI in `app/` (tell it the files). Connect it to the existing backend using only the functions described in `docs/MARLLON.md` (`Armazem`, `Motor`, `Modelo`, `Distancia`), without rewriting logic and without changing files in `motor/`, `simulador/`, `dados/`, or `app/camara/vendor/`. Use `app/camara/teste_visao.js` as the reference for how to call each function. At the end, confirm that it works without internet.
