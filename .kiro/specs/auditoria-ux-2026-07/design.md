# Design — Auditoria UX/Técnica

## Ordem de execução

A → B → C → D → E → F → G

As fases A e B têm risco de regressão real (mexem em navegação usada em todo o app autenticado) — rodar Playwright completo depois de cada uma.

As fases D em diante são de baixo risco e podem ser paralelizadas se houver mais de um agente/dev trabalhando.

## Fase A — P0: risco de dado / paridade quebrada

### A1. Confirmação obrigatória em ações destrutivas

**Componentes envolvidos:**
- `client/src/pages/AdminDashboard.tsx`
- `@radix-ui/react-alert-dialog` (já instalado)
- `DropdownMenu` (Radix, já disponível)

**Padrão de implementação:**
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Deletar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
    <AlertDialogDescription>
      Esta ação não pode ser desfeita.
    </AlertDialogDescription>
    <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
    <AlertDialogCancel>Cancelar</AlertDialogCancel>
  </AlertDialogContent>
</AlertDialog>
```

**Buscar por:** `onClick.*delete|handleDelete` em AdminDashboard e componentes relacionados

### A2. Paridade de navegação mobile x desktop

**Componente envolvido:**
- `AppNavBar.tsx` ou componente de abas do Comercial
- `ResponsiveTabs` (já existe em `client/src/components/ui/responsive-tabs.tsx`)

**Duas opções:**
1. Menu "mais" (overflow) no mobile mostrando abas 4 e 5
2. Migrar para `ResponsiveTabs` que já lida com overflow automaticamente

**Critério:** ≤2 toques para acessar qualquer seção no mobile

## Fase B — P1: terminar migração mobile

### B1. Levantamento

```bash
grep -rl "className=\"flex.*border-b\|role=\"tab\"" client/src/pages client/src/components
```

Gera lista de ~24 arquivos com abas manuais não migradas.

### B2. Migração

**Padrão de referência:** `AdminDashboard.tsx`

Antes (manual):
```tsx
<div className="flex border-b">
  <button role="tab">Tab 1</button>
  <button role="tab">Tab 2</button>
</div>
```

Depois (ResponsiveTabs):
```tsx
<ResponsiveTabs
  tabs={[
    { id: 'tab1', label: 'Tab 1', content: <Content1 /> },
    { id: 'tab2', label: 'Tab 2', content: <Content2 /> }
  ]}
/>
```

### B3. Regressão

```bash
npx playwright test --grep "@fase1"
```

## Fase C — P1: hierarquia visual

**Problema identificado:**
3 níveis de navegação com mesmo peso visual:
1. Abas de módulo [Visão Geral/Clientes/Pipeline/Propostas/Interações]
2. Sub-abas internas [Dashboard/Métricas/Funil/Relatórios]
3. Seletor de estágio [Prospectar/Qualificar/Fechar]

**Solução:**
- Nível 1: dominante (borda mais grossa, background, maior)
- Nível 2: discreto (underline fino ou segmented control)
- Nível 3: como filtro (Select/pill group claramente distinto)

**Aplicar também em:** `Studio.tsx` (6 estágios + 12 ferramentas em 5 categorias)

## Fase D — P2: design tokens

**Buscar por:**
```bash
grep -rl "#[0-9A-Fa-f]\{6\}" client/src/components client/src/pages
```

**Trocar:**
- `#e85002` → `tokens.colors.primary`
- `#334155` → `tokens.colors.slate[700]`

**Prevenir:**
Adicionar regra ESLint custom ou script em `npm run check`:
```js
// Fail build se hex fora de design-system/
```

## Fase E — P2: SEO dinâmico

**Dependência:** `react-helmet-async`

**Rotas públicas a implementar:**
- `/` — título/description gerais do app
- `/review/:token` — "Revisão de vídeo - [nome do projeto]"
- `/proposal/:token` — "Proposta - [nome do cliente/projeto]"
- `/meeting/:token` — "Reunião - [assunto]"

**Verificação:** `scripts/verify-built-html.mjs` continua passando

## Fase F — P3: skills

Verificar se `AGENTS.md` (raiz) referencia todas as 12 skills de `.kiro/skills/`

## Fase G — P3: empty states

Consolidar empty states duplicados em componente reutilizável:
```tsx
<EmptyState
  icon={Icon}
  title="Nenhum item ainda"
  description="Comece criando..."
  action={<Button>Criar primeiro item</Button>}
/>
```
