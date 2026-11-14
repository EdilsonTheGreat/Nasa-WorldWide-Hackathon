// =====================================================================
// ligacao.js: liga os ecrãs do Marllon (app/visao) ao backend
//
// Os ecrãs continuam a desenhar-se como antes. Este ficheiro só lhes dá
// DADOS VERDADEIROS quando quem entrou é um perfil real (a equipa):
//
//   ecrã (Main, Hoje, TesteRapido, ...)  ->  window.Visao  ->  Armazem / Motor / Modelo / Distancia / Rosto
//
// Dois tipos de sessão:
//   - DEMONSTRAÇÃO: os 3 astronautas fictícios do Marllon (A, B, C). Nada é guardado.
//   - REAL: um perfil guardado neste aparelho (CHANDY, EDILSON, ...). Os testes
//     ficam no Armazem e a cor vem do Motor.
//
// Chaves no localStorage (além das do front, "visao-tema", "visao-perfil", ...):
//   visao-real        id do perfil real com sessão aberta (não existe = demonstração)
//   visao-dia-<ID>    dia de missão indicado ao entrar
//
// Escalas desta interface (diferentes das do ecrã de teste app/camara):
//   acuidade: 0 a 5 linhas lidas POR OLHO (acuidade_oe, acuidade_od); acuidade_linha = a pior das duas
//   Amsler:   grelha 12x12 por olho (celulas_od, celulas_oe), convertida para as 9 zonas do motor
//   perguntas: Não/Ligeiro/Marcado -> 0/1/3
// Não misturar no mesmo perfil testes feitos aqui e em app/camara/teste_visao.html.
// =====================================================================
(function (g) {
  "use strict";

  function ler(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }
  function escrever(k, v) { try { if (v === null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, String(v)); } catch (e) { } }
  function temBackend() { return !!(g.Armazem && g.Motor && g.REGRAS); }

  // ---------- Sessão ----------
  function real() {
    var id = ler("visao-real");
    return id && temBackend() ? id : null;
  }
  function nomeDe(id) { return id.split(" ").map(function (p) { return p.charAt(0) + p.slice(1).toLowerCase(); }).join(" "); }
  function iniciais(id) { var p = id.split(" "); return (p.length > 1 ? p[0].charAt(0) + p[1].charAt(0) : id.slice(0, 2)).toUpperCase(); }
  function diaSugerido(id) {
    var r = g.Armazem.registosDe(id);
    return r.length ? r[r.length - 1].dia + 7 : 0;
  }
  function diaDe(id) {
    var d = parseInt(ler("visao-dia-" + id), 10);
    return d >= 0 ? d : diaSugerido(id);
  }
  // Íris escolhida por cada perfil (Perfil > Íris). Muda a imagem do olho e a cor do fundo.
  var IRIS_DEMO = { A: "azul", B: "original", C: "cinzento" };
  function irisDe(id) { return ler("visao-iris-" + id) || IRIS_DEMO[id] || "original"; }
  function guardarIris(id, iris) { if (id) escrever("visao-iris-" + id, iris); escrever("visao-iris", iris); }

  function entrar(id, dia) {
    id = g.Armazem.criarPerfil(id);
    if (!id) return null;
    escrever("visao-real", id);
    escrever("visao-iris", irisDe(id));
    escrever("visao-dia-" + id, dia >= 0 ? dia : diaSugerido(id));
    return id;
  }
  function sair() { escrever("visao-real", null); }

  // ---------- Conversões ----------
  // Célula "linha-coluna" da grelha 12x12 -> zona 0..8 da grelha 3x3 do motor (zona 4 = centro).
  function zonaDe(chave) { var p = chave.split("-"); return Math.floor(Number(p[0]) / 4) * 3 + Math.floor(Number(p[1]) / 4); }
  function zonasDe(chaves) {
    var z = {};
    (chaves || []).forEach(function (k) { z[zonaDe(k)] = true; });
    return Object.keys(z).map(Number).sort(function (a, b) { return a - b; });
  }
  var NIVEL = { a_calibrar: 0, verde: 0, amarelo: 2, vermelho: 3 };   // cores do motor -> 4 níveis do front (1 = interferência)
  var OLHO = { od: "olho direito", oe: "olho esquerdo" };
  var SIGLA = { od: "OD", oe: "OE" };

  function rapidos(id) {
    return g.Armazem.registosDe(id).filter(function (r) { return r.acuidade_linha !== null && r.acuidade_linha !== undefined; });
  }

  // Compara um teste com a base (o 1.º teste do perfil), olho a olho, com as funções do Motor.
  function avaliarRegisto(base, reg) {
    var M = g.Motor, R = g.REGRAS, primeiro = !base || base.dia === reg.dia, sinais = [];
    ["od", "oe"].forEach(function (e) {
      var am = M.corAmsler(primeiro ? [] : (base["amsler_" + e] || []), reg["amsler_" + e] || [], R);
      sinais.push({ tipo: "amsler", olho: e, cor: am.cor, motivo: am.motivo.replace(/\.$/, "") + " · " + OLHO[e] + "." });
      if (!primeiro) {
        var ac = M.corAcuidade(base["acuidade_" + e], reg["acuidade_" + e], reg["melhora_" + e], R);
        sinais.push({ tipo: "acuidade", olho: e, cor: ac.cor, perda: ac.perda, motivo: ac.motivo.replace(/\.$/, "") + " · " + OLHO[e] + "." });
      }
    });
    var cor = M.piorCor(sinais.map(function (s) { return s.cor; }));
    if (cor === "a_calibrar") cor = "verde";
    var corOlho = {};
    ["od", "oe"].forEach(function (e) {
      var c = M.piorCor(sinais.filter(function (s) { return s.olho === e; }).map(function (s) { return s.cor; }));
      corOlho[e] = c === "a_calibrar" ? "verde" : c;
    });
    var marc = [reg.perg_focar, reg.perg_contraste, reg.perg_dor_cabeca, reg.perg_visao_dupla];
    var marcados = marc.filter(function (x) { return x >= 3; }).length, ligeiros = marc.filter(function (x) { return x === 1 || x === 2; }).length;
    var nSint = marcados > 0 || ligeiros >= 2 ? 2 : 0;
    var nivel = Math.max(NIVEL[cor], nSint);
    if (nivel === 0 && reg.prontidao && reg.prontidao !== "verde") nivel = 1;      // condições duvidosas: repetir
    return {
      primeiro: primeiro, cor: cor, corOlho: corOlho, nivel: nivel, nSint: nSint,
      motivos: sinais.filter(function (s) { return s.cor === "amarelo" || s.cor === "vermelho"; }).map(function (s) { return s.motivo; }),
      sinais: sinais
    };
  }

  // ---------- O que cada ecrã pede ----------
  // Cabeçalho: quem sou eu.
  function eu() {
    var id = real(); if (!id) return null;
    var regs = rapidos(id), d = diaDe(id), base = regs[0];
    return {
      id: id, nome: nomeDe(id), curto: nomeDe(id).split(" ")[0], ini: iniciais(id), dia: d,
      ola: "Olá, " + nomeDe(id).split(" ")[0] + ".",
      ant: base && base.dia !== d ? "tua base, dia " + base.dia : "sem testes anteriores",
      papel: "Equipa Deep Thinkers · Dia " + d, testes: regs.length
    };
  }

  // Teste com que o de hoje é comparado (a base), no formato do TesteRapido.
  function anterior() {
    var id = real(); if (!id) return null;
    var d = diaDe(id);
    var base = rapidos(id).filter(function (r) { return r.dia < d; })[0];
    if (!base) return { primeiro: true, ac: { esq: 0, dir: 0 }, am: { dir: [], esq: [] } };
    return {
      primeiro: false, dia: base.dia,
      ac: { esq: base.acuidade_oe === null ? 0 : base.acuidade_oe, dir: base.acuidade_od === null ? 0 : base.acuidade_od },
      am: { dir: base.celulas_od || [], esq: base.celulas_oe || [] }
    };
  }

  // Guarda o teste feito no TesteRapido e devolve a decisão do motor e o texto do modelo.
  //   t = { q: [0|1|2 x4], res: {esq:{sem,com}, dir:{sem,com}}, marks: {dir:{...}, esq:{...}}, resp: "sim"|"nao"|"naosei" }
  function guardarTeste(t) {
    var id = real(); if (!id) return null;
    var d = diaDe(id), PERG = [0, 1, 3];
    var cel = { od: Object.keys(t.marks.dir || {}), oe: Object.keys(t.marks.esq || {}) };
    var zo = { od: zonasDe(cel.od), oe: zonasDe(cel.oe) };
    var uniao = zo.od.concat(zo.oe).filter(function (z, i, a) { return a.indexOf(z) === i; }).sort(function (a, b) { return a - b; });
    var ac = { oe: t.res.esq, od: t.res.dir };
    function melhora(r) { return r.com === null || r.com === undefined ? null : (r.com > r.sem ? 1 : 0); }
    var mOE = melhora(ac.oe), mOD = melhora(ac.od);
    var cam = camara.resumo();
    var ressalvas = [];
    if (t.resp === "sim") ressalvas.push("Movimento da nave sentido antes ou durante o teste.");
    if (t.resp === "naosei") ressalvas.push("Movimento da nave por confirmar.");
    if (cam.n > 0 && cam.foraPct >= 40) ressalvas.push("Distância fora do intervalo em " + cam.foraPct + "% das medições.");
    var reg = g.Armazem.guardar({
      astronauta_id: id, dia: d,
      amsler_zonas: uniao, amsler_od: zo.od, amsler_oe: zo.oe, amsler_centro: uniao.indexOf(g.REGRAS.amsler.zona_centro) !== -1 ? 1 : 0,
      celulas_od: cel.od, celulas_oe: cel.oe,
      escala_acuidade: 5, acuidade_oe: ac.oe.sem, acuidade_od: ac.od.sem,
      acuidade_oe_oculos: ac.oe.com, acuidade_od_oculos: ac.od.com,
      acuidade_linha: Math.min(ac.oe.sem, ac.od.sem),
      acuidade_com_oculos: (ac.oe.com !== null || ac.od.com !== null) ? Math.min(ac.oe.com === null ? ac.oe.sem : ac.oe.com, ac.od.com === null ? ac.od.sem : ac.od.com) : null,
      melhora_oe: mOE, melhora_od: mOD,
      melhora_com_oculos: (mOE === 0 || mOD === 0) ? 0 : ((mOE === 1 || mOD === 1) ? 1 : null),
      perg_focar: PERG[t.q[0]], perg_contraste: PERG[t.q[1]], perg_dor_cabeca: PERG[t.q[2]], perg_visao_dupla: PERG[t.q[3]],
      distancia_cm: cam.n > 0 ? cam.media : null, sem_camara: cam.n > 0 ? 0 : 1, fora_distancia_pct: cam.n > 0 ? cam.foraPct : null,
      evento_nave: t.resp || null,
      acertos_oe: t.acertos ? t.acertos.esq.sem[0] + "/" + t.acertos.esq.sem[1] : null,
      acertos_od: t.acertos ? t.acertos.dir.sem[0] + "/" + t.acertos.dir.sem[1] : null,
      prontidao: ressalvas.length ? "amarelo" : "verde", ressalvas: ressalvas,
      alerta_clinico: t.q[3] === 2
    });
    if (!reg) return { erro: "Não foi possível guardar neste aparelho." };
    var regs = rapidos(id), av = avaliarRegisto(regs[0], reg);
    var modelo = g.Modelo ? g.Modelo.treinar(g.Armazem.registosDe(id), g.FAIXAS, d) : null;
    return {
      registo: reg, nivel: av.nivel, cor: av.cor, primeiro: av.primeiro, motivos: av.motivos, ressalvas: ressalvas,
      alerta_clinico: reg.alerta_clinico, distancia: cam,
      texto_motor: (g.REGRAS.textos[av.cor] || g.REGRAS.textos.verde).mensagem,
      proximo_dias: (g.REGRAS.textos[av.cor] || g.REGRAS.textos.verde).proximo_teste_dias,
      modelo: modelo ? { avisos: modelo.avisos || [], testes_aprendidos: modelo.estado.rapido.n } : null,
      testes: regs.length
    };
  }

  function ultimoAvaliado(id) {
    var regs = rapidos(id);
    if (!regs.length) return null;
    var u = regs[regs.length - 1];
    return { regs: regs, reg: u, av: avaliarRegisto(regs[0], u) };
  }
  function acTxt(r, e) { var v = r["acuidade_" + e]; return v === null || v === undefined ? "–" : v + "/5"; }
  function amTxt(r) {
    var n = (r.celulas_od || []).length + (r.celulas_oe || []).length;
    if (!n) return "Sem zonas";
    return r.amsler_centro ? "Zona no centro" : n + (n === 1 ? " quadrado" : " quadrados");
  }

  // Ecrã Hoje.
  function resumoHoje() {
    var me = eu(); if (!me) return null;
    var u = ultimoAvaliado(me.id);
    var E = [
      { estado: "Verde · rotina", cor: "var(--ok-tx)", dot: "var(--ok)" },
      { estado: "Laranja · revisão recomendada", cor: "var(--warn-tx)", dot: "var(--warn)" },
      { estado: "Vermelho · prioridade clínica", cor: "var(--bad-tx)", dot: "var(--bad)" }
    ];
    var IDX = { verde: 0, amarelo: 1, vermelho: 2 };
    if (!u) {
      var vazio = { valor: "–", uni: "", estado: "Sem testes", cor: "var(--tx3)", dot: "var(--tx3)" };
      return {
        p: { nome: me.nome, curto: me.curto, ini: me.ini, dia: me.dia, prox: me.dia, acu: "–", amsler: "–", sans: "Linha temporal dos teus testes", limTxt: "" },
        nivel: 0, rec: { titulo: "Faz o teu primeiro teste", texto: "Ainda não há testes guardados neste aparelho. O primeiro teste fica como a tua base." },
        olhoEsq: vazio, olhoDir: vazio, olhosSub: "Ainda sem testes", alertas: "Nenhum",
        olhosNota: "Sem OCT a bordo: o estado vem dos testes rápidos, comparados com a tua base (o teu primeiro teste)."
      };
    }
    var r = u.reg, av = u.av, nivel3 = av.nivel >= 3 ? 2 : (av.nivel === 2 ? 1 : 0);
    var prox = r.dia + ((g.REGRAS.textos[av.cor] || {}).proximo_teste_dias || 7);
    var titulos = ["Tudo dentro da tua base", "Repete os testes rápidos", "Avisa o médico de voo"];
    var texto = av.motivos.length ? av.motivos.join(" ") : (av.primeiro ? "Primeiro teste guardado como a tua base. Próximo teste rápido no dia " + prox + "."
      : "Acuidade e grelha de Amsler iguais à tua base. Próximo teste rápido no dia " + prox + ".");
    if (av.nSint && !av.motivos.length) texto = "Indicaste sintomas no último teste. A equipa médica vai rever.";
    var nAl = alertas().filter(function (a) { return a[1] >= 2; }).length;
    return {
      p: { nome: me.nome, curto: me.curto, ini: me.ini, dia: me.dia, prox: prox, acu: "OE " + acTxt(r, "oe") + " · OD " + acTxt(r, "od"), amsler: amTxt(r), sans: "Linha temporal dos teus testes", limTxt: "" },
      nivel: nivel3, rec: { titulo: titulos[nivel3], texto: texto },
      olhoEsq: Object.assign({ valor: acTxt(r, "oe"), uni: "" }, E[IDX[av.corOlho.oe]]),
      olhoDir: Object.assign({ valor: acTxt(r, "od"), uni: "" }, E[IDX[av.corOlho.od]]),
      olhosSub: "Último teste rápido · dia " + r.dia,
      olhosNota: "Linhas lidas por olho e estado face à tua base (dia " + u.regs[0].dia + "). Sem OCT a bordo: decisão do motor de regras com os testes rápidos.",
      alertas: nAl ? nAl + " para revisão" : "Nenhum activo"
    };
  }

  // Ecrã SANS: linha temporal [dia, nível, texto] por faixa.
  function linhaTempo() {
    var me = eu(); if (!me) return null;
    var regs = rapidos(me.id), T = { oct: [], acu: [], ams: [], sin: [], mov: [] };
    var N = { verde: 0, amarelo: 2, vermelho: 3, a_calibrar: 0 };
    regs.forEach(function (r) {
      var av = avaliarRegisto(regs[0], r);
      var pior = function (tipo) { return N[g.Motor.piorCor(av.sinais.filter(function (s) { return s.tipo === tipo; }).map(function (s) { return s.cor; }))]; };
      T.acu.push([r.dia, av.primeiro ? 0 : pior("acuidade"), "OE " + acTxt(r, "oe") + " · OD " + acTxt(r, "od") + (av.primeiro ? " · base" : "")]);
      T.ams.push([r.dia, pior("amsler"), amTxt(r) + " · OD " + (r.celulas_od || []).length + " · OE " + (r.celulas_oe || []).length + (av.primeiro ? " · base" : "")]);
      var s = [["focar", r.perg_focar], ["contraste", r.perg_contraste], ["dores de cabeça", r.perg_dor_cabeca], ["imagens duplas", r.perg_visao_dupla]]
        .filter(function (x) { return x[1] > 0; }).map(function (x) { return x[0] + (x[1] >= 3 ? " (marcado)" : " (ligeiro)"); });
      if (s.length) T.sin.push([r.dia, av.nSint ? 2 : 0, s.join(", ")]);
      if (r.evento_nave === "sim" || r.evento_nave === "naosei") T.mov.push([r.dia, 4, r.evento_nave === "sim" ? "Sentiste movimento da nave no teste" : "Movimento da nave por confirmar"]);
    });
    return T;
  }

  // Ecrã Alerta: [id, nível, título, quandoCurto, o quê, quando, fontes, fiabilidade, acção, revisão, links, pacote]
  function alertas() {
    var me = eu(); if (!me) return null;
    var regs = rapidos(me.id), L = [];
    regs.slice().reverse().forEach(function (r) {
      var av = avaliarRegisto(regs[0], r);
      var fiab = r.sem_camara ? "Distância não medida pela câmara." : "Distância média " + r.distancia_cm + " cm" + (r.fora_distancia_pct ? " · fora do intervalo em " + r.fora_distancia_pct + "% das medições." : ".");
      if ((r.ressalvas || []).length) fiab += " " + r.ressalvas.join(" ");
      var fontes = "Teste rápido na tela · motor de regras (limites provisórios) · base do dia " + regs[0].dia;
      if (av.nivel >= 2) {
        (av.motivos.length ? av.motivos : ["Sintomas indicados no questionário."]).forEach(function (m, i) {
          var verm = av.nivel === 3 && /centro|não melhora/.test(m);
          L.push(["r" + r.dia + "-" + i, verm ? 3 : 2, m.replace(/\.$/, ""), "Dia " + r.dia, m + " Comparação com a tua base.", "Dia " + r.dia, fontes, fiab,
            verm ? "Avisar já o médico de voo." : "Revisão pela equipa médica. Repetir o teste em 2 a 3 dias.", verm ? "Prioritária" : "Pendente", ["teste", "sans"], verm]);
        });
      } else if (av.nivel === 1) {
        L.push(["r" + r.dia, 1, "Teste com condições a confirmar", "Dia " + r.dia, "O resultado foi igual à base, mas as condições podem ter afectado o teste.", "Dia " + r.dia, fontes, fiab, "Repete o teste quando puderes.", "Repetir", ["teste"], false]);
      }
      if (r.alerta_clinico) L.push(["c" + r.dia, 3, "Imagens duplas marcadas", "Dia " + r.dia, "Respondeste «Marcado» a imagens duplas.", "Dia " + r.dia, "Respostas do astronauta", fiab, "Avisar já o médico de voo.", "Prioritária", ["sans"], true]);
    });
    if (!L.length) {
      var u = regs[regs.length - 1];
      L.push(["ok", 0, u ? "Testes de rotina dentro da tua base" : "Ainda sem testes", u ? "Dia " + u.dia : "Dia " + me.dia,
        u ? "Acuidade OE " + acTxt(u, "oe") + " · OD " + acTxt(u, "od") + ". Grelha de Amsler: " + amTxt(u).toLowerCase() + "." : "Faz o primeiro teste rápido: fica guardado como a tua base.",
        u ? "Dia " + u.dia : "–", "Teste rápido na tela · motor de regras", u ? (u.sem_camara ? "Distância não medida pela câmara." : "Distância média " + u.distancia_cm + " cm.") : "–",
        "Segue o calendário normal.", "Não necessária", ["teste"], false]);
    }
    return L;
  }

  // Ecrã Perfil.
  function fichaPerfil() {
    var me = eu(); if (!me) return null;
    var regs = rapidos(me.id), base = regs[0], u = regs[regs.length - 1];
    var av = u ? avaliarRegisto(base, u) : null;
    var rosto = g.Rosto ? g.Rosto.registados().indexOf(me.id) !== -1 : (function () { try { return !!(JSON.parse(ler("dt_rostos")) || {})[me.id]; } catch (e) { return false; } })();
    var COR = { verde: "Verde · rotina", amarelo: "Laranja · revisão", vermelho: "Vermelho · prioridade" };
    var dist = regs.filter(function (r) { return r.distancia_cm; }).map(function (r) { return r.distancia_cm; });
    return {
      nome: me.nome, curto: me.curto, ini: me.ini, papel: "Equipa Deep Thinkers", dia: me.dia,
      grupos: [
        { titulo: "SESSÃO", linhas: [["Perfil", me.id], ["Dia de missão", String(me.dia)], ["Rosto registado", rosto ? "Sim · só o descritor numérico" : "Não"], ["Dados", "Guardados só neste aparelho"]] },
        { titulo: "TESTES RÁPIDOS", linhas: [["Testes guardados", String(regs.length)], ["Base", base ? "Dia " + base.dia + " · OE " + acTxt(base, "oe") + " · OD " + acTxt(base, "od") : "Por fazer"],
          ["Último teste", u ? "Dia " + u.dia + " · OE " + acTxt(u, "oe") + " · OD " + acTxt(u, "od") : "–"], ["Grelha de Amsler", u ? amTxt(u) : "–"]] },
        { titulo: "ESTADO", linhas: [["Semáforo", av ? COR[av.cor] : "Sem testes"], ["Distância média", dist.length ? Math.round(dist.reduce(function (a, b) { return a + b; }, 0) / dist.length) + " cm" : "Não medida"],
          ["OCT", "Sem OCT a bordo"], ["Limites", g.REGRAS.provisorio ? "Provisórios · a validar" : "Validados"]] }
      ].map(function (gr) { return { titulo: gr.titulo, linhas: gr.linhas.map(function (x) { return { k: x[0], v: x[1] }; }) }; })
    };
  }

  // Ecrã Tendência: astronautas simulados (simulador.py) e faixas de referência (Monte Carlo).
  var DEMO = { A: { id: "DEMO_A", ate: 60 }, B: { id: "DEMO_B", ate: 90 }, C: { id: "DEMO_C", ate: 84 } };
  function tendencia(letra) {
    if (!g.FAIXAS || !g.ASTRONAUTAS || !g.Motor) return null;
    var cfg = DEMO[letra] || DEMO.B, F = g.FAIXAS;
    var regs = g.ASTRONAUTAS.filter(function (r) { return r.astronauta_id === cfg.id && r.dia <= cfg.ate; });
    var octs = regs.filter(function (r) { return r.oct_um !== null && r.oct_um !== undefined; });
    if (!octs.length) return null;
    var base = octs[0].oct_um;
    function faixa(nome) { return function (d) { var i = Math.max(0, Math.min(F[nome].length - 1, Math.round(d))); return F[nome][i]; }; }
    var c = g.Motor.corOCT(octs.map(function (r) { return { dia: r.dia, oct_um: r.oct_um }; }), F);
    return {
      days: octs.map(function (r) { return r.dia; }),
      vals: octs.map(function (r) { return Math.round((r.oct_um / base - 1) * 1000) / 10; }),
      p10: faixa("p10"), p90: faixa("p90"), p97: faixa("p97"),
      level: { verde: 0, amarelo: 1, vermelho: 2, a_calibrar: 0 }[c.cor], motivo: c.motivo, dia: octs[octs.length - 1].dia
    };
  }

  // ---------- Câmara: mede a distância durante o teste (nada é gravado) ----------
  var camara = (function () {
    var video = null, ligada = false, amostras = [], ultimoAviso = 0, ouvinte = null, ultimo = { estado: "desligada", cm: null };
    function aoMudar(r) {
      ultimo = r;
      if (r.estado === "ok" || r.estado === "perto" || r.estado === "longe") amostras.push({ cm: r.cm, ok: r.estado === "ok" });
      var agora = Date.now();
      if (ouvinte && agora - ultimoAviso > 400) { ultimoAviso = agora; ouvinte(r); }
    }
    return {
      disponivel: function () { return !!(g.Distancia && g.FaceDetection && g.navigator.mediaDevices && g.location.protocol !== "file:"); },
      iniciar: function (minCm, maxCm, fn) {
        ouvinte = fn;
        if (!this.disponivel()) { ultimo = { estado: "indisponivel", cm: null }; if (fn) fn(ultimo); return; }
        if (ligada) { g.Distancia.definirIntervalo(minCm, maxCm); return; }
        if (!video) {
          video = g.document.createElement("video");
          video.setAttribute("playsinline", ""); video.muted = true;
          video.className = "fixo";
          g.document.body.appendChild(video);
          g.DC_FIXOS = g.DC_FIXOS || {}; g.DC_FIXOS.camara = video;     // aparece onde o ecrã tiver data-fixo="camara"
          if (g.DC_encaixarFixos) g.DC_encaixarFixos();
        }
        ligada = true;
        g.Distancia.iniciar(video, { minCm: minCm, maxCm: maxCm, aoMudar: aoMudar, pastaModelo: "../camara/vendor/mediapipe/" });
      },
      parar: function () { if (ligada) { g.Distancia.parar(); ligada = false; } ouvinte = null; },
      limpar: function () { amostras = []; },
      ultimo: function () { return ultimo; },
      resumo: function () {
        if (!amostras.length) return { n: 0, media: null, foraPct: null };
        var m = amostras.reduce(function (s, a) { return s + a.cm; }, 0) / amostras.length;
        var fora = amostras.filter(function (a) { return !a.ok; }).length;
        return { n: amostras.length, media: Math.round(m), foraPct: Math.round(fora / amostras.length * 100) };
      }
    };
  })();

  g.Visao = {
    temBackend: temBackend, real: real, irisDe: irisDe, guardarIris: guardarIris, eu: eu, entrar: entrar, sair: sair, diaSugerido: diaSugerido, nomeDe: nomeDe, iniciais: iniciais,
    selo: function () { return real() ? "Dados reais · só neste aparelho" : "Dados simulados"; },
    anterior: anterior, guardarTeste: guardarTeste, resumoHoje: resumoHoje, linhaTempo: linhaTempo, alertas: alertas,
    fichaPerfil: fichaPerfil, tendencia: tendencia, camara: camara,
    _zonasDe: zonasDe, _avaliarRegisto: avaliarRegisto
  };
})(typeof window !== "undefined" ? window : globalThis);
