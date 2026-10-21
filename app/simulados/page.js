'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MATERIAS, BANCAS } from '@/lib/constants';

export default function Simulados() {
  const router = useRouter();
  const { loading, user, profile } = useAuth();
  const [f, setF] = useState({ materia: '', assunto: '', banca: '', qtd: 20, min: 60 });
  const [hist, setHist] = useState([]);
  const [assuntos, setAssuntos] = useState([]);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('simulados').select('*').order('started_at', { ascending: false }).limit(30).then(({ data }) => setHist(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!f.materia) { setAssuntos([]); return; }
    supabase.rpc('lista_assuntos', { p_materia: f.materia, p_banca: f.banca }).then(({ data }) => {
      const l = data || [];
      setAssuntos(l);
      const val = f.assunto === '__none__' ? '' : f.assunto;
      if (f.assunto && !l.some(o => o.a_assunto === val)) setF(x => ({ ...x, assunto: '' }));
    });
  }, [user, f.materia, f.banca]); // eslint-disable-line

  async function criar(e) {
    e.preventDefault();
    setBusy(true); setErro('');
    const { data, error } = await supabase.rpc('criar_simulado', {
      p_materia: f.materia, p_banca: f.banca, p_assunto: f.assunto, p_qtd: Number(f.qtd) || 10, p_min: Number(f.min) || 60
    });
    if (error) { setBusy(false); return setErro(error.message); }
    router.push(`/simulados/${data}`);
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;
  const set = k => e => setF({ ...f, [k]: e.target.value, ...(k === 'materia' ? { assunto: '' } : {}) });

  return (
    <Shell profile={profile}>
      <form className="card" onSubmit={criar}>
        <h2 style={{ margin: '0 0 6px' }}>Novo simulado</h2>
        <p className="mut" style={{ marginTop: 0 }}>As questões são sorteadas no servidor e a correção também é feita lá: o gabarito só é liberado quando você finaliza ou o tempo acaba.</p>
        {erro && <div className="msg e">{erro}</div>}
        <div className="grid">
          <div><label>Matéria</label><select value={f.materia} onChange={set('materia')}><option value="">Todas</option>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Assunto</label>
            <select value={f.assunto} onChange={set('assunto')} disabled={!f.materia}>
              <option value="">{f.materia ? 'Todos' : 'Escolha a matéria'}</option>
              {assuntos.map(a => <option key={a.a_assunto || '__none__'} value={a.a_assunto || '__none__'}>{a.a_assunto || 'Sem assunto'} ({a.a_total})</option>)}
            </select></div>
          <div><label>Banca</label><select value={f.banca} onChange={set('banca')}><option value="">Todas</option>{BANCAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Nº de questões</label><input type="number" min="1" max="120" value={f.qtd} onChange={set('qtd')} /></div>
          <div><label>Tempo (minutos)</label><input type="number" min="1" max="360" value={f.min} onChange={set('min')} /></div>
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Montando…' : 'Começar simulado'}</button>
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Seus simulados</h3>
        {!hist.length && <p className="mut">Você ainda não fez nenhum simulado.</p>}
        <div className="scroll"><table>
          <tbody>{hist.map(s => (
            <tr key={s.id}>
              <td>{s.titulo}<br /><span className="mut">{new Date(s.started_at).toLocaleString('pt-BR')}</span></td>
              <td>{s.finished_at ? <span className="pill">{s.acertos}/{s.total} · {Math.round(s.acertos / s.total * 100)}%</span> : <span className="pill">Em andamento</span>}</td>
              <td><Link href={`/simulados/${s.id}`}>{s.finished_at ? 'Ver resultado' : 'Continuar'}</Link></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </Shell>
  );
}
