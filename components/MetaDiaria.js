'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Medalha from './Medalha';

function Chama({ ativa }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.2 1.8 2.5C10.5 8 10.5 5 12 2z"
        fill={ativa ? '#f59e0b' : 'none'} stroke={ativa ? '#d97706' : 'currentColor'} strokeWidth="1.5" strokeLinejoin="round" opacity={ativa ? 1 : .5} />
    </svg>
  );
}

// refreshKey: mude o valor para recarregar (ex.: nº de respostas na sessão)
export default function MetaDiaria({ refreshKey = 0 }) {
  const [d, setD] = useState(null);
  const [festa, setFesta] = useState(false);
  const [novas, setNovas] = useState([]);
  const antes = useRef(null);

  useEffect(() => {
    supabase.rpc('minha_sequencia').then(({ data }) => {
      const r = data?.[0];
      if (!r) return;
      if (antes.current !== null && antes.current < r.r_meta && r.r_hoje >= r.r_meta) setFesta(true);
      antes.current = r.r_hoje;
      setD(r);
    });
    supabase.rpc('conquistas_novas').then(({ data }) => { if (data?.length) setNovas(n => [...n, ...data]); });
  }, [refreshKey]);

  if (!d) return null;
  const pct = Math.min(100, Math.round(d.r_hoje / d.r_meta * 100));
  const bateu = d.r_hoje >= d.r_meta;
  const falta = Math.max(0, d.r_meta - d.r_hoje);
  const C = 2 * Math.PI * 26;

  return (
    <>
      {novas.length > 0 && (
        <div className="toast-medalha" role="status" aria-live="polite">
          <Medalha familia={novas[0].c_familia} nivel={novas[0].c_nivel} limite={novas[0].c_limite} size={64} />
          <div>
            <b>Nova medalha: {novas[0].c_nome}!</b>
            <span className="mut">{novas[0].c_descricao}</span>
            {novas.length > 1 && <span className="mut">+ {novas.length - 1} outra(s) em Perfil › Conquistas</span>}
          </div>
          <button type="button" className="minibtn" style={{ background: 'var(--bd)', color: 'var(--tx)' }} onClick={() => setNovas([])} aria-label="Fechar aviso">✕</button>
        </div>
      )}
      <div className="card meta">
        <div className="ring" role="img" aria-label={`${d.r_hoje} de ${d.r_meta} questões hoje`}>
          <svg viewBox="0 0 64 64" width="84" height="84">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--bd)" strokeWidth="7" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={bateu ? 'var(--ok)' : 'var(--acc)'} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 32 32)" />
          </svg>
          <span><b>{d.r_hoje}</b>/{d.r_meta}</span>
        </div>
        <div className="metatxt">
          <b>Meta do dia</b>
          <span className="mut">
            {bateu ? 'Meta batida! Cada questão a mais é bônus.' : `Faltam ${falta} questão(ões) para bater a meta de hoje.`}
          </span>
          {festa && <span className="pill" style={{ background: 'color-mix(in srgb, var(--ok) 20%, transparent)', color: 'var(--ok)' }}>✓ Meta do dia batida!</span>}
        </div>
        <div className="seq">
          <Chama ativa={d.r_atual > 0} />
          <div>
            <b>{d.r_atual} {d.r_atual === 1 ? 'dia' : 'dias'}</b>
            <span className="mut">
              {d.r_em_risco ? 'Bata a meta hoje para manter a sequência.' : d.r_atual > 0 ? `Sequência ativa · recorde ${d.r_recorde}` : 'Bata a meta hoje para começar uma sequência.'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
