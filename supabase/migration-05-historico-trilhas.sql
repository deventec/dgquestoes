-- DG QUESTÕES · parte 5: histórico com restauração, trilhas de estudo e filtro de assuntos por banca.
-- Rode DEPOIS do migration-04-assuntos-edicao.sql.

---------------------------------------------------------------
-- 1) Filtro: assuntos que existem para a matéria (e, se escolhida, para a banca)
---------------------------------------------------------------
create or replace function public.lista_assuntos(p_materia text, p_banca text default null)
returns table (a_assunto text, a_total bigint)
language sql stable set search_path = public as $$
  select q.assunto, count(*) from public.questions q
  where q.materia = p_materia and (nullif(p_banca,'') is null or q.banca = p_banca)
  group by q.assunto order by q.assunto
$$;

---------------------------------------------------------------
-- 2) Histórico de edições: listar e restaurar (editor e admin)
---------------------------------------------------------------
create or replace function public.listar_historico(p_id uuid)
returns table (h_id uuid, h_edited_at timestamptz, h_editor text, h_antes jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_role text := public.my_role();
begin
  if v_role is null or v_role not in ('editor','admin') then raise exception 'Sem permissão.'; end if;
  return query
    select h.id, h.edited_at, coalesce(nullif(pr.nome,''), pr.email, 'Equipe'), h.antes
    from public.question_history h left join public.profiles pr on pr.id = h.edited_by
    where h.question_id = p_id order by h.edited_at desc;
end $$;

-- Restaurar = aplicar a versão antiga como uma nova edição. A versão atual vai para o histórico,
-- então a restauração também pode ser desfeita. Valem as mesmas regras de editar_questao.
create or replace function public.restaurar_versao(p_history uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_role text := public.my_role(); v_h record;
begin
  if v_role is null or v_role not in ('editor','admin') then raise exception 'Sem permissão.'; end if;
  select * into v_h from public.question_history where id = p_history;
  if not found then raise exception 'Versão inexistente.'; end if;
  perform public.editar_questao(v_h.question_id, v_h.antes);
end $$;

---------------------------------------------------------------
-- 3) Trilhas de estudo por cargo
---------------------------------------------------------------
create table if not exists public.trilhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  cargo text not null default '',
  descricao text not null default '',
  ativa boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.trilha_itens (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references public.trilhas(id) on delete cascade,
  ordem int not null default 0,
  materia text not null,
  assunto text not null default '',          -- vazio = a matéria inteira
  observacao text not null default ''
);
create index if not exists trilha_itens_ordem_idx on public.trilha_itens (trilha_id, ordem);

alter table public.trilhas enable row level security;
alter table public.trilha_itens enable row level security;

drop policy if exists "trilhas: ler" on public.trilhas;
create policy "trilhas: ler" on public.trilhas for select to authenticated
  using (ativa or public.my_role() in ('editor','admin'));
drop policy if exists "trilhas: equipe escreve" on public.trilhas;
create policy "trilhas: equipe escreve" on public.trilhas for all to authenticated
  using (public.my_role() in ('editor','admin')) with check (public.my_role() in ('editor','admin'));

drop policy if exists "itens trilha: ler" on public.trilha_itens;
create policy "itens trilha: ler" on public.trilha_itens for select to authenticated
  using (exists (select 1 from public.trilhas t where t.id = trilha_id and (t.ativa or public.my_role() in ('editor','admin'))));
drop policy if exists "itens trilha: equipe escreve" on public.trilha_itens;
create policy "itens trilha: equipe escreve" on public.trilha_itens for all to authenticated
  using (public.my_role() in ('editor','admin')) with check (public.my_role() in ('editor','admin'));

-- Grava a ordem dos passos conforme a lista de ids recebida
create or replace function public.reordenar_trilha(p_trilha uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v_role text := public.my_role();
begin
  if v_role is null or v_role not in ('editor','admin') then raise exception 'Sem permissão.'; end if;
  update public.trilha_itens i set ordem = x.n - 1
  from unnest(p_ids) with ordinality as x(id, n)
  where i.id = x.id and i.trilha_id = p_trilha;
end $$;

-- Renomear assunto também atualiza as trilhas
create or replace function public.renomear_assunto(p_materia text, p_antigo text, p_novo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_novo text := public.norm_txt(p_novo);
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Só o administrador pode renomear assuntos.'; end if;
  if v_novo = '' then raise exception 'Digite o novo nome.'; end if;
  update public.questions set assunto = v_novo where materia = p_materia and assunto = p_antigo;
  update public.trilha_itens set assunto = v_novo where materia = p_materia and assunto = p_antigo;
  delete from public.assuntos where materia = p_materia and nome = p_antigo;
  insert into public.assuntos values (p_materia, v_novo) on conflict do nothing;
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'lista_assuntos(text,text)','listar_historico(uuid)','restaurar_versao(uuid)',
    'reordenar_trilha(uuid,uuid[])','renomear_assunto(text,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
