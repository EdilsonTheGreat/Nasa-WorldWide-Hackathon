// =====================================================================
// teste_visao.js: fluxo do teste rápido com verificação da distância
//
// Passos: identificação → distância (câmara) → Amsler olho direito →
//         Amsler olho esquerdo → leitura de perto → (óculos de reserva) →
//         4 perguntas → resultado do motor (semáforo)
//
// Cada teste é guardado no aparelho (localStorage, chave "dt_registos")
// no MESMO formato de window.ASTRONAUTAS, por isso o Motor trata um
// astronauta real exactamente como um simulado. O primeiro teste de cada
// astronauta fica como linha de base.
// =====================================================================
(function () {
  "use strict";

  var DIST_MIN = 30, DIST_MAX = 45;         // cm (provisório: equipa de saúde valida)
  var DIST_ESTAVEL_MS = 1500;               // tempo seguido na distância certa
  var CHAVE = "dt_registos";
  var LETRAS = "CDHKNORSVZ".split("");      // letras de Sloan, usadas em testes de visão
  // Altura da letra por linha (mm): começa em 8 mm e encolhe ~20% por linha.
  // Linha 10 ≈ 1 mm. PROVISÓRIO: valores a validar pela equipa de saúde.
  var ALTURA_MM = [];
  for (var i = 0; i < 10; i++) ALTURA_MM.push(8 * Math.pow(10, -0.1 * i));
  var PERGUNTAS = [
    ["perg_focar", "Dificuldade em focar ao perto?"],
    ["perg_contraste", "As cores ou o contraste parecem mais fracos?"],
    ["perg_dor_cabeca", "Dores de cabeça?"],
    ["perg_visao_dupla", "Visão dupla?"]
  ];

  var $ = function (id) { return document.getElementById(id); };
  var t = {};          // teste em curso
  var dist = { estado: null, desde: 0, leituras: [] };

  // ---------- armazenamento ----------
  function lerTodos() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; }
  }
  function guardarTodos(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { alert("Não foi possível guardar neste aparelho."); }
  }
  function registosDe(id) { return Motor.registosDe(id, lerTodos()); }

  // ---------- navegação ----------
  function mostrar(passo) {
    document.querySelectorAll(".passo").forEach(function (s) { s.classList.remove("activo"); });
    $(passo).classList.add("activo");
    window.scrollTo(0, 0);
    window.__passo = passo;   // usado pelos testes automáticos
  }

  function actualizarHistorico() {
    var id = $("nome").value.trim() || "JURI";
    var r = registosDe(id);
    if (r.length === 0) {
      $("historico-info").textContent = "Primeiro teste deste astronauta: vai ficar como linha de base (o normal dele).";
    } else {
      var ult = r[r.length - 1];
      $("historico-info").textContent = r.length + " teste(s) guardado(s). Último: dia " + ult.dia + ".";
      if (+$("dia").value <= ult.dia) $("dia").value = ult.dia + 7;
    }
  }

  // ---------- 0. início ----------
  $("nome").addEventListener("change", actualizarHistorico);
  $("b-apagar").onclick = function () {
    var id = $("nome").value.trim() || "JURI";
    if (!confirm("Apagar todos os testes de " + id + "?")) return;
    guardarTodos(lerTodos().filter(function (r) { return r.astronauta_id !== id; }));
    $("dia").value = 0;
    actualizarHistorico();
  };
  $("b-iniciar").onclick = function () {
    var dia = parseInt($("dia").value, 10);
    if (!(dia >= 0)) { alert("Indica o dia de missão (0 ou mais)."); return; }
    t = { id: $("nome").value.trim() || "JURI", dia: dia, zonasOD: [], zonasOE: [],
          linha: null, linhaOculos: null, melhora: 1, distanciasAcu: [] };
    $("camara").hidden = false;
    mostrar("p-distancia");
    if (!dist.iniciada) {
      dist.iniciada = true;
      Distancia.iniciar($("video"), { minCm: DIST_MIN, maxCm: DIST_MAX, aoMudar: aoMudarDistancia, pastaModelo: "vendor/mediapipe/" });
    }
  };

  // ---------- 1. distância ----------
  function aoMudarDistancia(r) {
    var agora = Date.now();
    if (r.estado !== dist.estado) { dist.estado = r.estado; dist.desde = agora; }
    $("camara").className = r.estado;
    $("cam-cm").textContent = r.cm ? Math.round(r.cm) + " cm" : "--";
    $("cam-estado").textContent = { ok: "distância certa", perto: "muito perto", longe: "muito longe",
                                    sem_cara: "sem cara", indisponivel: "câmara indisponível" }[r.estado] || r.estado;
    $("dist-msg").textContent = r.mensagem;
    var estavel = r.estado === "ok" && agora - dist.desde >= DIST_ESTAVEL_MS;
    $("b-dist-ok").disabled = !estavel;
    if (r.estado === "indisponivel") $("b-sem-camara").classList.add("principal");
    if (window.__passo === "p-acuidade" && r.cm) t.distanciasAcu.push(r.cm);
    if (window.__passo === "p-acuidade") {
      $("acu-dist").textContent = (r.estado === "perto" || r.estado === "longe") ? "⚠ Mantém os olhos a 30–45 cm do ecrã." : "";
    }
  }
  $("b-calibrar").onclick = function () {
    if (!Distancia.calibrar(40)) alert("Primeiro olha para a câmara até aparecer a distância.");
  };
  $("b-dist-ok").onclick = function () { t.semCamara = false; iniciarAmsler("OD"); };
  $("b-sem-camara").onclick = function () { t.semCamara = true; iniciarAmsler("OD"); };

  // ---------- 2. Amsler ----------
  (function desenharGrelha() {
    var s = "";
    for (var k = 0; k <= 20; k++) {
      var p = k * 10;
      s += '<line x1="' + p + '" y1="0" x2="' + p + '" y2="200" stroke="#000" stroke-width="' + (k % 20 === 0 ? 0 : 0.6) + '"/>';
      s += '<line x1="0" y1="' + p + '" x2="200" y2="' + p + '" stroke="#000" stroke-width="' + (k % 20 === 0 ? 0 : 0.6) + '"/>';
    }
    s += '<circle cx="100" cy="100" r="3.2" fill="#000"/>';
    $("amsler-svg").innerHTML = s;
    var html = "";
    for (var z = 0; z < 9; z++) html += '<button type="button" data-zona="' + z + '" aria-label="Zona ' + z + '"></button>';
    $("zonas").innerHTML = html;
    $("zonas").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      b.classList.toggle("marcada");
    });
  })();

  function iniciarAmsler(olho) {
    t.olho = olho;
    document.querySelectorAll("#zonas button").forEach(function (b) { b.classList.remove("marcada"); });
    var tapa = olho === "OD" ? "esquerdo" : "direito";
    var testa = olho === "OD" ? "direito" : "esquerdo";
    $("amsler-titulo").textContent = "3. Grelha de Amsler: olho " + testa;
    $("amsler-instr").innerHTML = "Tapa o <strong>olho " + tapa + "</strong> com a mão. Mantém a mesma distância.";
    mostrar("p-amsler");
  }
  $("b-amsler-seguinte").onclick = function () {
    var marcadas = [];
    document.querySelectorAll("#zonas button.marcada").forEach(function (b) { marcadas.push(+b.dataset.zona); });
    if (t.olho === "OD") { t.zonasOD = marcadas; iniciarAmsler("OE"); }
    else { t.zonasOE = marcadas; iniciarAcuidade(false); }
  };

  // ---------- 3. Acuidade ----------
  function iniciarAcuidade(comOculos) {
    t.acu = { linha: 1, tentativa: 1, ultimaLida: 0, comOculos: comOculos };
    $("acu-olhos").textContent = comOculos ? "óculos de reserva e os dois olhos abertos" : "dois olhos abertos";
    mostrar("p-acuidade");
    novaLetra();
  }
  function novaLetra() {
    var a = t.acu;
    var certa = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    var outras = LETRAS.filter(function (l) { return l !== certa; }).sort(function () { return Math.random() - .5; }).slice(0, 3);
    var ops = outras.concat([certa]).sort(function () { return Math.random() - .5; });
    a.certa = certa;
    var el = $("letra");
    el.textContent = certa;
    el.dataset.certa = certa;                                     // usado pelos testes automáticos
    el.style.fontSize = (ALTURA_MM[a.linha - 1] / 0.72).toFixed(2) + "mm";   // altura de maiúscula ≈ 0,72 em
    $("acu-linha").textContent = a.linha;
    $("opcoes").innerHTML = ops.map(function (l) { return '<button type="button" data-l="' + l + '">' + l + "</button>"; }).join("") +
      '<button type="button" data-l="?">Não consigo ler</button>';
  }
  $("opcoes").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var a = t.acu;
    if (b.dataset.l === a.certa) {
      a.ultimaLida = a.linha;
      if (a.linha === 10) return fimAcuidade();
      a.linha++; a.tentativa = 1;
      novaLetra();
    } else if (a.tentativa === 1 && b.dataset.l !== "?") {
      a.tentativa = 2;                                            // uma segunda oportunidade na mesma linha
      novaLetra();
    } else {
      fimAcuidade();
    }
  });
  function fimAcuidade() {
    var lida = t.acu.ultimaLida;
    if (!t.acu.comOculos) {
      t.linha = lida;
      var anteriores = registosDe(t.id).filter(function (r) { return r.acuidade_linha !== null && r.acuidade_linha !== undefined; });
      var base = anteriores.length ? anteriores[0].acuidade_linha : null;
      if (base !== null && lida < base) { mostrar("p-oculos"); return; }
      t.melhora = 1;
    } else {
      t.linhaOculos = lida;
      t.melhora = lida > t.linha ? 1 : 0;
    }
    iniciarPerguntas();
  }
  $("b-oculos-repetir").onclick = function () { iniciarAcuidade(true); };
  $("b-oculos-nao").onclick = function () { t.melhora = 0; iniciarPerguntas(); };

  // ---------- 4. Perguntas ----------
  function iniciarPerguntas() {
    $("perguntas").innerHTML = PERGUNTAS.map(function (p) {
      var opts = [0, 1, 2, 3].map(function (v) {
        return '<label><input type="radio" name="' + p[0] + '" value="' + v + '"' + (v === 0 ? " checked" : "") + ">" + v + "</label>";
      }).join("");
      return '<div class="pergunta"><div>' + p[1] + '</div><div class="escala">' + opts + "</div></div>";
    }).join("");
    mostrar("p-perguntas");
  }
  $("b-perguntas-ok").onclick = function () {
    var reg = {
      astronauta_id: t.id, perfil: "real", dia: t.dia, oct_um: null,
      amsler_zonas: uniao(t.zonasOD, t.zonasOE),
      amsler_od: t.zonasOD, amsler_oe: t.zonasOE,
      acuidade_linha: t.linha, acuidade_com_oculos: t.linhaOculos, melhora_com_oculos: t.melhora,
      distancia_cm: t.distanciasAcu.length ? Math.round(media(t.distanciasAcu)) : null,
      sem_camara: !!t.semCamara
    };
    reg.amsler_centro = reg.amsler_zonas.indexOf(REGRAS.amsler.zona_centro) !== -1 ? 1 : 0;
    PERGUNTAS.forEach(function (p) {
      var sel = document.querySelector('input[name="' + p[0] + '"]:checked');
      reg[p[0]] = sel ? +sel.value : 0;
    });
    // substitui um teste do mesmo dia, se existir
    var todos = lerTodos().filter(function (r) { return !(r.astronauta_id === reg.astronauta_id && r.dia === reg.dia); });
    todos.push(reg);
    guardarTodos(todos);
    mostrarResultado(reg);
  };

  // ---------- 5. Resultado ----------
  function mostrarResultado(reg) {
    var regs = registosDe(reg.astronauta_id);
    var r = Motor.avaliar(regs, reg.dia, FAIXAS, REGRAS);
    var primeiro = regs.length === 1;
    var nome = { verde: "Verde", amarelo: "Amarelo", vermelho: "Vermelho", a_calibrar: "A calibrar" }[r.cor_final];
    var html = '<div class="semaforo ' + r.cor_final + '" id="cor-final" data-cor="' + r.cor_final + '">' + nome +
               "<small>" + (primeiro ? "Primeiro teste guardado como o teu normal (linha de base). " : "") + r.texto + "</small></div>";
    if (r.motivos.length) html += "<p><strong>Porquê:</strong></p><ul class='motivos'>" + r.motivos.map(function (m) { return "<li>" + m + "</li>"; }).join("") + "</ul>";
    html += "<p class='nota'>Dia " + reg.dia + " · Amsler: olho direito [" + reg.amsler_od.join(", ") + "], olho esquerdo [" + reg.amsler_oe.join(", ") +
            "] · leitura: linha " + reg.acuidade_linha + "/10" + (reg.acuidade_com_oculos !== null ? " (com óculos: " + reg.acuidade_com_oculos + ")" : "") +
            " · distância média: " + (reg.distancia_cm ? reg.distancia_cm + " cm" : "não medida") + "</p>";
    if (r.sinais.oct.cor === "a_calibrar") html += "<p class='nota'>O OCT não entra neste teste rápido: é registado no exame guiado.</p>";
    if (REGRAS.provisorio) html += "<p class='nota'>Limites provisórios, ainda não validados pela equipa de saúde.</p>";
    $("resultado").innerHTML = html;
    window.__resultado = r;   // usado pelos testes automáticos
    mostrar("p-resultado");
  }
  $("b-novo").onclick = function () { actualizarHistorico(); mostrar("p-inicio"); };

  // ---------- utilitários ----------
  function uniao(a, b) { return a.concat(b.filter(function (x) { return a.indexOf(x) === -1; })).sort(); }
  function media(xs) { return xs.reduce(function (s, x) { return s + x; }, 0) / xs.length; }

  actualizarHistorico();
  window.__passo = "p-inicio";
})();
