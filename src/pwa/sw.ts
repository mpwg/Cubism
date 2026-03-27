/// <reference lib="webworker" />

export {};

const serviceWorkerSelf = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;
// @ts-expect-error Workbox ersetzt diesen Platzhalter beim Build.
const manifestEntries = self.__WB_MANIFEST as Array<{ url: string }>;

const precacheName = "cubism-precache-v1";
const runtimeName = "cubism-runtime-v1";
const precacheUrls = manifestEntries.map((entry) => entry.url);

serviceWorkerSelf.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(precacheName).then(async (cache) => {
      await cache.addAll(precacheUrls);
      await serviceWorkerSelf.skipWaiting();
    })
  );
});

serviceWorkerSelf.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.map((key) => {
          if (key !== precacheName && key !== runtimeName) {
            return caches.delete(key);
          }

          return Promise.resolve(false);
        })
      );
      await serviceWorkerSelf.clients.claim();
    })
  );
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
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          void caches.open(runtimeName).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }

          return new Response("Offline", {
            status: 503,
            statusText: "Offline"
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

      return fetch(event.request).then((response) => {
        const clone = response.clone();
        void caches.open(runtimeName).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
