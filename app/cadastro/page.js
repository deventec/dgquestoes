'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/components/AuthCard';

export default function Cadastro() {
  const [f, setF] = useState({ nome: '', email: '', senha: '', senha2: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function cadastrar(e) {
    e.preventDefault();
    if (f.senha.length < 6) return setMsg({ t: 'e', m: 'A senha precisa ter ao menos 6 caracteres.' });
    if (f.senha !== f.senha2) return setMsg({ t: 'e', m: 'As senhas não conferem.' });
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signUp({
      email: f.email,
      password: f.senha,
      options: { data: { nome: f.nome }, emailRedirectTo: `${window.location.origin}/login` }
    });
    setBusy(false);
    if (error) return setMsg({ t: 'e', m: error.message });
    setMsg({ t: 'o', m: 'Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre.' });
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={cadastrar}>
        {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}
        <label htmlFor="nm">Nome</label><input id="nm" value={f.nome} onChange={set('nome')} required />
        <label htmlFor="em">E-mail</label><input id="em" type="email" value={f.email} onChange={set('email')} required />
        <label htmlFor="pw">Senha (mín. 6 caracteres)</label><input id="pw" type="password" value={f.senha} onChange={set('senha')} required />
        <label htmlFor="pw2">Confirmar senha</label><input id="pw2" type="password" value={f.senha2} onChange={set('senha2')} required />
        <button className="btn" disabled={busy}>{busy ? 'Criando…' : 'Cadastrar'}</button>
      </form>
      <div className="links"><Link href="/login">Já tenho conta</Link></div>
    </AuthCard>
  );
}
