# Spec: Features Críticas - Gap Analysis Competitivo

## 📋 Visão Geral

Esta spec implementa **8 features estratégicas** para fechar o gap competitivo do Cena Studio com líderes de mercado (StudioBinder, Frame.io, Monday.com). O objetivo é aumentar de **53% para ~80% de feature parity** mantendo zero custo adicional de infraestrutura.

**Estimativa:** ~28 dias de desenvolvimento (6 semanas com buffer)
**Status:** ⏸️ Aguardando aprovação para início
**Princípio:** Zero custo adicional — usa apenas stack existente (Prisma, Cloudinary, APIs gratuitas)

---

## 🎯 8 Features Implementadas

### Fase 1 (Semana 1) — 6-7 dias
1. **Project Templates** — Duplicar projetos pré-configurados (Reel 30s, Comercial, etc)
2. **Client Portal** — Link público para cliente acompanhar progresso e aprovar entregas

### Fase 2 (Semana 2) — 6-7 dias
3. **Webhooks Genéricos** — HTTP POST em eventos (integra Zapier/Make/Slack)
4. **Asset Library** — Biblioteca central de logos/músicas/footage reutilizáveis

### Fase 3 (Semana 3) — 7-8 dias
5. **Shot List Visual** — Drag-and-drop de planos com thumbnails
6. **Script Breakdown** — IA extrai personagens, locações, props de roteiro

### Fase 4 (Semana 4) — 8-9 dias
7. **Timesheet** — Timer e rastreamento de horas por task/projeto
8. **Google Calendar Sync** — Export callsheets como .ics + sync Google Calendar

---

## 📂 Arquivos do Spec

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| [`requirements.md`](./requirements.md) | 8 requirements detalhados com acceptance criteria | ✅ Completo |
| [`design.md`](./design.md) | Arquitetura, data models, APIs, componentes | ✅ Completo |
| [`tasks.md`](./tasks.md) | 32 tasks executáveis em 4 fases | ✅ Completo |

---

## 🚀 Como Começar

### 1. Revisar o Spec

Leia na ordem:
1. **Requirements** — entenda o "o quê" e "por quê" de cada feature
2. **Design** — veja como será implementado tecnicamente
3. **Tasks** — lista passo-a-passo do que fazer

### 2. Executar Fase por Fase

Cada fase é uma semana de trabalho (~5-7 dias úteis):

```bash
# Fase 1: Templates + Client Portal
git checkout -b feat/gap-analysis-fase-1
# Implementar tasks 1.1 a 1.10
npm run test && npm run check && npm run build
git commit -m "feat: templates and client portal (fase 1)"

# Fase 2: Webhooks + Asset Library
git checkout -b feat/gap-analysis-fase-2
# Implementar tasks 2.1 a 2.11
# ...

# Fase 3: Shot List + Script Breakdown
# Fase 4: Timesheet + Google Calendar
```

### 3. Validação de Cada Fase

Ao final de cada fase:
- ✅ Todos testes unitários passando (+20 novos por fase)
- ✅ `npm run check` sem erros TypeScript
- ✅ `npm run build` sucesso
- ✅ Testar fluxo completo manualmente
- ✅ Commit isolado com mensagem descritiva

---

## 📊 Impacto Esperado

### Antes (Fase 3 concluída)
- **Feature parity:** 53% vs líderes
- **Diferenciais:** 4 (IA BR, white-label, preço, workflow produtoras)
- **Gap crítico:** Templates, Portal Cliente, Integrações, Asset Management

### Depois (Gap Analysis completa)
- **Feature parity:** ~80% vs líderes 🎯
- **Diferenciais:** 4 mantidos + 8 features novas
- **Gap crítico:** Apenas real-time collaboration (requer Redis $10/mo — fora de escopo)

### Métricas de Sucesso
- 📈 Usuários conseguem criar projeto em <2min (vs 15min antes) — **Templates**
- 📈 Clientes aprovam entregas sem email/Dropbox manual — **Client Portal**
- 📈 Integrações Zapier/Make sem dev custom — **Webhooks**
- 📈 Re-uso de assets economiza tempo de upload — **Asset Library**
- 📈 DOP visualiza sequência antes de filmar — **Shot List**
- 📈 Breakdown automático reduz erro humano — **Script Breakdown**
- 📈 Timesheet permite cobrança precisa por hora — **Timesheet**
- 📈 Equipe sincroniza callsheets automaticamente — **Calendar Sync**

---

## 💰 Custo Real (Zero Adicional)

| Item | Custo Mensal | Justificativa |
|------|--------------|---------------|
| Postgres (Prisma) | $0 | Railway incluso |
| Cloudinary storage | $0 | Free tier 25GB suficiente (+10-15% uso) |
| Google Calendar API | $0 | Free até 1M req/dia |
| OpenRouter AI (breakdowns) | ~$0.20 | $0.001/roteiro × 100 users × 2/mês |
| **TOTAL** | **~$0.20/mês** | Desprezível |

---

## 🔗 Referências

- **Análise Competitiva:** Conversas anteriores (Task 2 do summary)
- **Stack Atual:** [`ARCHITECTURE.md`](../../../ARCHITECTURE.md)
- **Fase Anterior:** [`fase-3-white-label`](../fase-3-white-label/) (white-label básico)
- **Plano Macro:** [`PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md)

---

## ✅ Checklist de Aprovação

Antes de começar implementação, confirme:

- [ ] Leu requirements.md completo
- [ ] Leu design.md completo
- [ ] Leu tasks.md completo
- [ ] Entendeu dependências entre tasks
- [ ] Confirmou que todas features usam stack existente (zero custo novo)
- [ ] Decidiu estratégia: sequencial (mais seguro) ou paralelo (mais rápido)
- [ ] Criou branch `feat/gap-analysis-fase-1` para começar

**Pronto para começar? Execute Task 1.1!** 🚀
