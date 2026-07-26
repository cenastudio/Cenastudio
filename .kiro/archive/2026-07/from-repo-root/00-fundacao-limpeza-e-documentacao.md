# Fase 0 — Fundação: limpar, consolidar e proteger o que existe

> Cole isto no Claude Code **antes** de qualquer outra spec (inclusive
> antes de `spec-auditoria-ux-cena-studio.md`). Esta fase não adiciona
> nada — ela impede que o trabalho seguinte vire mais um documento
> perdido no meio dos outros 50.

## Por que esta fase existe
O repo tem **103 arquivos `.md`** fora de `node_modules`. Só
`.kiro/specs/` tem 50 (956 KB), e pelo menos 22 são relatórios de status
(`*_COMPLETION.md`, `*_SUMMARY.md`, `*_AUDIT*`, `*_REPORT.md`) que se
contradizem entre si — um de janeiro de 2025 diz "sistema 95%
funcional", outro de julho de 2026 diz "pronto para deploy", nenhum foi
atualizado depois de escrito. Tem até relatório de tarefa concluída
**dentro do código-fonte** (`client/src/components/base/*_COMPLETION.md`,
`client/src/pages/HOME_DASHBOARD_COMPLETION.md`). E o `.env.example` está
incompleto: 19 variáveis usadas de verdade no código não estão nele,
incluindo `DATABASE_URL`, `DATABASE_POOL_MAX` (a mesma variável do
incidente de conexão travada documentado em `ARCHITECTURE.md`) e
`SUPABASE_SERVICE_ROLE_KEY`.

Isso é a causa raiz de sessões de IA perderem decisões e gastarem
contexto à toa: cada sessão nova que varre `.kiro/` ou `client/src/`
carrega dezenas de KB de relatórios stale e contraditórios antes mesmo
de chegar no código.

## Regra de execução desta fase
Trabalhe em ordem. Ao final de cada etapa, poste um resumo curto (não
um novo arquivo `.md` de relatório — só texto na conversa) do que foi
arquivado/consolidado, para eu aprovar antes de seguir para a próxima
etapa. **Não delete nada de forma irreversível sem eu confirmar** — mova
para `.kiro/archive/AAAA-MM/` em vez de `rm`, pelo menos nesta primeira
passada.

---

## Etapa 1 — Inventariar e classificar todo `.md` do repo
Rodar:
```bash
find . -name "*.md" -not -path "*/node_modules/*" | sort
```
Para cada arquivo, classificar em uma de 4 categorias e produzir uma
tabela (na resposta, não em arquivo novo):

- **CANÔNICO** — documento vivo que deve continuar existindo e sendo
  atualizado (ex.: `README.md`, `ARCHITECTURE.md`, `DEPLOY.md`,
  `CHANGELOG.md`, specs ainda ativos como `dre-por-projeto/`).
- **HISTÓRICO** — relatório de uma tarefa/sprint específica já
  encerrada, sem valor de manutenção contínua, mas com valor de
  histórico (ex.: `TASK_*_COMPLETION.md`, `*_SUMMARY.md` de fases já
  concluídas). Vai para `.kiro/archive/`.
- **DUPLICADO/SUPERADO** — diz a mesma coisa que outro documento mais
  recente, ou foi invalidado por mudança posterior (ex.:
  `SYSTEM_AUDIT_SUMMARY.md` de jan/2025 quando existe informação mais
  atual em outro lugar). Vai para `.kiro/archive/` também, mas marcado
  como superado por qual documento.
- **LIXO DE CÓDIGO-FONTE** — qualquer `.md` de conclusão/verificação
  vivendo dentro de `client/src/` ou `server/`. Sempre vira HISTÓRICO,
  nunca fica onde está — código-fonte não é lugar de relatório de
  status.

## Etapa 2 — Consolidar em documentos canônicos únicos
Depois de classificar, ao invés de simplesmente arquivar o resto, extrair
qualquer informação ainda **verdadeira e útil** dos documentos
HISTÓRICO/DUPLICADO e mesclar nos canônicos certos:

- Decisões de arquitetura ainda válidas → `ARCHITECTURE.md` (formato
  ADR já usado lá).
- Estado atual real de features (o que está implementado, o que não
  está) → um novo `docs/STATUS.md` único, que passa a ser o **único**
  lugar onde "o que está pronto" é declarado. Proibido criar
  `*_COMPLETION.md`/`*_SUMMARY.md` novo depois disso — atualizar este
  arquivo.
- Padrões de design/UX já decididos → `docs/DESIGN_PATTERNS.md`
  (já existe — revisar se está atualizado, não criar um novo).

## Etapa 3 — Backup e documentação completa de variáveis de ambiente
1. Rodar um diff entre todas as `process.env.X` referenciadas no código
   (`server/`, `shared/`, `client/src/`) e o `.env.example` atual.
   Adicionar ao `.env.example` **todas** as variáveis que faltam,
   incluindo as identificadas nesta auditoria:
   `ADMIN_REQUIRE_2FA`, `DATABASE_CONNECT_TIMEOUT_MS`,
   `DATABASE_IDLE_TIMEOUT_MS`, `DATABASE_POOL_MAX`,
   `DATABASE_TRANSIENT_RETRIES`, `DATABASE_URL`,
   `LGPD_DELETE_GRACE_DAYS`, `LOG_LEVEL`, `MAX_UPLOAD_SIZE_MB`,
   `MAX_VIDEO_SIZE_MB`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`,
   `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_STUDIO_ANNUAL`,
   `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_STORAGE_BUCKET`.
   Cada variável precisa de um comentário dizendo: pra que serve, se é
   obrigatória ou opcional, e onde conseguir o valor (já existe esse
   padrão pra outras vars no arquivo — seguir o mesmo).
2. Criar (ou atualizar, se já existir conteúdo equivalente em
   `DEPLOY.md`) um documento único `docs/CONEXOES.md` respondendo, em
   linguagem direta:
   - Qual é o banco de produção hoje, exatamente (Railway Postgres —
     confirmar nome do serviço/projeto atual), e como conectar nele a
     partir de fora (ex.: para rodar uma query manual).
   - O que o Supabase ainda faz (storage de arquivo, auth social
     opcional) e o que ele **não** faz mais (não é mais o banco
     principal) — isso já está em `ARCHITECTURE.md`, então aqui é
     linkar, não duplicar.
   - Cloudinary, Stripe, Resend, provedores de IA (OpenRouter/
     Anthropic/NVIDIA): onde cada credencial vive, como testar se está
     configurado corretamente (`npm run validate:env` já existe —
     confirmar que cobre as vars novas do passo anterior).
   - **Isto é o documento que você abre se perder acesso a tudo e
     precisar reconectar o sistema do zero.** Escrever pensando nesse
     cenário, não em quem já conhece o sistema.
3. **Não commitar nenhum valor real de segredo** — só nomes de
   variáveis, onde obter, e como validar. Confirmar que `.env` e
   `.env.local` seguem no `.gitignore`.

## Etapa 4 — Corrigir a documentação "de cara" do projeto
Revisar (não recriar do zero) os documentos que descrevem o sistema pra
quem chega agora:
- `README.md` — confirmar que a lista de features bate com o que
  existe hoje no código (ex.: DRE por projeto, adicionado em
  20260724, provavelmente ainda não está descrito lá).
- `COMO-O-SISTEMA-FUNCIONA.md` — mesma checagem.
- `API_GUIDE.md` — conferir contra as rotas reais de `server/router.ts`.

## Etapa 5 — `AGENTS.md` na raiz
Usar o arquivo `AGENTS.md` (entregue junto com esta spec) como está,
ajustando apenas se algo específico do repo precisar de nuance que eu
não tenha visto de fora. Este arquivo passa a ser lido no início de
toda sessão de trabalho no Cena Studio a partir de agora.

## Critério de "pronto" desta fase
- Nenhum `.md` de status/conclusão dentro de `client/src/` ou `server/`.
- `.kiro/specs/` só contém specs de trabalho ativo ou arquivado em
  `.kiro/archive/` — nenhum relatório solto competindo por atenção.
- `docs/STATUS.md` existe e é o único lugar que declara o que está
  pronto/em progresso.
- `.env.example` cobre 100% das variáveis usadas no código.
- `docs/CONEXOES.md` existe e uma pessoa nova conseguiria reconectar o
  sistema do zero só com ele.
- `AGENTS.md` está na raiz e será lido por qualquer sessão futura.

Só depois disso: seguir para `spec-auditoria-ux-cena-studio.md`.
