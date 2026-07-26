# Requirements Document

## Introduction

Hoje o Cena Studio não oferece nenhuma forma do cliente final (contratante da
produtora) acessar informações do seu próprio processo audiovisual sem
depender do dono da produtora enviar links pontuais (proposta, reunião,
review de vídeo — cada um com seu próprio `shareToken` público e sem login
persistente). O concorrente MakersHub oferece um "Portal do Cliente" com
login próprio, onde o cliente acompanha projetos, arquivos e status sem
precisar pedir nada à produtora.

Este spec cria um **hub por cliente** com login persistente: tudo que já
está vinculado ao `Client` (`clientId`) no sistema — projetos, arquivos,
propostas, reuniões, financeiro do próprio cliente — aparece automaticamente
no portal, sem exigir que o dono da produtora marque manualmente o que
compartilhar. O acesso é criado pelo dono da produtora (senha inicial manual),
e o cliente pode alterá-la depois. Está disponível em todos os planos
(Free/Pro/Studio), diferenciado pelo número de clientes com portal ativo
simultaneamente.

**Gap estrutural identificado:** não existe hoje nenhuma tabela ou mecanismo
de autenticação para um "usuário-cliente" — `User` é 1:1 com conta de
produtora. Este spec cobre a criação desse mecanismo como pré-requisito.

**Gap estrutural secundário (registrado, não bloqueante para o P0 mínimo):**
os documentos gerados no Studio IA (`Documents.tsx`: briefing, roteiro,
callsheet, decupagem, orçamento, cronograma, checklist, entrega) hoje só
existem em `localStorage` do navegador do dono da produtora — não são
persistidos no servidor, então não podem aparecer no portal do cliente sem
migração de persistência. Ver Requisito 8.

## Glossary

- **Portal do cliente:** área autenticada, separada do painel da produtora,
  onde o cliente final acessa os próprios dados via login e senha próprios.
- **Acesso do cliente (client portal access):** credencial de login vinculada
  a um `Client` específico, criada pelo dono da produtora.
- **Hub por cliente:** modelo de exibição onde tudo já vinculado ao
  `clientId` (projetos, arquivos, propostas, reuniões, financeiro) aparece
  automaticamente no portal, sem necessidade de marcação manual por item.
- **Limite de portal ativo:** número máximo de `Client` com acesso ao portal
  habilitado simultaneamente, variável por plano da produtora.

## Requirements

### Requisito 1 — Modelo de dados e autenticação do cliente (pré-requisito, P0)

**User Story:** Como sistema, preciso de um mecanismo de login e sessão
próprios para o cliente final, separado da conta do dono da produtora, para
que o portal possa autenticar sem reaproveitar `User`/`AuthContext` da
produtora.

#### Acceptance Criteria
1. WHEN o schema é migrado THEN o sistema SHALL ganhar um novo model (ex.:
   `ClientPortalAccess`), 1:1 com `Client`, contendo `passwordHash`,
   `active` (boolean), `lastLoginAt`, `createdAt`/`updatedAt`, seguindo o
   mesmo padrão dual Prisma(Postgres)/SQLite já usado no restante do sistema.
2. WHERE o backend roda em modo SQLite (dual-path) THE a tabela equivalente
   SHALL ser criada via `CREATE TABLE IF NOT EXISTS`, idempotente, sem
   alterar tabelas existentes.
3. WHEN o cliente faz login no portal (email do `Client` + senha) THEN o
   sistema SHALL emitir um JWT próprio, com payload distinto do token da
   produtora (ex.: `{ clientId, userId }`, onde `userId` identifica a
   produtora dona do cliente, para isolamento cross-tenant), armazenado em
   cookie httpOnly separado (ex.: `client_portal_token`), nunca reutilizando
   o cookie `frame_token` da produtora.
4. WHEN uma requisição autenticada chega a uma rota do portal THEN o sistema
   SHALL validar o JWT via um middleware novo e dedicado (ex.:
   `authenticateClientPortal`), rejeitando tokens da produtora e vice-versa.
5. IF o acesso do cliente estiver com `active = false` THEN o sistema SHALL
   rejeitar o login com mensagem apropriada, mesmo com senha correta.

---

### Requisito 2 — Criação e gestão do acesso pelo dono da produtora (P0)

**User Story:** Como dono da produtora, quero criar e gerenciar o acesso ao
portal para um cliente específico, definindo a senha inicial manualmente,
para controlar quando e para quem esse acesso é liberado.

#### Acceptance Criteria
1. WHEN o dono da produtora acessa a página de detalhe do cliente
   (`ClientDetail.tsx`) THEN o sistema SHALL exibir uma seção "Portal do
   Cliente" com: status do acesso (ativo/inativo/nunca criado), botão para
   criar acesso (definindo senha inicial manualmente) e, se já existir,
   opções para desativar, reativar ou redefinir a senha.
2. WHEN o dono da produtora cria o acesso pela primeira vez THEN o sistema
   SHALL exigir um email (pré-preenchido com `Client.email`, editável) e uma
   senha inicial definida manualmente pelo próprio dono da produtora (sem
   geração automática nem envio de senha por email neste primeiro escopo).
3. WHEN o dono da produtora tenta criar um novo acesso de portal E o limite
   do plano (Requisito 7) já foi atingido THEN o sistema SHALL bloquear a
   criação com mensagem de upgrade, sem impedir o uso do restante do CRM.
4. WHEN o dono da produtora desativa um acesso THEN o cliente SHALL perder
   a capacidade de logar no portal imediatamente (sessões futuras rejeitadas;
   sessão já aberta pode ser invalidada de forma best-effort, mesmo padrão
   de `disabled` em `User`).
5. WHEN o dono da produtora redefine a senha do cliente THEN o sistema SHALL
   invalidar sessões anteriores do cliente (mesmo padrão de segurança já
   usado em troca de senha de `User`).

---

### Requisito 3 — Alteração de senha pelo próprio cliente (P0)

**User Story:** Como cliente com acesso ao portal, quero poder trocar minha
senha depois do primeiro acesso, para não depender da produtora sempre que
eu quiser atualizar minha credencial.

#### Acceptance Criteria
1. WHEN o cliente está logado no portal e acessa "Configurações de conta"
   THEN o sistema SHALL oferecer um formulário de troca de senha exigindo a
   senha atual e a nova senha (mesmo padrão de validação de
   `authService.changePassword`).
2. WHEN a senha atual informada estiver incorreta THEN o sistema SHALL
   rejeitar a troca com mensagem clara, sem revelar detalhes da conta.
3. WHEN a troca de senha é concluída com sucesso THEN o sistema SHALL manter
   a sessão atual do cliente ativa (não exigir novo login imediato).

---

### Requisito 4 — Hub por cliente: dados exibidos automaticamente (P0)

**User Story:** Como cliente com acesso ao portal, quero ver automaticamente
tudo que já está vinculado a mim (projetos, arquivos, propostas, reuniões,
financeiro), sem que a produtora precise marcar manualmente cada item para
compartilhamento.

#### Acceptance Criteria
1. WHEN o cliente acessa o portal THEN o sistema SHALL listar automaticamente
   todos os `Project` com `clientId` igual ao do cliente autenticado, sem
   exigir nenhuma flag de "compartilhado" adicional por projeto.
2. WHEN o cliente acessa a seção de arquivos/drive do portal THEN o sistema
   SHALL listar automaticamente os `File` vinculados aos projetos do cliente
   (via `File.projectId → Project.clientId`), permitindo download direto.
3. WHEN o cliente acessa a seção de propostas do portal THEN o sistema SHALL
   listar as `Proposal` vinculadas ao seu `clientId`, reutilizando os dados
   já persistidos (`html`, `status`, `acceptedAt`), sem duplicar a visão já
   existente em `/proposal/:token` (o portal passa a ser o canal principal;
   o link público por token continua funcionando para compartilhamento
   pontual sem login).
4. WHEN o cliente acessa a seção de reuniões do portal THEN o sistema SHALL
   listar as `Meeting` vinculadas ao seu `clientId`.
5. WHERE o cliente tiver lançamentos financeiros vinculados
   (`FinancialEntry.clientId`) THE o sistema SHALL exibir um resumo
   financeiro básico do próprio cliente (ex.: valores pendentes/pagos),
   sem expor dados financeiros de outros clientes da mesma produtora.
6. WHEN um novo projeto, arquivo, proposta ou reunião é criado pela produtora
   e vinculado ao `clientId` do cliente THEN ele SHALL aparecer no portal na
   próxima consulta, sem necessidade de ação adicional da produtora
   (automático por design do hub).

---

### Requisito 5 — Status do processo audiovisual (P1)

**User Story:** Como cliente, quero entender em que etapa do processo cada
projeto meu está, sem precisar perguntar à produtora.

#### Acceptance Criteria
1. WHEN o cliente visualiza um projeto no portal THEN o sistema SHALL exibir
   a etapa atual do fluxo de trabalho (`WORKFLOW_STAGES`, mesmo modelo já
   usado em `ProjectNav`/`ProjectChapter` no painel da produtora), em
   formato somente leitura.
2. WHERE o projeto tiver `progress` (campo já existente em `Project`) THE o
   sistema SHALL exibir esse percentual de progresso no portal.
3. WHILE o cliente estiver no portal THEN o sistema SHALL NÃO exibir dados
   operacionais internos da produtora que não fazem sentido para o cliente
   (ex.: orçamento interno de custos/`Budget`, DRE, notas internas de CRM)
   — o portal expõe apenas o recorte relevante ao cliente (projetos, status,
   arquivos, propostas, reuniões, financeiro do próprio cliente).

---

### Requisito 6 — Download de arquivos (P0)

**User Story:** Como cliente, quero baixar os arquivos do meu drive
diretamente pelo portal, incluindo documentos gerados para mim.

#### Acceptance Criteria
1. WHEN o cliente aciona "Download" em um arquivo listado no portal THEN o
   sistema SHALL permitir o download, reutilizando o mecanismo já existente
   de `downloadFile`/`createProjectFileUrl`, mas validando que o arquivo
   pertence a um projeto do `clientId` autenticado (nunca por `userId` da
   produtora, que não existe no contexto do portal).
2. IF o cliente tentar acessar um arquivo que não pertence a nenhum projeto
   seu THEN o sistema SHALL retornar 404, nunca 403 (para não confirmar
   existência do recurso a um cliente não autorizado).

---

### Requisito 7 — Limite por plano (P0)

**User Story:** Como produto, quero que o portal do cliente esteja disponível
em todos os planos, mas com um limite de quantos clientes podem ter portal
ativo simultaneamente, crescendo com o plano.

#### Acceptance Criteria
1. WHEN o sistema calcula o limite de portais ativos por produtora THEN
   SHALL seguir: Free = 1, Pro = 5, Studio (e superiores) = ilimitado
   (`null`), seguindo exatamente a convenção já usada em
   `PlanEntitlement.clientLimit` (`number | null`, onde `null` = ilimitado).
2. WHEN o dono da produtora consulta o limite (ex.: ao abrir o formulário de
   criação de acesso) THEN o sistema SHALL exibir quantos de X portais estão
   em uso, mesmo padrão visual já usado para `ClientAllowance` em
   `NewClient.tsx`.
3. WHEN o limite é atingido e o dono da produtora tenta ativar mais um
   THEN o sistema SHALL bloquear com 402 e mensagem de upgrade (mesmo padrão
   de `assertClientCapacity`), sem impedir o uso do restante do sistema.
4. WHEN a produtora desativa um portal ativo THEN a vaga SHALL ficar
   disponível imediatamente para ativar outro cliente.
5. IF a produtora fizer downgrade de plano E o número de portais ativos
   exceder o novo limite THEN o sistema SHALL manter os acessos já ativos
   funcionando (não desativa automaticamente clientes existentes), mas SHALL
   bloquear a ativação de novos portais até que o uso volte a caber no
   limite (mesmo comportamento tolerante já adotado em outros limites do
   sistema, evitando quebrar acesso de clientes já em uso).

---

### Requisito 8 — Persistência dos documentos do Studio IA (P2, registrado, não bloqueante)

**User Story:** Como cliente, quero ver no portal os documentos gerados para
mim no Studio IA (propostas em PDF, contratos, briefings), e não apenas as
`Proposal` já persistidas no servidor.

#### Acceptance Criteria
1. WHERE os documentos do Studio IA (`Documents.tsx`) ainda estiverem
   persistidos apenas em `localStorage` do navegador da produtora THE o
   portal do cliente SHALL exibir apenas os dados já persistidos no servidor
   (`Proposal`), com uma nota registrada no design de que a exposição
   completa dos documentos do Studio IA depende de uma migração de
   persistência server-side, fora do escopo bloqueante deste spec.
2. IF a migração de persistência dos documentos do Studio IA for implementada
   em um spec futuro THEN o portal do cliente SHALL ser estendido para listá-
   los, seguindo o mesmo padrão de filtro por `clientId` já estabelecido nos
   Requisitos 4 e 6.

---

### Requisito 9 — Compatibilidade e não regressão (transversal, bloqueante)

**User Story:** Como operador do sistema, quero que a introdução do portal do
cliente não quebre nenhum fluxo existente do painel da produtora nem abra
brechas de acesso cross-tenant.

#### Acceptance Criteria
1. WHILE este spec estiver em implementação THEN o painel da produtora
   (`ClientDetail.tsx`, `Clients.tsx`, autenticação existente via
   `authenticate`/`frame_token`) SHALL continuar funcionando exatamente como
   hoje.
2. WHEN a migração de banco (Requisito 1) for aplicada THEN ela SHALL ser
   puramente aditiva (nova tabela), sem alterar nem remover nada existente.
3. WHEN um cliente autenticado no portal tenta acessar dados de outro cliente
   (mesma produtora ou produtora diferente) THEN o sistema SHALL retornar 404
   em todos os endpoints do portal, mesmo padrão de isolamento cross-tenant
   já testado em `domainFlow.test.ts` para a produtora.
4. AFTER a implementação THEN `npm run check`, `npm run test` (suite
   completa) e `npm run build` SHALL passar antes de considerar o spec
   concluído.
