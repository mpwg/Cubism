# Umsetzungsplan

## Phase 1: Fundament

Ziel:

Eine lokale Webanwendung mit stabilem `4x4`-Zustandsmodell und korrekter Move-Engine.

Umfang:

- Projektgrundstruktur
- PWA-Grundlage
- `4x4`-State-Modell
- Notation und Move-Engine
- Tests für Zugoperationen

## Phase 2: Manuelle Eingabe

Ziel:

Ein Benutzer kann einen `4x4`-Würfel vollständig von Hand eingeben.

Umfang:

- Eingabemaske für sechs Seiten
- Farbauswahl
- Plausibilitätsprüfung
- Zurücksetzen und Bearbeiten

## Phase 3: Solver

Ziel:

Ein lokal laufender Solver berechnet einen vollständigen Lösungsweg.

Umfang:

- Reduktionslogik für `4x4`
- Paritätserkennung
- Integration von `min2phase.js`
- Solver-Ausführung im Worker

## Phase 4: Visualisierung

Ziel:

Die Lösung wird verständlich und schrittweise dargestellt.

Umfang:

- `2D`-Visualisierung des Würfels
- Anzeige der Zugliste
- Schrittsteuerung
- Animation einzelner Züge

## Phase 5: Kameraerfassung

Ziel:

Der Benutzer kann sechs Würfelseiten mit der Kamera erfassen.

Umfang:

- Kamerazugriff im Browser
- seitenweiser Scan
- lokale Farberkennung
- Korrekturansicht vor dem Solve

## Phase 6: Produktreife

Ziel:

Die Anwendung ist als Offline-PWA stabil nutzbar.

Umfang:

- Offline-Caching
- Installierbarkeit
- Fehlerzustände
- Performance-Optimierung
- Feinschliff der Oberfläche
