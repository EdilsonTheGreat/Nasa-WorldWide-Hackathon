// =====================================================================
// voz.js: spoken instructions and voice commands (English)
//
// 1. SPEAK (speech synthesis): uses the voices installed on the system
//    (Mac, iPad, Windows, Android). Prefers a local English voice.
//    No voice installed -> the app keeps working with text only.
//
// 2. LISTEN (speech recognition) to answer the letters by voice. ALWAYS OFFLINE.
//    a) VOSK (vosk/vosk.js + vosk/modelo-en.bin, ~40 MB, shipped with the app): Kaldi in
//       WebAssembly, inside the browser. Works in Safari, Chrome, Edge and on phones. Only the
//       test vocabulary is listened for (letter names + commands), so it is accurate and fast.
//       The browser asks for the microphone; the sound never leaves the device.
//    b) Chrome/Edge on-device recognition (processLocally) if Vosk cannot run here.
//    No online recognition (Apple/Google servers) is ever used.
//
// Use:
//   Voz.falar("Which letter do you see?")
//   Voz.ligada() / Voz.alternar()                       spoken instructions on/off
//   Voz.ligarMicrofone(aoOuvir, aoEstado, letters)   letters = the 9 letters of this test's keyboard
//        aoOuvir(text), aoEstado({estado, mensagem})
//        estado: desligado | a_preparar | a_ouvir | sem_pacote | indisponivel | erro
//   Voz.desligarMicrofone()
//   Voz.interpretar("F P next", letters)  -> [{tipo:"letra", v:"F"}, {tipo:"letra", v:"P"}, {tipo:"seguinte"}]
// =====================================================================
(function (g) {
  "use strict";
  var BASE = (function () { try { return g.document && g.document.currentScript ? g.document.currentScript.src : g.location.href; } catch (e) { return ""; } })();
  var CHAVE = "visao-voz";              // "1" speak, "0" silent
  // Sem reconhecimento online: apaga a autorização antiga, se ficou guardada neste aparelho.
  try { g.localStorage.removeItem("visao-voz-online"); } catch (e) { }
  // Língua da app (botão PT/EN, i18n.js): voz e reconhecimento seguem-na.
  function emPT() { return !!(g.I18N && g.I18N.lingua() === "pt"); }
  var IDIOMAS_EN = ["en-US", "en-GB"], IDIOMAS_PT = ["pt-PT", "pt-BR"];
  var IDIOMAS = IDIOMAS_EN;
  function idiomas() { IDIOMAS = emPT() ? IDIOMAS_PT : IDIOMAS_EN; return IDIOMAS; }
  var voz = null, aFalar = false;

  function ler(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }
  function escrever(k, v) { try { g.localStorage.setItem(k, v); } catch (e) { } }
  var sintese = g.speechSynthesis || null;

  function escolherVoz(pt) {
    if (!sintese) return null;
    var vs = sintese.getVoices() || [];
    function procura(f) { for (var i = 0; i < vs.length; i++) if (f(vs[i])) return vs[i]; return null; }
    if (pt) return procura(function (v) { return /^pt[-_]PT/i.test(v.lang) && v.localService; }) ||
                   procura(function (v) { return /^pt/i.test(v.lang) && v.localService; }) ||
                   procura(function (v) { return /^pt/i.test(v.lang); });
    return procura(function (v) { return /^en[-_](GB|US)/i.test(v.lang) && v.localService; }) ||
           procura(function (v) { return /^en/i.test(v.lang) && v.localService; }) ||
           procura(function (v) { return /^en/i.test(v.lang); });
  }
  var vozPT = null;
  if (sintese) {
    voz = escolherVoz(false); vozPT = escolherVoz(true);
    if (typeof sintese.addEventListener === "function") sintese.addEventListener("voiceschanged", function () { voz = escolherVoz(false); vozPT = escolherVoz(true); });
  }

  function ligada() { return ler(CHAVE) !== "0"; }
  function podeFalar() { return !!(sintese && g.SpeechSynthesisUtterance); }

  // semInterromper = true: does not cut an instruction being spoken (e.g. distance hints).
  function falar(texto, semInterromper) {
    if (!texto || !ligada() || !podeFalar()) return false;
    if (semInterromper && (aFalar || sintese.speaking)) return false;
    try {
      sintese.cancel();
      // Em português: o texto (escrito em inglês na app) passa pelo dicionário e usa a voz portuguesa do sistema.
      var pt = emPT();
      if (pt && g.I18N) texto = g.I18N.t(texto);
      var u = new g.SpeechSynthesisUtterance(texto);
      var vz = pt ? vozPT : voz;
      if (vz) { u.voice = vz; u.lang = vz.lang; } else { u.lang = pt ? "pt-PT" : "en-US"; }
      u.rate = 0.95;
      aFalar = true; pausarOuvir();
      u.onend = u.onerror = function () { aFalar = false; retomarOuvir(); };
      sintese.speak(u);
      return true;
    } catch (e) { aFalar = false; return false; }
  }
  function calar() { pararClip(); try { if (sintese) sintese.cancel(); } catch (e) { } aFalar = false; retomarOuvir(); }

  // ------------------------------------------------------------------
  // Recorded voice (ElevenLabs MP3 in app/visao/audio/, generated once before the mission)
  // falarClip(["end_left_3", "then_right_eye"], "fallback text"): plays the files in order;
  // if any file is missing or cannot play, says the fallback text with the system voice.
  // ------------------------------------------------------------------
  var PASTA_AUDIO = "audio/";
  var clipAtual = null, filaId = 0;
  function pararClip() { filaId++; if (clipAtual) { try { clipAtual.pause(); } catch (e) { } clipAtual = null; } }
  function falarClip(clips, texto, semInterromper) {
    if (!ligada()) return false;
    // Os MP3 gravados são em inglês: em português usa a voz do sistema.
    if (!clips || !clips.length || !g.Audio || emPT()) return falar(texto, semInterromper);
    if (semInterromper && (aFalar || (sintese && sintese.speaking))) return false;
    pararClip();
    try { if (sintese) sintese.cancel(); } catch (e) { }
    var id = filaId, i = 0;
    aFalar = true; pausarOuvir();
    function fim() { if (id !== filaId) return; clipAtual = null; aFalar = false; retomarOuvir(); }
    function falhou() { if (id !== filaId) return; clipAtual = null; aFalar = false; falar(texto); }
    function seguinte() {
      if (id !== filaId) return;
      if (i >= clips.length) { fim(); return; }
      var a = new g.Audio(PASTA_AUDIO + clips[i++] + ".mp3");
      clipAtual = a;
      a.onended = seguinte;
      a.onerror = falhou;
      var p = a.play();
      if (p && p.catch) p.catch(falhou);
    }
    seguinte();
    return true;
  }

  // ------------------------------------------------------------------
  // Speech recognition
  // ------------------------------------------------------------------
  var R = g.SpeechRecognition || g.webkitSpeechRecognition || null;
  var mic = { querido: false, rec: null, idioma: null, local: false, aoOuvir: null, aoEstado: null, estado: "desligado", pausado: false };

  function estado(e, msg) {
    mic.estado = e;
    if (mic.aoEstado) mic.aoEstado({ estado: e, mensagem: msg || "" });
  }
  function suportaLocal() { return !!(R && "processLocally" in R.prototype && typeof R.available === "function"); }

  // Looks for an English language pack already installed on the device.
  function idiomaLocal() {
    var i = 0; idiomas();
    function tenta() {
      if (i >= IDIOMAS.length) return Promise.resolve({ idioma: null });
      var lg = IDIOMAS[i++];
      return Promise.resolve(R.available({ langs: [lg], processLocally: true })).then(function (st) {
        if (st === "available") return { idioma: lg };
        return tenta().then(function (r) { if (!r.idioma && (st === "downloadable" || st === "downloading")) r.descarregavel = true; return r; });
      }, tenta);
    }
    return tenta();
  }

  // Telemóvel: o modo contínuo do Chrome/Android repete resultados e corta; aí ouvimos frase a frase e reiniciamos logo.
  var MOVEL = (function () { try { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820); } catch (e) { return false; } })();
  function tokens(t) { return semAcentos(String(t || "").toLowerCase()).replace(/[.,;:!?«»“”"]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean); }
  function eLetra(tok) { return !!((emPT() ? MAPA_PT : MAPA)[tok]); }
  // Dicas ao reconhecedor (Chrome recente): reforça os nomes das letras e os comandos.
  function dicas(rec) {
    try {
      if (typeof g.SpeechRecognitionPhrase === "function" && "phrases" in rec) {
        var lista = emPT() ? ["cê", "dê", "é", "efe", "agá", "capa", "ele", "ene", "ó", "pê", "erre", "esse", "tê", "vê", "zê", "seguinte", "apagar", "não consigo ler", "repetir"]
                           : ["C", "D", "E", "F", "H", "K", "L", "N", "O", "P", "R", "S", "T", "V", "Z", "next", "delete", "can't read", "repeat", "all straight"];
        rec.phrases = lista.map(function (x) { return new g.SpeechRecognitionPhrase(x, 5.0); });
      }
    } catch (e) { }
  }
  function criar() {
    var rec = new R();
    rec.lang = mic.idioma; rec.continuous = !MOVEL; rec.interimResults = true; rec.maxAlternatives = 1;
    if (mic.local) rec.processLocally = true;
    dicas(rec);
    var feitos = {};   // por resultado: quantas palavras já foram entregues
    function entrega(txt) { if (txt && mic.aoOuvir && !aFalar) mic.aoOuvir(txt); }
    rec.onresult = function (ev) {
      for (var k = ev.resultIndex; k < ev.results.length; k++) {
        var r = ev.results[k], ja = feitos[k] || 0;
        if (r.isFinal) {
          var tf = tokens(r[0] ? r[0].transcript : "");
          entrega(tf.slice(Math.min(ja, tf.length)).join(" ")); feitos[k] = tf.length;
        } else {
          // Resultado provisório: as letras já seguidas de outra palavra não mudam mais; entregam-se logo,
          // sem esperar pelo silêncio do fim da frase. Comandos esperam pelo resultado final.
          var ti = tokens(r[0] ? r[0].transcript : ""), est = ja;
          while (est < ti.length - 1 && eLetra(ti[est])) est++;
          if (est > ja) { entrega(ti.slice(ja, est).join(" ")); feitos[k] = est; }
        }
      }
    };
    rec.onerror = function (ev) {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { mic.querido = false; estado("erro", "The browser did not allow the microphone. Use the buttons."); }
      else if (ev.error === "network") { mic.querido = false; estado("erro", "Speech recognition needs internet in this browser and there is none. Use the buttons."); }
      else if (ev.error === "language-not-supported") { mic.querido = false; estado("erro", emPT() ? "O reconhecimento de voz em português não está disponível aqui. Usa os botões." : "English speech recognition is not available here. Use the buttons."); }
    };
    rec.onend = function () {
      // Os browsers param depois de algum silêncio (no telemóvel, a cada frase): voltamos a ouvir logo.
      if (mic.querido && !mic.pausado) {
        if (MOVEL) { mic.rec = criar(); try { mic.rec.start(); } catch (e) { } }
        else { feitos = {}; try { rec.start(); } catch (e) { } }
      }
    };
    return rec;
  }

  function arrancar() {
    mic.rec = criar();
    try {
      mic.rec.start();
      estado("a_ouvir", "Listening (on this device). Say the letters, “next”, “delete” or “can't read”.");
    } catch (e) { mic.querido = false; estado("erro", "Could not start the microphone. Use the buttons."); }
  }

  // ------------------------------------------------------------------
  // Vosk: reconhecimento offline dentro do browser (WebAssembly)
  // ------------------------------------------------------------------
  // Só o vocabulário do teste: os nomes das letras DESTE teclado + comandos. Tudo o resto cai em [unk].
  // Com menos palavras possíveis o reconhecedor confunde menos letras parecidas (T/D/V…).
  var FORMAS = { C: ["c", "see"], D: ["d"], E: ["e"], F: ["f"], H: ["h"], K: ["k"], L: ["l"], N: ["n"], O: ["o", "oh"], P: ["p"], R: ["r"], S: ["s"], T: ["t"], V: ["v"], Z: ["z", "zed", "zee"] };
  var COMANDOS_VOZ = ["next", "delete", "undo", "can't read", "cannot read", "can't see", "repeat", "again", "all straight", "looks straight", "done", "finish", "[unk]"];
  function gramatica(letras) {
    var g2 = [];
    (letras && letras.length ? letras : Object.keys(FORMAS)).forEach(function (L) { (FORMAS[String(L).toUpperCase()] || []).forEach(function (w) { g2.push(w); }); });
    return g2.concat(COMANDOS_VOZ);
  }
  var VK = { promessa: null, modelo: null, sessao: null };
  function voskPossivel() {
    try { return !!(g.WebAssembly && g.Worker && g.navigator.mediaDevices && g.navigator.mediaDevices.getUserMedia && (g.AudioContext || g.webkitAudioContext)); } catch (e) { return false; }
  }
  function url(rel) { try { return new URL(rel, BASE).href; } catch (e) { return rel; } }
  // Carrega a biblioteca e o modelo uma vez por página (o modelo vem do próprio servidor da app).
  function carregarVosk() {
    if (VK.promessa) return VK.promessa;
    VK.promessa = new Promise(function (ok, falha) {
      var limite = setTimeout(function () { falha(new Error("tempo")); }, 180000);
      function criar() {
        try {
          var m = new g.Vosk.Model(url("vosk/modelo-en.bin"), -1);
          m.on("load", function (msg) { clearTimeout(limite); if (msg.result) { VK.modelo = m; ok(m); } else falha(new Error("modelo")); });
          m.on("error", function (msg) { clearTimeout(limite); falha(new Error(msg && msg.error || "modelo")); });
        } catch (e) { clearTimeout(limite); falha(e); }
      }
      if (g.Vosk) { criar(); return; }
      var sc = g.document.createElement("script"); sc.src = url("vosk/vosk.js");
      sc.onload = criar; sc.onerror = function () { clearTimeout(limite); falha(new Error("vosk.js")); };
      g.document.head.appendChild(sc);
    });
    VK.promessa.catch(function () { VK.promessa = null; });
    return VK.promessa;
  }
  function entregar(txt) { if (txt && mic.aoOuvir && !aFalar) mic.aoOuvir(txt); }
  function fecharVosk() {
    var x = VK.sessao; VK.sessao = null; if (!x) return;
    try { x.no.onaudioprocess = null; x.no.disconnect(); x.fonte.disconnect(); } catch (e) { }
    try { x.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
    try { x.rec.remove(); } catch (e) { }
    try { x.ctx.close(); } catch (e) { }
  }
  function ligarVosk() {
    var AC = g.AudioContext || g.webkitAudioContext;
    var ctx;
    try { ctx = new AC(); } catch (e) { ctx = null; }        // criado já, dentro do toque (o Safari exige)
    estado("a_preparar", VK.modelo ? "Preparing the microphone…" : "Preparing voice recognition on this device (first time takes a few seconds)…");
    var pedido = g.navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    Promise.all([pedido, carregarVosk()]).then(function (r) {
      var stream = r[0], modelo = r[1];
      if (!mic.querido || !ctx) { stream.getTracks().forEach(function (t) { t.stop(); }); if (ctx) ctx.close(); return; }
      var rec = new modelo.KaldiRecognizer(ctx.sampleRate, JSON.stringify(gramatica(mic.letras)));
      var feitos = 0;   // palavras da frase actual já entregues
      rec.on("partialresult", function (m) {
        // As letras já seguidas de outra palavra não mudam mais: entregam-se logo.
        var ti = tokens(m.result && m.result.partial), est = feitos;
        while (est < ti.length - 1 && eLetra(ti[est])) est++;
        if (est > feitos) { entregar(ti.slice(feitos, est).join(" ")); feitos = est; }
      });
      rec.on("result", function (m) {
        var tf = tokens(m.result && m.result.text).filter(function (x) { return x !== "[unk]"; });
        entregar(tf.slice(Math.min(feitos, tf.length)).join(" ")); feitos = 0;
      });
      var fonte = ctx.createMediaStreamSource(stream);
      var no = ctx.createScriptProcessor(4096, 1, 1);
      no.onaudioprocess = function (ev) {
        if (aFalar || mic.pausado || !mic.querido) return;      // não ouve a própria voz da app
        try { rec.acceptWaveform(ev.inputBuffer); } catch (e) { }
      };
      fonte.connect(no); no.connect(ctx.destination);
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      VK.sessao = { ctx: ctx, stream: stream, fonte: fonte, no: no, rec: rec };
      mic.local = true; mic.motor = "vosk";
      estado("a_ouvir", emPT()
        ? "Listening (on this device, offline). Say the letters in English (cee, dee, ee…), “next”, “delete” or “can't read”."
        : "Listening (on this device, offline). Say the letters, “next”, “delete” or “can't read”.");
    }).catch(function (e) {
      fecharVosk(); if (ctx && !VK.sessao) { try { ctx.close(); } catch (x) { } }
      if (!mic.querido) return;
      mic.querido = false;
      if (e && (e.name === "NotAllowedError" || e.name === "SecurityError" || e.name === "PermissionDeniedError"))
        estado("erro", "The browser did not allow the microphone. Allow it in the browser settings, or use the letter keys.");
      else if (e && e.name === "NotFoundError") estado("erro", "No microphone found on this device. Use the letter keys.");
      else estado("erro", "Could not start voice recognition on this device. Use the letter keys.");
    });
  }

  function ligarMicrofone(aoOuvir, aoEstado, letras) {
    mic.aoOuvir = aoOuvir; mic.aoEstado = aoEstado; mic.querido = true; mic.motor = null; mic.letras = letras || null;
    // O browser só dá o microfone em https:// ou localhost.
    if (g.isSecureContext === false) { mic.querido = false; estado("indisponivel", "Voice needs a secure page (https:// or localhost). Use the letter keys."); return; }
    // 1.º Vosk (offline, todos os browsers); 2.º reconhecimento no aparelho do Chrome/Edge.
    if (voskPossivel()) { ligarVosk(); return; }
    if (!R || !suportaLocal()) { mic.querido = false; estado("indisponivel", "Voice recognition cannot run in this browser. Use the letter keys."); return; }
    estado("a_preparar", "Preparing the microphone…");
    idiomaLocal().then(function (r) {
      if (!mic.querido) return;
      if (r.idioma) { mic.local = true; mic.idioma = r.idioma; mic.motor = "browser"; arrancar(); return; }
      mic.querido = false;
      estado("indisponivel", "Voice recognition cannot run in this browser. Use the letter keys.");
    }, function () { mic.querido = false; estado("erro", "Could not start the microphone. Use the letter keys."); });
  }
  function desligarMicrofone() {
    mic.querido = false;
    fecharVosk();
    if (mic.rec) { try { mic.rec.onend = null; mic.rec.abort(); } catch (e) { } mic.rec = null; }
    estado("desligado", "");
  }
  function pausarOuvir() { if (mic.rec && mic.querido) { mic.pausado = true; try { mic.rec.stop(); } catch (e) { } } }
  function retomarOuvir() { if (mic.rec && mic.querido && mic.pausado) { mic.pausado = false; try { mic.rec.start(); } catch (e) { } } }

  // "Prepare voice" (índice): carrega o reconhecedor offline para confirmar que corre neste browser.
  function prepararMicrofone() {
    if (!voskPossivel()) return Promise.resolve({ ok: false, mensagem: "This browser cannot run offline voice recognition. Use the letter keys in the test." });
    return carregarVosk().then(function () { return { ok: true, mensagem: "Offline voice recognition ready on this device. No internet needed." }; },
      function () { return { ok: false, mensagem: "Could not load the offline voice recognition." }; });
  }

  // ------------------------------------------------------------------
  // Understanding what was said
  // ------------------------------------------------------------------
  function semAcentos(s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; }
  var NOMES = {
    C: ["c", "see", "sea", "si", "cee"], D: ["d", "dee", "de"], E: ["e", "ee", "eh"], F: ["f", "ef", "eff", "efe"],
    L: ["l", "el", "ell", "elle", "ele"], O: ["o", "oh", "owe"], P: ["p", "pee", "pea", "pe"], T: ["t", "tee", "tea", "te"], Z: ["z", "zee", "zed", "ze"],
    H: ["h", "aitch", "haitch", "eitch"], K: ["k", "kay", "kei"], N: ["n", "en", "enn"], R: ["r", "ar", "are", "arr"],
    S: ["s", "ess", "es"], V: ["v", "vee", "vi"]
  };
  // Português (pt-PT): "cê", "dê", "é", "efe", "agá", "cá", "ele", "ene", "ó", "pê", "erre", "esse", "tê", "vê", "zê"
  var NOMES_PT = {
    C: ["c", "ce", "se"], D: ["d", "de"], E: ["e", "eh"], F: ["f", "efe"], H: ["h", "aga"], K: ["k", "ca", "capa", "kapa"], L: ["l", "ele"],
    N: ["n", "ene"], O: ["o", "oh"], P: ["p", "pe"], R: ["r", "erre"], S: ["s", "esse"], T: ["t", "te"], V: ["v", "ve"], Z: ["z", "ze"]
  };
  var MAPA = {}, MAPA_PT = {};
  Object.keys(NOMES).forEach(function (L) { NOMES[L].forEach(function (n) { MAPA[n] = L; }); });
  Object.keys(NOMES_PT).forEach(function (L) { NOMES_PT[L].forEach(function (n) { MAPA_PT[n] = L; }); });
  var COMANDOS = [
    ["nao_consigo", /\b(can'?t read|cannot read|can'?t see|cannot see|i can'?t|no idea|nao consigo|nao vejo)\b/],
    ["tudo_direito", /\b(all straight|all looks straight|looks straight|everything straight|all good|tudo direito|vejo tudo direito|esta tudo direito)\b/],
    ["seguinte", /\b(next|continue|go on|proceed|seguinte|proximo|continuar|avancar)\b/],
    ["apagar", /\b(delete|undo|erase|back ?space|wrong|apagar)\b/],
    ["repetir", /\b(repeat|again|say again|repetir|outra vez|de novo)\b/],
    ["concluir", /\b(done|finish|finished|concluir|terminar|terminei|pronto)\b/]
  ];
  // Returns letters and commands in the order they were said (letters first: "F P next").
  function interpretar(texto, permitidas) {
    var t = semAcentos(String(texto || "").toLowerCase()).replace(/[.,;:!?«»“”"]/g, " ").replace(/\s+/g, " ").trim();
    var saida = [];
    for (var c = 0; c < COMANDOS.length; c++) {
      if (COMANDOS[c][1].test(t)) { saida.push({ tipo: COMANDOS[c][0] }); t = t.replace(COMANDOS[c][1], " "); }
    }
    var ok = permitidas || Object.keys(NOMES);
    var letras = [];
    t.split(" ").forEach(function (tok) {
      if (!tok) return;
      tok = tok.replace(/^letter$/, "");
      if (!tok) return;
      var L = (emPT() ? MAPA_PT : MAPA)[tok];
      if (L && ok.indexOf(L) !== -1) { letras.push({ tipo: "letra", v: L }); return; }
      // "TOZ" said together: split, if every character is a test letter
      if (tok.length >= 2 && tok.length <= 5 && tok.split("").every(function (ch) { return ok.indexOf(ch.toUpperCase()) !== -1; })) {
        tok.split("").forEach(function (ch) { letras.push({ tipo: "letra", v: ch.toUpperCase() }); });
      }
    });
    return letras.concat(saida);
  }

  g.Voz = {
    falar: falar, falarClip: falarClip, calar: calar, ligada: ligada, podeFalar: podeFalar,
    alternar: function () { var n = !ligada(); escrever(CHAVE, n ? "1" : "0"); if (!n) calar(); return n; },
    temVozInglesa: function () { return !!voz; },
    ligarMicrofone: ligarMicrofone, desligarMicrofone: desligarMicrofone, prepararMicrofone: prepararMicrofone,
    carregarReconhecedor: function () { return voskPossivel() ? carregarVosk().then(function () { return true; }, function () { return false; }) : Promise.resolve(false); },
    microfone: function () { return mic.estado; },
    microfonePossivel: function () { return voskPossivel() || suportaLocal(); },
    interpretar: interpretar
  };
})(typeof window !== "undefined" ? window : globalThis);
