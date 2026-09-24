#!/usr/bin/env python3
"""Meldet die Seiten per IndexNow an Bing (und damit an ChatGPT, Copilot, ...).

Bing, Yandex, Seznam und Naver teilen sich IndexNow: eine Meldung reicht fuer alle.
Der Schluessel liegt als <schluessel>.txt im Hauptordner und muss online sein,
bevor gemeldet wird - also erst hochladen, ein paar Minuten warten, dann:

    python tools/indexnow.py

Gemeldet werden alle Adressen aus sitemap.xml plus llms.txt.
"""

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "fabibause12.github.io"
BASIS = "https://%s/" % HOST


def schluessel():
    for p in ROOT.glob("*.txt"):
        if re.fullmatch(r"[0-9a-f]{32}", p.stem) and p.read_text(encoding="utf-8").strip() == p.stem:
            return p.stem
    sys.exit("Keine IndexNow-Schluesseldatei (32 Hex-Zeichen .txt) im Hauptordner gefunden")


def adressen():
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>(.*?)</loc>", sitemap)
    return urls + [BASIS + "llms.txt"]


def main():
    key = schluessel()
    try:
        online = urllib.request.urlopen(BASIS + key + ".txt", timeout=20).read().decode().strip()
    except urllib.error.URLError as ex:
        sys.exit("Schluesseldatei ist noch nicht online (%s) - erst hochladen und warten" % ex)
    if online != key:
        sys.exit("Schluesseldatei online hat einen anderen Inhalt")

    urls = adressen()
    daten = json.dumps({"host": HOST, "key": key, "keyLocation": BASIS + key + ".txt",
                        "urlList": urls}).encode("utf-8")
    anfrage = urllib.request.Request("https://api.indexnow.org/indexnow", data=daten,
                                     headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        antwort = urllib.request.urlopen(anfrage, timeout=30)
        print("IndexNow: %d Adressen gemeldet (HTTP %d)" % (len(urls), antwort.status))
    except urllib.error.HTTPError as ex:
        sys.exit("IndexNow lehnt ab: HTTP %d %s" % (ex.code, ex.read().decode("utf-8", "replace")[:200]))


if __name__ == "__main__":
    main()
