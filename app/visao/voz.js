// =====================================================================
// voz.js: instruções faladas e comandos de voz (sem internet)
//
// 1. FALAR (síntese de voz): usa as vozes instaladas no sistema
//    (Mac, iPad, Windows, Android). Prefere uma voz portuguesa local.
//    Se não houver voz portuguesa, a app continua só com texto.
//
// 2. OUVIR (reconhecimento de voz): só é usado se o navegador o fizer
//    NO APARELHO (processLocally = true; Chrome e Edge recentes).
//    Assim o som nunca sai do aparelho. Se não for possível, a app
//    diz porquê e o astronauta usa os botões.
//    O pacote de português do reconhecimento é descarregado uma vez,
//    com internet, antes da missão (Voz.prepararMicrofone()).
//
// Uso:
//   Voz.falar("Que letra vês?")
//   Voz.ligada() / Voz.alternar()                 instruções faladas on/off
//   Voz.ligarMicrofone(aoOuvir, aoEstado)          aoOuvir(texto), aoEstado({estado, mensagem})
//   Voz.desligarMicrofone()
//   Voz.interpretar("é efe pê seguinte", letras)   -> [{tipo:"letra", v:"E"}, ..., {tipo:"seguinte"}]
// =====================================================================
(function (g) {
  "use strict";
  var CHAVE = "visao-voz";            // "1" falar, "0" calado
  var IDIOMAS = ["pt-PT", "pt-BR"];
  var voz = null, aFalar = false;

  function ler(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }
  function escrever(k, v) { try { g.localStorage.setItem(k, v); } catch (e) { } }
  var sintese = g.speechSynthesis || null;

  function escolherVoz() {
    if (!sintese) return null;
    var vs = sintese.getVoices() || [];
    function procura(f) { for (var i = 0; i < vs.length; i++) if (f(vs[i])) return vs[i]; return null; }
    return procura(function (v) { return /^pt[-_]PT/i.test(v.lang) && v.localService; }) ||
           procura(function (v) { return /^pt/i.test(v.lang) && v.localService; }) ||
           procura(function (v) { return /^pt[-_]PT/i.test(v.lang); }) ||
           procura(function (v) { return /^pt/i.test(v.lang); });
  }
  if (sintese) {
    voz = escolherVoz();
    if (typeof sintese.addEventListener === "function") sintese.addEventListener("voiceschanged", function () { voz = escolherVoz(); });
  }

  function ligada() { return ler(CHAVE) !== "0"; }
  function podeFalar() { return !!(sintese && g.SpeechSynthesisUtterance); }

  var aoFimFala = [];
  // semInterromper = true: não corta uma instrução que esteja a ser dita (ex.: avisos de distância).
  function falar(texto, semInterromper) {
    if (!texto || !ligada() || !podeFalar()) return false;
    if (semInterromper && (aFalar || sintese.speaking)) return false;
    try {
      sintese.cancel();
      var u = new g.SpeechSynthesisUtterance(texto);
      if (voz) { u.voice = voz; u.lang = voz.lang; } else { u.lang = "pt-PT"; }
      u.rate = 0.95;
      aFalar = true; pausarOuvir();
      u.onend = u.onerror = function () { aFalar = false; retomarOuvir(); };
      sintese.speak(u);
      return true;
    } catch (e) { aFalar = false; return false; }
  }
  function calar() { try { if (sintese) sintese.cancel(); } catch (e) { } aFalar = false; retomarOuvir(); }

  // ------------------------------------------------------------------
  // Reconhecimento de voz, só no aparelho
  // ------------------------------------------------------------------
  var R = g.SpeechRecognition || g.webkitSpeechRecognition || null;
  var mic = { querido: false, rec: null, idioma: null, aoOuvir: null, aoEstado: null, estado: "desligado", pausado: false };

  function estado(e, msg) {
    mic.estado = e;
    if (mic.aoEstado) mic.aoEstado({ estado: e, mensagem: msg || "" });
  }
  function suportaLocal() { return !!(R && "processLocally" in R.prototype && typeof R.available === "function"); }

  // Procura um idioma português já instalado no aparelho.
  function idiomaLocal() {
    var i = 0;
    function tenta() {
      if (i >= IDIOMAS.length) return Promise.resolve({ idioma: null, motivo: "sem_pacote" });
      var lg = IDIOMAS[i++];
      return Promise.resolve(R.available({ langs: [lg], processLocally: true })).then(function (st) {
        if (st === "available") return { idioma: lg };
        return tenta().then(function (r) { if (!r.idioma && (st === "downloadable" || st === "downloading")) r.descarregavel = true; return r; });
      }, tenta);
    }
    return tenta();
  }

  function criar() {
    var rec = new R();
    rec.lang = mic.idioma; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.processLocally = true;
    rec.onresult = function (ev) {
      for (var k = ev.resultIndex; k < ev.results.length; k++) {
        if (ev.results[k].isFinal && mic.aoOuvir && !aFalar) mic.aoOuvir(ev.results[k][0].transcript || "");
      }
    };
    rec.onerror = function (ev) {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { mic.querido = false; estado("erro", "O navegador não deu acesso ao microfone. Usa os botões."); }
      else if (ev.error === "language-not-supported" || ev.error === "network") { mic.querido = false; estado("erro", "Reconhecimento de voz no aparelho indisponível. Usa os botões."); }
    };
    rec.onend = function () {
      // O Chrome pára depois de algum silêncio: volta a ouvir enquanto o microfone estiver ligado.
      if (mic.querido && !mic.pausado) { try { rec.start(); } catch (e) { } }
    };
    return rec;
  }

  function ligarMicrofone(aoOuvir, aoEstado) {
    mic.aoOuvir = aoOuvir; mic.aoEstado = aoEstado; mic.querido = true;
    if (!R) { mic.querido = false; estado("indisponivel", "Este navegador não tem reconhecimento de voz. Usa os botões."); return; }
    if (!suportaLocal()) { mic.querido = false; estado("indisponivel", "Este navegador só reconhece voz pela internet. Para manter o som no aparelho, usa os botões (ou o Chrome recente)."); return; }
    estado("a_preparar", "A preparar o microfone…");
    idiomaLocal().then(function (r) {
      if (!mic.querido) return;
      if (!r.idioma) {
        mic.querido = false;
        estado("sem_pacote", r.descarregavel
          ? "Falta o pacote de português do reconhecimento de voz. Descarrega-o uma vez, com internet, antes da missão (botão «Preparar voz» na página inicial)."
          : "O reconhecimento de voz em português não está disponível neste aparelho. Usa os botões.");
        return;
      }
      mic.idioma = r.idioma;
      mic.rec = criar();
      try { mic.rec.start(); estado("a_ouvir", "A ouvir. Diz as letras, «seguinte», «apagar» ou «não consigo»."); }
      catch (e) { estado("erro", "Não foi possível ligar o microfone. Usa os botões."); }
    }, function () { mic.querido = false; estado("erro", "Não foi possível ligar o microfone. Usa os botões."); });
  }
  function desligarMicrofone() {
    mic.querido = false;
    if (mic.rec) { try { mic.rec.onend = null; mic.rec.abort(); } catch (e) { } mic.rec = null; }
    estado("desligado", "");
  }
  function pausarOuvir() { if (mic.rec && mic.querido) { mic.pausado = true; try { mic.rec.stop(); } catch (e) { } } }
  function retomarOuvir() { if (mic.rec && mic.querido && mic.pausado) { mic.pausado = false; try { mic.rec.start(); } catch (e) { } } }

  // Descarrega o pacote de português (precisa de internet UMA vez, antes da missão).
  function prepararMicrofone() {
    if (!suportaLocal() || typeof R.install !== "function") return Promise.resolve({ ok: false, mensagem: "Este navegador não permite reconhecimento de voz no aparelho." });
    return idiomaLocal().then(function (r) {
      if (r.idioma) return { ok: true, mensagem: "Reconhecimento de voz pronto (" + r.idioma + "), sem internet." };
      var lg = IDIOMAS[0];
      return Promise.resolve(R.install({ langs: [lg], processLocally: true })).then(function (ok) {
        return ok ? { ok: true, mensagem: "Pacote de voz descarregado (" + lg + "). Já funciona sem internet." } : { ok: false, mensagem: "Não foi possível descarregar o pacote de voz." };
      });
    }).catch(function () { return { ok: false, mensagem: "Não foi possível preparar o reconhecimento de voz." }; });
  }

  // ------------------------------------------------------------------
  // Interpretar o que foi dito
  // ------------------------------------------------------------------
  function semAcentos(s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; }
  var NOMES = {
    C: ["c", "ce", "se", "see", "sea"], D: ["d", "de", "dee"], E: ["e", "ee"], F: ["f", "efe", "ef", "eff"],
    L: ["l", "ele", "el", "elle"], O: ["o", "oh"], P: ["p", "pe", "pee"], T: ["t", "te", "tee", "tea"], Z: ["z", "ze", "zee", "zed"]
  };
  var MAPA = {};
  Object.keys(NOMES).forEach(function (L) { NOMES[L].forEach(function (n) { MAPA[n] = L; }); });
  var COMANDOS = [
    ["nao_consigo", /\bnao (consigo|vejo|sei)\b|\bcan'?t\b/],
    ["tudo_direito", /\b(tudo direito|vejo tudo direito|tudo bem|tudo certo)\b/],
    ["seguinte", /\b(seguinte|proxim[oa]|avancar|avanca|continuar|next)\b/],
    ["apagar", /\b(apagar|apaga|errei|corrigir|delete)\b/],
    ["repetir", /\b(repetir|repete|outra vez|repeat)\b/],
    ["concluir", /\b(concluir|terminar|acabei|done)\b/]
  ];
  // Devolve a lista de letras e comandos pela ordem em que foram ditos.
  function interpretar(texto, permitidas) {
    var t = semAcentos(String(texto || "").toLowerCase()).replace(/[.,;:!?«»"]/g, " ").replace(/\s+/g, " ").trim();
    var saida = [];
    for (var c = 0; c < COMANDOS.length; c++) {
      if (COMANDOS[c][1].test(t)) { saida.push({ tipo: COMANDOS[c][0] }); t = t.replace(COMANDOS[c][1], " "); }
    }
    var ok = permitidas || Object.keys(NOMES);
    var letras = [];
    t.split(" ").forEach(function (tok) {
      if (!tok) return;
      var L = MAPA[tok];
      if (L && ok.indexOf(L) !== -1) { letras.push({ tipo: "letra", v: L }); return; }
      // "toz" ditas juntas: separa, se forem todas letras do teste
      if (tok.length >= 2 && tok.length <= 5 && tok.split("").every(function (ch) { return ok.indexOf(ch.toUpperCase()) !== -1; })) {
        tok.split("").forEach(function (ch) { letras.push({ tipo: "letra", v: ch.toUpperCase() }); });
      }
    });
    // letras primeiro (respostas), comandos depois (ex.: "é efe seguinte")
    return letras.concat(saida);
  }

  g.Voz = {
    falar: falar, calar: calar, ligada: ligada, podeFalar: podeFalar,
    alternar: function () { var n = !ligada(); escrever(CHAVE, n ? "1" : "0"); if (!n) calar(); return n; },
    temVozPortuguesa: function () { return !!voz; },
    ligarMicrofone: ligarMicrofone, desligarMicrofone: desligarMicrofone, prepararMicrofone: prepararMicrofone,
    microfone: function () { return mic.estado; },
    microfonePossivel: function () { return suportaLocal(); },
    interpretar: interpretar
  };
})(typeof window !== "undefined" ? window : globalThis);
