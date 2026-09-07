// subir este número cada vez que se hagan cambios importantes al sitio,
// así el navegador descarta el cache viejo automáticamente
const CACHE = "mi-auto-v2";
const ARCHIVOS = ["/", "/index.html", "/css/style.css", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // para la página (HTML) siempre intentamos traer la versión más nueva
  // primero, y solo usamos el cache si no hay internet
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request).then((c) => c || caches.match("/index.html")))
    );
    return;
  }
  // para el resto (css, iconos) sí sirve cache primero, es más rápido
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});

self.addEventListener("push", (e) => {
  const datos = e.data ? e.data.json() : { title: "Lubricentro MP", body: "Tenés una notificación nueva." };
  e.waitUntil(self.registration.showNotification(datos.title, { body: datos.body, icon: "icons/icon-192.png" }));
});
