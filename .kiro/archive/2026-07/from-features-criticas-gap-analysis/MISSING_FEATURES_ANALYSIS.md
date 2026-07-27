
# Análise de Features Faltando — Cena Studio

**Data:** 10 de Julho de 2026
**Escopo:** Identificar o que está quebrado e o que falta implementar

---

## 🚨 PROBLEMA IDENTIFICADO: Video Review Quebrado

### Status Atual
❌ **QUEBRADO** - Frontend existe mas backend incompleto/desconectado

### O que existe:
✅ Frontend completo em `client/src/pages/VideoReviews.tsx` (~600 linhas)
✅ Componentes auxiliares: `VideoUploader`, `VideoPlayer`, `ReviewCommentComposer`, `AnnotationCanvas`
✅ Rotas de backend criadas: `server/routes/videoReviews.ts`, `server/routes/videoUpload.ts`
✅ UI integrada em ProjectHub e ClientDetail

### O que está faltando/quebrado:
❌ **Rotas não registradas no `server/app.ts`** ou `server/routes/index.ts`
❌ **Endpoints retornando 404:**
  - `GET /api/video-reviews` (lista reviews)
  - `GET /api/video-reviews/projects/:projectId` (reviews por projeto)
  - `POST /api/video-reviews` (criar review)
  - `GET /api/video-review?id=:id` (detalhes review)
  - `PUT /api/video-review?id=:id` (atualizar status)
  - `DELETE /api/video-reviews/:id` (deletar review)
  - `POST /api/video-review-share` (gerar link compartilhável)
  - `POST /api/video-review-comment` (adicionar comentário)
  - `PUT /api/video-review-comment-resolve` (resolver comentário)
  - `DELETE /api/video-review-comment?commentId=:id` (deletar comentário)
  - `POST /api/video-upload` (upload de vídeos)

❌ **Possível falta de migration Prisma:**
  - Tabela `video_reviews` (ou `VideoReview` model)
  - Tabela `video_review_comments` (ou `VideoReviewComment` model)

❌ **Service layer potencialmente ausente:**
  - `server/services/videoReviewService.ts`
  - `server/services/videoUploadService.ts`

---

## 🔍 Análise das 9 Features Críticas do Gap Analysis

### ✅ Features Implementadas e Funcionando (8/9):

#### 1. ✅ Project Templates (Feature A)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/templates`
- **Testes:** 12 passando

#### 2. ✅ Client Portal (Feature B)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/client-portal`
- **Testes:** 29 passando

#### 3. ✅ Webhooks Genéricos (Feature C)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/webhooks`
- **Testes:** 19 passando (service + cron)

#### 4. ✅ Asset Library (Feature D)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/assets`
- **Testes:** 23 passando

#### 5. ✅ Shot List Visual (Feature E)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/shots`
- **Testes:** 15+ passando

#### 6. ✅ Script Breakdown (Feature F)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/breakdown`
- **Testes:** 10+ passando

#### 7. ✅ Timesheet (Feature G)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/timesheet`
- **Testes:** 18+ passando

#### 8. ✅ Google Calendar Sync (Feature H)
- **Status:** COMPLETO e production-ready
- **Rotas registradas:** `/api/calendar`
- **Testes:** 12+ passando

### ⏳ Feature Pendente (1/9):

#### 9. ⏳ Session Management (Feature I)
- **Status:** PENDENTE (Task 33)
- **Spec:** 100% completa em `SESSION_MANAGEMENT_SPEC.md`
- **E2E test:** Já criado no Task 30
- **Estimativa:** 2-3 dias de implementação

---

## 🆕 Feature Adicional Descoberta (Fora do Escopo Original)

### Video Review (Feature não documentada no Gap Analysis)
- **Status:** ❌ QUEBRADO (frontend existe, backend desconectado)
- **Origem:** Implementada antes do Gap Analysis (código legado)
- **Não estava na lista de 9 features críticas**
- **Necessita:** Reconexão das rotas + possível correção de migrations

**Razão pela qual quebrou:**
Provavelmente durante refatoração ou limpeza de código, as rotas foram desregistradas do `server/app.ts` mas o frontend permaneceu intacto.

---

## 📋 Checklist de Correção: Video Review

Para consertar o Video Review quebrado:

### 1. Verificar Prisma Schema
```bash
# Verificar se modelos existem
grep -A 10 "model.*Video" prisma/schema.prisma
```

**Modelos esperados:**
- `VideoReview` (ou `video_reviews`)
- `VideoReviewComment` (ou `video_review_comments`)

### 2. Verificar Services Existem
```bash
ls -la server/services/ | grep -i video
```

**Services esperados:**
- `videoReviewService.ts`
- `videoUploadService.ts`

### 3. Registrar Rotas no App
```typescript
// Em server/app.ts ou server/routes/index.ts
import videoReviewsRouter from "./routes/videoReviews.js";
import videoUploadRouter from "./routes/videoUpload.js";

app.use("/api/video-reviews", videoReviewsRouter);
app.use("/api/video-review", videoReviewsRouter); // endpoints singular
app.use("/api/video-upload", videoUploadRouter);
```

### 4. Verificar Controllers
```bash
ls -la server/controllers/ | grep -i video
```

**Controllers esperados:**
- `videoReviewController.ts`

### 5. Testar Endpoints
Após registrar rotas:
```bash
# Teste básico
curl -X GET http://localhost:5000/api/video-reviews \
  -H "Cookie: frame_token=..." \
  --cookie-jar cookies.txt

# Deve retornar 200 (não 404)
```

### 6. Verificar Migrations Aplicadas
```bash
npx prisma migrate status
```

Se houver migrations pendentes relacionadas a video_reviews, aplicar:
```bash
npx prisma migrate deploy
```

---

## 🎯 Priorização de Correções

### URGENTE (consertar AGORA):
1. **Video Review** - Feature quebrada afetando usuários existentes
   - Usuários podem estar tentando acessar `/video-reviews` e encontrando erros
   - Frontend existe mas não funciona
   - **Tempo estimado:** 2-4 horas (se services existem, apenas reconectar rotas)

### IMPORTANTE (próximos dias):
2. **Session Management (Task 33)** - Feature de segurança crítica
   - Não bloqueia funcionalidades existentes
   - Mas é importante para segurança de contas
   - **Tempo estimado:** 2-3 dias (implementação completa)

### OPCIONAL (validação):
3. **Task 32** - Validação final e deploy
   - Rodar CI/CD
   - Deploy production
   - **Tempo estimado:** 1-2 horas

---

## 🔧 Plano de Ação Recomendado

### Passo 1: Diagnosticar Video Review (AGORA)
```bash
# 1. Verificar se Prisma models existem
cat prisma/schema.prisma | grep -i "VideoReview"

# 2. Verificar se services existem
ls server/services/*video* 2>/dev/null

# 3. Verificar se controllers existem
ls server/controllers/*video* 2>/dev/null

# 4. Verificar rotas criadas
ls server/routes/*video* 2>/dev/null

# 5. Verificar registro de rotas
grep -r "videoReview\|video-review" server/app.ts server/routes/index.ts
```

### Passo 2: Consertar Video Review (AGORA)
Baseado no diagnóstico:
- **Se tudo existe:** Apenas registrar rotas em `app.ts`
- **Se falta service:** Criar `videoReviewService.ts` baseado em rotas existentes
- **Se falta migration:** Criar migration para tabelas necessárias

### Passo 3: Testar Video Review (AGORA)
- Acessar `/video-reviews` no frontend
- Criar review de teste
- Adicionar comentário
- Verificar compartilhamento funciona

### Passo 4: Implementar Session Management (depois)
- Executar Task 33 conforme spec
- Tempo: 2-3 dias

### Passo 5: Validação Final (depois)
- Executar Task 32
- Deploy production

---

## 📊 Resumo Executivo

### O que funciona (8 features):
✅ Templates, Portal, Webhooks, Assets, Shots, Breakdown, Timesheet, Calendar

### O que está quebrado (1 feature legada):
❌ **Video Review** - Frontend existe mas backend desconectado

### O que falta implementar (1 feature crítica):
⏳ **Session Management** - Spec completa, pronta para implementação

### Total real de features:
- **9 features do Gap Analysis:** 8 completas + 1 pendente (Session Management)
- **1 feature legada quebrada:** Video Review (fora do escopo original)
- **Total:** 10 features no sistema (9 funcionando + 1 quebrada)

---

## 💡 Recomendação Final

**Ordem de execução:**

1. ✅ **IMEDIATO:** Consertar Video Review (2-4 horas)
   - Está quebrado e pode estar afetando usuários
   - Código já existe, provavelmente só desconectado

2. ⏳ **PRÓXIMO:** Session Management - Task 33 (2-3 dias)
   - Feature de segurança importante
   - Spec completa disponível
   - Completa as 9 features do Gap Analysis

3. ✅ **FINAL:** Task 32 - Validação e deploy (1-2 horas)
   - CI/CD
   - Deploy production
   - 100% do spec concluído

**ETA para tudo funcionando:** 3-4 dias (consertar Video Review hoje + Session Management 2-3 dias)

