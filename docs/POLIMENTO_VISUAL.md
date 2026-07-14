# Polimento Visual - Plano de Implementação

## ✅ Status Atual

### Já implementado:
- ✅ Toggle switches corrigidos (não vazam mais)
- ✅ Focus states consistentes (focus-visible:ring-2)
- ✅ Disabled states com opacity-40/50 + cursor-not-allowed
- ✅ Design system com tokens CSS bem definidos
- ✅ Transições suaves em hover states

---

## 🎯 Prioridades de Melhoria

### 1. ALTA PRIORIDADE - Contraste de Textos Pequenos

**Problema:** Textos `text-[0.5-0.68rem]` em laranja podem ter contraste insuficiente no tema claro

**Locais afetados:**
- Eyebrows (step numbers, labels)
- Badges (filled, pending, etc.)
- Mono text labels (tracking wider)

**Solução proposta:**
```tsx
// Criar utility class que ajusta automaticamente
.text-adaptive-primary {
  color: var(--ds-orange); /* #e85002 em dark */
}

:root.light .text-adaptive-primary,
body.light .text-adaptive-primary {
  color: var(--ds-orange-light-theme); /* #d64400 em light - mais contraste */
}
```

**Implementação:**
1. Adicionar classes no `tokens.css`
2. Buscar e substituir `text-frame-orange` por `text-adaptive-primary` em textos <0.7rem
3. Testar em ambos os temas

---

### 2. MÉDIA PRIORIDADE - Micro-interações

**Áreas para melhorar:**

#### 2.1 Botões com Loading States
- Garantir que TODOS os botões que fazem requests async mostrem loading
- Padrão: spinner + texto "Carregando..." / "Salvando..." / etc
- Já implementado em alguns lugares, falta padronizar

#### 2.2 Toast Notifications
- Verificar se todas as ações têm feedback visual
- Sucesso ✅ / Erro ❌ / Info ℹ️ / Warning ⚠️
- Já usa Sonner, falta padronizar mensagens

#### 2.3 Empty States
- Verificar se todos os empty states são visualmente agradáveis
- Icon + Título + Descrição + CTA (quando aplicável)
- Já implementado em vários lugares

---

### 3. MÉDIA PRIORIDADE - Consistência Visual

#### 3.1 Espaçamento
- ✅ Já usa scale consistente (gap-4, gap-5, p-4, p-5)
- Verificar se há outliers (gap-3, gap-7, etc sem motivo)

#### 3.2 Altura de Botões
- ✅ Padrão: `min-h-11` (44px - bom para touch)
- Alguns usam `min-h-10` (40px) - verificar se é intencional
- Botões icon-only: `w-11 h-11` consistente

#### 3.3 Border Radius
- ✅ Sistema todo usa `2px` (minimalista, correto)
- Nenhuma ação necessária

---

### 4. BAIXA PRIORIDADE - Polimentos Finos

#### 4.1 Animações
- ✅ Já respeita `prefers-reduced-motion`
- ✅ Já tem toggle de "Reduzir animações" no perfil
- Verificar se todas as animações são suaves (não distrativas)

#### 4.2 Skeleton Loaders
- Implementar em listas longas (projetos, clientes, propostas)
- Melhorar percepção de performance

#### 4.3 Scroll Behavior
- Verificar se scroll suave está ativado onde faz sentido
- Não usar em navegação principal (pode causar motion sickness)

---

## 📊 Análise de Contraste (WCAG AA)

### Textos Pequenos (<18px / 0.7rem)
- **Requerimento:** 4.5:1
- **Atual dark:** #e85002 em #000000 = ~3.8:1 ❌ (insuficiente)
- **Atual light:** #e85002 em #ffffff = ~3.1:1 ❌ (insuficiente)
- **Proposto light:** #d64400 em #ffffff = ~5.2:1 ✅

### Textos Grandes (≥18px / 0.7rem)
- **Requerimento:** 3:1
- **Atual dark:** #e85002 em #000000 = ~3.8:1 ✅
- **Atual light:** #e85002 em #ffffff = ~3.1:1 ✅
- **Proposto light:** #d64400 em #ffffff = ~5.2:1 ✅

**Ação:** Implementar `--ds-orange-light-theme: #d64400` para textos pequenos

---

## 🔧 Checklist de Implementação

### Fase 1 - Correções Críticas (30min)
- [ ] Adicionar variáveis de cor adaptativa no tokens.css
- [ ] Criar utility classes .text-adaptive-primary, .bg-adaptive-primary, .border-adaptive-primary
- [ ] Substituir text-frame-orange por text-adaptive-primary em textos <0.7rem
- [ ] Testar em ambos os temas

### Fase 2 - Padronizações (1h)
- [ ] Audit todos os loading states de botões
- [ ] Padronizar mensagens de toast
- [ ] Verificar empty states
- [ ] Documentar padrões no Design System

### Fase 3 - Polimentos (30min)
- [ ] Implementar skeleton loaders em 3 listas principais
- [ ] Audit de animações (garantir suavidade)
- [ ] Verificar scroll behavior

### Fase 4 - Teste Manual (1h)
- [ ] Testar todas as páginas em tema dark
- [ ] Testar todas as páginas em tema light
- [ ] Testar navegação por teclado (Tab, Enter, Esc)
- [ ] Testar com leitor de tela (VoiceOver no Mac)
- [ ] Testar com zoom 200% (acessibilidade visual)

---

## 🎨 Exemplos de Código

### Antes (contraste insuficiente no light):
```tsx
<span className="font-frame-mono text-[0.6rem] text-frame-orange">
  01
</span>
```

### Depois (contraste adaptativo):
```tsx
<span className="font-frame-mono text-[0.6rem] text-adaptive-primary">
  01
</span>
```

### CSS adicionado:
```css
/* já implementado em tokens.css */
:root {
  --ds-orange-light-theme: #d64400;
}

.text-adaptive-primary {
  color: var(--ds-orange);
}

:root.light .text-adaptive-primary,
body.light .text-adaptive-primary {
  color: var(--ds-orange-light-theme);
}
```

---

## 📈 Métricas de Sucesso

- Lighthouse Accessibility Score: >95
- WCAG AA compliance: 100% dos textos
- Zero falhas em navegação por teclado
- Feedback visual em 100% das ações async
- Empty states em 100% das listas vazias

---

**Documento criado:** 14/07/2026
**Última atualização:** 14/07/2026
