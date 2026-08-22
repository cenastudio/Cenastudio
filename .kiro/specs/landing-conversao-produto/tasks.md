# Landing Conversion Product Tasks

## Phase 0. Baseline and assets

- [x] 0.1 Capture the current desktop and mobile landing baseline and identify
  the onboarding image as the incorrect social preview.
- [x] 0.2 Define a controlled demo workspace and capture current product routes
  with coherent, non-sensitive data for hero, workflow and social assets.
- [x] 0.3 Create the dedicated 1200x630 root social image from that workspace.

## Phase 1. First viewport

- [x] 1.1 Replace the hero visual with the controlled operational screenshot.
- [x] 1.2 Rewrite hero copy, CTAs and proof points in PT and EN with the
  language rules from `requirements.md`.
- [x] 1.3 Add stable identifiers to conversion CTAs.
- [x] 1.4 Verify the hero at 390px, 768px and 1440px.

## Phase 2. Product story

- [x] 2.1 Turn the current product proof into a connected workflow from
  commercial intake to delivery and approval.
  - Cinco etapas conectam Comercial, Projeto, Produção, Aprovação e Entrega;
    cada uma declara a rota real correspondente e mostra a superfície do
    produto com o mesmo job controlado.
- [x] 2.2 Reduce repetitive feature catalog weight while preserving truthful
  access to the real modules.
  - A landing agrupa Comercial, Operação do job e Cliente/entrega; as 12
    ferramentas de IA ficam acessíveis por revelação explícita. Os planos
    deixaram de ser carrossel: três caminhos de entrada formam uma grade e
    White-label/Enterprise só aparecem por intenção do visitante.
- [x] 2.3 Add PT and EN copy for every new visible string.

## Phase 3. Mobile and social finishing

- [x] 3.1 Remove decorative copy symbols from all landing surfaces touched by
  this spec and preserve usable touch targets.
- [x] 3.2 Apply the dedicated social image to static root metadata.
- [x] 3.3 Add focused tests and Playwright screenshots at the three target
  viewports.
- [x] 3.4 Run `npm run check`, relevant tests and `npm run build`.
  - Revalidado em 2026-08-14 após 2.1 e 2.2: regra de tokens, TypeScript,
    `LandingProductStory.test.tsx`, traduções e build de produção passaram.
- [ ] 3.5 After deployment, validate the root preview and shared-link metadata
  with real crawler tools.

## Phase 4. Account creation handoff

- [x] 4.1 Turn the mobile registration screen into a clear, branded handoff
  from the landing without a duplicate navigation toggle.
- [x] 4.2 Align password guidance and client validation with the server's
  strong-password policy, in Portuguese and English.
- [x] 4.3 Verify account creation interaction and the mobile viewport.
  - Cadastro mobile agora usa um handoff curto Conta → Primeiro job → Studio
    pronto; o header mobile mantém somente um controle de retorno, e a marca
    vira contexto estático. A política do cliente foi alinhada com
    `server/schemas/auth.ts`: 10 a 128 caracteres, maiúscula, minúscula,
    número e símbolo. Validação executada:
    `npm run test -- client/src/pages/Register.test.tsx client/src/test/translations.test.ts`,
    `npm run check`,
    `npx playwright test tests/e2e/register-mobile-handoff.spec.ts --project=chromium-mobile`
    e `npm run build`.
