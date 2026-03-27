# Anforderungen

## Produktziel

Cubism ist eine rein client-seitige Webanwendung für das Lösen eines `4x4x4`-Rubik's-Cube. Die Anwendung läuft vollständig lokal im Browser, soll als PWA installierbar sein und auch offline funktionieren.

## Muss-Anforderungen

- Die Anwendung läuft ohne Server und ohne Cloud-Abhängigkeit.
- Die Anwendung funktioniert offline nach erfolgreicher Installation oder nach dem ersten Laden.
- Der Benutzer kann einen `4x4x4`-Würfelzustand manuell eingeben.
- Die Anwendung validiert, ob der eingegebene Zustand plausibel und lösbar ist.
- Die Anwendung berechnet lokal einen Lösungsweg.
- Die Anwendung visualisiert den Lösungsweg verständlich und schrittweise.

## Soll-Anforderungen

- Der Benutzer kann den Würfel mit der Kamera oder über Fotos erfassen.
- Die Farberkennung arbeitet lokal im Browser.
- Der Benutzer kann erkannte Farben vor dem Start des Solves korrigieren.
- Die Anwendung zeigt die Notation und die betroffenen Layer pro Schritt an.
- Die Anwendung kann zwischen einzelnen Schritten vor- und zurückspringen.

## Nicht-Ziele in der ersten Version

- Unterstützung beliebiger Cube-Dimensionen
- Cloud-Synchronisation
- Benutzerkonten
- Mehrspieler- oder Community-Funktionen
- Vollautomatische Ein-Foto-Erkennung des gesamten Würfels

## Fachliche Randbedingungen

- Zielwürfelgröße ist zunächst ausschließlich `4x4x4`.
- Die Lösung soll möglichst auf bestehenden Offline-Bibliotheken aufbauen.
- Für den finalen `3x3`-Teil der Reduktion soll eine etablierte Browser-Bibliothek verwendet werden.
- Rechenintensive Solverschritte sollen nach Möglichkeit in Web Workern laufen, damit die Oberfläche bedienbar bleibt.

## Benutzerflüsse

### 1. Manuelle Eingabe

1. Der Benutzer wählt `4x4x4`.
2. Die Anwendung zeigt alle sechs Seiten mit je `16` Stickern.
3. Der Benutzer trägt die Farben ein.
4. Die Anwendung prüft den Zustand.
5. Die Anwendung berechnet den Lösungsweg.
6. Die Anwendung zeigt den Lösungsweg visuell an.

### 2. Kamera-/Fotoerfassung

1. Der Benutzer startet die Kameraerfassung.
2. Die Anwendung erfasst nacheinander sechs Seiten.
3. Die Anwendung erkennt lokal die Stickerfarben.
4. Der Benutzer korrigiert fehlerhafte Erkennung bei Bedarf.
5. Die Anwendung prüft den Zustand.
6. Die Anwendung berechnet und visualisiert den Lösungsweg.

### 3. Lösungsvisualisierung

1. Die Anwendung zeigt den Ausgangszustand.
2. Die Anwendung listet alle Züge in Notation.
3. Bei jedem Schritt wird der Würfel visuell aktualisiert.
4. Der Benutzer kann pausieren, vorwärts gehen und zurückgehen.
5. Optional kann die aktuelle Zuggruppe hervorgehoben werden.
