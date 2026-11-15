# app/visao/ (Marllon's interface, wired to the backend)

Marllon's 8 screens (`Main`, `Hoje` (Today), `TesteRapido` (Quick test), `Tendencia` (History), `SANS`, `Alerta` (Alerts), `Perfil` (Profile), `OCT`) with the backend connected.
Open with `abrir_app.command` (Mac) or `abrir_app.bat` (Windows): it starts at `Main.html`, on `http://localhost:8000`.
Double-clicking the file makes everything work **except the camera** (distance).

## How it is wired

```
screen (.html)  ->  window.Visao (ligacao.js)  ->  Armazem, Motor, Modelo, Distancia
```

Each screen loads, in this order: `../dados.js`, `../../motor/regras.js`, `../../motor/motor.js`, `../../motor/modelo.js`,
`../armazenamento.js`, (`../camara/...` only in `Main` and `TesteRapido`), `ligacao.js`, `runtime.js`.

There are two kinds of session, chosen in `Main.html`:

| Session | Who | Where the data comes from | Saved? |
|---|---|---|---|
| **Team · real data** | CHANDY, EDILSON, LUKANGA, MARLLON, NEYDE, SHEINAZE (`Armazem.EQUIPA`) | Tests taken on the device + `Motor` + `Modelo` | Yes, `localStorage` (`dt_registos`) |
| **Demo · fictional** | Marta (A), Daniel (B), Sofia (C) | Marllon's sample values | No |

The real session is stored in `localStorage["visao-real"]` (profile id) and `visao-dia-<ID>` (mission day chosen on entry).
On every screen the rule is the same: `const R = Visao.something(); use R if it exists, otherwise the sample values`.

## What each screen uses from the backend

| Screen | Real session | Demo |
|---|---|---|
| `Main` | Profile list (`Armazem.perfis`): one tap opens the profile (`Visao.entrar`), no authentication; mission day set automatically | One tap opens the persona |
| `TesteRapido` | Compares with the **baseline** (1st test), saves the test (`Visao.guardarTeste`), color decided by `Motor.corAmsler` and `Motor.corAcuidade` eye by eye, warnings from `Modelo` | Marllon's sample logic |
| `TesteRapido` (both) | Distance measured live by the camera (`Distancia`): 35 to 45 cm for acuity, 28 to 38 cm for the grid | same |
| `Hoje` | Latest test, status per eye, recommendation (`Visao.resumoHoje`) | Sample |
| `SANS` | Timeline of saved tests (`Visao.linhaTempo`) | Sample |
| `Alerta` | Alerts generated from the tests (`Visao.alertas`) | Sample |
| `Perfil` | Only real data from the device (`Visao.fichaPerfil`); "Switch profile" goes back to `Main` | Sample |
| `Tendencia` | For everyone: `DEMO_A/B/C` series from the simulator, P10/P90/P97 ranges from `FAIXAS`, and color from `Motor.corOCT` | same |
| `OCT` | Still a simulated example (there is no OCT on board); labeled as "Simulated example" | Sample |

## Scales used by this interface (important)

- Acuity: **0 to 5 lines per eye** (`acuidade_oe`, `acuidade_od`). `acuidade_linha` = the worse of the two (for `Modelo`).
- Amsler grid: 12x12 per eye (`celulas_od`, `celulas_oe`), converted to the engine's 9 zones (`amsler_od`, `amsler_oe`); the central 4x4 block is zone 4.
- Questions: No / Mild / Marked = 0 / 1 / 3.
- Screen levels: green 0, yellow 1 (questionable conditions), orange 2 (= engine yellow, or symptoms), red 3 (= engine red).
- The old test screen (`app/camara/teste_visao.html`) uses 10 lines and a 3x3 grid. **Do not mix the two on the same profile.**

## Fixes from Nov 14 (team request)

- **"Screen" instead of "tablet"** in all texts.
- **Iris**: the eye image on the home screen changes with the selected profile; each profile keeps its own iris
  (`visao-iris-<ID>`, chosen in Profile). See `Visao.irisDe(id)` and `Visao.guardarIris(id, iris)`.
- **Background follows the iris** (`iris.css`): dark = black with a glow in the iris color; light = white with the iris color.
- **Gradient under the navigation bar** (background color: black in dark mode, white in light mode) when there is content behind it.
- **Instructions before the test**: acuity and the Amsler grid start with an instructions screen and a "Start" button.
- **Voice** (`voz.js`): spoken instructions (system voices, no internet): "Which letters do you see?", "Move back a little
  from the screen", "Move closer", "Say next to continue". "Voice on/off" button.
  **Microphone** (optional): say the letters, "next", "delete", "can't read", "all straight". Only works if the browser
  recognizes speech **on the device** (`processLocally`, recent Chrome/Edge); audio never leaves the device.
  The language pack is downloaded once, with internet, in `index.html` → "Prepare voice". Without it, the buttons are used.
- **Score indicator**: instead of "tap the letters you recognize", the astronaut taps the letter they see on a keypad
  (C D E F L O P T Z). Each letter turns green (correct) or red (wrong); a line counts as read with 60% correct.
  Scores are saved (`acertos_oe`, `acertos_od`, e.g. "14/15").
- **Simplified acuity screen**: only the eye, the line, the letters, the score, and the keypad.
- **Responsiveness** (`runtime.js`): wide screens (PC, tablet, TV) show the full design, scaled up, with the background filling the window.
  Narrow or short screens (phone; width < 820 px or height < 520 px) switch to **column mode**: blocks stack on top of each other,
  at real size, with scrolling; the navigation bar stays fixed at the bottom; card grids become one column;
  charts with fixed positions (SANS timeline) scroll sideways. The screen does not rotate.
- **Test split into two halves** (acuity and Amsler grid): the test on the left; on the right the **live camera image**
  with the distance overlaid (cm, "Right distance / Too close / Too far", green or yellow frame) and the voice buttons.
  There is only one `<video>`: it is registered in `window.DC_FIXOS.camara` and `runtime.js` slots it wherever the screen has
  `<div data-fixo="camara">` (the screen is redrawn on every change, so the video cannot live inside the template).
  Nothing is recorded: the image is only displayed and used to measure distance.

## English, voice, and profiles (Nov 14, evening)

- **The whole interface is in English.** Engine texts are translated in `ligacao.js` (`Visao.en`). OE/OD → LE/RE.
- **Answering letters by voice** ("Answer by voice" button in the acuity test): say the letters ("F P", "tee oh zed"),
  "next", "delete", "can't read", "all straight", "repeat".
  - Recent Chrome/Edge: recognition **on the device** (English pack downloaded once in `index.html` → "Prepare voice").
  - Safari and others: only recognize via the internet (Apple/Google service). The app asks for explicit permission
    ("Allow online voice"); the choice is stored in `visao-voz-online`. *(Removed later on Nov 15, see below.)*
- **Profile AUTRO1** (created by mistake) is removed automatically once (`visao-limpo-autro1`). Any profile
  outside the team can be removed in `Main` ("Remove profile", two taps). Team profiles are never removed.
- **No cache:** `servidor.py` + a version on the files (`?v=...`): when files change, bump the version in every `.html`.

## To do

- The VISION GUARD pre-exam questionnaire (9 questions, `REGRAS.prontidao`, `Motor.prontidao`) only exists in `app/camara/teste_visao.html`.
  Here the "Before you start" step has the spacecraft-motion question and 4 symptoms. Marllon still needs to design that step. *(Done on Nov 15, see below.)*
- Distance calibration (`Distancia.calibrar(40)`) does not have a button in this interface yet.
- Creating new profiles (beyond the team) does not have a button yet: `Armazem.criarPerfil("NAME")` in the console, or through the old test screen.

## Rules

- No internet: the Manrope font is in `assets/fonte/` (OFL license). No external `<link>` tags.
- No authentication: no password and no face recognition. You pick the profile and go in.
- "Reset the demo" (in `index.html`) clears only the `visao-*` keys. Real tests are kept.

## Recorded voice (Nov 14)
- The phrases spoken during the test play the MP3s in `audio/` (list in `audio/frases.md`), via `Voz.falarClip(clips, texto)`.
- If a file is missing or fails to play, the same phrase is spoken by the system voice (speechSynthesis). All offline.
- On the result step, the level is read aloud (result_green/yellow/orange/red).
- Voice generated with ElevenLabs (elevenlabs.io). Non-commercial use (free plan).

## IRIS and the final report (Nov 14)
- App name: IRIS (Integrated Remote Intelligence for Spaceflight), in the header, the titles, and the entry screen.
- Result → "Final report": conclusion, tests, mission data (microgravity with the P50/P90 range from `dados/faixas.json`,
  light measured by the camera, spacecraft motion, distance) and the why. New functions: `Visao.missao(dia, letraDemo)`, `Visao.camara.luz()`.
- Low or high light in 40% or more of the readings is added to the caveats (yellow result if the tests are unchanged).
- New record fields: `luz_media` (0–100) and `luz_nivel` (boa | fraca | forte = good | low | high).
- Column mode: the navigation bar is fixed at the bottom again (the runtime was looking for the Portuguese label).

## Nov 15: pre-registration, questionnaire, privacy, seen alerts, PT/EN
- **Pre-registration (day 0, on Earth):** `Registo.html`. Mission sheet (destination, launch, duration), eye sheet (correction, backup glasses,
  known conditions), and an optional baseline OCT; then the baseline tests. Saved in `visao-registo-<ID>` (`Visao.registoDe/guardarRegisto`).
  A profile's 1st entry without pre-registration goes to this screen. Day 0 is always shown as "Pre-flight / Pré-voo".
- **Pre-exam questionnaire (VISION GUARD):** the 9 questions from `REGRAS.prontidao`, 3 per screen, with green/yellow/red readiness
  (`Motor.prontidao`). Red blocks the test; sudden loss or double vision = clinical alert. Saved in `pre_exame` and `alteracao_visual`.
  New visual change → orange; significant (3, 4) → red.
- **History privacy:** a real profile only sees its own data. History (Tendencia) and OCT show only that person's own tests/exams
  (`Visao.historico`, `Visao.octDe/guardarOCT`); the entry list no longer shows other people's tests; in the demo, only the persona in session.
- **Seen alerts:** "Mark as seen" is saved per profile (`visao-vistos-<ID>`), the button turns into "Seen ✓"; "Mark all as seen"; Today only counts unseen ones.
- **Letters and keypad randomized** on every test (9 of 15 letters: Sloan C D H K N O R S V Z + E F L P T).
- **PT ↔ EN:** button next to the theme toggle on every screen. `i18n.js` translates the rendered text (dictionary + rules for texts with numbers);
  in PT the voice uses the system's Portuguese voice (the MP3s are in English) and recognition runs in pt-PT with the letter names in Portuguese.
  To change translations: edit the dictionary in `i18n.js` (MAPA) or the REGRAS at the end of the file.

## Nov 15 (afternoon): logo and cleanup
- Team logo in `assets/logo_iris.png` (mark + "iris") and `assets/logo_marca.png` (flower only). They are masks: `.dt-logo` / `.dt-marca`
  (in `fonte.css`) paint them with the text color, so they work in both light and dark themes. Tab icon: `assets/logo_icone.png`.
- "Onboard essentials" on Today (general guidance: eyes, body, and the golden rule).
- Consistency: the astronaut's own OCT appears in the SANS timeline, in Profile, and in the final report; "Vision changes" uses the same name everywhere;
  History chart shows both eyes; index thumbnails redone with the current screens.


## Nov 15: automatic report sending
- Every saved test goes **immediately** into the outbox for the medical team (`Visao.enviosDe(id)`, key `visao-envios-<ID>`), without asking. It stores the day, the color the astronaut sees, the priority (routine / review / priority), and the time.
- The app has no network: the status is "queued" and the report goes out by itself at the next contact with Earth.
- Alerts: the "Send to the flight surgeon" button (and "Undo") was removed. A "Sent automatically to the medical team" card remains (or "… flight surgeon · priority" for red).
- The result and the final report say the report was sent automatically.

## Nov 15 (afternoon): step 1 in two screens, phone warning, sending to Earth
- Step 1 starts with a "Hello, <name>" screen (what will happen + preparation) and a "Start the questions ›" button. Only then does the questionnaire appear, now full width (the overlapping buttons on page 2 are gone).
- Readiness (Ready / Ready with caveats / Not reliable) appears in a band inside the questionnaire once all 9 answers are given.
- Question 4 remains multiple choice, as in the VISION GUARD questionnaire ("you may select several"); the other 8 accept only one answer.
- Phone (screen < 600 px and touch): a warning to use a laptop or tablet; the button becomes "Continue on this phone ›". On narrow screens the options stack in one column.
- The automatic-sending texts now say "to Earth · medical team".

## Nov 15 (evening): faster and more tolerant speech recognition (voz.js)
- Interim results: letters are delivered as soon as the next word arrives, without waiting for the silence at the end of the sentence. Commands (next, delete…) wait for the final result.
- Phone: instead of continuous mode (which repeats and cuts off on Android), it listens phrase by phrase and restarts immediately.
- Recent Chrome: hints to the recognizer with the letter names and the commands (SpeechRecognitionPhrase), when available.
- Questionnaire: each answer takes the color the engine gives it (green, yellow = caveat, red = not reliable). The readiness band shows the reasons as short tags, and "Answer again" moved to the button row; the card no longer overflows.

## Nov 15 (evening): voice on other devices
- The browser only grants the microphone (and camera) on `https://` or on `localhost`. On another device via `http://IP` the voice was blocked without warning; now the app explains why.
- `python3 servidor.py --rede` serves the app over https on the Wi-Fi network (port 8443) with a self-signed certificate created on the fly (`.cert/`, not in git) and shows the address for other devices. The first time, each device warns about the certificate: accept and continue.
- Without `--rede` it works as before: only `http://localhost:8000` on this computer.
- Firefox has no speech recognition; on Safari (iPhone/Mac) voice goes through Apple's service and you need to tap "Allow online voice".

## Nov 15 (evening): on-device voice only, no internet
- Online speech recognition was removed (the "Allow online voice" button and the `visao-voz-online` key, which is cleared on startup). The app uses no internet for anything.
- Voice only works with on-device recognition (`processLocally`, recent Chrome/Edge on a computer). The English pack is installed once before the mission ("Prepare voice" on the index), like the app itself.
- Safari and phones (which only recognize through Apple/Google servers): the app tells the user to use the letter keys.

## Nov 15 (evening): OFFLINE voice in any browser (Vosk)
- The app ships its own speech recognizer: `vosk/vosk.js` (vosk-browser, WebAssembly) + `vosk/modelo-en.bin` (official `vosk-model-small-en-us-0.15` model, ~40 MB). Licenses in `vosk/LICENCAS.md` (Apache-2.0).
- Works in Safari, Chrome, Edge, and on phones, **without internet**: the browser asks for the microphone and the audio never leaves the device.
- It only listens for the test vocabulary: the 9 keypad letters of this test + "next", "delete", "can't read", "repeat", "all straight"… (restricted grammar = fewer mistakes).
- The model starts loading in the background 2.5 s after the test opens. "Check offline voice" on the index confirms it runs in the browser.
- In Portuguese, letters are spoken in English (cee, dee, ee…) when the recognizer is Vosk; the English commands work in both languages.
- Tested with a synthetic voice (espeak): all commands and most letters correct; T, D, and V are the most often confused.

## Nov 15 (evening): Amsler grid by dragging
- Tapping a square marks/unmarks it; **dragging** (mouse or finger) paints every square it passes over. The 1st square decides: if it was empty the drag marks, if it was marked the drag clears.
- Built with pointer events on the document (`ligarArrasto` in TesteRapido.html), because the screen is redrawn on every square. The grid has `touch-action: none` so the finger does not scroll. The keyboard (Tab + Enter) still works.

## Nov 15 (evening): no authentication in "Pick your profile"
- The challenge cannot have authentication: face login, password, face registration, and "Enter without camera" were removed.
- `Main`: one tap on the profile opens it. Team → `Visao.entrar(id)` and goes to `Registo` (1st time) or to `Hoje`; Demo → `Hoje` with the persona.
- Automatic mission day for real profiles: 0 (pre-flight) the 1st time; after that, one week after the last test (`Visao.diaSugerido`).
- `Perfil`: "Switch profile" goes back to `Main` (the sheet with Face ID / password and "Sign out" was removed); "Delete my face" was removed.
  Profiles outside the team (created by mistake) are removed in Profile › Privacy ("Remove this profile", 2 taps).
- `ligacao.js` clears, once, any face descriptors saved earlier (`dt_rostos`) and the `visao-entrada` key.
- `app/camara/teste_visao.html` (the backend test screen) no longer has face login either. `app/camara/rosto.js`
  and `app/camara/vendor/faceapi/` were removed from the project (face-api was only used for this; distance uses MediaPipe).
