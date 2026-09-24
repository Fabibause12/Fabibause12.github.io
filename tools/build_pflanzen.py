#!/usr/bin/env python3
"""Liest den Ordner Pflanzen/ aus und schreibt Pflanzen/pflanzen.json.

Jede Pflanze ist ein Unterordner:

    Pflanzen/
      Monstera/
        text.txt      <- Text, der auf der Seite steht
        text.en.txt   <- optional: dasselbe auf Englisch
        1.jpg         <- beliebig viele Bilder
        2.jpg

Aufruf:  python tools/build_pflanzen.py
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
PFLANZEN_DIR = ROOT / "Pflanzen"
OUT_FILE = PFLANZEN_DIR / "pflanzen.json"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".svg"}
HEIC_EXT = {".heic", ".heif"}
IGNORIEREN = {"vorlage", "template", "beispiel", "muster"}
MAX_KANTE = 2000
TEXT_PRIO = ["text.txt", "info.txt", "beschreibung.txt", "pflanze.txt"]
BIG_IMAGE_WARN = 3 * 1024 * 1024
ZU_GROSS = 1024 * 1024          # darueber wird neu komprimiert


def natural_key(name: str):
    """1.jpg, 2.jpg, 10.jpg statt 1, 10, 2."""
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", name)]


def url_path(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    return "/".join(quote(part) for part in rel.split("/"))


def read_text(path: Path) -> str:
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    return path.read_bytes().decode("utf-8", errors="replace")


def parse_text(raw: str):
    """Optionaler Kopf mit 'Schluessel: Wert' vor einer Zeile aus ---, danach Freitext."""
    meta, body = {}, raw
    lines = raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    sep = None
    for i, line in enumerate(lines[:30]):
        if re.fullmatch(r"-{3,}", line.strip()):
            sep = i
            break

    if sep is not None:
        head = lines[:sep]
        if all(not l.strip() or re.match(r"^[^:\n]{1,40}:", l) for l in head):
            for line in head:
                if ":" in line:
                    k, v = line.split(":", 1)
                    k, v = k.strip(), v.strip()
                    if k and v:
                        meta[k] = v
            body = "\n".join(lines[sep + 1:])

    return meta, body.strip()


def ist_englisch(path: Path) -> bool:
    """text.en.txt, tagebuch.en.txt ... sind die englischen Fassungen."""
    return path.name.lower().endswith(".en.txt")


def find_text_file(folder: Path):
    txts = sorted([p for p in folder.iterdir()
                   if p.is_file() and p.suffix.lower() == ".txt" and not ist_englisch(p)],
                  key=lambda p: natural_key(p.name))
    if not txts:
        return None
    for prio in TEXT_PRIO:
        for p in txts:
            if p.name.lower() == prio:
                return p
    for p in txts:
        if p.stem.lower() == folder.name.lower():
            return p
    return txts[0]


def englisch(folder: Path, txt, warnings: list, titel_keys=("Title", "Titel")):
    """Englische Fassung zur deutschen .txt lesen, z. B. text.en.txt neben text.txt.

    Aufbau wie das Original. Die Stichwoerter duerfen englisch sein (Light,
    Watering, ...), sie erscheinen so in der Tabelle. Titel, Untertitel und
    Text sind optional - was fehlt, zeigt die Seite auf Deutsch.
    """
    if txt is None:
        return None
    kandidat = txt.with_name(txt.stem + ".en.txt")
    if not kandidat.is_file():
        treffer = [p for p in folder.iterdir()
                   if p.is_file() and p.name.lower() == txt.stem.lower() + ".en.txt"]
        if not treffer:
            return None
        kandidat = treffer[0]

    meta, body = parse_text(read_text(kandidat))
    title = ""
    for k in titel_keys:
        title = title or meta.pop(k, "")
    subtitle = ""
    for k in ("Subtitle", "Untertitel", "Short", "Kurz"):
        subtitle = subtitle or meta.pop(k, "")
    for k in ("Latin", "Lateinisch", "Botanical", "Botanisch"):
        meta.pop(k, None)          # der botanische Name ist in jeder Sprache gleich

    if not (title or subtitle or meta or body):
        warnings.append("%s/%s ist leer" % (folder.name, kandidat.name))
        return None
    return {"title": title, "subtitle": subtitle, "meta": meta, "text": body}


def wandle_heic(folder: Path, warnings: list):
    """iPhone-Fotos (.heic) in .jpg umwandeln - Browser koennen HEIC nicht anzeigen."""
    heics = [p for p in folder.iterdir()
             if p.is_file() and p.suffix.lower() in HEIC_EXT and not p.name.startswith(".")]
    if not heics:
        return

    try:
        from PIL import Image, ImageOps
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        warnings.append("%s: %d HEIC-Datei(en) gefunden, aber pillow-heif fehlt "
                        "(pip install pillow-heif). Browser koennen HEIC nicht anzeigen!"
                        % (folder.name, len(heics)))
        return

    for quelle in heics:
        ziel = quelle.with_suffix(".jpg")
        if ziel.exists() and ziel.stat().st_mtime >= quelle.stat().st_mtime:
            continue
        try:
            with Image.open(quelle) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im.thumbnail((MAX_KANTE, MAX_KANTE), Image.LANCZOS)
                im.save(ziel, "JPEG", quality=82, optimize=True, progressive=True)
            print("  ~ %s -> %s (%.1f MB -> %.1f MB)"
                  % (quelle.name, ziel.name,
                     quelle.stat().st_size / 1048576, ziel.stat().st_size / 1048576))
        except Exception as ex:
            warnings.append("%s/%s: Umwandlung fehlgeschlagen (%s)" % (folder.name, quelle.name, ex))


def verkleinere(folder: Path, warnings: list):
    """Grosse JPGs auf MAX_KANTE und Qualitaet 82 bringen, damit das Handy nicht ewig laedt.

    Neu gespeichert wird nur, wenn das Bild zu gross ist UND dabei deutlich
    kleiner wird - so wird ein schon verkleinertes Bild nicht bei jedem
    Bauen erneut komprimiert.
    """
    jpgs = [p for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg") and not p.name.startswith(".")]
    if not jpgs:
        return

    try:
        from PIL import Image, ImageOps
    except ImportError:
        warnings.append("%s: Pillow fehlt (pip install Pillow), Bilder werden nicht verkleinert"
                        % folder.name)
        return

    import io
    for bild in jpgs:
        vorher = bild.stat().st_size
        try:
            with Image.open(bild) as im:
                zu_breit = max(im.size) > MAX_KANTE
                if not zu_breit and vorher <= ZU_GROSS:
                    continue
                im = ImageOps.exif_transpose(im).convert("RGB")
                im.thumbnail((MAX_KANTE, MAX_KANTE), Image.LANCZOS)
                puffer = io.BytesIO()
                im.save(puffer, "JPEG", quality=82, optimize=True, progressive=True)
        except Exception as ex:
            warnings.append("%s/%s: Verkleinern fehlgeschlagen (%s)" % (folder.name, bild.name, ex))
            continue

        nachher = puffer.tell()
        if zu_breit or nachher < vorher * 0.8:
            bild.write_bytes(puffer.getvalue())
            print("  ~ %s verkleinert (%.1f MB -> %.1f MB)"
                  % (bild.name, vorher / 1048576, nachher / 1048576))


def collect(folder: Path, warnings: list):
    wandle_heic(folder, warnings)
    verkleinere(folder, warnings)

    images = sorted(
        [p for p in folder.iterdir()
         if p.is_file() and p.suffix.lower() in IMAGE_EXT and not p.name.startswith(".")],
        key=lambda p: natural_key(p.name),
    )

    meta, body = {}, ""
    txt = find_text_file(folder)
    if txt:
        meta, body = parse_text(read_text(txt))
    else:
        warnings.append(f"{folder.name}: keine .txt gefunden")

    if not images:
        warnings.append(f"{folder.name}: keine Bilder gefunden")
    for img in images:
        size = img.stat().st_size
        if size > BIG_IMAGE_WARN:
            warnings.append(f"{folder.name}/{img.name}: {size / 1048576:.1f} MB - besser verkleinern")

    title = meta.pop("Titel", None) or meta.pop("Title", None) or folder.name.replace("_", " ")
    subtitle = meta.pop("Untertitel", None) or meta.pop("Kurz", None) or ""
    latin = meta.pop("Lateinisch", None) or meta.pop("Botanisch", None) or ""

    eintrag = {
        "slug": folder.name,
        "title": title,
        "subtitle": subtitle,
        "latin": latin,
        "meta": meta,
        "text": body,
        "images": [url_path(p) for p in images],
        "imageCount": len(images),
    }
    en = englisch(folder, txt, warnings)
    if en:
        eintrag["en"] = en
    return eintrag


def main():
    warnings = []
    plants = []

    if PFLANZEN_DIR.is_dir():
        folders = sorted([p for p in PFLANZEN_DIR.iterdir()
                          if p.is_dir()
                          and not p.name.startswith((".", "_"))
                          and p.name.lower() not in IGNORIEREN],
                         key=lambda p: natural_key(p.name))
        for p in sorted(PFLANZEN_DIR.iterdir()):
            if p.is_dir() and (p.name.startswith("_") or p.name.lower() in IGNORIEREN):
                print("  (uebersprungen: %s)" % p.name)
        for folder in folders:
            plants.append(collect(folder, warnings))
    else:
        PFLANZEN_DIR.mkdir(parents=True, exist_ok=True)
        warnings.append("Ordner Pflanzen/ war nicht vorhanden und wurde angelegt")

    data = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(plants),
        "plants": plants,
    }
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"{OUT_FILE.relative_to(ROOT).as_posix()}: {len(plants)} Pflanze(n), "
          f"{sum(p['imageCount'] for p in plants)} Bild(er)")
    for p in plants:
        print(f"  - {p['title']:<24} {p['imageCount']} Bild(er)"
              + ("" if "en" in p else ", ohne englische Fassung"))
    for w in warnings:
        print(f"  ! {w}", file=sys.stderr)


if __name__ == "__main__":
    main()
