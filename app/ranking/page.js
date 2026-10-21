'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const PERIODOS = [{ k: 7, t: 'Últimos 7 dias' }, { k: 30, t: 'Últimos 30 dias' }, { k: null, t: 'Geral' }];

// "Maria Souza Lima" → "Maria L."
function curto(nome) {
  const p = (nome || '').trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : (p[0] || 'Aluno');
}

export default function Ranking() {
  const { loading, user, profile } = useAuth();
  const [per, setPer] = useState(7);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [show, setShow] = useState(true);

  useEffect(() => { if (profile) setShow(profile.mostrar_ranking !== false); }, [profile]);
  useEffect(() => {
    if (!user) return;
    setBusy(true);
    supabase.rpc('ranking', { dias: per }).then(({ data }) => { setRows(data || []); setBusy(false); });
  }, [user, per, show]);

  async function alternar() {
    const v = !show;
    setShow(v);
    await supabase.rpc('definir_ranking', { v });
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;

  return (
    <Shell profile={profile}>
      <div className="card">
        <h2 style={{ margin: '0 0 6px' }}>Ranking</h2>
        <p className="mut" style={{ marginTop: 0 }}>Ordenado por aproveitamento. Entra quem tiver ao menos 10 questões respondidas no período, e cada questão conta uma vez.</p>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          {PERIODOS.map(p => (
            <button key={String(p.k)} className={`btn sm ${per === p.k ? '' : 'ghost'}`} onClick={() => setPer(p.k)}>{p.t}</button>
          ))}
        </div>
        <div className="scroll" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>#</th><th>Aluno</th><th>Respondidas</th><th>Acertos</th><th>Aproveit.</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.user_id} className={r.user_id === user.id ? 'me' : ''}>
                  <td>{i + 1}</td><td>{curto(r.nome)}</td><td>{r.respondidas}</td><td>{r.acertos}</td><td>{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!busy && !rows.length && <p className="mut">Ninguém atingiu 10 questões neste período ainda. Resolva questões para aparecer aqui.</p>}
      </div>
      <div className="card">
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: 0, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={show} onChange={alternar} />
          <span>Mostrar meu nome no ranking (aparece só o primeiro nome e a inicial do sobrenome)</span>
        </label>
      </div>
    </Shell>
  );
}
