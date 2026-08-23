# Arquitetura de descoberta e jornada

## Objetivo

Fazer o Cena deixar de parecer uma coleção de módulos escondidos e passar a se
comportar como uma operação guiada. A interface deve mostrar sempre onde o
usuário está, o que existe no produto e qual próximo passo faz sentido.

## Critérios de aceite

1. A navegação principal deve expor a jornada operacional:
   `Comercial -> Projeto -> Produção -> Aprovação -> Entrega -> Financeiro`.
2. O Dashboard e o Hub do Projeto devem mostrar próximas ações contextuais antes
   de painéis secundários.
3. O usuário deve conseguir descobrir os módulos principais sem depender apenas
   de menu "Mais", command palette ou memória.
4. Comercial deve contar o fluxo `Lead -> Cliente -> Oportunidade -> Proposta ->
   Aceite -> Job`.
5. Documentos deve ser apresentado como fluxo guiado, não como editor gigante
   indiferenciado, especialmente no mobile.
6. O Portal do Cliente deve destacar pendências do cliente antes de listas.
7. Rotas mobile auditadas não podem gerar overflow horizontal em 390px.
8. Fallback local SQLite usado por E2E/auditoria deve carregar Shot List,
   Arquivos e Portal sem 500 nos endpoints principais.
