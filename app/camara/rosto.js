// =====================================================================
// rosto.js: entrar no perfil pela cara (reconhecimento facial, offline)
//
// Como funciona:
//   1. REGISTO (uma vez por pessoa, com o consentimento dela): a câmara tira
//      algumas imagens e o modelo transforma a cara num "descritor"
//      (128 números). Guarda-se SÓ o descritor, no aparelho (localStorage,
//      chave "dt_rostos"). Nenhuma fotografia é guardada nem enviada.
//   2. ENTRADA: calcula-se o descritor da cara em frente à câmara e
//      procura-se o perfil registado mais parecido (distância euclidiana).
//      Se a distância for menor do que LIMIAR, entra nesse perfil.
//
// É uma conveniência, não segurança: a pessoa pode sempre escolher o
// perfil à mão, e gémeos ou fotografias podem enganar o sistema.
//
// Uso (precisa de http://localhost, como o resto da câmara):
//   <script src="camara/vendor/faceapi/face-api.js"></script>
//   <script src="camara/rosto.js"></script>
//   Rosto.registar(video, "MARLLON")  -> Promise {ok, amostras, mensagem}
//   Rosto.identificar(video)          -> Promise {ok, id, distancia, mensagem}
//   Rosto.registados()                -> ["MARLLON", ...]
//   Rosto.apagar("MARLLON")
// =====================================================================
(function (global) {
  "use strict";

  var CHAVE = "dt_rostos";
  var LIMIAR = 0.5;          // distância máxima para aceitar (menor = mais exigente)
  var MARGEM = 0.05;         // o 1.º candidato tem de ser claramente melhor do que o 2.º
  var AMOSTRAS = 5;          // imagens usadas no registo
  var TENTATIVAS = 25;       // imagens analisadas antes de desistir
  var pasta = "camara/vendor/faceapi/";
  var carregado = null;

  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } }
  function escrever(o) { try { localStorage.setItem(CHAVE, JSON.stringify(o)); return true; } catch (e) { return false; } }

  function carregar() {
    if (!global.faceapi) return Promise.reject(new Error("face-api não carregado"));
    if (!carregado) {
      carregado = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(pasta),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(pasta),
        faceapi.nets.faceRecognitionNet.loadFromUri(pasta)
      ]);
    }
    return carregado;
  }

  function abrirCamara(video) {
    if (video.srcObject && video.srcObject.active) return Promise.resolve(false);   // já aberta por outro módulo
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(function (s) { video.srcObject = s; video.muted = true; video.setAttribute("playsinline", ""); return video.play(); })
      .then(function () { return true; });
  }
  function fecharCamara(video, abertaAqui) {
    if (abertaAqui && video.srcObject) { video.srcObject.getTracks().forEach(function (t) { t.stop(); }); video.srcObject = null; }
  }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Um descritor (Float32Array de 128) da única cara visível, ou null.
  function descritor(video) {
    var op = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.6 });
    return faceapi.detectAllFaces(video, op).withFaceLandmarks(true).withFaceDescriptors().then(function (r) {
      if (r.length !== 1) return null;            // nenhuma cara, ou mais do que uma: não decide
      return r[0].descriptor;
    });
  }

  function recolher(video, quantas) {
    var lista = [], i = 0;
    function passo() {
      if (lista.length >= quantas || i >= TENTATIVAS) return Promise.resolve(lista);
      i++;
      return descritor(video).then(function (d) { if (d) lista.push(Array.from(d)); return esperar(150); }).then(passo);
    }
    return passo();
  }

  function media(lista) {
    var m = new Array(lista[0].length).fill(0);
    lista.forEach(function (d) { d.forEach(function (v, k) { m[k] += v / lista.length; }); });
    return m;
  }
  function distancia(a, b) {
    var s = 0;
    for (var k = 0; k < a.length; k++) s += (a[k] - b[k]) * (a[k] - b[k]);
    return Math.sqrt(s);
  }

  // Função pura (testável): devolve o perfil mais próximo, ou null.
  function comparar(desc, rostos, limiar, margem) {
    var ord = Object.keys(rostos).map(function (id) { return { id: id, distancia: distancia(desc, rostos[id]) }; })
      .sort(function (a, b) { return a.distancia - b.distancia; });
    if (!ord.length) return { id: null, distancia: null, motivo: "sem_registos" };
    var m = ord[0];
    if (m.distancia > (limiar === undefined ? LIMIAR : limiar)) return { id: null, distancia: m.distancia, motivo: "desconhecido" };
    if (ord.length > 1 && ord[1].distancia - m.distancia < (margem === undefined ? MARGEM : margem)) return { id: null, distancia: m.distancia, motivo: "ambiguo" };
    return { id: m.id, distancia: m.distancia, motivo: "ok" };
  }

  function comCamara(video, fn) {
    var aberta = false;
    return carregar().then(function () { return abrirCamara(video); })
      .then(function (a) { aberta = a; return esperar(400); })
      .then(fn)
      .then(function (r) { fecharCamara(video, aberta); return r; },
            function (e) { fecharCamara(video, aberta); return { ok: false, id: null, erro: String(e && e.message || e), mensagem: "Câmara ou modelo indisponível. Escolhe o perfil na lista." }; });
  }

  function registar(video, id) {
    return comCamara(video, function () {
      return recolher(video, AMOSTRAS).then(function (lista) {
        if (lista.length < 3) return { ok: false, amostras: lista.length, mensagem: "Não consegui ver bem a tua cara. Olha de frente para a câmara, com boa luz e sozinho(a) na imagem." };
        var r = ler(); r[id] = media(lista);
        if (!escrever(r)) return { ok: false, amostras: lista.length, mensagem: "Não foi possível guardar neste aparelho." };
        return { ok: true, amostras: lista.length, mensagem: "Cara registada para " + id + "." };
      });
    });
  }

  function identificar(video) {
    return comCamara(video, function () {
      var rostos = ler();
      if (!Object.keys(rostos).length) return { ok: false, id: null, mensagem: "Ainda ninguém registou a cara neste aparelho." };
      return recolher(video, 3).then(function (lista) {
        if (!lista.length) return { ok: false, id: null, mensagem: "Não vejo uma cara. Olha de frente para a câmara, com boa luz." };
        var c = comparar(media(lista), rostos);
        if (c.id) return { ok: true, id: c.id, distancia: c.distancia, mensagem: "Olá, " + c.id + "." };
        return { ok: false, id: null, distancia: c.distancia,
                 mensagem: c.motivo === "ambiguo" ? "Não tenho a certeza de quem és. Escolhe o perfil na lista." : "Não reconheci esta cara. Escolhe o perfil na lista ou regista a tua cara." };
      });
    });
  }

  global.Rosto = {
    registar: registar, identificar: identificar,
    registados: function () { return Object.keys(ler()).sort(); },
    apagar: function (id) { var r = ler(); delete r[id]; return escrever(r); },
    definirPasta: function (p) { pasta = p; },
    _comparar: comparar, _distancia: distancia, LIMIAR: LIMIAR
  };
})(typeof window !== "undefined" ? window : globalThis);
