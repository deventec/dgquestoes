'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import QuestionCard from '@/components/QuestionCard';
import MetaDiaria from '@/components/MetaDiaria';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MATERIAS, BANCAS } from '@/lib/constants';

const PAGE = 20;
const NONE = '__none__';

export default function Questoes() {
  const { loading, user, profile } = useAuth();
  const [f, setF] = useState({ materia: '', assunto: '', banca: '', ano: '', q: '' });
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [ans, setAns] = useState({});
  const [gabs, setGabs] = useState({});
  const [opts, setOpts] = useState([]);   // assuntos da matéria (e da banca escolhida)
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  // Links da tela de Desempenho abrem já filtrados: /questoes?materia=...&assunto=...
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('materia')) setF(x => ({ ...x, materia: sp.get('materia'), assunto: sp.get('assunto') || '' }));
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    let q = supabase.from('questions').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (f.materia) q = q.eq('materia', f.materia);
    if (f.assunto) q = q.eq('assunto', f.assunto === NONE ? '' : f.assunto);
    if (f.banca) q = q.eq('banca', f.banca);
    if (f.ano) q = q.eq('ano', Number(f.ano));
    if (f.q) q = q.ilike('enunciado', `%${f.q.replace(/[%,]/g, ' ')}%`);
    const { data, count } = await q;
    setList(data || []); setTotal(count || 0);
    if (data?.length) {
      const { data: a } = await supabase.from('answers').select('question_id,escolha').in('question_id', data.map(x => x.id));
      setAns(p => ({ ...p, ...Object.fromEntries((a || []).map(r => [r.question_id, r.escolha])) }));
      if (a?.length) {
        const { data: g } = await supabase.rpc('gabaritos', { p_ids: a.map(r => r.question_id) });
        setGabs(p => ({ ...p, ...Object.fromEntries((g || []).map(r => [r.q_id, { correta: r.g_correta, comentario: r.g_comentario }])) }));
      }
    }
    setBusy(false);
  }, [f, page]);
  useEffect(() => { if (user) load(); }, [user, load]);

  // Assuntos disponíveis para a matéria e, se houver, só os da banca escolhida
  useEffect(() => {
    if (!user) return;
    if (!f.materia) { setOpts([]); return; }
    supabase.rpc('lista_assuntos', { p_materia: f.materia, p_banca: f.banca }).then(({ data }) => {
      const l = data || [];
      setOpts(l);
      const val = f.assunto === NONE ? '' : f.assunto;
      if (f.assunto && !l.some(o => o.a_assunto === val)) setF(x => ({ ...x, assunto: '' }));
    });
  }, [user, f.materia, f.banca]); // eslint-disable-line

  const filtro = k => e => { setPage(0); setF(x => ({ ...x, [k]: e.target.value, ...(k === 'materia' ? { assunto: '' } : {}) })); };

  async function responder(q, i) {
    setErro('');
    const { data, error } = await supabase.rpc('responder_questao', { p_question: q.id, p_escolha: i });
    if (error) { setErro(error.message); return false; }
    const r = data[0];
    setAns(p => ({ ...p, [q.id]: r.r_escolha }));
    setGabs(p => ({ ...p, [q.id]: { correta: r.r_gabarito, comentario: r.r_comentario } }));
    return true;
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const nResp = Object.keys(ans).length;

  return (
    <Shell profile={profile}>
      <MetaDiaria refreshKey={nResp} />
      <div className="card">
        <div className="grid">
          <div><label>Matéria</label>
            <select value={f.materia} onChange={filtro('materia')}><option value="">Todas</option>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Assunto</label>
            <select value={f.assunto} onChange={filtro('assunto')} disabled={!f.materia}>
              <option value="">{f.materia ? 'Todos' : 'Escolha a matéria'}</option>
              {opts.map(o => <option key={o.a_assunto || NONE} value={o.a_assunto || NONE}>{o.a_assunto || 'Sem assunto'} ({o.a_total})</option>)}
            </select></div>
          <div><label>Banca</label>
            <select value={f.banca} onChange={filtro('banca')}><option value="">Todas</option>{BANCAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Ano</label><input inputMode="numeric" placeholder="2024" value={f.ano} onChange={filtro('ano')} /></div>
          <div><label>Buscar no enunciado</label><input value={f.q} onChange={filtro('q')} /></div>
        </div>
        <p className="mut" style={{ margin: '10px 0 0' }}>
          {busy ? 'Buscando…' : `${total} questão(ões) encontrada(s)`}
          {f.materia && f.banca && <> · assuntos com questões da banca <b>{f.banca}</b></>}
        </p>
        <p className="mut" style={{ margin: '6px 0 0', fontSize: 13 }}>Dica: toque na arma ao lado de uma alternativa para riscá-la. Escolha a alternativa e confirme para ver o resultado.</p>
      </div>

      {erro && <div className="msg e">{erro}</div>}
      {list.map(q => (
        <QuestionCard key={q.id} q={q} my={ans[q.id]} gab={gabs[q.id]} onAnswer={responder} user={user} isAdmin={profile?.role === 'admin'} />
      ))}
      {!busy && !list.length && <div className="card mut">Nenhuma questão com esses filtros.</div>}

      {pages > 1 && (
        <div className="row">
          <button className="btn ghost sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
          <span className="mut">Página {page + 1} de {pages}</span>
          <button className="btn ghost sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Próxima</button>
        </div>
      )}
    </Shell>
  );
}
