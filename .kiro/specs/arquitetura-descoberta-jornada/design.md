# Design

## Princípio central

O Cena deve ter três camadas persistentes de descoberta:

- mapa da operação, para mostrar a jornada completa;
- ações contextuais, para dizer o que fazer agora;
- catálogo de módulos, para revelar tudo que o produto faz.

## Superfícies

### Dashboard

Vira a central do dia. Prioriza job em foco, pendências e atalhos de operação.
Métricas continuam, mas não devem ser a primeira resposta quando ainda há pouco
dado.

### Project Hub

Vira cockpit do job. O topo deve deixar evidente etapa atual, próxima ação,
atalhos do job e materiais conectados. No mobile, blocos secundários devem ser
agrupados para reduzir a torre vertical.

### Comercial e Cliente

Comercial deve ser uma jornada de venda. A ficha do cliente deve reduzir ações
concorrentes e destacar a próxima melhor ação do relacionamento.

### Documentos

Documentos deve operar em passos: escolher tipo, puxar contexto, preencher
essenciais, revisar preview e salvar/exportar.

### Portal

Portal deve ser espelho simplificado da jornada: pendências do cliente, proposta
para aprovar, arquivos liberados, reuniões e status do projeto.

## Fase 2 — redesenho visual tela por tela

A primeira fase resolveu descoberta, navegação e jornadas principais, mas ainda
deixava telas com a mesma casca visual anterior. A segunda fase aplica uma
camada visual operacional comum nas telas preservadas: título de tarefa, etapa
da jornada, métricas da tela e ações imediatas.

### Camada `ScreenDesignPass`

Usada nas telas de operação que precisavam sair de um header genérico:
Tools, Arquivos, Orçamento, Shot List, Timesheet, Financeiro, Equipamento,
Perfil, Empresa, Equipe, Webhooks e Admin. A camada não substitui o conteúdo da
tela; ela revela o papel daquela tela na jornada e destaca a próxima ação.

### Auth e Landing

Landing, Login e Cadastro eram claros, mas foram conectados à arquitetura real
do app: a landing agora mostra o mapa operacional logo depois do hero, e auth
mostra a sequência de acesso para Comercial, Projeto e Entrega.

### Portal

O Portal ganhou rail de jornada no layout compartilhado. Projetos, Arquivos,
Propostas, Reuniões e Conta passam a carregar a mesma moldura de orientação,
sem depender de cada subtela explicar o fluxo isoladamente.

## Fase 3 — QA visual humano e polimento

A terceira passada fechou os pontos que ainda podiam manter sensação de painel
antigo:

- Studio IA recebeu um workbench interno por ferramenta, conectando contexto,
  campos e artefato antes do formulário.
- Perfil e Admin receberam orientação por aba, para que configurações densas
  comecem por uma intenção operacional.
- Arquivos ganhou cabeçalho de comando, métricas e foco melhor em filtros,
  upload e lista.
- O `PortalPageHeader` passou a desenhar a mesma hierarquia em todas as
  subtelas do cliente, com trilho Projeto -> Aprovar -> Baixar.
- Auth e Portal tiveram microcopy, estados de carregamento e foco visual
  lapidados.
- `/studio` agora redireciona para `/studio/01`, evitando que a entrada
  principal do módulo caia em 404.

## Verificação

- testes unitários/componentes para componentes de descoberta;
- testes de serviços para fallback local;
- E2E/screenshot para rotas críticas desktop e mobile;
- auditoria visual final com screenshots salvos em `tmp/`.
- auditoria final da Fase 2 com 43 screenshots em
  `tmp/final-visual-redesign-audit-2026-08-23/`, 0 erros de console,
  0 falhas HTTP, 0 overflow horizontal e 0 tela em branco/overlay.
- QA visual humano final com 44 screenshots em
  `tmp/final-human-design-qa-2026-08-23/`, 0 erros de console,
  0 falhas HTTP, 0 overflow horizontal e 0 tela em branco/overlay.
