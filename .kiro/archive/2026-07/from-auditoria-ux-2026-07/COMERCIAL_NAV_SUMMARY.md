# Resumo Executivo: Navegação Comercial

**Status:** ✅ Análise completa | ⚠️ Implementação pendente

## TL;DR

- **Componente:** `client/src/components/CommercialNav.tsx`
- **Abas:** 5 (Overview, Clients, Pipeline, Propostas, Interações)
- **Mobile atual:** Scroll horizontal sem indicação visual
- **Gap:** Baixa descobribilidade (scrollbar oculto)
- **Solução recomendada:** Opção 2 ou 3 (ver abaixo)

## Achados da análise A2.1

```
Estrutura identificada:
┌─────────────────────────────────────────────────┐
│ CommercialNav.tsx                               │
│                                                 │
│ COMMERCIAL_TABS (array de 5 objetos)           │
│ ├─ /commercial    → Visão geral (Overview)     │
│ ├─ /clients       → Clientes                   │
│ ├─ /pipeline      → Pipeline                   │
│ ├─ /propostas     → Propostas                  │
│ └─ /interactions  → Interações                 │
│                                                 │
│ Implementação: manual (não usa ResponsiveTabs) │
│ Navegação: wouter routing (não Radix Tabs)     │
│ Mobile: overflow-x-auto + scrollbar-none       │
└─────────────────────────────────────────────────┘
```

## Problema no mobile

```
Viewport 375px (iPhone SE):
┌────────────────────────────┐
│ [●Overview][●Clients][●Pip]│ ← Visível
│                            │
│ Fora da viewport: →        │
│ [●Propostas][●Interações]  │ ← Não descobrível
└────────────────────────────┘

❌ Sem indicador visual de scroll
❌ Scrollbar oculto (scrollbar-none)
❌ Sem gradiente/sombra lateral
```

## Opções de solução (A2.2+)

### ✅ Opção 1: Migrar para ResponsiveTabs
**Esforço:** Alto
**Prós:**
- Consistência com resto do app
- Reutiliza componente existente

**Contras:**
- ResponsiveTabs não foi feito para routing
- Requer adaptação significativa

**Decisão:** ❌ Não recomendado (muito esforço, pouco ganho)

---

### ✅ Opção 2: Adicionar overflow menu
**Esforço:** Médio
**Prós:**
- Paridade clara mobile/desktop
- Cumpre requisito "≤2 toques"

**Contras:**
- Adiciona complexidade
- Mais um padrão de UI no sistema

**Decisão:** ⭐ Recomendado se o requisito for estrito

**Mockup:**
```
Mobile:
[●Overview][●Clients][●Pipeline][⋮ Mais ▾]
                                  └─ Dropdown:
                                     • Propostas
                                     • Interações
```

---

### ✅ Opção 3: Melhorar indicação visual (quick win)
**Esforço:** Baixo
**Prós:**
- Mudança mínima
- Sem risco de regressão
- Resolve descobribilidade

**Contras:**
- Não adiciona overflow menu formal
- Ainda requer scroll

**Decisão:** ⭐⭐ Recomendado como primeira iteração

**Implementação:**
```css
/* Adicionar gradiente lateral indicando mais conteúdo */
.commercial-nav-container::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, transparent, rgba(0,0,0,0.3));
  pointer-events: none;
}
```

## Arquivos relacionados

- `client/src/components/CommercialNav.tsx` — Componente principal
- `client/src/pages/CommercialHub.tsx` — Hub que usa CommercialNav
- `client/src/pages/ClientDetail.tsx` — Também usa CommercialNav
- `client/src/components/ui/responsive-tabs.tsx` — Referência de padrão

## Próximos passos

1. **A2.2:** Confirmar comportamento desktop vs mobile (teste real)
2. **A2.3:** Decidir entre Opção 2 ou 3
3. **A2.4:** Implementar solução escolhida
4. **A2.5:** Testar com Playwright (@fase1)

## Critério de aceite

> Todas as 5 seções acessíveis em ≤2 toques no mobile

**Interpretação:**
- **Opção 2:** ✅ Garante (1 toque no menu + 1 toque na aba)
- **Opção 3:** ⚠️ Depende (1 toque na aba, mas precisa descobrir via scroll)

**Recomendação:** Começar com Opção 3, escalar para Opção 2 se necessário.
