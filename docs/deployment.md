# Deployment auf `cubism.gehri.xyz`

## Entscheidung

- produktive URL: `https://cubism.gehri.xyz`
- Hosting-Ziel: Cloudflare Pages
- Auslieferungsart: statische Vite-PWA ohne Serverfunktionen

Diese Entscheidung passt zur aktuellen App-Struktur: Cubism ist vollständig client-seitig, benötigt kein Backend und erzeugt mit `npm run build` ein statisches `dist/`-Artefakt.

## Warum Cloudflare Pages

- Vite wird direkt unterstützt
- statische Artefakte lassen sich ohne Zusatzinfrastruktur deployen
- `gehri.xyz` läuft bereits auf Cloudflare, dadurch bleiben DNS und Betrieb in einem Stack
- Custom Domains und automatisches HTTPS sind im Standardpfad vorgesehen
- Preview-Deployments erleichtern Freigabe und Rollback

## Laufzeit- und Build-Anforderungen

- Node.js `24.14.1`
- npm als Paketmanager
- Build-Kommando: `npm run build`
- Output-Verzeichnis: `dist`
- für Cloudflare Pages zusätzlich: `.node-version` auf `24.14.1`, damit die Build-Umgebung dieselbe Node-Version verwendet

Technisch relevante Punkte der App:

- keine Backend-Abhängigkeit
- keine serverseitigen Umgebungsvariablen erforderlich
- PWA mit Service Worker über `vite-plugin-pwa`
- Start unter Root-Pfad `/`, daher geeignet für eine dedizierte Subdomain

## Hosting-Voraussetzungen allgemein

Cubism kann auf jeder Plattform betrieben werden, die statische Dateien per HTTPS ausliefert. Cloudflare Pages ist nur die aktuelle Betriebsentscheidung für `cubism.gehri.xyz`, nicht die einzige technisch sinnvolle Option.

Ein anderer Entwickler kann Cubism auf einer eigenen Domain oder Subdomain hosten, wenn die Zielplattform diese Anforderungen erfüllt:

- statisches Hosting für den Inhalt aus `dist/`
- HTTPS auf derselben Origin wie App, Manifest und Service Worker
- Auslieferung von `index.html`, JavaScript, CSS, Fonts und SVG-Dateien
- SPA-Fallback für Navigationsanfragen auf `index.html`
- Möglichkeit, Header für `sw.js`, `registerSW.js` und `manifest.webmanifest` zu setzen oder diese Dateien zumindest nicht langfristig aggressiv zu cachen

Geeignete Plattformen sind zum Beispiel:

- Cloudflare Pages
- Vercel
- Netlify
- GitHub Pages mit zusätzlichem SPA-Workaround
- klassisches Nginx- oder Caddy-Hosting auf einem eigenen Server

Wichtig:

- Die aktuelle Konfiguration geht von Hosting unter einer Root-URL wie `https://cubism.example.com/` aus.
- Für Hosting unter einem Unterpfad wie `https://example.com/cubism/` reicht ein reines Copy-and-Paste-Deployment nicht. Dann müssten mindestens Vite-`base`, Manifest-URLs und PWA-Pfade bewusst auf diesen Unterpfad angepasst werden.

## Plattformunabhängiger Deployment-Ablauf

Ein neuer Entwickler kann Cubism unabhängig von Cloudflare so veröffentlichen:

1. Repository klonen
2. `npm install` ausführen
3. `npm run build` ausführen
4. den Inhalt von `dist/` auf die Zielplattform hochladen oder von dieser bauen lassen
5. HTTPS aktivieren
6. SPA-Fallback auf `index.html` konfigurieren
7. PWA- und Offline-Verhalten im Browser testen

Minimaler Abnahmetest nach dem Deployment:

- Startseite lädt ohne Konsolenfehler
- Reload auf einer geöffneten Route funktioniert
- `manifest.webmanifest` ist erreichbar
- `sw.js` wird erfolgreich registriert
- App funktioniert nach erstem Besuch auch offline weiter

## Plattformunabhängige Konfigurationspunkte

Diese Dateien sind nicht Cloudflare-spezifisch, sondern beschreiben die Erwartungen an jedes Hosting:

- [`public/_headers`](../public/_headers): gewünschte Cache-Regeln für Service Worker und Manifest
- [`public/_redirects`](../public/_redirects): SPA-Fallback für Hosts, die dieses Format verstehen
- [`vite.config.ts`](../vite.config.ts): PWA-Manifest, Asset-Include und Build-Konfiguration
- [`src/pwa/sw.ts`](../src/pwa/sw.ts): Laufzeitverhalten des Service Workers

Wenn die Zielplattform `_headers` oder `_redirects` nicht unterstützt, müssen die entsprechenden Regeln dort nativ nachgebaut werden.

## Cloudflare-Pages-Setup

Aktueller Stand:

- Pages-Projekt `cubism` ist im Cloudflare-Account angelegt
- GitHub-Quelle ist mit `mpwg/Cubism` verbunden
- Produktions-Branch ist `main`
- Preview-Deployments für Branches und Pull Requests sind aktiviert
- Custom Domain `cubism.gehri.xyz` ist dem Projekt zugeordnet

Technische Konfiguration:

1. Build Command: `npm run build`
2. Build Output Directory: `dist`
3. Root Directory: `/`
4. Build-System: Cloudflare Pages Build Image v3

Die Datei [`public/_headers`](../public/_headers) stellt sicher, dass Service Worker und Manifest nicht aggressiv zwischengespeichert werden. Die Datei [`public/_redirects`](../public/_redirects) aktiviert SPA-Fallback auf `index.html`. Die Datei [`.node-version`](../.node-version) erzwingt in Cloudflare Pages dieselbe Node-Version wie lokal.

## Wie die Cloudflare-Integration funktioniert

Für dieses Repository ist Cloudflare Pages direkt mit GitHub verbunden. Das bedeutet:

1. Cloudflare beobachtet das Repository `mpwg/Cubism`
2. jeder Push auf `main` erzeugt ein Production Deployment
3. Branches und Pull Requests können Preview Deployments erzeugen
4. Cloudflare führt `npm run build` aus
5. der erzeugte Inhalt aus `dist/` wird unter `pages.dev` und der zugeordneten Custom Domain ausgeliefert

Die Integration braucht für den normalen Betrieb keine eigene Deploy-Logik im Repository. Es gibt hier bewusst keinen separaten GitHub-Action-Deploy-Workflow mehr, weil Build und Veröffentlichung direkt in Cloudflare Pages konfiguriert sind.

Für ein neues Projekt auf einer anderen Cloudflare-Domain ist der Ablauf:

1. in Cloudflare Pages ein neues Projekt anlegen
2. GitHub als Source Provider verbinden
3. Repository auswählen
4. Build Command `npm run build` setzen
5. Output Directory `dist` setzen
6. Custom Domain hinzufügen
7. DNS-Eintrag und TLS aktiv werden lassen

Falls ein Entwickler Cloudflare nicht verwenden möchte, kann derselbe Build ohne Funktionsänderung auf einer anderen Static-Hosting-Plattform veröffentlicht werden.

## DNS- und TLS-Konfiguration

Empfohlener Zielname:

- `cubism.gehri.xyz`

Empfohlener Ablauf:

1. Pages-Projekt in Cloudflare anlegen.
2. Unter `Custom domains` die Domain `cubism.gehri.xyz` hinzufügen.
3. Falls `gehri.xyz` bereits als Cloudflare-Zone geführt wird, den automatisch vorgeschlagenen DNS-Eintrag bestätigen oder auf die erste erfolgreiche Deployment-Auswertung warten.
4. Warten, bis die Domain aktiv ist und das TLS-Zertifikat automatisch bereitsteht.

Prüfpunkte nach der DNS-Umschaltung:

- `https://cubism.gehri.xyz` liefert die App ohne Zertifikatswarnung aus
- Weiterleitung von `http://cubism.gehri.xyz` auf HTTPS funktioniert
- Manifest und Service Worker werden unter derselben Origin geladen
- optional: `<projektname>.pages.dev` per Redirect auf `cubism.gehri.xyz` umleiten

## PWA-Checkliste für die produktive Subdomain

- Erstaufruf über HTTPS
- `manifest.webmanifest` wird erfolgreich geladen
- Service Worker registriert sich ohne Scope-Fehler
- Offline-Reload nach erstem Besuch funktioniert
- Installierbarkeit in Chromium-basierten Browsern bleibt erhalten
- Icons und `start_url` funktionieren unter `https://cubism.gehri.xyz/`

## Deployment-Ablauf

### Erstes Live-Deployment

```bash
npm install
npm run build
```

Danach:

1. Änderungen nach `main` mergen oder direkt auf `main` pushen
2. automatisches Produktionsdeploy in Cloudflare Pages abwarten
3. Domain-Status und HTTPS prüfen
4. PWA-Verhalten einmal manuell verifizieren

### Laufende Updates

1. Änderungen per Pull Request mergen
2. automatisches Production Deployment von `main` abwarten
3. Smoke-Test auf `cubism.gehri.xyz` durchführen

Für andere Hosts ist derselbe Ablauf identisch, nur der automatische Trigger kann anders aussehen:

- Cloudflare Pages: Build in der Plattform
- Vercel oder Netlify: Build in der Plattform
- eigener Server: lokaler oder CI-Build, danach Upload von `dist/`

Minimaler Smoke-Test:

- App lädt ohne Konsolenfehler
- Capture-Ansicht öffnet
- Solve eines `3x3` funktioniert
- Playback startet
- Reload funktioniert

## Rollback

Wenn ein Release fehlerhaft ist:

1. letztes funktionierendes Deployment in Cloudflare Pages identifizieren
2. dieses Deployment erneut promoten oder den letzten stabilen Commit revertieren
3. erneutes Production Deployment abwarten
4. Smoke-Test wiederholen

Da Cubism aktuell keine serverseitigen Migrationen oder persistenten Backend-Abhängigkeiten besitzt, ist Rollback auf Stand eines früheren Frontend-Builds unkritisch.

## Vorschlag für `gehri.xyz`

Die Änderungen an `gehri.xyz` liegen im separaten Repository `mpwg/gehri.xyz`. Für die Hauptseite genügt ein klar sichtbarer Projekteintrag statt einer größeren Seitenumgestaltung.

Empfohlener Inhalt:

- Titel: `Cubism`
- Kurztext: `Lokaler Rubik's-Cube-Solver als installierbare Web-App mit Capture, Solve und visuellem Playback.`
- Linkziel: `https://cubism.gehri.xyz`
- CTA: `Projekt öffnen`

Beispieltext für eine Projektkachel oder einen Listen-Eintrag:

> Cubism ist ein lokaler Rubik's-Cube-Solver im Browser. Die Web-App erfasst Würfelzustände, berechnet Lösungen vollständig client-seitig und zeigt den Lösungsweg visuell an.

## Offene externe Schritte

Diese Punkte sind durch Änderungen in diesem Repository vorbereitet, aber nicht vollständig innerhalb dieses Repositories abschließbar:

- abschließende Aktivierung der Domain nach dem ersten erfolgreichen Produktionsdeploy
