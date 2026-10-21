'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MATERIAS, BANCAS } from '@/lib/constants';

const MOTIVO_TXT = { ofensivo: 'Ofensivo ou desrespeitoso', spam: 'Spam ou propaganda', enganoso: 'Informação incorreta ou enganosa', outro: 'Outro motivo' };
const VAZIA = { materia: MATERIAS[0], assunto: '', banca: BANCAS[0], ano: String(new Date().getFullYear()), orgao: '', cargo: '', tipo: 'mc', enunciado: '', alts: ['', '', '', '', ''], gab: '', comentario: '' };
const NONE = '__none__';
const PAGE = 15;

export default function Painel() {
  const { loading, user, profile } = useAuth({ roles: ['admin', 'editor'] });
  const isAdmin = profile?.role === 'admin';
  const formRef = useRef(null);

  const [q, setQ] = useState(VAZIA);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [json, setJson] = useState('');
  const [users, setUsers] = useState([]);
  const [nu, setNu] = useState({ nome: '', email: '', password: '', role: 'editor' });
  const [reps, setReps] = useState([]);
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [mf, setMf] = useState({ materia: '', assunto: '', q: '' });
  const [sugest, setSugest] = useState([]);       // todos os assuntos cadastrados {materia, nome}
  const [gm, setGm] = useState(MATERIAS[0]);      // matéria do card "Assuntos"
  const [resumo, setResumo] = useState([]);
  const [novoAssunto, setNovoAssunto] = useState('');
  const aviso = (t, m) => { setMsg({ t, m }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  async function carregarQuestoes() {
    let c = supabase.from('questions').select('id,materia,assunto,banca,ano,enunciado,created_by', { count: 'exact' })
      .order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (mf.materia) c = c.eq('materia', mf.materia);
    if (mf.assunto) c = c.eq('assunto', mf.assunto === NONE ? '' : mf.assunto);
    if (mf.q) c = c.ilike('enunciado', `%${mf.q.replace(/[%,]/g, ' ')}%`);
    const { data, count } = await c;
    setLista(data || []); setTotal(count || 0);
  }
  async function carregarAssuntos() {
    const { data } = await supabase.from('assuntos').select('materia,nome').order('nome');
    setSugest(data || []);
    const { data: r } = await supabase.rpc('resumo_assuntos', { p_materia: gm });
    setResumo(r || []);
  }
  async function carregarUsuarios() {
    const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(u || []);
  }
  async function carregarDenuncias() {
    const { data } = await supabase.from('comment_reports')
      .select('id,motivo,detalhe,created_at,comment_id,comments(id,texto,user_id,oculto)')
      .eq('status', 'aberta').order('created_at');
    const g = {};
    (data || []).forEach(r => { if (r.comments) (g[r.comment_id] ||= { c: r.comments, rs: [] }).rs.push(r); });
    const l = Object.values(g);
    const ids = [...new Set(l.map(x => x.c.user_id))];
    let nm = {};
    if (ids.length) {
      const { data: p } = await supabase.from('perfis_publicos').select('id,nome').in('id', ids);
      nm = Object.fromEntries((p || []).map(x => [x.id, x.nome]));
    }
    setReps(l.map(x => ({ ...x, autor: nm[x.c.user_id] || 'Aluno' })));
  }

  useEffect(() => { if (profile) carregarQuestoes(); }, [profile, page, mf]); // eslint-disable-line
  useEffect(() => { if (profile) carregarAssuntos(); }, [profile, gm]);       // eslint-disable-line
  useEffect(() => { if (profile && isAdmin) { carregarUsuarios(); carregarDenuncias(); } }, [profile]); // eslint-disable-line

  // Link vindo da caixa de entrada: /painel?editar=<id da questão>
  useEffect(() => {
    if (!profile) return;
    const id = new URLSearchParams(window.location.search).get('editar');
    if (id) editar(id);
  }, [profile]); // eslint-disable-line

  const set = k => e => setQ({ ...q, [k]: e.target.value });
  const ce = q.tipo === 'ce';

  function montar() {
    const alternativas = ce ? ['Certo', 'Errado'] : q.alts.map(a => a.trim());
    if (!ce) while (alternativas.length && !alternativas[alternativas.length - 1]) alternativas.pop();
    const correta = ce ? 'CE'.indexOf(q.gab.toUpperCase()) : 'ABCDE'.indexOf(q.gab.toUpperCase());
    if (!q.enunciado.trim()) return { erro: 'Digite o enunciado.' };
    if (alternativas.length < 2 || alternativas.some(a => !a)) return { erro: 'Preencha as alternativas em ordem (mínimo 2, sem lacunas).' };
    if (!q.gab || correta < 0 || correta >= alternativas.length) return { erro: 'Gabarito inválido.' };
    return { obj: { materia: q.materia, assunto: q.assunto, banca: q.banca, ano: q.ano, orgao: q.orgao, cargo: q.cargo, tipo: q.tipo,
      enunciado: q.enunciado.trim(), alternativas, correta, comentario: q.comentario } };
  }

  async function salvarQuestao(e) {
    e.preventDefault();
    const { erro, obj } = montar();
    if (erro) return aviso('e', erro);
    if (editId) {
      const { error } = await supabase.rpc('editar_questao', { p_id: editId, p: obj });
      if (error) return aviso('e', error.message);
      aviso('o', 'Questão atualizada.'); cancelar();
    } else {
      const { data, error } = await supabase.rpc('importar_questoes', { p: [obj] });
      if (error) return aviso('e', error.message);
      if (!data) return aviso('e', 'A questão foi recusada pela validação do servidor.');
      aviso('o', 'Questão cadastrada.'); setQ({ ...VAZIA, materia: q.materia, assunto: q.assunto, banca: q.banca });
    }
    carregarQuestoes(); carregarAssuntos();
  }

  async function editar(id) {
    const { data, error } = await supabase.rpc('obter_questao_edicao', { p_id: id });
    if (error) return aviso('e', error.message);
    const isCE = data.tipo === 'ce';
    setQ({
      materia: data.materia, assunto: data.assunto || '', banca: data.banca, ano: String(data.ano || ''), orgao: data.orgao || '', cargo: data.cargo || '',
      tipo: data.tipo, enunciado: data.enunciado, alts: [...data.alternativas, '', '', '', '', ''].slice(0, 5),
      gab: (isCE ? 'CE' : 'ABCDE')[data.correta], comentario: data.comentario || ''
    });
    setEditId(id); setMsg(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cancelar() { setEditId(null); setQ(VAZIA); }

  async function importar() {
    let arr;
    try { arr = JSON.parse(json); if (!Array.isArray(arr)) throw new Error(); } catch { return aviso('e', 'JSON inválido.'); }
    const { data, error } = await supabase.rpc('importar_questoes', { p: arr });
    if (error) return aviso('e', error.message);
    aviso(data ? 'o' : 'e', `${data} de ${arr.length} questão(ões) importada(s). As inválidas foram ignoradas.`);
    if (data) { setJson(''); carregarQuestoes(); carregarAssuntos(); }
  }
  async function excluir(id) {
    if (!confirm('Excluir esta questão? As respostas dos alunos nela também serão apagadas.')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) aviso('e', error.message); else { if (editId === id) cancelar(); carregarQuestoes(); carregarAssuntos(); }
  }

  // Assuntos
  async function criarAssunto(e) {
    e.preventDefault();
    const nome = novoAssunto.trim();
    if (!nome) return;
    const { error } = await supabase.from('assuntos').insert({ materia: gm, nome });
    if (error && error.code !== '23505') return aviso('e', 'Não foi possível criar o assunto.');
    setNovoAssunto(''); carregarAssuntos();
  }
  async function renomear(nome) {
    const novo = prompt('Novo nome do assunto (as questões dele serão atualizadas):', nome);
    if (!novo || novo.trim() === nome) return;
    const { error } = await supabase.rpc('renomear_assunto', { p_materia: gm, p_antigo: nome, p_novo: novo });
    if (error) return aviso('e', error.message);
    carregarAssuntos(); carregarQuestoes();
  }
  async function excluirAssunto(nome) {
    if (!confirm(`Excluir o assunto "${nome}"?`)) return;
    const { error } = await supabase.rpc('excluir_assunto', { p_materia: gm, p_nome: nome });
    if (error) return aviso('e', error.message);
    carregarAssuntos();
  }

  // Usuários
  async function api(method, body) {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/admin/users', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { aviso('e', j.error || 'Erro.'); return false; }
    return true;
  }
  async function criarUsuario(e) {
    e.preventDefault();
    if (await api('POST', nu)) { aviso('o', 'Usuário criado.'); setNu({ nome: '', email: '', password: '', role: 'editor' }); carregarUsuarios(); }
  }
  async function removerUsuario(id) {
    if (confirm('Remover este usuário?') && await api('DELETE', { id })) { aviso('o', 'Usuário removido.'); carregarUsuarios(); }
  }

  // Denúncias
  async function manter(cid) {
    await supabase.from('comment_reports').update({ status: 'resolvida' }).eq('comment_id', cid);
    await supabase.from('comments').update({ oculto: false }).eq('id', cid);
    carregarDenuncias();
  }
  async function removerComentario(cid) {
    if (!confirm('Excluir este comentário definitivamente?')) return;
    await supabase.from('comments').delete().eq('id', cid);
    carregarDenuncias();
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;

  const sugestoesForm = sugest.filter(s => s.materia === q.materia);
  const sugestoesFiltro = sugest.filter(s => !mf.materia || s.materia === mf.materia);
  const nomesCard = [...new Set([...sugest.filter(s => s.materia === gm).map(s => s.nome), ...resumo.map(r => r.r_assunto).filter(Boolean)])].sort();
  const qtd = nome => Number(resumo.find(r => r.r_assunto === nome)?.r_total || 0);
  const semAssunto = Number(resumo.find(r => r.r_assunto === '')?.r_total || 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Shell profile={profile}>
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}

      {isAdmin && (
        <div className="card row">
          <span><b>Caixa de entrada de feedback</b><br /><span className="mut">Sugestões, problemas e erros em questões enviados pelos alunos.</span></span>
          <Link className="btn sm" style={{ textDecoration: 'none' }} href="/painel/feedback">Abrir caixa de entrada</Link>
        </div>
      )}

      <div className="card row">
        <span><b>Trilhas de estudo</b><br /><span className="mut">Ordem sugerida de assuntos por cargo (PF, PM, PC…).</span></span>
        <Link className="btn sm" style={{ textDecoration: 'none' }} href="/painel/trilhas">Gerenciar trilhas</Link>
      </div>

      <form className="card" onSubmit={salvarQuestao} ref={formRef}>
        <h3 style={{ marginTop: 0 }}>{editId ? 'Editar questão' : 'Cadastrar questão'}</h3>
        {editId && (
          <p className="msg o" style={{ marginTop: 0 }}>
            Você está editando uma questão publicada. Se mudar o gabarito, o acerto/erro dos alunos e as notas dos simulados já feitos são recalculados.
            Se alunos já responderam, não dá para mudar o tipo nem o número de alternativas, e reordenar alternativas faz as respostas antigas apontarem para outro texto.
          </p>
        )}
        <div className="grid">
          <div><label>Matéria</label><select value={q.materia} onChange={set('materia')}>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Assunto</label>
            <input list="assuntos-form" value={q.assunto} onChange={set('assunto')} placeholder="Ex.: Legítima defesa" maxLength={120} />
            <datalist id="assuntos-form">{sugestoesForm.map(s => <option key={s.nome} value={s.nome} />)}</datalist></div>
          <div><label>Banca</label><select value={q.banca} onChange={set('banca')}>{BANCAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Ano</label><input inputMode="numeric" value={q.ano} onChange={set('ano')} /></div>
          <div><label>Órgão</label><input placeholder="PF, PRF, PC-SP…" value={q.orgao} onChange={set('orgao')} /></div>
          <div><label>Cargo</label><input placeholder="Agente, Delegado…" value={q.cargo} onChange={set('cargo')} /></div>
          <div><label>Tipo</label><select value={q.tipo} onChange={set('tipo')}><option value="mc">Múltipla escolha (A–E)</option><option value="ce">Certo ou Errado</option></select></div>
        </div>
        <label>Enunciado</label><textarea value={q.enunciado} onChange={set('enunciado')} />
        {!ce && q.alts.map((a, i) => (
          <div key={i}><label>Alternativa {'ABCDE'[i]}</label>
            <input value={a} onChange={e => setQ({ ...q, alts: q.alts.map((x, j) => j === i ? e.target.value : x) })} /></div>
        ))}
        <label>Gabarito ({ce ? 'C ou E' : 'A a E'})</label><input maxLength={1} value={q.gab} onChange={set('gab')} />
        <label>Comentário / fundamentação</label><textarea value={q.comentario} onChange={set('comentario')} />
        <button className="btn">{editId ? 'Salvar alterações' : 'Salvar questão'}</button>
        {editId && <button type="button" className="btn ghost" onClick={cancelar}>Cancelar edição</button>}
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Gerenciar questões publicadas</h3>
        <div className="grid">
          <div><label>Matéria</label><select value={mf.materia} onChange={e => { setPage(0); setMf({ ...mf, materia: e.target.value, assunto: '' }); }}>
            <option value="">Todas</option>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label>Assunto</label><select value={mf.assunto} onChange={e => { setPage(0); setMf({ ...mf, assunto: e.target.value }); }}>
            <option value="">Todos</option><option value={NONE}>(sem assunto)</option>
            {[...new Set(sugestoesFiltro.map(s => s.nome))].map(n => <option key={n}>{n}</option>)}</select></div>
          <div><label>Buscar</label><input value={mf.q} onChange={e => { setPage(0); setMf({ ...mf, q: e.target.value }); }} placeholder="texto do enunciado" /></div>
        </div>
        <p className="mut">{total} questão(ões)</p>
        <div className="scroll"><table>
          <thead><tr><th>Matéria / assunto</th><th>Banca</th><th>Enunciado</th><th></th></tr></thead>
          <tbody>{lista.map(r => (
            <tr key={r.id}>
              <td>{r.materia}<br /><span className="mut">{r.assunto || 'sem assunto'}</span></td>
              <td>{r.banca} {r.ano}</td>
              <td>{r.enunciado.slice(0, 70)}…</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button type="button" className="btn ghost sm" onClick={() => editar(r.id)}>Editar</button>{' '}
                <Link className="btn ghost sm" style={{ textDecoration: 'none', display: 'inline-block' }} href={`/painel/historico/${r.id}`}>Histórico</Link>{' '}
                {(isAdmin || r.created_by === user.id) && <button type="button" className="btn red sm" onClick={() => excluir(r.id)}>Excluir</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
        {pages > 1 && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn ghost sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <span className="mut">Página {page + 1} de {pages}</span>
            <button className="btn ghost sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Próxima</button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Assuntos</h3>
        <p className="mut" style={{ marginTop: 0 }}>É a lista que o aluno vê no mapa de estudo. Novos assuntos também nascem ao cadastrar uma questão.</p>
        <label>Matéria</label>
        <select value={gm} onChange={e => setGm(e.target.value)}>{MATERIAS.map(m => <option key={m}>{m}</option>)}</select>
        <form onSubmit={criarAssunto} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={novoAssunto} onChange={e => setNovoAssunto(e.target.value)} placeholder="Novo assunto" maxLength={120} />
          <button className="btn sm">Adicionar</button>
        </form>
        <div className="scroll" style={{ marginTop: 10 }}><table><tbody>
          {nomesCard.map(n => (
            <tr key={n}><td>{n}</td><td className="mut">{qtd(n)} questão(ões)</td>
              <td style={{ whiteSpace: 'nowrap' }}>{isAdmin && <>
                <button className="btn ghost sm" onClick={() => renomear(n)}>Renomear</button>{' '}
                {qtd(n) === 0 && <button className="btn red sm" onClick={() => excluirAssunto(n)}>Excluir</button>}</>}</td></tr>
          ))}
          {semAssunto > 0 && <tr><td><i>Sem assunto</i></td><td className="mut">{semAssunto} questão(ões)</td><td></td></tr>}
        </tbody></table></div>
        {!nomesCard.length && !semAssunto && <p className="mut">Nenhum assunto nesta matéria ainda.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Importar em lote (JSON)</h3>
        <p className="mut">Formato: {'[{"materia","assunto","banca","ano","orgao","cargo","tipo":"mc|ce","enunciado","alternativas":[…],"correta":0,"comentario"}]'} ("correta" é a posição da alternativa certa, começando em 0). Use apenas conteúdo que você tem direito de usar.</p>
        <textarea value={json} onChange={e => setJson(e.target.value)} />
        <button className="btn" onClick={importar}>Importar</button>
      </div>

      {isAdmin && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Denúncias de comentários {reps.length > 0 && <span className="pill">{reps.length} aberta(s)</span>}</h3>
          {!reps.length && <p className="mut">Nenhuma denúncia em aberto.</p>}
          {reps.map(({ c, rs, autor }) => (
            <div className="cm" key={c.id}>
              <div className="row"><b>{autor}</b>{c.oculto ? <span className="pill">Oculto ao público</span> : <span className="mut">Visível</span>}</div>
              <div style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{c.texto}</div>
              <ul className="mut" style={{ margin: '6px 0', paddingLeft: 18 }}>
                {rs.map(r => <li key={r.id}>{MOTIVO_TXT[r.motivo] || r.motivo}{r.detalhe ? `: ${r.detalhe}` : ''}</li>)}
              </ul>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost sm" onClick={() => manter(c.id)}>Manter comentário</button>
                <button className="btn red sm" onClick={() => removerComentario(c.id)}>Excluir comentário</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Usuários</h3>
          <form onSubmit={criarUsuario}>
            <div className="grid">
              <div><label>Nome</label><input value={nu.nome} onChange={e => setNu({ ...nu, nome: e.target.value })} required /></div>
              <div><label>E-mail</label><input type="email" value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} required /></div>
              <div><label>Senha inicial</label><input type="password" value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} required /></div>
              <div><label>Perfil</label><select value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value })}>
                <option value="editor">Editor (cadastra e edita questões)</option><option value="user">Aluno</option><option value="admin">Administrador</option></select></div>
            </div>
            <button className="btn">Criar usuário</button>
          </form>
          <div className="scroll" style={{ marginTop: 14 }}><table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id}><td>{u.nome}</td><td>{u.email}</td><td>{u.role}</td>
                <td>{u.id !== user.id && <button className="btn red sm" onClick={() => removerUsuario(u.id)}>Remover</button>}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </Shell>
  );
}
