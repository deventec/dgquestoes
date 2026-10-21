-- DG QUESTÕES · parte 4: assunto por questão e edição de questões publicadas.
-- Rode DEPOIS do migration-03-seguranca.sql. Pode ser rodado em banco que já tem questões.

---------------------------------------------------------------
-- 1) Assunto
---------------------------------------------------------------
alter table public.questions add column if not exists assunto text not null default '';
alter table public.questions add column if not exists updated_at timestamptz;
alter table public.questions add column if not exists updated_by uuid references auth.users(id) on delete set null;
create index if not exists questions_materia_assunto_idx on public.questions (materia, assunto);

-- Lista de assuntos que a equipe mantém (sugestões no cadastro). Questões antigas ficam com assunto vazio.
create table if not exists public.assuntos (
  materia text not null,
  nome text not null check (char_length(nome) between 1 and 120),
  primary key (materia, nome)
);
alter table public.assuntos enable row level security;
drop policy if exists "assuntos: ler" on public.assuntos;
create policy "assuntos: ler" on public.assuntos for select to authenticated using (true);
drop policy if exists "assuntos: equipe cria" on public.assuntos;
create policy "assuntos: equipe cria" on public.assuntos for insert to authenticated
  with check (public.my_role() in ('editor','admin'));

create or replace function public.norm_txt(t text) returns text
language sql immutable as $$ select left(btrim(regexp_replace(coalesce(t,''), '\s+', ' ', 'g')), 120) $$;

---------------------------------------------------------------
-- 2) Histórico de edições (cópia da versão anterior a cada alteração)
---------------------------------------------------------------
create table if not exists public.question_history (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  edited_by uuid references auth.users(id) on delete set null,
  edited_at timestamptz not null default now(),
  antes jsonb not null
);
alter table public.question_history enable row level security;
drop policy if exists "historico: admin le" on public.question_history;
create policy "historico: admin le" on public.question_history for select to authenticated using (public.my_role() = 'admin');

-- Toda alteração passa pela função editar_questao (que valida e guarda o histórico)
drop policy if exists "questoes: editar" on public.questions;

---------------------------------------------------------------
-- 3) Funções
---------------------------------------------------------------
-- Importação/cadastro agora com assunto (cria o assunto na lista se for novo)
create or replace function public.importar_questoes(p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.my_role(); x jsonb; v_id uuid; v_n int := 0; v_alts jsonb; v_cor int;
  v_tipo text; v_mat text; v_ass text;
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
    v_mat := coalesce(nullif(x->>'materia',''), 'Língua Portuguesa');
    v_ass := public.norm_txt(x->>'assunto');
    insert into public.questions (materia, banca, ano, orgao, cargo, assunto, tipo, enunciado, alternativas, created_by)
    values (v_mat, coalesce(nullif(x->>'banca',''),'Outra'),
            case when coalesce(x->>'ano','') ~ '^[0-9]{4}$' then (x->>'ano')::int end,
            coalesce(x->>'orgao',''), coalesce(x->>'cargo',''), v_ass, v_tipo, x->>'enunciado', v_alts, auth.uid())
    returning id into v_id;
    insert into public.question_keys (question_id, correta, comentario) values (v_id, v_cor, x->>'comentario');
    if v_ass <> '' then insert into public.assuntos values (v_mat, v_ass) on conflict do nothing; end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Devolve a questão completa, com gabarito, para a tela de edição (só editor/admin)
create or replace function public.obter_questao_edicao(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_role text := public.my_role(); r jsonb;
begin
  if v_role is null or v_role not in ('editor','admin') then raise exception 'Sem permissão.'; end if;
  select to_jsonb(q) || jsonb_build_object('correta', k.correta, 'comentario', k.comentario) into r
    from public.questions q join public.question_keys k on k.question_id = q.id where q.id = p_id;
  if r is null then raise exception 'Questão inexistente.'; end if;
  return r;
end $$;

-- Edita uma questão publicada. Editor e admin podem editar qualquer questão.
create or replace function public.editar_questao(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.my_role(); v_q record; v_k record; v_alts jsonb; v_cor int; v_tipo text;
  v_mat text; v_ass text; v_resp int;
begin
  if v_role is null or v_role not in ('editor','admin') then raise exception 'Sem permissão.'; end if;
  select * into v_q from public.questions where id = p_id for update;
  if not found then raise exception 'Questão inexistente.'; end if;
  select * into v_k from public.question_keys where question_id = p_id;

  v_alts := coalesce(p->'alternativas', p->'alts');
  if coalesce(p->>'enunciado','') = '' then raise exception 'Digite o enunciado.'; end if;
  if v_alts is null or jsonb_typeof(v_alts) <> 'array' then raise exception 'Alternativas inválidas.'; end if;
  if coalesce(p->>'correta','') !~ '^[0-9]+$' then raise exception 'Gabarito inválido.'; end if;
  v_cor := (p->>'correta')::int;
  v_tipo := case when p->>'tipo' = 'ce' then 'ce' else 'mc' end;
  if v_cor >= jsonb_array_length(v_alts) then raise exception 'Gabarito fora das alternativas.'; end if;
  if (v_tipo = 'ce' and jsonb_array_length(v_alts) <> 2)
     or (v_tipo = 'mc' and jsonb_array_length(v_alts) not between 2 and 5) then
    raise exception 'Número de alternativas inválido.';
  end if;

  select (select count(*) from public.answers where question_id = p_id)
       + (select count(*) from public.simulado_itens where question_id = p_id and escolha is not null) into v_resp;
  if v_resp > 0 and (v_tipo <> v_q.tipo or jsonb_array_length(v_alts) <> jsonb_array_length(v_q.alternativas)) then
    raise exception 'Alunos já responderam esta questão: não dá para mudar o tipo nem o número de alternativas. Edite os textos ou o gabarito.';
  end if;

  v_mat := coalesce(nullif(p->>'materia',''), v_q.materia);
  v_ass := public.norm_txt(p->>'assunto');

  insert into public.question_history (question_id, edited_by, antes)
  values (p_id, auth.uid(), to_jsonb(v_q) || jsonb_build_object('correta', v_k.correta, 'comentario', v_k.comentario));

  update public.questions set
    materia = v_mat, banca = coalesce(nullif(p->>'banca',''), v_q.banca),
    ano = case when coalesce(p->>'ano','') ~ '^[0-9]{4}$' then (p->>'ano')::int end,
    orgao = coalesce(p->>'orgao',''), cargo = coalesce(p->>'cargo',''), assunto = v_ass, tipo = v_tipo,
    enunciado = p->>'enunciado', alternativas = v_alts, updated_at = now(), updated_by = auth.uid()
  where id = p_id;
  update public.question_keys set correta = v_cor, comentario = p->>'comentario' where question_id = p_id;

  -- Gabarito mudou: reclassifica acertos/erros já gravados e refaz a nota dos simulados finalizados
  if v_cor is distinct from v_k.correta then
    update public.answers set correta = (escolha = v_cor) where question_id = p_id;
    update public.simulados s set acertos = (
        select count(*) from public.simulado_itens i join public.question_keys kk on kk.question_id = i.question_id
        where i.simulado_id = s.id and i.escolha = kk.correta)::int
    where s.finished_at is not null
      and exists (select 1 from public.simulado_itens i2 where i2.simulado_id = s.id and i2.question_id = p_id);
  end if;

  if v_ass <> '' then insert into public.assuntos values (v_mat, v_ass) on conflict do nothing; end if;
end $$;

-- Mapa de estudo: por assunto, quantas questões existem e como o aluno está indo
create or replace function public.resumo_assuntos(p_materia text default null)
returns table (r_materia text, r_assunto text, r_total bigint, r_respondidas bigint, r_acertos bigint)
language sql stable set search_path = public as $$
  select q.materia, q.assunto, count(*), count(a.question_id), count(*) filter (where a.correta)
  from public.questions q
  left join public.answers a on a.question_id = q.id and a.user_id = auth.uid()
  where p_materia is null or q.materia = p_materia
  group by q.materia, q.assunto
  order by q.materia, q.assunto
$$;

-- Gestão de assuntos (admin)
create or replace function public.renomear_assunto(p_materia text, p_antigo text, p_novo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_novo text := public.norm_txt(p_novo);
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Só o administrador pode renomear assuntos.'; end if;
  if v_novo = '' then raise exception 'Digite o novo nome.'; end if;
  update public.questions set assunto = v_novo where materia = p_materia and assunto = p_antigo;
  delete from public.assuntos where materia = p_materia and nome = p_antigo;
  insert into public.assuntos values (p_materia, v_novo) on conflict do nothing;
end $$;

create or replace function public.excluir_assunto(p_materia text, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Só o administrador pode excluir assuntos.'; end if;
  if exists (select 1 from public.questions where materia = p_materia and assunto = p_nome) then
    raise exception 'Há questões neste assunto. Mova-as para outro assunto antes de excluir.';
  end if;
  delete from public.assuntos where materia = p_materia and nome = p_nome;
end $$;

-- Simulado agora também filtra por assunto ('__none__' = questões sem assunto)
drop function if exists public.criar_simulado(text, text, int, int);
create or replace function public.criar_simulado(p_materia text, p_banca text, p_assunto text, p_qtd int, p_min int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_n int; v_titulo text; v_ass text;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  if exists (select 1 from public.simulados s where s.user_id = v_uid and s.finished_at is null
             and now() < s.started_at + make_interval(secs => s.duracao_seg)) then
    raise exception 'Você já tem um simulado em andamento. Finalize-o antes de começar outro.';
  end if;
  p_qtd := least(greatest(coalesce(p_qtd, 10), 1), 120);
  p_min := least(greatest(coalesce(p_min, 60), 1), 360);
  v_ass := case when p_assunto = '__none__' then '' else nullif(p_assunto, '') end;
  select count(*) into v_n from public.questions q
   where (nullif(p_materia,'') is null or q.materia = p_materia)
     and (nullif(p_banca,'') is null or q.banca = p_banca)
     and (v_ass is null and nullif(p_assunto,'') is null or q.assunto = v_ass);
  if v_n = 0 then raise exception 'Não há questões com esses filtros.'; end if;
  v_n := least(v_n, p_qtd);
  v_titulo := coalesce(nullif(p_materia,''), 'Todas as matérias')
              || case when p_assunto = '__none__' then ' · Sem assunto' else coalesce(' · ' || nullif(p_assunto,''), '') end
              || coalesce(' · ' || nullif(p_banca,''), '');
  insert into public.simulados (user_id, titulo, duracao_seg, total) values (v_uid, v_titulo, p_min * 60, v_n) returning id into v_id;
  insert into public.simulado_itens (simulado_id, question_id, ordem)
    select v_id, x.id, (row_number() over (order by random()))::int - 1
    from (select q.id from public.questions q
          where (nullif(p_materia,'') is null or q.materia = p_materia)
            and (nullif(p_banca,'') is null or q.banca = p_banca)
            and (v_ass is null and nullif(p_assunto,'') is null or q.assunto = v_ass)
          order by random() limit v_n) x;
  return v_id;
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'importar_questoes(jsonb)','obter_questao_edicao(uuid)','editar_questao(uuid,jsonb)','resumo_assuntos(text)',
    'renomear_assunto(text,text,text)','excluir_assunto(text,text)','criar_simulado(text,text,text,int,int)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
