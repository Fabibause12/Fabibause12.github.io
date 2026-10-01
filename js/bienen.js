/* =========================================================
   Bienen-Seite
   Liest Bienen/bienen.json (wird aus den Ordnern erzeugt) und baut
   daraus Volk, Bildergalerie und das Tagebuch der Durchsichten.
   ========================================================= */
(function () {
  "use strict";

  var MANIFEST = "Bienen/bienen.json";
  var PLACEHOLDER = "assets/keinbild.svg";
  var LOG_ANFANG = 8;

  var ICON = {
    left:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
  };

  var app = document.getElementById("bienenApp");
  var intro = document.getElementById("bienenIntro");
  var lightbox = document.getElementById("lightbox");
  var voelker = [];
  var view = { slug: null, index: 0 };
  var logOffen = false;
  var i18n = window.i18n;
  var t = i18n.t;

  /* ---------- kleine Helfer ---------- */

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    opts = opts || {};
    Object.keys(opts).forEach(function (key) {
      if (key === "class") node.className = opts[key];
      else if (key === "text") node.textContent = opts[key];
      else if (key === "html") node.innerHTML = opts[key];
      else if (key === "dataset") Object.assign(node.dataset, opts[key]);
      else if (key in node && key !== "list") node[key] = opts[key];
      else node.setAttribute(key, opts[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function bySlug(slug) {
    for (var i = 0; i < voelker.length; i++) {
      if (voelker[i].slug === slug) return voelker[i];
    }
    return null;
  }

  /* Feld in der eingestellten Sprache; fehlt die englische Fassung, bleibt es deutsch. */
  function loc(volk, key) {
    var en = i18n.lang() === "en" && volk.en;
    if (key === "meta") {
      return en && volk.en.meta && Object.keys(volk.en.meta).length ? volk.en.meta : (volk.meta || {});
    }
    return en && volk.en[key] ? volk.en[key] : volk[key];
  }

  function cover(volk) {
    return volk.images && volk.images.length ? volk.images[0] : PLACEHOLDER;
  }

  function teaser(volk) {
    var text = (loc(volk, "text") || "").replace(/\s+/g, " ").trim();
    return text.length > 190 ? text.slice(0, 190).replace(/\S+$/, "") + "…" : text;
  }

  function paragraphs(text) {
    return (text || "")
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);
  }

  /* ---------- Uebersicht (ab zwei Voelkern) ---------- */

  function card(volk) {
    var thumb = el("div", { class: "thumb" }, [
      el("img", { src: cover(volk), alt: loc(volk, "title"), loading: "lazy", decoding: "async" })
    ]);
    if (volk.imageCount > 1) {
      thumb.appendChild(el("span", {
        class: "badge",
        html: ICON.photo + " " + volk.imageCount
      }));
    }

    var body = [el("h3", { text: loc(volk, "title") })];
    var sub = loc(volk, "subtitle") || teaser(volk);
    if (sub) body.push(el("p", { class: "teaser", text: sub }));
    if (volk.log && volk.log.length) {
      body.push(el("p", { class: "latin", text: t("Letzte Durchsicht: ", "Last inspection: ") + i18n.datum(volk.log[0].datum) }));
    }

    return el("a", {
      class: "plant-card",
      href: "?v=" + encodeURIComponent(volk.slug),
      dataset: { slug: volk.slug }
    }, [thumb, el("div", { class: "body" }, body)]);
  }

  function renderOverview() {
    if (intro) intro.hidden = false;
    app.innerHTML = "";

    if (!voelker.length) {
      app.appendChild(emptyState());
      return;
    }

    app.appendChild(el("div", { class: "toolbar" }, [
      el("span", {
        class: "count",
        text: voelker.length + (voelker.length === 1 ? t(" Volk", " colony") : t(" Völker", " colonies"))
      })
    ]));

    var grid = el("div", { class: "plant-grid" });
    voelker.forEach(function (v) { grid.appendChild(card(v)); });
    app.appendChild(grid);
  }

  function emptyState() {
    var beispiel =
      "Bienen/\n" +
      "  Maria/\n" +
      "    text.txt\n" +
      "    tagebuch.txt\n" +
      "    1.jpg\n" +
      "    2.jpg";

    return el("div", { class: "empty" }, [
      el("h3", { text: t("Noch kein Volk da", "No colony yet") }),
      el("p", { html: t("Leg im Ordner <code>Bienen/</code> einen Unterordner pro Volk an – mit einer <code>text.txt</code>, optional einer <code>tagebuch.txt</code> und beliebig vielen Bildern:",
                        "Create one subfolder per colony in the <code>Bienen/</code> folder – with a <code>text.txt</code>, optionally a <code>tagebuch.txt</code>, and as many pictures as you like:") }),
      el("pre", { text: beispiel })
    ]);
  }

  /* ---------- Ein Volk ---------- */

  function renderDetail(volk, alleine) {
    var title = loc(volk, "title");
    if (view.slug !== volk.slug) logOffen = false;
    view.slug = volk.slug;
    view.index = 0;
    if (intro) intro.hidden = !alleine;

    app.innerHTML = "";
    document.title = title + t(" – Bienen", " – Bees");

    if (!alleine) {
      var back = el("button", {
        class: "back-link",
        type: "button",
        html: ICON.back + " <span>" + t("Alle Völker", "All colonies") + "</span>"
      });
      back.addEventListener("click", function () { go(null); });
      app.appendChild(back);
    }

    var images = volk.images && volk.images.length ? volk.images : [PLACEHOLDER];
    var hasReal = Boolean(volk.images && volk.images.length);

    var stageImg = el("img", { src: images[0], alt: title + t(" – Bild 1", " – image 1"), decoding: "async" });
    var counter = el("span", { class: "stage-count" });
    var prev = el("button", { class: "stage-nav prev", type: "button", "aria-label": t("Vorheriges Bild", "Previous image"), html: ICON.left });
    var next = el("button", { class: "stage-nav next", type: "button", "aria-label": t("Nächstes Bild", "Next image"), html: ICON.right });

    var stage = el("div", { class: "stage" }, [stageImg]);
    var thumbs = el("div", { class: "thumbs" });

    if (images.length > 1) {
      stage.appendChild(prev);
      stage.appendChild(next);
      stage.appendChild(counter);

      images.forEach(function (src, i) {
        var btn = el("button", { type: "button", "aria-label": t("Bild ", "Image ") + (i + 1) }, [
          el("img", { src: src, alt: "", loading: "lazy", decoding: "async" })
        ]);
        btn.addEventListener("click", function () { show(i); });
        thumbs.appendChild(btn);
      });
    }

    function show(i) {
      view.index = (i + images.length) % images.length;
      stageImg.src = images[view.index];
      stageImg.alt = title + t(" – Bild ", " – image ") + (view.index + 1);
      counter.textContent = (view.index + 1) + " / " + images.length;
      Array.prototype.forEach.call(thumbs.children, function (btn, idx) {
        btn.setAttribute("aria-current", String(idx === view.index));
      });
      if (lightbox.classList.contains("open")) updateLightbox(volk, images);
      preload(images, view.index + 1);
    }

    prev.addEventListener("click", function () { show(view.index - 1); });
    next.addEventListener("click", function () { show(view.index + 1); });
    stage.addEventListener("click", function (ev) {
      if (ev.target === stageImg && hasReal) openLightbox(volk, images);
    });

    var touchX = null;
    stage.addEventListener("touchstart", function (ev) { touchX = ev.changedTouches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (ev) {
      if (touchX === null) return;
      var dx = ev.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 45) show(view.index + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });

    var gallery = el("div", { class: "gallery" }, [stage, images.length > 1 ? thumbs : null]);

    var textCol = [];
    if (!alleine) textCol.push(el("h1", { class: "plant-title", text: title }));
    else textCol.push(el("h2", { class: "plant-title", text: title }));
    var untertitel = loc(volk, "subtitle");
    if (untertitel) textCol.push(el("p", { class: "plant-latin", text: untertitel }));

    var body = el("div", { class: "plant-text" });
    var parts = paragraphs(loc(volk, "text"));
    if (parts.length) {
      parts.forEach(function (p) { body.appendChild(el("p", { text: p })); });
    } else {
      body.appendChild(el("p", {
        class: "muted",
        text: t("Für dieses Volk steht noch kein Text in der text.txt.",
                "There is no text for this colony in its text.txt yet.")
      }));
    }
    textCol.push(body);

    var meta = loc(volk, "meta");
    var keys = Object.keys(meta);
    if (keys.length) {
      var facts = el("dl", { class: "facts" });
      keys.forEach(function (k) {
        facts.appendChild(el("div", {}, [
          el("dt", { text: k }),
          el("dd", { text: meta[k] })
        ]));
      });
      textCol.push(facts);
    }

    if (!hasReal) {
      textCol.push(el("p", { class: "muted", text: t("Bilder folgen – im Ordner liegt noch keins.",
                                                        "Pictures to follow – the folder doesn't have any yet.") }));
    }

    app.appendChild(el("div", { class: "detail" }, [gallery, el("div", {}, textCol)]));

    if (balkenAufraeumen) { balkenAufraeumen(); balkenAufraeumen = null; }
    if (volk.log && volk.log.length) app.appendChild(logSection(volk));

    show(0);
    app.showImage = show;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- Bienenjahr-Balken ---------- */

  var ARTEN = {
    schwarm:        { de: "Schwarm",        en: "Swarm",
                      erkl: ["Schwarm eingefangen oder eingezogen", "Swarm caught or hived"],
                      svg: '<ellipse cx="12" cy="14.5" rx="4.2" ry="5.8"/><path d="M8 12.5h8M7.9 16h8.2"/><path d="M10.2 9C8 5 3.8 5.6 4.6 8.6S9 11 10.2 9zM13.8 9C16 5 20.2 5.6 19.4 8.6S15 11 13.8 9z"/>' },
    koenigin:       { de: "Königin",        en: "Queen",
                      erkl: ["Königin gesehen", "Queen spotted"],
                      svg: '<path d="M3.5 18.5h17M5 18.5L3.5 8l5 4L12 5l3.5 7 5-4L19 18.5"/>' },
    fuetterung:     { de: "Fütterung",      en: "Feeding",
                      erkl: ["Zuckerwasser, als Band über die ganze Zeit", "Sugar syrup, drawn as a band"],
                      svg: '<path d="M8.5 3h7M9.5 3v3L6 9.5V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9.5L14.5 6V3"/><path d="M6 13.5h12"/>' },
    behandlung:     { de: "Behandlung",     en: "Treatment",
                      erkl: ["Varroa-Behandlung mit Milch- oder Ameisensäure", "Varroa treatment with lactic or formic acid"],
                      svg: '<path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3"/><path d="M7.2 15h9.6"/>' },
    milben:         { de: "Milben gezählt", en: "Mite count",
                      erkl: ["Milbenfall auf der Windel ausgezählt", "Mite drop counted on the board"],
                      svg: '<ellipse cx="12" cy="14" rx="6.2" ry="4.6"/><path d="M8.2 10.4L5.6 6.8M10.6 9.5L9.8 5.6M13.4 9.5l.8-3.9M15.8 10.4l2.6-3.6M6.4 12.4L3 11M17.6 12.4L21 11"/>' },
    restentmilbung: { de: "Restentmilbung", en: "Winter treatment",
                      erkl: ["Oxalsäure im Winter, wenn das Volk brutfrei ist", "Oxalic acid in winter, once the colony is brood-free"],
                      svg: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.6 4.6L12 7l2.4-2.4M9.6 19.4L12 17l2.4 2.4"/>' }
  };
  var TAG = 864e5;

  function zeit(text) {
    var m = /^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})$/.exec(text || "");
    if (!m) return NaN;
    var jahr = +m[3] < 100 ? +m[3] + 2000 : +m[3];
    return Date.UTC(jahr, +m[2] - 1, +m[1]);
  }

  function heute() {
    var d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function svg(inhalt) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inhalt + '</svg>';
  }

  /* Das Bienenjahr laeuft hier von Maerz bis Ende Februar: Auswintern bis Winterruhe. */
  function bienenjahr(ms) {
    var d = new Date(isNaN(ms) ? heute() : ms);
    return d.getUTCFullYear() - (d.getUTCMonth() < 2 ? 1 : 0);
  }

  function jahrBalken(volk, springen, jahr) {
    var spanne = { jahr: jahr, von: Date.UTC(jahr, 2, 1), bis: Date.UTC(jahr + 1, 2, 1) };
    var englisch = i18n.lang() === "en";
    var jetzt = heute();

    function pos(ms) {
      return Math.max(0, Math.min(100, (ms - spanne.von) / (spanne.bis - spanne.von) * 100));
    }

    var spur = el("div", { class: "jb-spur" }, [
      el("span", { class: "jb-vergangen", style: "width:" + pos(jetzt) + "%" })
    ]);
    var marken = el("div", { class: "jb-marken" });
    var monate = el("div", { class: "jb-monate", "aria-hidden": "true" });
    var zeiger = el("div", { class: "jb-zeiger", "aria-hidden": "true" });
    var datumAnzeige = el("span", { class: "jb-datum" });

    if (jetzt > spanne.von && jetzt < spanne.bis) {
      spur.appendChild(el("span", { class: "jb-heute", style: "left:" + pos(jetzt) + "%", title: t("Heute", "Today") }));
    }

    for (var m = 0; m < 12; m++) {
      var start = Date.UTC(spanne.jahr, 2 + m, 1);
      var name = new Date(start).toLocaleDateString(englisch ? "en-GB" : "de-DE", { month: "short", timeZone: "UTC" });
      monate.appendChild(el("span", { style: "left:" + pos(start) + "%", text: name.replace(".", "") }));
    }

    var ereignisse = (volk.events || []).filter(function (e) {
      var von = zeit(e.datum), bis = isNaN(zeit(e.bis)) ? von : zeit(e.bis);
      return ARTEN[e.art] && !isNaN(von) && bis >= spanne.von && von < spanne.bis;
    });

    ereignisse.forEach(function (e) {
      var art = ARTEN[e.art];
      var von = zeit(e.datum);
      var bis = isNaN(zeit(e.bis)) ? von : zeit(e.bis);
      var text = englisch && e.en ? e.en : e.text;
      var wann = i18n.datum(e.datum) + (e.bis ? " – " + i18n.datum(e.bis) : "");
      var geplant = von > jetzt;
      var titel = (englisch ? art.en : art.de) + ": " + text + " (" + wann + (geplant ? t(", geplant", ", planned") : "") + ")";

      if (bis > von) {
        spur.appendChild(el("span", {
          class: "jb-band art-" + e.art + (bis > jetzt ? " offen" : ""),
          style: "left:" + pos(von) + "%;width:" + Math.max(0.4, pos(bis) - pos(von)) + "%",
          title: titel
        }));
      }

      var knopf = el("button", {
        class: "jb-ev art-" + e.art + (geplant ? " geplant" : ""),
        type: "button",
        style: "left:" + pos(von) + "%",
        title: titel,
        "aria-label": titel,
        html: svg(art.svg)
      });
      knopf.dataset.von = von;
      knopf.dataset.bis = bis;
      knopf.addEventListener("click", function () { springen(von); });
      marken.appendChild(knopf);
    });

    var balken = el("div", { class: "jahr-balken" }, [
      el("div", { class: "jb-kopf" }, [
        el("span", { class: "jb-titel", text: t("Bienenjahr ", "Bee year ") + spanne.jahr + "/" + String(spanne.jahr + 1).slice(2) }),
        datumAnzeige
      ]),
      el("div", { class: "jb-bahn" }, [marken, spur, zeiger, monate])
    ]);

    /* Symbole, die sich ueberlappen wuerden, wandern eine Reihe hoeher.
       Auf schmalen Bildschirmen hoechstens zwei Reihen, dann duerfen sie sich beruehren. */
    function reihen() {
      var breite = marken.clientWidth;
      var erstes = marken.firstChild;
      if (!breite || !erstes) return;
      var abstand = erstes.offsetWidth + 2;
      var maximal = breite < 500 ? 2 : 4;
      var letzte = [];
      Array.prototype.forEach.call(marken.children, function (k) {
        var x = parseFloat(k.style.left) / 100 * breite;
        var r = 0;
        while (r < maximal && letzte[r] !== undefined && x - letzte[r] < abstand) r++;
        if (r === maximal) {
          r = 0;
          for (var i = 1; i < maximal; i++) if (letzte[i] < letzte[r]) r = i;
        }
        letzte[r] = x;
        k.style.setProperty("--reihe", r);
      });
      balken.style.setProperty("--reihen", Math.max(1, letzte.length));
    }

    function stelle(ms) {
      zeiger.style.left = pos(ms) + "%";
      var d = new Date(ms);
      var tag = ("0" + d.getUTCDate()).slice(-2) + "." + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "." + d.getUTCFullYear();
      datumAnzeige.textContent = i18n.datum(tag);
      Array.prototype.forEach.call(marken.children, function (k) {
        k.classList.toggle("an", ms >= +k.dataset.von - 2 * TAG && ms <= +k.dataset.bis + 2 * TAG);
      });
    }

    return { node: balken, jahr: jahr, reihen: reihen, stelle: stelle };
  }

  /* ---------- Tagebuch ---------- */

  var balkenAufraeumen = null;

  function logSection(volk) {
    var liste = el("ol", { class: "timeline" });
    var englisch = i18n.lang() === "en";
    var balken = jahrBalken(volk, springen, bienenjahr(zeit(volk.log[0].datum)));
    var knopf = null;

    function fuellen() {
      liste.innerHTML = "";
      var zeigen = logOffen ? volk.log : volk.log.slice(0, LOG_ANFANG);
      zeigen.forEach(function (eintrag, i) {
        var li = el("li", { class: "tl-item" + (i === 0 ? " now" : "") }, [
          el("span", { class: "tl-when", text: i18n.datum(eintrag.datum) }),
          el("p", { text: englisch && eintrag.en ? eintrag.en : eintrag.text })
        ]);
        li.dataset.zeit = zeit(eintrag.datum);
        liste.appendChild(li);
      });
      planen();
    }

    function knopfText() {
      return logOffen
        ? t("Nur die letzten " + LOG_ANFANG + " zeigen", "Show only the last " + LOG_ANFANG)
        : t("Alle " + volk.log.length + " Durchsichten zeigen", "Show all " + volk.log.length + " inspections");
    }

    /* Der Zeiger im Balken folgt dem Eintrag, der gerade unter dem Balken liegt,
       und gleitet zwischen zwei Durchsichten mit. */
    var wartet = false;
    function planen() {
      if (wartet) return;
      wartet = true;
      requestAnimationFrame(mitlaufen);
    }

    function mitlaufen() {
      wartet = false;
      var siteKopf = document.querySelector(".site-head");
      block.style.setProperty("--kopf", (siteKopf ? siteKopf.getBoundingClientRect().height : 0) + "px");
      var linie = balken.node.getBoundingClientRect().bottom + 28;
      block.style.setProperty("--balken-unten", (balken.node.offsetHeight + 20) + "px");

      var items = liste.children;
      if (!items.length) return;
      var aktiv = 0, ms = +items[0].dataset.zeit;
      for (var i = 0; i < items.length; i++) {
        var top = items[i].getBoundingClientRect().top;
        if (top > linie) break;
        aktiv = i;
        var naechstes = items[i + 1];
        ms = +items[i].dataset.zeit;
        if (naechstes) {
          var top2 = naechstes.getBoundingClientRect().top;
          var f = Math.max(0, Math.min(1, (linie - top) / (top2 - top)));
          ms += f * (+naechstes.dataset.zeit - ms);
        }
      }
      Array.prototype.forEach.call(items, function (li, idx) { li.classList.toggle("aktiv", idx === aktiv); });

      /* Ueber mehrere Jahre: der Balken wechselt zum Bienenjahr der Durchsicht. */
      if (bienenjahr(ms) !== balken.jahr) {
        var neu = jahrBalken(volk, springen, bienenjahr(ms));
        balken.node.replaceWith(neu.node);
        balken = neu;
        balken.reihen();
      }
      balken.stelle(ms);
    }

    /* Klick auf ein Symbol: zur Durchsicht springen, die dem Ereignis am naechsten liegt. */
    function springen(ms) {
      var beste = 0;
      volk.log.forEach(function (e, i) {
        if (Math.abs(zeit(e.datum) - ms) < Math.abs(zeit(volk.log[beste].datum) - ms)) beste = i;
      });
      if (beste >= LOG_ANFANG && !logOffen) {
        logOffen = true;
        fuellen();
        if (knopf) knopf.textContent = knopfText();
      }
      var ziel = liste.children[beste];
      if (ziel) ziel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    var kopf = el("div", { class: "section-head log-head" }, [
      el("p", { class: "eyebrow", text: t("Aus dem Stockbuch", "From the hive log") }),
      el("h2", { text: t("Durchsichten", "Inspections") }),
      el("p", {
        text: volk.log.length === 1
          ? t("Ein Eintrag, neueste zuerst.", "One entry, newest first.")
          : volk.log.length + t(" Einträge, neueste zuerst.", " entries, newest first.")
      })
    ]);

    var spalte = el("div", { class: "log-liste" }, [liste]);
    var block = el("section", { class: "log-section" }, [
      kopf,
      balken.node,
      el("div", { class: "log-raster" }, [spalte, legende(volk)])
    ]);

    if (volk.log.length > LOG_ANFANG) {
      knopf = el("button", {
        class: "btn btn-quiet log-more",
        type: "button",
        text: knopfText()
      });
      knopf.addEventListener("click", function () {
        logOffen = !logOffen;
        fuellen();
        knopf.textContent = knopfText();
      });
      spalte.appendChild(knopf);
    }

    fuellen();

    function neuGroesse() { balken.reihen(); planen(); }
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", neuGroesse);
    balkenAufraeumen = function () {
      window.removeEventListener("scroll", planen);
      window.removeEventListener("resize", neuGroesse);
    };
    requestAnimationFrame(neuGroesse);

    return block;
  }

  function legende(volk) {
    var vorhanden = {};
    (volk.events || []).forEach(function (e) { vorhanden[e.art] = true; });
    var liste = el("ul");
    Object.keys(ARTEN).forEach(function (key) {
      if (!vorhanden[key]) return;
      var art = ARTEN[key];
      liste.appendChild(el("li", {}, [
        el("span", { class: "jb-ev art-" + key, html: svg(art.svg) }),
        el("span", {}, [
          el("strong", { text: i18n.lang() === "en" ? art.en : art.de }),
          el("small", { text: t(art.erkl[0], art.erkl[1]) })
        ])
      ]));
    });
    liste.appendChild(el("li", { class: "lg-extra" }, [
      el("span", { class: "lg-zeiger" }),
      el("small", { text: t("Strich: die Durchsicht, die du gerade liest", "Line: the inspection you are reading") })
    ]));
    liste.appendChild(el("li", { class: "lg-extra" }, [
      el("span", { class: "jb-ev geplant", html: svg(ARTEN.restentmilbung.svg) }),
      el("small", { text: t("Blass: geplant, noch nicht passiert", "Faded: planned, not done yet") })
    ]));
    return el("aside", { class: "jb-legende", "aria-label": t("Legende", "Legend") }, [
      el("p", { class: "eyebrow", text: t("Legende", "Legend") }),
      liste
    ]);
  }

  function preload(images, i) {
    if (i >= 0 && i < images.length) new Image().src = images[i];
  }

  /* ---------- Lightbox ---------- */

  function updateLightbox(volk, images) {
    lightbox.querySelector("img").src = images[view.index];
    lightbox.querySelector("img").alt = loc(volk, "title");
    lightbox.querySelector(".caption").textContent =
      loc(volk, "title") + " – " + (view.index + 1) + " / " + images.length;
  }

  function openLightbox(volk, images) {
    lightbox.classList.add("open");
    document.body.classList.add("no-scroll");
    updateLightbox(volk, images);
    lightbox.querySelector(".close").focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  lightbox.addEventListener("click", function (ev) {
    if (ev.target.closest(".lb-prev") && app.showImage) { app.showImage(view.index - 1); return; }
    if (ev.target.closest(".lb-next") && app.showImage) { app.showImage(view.index + 1); return; }
    if (ev.target.closest(".close") || ev.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && lightbox.classList.contains("open")) { closeLightbox(); return; }
    if (!view.slug || !app.showImage) return;
    var active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) return;
    if (ev.key === "ArrowRight") { app.showImage(view.index + 1); ev.preventDefault(); }
    if (ev.key === "ArrowLeft")  { app.showImage(view.index - 1); ev.preventDefault(); }
  });

  /* ---------- Routing ---------- */

  function go(slug) {
    var url = slug ? "?v=" + encodeURIComponent(slug) : location.pathname;
    history.pushState({ slug: slug }, "", url);
    route();
  }

  function route() {
    closeLightbox();
    app.showImage = null;

    /* Bei einem einzigen Volk gibt es nichts auszuwaehlen. */
    if (voelker.length === 1) {
      renderDetail(voelker[0], true);
      return;
    }

    var slug = new URLSearchParams(location.search).get("v");
    var volk = slug ? bySlug(slug) : null;

    if (slug && !volk) {
      app.innerHTML = "";
      var back = el("button", { class: "back-link", type: "button", html: ICON.back + " <span>" + t("Alle Völker", "All colonies") + "</span>" });
      back.addEventListener("click", function () { go(null); });
      app.appendChild(back);
      app.appendChild(el("div", { class: "empty" }, [
        el("h3", { text: t("Dieses Volk gibt es nicht", "This colony doesn't exist") }),
        el("p", { text: t("„" + slug + "“ steht nicht in der Liste.", "“" + slug + "” isn't on the list.") })
      ]));
      return;
    }

    if (volk) {
      renderDetail(volk, false);
    } else {
      view.slug = null;
      document.title = t("Bienen", "Bees") + " – Fabian Bammes";
      renderOverview();
    }
  }

  app.addEventListener("click", function (ev) {
    var link = ev.target.closest(".plant-card");
    if (link && !ev.metaKey && !ev.ctrlKey && ev.button === 0) {
      ev.preventDefault();
      go(link.dataset.slug);
    }
  });

  window.addEventListener("popstate", route);

  /* Sprache gewechselt: neu zeichnen, aber am selben Bild und an derselben Stelle bleiben. */
  document.addEventListener("langchange", function () {
    if (!voelker.length) return;
    var bild = view.index, y = window.scrollY;
    route();
    if (app.showImage) app.showImage(bild);
    window.scrollTo(0, y);
  });

  /* ---------- Start ---------- */

  fetch(MANIFEST, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      voelker = (data && data.colonies) || [];
      route();
    })
    .catch(function (err) {
      app.innerHTML = "";
      app.appendChild(el("div", { class: "empty" }, [
        el("h3", { text: t("Die Bienenliste ließ sich nicht laden", "The bee list could not be loaded") }),
        el("p", { html: t("<code>" + MANIFEST + "</code> fehlt oder ist kaputt. Einmal <code>python tools/build_bienen.py</code> laufen lassen und neu hochladen.",
                          "<code>" + MANIFEST + "</code> is missing or broken. Run <code>python tools/build_bienen.py</code> once and upload again.") }),
        el("p", { class: "muted", text: String(err) })
      ]));
    });
})();
