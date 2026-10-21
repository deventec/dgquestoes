'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const CAMPOS = [['materia', 'Matéria'], ['assunto', 'Assunto'], ['banca', 'Banca'], ['ano', 'Ano'], ['orgao', 'Órgão'], ['cargo', 'Cargo'],
  ['tipo', 'Tipo'], ['enunciado', 'Enunciado'], ['alternativas', 'Alternativas'], ['correta', 'Gabarito'], ['comentario', 'Comentário']];

function fmt(campo, v, ver) {
  if (v === null || v === undefined || v === '') return '—';
  if (campo === 'alternativas') return v.map((a, i) => `${'ABCDE'[i]}) ${a}`).join(' | ');
  if (campo === 'correta') return (ver.tipo === 'ce' ? 'CE' : 'ABCDE')[v] ?? String(v);
  if (campo === 'tipo') return v === 'ce' ? 'Certo ou Errado' : 'Múltipla escolha';
  const t = String(v);
  return t.length > 220 ? t.slice(0, 220) + '…' : t;
}
const igual = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '') || String(a ?? '') === String(b ?? '');

export default function Historico() {
  const { id } = useParams();
  const { loading, user, profile } = useAuth({ roles: ['admin', 'editor'] });
  const [atual, setAtual] = useState(null);
  const [vers, setVers] = useState([]);
  const [msg, setMsg] = useState(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { data: a, error } = await supabase.rpc('obter_questao_edicao', { p_id: id });
    if (error) { setMsg({ t: 'e', m: error.message }); setReady(true); return; }
    setAtual(a);
    const { data: h } = await supabase.rpc('listar_historico', { p_id: id });
    setVers(h || []); setReady(true);
  }, [id]);
  useEffect(() => { if (user) load(); }, [user, load]);

  async function restaurar(v) {
    if (!confirm('Restaurar esta versão? A versão atual será guardada no histórico e você poderá voltar a ela.')) return;
    const { error } = await supabase.rpc('restaurar_versao', { p_history: v.h_id });
    if (error) return setMsg({ t: 'e', m: error.message });
    setMsg({ t: 'o', m: 'Versão restaurada.' }); load();
  }

  if (loading) return <p className="wrap mut">Carregando…</p>;

  return (
    <Shell profile={profile}>
      <p><Link href="/painel">← Voltar ao painel</Link></p>
      {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}
      {atual && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Versão atual</h3>
          <div className="tags"><span className="tag">{atual.materia}</span>{atual.assunto && <span className="tag">{atual.assunto}</span>}<span className="tag">{atual.banca} {atual.ano}</span></div>
          <div>{atual.enunciado}</div>
          <p className="mut">Gabarito: {fmt('correta', atual.correta, atual)}{atual.updated_at ? ` · última edição em ${new Date(atual.updated_at).toLocaleString('pt-BR')}` : ' · nunca editada'}</p>
        </div>
      )}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Versões anteriores</h3>
        {ready && !vers.length && <p className="mut">Esta questão ainda não foi editada.</p>}
        {vers.map((v, i) => {
          const depois = i === 0 ? atual : vers[i - 1].h_antes;
          const mudou = depois ? CAMPOS.filter(([c]) => !igual(v.h_antes[c], depois[c])) : [];
          return (
            <div className="cm" key={v.h_id}>
              <div className="row"><b>Versão de antes da edição de {new Date(v.h_edited_at).toLocaleString('pt-BR')}</b><span className="mut">editada por {v.h_editor}</span></div>
              <p className="mut" style={{ margin: '4px 0' }}>O que mudou depois desta versão:</p>
              {mudou.map(([c, rot]) => (
                <div className="diff" key={c}><b>{rot}:</b> <del>{fmt(c, v.h_antes[c], v.h_antes)}</del> → <ins>{fmt(c, depois[c], depois)}</ins></div>
              ))}
              {!mudou.length && <div className="diff">Sem diferenças visíveis em relação à versão seguinte.</div>}
              <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => restaurar(v)}>Restaurar esta versão</button>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
