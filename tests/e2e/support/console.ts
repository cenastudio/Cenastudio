import type { Page, TestInfo } from "@playwright/test";

/**
 * Registra listeners de erro (console.error e pageerror) na `page` e anexa o
 * acumulado ao `TestInfo` como attachment JSON quando a página fechar.
 *
 * Comportamento (Req 5.3):
 * - Não faz o teste falhar quando há erros de console — apenas anexa.
 * - O attach é feito em `page.on("close")`, garantindo que o snapshot do array
 *   `consoleErrors` contenha as mensagens acumuladas durante o teste (o body
 *   do attach é serializado no momento da chamada; se anexássemos no início
 *   do teste, o array estaria vazio).
 * - Extraído do `beforeEach` original de `tests/e2e/launch.spec.ts` para
 *   permitir reuso em todos os specs da Fase 1.
 */
export function attachConsoleErrors(page: Page, testInfo: TestInfo): void {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  page.on("close", () => {
    // Attach roda depois do teste — engolimos qualquer rejeição para não
    // mascarar a falha do teste em cenários de teardown já concluído.
    testInfo
      .attach("console-errors", {
        contentType: "application/json",
        body: Buffer.from(JSON.stringify(consoleErrors, null, 2)),
      })
      .catch(() => {
        /* silencioso: attach após finalização do teste */
      });
  });
}
