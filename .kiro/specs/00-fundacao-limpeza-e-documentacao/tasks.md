# Tasks — Fase 0: Fundação

> **Regra:** Trabalhe em ordem. Ao final de cada etapa, poste um resumo curto na conversa (não um novo arquivo `.md`) do que foi arquivado/consolidado, para aprovação antes de seguir.

## Etapa 1 — Inventário

- [x] 1.1. Rodar `find . -name "*.md" -not -path "*/node_modules/*" | sort` e gerar lista completa
  - Resultado: 169 arquivos (linha de base do diagnóstico era 103)
- [x] 1.2. Classificar cada arquivo em: CANÔNICO / HISTÓRICO / DUPLICADO/SUPERADO / LIXO DE CÓDIGO-FONTE
- [x] 1.3. Produzir tabela (na conversa, não em arquivo) com a classificação
  - 52 candidatos a arquivamento: 7 em código-fonte, 7 em `.kiro/specs/` raiz, 20 em features-criticas, 8 em `docs/`, 3 na raiz, 7 em auditoria-ux-2026-07
- [ ] 1.4. Aguardar aprovação antes de seguir

## Etapa 2 — Consolidação

- [ ] 2.1. Extrair decisões de arquitetura válidas dos documentos HISTÓRICO/DUPLICADO
- [ ] 2.2. Mesclar em `ARCHITECTURE.md` (formato ADR existente)
- [ ] 2.3. Criar `docs/STATUS.md` (se não existir) consolidando estado atual de features
- [ ] 2.4. Revisar/atualizar `docs/DESIGN_PATTERNS.md` (se existir)
- [ ] 2.5. Mover documentos HISTÓRICO/DUPLICADO/LIXO para `.kiro/archive/2026-07/`
- [ ] 2.6. Aguardar aprovação antes de seguir

## Etapa 3 — Variáveis de ambiente

- [ ] 3.1. Rodar diff entre `process.env.X` referenciadas no código vs `.env.example`
- [ ] 3.2. Adicionar ao `.env.example` todas as variáveis faltantes com comentários (incluindo as 19 identificadas)
- [ ] 3.3. Criar/atualizar `docs/CONEXOES.md` documentando:
  - [ ] Banco de produção (Railway Postgres) e como conectar
  - [ ] O que Supabase faz e não faz (linkar `ARCHITECTURE.md`)
  - [ ] Cloudinary, Stripe, Resend, provedores de IA
  - [ ] Como validar configuração (`npm run validate:env`)
- [ ] 3.4. Confirmar `.env` e `.env.local` no `.gitignore`
- [ ] 3.5. Aguardar aprovação antes de seguir

## Etapa 4 — Documentação de entrada

- [ ] 4.1. Revisar `README.md` — features listadas batem com código real
- [ ] 4.2. Revisar `COMO-O-SISTEMA-FUNCIONA.md` — mesma checagem
- [ ] 4.3. Revisar `API_GUIDE.md` — conferir contra `server/router.ts`
- [ ] 4.4. Aguardar aprovação antes de seguir

## Etapa 5 — AGENTS.md

- [ ] 5.1. Confirmar que `AGENTS.md` está na raiz (já está segundo fileTree)
- [ ] 5.2. Ajustar se necessário para nuances específicas do repo
- [ ] 5.3. Documentar em `docs/STATUS.md` que Fase 0 foi concluída

## Verificação final

- [ ] Rodar checklist de "pronto":
  - [ ] Nenhum `.md` de status/conclusão dentro de `client/src/` ou `server/`
  - [ ] `.kiro/specs/` só contém specs ativos ou arquivados
  - [ ] `docs/STATUS.md` existe e é único lugar de declaração de status
  - [ ] `.env.example` cobre 100% das variáveis usadas no código
  - [ ] `docs/CONEXOES.md` existe e permite reconectar sistema do zero
  - [ ] `AGENTS.md` na raiz
