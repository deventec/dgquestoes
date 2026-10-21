'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/components/AuthCard';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`
    });
    setBusy(false);
    setMsg(error
      ? { t: 'e', m: error.message }
      : { t: 'o', m: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' });
  }

  return (
    <AuthCard title="Recuperar senha" subtitle="Enviaremos um link de redefinição para o seu e-mail.">
      <form onSubmit={enviar}>
        {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}
        <label htmlFor="em">E-mail</label>
        <input id="em" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
      </form>
      <div className="links"><Link href="/login">Voltar ao login</Link></div>
    </AuthCard>
  );
}
