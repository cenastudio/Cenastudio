# Tasks — Fluxos conectados e confiabilidade

> A implementação começa após aprovação explícita da decisão de modelagem e da
> arquitetura de informação em `design.md`.

## Fase 0 — Descoberta e aceite

- [x] 0.1 Confirmar relações atuais no schema e rotas relevantes.
- [x] 0.2 Confirmar que a ponte IA já tem feedback unitariamente coberto.
- [ ] 0.3 Reproduzir o lançamento de gasto no ambiente com Postgres e capturar
  `requestId`, payload sanitizado e resposta.
- [x] 0.4 Exercitar a ponte IA com projeto, sem projeto, bloco inválido,
  substituição e plano sem entitlement.
- [x] 0.5 Registrar no fim desta spec os achados da auditoria de erros de
  Orçamento, Proposta e Produção.

## Fase P0 — Confiabilidade dos fluxos críticos

- [x] P0.1 Escrever testes vermelhos de `BudgetEntry` inválido, erro inesperado e
  retorno de overview atualizado.
- [x] P0.2 Corrigir validação, serialização e contrato do lançamento de gasto.
- [x] P0.3 Fazer o extrato de gastos ser carregado do servidor e permanecer após
  recarregar a tela.
- [x] P0.4 Cobrir o fluxo browser de lançar gasto e refletir o saldo.
- [x] P0.5 Escrever E2E da bridge IA para os cenários de sucesso e falha.
- [x] P0.6 Verificar o caminho real de “Confirmar e enviar” e corrigir somente
  causas reproduzíveis, sem duplicar o feedback já existente.
- [x] P0.7 Fazer auditoria de mutações em Proposta e Produção e corrigir os
  achados bloqueantes.
- [x] P0.8 Rodar `npm run check`, testes focados e E2E dos fluxos P0.

## Achados da auditoria P0 (2026-08-22)

- **Orçamento:** o extrato existia somente no estado React, portanto desaparecia
  após recarregar. A rota agora devolve `entry` e `overview`; serviço e tela
  validam centavos inteiros, data real e URL de comprovante antes da gravação.
- **Ponte IA:** a implementação já tinha loading, erro, sucesso e proteção contra
  duplo envio. Não houve defeito reproduzível no código atual; os testes agora
  cobrem projeto ausente, bloco inválido, faixa, substituição, bloqueio de plano
  e a permanência do diálogo após falha.
- **Proposta:** `clientId` malformado e valor fracionado podiam alcançar conversão
  de `BigInt` e resultar em erro inesperado. A validação de borda passou a
  responder `400` acionável. Histórico local de rascunhos e ligação com orçamento
  são evolução estrutural de P1, não foram disfarçados como persistência.
- **Produção:** a calculadora de precificação limpava projetos/clientes em silêncio
  quando a carga falhava. Agora mostra o erro e bloqueia ações até os destinos
  carregarem. Campos livres inseridos no HTML comercial são escapados, e as
  prévias/impressões públicas de proposta usam iframe sandboxado sem scripts.
- **Erros inesperados:** `requestLogger` e `errorHandler` compartilham
  `X-Request-Id`; logs recebem o identificador e a resposta de produção não expõe
  detalhes internos.

**Evidência:** 25 testes focados passaram; E2E de gasto persistente, bridge
desktop (teto, substituição e bloqueio de plano) e bridge mobile passaram;
`npm run check` e `npm run build` passaram. A task 0.3 continua aberta porque
reproduzir contra Postgres/Supabase exige janela controlada e não foi executado.

## Fase P1A — Modelo comercial conectado

- [x] P1A.1 Registrar ADR: orçamento interno e proposta comercial são entidades
  vinculadas, não uma só entidade.
- [ ] P1A.2 Criar migration aditiva e backfill idempotente para origem/snapshot.
- [ ] P1A.3 Criar testes de migração, ownership e imutabilidade de proposta
  enviada/aceita.
- [x] P1A.4 Implementar serviço transacional: orçamento IA → rascunho de
  proposta vinculado.
- [x] P1A.5 Exibir origem e versões no projeto, ficha do cliente e Comercial.
- [x] P1A.6 Conectar gerador de proposta da IA ao payload comercial estruturado.

## Fase P1B — CRM, portal e documento

- [x] P1B.1 Criar jornada explícita Dados → Projeto → Acesso na ficha do cliente.
- [x] P1B.2 Transformar a ficha em CRM 360 com pipeline, interações, propostas,
  reuniões e projetos contextuais.
- [x] P1B.3 Consolidar renderer de proposta/PDF com identidade Cena, locale e
  dados do estúdio.
  - [x] P1B.3.1 Definir contrato puro de documento comercial: dados do estúdio,
    cliente, itens em centavos, locale, moeda, termos e metadados.
  - [x] P1B.3.2 Implementar renderer único, escapado e independente de UI para
    HTML/impressão, sem executar scripts do conteúdo.
  - [x] P1B.3.3 Migrar Propostas, Calculadora de Precificação e rascunho de
    orçamento para o mesmo contrato, preservando links públicos existentes.
  - [x] P1B.3.4 Cobrir identidade, locale PT/EN, moeda, sanitização e impressão nos
    testes relevantes.
- [ ] P1B.4 Cobrir criação, envio, visualização, aceite e portal do cliente.
  - [x] P1B.4.1 Cobrir estados privados e compartilhados: rascunho, envio,
    visualização, aceite e revogação.
  - [x] P1B.4.2 Cobrir visualização/aceite e isolamento no Portal com Postgres.
  - [ ] P1B.4.3 Executar E2E desktop e mobile do fluxo Cliente → Projeto →
    Orçamento → Proposta → Portal.

## Fase P1C — Navegação e Conta

- [x] P1C.1 Redesenhar a navegação de Produção por intenção de trabalho.
- [x] P1C.2 Mover webhooks e API keys para Conta > Integrações sem quebrar URLs.
- [x] P1C.3 Auditar Conta contra o inventário de capacidades e apresentar os
  gaps para aprovação antes de implementar novas superfícies.
- [x] P1C.4 Validar navegação em desktop, tablet e mobile.

### Sequência P1C

- [x] P1C.A Inventariar rotas e ações por intenção, removendo apenas duplicação
  comprovada.
- [x] P1C.B Projetar e implementar a nova entrada de Produção sem quebrar URLs.
- [x] P1C.C Centralizar integrações em Conta e preservar redirecionamentos.
  - [x] P1C.C.1 Expor Webhooks em `Conta > Integrações` sem remover a rota
    legada `/webhooks`.
  - [x] P1C.C.2 Mover gestão de chaves de API de Segurança para Integrações,
    preservando criação, cópia única, listagem e revogação.
- [x] P1C.D Testar descoberta, touch targets e retorno de navegação em 390px,
  tablet e desktop.

## Fase P2 — Decisão de evolução

- [ ] P2.1 Propor dashboard com métricas cuja fonte exista no banco.
- [ ] P2.2 Propor financeiro por fases: caixa, recebíveis e resultado por projeto.
- [ ] P2.3 Trocar nomenclatura de faixa e adicionar ajuda contextual PT/EN.
- [ ] P2.4 Implementar somente blocos P2 aprovados.

## Backlog aprovado — Storyboard IA conectado ao Shot List

- [ ] SB.1 Abrir spec própria para Storyboard IA como visão do Shot List, não
  como ferramenta isolada.
- [ ] SB.2 Gerar variações de quadro por shot a partir de cena, enquadramento,
  lente, movimento, ação, luz e referências visuais.
- [ ] SB.3 Vincular quadro aprovado, prompt, revisão e responsável ao shot;
  suportar Lista, Storyboard e Plano de gravação.
- [ ] SB.4 Persistir os assets no storage autorizado, com limites de custo,
  permissões e exportação de PDF de set para mobile/desktop.

## Verificação final

- [ ] Nenhuma proposta enviada/aceita muda ao editar o orçamento de origem.
- [ ] Nenhum cliente acessa dados de outro cliente ou produtora.
- [ ] `npm run check`, `npm run test`, `npm run build` e Playwright relevante passam.
- [ ] `docs/STATUS.md` e este spec registram apenas evidência verificada.
