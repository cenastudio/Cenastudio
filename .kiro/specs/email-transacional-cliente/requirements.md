# Requirements — E-mail transacional do cliente

## Objetivo

Dar ao cliente uma comunicação confiável e reconhecível durante todo o ciclo
da sua conta no Cena Studio. Cada e-mail nasce de um evento real do produto,
tem uma única ação clara, funciona em PT e EN e nunca impede a operação
principal caso o provedor esteja indisponível.

Este spec é a fonte de verdade da matriz de comunicações. Os templates vivem
em código versionado; os segredos e o remetente vivem exclusivamente no
ambiente seguro da Vercel/Resend.

## Princípios

1. **Evento, não intenção.** Só enviar e-mail quando o evento foi persistido
   com sucesso. Criar um rascunho, gerar um link ou abrir uma tela não dispara
   mensagem para ninguém.
2. **Segurança antes de conversão.** Nunca incluir senha, token sem expiração,
   dados sensíveis no assunto ou conteúdo HTML não escapado. Links de ação só
   aceitam `https:` ou `http:` absolutos.
3. **Não bloquear o produto.** Uma falha da Resend é registrada, mas não
   desfaz cadastro, recuperação de senha, processamento LGPD ou reunião.
4. **Uma linguagem visual.** Cabeçalho Cena Studio, fundo escuro, acento
   laranja, texto legível, um CTA e fallback em texto puro. O template precisa
   permanecer bom em mobile e nos clientes de e-mail restritivos.
5. **PT e EN por preferência da conta.** Na ausência de preferência válida,
   usar PT. Conteúdo do cliente final de uma produtora usa o idioma explícito
   da ação ou, até existir essa preferência no cliente, o da produtora.
6. **Nada de marketing escondido.** E-mails de trial, nutrição, produto e
   reengajamento dependem de consentimento de marketing, descadastro e um
   agendador; não fazem parte de e-mails transacionais.

## Matriz de ciclo de conta

| Evento | Destinatário | Estado | Regra |
| --- | --- | --- | --- |
| Conta criada | dono da conta | ativo | boas-vindas após cadastro persistido |
| Redefinição solicitada | dono da conta | ativo | link único, expira em 1 hora; resposta não revela se o e-mail existe |
| Senha alterada | dono da conta | ativo | alerta de segurança, respeita `emailOnPasswordChange` |
| Solicitação de exclusão | dono da conta | ativo | protocolo e data de elegibilidade; sem promessa além da política real |
| Exclusão concluída | e-mail capturado antes da anonimização | ativo | confirmação final, sem CTA de login |
| Exclusão rejeitada | dono da conta | ativo | informa que a conta permanece ativa e oferece canal de suporte |
| Solicitação LGPD de cópia/correção | dono da conta | ativo | protocolo e prazo; é o mesmo padrão visual |
| Solicitação LGPD concluída/rejeitada | dono da conta | ativo | confirmação de processamento; não anexa dados sensíveis |

## Próximas famílias, somente quando o evento for implementado

| Família | Pré-requisito antes de disparar |
| --- | --- |
| Convite ao portal do cliente | token de ativação/definição de senha; senha nunca enviada por e-mail |
| Proposta para aprovação | ação explícita da produtora para enviar; link público com validade |
| Review de vídeo | ação explícita da produtora para enviar; link com validade |
| Reunião agendada | já existe envio com `.ics`; migrar para o template comum sem perder anexo ou `replyTo` |
| Pagamento, ativação e cancelamento | evento Stripe idempotente e registro de entrega para evitar duplicidade em replay de webhook |
| Trial, onboarding educativo e reengajamento | consentimento de marketing, opt-out e scheduler/cron; hoje não existem |

## Critérios de aceite

1. Os seis eventos de ciclo de conta da matriz usam o mesmo renderizador
   transacional e produzem HTML responsivo e texto puro.
2. Conteúdo dinâmico de nome, protocolo e URL é escapado; URLs inválidas não
   viram CTA.
3. A exclusão captura e usa o e-mail antes da anonimização, sem reintroduzir
   PII no banco depois de apagada.
4. Os fluxos continuam bem-sucedidos se Resend falhar.
5. Há testes do renderer e dos gatilhos de conta/LGPD relevantes.
6. `docs/CONEXOES.md` e `docs/STATUS.md` identificam que produção exige
   domínio verificado, `RESEND_API_KEY` e `EMAIL_FROM` na Vercel.
