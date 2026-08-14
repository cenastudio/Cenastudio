# Cena Studio

**Software de gestao para produtoras de video e profissionais audiovisuais**

**CODIGO PROPRIETARIO — TODOS OS DIREITOS RESERVADOS**

[![Deploy Status](https://img.shields.io/badge/deploy-online-success)](https://cena-studio-prod.vercel.app)

---

## Sobre

Cena Studio e uma plataforma SaaS para gestao de produtoras de video e
profissionais audiovisuais solo: do briefing comercial a entrega final, com
ferramentas de IA para gerar documentos de producao e apoiar a operacao.

## Producao Atual

- **Deploy:** Vercel, projeto `cena-studio-prod`
- **Dominio:** `https://cena-studio-prod.vercel.app`
- **Repositorio:** `cenastudio/Cenastudio`, branch `main`
- **Banco:** Supabase Postgres via Prisma
- **Storage:** Supabase Storage e Cloudinary para fluxos de midia especificos

Leia antes de mexer em deploy, banco ou variaveis:

- [`AGENTS.md`](./AGENTS.md) — constituicao operacional do repo
- [`docs/CONEXOES.md`](./docs/CONEXOES.md) — Vercel, Supabase, GitHub, storage,
  IA, Stripe, Resend e ordem de bring-up
- [`docs/STATUS.md`](./docs/STATUS.md) — estado vivo das features e proximas
  tarefas
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — ADRs e decisoes de arquitetura

## Areas Implementadas

- **Producao:** Shot List, tipos de plano, thumbnails, PDF, Timesheet, Budget,
  DRE por projeto, Equipment Inventory, tarefas e Video Reviews.
- **Comercial:** clientes, oportunidades, pipeline, propostas, reunioes,
  interacoes e exportacao.
- **Arquivos e cliente:** upload/listagem de arquivos, Portal do Cliente,
  acesso publico a propostas/reviews e storage stats.
- **IA:** Studio de IA com roteamento por criticidade e fallback de provedores.
- **Analytics/Admin:** dashboards, relatorios, metricas, usuarios, planos,
  auditoria, LGPD, referrals e uso de IA.
- **Integracoes:** Stripe, Resend, Cloudinary, Supabase, GitHub OAuth opcional e
  webhooks configuraveis.

O estado detalhado por modulo fica em [`docs/STATUS.md`](./docs/STATUS.md).
Nao use documentos historicos como fonte de verdade.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Radix UI
- **Backend:** Express + TypeScript + Prisma
- **Banco de dados:** Supabase Postgres
- **Deploy:** Vercel
- **IA:** OpenRouter/NVIDIA/Anthropic via camada de servico
- **Pagamentos:** Stripe
- **E-mail:** Resend

## Desenvolvimento

```bash
npm install
npm run check
npm run test
npm run build
```

Para validar ambiente e banco:

```bash
npm run validate:env
npm run smoke:prisma
```

## Licenca e Propriedade Intelectual

Copyright (c) 2024-2026 Cena Studio. Todos os direitos reservados.

Este software e propriedade privada e esta protegido por leis de direitos
autorais e propriedade intelectual do Brasil e tratados internacionais.

## Proibicoes

- Uso nao autorizado deste codigo ou parte dele
- Copia, reproducao ou distribuicao do codigo-fonte
- Modificacao ou criacao de obras derivadas
- Engenharia reversa, descompilacao ou desmontagem
- Comercializacao ou sublicenciamento
- Uso em produtos concorrentes

## Contato

**Cena Studio**

- Site: https://cenastudio.dev
- Email: cenastudio@atomicmail.io

**Versao atual:** 1.0.0
**Ultima atualizacao:** 14 de agosto de 2026
