# Plano de White Label — CenaStudio

> Documento de referência sobre o que existe hoje, o que falta, e o caminho para transformar
> o CenaStudio em um produto white label (mesma base de código, marca de terceiros).

---

## 1. Diagnóstico atual

### O que já existe a favor

| Elemento | Localização | Status |
|---|---|---|
| CSS Variables centralizadas | `client/src/design-system/tokens.css` | ✅ Estrutura correta |
| Componente `BrandLogo` dedicado | `client/src/components/BrandLogo.tsx` | ⚠️ Existe, mas texto hardcoded |
| `StudioSettings` no banco (nome, cor primária) | `client/src/lib/studioSettings.ts` + Prisma `StudioSetting` | ✅ Já salva por usuário |
| `SITE_CONFIG` centralizado | `shared/site.ts` | ✅ Ponto único de config da landing |
| `EMAIL_FROM` como variável de ambiente | `server/services/emailService.ts` | ✅ Parcialmente dinâmico |

### O que bloqueia hoje

| Problema | Onde | Impacto |
|---|---|---|
| "Cena Studio" hardcoded em 20+ arquivos | Server + Client | Alto |
| `BrandLogo` renderiza "Cena" + "Studio" fixos no JSX | `BrandLogo.tsx` | Médio |
| `AuthLayout` não usa `BrandLogo`, repete o markup do nome | `AuthLayout.tsx` | Médio |
| Cor laranja (`#e85002`) repetida em hex direto | `tokens.css`, `index.css` | Alto |
| Emails com HTML inline e nome de marca fixo | Controllers (auth, meetings) | Médio |
| Sem `APP_NAME` / `BRAND_NAME` como env var | Backend | Fácil de resolver |
| Logo é arquivo estático sem upload dinâmico | `client/public/assets/*.png` | Médio |
| Nenhum isolamento de dados por tenant | `prisma/schema.prisma` | Alto (avaliar necessidade) |

---

## 2. Diferença entre os modelos de "marca alheia"

| Modelo | O que é | Quem hospeda | Cobrança típica |
|---|---|---|---|
| **White label** | Mesmo sistema, marca do cliente | Você | Setup + mensalidade |
| **Licença de código** | Vende o código-fonte | O comprador | Venda única ou royalty |
| **Executável/Desktop** | Não se aplica — é SaaS com backend, banco e APIs externas (Stripe, Cloudinary, OpenRouter) | — | — |

O caminho recomendado para o CenaStudio é **white label multi-tenant**: uma única instalação servindo múltiplas marcas, cada uma vendo "seu" sistema.

---

## 3. Roadmap de implementação

### Nível 1 — White Label básico ✅ Concluído em Fase 3 (2026-07-09)

> **Referência:** [`.kiro/specs/fase-3-white-label/`](./.kiro/specs/fase-3-white-label/) +
> [`docs/white-label/setup-guide.md`](./docs/white-label/setup-guide.md).
> Deploy de nova marca hoje é **5 passos, ~5 min** — sem editar código,
> só preencher 6 env vars e substituir favicon.svg + templates legais.
> Suíte final: **1133/1133** Vitest verde + 6/6 Playwright `@fase1`.

Objetivo original: uma marca por instância/deploy, configurável sem alterar código.

1. **Variáveis de ambiente de marca**
   ```env
   APP_NAME="Cena Studio"
   APP_DOMAIN="cenastudio.dev"
   APP_PRIMARY_COLOR="#e85002"
   APP_LOGO_URL="/assets/logo-white.png"
   ```
2. Fazer `BrandLogo` e `AuthLayout` lerem do config central (`SITE_CONFIG` estendido), sem texto fixo no JSX.
3. Injetar a cor primária nas CSS variables via JS no carregamento (`:root { --ds-orange: var(--app-primary-color) }`), eliminando os hex fixos.
4. Substituir as ~20 referências hardcoded de "Cena Studio" por `SITE_CONFIG.title` / variável de ambiente.
5. Adicionar upload de logo no painel de configurações (Cloudinary já está integrado — baixo esforço).
6. Externalizar templates de email para usar variáveis de marca (nome, cor, logo) em vez de HTML inline fixo.

**Resultado:** cada deploy pode ser "clonado" com nome, cor e logo diferentes, mas ainda é uma instância por cliente (um banco, um deploy).

### Nível 2 — Multi-tenant real (3–5 semanas)

Objetivo: uma única instalação servindo várias marcas simultaneamente.

1. Criar model `Tenant` no Prisma: `id`, `name`, `logoUrl`, `primaryColor`, `customDomain`, `plan`.
2. Relacionar `User`, `Client`, `Project` etc. a um `tenantId` (isolamento de dados).
3. Middleware de resolução de tenant por domínio de acesso (subdomínio `cliente.cenastudio.dev` ou domínio customizado).
4. Emails e documentos gerados (PDF/DOCX) puxando a marca do tenant, não uma constante global.
5. Stripe Connect para repasse de pagamento por tenant (se o white label também revender assinaturas).
6. Painel de administração para o "operador" (você) gerenciar múltiplos tenants a partir de um único lugar.

**Resultado:** verdadeiro SaaS white label — um código, N marcas, N clientes finais, dados isolados.

---

## 4. Estimativa de esforço

| Fase | Esforço | Pré-requisito |
|---|---|---|
| Nível 1 — White label básico | 1–2 semanas / 1 dev | Nenhum |
| Nível 2 — Multi-tenant real | 3–5 semanas / 1–2 devs | Nível 1 concluído |

---

## 5. Riscos e observações

- **Cor/tipografia não é o problema.** O design system de tokens já está bem resolvido — o gargalo é a camada de *onde as coisas ficam* (layout) e *o que está fixo* (nome/marca), não a estética.
- **Testes de layout existem, mas são técnicos, não de usabilidade.** O único teste E2E (`tests/e2e/launch.spec.ts`) verifica ausência de overflow horizontal e chega a pular explicitamente a validação de um fluxo em mobile (`test.skip(...mobile...)`). Antes de multiplicar marcas via white label, vale corrigir a experiência mobile de abas com um componente único (`ResponsiveTabs`), e complementar os testes técnicos com testes de fluxo real de uso (tarefa completa, ponta a ponta, simulando um usuário).
- **Multi-tenant (Nível 2) é opcional dependendo do modelo de negócio.** Se a estratégia for vender licenças individuais (um deploy por cliente), o Nível 1 já resolve. O Nível 2 só compensa se a meta for centralizar operação e escalar sem multiplicar infraestrutura por cliente.

---

## 6. Próximos passos sugeridos

1. Resolver a inconsistência de abas em mobile (`ResponsiveTabs` único) — impacta usuário atual, independente de white label.
2. Implementar Nível 1 (variáveis de marca + upload de logo).
3. Decidir modelo de negócio (licença por deploy vs. multi-tenant) antes de investir no Nível 2.
4. Adicionar testes de fluxo real de uso (não só ausência de overflow) para dar confiança antes de escalar para múltiplas marcas.
