# Cena Studio

**Software de gestão para produtoras de vídeo e profissionais audiovisuais**

🔒 **CÓDIGO PROPRIETÁRIO — TODOS OS DIREITOS RESERVADOS**

[![Deploy Status](https://img.shields.io/badge/deploy-online-success)](https://cenastudio-production.up.railway.app)

---

## 📋 Sobre

Cena Studio é uma plataforma SaaS para gestão de produtoras de vídeo e
profissionais audiovisuais solo (filmmakers, dronistas/FPV, editores,
fotógrafos): do briefing comercial à entrega final, com ferramentas de IA
para gerar documentos de produção.

### Principais áreas

- **Produção** — Shot List (PDF pronto para set, tipos de plano
  customizáveis), Timesheet (timer + cálculo de custo por taxa/hora +
  calculadora de precificação por trabalho), Equipment Inventory,
  Video Reviews (aprovação de cliente com comentários por timestamp em
  link público).
- **Comercial** — Clientes (CRM), Pipeline de oportunidades, Propostas
  digitais com link compartilhável e aceite rastreado, Interações.
- **Financeiro** — Orçamento por projeto (orçado vs. realizado),
  lançamentos financeiros.
- **Estúdio de IA** — 12 ferramentas (Roteiro, Decupagem, Callsheet,
  Orçamento, Proposta, Contrato, Briefing, Moodboard, Checklist,
  Cronograma, Relatório de Entrega, Assistente Livre).
- **Analytics Premium** — dashboards customizáveis com widgets
  (KPI, gráficos, tabela, funil, medidor) puxando dados reais do sistema.
- **Admin** — gestão de usuários e assinaturas, suspensão de conta,
  reset de senha, indicações com recompensa automática, processamento de
  solicitações LGPD, audit log de ações administrativas.

### Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Radix UI
- **Backend:** Express + TypeScript + Prisma
- **Banco de dados:** PostgreSQL (Railway)
- **Storage de arquivos:** Cloudinary (thumbnails) + Supabase Storage
  (uploads de projeto)
- **IA:** OpenRouter (com cadeia de fallback de modelos), Anthropic
  como alternativa
- **Pagamentos:** Stripe
- **Deploy:** Railway (Nixpacks)

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) para decisões de arquitetura
detalhadas.

---

## ⚖️ Licença e Propriedade Intelectual

**Copyright © 2024–2026 Cena Studio. Todos os direitos reservados.**

Este software é **propriedade privada** e está protegido por leis de
direitos autorais e propriedade intelectual do Brasil e tratados
internacionais.

### Proibições

- Uso não autorizado deste código ou parte dele
- Cópia, reprodução ou distribuição do código-fonte
- Modificação ou criação de obras derivadas
- Engenharia reversa, descompilação ou desmontagem
- Comercialização ou sublicenciamento
- Uso em produtos concorrentes

O uso não autorizado pode resultar em ações judiciais cíveis por
violação de propriedade intelectual, indenizações, medidas cautelares e
processos criminais conforme a Lei nº 9.609/98 (Lei do Software).

---

## 🔐 Acesso ao Código

Este repositório é **privado** e o acesso é restrito a desenvolvedores
autorizados e membros da equipe interna. Qualquer acesso não autorizado
será tratado como violação de segurança.

---

## 📞 Contato

**Cena Studio**

🌐 https://cenastudio.dev
📧 cenastudio@atomicmail.io

---

## 🚨 Aviso Legal

Este software é fornecido "como está", sem garantias de qualquer tipo.
A Cena Studio se reserva o direito de modificar ou descontinuar o
software a qualquer momento.

**Versão atual:** 1.0.0
**Última atualização:** 14 de julho de 2026
