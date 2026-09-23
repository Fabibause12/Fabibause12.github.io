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

  function cover(volk) {
    return volk.images && volk.images.length ? volk.images[0] : PLACEHOLDER;
  }

  function teaser(volk) {
    var t = (volk.text || "").replace(/\s+/g, " ").trim();
    return t.length > 190 ? t.slice(0, 190).replace(/\S+$/, "") + "…" : t;
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
      el("img", { src: cover(volk), alt: volk.title, loading: "lazy", decoding: "async" })
    ]);
    if (volk.imageCount > 1) {
      thumb.appendChild(el("span", {
        class: "badge",
        html: ICON.photo + " " + volk.imageCount
      }));
    }

    var body = [el("h3", { text: volk.title })];
    var sub = volk.subtitle || teaser(volk);
    if (sub) body.push(el("p", { class: "teaser", text: sub }));
    if (volk.log && volk.log.length) {
      body.push(el("p", { class: "latin", text: "Letzte Durchsicht: " + volk.log[0].datum }));
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
        text: voelker.length + (voelker.length === 1 ? " Volk" : " Völker")
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
      el("h3", { text: "Noch kein Volk da" }),
      el("p", { html: "Leg im Ordner <code>Bienen/</code> einen Unterordner pro Volk an – mit einer <code>text.txt</code>, optional einer <code>tagebuch.txt</code> und beliebig vielen Bildern:" }),
      el("pre", { text: beispiel })
    ]);
  }

  /* ---------- Ein Volk ---------- */

  function renderDetail(volk, alleine) {
    view.slug = volk.slug;
    view.index = 0;
    if (intro) intro.hidden = !alleine;

    app.innerHTML = "";
    document.title = volk.title + " – Bienen";

    if (!alleine) {
      var back = el("button", {
        class: "back-link",
        type: "button",
        html: ICON.back + " <span>Alle Völker</span>"
      });
      back.addEventListener("click", function () { go(null); });
      app.appendChild(back);
    }

    var images = volk.images && volk.images.length ? volk.images : [PLACEHOLDER];
    var hasReal = Boolean(volk.images && volk.images.length);

    var stageImg = el("img", { src: images[0], alt: volk.title + " – Bild 1", decoding: "async" });
    var counter = el("span", { class: "stage-count" });
    var prev = el("button", { class: "stage-nav prev", type: "button", "aria-label": "Vorheriges Bild", html: ICON.left });
    var next = el("button", { class: "stage-nav next", type: "button", "aria-label": "Nächstes Bild", html: ICON.right });

    var stage = el("div", { class: "stage" }, [stageImg]);
    var thumbs = el("div", { class: "thumbs" });

    if (images.length > 1) {
      stage.appendChild(prev);
      stage.appendChild(next);
      stage.appendChild(counter);

      images.forEach(function (src, i) {
        var btn = el("button", { type: "button", "aria-label": "Bild " + (i + 1) }, [
          el("img", { src: src, alt: "", loading: "lazy", decoding: "async" })
        ]);
        btn.addEventListener("click", function () { show(i); });
        thumbs.appendChild(btn);
      });
    }

    function show(i) {
      view.index = (i + images.length) % images.length;
      stageImg.src = images[view.index];
      stageImg.alt = volk.title + " – Bild " + (view.index + 1);
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
    if (!alleine) textCol.push(el("h1", { class: "plant-title", text: volk.title }));
    else textCol.push(el("h2", { class: "plant-title", text: volk.title }));
    if (volk.subtitle) textCol.push(el("p", { class: "plant-latin", text: volk.subtitle }));

    var body = el("div", { class: "plant-text" });
    var parts = paragraphs(volk.text);
    if (parts.length) {
      parts.forEach(function (p) { body.appendChild(el("p", { text: p })); });
    } else {
      body.appendChild(el("p", {
        class: "muted",
        text: "Für dieses Volk steht noch kein Text in der text.txt."
      }));
    }
    textCol.push(body);

    var keys = Object.keys(volk.meta || {});
    if (keys.length) {
      var facts = el("dl", { class: "facts" });
      keys.forEach(function (k) {
        facts.appendChild(el("div", {}, [
          el("dt", { text: k }),
          el("dd", { text: volk.meta[k] })
        ]));
      });
      textCol.push(facts);
    }

    if (!hasReal) {
      textCol.push(el("p", { class: "muted", text: "Bilder folgen – im Ordner liegt noch keins." }));
    }

    app.appendChild(el("div", { class: "detail" }, [gallery, el("div", {}, textCol)]));

    if (volk.log && volk.log.length) app.appendChild(logSection(volk));

    show(0);
    app.showImage = show;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- Tagebuch ---------- */

  function logSection(volk) {
    var liste = el("ol", { class: "timeline" });
    var offen = false;

    function fuellen() {
      liste.innerHTML = "";
      var zeigen = offen ? volk.log : volk.log.slice(0, LOG_ANFANG);
      zeigen.forEach(function (eintrag, i) {
        liste.appendChild(el("li", { class: "tl-item" + (i === 0 ? " now" : "") }, [
          el("span", { class: "tl-when", text: eintrag.datum }),
          el("p", { text: eintrag.text })
        ]));
      });
    }

    fuellen();

    var kopf = el("div", { class: "section-head log-head" }, [
      el("p", { class: "eyebrow", text: "Aus dem Stockbuch" }),
      el("h2", { text: "Durchsichten" }),
      el("p", {
        text: volk.log.length === 1
          ? "Ein Eintrag, neueste zuerst."
          : volk.log.length + " Einträge, neueste zuerst."
      })
    ]);

    var block = el("section", { class: "log-section" }, [kopf, liste]);

    if (volk.log.length > LOG_ANFANG) {
      var knopf = el("button", {
        class: "btn btn-quiet log-more",
        type: "button",
        text: "Alle " + volk.log.length + " Durchsichten zeigen"
      });
      knopf.addEventListener("click", function () {
        offen = !offen;
        fuellen();
        knopf.textContent = offen
          ? "Nur die letzten " + LOG_ANFANG + " zeigen"
          : "Alle " + volk.log.length + " Durchsichten zeigen";
      });
      block.appendChild(knopf);
    }

    return block;
  }

  function preload(images, i) {
    if (i >= 0 && i < images.length) new Image().src = images[i];
  }

  /* ---------- Lightbox ---------- */

  function updateLightbox(volk, images) {
    lightbox.querySelector("img").src = images[view.index];
    lightbox.querySelector("img").alt = volk.title;
    lightbox.querySelector(".caption").textContent =
      volk.title + " – " + (view.index + 1) + " / " + images.length;
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
      var back = el("button", { class: "back-link", type: "button", html: ICON.back + " <span>Alle Völker</span>" });
      back.addEventListener("click", function () { go(null); });
      app.appendChild(back);
      app.appendChild(el("div", { class: "empty" }, [
        el("h3", { text: "Dieses Volk gibt es nicht" }),
        el("p", { text: "„" + slug + "“ steht nicht in der Liste." })
      ]));
      return;
    }

    if (volk) {
      renderDetail(volk, false);
    } else {
      view.slug = null;
      document.title = "Bienen – Fabian Bammes";
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
        el("h3", { text: "Die Bienenliste ließ sich nicht laden" }),
        el("p", { html: "<code>" + MANIFEST + "</code> fehlt oder ist kaputt. Einmal <code>python tools/build_bienen.py</code> laufen lassen und neu hochladen." }),
        el("p", { class: "muted", text: String(err) })
      ]));
    });
})();
