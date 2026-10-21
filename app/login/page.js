'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/components/AuthCard';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setBusy(true); setErro('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setBusy(false);
    if (error) return setErro('E-mail ou senha incorretos, ou e-mail ainda não confirmado.');
    router.replace('/questoes');
  }

  return (
    <AuthCard title="Entrar" subtitle="Questões para carreiras policiais.">
      <form onSubmit={entrar}>
        {erro && <div className="msg e">{erro}</div>}
        <label htmlFor="em">E-mail</label>
        <input id="em" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
        <label htmlFor="pw">Senha</label>
        <input id="pw" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required />
        <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <div className="links">
        <Link href="/cadastro">Cadastre-se</Link>
        <Link href="/esqueci-senha">Esqueceu a senha?</Link>
      </div>
    </AuthCard>
  );
}
