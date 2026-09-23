#!/usr/bin/env python3
"""Baut werdegang.html aus Werdegang/werdegang.txt.

Aufruf:  python tools/build_werdegang.py
"""

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUELLE = ROOT / "Werdegang" / "werdegang.txt"
ZIEL = ROOT / "werdegang.html"


def lies(path: Path) -> str:
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    return path.read_bytes().decode("utf-8", errors="replace")


def parse(text: str):
    """# Abschnitt / ## Eintrag / Wo: / - Stichpunkt / Freitext."""
    abschnitte = {}
    akt_abschnitt = None
    akt_eintrag = None

    for roh in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        zeile = roh.rstrip()
        strip = zeile.strip()

        if not strip or strip.startswith("//"):
            if akt_eintrag is not None and akt_eintrag["text"] and akt_eintrag["text"][-1] != "":
                akt_eintrag["text"].append("")
            continue

        if strip.startswith("## "):
            kopf = strip[3:].strip()
            zeit, titel = ("", kopf)
            if "|" in kopf:
                zeit, titel = [t.strip() for t in kopf.split("|", 1)]
            akt_eintrag = {"zeit": zeit, "titel": titel, "wo": "",
                           "aktuell": False, "text": [], "punkte": []}
            abschnitte.setdefault(akt_abschnitt, []).append(akt_eintrag)
            continue

        if strip.startswith("# "):
            akt_abschnitt = strip[2:].strip()
            abschnitte.setdefault(akt_abschnitt, [])
            akt_eintrag = None
            continue

        if akt_abschnitt is None:
            continue

        if akt_eintrag is None:
            akt_eintrag = {"zeit": "", "titel": "", "wo": "",
                           "aktuell": False, "text": [], "punkte": []}
            abschnitte[akt_abschnitt].append(akt_eintrag)

        if strip.startswith("- "):
            akt_eintrag["punkte"].append(strip[2:].strip())
        elif re.match(r"^Wo\s*:", strip, re.I):
            akt_eintrag["wo"] = strip.split(":", 1)[1].strip()
        elif re.match(r"^Aktuell\s*:", strip, re.I):
            akt_eintrag["aktuell"] = strip.split(":", 1)[1].strip().lower() in ("ja", "yes", "true", "x")
        else:
            akt_eintrag["text"].append(strip)

    return abschnitte


def absaetze(zeilen):
    """Zeilenliste mit Leerzeilen als Trenner zu Absaetzen zusammenfassen."""
    raus, puffer = [], []
    for z in zeilen:
        if z == "":
            if puffer:
                raus.append(" ".join(puffer))
                puffer = []
        else:
            puffer.append(z)
    if puffer:
        raus.append(" ".join(puffer))
    return raus


def e(s: str) -> str:
    return html.escape(s, quote=False)


def render_stationen(eintraege):
    out = []
    for s in eintraege:
        klasse = "tl-item now" if s["aktuell"] else "tl-item"
        teile = ['        <li class="%s">' % klasse]
        if s["zeit"]:
            teile.append('          <span class="tl-when">%s</span>' % e(s["zeit"]))
        if s["titel"]:
            teile.append("          <h3>%s</h3>" % e(s["titel"]))
        if s["wo"]:
            teile.append('          <p class="tl-where">%s</p>' % e(s["wo"]))
        for p in absaetze(s["text"]):
            teile.append("          <p>%s</p>" % e(p))
        if s["punkte"]:
            teile.append("          <ul>")
            for p in s["punkte"]:
                teile.append("            <li>%s</li>" % e(p))
            teile.append("          </ul>")
        teile.append("        </li>")
        out.append("\n".join(teile))
    return "\n".join(out)


def render_karten(eintraege):
    out = []
    for i, k in enumerate(eintraege):
        klasse = "card" if i == 0 else "card cv-card-2"
        teile = ['        <div class="%s">' % klasse]
        if k["titel"]:
            teile.append("          <h3>%s</h3>" % e(k["titel"]))
        for p in absaetze(k["text"]):
            teile.append("          <p>%s</p>" % e(p))
        if k["punkte"]:
            teile.append('          <ul class="cv-list">')
            for p in k["punkte"]:
                teile.append("            <li>%s</li>" % e(p))
            teile.append("          </ul>")
        teile.append("        </div>")
        out.append("\n".join(teile))
    return "\n".join(out)


def render_kenntnisse(eintraege):
    out = []
    for k in eintraege:
        begriffe = list(k["punkte"])
        for zeile in k["text"]:
            begriffe += [t.strip() for t in zeile.split(",") if t.strip()]
        if not begriffe:
            continue
        teile = ['        <div class="skill-block">',
                 "          <h3>%s</h3>" % e(k["titel"]),
                 '          <ul class="chips">']
        for b in begriffe:
            teile.append("            <li>%s</li>" % e(b))
        teile.append("          </ul>")
        teile.append("        </div>")
        out.append("\n".join(teile))
    return "\n".join(out)


def render_text(eintraege, klasse=""):
    out = []
    for k in eintraege:
        for p in absaetze(k["text"]):
            attr = ' class="%s"' % klasse if klasse else ""
            out.append("      <p%s>%s</p>" % (attr, e(p)))
    return "\n".join(out)


KOPF = '''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Werdegang &ndash; Fabian Bammes</title>
<meta name="description" content="Kurzer Einblick in meinen fachlichen Werdegang.">
<meta name="theme-color" content="#6d3fa0">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="./css/style.css">
<link rel="icon" href="./assets/icon-16.png" sizes="16x16">
<link rel="icon" href="./assets/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="./assets/icon-180.png">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
</head>
<body class="cv">
<!-- Diese Datei wird aus Werdegang/werdegang.txt erzeugt.
     Änderungen hier gehen beim nächsten Bauen verloren!
     Bearbeite stattdessen Werdegang/werdegang.txt -->
<a class="skip-link" href="#main">Zum Inhalt springen</a>

<header class="site-head">
  <div class="container">
    <a class="brand" href="./index.html">
      <img class="logo" src="./assets/logo.png" alt="" width="26" height="26">
      Fabian Bammes
    </a>

    <nav class="nav" id="mainNav" aria-label="Hauptnavigation">
      <ul>
        <li><a href="./index.html">Start</a></li>
        <li><a href="./pflanzen.html">Pflanzen</a></li>
        <li><a href="./bienen.html">Bienen</a></li>
        <li><a href="./werdegang.html" class="active">Werdegang</a></li>
        <li><a href="./wuerfel.html">Würfel</a></li>
        <li><a href="./index.html#freunde">Freunde</a></li>
        <li><a href="https://www.wann-mensa-heute.de" class="ext" target="_blank" rel="noopener">Mensa</a></li>
      </ul>
    </nav>

    <button class="icon-btn theme-toggle" type="button" aria-label="Dunkles Design">
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
    </button>

    <button class="icon-btn nav-toggle" type="button" aria-controls="mainNav" aria-expanded="false" aria-label="Menü">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</header>

<main id="main">
'''

FUSS = '''</main>

<footer class="site-foot">
  <div class="container">
    <p>&copy; <span id="year">2026</span> Fabian Bammes &middot; <a href="./impressum.html">Impressum</a></p>
    <span class="stamp">Gustav Hammer zertifiziert</span>
  </div>
</footer>

<script src="./js/site.js"></script>
</body>
</html>
'''


def baue(abschnitte):
    teile = [KOPF]

    ueberschrift = "Werdegang"
    einleitung = abschnitte.get("Einleitung", [])
    if einleitung and einleitung[0]["titel"]:
        ueberschrift = einleitung[0]["titel"]

    teile.append('  <section class="section">\n    <div class="container">\n'
                 '      <div class="section-head">\n'
                 '        <p class="eyebrow">Werdegang</p>\n'
                 "        <h1>%s</h1>\n" % e(ueberschrift))
    teile.append(render_text(einleitung, "cv-intro"))
    teile.append("\n      </div>\n    </div>\n  </section>\n")

    stationen = abschnitte.get("Stationen", [])
    karten = abschnitte.get("Infokasten", [])
    if stationen or karten:
        teile.append('  <section class="section section-alt">\n    <div class="container split">\n      <div>\n')
        if stationen:
            teile.append("        <h2>Stationen</h2>\n")
            teile.append('        <ol class="timeline">\n')
            teile.append(render_stationen(stationen))
            teile.append("\n        </ol>\n")
        teile.append("      </div>\n\n      <aside>\n")
        teile.append(render_karten(karten))
        teile.append("\n      </aside>\n    </div>\n  </section>\n")

    kenntnisse = abschnitte.get("Kenntnisse", [])
    schluss = abschnitte.get("Schluss", [])
    if kenntnisse or schluss:
        teile.append('  <section class="section">\n    <div class="container">\n')
        if kenntnisse:
            teile.append('      <div class="section-head">\n        <h2>Womit ich arbeite</h2>\n      </div>\n\n')
            teile.append('      <div class="skills">\n')
            teile.append(render_kenntnisse(kenntnisse))
            teile.append("\n      </div>\n")
        if schluss:
            teile.append("\n" + render_text(schluss, "cv-note") + "\n")
        teile.append("    </div>\n  </section>\n")

    teile.append(FUSS)
    return "".join(teile)


def main():
    if not QUELLE.is_file():
        print("Fehlt: %s" % QUELLE.relative_to(ROOT).as_posix(), file=sys.stderr)
        return 1

    abschnitte = parse(lies(QUELLE))
    ZIEL.write_text(baue(abschnitte), encoding="utf-8")

    print("%s aus %s gebaut" % (ZIEL.name, QUELLE.relative_to(ROOT).as_posix()))
    for name in ("Einleitung", "Stationen", "Infokasten", "Kenntnisse", "Schluss"):
        anzahl = len(abschnitte.get(name, []))
        print("  %-12s %d Eintrag/Eintraege" % (name, anzahl))
    unbekannt = [k for k in abschnitte
                 if k not in ("Einleitung", "Stationen", "Infokasten", "Kenntnisse", "Schluss")]
    for u in unbekannt:
        print("  ! Abschnitt '%s' kenne ich nicht - wird ignoriert" % u, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
