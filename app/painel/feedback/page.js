'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TIPOS, STATUS, MOTIVOS } from '@/lib/feedback';

const PAGE = 15;
const estrelas = n => '★'.repeat(n) + '☆'.repeat(5 - n);

function Item({ f, aberto, onToggle, onChange, onMsg }) {
  const [status, setStatus] = useState(f.status);
  const [nota, setNota] = useState(f.nota_interna || '');
  const [resp, setResp] = useState(f.resposta || '');
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!aberto || !f.anexo_path || img) return;
    supabase.storage.from('feedback').createSignedUrl(f.anexo_path, 3600).then(({ data }) => setImg(data?.signedUrl || null));
  }, [aberto]); // eslint-disable-line

  async function salvar() {
    setBusy(true);
    const { error } = await supabase.rpc('atualizar_feedback', { p_id: f.id, p_status: status, p_nota_interna: nota });
    setBusy(false);
    if (error) return onMsg('e', error.message);
    onMsg('o', 'Salvo.'); onChange();
  }
  async function responder() {
    setBusy(true);
    const { error } = await supabase.rpc('responder_feedback', { p_id: f.id, p_resposta: resp, p_status: status === 'novo' || status === 'em_analise' ? 'resolvido' : status });
    setBusy(false);
    if (error) return onMsg('e', error.message);
    onMsg('o', 'Resposta enviada ao aluno.'); onChange();
  }
  async function excluir() {
    if (!confirm('Excluir este feedback definitivamente?')) return;
    if (f.anexo_path) await supabase.storage.from('feedback').remove([f.anexo_path]);
    const { error } = await supabase.from('feedback').delete().eq('id', f.id);
    if (error) return onMsg('e', error.message);
    onChange();
  }

  return (
    <div className="card" style={{ borderColor: f.status === 'novo' ? 'var(--acc)' : undefined }}>
      <button type="button" className="fbhead" onClick={onToggle} aria-expanded={aberto}>
        <span className="tags" style={{ margin: 0 }}>
          <span className="tag">{TIPOS[f.tipo]}</span>
          <span className={`pill${f.status === 'novo' ? ' warn' : ''}`}>{STATUS[f.status]}</span>
          {f.nota && <span className="tag">{estrelas(f.nota)}</span>}
          {f.anexo_path && <span className="tag">📎 print</span>}
        </span>
        <b>{f.titulo || f.mensagem.slice(0, 90) + (f.mensagem.length > 90 ? '…' : '')}</b>
        <span className="mut">{f.profiles?.nome || 'Aluno'} · {new Date(f.created_at).toLocaleString('pt-BR')}</span>
      </button>

      {aberto && (
        <div style={{ marginTop: 12 }}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{f.mensagem}</div>
          <p className="mut" style={{ marginBottom: 4 }}>
            De: <b>{f.profiles?.nome}</b> ({f.profiles?.email}) · Página: <code>{f.pagina || '—'}</code>
          </p>
          {img && <a href={img} target="_blank" rel="noreferrer"><img src={img} alt="Print anexado pelo aluno" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 10, border: '1px solid var(--bd)' }} /></a>}

          {f.tipo === 'questao' && (
            <div className="diff" style={{ marginTop: 10 }}>
              <b>{MOTIVOS[f.motivo_questao]}</b><br />
              {f.questions ? (
                <>
                  <span className="mut">{f.questions.materia}{f.questions.assunto ? ` › ${f.questions.assunto}` : ''}</span><br />
                  “{f.questions.enunciado.slice(0, 200)}{f.questions.enunciado.length > 200 ? '…' : ''}”<br />
                  <Link href={`/painel?editar=${f.questions.id}`}>Abrir para editar</Link> · <Link href={`/painel/historico/${f.questions.id}`}>Ver histórico</Link>
                </>
              ) : <span className="mut">A questão foi excluída.</span>}
            </div>
          )}

          <label htmlFor={`st-${f.id}`}>Status</label>
          <select id={`st-${f.id}`} value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
            {Object.entries(STATUS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
          <label htmlFor={`nt-${f.id}`}>Anotação interna <span className="mut">(o aluno não vê)</span></label>
          <textarea id={`nt-${f.id}`} value={nota} style={{ minHeight: 60 }} onChange={e => setNota(e.target.value)} />
          <button className="btn ghost sm" style={{ marginTop: 8 }} disabled={busy} onClick={salvar}>Salvar status e anotação</button>

          <label htmlFor={`rp-${f.id}`}>Resposta ao aluno <span className="mut">(aparece em “Feedback” para ele)</span></label>
          <textarea id={`rp-${f.id}`} value={resp} maxLength={2000} onChange={e => setResp(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn sm" disabled={busy || !resp.trim()} onClick={responder}>{f.resposta ? 'Atualizar resposta' : 'Enviar resposta'}</button>
            <button className="btn red sm" onClick={excluir}>Excluir</button>
          </div>
          {f.respondido_em && <p className="mut">Última resposta em {new Date(f.respondido_em).toLocaleString('pt-BR')}.</p>}
        </div>
      )}
    </div>
  );
}

export default function Caixa() {
  const { loading, user, profile } = useAuth({ roles: ['admin'] });
  const [f, setF] = useState({ status: 'abertos', tipo: '' });
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [aberto, setAberto] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from('feedback')
      .select('*, profiles(nome,email), questions(id,enunciado,materia,assunto)', { count: 'exact' })
      .order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (f.status === 'abertos') q = q.in('status', ['novo', 'em_analise']);
    else if (f.status) q = q.eq('status', f.status);
    if (f.tipo) q = q.eq('tipo', f.tipo);
    const { data, count } = await q;
    setLista(data || []); setTotal(count || 0); setReady(true);
  }, [f, page]);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (loading) return <p className="wrap mut">Carregando…</p>;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const aviso = (t, m) => { setMsg({ t, m }); setTimeout(() => setMsg(null), 4000); };

  return (
    <Shell profile={profile}>
      <p><Link href="/painel">← Voltar ao painel</Link></p>
      <div className="card">
        <h2 style={{ margin: '0 0 6px' }}>Caixa de entrada de feedback</h2>
        <div className="grid">
          <div><label>Status</label>
            <select value={f.status} onChange={e => { setPage(0); setF({ ...f, status: e.target.value }); }}>
              <option value="abertos">Abertos (novos e em análise)</option><option value="">Todos</option>
              {Object.entries(STATUS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select></div>
          <div><label>Tipo</label>
            <select value={f.tipo} onChange={e => { setPage(0); setF({ ...f, tipo: e.target.value }); }}>
              <option value="">Todos</option>{Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select></div>
        </div>
        <p className="mut" style={{ margin: '10px 0 0' }}>{total} mensagem(ns)</p>
      </div>
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}
      {ready && !lista.length && <div className="card mut">Nada por aqui com esses filtros.</div>}
      {lista.map(x => (
        <Item key={x.id + x.updated_at} f={x} aberto={aberto === x.id} onToggle={() => setAberto(aberto === x.id ? null : x.id)} onChange={load} onMsg={aviso} />
      ))}
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
