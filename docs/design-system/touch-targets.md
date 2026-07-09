# Touch Targets — guideline do design system

## Regra geral

Elementos interativos DEVEM ter área de toque renderizada de no mínimo
**44 × 44 CSS pixels**. Referências:

- WCAG 2.5.5 Target Size (Enhanced, AAA).
- Apple Human Interface Guidelines — 44 pt mínimo.
- Origem no projeto: [`FASE_1_ACHADOS.md`](../../FASE_1_ACHADOS.md).

Elementos cobertos por default pela verificação automatizada
(`tests/e2e/support/touchTarget.ts`):

- `<button>` (não desabilitado, visível)
- `[role="tab"]`
- `nav a`, `aside a`
- `[role="menuitem"]`

## Exceção documentada: breadcrumbs

Links de breadcrumb (navegação hierárquica secundária, ex.:
`Comercial > Clientes > Detalhe`) são **exceção explícita** à regra
de 44×44:

- **Justificativa:** breadcrumbs são navegação contextual, não ação
  primária. Padding suficiente para 44×44 quebra a hierarquia visual
  ao equipará-los a botões principais.
- **Aplicação:** marcar o elemento com o atributo
  `data-touch-target-exempt`. O verificador automatizado da Fase 1
  respeita esse atributo.

Exemplo:

```tsx
<a href="/commercial" data-touch-target-exempt>
  Comercial
</a>
```

Nenhum comportamento em runtime é afetado — apenas a verificação de
touch target ignora o elemento.

## Como usar em novos componentes

- Ação primária (botão de salvar, criar, enviar): **sem exceção** —
  aplicar `min-h-11` ou padding suficiente.
- Ação secundária (link "ver mais", "voltar"): **sem exceção** —
  o padding aceito é o mínimo do design system, mas deve ficar >= 44 px
  no viewport mobile.
- Navegação hierárquica (breadcrumb, migalhas): **exceção via
  `data-touch-target-exempt`**.
- Ícones inline em texto corrido (ex.: link dentro de parágrafo):
  exceção via `data-touch-target-exempt`.

## Rodando a verificação

```bash
npx playwright test --grep "@fase1" --project=chromium-mobile
```

O helper `assertMinTouchTargets` roda contra as 5 páginas críticas
(dashboard, commercial, admin, client detail, project hub) e lista
cada violação com nome do elemento, dimensões medidas e comandos
`grep` para localizá-lo no código.

## Referências

- Testes: `tests/e2e/critical-pages-mobile.spec.ts`
- Helper: `tests/e2e/support/touchTarget.ts`
- Achados originais: `FASE_1_ACHADOS.md` seções 2 e 8
- Requirements da Fase 2: `.kiro/specs/fase-2-layout-mobile-e-tabs/requirements.md`
