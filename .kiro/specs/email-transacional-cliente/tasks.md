# Tasks — E-mail transacional do cliente

## Fase 1 — Fundação e ciclo de conta

- [x] 1.1 Mapear eventos reais de conta, privacidade, portal, reunião,
  proposta, review e cobrança contra código atual.
- [x] 1.2 Registrar matriz, pré-requisitos e limites de consentimento neste
  spec; sincronizar `docs/STATUS.md` e `docs/CONEXOES.md`.
- [x] 1.3 Criar renderer transacional central, seguro e responsivo com
  fallback texto puro.
- [x] 1.4 Migrar boas-vindas, reset e alerta de senha para o renderer comum.
- [x] 1.5 Substituir confirmação LGPD genérica por template de solicitação e
  enviar confirmação de conclusão/rejeição; incluir exclusão concluída.
- [x] 1.6 Adicionar testes de escape, URL segura e gatilhos de ciclo de conta.

## Fase 2 — Comunicação cliente-produtor

- [x] 2.1 Migrar convite de reunião existente para o renderer comum,
  preservando `.ics`, `replyTo`, idioma e dados da reunião.
  - O convite de reunião agora usa `renderTransactionalEmail()`, preserva
    anexo `.ics`, `replyTo`, locale PT/EN da produtora e detalhes da reunião.
    O adaptador da Resend também repassa `contentType: "text/calendar"` para
    o anexo. Validação: `npm run test -- server/controllers/shareLinkExpiry.test.ts server/services/emailService.test.ts server/services/transactionalEmail.test.ts`,
    `npm run check` e `npm run build`.
- [x] 2.2 Projetar ativação segura do Portal do Cliente (definir senha via
  token); não enviar senha criada pela produtora por e-mail.
  - Portal do Cliente agora cria acesso por convite com token temporal
    armazenado apenas como SHA-256 no banco. A produtora informa só o e-mail;
    o cliente define a própria senha em `/portal/activate?token=...`, com
    política forte igual à criação de conta. Reenvio de acesso gera novo token
    em vez de senha manual. O e-mail de ativação usa o renderer transacional
    comum quando Resend está configurado; em ambiente sem Resend, a resposta
    autenticada retorna o link para cópia manual. Validação:
    `npx prisma generate`, `npm run test -- server/clientPortalFlow.test.ts`,
    `npm run check`, `npm run test -- client/src/test/appImport.test.ts client/src/test/translations.test.ts`
    e `npm run build`.
- [x] 2.3 Implementar ação explícita para enviar proposta ao cliente, com
  link temporal e autorização da produtora.
  - Propostas agora têm endpoint autenticado `POST /api/clients/proposals/:id/send`.
    A ação valida propriedade da produtora, exige e-mail no cliente, bloqueia
    proposta `revoked`/`accepted`, transforma rascunho em `sent` e pode liberar
    a proposta no Portal do Cliente no mesmo gesto explícito. O e-mail usa o
    renderer transacional comum com `replyTo` da produtora e link público
    temporal já protegido por `PROPOSAL_SHARE_TTL_DAYS`; se Resend não estiver
    configurado ou falhar, a resposta devolve `proposal_url` e status de envio
    para fallback manual. Validação: `npm run test -- server/controllers/proposalLifecycle.test.ts`
    e `npm run check`.
- [x] 2.4 Implementar ação explícita para enviar review de vídeo ao cliente,
  com link temporal e autorização da produtora.
  - Reviews de vídeo agora têm `POST /api/video-reviews/:id/send` e o alias
    legado `POST /api/video-review-send`. O envio valida que o review pertence
    à produtora, bloqueia estados finalizados (`approved`/`rejected`), usa o
    e-mail do cliente vinculado ao projeto ou `recipientEmail` explícito
    validado, renova `shareToken`, define expiração entre 1 e 30 dias, marca
    `pending_review` e envia e-mail transacional pelo renderer comum. Sem
    Resend ou em falha de envio, a resposta devolve `shareUrl` para fallback
    manual. Validação: `npm run test -- server/controllers/videoReviewsSend.test.ts`
    e `npm run check`.

## Fase 3 — Cobrança e confiabilidade

- [ ] 3.1 Criar registro idempotente de eventos/deliveries antes de enviar
  e-mails a partir de webhooks Stripe.
- [ ] 3.2 Implementar e-mails de ativação, falha de pagamento e cancelamento
  após 3.1, sem duplicar recibos fiscais da Stripe.
- [ ] 3.3 Registrar observabilidade de entrega e caminho de reenvio manual.

## Fase 4 — Lifecycle opt-in

- [ ] 4.1 Modelar consentimento de marketing e descadastro auditável.
- [ ] 4.2 Adicionar scheduler/cron confiável e idempotente.
- [ ] 4.3 Só então implementar trial, onboarding educativo, digest e
  reengajamento.

## Verificação da Fase 1

- [x] Testes focados do renderer e dos serviços de autenticação/LGPD verdes
  (8 testes em 5 arquivos, 2026-08-14).
- [x] `npm run check` e `npm run build` verdes (2026-08-14).
- [ ] Teste real de entrega para e-mail externo após domínio verificado e
  variáveis configuradas na Vercel.
