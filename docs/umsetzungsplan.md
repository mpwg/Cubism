# Umsetzungsplan

## Phase 1: Fundament

Ziel:

Eine lokale Webanwendung mit dimensionsfähigem Zustandsmodell, korrekter Move-Engine und primärem `3x3`-Pfad.

Umfang:

- Projektgrundstruktur
- PWA-Grundlage
- `3x3`-/`4x4`-State-Modell
- Notation und Move-Engine
- Tests für Zugoperationen

## Phase 2: Manuelle Eingabe

Ziel:

Ein Benutzer kann einen `3x3`-Würfel vollständig von Hand eingeben; die Struktur bleibt für `4x4` offen.

Umfang:

- Eingabemaske für sechs Seiten
- Farbauswahl
- Plausibilitätsprüfung
- Zurücksetzen und Bearbeiten

## Phase 3: Solver

Ziel:

Ein lokal laufender Solver berechnet zunächst für `3x3` einen vollständigen Lösungsweg und bereitet `4x4` als Reduktionspfad vor.

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
