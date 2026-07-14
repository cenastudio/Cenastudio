# Documentação — Cena Studio

Esta pasta é o hub de docs internos. **A pasta `docs/` como um todo é
gitignorada** — apenas dois arquivos abaixo estão versionados
explicitamente. Notas pessoais, dumps de Notion e troubleshooting ficam
aqui sem poluir o histórico do git.

## Índice ativo (mantido em dia)

- [`design-system/touch-targets.md`](./design-system/touch-targets.md)
  — regras de acessibilidade touch (Fase 2). **Versionado.**
- [`white-label/setup-guide.md`](./white-label/setup-guide.md)
  — guia do operador para rebrand por env vars (Fase 3). **Versionado.**
- [`features-criticas/setup-guide.md`](./features-criticas/setup-guide.md)
  — guia de setup do Google Calendar Sync. **Versionado.**
- [`features-criticas/user-guide.md`](./features-criticas/user-guide.md)
  — guia do usuário para as features críticas. **Versionado.**

## Arquivo (referência histórica, gitignored)

- [`history/`](./history/) — MDs de status/checklist/planejamento das
  fases 0-3 movidos do root em 09-jul-2026 durante a limpeza. Referência
  apenas — não são fonte de verdade sobre o estado atual.
- [`troubleshooting/2026-07-deploy/`](./troubleshooting/2026-07-deploy/)
  — notas de investigação de deploy Railway/Supabase (julho/2026). Ver
  README dessa pasta para o índice.
- [`archive/notion-dump-2026-07/`](./archive/notion-dump-2026-07/) —
  export do Notion antigo (`🏠 Cena Studio.md`, `Ferramentas IA.md`,
  `PLAN_SYSTEM.md`, etc.). Manter como referência; conteúdo pode estar
  desatualizado.
- [`archive/`](./archive/) (`AUDIT.md`, `Framework Integrado - StorySelling…`,
  `MANUAL_ACTIONS.md`, `TODO_MELHORIAS.md`) — arquivos originais do arquivo.

## Fonte de verdade sobre o projeto

Nada aqui é "a documentação oficial". Fonte de verdade viva:

- Visão geral do projeto: [`../README.md`](../README.md)
- Arquitetura: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Deploy: [`../DEPLOY.md`](../DEPLOY.md)
- API: [`../API_GUIDE.md`](../API_GUIDE.md)
- Como o sistema funciona: [`../COMO-O-SISTEMA-FUNCIONA.md`](../COMO-O-SISTEMA-FUNCIONA.md)
- Segurança: [`../SECURITY.md`](../SECURITY.md)
- Changelog: [`../CHANGELOG.md`](../CHANGELOG.md)
- Specs formais: [`../.kiro/specs/`](../.kiro/specs/)

Se algum arquivo neste `docs/` conflita com algum dos acima, os do root
vencem.
