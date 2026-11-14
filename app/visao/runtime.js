/* Visão · runtime leve para as páginas exportadas.
   Lê o modelo <template id="dc-modelo">, preenche os {{ campos }} com renderVals()
   e volta a desenhar o ecrã sempre que o estado muda. */
(function () {
  'use strict';
  var agendado = false;
  var instancia = null;
  var modelo = null;
  var raiz = null;
  var holeRe = /\{\{\s*([\w.]+)\s*\}\}/g;
  var inteiro = /^\s*\{\{\s*([\w.]+)\s*\}\}\s*$/;

  window.DCLogic = function DCLogic(props) { this.props = props || {}; this.state = {}; };
  window.DCLogic.prototype.setState = function (u) {
    var upd = typeof u === 'function' ? u(this.state) : u;
    if (!upd) return;
    this.state = Object.assign({}, this.state, upd);
    agendar();
  };

  function agendar() {
    if (agendado) return;
    agendado = true;
    Promise.resolve().then(function () { agendado = false; desenhar(); });
  }

  function ler(scope, caminho) {
    return caminho.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  function texto(v) { return v == null ? '' : String(v); }

  function expandir(no, scope, destino) {
    if (no.nodeType === 3) {
      destino.appendChild(document.createTextNode(no.textContent.replace(holeRe, function (m, p) { return texto(ler(scope, p)); })));
      return;
    }
    if (no.nodeType !== 1) return;
    var tag = no.tagName.toLowerCase();
    if (tag === 'helmet') return;
    if (tag === 'sc-for') {
      var lm = no.getAttribute('list').match(inteiro);
      var lista = (lm && ler(scope, lm[1])) || [];
      var nome = no.getAttribute('as');
      for (var i = 0; i < lista.length; i++) {
        var sc = Object.create(scope); sc[nome] = lista[i];
        for (var c = 0; c < no.childNodes.length; c++) expandir(no.childNodes[c], sc, destino);
      }
      return;
    }
    if (tag === 'sc-if') {
      var vm = no.getAttribute('value').match(inteiro);
      if (vm && ler(scope, vm[1])) for (var j = 0; j < no.childNodes.length; j++) expandir(no.childNodes[j], scope, destino);
      return;
    }
    var el = no.namespaceURI === 'http://www.w3.org/2000/svg'
      ? document.createElementNS(no.namespaceURI, no.tagName)
      : document.createElement(no.tagName);
    for (var a = 0; a < no.attributes.length; a++) {
      var at = no.attributes[a];
      var nomeAt = at.name;
      var m = at.value.match(inteiro);
      if (/^on/i.test(nomeAt)) {
        var fn = m ? ler(scope, m[1]) : null;
        if (typeof fn === 'function') {
          var ev = nomeAt.slice(2).toLowerCase();
          if (ev === 'change' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) ev = 'input';
          el.addEventListener(ev, fn);
        }
        continue;
      }
      if (m) {
        var v = ler(scope, m[1]);
        if (typeof v === 'function') continue;
        if (nomeAt === 'disabled') { if (v) el.setAttribute('disabled', ''); continue; }
        el.setAttribute(nomeAt, texto(v));
        if (nomeAt === 'value') el.value = texto(v);
      } else {
        el.setAttribute(nomeAt, at.value.replace(holeRe, function (mm, p) { return texto(ler(scope, p)); }));
      }
    }
    var origem = tag === 'template' ? no.content : no;
    for (var k = 0; k < origem.childNodes.length; k++) expandir(origem.childNodes[k], scope, el);
    destino.appendChild(el);
  }

  function desenhar() {
    var activo = document.activeElement;
    var manter = activo && activo.id && raiz.contains(activo) && /^(INPUT|TEXTAREA)$/.test(activo.tagName) ? activo : null;
    var vals = instancia.renderVals();
    var frag = document.createDocumentFragment();
    for (var i = 0; i < modelo.childNodes.length; i++) expandir(modelo.childNodes[i], vals, frag);
    if (manter) {
      // Mantém o mesmo campo que está a ser escrito, para não perder o cursor.
      var novo = frag.querySelector('#' + CSS.escape(manter.id));
      if (novo && novo.tagName === manter.tagName) {
        var a;
        for (a = manter.attributes.length - 1; a >= 0; a--) {
          var n = manter.attributes[a].name;
          if (n !== 'value' && !novo.hasAttribute(n)) manter.removeAttribute(n);
        }
        for (a = 0; a < novo.attributes.length; a++) {
          if (novo.attributes[a].name !== 'value') manter.setAttribute(novo.attributes[a].name, novo.attributes[a].value);
        }
        var irmao = manter.nextSibling, pai = manter.parentNode;
        novo.parentNode.replaceChild(manter, novo);
        while (raiz.firstChild) raiz.removeChild(raiz.firstChild);
        raiz.appendChild(frag);
        manter.focus();
        actualizarFundo();
        return;
      }
    }
    while (raiz.firstChild) raiz.removeChild(raiz.firstChild);
    raiz.appendChild(frag);
    actualizarFundo();
  }

  function actualizarFundo() {
    var tema = raiz.firstElementChild && raiz.firstElementChild.className;
    document.body.style.background = tema === 'tema-claro' ? '#E6EBF0' : '#050506';
  }

  function ajustar() {
    var palco = document.getElementById('palco');
    var esc = Math.min(window.innerWidth / 1194, window.innerHeight / 834, 1.6);
    palco.style.transform = 'scale(' + esc + ')';
  }

  window.addEventListener('DOMContentLoaded', function () {
    modelo = document.getElementById('dc-modelo').content;
    raiz = document.getElementById('raiz');
    instancia = new window.Component({});
    desenhar();
    if (typeof instancia.componentDidMount === 'function') instancia.componentDidMount();
    ajustar();
    window.addEventListener('resize', ajustar);
  });
})();
