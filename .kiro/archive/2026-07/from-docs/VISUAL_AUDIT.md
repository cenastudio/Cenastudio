# Auditoria Visual - Problemas de Contraste e UX

## ✅ Bugs Corrigidos

### 1. ~~Toggle Switches vazando~~ (CORRIGIDO - commit d24b0ea)
**Problema:** Bolinha branca do toggle vazava para fora do container
**Solução:** Ajustado translate-x-6 → translate-x-5, translate-x-1 → translate-x-0, adicionado left-1

---

## 🔍 Próximas Verificações Sugeridas

### 2. Ícones Decorativos com `text-frame-orange`
**O que verificar:** Ícones laranjas podem ter baixo contraste no tema claro
**Onde:** Profile.tsx (ícones de seção), Proposals.tsx, AdminDashboard.tsx
**Como testar:** Alternar para tema claro e verificar se todos os ícones são legíveis

### 3. Bordas e Backgrounds com Opacidade
**O que verificar:** `border-frame-orange/30` e `bg-frame-orange/10` podem ficar muito suaves
**Onde:** Proposals.tsx (cards de steps, client selector)
**Como testar:** Tema claro, verificar se os cards têm definição suficiente

### 4. Botões Hover States
**O que verificar:** Estados hover podem não estar claros em ambos os temas
**Onde:** Todos os botões primários e secundários
**Como testar:** Passar mouse sobre botões em ambos os temas

### 5. Focus States (Acessibilidade)
**O que verificar:** Indicadores de foco para navegação por teclado
**Onde:** Inputs, buttons, links
**Como testar:** Usar Tab para navegar e verificar se está visível

### 6. Text Contrast em Labels Pequenos
**O que verificar:** Textos em `text-[0.6rem]` ou menores podem ter contraste insuficiente
**Onde:** Labels de formulário, eyebrows, badges
**Como testar:** Ferramenta de contraste WCAG ou DevTools

### 7. Modal/Dialog Overlays
**O que verificar:** Backdrop pode estar muito escuro ou claro
**Onde:** Modais, dialogs, popovers
**Como testar:** Abrir modais em ambos os temas

### 8. Loading States
**O que verificar:** Spinners e skeleton loaders visíveis em ambos os temas
**Onde:** Loading de listas, upload de arquivos
**Como testar:** Simular carregamento lento

### 9. Toast/Notification Colors
**O que verificar:** Cores de sucesso/erro/aviso suficientemente distintas
**Onde:** Sistema de toasts (sonner)
**Como testar:** Disparar notificações de cada tipo

### 10. Empty States
**O que verificar:** Ilustrações e textos de empty state legíveis
**Onde:** Listas vazias (projetos, clientes, propostas)
**Como testar:** Conta nova ou limpar dados de teste

---

## 🎨 Recomendações de Micromelhorias

### Consistência
- [ ] Verificar se todos os botões usam mesma altura (min-h-11 ou min-h-10)
- [ ] Padronizar espaçamento entre elementos de formulário (gap-4 ou gap-5)
- [ ] Unificar border-radius (atualmente tudo é 2px - OK)

### Feedback Visual
- [ ] Adicionar transição suave em todos os hovers (transition-colors)
- [ ] Garantir que disabled states são visualmente claros
- [ ] Loading states em botões que fazem requests

### Acessibilidade
- [ ] Todos os botões icon-only têm aria-label
- [ ] Focus rings visíveis (outline-offset-2)
- [ ] Skip links para navegação por teclado

### Performance Percebida
- [ ] Skeleton loaders em carregamentos lentos
- [ ] Animações suaves mas não distrativas
- [ ] Feedback imediato em ações do usuário

---

## 📋 Checklist de Teste Manual

Execute em ambos os temas (dark e light):

- [ ] Login / Registro
- [ ] Dashboard (cards, gráficos)
- [ ] Projetos (lista, criação, edição)
- [ ] Clientes (lista, criação, edição)
- [ ] Propostas (builder, preview, histórico)
- [ ] Video Reviews (player, comentários, annotations)
- [ ] Profile (todas as abas)
- [ ] Admin Dashboard (se tiver acesso)
- [ ] Configurações gerais

---

## 🔧 Ferramentas Recomendadas

- **Chrome DevTools:** Lighthouse (Accessibility score)
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **axe DevTools:** Extensão para testes de acessibilidade
- **WAVE:** Web Accessibility Evaluation Tool

---

**Última atualização:** 14/07/2026 - Toggles corrigidos ✅

