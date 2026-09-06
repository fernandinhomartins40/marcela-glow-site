/**
 * Service worker do painel.
 *
 * A versão anterior era cache-first para tudo: `caches.match(request)` e só
 * caía na rede quando não havia nada guardado. Isso prendia o app na primeira
 * versão instalada — o HTML cacheado aponta para o CSS e o JS pelo nome com
 * hash, então nenhum deploy chegava, nem recarregando. Um ajuste publicado
 * ficava invisível para quem já tinha aberto o app uma vez.
 *
 * A estratégia agora depende do que se pede:
 *
 * - **A navegação** (o HTML) vai à rede primeiro. É o arquivo que aponta para
 *   todos os outros, então ele precisa ser o mais novo que houver. Sem rede,
 *   cai no cache — que é o ponto de ter um app instalável.
 * - **Os arquivos com hash no nome** vêm do cache sem pensar. O hash muda a
 *   cada build, então um endereço que existe nunca aponta para conteúdo
 *   diferente e guardá-lo é sempre seguro.
 * - **O resto** tenta o cache e atualiza em segundo plano.
 */

const VERSAO = 'v2'
const CACHE = `marcela-admin-${VERSAO}`

const ESSENCIAIS = [
  self.registration.scope,
  `${self.registration.scope}manifest.webmanifest`,
  `${self.registration.scope}icon.svg`,
  // O PNG de 192 e o que o navegador exige para oferecer a instalacao:
  // sem ele em cache, um primeiro acesso offline nao teria como instalar.
  `${self.registration.scope}icon-192.png`,
  `${self.registration.scope}icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

/** Vite nomeia os arquivos de build com um hash: `index-ChqEVfuK.css`. */
function temHashNoNome(url) {
  return /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpe?g|svg)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  // A API nunca é cacheada: dado clínico velho é pior que erro de rede.
  if (url.pathname.startsWith('/api')) return

  // O HTML vem da rede sempre que possível.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copia))
          return resposta
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(self.registration.scope))),
    )
    return
  }

  // Arquivo com hash no nome: o endereço é imutável, o cache basta.
  if (temHashNoNome(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resposta) => {
            const copia = resposta.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copia))
            return resposta
          }),
      ),
    )
    return
  }

  /* O resto responde do cache e busca a versão nova em paralelo, para a próxima
     abertura já ter o arquivo atualizado. */
  event.respondWith(
    caches.match(request).then((cached) => {
      const daRede = fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copia))
          return resposta
        })
        .catch(() => cached)
      return cached || daRede
    }),
  )
})
