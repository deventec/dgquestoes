-- Questões de exemplo escritas para o projeto (não são de provas reais).
-- Rode DEPOIS do migration-03-seguranca.sql.
create temp table _seed (materia text, banca text, ano int, orgao text, cargo text, tipo text,
  enunciado text, alternativas jsonb, correta int, comentario text);
insert into _seed values
('Direito Penal','Cebraspe',2024,'PF','Agente','ce','(Exemplo) A legítima defesa exclui a ilicitude do fato, desde que presentes seus requisitos legais, entre eles a moderação no uso dos meios necessários.','["Certo","Errado"]',0,'Correto. Art. 25 do Código Penal.'),
('Direito Penal','FGV',2023,'PC','Investigador','mc','(Exemplo) A tentativa ocorre quando:','["o agente desiste voluntariamente de prosseguir","a execução é iniciada, mas não se consuma por circunstâncias alheias à vontade do agente","o agente repara o dano até o recebimento da denúncia","o resultado é diverso do pretendido","o crime é praticado em coautoria"]',1,'Art. 14, II, do CP.'),
('Direito Processual Penal','Vunesp',2023,'PM','Oficial','mc','(Exemplo) Estando o indiciado preso, o prazo para conclusão do inquérito policial no CPP é de:','["5 dias","10 dias","15 dias","30 dias","60 dias"]',1,'Art. 10 do CPP: 10 dias se preso; 30 dias se solto.'),
('Direito Constitucional','Cebraspe',2024,'PRF','Policial','ce','(Exemplo) Compete à Polícia Rodoviária Federal o patrulhamento ostensivo das rodovias federais.','["Certo","Errado"]',0,'Art. 144, § 2º, da CF/88.'),
('Informática','Instituto AOCP',2022,'PM','Soldado','mc','(Exemplo) No Windows, qual atalho copia o item selecionado?','["Ctrl + V","Ctrl + X","Ctrl + C","Ctrl + Z","Ctrl + P"]',2,'Ctrl + C copia; Ctrl + V cola; Ctrl + X recorta.'),
('Raciocínio Lógico','FGV',2024,'PC','Investigador','mc','(Exemplo) A negação de "Todo policial é atleta" é:','["Nenhum policial é atleta","Algum policial não é atleta","Todo policial não é atleta","Algum atleta é policial","Todo atleta é policial"]',1,'A negação de "Todo A é B" é "Algum A não é B".');

with ins as (
  insert into public.questions (materia,banca,ano,orgao,cargo,tipo,enunciado,alternativas)
  select materia,banca,ano,orgao,cargo,tipo,enunciado,alternativas from _seed
  returning id, enunciado
)
insert into public.question_keys (question_id, correta, comentario)
select ins.id, s.correta, s.comentario from ins join _seed s on s.enunciado = ins.enunciado;
