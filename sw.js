const CACHE = "mi-auto-v1";
const ARCHIVOS = ["/", "/index.html", "/css/style.css", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// se deja preparado para cuando se sume push real (ver README)
self.addEventListener("push", (e) => {
  const datos = e.data ? e.data.json() : { title: "Lubricentro MP", body: "Tenés una notificación nueva." };
  e.waitUntil(self.registration.showNotification(datos.title, { body: datos.body, icon: "icons/icon-192.png" }));
});
