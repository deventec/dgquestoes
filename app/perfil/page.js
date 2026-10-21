'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import Avatar from '@/components/Avatar';
import Medalha from '@/components/Medalha';
import MetaDiaria from '@/components/MetaDiaria';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { foto, redimensionar } from '@/lib/media';

const METAS = [5, 10, 20, 30, 50, 100];
const FRASE_PADRAO = 'Disciplina hoje, farda amanhã.';
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const FAMILIAS = [
  ['sequencia', 'Sequência de estudo', 'Dias seguidos batendo a meta. As medalhas ficam para sempre, mesmo que a sequência zere.'],
  ['dias', 'Constância', 'Total de dias com a meta batida.'],
  ['intenso', 'Dia intenso', 'Muitas questões em um único dia.']
];

// Data de hoje no fuso de Brasília (mesmo critério do servidor)
const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
function diasAtras(n) {
  const d = new Date(hojeBR() + 'T12:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Perfil() {
  const { loading, user, profile, reload } = useAuth();
  const [f, setF] = useState({ nome: '', frase: '', objetivo: '' });
  const [msg, setMsg] = useState(null);
  const [busyImg, setBusyImg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [seq, setSeq] = useState(null);
  const [stats, setStats] = useState({ total: 0, acertos: 0 });
  const [dias, setDias] = useState({});
  const [maxDia, setMaxDia] = useState(0);
  const [defs, setDefs] = useState([]);
  const [minhas, setMinhas] = useState({});
  const [tick, setTick] = useState(0);
  const aviso = (t, m) => setMsg({ t, m });

  useEffect(() => { if (profile) setF({ nome: profile.nome || '', frase: profile.frase || '', objetivo: profile.objetivo || '' }); }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc('minha_sequencia');
      setSeq(data?.[0] || null);
      const t = await supabase.from('answers').select('question_id', { count: 'exact', head: true });
      const a = await supabase.from('answers').select('question_id', { count: 'exact', head: true }).eq('correta', true);
      setStats({ total: t.count || 0, acertos: a.count || 0 });
      const { data: at } = await supabase.from('atividade_diaria').select('dia,respondidas,meta').gte('dia', diasAtras(34));
      setDias(Object.fromEntries((at || []).map(x => [x.dia, x])));
      const { data: mx } = await supabase.from('atividade_diaria').select('respondidas').order('respondidas', { ascending: false }).limit(1);
      setMaxDia(mx?.[0]?.respondidas || 0);
      const { data: d } = await supabase.from('conquistas_def').select('*').order('ordem');
      setDefs(d || []);
      const { data: m } = await supabase.from('conquistas').select('codigo,desbloqueada_em');
      setMinhas(Object.fromEntries((m || []).map(x => [x.codigo, x.desbloqueada_em])));
    })();
  }, [user, tick]);

  async function gravar(extra = {}) {
    const { error } = await supabase.rpc('salvar_perfil', {
      p_nome: f.nome, p_frase: f.frase, p_objetivo: f.objetivo,
      p_avatar: 'avatar' in extra ? extra.avatar : profile.avatar_path,
      p_capa: 'capa' in extra ? extra.capa : profile.capa_path
    });
    if (error) throw error;
  }

  async function salvarTextos(e) {
    e.preventDefault();
    setSalvando(true);
    try { await gravar(); await reload(); aviso('o', 'Perfil atualizado.'); setEditando(false); }
    catch (err) { aviso('e', err.message || 'Não foi possível salvar.'); }
    setSalvando(false);
  }

  async function trocar(tipo, e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TIPOS.includes(file.type)) return aviso('e', 'Use uma imagem JPG, PNG ou WebP.');
    if (file.size > 10 * 1024 * 1024) return aviso('e', 'Imagem muito grande (máximo 10 MB).');
    setBusyImg(tipo); setMsg(null);
    try {
      const blob = await redimensionar(file, tipo === 'avatar' ? 480 : 1500, tipo === 'avatar' ? 480 : 500);
      const path = `${user.id}/${tipo}-${Date.now()}.jpg`;
      const up = await supabase.storage.from('perfis').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (up.error) throw up.error;
      const antigo = tipo === 'avatar' ? profile.avatar_path : profile.capa_path;
      await gravar({ [tipo]: path });
      if (antigo) await supabase.storage.from('perfis').remove([antigo]);
      await reload(); aviso('o', tipo === 'avatar' ? 'Foto de perfil atualizada.' : 'Capa atualizada.');
    } catch (err) { aviso('e', `Não foi possível enviar a imagem. ${err.message || ''}`); }
    setBusyImg('');
  }

  async function remover(tipo) {
    const antigo = tipo === 'avatar' ? profile.avatar_path : profile.capa_path;
    if (!antigo) return;
    try {
      await gravar({ [tipo]: null });
      await supabase.storage.from('perfis').remove([antigo]);
      await reload(); aviso('o', 'Imagem removida.');
    } catch (err) { aviso('e', err.message || 'Não foi possível remover.'); }
  }

  async function mudarMeta(e) {
    const { error } = await supabase.rpc('definir_meta', { p_meta: Number(e.target.value) });
    if (error) return aviso('e', error.message);
    await reload(); setTick(t => t + 1);
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;

  const capa = foto(profile?.capa_path);
  const pct = stats.total ? Math.round(stats.acertos / stats.total * 100) : 0;
  const hoje = hojeBR();
  const grade = Array.from({ length: 35 }, (_, i) => diasAtras(34 - i));
  const valor = fam => (fam === 'sequencia' ? seq?.r_recorde ?? 0 : fam === 'dias' ? Number(seq?.r_dias ?? 0) : maxDia);
  const feitas = defs.filter(d => minhas[d.codigo]).length;
  const proxima = defs.filter(d => d.familia === 'sequencia' && !minhas[d.codigo])[0];

  return (
    <Shell profile={profile}>
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}

      <section className="perfil" aria-label="Meu perfil">
        <div className={`capa${capa ? ' foto' : ''}`} style={capa ? { '--img': `url("${capa}")` } : undefined}>
          <div className="acoes">
            <label className="filebtn">{busyImg === 'capa' ? 'Enviando…' : 'Alterar capa'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!busyImg} onChange={e => trocar('capa', e)} /></label>
            {profile?.capa_path && <button type="button" className="minibtn" onClick={() => remover('capa')}>Remover</button>}
          </div>
        </div>
        <div className="hd">
          <div className="av">
            <Avatar path={profile?.avatar_path} nome={profile?.nome} size={116} />
            <label className="filebtn" title="Alterar foto de perfil">{busyImg === 'avatar' ? '…' : 'Foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!busyImg} onChange={e => trocar('avatar', e)} /></label>
          </div>
          <div className="quem">
            <h2>{profile?.nome || 'Aluno'}</h2>
            {profile?.objetivo ? <span className="alvo">Rumo à {profile.objetivo}</span> : <span className="alvo">Defina seu objetivo</span>}
          </div>
        </div>
        <div className="corpo">
          <blockquote className="frase">{profile?.frase || FRASE_PADRAO}</blockquote>
          {profile?.avatar_path && <button type="button" className="lnk mutl" onClick={() => remover('avatar')}>Remover foto de perfil</button>}
        </div>
      </section>

      <div className="card acord">
        <button type="button" className="acordbtn" aria-expanded={editando} aria-controls="painel-editar" onClick={() => setEditando(!editando)}>
          <span><b>Editar perfil</b><span className="mut"> · nome, objetivo e frase</span></span>
          <span className={`seta${editando ? ' aberta' : ''}`} aria-hidden="true">▾</span>
        </button>
        {editando && (
          <form id="painel-editar" onSubmit={salvarTextos} style={{ marginTop: 6 }}>
            <label htmlFor="nome">Nome</label>
            <input id="nome" value={f.nome} maxLength={80} onChange={e => setF({ ...f, nome: e.target.value })} required />
            <label htmlFor="obj">Meu objetivo (cargo ou concurso)</label>
            <input id="obj" value={f.objetivo} maxLength={60} placeholder="Ex.: Agente da PF" onChange={e => setF({ ...f, objetivo: e.target.value })} />
            <label htmlFor="fr">Frase motivacional <span className="mut">({f.frase.length}/140)</span></label>
            <textarea id="fr" value={f.frase} maxLength={140} style={{ minHeight: 70 }} placeholder={FRASE_PADRAO} onChange={e => setF({ ...f, frase: e.target.value })} />
            <div className="botoes">
              <button className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar perfil'}</button>
              <button type="button" className="btn ghost" onClick={() => setEditando(false)}>Fechar</button>
            </div>
            <p className="mut" style={{ marginBottom: 0 }}>Seu perfil é privado. Para os outros alunos aparecem só a sua foto e o seu nome, nos comentários e no ranking (se você não tiver optado por sair dele).</p>
          </form>
        )}
      </div>

      <MetaDiaria refreshKey={tick} />

      <div className="card">
        <div className="stats">
          <div className="stat"><b>{seq?.r_atual ?? 0}</b>Dias seguidos</div>
          <div className="stat"><b>{seq?.r_recorde ?? 0}</b>Melhor sequência</div>
          <div className="stat"><b>{stats.total}</b>Respondidas</div>
          <div className="stat"><b>{pct}%</b>Aproveitamento</div>
        </div>
      </div>

      <section className="card" aria-label="Conquistas">
        <div className="row">
          <h3 style={{ margin: 0 }}>Conquistas e medalhas</h3>
          <span className="pill">{feitas}/{defs.length}</span>
        </div>
        <div className="bar" style={{ marginBottom: 6 }}><div style={{ width: `${defs.length ? Math.round(feitas / defs.length * 100) : 0}%` }} /></div>
        {proxima && (
          <p className="mut" style={{ margin: '4px 0 0' }}>
            Próxima medalha: <b>{proxima.nome}</b>. {valor('sequencia') >= proxima.limite ? '' : `Faltam ${proxima.limite - valor('sequencia')} dia(s) de sequência.`}
          </p>
        )}
        {FAMILIAS.map(([fam, titulo, ajuda]) => {
          const lista = defs.filter(d => d.familia === fam);
          if (!lista.length) return null;
          const prox = lista.find(d => !minhas[d.codigo]);
          return (
            <div key={fam} style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 2px' }}>{titulo}</h4>
              <p className="mut" style={{ margin: '0 0 8px', fontSize: 13 }}>{ajuda}</p>
              <div className="medalhas">
                {lista.map(d => {
                  const ganha = !!minhas[d.codigo];
                  const v = Math.min(valor(fam), d.limite);
                  return (
                    <div key={d.codigo} className={`medtile${ganha ? ' ganha' : ''}${prox?.codigo === d.codigo ? ' prox' : ''}`}>
                      <Medalha familia={d.familia} nivel={d.nivel} limite={d.limite} bloqueada={!ganha} size={68} />
                      <b>{d.nome}</b>
                      <span className="mut">{d.descricao}</span>
                      {ganha
                        ? <span className="data">Conquistada em {new Date(minhas[d.codigo]).toLocaleDateString('pt-BR')}</span>
                        : <><span className="bar"><span style={{ width: `${Math.round(v / d.limite * 100)}%` }} /></span><span className="mut">{v}/{d.limite}</span></>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Meta diária e últimos 35 dias</h3>
        <label htmlFor="meta">Quantas questões por dia?</label>
        <select id="meta" value={seq?.r_meta ?? 10} onChange={mudarMeta} style={{ maxWidth: 240 }}>
          {[...new Set([...METAS, seq?.r_meta ?? 10])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{n} questões</option>)}
        </select>
        <p className="mut">Um dia entra na sequência quando você bate a meta daquele dia. A contagem usa o horário de Brasília.</p>
        <div className="heat" role="img" aria-label="Calendário dos últimos 35 dias de estudo">
          {grade.map(d => {
            const x = dias[d];
            const bateu = x && x.respondidas >= (d === hoje ? (seq?.r_meta ?? x.meta) : x.meta);
            return <i key={d} className={`${bateu ? 'm' : x?.respondidas ? 'p' : ''}${d === hoje ? ' h' : ''}`} title={`${d.split('-').reverse().join('/')}: ${x?.respondidas || 0} questões`} />;
          })}
        </div>
        <p className="mut" style={{ marginBottom: 0 }}>Verde: meta batida · verde claro: estudou, mas não bateu · cinza: sem estudo · contorno dourado: hoje.</p>
      </div>
    </Shell>
  );
}
