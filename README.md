🛡️ DG QUESTÕES
Sua preparação para carreiras policiais começa aqui.

Plataforma de estudos com banco de questões, simulados, acompanhamento de desempenho e trilhas de aprendizagem para quem busca uma vaga nas carreiras policiais.

<p align="center">
<img src="https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js" alt="Next.js" />
<img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
<img src="https://img.shields.io/badge/TypeScript-Tipagem-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Vercel-Deploy-black?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

📌 Sumário
🎯 Sobre o projeto
👥 Perfis e permissões
🚀 Funcionalidades
🧠 Sistema de estudos
📊 Desempenho e gamificação
📴 Modo offline
🛡️ Segurança e moderação
💬 Feedback e suporte
🧰 Tecnologias utilizadas
⚙️ Instalação e configuração
🌐 Deploy
⚠️ Limitações conhecidas
🔐 Observações importantes
🎯 Sobre o projeto

O DG QUESTÕES é uma plataforma de estudos voltada para candidatos a concursos policiais, desenvolvida para centralizar a resolução de questões, a realização de simulados e o acompanhamento da evolução individual.

O projeto combina uma interface moderna com recursos de aprendizagem, gamificação e mecanismos de segurança no servidor.

Principais objetivos
📚 Facilitar a resolução e a organização de questões.
🎯 Identificar matérias e assuntos que precisam de mais atenção.
⏱️ Simular condições de prova com tempo controlado.
📈 Acompanhar o desempenho e a evolução dos estudos.
🏆 Incentivar a constância por meio de metas, sequências e conquistas.
📱 Permitir estudar mesmo sem conexão com a internet.
👥 Perfis e permissões

A plataforma utiliza três níveis de acesso:

Perfil	Permissões
🎓 Aluno	Responder questões, realizar simulados, acompanhar o desempenho e utilizar os recursos de estudo.
✍️ Editor	Cadastrar, importar e editar questões; excluir apenas as próprias questões.
🛡️ Administrador	Acesso administrativo, gerenciamento de usuários, moderação e gerenciamento do conteúdo.

O painel administrativo fica disponível em /painel e não é exibido aos alunos.

O acesso é controlado pelas verificações da aplicação e, principalmente, pelas políticas de segurança RLS (Row Level Security) do Supabase.

🚀 Funcionalidades
📚 Banco de questões
Filtros por matéria, assunto, banca e ano.
Busca textual no enunciado.
Correção após a confirmação da resposta.
Comentários explicativos do professor.
Comentários dos alunos liberados após responder à questão.
Marcação de alternativas por meio do recurso de riscar opções.
Histórico de respostas e acompanhamento de desempenho.
Denúncias de comentários e comunicação de problemas em questões.
⏱️ Simulados
Sorteio de questões no servidor.
Seleção por matéria, assunto e banca.
Tempo de prova configurável.
Cronômetro persistente mesmo após recarregar a página.
Gabarito liberado somente após a finalização.
Correção e cálculo da nota ao encerrar o simulado.
Recuperação e encerramento de simulados abandonados.
❌ Caderno de erros
Reúne questões erradas em questões comuns e simulados.
Permite refazer questões para reforçar o aprendizado.
Integra-se ao histórico e ao acompanhamento de desempenho.
Respostas refeitas continuam contribuindo para o desempenho e a meta diária, sem gerar pontuação adicional no ranking.
🏆 Ranking
Classificação por aproveitamento.
Períodos: últimos 7 dias, últimos 30 dias e geral.
Participação condicionada a, no mínimo, 10 questões elegíveis.
Cada questão conta uma única vez para a classificação.
Opção para ocultar o próprio nome.
🧠 Sistema de estudos
📖 Matérias e assuntos

Cada questão pode ser associada a uma matéria e a um assunto específico, como:

Direito Penal → Legítima defesa

Os assuntos podem ser utilizados nos filtros de questões e simulados. A plataforma também identifica assuntos que ainda precisam ser classificados.

O recurso Onde focar, na página de desempenho, ajuda o aluno a identificar os assuntos com resultados mais baixos.

🗺️ Trilhas de estudo

Disponíveis em /trilhas, organizam os estudos em sequências de assuntos direcionadas a diferentes carreiras.

Trilhas específicas por cargo.
Progresso individual em cada etapa.
Destaque para o próximo passo recomendado.
Publicação e organização pelo painel administrativo.
Etapas reordenáveis e possibilidade de incluir uma matéria inteira em um passo.

Critério de conclusão: pelo menos 10 questões respondidas com 70% de aproveitamento, ou todas as questões disponíveis quando houver menos de 10.

O arquivo seed-trilhas.sql contém três trilhas de exemplo para Polícia Federal (PF), Polícia Militar (PM) e Polícia Civil (PC). Elas devem ser ajustadas conforme o edital pretendido.

✍️ Edição e histórico de questões

O painel permite pesquisar questões publicadas, aplicar filtros, editar enunciados, alternativas, gabaritos, comentários e assuntos.

Editores e administradores podem editar qualquer questão.
A exclusão respeita as permissões do administrador e do autor.
Cada edição preserva a versão anterior em question_history.
O histórico permite consultar alterações e restaurar versões anteriores.
A restauração cria uma nova versão, permitindo desfazer a operação posteriormente.
Alterações no gabarito recalculam resultados e notas de simulados finalizados.
Mudanças incompatíveis no tipo ou na quantidade de alternativas são bloqueadas quando já existem respostas registradas.

Administradores também podem renomear assuntos, atualizando suas associações, e excluir assuntos sem questões vinculadas. Editores podem cadastrar novos assuntos.

📊 Desempenho e gamificação
🎯 Meta diária
Meta configurável de 5 a 200 questões.
Valor padrão de 10 questões por dia.
Indicador visual de progresso.
Contabilização de novas respostas, simulados e questões refeitas.
Apuração dos dias conforme o horário de Brasília.
🔥 Sequência de estudos

A sequência registra os dias em que a meta diária foi atingida.

Mantém a sequência ativa quando a última meta concluída foi ontem.
Avisa quando a sequência está em risco.
Exibe a sequência atual, o recorde pessoal e um calendário dos últimos 35 dias.
Aproveita o histórico anterior à implantação do recurso, considerando a meta de 10 questões.

Alterar a meta atual não modifica retroativamente os dias anteriores.

🏅 Medalhas e conquistas

O perfil conta com 13 medalhas distribuídas em três categorias:

Sequência de estudo: 3, 7, 14, 30, 60, 100, 180 e 365 dias.
Constância: 10, 30 e 100 dias com a meta atingida.
Dia intenso: 50 e 100 questões respondidas em um único dia.

As medalhas possuem níveis bronze, prata, ouro e diamante, conforme a configuração da conquista.

Uma medalha conquistada não é perdida quando a sequência é interrompida. Ao desbloquear uma nova conquista, o aluno recebe uma notificação na plataforma.

As definições são administradas pela tabela conquistas_def.

👤 Perfil personalizado

Disponível em /perfil, permite configurar:

Foto de perfil.
Imagem de capa.
Objetivo pessoal, como “Rumo à PF”.
Frase motivacional de até 140 caracteres.
Estatísticas de desempenho.
Calendário de estudos e sequência atual.
Coleção de medalhas conquistadas.

As imagens são processadas no navegador e armazenadas no Supabase Storage. A foto também aparece junto ao nome do aluno nos comentários.

📴 Modo offline

Disponível em /offline, permite continuar estudando mesmo sem conexão.

Recursos disponíveis
Instalação da aplicação como um aplicativo web.
Abertura de uma página de reserva sem internet.
Download de pacotes com até 100 questões ainda não respondidas.
Seleção de questões por matéria, assunto e banca.
Armazenamento local das respostas pendentes.
Sincronização automática quando a conexão retorna.
Opção para sincronizar manualmente.

As respostas são corrigidas novamente pelo servidor durante a sincronização.

Regras do modo offline
Respostas offline contam para o desempenho, a meta diária, a sequência e as medalhas.
Essas respostas não contam para o ranking.
Simulados, comentários, ranking e envio de feedback exigem conexão.
As datas das respostas dependem do relógio do aparelho e são aceitas com limite de até sete dias para trás.
O pacote precisa ser baixado enquanto houver conexão.
A página do modo offline deve ser aberta ao menos uma vez online para que o navegador armazene os recursos necessários.

O service worker é ativado em produção, por meio de npm run build && npm start, ou no ambiente de deploy.

🛡️ Segurança e moderação

A plataforma utiliza políticas de acesso no banco de dados e funções específicas para proteger operações sensíveis.

🔒 Correção no servidor

O gabarito e o comentário do professor são armazenados na tabela question_keys, protegida contra leitura direta pelo navegador.

A correção é disponibilizada por meio das funções do banco após o registro da resposta ou a finalização do simulado.

As operações de resposta, simulado e marcação passam por funções que verificam autenticação, tempo e propriedade dos registros. O sorteio de questões dos simulados também ocorre no servidor.

Outras proteções incluem:

Bloqueio de respostas após o tempo permitido.
Encerramento e correção de simulados abandonados na próxima abertura.
Impedimento de responder, na tela comum de questões, uma questão que esteja em um simulado em andamento.
Controle de acesso por perfil e políticas RLS.
Separação dos arquivos privados de feedback e dos arquivos de perfil.
🚩 Denúncias de comentários

Qualquer aluno pode denunciar o comentário de outro aluno, informando um motivo e um detalhe opcional, respeitando o limite de uma denúncia por pessoa e comentário.

Quando um comentário acumula três denúncias abertas de pessoas diferentes, ele deixa de ser exibido aos demais alunos. O autor e o administrador continuam podendo visualizá-lo, identificado como “em análise”.

O administrador decide, pelo painel, se o comentário deve ser mantido ou excluído.

💬 Feedback e suporte

O DG QUESTÕES possui um canal interno para sugestões, dúvidas, elogios e comunicação de problemas.

Para alunos
Botão flutuante de feedback disponível nas telas.
Página de Feedback no menu.
Categorias: sugestão, problema, elogio, dúvida e outro.
Mensagem, avaliação de 1 a 5 e anexo opcional de captura de tela.
Registro automático da página em que o feedback foi enviado.
Opção para reportar problemas específicos em questões.
Limite de cinco envios por hora por aluno.
Para administradores

Disponível em /painel/feedback.

Caixa de entrada com filtros por tipo e status.
Visualização do nome, e-mail, página de origem, avaliação e anexo.
Estados: novo, em análise, resolvido e arquivado.
Anotações internas.
Resposta direta ao aluno.
Atalhos para editar questões e consultar seu histórico.
Indicador de novas mensagens no menu.
Privacidade do feedback

Cada mensagem pode ser lida apenas pelo aluno responsável e pelo administrador. Os anexos ficam em um bucket privado do Supabase Storage e são acessados por links temporários.

Importante: as notificações são internas à plataforma. Para receber alertas por e-mail, configure um Database Webhook na tabela feedback, direcionando-o a uma Edge Function integrada a um serviço de envio, como Resend ou SendGrid.

🧰 Tecnologias utilizadas
Tecnologia	Finalidade
Next.js	Aplicação web com App Router
React	Interface de usuário
TypeScript	Tipagem estática
Supabase	Banco de dados, autenticação, autorização e armazenamento
PostgreSQL	Persistência de dados e funções do banco
Supabase RLS	Controle de acesso aos registros
Supabase Storage	Armazenamento de imagens e anexos
Vercel	Hospedagem e deploy
⚙️ Instalação e configuração
📋 Pré-requisitos
Node.js e npm instalados.
Conta gratuita no Supabase.
Projeto clonado ou baixado para sua máquina.
Conta na Vercel para publicar a aplicação, se desejado.
1. Crie um projeto no Supabase

Acesse supabase.com e crie um projeto.

2. Configure o banco de dados

No SQL Editor do Supabase, execute os arquivos abaixo, rigorosamente nesta ordem:

Ordem	Arquivo	Finalidade
1	supabase/schema.sql	Estrutura inicial do banco
2	supabase/migration-02-recursos.sql	Comentários, simulados e ranking
3	supabase/migration-03-seguranca.sql	Correção no servidor e denúncias
4	supabase/migration-04-assuntos-edicao.sql	Assuntos e edição de questões
5	supabase/migration-05-historico-trilhas.sql	Histórico, trilhas e filtros
6	supabase/migration-06-meta-perfil.sql	Meta diária, sequência e perfil
7	supabase/migration-07-feedback.sql	Feedback para o administrador
8	supabase/migration-08-conquistas-offline.sql	Medalhas e modo offline

Opcionalmente, execute supabase/seed.sql para inserir dados de exemplo.

Se desejar utilizar as trilhas de exemplo, configure também o arquivo seed-trilhas.sql, conforme a estrutura do projeto.

3. Configure as URLs de autenticação

No painel do Supabase, acesse:

Authentication → URL Configuration

Configure:

Site URL: URL principal da aplicação.
Redirect URLs: URL de produção e http://localhost:3000 para desenvolvimento, incluindo os caminhos necessários para login e recuperação de senha, como /login e /redefinir-senha.

Ajuste os endereços conforme o fluxo de autenticação implementado no projeto.

4. Configure as variáveis de ambiente

Copie o arquivo de exemplo:

cp .env.example .env.local


Preencha .env.local com as chaves do projeto disponíveis em Project Settings → API.

Utilize os nomes de variáveis definidos no próprio .env.example.

Nunca publique credenciais privadas no repositório.

5. Instale as dependências
npm install

6. Inicie o ambiente de desenvolvimento
npm run dev


Abra a aplicação em:

http://localhost:3000

7. Crie seu usuário administrador
Cadastre-se pela aplicação.
Confirme o e-mail, se necessário.
No SQL Editor do Supabase, execute o comando abaixo, substituindo o e-mail pelo da sua conta:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'seu@email.com';


Execute esse comando somente para a conta que deve receber privilégios administrativos.

🌐 Deploy

A aplicação pode ser publicada na Vercel.

Passo a passo
Envie o código para um repositório no GitHub.
Acesse vercel.com.
Importe o repositório.
Configure as três variáveis de ambiente utilizadas pelo projeto, conforme .env.example.
Execute o deploy.
Configure a URL de produção no Supabase, incluindo os endereços de redirecionamento de autenticação.
Teste login, recuperação de senha, permissões, simulados e demais funcionalidades.
📧 Configuração de e-mail

Para confirmação de cadastro e recuperação de senha em produção, configure um servidor SMTP próprio em:

Supabase → Authentication → SMTP Settings

O serviço de e-mail padrão pode possuir limites de envio que não atendem às necessidades de produção.

⚠️ Limitações conhecidas
Moderação: não existe moderação automática de conteúdo. A plataforma utiliza a regra de denúncias e a decisão do administrador.
Questões conhecidas: um aluno que já respondeu a uma questão pode conhecer seu gabarito. Portanto, simulados com questões previamente respondidas não representam necessariamente conhecimento novo.
Ranking offline: respostas registradas offline não participam do ranking.
Recursos sem conexão: simulados, comentários, ranking e envio de feedback exigem internet.
Data offline: o registro utiliza o relógio do dispositivo, com aceitação limitada a sete dias para trás.
🔐 Observações importantes
Proteção de credenciais

A variável SUPABASE_SERVICE_ROLE_KEY concede privilégios elevados no Supabase.

Utilize-a somente em código executado no servidor, quando realmente necessária.
Nunca a exponha em componentes executados no navegador.
Nunca utilize o prefixo NEXT_PUBLIC_ nessa chave.
Não a envie ao GitHub nem a inclua em arquivos públicos.
Direitos autorais

Questões de concursos podem estar protegidas por direitos autorais. Utilize questões autorais, materiais de professores parceiros ou conteúdos de fontes devidamente licenciadas.

O cadastro e a importação de questões em JSON pelo painel permitem organizar o acervo de acordo com as permissões de uso aplicáveis.

<p align="center">
<strong>🛡️ DG QUESTÕES</strong>
<br />
<em>Disciplina, constância e preparação para a aprovação.</em>
</p>
