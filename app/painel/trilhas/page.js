'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MATERIAS } from '@/lib/constants';

export default function PainelTrilhas() {
  const { loading, user, profile } = useAuth({ roles: ['admin', 'editor'] });
  const [trilhas, setTrilhas] = useState([]);
  const [sel, setSel] = useState('');
  const [itens, setItens] = useState([]);
  const [assuntos, setAssuntos] = useState([]);
  const [novo, setNovo] = useState({ nome: '', cargo: '', descricao: '' });
  const [it, setIt] = useState({ materia: MATERIAS[0], assunto: '', observacao: '' });
  const [msg, setMsg] = useState(null);
  const aviso = (t, m) => setMsg({ t, m });

  async function carregarTrilhas(manter) {
    const { data } = await supabase.from('trilhas').select('*').order('nome');
    setTrilhas(data || []);
    setSel(manter && (data || []).some(t => t.id === manter) ? manter : data?.[0]?.id || '');
  }
  async function carregarItens() {
    if (!sel) return setItens([]);
    const { data } = await supabase.from('trilha_itens').select('*').eq('trilha_id', sel).order('ordem');
    setItens(data || []);
  }
  useEffect(() => { if (profile) { carregarTrilhas(); supabase.from('assuntos').select('materia,nome').order('nome').then(({ data }) => setAssuntos(data || [])); } }, [profile]); // eslint-disable-line
  useEffect(() => { if (profile) carregarItens(); }, [profile, sel]); // eslint-disable-line

  async function criar(e) {
    e.preventDefault();
    if (!novo.nome.trim()) return;
    const { data, error } = await supabase.from('trilhas').insert({ nome: novo.nome.trim(), cargo: novo.cargo.trim(), descricao: novo.descricao.trim(), ativa: false }).select().single();
    if (error) return aviso('e', 'Não foi possível criar a trilha.');
    setNovo({ nome: '', cargo: '', descricao: '' });
    aviso('o', 'Trilha criada como rascunho. Adicione os passos e depois publique.');
    carregarTrilhas(data.id);
  }
  async function alternar(t) {
    await supabase.from('trilhas').update({ ativa: !t.ativa }).eq('id', t.id);
    carregarTrilhas(t.id);
  }
  async function excluir(t) {
    if (!confirm(`Excluir a trilha "${t.nome}" e todos os seus passos?`)) return;
    await supabase.from('trilhas').delete().eq('id', t.id);
    carregarTrilhas();
  }
  async function adicionar(e) {
    e.preventDefault();
    const { error } = await supabase.from('trilha_itens').insert({
      trilha_id: sel, ordem: itens.length, materia: it.materia, assunto: it.assunto, observacao: it.observacao.trim()
    });
    if (error) return aviso('e', 'Não foi possível adicionar o passo.');
    setIt({ ...it, assunto: '', observacao: '' }); carregarItens();
  }
  async function reordenar(ids) {
    const { error } = await supabase.rpc('reordenar_trilha', { p_trilha: sel, p_ids: ids });
    if (error) aviso('e', error.message);
    carregarItens();
  }
  function mover(i, d) {
    const ids = itens.map(x => x.id), j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reordenar(ids);
  }
  async function remover(id) {
    await supabase.from('trilha_itens').delete().eq('id', id);
    reordenar(itens.filter(x => x.id !== id).map(x => x.id));
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;
  const atual = trilhas.find(t => t.id === sel);
  const opcoes = assuntos.filter(a => a.materia === it.materia);

  return (
    <Shell profile={profile}>
      <p><Link href="/painel">← Voltar ao painel</Link></p>
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}

      <form className="card" onSubmit={criar}>
        <h3 style={{ marginTop: 0 }}>Nova trilha</h3>
        <div className="grid">
          <div><label>Nome</label><input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} placeholder="Agente de Polícia Federal" required maxLength={80} /></div>
          <div><label>Cargo / órgão</label><input value={novo.cargo} onChange={e => setNovo({ ...novo, cargo: e.target.value })} placeholder="PF, PM-SP, PC-RJ…" /></div>
        </div>
        <label>Descrição</label><input value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} placeholder="Ex.: baseada no edital de 2024" />
        <button className="btn">Criar trilha (rascunho)</button>
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Editar trilha</h3>
        {!trilhas.length && <p className="mut">Nenhuma trilha ainda.</p>}
        {trilhas.length > 0 && (
          <>
            <label>Trilha</label>
            <select value={sel} onChange={e => setSel(e.target.value)}>
              {trilhas.map(t => <option key={t.id} value={t.id}>{t.nome} {t.ativa ? '· publicada' : '· rascunho'}</option>)}
            </select>
            {atual && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => alternar(atual)}>{atual.ativa ? 'Despublicar' : 'Publicar para os alunos'}</button>
                <button className="btn red sm" onClick={() => excluir(atual)}>Excluir trilha</button>
              </div>
            )}

            {itens.map((x, i) => (
              <div className="passo" key={x.id}>
                <div className="row">
                  <span><span className="n">{i + 1}</span><b>{x.assunto || `${x.materia} (matéria inteira)`}</b> <span className="mut">· {x.materia}</span></span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn ghost sm" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">↑</button>
                    <button className="btn ghost sm" disabled={i === itens.length - 1} onClick={() => mover(i, 1)} aria-label="Descer">↓</button>
                    <button className="btn red sm" onClick={() => remover(x.id)}>Remover</button>
                  </span>
                </div>
                {x.observacao && <span className="mut">{x.observacao}</span>}
              </div>
            ))}
            {!itens.length && <p className="mut">Esta trilha ainda não tem passos.</p>}

            <form onSubmit={adicionar} style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 4px' }}>Adicionar passo</h4>
              <div className="grid">
                <div><label>Matéria</label><select value={it.materia} onChange={e => setIt({ ...it, materia: e.target.value, assunto: '' })}>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select></div>
                <div><label>Assunto</label><select value={it.assunto} onChange={e => setIt({ ...it, assunto: e.target.value })}>
                  <option value="">Matéria inteira</option>{opcoes.map(a => <option key={a.nome}>{a.nome}</option>)}</select></div>
              </div>
              <label>Observação (opcional)</label><input value={it.observacao} onChange={e => setIt({ ...it, observacao: e.target.value })} placeholder="Ex.: peso alto na prova" />
              <button className="btn">Adicionar ao fim da trilha</button>
            </form>
          </>
        )}
      </div>
    </Shell>
  );
}
