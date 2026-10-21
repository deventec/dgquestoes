export default function manifest() {
  return {
    name: 'DG QUESTÕES',
    short_name: 'DG Questões',
    description: 'Banco de questões para concursos de carreiras policiais.',
    start_url: '/questoes',
    display: 'standalone',
    background_color: '#0b2a5b',
    theme_color: '#0b2a5b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
