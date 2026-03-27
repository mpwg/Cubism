# Zielarchitektur

## Architekturprinzipien

- vollständig client-seitig
- offlinefähig
- klare Trennung zwischen Zustand, Solver, Eingabe und Darstellung
- Bibliotheken nur dort verwenden, wo sie fachlich belastbar sind

## Empfohlene Bibliotheksstrategie

### Bestehende Bibliotheken

- `min2phase.js` für den primären `3x3x3`-Lösungsanteil im Browser
- optional `cubing.js` für Notation, Puzzle-Hilfsfunktionen und Darstellungsnähe

### Eigene Komponenten

- dimensionsfähiges Zustandsmodell für `3x3x3` und `4x4x4`
- dimensionsfähige Move-Engine
- Reduktionslogik von `4x4x4` nach `3x3x3`
- Erkennung und Behandlung von Paritäten
- manuelle Eingabeoberfläche
- Kamera-/Fotoerfassung
- schrittweise Lösungsvisualisierung

## Modulschnitt

### 1. Core State

Verantwortung:

- Repräsentation des Würfelzustands mit Dimension `3` oder `4`
- Lesen und Schreiben einzelner Sticker
- Serialisierung und Deserialisierung
- Erzeugung eines gelösten Ausgangszustands

Empfehlung:

- zunächst stickerbasiertes Modell mit Dimensionsmetadaten
- später optional zusätzliche abgeleitete Piece-Sichten

### 2. Move Engine

Verantwortung:

- Anwendung einzelner Züge auf den Würfelzustand
- Unterstützung äußerer und innerer Layer
- Vorwärts- und Rückwärtsausführung
- Parsing und Normalisierung von Notation

Beispiele:

- `U`, `U'`, `U2`
- `Uw`, `Rw`
- innere Layer je nach gewählter Notation

### 3. Validator

Verantwortung:

- Prüfung, ob Farbanordnung vollständig ist
- Prüfung, ob die Farbverteilung stimmt
- Prüfung auf offensichtliche Unmöglichkeiten
- Vorbereitung einer solvergeeigneten Normalform

Hinweis:

Die fachliche Validierung für `4x4x4` ist anspruchsvoller als bei `3x3x3`, da Paritäten zulässig sind, physikalisch unmögliche Zustände aber trotzdem abgefangen werden müssen.

### 4. Reduction Solver

Verantwortung:

- Zentren lösen oder gruppieren
- Kanten paaren
- auf einen reduzierten `3x3x3`-Zustand abbilden
- Paritäten erkennen und mit bekannten `4x4`-Algorithmen behandeln

Ausgabe:

- vollständige Zugliste für den `4x4x4`
- reduzierter Zwischenzustand für den `3x3x3`-Solver

### 5. 3x3 Solver Adapter

Verantwortung:

- direkte Übergabe von `3x3` oder Übergabe des reduzierten `4x4`-Zustands an `min2phase.js`
- Rückübersetzung der `3x3`-Lösung in die Gesamtzugliste
- Ausführung möglichst in einem Web Worker

### 6. Capture

Verantwortung:

- manuelle Eingabe
- Kamera- oder Fotoimport
- Farbfelderkennung im Browser
- Korrekturworkflow für falsch erkannte Sticker

Empfehlung:

- erste Version nur manuelle Eingabe
- zweite Phase mit seitenweisem Scan statt Ein-Foto-Magie

### 7. Visualizer

Verantwortung:

- Darstellung des aktuellen Würfelzustands
- Animation des Lösungswegs
- Vor/Zurück/Pause
- Hervorhebung betroffener Seiten und Layer

Darstellung:

- zuerst klare `2D`-Netzansicht
- optional später `3D`-Darstellung

## Laufzeitmodell

### Main Thread

- Oberfläche
- Eingabe
- schrittweise Visualisierung

### Web Worker

- Solver-Initialisierung
- `4x4`-Reduktion
- `3x3`-Solve mit `min2phase.js`
- gegebenenfalls Bildanalyse

## Datenfluss

1. Benutzer gibt einen Würfelzustand ein oder scannt ihn.
2. Der Zustand wird validiert.
3. Der `4x4`-Solver reduziert den Zustand.
4. Paritäten werden bei Bedarf behandelt.
5. Der reduzierte `3x3`-Zustand wird an `min2phase.js` übergeben.
6. Die kombinierte Zugliste wird an die Visualisierung zurückgegeben.
7. Die Oberfläche spielt die Lösung Schritt für Schritt ab.

## Technische Risiken

### Fotoerkennung

Die Fotoerkennung ist das größte Produktrisiko. Farberkennung unter unterschiedlichem Licht, Spiegelungen und Kameraqualität macht eine robuste Vollautomatik schwierig.

### Solver-Komplexität

Die `4x4`-Reduktion ist deutlich aufwendiger als ein reiner `3x3`-Solver. Die Verwendung einer bestehenden `3x3`-Bibliothek reduziert das Risiko, ersetzt aber nicht die eigene `4x4`-Logik.

### UI-Performance

Längere Initialisierung oder Solve-Zeiten dürfen die Oberfläche nicht blockieren. Deshalb ist Worker-Isolation von Anfang an sinnvoll.
