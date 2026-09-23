/* Wuerfelspiele: Kniffel, Maexchen und ein freier Wuerfelbecher.
   Alles laeuft im Browser, nichts wird gespeichert. */
(function () {
  "use strict";

  var tabRow = document.querySelector(".game-tabs");
  if (!tabRow) return;

  /* ---------- Kleine Helfer ---------- */

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function wurf(seiten) { return 1 + Math.floor(Math.random() * (seiten || 6)); }
  function summe(liste) {
    return liste.reduce(function (a, b) { return a + b; }, 0);
  }
  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
    });
  }

  var AUGEN = "<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>";

  /* Ein Wuerfel als Markup: Augen bei sechsseitigen Wuerfeln, sonst die Zahl. */
  function wuerfelHtml(wert, seiten) {
    if (wert === "zu") return '<span class="die zu" data-face="zahl">?</span>';
    if (seiten && seiten !== 6) {
      return '<span class="die" data-face="zahl">' + wert + "</span>";
    }
    return '<span class="die" data-face="' + (wert == null ? "0" : wert) + '">' + AUGEN + "</span>";
  }

  function animiere(reihe) {
    reihe.classList.remove("rollt");
    void reihe.offsetWidth;
    reihe.classList.add("rollt");
  }

  /* ---------- Reiter ---------- */

  var tabs = els("button[data-game]", tabRow);
  tabRow.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-game]");
    if (!btn) return;
    tabs.forEach(function (b) {
      var an = b === btn;
      b.setAttribute("aria-selected", String(an));
      var panel = el("#panel-" + b.dataset.game);
      if (panel) panel.hidden = !an;
    });
  });

  /* ---------- Namensfelder, fuer beide Spiele gleich ---------- */

  function namenZeile(liste) {
    var row = document.createElement("div");
    row.className = "name-row";
    row.innerHTML =
      '<input type="text" maxlength="14" autocomplete="off">' +
      '<button type="button" class="drop icon-btn" aria-label="Spieler entfernen">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    liste.appendChild(row);
  }

  function namenFrischen(liste, minimum) {
    var rows = els(".name-row", liste);
    rows.forEach(function (row, i) {
      el("input", row).placeholder = "Spieler " + (i + 1);
      el(".drop", row).hidden = rows.length <= minimum;
    });
  }

  function namenLesen(liste) {
    return els(".name-row input", liste).map(function (inp, i) {
      return inp.value.trim().slice(0, 14) || "Spieler " + (i + 1);
    });
  }

  function namenAufsetzen(liste, start, minimum) {
    for (var i = 0; i < start; i++) namenZeile(liste);
    namenFrischen(liste, minimum);
    liste.addEventListener("click", function (ev) {
      var drop = ev.target.closest(".drop");
      if (!drop) return;
      if (els(".name-row", liste).length <= minimum) return;
      drop.closest(".name-row").remove();
      namenFrischen(liste, minimum);
    });
  }

  function namenDazu(liste, minimum) {
    if (els(".name-row", liste).length >= 6) return;
    namenZeile(liste);
    namenFrischen(liste, minimum);
    var rows = els(".name-row input", liste);
    rows[rows.length - 1].focus();
  }

  /* =====================================================
     Kniffel
     ===================================================== */

  function haeufig(w) {
    var h = [0, 0, 0, 0, 0, 0, 0];
    w.forEach(function (x) { h[x]++; });
    return h;
  }
  function gleiche(w) {
    return Math.max.apply(null, haeufig(w).slice(1));
  }
  function augenwert(w, augen) {
    return w.filter(function (x) { return x === augen; }).length * augen;
  }
  function strasse(w, laenge) {
    var h = haeufig(w), lauf = 0, best = 0, i;
    for (i = 1; i <= 6; i++) {
      lauf = h[i] ? lauf + 1 : 0;
      if (lauf > best) best = lauf;
    }
    return best >= laenge;
  }

  var FELDER = [
    { id: "o1", name: "Einer", oben: true, punkte: function (w) { return augenwert(w, 1); } },
    { id: "o2", name: "Zweier", oben: true, punkte: function (w) { return augenwert(w, 2); } },
    { id: "o3", name: "Dreier", oben: true, punkte: function (w) { return augenwert(w, 3); } },
    { id: "o4", name: "Vierer", oben: true, punkte: function (w) { return augenwert(w, 4); } },
    { id: "o5", name: "Fünfer", oben: true, punkte: function (w) { return augenwert(w, 5); } },
    { id: "o6", name: "Sechser", oben: true, punkte: function (w) { return augenwert(w, 6); } },
    { id: "u1", name: "Dreierpasch", punkte: function (w) { return gleiche(w) >= 3 ? summe(w) : 0; } },
    { id: "u2", name: "Viererpasch", punkte: function (w) { return gleiche(w) >= 4 ? summe(w) : 0; } },
    {
      id: "u3", name: "Full House", punkte: function (w) {
        var h = haeufig(w).slice(1);
        return h.indexOf(3) >= 0 && h.indexOf(2) >= 0 ? 25 : 0;
      }
    },
    { id: "u4", name: "Kleine Straße", punkte: function (w) { return strasse(w, 4) ? 30 : 0; } },
    { id: "u5", name: "Große Straße", punkte: function (w) { return strasse(w, 5) ? 40 : 0; } },
    { id: "u6", name: "Kniffel", punkte: function (w) { return gleiche(w) === 5 ? 50 : 0; } },
    { id: "u7", name: "Chance", punkte: function (w) { return summe(w); } }
  ];

  function feld(id) {
    for (var i = 0; i < FELDER.length; i++) if (FELDER[i].id === id) return FELDER[i];
    return null;
  }

  var kSpieler = [], kAktiv = 0, kWuerfel = [], kFest = [],
      kUebrig = 3, kGeworfen = false, kLaeuft = false;

  var kNames = el("#kNames"), kBoard = el("#kBoard"), kSetup = el("#kSetup"),
      kSheet = el("#kSheet"), kDice = el("#kDice"), kResult = el("#kResult");

  namenAufsetzen(kNames, 2, 1);
  el("#kAdd").addEventListener("click", function () { namenDazu(kNames, 1); });
  el("#kStart").addEventListener("click", kStart);
  el("#kQuit").addEventListener("click", kZurueck);
  el("#kRoll").addEventListener("click", kWuerfeln);

  function kStart() {
    kSpieler = namenLesen(kNames).map(function (name) {
      return { name: name, felder: {}, kbonus: 0 };
    });
    kAktiv = 0;
    kLaeuft = true;
    kResult.hidden = true;
    kResult.innerHTML = "";
    kSetup.hidden = true;
    kBoard.hidden = false;
    kTabelle();
    kNeuerZug();
  }

  function kZurueck() {
    kLaeuft = false;
    kBoard.hidden = true;
    kResult.hidden = true;
    kSetup.hidden = false;
  }

  function kNeuerZug() {
    kWuerfel = [null, null, null, null, null];
    kFest = [false, false, false, false, false];
    kUebrig = 3;
    kGeworfen = false;
    kZeichne();
  }

  function kRunde() {
    var voll = 0;
    FELDER.forEach(function (f) {
      if (kSpieler[kAktiv].felder[f.id] != null) voll++;
    });
    return Math.min(voll + 1, FELDER.length);
  }

  function kTabelle() {
    var html = '<thead><tr><th scope="col">Feld</th>';
    kSpieler.forEach(function (s, i) {
      html += '<th scope="col" data-col="' + i + '">' + esc(s.name) + "</th>";
    });
    html += "</tr></thead><tbody>";

    FELDER.forEach(function (f) {
      html += '<tr><th scope="row">' + f.name + "</th>";
      kSpieler.forEach(function (s, i) {
        html += '<td data-col="' + i + '"><button type="button" class="score-cell" data-feld="' +
          f.id + '" data-col="' + i + '"></button></td>';
      });
      html += "</tr>";
      if (f.id === "o6") {
        html += kSummenZeile("Summe oben", "oben") + kSummenZeile("Bonus ab 63", "bonus");
      }
    });

    html += kSummenZeile("Summe unten", "unten") + kSummenZeile("Kniffel-Bonus", "kbonus");
    html += "</tbody><tfoot>" + kSummenZeile("Gesamt", "gesamt", true) + "</tfoot>";
    kSheet.innerHTML = html;
  }

  function kSummenZeile(name, key, stark) {
    var html = '<tr class="sum-row' + (stark ? " total" : "") + '" data-sum="' + key +
      '"><th scope="row">' + name + "</th>";
    kSpieler.forEach(function (s, i) { html += '<td data-col="' + i + '">0</td>'; });
    return html + "</tr>";
  }

  function kSummen(sp) {
    var oben = 0, unten = 0;
    FELDER.forEach(function (f) {
      var v = sp.felder[f.id];
      if (v == null) return;
      if (f.oben) oben += v; else unten += v;
    });
    var bonus = oben >= 63 ? 35 : 0;
    return {
      oben: oben, bonus: bonus, unten: unten, kbonus: sp.kbonus,
      gesamt: oben + bonus + unten + sp.kbonus
    };
  }

  function kZeichne() {
    var sp = kSpieler[kAktiv];
    el("#kWho").textContent = sp ? sp.name + " ist dran" : "–";
    el("#kRound").textContent = String(kRunde());
    el("#kRolls").textContent = kUebrig === 1 ? "1 Wurf übrig" : kUebrig + " Würfe übrig";

    var roll = el("#kRoll");
    roll.disabled = !kLaeuft || kUebrig === 0;
    roll.textContent = kUebrig === 3 ? "Würfeln" : "Nochmal würfeln";

    el("#kHint").textContent = !kLaeuft
      ? "Die Partie ist vorbei."
      : !kGeworfen
        ? "Erst würfeln."
        : kUebrig > 0
          ? "Würfel antippen, die liegen bleiben sollen – oder gleich ein Feld eintragen."
          : "Keine Würfe mehr: jetzt ein Feld eintragen.";

    kZeichneWuerfel();
    kZeichneTabelle();
  }

  function kZeichneWuerfel() {
    kDice.innerHTML = kWuerfel.map(function (wert, i) {
      var aus = !kLaeuft || !kGeworfen || kUebrig === 0;
      var label = "Würfel " + (i + 1) + (wert ? ", " + wert + " Augen" : ", noch nicht geworfen") +
        (kFest[i] ? ", liegt" : "");
      return '<button type="button" class="die-btn" data-i="' + i + '" aria-pressed="' +
        (kFest[i] ? "true" : "false") + '" aria-label="' + label + '"' + (aus ? " disabled" : "") +
        ">" + wuerfelHtml(wert, 6) + "</button>";
    }).join("");
  }

  kDice.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".die-btn");
    if (!btn || !kLaeuft || !kGeworfen || kUebrig === 0) return;
    var i = +btn.dataset.i;
    kFest[i] = !kFest[i];
    kZeichneWuerfel();
  });

  function kZeichneTabelle() {
    els(".score-cell", kSheet).forEach(function (btn) {
      var col = +btn.dataset.col, sp = kSpieler[col], wert = sp.felder[btn.dataset.feld];
      btn.classList.toggle("locked", wert != null);
      btn.classList.remove("vorschau");
      if (wert != null) {
        btn.textContent = String(wert);
        btn.disabled = true;
        return;
      }
      if (kLaeuft && col === kAktiv && kGeworfen) {
        btn.textContent = String(feld(btn.dataset.feld).punkte(kWuerfel));
        btn.classList.add("vorschau");
        btn.disabled = false;
      } else {
        btn.textContent = "";
        btn.disabled = true;
      }
    });

    kSpieler.forEach(function (sp, i) {
      var s = kSummen(sp);
      Object.keys(s).forEach(function (key) {
        var zelle = el('.sum-row[data-sum="' + key + '"] td[data-col="' + i + '"]', kSheet);
        if (zelle) zelle.textContent = String(s[key]);
      });
    });

    els("[data-col]", kSheet).forEach(function (zelle) {
      zelle.classList.toggle("now", kLaeuft && +zelle.dataset.col === kAktiv);
    });
  }

  function kWuerfeln() {
    if (!kLaeuft || kUebrig === 0) return;
    for (var i = 0; i < 5; i++) if (!kFest[i]) kWuerfel[i] = wurf(6);
    kUebrig--;
    kGeworfen = true;
    kZeichne();
    animiere(kDice);
  }

  kSheet.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".score-cell");
    if (!btn || btn.disabled) return;
    kEintragen(btn.dataset.feld, +btn.dataset.col);
  });

  function kEintragen(feldId, col) {
    if (!kLaeuft || !kGeworfen || col !== kAktiv) return;
    var sp = kSpieler[kAktiv];
    if (sp.felder[feldId] != null) return;

    /* Jeder weitere Kniffel bringt 50 Zusatzpunkte. */
    if (gleiche(kWuerfel) === 5 && sp.felder.u6 === 50) sp.kbonus += 50;
    sp.felder[feldId] = feld(feldId).punkte(kWuerfel);

    if (kFertig()) { kEnde(); return; }
    kAktiv = (kAktiv + 1) % kSpieler.length;
    kNeuerZug();
  }

  function kFertig() {
    return kSpieler.every(function (sp) {
      return FELDER.every(function (f) { return sp.felder[f.id] != null; });
    });
  }

  function kEnde() {
    kLaeuft = false;
    kGeworfen = false;
    var liste = kSpieler.map(function (sp) {
      return { name: sp.name, punkte: kSummen(sp).gesamt };
    }).sort(function (a, b) { return b.punkte - a.punkte; });

    var html = '<p class="eyebrow">Feierabend</p><h3>' +
      (liste.length > 1
        ? esc(liste[0].name) + " gewinnt mit " + liste[0].punkte + " Punkten"
        : esc(liste[0].name) + " kommt auf " + liste[0].punkte + " Punkte") +
      '</h3><ol class="rank-list">';
    liste.forEach(function (r) {
      html += "<li><span>" + esc(r.name) + "</span><strong>" + r.punkte + "</strong></li>";
    });
    html += '</ol><div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn btn-primary" type="button" data-k="neu">Neues Spiel</button></div>';

    kResult.innerHTML = html;
    kResult.hidden = false;
    kZeichne();
    kResult.scrollIntoView({ block: "nearest" });
  }

  kResult.addEventListener("click", function (ev) {
    if (ev.target.closest('[data-k="neu"]')) kZurueck();
  });

  /* =====================================================
     Maexchen
     ===================================================== */

  /* Wert eines Wurfs: 31 bis 65, Paesche darueber, Maexchen (21) ganz oben. */
  function mWert(a, b) {
    var hoch = Math.max(a, b), tief = Math.min(a, b);
    if (hoch === 2 && tief === 1) return 1000;
    if (hoch === tief) return 100 + hoch;
    return hoch * 10 + tief;
  }

  function mLabel(a, b) {
    var hoch = Math.max(a, b), tief = Math.min(a, b);
    if (hoch === 2 && tief === 1) return "21 (Mäxchen)";
    if (hoch === tief) return String(hoch) + String(tief) + " (Pasch)";
    return String(hoch) + String(tief);
  }

  var M_LISTE = (function () {
    var liste = [], hoch, tief;
    for (hoch = 3; hoch <= 6; hoch++) {
      for (tief = 1; tief < hoch; tief++) liste.push([hoch, tief]);
    }
    for (hoch = 1; hoch <= 6; hoch++) liste.push([hoch, hoch]);
    liste.push([2, 1]);
    return liste.map(function (p) {
      return { a: p[0], b: p[1], wert: mWert(p[0], p[1]), label: mLabel(p[0], p[1]) };
    }).sort(function (x, y) { return x.wert - y.wert; });
  })();

  var mSpieler = [], mAktiv = 0, mAnsage = null, mWurf = null,
      mPhase = "aus", mLebenStart = 3, mErgebnis = null;

  var mNames = el("#mNames"), mSetup = el("#mSetup"), mBoard = el("#mBoard"),
      mStage = el("#mStage"), mLifeList = el("#mLifeList");

  namenAufsetzen(mNames, 2, 2);
  el("#mAdd").addEventListener("click", function () { namenDazu(mNames, 2); });
  el("#mStart").addEventListener("click", mStart);
  el("#mQuit").addEventListener("click", mZurueck);

  function mStart() {
    mLebenStart = parseInt(el("#mLives").value, 10) || 3;
    mSpieler = namenLesen(mNames).map(function (name) {
      return { name: name, leben: mLebenStart };
    });
    mAktiv = 0;
    mAnsage = null;
    mWurf = null;
    mErgebnis = null;
    mPhase = "uebergabe";
    mSetup.hidden = true;
    mBoard.hidden = false;
    mZeichne();
  }

  function mZurueck() {
    mPhase = "aus";
    mBoard.hidden = true;
    mSetup.hidden = false;
  }

  function mLebend() {
    return mSpieler.filter(function (s) { return s.leben > 0; });
  }

  function mNaechster(von) {
    var i = von;
    for (var n = 0; n < mSpieler.length; n++) {
      i = (i + 1) % mSpieler.length;
      if (mSpieler[i].leben > 0) return i;
    }
    return von;
  }

  function mZeichne() {
    var sp = mSpieler[mAktiv], html = "";

    if (mPhase === "uebergabe") {
      html = '<p class="eyebrow">Weitergeben</p><h3>' + esc(sp.name) + ' ist dran</h3>' +
        '<p class="hint">Gerät an ' + esc(sp.name) + ' geben, damit niemand mitguckt.' +
        (mAnsage ? " Die Ansage steht bei " + mAnsage.label + "." : "") + "</p>" +
        mKnopf("uebernehmen", "Ich bin " + sp.name, true);

    } else if (mPhase === "entscheiden") {
      var vor = mSpieler[mAnsage.von];
      var maex = mAnsage.wert === 1000;
      html = '<p class="eyebrow">Ansage von ' + esc(vor.name) + '</p><h3>' + mAnsage.label + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml("zu") + wuerfelHtml("zu") + "</div>" +
        '<p class="hint">' + (maex
          ? "Ein angesagtes Mäxchen musst du aufdecken. Stimmt es, kostet dich das zwei Leben."
          : "Glaubst du das? Wenn du weiterwürfelst, musst du höher ansagen als " +
            mAnsage.label + ".") + "</p>" +
        '<div class="btn-row" style="justify-content:flex-start">' +
        '<button class="btn btn-primary" type="button" data-m="aufdecken">Aufdecken</button>' +
        (maex ? "" : '<button class="btn btn-quiet" type="button" data-m="glauben">Glauben und würfeln</button>') +
        "</div>";

    } else if (mPhase === "werfen") {
      html = '<p class="eyebrow">' + esc(sp.name) + '</p><h3>Würfeln</h3>' +
        '<div class="dice-row">' + wuerfelHtml("zu") + wuerfelHtml("zu") + "</div>" +
        '<p class="hint">Nur du siehst das Ergebnis.</p>' +
        mKnopf("wuerfeln", "Becher schütteln", true);

    } else if (mPhase === "ansagen") {
      var frei = M_LISTE.filter(function (a) {
        return !mAnsage || a.wert > mAnsage.wert;
      });
      var wahrheit = frei.some(function (a) { return a.wert === mWurf.wert; });
      html = '<p class="eyebrow">' + esc(sp.name) + '</p><h3>Du hast ' + mWurf.label + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml(mWurf.a, 6) + wuerfelHtml(mWurf.b, 6) + "</div>" +
        '<p class="hint">' + (wahrheit
          ? "Du kannst die Wahrheit sagen oder höher gehen."
          : "Dein Wurf liegt nicht über " + mAnsage.label + " – du musst bluffen.") + "</p>" +
        '<label class="pick"><span>Ich sage an</span><select id="mPick">' +
        frei.map(function (a) {
          return '<option value="' + a.wert + '"' +
            (a.wert === mWurf.wert ? " selected" : "") + ">" + a.label +
            (a.wert === mWurf.wert ? " – dein Wurf" : "") + "</option>";
        }).join("") + "</select></label>" +
        mKnopf("ansagen", "Ansagen und weitergeben", true);

    } else if (mPhase === "aufgedeckt") {
      html = '<p class="eyebrow">Aufgedeckt</p><h3>' + mErgebnis.titel + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml(mWurf.a, 6) + wuerfelHtml(mWurf.b, 6) + "</div>" +
        "<p>" + mErgebnis.text + "</p>" +
        mKnopf("weiter", "Weiter", true);

    } else if (mPhase === "sieg") {
      html = '<p class="eyebrow">Vorbei</p><h3>' + esc(mLebend()[0].name) + " gewinnt</h3>" +
        '<p class="hint">Alle anderen haben ihre Leben verspielt.</p>' +
        mKnopf("neu", "Neues Spiel", true);
    }

    mStage.innerHTML = html;
    mZeichneLeben();
  }

  function mKnopf(aktion, text, primaer) {
    return '<div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn ' + (primaer ? "btn-primary" : "btn-quiet") +
      '" type="button" data-m="' + aktion + '">' + esc(text) + "</button></div>";
  }

  function mZeichneLeben() {
    mLifeList.innerHTML = mSpieler.map(function (s, i) {
      var pips = "";
      for (var j = 0; j < mLebenStart; j++) {
        pips += '<i class="' + (j < s.leben ? "on" : "off") + '"></i>';
      }
      var klasse = s.leben <= 0 ? "out" : (i === mAktiv && mPhase !== "sieg" ? "now" : "");
      return '<li class="' + klasse + '"><span>' + esc(s.name) +
        '</span><span class="pips" aria-label="' + s.leben + ' Leben">' + pips + "</span></li>";
    }).join("");
  }

  mStage.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-m]");
    if (!btn) return;
    var aktion = btn.dataset.m;

    if (aktion === "uebernehmen") {
      mPhase = mAnsage ? "entscheiden" : "werfen";

    } else if (aktion === "glauben") {
      mPhase = "werfen";

    } else if (aktion === "wuerfeln") {
      var a = wurf(6), b = wurf(6);
      mWurf = { a: a, b: b, wert: mWert(a, b), label: mLabel(a, b) };
      mPhase = "ansagen";
      mZeichne();
      animiere(el(".dice-row", mStage));
      return;

    } else if (aktion === "ansagen") {
      var pick = el("#mPick");
      var gewaehlt = M_LISTE.filter(function (x) { return x.wert === +pick.value; })[0];
      mAnsage = { wert: gewaehlt.wert, label: gewaehlt.label, von: mAktiv };
      mAktiv = mNaechster(mAktiv);
      mPhase = "uebergabe";

    } else if (aktion === "aufdecken") {
      mAufdecken();

    } else if (aktion === "weiter") {
      if (mLebend().length <= 1) {
        mPhase = "sieg";
      } else {
        mAnsage = null;
        mWurf = null;
        mAktiv = mSpieler[mErgebnis.verlierer].leben > 0
          ? mErgebnis.verlierer
          : mNaechster(mErgebnis.verlierer);
        mPhase = "uebergabe";
      }

    } else if (aktion === "neu") {
      mZurueck();
      return;
    }

    mZeichne();
  });

  function mAufdecken() {
    var ansager = mSpieler[mAnsage.von], aufdecker = mSpieler[mAktiv];
    var stimmt = mWurf.wert >= mAnsage.wert;
    var maex = mAnsage.wert === 1000;
    var verlierer, abzug, titel, text;

    if (stimmt) {
      verlierer = mAktiv;
      abzug = maex ? 2 : 1;
      titel = esc(aufdecker.name) + " verliert " + (abzug === 2 ? "zwei Leben" : "ein Leben");
      text = esc(ansager.name) + " hat " + mAnsage.label + " angesagt und tatsächlich " +
        mWurf.label + " gewürfelt.";
    } else {
      verlierer = mAnsage.von;
      abzug = 1;
      titel = esc(ansager.name) + " verliert ein Leben";
      text = esc(ansager.name) + " hat " + mAnsage.label + " angesagt, im Becher lagen aber nur " +
        mWurf.label + ".";
    }

    mSpieler[verlierer].leben = Math.max(0, mSpieler[verlierer].leben - abzug);
    if (mSpieler[verlierer].leben === 0) {
      text += " " + esc(mSpieler[verlierer].name) + " ist damit raus.";
    }
    mErgebnis = { verlierer: verlierer, titel: titel, text: text };
    mPhase = "aufgedeckt";
  }

  /* =====================================================
     Wuerfelbecher
     ===================================================== */

  var bDice = el("#bDice");
  var bZaehler = {};          /* Gezaehlt wird je Kombination aus Anzahl und Seiten. */

  function bSchluessel(anzahl, seiten) { return anzahl + "x" + seiten; }

  function bEinstellung() {
    var anzahl = Math.max(1, Math.min(8, parseInt(el("#bCount").value, 10) || 1));
    var seiten = parseInt(el("#bSides").value, 10) || 6;
    el("#bCount").value = String(anzahl);
    return { anzahl: anzahl, seiten: seiten };
  }

  /* Wahrscheinlichkeit jeder Summe: die Verteilung eines Wuerfels so oft
     mit sich selbst falten, wie Wuerfel im Becher liegen. */
  function bVerteilung(anzahl, seiten) {
    var v = [1], d, i, f, neu;
    for (d = 0; d < anzahl; d++) {
      neu = [];
      for (i = 0; i < v.length + seiten; i++) neu[i] = 0;
      for (i = 0; i < v.length; i++) {
        if (!v[i]) continue;
        for (f = 1; f <= seiten; f++) neu[i + f] += v[i];
      }
      v = neu;
    }
    var gesamt = Math.pow(seiten, anzahl);
    return v.map(function (x) { return x / gesamt; });
  }

  function komma(zahl, stellen) {
    return zahl.toFixed(stellen == null ? 2 : stellen).replace(".", ",");
  }

  function prozent(anteil) { return komma(anteil * 100, 1) + " %"; }

  function bStand(anzahl, seiten, anlegen) {
    var k = bSchluessel(anzahl, seiten);
    if (!bZaehler[k] && anlegen) bZaehler[k] = { wuerfe: 0, summe: 0, zahlen: {} };
    return bZaehler[k] || { wuerfe: 0, summe: 0, zahlen: {} };
  }

  function rund(zahl) { return Math.round(zahl * 100) / 100; }

  /* Weiche Kurve durch alle Punkte (Catmull-Rom als Bezier geschrieben). */
  function kurvenPfad(punkte) {
    if (!punkte.length) return "";
    if (punkte.length === 1) return "M " + rund(punkte[0][0]) + " " + rund(punkte[0][1]);

    function halt(y) { return rund(Math.max(0, Math.min(100, y))); }

    var d = "M " + rund(punkte[0][0]) + " " + rund(punkte[0][1]);
    for (var i = 0; i < punkte.length - 1; i++) {
      var p0 = punkte[i - 1] || punkte[i];
      var p1 = punkte[i];
      var p2 = punkte[i + 1];
      var p3 = punkte[i + 2] || p2;
      d += " C " + rund(p1[0] + (p2[0] - p0[0]) / 6) + " " + halt(p1[1] + (p2[1] - p0[1]) / 6) +
           ", " + rund(p2[0] - (p3[0] - p1[0]) / 6) + " " + halt(p2[1] - (p3[1] - p1[1]) / 6) +
           ", " + rund(p2[0]) + " " + rund(p2[1]);
    }
    return d;
  }

  function bZeichneVerteilung() {
    var e = bEinstellung();
    var theorie = bVerteilung(e.anzahl, e.seiten);
    var stand = bStand(e.anzahl, e.seiten, false);
    var min = e.anzahl, max = e.anzahl * e.seiten;
    var spalten = max - min + 1;
    var hoechster = 0, s, ist;

    for (s = min; s <= max; s++) {
      ist = stand.wuerfe ? (stand.zahlen[s] || 0) / stand.wuerfe : 0;
      hoechster = Math.max(hoechster, theorie[s], ist);
    }

    /* Bei vielen Summen nur jede fuenfte beschriften, sonst klebt alles aneinander. */
    var schritt = spalten > 24 ? 5 : 1;
    var punkte = [];
    var html = "";

    for (s = min; s <= max; s++) {
      var spalte = s - min;
      var t = theorie[s];
      ist = stand.wuerfe ? (stand.zahlen[s] || 0) / stand.wuerfe : 0;
      punkte.push([spalte + 0.5, 100 - (t / hoechster) * 100]);

      var titel = "Summe " + s + ": theoretisch " + prozent(t) +
        (stand.wuerfe ? ", gewürfelt " + prozent(ist) + " (" + (stand.zahlen[s] || 0) + " mal)" : "");
      var beschriftung = (spalte % schritt === 0 || s === max) ? s : "";
      html += '<div class="saeule" title="' + titel + '">' +
        '<div class="balken">' +
        (ist > 0 ? '<span class="ist" style="height:' + (ist / hoechster * 100).toFixed(1) + '%"></span>' : "") +
        "</div>" +
        '<span class="zahl">' + beschriftung + "</span></div>";
    }

    var kurve = kurvenPfad(punkte);
    var boden = " L " + rund(spalten - 0.5) + " 100 L 0.5 100 Z";

    el("#bChart").innerHTML =
      '<div class="plot">' +
      '<svg class="kurve" viewBox="0 0 ' + spalten + ' 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="flaeche" d="' + kurve + boden + '"/>' +
      '<path class="linie" d="' + kurve + '" vector-effect="non-scaling-stroke"/>' +
      "</svg>" +
      '<div class="saeulen">' + html + "</div>" +
      "</div>";

    var erwartung = e.anzahl * (e.seiten + 1) / 2;
    var aufbau = e.anzahl + " × W" + e.seiten;
    el("#bStats").textContent = stand.wuerfe
      ? stand.wuerfe + (stand.wuerfe === 1 ? " Wurf" : " Würfe") + " mit " + aufbau +
        " · Schnitt " + komma(stand.summe / stand.wuerfe) +
        ", theoretisch wären es " + komma(erwartung)
      : "Noch keine Würfe mit " + aufbau + ". Die blassen Balken zeigen, was zu erwarten wäre.";
  }

  el("#bRoll").addEventListener("click", function () {
    var e = bEinstellung();
    var werte = [];
    for (var i = 0; i < e.anzahl; i++) werte.push(wurf(e.seiten));
    bDice.innerHTML = werte.map(function (w) { return wuerfelHtml(w, e.seiten); }).join("");
    animiere(bDice);

    var s = summe(werte);
    el("#bSum").textContent = werte.length > 1
      ? "Einzeln: " + werte.join(", ") + " – Summe: " + s
      : "Ergebnis: " + s;

    var stand = bStand(e.anzahl, e.seiten, true);
    stand.wuerfe++;
    stand.summe += s;
    stand.zahlen[s] = (stand.zahlen[s] || 0) + 1;

    bZeichneVerteilung();
  });

  el("#bCount").addEventListener("change", bZeichneVerteilung);
  el("#bSides").addEventListener("change", bZeichneVerteilung);
  el("#bReset").addEventListener("click", function () {
    bZaehler = {};
    bZeichneVerteilung();
  });

  bZeichneVerteilung();
})();
