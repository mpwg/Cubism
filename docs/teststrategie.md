# Teststrategie

## Priorisierung

Cubism testet zuerst Pfade mit hohem Regressionsrisiko statt bloßer Prozentabdeckung.

1. `Capture -> Review -> Solve -> Playback`
2. Worker-Grenzen für Bildanalyse und Solver
3. Persistenz, Snapshot-Laden und Rehydrierung
4. Domänenlogik als stabile Basis für spätere `4x4`-Arbeit

## Testmatrix

| Bereich | Risiko | Testebene | Abdeckung |
| --- | --- | --- | --- |
| Capture-Session und manuelle Korrekturen | falscher Eingangszustand | Unit | Session-Vollständigkeit, Korrekturstatus, Sticker-Konfidenz |
| Solve-Store und Playback | verlorene Zustände, fehlerhafte Navigation | Unit/Integration | Übernahme von Solve-Ergebnissen, Bounds für Playback, Reset nach Capture-Änderungen |
| Snapshot-Persistenz | stille Datenverluste nach Reload | Integration | Serialisierung, Deserialisierung, Wiederaufbau der Playback-Zustände |
| Solver- und Capture-Worker-Clients | Worker-Initialisierung, falsche Übergaben | Integration | Singleton-Verhalten, Transfer von `ImageBitmap`, Delegation an Worker-API |
| Kernfluss im Browser | echte Benutzerregression | E2E | Demo laden, validieren, lösen, Playback bedienen |

## CI-Mindestanforderungen

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`

Damit werden statische Fehler, Domänenregressionen, Build-Probleme und der primäre Browserfluss gemeinsam abgefangen.
