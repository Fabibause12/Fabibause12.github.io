/* =========================================================
   Pflanzen-Seite
   Liest Pflanzen/pflanzen.json (wird aus den Ordnern erzeugt)
   und baut daraus Uebersicht + Detailansicht mit Bildergalerie.
   ========================================================= */
(function () {
  "use strict";

  var MANIFEST = "Pflanzen/pflanzen.json";
  var PLACEHOLDER = "assets/keinbild.svg";

  var ICON = {
    left:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
  };

  var app = document.getElementById("pflanzenApp");
  var intro = document.getElementById("pflanzenIntro");
  var lightbox = document.getElementById("lightbox");
  var plants = [];
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
    for (var i = 0; i < plants.length; i++) {
      if (plants[i].slug === slug) return plants[i];
    }
    return null;
  }

  function cover(plant) {
    return plant.images && plant.images.length ? plant.images[0] : PLACEHOLDER;
  }

  function teaser(plant) {
    var t = (plant.text || "").replace(/\s+/g, " ").trim();
    return t.length > 190 ? t.slice(0, 190).replace(/\S+$/, "") + "…" : t;
  }

  function paragraphs(text) {
    return (text || "")
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);
  }

  /* ---------- Uebersicht ---------- */

  function card(plant) {
    var thumbImg = el("img", {
      src: cover(plant),
      alt: plant.title,
      loading: "lazy",
      decoding: "async"
    });

    var thumb = el("div", { class: "thumb" }, [thumbImg]);
    if (plant.imageCount > 1) {
      thumb.appendChild(el("span", {
        class: "badge",
        html: ICON.photo + " " + plant.imageCount
      }));
    }

    var body = [el("h3", { text: plant.title })];
    if (plant.latin) body.push(el("p", { class: "latin", text: plant.latin }));
    var sub = plant.subtitle || teaser(plant);
    if (sub) body.push(el("p", { class: "teaser", text: sub }));

    return el("a", {
      class: "plant-card",
      href: "?p=" + encodeURIComponent(plant.slug),
      dataset: { slug: plant.slug }
    }, [thumb, el("div", { class: "body" }, body)]);
  }

  function renderOverview(filter) {
    if (intro) intro.hidden = false;
    var needle = (filter || "").trim().toLowerCase();
    var list = plants.filter(function (p) {
      if (!needle) return true;
      return (p.title + " " + p.latin + " " + p.subtitle + " " + p.text)
        .toLowerCase().indexOf(needle) !== -1;
    });

    app.innerHTML = "";

    if (!plants.length) {
      app.appendChild(emptyState());
      return;
    }

    var input = el("input", {
      type: "search",
      placeholder: "Pflanze suchen …",
      value: filter || "",
      "aria-label": "Pflanzen durchsuchen"
    });
    input.addEventListener("input", function () {
      var pos = input.selectionStart;
      renderOverview(input.value);
      var next = app.querySelector(".search input");
      if (next) { next.focus(); next.setSelectionRange(pos, pos); }
    });

    var search = el("div", { class: "search" }, [
      el("span", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' }),
      input
    ]);

    var count = el("span", {
      class: "count",
      text: list.length + (list.length === 1 ? " Pflanze" : " Pflanzen")
    });

    app.appendChild(el("div", { class: "toolbar" }, [search, count]));

    if (!list.length) {
      app.appendChild(el("div", { class: "empty" }, [
        el("h3", { text: "Nichts gefunden" }),
        el("p", { text: "Zu „" + needle + "“ passt gerade keine Pflanze." })
      ]));
      return;
    }

    var grid = el("div", { class: "plant-grid" });
    list.forEach(function (p) { grid.appendChild(card(p)); });
    app.appendChild(grid);
  }

  function emptyState() {
    var beispiel =
      "Pflanzen/\n" +
      "  Monstera/\n" +
      "    text.txt\n" +
      "    1.jpg\n" +
      "    2.jpg\n" +
      "  Efeutute/\n" +
      "    text.txt\n" +
      "    foto.jpg";

    return el("div", { class: "empty" }, [
      el("h3", { text: "Noch keine Pflanzen da" }),
      el("p", { html: "Leg im Ordner <code>Pflanzen/</code> einen Unterordner pro Pflanze an – mit einer <code>text.txt</code> und beliebig vielen Bildern:" }),
      el("pre", { text: beispiel })
    ]);
  }

  /* ---------- Detailansicht ---------- */

  function renderDetail(plant) {
    view.slug = plant.slug;
    view.index = 0;
    if (intro) intro.hidden = true;

    app.innerHTML = "";
    document.title = plant.title + " – Pflanzen";

    var back = el("button", {
      class: "back-link",
      type: "button",
      html: ICON.back + " <span>Alle Pflanzen</span>"
    });
    back.addEventListener("click", function () { go(null); });
    app.appendChild(back);

    var images = plant.images && plant.images.length ? plant.images : [PLACEHOLDER];
    var hasReal = Boolean(plant.images && plant.images.length);

    var stageImg = el("img", {
      src: images[0],
      alt: plant.title + " – Bild 1",
      decoding: "async"
    });
    var counter = el("span", { class: "stage-count" });
    var prev = el("button", { class: "stage-nav prev", type: "button", "aria-label": "Vorheriges Bild", html: ICON.left });
    var next = el("button", { class: "stage-nav next", type: "button", "aria-label": "Naechstes Bild", html: ICON.right });

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
      stageImg.alt = plant.title + " – Bild " + (view.index + 1);
      counter.textContent = (view.index + 1) + " / " + images.length;
      Array.prototype.forEach.call(thumbs.children, function (btn, idx) {
        btn.setAttribute("aria-current", String(idx === view.index));
      });
      if (lightbox.classList.contains("open")) updateLightbox(plant, images);
      preload(images, view.index + 1);
    }

    prev.addEventListener("click", function () { show(view.index - 1); });
    next.addEventListener("click", function () { show(view.index + 1); });
    stage.addEventListener("click", function (ev) {
      if (ev.target === stageImg && hasReal) openLightbox(plant, images);
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

    var textCol = [
      el("h1", { class: "plant-title", text: plant.title })
    ];
    if (plant.latin) textCol.push(el("p", { class: "plant-latin", text: plant.latin }));

    var body = el("div", { class: "plant-text" });
    var parts = paragraphs(plant.text);
    if (parts.length) {
      parts.forEach(function (p) { body.appendChild(el("p", { text: p })); });
    } else {
      body.appendChild(el("p", {
        class: "muted",
        text: "Für diese Pflanze steht noch kein Text in der text.txt."
      }));
    }
    textCol.push(body);

    var keys = Object.keys(plant.meta || {});
    if (keys.length) {
      var facts = el("dl", { class: "facts" });
      keys.forEach(function (k) {
        facts.appendChild(el("div", {}, [
          el("dt", { text: k }),
          el("dd", { text: plant.meta[k] })
        ]));
      });
      textCol.push(facts);
    }

    if (!hasReal) {
      textCol.push(el("p", { class: "muted", text: "Bilder folgen – im Ordner liegt noch keins." }));
    }

    app.appendChild(el("div", { class: "detail" }, [gallery, el("div", {}, textCol)]));

    show(0);
    app.showImage = show;
    app.images = images;
    app.plant = plant;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function preload(images, i) {
    if (i >= 0 && i < images.length) new Image().src = images[i];
  }

  /* ---------- Lightbox ---------- */

  function updateLightbox(plant, images) {
    lightbox.querySelector("img").src = images[view.index];
    lightbox.querySelector("img").alt = plant.title;
    lightbox.querySelector(".caption").textContent =
      plant.title + " – " + (view.index + 1) + " / " + images.length;
  }

  function openLightbox(plant, images) {
    lightbox.classList.add("open");
    document.body.classList.add("no-scroll");
    updateLightbox(plant, images);
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
    var url = slug ? "?p=" + encodeURIComponent(slug) : location.pathname;
    history.pushState({ slug: slug }, "", url);
    route();
  }

  function route() {
    closeLightbox();
    app.showImage = null;
    var slug = new URLSearchParams(location.search).get("p");
    var plant = slug ? bySlug(slug) : null;

    if (slug && !plant) {
      app.innerHTML = "";
      var back = el("button", { class: "back-link", type: "button", html: ICON.back + " <span>Alle Pflanzen</span>" });
      back.addEventListener("click", function () { go(null); });
      app.appendChild(back);
      app.appendChild(el("div", { class: "empty" }, [
        el("h3", { text: "Diese Pflanze gibt es nicht" }),
        el("p", { text: "„" + slug + "“ steht nicht in der Liste." })
      ]));
      return;
    }

    if (plant) {
      renderDetail(plant);
    } else {
      view.slug = null;
      document.title = "Pflanzen – Fabian Bammes";
      renderOverview("");
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
      plants = (data && data.plants) || [];
      route();
    })
    .catch(function (err) {
      app.innerHTML = "";
      app.appendChild(el("div", { class: "empty" }, [
        el("h3", { text: "Die Pflanzenliste liess sich nicht laden" }),
        el("p", { html: "<code>" + MANIFEST + "</code> fehlt oder ist kaputt. Einmal <code>python tools/build_pflanzen.py</code> laufen lassen und neu hochladen." }),
        el("p", { class: "muted", text: String(err) })
      ]));
    });
})();
