/* Gemeinsames Verhalten: Theme- und Sprachumschalter, Navigation auf dem Handy. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Sprache ----------
     Die Seiten sind auf Deutsch geschrieben. Wo es eine englische Fassung
     gibt, steht sie im Attribut data-en (Inhalt) bzw. data-en-<attribut>
     (z. B. data-en-aria-label). Beim Umschalten wird getauscht, das
     deutsche Original merkt sich das Element in data-de. Ganze Bloecke mit
     data-lang="de" / data-lang="en" blendet das CSS passend ein und aus. */

  var ATTRIBUTE = ["aria-label", "alt", "title", "placeholder", "label", "content"];
  var MONATE_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function currentLang() {
    return root.lang === "en" ? "en" : "de";
  }

  function t(de, en) {
    return currentLang() === "en" && en != null ? en : de;
  }

  function tauscheInhalt(lang) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-en]"), function (node) {
      if (lang === "en") {
        if (!node.hasAttribute("data-de")) node.setAttribute("data-de", node.innerHTML);
        node.innerHTML = node.getAttribute("data-en");
      } else if (node.hasAttribute("data-de")) {
        node.innerHTML = node.getAttribute("data-de");
      }
    });

    ATTRIBUTE.forEach(function (attr) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-en-" + attr + "]"), function (node) {
        var merk = "data-de-" + attr;
        if (lang === "en") {
          if (!node.hasAttribute(merk)) node.setAttribute(merk, node.getAttribute(attr) || "");
          node.setAttribute(attr, node.getAttribute("data-en-" + attr));
        } else if (node.hasAttribute(merk)) {
          node.setAttribute(attr, node.getAttribute(merk));
        }
      });
    });
  }

  /* Jede Seite gibt es unter zwei Adressen (pflanzen.html / pflanzen-en.html).
     Die Adressleiste folgt der Sprache, damit man den Link so weitergeben kann. */
  function adresse(lang) {
    var link = document.querySelector('link[rel="alternate"][hreflang="' + lang + '"]');
    if (!link || !window.history || !history.replaceState) return;
    try {
      var ziel = new URL(link.href).pathname;
      if (ziel !== location.pathname) {
        history.replaceState(history.state, "", ziel + location.search + location.hash);
      }
    } catch (e) { /* alter Browser: Adresse bleibt, wie sie ist */ }
  }

  function setLang(lang, melden) {
    root.lang = lang;
    tauscheInhalt(lang);
    adresse(lang);
    themeLabel();
    if (melden) {
      document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
    }
  }

  /* '17.05.2026' bleibt auf Deutsch so, auf Englisch wird '17 May 2026' daraus. */
  function datum(text) {
    if (currentLang() !== "en") return text;
    var m = /^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})$/.exec(text) ||
            /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!m) return text;
    var tag, monat, jahr;
    if (m[1].length === 4) { jahr = +m[1]; monat = +m[2]; tag = +m[3]; }
    else { tag = +m[1]; monat = +m[2]; jahr = +m[3]; if (jahr < 100) jahr += 2000; }
    if (monat < 1 || monat > 12) return text;
    return tag + " " + MONATE_EN[monat - 1] + " " + jahr;
  }

  window.i18n = { lang: currentLang, t: t, datum: datum };

  /* ---------- Theme ---------- */

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function themeLabel() {
    var dunkel = currentTheme() === "dark";
    Array.prototype.forEach.call(document.querySelectorAll(".theme-toggle"), function (btn) {
      btn.setAttribute("aria-label", dunkel
        ? t("Helles Design", "Light theme")
        : t("Dunkles Design", "Dark theme"));
    });
  }

  document.addEventListener("click", function (ev) {
    var toggle = ev.target.closest(".theme-toggle");
    if (toggle) {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* privates Fenster */ }
      themeLabel();
      return;
    }

    var sprache = ev.target.closest(".lang-toggle");
    if (sprache) {
      var neu = currentLang() === "en" ? "de" : "en";
      try { localStorage.setItem("lang", neu); } catch (e) { /* privates Fenster */ }
      setLang(neu, true);
      return;
    }

    var burger = ev.target.closest(".nav-toggle");
    if (burger) {
      var nav = document.getElementById("mainNav");
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    }
  });

  /* ---------- Zertifikat ----------
     Der Stempel unten rechts oeffnet ein kleines Popup mit den Details,
     die Gustav zur Pruefung geschrieben hat. */

  var ZERTIFIKAT_BIS = "24.09.2027";

  function zertifikatHtml() {
    return '<button type="button" class="zert-close" aria-label="' + t("Schließen", "Close") + '">&times;</button>' +
      '<p class="zert-kicker">' + t("Offizielles Zertifikat", "Official certificate") + '</p>' +
      '<h2 id="zertTitel">' + t("Gustav Hammer zertifiziert", "Gustav Hammer certified") + ' &#10004;&#65039;</h2>' +
      '<p>' + t("Diese Website wurde von Gustav Hammer geprüft und für sehr schön befunden. Sie ist zertifiziert bis zum",
                "This website has been inspected by Gustav Hammer and found to be very nice. It is certified until") +
      ' <strong>' + datum(ZERTIFIKAT_BIS) + '</strong>.</p>' +
      '<p class="zert-sub">' + t("Umgesetzte Anmerkungen des Prüfers:", "Inspector's remarks, now addressed:") + '</p>' +
      '<ul>' +
        '<li>' + t("Seine Website hat jetzt die Domain", "His website now lives at") +
          ' <a href="https://gustav-hammer.de/" target="_blank" rel="noopener">gustav-hammer.de</a>.</li>' +
        '<li>' + t("scherehoch.de gibt es leider nicht mehr :(", "scherehoch.de sadly no longer exists :(") + '</li>' +
      '</ul>';
  }

  function zeigeZertifikat() {
    var dlg = document.getElementById("zertifikat");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "zertifikat";
      dlg.className = "zert";
      dlg.setAttribute("aria-labelledby", "zertTitel");
      dlg.addEventListener("click", function (ev) {
        /* Klick auf den abgedunkelten Hintergrund oder das X schliesst */
        if (ev.target === dlg || ev.target.closest(".zert-close")) dlg.close();
      });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = zertifikatHtml();
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  Array.prototype.forEach.call(document.querySelectorAll(".stamp"), function (stamp) {
    stamp.setAttribute("role", "button");
    stamp.setAttribute("tabindex", "0");
    stamp.addEventListener("click", zeigeZertifikat);
    stamp.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); zeigeZertifikat(); }
    });
  });

  /* Die Sprache hat das Skript im <head> schon gesetzt, hier werden nur die Texte getauscht. */
  setLang(currentLang(), false);

  /* Jahr im Fusszeilen-Copyright aktuell halten */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
