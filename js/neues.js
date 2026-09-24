/* Startseite: die letzten Tagebuch-Eintraege aus Bienen/bienen.json anzeigen. */
(function () {
  "use strict";

  var ANZAHL = 3;
  var block = document.getElementById("neues");
  if (!block || !window.fetch) return;
  var liste = block.querySelector(".neues-liste");
  var i18n = window.i18n;
  var eintraege = [];
  var mehrereVoelker = false;

  function sortierbar(datum) {
    var t = datum.split(/[.\-\/]/).map(Number);
    if (t.length !== 3 || t.some(isNaN)) return 0;
    if (t[0] > 31) return t[0] * 10000 + t[1] * 100 + t[2];      // 2026-05-17
    var jahr = t[2] < 100 ? t[2] + 2000 : t[2];                   // 17.05.2026
    return jahr * 10000 + t[1] * 100 + t[0];
  }

  function zeichne() {
    var englisch = i18n.lang() === "en";
    liste.innerHTML = "";
    eintraege.slice(0, ANZAHL).forEach(function (e, i) {
      var name = englisch && e.volk.en && e.volk.en.title ? e.volk.en.title : e.volk.title;
      var li = document.createElement("li");
      li.className = "tl-item" + (i === 0 ? " now" : "");
      var wann = document.createElement("span");
      wann.className = "tl-when";
      wann.textContent = i18n.datum(e.datum) + (mehrereVoelker ? " · " + name : "");
      var p = document.createElement("p");
      p.textContent = englisch && e.en ? e.en : e.text;
      li.appendChild(wann);
      li.appendChild(p);
      liste.appendChild(li);
    });
  }

  document.addEventListener("langchange", function () {
    if (eintraege.length) zeichne();
  });

  fetch("./Bienen/bienen.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function (data) {
      (data.colonies || []).forEach(function (volk) {
        (volk.log || []).forEach(function (e) {
          eintraege.push({ volk: volk, datum: e.datum, text: e.text, en: e.en });
        });
      });
      if (!eintraege.length) return;

      eintraege.sort(function (a, b) { return sortierbar(b.datum) - sortierbar(a.datum); });
      mehrereVoelker = (data.colonies || []).length > 1;
      zeichne();
      block.hidden = false;
    })
    .catch(function () { /* ohne Daten bleibt der Abschnitt einfach weg */ });
})();
