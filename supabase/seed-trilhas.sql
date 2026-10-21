-- Trilhas de exemplo. Rode DEPOIS do migration-05. São SUGESTÕES de ordem de estudo, escritas para o projeto:
-- ajuste cada trilha ao edital do concurso que você quer cobrir (Painel > Trilhas de estudo).
create temp table _t (trilha text, ordem int, materia text, assunto text);
insert into _t values
('Agente de Polícia Federal',0,'Língua Portuguesa','Interpretação de texto'),
('Agente de Polícia Federal',1,'Raciocínio Lógico','Lógica proposicional'),
('Agente de Polícia Federal',2,'Direito Constitucional','Segurança pública (art. 144)'),
('Agente de Polícia Federal',3,'Direito Penal','Teoria do crime'),
('Agente de Polícia Federal',4,'Direito Processual Penal','Inquérito policial'),
('Agente de Polícia Federal',5,'Direito Administrativo','Poder de polícia'),
('Agente de Polícia Federal',6,'Legislação Especial','Lei de drogas'),
('Agente de Polícia Federal',7,'Informática','Segurança da informação'),
('Agente de Polícia Federal',8,'Direitos Humanos','Sistema interamericano'),
('Policial Militar (Soldado)',0,'Língua Portuguesa','Interpretação de texto'),
('Policial Militar (Soldado)',1,'Raciocínio Lógico','Lógica proposicional'),
('Policial Militar (Soldado)',2,'Direito Constitucional','Segurança pública (art. 144)'),
('Policial Militar (Soldado)',3,'Direito Penal','Teoria do crime'),
('Policial Militar (Soldado)',4,'Direitos Humanos','Sistema interamericano'),
('Policial Militar (Soldado)',5,'Atualidades','Segurança pública e sociedade'),
('Investigador de Polícia Civil',0,'Língua Portuguesa','Interpretação de texto'),
('Investigador de Polícia Civil',1,'Direito Constitucional','Segurança pública (art. 144)'),
('Investigador de Polícia Civil',2,'Direito Penal','Teoria do crime'),
('Investigador de Polícia Civil',3,'Direito Processual Penal','Inquérito policial'),
('Investigador de Polícia Civil',4,'Legislação Especial','Lei de drogas'),
('Investigador de Polícia Civil',5,'Criminologia','Teorias criminológicas'),
('Investigador de Polícia Civil',6,'Informática','Segurança da informação');

insert into public.assuntos (materia, nome) select distinct materia, assunto from _t on conflict do nothing;

with nt as (
  insert into public.trilhas (nome, cargo, descricao) values
   ('Agente de Polícia Federal','PF','Sugestão de ordem de estudo. Ajuste ao edital.'),
   ('Policial Militar (Soldado)','PM','Sugestão de ordem de estudo. Ajuste ao edital.'),
   ('Investigador de Polícia Civil','PC','Sugestão de ordem de estudo. Ajuste ao edital.')
  returning id, nome)
insert into public.trilha_itens (trilha_id, ordem, materia, assunto)
select nt.id, t.ordem, t.materia, t.assunto from _t t join nt on nt.nome = t.trilha;

-- Classifica as 6 questões de exemplo do seed.sql (se você as importou)
update public.questions set assunto = 'Teoria do crime' where enunciado like '(Exemplo) A legítima defesa%' or enunciado like '(Exemplo) A tentativa%';
update public.questions set assunto = 'Inquérito policial' where enunciado like '(Exemplo) Estando o indiciado preso%';
update public.questions set assunto = 'Segurança pública (art. 144)' where enunciado like '(Exemplo) Compete à Polícia Rodoviária%';
update public.questions set assunto = 'Noções de sistema operacional' where enunciado like '(Exemplo) No Windows%';
update public.questions set assunto = 'Lógica proposicional' where enunciado like '(Exemplo) A negação%';
