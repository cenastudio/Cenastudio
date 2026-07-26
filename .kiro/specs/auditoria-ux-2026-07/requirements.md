# Spec — Correção de Achados da Auditoria UX/Técnica

## Contexto

Esta spec consolida uma auditoria feita fora do repo: análise de código (`server/`, `client/src/`, migrations, `.kiro/specs/`) cruzada com prints reais de 9 telas em produção (desktop e mobile).

O objetivo não é adicionar funcionalidade — é fechar o gap entre "o sistema tem muita coisa" e "o sistema é fácil de usar", incluindo o próprio dono do produto.

## Relação com specs existentes

**Leia antes de começar:**
- `.kiro/specs/fase-2-layout-mobile-e-tabs/` — componente `ResponsiveTabs` já existe e foi migrado em 4 páginas
- `.kiro/specs/features-criticas-gap-analysis/` — contexto de gaps identificados anteriormente

Esta spec é continuação desse trabalho, não reinicialização.

## Requisitos por prioridade

### P0 — Risco de dado / paridade quebrada

1. **Confirmação obrigatória em ações destrutivas (admin)**
   - Adicionar `AlertDialog` antes de delete de usuário
   - Separar visualmente ações destrutivas (cor, espaçamento ou menu secundário)
   - Aplicar padrão a todos os deletes do admin

2. **Paridade de navegação mobile x desktop (módulo Comercial)**
   - Desktop mostra 5 abas (Overview/Clients/Pipeline/Propostas/Interações)
   - Mobile mostra apenas 3 (Overview/Clients/Pipeline)
   - Criar menu "mais" (overflow) ou migrar para padrão `ResponsiveTabs`
   - Critério: todas as 5 seções acessíveis em ≤2 toques no mobile

### P1 — Terminar migração mobile iniciada

3. **Levantamento e migração de abas não-responsivas**
   - Grep por padrões de abas manuais (~24 arquivos identificados)
   - Migrar todos para `ResponsiveTabs` existente
   - Seguir padrão de `AdminDashboard.tsx` sem variações

4. **Hierarquia visual da navegação (módulo Comercial)**
   - 3 sistemas de navegação empilhados com mesmo peso visual
   - Redesenhar hierarquia: nível 1 dominante, nível 2 discreto, nível 3 como filtro
   - Aplicar mesma auditoria em `Studio.tsx` (6 estágios + 12 ferramentas)

### P2 — Design system e SEO

5. **Parar de vazar hex direto**
   - 44 de 235 arquivos usam hex direto vs tokens
   - Trocar todos por tokens de `client/src/design-system/tokens`
   - Adicionar regra de lint impedindo hex fora de `design-system/`

6. **SEO real nas rotas públicas**
   - Todas as 49 rotas compartilham mesma meta tag
   - Implementar título/description dinâmicos em 4 rotas públicas: `/`, `/review/:token`, `/proposal/:token`, `/meeting/:token`
   - Verificar que `scripts/verify-built-html.mjs` continua passando

### P3 — Descobribilidade e polimento

7. **Skills descobríveis automaticamente**
   - `.kiro/skills/` tem 12 arquivos mas sem mapa de gatilhos
   - `AGENTS.md` já existe na raiz com tabela de skills
   - Verificar se todas as skills estão documentadas lá

8. **Polimento de microcopy/empty states**
   - Consolidar empty states duplicados (ex: Financeiro)
   - Criar padrão único reutilizável por página

## Critérios de aceite

- [ ] Nenhuma tela com dois níveis de navegação do mesmo peso visual
- [ ] 0 arquivos com hex literal fora de `design-system/`
- [ ] Paridade funcional mobile/desktop em 100% dos módulos
- [ ] `AGENTS.md` referencia todas as skills de `.kiro/skills/`
- [ ] Suíte Playwright completa (desktop + `@fase1` mobile) verde
