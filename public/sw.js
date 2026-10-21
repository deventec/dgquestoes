/* Service worker do DG QUESTÕES: deixa o app abrir sem internet.
   - Arquivos estáticos (JS/CSS/imagens do Next): cache primeiro.
   - Páginas: rede primeiro; sem rede, usa a última cópia; se não houver, abre /offline.
   - Dados (Supabase) NÃO passam por aqui: o estudo offline usa o pacote guardado no aparelho (IndexedDB). */
const VERSAO = 'dg-v1';
const ESTATICO = `${VERSAO}-estatico`;
const PAGINAS = `${VERSAO}-paginas`;
const PRE = ['/offline', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(PAGINAS);
    await Promise.all(PRE.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSAO)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  const estatico = url.pathname.startsWith('/_next/static/') || /\.(?:png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname);
  if (estatico) {
    e.respondWith((async () => {
      const c = await caches.open(ESTATICO);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })());
    return;
  }

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(PAGINAS); c.put(req, res.clone()); }
      return res;
    } catch {
      const hit = await caches.match(req, { ignoreVary: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const off = await caches.match('/offline', { ignoreVary: true });
        if (off) return off;
      }
      return new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
