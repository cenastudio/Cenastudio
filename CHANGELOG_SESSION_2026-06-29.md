# Changelog - Sessão 29/06/2026

## Problema resolvido: Página em branco (Vercel + local)

**Causa:** O plugin `vite-plugin-manus-runtime` estava sendo incluído no build de produção, injetando o React inteiro inline no HTML, conflitando com o bundle principal.

**Solução:** `vite.config.ts` — plugins de dev agora são exclusivos do `mode !== "production"`.

---

## Commits nesta sessão (do mais novo ao mais antigo)

| Commit | Descrição |
|--------|-----------|
| `7a4b6d2` | **fix:** remove manus-runtime do build de produção |
| `1c7fee7` | **chore:** rename project → cenastudio + strings hardcoded substituídas por SITE_CONFIG |
| `c63d33a` | **refactor:** i18n em todos componentes/páginas (tarefa de tradução PT/EN) |

## Commits anteriores (Codex + base)

| Commit | Descrição |
|--------|-----------|
| `9ae4df8` | fix: resolve merge conflict do LanguageProvider |
| `d3fa713` | **feat: restore all Codex changes** → notificações, brand, studio theme, CRM, colaboradores, export |
| `4450758` | feat(i18n): adiciona suporte PT/EN na landing page |

## O que o commit Codex (`d3fa713`) restaurou

- Notificações in-app
- Brand/identidade visual
- Studio theme (tema do estúdio)
- CRM
- Colaboradores
- Export

## Renomeações feitas

| Item | Antes | Depois |
|------|-------|--------|
| GitHub repo | `frame-ai-director-correto` | `cenastudio` |
| Git remote | `.../frame-ai-director-correto.git` | `.../cenastudio.git` |
| `package.json` name | `cena-studio` | `cenastudio` |
| `.vercel/project.json` | `frame-ai-director-correto` | `cenastudio` |
| `supabase/.temp/linked-project.json` | `frame-ai-director-correto` | `cenastudio` |
| Vercel project | `frame-ai-director-correto` | `cenastudio` |
| Nome da marca centralizado | espalhado em 6+ arquivos | `shared/site.ts` → `SITE_CONFIG.title` |

## Seletor de Idioma PT/EN

O sistema possui um botão de alternância EN/PT implementado em dois lugares:

| Local | Componente | Versão |
|-------|-----------|--------|
| Landing page (Navigation.tsx) | `LanguageSwitcher compact` | Estilo inline simplified |
| App logada (AppNavBar) | `LanguageSwitcher` | Versão completa |

**Como funciona:**
- Componente: `client/src/components/LanguageSwitcher.tsx`
- Contexto: `client/src/contexts/LanguageContext.tsx` (2513 linhas)
- Traduções: Objeto `TRANSLATIONS` com `pt` e `en` completos para todas as telas
- Persistência: `localStorage` chave `"language"`
- Função: `t("chave.secao.key")` → retorna string no idioma ativo
- Fallback: se chave não encontrada, retorna a própria chave

**Status das traduções:** Completo — landing page, app shell, todas as páginas (Dashboard, Clients, Pipeline, Studio, etc.) e 12 ferramentas do Studio.

---

## Erros de TypeScript (443 erros no total)

### 1. `Cannot find name 't'` (162 erros)
**Causa:** Componentes que usam `t()` sem importar `useLanguage` ou sem declarar `const { t } = useLanguage()`.

**Solução:** Adicionar `import { useLanguage } from "@/contexts/LanguageContext"` e `const { t } = useLanguage()` em cada componente afetado.

Arquivos afetados (parcial): diversos componentes em `client/src/components/` e `client/src/pages/`.

### 2. Tipo de retorno da `t()` (≈250 erros)
**Causa:** A função `t()` retorna `string | Record<string, unknown>` porque o tipo `TRANSLATIONS` está definido como `Record<string, string | Record<string, unknown>>`. Quando usada em JSX, TypeScript reclama que `Record<string, unknown>` não é `ReactNode` nem `string`.

**Solução possível (2 opções):**

**Opção A — Type cast (mais rápido):**
```tsx
{t("app.nav.dashboard") as string}
```

**Opção B — Corrigir tipo da `t()` (recomendado):**
No `LanguageContext.tsx`, criar overload ou wrapper que force retorno `string`:
```ts
const t = (key: string): string => {
  const value = resolveKey(translations, key);
  return typeof value === "string" ? value : key;
};
```

### 3. Outros erros
- `client/src/pages/VideoReviews.tsx` — vários erros de tipo com `t()` e casts
- `Argument of type 'string | Element | Record<string, unknown>'` — mesmo problema da `t()`

---

## Pendências

- [ ] Renomear Supabase manualmente: https://supabase.com/dashboard/project/vylxwhuuqluloxkhlsmd/settings
- [ ] Corrigir os 443 erros de TypeScript (prioridade: `Cannot find name 't'` primeiro)
- [ ] Verificar se a página carrega corretamente no Vercel após o fix do manus-runtime
