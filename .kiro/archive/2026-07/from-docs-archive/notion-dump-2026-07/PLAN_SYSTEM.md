# 🎯 Sistema de Planos - Guia Completo

**Versão:** 1.0.0
**Data:** 04/07/2026
**Status:** ✅ Implementado e Testado

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Planos Disponíveis](#planos-disponíveis)
4. [Como Usar](#como-usar)
5. [Componentes](#componentes)
6. [Hooks](#hooks)
7. [Utilitários](#utilitários)
8. [Design Tokens](#design-tokens)
9. [Exemplos Práticos](#exemplos-práticos)
10. [Testes](#testes)
11. [FAQ](#faq)

---

## 🎯 Visão Geral

O Sistema de Planos do CenaStudio permite:

- ✅ **Diferenciação Visual** - Cada plano tem visual único (tokens CSS)
- ✅ **Feature Gating** - Controle de acesso granular por feature
- ✅ **Upgrade Flow** - Modal de upgrade com seleção de plano
- ✅ **Bloqueio de Features** - Componentes de bloqueio elegantes
- ✅ **Type-Safe** - Totalmente tipado com TypeScript

---

## 🏗️ Arquitetura

```
Sistema de Planos
├── Contexts
│   └── PlanContext.tsx          # Provider React para plano atual
├── Components
│   ├── PlanUpgradeModal.tsx     # Modal de seleção e upgrade
│   ├── FeatureUpgradeRequired   # Bloqueio de features premium
│   ├── UpgradePrompt.tsx        # Prompt de upgrade (4 variantes)
│   └── PlanGate.tsx             # Conditional rendering por plano
├── Hooks
│   ├── usePlanContext()         # Acesso ao contexto de plano
│   ├── useFeatureAccess()       # Verificar acesso a feature
│   └── usePlanUpgradeModal()    # Helper para modal de upgrade
├── Libraries
│   ├── plan-config.ts           # Configuração e metadados
│   ├── apply-tokens.ts          # Aplicação de tokens CSS
│   └── feature-gating/          # Sistema de feature flags
└── Types
    └── plan.ts                  # Tipos TypeScript
```

---

## 📊 Planos Disponíveis

### 1. **Brand Mode** (Unauthenticated)
- **Hierarquia:** 0
- **Visual:** Minimal
- **Uso:** Landing page, marketing

### 2. **Free Plan**
- **Hierarquia:** 1
- **Visual:** Minimal
- **Limites:**
  - 5 clientes máximo
  - 1 membro de equipe
  - 8 ferramentas IA básicas
  - 1GB armazenamento
- **Features Bloqueadas:**
  - Pipeline View ❌
  - Video Reviews ❌
  - Collaboration ❌
  - Commercial Hub ❌

### 3. **Pro Plan** (R$ 199/mês)
- **Hierarquia:** 2
- **Visual:** Cockpit (glow effects, scale 1.06)
- **Limites:**
  - 50 clientes máximo
  - 5 membros de equipe
  - 12 ferramentas IA completas
  - 50GB armazenamento
- **Features Desbloqueadas:**
  - ✅ Pipeline View
  - ✅ Video Reviews
  - ✅ Collaboration (5 membros)
  - ✅ Advanced Export
- **Features Bloqueadas:**
  - Commercial Hub ❌
  - Financial Module ❌
  - API Access ❌

### 4. **Studio Plan** (R$ 399/mês)
- **Hierarquia:** 3
- **Visual:** Command Center (dual accent, scale 1.08)
- **Limites:**
  - Clientes ilimitados
  - Membros ilimitados
  - Features completas
  - 500GB armazenamento
- **Features Desbloqueadas:**
  - ✅ TUDO do Pro +
  - ✅ Commercial Hub
  - ✅ Proposals & Contracts IA
  - ✅ Financial Module (dourado)
  - ✅ Team Management ilimitado
  - ✅ Analytics avançado
  - ✅ API Access
  - ✅ Custom Branding

### 5. **Admin** (Internal)
- **Hierarquia:** 4
- **Visual:** Command Center
- **Acesso:** Bypass completo de todas as restrições

---

## 🚀 Como Usar

### Setup Inicial

O sistema já está configurado! O `PlanProvider` está no `App.tsx`:

```tsx
// App.tsx
<AuthProvider>
  <PlanProvider>
    <YourApp />
  </PlanProvider>
</AuthProvider>
```

### Usar o Contexto

```tsx
import { usePlanContext } from "@/contexts/PlanContext";

function MyComponent() {
  const { planMode, accentColor, visualIdentity } = usePlanContext();

  return (
    <div style={{ color: accentColor }}>
      Plano atual: {planMode}
    </div>
  );
}
```

---

## 🧩 Componentes

### 1. PlanGate

Renderiza conteúdo apenas se o usuário tiver o plano necessário:

```tsx
import { PlanGate } from "@/contexts/PlanContext";

<PlanGate requiredPlan="pro">
  <ProFeatureContent />
</PlanGate>

// Com fallback customizado
<PlanGate
  requiredPlan="studio"
  fallback={<CustomUpgradeMessage />}
>
  <StudioFeatureContent />
</PlanGate>
```

### 2. FeatureUpgradeRequired

Bloqueia uma feature específica com prompt de upgrade:

```tsx
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";

<FeatureUpgradeRequired feature="pipeline" currentPlan="free">
  <PipelineView />
</FeatureUpgradeRequired>

// Variantes
<FeatureUpgradeRequired
  feature="video-reviews"
  variant="full"      // Página inteira (padrão)
/>

<FeatureUpgradeRequired
  feature="commercial-hub"
  variant="inline"    // Card inline
/>

<FeatureUpgradeRequired
  feature="api"
  variant="minimal"   // Bloqueio simples
/>
```

### 3. PlanUpgradeModal

Modal completo de seleção de plano e upgrade:

```tsx
import { PlanUpgradeModal } from "@/components/PlanUpgradeModal";

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Fazer Upgrade
      </button>

      <PlanUpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentPlan="free"
        recommendedPlan="pro"
        triggerFeature="Pipeline View"
      />
    </>
  );
}
```

Ou usando o hook:

```tsx
import { usePlanUpgradeModal } from "@/components/PlanUpgradeModal";

function MyComponent() {
  const { showUpgradeModal, PlanUpgradeModalComponent } = usePlanUpgradeModal("free");

  return (
    <>
      <button onClick={() => showUpgradeModal("pro")}>
        Upgrade para Pro
      </button>
      {PlanUpgradeModalComponent}
    </>
  );
}
```

### 4. UpgradePrompt

Prompt de upgrade com 4 variantes:

```tsx
import { UpgradePrompt } from "@/components/UpgradePrompt";

// Variante inline (padrão)
<UpgradePrompt
  feature="pipeline"
  currentPlan="free"
  requiredPlan="pro"
/>

// Variante modal
<UpgradePrompt variant="modal" feature="api" />

// Variante toast
<UpgradePrompt variant="toast" feature="collaboration" />

// Variante minimal
<UpgradePrompt variant="minimal" feature="analytics" />
```

---

## 🪝 Hooks

### usePlanContext()

Acessa o contexto do plano atual:

```tsx
import { usePlanContext } from "@/contexts/PlanContext";

function MyComponent() {
  const {
    planMode,              // "free" | "pro" | "studio" | "admin" | "brand"
    planMetadata,          // Metadados completos do plano
    accentColor,           // Cor primária (#E85002)
    secondaryAccentColor,  // Cor secundária (#D8B343 - Studio/Admin)
    visualIdentity,        // "minimal" | "cockpit" | "command-center"
    isLoading,             // Se está carregando
    error,                 // Erro se houver
  } = usePlanContext();

  return <div>Plano: {planMode}</div>;
}
```

### useFeatureAccess()

Verifica acesso a uma feature específica:

```tsx
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

function PipelineButton() {
  const { hasAccess, UpgradePrompt } = useFeatureAccess("pipeline");

  if (!hasAccess) {
    return <UpgradePrompt />;
  }

  return <button>Abrir Pipeline</button>;
}
```

Para múltiplas features:

```tsx
import { useMultipleFeatureAccess } from "@/hooks/useFeatureAccess";

function AdvancedTools() {
  const { allFeaturesAccessible, blockedFeatures } = useMultipleFeatureAccess([
    "pipeline",
    "video-reviews",
    "analytics"
  ]);

  if (!allFeaturesAccessible) {
    return <div>Bloqueado: {blockedFeatures.join(", ")}</div>;
  }

  return <AdvancedToolsContent />;
}
```

---

## 🛠️ Utilitários

### plan-config.ts

```tsx
import {
  getPlanMetadata,
  hasPlanAccess,
  getNextPlan,
  getPlanDisplayName,
  isPremiumPlan,
  isPlanPending,
} from "@/lib/plan-config";

// Obter metadados
const metadata = getPlanMetadata("pro");
console.log(metadata.displayName); // "Pro"
console.log(metadata.accentColor); // "#E85002"

// Verificar acesso
const hasAccess = hasPlanAccess("free", "pro"); // false
const hasAccess2 = hasPlanAccess("studio", "pro"); // true

// Próximo plano
const next = getNextPlan("free"); // "pro"
const next2 = getNextPlan("studio"); // undefined

// Display name
const name = getPlanDisplayName("studio"); // "Studio"

// Verificações
const isPremium = isPremiumPlan("pro"); // true
const isPending = isPlanPending("studio-pending"); // true
```

### feature-gating

```tsx
import { canAccessFeature } from "@/lib/feature-gating";

const result = canAccessFeature("pipeline", "free");
console.log(result.hasAccess);     // false
console.log(result.requiredPlan);  // "pro"
console.log(result.reason);        // "Feature requires pro plan"
```

---

## 🎨 Design Tokens

O sistema aplica automaticamente tokens CSS baseados no plano:

### Tokens Disponíveis

```css
/* Typography */
--plan-typography-scale: 1.0;  /* Free/Brand */
--plan-typography-scale: 1.06; /* Pro */
--plan-typography-scale: 1.08; /* Studio/Admin */

/* Colors */
--plan-accent-primary: #e85002;    /* Todos os planos */
--plan-accent-financial: #d8b343;  /* Studio/Admin apenas */

/* Effects (Pro/Studio/Admin) */
--plan-glow-sm: 0 2px 8px rgba(232, 80, 2, 0.15);
--plan-glow-md: 0 4px 16px rgba(232, 80, 2, 0.2);
--plan-glow-lg: 0 8px 32px rgba(232, 80, 2, 0.25);
```

### Usar nos Componentes

```tsx
function MyComponent() {
  return (
    <div
      className="text-[var(--plan-accent-primary)]"
      style={{
        fontSize: `calc(1rem * var(--plan-typography-scale))`,
        boxShadow: 'var(--plan-glow-md)',
      }}
    >
      Styled by plan!
    </div>
  );
}
```

### Attribute Selector

Você também pode usar o atributo `data-plan`:

```css
/* CSS */
[data-plan="studio"] .feature-card {
  background: linear-gradient(135deg, var(--plan-accent-primary), var(--plan-accent-financial));
}

[data-plan="free"] .premium-badge {
  display: none;
}
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Proteger Rota

```tsx
import { PlanGate } from "@/contexts/PlanContext";

function PipelinePage() {
  return (
    <PlanGate requiredPlan="pro">
      <PipelineContent />
    </PlanGate>
  );
}
```

### Exemplo 2: Botão com Upgrade

```tsx
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

function CreateProposalButton() {
  const { hasAccess, UpgradePrompt } = useFeatureAccess("proposals");

  if (!hasAccess) {
    return <UpgradePrompt variant="inline" />;
  }

  return (
    <button onClick={handleCreateProposal}>
      Criar Proposta
    </button>
  );
}
```

### Exemplo 3: Feature com Preview

```tsx
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";

function AnalyticsPage() {
  return (
    <FeatureUpgradeRequired
      feature="analytics"
      showPreview={true}
      variant="full"
    >
      <AnalyticsDashboard />
    </FeatureUpgradeRequired>
  );
}
```

### Exemplo 4: Badge de Plano

```tsx
import { usePlanContext } from "@/contexts/PlanContext";
import { Badge } from "@/components/ui/badge";

function UserMenu() {
  const { planMode, planMetadata } = usePlanContext();

  return (
    <div>
      <Badge variant={planMode === "free" ? "outline" : "default"}>
        {planMetadata.displayName}
      </Badge>
    </div>
  );
}
```

### Exemplo 5: Conditional UI por Plano

```tsx
import { usePlanContext } from "@/contexts/PlanContext";

function ProjectCard({ project }) {
  const { planMode } = usePlanContext();

  return (
    <div>
      <h3>{project.name}</h3>

      {/* Mostrar analytics apenas para Studio */}
      {planMode === "studio" && (
        <div className="analytics-preview">
          <ProjectAnalytics project={project} />
        </div>
      )}

      {/* Badge especial para Pro+ */}
      {["pro", "studio", "admin"].includes(planMode) && (
        <Badge>Premium</Badge>
      )}
    </div>
  );
}
```

---

## 🧪 Testes

### Rodar Testes

```bash
# Todos os testes
npm run test

# Testes do sistema de planos
npm run test PlanContext
npm run test plan-config
npm run test apply-tokens

# Com coverage
npm run test:coverage
```

### Testes Implementados

1. **PlanContext.test.tsx** (15 testes)
   - Provider functionality
   - Hook usage
   - PlanGate component
   - Plan hierarchy
   - Admin bypass

2. **plan-config.test.ts** (30+ testes)
   - Metadata retrieval
   - Access control
   - Plan hierarchy
   - Helper functions
   - Feature flags

3. **apply-tokens.test.ts** (25+ testes)
   - Token application
   - CSS custom properties
   - Plan switching
   - Token formats

**Total:** ~70 testes cobrindo o sistema completo

---

## ❓ FAQ

### Como adicionar um novo plano?

1. Adicionar tipo em `types/plan.ts`:
```tsx
export type PlanMode = "free" | "pro" | "studio" | "enterprise" | ...;
```

2. Adicionar hierarquia em `plan-config.ts`:
```tsx
export const PLAN_HIERARCHY = {
  // ...
  enterprise: 4,
};
```

3. Adicionar metadados em `plan-config.ts`:
```tsx
const PLAN_METADATA = {
  // ...
  enterprise: {
    id: "enterprise",
    displayName: "Enterprise",
    // ...
  },
};
```

4. Adicionar tokens em `apply-tokens.ts`:
```tsx
case "enterprise":
  tokens = { /* ... */ };
  break;
```

### Como adicionar uma nova feature?

1. Adicionar em `types/plan.ts`:
```tsx
export type FeatureName =
  | "pipeline"
  | "my-new-feature"
  | ...;
```

2. Mapear em `navigation-filter.ts`:
```tsx
export const FEATURE_ID_MAP: Record<ProductFeatureId, FeatureName> = {
  // ...
  "my-new-feature": "my-new-feature",
};
```

3. Adicionar entitlement em `shared/planEntitlements.ts`:
```tsx
export const PLAN_ENTITLEMENTS = {
  pro: ["my-new-feature", ...],
};
```

4. Adicionar metadata em `FeatureUpgradeRequired.tsx`:
```tsx
const FEATURE_METADATA = {
  "my-new-feature": {
    icon: <Icon />,
    title: "My New Feature",
    description: "...",
    benefits: [...],
    requiredPlan: "pro",
  },
};
```

### Como testar diferentes planos localmente?

Use o override no PlanProvider:

```tsx
// App.tsx (temporário)
<PlanProvider overridePlanMode="studio">
  <YourApp />
</PlanProvider>
```

Ou altere o plano no Supabase diretamente.

### Como funciona a integração com Stripe?

O `PlanUpgradeModal` prepara o usuário para o checkout:

1. Usuário seleciona plano (Pro ou Studio)
2. Usuário escolhe período (mensal ou anual)
3. Modal mostra o resumo e preço
4. Ao clicar "Continuar para pagamento":
   - Redireciona para `/pricing?plan=pro&period=monthly`
   - Pricing page cria Stripe Checkout Session
   - Usuário completa pagamento no Stripe
   - Webhook atualiza plano no Supabase
   - PlanContext detecta mudança automaticamente

### Como o PlanContext detecta mudanças de plano?

O `PlanContext` lê do `AuthContext`:

```tsx
const { user, plan } = useAuth();

// Detecta automaticamente quando plan muda
const planMode = useMemo(() => {
  if (plan?.planId) {
    return plan.planId as PlanMode;
  }
  return "free";
}, [plan]);
```

Quando o webhook do Stripe atualiza o plano no Supabase, o AuthContext recarrega e o PlanContext atualiza automaticamente.

---

## 📚 Referências

- **Código:** `client/src/contexts/PlanContext.tsx`
- **Testes:** `client/src/test/contexts/PlanContext.test.tsx`
- **Tipos:** `client/src/types/plan.ts`
- **Config:** `client/src/lib/plan-config.ts`
- **Roadmap:** `ROADMAP_EXECUCAO_100.md`
- **Status:** `PROGRESSO_IMPLEMENTACAO.md`

---

## 🎉 Conclusão

O Sistema de Planos está **100% implementado e testado**!

**Features:**
- ✅ 70+ testes passando
- ✅ TypeScript 100% tipado
- ✅ Componentes reutilizáveis
- ✅ Design tokens dinâmicos
- ✅ Feature gating robusto
- ✅ Upgrade flow completo

**Pronto para produção!** 🚀

---

**Última Atualização:** 04/07/2026 02:00
**Versão:** 1.0.0
**Autor:** CenaStudio Team
