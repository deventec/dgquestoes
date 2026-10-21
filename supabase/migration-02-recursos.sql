-- DG QUESTÕES · parte 2: comentários, simulados e ranking.
-- Rode DEPOIS do schema.sql, no SQL Editor do Supabase.

-- Nomes públicos (só id e nome; e-mail e perfil continuam privados)
create or replace view public.perfis_publicos as select id, nome from public.profiles;
grant select on public.perfis_publicos to authenticated;

-- Ranking: o aluno pode ocultar o próprio nome
alter table public.profiles add column if not exists mostrar_ranking boolean not null default true;
create or replace function public.definir_ranking(v boolean) returns void
language sql security definer set search_path = public as $$
  update public.profiles set mostrar_ranking = v where id = auth.uid()
$$;

-- Ranking por período (dias = null → geral). Só entra quem tem 10+ respostas no período.
create or replace function public.ranking(dias int default null)
returns table (user_id uuid, nome text, respondidas bigint, acertos bigint, pct numeric)
language sql stable security definer set search_path = public as $$
  select a.user_id, p.nome, count(*), count(*) filter (where a.correta),
         round(100.0 * count(*) filter (where a.correta) / count(*), 1)
  from public.answers a join public.profiles p on p.id = a.user_id
  where p.mostrar_ranking and (dias is null or a.created_at >= now() - make_interval(days => dias))
  group by a.user_id, p.nome
  having count(*) >= 10
  order by 5 desc, 3 desc
  limit 50
$$;
grant execute on function public.ranking(int) to authenticated;
grant execute on function public.definir_ranking(boolean) to authenticated;

-- Comentários por questão
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on public.comments (question_id, created_at);
alter table public.comments enable row level security;
create policy "comentarios: ler" on public.comments for select to authenticated using (true);
create policy "comentarios: criar" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "comentarios: excluir" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.my_role() = 'admin');

-- Simulados
create table public.simulados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  duracao_seg int not null check (duracao_seg > 0),
  total int not null,
  acertos int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create table public.simulado_itens (
  simulado_id uuid not null references public.simulados(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  ordem int not null,
  escolha int,
  primary key (simulado_id, question_id)
);
alter table public.simulados enable row level security;
alter table public.simulado_itens enable row level security;
create policy "simulados: proprios" on public.simulados for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "itens: ler" on public.simulado_itens for select to authenticated
  using (exists (select 1 from public.simulados s where s.id = simulado_id and s.user_id = auth.uid()));
create policy "itens: criar" on public.simulado_itens for insert to authenticated
  with check (exists (select 1 from public.simulados s where s.id = simulado_id and s.user_id = auth.uid()));
create policy "itens: marcar enquanto aberto" on public.simulado_itens for update to authenticated
  using (exists (select 1 from public.simulados s where s.id = simulado_id and s.user_id = auth.uid() and s.finished_at is null));
create policy "itens: excluir" on public.simulado_itens for delete to authenticated
  using (exists (select 1 from public.simulados s where s.id = simulado_id and s.user_id = auth.uid()));
