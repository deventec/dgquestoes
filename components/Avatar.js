import { foto } from '@/lib/media';

export default function Avatar({ path, nome, size = 36 }) {
  const url = foto(path);
  const ini = (nome || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const st = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="avatar" style={st} /> : <span className="avatar ini" style={st} aria-hidden="true">{ini}</span>;
}
