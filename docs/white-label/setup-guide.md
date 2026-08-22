# Setup Guide — Deploy White Label (Fase 3, Nível 1)

> Guia prático para "clonar" o deploy da plataforma para uma nova marca,
> mudando apenas variáveis de ambiente. Sem editar código, sem rebuild
> manual do design system.

**Escopo desta fase (Nível 1 do [`WHITE_LABEL_PLAN.md`](../../WHITE_LABEL_PLAN.md#3-roadmap-de-implementação)):** um deploy = uma marca. Cada operação/cliente
tem sua própria instância do app, DB e Postgres. Multi-tenant real (uma
instância servindo N marcas simultaneamente) é a Fase 4, opcional.

---

## Checklist rápido (5 minutos para deploy limpo)

1. **Clonar o repositório** — `git clone <repo-url> deploy-marca-x`.
2. **Copiar `.env.example` para `.env`** e preencher pelo menos as 5 chaves
   de brand (ver seção "Variáveis de ambiente" abaixo).
3. **Substituir o favicon estático** — `client/public/favicon.svg` (fora
   do escopo da automação, ver "O que não é dinâmico").
4. **Rodar `npm install && npm run build`** — build já pega
   `VITE_APP_*` do `.env`.
5. **Rodar `prisma migrate deploy`** no Postgres do cliente para aplicar
   `add_studio_logo_url` (adiciona coluna `logo_url` em `studio_settings`).
6. **Subir o servidor** (`npm run start` ou docker/Railway/etc.).

Pronto. A UI, os emails, os PDFs, o ICS de reunião e os documentos
gerados já usam o nome e a cor da marca.

---

## Variáveis de ambiente

Todas com defaults que reproduzem o comportamento "Cena Studio" atual —
não preencher = deploy padrão.

### Bloco server-side (`process.env.APP_*`)

| Variável | Default | O que controla |
|---|---|---|
| `APP_NAME` | `Cena Studio` | Nome curto exibido em UI, emails, PDFs. |
| `APP_NAME_PARTS` | `Cena|Studio` | Wordmark em duas partes (Parte1 branco, Parte2 cor primária). Formato: `"Parte1|Parte2"`. Vazio ou sem `|` renderiza `APP_NAME` como parte única. |
| `APP_DOMAIN` | `cenastudio.dev` | Usado em emails, share links, SEO. |
| `APP_PRIMARY_COLOR` | `#e85002` | Hex `#RRGGBB` ou `#RGB`. Cor de botões, glows, tabs, shadows. |
| `APP_LOGO_URL` | *(vazio)* | URL relativa ou absoluta do logo (ex.: `/assets/logo.png`). Usuários podem sobrescrever no painel StudioSettings. |
| `SUPPORT_EMAIL` | *(vazio → fallback `cenastudio@atomicmail.io`)* | Email de suporte visível em rodapés e como destinatário do formulário de contato. |

### Bloco client-side (`import.meta.env.VITE_APP_*`)

Vite não expõe env vars sem prefixo `VITE_`. Duplicar os mesmos valores:

```
VITE_APP_NAME=Aurora Filmes
VITE_APP_NAME_PARTS=Aurora|Filmes
VITE_APP_DOMAIN=aurora.example
VITE_APP_PRIMARY_COLOR=#c81e1e
VITE_APP_LOGO_URL=/assets/logo-aurora.png
VITE_SUPPORT_EMAIL=contato@aurora.example
```

**Convenção:** preencher os dois blocos com os mesmos valores. Se o
operador esquecer um deles, o comportamento fica inconsistente (server
mostra "Aurora Filmes" nos emails mas o client mostra "Cena Studio" na
UI).

---

## O que fica dinâmico automaticamente

- **Todo texto de UI** que hoje diz "Cena Studio" nas páginas (`AIChatbot`,
  `AppNavBar`, `AuthLayout`, `BrandLogo`, `Hero`, `ProductProofSection`,
  `Dashboard`, `Success`, `SharedReview`, `Profile`, `CommercialOverview`).
- **Cor primária** injetada em `--ds-orange` e `--ds-orange-rgb` em
  runtime via `applyBrandTokens()` (chamado antes do primeiro paint em
  `main.tsx`). Todos os gradients/shadows/glows do design system
  refletem a nova cor.
- **Wordmark de duas partes** via `BrandLogo` — automático com
  `APP_NAME_PARTS`.
- **Emails** (reset de senha, convite de reunião) usam `SITE_CONFIG.brandName`
  no assunto e HTML.
- **ICS de reunião** — o `PRODID` reflete a marca.
- **PDFs e DOCX gerados** — cabeçalho, cor de linha divisória, footer e
  filename derivam da marca.
- **Prompts de IA** — o assistente se apresenta com o nome correto da
  marca.
- **Meta tags do `<head>`** — via `%VITE_APP_NAME%` no `index.html`,
  substituído em build/dev.

---

## O que NÃO é dinâmico (operador precisa trocar manualmente)

Estas peças ficaram intencionalmente fora do escopo Nível 1 porque
gerá-las dinamicamente é significativamente mais complexo do que o valor
que entregam no MVP. O operador substitui uma vez, ao configurar o deploy.

- **Favicon SVG** — `client/public/favicon.svg`. Substituir por seu SVG
  antes de `npm run build`. O `index.html` continua referenciando o mesmo
  caminho.
- **Logos estáticos** — `client/public/assets/logo.png`, `logo-white.png`,
  se você preferir apontar `APP_LOGO_URL=/assets/logo.png`. Trocar o
  arquivo diretamente.
- **Templates legais estáticos** — `client/public/terms-of-use.html` e
  `privacy-policy.html`. Estes têm "Cena Studio" repetido dezenas de
  vezes em texto jurídico. Substituir manualmente ou reescrever para o
  cliente. **Alta prioridade jurídica antes de ir ao ar.**

---

## Verificação pós-deploy

Depois de configurar `.env` e subir a nova marca, valide:

```bash
# Grep sanity check: só a linha 15 de tokens.css deve ter #e85002
rg "#e85002" client/src/design-system/

# Grep de "Cena Studio" no código funcional (excluindo docs)
rg "Cena Studio" client/src/{components,pages}/

# Rodar suite de testes
npm run test              # Vitest → 1133 passing
npx playwright test       # E2E → sem regressão
```

E abrir a UI:
- Login/register: wordmark reflete `APP_NAME_PARTS`.
- Dashboard: header, atalhos, empty states usam cor primária correta.
- Enviar convite de reunião: email + arquivo `.ics` com marca.
- Exportar PDF/DOCX: cabeçalho e cor de linha da marca.

---

## Contraste WCAG da cor primária

O sistema **não valida** contraste automaticamente. Se você escolher
uma cor de baixo contraste em fundo escuro (ex.: `#404040` no theme dark),
a UI ficará ruim de ler mas não quebra.

Ferramentas para checar contraste antes de decidir:

- [coolors.co/contrast-checker](https://coolors.co/contrast-checker)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

Meta WCAG AA para texto: **contraste 4.5:1** em fundo dark.
Meta AAA (opcional): **7:1**.

---

## Sobrescrita per-user via StudioSettings

Além da env global, cada usuário admin (plano Studio ou Admin) pode
sobrescrever `studioName`, `primaryColor` e `logoUrl` no painel
`Configurações → Estúdio` (rota `/company`). Precedência:

```
usuário (StudioSetting)  >  env (APP_*)  >  default (Cena Studio)
```

Esta camada é útil quando o mesmo deploy roda para o operador (marca A)
mas alguns clientes querem sua própria "sub-marca" nos emails que enviam
ao cliente final.

---

## Migração Prisma

A Fase 3 introduz uma migração aditiva **`add_studio_logo_url`**:

```sql
ALTER TABLE "studio_settings" ADD COLUMN "logo_url" TEXT;
```

- Nullable, sem default. Zero risco de perda de dados.
- Aplicar via `prisma migrate deploy` no ambiente de destino.
- SQLite dev fica retrocompatível — o helper `ensureStudioSettingsColumns`
  em `server/models/db.ts` faz `ALTER TABLE ADD COLUMN` se a coluna não
  existir no banco existente.

---

## Referências

- [`WHITE_LABEL_PLAN.md`](../../WHITE_LABEL_PLAN.md) — o "porquê" do
  white label + o roadmap completo Nível 1 / Nível 2.
- [`.kiro/specs/fase-3-white-label-OK/`](../../.kiro/specs/fase-3-white-label-OK/) —
  requirements, design e tasks da fase.
- [`PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../PLANO-IDEAL-PROXIMOS-PASSOS.md) —
  ordem macro das fases.
