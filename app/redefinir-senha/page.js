'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/components/AuthCard';

export default function RedefinirSenha() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    // O link do e-mail cria uma sessão temporária de recuperação.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') setPronto(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    if (senha.length < 6) return setMsg({ t: 'e', m: 'A senha precisa ter ao menos 6 caracteres.' });
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return setMsg({ t: 'e', m: error.message });
    setMsg({ t: 'o', m: 'Senha alterada! Redirecionando…' });
    setTimeout(() => router.replace('/questoes'), 1200);
  }

  return (
    <AuthCard title="Nova senha">
      {!pronto ? (
        <p className="mut">Abra esta página pelo link enviado ao seu e-mail. Se ele expirou, peça um novo em "Esqueceu a senha?".</p>
      ) : (
        <form onSubmit={salvar}>
          {msg && <div className={`msg ${msg.t}`}>{msg.m}</div>}
          <label htmlFor="pw">Nova senha</label>
          <input id="pw" type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
          <button className="btn">Salvar senha</button>
        </form>
      )}
    </AuthCard>
  );
}
