#!/usr/bin/env python3
"""Baut die englischen Seiten (index-en.html, pflanzen-en.html, ...) und die sitemap.xml.

Die deutschen Seiten tragen ihre englischen Texte schon in sich (data-en="..."),
der Sprachknopf tauscht sie im Browser aus. Suchmaschinen sehen davon aber nur
die deutsche Fassung. Dieses Skript schreibt deshalb zu jeder Seite eine
eigenstaendige englische Kopie mit eigener Adresse:

  - Inhalte mit data-en werden gleich englisch hineingeschrieben,
    das deutsche Original bleibt in data-de fuer den Sprachknopf erhalten
  - <html lang="en">, og:locale, canonical und og:url zeigen auf die -en-Seite
  - Links auf andere Seiten zeigen auf deren englische Fassung

Die -en-Dateien werden erzeugt, nicht von Hand bearbeitet. Nach dem Hochladen
erledigt das die GitHub-Action; lokal:

    python tools/build_englisch.py

(werdegang.html vorher mit build_werdegang.py bauen.)
"""

import html
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASIS = "https://fabibause12.github.io/"

SEITEN = ["index.html", "pflanzen.html", "bienen.html", "werdegang.html",
          "wuerfel.html", "impressum.html"]
ATTRIBUTE = ["aria-label", "alt", "title", "placeholder", "label", "content"]
LEER = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "source", "track", "wbr"}

LINK = re.compile(r'^(\./|/)?(%s)\.html(?=$|[#?])' % "|".join(s[:-5] for s in SEITEN))


def englisch_name(seite: str) -> str:
    return seite[:-5] + "-en.html"


def url(seite: str, en: bool) -> str:
    if seite == "index.html" and not en:
        return BASIS
    return BASIS + (englisch_name(seite) if en else seite)


def link_umbiegen(href: str) -> str:
    """./pflanzen.html#x -> ./pflanzen-en.html#x, externe Links bleiben."""
    return LINK.sub(lambda m: (m.group(1) or "") + m.group(2) + "-en.html", href)


def links_im_html(text: str) -> str:
    return re.sub(r'href="([^"]*)"', lambda m: 'href="%s"' % link_umbiegen(m.group(1)), text)


def tag_text(tag, attrs, ende=""):
    teile = [tag]
    for name, wert in attrs:
        teile.append(name if wert is None else '%s="%s"' % (name, html.escape(wert, quote=True)))
    return "<" + " ".join(teile) + ende + ">"


class Uebersetzer(HTMLParser):
    """Liest eine deutsche Seite und schreibt sie englisch wieder heraus."""

    def __init__(self, seite):
        super().__init__(convert_charrefs=False)
        self.seite = seite
        self.raus = []
        self.offen = None          # Element mit data-en, dessen Inhalt gerade ersetzt wird

    # --- Ausgabe: entweder direkt oder in den Puffer des offenen data-en-Elements ---
    def schreib(self, text):
        if self.offen is not None:
            self.offen["puffer"].append(text)
        else:
            self.raus.append(text)

    def attribute(self, tag, attrs):
        werte = dict(attrs)
        neu = []
        for name, wert in attrs:
            if name in ATTRIBUTE and ("data-en-" + name) in werte:
                neu.append(("data-de-" + name, wert))
                wert = werte["data-en-" + name]
            elif tag == "html" and name == "lang":
                wert = "en"
            elif tag == "meta" and name == "content" and werte.get("property") == "og:locale":
                wert = "en_US"
            elif tag == "meta" and name == "content" and werte.get("property") == "og:url":
                wert = url(self.seite, True)
            elif tag == "link" and name == "href" and werte.get("rel") == "canonical":
                wert = url(self.seite, True)
            elif name == "href" and wert and tag == "a":
                wert = link_umbiegen(wert)
            neu.append((name, wert))
        return neu

    def handle_starttag(self, tag, attrs):
        if self.offen is not None:
            self.schreib(self.get_starttag_text())
            if tag not in LEER:
                self.offen["tiefe"] += 1
            return
        werte = dict(attrs)
        attrs = self.attribute(tag, attrs)
        if "data-en" in werte and tag not in LEER:
            self.offen = {"tag": tag, "attrs": attrs, "en": werte["data-en"], "puffer": [], "tiefe": 1}
            return
        self.schreib(tag_text(tag, attrs))

    def handle_startendtag(self, tag, attrs):
        if self.offen is not None:
            self.schreib(self.get_starttag_text())
        else:
            self.schreib(tag_text(tag, self.attribute(tag, attrs), "/"))

    def handle_endtag(self, tag):
        if self.offen is not None:
            self.offen["tiefe"] -= 1
            if self.offen["tiefe"] > 0:
                self.schreib("</%s>" % tag)
                return
            o, self.offen = self.offen, None
            deutsch = "".join(o["puffer"])
            attrs = [a for a in o["attrs"] if a[0] != "data-de"] + [("data-de", deutsch)]
            self.raus.append(tag_text(o["tag"], attrs) + links_im_html(o["en"]) + "</%s>" % tag)
            return
        self.schreib("</%s>" % tag)

    def handle_data(self, data):
        self.schreib(data)

    def handle_entityref(self, name):
        self.schreib("&%s;" % name)

    def handle_charref(self, name):
        self.schreib("&#%s;" % name)

    def handle_comment(self, data):
        self.schreib("<!--%s-->" % data)

    def handle_decl(self, decl):
        self.schreib("<!%s>" % decl)

    def ergebnis(self):
        if self.offen is not None:
            raise ValueError("<%s data-en> wird nicht geschlossen" % self.offen["tag"])
        return "".join(self.raus)


KOPFZEILE = ("<!-- Erzeugt von tools/build_englisch.py aus {quelle} - nicht von Hand bearbeiten,\n"
             "     Aenderungen gehen beim naechsten Bauen verloren. -->\n")


def uebersetze(seite: str) -> str:
    quelle = (ROOT / seite).read_text(encoding="utf-8")
    p = Uebersetzer(seite)
    p.feed(quelle)
    p.close()
    text = p.ergebnis()
    return text.replace("<head>", "<head>\n" + KOPFZEILE.format(quelle=seite).rstrip("\n"), 1)


def sitemap(seiten):
    # Ohne <lastmod>: sonst aendert sich die Datei bei jedem Bauen.
    zeilen =['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
              '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for seite in seiten:
        for en in (False, True):
            zeilen += ["  <url>",
                       "    <loc>%s</loc>" % url(seite, en),
                       '    <xhtml:link rel="alternate" hreflang="de" href="%s"/>' % url(seite, False),
                       '    <xhtml:link rel="alternate" hreflang="en" href="%s"/>' % url(seite, True),
                       "  </url>"]
    zeilen.append("</urlset>")
    return "\n".join(zeilen) + "\n"


def main():
    fertig = []
    for seite in SEITEN:
        if not (ROOT / seite).is_file():
            print("  ! %s fehlt - uebersprungen" % seite, file=sys.stderr)
            continue
        ziel = ROOT / englisch_name(seite)
        ziel.write_text(uebersetze(seite), encoding="utf-8")
        fertig.append(seite)
        print("%s -> %s" % (seite, ziel.name))

    (ROOT / "sitemap.xml").write_text(sitemap(fertig), encoding="utf-8")
    print("sitemap.xml: %d Adressen" % (2 * len(fertig)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
