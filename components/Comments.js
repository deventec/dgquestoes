'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Avatar from './Avatar';

const MOTIVOS = [
  ['ofensivo', 'Ofensivo ou desrespeitoso'],
  ['spam', 'Spam ou propaganda'],
  ['enganoso', 'Informação incorreta ou enganosa'],
  ['outro', 'Outro motivo']
];

export default function Comments({ questionId, user, isAdmin }) {
  const [list, setList] = useState([]);
  const [names, setNames] = useState({});
  const [txt, setTxt] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState(null);           // { id, motivo, detalhe }
  const [aviso, setAviso] = useState({});         // id do comentário → mensagem

  const load = useCallback(async () => {
    const { data } = await supabase.from('comments').select('*').eq('question_id', questionId).order('created_at', { ascending: true });
    setList(data || []);
    const ids = [...new Set((data || []).map(c => c.user_id))];
    if (ids.length) {
      const { data: p } = await supabase.from('perfis_publicos').select('id,nome,avatar_path').in('id', ids);
      setNames(Object.fromEntries((p || []).map(x => [x.id, x])));
    }
  }, [questionId]);
  useEffect(() => { load(); }, [load]);

  async function enviar(e) {
    e.preventDefault();
    const t = txt.trim();
    if (!t) return;
    setBusy(true); setErro('');
    const { error } = await supabase.from('comments').insert({ question_id: questionId, texto: t });
    setBusy(false);
    if (error) return setErro('Não foi possível enviar o comentário.');
    setTxt(''); load();
  }
  async function excluir(id) {
    if (!confirm('Excluir este comentário?')) return;
    await supabase.from('comments').delete().eq('id', id);
    load();
  }
  async function denunciar(e) {
    e.preventDefault();
    const { error } = await supabase.from('comment_reports').insert({
      comment_id: rep.id, motivo: rep.motivo, detalhe: rep.detalhe.trim() || null
    });
    const msg = !error ? 'Denúncia enviada. Obrigado por ajudar a manter a comunidade.'
      : error.code === '23505' ? 'Você já denunciou este comentário.' : 'Não foi possível enviar a denúncia.';
    setAviso(a => ({ ...a, [rep.id]: msg }));
    setRep(null);
  }

  return (
    <div className="comments">
      {list.length === 0 && <p className="mut">Ainda não há comentários. Seja o primeiro a explicar esta questão.</p>}
      {list.map(c => (
        <div className="cm" key={c.id}>
          <div className="row"><span className="who"><Avatar path={names[c.user_id]?.avatar_path} nome={names[c.user_id]?.nome} size={26} /><b>{names[c.user_id]?.nome || 'Aluno'}</b></span>
            <span className="mut">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span></div>
          {c.oculto && <p className="mut" style={{ margin: '4px 0' }}>⚠ Em análise pela moderação{c.user_id === user.id ? ': só você e os administradores veem este comentário.' : '.'}</p>}
          <div style={{ whiteSpace: 'pre-wrap' }}>{c.texto}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
            {(c.user_id === user.id || isAdmin) && <button className="lnk" onClick={() => excluir(c.id)}>Excluir</button>}
            {c.user_id !== user.id && !aviso[c.id] && <button className="lnk mutl" onClick={() => setRep({ id: c.id, motivo: 'ofensivo', detalhe: '' })}>Denunciar</button>}
          </div>
          {aviso[c.id] && <div className="msg o">{aviso[c.id]}</div>}
          {rep?.id === c.id && (
            <form onSubmit={denunciar} className="repbox">
              <label htmlFor={`m-${c.id}`}>Motivo da denúncia</label>
              <select id={`m-${c.id}`} value={rep.motivo} onChange={e => setRep({ ...rep, motivo: e.target.value })}>
                {MOTIVOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
              <label htmlFor={`d-${c.id}`}>Detalhes (opcional)</label>
              <textarea id={`d-${c.id}`} maxLength={300} style={{ minHeight: 60 }} value={rep.detalhe} onChange={e => setRep({ ...rep, detalhe: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn sm">Enviar denúncia</button>
                <button type="button" className="btn ghost sm" onClick={() => setRep(null)}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      ))}
      <form onSubmit={enviar}>
        {erro && <div className="msg e">{erro}</div>}
        <label htmlFor={`c-${questionId}`}>Seu comentário</label>
        <textarea id={`c-${questionId}`} maxLength={1000} value={txt} onChange={e => setTxt(e.target.value)} />
        <button className="btn sm" style={{ marginTop: 8 }} disabled={busy || !txt.trim()}>Comentar</button>
      </form>
    </div>
  );
}
