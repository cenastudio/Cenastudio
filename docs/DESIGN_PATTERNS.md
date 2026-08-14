# Design Patterns - Cena Studio

Padrões consolidados de UX/UI para manter consistência em todo o app.

**Última atualização:** 2026-08-14

## Fonte de verdade

- Tokens globais vivem em `client/src/design-system/tokens.css`.
- Tokens por plano vivem em `client/src/design-system/plan-tokens/*.css`.
- Classes utilitárias antigas `frame-*` continuam aceitas quando já existem no
  componente, mas novas decisões visuais devem consumir tokens ou classes do
  design system.
- Hex direto em componente novo só é aceitável quando o valor é dado do usuário,
  anotação/canvas, HTML exportado ou teste de contraste. Para UI normal, crie ou
  reutilize token.
- Não crie `.md` de conclusão/status para ajustes visuais. Atualize este arquivo
  para padrão de design e `docs/STATUS.md` para estado de tarefa.

## Hierarquia e mobile

- Uma tela deve ter apenas um nível de hierarquia visual dominante por vez.
  Evite competir hero, cards grandes e barras de ação no mesmo viewport.
- Mobile é requisito, não bônus: validar largura pequena antes de marcar tarefa
  de UX como pronta.
- Toolbars, grids, tabs e botões de ícone precisam ter dimensões estáveis para
  evitar shift ao carregar labels, hover, loading ou dados longos.
- Use ícones `lucide-react` em comandos comuns quando o projeto já tiver ícone
  equivalente.

## 🎨 Cores e Contraste

### Tema Adaptativo
```tsx
// Para textos pequenos (<0.7rem / 18px)
className="text-adaptive-primary"  // #e85002 (dark) → #d64400 (light)

// Para backgrounds
className="bg-adaptive-primary"

// Para bordas
className="border-adaptive-primary"

// Mantém cor fixa (não adapta)
className="text-frame-orange"      // Sempre #e85002
```

### Contraste WCAG AA
- ✅ Textos pequenos: 4.5:1 mínimo
- ✅ Textos grandes (≥18px): 3:1 mínimo
- ✅ Implementado via `.text-adaptive-primary`

---

## 🔘 Botões

### Loading States
**Padrão:**
```tsx
<button
  disabled={loading}
  className="frame-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
>
  {loading ? (
    <>
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      {t("app.common.loading")}
    </>
  ) : (
    t("app.common.save")
  )}
</button>
```

### Tamanhos Padrão
- Primary/Secondary: `min-h-11` (44px - bom para touch)
- Icon-only: `w-11 h-11`
- Small: `min-h-10` (40px - apenas onde necessário)

### Disabled States
```tsx
// Sempre incluir ambos
className="disabled:opacity-40 disabled:cursor-not-allowed"
```

### Focus States
```tsx
// Já implementado no design system
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/50"
```

---

## 📢 Toast Notifications

### Padrão de Mensagens

**Sucesso:**
```tsx
toast.success(t("app.common.saved"))
toast.success("Item criado com sucesso")
```

**Erro:**
```tsx
// Com try/catch
catch (err) {
  toast.error(err instanceof Error ? err.message : t("app.errors.generic"))
}

// Com validação
if (!form.name.trim()) {
  toast.error(t("app.errors.requiredName"))
  return
}
```

**Info/Warning:**
```tsx
toast.info("Processando em segundo plano")
toast.warning("Ação irreversível")
```

### Mensagens i18n
```tsx
// Sempre preferir i18n
toast.success(t("app.projects.created"))

// Hardcoded apenas para admin/debug
toast.error("Erro ao processar solicitação")
```

---

## 📦 Empty States

### Padrão Visual
```tsx
<div className="frame-empty-state p-12 text-center space-y-4">
  {/* Ícone */}
  <IconName className="w-12 h-12 text-frame-gray-3 mx-auto" />

  {/* Título */}
  <h3 className="text-base font-semibold text-frame-white">
    {t("app.section.emptyTitle")}
  </h3>

  {/* Descrição */}
  <p className="text-sm text-frame-gray-light max-w-md mx-auto">
    {t("app.section.emptyDesc")}
  </p>

  {/* CTA (opcional) */}
  <button onClick={action} className="frame-btn-primary">
    {t("app.section.create")}
  </button>
</div>
```

### Componente Reutilizável
```tsx
import { EmptyState } from "@/components/EmptyState"

<EmptyState
  icon={Users}
  title={t("app.clients.emptyTitle")}
  description={t("app.clients.emptyDesc")}
  action={{
    label: t("app.clients.newClient"),
    onClick: () => setLocation("/clients/new")
  }}
/>
```

### Casos Específicos
- **Lista vazia:** Ícone + texto + botão "Criar"
- **Busca sem resultados:** Ícone + "Nenhum resultado" + "Limpar filtros"
- **Erro de carregamento:** Ícone erro + mensagem + "Tentar novamente"

---

## 📝 Formulários

### Labels e Inputs
```tsx
<div className="space-y-1.5">
  <label className="frame-label">
    {t("app.form.fieldName")}
  </label>
  <input
    type="text"
    className="frame-input"
    placeholder={t("app.form.placeholder")}
    disabled={saving}
  />
</div>
```

### Validação
```tsx
// Validar antes de submit
if (!form.name.trim()) {
  toast.error(t("app.errors.requiredName"))
  return
}

// Mostrar erro inline (opcional)
{error && (
  <p className="text-xs text-red-400 mt-1">{error}</p>
)}
```

---

## 🔄 Loading States

### Skeleton Loaders
```tsx
// Cards
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-frame-gray-3 rounded w-3/4" />
  <div className="h-4 bg-frame-gray-3 rounded w-1/2" />
</div>

// Lista
{loading ? (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-16 bg-frame-gray-2 animate-pulse rounded" />
    ))}
  </div>
) : (
  // conteúdo real
)}
```

### Spinners
```tsx
// Inline (pequeno)
<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />

// Centralizado (página)
<div className="flex items-center justify-center py-20">
  <div className="w-8 h-8 border-2 border-frame-orange border-t-transparent rounded-full animate-spin" />
</div>
```

---

## 🎭 Animações

### Transições Padrão
```tsx
// Hover
className="transition-colors hover:text-frame-orange"

// Multiple properties
className="transition-all duration-200"

// Motion (framer-motion)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
```

### Respeitar Preferências
```tsx
// Já implementado no CSS global
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// Toggle manual no perfil do usuário
```

---

## 📐 Espaçamento

### Scale Padrão (Tailwind)
- `gap-4` / `p-4` → 16px (espaçamento interno de cards)
- `gap-5` / `p-5` → 20px (espaçamento entre seções)
- `gap-6` / `p-6` → 24px (espaçamento de containers)
- `space-y-3` → 12px (entre elementos de formulário)
- `space-y-4` → 16px (entre blocos de conteúdo)

### Containers
```tsx
// Página principal
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

// Modal/Dialog
<div className="p-6 space-y-4">

// Card
<div className="border border-frame-gray-3 p-5 space-y-3">
```

---

## 🔤 Tipografia

### Hierarquia
```tsx
// Page title
<h1 className="frame-title">{title}</h1>

// Section title
<h2 className="text-lg font-semibold text-frame-white">

// Subsection
<h3 className="text-base font-semibold text-frame-white">

// Eyebrow/Label
<p className="font-frame-mono text-[0.62rem] uppercase tracking-wider text-adaptive-primary">

// Body
<p className="text-sm text-frame-gray-light">

// Caption
<p className="text-xs text-frame-gray-light">
```

### Fontes
- **Display:** Bebas Neue (títulos grandes)
- **Body:** DM Sans (texto corrido)
- **Mono:** JetBrains Mono (código, labels, badges)
- **Editorial:** Cormorant Garamond (detalhes especiais)

---

## ♿ Acessibilidade

### ARIA Labels
```tsx
// Botões icon-only
<button aria-label="Fechar modal" title="Fechar">
  <X className="w-4 h-4" />
</button>

// Toggle
<button
  role="switch"
  aria-checked={isActive}
  aria-label="Ativar notificações"
>
```

### Navegação por Teclado
- ✅ Focus rings visíveis (`focus-visible:ring-2`)
- ✅ Tab order lógico
- ✅ Escape fecha modais
- ✅ Enter confirma ações

### Screen Readers
```tsx
// Texto visually hidden mas acessível
<span className="sr-only">{t("app.common.loading")}</span>

// Aria-live para atualizações dinâmicas
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

---

## 📱 Responsividade

### Breakpoints (Tailwind)
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- `2xl:` 1536px

### Mobile-First
```tsx
// Desktop: 3 colunas, Tablet: 2, Mobile: 1
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 🧪 Testes de Qualidade

### Checklist Visual
- [ ] Contraste WCAG AA em ambos os temas
- [ ] Loading states em todas as ações async
- [ ] Empty states em todas as listas
- [ ] Focus states visíveis
- [ ] Disabled states claros
- [ ] Toasts em sucesso/erro
- [ ] Animações suaves
- [ ] Responsivo mobile/desktop

### Ferramentas
- Chrome DevTools Lighthouse
- WebAIM Contrast Checker
- axe DevTools
- WAVE

---

**Última atualização:** 14/07/2026
**Versão:** 1.0
