# Design — E-mail transacional do cliente

## Fonte de verdade e responsabilidade

```
evento persistido
  -> service específico (auth / privacidade / reunião / cobrança)
  -> renderTransactionalEmail()
  -> sendEmail() via Resend
```

`server/services/transactionalEmail.ts` é o renderer comum e não sabe sobre
persistência. Serviços de domínio decidem **se** um evento merece e-mail;
eles entregam ao renderer apenas texto plano e um CTA opcional. `emailService`
continua sendo o único adaptador de provedor.

Uma evolução futura que precise retentativa/idempotência ganha uma tabela de
outbox/delivery por `eventId`; não deve tentar deduplicar por assunto ou e-mail.

## Anatomia visual

- Canvas preto e cartão grafite, seguindo a identidade dark do Cena Studio.
- Wordmark textual simples, sem imagem obrigatória para não quebrar bloqueio de
  imagens remoto.
- Label de contexto em laranja, título curto, parágrafos escaneáveis e apenas
  um botão de ação.
- Quadro de detalhes para protocolo/prazo, quando necessário.
- Nota de segurança separada do corpo principal.
- Rodapé discreto com o nome da marca e suporte quando configurado.
- Tabela de layout e CSS inline: maior compatibilidade com Gmail, Outlook,
  Apple Mail e telas pequenas. O texto puro carrega a mesma ação como fallback.

O design não usa animação, gradiente ou conteúdo essencial em imagem: esses
recursos têm suporte inconsistente em e-mail e não melhoram a tarefa do
destinatário.

## Regras de segurança

- `escapeHtml()` em todo texto dinâmico antes de interpolar HTML.
- `sanitizeActionUrl()` aceita só URLs absolutas `http:`/`https:`; CTA inválido
  desaparece do HTML e do texto.
- Assuntos são definidos pelo serviço, nunca recebem dados de usuário.
- Tokens aparecem apenas em URLs de ação válidas e com expiração definida pelo
  serviço dono do fluxo.
- E-mail de exclusão final usa o endereço capturado em memória antes da
  anonimização e não o grava de volta na conta.

## Idioma

`TransactionalEmailLocale` tem somente `pt` e `en`. Cada domínio resolve a
preferência do titular antes de chamar o template; parse inválido ou conta
legada cai em `pt`. Não há texto visível fora do dicionário do serviço.

## Configuração de ambiente

O código e a matriz são versionados pelo GitHub e seguem em cada deploy.
O envio efetivo depende de:

- `RESEND_API_KEY`
- `EMAIL_FROM` com domínio verificado na Resend
- `CLIENT_ORIGIN` para URLs de ação

Essas variáveis são configuradas no projeto Vercel, não em código nem no
repositório. O endereço `onboarding@resend.dev` serve apenas para sandbox da
conta Resend; ele não entrega para clientes externos.
