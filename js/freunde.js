/* Startseite: Bei jedem Laden zeigt der Rahmen neben den Freunde-Karten
   eine zufaellige Seite aus dem Umfeld. Ohne JavaScript bleibt das
   Mensa-Bild aus dem HTML stehen. */
(function () {
  "use strict";

  var figur = document.getElementById("freundeBild");
  if (!figur || !window.i18n) return;

  var t = window.i18n.t;

  var SEITEN = [
    {
      url: "https://gustav-hammer.de/wann-mensa-heute",
      bild: "./KKK.jpeg", breite: 600, hoehe: 450,
      alt: ["Link zu Wann Mensa heute?", "Link to Wann Mensa heute?"],
      text: ["Wann Mensa heute? – die wichtigste Frage des Tages",
             "Wann Mensa heute? – the most important question of the day"]
    },
    {
      url: "https://gustav-hammer.de/",
      bild: "./assets/freunde/gustav-hammer.jpg", breite: 800, hoehe: 600,
      alt: ["Startseite von Gustav Hammer", "Gustav Hammer's home page"],
      text: ["Gustav Hammer – der Namensgeber des Zertifikats unten rechts",
             "Gustav Hammer – the namesake of the certificate in the bottom right"]
    },
    {
      url: "https://www.bier-meile.com",
      bild: "./assets/freunde/bier-meile.jpg", breite: 800, hoehe: 600,
      alt: ["Startseite der Erlanger Biermeile", "Home page of the Erlangen beer mile"],
      text: ["Bier-Meilen-Verein Erlangen – Laufen und Trinken, meistens in dieser Reihenfolge",
             "Beer mile club Erlangen – running and drinking, mostly in that order"]
    },
    {
      url: "https://trws-music.com/",
      bild: "./assets/freunde/trws.jpg", breite: 800, hoehe: 600,
      alt: ["Startseite von TRWS", "TRWS home page"],
      text: ["TRWS – Musik von Freunden, lauter als diese Website",
             "TRWS – music by friends, louder than this website"]
    }
  ];

  /* Nicht zweimal hintereinander dieselbe Seite. */
  var letzte = -1;
  try { letzte = parseInt(sessionStorage.getItem("freundeBild"), 10); } catch (e) {}
  var wahl = Math.floor(Math.random() * SEITEN.length);
  if (wahl === letzte && SEITEN.length > 1) wahl = (wahl + 1) % SEITEN.length;
  try { sessionStorage.setItem("freundeBild", String(wahl)); } catch (e) {}

  var seite = SEITEN[wahl];
  var link = figur.querySelector("a");
  var bild = figur.querySelector("img");
  var unterschrift = figur.querySelector("figcaption");

  /* Die Texte verwaltet ab hier dieses Skript, nicht der Sprachumschalter. */
  ["data-en", "data-de"].forEach(function (a) { unterschrift.removeAttribute(a); });
  ["data-en-alt", "data-de-alt"].forEach(function (a) { bild.removeAttribute(a); });

  link.href = seite.url;
  bild.src = seite.bild;
  bild.width = seite.breite;
  bild.height = seite.hoehe;

  function texte() {
    bild.alt = t(seite.alt[0], seite.alt[1]);
    unterschrift.textContent = t(seite.text[0], seite.text[1]);
  }

  texte();
  document.addEventListener("langchange", texte);
})();
