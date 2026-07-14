# Auditoria Visual - Problemas de Contraste

## 🐛 Bugs Identificados

### 1. Toggle Switches (Alta Prioridade)
**Problema:** Switches laranjas no tema claro têm baixo contraste
**Localização:** `Profile.tsx` linhas 1904, 1927, 1950, 3169, 3256, 3527, 3551
**Solução:** Adicionar classes condicionais baseadas no tema

```tsx
// ANTES:
className={`... ${active ? "bg-frame-orange" : "bg-frame-gray-3"}`}

// DEPOIS:
className={`... ${active ? "bg-frame-orange dark:bg-frame-orange light:bg-orange-600" : "bg-frame-gray-3"}`}
```

### 2. Ícones Decorativos com `text-frame-orange`
**Problema:** Ícones laranjas ficam invisíveis/baixo contraste no tema claro
**Localizações identificadas:**
- Profile.tsx (ícones de seção)
- Proposals.tsx (FileSignature, BriefcaseBusiness)
- NotFound.tsx (404 gigante)
- AdminDashboard.tsx (badges admin, avatares)

**Solução:** Usar classes condicionais ou variantes de cor

```tsx
// ANTES:
<Icon className="w-5 h-5 text-frame-orange" />

// DEPOIS:
<Icon className="w-5 h-5 text-frame-orange dark:text-frame-orange light:text-orange-600" />
```

### 3. Bordas e Backgrounds com Opacidade
**Problema:** `border-frame-orange/30` e `bg-frame-orange/10` ficam muito claros no tema claro
**Localizações:**
- Proposals.tsx (cards de steps, client selector)
- AdminDashboard.tsx (badges, borders)

**Solução:** Ajustar opacidades para tema claro

### 4. Textos/Labels em Laranja
**Problema:** `text-frame-orange` com fonte pequena tem baixo contraste no tema claro
**Localizações:**
- Proposals.tsx (eyebrows, labels, step numbers)
- AdminDashboard.tsx (section headers, badges)
- Profile.tsx (labels de seção)

**Solução:** Aumentar peso da fonte ou ajustar cor no tema claro

## 📋 Checklist de Correção

- [ ] Todos os toggle switches com variante de cor
- [ ] Ícones decorativos com contraste adequado
- [ ] Bordas e backgrounds ajustados
- [ ] Textos/labels legíveis
- [ ] Testar em ambos os temas (dark e light)
- [ ] Verificar acessibilidade (WCAG AA mínimo)

## 🎨 Paleta Recomendada

### Tema Escuro (atual)
- `#e85002` - Laranja principal
- `#ff6b1a` - Laranja hover/destaque

### Tema Claro (proposto)
- `#d64400` - Laranja mais escuro (melhor contraste)
- `#bf3d00` - Laranja hover (ainda mais escuro)

## 🔧 Estratégia de Implementação

1. Criar variáveis CSS customizadas em `index.css`
2. Usar Tailwind com variantes `dark:` e `light:`
3. Criar componente Toggle reutilizável
4. Criar componente Icon wrapper com contraste automático

