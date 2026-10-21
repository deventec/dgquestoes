'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// Regra do passo concluído: ao menos 10 questões respondidas (ou todas, se houver menos) com 70% de acerto.
const MIN = 10, META = 70;

export default function Trilhas() {
  const { loading, user, profile } = useAuth();
  const [trilhas, setTrilhas] = useState([]);
  const [sel, setSel] = useState('');
  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from('trilhas').select('*').eq('ativa', true).order('nome');
      setTrilhas(t || []);
      const salva = typeof window !== 'undefined' ? localStorage.getItem('dg_trilha') : null;
      setSel((t || []).find(x => x.id === salva)?.id || t?.[0]?.id || '');
      const { data: r } = await supabase.rpc('resumo_assuntos');
      setResumo(r || []);
      setReady(true);
    })();
  }, [user]);

  useEffect(() => {
    if (!sel) { setItens([]); return; }
    try { localStorage.setItem('dg_trilha', sel); } catch {}
    supabase.from('trilha_itens').select('*').eq('trilha_id', sel).order('ordem').then(({ data }) => setItens(data || []));
  }, [sel]);

  function progresso(it) {
    const rows = resumo.filter(r => r.r_materia === it.materia && (!it.assunto || r.r_assunto === it.assunto));
    const tot = rows.reduce((n, r) => n + Number(r.r_total), 0);
    const resp = rows.reduce((n, r) => n + Number(r.r_respondidas), 0);
    const ok = rows.reduce((n, r) => n + Number(r.r_acertos), 0);
    const pct = resp ? Math.round(ok / resp * 100) : 0;
    const feito = tot > 0 && resp >= Math.min(tot, MIN) && pct >= META;
    return { tot, resp, ok, pct, feito };
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;

  const prog = itens.map(progresso);
  const validos = prog.filter(p => p.tot > 0);
  const feitos = validos.filter(p => p.feito).length;
  const proxIdx = prog.findIndex(p => p.tot > 0 && !p.feito);
  const atual = trilhas.find(t => t.id === sel);

  return (
    <Shell profile={profile}>
      <div className="card">
        <h2 style={{ margin: '0 0 6px' }}>Trilha de estudo</h2>
        <p className="mut" style={{ marginTop: 0 }}>Uma ordem sugerida de assuntos para o seu cargo. Um passo conta como concluído com pelo menos {MIN} questões respondidas (ou todas, se houver menos) e {META}% de acerto.</p>
        {ready && !trilhas.length && <p className="mut">Ainda não há trilhas publicadas.</p>}
        {trilhas.length > 0 && (
          <>
            <label>Cargo / concurso</label>
            <select value={sel} onChange={e => setSel(e.target.value)}>
              {trilhas.map(t => <option key={t.id} value={t.id}>{t.nome}{t.cargo ? ` (${t.cargo})` : ''}</option>)}
            </select>
            {atual?.descricao && <p className="mut">{atual.descricao}</p>}
            {validos.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="row"><b>Seu progresso</b><span className="mut">{feitos}/{validos.length} passos</span></div>
                <div className="bar"><div style={{ width: `${Math.round(feitos / validos.length * 100)}%` }} /></div>
              </div>
            )}
          </>
        )}
      </div>

      {itens.map((it, i) => {
        const p = prog[i];
        const cls = `passo${p.feito ? ' ok' : ''}${i === proxIdx ? ' prox' : ''}`;
        const href = `/questoes?${new URLSearchParams({ materia: it.materia, ...(it.assunto ? { assunto: it.assunto } : {}) })}`;
        return (
          <div className={cls} key={it.id}>
            <div className="row">
              <span><span className="n">{p.feito ? '✓' : i + 1}</span><b>{it.assunto || `${it.materia} (matéria inteira)`}</b> <span className="mut">· {it.materia}</span></span>
              {i === proxIdx && <span className="pill">Próximo passo</span>}
              {p.feito && <span className="pill">Concluído</span>}
            </div>
            {it.observacao && <span className="mut">{it.observacao}</span>}
            {p.tot === 0
              ? <span className="mut">Ainda sem questões neste assunto. Em breve.</span>
              : <>
                  <span className="mut">{p.resp}/{p.tot} respondidas{p.resp ? ` · ${p.pct}% de acerto` : ''}</span>
                  <div className="bar"><div style={{ width: `${Math.round(p.resp / p.tot * 100)}%` }} /></div>
                  <div><Link className="btn sm" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 6 }} href={href}>{p.resp ? 'Continuar estudando' : 'Começar'}</Link></div>
                </>}
          </div>
        );
      })}
    </Shell>
  );
}
