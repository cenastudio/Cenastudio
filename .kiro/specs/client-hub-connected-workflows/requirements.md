# Requirements Document

## Introduction

A Central do Cliente (Client Detail page em `/clients/:id`) será evoluída para funcionar como hub único que conecta todos os workflows da aplicação. O princípio é: "todo workflow começa e termina no cliente — todas as pontas soltas devem ser amarradas". Atualmente as páginas de projetos, pipeline, propostas, interações, financeiro, arquivos, vídeo reviews e studio AI operam de forma desconectada. Esta feature cria conexões bidirecionais entre o cliente e todos os módulos, garantindo rastreabilidade completa e ações contextuais rápidas.

## Glossary

- **Client_Hub**: A página de detalhe do cliente (`/clients/:id`) funcionando como hub central de navegação e ações
- **Commercial_Shell**: O layout wrapper (`CommercialHub.tsx`) que mantém a `CommercialNav` visível durante navegação comercial
- **CommercialNav**: Barra de navegação com abas (Visão geral, Clientes, Pipeline, Propostas, Interações)
- **Client_API**: O endpoint `GET /api/clients/:id` que retorna dados agregados do cliente
- **Workflow_Context**: Dados do cliente passados via query params ou estado de navegação ao iniciar um workflow
- **Tab_Panel**: Seção com abas dentro do Client_Hub para visualizar dados de módulos específicos
- **Quick_Action**: Botão de ação rápida que inicia um workflow contextual pré-preenchido com dados do cliente
- **Opportunity**: Registro de oportunidade no pipeline comercial vinculado a um cliente
- **Financial_Entry**: Lançamento financeiro (receita ou despesa) vinculado a um cliente
- **Video_Review_Room**: Sala de revisão de vídeo pertencente a um projeto do cliente
- **Studio_Tool**: Ferramenta de geração AI no Studio (briefing, proposta, roteiro)

## Requirements

### Requirement 1: Navegação Contextual Preservada

**User Story:** As a user, I want the CommercialNav to remain visible when viewing a client detail, so that I can navigate between commercial sections without losing context.

#### Acceptance Criteria

1. WHEN a user navigates to `/clients/:id`, THE Commercial_Shell SHALL render the CommercialNav component directly above the Client_Hub content area, below the AppNavBar
2. WHILE viewing the Client_Hub at any `/clients/:id` route, THE CommercialNav SHALL indicate the "Clientes" tab as active by applying a visually distinct style and setting `aria-current="page"` on that tab
3. WHEN a user clicks another CommercialNav tab while in the Client_Hub, THE Commercial_Shell SHALL navigate to the selected section using a history push operation so that the browser back button returns the user to the previous Client_Hub view
4. IF the requested client does not exist (404), THEN THE Commercial_Shell SHALL still render the CommercialNav with the "Clientes" tab active above the error state content

### Requirement 2: Projetos Conectados ao Cliente

**User Story:** As a user, I want to see all projects linked to a client and create new projects from the client view, so that project-client relationships are always traceable.

#### Acceptance Criteria

1. WHEN the Client_Hub loads, THE Tab_Panel SHALL display all projects linked to the client, showing name, status, and creation date, ordered by creation date descending
2. WHEN a user clicks on a project item in the Tab_Panel, THE Client_Hub SHALL navigate to `/project/:projectId` for that project
3. WHEN a user clicks "Novo Projeto" in the Client_Hub, THE Client_Hub SHALL navigate to the project creation flow with `clientId` passed as a query parameter
4. THE Client_API SHALL return a `projects` array containing all projects where `client_id` matches the requested client, each object including at minimum: id, name, status, and created_at
5. IF a client has no linked projects, THEN THE Tab_Panel SHALL display an empty state message indicating no projects exist and presenting the "Novo Projeto" action

### Requirement 3: Pipeline e Oportunidades do Cliente

**User Story:** As a user, I want to see all pipeline opportunities for a client and create new ones from the client view, so that I can track the sales history per client.

#### Acceptance Criteria

1. WHEN the Client_Hub loads, THE Tab_Panel SHALL include an "Oportunidades" tab displaying all opportunities for the client, showing each opportunity's title, stage, estimated_value, and expected_close_date, ordered by updated_at descending
2. THE Client_API SHALL return an `opportunities` array with fields: id, title, stage, estimated_value, probability, expected_close_date, and lost_reason
3. WHEN a user clicks "Nova Oportunidade" in the Client_Hub, THE Client_Hub SHALL navigate to `/pipeline?new=1&clientId={clientId}` so that the pipeline opens with the creation form pre-filled with the client
4. WHEN a user clicks an opportunity item, THE Client_Hub SHALL navigate to `/pipeline?opportunityId={id}` so that the pipeline view displays the detail of that specific opportunity
5. IF a client has no opportunities, THEN THE Tab_Panel SHALL display an empty state message indicating no opportunities exist for this client

### Requirement 4: Propostas Contextuais

**User Story:** As a user, I want to generate proposals pre-filled with client data from the client view, so that I save time and reduce errors when creating proposals.

#### Acceptance Criteria

1. WHEN a user clicks "Gerar Proposta" in the Client_Hub, THE Client_Hub SHALL navigate to `/proposals` with `clientId` as a query parameter matching the current client's numeric ID
2. WHEN the Proposals page receives a valid `clientId` query parameter, THE Proposals page SHALL auto-select that client in the client dropdown and pre-fill the client name, company, email, and phone fields in the proposal form within 2 seconds of page load
3. IF the Proposals page receives a `clientId` query parameter that does not match any existing client, THEN THE Proposals page SHALL display the proposal form with empty client fields and the client dropdown unselected
4. WHEN a proposal is saved for a client, THE Tab_Panel SHALL display that proposal in a "Propostas" tab within the Client_Hub showing proposal title, total value, creation date, and status
5. IF a client has no saved proposals, THEN THE Tab_Panel SHALL display an empty state message in the "Propostas" tab indicating no proposals exist for the client

### Requirement 5: Histórico Completo de Interações

**User Story:** As a user, I want to see the full interaction history for a client and register new interactions contextually, so that communication history is centralized.

#### Acceptance Criteria

1. WHEN the Client_Hub loads, THE Tab_Panel SHALL display the most recent 20 interactions for the client, ordered by created_at descending, showing type, subject, notes preview, and date
2. WHEN a user clicks "Registrar Interação" in the Client_Hub, THE Client_Hub SHALL navigate to `/interactions?clientId={clientId}&new=1`
3. WHEN the Interactions page receives a valid `clientId` query parameter, THE Interactions page SHALL pre-select the client in the interaction form
4. IF the Interactions page receives a `clientId` that does not match any client, THEN THE Interactions page SHALL load with the client field empty
5. THE Client_API SHALL return an `interactions` array limited to the 20 most recent entries, ordered by created_at descending, with fields: id, type, subject, notes, and created_at
6. IF a client has no interactions, THEN THE Tab_Panel SHALL display an empty state message with a prompt to register the first interaction

### Requirement 6: Financeiro Vinculado ao Cliente

**User Story:** As a user, I want to see all financial entries for a client with totals and create new linked entries, so that I have a clear financial picture per client.

#### Acceptance Criteria

1. WHEN the Client_Hub loads, THE Tab_Panel SHALL display all financial entries linked to the client, showing description, kind (income/expense), amount, status, and due_date, ordered by due_date descending
2. THE Tab_Panel SHALL display a summary header showing total income (sum of settled income entries), total expenses (sum of settled expense entries), and net balance (income minus expenses) for the client
3. WHEN a user clicks "Lançar Receita/Despesa" in the Client_Hub, THE Client_Hub SHALL navigate to `/analytics?clientId={clientId}&newEntry=1`
4. WHEN the Analytics page receives a valid `clientId` query parameter, THE Analytics page SHALL pre-select the client in the financial entry form
5. THE Client_API SHALL return a `financial` array with fields: id, kind, description, amount, status, due_date, and category
6. IF a client has no financial entries, THEN THE Tab_Panel SHALL display an empty state message with a prompt to create the first entry

### Requirement 7: Arquivos Agregados do Cliente

**User Story:** As a user, I want to see all files across all projects for a client in one place, so that I can find any client asset without navigating each project individually.

#### Acceptance Criteria

1. WHEN the Client_Hub loads, THE Tab_Panel SHALL aggregate and display up to 100 files from all projects linked to the client, ordered by creation date descending
2. THE Tab_Panel SHALL display each file with original name, mime type, creation date, and the project name it belongs to
3. WHEN a user clicks on a file item, THE Client_Hub SHALL open the file download endpoint (`/api/files/:id/download`) in a new browser tab
4. IF a client has no linked projects, THEN THE Tab_Panel SHALL display an empty state message indicating no files are available
5. IF a client has linked projects but none contain files, THEN THE Tab_Panel SHALL display an empty state message indicating no files are available

### Requirement 8: Video Reviews do Cliente

**User Story:** As a user, I want to see all video review rooms from the client's projects in the client view, so that I can access reviews without navigating each project.

#### Acceptance Criteria

1. WHEN the Client_Hub loads, THE Tab_Panel SHALL include a "Vídeo Reviews" tab listing all review rooms from the client's projects, ordered by created_at descending
2. WHEN a user clicks on a review room item, THE Client_Hub SHALL navigate to `/video-reviews/:projectId` for that review room
3. THE Client_API SHALL return a `videoReviews` array with fields: id, project_id, project_name, title, status, and created_at
4. IF a client has no video review rooms, THEN THE Tab_Panel SHALL display an empty state message indicating that no video reviews exist for this client's projects

### Requirement 9: Studio AI Contextual

**User Story:** As a user, I want to generate AI documents (briefing, proposal, script) with client data pre-loaded from the client view, so that I can produce deliverables faster.

#### Acceptance Criteria

1. WHEN the Client_Hub displays Studio quick actions, THE Client_Hub SHALL offer exactly three contextual generation options: Briefing, Proposta, and Roteiro
2. WHEN a user clicks a Studio quick action, THE Client_Hub SHALL navigate to `/studio/:toolId` with `clientId` as a query parameter, where `toolId` matches the selected option slug (briefing, proposta, or roteiro)
3. WHEN the Studio page receives a valid `clientId` query parameter, THE Studio page SHALL pre-load the client name, company, and industry into the generation context fields, omitting any field whose value is null or empty
4. IF the `clientId` query parameter references a non-existent client, THEN THE Studio page SHALL load without pre-filled context and not display an error to the user
5. IF the client has at least one project with status other than "archived" or "cancelled", THEN THE Studio page SHALL offer the most recently created such project as an additional generation context option
6. WHEN the user selects the offered project context option, THE Studio page SHALL merge the project name and metadata into the generation context alongside the client data

### Requirement 10: API Expandida para Hub Completo

**User Story:** As a developer, I want the client API to return all related data in a single request, so that the Client_Hub loads efficiently without multiple round-trips.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/clients/:id`, THE Client_API SHALL return an object containing: client, projects, opportunities, interactions (limited to the 20 most recent, ordered by date descending), financial, files, and videoReviews
2. IF the requested client ID does not exist or does not belong to the authenticated user, THEN THE Client_API SHALL return an error response with HTTP 404 status
3. THE Client_API SHALL query financial entries where `client_id` matches the requested client
4. THE Client_API SHALL aggregate files from all projects linked to the client
5. THE Client_API SHALL aggregate video review rooms from all projects linked to the client
6. IF any secondary data query (projects, opportunities, interactions, financial, files, or videoReviews) fails, THEN THE Client_API SHALL return the client object with the successful data and empty arrays for failed queries, and SHALL include a `warnings` array listing the names of sections that could not be loaded
7. WHEN the aggregated response is assembled, THE Client_API SHALL return the complete response within 2000 milliseconds under normal database load

### Requirement 11: Deep Links Bidirecionais

**User Story:** As a user, I want every related entity (project, opportunity, interaction, financial entry) to link back to the client, so that navigation is bidirectional.

#### Acceptance Criteria

1. WHEN viewing a project detail in ProjectHub, THE ProjectHub SHALL display the client name as a clickable link that navigates to `/clients/:clientId`
2. WHEN viewing an opportunity detail in the Pipeline, THE Pipeline SHALL display the client name as a clickable link that navigates to `/clients/:clientId`
3. IF a financial entry has an associated `client_id`, THEN THE Analytics page SHALL display the client name as a clickable link that navigates to `/clients/:clientId`
4. WHEN viewing an interaction detail in the Interactions page, THE Interactions page SHALL display the client name as a clickable link that navigates to `/clients/:clientId`
5. IF an entity does not have an associated `client_id`, THEN THE system SHALL not render a client link for that entity
6. WHEN a user clicks a client back-link in any entity view, THE system SHALL navigate to the Client_Hub page and preserve the CommercialNav context
