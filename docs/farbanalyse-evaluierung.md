# Evaluierung lokale Farbanalyse

Stand: 29. März 2026

## Entscheidung

Für den produktiven Capture-Pfad wird `OpenCV.js` eingesetzt.

Die Worker-basierte Farbanalyse nutzt jetzt eine echte Bildvorverarbeitung mit Kontursuche, Vier-Punkt-Erkennung und perspektivischer Entzerrung, bevor Stickerfarben klassifiziert werden. Damit ist die Erkennung nicht mehr nur von einem starren Center-Crop abhängig.

## Bewertete Werkzeuge

### `OpenCV.js`

Offizielle Doku:

- <https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html>

Für Cubism relevante Bausteine:

- Konturerkennung
- Polygonapproximation
- Perspektivtransformation
- robuste Vorverarbeitung direkt im Browser und im Worker

Bewertung:

- fachlich der richtige Baustein für einen produktiven lokalen Capture-Pfad
- höherer Bundle- und Initialisierungsaufwand als reine Heuristiken
- dafür klar robuster bei leicht schiefen, versetzten und unperfekt gerahmten Kamerabildern

Produktentscheidung:

- `OpenCV.js` wird produktiv in den Capture-Worker integriert
- die Erkennung versucht zuerst eine entzerrte Würfelseite über Konturen und Perspective Warp zu gewinnen
- wenn in einem Randfall kein belastbares Viereck gefunden wird, bleibt ein lokaler Fallback auf den gehärteten Rasterpfad erhalten, damit der Scan nicht vollständig abbricht

### `Color.js`

Offizielle Doku:

- <https://colorjs.io/>

Für Cubism relevanter Baustein:

- DeltaE/CIEDE2000 für bessere Farbdifferenzen

Bewertung:

- fachlich passend
- für den aktuellen Bedarf ist jedoch nur die Distanzmetrik entscheidend, nicht das komplette Farbsystem

Produktentscheidung:

- keine zusätzliche Runtime-Abhängigkeit für `Color.js`
- CIEDE2000 wird direkt lokal implementiert und im Worker verwendet

## Umgesetzter produktiver Pfad

Der aktuelle produktive Capture-Pfad besteht aus diesen Schritten:

1. Bildaufnahme lokal im Browser
2. Verarbeitung im Capture-Worker
3. Kontursuche und Perspektivkorrektur mit `OpenCV.js`
4. robustes Sticker-Sampling auf der entzerrten Fläche
5. Farbdistanz über DeltaE2000
6. Confidence-Bewertung aus Distanz, Trennschärfe und Stichprobenstabilität
7. Reklassifizierung mit stabilisierten Session-Prototypen

## Ergebnis

Damit bleibt die Erkennung vollständig lokal und workerbasiert, ist aber nicht mehr auf einen rein heuristischen Prototyp-Pfad beschränkt.
