# Design — Fase 0: Fundação

## Abordagem

Trabalhar em 5 etapas sequenciais, com aprovação entre cada uma antes de seguir. Nada será deletado de forma irreversível — tudo vai para `.kiro/archive/AAAA-MM/` primeiro.

## Etapas

### Etapa 1 — Inventariar e classificar todo `.md` do repo

Rodar:
```bash
find . -name "*.md" -not -path "*/node_modules/*" | sort
```

Classificar cada arquivo em:

- **CANÔNICO** — documento vivo que deve continuar existindo e sendo atualizado (ex.: `README.md`, `ARCHITECTURE.md`, `DEPLOY.md`, `CHANGELOG.md`, specs ainda ativos)
- **HISTÓRICO** — relatório de tarefa/sprint específica já encerrada, tem valor histórico mas não de manutenção contínua (ex.: `TASK_*_COMPLETION.md`, `*_SUMMARY.md`)
- **DUPLICADO/SUPERADO** — diz a mesma coisa que outro documento mais recente, ou foi invalidado por mudança posterior
- **LIXO DE CÓDIGO-FONTE** — qualquer `.md` de conclusão/verificação dentro de `client/src/` ou `server/`

### Etapa 2 — Consolidar em documentos canônicos únicos

Extrair informação ainda **verdadeira e útil** dos documentos HISTÓRICO/DUPLICADO e mesclar nos canônicos:

- Decisões de arquitetura ainda válidas → `ARCHITECTURE.md` (formato ADR)
- Estado atual real de features → `docs/STATUS.md` único (criar se não existir)
- Padrões de design/UX decididos → `docs/DESIGN_PATTERNS.md` (revisar se existe)

### Etapa 3 — Backup e documentação completa de variáveis de ambiente

1. Diff entre todas as `process.env.X` no código e `.env.example`
2. Adicionar todas as variáveis faltantes com comentários: pra que serve, se é obrigatória, onde conseguir
3. Criar/atualizar `docs/CONEXOES.md` documentando:
   - Banco de produção (Railway Postgres) e como conectar
   - O que Supabase faz e não faz
   - Cloudinary, Stripe, Resend, provedores de IA: onde vivem as credenciais e como testar
4. Confirmar que `.env` e `.env.local` estão no `.gitignore`

### Etapa 4 — Corrigir documentação "de cara" do projeto

Revisar (não recriar):
- `README.md` — lista de features bate com código real
- `COMO-O-SISTEMA-FUNCIONA.md` — mesma checagem
- `API_GUIDE.md` — conferir contra rotas reais de `server/router.ts`

### Etapa 5 — `AGENTS.md` na raiz

Confirmar que `AGENTS.md` está na raiz e ajustar se necessário para nuances específicas do repo.

## Princípios de design

- **Não delete, arquive** — mover para `.kiro/archive/AAAA-MM/`
- **Um documento por propósito** — fim dos `*_COMPLETION.md` múltiplos
- **Código-fonte não guarda relatório** — zero `.md` de status em `client/src/` ou `server/`
- **Documentação como código** — sempre atualizar o canônico, nunca criar relatório novo
