🛡️ DG QUESTÕES
Sua preparação para carreiras policiais começa aqui.

Plataforma de estudos com banco de questões, simulados, trilhas de aprendizagem e acompanhamento de desempenho para candidatos a concursos policiais.

<p align="center">
<img src="https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
<img src="https://img.shields.io/badge/TypeScript-Tipagem-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Vercel-Deploy-black?style=for-the-badge&logo=vercel" alt="Vercel">
</p>

📌 Sobre o projeto

O DG QUESTÕES é uma plataforma voltada para candidatos a carreiras policiais, desenvolvida para tornar a preparação mais organizada, estratégica e eficiente.

A aplicação reúne recursos para resolução de questões, simulados cronometrados, revisão de erros, trilhas de estudo, acompanhamento de desempenho e gamificação.

✨ Principais destaques
📚 Banco de questões com filtros avançados.
⏱️ Simulados com cronômetro e correção automática.
❌ Caderno de erros para reforçar o aprendizado.
📊 Estatísticas e ranking de desempenho.
🎯 Metas diárias e sequências de estudo.
🏅 Medalhas e sistema de conquistas.
🧠 Trilhas de estudo por carreira.
📴 Modo offline com sincronização de respostas.
👤 Perfil personalizado.
🛡️ Painel administrativo com controle de permissões.
🧰 Tecnologias utilizadas
Tecnologia	Descrição
Next.js	Framework web com App Router
React	Construção da interface
TypeScript	Tipagem estática
Supabase	Backend, autenticação e banco de dados
PostgreSQL	Banco de dados relacional
Supabase RLS	Controle de acesso aos dados
Supabase Storage	Armazenamento de imagens e anexos
Vercel	Hospedagem e deploy
👥 Perfis e permissões
Perfil	Permissões
🎓 Aluno	Responde questões, realiza simulados e acompanha seu desempenho.
✍️ Editor	Cadastra, importa e edita questões; exclui apenas as próprias.
🛡️ Administrador	Gerencia usuários, questões, feedbacks, denúncias e configurações administrativas.

O painel administrativo fica disponível em /painel e não é exibido aos alunos. O controle de acesso utiliza verificações na aplicação e políticas RLS no Supabase.

🚀 Funcionalidades
📚 Banco de questões
Filtros por matéria, assunto, banca e ano.
Busca textual no enunciado.
Confirmação de resposta antes da correção.
Comentários explicativos do professor.
Comentários dos alunos liberados após responder.
Recurso para riscar alternativas.
Histórico de respostas.
Denúncias de comentários e problemas nas questões.
⏱️ Simulados
Sorteio de questões realizado no servidor.
Seleção por matéria, assunto e banca.
Tempo configurável.
Cronômetro persistente após recarregar a página.
Gabarito liberado somente ao finalizar.
Correção automática e cálculo da nota.
Recuperação de simulados abandonados.
❌ Caderno de erros
Reúne questões erradas em exercícios e simulados.
Permite refazer questões.
Integra-se ao histórico e ao desempenho.
Respostas refeitas não geram pontuação adicional no ranking.
📊 Ranking
Classificação por aproveitamento.
Períodos de 7 dias, 30 dias e geral.
Mínimo de 10 questões elegíveis.
Cada questão conta uma única vez.
Opção para ocultar o nome do aluno.
🧠 Sistema de estudos
📖 Matérias e assuntos

As questões podem ser organizadas por matéria e assunto, permitindo uma preparação mais direcionada.

Exemplo:

Direito Penal → Legítima defesa

Os filtros consideram os assuntos disponíveis para a matéria e, quando selecionada, para a banca. A seção Onde focar, no desempenho, ajuda a identificar os assuntos que precisam de mais atenção.

🗺️ Trilhas de estudo

Disponíveis em /trilhas, organizam a preparação em etapas por carreira.

Trilhas por cargo.
Progresso individual por etapa.
Destaque para o próximo passo.
Etapas reordenáveis.
Gerenciamento e publicação pelo painel administrativo.

Critério de conclusão: pelo menos 10 questões respondidas com 70% de aproveitamento, ou todas as questões disponíveis quando houver menos de 10.

O arquivo seed-trilhas.sql contém três trilhas de exemplo: PF, PM e PC. Elas devem ser adaptadas ao edital correspondente.

✍️ Edição e histórico de questões
Edição de questões por editores e administradores.
Controle de exclusão conforme as permissões.
Histórico de versões em question_history.
Consulta das alterações anteriores.
Restauração de versões como novas edições.
Recálculo de resultados quando o gabarito é alterado.
Proteções contra alterações incompatíveis em questões já respondidas.
📈 Desempenho e gamificação
🎯 Meta diária
Configurável de 5 a 200 questões.
Padrão de 10 questões por dia.
Indicador visual de progresso.
Contabilização de respostas novas, simulados e questões refeitas.
Apuração diária pelo horário de Brasília.
🔥 Sequência de estudos
Registro dos dias em que a meta foi atingida.
Indicador de sequência atual e recorde pessoal.
Aviso quando a sequência está em risco.
Calendário dos últimos 35 dias.
Aproveitamento do histórico anterior à implantação do recurso.

Alterar a meta atual não modifica retroativamente os dias anteriores.

🏅 Medalhas e conquistas

São 13 medalhas distribuídas em três categorias:

Categoria	Conquistas
🔥 Sequência de estudo	3, 7, 14, 30, 60, 100, 180 e 365 dias
📅 Constância	10, 30 e 100 dias com a meta atingida
⚡ Dia intenso	50 e 100 questões em um dia

As medalhas possuem níveis bronze, prata, ouro e diamante, conforme a configuração das conquistas. Uma medalha conquistada não é perdida quando a sequência é interrompida.

As definições ficam na tabela conquistas_def.

👤 Perfil personalizado

Disponível em /perfil, oferece:

Foto de perfil e imagem de capa.
Objetivo pessoal.
Frase motivacional de até 140 caracteres.
Estatísticas de desempenho.
Calendário de estudos.
Sequência atual e recorde.
Medalhas conquistadas.

As imagens são processadas no navegador e armazenadas no Supabase Storage. A foto também aparece junto ao nome nos comentários.

📴 Modo offline

Disponível em /offline, permite continuar estudando sem conexão com a internet.

Recursos
Instalação da aplicação como aplicativo web.
Página de reserva disponível offline.
Download de pacotes de até 100 questões não respondidas.
Filtros por matéria, assunto e banca.
Armazenamento local das respostas pendentes.
Sincronização automática quando a conexão retorna.
Sincronização manual sob demanda.
Limitações
Respostas offline contam para desempenho, metas, sequências e medalhas.
Respostas offline não contam para o ranking.
Simulados, comentários, ranking e envio de feedback exigem conexão.
A data das respostas depende do relógio do aparelho e é aceita em até sete dias para trás.
O pacote de questões precisa ser baixado previamente com internet.
O service worker é ativado em produção.

Para testar o modo offline em produção local:

npm run build
npm start

🛡️ Segurança e moderação
🔒 Correção no servidor

O gabarito e o comentário do professor ficam na tabela protegida question_keys, sem leitura direta pelo navegador.

A correção ocorre por meio de funções do banco de dados, após o registro da resposta ou a finalização do simulado.

As operações sensíveis verificam autenticação, tempo e propriedade dos registros.

Outras proteções incluem:

Bloqueio de respostas fora do tempo permitido.
Encerramento e correção de simulados abandonados.
Impedimento de responder, na tela comum, questões de simulados em andamento.
Controle de acesso por perfil e políticas RLS.
Armazenamento privado dos anexos de feedback.
🚩 Denúncias de comentários
Alunos podem denunciar comentários de outros usuários.
Cada aluno pode denunciar uma vez por comentário.
Três denúncias abertas de pessoas diferentes ocultam o comentário dos demais alunos.
O autor e o administrador continuam podendo visualizá-lo durante a análise.
O administrador decide se mantém ou exclui o conteúdo.
💬 Feedback e suporte
Para alunos
Botão flutuante de feedback.
Categorias para sugestões, problemas, elogios, dúvidas e outros assuntos.
Mensagem, avaliação de 1 a 5 e captura de tela opcional.
Registro automático da página de origem.
Opção para reportar problemas em questões.
Limite de cinco envios por hora por aluno.
Para administradores

Disponível em /painel/feedback.

Caixa de entrada com filtros por status e tipo.
Visualização das informações do aluno e dos anexos.
Status: novo, em análise, resolvido e arquivado.
Anotações internas e respostas ao aluno.
Atalhos para edição e histórico de questões.
Indicador de novas mensagens no menu.

As mensagens podem ser lidas somente pelo aluno responsável e pelo administrador. Os anexos ficam em um bucket privado do Supabase Storage, acessível por links temporários.

Notificações por e-mail: exigem configuração adicional de um Database Webhook e uma Edge Function integrada a um serviço como Resend ou SendGrid.

⚙️ Instalação e configuração
📋 Pré-requisitos
Node.js e npm.
Conta no Supabase.
Repositório do projeto disponível localmente.
1. Criar um projeto no Supabase

Acesse supabase.com e crie um projeto.

2. Executar as migrações

No SQL Editor do Supabase, execute os arquivos nesta ordem:

Ordem	Arquivo
1	supabase/schema.sql
2	supabase/migration-02-recursos.sql
3	supabase/migration-03-seguranca.sql
4	supabase/migration-04-assuntos-edicao.sql
5	supabase/migration-05-historico-trilhas.sql
6	supabase/migration-06-meta-perfil.sql
7	supabase/migration-07-feedback.sql
8	supabase/migration-08-conquistas-offline.sql

Opcionalmente, execute supabase/seed.sql para inserir dados de exemplo.

3. Configurar autenticação

No Supabase, acesse:

Authentication → URL Configuration

Configure a URL de produção e os endereços de redirecionamento necessários, incluindo:

http://localhost:3000
/login
/redefinir-senha

Ajuste os endereços conforme a configuração de autenticação do projeto.

4. Configurar variáveis de ambiente

Copie o arquivo de exemplo:

cp .env.example .env.local


Preencha as variáveis com os valores do projeto Supabase, disponíveis em Project Settings → API.

Utilize os nomes definidos no arquivo .env.example.

5. Instalar dependências
npm install

6. Iniciar o projeto
npm run dev


Acesse http://localhost:3000.

7. Tornar-se administrador

Cadastre-se pela aplicação e confirme o e-mail, se necessário.

Depois, execute no SQL Editor do Supabase:

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'seu@email.com';


Substitua o e-mail pelo endereço da sua conta administrativa.

🌐 Deploy na Vercel
Envie o projeto para um repositório no GitHub.
Acesse vercel.com.
Importe o repositório.
Configure as três variáveis de ambiente utilizadas pelo projeto.
Realize o deploy.
Atualize as URLs de autenticação no Supabase.
Teste login, recuperação de senha, permissões, simulados e modo offline.
📧 Configuração de e-mail

Para confirmação de cadastro e recuperação de senha em produção, configure um servidor SMTP próprio em:

Supabase → Authentication → SMTP Settings

O serviço padrão pode ter limites de envio reduzidos.

⚠️ Limitações conhecidas
Moderação: não há moderação automática de conteúdo; a análise depende das denúncias e da decisão do administrador.
Questões conhecidas: alunos que já responderam a uma questão podem conhecer seu gabarito, o que afeta a avaliação de conhecimento novo em simulados.
Ranking offline: respostas offline não participam da classificação.
Recursos sem conexão: simulados, comentários, ranking e feedback exigem internet.
Data offline: depende do relógio do dispositivo, com limite de sete dias para trás.
🔐 Segurança e boas práticas

A variável SUPABASE_SERVICE_ROLE_KEY concede acesso privilegiado ao banco de dados.

Utilize-a somente no servidor.
Nunca a exponha no navegador.
Nunca use o prefixo NEXT_PUBLIC_ nessa chave.
Não publique credenciais no GitHub.
Mantenha as variáveis de ambiente configuradas corretamente na Vercel.
Direitos autorais

Questões de concursos podem estar protegidas por direitos autorais. Utilize questões autorais, materiais de professores parceiros ou conteúdos de fontes devidamente licenciadas.

<p align="center">
<strong>🛡️ DG QUESTÕES</strong>
<br>
<em>Disciplina, constância e preparação para a aprovação.</em>
</p>
 
 
