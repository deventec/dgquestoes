'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { reduzir } from '@/lib/media';
import { TIPOS, MOTIVOS } from '@/lib/feedback';

const ESCOLHAS = ['sugestao', 'problema', 'elogio', 'duvida', 'outro'];
const IMG = ['image/jpeg', 'image/png', 'image/webp'];

// question: { id, enunciado } → modo "reportar erro nesta questão"
export default function FeedbackDialog({ onClose, question = null, tipoInicial = 'sugestao', onSent }) {
  const pagina = usePathname();
  const [tipo, setTipo] = useState(question ? 'questao' : tipoInicial);
  const [motivo, setMotivo] = useState('gabarito');
  const [titulo, setTitulo] = useState('');
  const [msg, setMsg] = useState('');
  const [nota, setNota] = useState(0);
  const [arq, setArq] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    caixa.current?.focus();
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  function escolherArquivo(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!IMG.includes(f.type)) return setErro('O anexo precisa ser uma imagem JPG, PNG ou WebP.');
    if (f.size > 15 * 1024 * 1024) return setErro('Imagem muito grande (máximo 15 MB).');
    setErro(''); setArq(f);
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (msg.trim().length < 5) return setErro('Escreva pelo menos 5 caracteres na mensagem.');
    setBusy(true);
    try {
      let anexo = null;
      if (arq) {
        const { data: { session } } = await supabase.auth.getSession();
        const blob = await reduzir(arq);
        anexo = `${session.user.id}/${Date.now()}.jpg`;
        const up = await supabase.storage.from('feedback').upload(anexo, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc('enviar_feedback', {
        p_tipo: tipo, p_titulo: titulo, p_mensagem: msg, p_nota: nota || null, p_pagina: pagina || '',
        p_question: question?.id || null, p_motivo: tipo === 'questao' ? motivo : null, p_anexo: anexo
      });
      if (error) {
        if (anexo) await supabase.storage.from('feedback').remove([anexo]);
        throw error;
      }
      setOk(true); onSent?.();
    } catch (err) { setErro(err.message || 'Não foi possível enviar. Tente novamente.'); }
    setBusy(false);
  }

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="fb-t" tabIndex={-1} ref={caixa}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <h2 id="fb-t" style={{ margin: 0, fontSize: 20 }}>{question ? 'Reportar problema na questão' : 'Fale com a equipe'}</h2>
          <button type="button" className="minibtn" style={{ background: 'var(--bd)', color: 'var(--tx)' }} onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {ok ? (
          <div>
            <div className="msg o">Recebemos a sua mensagem. Obrigado por ajudar a melhorar o DG QUESTÕES!</div>
            <p className="mut">A resposta da equipe, quando houver, aparece em <b>Feedback</b> no menu.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/feedback" className="btn sm" style={{ textDecoration: 'none' }} onClick={onClose}>Ver meus envios</Link>
              <button className="btn ghost sm" onClick={onClose}>Fechar</button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar}>
            {question ? (
              <>
                <p className="mut" style={{ margin: '8px 0 0' }}>Questão: “{question.enunciado.slice(0, 140)}{question.enunciado.length > 140 ? '…' : ''}”</p>
                <label htmlFor="fb-mot">O que está errado?</label>
                <select id="fb-mot" value={motivo} onChange={e => setMotivo(e.target.value)}>
                  {Object.entries(MOTIVOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                </select>
              </>
            ) : (
              <>
                <label>Sobre o quê?</label>
                <div className="chipsel" role="radiogroup" aria-label="Tipo de mensagem">
                  {ESCOLHAS.map(k => (
                    <button type="button" key={k} role="radio" aria-checked={tipo === k} className={tipo === k ? 'on' : ''} onClick={() => setTipo(k)}>{TIPOS[k]}</button>
                  ))}
                </div>
                <label htmlFor="fb-tit">Título (opcional)</label>
                <input id="fb-tit" value={titulo} maxLength={100} onChange={e => setTitulo(e.target.value)} />
              </>
            )}

            <label htmlFor="fb-msg">Mensagem <span className="mut">({msg.length}/2000)</span></label>
            <textarea id="fb-msg" value={msg} maxLength={2000} style={{ minHeight: 120 }} required
              placeholder={question ? 'Explique o que você encontrou. Se o gabarito parece errado, diga qual seria o correto e por quê.'
                : tipo === 'problema' ? 'O que aconteceu? Em que tela? O que você esperava ver?' : 'Conte a sua ideia ou comentário.'}
              onChange={e => setMsg(e.target.value)} />

            {!question && (
              <>
                <label>Como você avalia o DG QUESTÕES hoje? <span className="mut">(opcional)</span></label>
                <div className="stars" role="radiogroup" aria-label="Nota de 1 a 5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button type="button" key={n} role="radio" aria-checked={nota === n} aria-label={`${n} de 5`} className={n <= nota ? 'on' : ''}
                      onClick={() => setNota(nota === n ? 0 : n)}>★</button>
                  ))}
                </div>
              </>
            )}

            <label>Print de tela <span className="mut">(opcional)</span></label>
            <label className="filebtn claro">
              {arq ? `📎 ${arq.name}` : 'Anexar imagem'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={escolherArquivo} />
            </label>
            {arq && <button type="button" className="lnk mutl" style={{ marginLeft: 10 }} onClick={() => setArq(null)}>Remover anexo</button>}

            <p className="mut" style={{ fontSize: 13 }}>Junto com a mensagem, o administrador vê seu nome, seu e-mail e a página em que você está ({pagina}).</p>
            {erro && <div className="msg e">{erro}</div>}
            <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
