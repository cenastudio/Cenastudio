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

- [ ] 2.1 Migrar convite de reunião existente para o renderer comum,
  preservando `.ics`, `replyTo`, idioma e dados da reunião.
- [ ] 2.2 Projetar ativação segura do Portal do Cliente (definir senha via
  token); não enviar senha criada pela produtora por e-mail.
- [ ] 2.3 Implementar ação explícita para enviar proposta ao cliente, com
  link temporal e autorização da produtora.
- [ ] 2.4 Implementar ação explícita para enviar review de vídeo ao cliente,
  com link temporal e autorização da produtora.

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
