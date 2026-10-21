'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import QuestionCard from '@/components/QuestionCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MATERIAS } from '@/lib/constants';

export default function Caderno() {
  const { loading, user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [gabs, setGabs] = useState({});
  const [materia, setMateria] = useState('');
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState('');

  async function load() {
    const { data } = await supabase.from('answers')
      .select('question_id,escolha,questions(*)').eq('user_id', user.id).eq('correta', false)
      .order('created_at', { ascending: false }).limit(200);
    const lista = (data || []).filter(r => r.questions).map(r => ({ q: r.questions, escolha: r.escolha }));
    setItems(lista);
    if (lista.length) {
      const { data: g } = await supabase.rpc('gabaritos', { p_ids: lista.map(x => x.q.id) });
      setGabs(Object.fromEntries((g || []).map(r => [r.q_id, { correta: r.g_correta, comentario: r.g_comentario }])));
    }
    setReady(true);
  }
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  // "Refazer" libera a questão para uma nova tentativa (que não conta no ranking)
  async function refazer(id) {
    setErro('');
    const { error } = await supabase.rpc('refazer_questao', { p_question: id });
    if (error) return setErro(error.message);
    setItems(l => l.map(x => x.q.id === id ? { ...x, escolha: undefined } : x));
    setGabs(g => { const n = { ...g }; delete n[id]; return n; });
  }
  async function responder(q, i) {
    setErro('');
    const { data, error } = await supabase.rpc('responder_questao', { p_question: q.id, p_escolha: i });
    if (error) { setErro(error.message); return false; }
    const r = data[0];
    setItems(l => l.map(x => x.q.id === q.id ? { ...x, escolha: r.r_escolha } : x));
    setGabs(g => ({ ...g, [q.id]: { correta: r.r_gabarito, comentario: r.r_comentario } }));
    return true;
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;
  const vis = items.filter(x => !materia || x.q.materia === materia);

  return (
    <Shell profile={profile}>
      <div className="card">
        <h2 style={{ margin: '0 0 6px' }}>Caderno de erros</h2>
        <p className="mut" style={{ marginTop: 0 }}>Questões que você errou. Toque em "Refazer" para tentar de novo: se acertar, ela sai do caderno na próxima visita. Questões refeitas não contam no ranking.</p>
        <label>Matéria</label>
        <select value={materia} onChange={e => setMateria(e.target.value)}>
          <option value="">Todas</option>{MATERIAS.map(m => <option key={m}>{m}</option>)}
        </select>
        <p className="mut" style={{ margin: '10px 0 0' }}>{ready ? `${vis.length} questão(ões) no caderno` : 'Carregando…'}</p>
      </div>
      {erro && <div className="msg e">{erro}</div>}
      {vis.map(({ q, escolha }) => (
        <QuestionCard key={q.id} q={q} my={escolha} gab={gabs[q.id]} onAnswer={responder} user={user} isAdmin={profile?.role === 'admin'}
          extra={escolha !== undefined && gabs[q.id] && escolha !== gabs[q.id].correta ? <button className="btn sm" onClick={() => refazer(q.id)}>Refazer</button> : null} />
      ))}
      {ready && !vis.length && <div className="card mut">Caderno vazio. Os erros que você cometer em questões e simulados aparecem aqui.</div>}
    </Shell>
  );
}
