'use client';
import { useState } from 'react';
import { LETRAS } from '@/lib/constants';
import { useEliminadas } from '@/lib/eliminadas';
import AltRow from './AltRow';
import Comments from './Comments';
import FeedbackDialog from './FeedbackDialog';

// my:  undefined/null = não respondida · -1 = em branco · 0..n = alternativa escolhida
// gab: { correta, comentario }, só existe depois de responder
// onAnswer(q, i) pode devolver false se não conseguiu gravar (a escolha é mantida)
// offline: esconde o que depende de internet (comentários e reporte)
export default function QuestionCard({ q, my, gab, onAnswer, user, isAdmin, extra, offline = false }) {
  const [open, setOpen] = useState(false);
  const [rep, setRep] = useState(false);
  const [sel, setSel] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [cortadas, alternar, limpar] = useEliminadas(q.id);
  const done = my !== undefined && my !== null;
  const L = LETRAS[q.tipo];

  function escolher(i) {
    if (done || cortadas.includes(i)) return;
    setSel(sel === i ? null : i);
  }
  function cortar(i) {
    if (sel === i) setSel(null);
    alternar(i);
  }
  async function confirmar() {
    if (sel === null || enviando) return;
    setEnviando(true);
    try {
      const ok = await onAnswer(q, sel);
      if (ok !== false) { limpar(); setSel(null); }
    } finally { setEnviando(false); }
  }

  return (
    <div className="card">
      <div className="tags">
        <span className="tag">{q.materia}</span>{q.assunto && <span className="tag">{q.assunto}</span>}<span className="tag">{q.banca} {q.ano}</span>
        {q.orgao && <span className="tag">{q.orgao}</span>}{q.cargo && <span className="tag">{q.cargo}</span>}
      </div>
      <div>{q.enunciado}</div>

      {q.alternativas.map((a, i) => {
        let estado = '';
        if (done && gab) estado = i === gab.correta ? 'ok' : i === my ? 'no' : '';
        else if (done) estado = i === my ? 'sel' : '';
        else if (sel === i) estado = 'sel';
        return (
          <AltRow key={i} letra={L[i]} texto={a} estado={estado} cortada={!done && cortadas.includes(i)}
            disabled={done} mostrarArma={!done} onPick={() => escolher(i)} onCut={() => cortar(i)} />
        );
      })}

      {!done && sel !== null && (
        <div className="confirma" role="group" aria-label="Confirmar resposta">
          <span>Você escolheu a alternativa <b>{L[sel]}</b>.</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn sm" onClick={confirmar} disabled={enviando}>{enviando ? 'Enviando…' : 'Confirmar resposta'}</button>
            <button type="button" className="btn ghost sm" onClick={() => setSel(null)} disabled={enviando}>Trocar</button>
          </span>
        </div>
      )}

      {done && !gab && <p className="mut">Carregando gabarito…</p>}
      {done && gab && (
        <div className="coment">
          <b>{my === -1 ? 'Em branco. ' : my === gab.correta ? 'Você acertou! ' : 'Você errou. '}</b>
          Gabarito: {L[gab.correta]}.<br />{gab.comentario || 'Sem comentário do professor.'}
        </div>
      )}

      {!offline && (
        <div className="row" style={{ marginTop: 12 }}>
          {done ? (
            <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn ghost sm" onClick={() => setOpen(!open)}>{open ? 'Ocultar comentários' : 'Comentários dos alunos'}</button>
              <button className="lnk mutl" onClick={() => setRep(true)}>Reportar problema nesta questão</button>
            </span>
          ) : <span />}
          {extra}
        </div>
      )}
      {offline && extra && <div className="row" style={{ marginTop: 12 }}><span />{extra}</div>}
      {rep && <FeedbackDialog question={q} onClose={() => setRep(false)} />}
      {!offline && done && open && <Comments questionId={q.id} user={user} isAdmin={isAdmin} />}
    </div>
  );
}
