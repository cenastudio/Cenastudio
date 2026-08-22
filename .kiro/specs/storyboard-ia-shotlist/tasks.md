# Storyboard IA conectado ao Shot List — Tasks

## Fase G0 — contrato de produto

- [x] G0.1 Criar spec com requirements, design e tasks.
- [x] G0.2 Fixar decisão: Storyboard IA é extensão do Shot List, não ferramenta escondida.
- [x] G0.3 Registrar no `docs/STATUS.md` que a spec existe e qual é o próximo corte.

## Fase G1 — base de dados e contrato backend

- [ ] G1.1 Adicionar model `ShotStoryboardFrame` em `prisma/schema.prisma`.
- [ ] G1.2 Criar migration SQL para Postgres e garantir fallback SQLite em `server/models/db.ts`.
- [ ] G1.3 Adicionar relações reversas em `User`, `Project` e `Shot`.
- [ ] G1.4 Criar `shotStoryboardService` com ownership, list, create failed/generated, approve e delete.
- [ ] G1.5 Criar testes de service cobrindo isolamento entre produtoras, revisão e approve atualizando `shots.thumbnail_url`.

## Fase G2 — adapter de imagem

- [ ] G2.1 Criar `imageGenerationService` com interface provider-agnostic.
- [ ] G2.2 Implementar modo explicitamente indisponível quando env de imagem não existe.
- [ ] G2.3 Definir provider inicial somente quando houver credencial/decisão.
- [ ] G2.4 Sanitizar erro de provider e registrar status `failed` sem secret.

## Fase G3 — rotas

- [ ] G3.1 Adicionar rotas em `/api/shotlists/shots/:id/storyboard`.
- [ ] G3.2 Aplicar `authenticate` + `requireStudioPlan("shotList")`.
- [ ] G3.3 Testar 401/402/404, geração sem provider, aprovação e tenant isolation.

## Fase G4 — UI no Shot List

- [ ] G4.1 Adicionar botão de storyboard no row do shot.
- [ ] G4.2 Criar dialog responsivo para prompt, preview, histórico e aprovação.
- [ ] G4.3 Mostrar estado por shot: sem quadro, gerando, gerado, aprovado, falhou.
- [ ] G4.4 Garantir PT/EN em todas as strings novas.
- [ ] G4.5 Testar mobile sem carrossel horizontal obrigatório.

## Fase G5 — exportação

- [ ] G5.1 Incluir frame aprovado no PDF do Shot List.
- [ ] G5.2 Manter fallback textual quando imagem não carregar.
- [ ] G5.3 Testar PDF com e sem imagens aprovadas.

## Fase G6 — limites e produção

- [ ] G6.1 Definir quota mensal por plano.
- [ ] G6.2 Bloquear geração quando quota estourar sem criar frame fantasma.
- [ ] G6.3 Validar Supabase Storage em staging/produção.
- [ ] G6.4 Atualizar `docs/STATUS.md` com provider, envs e limitações reais.
