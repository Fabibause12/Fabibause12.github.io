#!/usr/bin/env python3
"""Liest den Ordner Bienen/ aus und schreibt Bienen/bienen.json.

Jedes Volk ist ein Unterordner:

    Bienen/
      Maria/
        text.txt        <- Eckdaten und Text
        tagebuch.txt    <- optional: eine Durchsicht pro Zeile
        text.en.txt     <- optional: Eckdaten und Text auf Englisch
        tagebuch.en.txt <- optional: Durchsichten auf Englisch (gleiche Daten)
        1.jpg           <- beliebig viele Bilder
        2.jpg

Die Bausteine (HEIC-Umwandlung, Verkleinern, Textkopf, Sortierung) kommen aus
build_pflanzen.py, damit es sie nur einmal gibt.

Aufruf:  python tools/build_bienen.py
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import build_pflanzen as basis

ROOT = Path(__file__).resolve().parent.parent
BIENEN_DIR = ROOT / "Bienen"
OUT_FILE = BIENEN_DIR / "bienen.json"

TAGEBUCH_NAMEN = ["tagebuch.txt", "durchsichten.txt", "log.txt"]
DATUM = re.compile(r"^\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{4}-\d{2}-\d{2})\s*[|;\t]\s*(.+)$")


def lies_zeilen(folder: Path, datei: Path, warnings: list):
    """Zeilen der Form 'Datum | Was war' als Liste von (datum, text)."""
    raus = []
    for nr, zeile in enumerate(basis.read_text(datei).splitlines(), 1):
        if not zeile.strip() or zeile.lstrip().startswith("#"):
            continue
        treffer = DATUM.match(zeile)
        if not treffer:
            warnings.append("%s/%s Zeile %d: kein 'Datum | Text' - uebersprungen"
                            % (folder.name, datei.name, nr))
            continue
        raus.append((treffer.group(1).strip(), treffer.group(2).strip()))
    return raus


def lies_tagebuch(folder: Path, warnings: list):
    """Zeilen der Form 'Datum | Was war' einlesen, juengste zuerst.

    Liegt daneben eine tagebuch.en.txt, wird jede Zeile ueber das Datum
    ihrer englischen Fassung zugeordnet.
    """
    datei = None
    for name in TAGEBUCH_NAMEN:
        p = folder / name
        if p.is_file():
            datei = p
            break
    if datei is None:
        return []

    englisch = {}
    en_datei = datei.with_name(datei.stem + ".en.txt")
    if en_datei.is_file():
        for datum, text in lies_zeilen(folder, en_datei, warnings):
            englisch[sortier_datum(datum)] = text

    eintraege = []
    for datum, text in lies_zeilen(folder, datei, warnings):
        eintrag = {"datum": datum, "text": text}
        en = englisch.pop(sortier_datum(datum), None)
        if en:
            eintrag["en"] = en
        eintraege.append(eintrag)
    for rest in englisch:
        warnings.append("%s/%s: %02d.%02d.%d steht nur in der englischen Fassung"
                        % (folder.name, en_datei.name, rest[2], rest[1], rest[0]))

    eintraege.sort(key=lambda e: sortier_datum(e["datum"]), reverse=True)
    return eintraege


def sortier_datum(text: str):
    """'17.05.2026' oder '2026-05-17' in etwas Sortierbares verwandeln."""
    teile = re.split(r"[.\-/]", text)
    try:
        zahlen = [int(t) for t in teile]
    except ValueError:
        return (0, 0, 0)
    if len(zahlen) != 3:
        return (0, 0, 0)
    if zahlen[0] > 31:                      # 2026-05-17
        jahr, monat, tag = zahlen
    else:                                   # 17.05.2026
        tag, monat, jahr = zahlen
        if jahr < 100:
            jahr += 2000
    return (jahr, monat, tag)


def collect(folder: Path, warnings: list):
    basis.wandle_heic(folder, warnings)
    basis.verkleinere(folder, warnings)

    images = sorted(
        [p for p in folder.iterdir()
         if p.is_file() and p.suffix.lower() in basis.IMAGE_EXT and not p.name.startswith(".")],
        key=lambda p: basis.natural_key(p.name),
    )

    meta, body = {}, ""
    txt = None
    kandidaten = [p for p in folder.iterdir()
                  if p.is_file() and p.suffix.lower() == ".txt"
                  and p.name.lower() not in TAGEBUCH_NAMEN
                  and not basis.ist_englisch(p)]
    if kandidaten:
        txt = basis.find_text_file(folder) if len(kandidaten) == 1 else sorted(
            kandidaten, key=lambda p: basis.natural_key(p.name))[0]
        for p in kandidaten:
            if p.name.lower() == "text.txt":
                txt = p
        meta, body = basis.parse_text(basis.read_text(txt))
    else:
        warnings.append(f"{folder.name}: keine .txt gefunden")

    if not images:
        warnings.append(f"{folder.name}: keine Bilder gefunden")
    for img in images:
        size = img.stat().st_size
        if size > basis.BIG_IMAGE_WARN:
            warnings.append(f"{folder.name}/{img.name}: {size / 1048576:.1f} MB - besser verkleinern")

    title = meta.pop("Titel", None) or meta.pop("Name", None) or folder.name.replace("_", " ")
    subtitle = meta.pop("Untertitel", None) or meta.pop("Kurz", None) or ""

    eintrag = {
        "slug": folder.name,
        "title": title,
        "subtitle": subtitle,
        "meta": meta,
        "text": body,
        "images": [basis.url_path(p) for p in images],
        "imageCount": len(images),
        "log": lies_tagebuch(folder, warnings),
    }
    en = basis.englisch(folder, txt, warnings, ("Title", "Titel", "Name"))
    if en:
        eintrag["en"] = en
    return eintrag


def main():
    warnings = []
    voelker = []

    if BIENEN_DIR.is_dir():
        folders = sorted([p for p in BIENEN_DIR.iterdir()
                          if p.is_dir()
                          and not p.name.startswith((".", "_"))
                          and p.name.lower() not in basis.IGNORIEREN],
                         key=lambda p: basis.natural_key(p.name))
        for p in sorted(BIENEN_DIR.iterdir()):
            if p.is_dir() and (p.name.startswith("_") or p.name.lower() in basis.IGNORIEREN):
                print("  (uebersprungen: %s)" % p.name)
        for folder in folders:
            voelker.append(collect(folder, warnings))
    else:
        BIENEN_DIR.mkdir(parents=True, exist_ok=True)
        warnings.append("Ordner Bienen/ war nicht vorhanden und wurde angelegt")

    data = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(voelker),
        "colonies": voelker,
    }
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"{OUT_FILE.relative_to(ROOT).as_posix()}: {len(voelker)} Volk/Voelker, "
          f"{sum(v['imageCount'] for v in voelker)} Bild(er)")
    for v in voelker:
        print(f"  - {v['title']:<24} {v['imageCount']} Bild(er), {len(v['log'])} Durchsicht(en)"
              + ("" if "en" in v else ", ohne englische Fassung"))
    for w in warnings:
        print(f"  ! {w}", file=sys.stderr)


if __name__ == "__main__":
    main()
