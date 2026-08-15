# AGENTS.md — Constituição operacional do Cena Studio

> Leia este arquivo por completo no início de **toda** sessão de
> trabalho neste repositório, antes de ler qualquer spec ou tocar em
> qualquer código. Em caso de conflito entre este arquivo e um spec
> antigo, este arquivo vence.
>
> Depois deste arquivo, leia `docs/CONEXOES.md` antes de mexer em deploy,
> banco, Supabase, Vercel, variáveis de ambiente, login social, storage,
> IA ou qualquer integração externa.

## Por que este arquivo existe
Este projeto já acumulou 103 arquivos `.md`, boa parte deles relatórios
de status que se contradizem, alguns dentro do próprio código-fonte,
e um `.env.example` que ficou incompleto em relação ao código real. Isso
não é falta de esforço — é falta de regras de contenção. Este arquivo é
essas regras.

O objetivo não é "ter mais processo". É o oposto: gastar menos contexto
por tarefa, terminar cada tarefa de verdade antes de abrir a próxima, e
nunca mais depender de memória entre sessões pra saber o que já foi
decidido.

---

## As três lentes de decisão

Não são personas para simular — são três perguntas que toda mudança
de código relevante precisa responder antes de ser considerada pronta.
Se a resposta a qualquer uma for "não sei", a tarefa não está pronta.

**1. Lente de arquitetura/produto** — Essa decisão está registrada em
algum ADR de `ARCHITECTURE.md`? Se é uma decisão nova relevante
(trade-off real, não detalhe de implementação), ela precisa virar um
ADR novo lá, não um comentário perdido no código ou um `.md` solto.

**2. Lente de engenharia** — Existe teste cobrindo isso? Rodou
`npm run check && npm run test`? Se a mudança toca em rota/autenticação,
ela segue o padrão existente (`router.use(authenticate, ...)`) em vez
de inventar um novo?

**3. Lente de design/UX** — Essa tela usa os tokens de
`design-system/tokens` (nada de hex direto)? Se envolve navegação, ela
segue o princípio de "um nível de hierarquia visualmente dominante por
vez" (ver `docs/DESIGN_PATTERNS.md`)? Funciona em mobile de verdade —
foi checado, não assumido?

---

## Regras de documentação (a parte que mais quebrou até agora)

1. **Não crie um novo arquivo de status.** Nunca crie
   `*_COMPLETION.md`, `*_SUMMARY.md`, `*_AUDIT.md`, `*_REPORT.md`,
   `*_PROGRESS.md`. Se uma tarefa terminou, atualize `docs/STATUS.md`
   (documento único, sempre o mesmo arquivo). Se não existir, crie-o
   uma vez — não recrie depois.
2. **Nenhum `.md` de status vive dentro de `client/src/` ou `server/`.**
   Código-fonte não guarda relatório. Documentação de decisão de
   arquitetura vai em `ARCHITECTURE.md`; documentação de uso de um
   componente/util vai em um `README.md` da própria pasta, sem data,
   sem "concluído em", sem status de tarefa.
3. **Documento superado é arquivado, não deixado no lugar.** Se um novo
   documento substitui informação de um antigo, mova o antigo para
   `.kiro/archive/AAAA-MM/` no mesmo commit. Nunca deixe dois
   documentos afirmando coisas diferentes sobre o mesmo assunto.
4. **Specs em `.kiro/specs/<nome>/` seguem o formato existente**
   (`requirements.md` + `design.md` + `tasks.md`) — não crie variação
   nova de estrutura. Quando um spec termina, seu `tasks.md` fica com
   tudo marcado, e o essencial que sobreviver vai para `docs/STATUS.md`
   ou `ARCHITECTURE.md`. O spec em si pode ficar como histórico, mas
   não precisa gerar mais nenhum arquivo de resumo separado.

---

## Regra de "pronto" (verificação antes de declarar sucesso)

Nunca escreva "✅ concluído", "pronto para deploy" ou equivalente sem:
- Rodar os comandos relevantes (`npm run check`, `npm run test`,
  `npx playwright test` quando a mudança tocar em UI) e mostrar o
  resultado real, não assumido.
- Confirmar contra um critério de aceite explícito escrito antes de
  começar a tarefa (todo spec novo deve ter isso — se não tiver,
  escreva antes de codificar).
- Se algo não pôde ser verificado (ex.: falta de acesso a produção),
  dizer isso explicitamente em vez de declarar sucesso por omissão.

---

## Regra de escopo por sessão

- Uma frente de trabalho por vez até fechar. Não abrir 3 specs em
  paralelo "pra adiantar" — isso é o que historicamente gerou os 22
  relatórios de status conflitantes.
- Tarefas grandes (uma fase inteira de um spec) devem ser quebradas em
  sub-tarefas menores, cada uma terminável dentro de uma sessão, com
  checkpoint de confirmação antes de seguir pra próxima — como já é
  feito em `fase-2-layout-mobile-e-tabs-OK/tasks.md`, que é o padrão de
  referência a seguir.
- Antes de abrir um arquivo grande de contexto (um audit antigo, um
  diagnóstico de deploy passado), pergunte-se: isso ainda é verdade?
  Prefira ler `docs/STATUS.md` e `ARCHITECTURE.md` a reler relatórios
  históricos, a menos que a tarefa seja especificamente sobre
  entender um incidente passado.

---

## Mapa de skills (`.kiro/skills/`)

Use estas skills quando o gatilho descrito bater com a tarefa atual.
Não é preciso ler todas — leia a que casa com o problema.

| Skill | Quando usar |
|---|---|
| `database-connectivity.md` | Qualquer problema de conexão com Postgres/Prisma, timeout, pool de conexões |
| `prisma.md` | Migrations, schema, queries Prisma |
| `deployment-validation.md` | Antes de declarar um deploy pronto/validado |
| `vercel-deploy-fixer.md` / `vercel-serverless.md` | Problemas específicos de deploy na Vercel. Produção atual é Vercel + Supabase; Railway é histórico/legado. |
| `fix-deploy-now.md` | Incidente de deploy quebrado em produção, ação imediata |
| `debug-production.md` | Bug reproduzido apenas em produção |
| `build-system.md` / `bundling.md` | Erros de build, esbuild/Vite, problemas de bundle |
| `module-resolution.md` | Erros de import/resolução de módulo |
| `systematic-debugging.md` / `root-cause-analysis.md` | Bug difícil de reproduzir, precisa de método antes de tentar corrigir |
| `seo-specialist.md` | Qualquer tarefa envolvendo meta tags, indexação, SEO técnico |
| `MASTER-DIAGNOSTICO-COMPLETO.md` | Registro histórico de um incidente de deploy de julho de 2026. Consulte apenas para investigar aquele contexto; `docs/CONEXOES.md` e as skills de deploy são a fonte operacional atual. |

Se uma tarefa nova precisar de um tipo de expertise que nenhuma skill
cobre, crie uma skill nova em `.kiro/skills/` (curta, focada em
gatilho de uso) e adicione uma linha nesta tabela no mesmo commit —
não deixe a skill órfã sem entrada aqui.

---

## Fila de próximas tarefas

A fila de trabalho ativa vive em `docs/STATUS.md`, seção "Próximas
tarefas" — não neste arquivo, e não em `IMPLEMENTATION_QUEUE.md` (esse
arquivo antigo deve ser arquivado na Fase 0 de limpeza). Ordem de
execução combinada:

1. `.kiro/specs/00-fundacao-limpeza-e-documentacao-OK/` (limpeza,
   `.env.example`, `docs/CONEXOES.md`, `docs/STATUS.md`) — **pré-requisito
   de tudo abaixo.**
2. `.kiro/specs/auditoria-ux-<data>/` (achados de navegação mobile,
   hierarquia visual, design tokens, SEO dinâmico — ver spec entregue
   separadamente).
3. Dali em diante, toda nova frente de trabalho vira uma pasta nova em
   `.kiro/specs/<nome-curto>/` com `requirements.md` + `design.md` +
   `tasks.md`, referenciada em `docs/STATUS.md`.
