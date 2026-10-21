-- DG QUESTÕES · parte 7: feedback dos alunos para o administrador.
-- Rode DEPOIS do migration-06-meta-perfil.sql.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('sugestao','problema','questao','elogio','duvida','outro')),
  titulo text not null default '' check (char_length(titulo) <= 100),
  mensagem text not null check (char_length(mensagem) between 5 and 2000),
  nota int check (nota between 1 and 5),
  pagina text not null default '' check (char_length(pagina) <= 200),
  question_id uuid references public.questions(id) on delete set null,
  motivo_questao text check (motivo_questao in ('gabarito','enunciado','alternativas','comentario','outro')),
  anexo_path text,
  status text not null default 'novo' check (status in ('novo','em_analise','resolvido','arquivado')),
  nota_interna text not null default '',
  resposta text check (char_length(resposta) <= 2000),
  respondido_em timestamptz,
  respondido_por uuid,
  resposta_lida boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
drop policy if exists "feedback: ler" on public.feedback;
create policy "feedback: ler" on public.feedback for select to authenticated
  using (user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "feedback: admin exclui" on public.feedback;
create policy "feedback: admin exclui" on public.feedback for delete to authenticated
  using (public.my_role() = 'admin');
-- Envio, resposta e mudança de status só pelas funções abaixo.

-- Aluno envia (limite de 5 por hora para evitar spam)
create or replace function public.enviar_feedback(
  p_tipo text, p_titulo text, p_mensagem text, p_nota int, p_pagina text,
  p_question uuid, p_motivo text, p_anexo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_msg text := btrim(coalesce(p_mensagem, ''));
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  if p_tipo is null or p_tipo not in ('sugestao','problema','questao','elogio','duvida','outro') then raise exception 'Tipo inválido.'; end if;
  if char_length(v_msg) < 5 or char_length(v_msg) > 2000 then raise exception 'A mensagem deve ter entre 5 e 2000 caracteres.'; end if;
  if (select count(*) from public.feedback f where f.user_id = v_uid and f.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Você já enviou vários feedbacks na última hora. Tente de novo mais tarde.';
  end if;
  if p_tipo = 'questao' then
    if p_question is null or not exists (select 1 from public.questions q where q.id = p_question) then raise exception 'Questão não encontrada.'; end if;
    if p_motivo is null or p_motivo not in ('gabarito','enunciado','alternativas','comentario','outro') then raise exception 'Escolha o motivo.'; end if;
  end if;
  if p_nota is not null and (p_nota < 1 or p_nota > 5) then raise exception 'Nota inválida.'; end if;
  if p_anexo is not null and (left(p_anexo, length(v_uid::text) + 1) <> v_uid::text || '/' or p_anexo like '%..%') then
    raise exception 'Anexo inválido.';
  end if;
  insert into public.feedback (user_id, tipo, titulo, mensagem, nota, pagina, question_id, motivo_questao, anexo_path)
  values (v_uid, p_tipo, left(btrim(coalesce(p_titulo, '')), 100), v_msg, p_nota, left(coalesce(p_pagina, ''), 200),
          case when p_tipo = 'questao' then p_question end, case when p_tipo = 'questao' then p_motivo end, p_anexo)
  returning id into v_id;
  return v_id;
end $$;

-- Admin responde (a resposta aparece para o aluno) e define o status
create or replace function public.responder_feedback(p_id uuid, p_resposta text, p_status text default 'resolvido') returns void
language plpgsql security definer set search_path = public as $$
declare v_txt text := btrim(coalesce(p_resposta, ''));
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Só o administrador pode responder.'; end if;
  if char_length(v_txt) < 1 or char_length(v_txt) > 2000 then raise exception 'Escreva a resposta (até 2000 caracteres).'; end if;
  if p_status not in ('novo','em_analise','resolvido','arquivado') then raise exception 'Status inválido.'; end if;
  update public.feedback set resposta = v_txt, respondido_em = now(), respondido_por = auth.uid(),
         resposta_lida = false, status = p_status, updated_at = now()
  where id = p_id;
  if not found then raise exception 'Feedback não encontrado.'; end if;
end $$;

-- Admin muda o status e a anotação interna (o aluno não vê a anotação)
create or replace function public.atualizar_feedback(p_id uuid, p_status text, p_nota_interna text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Só o administrador pode alterar.'; end if;
  if p_status not in ('novo','em_analise','resolvido','arquivado') then raise exception 'Status inválido.'; end if;
  update public.feedback set status = p_status, nota_interna = left(coalesce(p_nota_interna, ''), 2000), updated_at = now() where id = p_id;
  if not found then raise exception 'Feedback não encontrado.'; end if;
end $$;

create or replace function public.marcar_respostas_lidas() returns void
language sql security definer set search_path = public as $$
  update public.feedback set resposta_lida = true where user_id = auth.uid() and not resposta_lida
$$;

-- Números para as bolinhas do menu: novos (só admin) e respostas ainda não lidas (aluno)
create or replace function public.contadores_caixa()
returns table (r_novos int, r_respostas int)
language sql stable security definer set search_path = public as $$
  select case when public.my_role() = 'admin' then (select count(*)::int from public.feedback where status = 'novo') else 0 end,
         (select count(*)::int from public.feedback where user_id = auth.uid() and not resposta_lida)
$$;

-- Anexo (print de tela): bucket PRIVADO. O aluno envia na própria pasta; só ele e o admin leem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "feedback: enviar anexo" on storage.objects;
create policy "feedback: enviar anexo" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "feedback: ver anexo" on storage.objects;
create policy "feedback: ver anexo" on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() = 'admin'));
drop policy if exists "feedback: apagar anexo" on storage.objects;
create policy "feedback: apagar anexo" on storage.objects for delete to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() = 'admin'));

do $$ declare f text; begin
  foreach f in array array[
    'enviar_feedback(text,text,text,int,text,uuid,text,text)','responder_feedback(uuid,text,text)',
    'atualizar_feedback(uuid,text,text)','marcar_respostas_lidas()','contadores_caixa()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;