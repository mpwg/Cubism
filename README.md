# Cubism

<p align="center">
  <img src="./public/favicon.svg" alt="Cubism Logo" width="96" height="96" />
</p>

<p align="center">
  Ein lokaler Rubik's-Cube-Solver als installierbare Web-App:
  Erfassen, prüfen, lösen und Schritt für Schritt nachvollziehen.
</p>

<p align="center">  
  <a href="https://github.com/mpwg/Cubism/commits/main"><img src="https://img.shields.io/github/last-commit/mpwg/Cubism?style=flat-square" alt="Letzter Commit" /></a>
  <a href="https://github.com/mpwg/Cubism/issues"><img src="https://img.shields.io/github/issues/mpwg/Cubism?style=flat-square" alt="Offene Issues" /></a>
  <a href="https://github.com/mpwg/Cubism/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/mpwg/Cubism?style=flat-square" alt="Lizenz" /></a>
</p>

Cubism ist eine vollständig client-seitige Webanwendung für das Lösen von Rubik's Cubes im Browser. Der Schwerpunkt liegt auf einem soliden `3x3`-Pfad, ohne Server, ohne Cloud-Zwang und mit einer Oberfläche, die nicht nur eine Zugliste ausspuckt, sondern den Lösungsweg verständlich macht.

Die App kombiniert lokale Erfassung, fachliche Validierung, Solver-Ausführung in Workern und eine visuelle Wiedergabe des Lösungswegs. Sie ist als PWA angelegt, offline nutzbar und hält die Tür für `4x4` offen, ohne den aktuellen Stand künstlich größer zu reden als er ist.

## Was Cubism bereits kann

- Würfelzustände lokal im Browser erfassen
- Gesichter per Bildupload oder Kamera einlesen
- erkannte Sticker vor dem Solve prüfen und korrigieren
- Zustände validieren und auf Plausibilität prüfen
- `3x3`-Lösungen lokal berechnen
- Lösungswege als Schrittfolge und im 3D-Viewport abspielen
- Fortschritt lokal speichern, damit Sitzungen nicht sofort verloren gehen

## Warum das Projekt interessant ist

Viele Cube-Tools sind entweder reine Algorithmen-Demos oder hängen an Services, Accounts und externer Infrastruktur. Cubism verfolgt eine bewusst andere Linie:

- lokal zuerst: Der Würfelzustand bleibt im Browser
- nachvollziehbar statt magisch: Capture, Review, Solve und Playback sind getrennte Schritte
- performancebewusst: Rechenarbeit und Bildanalyse laufen in Workern
- ausbaufähig: Die Architektur berücksichtigt `4x4`, ohne den `3x3`-Pfad zu verwässern

## Aktueller Stand

Der primäre Fokus liegt derzeit auf `3x3`. `4x4` ist in Datenmodell und UI sichtbar vorbereitet, aber noch kein voll ausgebauter End-to-End-Pfad mit eigener Reduktionslogik und Paritätsbehandlung.

Konkret vorhanden sind bereits:

- Capture-Workflow für Upload und Kamera
- Review-Schritt für manuelle Korrekturen
- lokaler Solve für `3x3` über `min2phase.js`
- Playback mit Zugliste, Phasen und Steuerung
- PWA-Basis inklusive Offline-Ausrichtung

## Stack

- React `19`
- TypeScript
- Vite
- Zustand für App-State
- Web Worker über Comlink
- `min2phase.js` für den `3x3`-Solver
- Three.js / React Three Fiber für die Würfelansicht
- Dexie für lokale Persistenz
- Vitest und Playwright für Tests

## Schnellstart

Voraussetzungen:

- Node.js `24.14.1`
- npm

Installation und Start:

```bash
npm install
npm run dev
```

Wichtige Befehle:

```bash
npm run dev
npm run typecheck
npm run build
npm test
npm run test:e2e
```

## Wie sich die App anfühlt

Cubism ist nicht als abstrakte Solver-Demo aufgebaut, sondern als klarer Ablauf:

1. Würfel erfassen
2. Erkennung prüfen und korrigieren
3. Zustand validieren
4. Lösung lokal berechnen
5. Züge nachvollziehbar abspielen

Dadurch eignet sich das Projekt nicht nur für "gib mir die Lösung", sondern auch für Diagnose, Verständnis und visuelles Nachvollziehen eines konkreten Würfelzustands.

## Projektstruktur

```text
src/
  app/                 globale App-Orchestrierung und Store
  domain/cube/         Zustandsmodell, Moves, Solver, Validierung
  domain/capture/      lokale Farbanalyse und Capture-Logik
  features/
    capture/           Upload- und Kameraerfassung
    solve/             Solve-Workflow
    playback/          Wiedergabe und Viewport
    shared/            wiederverwendbare UI-Bausteine
  lib/
    persistence/       lokale Speicherung
    workers/           Worker-Clients
  pwa/                 Registrierung und Service Worker
  workers/             Solver- und Capture-Worker
```

## Dokumentation

Die fachliche und technische Planung liegt bewusst im Repository und nicht in Köpfen oder Tickets:

- [`docs/anforderungen.md`](./docs/anforderungen.md)
- [`docs/architektur.md`](./docs/architektur.md)
- [`docs/umsetzungsplan.md`](./docs/umsetzungsplan.md)

## Roadmap

- `3x3` weiter stabilisieren und UX schärfen
- `4x4`-Reduktion und Paritätsbehandlung sauber ergänzen
- Capture robuster gegen schwierige Lichtverhältnisse machen
- Playback und Visualisierung weiter ausbauen
- E2E-Abdeckung für die zentralen Benutzerflüsse erhöhen

## Lizenz

Das Projekt steht unter der in [`LICENSE.md`](./LICENSE.md) definierten Lizenz.
