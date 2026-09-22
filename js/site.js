/* Gemeinsames Verhalten: Theme-Umschalter und Navigation auf dem Handy. */
(function () {
  "use strict";

  var root = document.documentElement;

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.addEventListener("click", function (ev) {
    var toggle = ev.target.closest(".theme-toggle");
    if (toggle) {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* privates Fenster */ }
      toggle.setAttribute("aria-label", next === "dark" ? "Helles Design" : "Dunkles Design");
      return;
    }

    var burger = ev.target.closest(".nav-toggle");
    if (burger) {
      var nav = document.getElementById("mainNav");
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    }
  });

  /* Jahr im Fusszeilen-Copyright aktuell halten */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
