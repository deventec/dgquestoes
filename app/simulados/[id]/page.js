'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import QuestionCard from '@/components/QuestionCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LETRAS } from '@/lib/constants';
import AltRow from '@/components/AltRow';
import { useEliminadas, limparEliminadas } from '@/lib/eliminadas';

// Questão em andamento: marcar é imediato (o gabarito só sai ao finalizar) e dá para riscar alternativas com a arma
function QuestaoSimulado({ it, n, onMarcar }) {
  const q = it.questions, L = LETRAS[q.tipo];
  const [cortadas, alternar] = useEliminadas(q.id);
  return (
    <div className="card">
      <div className="tags"><span className="tag">Questão {n + 1}</span><span className="tag">{q.materia}</span><span className="tag">{q.banca} {q.ano}</span></div>
      <div>{q.enunciado}</div>
      {q.alternativas.map((a, i) => (
        <AltRow key={i} letra={L[i]} texto={a} estado={it.escolha === i ? 'sel' : ''} cortada={cortadas.includes(i)}
          onPick={() => onMarcar(it, it.escolha === i ? null : i)}
          onCut={() => { if (it.escolha === i) onMarcar(it, null); alternar(i); }} />
      ))}
    </div>
  );
}

function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`;
}

export default function Simulado() {
  const { id } = useParams();
  const { loading, user, profile } = useAuth();
  const [sim, setSim] = useState(null);
  const [itens, setItens] = useState([]);
  const [left, setLeft] = useState(null);
  const [erro, setErro] = useState('');
  const [gabs, setGabs] = useState({});
  const finishing = useRef(false);

  const load = useCallback(async () => {
    const { data: s } = await supabase.from('simulados').select('*').eq('id', id).single();
    if (!s) return setErro('Simulado não encontrado.');
    const { data: it } = await supabase.from('simulado_itens').select('question_id,ordem,escolha,questions(*)').eq('simulado_id', id).order('ordem');
    setSim(s); setItens((it || []).filter(x => x.questions));
  }, [id]);
  useEffect(() => { if (user) load(); }, [user, load]);

  const carregarGabarito = useCallback(async () => {
    const { data } = await supabase.rpc('gabarito_simulado', { p_simulado: id });
    setGabs(Object.fromEntries((data || []).map(r => [r.q_id, { correta: r.g_correta, comentario: r.g_comentario }])));
  }, [id]);

  // A correção acontece no servidor; o navegador só recebe o resultado.
  const finalizar = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    const { error } = await supabase.rpc('finalizar_simulado', { p_simulado: id });
    if (error) { finishing.current = false; return setErro(error.message); }
    limparEliminadas(itens.map(x => x.question_id));
    await load();
  }, [id, load, itens]);

  // Ao abrir um simulado já finalizado, busca o gabarito liberado pelo servidor.
  useEffect(() => { if (sim?.finished_at) carregarGabarito(); }, [sim?.finished_at, carregarGabarito]);

  // Cronômetro: calculado pelo horário de início, então continua certo se a página recarregar.
  useEffect(() => {
    if (!sim || sim.finished_at) return;
    const tick = () => {
      const r = sim.duracao_seg - Math.floor((Date.now() - new Date(sim.started_at).getTime()) / 1000);
      setLeft(Math.max(0, r));
      if (r <= 0) finalizar();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [sim, finalizar]);

  async function marcar(it, i) {
    setErro('');
    const anterior = it.escolha;
    setItens(l => l.map(x => x.question_id === it.question_id ? { ...x, escolha: i } : x));
    const { error } = await supabase.rpc('marcar_item', { p_simulado: id, p_question: it.question_id, p_escolha: i });
    if (error) {
      setItens(l => l.map(x => x.question_id === it.question_id ? { ...x, escolha: anterior } : x));
      setErro(error.message);
      if (/tempo/i.test(error.message)) finalizar();
    }
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;
  if (erro && !sim) return <Shell profile={profile}><div className="card">{erro} <Link href="/simulados">Voltar</Link></div></Shell>;
  if (!sim) return <Shell profile={profile}><p className="mut">Carregando simulado…</p></Shell>;

  const isAdmin = profile?.role === 'admin';

  // Resultado
  if (sim.finished_at) {
    const pct = Math.round(sim.acertos / sim.total * 100);
    const branco = itens.filter(x => x.escolha === null || x.escolha === undefined).length;
    return (
      <Shell profile={profile}>
        <div className="card">
          <h2 style={{ margin: '0 0 6px' }}>{sim.titulo}</h2>
          <div className="stats">
            <div className="stat"><b>{sim.acertos}/{sim.total}</b>Acertos</div>
            <div className="stat"><b>{pct}%</b>Aproveitamento</div>
            <div className="stat"><b>{sim.total - sim.acertos - branco}</b>Erros</div>
            <div className="stat"><b>{branco}</b>Em branco</div>
          </div>
          <p style={{ marginBottom: 0 }}><Link href="/simulados">Novo simulado</Link> · <Link href="/caderno">Revisar no caderno de erros</Link></p>
        </div>
        {itens.map(it => (
          <QuestionCard key={it.question_id} q={it.questions} my={it.escolha ?? -1} gab={gabs[it.question_id]} onAnswer={() => {}} user={user} isAdmin={isAdmin} />
        ))}
      </Shell>
    );
  }

  // Prova em andamento
  const marcadas = itens.filter(x => x.escolha !== null && x.escolha !== undefined).length;
  return (
    <Shell profile={profile}>
      <div className={`timer${left !== null && left < 300 ? ' low' : ''}`}>
        <div><span className="mut">Tempo restante</span><br /><b>{left === null ? '--:--' : fmt(left)}</b></div>
        <span className="pill">{marcadas}/{itens.length} marcadas</span>
        <button className="btn sm" onClick={() => { if (confirm(`Finalizar o simulado? ${itens.length - marcadas} questão(ões) ficarão em branco.`)) finalizar(); }}>Finalizar</button>
      </div>
      {erro && <div className="msg e">{erro}</div>}
      {itens.map((it, n) => <QuestaoSimulado key={it.question_id} it={it} n={n} onMarcar={marcar} />)}
    </Shell>
  );
}
