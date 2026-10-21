import './globals.css';
import PWA from '@/components/PWA';

export const metadata = {
  title: 'DG QUESTÕES',
  description: 'Banco de questões para concursos de carreiras policiais.'
  // O favicon vem dos arquivos app/icon.svg, app/favicon.ico e app/apple-icon.png (detectados pelo Next.js).
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b2a5b' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <PWA />
        {children}
      </body>
    </html>
  );
}
