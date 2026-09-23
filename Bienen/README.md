# Ein Volk hinzufügen

Ein Volk = ein Ordner. Genau wie bei den Pflanzen.

```
Bienen/
  Maria/
    text.txt        <- Eckdaten und der Text, der auf der Seite steht
    tagebuch.txt    <- optional: die Durchsichten
    1.jpg           <- Bild 1 (das erste ist das Titelbild)
    2.jpg
```

Solange nur **ein** Volk im Ordner liegt, zeigt `bienen.html` es direkt an. Ab dem
zweiten gibt es automatisch eine Übersicht mit Karten, und jedes Volk bekommt einen
eigenen Link (`bienen.html?v=Maria`).

## Die text.txt

Oben die Eckdaten als `Stichwort: Wert`, dann eine Zeile aus drei Strichen, danach
der Fließtext. Leerzeilen werden zu Absätzen.

```
Titel: Maria
Untertitel: Ein Nachschwarm vom April 2026.
Beute: Dadant, zehn Brutwaben
Eingezogen: 28. April 2026
---
Hier steht der normale Text.

Und hier ein zweiter Absatz.
```

`Titel` ist die Überschrift (ohne Angabe wird der Ordnername genommen), `Untertitel`
steht klein darunter. Alles andere (`Beute`, `Königin`, `Varroa`, …) landet in der
Tabelle neben dem Text – du kannst dir also beliebige Zeilen ausdenken.

## Die tagebuch.txt

Eine Durchsicht pro Zeile, Datum und Text mit einem senkrechten Strich getrennt:

```
28.04.2026 | Nachschwarm eingefangen, ungefähr 1,5 kg.
08.05.2026 | Noch keine Brut. Vierte Wabe dazu, Behandlung mit Milchsäure.
```

Sortiert wird automatisch, die neueste Durchsicht steht oben. Zeilen, die mit `#`
anfangen, sind Notizen für dich und tauchen auf der Seite nicht auf. Die Datei darf
auch `durchsichten.txt` oder `log.txt` heißen.

## Bilder

Gleiche Regeln wie bei den Pflanzen: `.jpg`, `.png`, `.webp` und so weiter, sortiert
nach Dateinamen, das erste Bild ist das Titelbild. iPhone-Fotos (`.heic`) werden beim
Bauen automatisch in `.jpg` umgewandelt und auf 2000 px verkleinert; die Originale
bleiben liegen, wandern aber nicht mit ins Repo.

Ordner, die mit `_` anfangen, sowie `Vorlage`, `Template`, `Beispiel` und `Muster`
werden übersprungen. In `_unsortiert/` liegen Bilder, die zu keinem Volk gehören.

## Liste aktualisieren

Die Seite liest `Bienen/bienen.json`. Die Datei wird erzeugt, nicht von Hand
geschrieben – nach dem Hochladen erledigt das die GitHub-Action von selbst. Lokal
geht es so:

```bash
python tools/build_bienen.py
```

## Volk wieder entfernen

Ordner löschen. Fertig.
