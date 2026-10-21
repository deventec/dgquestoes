-- DG QUESTÕES: rode este arquivo inteiro no SQL Editor do Supabase.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  role text not null default 'user' check (role in ('user','editor','admin')),
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  materia text not null,
  banca text not null,
  ano int,
  orgao text,
  cargo text,
  tipo text not null default 'mc' check (tipo in ('mc','ce')),
  enunciado text not null,
  alternativas jsonb not null,
  correta int not null,
  comentario text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.questions (materia);
create index on public.questions (banca);
create index on public.questions (ano);

create table public.answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  escolha int not null,
  correta boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome',''), new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

-- profiles: cada um vê o seu; admin vê e edita todos
create policy "perfil: ver o proprio ou admin" on public.profiles for select
  using (id = auth.uid() or public.my_role() = 'admin');
create policy "perfil: admin edita" on public.profiles for update
  using (public.my_role() = 'admin');

-- questions: todo usuário logado lê; editor/admin cadastram
create policy "questoes: ler" on public.questions for select to authenticated using (true);
create policy "questoes: inserir" on public.questions for insert to authenticated
  with check (public.my_role() in ('editor','admin') and created_by = auth.uid());
create policy "questoes: editar" on public.questions for update to authenticated
  using (public.my_role() = 'admin' or (public.my_role() = 'editor' and created_by = auth.uid()));
create policy "questoes: excluir" on public.questions for delete to authenticated
  using (public.my_role() = 'admin' or (public.my_role() = 'editor' and created_by = auth.uid()));

-- answers: cada aluno só mexe nas próprias respostas
create policy "respostas: proprias" on public.answers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Depois de criar sua conta pelo site, torne-se admin (troque o e-mail):
-- update public.profiles set role = 'admin' where email = 'seu@email.com';
