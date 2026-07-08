# Como o Cena Studio está conectado — guia de referência

Este documento existe pra você (ou qualquer pessoa, mesmo sem saber programar)
entender **onde cada peça mora, por que está conectada daquele jeito, e o que
fazer se algo parar de funcionar**. Guarde este arquivo — ele é a fonte da
verdade sobre a infraestrutura do projeto.

---

## 1. Visão geral: quem fala com quem

```
Você edita código no seu Mac (Kiro)
        │
        │  git push
        ▼
   GitHub (github.com/cenastudio/Cenastudio, branch "main")
        │
        │  Railway "escuta" o GitHub e reage automaticamente a cada push
        ▼
   Railway (hospeda o site e o banco de dados)
        │
        ├── Serviço "Cenastudio" → roda o código (site + API)
        └── Serviço "Postgres"   → banco de dados (clientes, projetos, etc)
        │
        ├──► Resend (envia emails: reset de senha, convite de reunião, contato)
        ├──► Stripe (cobra os planos Pro/Studio)
        ├──► Cloudinary (guarda arquivos/vídeos enviados)
        └──► OpenRouter (motor de IA das ferramentas do Studio)
```

**Regra de ouro:** o site que está no ar (`cenastudio-production.up.railway.app`)
é sempre um reflexo do que está no GitHub, branch `main`. Se você (ou eu) não
fizer `git push`, nada muda no ar — não importa o que exista no seu computador.

---

## 2. GitHub — onde o código "mora" oficialmente

- Repositório: `github.com/cenastudio/Cenastudio`
- Branch usada em produção: `main`
- Toda vez que alguém dá `git push origin main`, o Railway percebe e começa
  um novo deploy automaticamente. Não precisa avisar o Railway manualmente.

**⚠️ Ação necessária:** o "cadeado" que autentica seu Git com o GitHub (um
token de acesso) foi encontrado embutido na configuração local durante esta
sessão. Isso é como uma senha em texto aberto. Recomendo fortemente:
1. Ir em GitHub → Settings → Developer settings → Personal access tokens
2. Revogar o token atual
3. Gerar um novo e reconectar o Git sem embutir o token na URL (usar o
   Keychain do macOS, que já vem pronto pra isso)

---

## 3. Railway — onde o site "roda" de fato

Railway é o provedor de hospedagem. Ele tem dois serviços dentro do mesmo
projeto (`cena-studio-prod`):

### 3a. Serviço "Cenastudio"
É o site + a API. URL pública: `https://cenastudio-production.up.railway.app`

**Como ele constrói o site (isso já causou 2 quedas nesta sessão, veja a
seção 6):**
1. Railway baixa o código do GitHub
2. Roda `npm ci` (instala as dependências do `package.json`)
3. Roda `npm run build` (compila o site)
4. Roda `npm run start:prod` (liga o servidor)
5. Espera a rota `/health` responder OK — só então marca o deploy como
   "ativo" e direciona o tráfego pra ele

Essa receita está no arquivo `railway.json` (na raiz do projeto) e no
`package.json` (scripts `build`, `start`, `start:prod`).

### 3b. Serviço "Postgres"
É o banco de dados. Guarda todos os clientes, projetos, propostas,
reuniões, usuários, etc. Não tem interface visual — só é acessado pelo
código do site (nunca diretamente pelo navegador).

---

## 4. As variáveis de ambiente (as "chaves" que fazem tudo funcionar)

Ficam configuradas dentro do Railway, na aba **Variables** do serviço
"Cenastudio". São como um cofre de configurações que o código lê ao ligar.
Nenhuma delas fica escrita no código-fonte (por segurança) — só existem
dentro do Railway.

| Variável | Para que serve | O que quebra se sumir/errar |
|---|---|---|
| `DATABASE_URL` | Endereço do banco Postgres | Site inteiro para de funcionar |
| `JWT_SECRET` | Assina o "crachá" de login dos usuários | Todo mundo é deslogado |
| `ADMIN_DEFAULT_PASSWORD` | Senha do usuário admin | Login do admin falha |
| `CLIENT_ORIGIN` | URL pública do site (usada em links de email/CORS) | Links de email quebrados, erro de CORS |
| `NODE_ENV` | Diz "estou em produção" | Ativa otimizações e trava alguns recursos de dev |
| `NPM_CONFIG_PRODUCTION` | Ver seção 6 — crítica pro build não falhar | Build falha com "vite: not found" |
| `RESEND_API_KEY` | Envia emails (reset senha, convite de reunião, contato) | Emails não são enviados (mas o site continua no ar) |
| `EMAIL_FROM` | Nome/endereço que aparece como remetente do email | Emails saem com remetente genérico |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Processam pagamento dos planos | Checkout de assinatura falha |
| `STRIPE_WEBHOOK_SECRET` | Confirma que notificações do Stripe são legítimas | Pagamentos não atualizam o plano do usuário |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STUDIO` | Qual "produto" do Stripe corresponde a cada plano | Checkout aponta pro plano errado |
| `CLOUDINARY_*` | Upload de arquivos/vídeos | Upload de arquivo falha |
| `OPENROUTER_API_KEY` | Motor de IA das ferramentas do Studio | Ferramentas de IA não geram conteúdo |
| `PORT` | Porta interna que o servidor escuta | Não deve ser alterada — o Railway controla isso |

**Se você trocar uma senha ou chave em algum desses provedores (Stripe,
Resend, etc), ela precisa ser atualizada aqui também.** O código não sabe
que a senha mudou lá fora — ele só lê o que está configurado no Railway.

---

## 5. Banco de dados — Postgres dentro do Railway

- O banco **não é** o Supabase (havia uma configuração antiga do Supabase
  que foi abandonada — ver variável solta mencionada na seção 7).
- É um Postgres criado dentro do próprio Railway, serviço "Postgres".
- A estrutura de tabelas (clientes, projetos, reuniões, etc) é controlada
  pelo Prisma (uma ferramenta que traduz o código em tabelas de banco).
  Os arquivos que descrevem essa estrutura estão em `prisma/schema.prisma`
  e `prisma/migrations/`.
- **Nunca edite tabelas do banco diretamente.** Qualquer mudança de
  estrutura deve passar por uma "migration" do Prisma, senão o código e o
  banco ficam desalinhados.

---

## 6. Problema que já aconteceu 2x: build falhando

**O que acontece:** o deploy falha rápido (15-20 segundos) com um erro do
tipo `vite: not found` ou `esbuild: not found`.

**Por que acontece:** a variável `NODE_ENV=production` (necessária pro site
funcionar direito quando está no ar) tem um efeito colateral durante a
etapa de **construção** do site: o `npm` acha que não precisa instalar
ferramentas de desenvolvimento (`vite`, `esbuild`, `typescript`), só que
essas ferramentas são justamente as que constroem o site. É uma
contradição do próprio ecossistema Node/NPM, não um erro no código do
Cena Studio.

**Como já foi resolvido:** existe uma variável extra no Railway,
`NPM_CONFIG_PRODUCTION=false`, que resolve exatamente essa contradição —
ela diz "mesmo estando em modo produção, instale tudo que for pedido".
Essa variável **já está configurada**. Se ela for removida por engano no
futuro, o mesmo erro vai voltar a acontecer.

**O que NÃO fazer:** não adicionar um comando de build customizado no
`railway.json` pra "forçar" a instalação — isso já foi tentado e causou
outro erro (`EBUSY: resource busy`), porque duplicava o processo de
instalação. A solução correta é só a variável de ambiente mencionada acima.

---

## 7. Lixo/resíduos de configurações antigas (não afeta nada, mas existe)

Durante essa auditoria encontrei uma variável de ambiente no Railway cujo
**nome** (não valor) é uma string de conexão de banco Supabase antiga
inteira. Isso é sobra de uma tentativa anterior de configuração malfeita.
Não é usada por nenhum código hoje, mas polui a lista de variáveis e pode
confundir no futuro. Pode ser removida com segurança quando quiser — vou
apontar exatamente qual é se você pedir.

---

## 8. Checklist rápido: "o site caiu, o que eu faço?"

1. Acesse `railway status` (ou o painel web do Railway) e veja se o
   serviço está "Online" ou "Deploy failed".
2. Se "Deploy failed": olhe os logs de build (`railway logs <id> --build`)
   procurando a palavra `error` ou `ERRO`. Compare com a seção 6 antes de
   mexer em qualquer configuração.
3. Se "Online" mas o site não funciona: teste `curl
   https://cenastudio-production.up.railway.app/health` — se responder
   `200`, o servidor está de pé, o problema é mais específico (banco,
   login, uma rota). Peça pra investigar uma função específica.
4. **Nunca** apague variáveis de ambiente "só para testar" — sempre anote
   o valor antes de remover algo.

---

*Documento criado em 08/07/2026 após dois incidentes reais de deploy
(build falhando por NODE_ENV, e login do admin desincronizado). Mantenha
atualizado se novas peças (novos provedores, novas variáveis) forem
adicionadas ao sistema.*
