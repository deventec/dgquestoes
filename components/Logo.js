// Marca do site: escudo com estrela (mesmo desenho do favicon) + nome
export function IconDG({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0b2a5b" stroke="#e6b422" strokeOpacity=".35" />
      <path d="M32 7 L52 14 V32 C52 44 43 52 32 58 C21 52 12 44 12 32 V14 Z" fill="#e6b422" />
      <path d="M32 12 L47 17.2 V32 C47 41 40 47.5 32 52 C24 47.5 17 41 17 32 V17.2 Z" fill="#0f3a7d" />
      <polygon points="32,19 34.9,26.5 42.9,26.9 36.7,31.9 38.8,39.6 32,35.2 25.2,39.6 27.3,31.9 21.1,26.9 29.1,26.5" fill="#e6b422" />
    </svg>
  );
}

export default function Logo() {
  return <span className="logo"><IconDG />DG <b>QUESTÕES</b></span>;
}
