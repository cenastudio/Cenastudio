# Tasks — Fase 0: Fundação

> **Regra:** Trabalhe em ordem. Ao final de cada etapa, poste um resumo curto na conversa (não um novo arquivo `.md`) do que foi arquivado/consolidado, para aprovação antes de seguir.

## Etapa 1 — Inventário

- [x] 1.1. Rodar `find . -name "*.md" -not -path "*/node_modules/*" | sort` e gerar lista completa
  - Resultado: 169 arquivos (linha de base do diagnóstico era 103)
- [x] 1.2. Classificar cada arquivo em: CANÔNICO / HISTÓRICO / DUPLICADO/SUPERADO / LIXO DE CÓDIGO-FONTE
- [x] 1.3. Produzir tabela (na conversa, não em arquivo) com a classificação
  - 52 candidatos a arquivamento: 7 em código-fonte, 7 em `.kiro/specs/` raiz, 20 em features-criticas, 8 em `docs/`, 3 na raiz, 7 em auditoria-ux-2026-07
- [x] 1.4. Aguardar aprovação antes de seguir
## Etapa 2 — Consolidação

- [x] 2.1. Extrair decisões de arquitetura válidas dos documentos HISTÓRICO/DUPLICADO
  - 20 relatórios de features-criticas processados; 2 decisões reais encontradas
- [x] 2.2. Mesclar em `ARCHITECTURE.md` (formato ADR existente)
  - ADR-011 (deny-list de JWT, Aceito), ADR-012 (dois domínios de auth, Proposed),
    ADR-008 marcado `Superseded by ADR-011`
- [x] 2.3. Criar `docs/STATUS.md` (se não existir) consolidando estado atual de features
- [x] 2.4. Revisar/atualizar `docs/DESIGN_PATTERNS.md` (se existir)
  - Fonte de tokens, exceções para hex direto, hierarquia visual e validação
    mobile documentadas em 2026-08-14
- [x] 2.5. Mover documentos HISTÓRICO/DUPLICADO/LIXO para `.kiro/archive/2026-07/`
  - 65 arquivos arquivados (46 no lote 1 + 19 no lote 2)
- [x] 2.6. Aguardar aprovação antes de seguir

## Etapa 3 — Variáveis de ambiente

- [x] 3.1. Rodar diff entre `process.env.X` referenciadas no código vs `.env.example`
  - 79 referenciadas no código (incluindo `import.meta.env.VITE_*`) vs 62 declaradas
- [x] 3.2. Adicionar ao `.env.example` todas as variáveis faltantes com comentários
  - 26 adicionadas; bloco WHITE LABEL duplicado removido (12 chaves em dobro);
    `DATABASE_URL` ativada e o comentário "Production: Supabase Postgres" corrigido
- [x] 3.3. Criar/atualizar `docs/CONEXOES.md` documentando:
  - [x] Banco de produção (Railway Postgres) e como conectar
  - [x] O que Supabase faz e não faz (linkar `ARCHITECTURE.md`)
  - [x] Cloudinary, Stripe, Resend, provedores de IA
  - [x] Como validar configuração (`npm run validate:env`)
- [x] 3.4. Confirmar `.env` e `.env.local` no `.gitignore`
- [x] 3.5. Aguardar aprovação antes de seguir

## Etapa 4 — Documentação de entrada

- [x] 4.1. Revisar `README.md` — features listadas batem com código real
  - Produção atual corrigida para Vercel + Supabase, lista de áreas alinhada
    com `docs/STATUS.md` e links canônicos adicionados
- [x] 4.2. Revisar `COMO-O-SISTEMA-FUNCIONA.md` — mesma checagem
  - Documento reescrito como mapa operacional atual: GitHub → Vercel →
    Supabase, com Railway marcado como legado
- [x] 4.3. Revisar `API_GUIDE.md` — conferir contra `server/router.ts`
  - Base URL corrigida; rotas públicas e mapa de rotas reais conferidos contra
    `server/router.ts`, `server/routes/*` e webhook Stripe em `server/app.ts`
- [x] 4.4. Aguardar aprovação antes de seguir
  - Aprovado pelo operador na conversa ao pedir execução desta frente

## Etapa 5 — AGENTS.md

- [x] 5.1. Confirmar que `AGENTS.md` está na raiz (já está segundo fileTree)
- [x] 5.2. Ajustar se necessário para nuances específicas do repo
  - `AGENTS.md` já instrui ler `docs/CONEXOES.md` antes de tarefas de deploy,
    banco, Supabase, Vercel, env vars, login social, storage, IA e integrações
- [x] 5.3. Documentar em `docs/STATUS.md` que Fase 0 foi concluída

## Verificação final

- [x] Rodar checklist de "pronto":
  - [x] Nenhum `.md` de status/conclusão dentro de `client/src/` ou `server/`
  - [x] `.kiro/specs/` só contém specs ativos ou arquivados
  - [x] `docs/STATUS.md` existe e é único lugar de declaração de status
  - [x] `.env.example` cobre 100% das variáveis usadas no código
  - [x] `docs/CONEXOES.md` existe e permite reconectar sistema do zero
  - [x] `AGENTS.md` na raiz
