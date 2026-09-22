# Pflanzen hinzufügen

Eine Pflanze = ein Ordner. Mehr ist es nicht.

```
Pflanzen/
  Monstera/
    text.txt        <- der Text, der auf der Seite steht
    1.jpg           <- Bild 1
    2.jpg           <- Bild 2
    3.jpg           <- beliebig viele
  Efeutute/
    text.txt
    foto.jpg
```

Der **Ordnername** ist gleichzeitig der Link zur Pflanze
(`pflanzen.html?p=Monstera`) – den kannst du direkt an Freunde schicken.

## Die text.txt

Der einfachste Fall: einfach drauflosschreiben. Leerzeilen werden zu Absätzen.

Wenn du oben noch Eckdaten haben willst, schreibst du sie als `Stichwort: Wert`
und trennst sie mit einer Zeile aus drei Strichen vom Fließtext:

```
Titel: Monstera
Lateinisch: Monstera deliciosa
Untertitel: Das Fensterblatt, das jeden Raum größer aussehen lässt.
Licht: Hell, aber kein direktes Sonnenlicht
Gießen: Einmal pro Woche
---
Hier steht der normale Text.

Und hier ein zweiter Absatz.
```

Besondere Stichwörter:

| Stichwort | Wirkung |
|---|---|
| `Titel` | Überschrift (ohne Angabe wird der Ordnername genommen) |
| `Lateinisch` oder `Botanisch` | kursiv unter der Überschrift |
| `Untertitel` oder `Kurz` | kurzer Text auf der Übersichtskarte |

Alles andere (`Licht`, `Gießen`, `Ableger`, `Haustiere`, …) landet automatisch
in der Tabelle rechts. Du kannst dir also beliebige Zeilen ausdenken.

Die Datei darf auch `info.txt` oder `Monstera.txt` heißen – irgendeine `.txt`
im Ordner reicht.

## Bilder

* Erlaubt sind `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`
* Die Reihenfolge ist die der Dateinamen – `1.jpg`, `2.jpg`, `10.jpg` wird richtig sortiert
* Das **erste** Bild ist das Titelbild auf der Übersicht

### iPhone-Fotos (.heic)

Browser können HEIC nicht anzeigen – Chrome und Firefox zeigen schlicht nichts.
Du musst dich aber um nichts kümmern: Beim Bauen wird aus jeder `.heic` automatisch
eine `.jpg` erzeugt, auf maximal 2000 px verkleinert und gedreht, falls das Foto
im Hochformat aufgenommen wurde.

Die Original-HEICs bleiben in deinem Ordner liegen, wandern aber wegen ihrer Größe
**nicht** mit ins Repo (siehe `.gitignore`). Du kannst sie nach dem Bauen löschen
oder liegen lassen, wie du magst.

### Ordner, die ignoriert werden

* alles, was mit `_` oder `.` anfängt
* die Namen `Vorlage`, `Template`, `Beispiel` und `Muster`

Dort kannst du dir also in Ruhe eine Blaupause zum Kopieren hinlegen, ohne dass
sie auf der Seite auftaucht.

## Liste aktualisieren

Die Seite liest `Pflanzen/pflanzen.json`. Diese Datei wird erzeugt, nicht von Hand
geschrieben. Nach dem Hochladen neuer Ordner passiert das **automatisch** über die
GitHub-Action (`.github/workflows/pflanzen.yml`) – du musst nichts tun.

Wenn du lokal arbeitest, kannst du sie auch selbst bauen:

```bash
python tools/build_pflanzen.py
```

Das Skript sagt dir dabei, wenn in einem Ordner die `.txt` oder die Bilder fehlen
oder ein Bild zu groß ist.

## Pflanze wieder entfernen

Ordner löschen. Fertig.
