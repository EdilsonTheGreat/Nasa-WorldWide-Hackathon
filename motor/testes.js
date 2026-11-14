// =====================================================================
// testes.js: os 9 testes obrigatórios de docs/EDILSON.md (secção 6) + 7 testes extra (10-16)
// Usado por teste.html (browser) e pode correr em Node.
// Devolve uma lista de {nome, ok, detalhe}.
// =====================================================================
(function (global) {
  "use strict";

  function correrTestes(Motor, FAIXAS, REGRAS, ASTRONAUTAS) {
    var res = [];
    function teste(nome, fn) {
      try {
        var r = fn();
        res.push({ nome: nome, ok: r.ok, detalhe: r.detalhe });
      } catch (e) {
        res.push({ nome: nome, ok: false, detalhe: "Erro: " + e.message });
      }
    }
    function perto(a, b) { return Math.abs(a - b) <= 0.1; }
    function aval(id, dia) { return Motor.avaliar(Motor.registosDe(id, ASTRONAUTAS), dia, FAIXAS, REGRAS); }

    teste("1. DEMO_A dia 90 = verde, Δ ≈ 8.0%", function () {
      var r = aval("DEMO_A", 90);
      return { ok: r.cor_final === "verde" && perto(r.sinais.oct.delta_pct, 8.0),
               detalhe: r.cor_final + ", Δ=" + r.sinais.oct.delta_pct + "%" };
    });
    teste("2. DEMO_B dia 90 = OCT amarelo, Δ ≈ 16.0%, final amarelo", function () {
      var r = aval("DEMO_B", 90);
      return { ok: r.sinais.oct.cor === "amarelo" && perto(r.sinais.oct.delta_pct, 16.0) && r.cor_final === "amarelo",
               detalhe: "OCT " + r.sinais.oct.cor + ", Δ=" + r.sinais.oct.delta_pct + "%, final " + r.cor_final };
    });
    teste("3. DEMO_C dia 90 = vermelho, Δ ≈ 53.9%", function () {
      var r = aval("DEMO_C", 90);
      return { ok: r.cor_final === "vermelho" && perto(r.sinais.oct.delta_pct, 53.9),
               detalhe: r.cor_final + ", Δ=" + r.sinais.oct.delta_pct + "%" };
    });
    teste("4. DEMO_C dia 91 = Amsler vermelho e acuidade vermelho", function () {
      var r = aval("DEMO_C", 91);
      return { ok: r.sinais.amsler.cor === "vermelho" && r.sinais.acuidade.cor === "vermelho",
               detalhe: "Amsler " + r.sinais.amsler.cor + ", acuidade " + r.sinais.acuidade.cor };
    });
    teste("5. DEMO_B dia 91 = Amsler amarelo e acuidade amarelo", function () {
      var r = aval("DEMO_B", 91);
      return { ok: r.sinais.amsler.cor === "amarelo" && r.sinais.acuidade.cor === "amarelo",
               detalhe: "Amsler " + r.sinais.amsler.cor + ", acuidade " + r.sinais.acuidade.cor };
    });
    teste("6. Só um OCT = a_calibrar", function () {
      var r = Motor.corOCT([{ dia: 0, oct_um: 362 }], FAIXAS);
      return { ok: r.cor === "a_calibrar", detalhe: r.cor };
    });
    teste("7. Amsler: [4] vermelho, [0] amarelo, [2]→[2] verde", function () {
      var a = Motor.corAmsler([], [4], REGRAS).cor;
      var b = Motor.corAmsler([], [0], REGRAS).cor;
      var c = Motor.corAmsler([2], [2], REGRAS).cor;
      return { ok: a === "vermelho" && b === "amarelo" && c === "verde", detalhe: a + ", " + b + ", " + c };
    });
    teste("8. População: ~84% verde, ~11% amarelo, ~5% vermelho", function () {
      var cont = { verde: 0, amarelo: 0, vermelho: 0 };
      var ids = {};
      ASTRONAUTAS.forEach(function (r) { if (r.perfil === "populacao") ids[r.astronauta_id] = true; });
      Object.keys(ids).forEach(function (id) {
        var octs = Motor.registosDe(id, ASTRONAUTAS)
          .filter(function (r) { return r.oct_um !== null; })
          .map(function (r) { return { dia: r.dia, oct_um: r.oct_um }; });
        for (var i = 1; i < octs.length; i++) {
          cont[Motor.corOCT(octs.slice(0, i + 1), FAIXAS).cor]++;
        }
      });
      var tot = cont.verde + cont.amarelo + cont.vermelho;
      var pv = Math.round(cont.verde / tot * 100), pa = Math.round(cont.amarelo / tot * 100), pr = Math.round(cont.vermelho / tot * 100);
      return { ok: tot === 120 && Math.abs(pv - 84) <= 3 && Math.abs(pa - 11) <= 3 && Math.abs(pr - 5) <= 3,
               detalhe: tot + " OCTs: verde " + pv + "%, amarelo " + pa + "%, vermelho " + pr + "%" };
    });
    teste("9. piorCor([verde, vermelho, amarelo]) = vermelho", function () {
      var c = Motor.piorCor(["verde", "vermelho", "amarelo"]);
      return { ok: c === "vermelho", detalhe: c };
    });

    // ---- Testes extra: robustez, cenário do júri e limites ----
    teste("10. OCT fora de ordem dá o mesmo resultado", function () {
      var r = Motor.corOCT([{ dia: 90, oct_um: 423.4 }, { dia: 0, oct_um: 365.0 }, { dia: 60, oct_um: 415.8 }], FAIXAS);
      return { ok: r.cor === "amarelo", detalhe: r.cor };
    });
    teste("11. Dia > 180 usa a faixa do dia 180, sem erro", function () {
      var r = Motor.corOCT([{ dia: 0, oct_um: 362 }, { dia: 200, oct_um: 400 }], FAIXAS);
      return { ok: r.cor === "verde", detalhe: "Δ=" + r.delta_pct + "% -> " + r.cor };
    });
    teste("12. Retina mais fina (Δ negativo) = verde", function () {
      var r = Motor.corOCT([{ dia: 0, oct_um: 362 }, { dia: 30, oct_um: 350 }], FAIXAS);
      return { ok: r.cor === "verde", detalhe: "Δ=" + r.delta_pct + "%" };
    });
    teste("13. Astronauta sem registos = a_calibrar, sem erro", function () {
      var r = Motor.avaliar([], 30, FAIXAS, REGRAS);
      return { ok: r.cor_final === "a_calibrar", detalhe: r.texto };
    });
    teste("14. Dia sem OCT (95) usa o último OCT (dia 90)", function () {
      var r = aval("DEMO_B", 95);
      return { ok: perto(r.sinais.oct.delta_pct, 16.0), detalhe: "Δ=" + r.sinais.oct.delta_pct + "%" };
    });
    teste("15. Júri (astronauta novo): sem distorções = verde, zona 1 = amarelo, centro = vermelho", function () {
      function juri(zonas, linha, melhora) {
        return [
          { astronauta_id: "JURI", dia: 0, oct_um: null, amsler_zonas: [], acuidade_linha: 10, melhora_com_oculos: 1 },
          { astronauta_id: "JURI", dia: 7, oct_um: null, amsler_zonas: zonas, acuidade_linha: linha, melhora_com_oculos: melhora }
        ];
      }
      var a = Motor.avaliar(juri([], 10, 1), 7, FAIXAS, REGRAS).cor_final;
      var b = Motor.avaliar(juri([1], 10, 1), 7, FAIXAS, REGRAS).cor_final;
      var c = Motor.avaliar(juri([4], 10, 1), 7, FAIXAS, REGRAS).cor_final;
      var d = Motor.avaliar(juri([], 8, 0), 7, FAIXAS, REGRAS).cor_final;
      return { ok: a === "verde" && b === "amarelo" && c === "vermelho" && d === "vermelho",
               detalhe: a + ", " + b + ", " + c + ", acuidade sem melhoria: " + d };
    });
    teste("16. Limite do P90 ao dia 90: abaixo = verde, acima = amarelo", function () {
      var p = FAIXAS.p90[90];
      var abaixo = Motor.corOCT([{ dia: 0, oct_um: 400 }, { dia: 90, oct_um: 400 * (1 + (p - 0.01) / 100) }], FAIXAS).cor;
      var acima = Motor.corOCT([{ dia: 0, oct_um: 400 }, { dia: 90, oct_um: 400 * (1 + (p + 0.01) / 100) }], FAIXAS).cor;
      return { ok: abaixo === "verde" && acima === "amarelo", detalhe: "P90=" + p + "%: " + abaixo + " / " + acima };
    });

    return res;
  }

  global.correrTestes = correrTestes;
  if (typeof module !== "undefined" && module.exports) module.exports = correrTestes;
})(typeof window !== "undefined" ? window : globalThis);
