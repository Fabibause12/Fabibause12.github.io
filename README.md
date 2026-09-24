# fabibause12.github.io

Persönliche Webseite von **Fabian Bammes**, Experimentalphysiker (Elektronenoptik) am
Lehrstuhl für Laserphysik der FAU Erlangen-Nürnberg.

**Live:** <https://fabibause12.github.io> · English: <https://fabibause12.github.io/index-en.html>
· Werdegang / CV: [Deutsch](https://fabibause12.github.io/werdegang.html) ·
[English](https://fabibause12.github.io/werdegang-en.html) ·
ORCID: [0009-0009-8834-6500](https://orcid.org/0009-0009-8834-6500)

Fachlich steht alles im Werdegang. Der Rest ist ein privates Nebenprojekt: Pflanzen
zum Abholen, ein Bienenvolk mit Tagebuch und ein paar Würfelspiele – alles in
reinem HTML, CSS und JavaScript, ohne Framework und ohne Build-Werkzeug im Browser.

## Was es gibt

| Seite | Inhalt | Quelle |
|---|---|---|
| `index.html` | Startseite | von Hand |
| `werdegang.html` | Werdegang, Veröffentlichungen, Kenntnisse | erzeugt aus `Werdegang/werdegang.txt` |
| `pflanzen.html` | Pflanzen mit Galerie | lädt `Pflanzen/pflanzen.json` |
| `bienen.html` | Bienenvolk Maria mit Durchsichten | lädt `Bienen/bienen.json` |
| `wuerfel.html` | Kniffel, Mäxchen, Würfelbecher | von Hand, Logik in `js/wuerfel.js` |
| `impressum.html`, `404.html` | Kleingedrucktes | von Hand |

Jede Seite gibt es auf Deutsch und Englisch. Der Knopf **EN/DE** oben rechts schaltet
um, merkt sich die Wahl und wechselt auch die Adresse (`pflanzen.html` ↔
`pflanzen-en.html`). Hell/Dunkel funktioniert genauso.

## Inhalte ändern

Fast alles wird aus einfachen Textdateien gebaut – HTML muss man dafür nicht anfassen.

- **Pflanzen:** ein Ordner pro Pflanze in `Pflanzen/` mit `text.txt` und Bildern,
  optional `text.en.txt`. Details in [`Pflanzen/README.md`](Pflanzen/README.md).
- **Bienen:** ein Ordner pro Volk in `Bienen/` mit `text.txt`, `tagebuch.txt` und
  Bildern, optional `.en.txt`-Fassungen. Details in [`Bienen/README.md`](Bienen/README.md).
- **Werdegang:** `Werdegang/werdegang.txt` und `Werdegang/werdegang.en.txt`. Die
  Regeln stehen oben in der Datei, Links schreibt man als `[Text](https://…)`.
- **Startseite und andere Seiten:** direkt im HTML. Die englische Fassung steht im
  selben Element als `data-en="…"`.

iPhone-Fotos (`.heic`) werden beim Bauen automatisch in verkleinerte `.jpg` umgewandelt.

## Bauen

Nach dem Hochladen erledigt das die GitHub-Action
[`seiten-bauen.yml`](.github/workflows/seiten-bauen.yml) von selbst. Lokal:

```bash
pip install Pillow pillow-heif        # nur für Bilder nötig
python tools/build_pflanzen.py        # Pflanzen/pflanzen.json
python tools/build_bienen.py          # Bienen/bienen.json
python tools/build_werdegang.py       # werdegang.html
python tools/build_englisch.py        # alle *-en.html und sitemap.xml
```

Erzeugte Dateien (`*.json`, `werdegang.html`, `*-en.html`, `sitemap.xml`) nicht von
Hand bearbeiten – sie werden beim nächsten Bauen überschrieben.

Zum Ansehen reicht ein lokaler Server im Hauptordner (die JSON-Dateien lassen sich
nicht über `file://` laden):

```bash
python -m http.server 8000
```

## Auffindbarkeit

- `robots.txt` und `sitemap.xml` für Suchmaschinen, `hreflang` verbindet die Sprachfassungen
- strukturierte Personendaten (schema.org) auf Start- und Werdegangseite
- [`llms.txt`](llms.txt): Kurzfassung für KI-Assistenten – bei neuen Stellen oder
  Veröffentlichungen von Hand mitpflegen
- `python tools/indexnow.py` meldet alle Seiten an Bing & Co. Die Schlüsseldatei
  `2c4695e607cefe49ea235d5e0057d795.txt` muss dafür im Hauptordner liegen bleiben.

## Aufbau

```
css/style.css        ein Stylesheet für alles, hell und dunkel
js/site.js           Theme- und Sprachumschalter, Menü
js/pflanzen.js       Pflanzenübersicht und Galerie
js/bienen.js         Volk, Galerie, Tagebuch
js/neues.js          letzte Tagebucheinträge auf der Startseite
js/wuerfel.js        Würfelspiele
tools/               Build-Skripte (Python, nur Standardbibliothek + Pillow)
```

Keine Cookies, kein Tracking, keine fremden Schriften. Im Browser gespeichert werden
nur Theme und Sprache.

## Kontakt

fabibause12@gmail.com
