/// <reference lib="webworker" />

export {};

const serviceWorkerSelf = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;
// @ts-expect-error Workbox ersetzt diesen Platzhalter beim Build.
const manifestEntries = self.__WB_MANIFEST as Array<{ url: string }>;

const precacheName = "cubism-precache-v2";
const runtimeName = "cubism-runtime-v2";
const navigationCacheName = "cubism-navigation-v2";
const precacheUrls = Array.from(new Set(["/", "/index.html", ...manifestEntries.map((entry) => entry.url)]));
const offlineDocument = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cubism offline</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Rubik Variable", "Rubik", sans-serif;
        background: #10100f;
        color: #f3eee2;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top left, rgba(214, 87, 47, 0.18), transparent 36%),
          radial-gradient(circle at bottom right, rgba(56, 109, 213, 0.2), transparent 38%),
          linear-gradient(160deg, #10100f 0%, #171714 45%, #0b0b0a 100%);
      }

      main {
        max-width: 34rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 24px;
        background: rgba(22, 22, 19, 0.84);
      }

      h1 {
        margin: 0 0 12px;
        line-height: 1.05;
      }

      p {
        margin: 0 0 12px;
        color: rgba(243, 238, 226, 0.76);
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Cubism ist offline noch nicht verfügbar.</h1>
      <p>Für den Erstbesuch müssen App-Shell und Assets einmal erfolgreich geladen werden.</p>
      <p>Sobald Cubism mindestens einmal online gestartet wurde, bleiben Capture, Review, Solve und Playback auch ohne Netzwerk erreichbar.</p>
    </main>
  </body>
</html>`;

serviceWorkerSelf.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(precacheName).then((cache) => cache.addAll(precacheUrls))
  );
});

serviceWorkerSelf.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.map((key) => {
          if (key !== precacheName && key !== runtimeName && key !== navigationCacheName) {
            return caches.delete(key);
          }

          return Promise.resolve(false);
        })
      );
      await serviceWorkerSelf.clients.claim();
    })
  );
});

serviceWorkerSelf.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    void serviceWorkerSelf.skipWaiting();
  }
});

serviceWorkerSelf.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== serviceWorkerSelf.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void caches.open(navigationCacheName).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const directMatch = await caches.match(event.request);
          if (directMatch) {
            return directMatch;
          }

          const navigationCache = await caches.open(navigationCacheName);
          const cachedNavigation = await navigationCache.match(event.request);
          if (cachedNavigation) {
            return cachedNavigation;
          }

          const appShell = await caches.match("/");
          if (appShell) {
            return appShell;
          }

          return new Response(offlineDocument, {
            status: 503,
            statusText: "Offline",
            headers: {
              "Content-Type": "text/html; charset=utf-8"
            }
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void caches.open(runtimeName).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const fallback = await caches.match(event.request);
          if (fallback) {
            return fallback;
          }

          return Response.error();
        });
    })
  );
});
