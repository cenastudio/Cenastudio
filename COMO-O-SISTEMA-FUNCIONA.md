# Como o Cena Studio esta conectado — guia de referencia

Este documento explica onde cada peca mora, por que esta conectada desse jeito
e o que verificar se algo parar. Para detalhes de variaveis e comandos, use
[`docs/CONEXOES.md`](./docs/CONEXOES.md), que e o runbook tecnico.

---

## 1. Visao geral: quem fala com quem

```text
Voce edita codigo no Mac
        |
        | git push origin main
        v
GitHub (github.com/cenastudio/Cenastudio, branch main)
        |
        | deploy automatico
        v
Vercel (projeto cena-studio-prod)
        |
        | API Express + Prisma
        v
Supabase Postgres (banco de producao)
        |
        +--> Supabase Storage (uploads quando configurado)
        +--> Cloudinary (midia/thumbnails em fluxos especificos)
        +--> Resend (emails transacionais)
        +--> Stripe (assinaturas e checkout)
        +--> OpenRouter/NVIDIA/Anthropic (ferramentas de IA)
        +--> GitHub OAuth (login social opcional)
```

**Regra de ouro:** producao e o projeto Vercel `cena-studio-prod`, ligado ao
GitHub `cenastudio/Cenastudio` na branch `main`. O Railway e legado historico,
nao runtime atual.

## 2. GitHub

- Repositorio: `github.com/cenastudio/Cenastudio`
- Branch de producao: `main`
- Um push em `main` dispara deploy automatico na Vercel.

Se o deploy via CLI da Vercel disser `Not authorized`, confirme antes o deploy
automatico no painel/CLI da Vercel. O vinculo local esperado fica em
`.vercel/project.json`.

## 3. Vercel

Vercel hospeda o site e a API.

- Projeto: `cena-studio-prod`
- Dominio principal: `https://cena-studio-prod.vercel.app`
- Alias do projeto: `https://cena-studio-prod-cenastudio-3104s-projects.vercel.app`
- Alias da branch `main`:
  `https://cena-studio-prod-git-main-cenastudio-3104s-projects.vercel.app`

Validacao minima depois de cada deploy:

```bash
npx vercel ls cena-studio-prod
npx vercel inspect https://cena-studio-prod.vercel.app
curl -I -L https://cena-studio-prod.vercel.app/
curl -sS -L https://cena-studio-prod.vercel.app/health
curl -sS -L https://cena-studio-prod.vercel.app/ready
```

O esperado e deployment `Ready`, `/` com HTTP 200, `/health` com `status: ok` e
`/ready` com `ready: true` e banco `ok`.

## 4. Supabase Postgres

Supabase hospeda o banco de producao. O app acessa esse banco via Prisma.

- Variavel canonica: `SUPABASE_DATABASE_URL`
- Fallback/compatibilidade: `DATABASE_URL`
- Project ref conhecido: `arnrvmldotpoawowcbll`

Use a URL do pooler do Supabase em ambiente serverless. Depois de importar dados
manualmente, rode `npm run db:reset-sequences` para alinhar sequences e evitar
erros de `Unique constraint failed on id`.

## 5. Autenticacao

O login principal do app e proprio do backend: JWT assinado por `JWT_SECRET` em
cookie httpOnly. GitHub OAuth existe como login social opcional. Supabase Auth
nao e a fonte principal de sessao do app.

O Portal do Cliente usa token separado (`client_portal_token`), tambem assinado
com `JWT_SECRET`. Trocar esse segredo derruba sessoes do app e do portal ao
mesmo tempo.

## 6. Variaveis de ambiente

As variaveis ficam na Vercel e no ambiente local seguro. O arquivo
`.env.example` deve listar nomes e finalidade, nunca valores reais.

Obrigatorias para o essencial:

- `SUPABASE_DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Servicos que habilitam areas especificas:

- `CLOUDINARY_*`
- `RESEND_API_KEY`
- `STRIPE_*`
- `OPENROUTER_*`, `NVIDIA_*`, `ANTHROPIC_*`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`

Veja a lista completa em [`docs/CONEXOES.md`](./docs/CONEXOES.md).

## 7. Checklist rapido: "o site caiu"

1. Verifique `npx vercel ls cena-studio-prod`.
2. Se o deploy falhou, abra `npx vercel inspect <deployment-url>` e leia o erro
   de build/runtime antes de mexer em variavel.
3. Se o deploy esta `Ready`, teste `/health` e `/ready`.
4. Se `/ready` acusar banco, valide `SUPABASE_DATABASE_URL` e rode
   `npm run smoke:prisma` localmente com o ambiente correto.
5. Se o login falhar, confira `JWT_SECRET`, `CLIENT_ORIGIN`, cookies e GitHub
   OAuth quando o fluxo social estiver envolvido.
6. Nunca apague variaveis "so para testar". Registre antes o nome, origem e
   impacto.

## 8. O que nao procurar mais

- Railway como hospedagem de producao atual
- Postgres do Railway como banco canonico
- Supabase Auth como auth principal do app
- Redis/Bull Queue/scheduler para retry de webhook

Esses itens aparecem em historico antigo, mas nao representam o runtime atual.

---

**Ultima atualizacao:** 14 de agosto de 2026
