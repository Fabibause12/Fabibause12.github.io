#!/usr/bin/env python3
"""Uebertraegt die Stockkarten aus Obsidian in den Ordner Bienen/.

Jede Notiz im Obsidian-Ordner ist ein Volk (Dateiname = Name des Volks).
Notizen, die mit '_' anfangen, und Notizen mit 'website: false' im Kopf
werden uebersprungen.

Was aus einer Notiz gelesen wird:

    ## Steckbrief        - Schluessel: Wert   -> Eckdaten in text.txt
    ## Website-Text      Absaetze             -> Fliesstext in text.txt
    ## Bilder            ![[foto.jpg]]        -> wird nach Bienen/<Volk>/ kopiert
    Tabellen mit einer Spalte 'Datum'         -> tagebuch.txt und ereignisse.txt

Spalten der Tabelle (Reihenfolge egal, fehlende sind ok):
    Datum | Wetter | Füttern | Milben | Was vorgefunden | Massnahmen | Website

Tagebuch:
  - Steht in 'Website' ein Text, kommt genau der auf die Seite.
  - Steht dort '-', bleibt die Zeile privat.
  - Sonst bleibt ein schon vorhandener Eintrag fuer dieses Datum stehen, und fuer
    neue Daten wird ein Text aus den anderen Spalten zusammengesetzt.
  - Zeilen mit einem Datum in der Zukunft landen nur im Balken, nicht im Tagebuch.

Ereignisse fuer den Balken:
  - Tags in einer beliebigen Zelle: #schwarm #koenigin #behandlung #restentmilbung
    (#fuetterung und #milben gehen auch). Der Text danach ist die Beschriftung,
    'bis 05.10.2026' macht daraus einen Zeitraum.
  - Fuetterungen und Milbenzaehlungen kommen automatisch aus ihren Spalten
    (Fuetterungen mit weniger als zwei Wochen Abstand werden ein Band), ausser
    sie sind schon per Tag eingetragen.

Aufruf:  python tools/obsidian_bienen.py "<Obsidian-Ordner mit den Voelkern>" [--probe]
"""

import argparse
import re
import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIENEN_DIR = ROOT / "Bienen"

TAGS = {
    "schwarm": "schwarm",
    "koenigin": "koenigin", "königin": "koenigin",
    "fuetterung": "fuetterung", "fütterung": "fuetterung",
    "behandlung": "behandlung",
    "milben": "milben",
    "restentmilbung": "restentmilbung",
}
NAMEN = {
    "schwarm": "Schwarm", "koenigin": "Königin", "fuetterung": "Fütterung",
    "behandlung": "Behandlung", "milben": "Milben gezählt", "restentmilbung": "Restentmilbung",
}
SPALTEN = [
    ("website", ("website", "webseite")),
    ("datum", ("datum",)),
    ("wetter", ("wetter",)),
    ("futter", ("fütter", "futter", "fuetter")),
    ("milben", ("milbe",)),
    ("gefunden", ("vorgefunden", "gefunden", "befund")),
    ("massnahmen", ("massnahm", "maßnahm", "maßname", "massname")),
]
FUETTER_LUECKE = 14   # Tage: Fuetterungen mit kleinerem Abstand werden ein Band
TAG_RE = re.compile(r"#([A-Za-zÄÖÜäöüß]+)")
DATUM_RE = re.compile(r"^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$")
ISO_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
BIS_RE = re.compile(r"\bbis\s+(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))\b", re.I)


# ---------- kleine Helfer ----------

def als_datum(text):
    text = (text or "").strip().rstrip(".")
    m = DATUM_RE.match(text)
    if m:
        tag, monat, jahr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if jahr < 100:
            jahr += 2000
    else:
        m = ISO_RE.match(text)
        if not m:
            return None
        jahr, monat, tag = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return date(jahr, monat, tag)
    except ValueError:
        return None


def fmt(d):
    return d.strftime("%d.%m.%Y")


def leer(text):
    return not text or text.strip() in ("", "-", "–")


def sauber(text):
    """Obsidian-Formatierung aus einer Zelle entfernen."""
    text = re.sub(r"<br\s*/?>", "\n", text or "", flags=re.I)
    text = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", text)
    text = TAG_RE.sub("", text)
    text = text.replace("==", "").replace("**", "").replace("__", "")
    text = re.sub(r"(?<!\w)[*_](\S[^*_]*?)[*_](?!\w)", r"\1", text)
    zeilen = [re.sub(r"\s+", " ", z).strip(" ;,") for z in text.split("\n")]
    return ", ".join(z for z in zeilen if z)


def satz(text):
    text = text.strip()
    if text and text[-1] not in ".!?":
        text += "."
    return text[:1].upper() + text[1:]


# ---------- Notiz lesen ----------

def ohne_kopf(text):
    """Frontmatter abtrennen: (kopf als dict, rest)."""
    kopf = {}
    if text.startswith("---"):
        ende = text.find("\n---", 3)
        if ende != -1:
            for zeile in text[3:ende].splitlines():
                if ":" in zeile and not zeile.startswith(" "):
                    k, v = zeile.split(":", 1)
                    kopf[k.strip().lower()] = v.strip()
            text = text[ende + 4:]
    return kopf, text


def abschnitte(text):
    """'## Ueberschrift' -> Zeilen darunter (bis zur naechsten Ueberschrift gleicher Ebene)."""
    raus, name = {}, None
    for zeile in text.splitlines():
        m = re.match(r"^#{1,3}\s+(.+?)\s*$", zeile)
        if m:
            name = m.group(1).strip().lower()
            raus.setdefault(name, [])
        elif name is not None:
            raus[name].append(zeile)
    return raus


def zellen(zeile):
    zeile = zeile.strip()
    if zeile.startswith("|"):
        zeile = zeile[1:]
    if zeile.endswith("|"):
        zeile = zeile[:-1]
    return [z.strip() for z in zeile.split("|")]


def tabellen(text):
    """Alle Tabellen mit einer Spalte 'Datum' als Liste von dicts."""
    zeilen = text.splitlines()
    reihen = []
    i = 0
    while i < len(zeilen):
        z = zeilen[i].strip()
        if z.startswith("|") and i + 1 < len(zeilen) and re.match(r"^\|?\s*:?-{3,}", zeilen[i + 1].strip()):
            kopf = [k.lower() for k in zellen(z)]
            index = {}
            for schluessel, muster in SPALTEN:
                for n, k in enumerate(kopf):
                    if n not in index.values() and any(mu in k for mu in muster):
                        index[schluessel] = n
                        break
            i += 2
            while i < len(zeilen) and zeilen[i].strip().startswith("|"):
                if "datum" in index:
                    teile = zellen(zeilen[i])
                    reihe = {k: (teile[n] if n < len(teile) else "") for k, n in index.items()}
                    reihe["_roh"] = teile
                    d = als_datum(reihe["datum"])
                    if d:
                        reihe["datum"] = d
                        reihen.append(reihe)
                i += 1
        else:
            i += 1
    return reihen


# ---------- Tagebuch und Ereignisse ----------

def auto_text(reihe):
    teile = [sauber(reihe.get(k, "")) for k in ("wetter", "gefunden", "massnahmen")]
    teile = [satz(t) for t in teile if not leer(t)]
    if not leer(reihe.get("futter")):
        teile.append("Gefüttert: " + satz(sauber(reihe["futter"])))
    if not leer(reihe.get("milben")):
        teile.append("Milben: " + satz(sauber(reihe["milben"])))
    return " ".join(teile)


def tag_ereignisse(reihe):
    raus = []
    for zelle in reihe["_roh"]:
        for stueck in re.split(r"<br\s*/?>", zelle, flags=re.I):
            treffer = list(TAG_RE.finditer(stueck))
            for n, m in enumerate(treffer):
                art = TAGS.get(m.group(1).lower())
                if not art:
                    continue
                ende = treffer[n + 1].start() if n + 1 < len(treffer) else len(stueck)
                text = stueck[m.end():ende]
                bis = None
                b = BIS_RE.search(text)
                if b:
                    bis = als_datum(b.group(1))
                    text = text[:b.start()] + text[b.end():]
                text = sauber(text) or NAMEN[art]
                raus.append({"von": reihe["datum"], "bis": bis, "art": art, "text": text})
    return raus


def fuetterungen(reihen, schon):
    """Fuetterungen aus der Spalte, ausser sie liegen in einem Zeitraum, der per Tag kam."""
    def abgedeckt(d):
        return any(e["von"] <= d <= (e["bis"] or e["von"]) for e in schon)
    gaben = [r for r in reihen if not leer(r.get("futter")) and not abgedeckt(r["datum"])]
    gruppen = []
    for r in gaben:
        if gruppen and (r["datum"] - gruppen[-1][-1]["datum"]).days <= FUETTER_LUECKE:
            gruppen[-1].append(r)
        else:
            gruppen.append([r])
    raus = []
    for g in gruppen:
        winter = any(re.search(r"\b(2:1|3:2)\b", r["futter"]) for r in g)
        text = ("Winterfütterung" if winter else "Fütterung")
        text += ", %d Gaben" % len(g) if len(g) > 1 else ": " + sauber(g[0]["futter"])
        raus.append({"von": g[0]["datum"], "bis": g[-1]["datum"] if len(g) > 1 else None,
                     "art": "fuetterung", "text": text})
    return raus


def lies_alte_zeilen(datei):
    """Vorhandene 'Datum | ...'-Zeilen einer Datei: datum -> Liste der Felder."""
    alt = {}
    if datei.is_file():
        for zeile in datei.read_text(encoding="utf-8-sig").splitlines():
            if not zeile.strip() or zeile.lstrip().startswith("#"):
                continue
            teile = [t.strip() for t in zeile.split("|")]
            alt.setdefault(teile[0], []).append(teile[1:])
    return alt


def schreibe(datei, text, probe, meldungen):
    alt = datei.read_text(encoding="utf-8-sig") if datei.is_file() else None
    if alt is not None and alt.replace("\r\n", "\n") == text:
        return
    meldungen.append(("neu: " if alt is None else "geändert: ") + datei.relative_to(ROOT).as_posix())
    if not probe:
        datei.parent.mkdir(parents=True, exist_ok=True)
        datei.write_text(text, encoding="utf-8", newline="\r\n")


def volk(notiz, vault, probe, meldungen):
    kopf, text = ohne_kopf(notiz.read_text(encoding="utf-8-sig"))
    ziel = BIENEN_DIR / notiz.stem
    heute = date.today()
    teile = abschnitte(text)
    reihen = sorted(tabellen(text), key=lambda r: r["datum"])

    # text.txt
    steckbrief = [re.sub(r"^[-*]\s+", "", z).strip() for z in teile.get("steckbrief", []) if ":" in z]
    absaetze = "\n".join(teile.get("website-text", [])).strip()
    absaetze = re.sub(r"%%.*?%%", "", absaetze, flags=re.S).strip()
    if steckbrief or absaetze:
        inhalt = "Titel: %s\n" % notiz.stem + "".join(z + "\n" for z in steckbrief)
        schreibe(ziel / "text.txt", inhalt + "---\n" + absaetze + "\n", probe, meldungen)
    elif not (ziel / "text.txt").exists():
        schreibe(ziel / "text.txt", "Titel: %s\n---\n" % notiz.stem, probe, meldungen)

    # Tagebuch
    datei = ziel / "tagebuch.txt"
    alt = {k: " ".join(v[0]) for k, v in lies_alte_zeilen(datei).items()}
    log = dict(alt)
    for r in reihen:
        if r["datum"] > heute:
            continue
        schluessel = fmt(r["datum"])
        eigen = r.get("website", "")
        if eigen.strip() in ("-", "–"):
            log.pop(schluessel, None)
            continue
        if not leer(eigen):
            neu = satz(sauber(eigen))
        elif schluessel in alt:
            continue
        else:
            neu = auto_text(r)
        if neu:
            # zwei Zeilen am selben Tag werden zusammengelegt
            log[schluessel] = (log[schluessel] + " " + neu) if schluessel in log and schluessel not in alt else neu
    zeilen = sorted(log.items(), key=lambda kv: als_datum(kv[0]) or date.min)
    schreibe(datei,
             "# Eine Durchsicht pro Zeile:  Datum | Was war\n"
             "# Wird aus Obsidian erzeugt (tools/obsidian_bienen.py). Vorhandene Zeilen bleiben stehen.\n\n"
             + "".join("%s | %s\n" % kv for kv in zeilen), probe, meldungen)

    # Ereignisse
    ereignisse = []
    explizit = set()
    for r in reihen:
        for e in tag_ereignisse(r):
            ereignisse.append(e)
            explizit.add((e["art"], e["von"]))
    ereignisse += fuetterungen(reihen, [e for e in ereignisse if e["art"] == "fuetterung"])
    for r in reihen:
        if not leer(r.get("milben")) and ("milben", r["datum"]) not in explizit:
            ereignisse.append({"von": r["datum"], "bis": None, "art": "milben", "text": sauber(r["milben"])})
    ereignisse.sort(key=lambda e: (e["von"], e["art"]))

    datei = ziel / "ereignisse.txt"
    englisch = {}
    for datum, felder in lies_alte_zeilen(datei).items():
        for f in felder:
            if len(f) >= 3:
                englisch[(datum.split("-")[0].strip(), f[0])] = f[2]
    zeilen = []
    for e in ereignisse:
        wann = fmt(e["von"]) + (" - " + fmt(e["bis"]) if e["bis"] and e["bis"] > e["von"] else "")
        zeile = "%s | %s | %s" % (wann, e["art"], e["text"].replace("|", "/"))
        en = englisch.get((fmt(e["von"]), e["art"]))
        zeilen.append(zeile + (" | " + en if en else "") + "\n")
    schreibe(datei,
             "# Ereignisse für den Bienenjahr-Balken:  Datum[ - Datum] | Art | Text | English (optional)\n"
             "# Wird aus Obsidian erzeugt (tools/obsidian_bienen.py) - Änderungen bitte dort machen.\n\n"
             + "".join(zeilen), probe, meldungen)

    # Bilder
    bilder = re.sub(r"%%.*?%%", "", "\n".join(teile.get("bilder", [])), flags=re.S)
    for z in bilder.splitlines():
        for name in re.findall(r"!\[\[([^|\]]+)", z) + re.findall(r"!\[[^\]]*\]\(([^)]+)\)", z):
            name = Path(name.strip()).name
            if (ziel / name).exists():
                continue
            quelle = next((p for p in vault.rglob(name) if p.is_file()), None)
            if quelle is None:
                meldungen.append("! Bild nicht gefunden: %s (%s)" % (name, notiz.name))
                continue
            meldungen.append("neu: " + (ziel / name).relative_to(ROOT).as_posix())
            if not probe:
                ziel.mkdir(parents=True, exist_ok=True)
                shutil.copy2(quelle, ziel / name)

    return len(reihen)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("ordner", help="Obsidian-Ordner mit einer Notiz pro Volk")
    ap.add_argument("--vault", help="Wurzel des Vaults (fuer Bilder), Standard: Ordner mit .obsidian darueber")
    ap.add_argument("--probe", action="store_true", help="nur zeigen, was sich aendern wuerde")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ordner = Path(args.ordner).expanduser().resolve()
    if not ordner.is_dir():
        sys.exit("Ordner nicht gefunden: %s" % ordner)
    vault = Path(args.vault).resolve() if args.vault else next(
        (p for p in [ordner, *ordner.parents] if (p / ".obsidian").is_dir()), ordner)

    meldungen = []
    for notiz in sorted(ordner.glob("*.md")):
        if notiz.name.startswith(("_", ".")):
            continue
        kopf, _ = ohne_kopf(notiz.read_text(encoding="utf-8-sig"))
        if kopf.get("website", "").lower() in ("false", "nein", "no"):
            print("  (übersprungen: %s)" % notiz.stem)
            continue
        n = volk(notiz, vault, args.probe, meldungen)
        print("  - %-20s %d Zeilen in der Stockkarte" % (notiz.stem, n))

    for m in meldungen:
        print("    " + m)
    if not meldungen:
        print("    Website ist schon auf dem Stand von Obsidian.")


if __name__ == "__main__":
    main()
