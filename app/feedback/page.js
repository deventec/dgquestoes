'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import FeedbackDialog from '@/components/FeedbackDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TIPOS, STATUS, MOTIVOS } from '@/lib/feedback';

export default function MeusFeedbacks() {
  const { loading, user, profile } = useAuth();
  const [lista, setLista] = useState([]);
  const [ready, setReady] = useState(false);
  const [novo, setNovo] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('feedback').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    setLista(data || []); setReady(true);
    if ((data || []).some(x => !x.resposta_lida)) await supabase.rpc('marcar_respostas_lidas'); // a bolinha do menu some na próxima navegação
  }, [user]);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (loading) return <p className="wrap mut">Carregando…</p>;

  return (
    <Shell profile={profile}>
      <div className="card row">
        <span><h2 style={{ margin: '0 0 4px' }}>Feedback</h2>
          <span className="mut">Sugestões, problemas e dúvidas vão direto para o administrador. Você também pode usar o botão “Feedback” em qualquer tela, ou “Reportar problema” dentro de uma questão.</span></span>
        <button className="btn sm" onClick={() => setNovo(true)}>Enviar feedback</button>
      </div>

      {ready && !lista.length && <div className="card mut">Você ainda não enviou nenhum feedback.</div>}
      {lista.map(f => (
        <div className="card" key={f.id}>
          <div className="tags">
            <span className="tag">{TIPOS[f.tipo]}</span>
            <span className={`pill${f.status === 'novo' ? '' : ''}`}>{f.status === 'novo' ? 'Enviado' : STATUS[f.status]}</span>
            {f.motivo_questao && <span className="tag">{MOTIVOS[f.motivo_questao]}</span>}
            {!f.resposta_lida && <span className="pill warn">Nova resposta</span>}
            <span className="mut" style={{ marginLeft: 'auto' }}>{new Date(f.created_at).toLocaleString('pt-BR')}</span>
          </div>
          {f.titulo && <b>{f.titulo}</b>}
          <div style={{ whiteSpace: 'pre-wrap' }}>{f.mensagem}</div>
          {f.resposta && (
            <div className="coment">
              <b>Resposta da equipe</b> <span className="mut">· {new Date(f.respondido_em).toLocaleString('pt-BR')}</span>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{f.resposta}</div>
            </div>
          )}
        </div>
      ))}
      {novo && <FeedbackDialog onClose={() => setNovo(false)} onSent={load} />}
    </Shell>
  );
}
