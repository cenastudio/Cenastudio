# Requirements Document

## Introduction

A landing page (`WhatsNewSection`) anuncia 9 features como disponíveis nos
planos Pro/Studio. Auditoria de código (`.private/ESTADO_REAL_2026-07-11.md`
seção 4) confirmou que 6 não existiam. Webhooks e Session Management já foram
entregues em sessão anterior. Esta spec cobre as 5 restantes — **Budget
Tracking, Equipment Inventory, Shot List, Timesheet, Google Calendar (export)**
— para que o produto entregue o que o marketing promete, eliminando risco de
propaganda enganosa e destravando a venda dos planos pagos.

Objetivo de negócio: cada feature funciona ponta a ponta (schema → API →
página → navegação → gating de plano), seguindo o design system e os padrões
de código existentes, sem placeholders.

## Glossary

- **Dual-path:** padrão `if (shouldUsePrisma) {Prisma} else {SQLite}` usado em todos os controllers.
- **Studio+:** planos Studio e superiores (e `admin`, que sempre bypassa gating).
- **Overview (budget):** payload agregado com orçado/realizado/percentual/alerta por categoria.
- **Booking conflito:** duas reservas `booked` do mesmo equipamento com datas sobrepostas.
- **`.ics`:** arquivo iCalendar (RFC 5545) importável em Google/Outlook/Apple Calendar.

## Requirements

### Requisito 0 — Deploy aplica migrations (P0, bloqueante)

**User Story:** Como operador, quero que as migrations sejam aplicadas
automaticamente no deploy, para que features novas não quebrem em produção por
tabelas ausentes.

#### Acceptance Criteria
1. WHEN um deploy Railway ocorre THEN o sistema SHALL executar `prisma migrate deploy` antes de iniciar o servidor.
2. WHERE o build roda `npm prune --production` THE sistema SHALL manter o CLI `prisma` disponível em runtime (mover para `dependencies`).
3. WHEN o servidor inicia sem migrations pendentes THEN o start SHALL prosseguir normalmente sem efeitos colaterais.
4. IF `prisma migrate deploy` falhar THEN o start SHALL abortar com log de erro claro (não subir servidor com schema divergente).

---

### Requisito 1 — Budget Tracking & Control (F1, Studio+)

**User Story:** Como produtor, quero definir um orçamento por categoria e
lançar gastos reais, para saber em tempo real se o projeto está no azul ou no
vermelho.

#### Acceptance Criteria
1. WHEN o usuário Studio abre `/project/:id/budget` THEN o sistema SHALL exibir orçado vs realizado por categoria com barra de progresso.
2. WHEN o usuário define/edita o orçamento por categoria THEN o sistema SHALL persistir os valores em centavos.
3. WHEN o usuário adiciona um lançamento (categoria, descrição, valor, data) THEN o sistema SHALL recalcular o realizado e retornar o overview atualizado.
4. WHEN o realizado de uma categoria atingir 80% do orçado THEN o sistema SHALL sinalizar alerta amarelo; WHEN atingir 100% THEN alerta vermelho.
5. IF um usuário não-Studio acessar a feature THEN o sistema SHALL bloquear com HTTP 402 no backend e exibir gate de upgrade no frontend.
6. WHEN o usuário remove um lançamento THEN o sistema SHALL recalcular o realizado.
7. WHERE a página está vazia THE sistema SHALL exibir empty state com quadrado laranja e passos 01/02/03 explicando o fluxo.

---

### Requisito 2 — Equipment Inventory (F2, Studio+)

**User Story:** Como produtor, quero cadastrar meu equipamento e reservá-lo por
projeto, para não agendar a mesma câmera em dois jobs no mesmo dia.

#### Acceptance Criteria
1. WHEN o usuário Studio abre `/equipment` THEN o sistema SHALL listar equipamentos com filtros por categoria e status.
2. WHEN o usuário cadastra/edita/remove um equipamento THEN o sistema SHALL persistir e refletir na lista.
3. WHEN o usuário cria um booking (equipamento, projeto, data início/fim) THEN o sistema SHALL registrar a reserva.
4. IF já existe booking `booked` do mesmo equipamento com datas sobrepostas THEN o sistema SHALL rejeitar com HTTP 409 e mensagem clara.
5. IF um usuário não-Studio acessar a feature THEN o sistema SHALL bloquear (402 backend + gate frontend).
6. WHERE a lista está vazia THE sistema SHALL exibir empty state padrão (quadrado laranja + passos).

---

### Requisito 3 — Shot List (F3, Pro+)

**User Story:** Como diretor, quero montar a lista de planos do projeto e
reordenar por arrastar, para organizar o dia de filmagem e exportar para a
equipe.

#### Acceptance Criteria
1. WHEN o usuário Pro abre `/project/:id/shotlist` THEN o sistema SHALL listar os planos ordenados por `orderIndex`.
2. WHEN o usuário adiciona um plano (cena, tipo, descrição, câmera, lente, movimento, duração) THEN o sistema SHALL anexá-lo ao fim da lista.
3. WHEN o usuário reordena os planos (drag-and-drop) THEN o sistema SHALL persistir a nova ordem de forma transacional.
4. WHEN o usuário marca um plano como filmado/descartado THEN o sistema SHALL atualizar o status.
5. WHEN o usuário edita ou remove um plano THEN o sistema SHALL refletir a mudança.
6. WHERE a lista está vazia THE sistema SHALL exibir empty state padrão explicando o fluxo.
7. WHEN o usuário aciona "exportar" THEN o sistema SHALL gerar um documento imprimível/PDF da shot list (reusar padrão de export de `Documents`).

---

### Requisito 4 — Timesheet (F4, Pro+ com timer; relatório de custo Studio+)

**User Story:** Como produtor, quero cronometrar e registrar horas trabalhadas
por projeto, para calcular o custo real de mão de obra.

#### Acceptance Criteria
1. WHEN o usuário abre `/timesheet` THEN o sistema SHALL listar os registros com total de horas e custo total.
2. WHEN o usuário inicia um timer AND já existe um timer aberto THEN o sistema SHALL rejeitar com HTTP 409 (no máximo 1 timer aberto por usuário).
3. WHEN o usuário para o timer OR cria um registro manual (início, fim, taxa/hora) THEN o sistema SHALL calcular `durationSec` e custo automaticamente.
4. IF um usuário sem entitlement acessar a feature THEN o sistema SHALL bloquear (402 backend + gate frontend).
5. WHEN o usuário edita ou remove um registro THEN o sistema SHALL recalcular os totais.
6. WHERE a lista está vazia THE sistema SHALL exibir empty state padrão (quadrado laranja + passos).

---

### Requisito 5 — Google Calendar / Agenda (F5, Pro+)

**User Story:** Como produtor, quero exportar os prazos e reuniões de um
projeto para minha agenda, para não precisar copiar datas manualmente.

#### Acceptance Criteria
1. WHEN o usuário Pro aciona "exportar para agenda" em um projeto THEN o sistema SHALL gerar um arquivo `.ics` contendo o deadline do projeto e as reuniões vinculadas.
2. WHEN o `.ics` é aberto em Google/Outlook/Apple Calendar THEN os eventos SHALL aparecer com título, data e descrição corretos.
3. WHERE não há datas no projeto THE sistema SHALL informar que não há eventos para exportar (não gerar arquivo vazio silenciosamente).
4. THE feature SHALL ser apresentada honestamente como "exportar para agenda (.ics)", não como sync bidirecional automático.

---

### Requisito 6 — Aderência a padrões (transversal)

**User Story:** Como mantenedor, quero que as features novas sigam 100% os
padrões existentes, para não introduzir dívida técnica ou inconsistência
visual.

#### Acceptance Criteria
1. THE código SHALL usar o padrão dual-path `if (shouldUsePrisma) {...} else {SQLite}` em todos os controllers.
2. THE persistência SHALL ter migration Prisma com SQL real E espelho `CREATE TABLE IF NOT EXISTS` em `server/models/db.ts`, ambos com índices.
3. THE frontend SHALL usar apenas `--ds-orange`/classes `frame-*` como accent (nunca `#FF6B00`/`#ff4d1d`).
4. THE chamadas de API SHALL passar pelo objeto `api` em `client/src/lib/api.ts` (nunca `fetch` solto).
5. THE código entregue SHALL conter zero `TODO`/placeholder; pendências ficam nesta spec.
6. WHEN cada feature é concluída THEN `npm run check` e `npm run build` SHALL passar.

---

### Requisito 7 — Sincronia landing ↔ realidade

**User Story:** Como responsável pelo produto, quero que a landing só anuncie o
que existe, para eliminar propaganda enganosa.

#### Acceptance Criteria
1. WHEN uma feature desta spec for concluída ponta a ponta THEN o `WhatsNewSection`/pricing SHALL refletir seu estado real (sem "NOVO" em algo inexistente).
2. IF ao fim da spec alguma feature não for entregável THEN o item correspondente SHALL ser removido do marketing até ser implementado.
3. THE `.private/ESTADO_REAL_2026-07-11.md` seção 4 SHALL ser atualizado movendo cada feature entregue de "❌ Não existe" para "✅ Existe".
