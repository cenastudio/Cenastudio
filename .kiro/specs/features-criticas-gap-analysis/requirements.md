# Requirements Document

**Feature:** Features Críticas — Gap Analysis Competitivo

## Glossary

- **Cena Studio:** produto SaaS de gestão para produtoras de vídeo (contexto deste spec).
- **StudioBinder / Frame.io:** concorrentes líderes de mercado usados como referência de feature parity.
- **Feature parity:** métrica comparativa de quantas features do concorrente estão presentes no produto (atual: 53%; alvo pós-fase: ~80%).
- **Zero-cost feature:** funcionalidade implementável usando apenas stack existente, sem novos serviços pagos mensais.
- **Client Portal:** URL pública compartilhada com cliente final para acompanhar projeto sem criar conta.
- **Webhook:** endpoint HTTP configurado pelo usuário que recebe POST quando eventos ocorrem (para integrações Zapier/Make/Slack).
- **Asset Library:** biblioteca central de arquivos (logos, músicas, footage) reutilizáveis entre projetos.
- **Script Breakdown:** extração automatizada (via IA) de personagens, locações, props e figurinos a partir de roteiro.
- **Shot List:** lista visual de planos de câmera com thumbnails, ordem e specs técnicas.
- **Timesheet:** rastreamento de horas trabalhadas por task/projeto para relatórios e cobrança.
- **ICS:** formato RFC 5545 de eventos de calendário (compatível com Google Calendar, Apple Calendar, Outlook).
- **Produtora:** empresa/pessoa que produz conteúdo audiovisual (público-alvo primário do produto).

## Introduction

Esta fase implementa **8 features estratégicas** identificadas na análise competitiva como gaps críticos que impedem o Cena Studio de competir em paridade com líderes de mercado (StudioBinder, Frame.io, Monday.com para produção). O objetivo é aumentar de **53% para ~80% de feature parity** mantendo os 4 diferenciais únicos (IA BR, white-label, preço BR, workflow produtoras).

**Princípio guia:** **Zero custo adicional de infraestrutura**. Todas as features usam exclusivamente a stack existente (Prisma/Postgres, Cloudinary, OpenRouter AI, APIs gratuitas como Google Calendar). Nenhuma dependência nova que exija pagamento mensal.

**Referências:**
- Análise competitiva: conversas anteriores (Task 2 do summary)
- Stack atual: `ARCHITECTURE.md`, `package.json`
- Fase anterior: `../fase-3-white-label/` (white-label básico concluído)

**Fora do escopo (requerem custos):**
- Real-time collaboration (Redis $10/mo + WebSockets)
- Invoicing/NF automático (Asaas API $20/mo + % transação)
- WhatsApp Business API (Twilio $30-100/mo)

## Contexto (achados da análise competitiva)

**Gaps críticos identificados:**

1. **Project Templates** — StudioBinder tem 50+ templates (Reel 30s, Comercial TV, Documentário, etc.). Cena Studio força criação manual toda vez. Impacto: usuário gasta 15-20min configurando projeto repetitivo.

2. **Client Portal** — Frame.io permite compartilhar link público onde cliente vê progresso, aprova entregas, baixa assets finais. Cena Studio não tem equivalente. Impacto: produtor precisa mandar email com anexos ou Dropbox manual.

3. **Webhooks genéricos** — Monday.com dispara eventos HTTP em milestones. Permite integração com Zapier/Make/n8n sem code. Cena Studio não tem. Impacto: integrações exigem desenvolvimento custom.

4. **Asset Library** — StudioBinder tem biblioteca de logos, músicas, footage reutilizáveis entre projetos. Cena Studio força re-upload. Impacto: usuário perde tempo procurando/recarregando mesmos arquivos.

5. **Script Breakdown** — Celtx/StudioBinder extraem automaticamente personagens, locações, props de roteiro via IA. Cena Studio não faz. Impacto: produtor lista manualmente, alto erro humano.

6. **Shot List Visual** — StudioBinder tem drag-and-drop de shots com thumbnails. Cena Studio só tem texto. Impacto: diretor/DOP não visualizam sequência filmagem facilmente.

7. **Timesheet** — Produtoras grandes rastreiam horas por tarefa/pessoa. Cena Studio não tem. Impacto: dificulta cobrança por hora e relatórios de ROI.

8. **Google Calendar Sync** — StudioBinder exporta callsheets como eventos .ics. Cena Studio gera apenas PDF/texto. Impacto: equipe precisa adicionar manualmente calendário.

## Requirements

### Requirement 1: Project Templates (duplicação de projetos configurados)

**User Story:** Como produtor recorrente (faz Reels 30s toda semana), quero duplicar um projeto template pré-configurado, para não refazer setup (tasks, etapas, ferramentas) toda vez.

#### Acceptance Criteria

1. WHEN o usuário navega para `/projects` THEN deve haver botão "+ Novo Projeto" com dropdown: "Projeto em Branco" OU "A partir de Template".
2. WHEN o usuário clica "A partir de Template" THEN abre modal listando templates disponíveis: "Reel 30s Instagram", "Comercial TV 60s", "Documentário 10min", "Vídeo Institucional", "Live Evento", "Template Personalizado" (se usuário salvou algum).
3. WHEN o usuário seleciona um template THEN o sistema DEVE duplicar: nome base do projeto + tasks padrão + timeline estimado + ferramentas default (ex: Reel 30s vem com Roteiro, Decupagem, Moodboard, Checklist pré-selecionados).
4. WHEN o projeto duplicado é criado THEN o usuário DEVE poder renomear imediatamente e editar tasks antes de salvar definitivo.
5. WHEN o usuário está em plano Free THEN pode usar apenas templates públicos (max 3 salvos). Plano Pro/Studio permite criar templates personalizados ilimitados.
6. WHEN o usuário cria um projeto complexo que quer reusar THEN deve haver botão "Salvar como Template" no menu dropdown do projeto (header), que abre dialog: "Nome do Template" + "Descrição (opcional)" + "Privacidade: Só eu / Equipe / Público (Studio plan)".
7. WHEN um template é salvo THEN ele aparece na lista de templates do usuário, com metadata: criado por, data, nº de usos, última modificação.
8. WHEN o sistema possui templates públicos default THEN eles DEVEM ser seeded no banco na migration inicial, com `isSystem: true` e não deletáveis.

### Requirement 2: Client Portal (share link público de projeto)

**User Story:** Como produtor finalizando entrega, quero gerar link público do projeto para o cliente acompanhar progresso e baixar arquivos finais, sem precisar criar conta ou acessar sistema completo.

#### Acceptance Criteria

1. WHEN o usuário está visualizando projeto THEN deve haver botão "Compartilhar com Cliente" no header, que abre modal com: toggle "Ativar Portal do Cliente", URL gerada automaticamente (ex: `cenastudio.dev/client/{projectShareId}`), e opções de visibilidade.
2. WHEN o portal está ativado THEN o link público DEVE mostrar: nome do projeto, progresso % (calculado de tasks concluídas), timeline visual (etapas: pré/produção/pós), lista de entregas (arquivos finalizados marcados como "Entrega Final" pelo produtor), e botão "Aprovar Entrega" por item.
3. WHEN o cliente acessa link público THEN NÃO deve exigir login/senha. Acesso direto via URL única (UUID v4).
4. WHEN o produtor marca arquivo como "Entrega Final" THEN esse arquivo aparece na seção "Downloads" do portal com botão "Baixar" direto (Cloudinary signed URL, 24h validade).
5. WHEN o cliente clica "Aprovar Entrega" THEN o sistema registra aprovação com timestamp + IP (audit), e notifica produtor via email (se configurado).
6. WHEN o produtor desativa portal THEN o link retorna 404 ou página "Portal desativado pelo produtor".
7. WHEN o projeto está em plano Free THEN portal expira após 30 dias da ativação. Plano Pro: 90 dias. Studio: ilimitado + permite senha opcional no portal.
8. WHEN o produtor quer restringir acesso THEN (somente Studio plan) deve poder adicionar senha obrigatória no modal de configuração, que cliente precisa inserir ao acessar link.
9. WHEN o portal carrega THEN DEVE ter branding white-label respeitando `SITE_CONFIG.brandName` e `primaryColor` (Fase 3 já implementou isso).

### Requirement 3: Webhooks Genéricos (HTTP POST em eventos)

**User Story:** Como operador avançado, quero configurar URLs que recebem POST quando eventos importantes acontecem (projeto concluído, task finalizada, upload de arquivo), para integrar com Zapier/Make/Slack/Discord sem precisar de dev custom.

#### Acceptance Criteria

1. WHEN o usuário está em Settings > Integrações THEN deve haver seção "Webhooks" com botão "+ Adicionar Webhook".
2. WHEN cria webhook THEN deve configurar: nome descritivo, URL (validação https obrigatório), evento trigger (lista: `project.created`, `project.completed`, `task.completed`, `file.uploaded`, `client.approved`, `meeting.scheduled`), e toggle "Ativo/Inativo".
3. WHEN evento configurado acontece THEN o sistema DEVE enviar POST para URL com payload JSON: `{ event: "task.completed", timestamp: ISO8601, projectId, userId, data: { taskId, taskName, completedBy, ... } }` e header `X-Webhook-Signature: HMAC-SHA256(secret, payload)` para validação.
4. WHEN o webhook falha (timeout >10s, status 4xx/5xx) THEN sistema DEVE retentar: 3 tentativas com backoff exponencial (10s, 30s, 90s). Após 3 falhas, marcar webhook como "erro" e pausar envios até usuário reativar manualmente.
5. WHEN usuário quer debug THEN seção Webhooks DEVE listar últimos 10 disparos com: data/hora, evento, status HTTP, tempo resposta, e botão "Ver Payload" (modal com JSON pretty-printed).
6. WHEN usuário está em plano Free THEN permite 1 webhook. Pro: 5 webhooks. Studio: ilimitado.
7. WHEN webhook é criado THEN sistema gera `secret` único (UUID) exibido uma única vez (copy-to-clipboard). Usuário deve salvar para validar signature no receptor.
8. WHEN o sistema envia webhook THEN DEVE incluir header `User-Agent: CenaStudio-Webhook/1.0` e timeout de 10s hard limit (não bloqueia operação principal).

### Requirement 4: Asset Library (biblioteca reutilizável entre projetos)

**User Story:** Como produtor que sempre usa mesmo logo do cliente e mesmas músicas, quero biblioteca central de assets reutilizáveis, para não re-uploadar em cada projeto novo.

#### Acceptance Criteria

1. WHEN o usuário acessa `/assets` (nova rota) THEN vê biblioteca organizada por: "Logos", "Músicas", "Footage B-Roll", "Templates Gráficos", com upload drag-and-drop e busca por nome/tag.
2. WHEN faz upload na biblioteca THEN deve preencher: nome do asset, tipo (logo/música/footage/outro), tags (separadas por vírgula), e descrição opcional. Upload vai para Cloudinary com pasta `assets/{userId}/`.
3. WHEN está criando projeto OU editando projeto THEN deve haver botão "Adicionar da Biblioteca" em qualquer campo de upload de arquivo, que abre modal com grid de assets disponíveis (thumbnails para imagem/vídeo, ícone para áudio).
4. WHEN seleciona asset da biblioteca THEN ele é **linkado** ao projeto (não duplicado), economizando espaço Cloudinary. Deletar asset da biblioteca NÃO remove de projetos que já usam (soft delete: marca `deletedAt`, mas mantém URL válida).
5. WHEN asset não é usado em nenhum projeto ativo há >90 dias THEN sistema sugere remoção (banner de "limpeza" na biblioteca, manual pelo usuário).
6. WHEN usuário está em plano Free THEN limite 100MB biblioteca total. Pro: 1GB. Studio: 10GB.
7. WHEN faz upload THEN sistema DEVE validar: tipos permitidos (png/jpg/svg/mp4/mov/mp3/wav), tamanho max 50MB por arquivo, e gerar thumbnail automático para vídeos (Cloudinary transformation).
8. WHEN visualiza asset THEN deve mostrar: preview, tamanho, data upload, nº projetos usando, e botão "Remover" (com confirmação: "X projetos usam isso, tem certeza?").

### Requirement 5: Script Breakdown (IA extrai elementos de roteiro)

**User Story:** Como produtor recebendo roteiro, quero que IA extraia automaticamente personagens, locações, props e figurinos, para montar lista de necessidades de produção sem copiar/colar manual.

#### Acceptance Criteria

1. WHEN o usuário usa ferramenta "Gerador de Roteiro" (Tool ID 01) E gera roteiro com IA THEN deve aparecer botão "Extrair Breakdown" abaixo do output.
2. WHEN clica "Extrair Breakdown" THEN sistema envia roteiro para OpenRouter (mesmo modelo usado nas ferramentas, NVIDIA ou Anthropic) com prompt estruturado: "Analise este roteiro e extraia em JSON: personagens (nome, descrição, cenas que aparece), locações (nome INT/EXT, DIA/NOITE, endereço se mencionado), props (objetos importantes por cena), figurino (roupas específicas por personagem)."
3. WHEN IA retorna breakdown THEN sistema DEVE salvar em nova tabela `script_breakdowns` linkada ao projeto, com colunas JSON: `characters`, `locations`, `props`, `wardrobe`.
4. WHEN breakdown está salvo THEN exibir em tabs organizadas: "Personagens (X)" | "Locações (Y)" | "Props (Z)" | "Figurino (W)", com contadores dinâmicos.
5. WHEN usuário visualiza breakdown THEN cada item deve ser editável inline (click-to-edit) e ter checkbox "Providenciado" para tracking de produção.
6. WHEN breakdown está completo THEN deve haver botão "Exportar Checklist" que gera PDF com todos itens agrupados por departamento (Produção: locações, Arte: props, Figurino: roupas, Elenco: personagens).
7. WHEN roteiro muda (usuário edita manualmente) THEN deve aparecer aviso: "Roteiro modificado. Deseja re-extrair breakdown? (sobrescreve atual)" com botões "Re-extrair" / "Manter Atual".
8. WHEN usuário está em plano Free THEN limite 1 breakdown por projeto. Pro/Studio: ilimitado.

### Requirement 6: Shot List Visual (planejamento drag-and-drop de planos)

**User Story:** Como diretor/DOP planejando filmagem, quero montar shot list visual com thumbnails e arrastar ordem, para visualizar sequência de captação e otimizar setup de câmera.

#### Acceptance Criteria

1. WHEN o usuário acessa projeto THEN deve haver nova tab "Shot List" ao lado de "Tasks" e "Timeline".
2. WHEN está vazio THEN mostra botão "+ Adicionar Shot" que abre modal: número do shot (ex: "1A"), descrição (ex: "Close-up personagem falando"), tipo de plano (dropdown: PG/PM/PA/CL/DT customizável), lente sugerida (texto livre), movimento câmera (texto livre), duração estimada (segundos), e upload thumbnail (opcional).
3. WHEN adiciona shot THEN ele aparece em grid visual: card com thumbnail (ou placeholder se sem imagem), número do shot em destaque, descrição truncada (hover mostra completo), e ícones de ações (editar, duplicar, deletar).
4. WHEN arrasta card THEN usa `@dnd-kit` (já no package.json) para reordenar, salvando nova ordem no banco (coluna `sortOrder` na tabela).
5. WHEN clica card THEN abre modal de edição com todos campos + seção "Notas de Produção" (textarea para observações de lighting, arte, etc).
6. WHEN faz upload thumbnail THEN vai para Cloudinary com transformação automática (resize 400x300, quality 80).
7. WHEN shot list tem >10 shots THEN agrupa visualmente por "Cena" (campo novo: número da cena, ex: "Cena 3"), com headers colapsáveis.
8. WHEN exporta shot list THEN botão "Exportar PDF" gera documento formatado: uma página por shot com thumbnail grande, descrição, specs técnicas, e espaço para notas de set.
9. WHEN usuário está em plano Free THEN limite 20 shots por projeto. Pro: 100. Studio: ilimitado.

### Requirement 7: Timesheet (rastreamento de horas trabalhadas)

**User Story:** Como freelancer cobrando por hora, quero registrar tempo gasto em cada task/projeto, para gerar relatórios e cobrar cliente com precisão.

#### Acceptance Criteria

1. WHEN o usuário visualiza task THEN deve haver botão "Iniciar Timer" (▶️) que começa contagem em tempo real (mostra HH:MM:SS crescente).
2. WHEN timer está rodando THEN botão muda para "Pausar" (⏸️) e "Parar" (⏹️). Pausar congela contador. Parar finaliza e salva entrada na tabela `time_entries`.
3. WHEN para timer THEN abre modal: "Tempo registrado: X horas Y minutos. Descrição do trabalho (opcional): [textarea]. Categoria: [dropdown: Pré-produção / Produção / Pós-produção / Reunião / Outro]." E botões "Salvar" / "Descartar".
4. WHEN salva entrada THEN grava em `time_entries`: `userId`, `projectId`, `taskId` (nullable), `startTime`, `endTime`, `durationMinutes`, `description`, `category`, `createdAt`.
5. WHEN usuário acessa `/timesheet` (nova rota) THEN vê tabela filtrada por: data range, projeto, categoria, com colunas: Data, Projeto, Task, Duração, Descrição, Categoria, e total acumulado no rodapé.
6. WHEN exporta timesheet THEN botão "Exportar CSV" gera arquivo com todas colunas + calculado "Valor" se usuário configurou taxa horária em Settings (campo novo: `hourlyRate` em `users` table).
7. WHEN múltiplos timers tentam rodar simultâneo THEN sistema permite apenas 1 timer ativo por usuário (ao iniciar novo, pausa o anterior automaticamente com aviso).
8. WHEN usuário quer corrigir entrada THEN cada linha da tabela tem ícone "Editar" (abre modal com campos editáveis) e "Deletar" (confirmação).
9. WHEN projeto finaliza THEN seção "Resumo Final" mostra total de horas por categoria e por pessoa (se projeto tem colaboradores).
10. WHEN usuário está em plano Free THEN timesheet salva últimos 30 dias apenas. Pro: 1 ano. Studio: ilimitado + permite definir `hourlyRate` por projeto (override da taxa padrão).

### Requirement 8: Google Calendar Sync (export callsheets como eventos .ics)

**User Story:** Como produtor distribuindo callsheet, quero exportar como arquivo .ics ou botão "Adicionar ao Google Calendar", para equipe sincronizar automaticamente sem digitação manual.

#### Acceptance Criteria

1. WHEN o usuário usa ferramenta "Callsheet Inteligente" (Tool ID 03) E gera callsheet com IA THEN deve aparecer botões: "Baixar PDF" (já existe), "Baixar .ics", "Adicionar ao Google Calendar".
2. WHEN clica "Baixar .ics" THEN sistema gera arquivo RFC 5545 compliant usando lib existente (`icsService.ts` já existe, estender) com: título evento = "Callsheet: {nomeProjeto}", data/hora = extraída do callsheet (parsing de "General call"), localização = endereço da locação, descrição = resumo de cenas do dia + link para callsheet completo (URL do documento salvo).
3. WHEN clica "Adicionar ao Google Calendar" THEN abre popup OAuth2 Google (usando Passport.js já configurado ou lib `googleapis`) pedindo permissão `calendar.events`, cria evento via API, e mostra confirmação "Adicionado ao seu calendário" com link direto.
4. WHEN callsheet tem múltiplos horários (ex: "General call 7h", "Primeira tomada 9h") THEN cada marco vira evento separado no .ics com duração estimada (1h para general call, resto do dia para filmagem).
5. WHEN callsheet é editado (usuário regenera com IA) THEN botão muda para "Atualizar Calendário" (se já sincronizado), que usa `eventId` salvo para fazer UPDATE via Google API (não cria duplicata).
6. WHEN usuário não quer vincular Google THEN botão "Baixar .ics" funciona offline, sem OAuth (arquivo genérico compatível com Apple Calendar, Outlook, etc).
7. WHEN evento é criado via API THEN sistema DEVE salvar `calendarEventId` linkado ao projeto para permitir updates futuros e deletar evento se projeto cancelar.
8. WHEN usuário revoga permissão Google THEN sistema detecta erro 401 na próxima tentativa e mostra mensagem: "Permissão expirou. Re-autorize Google Calendar em Settings > Integrações".
9. WHEN usuário está em plano Free THEN export .ics funciona sempre, mas Google Calendar sync limitado a 5 eventos/mês. Pro: 50/mês. Studio: ilimitado.

### Requirement 9: Session Management (gerenciamento de sessões ativas)

**User Story:** Como usuário preocupado com segurança, quero visualizar todos os dispositivos conectados à minha conta e poder encerrar sessões suspeitas ou antigas, para garantir que apenas eu tenho acesso à minha conta.

**IMPORTANTE:** Esta feature DEVE funcionar de verdade em produção (não é mockup ou demo). A invalidação de tokens deve ser real e imediata.

#### Acceptance Criteria

1. WHEN o usuário está autenticado E faz qualquer requisição THEN o sistema DEVE rastrear automaticamente: dispositivo (browser + SO), IP, localização aproximada (cidade/país), e timestamp do último acesso.
2. WHEN o usuário acessa Settings > Sessões THEN vê lista de todas sessões ativas com: ícone do browser (Chrome/Safari/Firefox/Edge detectado do user-agent), descrição "{Browser} no {OS}" (ex: "Chrome no macOS"), localização "{Cidade}, {País}" (ex: "São Paulo, BR"), badge visual "Sessão atual" na sessão ativa, timestamp relativo "Último acesso: {tempo}" (ex: "Há 2 horas", "Agora"), e botão "Encerrar" por sessão (disabled na sessão atual).
3. WHEN o usuário clica "Encerrar" em uma sessão específica THEN o sistema DEVE: invalidar o token JWT dessa sessão imediatamente, remover sessão do banco de dados, e próxima requisição com aquele token DEVE retornar 401 Unauthorized.
4. WHEN o usuário clica "Encerrar todas" no header da página THEN abre modal de confirmação: "Isso encerrará todas as outras sessões. Você permanecerá conectado neste dispositivo." com botões "Cancelar" / "Encerrar todas". Ao confirmar, todas sessões exceto a atual são invalidadas.
5. WHEN uma sessão é encerrada remotamente (outro dispositivo) E o usuário tenta usar aquela sessão THEN recebe redirect para login com mensagem: "Sua sessão foi encerrada. Por favor, faça login novamente."
6. WHEN o sistema detecta múltiplos logins do mesmo IP/dispositivo THEN agrupa visualmente ou mostra contador (ex: "Chrome no macOS · 2 sessões").
7. WHEN o token JWT expira naturalmente (7 dias) THEN sessão é removida automaticamente do banco via cron job diário.
8. WHEN o usuário está em área sem geolocalização confiável THEN mostra "Localização desconhecida" no lugar de cidade/país (não bloqueia funcionalidade).
9. WHEN o sistema processa tracking de sessão THEN NÃO deve degradar performance de requests autenticados (rate limit: máximo 1 update de sessão a cada 5 minutos por token).
10. WHEN o usuário faz logout normal (botão "Sair") THEN a sessão atual DEVE ser removida do banco e token invalidado (comportamento esperado já existe, garantir integração).

## Notas Técnicas

### Sobre uso de Cloudinary

O sistema já usa Cloudinary para upload de arquivos de projeto (`server/services/supabaseStorage.ts` tem funções, mas na real usa Cloudinary pela config). Limite Free tier Cloudinary: 25 GB armazenamento + 25 GB bandwidth/mês. Com Asset Library, estimar ~2-5% adicional de uso (aceitável). Se ultrapassar, upgrade Cloudinary é $0.10/GB (custo variável, não fixo mensal — aceitável).

### Sobre Google Calendar API

Google Calendar API é **gratuita** até 1M requests/dia (absurdamente alto para nosso caso — mesmo com 100 usuários ativos seria <1000 req/dia). Requer OAuth2 setup (já temos infraestrutura com `passport-github2`, análogo). Lib recomendada: `googleapis` (npm, ~500KB). Zero custo fixo.

### Sobre Session Management e Token Invalidation

**Abordagem escolhida:** Database-driven session tracking com hash de tokens.

**Razões:**
- JWT é stateless por design — não pode ser "revogado" sem state externo.
- **Opção 1 - Redis Blacklist:** Rápido mas adiciona dependência externa + custo ($10/mês Upstash). **Descartado** por violar regra zero-cost.
- **Opção 2 - Database Sessions:** Usa Postgres existente, zero custo adicional. Performance aceitável com indexes corretos.

**Implementação:**
1. Hash SHA256 do JWT token → sessionId único no DB.
2. Middleware `sessionTracking` upserta sessão após `authenticate` (rate limited 1x/5min por token).
3. Middleware `authenticate` valida se sessão existe antes de aceitar token.
4. Deletar sessão = próximo request com aquele token falha validação → 401.
5. Cron job diário limpa sessões com `lastAccessAt` > 7 dias (match com JWT expiration).

**User-agent parsing:** Lib `ua-parser-js` (MIT license, 400KB, 15M downloads/week). Parse confiável de Chrome/Safari/Firefox/Edge + macOS/Windows/Linux/iOS/Android.

**GeoIP:** Headers Cloudflare `cf-ipcountry`, `cf-ipcity` (free se app usa Cloudflare). Fallback: ipapi.co API gratuita (45 req/min rate limit — suficiente). Não é crítico: se falhar, mostra "Localização desconhecida".

**Performance:**
- Index em `(userId, lastAccessAt)` para list queries.
- Index em `token` (hash) para validate queries.
- Upsert rate limited: máx 1 write/5min por sessão → ~288 writes/dia por usuário ativo.
- 100 usuários ativos = 28.8K writes/dia = trivial para Postgres.

### Sobre Webhooks e retries

Implementar retry com `node-cron` OU simplesmente flag `retryCount` na tabela + cron job diário que reprocessa falhas. Não exige serviço externo. Bull/BullMQ (Redis) seria overkill e custaria $ — evitar.

### Sobre Shot List drag-and-drop

`@dnd-kit` já está no `package.json` (usado em algum lugar?). Verificar se já tem Context setup. Se não, criar `<DndContext>` no componente Shot List. Performance: até 200 shots sem lag (testado em projetos similares).

### Sobre Script Breakdown IA cost

Roteiro típico tem ~2000-5000 palavras = ~3000 tokens input. Model NVIDIA (usado no backend) custa $0.0002/1K tokens. Breakdown = $0.0006-0.0015 por roteiro. Com 100 usuários fazendo 2 breakdowns/mês = $0.30/mês total. Desprezível. Anthropic (fallback) é 5x mais caro mas ainda < $2/mês.

### Sobre Timesheet storage

Time entries crescem linear: 1 usuário ativo = ~50 entries/mês = 600/ano. 100 usuários = 60K rows/ano. Postgres handle isso tranquilo (partitioning por ano se necessário em 2027+). Index em `(userId, projectId, startTime)` é suficiente. Zero preocupação de escala.

### Sobre Client Portal security

Share link usa UUID v4 (128-bit entropy = praticamente impossível guess). Não exige autenticação mas Cloudinary signed URLs (24h TTL) impedem acesso direto aos arquivos além do prazo. Suficiente para maioria dos casos. Studio plan adiciona senha opcional (bcrypt hash).

### Sobre Project Templates seeding

Migration inicial deve inserir 5 templates system:
- "Reel 30s Instagram"
- "Comercial TV 60s"
- "Documentário 10min"
- "Vídeo Institucional 3min"
- "Live Evento"

Cada um com ~5-8 tasks default e tools pré-selecionadas. JSON structure em migration file (Prisma seed).

## Dependências entre Requirements

- **Nenhuma dependência hard**: todas features são independentes e podem ser implementadas em paralelo dentro da fase.
- **Soft dependencies** (melhoram UX mas não bloqueiam):
  - Asset Library → usado por Shot List (thumbnails de shots reutilizados)
  - Script Breakdown → pode popular Shot List automaticamente (futuro enhancement)
  - Webhooks → dispara em eventos de Client Portal (ex: `client.approved`)

## Estratégia de Rollout

**Fase 1 (Semana 1):** Templates + Client Portal → **maior impacto percebido** (usuário vê valor imediato).

**Fase 2 (Semana 2):** Webhooks + Asset Library → **base para integrações** (webhooks permitem Zapier, library desbloqueia reutilização).

**Fase 3 (Semana 3):** Shot List + Script Breakdown → **ferramentas criativas** (DOP/diretores amam visual planning).

**Fase 4 (Semana 4):** Timesheet + Calendar Sync → **operacional/administrativo** (freelancers e produtores organizados precisam).

Cada fase entrega valor incremental. Usuário pode começar a usar features assim que estiverem em produção (não precisa esperar todas 4 fases).
