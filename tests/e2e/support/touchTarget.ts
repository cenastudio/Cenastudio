import { expect, type Page } from "@playwright/test";

/**
 * Representa uma violação de área de toque mínima detectada em um elemento
 * interativo da página.
 */
export interface TouchTargetViolation {
  /** Descrição sintética do seletor do elemento (tag, role ou data-testid). */
  selector: string;
  /** Texto legível associado ao elemento (aria-label preferido, senão textContent). */
  text: string;
  /** Largura observada em CSS pixels. */
  width: number;
  /** Altura observada em CSS pixels. */
  height: number;
  /** Pathname da página onde a violação foi detectada. */
  pageUrl: string;
}

/**
 * Opções aceitas por {@link assertMinTouchTargets}.
 */
export interface AssertMinTouchTargetsOptions {
  /** Tamanho mínimo em CSS pixels para largura e altura. Default: 44. */
  min?: number;
  /**
   * Seletores adicionais a excluir da checagem (por exemplo, itens específicos
   * de um teste que sabidamente não são "targets" reais).
   */
  additionalExcludeSelectors?: string[];
  /**
   * Se informado, limita a busca a descendentes deste seletor (ex.: "main").
   */
  onlyWithinSelector?: string;
}

/**
 * Valida que todos os elementos interativos visíveis da página atendem à
 * WCAG 2.5.5 / 2.5.8 (Target Size), com área mínima de 44x44 CSS pixels.
 *
 * Elementos considerados:
 *   - button:not([disabled])
 *   - [role="tab"]
 *   - nav a
 *   - aside a
 *   - [role="menuitem"]
 *
 * Exclusões padrão:
 *   - [data-touch-target-exempt]
 *   - Descendentes de <footer>
 *   - Ícones "close/fechar/x" dentro de [role="dialog"]
 *   - Elementos invisíveis (display:none, visibility:hidden ou zero-size)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6.
 */
export async function assertMinTouchTargets(
  page: Page,
  options: AssertMinTouchTargetsOptions = {},
): Promise<void> {
  const min = options.min ?? 44;
  const additionalExcludeSelectors = options.additionalExcludeSelectors ?? [];
  const onlyWithinSelector = options.onlyWithinSelector ?? null;

  let pageUrl: string;
  try {
    pageUrl = new URL(page.url()).pathname;
  } catch {
    pageUrl = page.url();
  }

  const rawViolations = await page.evaluate(
    ({
      min,
      additionalExcludes,
      scope,
    }: {
      min: number;
      additionalExcludes: string[];
      scope: string | null;
    }) => {
      const includeSelectors = [
        "button:not([disabled])",
        '[role="tab"]',
        "nav a",
        "aside a",
        '[role="menuitem"]',
      ];

      const excludeSelectors = ["[data-touch-target-exempt]", ...additionalExcludes];

      // Raiz de busca: dentro de `scope` se informado, senão o documento inteiro.
      const root: ParentNode = scope
        ? (document.querySelector(scope) ?? document)
        : document;

      const collected: HTMLElement[] = [];
      for (const sel of includeSelectors) {
        root
          .querySelectorAll<HTMLElement>(sel)
          .forEach((el) => collected.push(el));
      }
      // Remove duplicatas (um elemento pode casar com múltiplos seletores).
      const unique = Array.from(new Set(collected));

      const closePattern = /\b(close|fechar)\b|^\s*[×xX]\s*$/i;

      const isCloseIconInDialog = (el: HTMLElement): boolean => {
        const dialog = el.closest('[role="dialog"]');
        if (!dialog) return false;
        const label =
          (el.getAttribute("aria-label") ?? "") + " " + (el.textContent ?? "");
        return closePattern.test(label.trim());
      };

      const violations: Array<{
        selector: string;
        text: string;
        width: number;
        height: number;
      }> = [];

      for (const el of unique) {
        // Exclusão explícita: o próprio elemento casa com um exclude, ou é
        // descendente de um elemento que casa.
        let excluded = false;
        for (const sel of excludeSelectors) {
          if (el.matches(sel) || el.closest(sel)) {
            excluded = true;
            break;
          }
        }
        if (excluded) continue;

        // Regras específicas: footer e ícone de fechar dentro de dialog.
        if (el.closest("footer")) continue;
        if (isCloseIconInDialog(el)) continue;

        // Visibilidade computada.
        const style = window.getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;

        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        if (rect.width < min || rect.height < min) {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role");
          const ariaLabel = el.getAttribute("aria-label");
          const testId = el.getAttribute("data-testid");
          const rawText = (el.textContent ?? "").trim().replace(/\s+/g, " ");
          const text = rawText.slice(0, 60);

          let selectorDesc = tag.toUpperCase();
          if (role) selectorDesc = `[role="${role}"]`;
          if (testId) selectorDesc += `[data-testid="${testId}"]`;

          const displayText = ariaLabel || text || "(sem texto)";

          violations.push({
            selector: selectorDesc,
            text: displayText,
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
          });
        }
      }

      return violations;
    },
    {
      min,
      additionalExcludes: additionalExcludeSelectors,
      scope: onlyWithinSelector,
    },
  );

  const violations: TouchTargetViolation[] = rawViolations.map((v) => ({
    ...v,
    pageUrl,
  }));

  if (violations.length === 0) {
    return;
  }

  const lines = violations.map(
    (v) => `  - "${v.text}" (${v.selector}): ${v.width} x ${v.height}`,
  );

  const uniqueTexts = Array.from(
    new Set(
      violations
        .map((v) => v.text)
        .filter((t) => t && t !== "(sem texto)"),
    ),
  );
  const grepHints = uniqueTexts
    .slice(0, 5)
    .map((t) => `  grep -r "${t}" client/src`);

  const messageParts = [
    `[touch target < ${min}px] em ${pageUrl}`,
    ...lines,
  ];
  if (grepHints.length > 0) {
    messageParts.push("", "Elementos que falharam podem ser localizados via:", ...grepHints);
  }
  const message = messageParts.join("\n");

  expect(violations, message).toHaveLength(0);
}
