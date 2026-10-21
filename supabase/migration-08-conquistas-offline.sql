-- DG QUESTÕES · parte 8: conquistas e medalhas da sequência de estudo + modo offline.
-- Rode DEPOIS do migration-07-feedback.sql.

---------------------------------------------------------------
-- 1) Respostas dadas offline não contam no ranking (o gabarito estava no aparelho)
---------------------------------------------------------------
alter table public.answers add column if not exists offline boolean not null default false;

create or replace function public.ranking(dias int default null)
returns table (user_id uuid, nome text, respondidas bigint, acertos bigint, pct numeric)
language sql stable security definer set search_path = public as $$
  select a.user_id, p.nome, count(*), count(*) filter (where a.correta),
         round(100.0 * count(*) filter (where a.correta) / count(*), 1)
  from public.answers a join public.profiles p on p.id = a.user_id
  where p.mostrar_ranking and not a.refeita and not a.offline
    and (dias is null or a.created_at >= now() - make_interval(days => dias))
  group by a.user_id, p.nome
  having count(*) >= 10
  order by 5 desc, 3 desc
  limit 50
$$;

---------------------------------------------------------------
-- 2) Cálculo da sequência reaproveitável (para qualquer usuário)
---------------------------------------------------------------
create or replace function public.calc_sequencia(p_user uuid)
returns table (r_hoje int, r_meta int, r_atual int, r_recorde int, r_dias bigint, r_em_risco boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_hoje date := public.hoje_br(); v_meta int; v_qtd int := 0;
  v_run int := 0; v_rec int := 0; v_prev date; v_dias bigint := 0; r record;
begin
  select coalesce(p.meta_diaria, 10) into v_meta from public.profiles p where p.id = p_user;
  select coalesce(a.respondidas, 0) into v_qtd from public.atividade_diaria a where a.user_id = p_user and a.dia = v_hoje;
  for r in select a.dia from public.atividade_diaria a
           where a.user_id = p_user and a.respondidas >= case when a.dia = v_hoje then v_meta else a.meta end
           order by a.dia
  loop
    if v_prev is not null and r.dia = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
    v_rec := greatest(v_rec, v_run); v_prev := r.dia; v_dias := v_dias + 1;
  end loop;
  if v_prev is null or v_prev < v_hoje - 1 then v_run := 0; end if;
  return query select coalesce(v_qtd, 0), coalesce(v_meta, 10), v_run, v_rec, v_dias, (v_run > 0 and v_prev = v_hoje - 1);
end $$;
revoke all on function public.calc_sequencia(uuid) from public, anon, authenticated;

create or replace function public.minha_sequencia()
returns table (r_hoje int, r_meta int, r_atual int, r_recorde int, r_dias bigint, r_em_risco boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  return query select * from public.calc_sequencia(auth.uid());
end $$;

---------------------------------------------------------------
-- 3) Conquistas e medalhas
---------------------------------------------------------------
create table if not exists public.conquistas_def (
  codigo text primary key,
  familia text not null check (familia in ('sequencia','dias','intenso')),
  limite int not null check (limite > 0),
  nivel text not null check (nivel in ('bronze','prata','ouro','diamante')),
  nome text not null,
  descricao text not null,
  ordem int not null
);
create table if not exists public.conquistas (
  user_id uuid not null references auth.users(id) on delete cascade,
  codigo text not null references public.conquistas_def(codigo) on delete cascade,
  desbloqueada_em timestamptz not null default now(),
  vista boolean not null default false,
  primary key (user_id, codigo)
);
alter table public.conquistas_def enable row level security;
alter table public.conquistas enable row level security;
drop policy if exists "conquistas_def: ler" on public.conquistas_def;
create policy "conquistas_def: ler" on public.conquistas_def for select to authenticated using (true);
drop policy if exists "conquistas: ler proprias" on public.conquistas;
create policy "conquistas: ler proprias" on public.conquistas for select to authenticated using (user_id = auth.uid());

insert into public.conquistas_def (codigo, familia, limite, nivel, nome, descricao, ordem) values
 ('seq_3',   'sequencia',   3, 'bronze',   'Recruta',      '3 dias seguidos batendo a meta',   1),
 ('seq_7',   'sequencia',   7, 'bronze',   'Soldado',      '7 dias seguidos batendo a meta',   2),
 ('seq_14',  'sequencia',  14, 'prata',    'Cabo',         '14 dias seguidos batendo a meta',  3),
 ('seq_30',  'sequencia',  30, 'prata',    'Sargento',     '30 dias seguidos batendo a meta',  4),
 ('seq_60',  'sequencia',  60, 'ouro',     'Subtenente',   '60 dias seguidos batendo a meta',  5),
 ('seq_100', 'sequencia', 100, 'ouro',     'Tenente',      '100 dias seguidos batendo a meta', 6),
 ('seq_180', 'sequencia', 180, 'diamante', 'Capitão',      '180 dias seguidos batendo a meta', 7),
 ('seq_365', 'sequencia', 365, 'diamante', 'Comandante',   '365 dias seguidos batendo a meta', 8),
 ('dias_10', 'dias',       10, 'bronze',   'Constante',    '10 dias com a meta batida (não precisam ser seguidos)', 20),
 ('dias_30', 'dias',       30, 'prata',    'Disciplinado', '30 dias com a meta batida (não precisam ser seguidos)', 21),
 ('dias_100','dias',      100, 'ouro',     'Inabalável',   '100 dias com a meta batida (não precisam ser seguidos)', 22),
 ('int_50',  'intenso',    50, 'prata',    'Plantão',      '50 questões respondidas em um único dia',  30),
 ('int_100', 'intenso',   100, 'ouro',     'Força-tarefa', '100 questões respondidas em um único dia', 31)
on conflict (codigo) do update set familia = excluded.familia, limite = excluded.limite, nivel = excluded.nivel,
  nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;

-- Desbloqueia o que o usuário já alcançou (as medalhas nunca são perdidas, mesmo que a sequência zere)
create or replace function public.verificar_conquistas(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record; v_max int;
begin
  select * into s from public.calc_sequencia(p_user);
  select coalesce(max(respondidas), 0) into v_max from public.atividade_diaria where user_id = p_user;
  insert into public.conquistas (user_id, codigo)
  select p_user, d.codigo from public.conquistas_def d
  where case d.familia when 'sequencia' then s.r_recorde >= d.limite
                       when 'dias' then s.r_dias >= d.limite
                       else v_max >= d.limite end
  on conflict do nothing;
end $$;
revoke all on function public.verificar_conquistas(uuid) from public, anon, authenticated;

-- Toda atividade registrada passa a checar as medalhas
create or replace function public.registrar_atividade(p_user uuid, p_dia date, p_resp int, p_acertos int) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.atividade_diaria (user_id, dia, respondidas, acertos, meta)
  values (p_user, p_dia, p_resp, p_acertos, coalesce((select meta_diaria from public.profiles where id = p_user), 10))
  on conflict (user_id, dia) do update set
    respondidas = public.atividade_diaria.respondidas + excluded.respondidas,
    acertos = public.atividade_diaria.acertos + excluded.acertos,
    meta = excluded.meta;
  perform public.verificar_conquistas(p_user);
end $$;

-- Medalhas ainda não mostradas ao aluno (devolve e marca como vistas)
create or replace function public.conquistas_novas()
returns table (c_codigo text, c_nome text, c_descricao text, c_nivel text, c_familia text, c_limite int)
language sql security definer set search_path = public as $$
  with up as (update public.conquistas c set vista = true where c.user_id = auth.uid() and not c.vista returning c.codigo)
  select d.codigo, d.nome, d.descricao, d.nivel, d.familia, d.limite
  from up join public.conquistas_def d on d.codigo = up.codigo order by d.ordem
$$;

-- Quem já tinha histórico recebe as medalhas já conquistadas, sem aviso de "nova"
select public.verificar_conquistas(x.user_id) from (select distinct user_id from public.atividade_diaria) x;
update public.conquistas set vista = true;

---------------------------------------------------------------
-- 4) Modo offline: pacote de questões e sincronização
---------------------------------------------------------------
-- Baixa questões ainda não respondidas, COM gabarito, para estudar sem internet (até 100 por vez)
create or replace function public.pacote_offline(p_materia text, p_assunto text, p_banca text, p_qtd int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ass text; r jsonb;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  p_qtd := least(greatest(coalesce(p_qtd, 25), 1), 100);
  v_ass := case when p_assunto = '__none__' then '' else nullif(p_assunto, '') end;
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into r from (
    select q.id, q.materia, q.assunto, q.banca, q.ano, q.orgao, q.cargo, q.tipo, q.enunciado, q.alternativas, k.correta, k.comentario
    from public.questions q join public.question_keys k on k.question_id = q.id
    where not exists (select 1 from public.answers a where a.user_id = v_uid and a.question_id = q.id)
      and not exists (select 1 from public.simulado_itens i join public.simulados s on s.id = i.simulado_id
                      where i.question_id = q.id and s.user_id = v_uid and s.finished_at is null
                        and now() < s.started_at + make_interval(secs => s.duracao_seg))
      and (nullif(p_materia,'') is null or q.materia = p_materia)
      and (nullif(p_banca,'') is null or q.banca = p_banca)
      and (v_ass is null and nullif(p_assunto,'') is null or q.assunto = v_ass)
    order by random() limit p_qtd) x;
  return r;
end $$;

-- Recebe as respostas dadas offline. O servidor refaz a correção (não confia no aparelho).
-- Valem para desempenho, meta, sequência e medalhas, mas não para o ranking.
create or replace function public.sincronizar_respostas(p jsonb)
returns table (r_ok int, r_ignoradas int)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); x jsonb; v_qid uuid; v_esc int; v_c int; v_n int; v_quando timestamptz;
  v_ok int := 0; v_ign int := 0; v_rc int; v_ref boolean;
begin
  if v_uid is null then raise exception 'Faça login.'; end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 500 then raise exception 'Lote inválido.'; end if;
  for x in select * from jsonb_array_elements(p) loop
    begin
      v_qid := (x->>'question_id')::uuid;
      v_esc := (x->>'escolha')::int;
      v_quando := least(now(), greatest(coalesce((x->>'quando')::timestamptz, now()), now() - interval '7 days'));
    exception when others then
      v_ign := v_ign + 1; continue;
    end;
    select k.correta into v_c from public.question_keys k where k.question_id = v_qid;
    if not found then v_ign := v_ign + 1; continue; end if;
    select jsonb_array_length(q.alternativas) into v_n from public.questions q where q.id = v_qid;
    if v_esc is null or v_esc < 0 or v_esc >= v_n then v_ign := v_ign + 1; continue; end if;
    if exists (select 1 from public.simulado_itens i join public.simulados s on s.id = i.simulado_id
               where i.question_id = v_qid and s.user_id = v_uid and s.finished_at is null
                 and now() < s.started_at + make_interval(secs => s.duracao_seg)) then
      v_ign := v_ign + 1; continue;
    end if;
    v_ref := exists (select 1 from public.refeitas r where r.user_id = v_uid and r.question_id = v_qid);
    insert into public.answers (user_id, question_id, escolha, correta, refeita, offline, created_at)
    values (v_uid, v_qid, v_esc, v_esc = v_c, v_ref, true, v_quando)
    on conflict (user_id, question_id) do nothing;
    get diagnostics v_rc = row_count;
    if v_rc = 0 then v_ign := v_ign + 1; continue; end if;
    perform public.registrar_atividade(v_uid, (v_quando at time zone 'America/Sao_Paulo')::date, 1, case when v_esc = v_c then 1 else 0 end);
    v_ok := v_ok + 1;
  end loop;
  return query select v_ok, v_ign;
end $$;

do $$ declare f text; begin
  foreach f in array array['conquistas_novas()','pacote_offline(text,text,text,int)','sincronizar_respostas(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;