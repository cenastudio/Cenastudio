# Storyboard IA conectado ao Shot List — Tasks

## Fase G0 — contrato de produto

- [x] G0.1 Criar spec com requirements, design e tasks.
- [x] G0.2 Fixar decisão: Storyboard IA é extensão do Shot List, não ferramenta escondida.
- [x] G0.3 Registrar no `docs/STATUS.md` que a spec existe e qual é o próximo corte.

## Fase G1 — base de dados e contrato backend

- [x] G1.1 Adicionar model `ShotStoryboardFrame` em `prisma/schema.prisma`.
- [x] G1.2 Criar migration SQL para Postgres e garantir fallback SQLite em `server/models/db.ts`.
- [x] G1.3 Adicionar relações reversas em `User`, `Project` e `Shot`.
- [x] G1.4 Criar `shotStoryboardService` com ownership, list, create failed/generated, approve e delete.
- [x] G1.5 Criar testes de service cobrindo isolamento entre produtoras, revisão e approve atualizando `shots.thumbnail_url`.
- _2026-08-22: G1 concluído com `ShotStoryboardFrame`, migration `20260822145000_add_shot_storyboard_frames`, fallback SQLite, service backend e teste `server/services/shotStoryboardService.test.ts`._

## Fase G2 — adapter de imagem

- [x] G2.1 Criar `imageGenerationService` com interface provider-agnostic.
- [x] G2.2 Implementar modo explicitamente indisponível quando env de imagem não existe.
- [x] G2.3 Definir provider inicial somente quando houver credencial/decisão.
- [x] G2.4 Sanitizar erro de provider e registrar status `failed` sem secret.
- _2026-08-22: adapter criado em `imageGenerationService`. Sem `STORYBOARD_IMAGE_PROVIDER`, geração retorna 503 explícito e o service registra frame `failed` com erro sanitizado. Provider real definido depois como `openrouter`; há `mock` apenas para test/local e bloqueado em produção._
- _2026-08-22: G2.3 concluído com OpenRouter Images (`/api/v1/images`) e modelo padrão configurável `google/gemini-3.1-flash-lite-image`, usando `STORYBOARD_IMAGE_API_KEY` ou fallback em `OPENROUTER_API_KEY`._

## Fase G3 — rotas

- [x] G3.1 Adicionar rotas em `/api/shotlists/shots/:id/storyboard`.
- [x] G3.2 Aplicar `authenticate` + `requireStudioPlan("shotList")`.
- [x] G3.3 Testar 401/402/404, geração sem provider, aprovação e tenant isolation.
- _2026-08-22: endpoints criados sob `/api/shotlists`: list, generate, approve e delete. O gate fica herdado de `routes/shotlists.ts` (`authenticate` + `requireStudioPlan("shotList")`). Testes focais: `shotStoryboardService.test.ts` e `shotStoryboardController.test.ts`._

## Fase G4 — UI no Shot List

- [x] G4.1 Adicionar botão de storyboard no row do shot.
- [x] G4.2 Criar dialog responsivo para prompt, preview, histórico e aprovação.
- [x] G4.3 Mostrar estado por shot: sem quadro, gerando, gerado, aprovado, falhou.
- [x] G4.4 Garantir PT/EN em todas as strings novas.
- [x] G4.5 Testar mobile sem carrossel horizontal obrigatório.
- _2026-08-22: UI integrada à página `ShotList.tsx` com botão por shot, dialog de storyboard, histórico de revisões, geração e aprovação atualizando thumbnail local. API client e mocks atualizados. Testes focais: `client/src/test/ShotList.test.tsx` e `tests/e2e/shotlist-storyboard-mobile.spec.ts`. Validação G4.5 passou em viewport mobile Chromium, sem overflow horizontal obrigatório no conteúdo do Shot List/dialog, com touch targets >=44px no dialog e screenshot local `tmp/g4-shotlist-storyboard-mobile.png`._

## Fase G5 — exportação

- [x] G5.1 Incluir frame aprovado no PDF do Shot List.
- [x] G5.2 Manter fallback textual quando imagem não carregar.
- [x] G5.3 Testar PDF com e sem imagens aprovadas.
- _2026-08-22: exportação PDF usa a `thumbnail_url` atualizada pela aprovação do storyboard para embutir a referência visual aprovada. Quando a imagem não carrega, o PDF continua sendo gerado com fallback textual. Teste focal: `server/services/shotListPdfExport.test.ts`._

## Fase G6 — limites e produção

- [x] G6.1 Definir quota mensal por plano.
- [x] G6.2 Bloquear geração quando quota estourar sem criar frame fantasma.
- [ ] G6.3 Validar storage em staging/produção.
- [x] G6.4 Atualizar `docs/STATUS.md` com provider, envs e limitações reais.
- _2026-08-22: quotas mensais definidas em `shared/planEntitlements.ts`: Free 0, Pro 25, Studio 100, White Label 300, Enterprise/admin ilimitado. O service bloqueia antes de chamar provider e antes de criar frame quando a quota acabou. Teste focal: `server/services/shotStoryboardService.test.ts`._
- _2026-08-22: `.env.example`, `docs/CONEXOES.md` e `docs/STATUS.md` agora documentam o estado real: OpenRouter Images é o provider inicial; storage default usa bucket público `SUPABASE_STORYBOARD_BUCKET`, com Cloudflare R2 implementado como opção. G6.3 segue aberta até smoke real em staging/produção; o endpoint R2 informado falhou no handshake TLS._
- _2026-08-22: G6.3 foi tentada em produção no deploy Ready de `cena-studio-prod.vercel.app`. O endpoint autenticado chegou ao provider, mas OpenRouter Images retornou 402 `Insufficient credits` em chamada direta com a env ativa. Repetir smoke real depois de adicionar créditos OpenRouter ou trocar para provider de imagem com quota disponível._
