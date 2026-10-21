'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function Desempenho() {
  const { loading, user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [bank, setBank] = useState(0);
  const [fracos, setFracos] = useState([]);

  async function load() {
    const { data } = await supabase.from('answers').select('correta, questions(materia)').limit(5000);
    setRows(data || []);
    const { count } = await supabase.from('questions').select('id', { count: 'exact', head: true });
    setBank(count || 0);
    const { data: ra } = await supabase.rpc('resumo_assuntos');
    setFracos((ra || []).filter(r => Number(r.r_respondidas) >= 3 && r.r_assunto)
      .map(r => ({ ...r, pct: Math.round(Number(r.r_acertos) / Number(r.r_respondidas) * 100) }))
      .sort((a, b) => a.pct - b.pct).slice(0, 6));
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function zerar() {
    if (!confirm('Zerar todo o seu histórico de respostas?')) return;
    await supabase.rpc('zerar_historico');
    load();
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;
  const total = rows.length, ok = rows.filter(r => r.correta).length;
  const by = {};
  rows.forEach(r => { const m = r.questions?.materia || 'Outras'; by[m] = by[m] || { t: 0, c: 0 }; by[m].t++; if (r.correta) by[m].c++; });

  return (
    <Shell profile={profile}>
      <div className="card">
        <div className="stats">
          <div className="stat"><b>{total}</b>Respondidas</div>
          <div className="stat"><b>{ok}</b>Acertos</div>
          <div className="stat"><b>{total ? Math.round(ok / total * 100) : 0}%</b>Aproveitamento</div>
          <div className="stat"><b>{bank}</b>No banco</div>
        </div>
        {Object.keys(by).length === 0 && <p className="mut">Responda questões para ver seu desempenho por matéria.</p>}
        {Object.entries(by).map(([m, v]) => {
          const p = Math.round(v.c / v.t * 100);
          return (
            <div key={m} style={{ marginTop: 12 }}>
              <div className="row"><span>{m}</span><span className="mut">{v.c}/{v.t} ({p}%)</span></div>
              <div className="bar"><div style={{ width: `${p}%` }} /></div>
            </div>
          );
        })}
        <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={zerar}>Zerar meu histórico</button>
      </div>
      {fracos.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Onde focar</h3>
          <p className="mut" style={{ marginTop: 0 }}>Seus assuntos com menor aproveitamento (mínimo de 3 respostas). Toque para estudar.</p>
          {fracos.map(r => (
            <Link key={r.r_materia + r.r_assunto} className="assunto" style={{ textDecoration: 'none' }}
              href={`/questoes?${new URLSearchParams({ materia: r.r_materia, assunto: r.r_assunto })}`}>
              <span><b>{r.r_assunto}</b> <span className="mut">· {r.r_materia}</span></span>
              <span className="mut">{r.r_acertos}/{r.r_respondidas} acertos · {r.pct}%</span>
              <span className="bar"><span style={{ width: `${r.pct}%` }} /></span>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
