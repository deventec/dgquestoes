'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import QuestionCard from '@/components/QuestionCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MATERIAS, BANCAS } from '@/lib/constants';
import { listarPacote, salvarPacote, marcarRespondida, enfileirar, listarFila, limparNaoRespondidas } from '@/lib/offline';
import { sincronizar } from '@/lib/sync';

const NONE = '__none__';

export default function ModoOffline() {
  const { loading, user, profile } = useAuth();
  const [online, setOnline] = useState(true);
  const [pack, setPack] = useState([]);
  const [pend, setPend] = useState(0);
  const [mat, setMat] = useState('');
  const [f, setF] = useState({ materia: '', assunto: '', banca: '', qtd: 50 });
  const [opts, setOpts] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const aviso = (t, m) => setMsg({ t, m });

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const recarregar = useCallback(async () => {
    if (!user) return;
    try {
      setPack(await listarPacote(user.id));
      setPend((await listarFila(user.id)).length);
    } catch (e) { aviso('e', e.message); }
  }, [user]);
  useEffect(() => { recarregar(); }, [recarregar]);

  // Assuntos da matéria/banca escolhidas para o download (só com internet)
  useEffect(() => {
    if (!user || !online || !f.materia) { setOpts([]); return; }
    supabase.rpc('lista_assuntos', { p_materia: f.materia, p_banca: f.banca }).then(({ data }) => {
      const l = data || [];
      setOpts(l);
      const val = f.assunto === NONE ? '' : f.assunto;
      if (f.assunto && !l.some(o => o.a_assunto === val)) setF(x => ({ ...x, assunto: '' }));
    });
  }, [user, online, f.materia, f.banca]); // eslint-disable-line

  async function baixar(e) {
    e.preventDefault();
    setBusy('baixar'); setMsg(null);
    const { data, error } = await supabase.rpc('pacote_offline', { p_materia: f.materia, p_assunto: f.assunto, p_banca: f.banca, p_qtd: Number(f.qtd) || 50 });
    if (error) { setBusy(''); return aviso('e', error.message); }
    try {
      const novos = await salvarPacote(user.id, data || []);
      try { await navigator.storage?.persist?.(); } catch {}
      aviso(novos ? 'o' : 'e', novos ? `${novos} questão(ões) baixada(s). Já dá para estudar sem internet.` : 'Nenhuma questão nova para esses filtros (você já respondeu ou já baixou todas).');
      await recarregar();
    } catch (err) { aviso('e', err.message); }
    setBusy('');
  }

  async function responder(q, i) {
    try {
      await enfileirar(user.id, { question_id: q.id, escolha: i, quando: new Date().toISOString() });
      await marcarRespondida(user.id, q.id, i);
      setPack(p => p.map(x => (x.id === q.id ? { ...x, respondida: i } : x)));
      setPend(n => n + 1);
      return true;
    } catch (err) { aviso('e', err.message); return false; }
  }

  async function enviar() {
    setBusy('sync'); setMsg(null);
    const r = await sincronizar(user.id);
    if (r.erro) aviso('e', `Não foi possível sincronizar agora: ${r.erro}`);
    else aviso('o', `${r.ok} resposta(s) sincronizada(s)${r.ign ? ` (${r.ign} já estavam registradas)` : ''}.`);
    await recarregar();
    setBusy('');
  }

  async function limpar() {
    if (!confirm('Remover do aparelho as questões baixadas que você ainda não respondeu? As respostas pendentes de envio são mantidas.')) return;
    const n = await limparNaoRespondidas(user.id);
    aviso('o', `${n} questão(ões) removida(s) do aparelho.`);
    recarregar();
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;

  const lista = pack.filter(x => !mat || x.materia === mat)
    .sort((a, b) => Number(a.respondida !== null && a.respondida !== undefined) - Number(b.respondida !== null && b.respondida !== undefined));
  const porResponder = pack.filter(x => x.respondida === null || x.respondida === undefined).length;
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value, ...(k === 'materia' ? { assunto: '' } : {}) }));

  return (
    <Shell profile={profile}>
      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Modo offline</h2>
          <span className={`pill${online ? '' : ' warn'}`}>{online ? 'Com internet' : 'Sem internet'}</span>
        </div>
        <p className="mut" style={{ marginBottom: 0 }}>
          Baixe um pacote de questões enquanto tem internet e estude em qualquer lugar. As respostas ficam guardadas no aparelho e são enviadas
          automaticamente quando a conexão voltar. Elas valem para desempenho, meta diária, sequência e medalhas, mas não para o ranking.
          Comentários e reporte de erro precisam de internet.
        </p>
      </div>
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}

      <div className="stats">
        <div className="stat"><b>{porResponder}</b>Questões para estudar</div>
        <div className="stat"><b>{pend}</b>Respostas a sincronizar</div>
      </div>

      {pend > 0 && (
        <div className="card row">
          <span>Você tem <b>{pend}</b> resposta(s) feitas offline esperando para serem enviadas.</span>
          <button className="btn sm" onClick={enviar} disabled={!online || busy === 'sync'}>{busy === 'sync' ? 'Sincronizando…' : online ? 'Sincronizar agora' : 'Precisa de internet'}</button>
        </div>
      )}

      <form className="card" onSubmit={baixar}>
        <h3 style={{ marginTop: 0 }}>Baixar pacote de questões</h3>
        <div className="grid">
          <div><label>Matéria</label><select value={f.materia} onChange={set('materia')} disabled={!online}><option value="">Todas</option>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Assunto</label>
            <select value={f.assunto} onChange={set('assunto')} disabled={!online || !f.materia}>
              <option value="">{f.materia ? 'Todos' : 'Escolha a matéria'}</option>
              {opts.map(o => <option key={o.a_assunto || NONE} value={o.a_assunto || NONE}>{o.a_assunto || 'Sem assunto'} ({o.a_total})</option>)}
            </select></div>
          <div><label>Banca</label><select value={f.banca} onChange={set('banca')} disabled={!online}><option value="">Todas</option>{BANCAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Quantidade</label><select value={f.qtd} onChange={set('qtd')} disabled={!online}>{[25, 50, 100].map(n => <option key={n} value={n}>{n} questões</option>)}</select></div>
        </div>
        <button className="btn" disabled={!online || busy === 'baixar'}>{busy === 'baixar' ? 'Baixando…' : online ? 'Baixar para estudar offline' : 'Conecte-se para baixar'}</button>
        <p className="mut" style={{ marginBottom: 0, fontSize: 13 }}>O pacote traz só questões que você ainda não respondeu. Ele inclui o gabarito para você ver o resultado sem internet.</p>
      </form>

      {pack.length > 0 && (
        <div className="card">
          <div className="grid">
            <div><label>Filtrar pelo que está no aparelho</label>
              <select value={mat} onChange={e => setMat(e.target.value)}><option value="">Todas as matérias</option>
                {[...new Set(pack.map(x => x.materia))].sort().map(m => <option key={m}>{m}</option>)}</select></div>
          </div>
          <p className="mut" style={{ margin: '10px 0 0', fontSize: 13 }}>Dica: toque na arma para riscar uma alternativa; escolha e confirme para ver o resultado.</p>
          {porResponder > 0 && <button className="lnk mutl" style={{ marginTop: 8 }} onClick={limpar}>Remover do aparelho as que não respondi</button>}
        </div>
      )}

      {lista.map(item => {
        const feita = item.respondida !== null && item.respondida !== undefined;
        return (
          <QuestionCard key={item.id} q={item} offline onAnswer={responder}
            my={feita ? item.respondida : undefined}
            gab={feita ? { correta: item.correta, comentario: item.comentario } : undefined} />
        );
      })}
      {!pack.length && <div className="card mut">Nenhuma questão no aparelho ainda. {online ? 'Escolha os filtros acima e baixe um pacote.' : 'Conecte-se à internet para baixar um pacote.'}</div>}
    </Shell>
  );
}
