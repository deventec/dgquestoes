// Ilustração original (SVG) no tema "carreiras policiais": distintivo estilizado, estrela, ramos de louro,
// radar e skyline ao amanhecer. Cores iguais às do site (azul-marinho e dourado).
const rad = d => d * Math.PI / 180;

function estrela(cx, cy, R, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = rad(-90 + i * 36), k = i % 2 ? r : R;
    return `${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function Louro() {
  // folhas ao longo de um arco do lado esquerdo; o direito é o espelho
  return Array.from({ length: 9 }, (_, i) => {
    const th = 100 + i * 15.5, x = 300 + 172 * Math.cos(rad(th)), y = 245 + 172 * Math.sin(rad(th));
    return (
      <g key={i}>
        <ellipse cx={x} cy={y} rx="8" ry="21" transform={`rotate(${th + 90 + 32} ${x} ${y})`} fill="url(#ouro)" />
        <ellipse cx={x} cy={y} rx="8" ry="21" transform={`rotate(${th + 90 - 32} ${x} ${y})`} fill="url(#ouro)" opacity=".8" />
      </g>
    );
  });
}

const PREDIOS = [[0, 46, 70], [46, 34, 110], [80, 52, 80], [132, 30, 135], [162, 44, 95], [206, 38, 60], [244, 30, 90],
  [356, 34, 100], [390, 46, 140], [436, 32, 75], [468, 48, 105], [516, 34, 85], [550, 50, 120]];
const ASTROS = [[60, 50], [130, 90], [210, 40], [470, 60], [540, 110], [420, 30], [90, 150], [510, 170]];

export default function PoliceArt() {
  return (
    <svg viewBox="0 0 600 520" className="art" role="img"
      aria-label="Distintivo estilizado com estrela dourada e ramos de louro, sobre o horizonte de uma cidade ao amanhecer">
      <defs>
        <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#123f86" /><stop offset="1" stopColor="#061330" /></linearGradient>
        <linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8dc7a" /><stop offset="1" stopColor="#c98a0a" /></linearGradient>
        <linearGradient id="escudo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a4a9a" /><stop offset="1" stopColor="#0a2150" /></linearGradient>
        <radialGradient id="brilho" cx="50%" cy="45%" r="50%"><stop offset="0" stopColor="#5b8def" stopOpacity=".55" /><stop offset="1" stopColor="#5b8def" stopOpacity="0" /></radialGradient>
        <pattern id="fita" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="28" fill="#e6b422" /><rect x="14" width="14" height="28" fill="#0b2a5b" />
        </pattern>
      </defs>
      <rect width="600" height="520" fill="url(#fundo)" />
      <circle cx="300" cy="235" r="270" fill="url(#brilho)" />
      <g opacity=".09" stroke="#fff" strokeWidth="2">
        {Array.from({ length: 9 }, (_, i) => <line key={i} x1={-120 + i * 90} y1="0" x2={140 + i * 90} y2="520" />)}
      </g>
      {ASTROS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1.6 : 2.4} fill="#fff" opacity=".7" />)}
      <g fill="none" stroke="#e6b422">
        <circle cx="300" cy="235" r="150" opacity=".3" />
        <circle cx="300" cy="235" r="215" opacity=".22" strokeDasharray="3 11" />
        <circle cx="300" cy="235" r="255" opacity=".12" />
      </g>
      <g><Louro /></g>
      <g transform="translate(600 0) scale(-1 1)"><Louro /></g>
      <path d="M300 112 L402 146 V236 C402 296 356 338 300 364 C244 338 198 296 198 236 V146 Z" fill="url(#ouro)" />
      <path d="M300 126 L388 156 V236 C388 288 348 325 300 348 C252 325 212 288 212 236 V156 Z" fill="url(#escudo)" />
      <path d="M300 140 L376 165 V236 C376 280 342 313 300 334 C258 313 224 280 224 236 V165 Z" fill="none" stroke="#e6b422" strokeWidth="1.5" opacity=".55" />
      <polygon points={estrela(300, 205, 40, 17)} fill="url(#ouro)" />
      <text x="300" y="289" textAnchor="middle" fontSize="38" fontWeight="800" letterSpacing="4" fill="url(#ouro)" fontFamily="system-ui, Segoe UI, sans-serif">DG</text>
      <text x="300" y="312" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="5" fill="#cfe0ff" fontFamily="system-ui, Segoe UI, sans-serif">QUESTÕES</text>
      <g fill="#050e24">{PREDIOS.map(([x, w, h], i) => <rect key={i} x={x} y={500 - h} width={w} height={h} />)}</g>
      <g fill="#e6b422" opacity=".55">
        {PREDIOS.flatMap(([x, w, h], i) => [0, 1, 2].map(j => (
          <rect key={`${i}-${j}`} x={x + 8 + (j % 2) * (w / 2 - 4)} y={500 - h + 12 + j * 22} width="5" height="7" opacity={(i + j) % 3 ? 1 : .25} />
        )))}
      </g>
      <rect y="500" width="600" height="20" fill="url(#fita)" />
    </svg>
  );
}
