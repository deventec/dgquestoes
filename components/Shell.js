'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import FeedbackDialog from './FeedbackDialog';
import { listarFila } from '@/lib/offline';
import { sincronizar } from '@/lib/sync';
import { limparCache } from '@/hooks/useAuth';
import Avatar from './Avatar';

export default function Shell({ profile, children }) {
  const path = usePathname();
  const staff = profile && ['admin', 'editor'].includes(profile.role);
  const [cnt, setCnt] = useState({ n: 0, r: 0 });
  const [fb, setFb] = useState(false);
  const [pend, setPend] = useState(0);
  useEffect(() => {
    if (!profile) return;
    supabase.rpc('contadores_caixa').then(({ data }) => { const x = data?.[0]; if (x) setCnt({ n: x.r_novos, r: x.r_respostas }); });
  }, [profile, path]);
  useEffect(() => {
    if (!profile?.id) return;
    const contar = () => listarFila(profile.id).then(l => setPend(l.length)).catch(() => {});
    contar();
    if (typeof navigator !== 'undefined' && navigator.onLine) sincronizar(profile.id).then(contar).catch(() => {});
  }, [profile?.id, path]);
  const item = (href, label, badge = 0) => (
    <Link href={href} className={path === href || path.startsWith(href + '/') ? 'on' : ''}>{label}{badge > 0 && <span className="badge">{badge}</span>}</Link>
  );
  return (
    <>
      <header className="top">
        <Link href="/questoes" className="brand"><Logo /></Link>
        <nav>
          {item('/questoes', 'Questões')}
          {item('/trilhas', 'Trilha de estudo')}
          {item('/simulados', 'Simulados')}
          {item('/caderno', 'Caderno de erros')}
          {item('/desempenho', 'Desempenho')}
          {item('/ranking', 'Ranking')}
          {item('/offline', 'Modo offline', pend)}
          {item('/feedback', 'Feedback', cnt.r)}
          {staff && item('/painel', 'Painel', cnt.n)}
          <Link href="/perfil" className={`perfilbtn${path === '/perfil' ? ' on' : ''}`}>
            <Avatar path={profile?.avatar_path} nome={profile?.nome} size={26} />Perfil
          </Link>
          <button onClick={() => { limparCache(); supabase.auth.signOut(); }}>Sair</button>
        </nav>
      </header>
      <main className="wrap">{children}</main>
      <footer className="foot">DG QUESTÕES · carreiras policiais</footer>
      <button type="button" className="fab" onClick={() => setFb(true)} aria-label="Enviar feedback para a equipe">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H8l-4 4V4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>Feedback
      </button>
      {fb && <FeedbackDialog onClose={() => setFb(false)} />}
    </>
  );
}
