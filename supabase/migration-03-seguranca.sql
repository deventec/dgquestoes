-- DG QUESTÕES · parte 3: correção no servidor e denúncia de comentários.
-- Rode DEPOIS do schema.sql e do migration-02-recursos.sql.
-- Funciona também em bancos que já têm questões: os gabaritos são copiados antes de serem removidos.

---------------------------------------------------------------
-- 1) Gabarito separado da questão (o aluno nunca lê esta tabela)
---------------------------------------------------------------
create table if not exists public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correta int not null,
  comentario text
);
alter table public.question_keys enable row level security;  -- sem policies: nenhum acesso direto pelo navegador

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='questions' and column_name='correta') then
    insert into public.question_keys (question_id, correta, comentario)
      select id, correta, comentario from public.questions on conflict do nothing;
    alter table public.questions drop column correta;
    alter table public.questions drop column comentario;
  end if;
end $$;

-- Questões refeitas no caderno de erros (não contam no ranking)
create table if not exists public.refeitas (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  primary key (user_id, question_id)
);
alter table public.refeitas enable row level security;
alter table public.answers add column if not exists refeita boolean not null default false;

---------------------------------------------------------------
-- 2) O navegador deixa de gravar respostas e simulados direto
---------------------------------------------------------------
drop policy if exists "respostas: proprias" on public.answers;
create policy "respostas: ler proprias" on public.answers for select to authenticated using (user_id = auth.uid());

drop policy if exists "simulados: proprios" on public.simulados;
create policy "simulados: ler proprios" on public.simulados for select to authenticated using (user_id = auth.uid());

drop policy if exists "itens: criar" on public.simulado_itens;
drop policy if exists "itens: marcar enquanto aberto" on public.simulado_itens;
drop policy if exists "itens: excluir" on public.simulado_itens;

drop policy if exists "questoes: inserir" on public.questions;  -- cadastro agora é pela função importar_questoes

-- O ranking passa a ignorar questões refeitas
create or replace function public.ranking(dias int default null)
returns table (user_id uuid, nome text, respondidas bigint, acertos bigint, pct numeric)
language sql stable security definer set search_path = public as $$
  select a.user_id, p.nome, count(*), count(*) filter (where a.correta),
         round(100.0 * count(*) filter (where a.correta) / count(*), 1)
  from public.answers a join public.profiles p on p.id = a.user_id
  where p.mostrar_ranking and not a.refeita
    and (dias is null or a.created_at >= now() - make_interval(days => dias))
  group by a.user_id, p.nome
  having count(*) >= 10
  order by 5 desc, 3 desc
  limit 50
$$;

---------------------------------------------------------------
-- 3) Funções do servidor
---------------------------------------------------------------
-- Cadastro/importação de questões (editor ou admin). Aceita um array JSON.
create or replace function public.importar_questoes(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.my_role(); x jsonb; v_id uuid; v_n int := 0; v_alts jsonb; v_cor int; v_tipo text;
begin
  if v_role is null or v_role not in ('editor','admin') then raise exception 'Sem permissão.'; end if;
  if jsonb_typeof(p) <> 'array' then raise exception 'Envie uma lista de questões.'; end if;
  for x in select * from jsonb_array_elements(p) loop
    v_alts := coalesce(x->'alternativas', x->'alts');
    continue when coalesce(x->>'enunciado','') = '' or v_alts is null or jsonb_typeof(v_alts) <> 'array';
    continue when coalesce(x->>'correta','') !~ '^[0-9]+$';
    v_cor := (x->>'correta')::int;
    v_tipo := case when x->>'tipo' = 'ce' then 'ce' else 'mc' end;
    continue when v_cor >= jsonb_array_length(v_alts);
    continue when (v_tipo = 'ce' and jsonb_array_length(v_alts) <> 2)
               or (v_tipo = 'mc' and jsonb_array_length(v_alts) not between 2 and 5);
    insert into public.questions (materia, banca, ano, orgao, cargo, tipo, enunciado, alternativas, created_by)
    values (coalesce(nullif(x->>'materia',''),'Língua Portuguesa'), coalesce(nullif(x->>'banca',''),'Outra'),
            case when coalesce(x->>'ano','') ~ '^[0-9]{4}$' then (x->>'ano')::int end,
            coalesce(x->>'orgao',''), coalesce(x->>'cargo',''), v_tipo, x->>'enunciado', v_alts, auth.uid())
    returning id into v_id;
    insert into public.question_keys (question_id, correta, comentario) values (v_id, v_cor, x->>'comentario');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Responde uma questão e devolve o gabarito (só depois de gravar a resposta). Uma resposta por questão.
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
  return query select (p_escolha = v_c), v_c, v_t, p_escolha;
end $$;

-- Gabarito das questões que o aluno já respondeu (para reexibir ao recarregar a página)
create or replace function public.gabaritos(p_ids uuid[])
returns table (q_id uuid, g_correta int, g_comentario text)
language sql stable security definer set search_path = public as $$
  select k.question_id, k.correta, k.comentario from public.question_keys k
  where k.question_id = any(p_ids)
    and exists (select 1 from public.answers a where a.user_id = auth.uid() and a.question_id = k.question_id)
$$;

-- Libera uma questão errada para nova tentativa (a nova resposta não conta no ranking)
create or replace function public.refazer_questao(p_question uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  if not exists (select 1 from public.answers a where a.user_id = v_uid and a.question_id = p_question and not a.correta) then return; end if;
  insert into public.refeitas values (v_uid, p_question) on conflict do nothing;
  delete from public.answers where user_id = v_uid and question_id = p_question;
end $$;

create or replace function public.zerar_historico() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  insert into public.refeitas select user_id, question_id from public.answers where user_id = v_uid on conflict do nothing;
  delete from public.answers where user_id = v_uid;
end $$;

-- Cria o simulado sorteando as questões no servidor
create or replace function public.criar_simulado(p_materia text, p_banca text, p_qtd int, p_min int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_n int; v_titulo text;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  if exists (select 1 from public.simulados s where s.user_id = v_uid and s.finished_at is null
             and now() < s.started_at + make_interval(secs => s.duracao_seg)) then
    raise exception 'Você já tem um simulado em andamento. Finalize-o antes de começar outro.';
  end if;
  p_qtd := least(greatest(coalesce(p_qtd, 10), 1), 120);
  p_min := least(greatest(coalesce(p_min, 60), 1), 360);
  select count(*) into v_n from public.questions q
   where (nullif(p_materia,'') is null or q.materia = p_materia) and (nullif(p_banca,'') is null or q.banca = p_banca);
  if v_n = 0 then raise exception 'Não há questões com esses filtros.'; end if;
  v_n := least(v_n, p_qtd);
  v_titulo := coalesce(nullif(p_materia,''), 'Todas as matérias') || coalesce(' · ' || nullif(p_banca,''), '');
  insert into public.simulados (user_id, titulo, duracao_seg, total) values (v_uid, v_titulo, p_min * 60, v_n) returning id into v_id;
  insert into public.simulado_itens (simulado_id, question_id, ordem)
    select v_id, x.id, (row_number() over (order by random()))::int - 1
    from (select q.id from public.questions q
          where (nullif(p_materia,'') is null or q.materia = p_materia) and (nullif(p_banca,'') is null or q.banca = p_banca)
          order by random() limit v_n) x;
  return v_id;
end $$;

-- Marca/troca a alternativa de um item, só enquanto o tempo não acabou
create or replace function public.marcar_item(p_simulado uuid, p_question uuid, p_escolha int) returns void
language plpgsql security definer set search_path = public as $$
declare v_s record; v_n int;
begin
  select * into v_s from public.simulados s where s.id = p_simulado and s.user_id = auth.uid();
  if not found then raise exception 'Simulado inexistente.'; end if;
  if v_s.finished_at is not null or now() > v_s.started_at + make_interval(secs => v_s.duracao_seg + 5) then
    raise exception 'O tempo deste simulado acabou.';
  end if;
  select jsonb_array_length(q.alternativas) into v_n from public.questions q where q.id = p_question;
  if p_escolha is not null and (p_escolha < 0 or p_escolha >= v_n) then raise exception 'Alternativa inválida.'; end if;
  update public.simulado_itens set escolha = p_escolha where simulado_id = p_simulado and question_id = p_question;
end $$;

-- Corrige no servidor, grava o resultado e passa as respostas para o histórico
create or replace function public.finalizar_simulado(p_simulado uuid)
returns table (r_acertos int, r_total int)
language plpgsql security definer set search_path = public as $$
declare v_s record; v_ac int; v_fim timestamptz;
begin
  select * into v_s from public.simulados s where s.id = p_simulado and s.user_id = auth.uid() for update;
  if not found then raise exception 'Simulado inexistente.'; end if;
  if v_s.finished_at is not null then return query select v_s.acertos, v_s.total; return; end if;
  v_fim := least(now(), v_s.started_at + make_interval(secs => v_s.duracao_seg));
  select count(*) into v_ac from public.simulado_itens i join public.question_keys k on k.question_id = i.question_id
   where i.simulado_id = p_simulado and i.escolha = k.correta;
  update public.simulados set finished_at = v_fim, acertos = v_ac where id = p_simulado;
  insert into public.answers (user_id, question_id, escolha, correta, refeita, created_at)
    select v_s.user_id, i.question_id, i.escolha, i.escolha = k.correta,
           exists (select 1 from public.refeitas r where r.user_id = v_s.user_id and r.question_id = i.question_id), v_fim
    from public.simulado_itens i join public.question_keys k on k.question_id = i.question_id
    where i.simulado_id = p_simulado and i.escolha is not null
  on conflict (user_id, question_id) do nothing;
  return query select v_ac, v_s.total;
end $$;

-- Gabarito do simulado: só depois de finalizado
create or replace function public.gabarito_simulado(p_simulado uuid)
returns table (q_id uuid, g_correta int, g_comentario text)
language sql stable security definer set search_path = public as $$
  select k.question_id, k.correta, k.comentario
  from public.simulado_itens i
  join public.simulados s on s.id = i.simulado_id
  join public.question_keys k on k.question_id = i.question_id
  where i.simulado_id = p_simulado and s.user_id = auth.uid() and s.finished_at is not null
$$;

do $$ declare f text; begin
  foreach f in array array[
    'importar_questoes(jsonb)','responder_questao(uuid,int)','gabaritos(uuid[])','refazer_questao(uuid)',
    'zerar_historico()','criar_simulado(text,text,int,int)','marcar_item(uuid,uuid,int)',
    'finalizar_simulado(uuid)','gabarito_simulado(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

---------------------------------------------------------------
-- 4) Denúncia de comentários
---------------------------------------------------------------
alter table public.comments add column if not exists oculto boolean not null default false;

drop policy if exists "comentarios: ler" on public.comments;
create policy "comentarios: ler" on public.comments for select to authenticated
  using (not oculto or user_id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "comentarios: admin atualiza" on public.comments;
create policy "comentarios: admin atualiza" on public.comments for update to authenticated
  using (public.my_role() = 'admin');

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  motivo text not null check (motivo in ('ofensivo','spam','enganoso','outro')),
  detalhe text check (char_length(detalhe) <= 300),
  status text not null default 'aberta' check (status in ('aberta','resolvida')),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter)
);
alter table public.comment_reports enable row level security;
create policy "denuncias: criar" on public.comment_reports for insert to authenticated
  with check (reporter = auth.uid()
    and exists (select 1 from public.comments c where c.id = comment_id and c.user_id <> auth.uid()));
create policy "denuncias: admin le" on public.comment_reports for select to authenticated using (public.my_role() = 'admin');
create policy "denuncias: admin resolve" on public.comment_reports for update to authenticated using (public.my_role() = 'admin');
create policy "denuncias: admin exclui" on public.comment_reports for delete to authenticated using (public.my_role() = 'admin');

-- Com 3 denúncias abertas de pessoas diferentes, o comentário fica oculto até o admin decidir
create or replace function public.trg_denuncia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comment_reports r where r.comment_id = new.comment_id and r.status = 'aberta') >= 3 then
    update public.comments set oculto = true where id = new.comment_id;
  end if;
  return new;
end $$;
drop trigger if exists on_comment_report on public.comment_reports;
create trigger on_comment_report after insert on public.comment_reports
  for each row execute function public.trg_denuncia();
