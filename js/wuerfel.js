/* Wuerfelspiele: Kniffel, Maexchen, Bank und ein freier Wuerfelbecher.
   Alles laeuft im Browser, nichts wird gespeichert. */
(function () {
  "use strict";

  var tabRow = document.querySelector(".game-tabs");
  if (!tabRow) return;

  var i18n = window.i18n;
  var t = i18n.t;

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
      '<button type="button" class="drop icon-btn" aria-label="' + t("Spieler entfernen", "Remove player") + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    liste.appendChild(row);
  }

  function namenFrischen(liste, minimum) {
    var rows = els(".name-row", liste);
    rows.forEach(function (row, i) {
      el("input", row).placeholder = t("Spieler ", "Player ") + (i + 1);
      el(".drop", row).setAttribute("aria-label", t("Spieler entfernen", "Remove player"));
      el(".drop", row).hidden = rows.length <= minimum;
    });
  }

  function namenLesen(liste) {
    return els(".name-row input", liste).map(function (inp, i) {
      return inp.value.trim().slice(0, 14) || t("Spieler ", "Player ") + (i + 1);
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
    { id: "o1", name: "Einer", en: "Ones", oben: true, punkte: function (w) { return augenwert(w, 1); } },
    { id: "o2", name: "Zweier", en: "Twos", oben: true, punkte: function (w) { return augenwert(w, 2); } },
    { id: "o3", name: "Dreier", en: "Threes", oben: true, punkte: function (w) { return augenwert(w, 3); } },
    { id: "o4", name: "Vierer", en: "Fours", oben: true, punkte: function (w) { return augenwert(w, 4); } },
    { id: "o5", name: "Fünfer", en: "Fives", oben: true, punkte: function (w) { return augenwert(w, 5); } },
    { id: "o6", name: "Sechser", en: "Sixes", oben: true, punkte: function (w) { return augenwert(w, 6); } },
    { id: "u1", name: "Dreierpasch", en: "Three of a kind", punkte: function (w) { return gleiche(w) >= 3 ? summe(w) : 0; } },
    { id: "u2", name: "Viererpasch", en: "Four of a kind", punkte: function (w) { return gleiche(w) >= 4 ? summe(w) : 0; } },
    {
      id: "u3", name: "Full House", punkte: function (w) {
        var h = haeufig(w).slice(1);
        return h.indexOf(3) >= 0 && h.indexOf(2) >= 0 ? 25 : 0;
      }
    },
    { id: "u4", name: "Kleine Straße", en: "Small straight", punkte: function (w) { return strasse(w, 4) ? 30 : 0; } },
    { id: "u5", name: "Große Straße", en: "Large straight", punkte: function (w) { return strasse(w, 5) ? 40 : 0; } },
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
    var html = '<thead><tr><th scope="col">' + t("Feld", "Box") + "</th>";
    kSpieler.forEach(function (s, i) {
      html += '<th scope="col" data-col="' + i + '">' + esc(s.name) + "</th>";
    });
    html += "</tr></thead><tbody>";

    FELDER.forEach(function (f) {
      html += '<tr><th scope="row">' + t(f.name, f.en) + "</th>";
      kSpieler.forEach(function (s, i) {
        html += '<td data-col="' + i + '"><button type="button" class="score-cell" data-feld="' +
          f.id + '" data-col="' + i + '"></button></td>';
      });
      html += "</tr>";
      if (f.id === "o6") {
        html += kSummenZeile(t("Summe oben", "Upper total"), "oben") +
          kSummenZeile(t("Bonus ab 63", "Bonus from 63"), "bonus");
      }
    });

    html += kSummenZeile(t("Summe unten", "Lower total"), "unten") +
      kSummenZeile(t("Kniffel-Bonus", "Kniffel bonus"), "kbonus");
    html += "</tbody><tfoot>" + kSummenZeile(t("Gesamt", "Total"), "gesamt", true) + "</tfoot>";
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
    el("#kWho").textContent = sp ? sp.name + t(" ist dran", "’s turn") : "–";
    el("#kRound").textContent = String(kRunde());
    el("#kRolls").textContent = kUebrig === 1
      ? t("1 Wurf übrig", "1 roll left")
      : kUebrig + t(" Würfe übrig", " rolls left");

    var roll = el("#kRoll");
    roll.disabled = !kLaeuft || kUebrig === 0;
    roll.textContent = kUebrig === 3 ? t("Würfeln", "Roll") : t("Nochmal würfeln", "Roll again");

    el("#kHint").textContent = !kLaeuft
      ? t("Die Partie ist vorbei.", "The game is over.")
      : !kGeworfen
        ? t("Erst würfeln.", "Roll first.")
        : kUebrig > 0
          ? t("Würfel antippen, die liegen bleiben sollen – oder gleich ein Feld eintragen.",
              "Tap the dice you want to keep – or fill in a box right away.")
          : t("Keine Würfe mehr: jetzt ein Feld eintragen.", "No rolls left: fill in a box now.");

    kZeichneWuerfel();
    kZeichneTabelle();
  }

  function kZeichneWuerfel() {
    kDice.innerHTML = kWuerfel.map(function (wert, i) {
      var aus = !kLaeuft || !kGeworfen || kUebrig === 0;
      var label = t("Würfel ", "Die ") + (i + 1) +
        (wert ? ", " + wert + t(" Augen", " pips") : t(", noch nicht geworfen", ", not rolled yet")) +
        (kFest[i] ? t(", liegt", ", kept") : "");
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
    kErgebnis();
    kResult.hidden = false;
    kZeichne();
    kResult.scrollIntoView({ block: "nearest" });
  }

  function kErgebnis() {
    var liste = kSpieler.map(function (sp) {
      return { name: sp.name, punkte: kSummen(sp).gesamt };
    }).sort(function (a, b) { return b.punkte - a.punkte; });

    var html = '<p class="eyebrow">' + t("Feierabend", "Game over") + "</p><h3>" +
      (liste.length > 1
        ? esc(liste[0].name) + t(" gewinnt mit ", " wins with ") + liste[0].punkte + t(" Punkten", " points")
        : esc(liste[0].name) + t(" kommt auf ", " scores ") + liste[0].punkte + t(" Punkte", " points")) +
      '</h3><ol class="rank-list">';
    liste.forEach(function (r) {
      html += "<li><span>" + esc(r.name) + "</span><strong>" + r.punkte + "</strong></li>";
    });
    html += '</ol><div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn btn-primary" type="button" data-k="neu">' + t("Neues Spiel", "New game") + "</button></div>";

    kResult.innerHTML = html;
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
    if (hoch === tief) return String(hoch) + String(tief) + t(" (Pasch)", " (doubles)");
    return String(hoch) + String(tief);
  }

  var M_LISTE = (function () {
    var liste = [], hoch, tief;
    for (hoch = 3; hoch <= 6; hoch++) {
      for (tief = 1; tief < hoch; tief++) liste.push([hoch, tief]);
    }
    for (hoch = 1; hoch <= 6; hoch++) liste.push([hoch, hoch]);
    liste.push([2, 1]);
    /* Das Label wird erst beim Zeichnen gebildet, damit es der Sprache folgt. */
    return liste.map(function (p) {
      return { a: p[0], b: p[1], wert: mWert(p[0], p[1]) };
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
      html = '<p class="eyebrow">' + t("Weitergeben", "Pass it on") + "</p><h3>" +
        esc(sp.name) + t(" ist dran", "’s turn") + "</h3>" +
        '<p class="hint">' + t("Gerät an " + esc(sp.name) + " geben, damit niemand mitguckt.",
                               "Hand the device to " + esc(sp.name) + " so nobody else can peek.") +
        (mAnsage ? t(" Die Ansage steht bei ", " The current call is ") + mLabel(mAnsage.a, mAnsage.b) + "." : "") +
        "</p>" +
        mKnopf("uebernehmen", t("Ich bin ", "I am ") + sp.name, true);

    } else if (mPhase === "entscheiden") {
      var vor = mSpieler[mAnsage.von];
      var maex = mAnsage.wert === 1000;
      var ansage = mLabel(mAnsage.a, mAnsage.b);
      html = '<p class="eyebrow">' + t("Ansage von ", "Called by ") + esc(vor.name) + "</p><h3>" + ansage + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml("zu") + wuerfelHtml("zu") + "</div>" +
        '<p class="hint">' + (maex
          ? t("Ein angesagtes Mäxchen musst du aufdecken. Stimmt es, kostet dich das zwei Leben.",
              "You have to call the bluff on an announced Mäxchen. If it's true, it costs you two lives.")
          : t("Glaubst du das? Wenn du weiterwürfelst, musst du höher ansagen als " + ansage + ".",
              "Do you believe it? If you roll on, you have to call higher than " + ansage + ".")) + "</p>" +
        '<div class="btn-row" style="justify-content:flex-start">' +
        '<button class="btn btn-primary" type="button" data-m="aufdecken">' + t("Aufdecken", "Call the bluff") + "</button>" +
        (maex ? "" : '<button class="btn btn-quiet" type="button" data-m="glauben">' +
          t("Glauben und würfeln", "Believe it and roll") + "</button>") +
        "</div>";

    } else if (mPhase === "werfen") {
      html = '<p class="eyebrow">' + esc(sp.name) + "</p><h3>" + t("Würfeln", "Roll") + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml("zu") + wuerfelHtml("zu") + "</div>" +
        '<p class="hint">' + t("Nur du siehst das Ergebnis.", "Only you can see the result.") + "</p>" +
        mKnopf("wuerfeln", t("Becher schütteln", "Shake the cup"), true);

    } else if (mPhase === "ansagen") {
      var frei = M_LISTE.filter(function (a) {
        return !mAnsage || a.wert > mAnsage.wert;
      });
      var wahrheit = frei.some(function (a) { return a.wert === mWurf.wert; });
      html = '<p class="eyebrow">' + esc(sp.name) + "</p><h3>" + t("Du hast ", "You rolled ") +
        mLabel(mWurf.a, mWurf.b) + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml(mWurf.a, 6) + wuerfelHtml(mWurf.b, 6) + "</div>" +
        '<p class="hint">' + (wahrheit
          ? t("Du kannst die Wahrheit sagen oder höher gehen.", "You can tell the truth or go higher.")
          : t("Dein Wurf liegt nicht über " + mLabel(mAnsage.a, mAnsage.b) + " – du musst bluffen.",
              "Your roll isn't higher than " + mLabel(mAnsage.a, mAnsage.b) + " – you have to bluff.")) + "</p>" +
        '<label class="pick"><span>' + t("Ich sage an", "I call") + '</span><select id="mPick">' +
        frei.map(function (a) {
          return '<option value="' + a.wert + '"' +
            (a.wert === mWurf.wert ? " selected" : "") + ">" + mLabel(a.a, a.b) +
            (a.wert === mWurf.wert ? t(" – dein Wurf", " – your roll") : "") + "</option>";
        }).join("") + "</select></label>" +
        mKnopf("ansagen", t("Ansagen und weitergeben", "Call and pass on"), true);

    } else if (mPhase === "aufgedeckt") {
      var aufgedeckt = mAufgedecktText();
      html = '<p class="eyebrow">' + t("Aufgedeckt", "Revealed") + "</p><h3>" + aufgedeckt.titel + "</h3>" +
        '<div class="dice-row">' + wuerfelHtml(mWurf.a, 6) + wuerfelHtml(mWurf.b, 6) + "</div>" +
        "<p>" + aufgedeckt.text + "</p>" +
        mKnopf("weiter", t("Weiter", "Continue"), true);

    } else if (mPhase === "sieg") {
      html = '<p class="eyebrow">' + t("Vorbei", "Game over") + "</p><h3>" +
        esc(mLebend()[0].name) + t(" gewinnt", " wins") + "</h3>" +
        '<p class="hint">' + t("Alle anderen haben ihre Leben verspielt.", "Everyone else has lost all their lives.") + "</p>" +
        mKnopf("neu", t("Neues Spiel", "New game"), true);
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
        '</span><span class="pips" aria-label="' + s.leben +
        (s.leben === 1 ? t(" Leben", " life") : t(" Leben", " lives")) + '">' + pips + "</span></li>";
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
      mWurf = { a: a, b: b, wert: mWert(a, b) };
      mPhase = "ansagen";
      mZeichne();
      animiere(el(".dice-row", mStage));
      return;

    } else if (aktion === "ansagen") {
      var pick = el("#mPick");
      var gewaehlt = M_LISTE.filter(function (x) { return x.wert === +pick.value; })[0];
      mAnsage = { a: gewaehlt.a, b: gewaehlt.b, wert: gewaehlt.wert, von: mAktiv };
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
    var stimmt = mWurf.wert >= mAnsage.wert;
    var maex = mAnsage.wert === 1000;
    var verlierer = stimmt ? mAktiv : mAnsage.von;
    var abzug = stimmt && maex ? 2 : 1;

    mSpieler[verlierer].leben = Math.max(0, mSpieler[verlierer].leben - abzug);
    mErgebnis = {
      verlierer: verlierer, abzug: abzug, stimmt: stimmt,
      ansager: mAnsage.von, aufdecker: mAktiv, raus: mSpieler[verlierer].leben === 0
    };
    mPhase = "aufgedeckt";
  }

  /* Ergebnis des Aufdeckens als Text, erst beim Zeichnen gebildet (Sprache). */
  function mAufgedecktText() {
    var e = mErgebnis;
    var ansager = esc(mSpieler[e.ansager].name), aufdecker = esc(mSpieler[e.aufdecker].name);
    var ansage = mLabel(mAnsage.a, mAnsage.b), wurfText = mLabel(mWurf.a, mWurf.b);
    var titel, text;

    if (e.stimmt) {
      titel = aufdecker + (e.abzug === 2
        ? t(" verliert zwei Leben", " loses two lives")
        : t(" verliert ein Leben", " loses a life"));
      text = t(ansager + " hat " + ansage + " angesagt und tatsächlich " + wurfText + " gewürfelt.",
               ansager + " called " + ansage + " and really rolled " + wurfText + ".");
    } else {
      titel = ansager + t(" verliert ein Leben", " loses a life");
      text = t(ansager + " hat " + ansage + " angesagt, im Becher lagen aber nur " + wurfText + ".",
               ansager + " called " + ansage + ", but the cup only held " + wurfText + ".");
    }
    if (e.raus) {
      text += " " + esc(mSpieler[e.verlierer].name) + t(" ist damit raus.", " is out.");
    }
    return { titel: titel, text: text };
  }

  /* =====================================================
     Bank
     ===================================================== */

  var G_SICHER = 3;           /* so viele Wuerfe pro Runde, bei denen die Sieben 70 bringt */

  var gSpieler = [], gRunde = 1, gRundenMax = 15, gTopf = 0, gWuerfe = 0,
      gAktiv = 0, gStarter = 0, gWuerfel = [null, null], gLaeuft = false,
      gMeldung = null,
      gEigene = false,        /* mit echten Wuerfeln: die Summe wird angetippt */
      gZurueckListe = [],     /* Staende vor jedem Wurf und jedem Einzahlen */
      gVorListe = [],         /* zurueckgenommene Staende, fuer den Vorwaerts-Pfeil */
      gHoch = 0;              /* hoechster Bankstand der ganzen Partie */

  var gNames = el("#gNames"), gSetup = el("#gSetup"), gBoard = el("#gBoard"),
      gDice = el("#gDice"), gList = el("#gList"), gResult = el("#gResult"),
      gEingabe = el("#gEingabe");

  namenAufsetzen(gNames, 2, 2);
  el("#gAdd").addEventListener("click", function () { namenDazu(gNames, 2); });
  el("#gStart").addEventListener("click", gStart);
  el("#gQuit").addEventListener("click", gZurueck);
  el("#gRoll").addEventListener("click", gKnopf);
  el("#gBack").addEventListener("click", gRueckgaengig);
  el("#gFwd").addEventListener("click", gVorwaerts);

  function gStart() {
    gRundenMax = parseInt(el("#gRounds").value, 10) || 15;
    gEigene = el("#gMode").value === "eigene";
    gZurueckListe = [];
    gVorListe = [];
    gSpieler = namenLesen(gNames).map(function (name) {
      return {
        name: name, punkte: 0, drin: false, zuletzt: 0,
        /* Statistik fuer den Schluss */
        wuerfe: 0, pasch: 0, sieben: 0, killer: 0, best: 0, leer: 0
      };
    });
    gHoch = 0;
    gRunde = 1;
    gStarter = 0;
    gLaeuft = true;
    gResult.hidden = true;
    gResult.innerHTML = "";
    gSetup.hidden = true;
    gBoard.hidden = false;
    gNeueRunde();
    gZeichne();
  }

  function gZurueck() {
    gLaeuft = false;
    gBoard.hidden = true;
    gResult.hidden = true;
    gSetup.hidden = false;
  }

  function gNeueRunde() {
    gTopf = 0;
    gWuerfe = 0;
    gWuerfel = [null, null];
    gSpieler.forEach(function (s) { s.drin = false; s.zuletzt = 0; });
    gAktiv = gStarter;
    gMeldung = { art: "start" };
  }

  /* Naechster Spieler, der in dieser Runde noch nicht eingezahlt hat. */
  function gNaechster(von) {
    var i = von;
    for (var n = 0; n < gSpieler.length; n++) {
      i = (i + 1) % gSpieler.length;
      if (!gSpieler[i].drin) return i;
    }
    return von;
  }

  /* Runde vorbei (Sieben oder alle drin): ohne Zwischenschritt weiter mit
     der naechsten, nach der letzten gleich zum Ergebnis. Was passiert ist,
     steht danach als Hinweis ueber der neuen Runde. */
  function gRundeZu(art) {
    var leer = gSpieler.filter(function (s) { return !s.drin; });
    leer.forEach(function (s) { s.leer++; });
    var namen = leer.map(function (s) { return s.name; });
    if (gRunde >= gRundenMax) {
      gEnde();
      return;
    }
    gRunde++;
    gStarter = (gStarter + 1) % gSpieler.length;
    gNeueRunde();
    gMeldung = { art: art, leer: namen };
  }

  function gKnopf() {
    if (!gLaeuft || gEigene) return;
    var a = wurf(6), b = wurf(6);
    gWurf(a + b, a === b, [a, b]);
  }

  /* Der ganze Spielstand als Kopie; die Spieler werden einzeln kopiert. */
  function gStand() {
    return {
      topf: gTopf, wuerfe: gWuerfe, aktiv: gAktiv, wuerfel: gWuerfel.slice(),
      runde: gRunde, starter: gStarter, hoch: gHoch, meldung: gMeldung,
      spieler: gSpieler.map(function (s) {
        var kopie = {};
        Object.keys(s).forEach(function (k) { kopie[k] = s[k]; });
        return kopie;
      })
    };
  }

  function gSetzen(v) {
    gTopf = v.topf;
    gWuerfe = v.wuerfe;
    gAktiv = v.aktiv;
    gWuerfel = v.wuerfel;
    gRunde = v.runde;
    gStarter = v.starter;
    gHoch = v.hoch;
    gMeldung = v.meldung;
    gSpieler = v.spieler;
  }

  /* Vor jeder Aktion merken; eine neue Aktion macht das Vorwaerts ungueltig. */
  function gMerken() {
    gZurueckListe.push(gStand());
    gVorListe = [];
  }

  function gRueckgaengig() {
    if (!gLaeuft || !gZurueckListe.length) return;
    gVorListe.push(gStand());
    gSetzen(gZurueckListe.pop());
    gZeichne();
  }

  function gVorwaerts() {
    if (!gLaeuft || !gVorListe.length) return;
    gZurueckListe.push(gStand());
    gSetzen(gVorListe.pop());
    gZeichne();
  }

  gEingabe.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-summe]");
    if (!btn || btn.disabled) return;
    var wert = btn.dataset.summe;
    if (wert === "pasch") gWurf(0, true);
    else gWurf(+wert, false);
  });

  /* Ein Wurf, digital oder eingetippt: Summe und ob es ein Pasch war. */
  function gWurf(s, pasch, wuerfel) {
    gMerken();
    if (wuerfel) gWuerfel = wuerfel;
    gWuerfe++;

    var werfer = gSpieler[gAktiv];
    werfer.wuerfe++;
    if (s === 7) werfer.sieben++;

    if (gWuerfe <= G_SICHER) {
      gTopf += s === 7 ? 70 : s;
      gMeldung = { art: s === 7 ? "siebzig" : "plus", wert: s === 7 ? 70 : s };
    } else if (s === 7) {
      werfer.killer++;
      gRundeZu("sieben");
      gZeichne();
      return;
    } else if (pasch) {
      /* Gezaehlt werden nur Paesche, die die Bank verdoppeln - so
         stimmt die Statistik auch, wenn Summen eingetippt werden. */
      werfer.pasch++;
      gTopf *= 2;
      gMeldung = { art: "pasch" };
    } else {
      gTopf += s;
      gMeldung = { art: "plus", wert: s };
    }
    gHoch = Math.max(gHoch, gTopf);

    gAktiv = gNaechster(gAktiv);
    gZeichne();
    animiere(gDice);
  }

  function gBank(i) {
    var sp = gSpieler[i];
    if (!gLaeuft || sp.drin || gTopf <= 0) return;
    gMerken();
    sp.punkte += gTopf;
    sp.zuletzt = gTopf;
    sp.best = Math.max(sp.best, gTopf);
    sp.drin = true;

    if (gSpieler.every(function (s) { return s.drin; })) {
      gRundeZu("alle");
    } else {
      gMeldung = { art: "bank", name: sp.name, wert: gTopf };
      if (i === gAktiv) gAktiv = gNaechster(gAktiv);
    }
    gZeichne();
  }

  gList.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-bank]");
    if (btn && !btn.disabled) gBank(+btn.dataset.bank);
  });

  function gHinweis() {
    var m = gMeldung || {};
    if (m.art === "start") {
      return t("Die ersten drei Würfe sind sicher – eine Sieben bringt 70 Punkte.",
               "The first three rolls are safe – a seven is worth 70 points.");
    }
    if (m.art === "siebzig") return t("Sieben! 70 Punkte in die Bank.", "Seven! 70 points into the bank.");
    if (m.art === "plus") return "+" + m.wert + t(" für die Bank.", " for the bank.");
    if (m.art === "pasch") return t("Pasch! Die Bank verdoppelt sich.", "Doubles! The bank doubles.");
    if (m.art === "bank") {
      return m.name + t(" kassiert ", " banks ") + m.wert + t(" Punkte.", " points.");
    }
    if (m.art === "sieben") {
      return t("Sieben – die Bank war weg. ", "Seven – the bank was lost. ") +
        (m.leer.length
          ? t("Leer ausgegangen: ", "Left empty-handed: ") + m.leer.join(", ") + ". "
          : "") +
        t("Neue Runde.", "New round.");
    }
    if (m.art === "alle") {
      return t("Alle hatten eingezahlt. Neue Runde.", "Everyone had banked. New round.");
    }
    return "";
  }

  function gZeichne() {
    var sp = gSpieler[gAktiv];
    el("#gRound").textContent = String(gRunde);
    el("#gRoundMax").textContent = String(gRundenMax);
    el("#gWho").textContent = sp.name + t(" würfelt", " rolls");

    var gefaehrlich = gWuerfe >= G_SICHER;
    var rolls = el("#gRolls");
    rolls.classList.toggle("gefahr", gefaehrlich);
    rolls.textContent = gefaehrlich
      ? t("Sieben beendet die Runde", "A seven ends the round")
      : (G_SICHER - gWuerfe) + (G_SICHER - gWuerfe === 1
        ? t(" sicherer Wurf übrig", " safe roll left")
        : t(" sichere Würfe übrig", " safe rolls left"));

    el("#gPot").textContent = String(gTopf);
    el("#gHint").textContent = gHinweis();

    var roll = el("#gRoll");
    roll.disabled = !gLaeuft;
    roll.hidden = gEigene;

    el("#gBack").disabled = !gLaeuft || !gZurueckListe.length;
    el("#gFwd").disabled = !gLaeuft || !gVorListe.length;

    /* Mit eigenen Wuerfeln liegen die Wuerfel auf dem Tisch, nicht auf dem Bildschirm. */
    gDice.hidden = gEigene;
    gDice.innerHTML = wuerfelHtml(gWuerfel[0], 6) + wuerfelHtml(gWuerfel[1], 6);
    gZeichneEingabe();

    gList.innerHTML = gSpieler.map(function (s, i) {
      var klasse = s.drin ? "drin" : (i === gAktiv ? "now" : "");
      var aus = !gLaeuft || s.drin || gTopf <= 0;
      return '<li class="' + klasse + '">' +
        '<span class="wer">' + esc(s.name) +
        (s.drin ? '<small>+' + s.zuletzt + "</small>" : "") + "</span>" +
        "<strong>" + s.punkte + "</strong>" +
        '<button class="btn ' + (aus ? "btn-quiet" : "btn-primary") + '" type="button" data-bank="' + i + '"' +
        (aus ? " disabled" : "") + ">" + (s.drin ? t("Drin", "Banked") : "Bank") + "</button></li>";
    }).join("");
  }

  /* Summen 2 bis 12 und ein Pasch-Knopf. Ab dem vierten Wurf beendet die
     Sieben die Runde (rot), und 2 und 12 gehen nur noch als Pasch. */
  function gZeichneEingabe() {
    gEingabe.hidden = !gEigene || !gLaeuft;
    if (gEingabe.hidden) return;
    var gefaehrlich = gWuerfe >= G_SICHER, html = "";
    for (var s = 2; s <= 12; s++) {
      var aus = gefaehrlich && (s === 2 || s === 12);
      html += '<button type="button" class="summe' + (gefaehrlich && s === 7 ? " gefahr" : "") +
        '" data-summe="' + s + '"' + (aus ? " disabled" : "") + ">" + s + "</button>";
    }
    html += '<button type="button" class="summe pasch" data-summe="pasch"' +
      (gefaehrlich ? "" : ' disabled title="' + t("In den ersten drei Würfen zählt ein Pasch seine Augen.",
        "In the first three rolls doubles just count their pips.") + '"') + ">" +
      t("Pasch", "Doubles") + "</button>";
    el("#gSummen").innerHTML = html;
  }

  function gEnde() {
    gLaeuft = false;
    gErgebnis();
    gResult.hidden = false;
    gBoard.hidden = true;
    gResult.scrollIntoView({ block: "nearest" });
  }

  /* Wer hat bei einem Wert vorn? Bei Gleichstand alle, bei null niemand. */
  function gSpitze(feld) {
    var max = Math.max.apply(null, gSpieler.map(function (s) { return s[feld]; }));
    if (max <= 0) return null;
    return {
      wert: max,
      namen: gSpieler.filter(function (s) { return s[feld] === max; })
        .map(function (s) { return esc(s.name); }).join(", ")
    };
  }

  function gStatistik(liste) {
    var kacheln = [
      { feld: "pasch", titel: t("Meiste Päsche", "Most doubles"), zusatz: t("mal die Bank per Pasch verdoppelt", "times doubled the bank") },
      { feld: "sieben", titel: t("Meiste Siebenen", "Most sevens"), zusatz: t("Siebenen gewürfelt", "sevens rolled") },
      { feld: "killer", titel: t("Bank gesprengt", "Busted the bank"), zusatz: t("mal die Runde mit einer Sieben beendet", "rounds ended with a seven") },
      { feld: "best", titel: t("Größter Coup", "Biggest haul"), zusatz: t("Punkte auf einmal eingezahlt", "points banked at once") },
      { feld: "leer", titel: t("Pechvogel", "Unluckiest"), zusatz: t("mal leer ausgegangen", "times left empty-handed") }
    ];

    var html = '<h4 class="stat-titel">' + t("Statistik", "Stats") + '</h4><div class="stat-grid">';
    kacheln.forEach(function (k) {
      var top = gSpitze(k.feld);
      html += '<div class="stat-kachel"><span class="bank-label">' + k.titel + "</span>" +
        (top
          ? "<strong>" + top.namen + "</strong><span>" + top.wert + (k.zusatz ? " " + k.zusatz : "") + "</span>"
          : "<strong>–</strong><span>" + t("niemand", "nobody") + "</span>") +
        "</div>";
    });
    html += '<div class="stat-kachel"><span class="bank-label">' + t("Höchste Bank", "Highest bank") +
      "</span><strong>" + gHoch + "</strong><span>" + t("Punkte im Topf", "points in the pot") + "</span></div></div>";

    html += '<div class="sheet-wrap"><table class="sheet stat-tabelle"><thead><tr><th scope="col">' +
      t("Spieler", "Player") + '</th><th scope="col">' + t("Würfe", "Rolls") +
      '</th><th scope="col">' + t("Päsche", "Doubles") + '</th><th scope="col">' + t("Siebenen", "Sevens") +
      '</th><th scope="col">' + t("Bester Coup", "Best haul") + '</th><th scope="col">' + t("Leer aus", "Empty-handed") +
      "</th></tr></thead><tbody>";
    liste.forEach(function (s) {
      html += '<tr><th scope="row">' + esc(s.name) + "</th><td>" + s.wuerfe + "</td><td>" + s.pasch +
        "</td><td>" + s.sieben + "</td><td>" + s.best + "</td><td>" + s.leer + "</td></tr>";
    });
    return html + "</tbody></table></div>";
  }

  function gErgebnis() {
    var liste = gSpieler.slice().sort(function (a, b) { return b.punkte - a.punkte; });
    var gleichstand = liste.length > 1 && liste[0].punkte === liste[1].punkte;
    var html = '<p class="eyebrow">' + t("Feierabend", "Game over") + "</p><h3>" +
      (gleichstand
        ? t("Gleichstand mit ", "A tie at ") + liste[0].punkte + t(" Punkten", " points")
        : esc(liste[0].name) + t(" gewinnt mit ", " wins with ") + liste[0].punkte + t(" Punkten", " points")) +
      '</h3><ol class="rank-list">';
    liste.forEach(function (r) {
      html += "<li><span>" + esc(r.name) + "</span><strong>" + r.punkte + "</strong></li>";
    });
    html += "</ol>" + gStatistik(liste) + '<div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn btn-primary" type="button" data-g="neu">' + t("Neues Spiel", "New game") + "</button></div>";
    gResult.innerHTML = html;
  }

  gResult.addEventListener("click", function (ev) {
    if (ev.target.closest('[data-g="neu"]')) gZurueck();
  });

  /* =====================================================
     Wuerfelbecher
     ===================================================== */

  var bDice = el("#bDice");
  var bLetzte = null;         /* zuletzt gewuerfelte Werte, fuer den Text darunter */
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
    var text = zahl.toFixed(stellen == null ? 2 : stellen);
    return i18n.lang() === "en" ? text : text.replace(".", ",");
  }

  function prozent(anteil) { return komma(anteil * 100, 1) + t(" %", "%"); }

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
      ist = stand.wuerfe ? (stand.zahlen[s] || 0) / stand.wuerfe : 0;
      punkte.push([spalte + 0.5, 100 - (theorie[s] / hoechster) * 100]);

      var titel = t("Summe ", "Sum ") + s + t(": theoretisch ", ": theoretical ") + prozent(theorie[s]) +
        (stand.wuerfe
          ? t(", gewürfelt ", ", rolled ") + prozent(ist) + " (" + (stand.zahlen[s] || 0) + t(" mal)", "×)")
          : "");
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
    var aufbau = e.anzahl + t(" × W", " × D") + e.seiten;
    el("#bStats").textContent = stand.wuerfe
      ? stand.wuerfe + (stand.wuerfe === 1 ? t(" Wurf", " roll") : t(" Würfe", " rolls")) +
        t(" mit ", " with ") + aufbau +
        t(" · Schnitt ", " · average ") + komma(stand.summe / stand.wuerfe) +
        t(", theoretisch wären es ", ", in theory it would be ") + komma(erwartung)
      : t("Noch keine Würfe mit " + aufbau + ". Die blassen Balken zeigen, was zu erwarten wäre.",
          "No rolls with " + aufbau + " yet. The pale bars show what to expect.");
  }

  function bZeichneSumme() {
    if (!bLetzte) {
      el("#bSum").textContent = t("Noch nichts gewürfelt.", "Nothing rolled yet.");
      return;
    }
    var s = summe(bLetzte);
    el("#bSum").textContent = bLetzte.length > 1
      ? t("Einzeln: ", "Individually: ") + bLetzte.join(", ") + t(" – Summe: ", " – sum: ") + s
      : t("Ergebnis: ", "Result: ") + s;
  }

  el("#bRoll").addEventListener("click", function () {
    var e = bEinstellung();
    var werte = [];
    for (var i = 0; i < e.anzahl; i++) werte.push(wurf(e.seiten));
    bDice.innerHTML = werte.map(function (w) { return wuerfelHtml(w, e.seiten); }).join("");
    animiere(bDice);

    var s = summe(werte);
    bLetzte = werte;
    bZeichneSumme();

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
  bZeichneSumme();

  /* ---------- Sprache gewechselt: alles, was das Skript geschrieben hat, neu zeichnen ---------- */

  document.addEventListener("langchange", function () {
    namenFrischen(kNames, 1);
    namenFrischen(mNames, 2);
    if (kSpieler.length && !kBoard.hidden) {
      kTabelle();
      kZeichne();
      if (!kResult.hidden) kErgebnis();
    }
    if (mPhase !== "aus") mZeichne();
    namenFrischen(gNames, 2);
    if (gSpieler.length && !gBoard.hidden) gZeichne();
    if (!gResult.hidden) gErgebnis();
    bZeichneSumme();
    bZeichneVerteilung();
  });
})();
