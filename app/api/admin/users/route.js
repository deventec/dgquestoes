import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ROLES = ['user', 'editor', 'admin'];

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

// Confirma que quem chama é um administrador logado.
async function exigirAdmin(req, sb) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single();
  return me?.role === 'admin' ? user : null;
}

export async function POST(req) {
  const sb = adminClient();
  if (!(await exigirAdmin(req, sb))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const { nome, email, password, role } = await req.json();
  if (!nome || !email || !password || password.length < 6 || !ROLES.includes(role))
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  const { data, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nome }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await sb.from('profiles').update({ role, nome }).eq('id', data.user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const sb = adminClient();
  const admin = await exigirAdmin(req, sb);
  if (!admin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const { id } = await req.json();
  if (!id || id === admin.id) return NextResponse.json({ error: 'Não é possível remover este usuário.' }, { status: 400 });
  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
