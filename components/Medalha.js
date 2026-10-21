import { useId } from 'react';

const CORES = {
  bronze: ['#e9b283', '#a8642a'], prata: ['#f1f5f9', '#8c99a8'],
  ouro: ['#fbe38a', '#c98a0a'], diamante: ['#b6f4ff', '#3b82f6']
};

// Medalha em SVG: fitas + disco do nível (bronze, prata, ouro, diamante) + ícone da família + número.
// familia: 'sequencia' (chama) | 'dias' (calendário) | 'intenso' (raio)
export default function Medalha({ familia, nivel, limite, bloqueada = false, size = 76 }) {
  const id = useId().replace(/:/g, '');
  const [c1, c2] = CORES[nivel] || CORES.bronze;
  return (
    <svg className={`medalha${bloqueada ? ' lock' : ''}`} width={size} height={size * 1.2} viewBox="0 0 80 96" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
      </defs>
      <path d="M21 2h15l10 40-13 6z" fill="#123f86" />
      <path d="M59 2H44L34 42l13 6z" fill="#0b2a5b" />
      <path d="M21 2h5l10 40-3 6z M59 2h-5L44 42l3 6z" fill="#e6b422" opacity=".5" />
      <circle cx="40" cy="60" r="29" fill={c2} />
      <circle cx="40" cy="60" r="26.5" fill={`url(#g${id})`} />
      <circle cx="40" cy="60" r="21" fill="none" stroke="#0b2a5b" strokeOpacity=".35" strokeWidth="1.4" />
      <g transform="translate(28 44) scale(1)" fill="#0b2a5b" stroke="#0b2a5b">
        {familia === 'sequencia' && <path d="M12 1c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.2 1.8 2.5C10.5 7 10.5 4 12 1z" strokeWidth="0.6" strokeLinejoin="round" />}
        {familia === 'dias' && (
          <g fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4" width="17" height="15" rx="2.5" /><path d="M3.5 9h17M8 2v3.5M16 2v3.5M8.2 14l2.6 2.6 5-5.4" />
          </g>
        )}
        {familia === 'intenso' && <path d="M14 0L5 13h6l-1.4 10L19 9.5h-6.2z" strokeWidth="0.6" strokeLinejoin="round" />}
      </g>
      <text x="40" y="79" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0b2a5b" fontFamily="system-ui, Segoe UI, sans-serif">{limite}</text>
      {bloqueada && (
        <g transform="translate(60 80)">
          <circle r="10" fill="#475569" stroke="#fff" strokeWidth="1.5" />
          <path d="M-4 -1h8v6h-8z M-2.6 -1v-2.2a2.6 2.6 0 0 1 5.2 0V-1" fill="#fff" stroke="#fff" strokeWidth="1.1" />
        </g>
      )}
    </svg>
  );
}
