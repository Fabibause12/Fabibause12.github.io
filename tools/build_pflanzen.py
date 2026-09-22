#!/usr/bin/env python3
"""Liest den Ordner Pflanzen/ aus und schreibt Pflanzen/pflanzen.json.

Jede Pflanze ist ein Unterordner:

    Pflanzen/
      Monstera/
        text.txt      <- Text, der auf der Seite steht
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
TEXT_PRIO = ["text.txt", "info.txt", "beschreibung.txt", "pflanze.txt"]
BIG_IMAGE_WARN = 3 * 1024 * 1024


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


def find_text_file(folder: Path):
    txts = sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".txt"],
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


def collect(folder: Path, warnings: list):
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

    return {
        "slug": folder.name,
        "title": title,
        "subtitle": subtitle,
        "latin": latin,
        "meta": meta,
        "text": body,
        "images": [url_path(p) for p in images],
        "imageCount": len(images),
    }


def main():
    warnings = []
    plants = []

    if PFLANZEN_DIR.is_dir():
        folders = sorted([p for p in PFLANZEN_DIR.iterdir()
                          if p.is_dir() and not p.name.startswith((".", "_"))],
                         key=lambda p: natural_key(p.name))
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
        print(f"  - {p['title']:<24} {p['imageCount']} Bild(er)")
    for w in warnings:
        print(f"  ! {w}", file=sys.stderr)


if __name__ == "__main__":
    main()
