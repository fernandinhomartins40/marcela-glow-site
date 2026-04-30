const CACHE = 'marcela-admin-v1'
const ASSETS = [self.registration.scope, `${self.registration.scope}manifest.webmanifest`, `${self.registration.scope}icon.svg`]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api')) return
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
})
