-- DG QUESTÕES · parte 6: meta diária com sequência de dias e perfil do aluno (foto, capa e frase).
-- Rode DEPOIS do migration-05-historico-trilhas.sql.

---------------------------------------------------------------
-- 1) Meta diária e dias de estudo (fuso de Brasília)
---------------------------------------------------------------
alter table public.profiles add column if not exists meta_diaria int not null default 10
  check (meta_diaria between 1 and 200);

create table if not exists public.atividade_diaria (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  respondidas int not null default 0,
  acertos int not null default 0,
  meta int not null default 10,            -- meta que valia naquele dia
  primary key (user_id, dia)
);
alter table public.atividade_diaria enable row level security;
drop policy if exists "atividade: ler propria" on public.atividade_diaria;
create policy "atividade: ler propria" on public.atividade_diaria for select to authenticated using (user_id = auth.uid());

-- Aproveita o histórico que já existe
insert into public.atividade_diaria (user_id, dia, respondidas, acertos, meta)
select a.user_id, (a.created_at at time zone 'America/Sao_Paulo')::date, count(*), count(*) filter (where a.correta), 10
from public.answers a group by 1, 2
on conflict do nothing;

create or replace function public.hoje_br() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Uso interno: soma respostas no dia
create or replace function public.registrar_atividade(p_user uuid, p_dia date, p_resp int, p_acertos int) returns void
language sql security definer set search_path = public as $$
  insert into public.atividade_diaria (user_id, dia, respondidas, acertos, meta)
  values (p_user, p_dia, p_resp, p_acertos, coalesce((select meta_diaria from public.profiles where id = p_user), 10))
  on conflict (user_id, dia) do update set
    respondidas = public.atividade_diaria.respondidas + excluded.respondidas,
    acertos = public.atividade_diaria.acertos + excluded.acertos,
    meta = excluded.meta
$$;
revoke all on function public.registrar_atividade(uuid, date, int, int) from public, anon, authenticated;

-- responder_questao: agora também conta para a meta do dia
create or replace function public.responder_questao(p_question uuid, p_escolha int)
returns table (r_acertou boolean, r_gabarito int, r_comentario text, r_escolha int)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c int; v_t text; v_n int; v_prev record; v_ref boolean;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  select k.correta, k.comentario into v_c, v_t from public.question_keys k where k.question_id = p_question;
  if not found then raise exception 'Questão inexistente.'; end if;
  select a.escolha as e, a.correta as ok into v_prev from public.answers a where a.user_id = v_uid and a.question_id = p_question;
  if found then return query select v_prev.ok, v_c, v_t, v_prev.e; return; end if;
  if exists (select 1 from public.simulado_itens i join public.simulados s on s.id = i.simulado_id
             where i.question_id = p_question and s.user_id = v_uid and s.finished_at is null
               and now() < s.started_at + make_interval(secs => s.duracao_seg)) then
    raise exception 'Esta questão está em um simulado em andamento. Responda por lá.';
  end if;
  select jsonb_array_length(q.alternativas) into v_n from public.questions q where q.id = p_question;
  if p_escolha is null or p_escolha < 0 or p_escolha >= v_n then raise exception 'Alternativa inválida.'; end if;
  v_ref := exists (select 1 from public.refeitas r where r.user_id = v_uid and r.question_id = p_question);
  insert into public.answers (user_id, question_id, escolha, correta, refeita)
  values (v_uid, p_question, p_escolha, p_escolha = v_c, v_ref);
  perform public.registrar_atividade(v_uid, public.hoje_br(), 1, case when p_escolha = v_c then 1 else 0 end);
  return query select (p_escolha = v_c), v_c, v_t, p_escolha;
end $$;

-- finalizar_simulado: as questões respondidas no simulado contam para a meta do dia da conclusão
create or replace function public.finalizar_simulado(p_simulado uuid)
returns table (r_acertos int, r_total int)
language plpgsql security definer set search_path = public as $$
declare v_s record; v_ac int; v_fim timestamptz; v_n int; v_ok int;
begin
  select * into v_s from public.simulados s where s.id = p_simulado and s.user_id = auth.uid() for update;
  if not found then raise exception 'Simulado inexistente.'; end if;
  if v_s.finished_at is not null then return query select v_s.acertos, v_s.total; return; end if;
  v_fim := least(now(), v_s.started_at + make_interval(secs => v_s.duracao_seg));
  select count(*) into v_ac from public.simulado_itens i join public.question_keys k on k.question_id = i.question_id
   where i.simulado_id = p_simulado and i.escolha = k.correta;
  update public.simulados set finished_at = v_fim, acertos = v_ac where id = p_simulado;
  with ins as (
    insert into public.answers (user_id, question_id, escolha, correta, refeita, created_at)
      select v_s.user_id, i.question_id, i.escolha, i.escolha = k.correta,
             exists (select 1 from public.refeitas r where r.user_id = v_s.user_id and r.question_id = i.question_id), v_fim
      from public.simulado_itens i join public.question_keys k on k.question_id = i.question_id
      where i.simulado_id = p_simulado and i.escolha is not null
    on conflict (user_id, question_id) do nothing
    returning correta)
  select count(*), count(*) filter (where correta) into v_n, v_ok from ins;
  if v_n > 0 then
    perform public.registrar_atividade(v_s.user_id, (v_fim at time zone 'America/Sao_Paulo')::date, v_n, v_ok);
  end if;
  return query select v_ac, v_s.total;
end $$;

-- Sequência: um dia conta quando a meta daquele dia foi batida. A sequência continua "viva" se a
-- última meta batida foi ontem (ainda dá tempo de bater a de hoje).
create or replace function public.minha_sequencia()
returns table (r_hoje int, r_meta int, r_atual int, r_recorde int, r_dias bigint, r_em_risco boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_hoje date := public.hoje_br(); v_meta int; v_qtd int := 0;
  v_run int := 0; v_rec int := 0; v_prev date; v_dias bigint := 0; r record;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  select coalesce(p.meta_diaria, 10) into v_meta from public.profiles p where p.id = v_uid;
  select coalesce(a.respondidas, 0) into v_qtd from public.atividade_diaria a where a.user_id = v_uid and a.dia = v_hoje;
  for r in select a.dia from public.atividade_diaria a
           where a.user_id = v_uid and a.respondidas >= case when a.dia = v_hoje then v_meta else a.meta end
           order by a.dia
  loop
    if v_prev is not null and r.dia = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
    v_rec := greatest(v_rec, v_run); v_prev := r.dia; v_dias := v_dias + 1;
  end loop;
  if v_prev is null or v_prev < v_hoje - 1 then v_run := 0; end if;
  return query select coalesce(v_qtd, 0), v_meta, v_run, v_rec, v_dias, (v_run > 0 and v_prev = v_hoje - 1);
end $$;

create or replace function public.definir_meta(p_meta int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if p_meta is null or p_meta < 1 or p_meta > 200 then raise exception 'Escolha uma meta entre 1 e 200 questões.'; end if;
  update public.profiles set meta_diaria = p_meta where id = auth.uid();
  update public.atividade_diaria set meta = p_meta where user_id = auth.uid() and dia = public.hoje_br();
end $$;

---------------------------------------------------------------
-- 2) Perfil: foto, capa, frase e objetivo
---------------------------------------------------------------
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists capa_path text;
alter table public.profiles add column if not exists frase text not null default '' check (char_length(frase) <= 140);
alter table public.profiles add column if not exists objetivo text not null default '' check (char_length(objetivo) <= 60);

-- A foto de perfil também aparece nos comentários (id, nome e foto; nada além disso)
create or replace view public.perfis_publicos as select id, nome, avatar_path from public.profiles;
grant select on public.perfis_publicos to authenticated;

create or replace function public.salvar_perfil(p_nome text, p_frase text, p_objetivo text, p_avatar text, p_capa text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pref text;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  v_pref := v_uid::text || '/';
  if p_avatar is not null and (left(p_avatar, length(v_pref)) <> v_pref or p_avatar like '%..%') then raise exception 'Imagem inválida.'; end if;
  if p_capa is not null and (left(p_capa, length(v_pref)) <> v_pref or p_capa like '%..%') then raise exception 'Imagem inválida.'; end if;
  update public.profiles set
    nome = coalesce(nullif(left(btrim(coalesce(p_nome,'')), 80), ''), nome),
    frase = left(btrim(coalesce(p_frase,'')), 140),
    objetivo = left(btrim(coalesce(p_objetivo,'')), 60),
    avatar_path = p_avatar, capa_path = p_capa
  where id = v_uid;
end $$;

-- Armazenamento das imagens: bucket público de leitura; cada aluno só escreve na própria pasta
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfis', 'perfis', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "perfis: enviar na propria pasta" on storage.objects;
create policy "perfis: enviar na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'perfis' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "perfis: atualizar propria pasta" on storage.objects;
create policy "perfis: atualizar propria pasta" on storage.objects for update to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "perfis: apagar propria pasta" on storage.objects;
create policy "perfis: apagar propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = auth.uid()::text);

do $$ declare f text; begin
  foreach f in array array['minha_sequencia()','definir_meta(int)','salvar_perfil(text,text,text,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
