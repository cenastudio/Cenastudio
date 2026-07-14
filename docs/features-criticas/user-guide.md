# User Guide — Features Críticas

**Manual do usuário final para as 9 features críticas do Cena Studio**

---

## Índice

1. [Project Templates (Templates de Projeto)](#1-project-templates)
2. [Client Portal (Portal do Cliente)](#2-client-portal)
3. [Webhooks Genéricos](#3-webhooks-genéricos)
4. [Asset Library (Biblioteca de Assets)](#4-asset-library)
5. [Script Breakdown (Decupagem de Roteiro)](#5-script-breakdown)
6. [Shot List Visual (Lista de Planos)](#6-shot-list-visual)
7. [Timesheet (Controle de Horas)](#7-timesheet)
8. [Google Calendar Sync (Sincronização de Calendário)](#8-google-calendar-sync)
9. [Session Management (Gerenciamento de Sessões)](#9-session-management)

---

## 1. Project Templates

### O que é

Templates de projeto permitem duplicar configurações completas de projetos (tasks, ferramentas, timeline) para economizar tempo em produções repetitivas.

### Como usar

**Criar projeto a partir de template:**

1. Na página **Projetos** (`/projects`), clique no botão **"+ Novo Projeto"**
2. No dropdown que aparece, selecione **"A partir de Template"**
3. Modal abre com templates disponíveis:
   - **Templates do Sistema** (pré-configurados):
     - Reel 30s Instagram
     - Comercial TV 60s
     - Documentário 10min
     - Vídeo Institucional 3min
     - Live Evento
   - **Seus Templates** (se você salvou algum)
4. Clique no template desejado
5. Sistema duplica: nome base, tasks padrão, ferramentas default, timeline estimada
6. Renomeie o projeto e edite tasks antes de salvar definitivo
7. Clique em **"Criar Projeto"**

**Salvar projeto como template:**

1. Abra um projeto que você quer reutilizar
2. No header do projeto, clique no menu **⋮** (três pontos)
3. Selecione **"Salvar como Template"**
4. Preencha:
   - **Nome do Template**: ex. "Reel Cliente XYZ"
   - **Descrição** (opcional): "Workflow padrão para reels de 30s"
   - **Privacidade**:
     - **Só eu**: apenas você vê (padrão)
     - **Público**: todos os usuários do sistema vêem (somente plano Studio)
5. Clique em **"Salvar"**
6. Template aparece em `/templates` e na lista de seleção

**Gerenciar templates:**

1. Acesse **`/templates`** (link no menu)
2. Veja lista com:
   - Nome do template
   - Data de criação
   - Nº de vezes usado
   - Botões: **Editar** | **Deletar**
3. **Editar**: atualiza nome/descrição/privacidade
4. **Deletar**: remove o template (NÃO afeta projetos já criados)

**Limites por plano:**

- **Free**: Apenas templates do sistema (não pode criar personalizados)
- **Pro**: Pode criar templates personalizados ilimitados (privados)
- **Studio**: Templates ilimitados + opção de tornar públicos

---

## 2. Client Portal

### O que é

Portal do Cliente é um link público compartilhável onde o cliente acompanha progresso do projeto e baixa entregas finais, **sem precisar criar conta**.

### Como usar

**Ativar portal:**

1. Abra o projeto que quer compartilhar
2. No header, clique em **"Compartilhar com Cliente"**
3. Modal abre com configurações:
   - **Toggle "Ativar Portal"**: liga/desliga
   - **URL gerada**: ex. `cenastudio.dev/client/abc123` (copie e envie ao cliente)
   - **Opções de visibilidade**:
     - ☑️ Mostrar progresso (%)
     - ☑️ Mostrar timeline (etapas pré/produção/pós)
     - ☑️ Mostrar arquivos (entregas finais)
   - **Senha** (somente plano Studio): protege acesso com senha
4. Clique em **"Salvar"**
5. Copie URL e envie ao cliente (WhatsApp, email, etc)

**Marcar arquivo como "Entrega Final":**

1. Vá em **Arquivos** do projeto
2. Localize o arquivo finalizado (ex: vídeo editado, logo aprovado)
3. Clique em **⋮** no arquivo
4. Selecione **"Marcar como Entrega Final"**
5. Arquivo aparece no portal do cliente com botão **"Baixar"**

**Visão do cliente:**

Quando cliente acessa o link, vê:
- **Nome do projeto**
- **Progresso visual** (barra de %)
- **Timeline** (etapas concluídas destacadas)
- **Entregas finais**: lista com thumbnails + botões "Baixar" e "Aprovar Entrega"

**Aprovação de entrega:**

1. Cliente clica em **"Aprovar Entrega"** no arquivo
2. Sistema registra aprovação com timestamp
3. Produtor recebe notificação por email (se configurado)
4. Ícone ✓ verde aparece no arquivo aprovado

**Desativar portal:**

1. Volte no modal "Compartilhar com Cliente"
2. Desligue o toggle **"Ativar Portal"**
3. Link retorna erro 404 "Portal desativado"

**Limites por plano:**

- **Free**: Portal expira após 30 dias da ativação
- **Pro**: Portal expira após 90 dias
- **Studio**: Ilimitado + senha opcional

---

## 3. Webhooks Genéricos

### O que é

Webhooks enviam notificações HTTP automáticas quando eventos acontecem (projeto concluído, task finalizada, arquivo enviado), permitindo integrações com Zapier, Make, Slack, Discord.

### Como usar

**Criar webhook:**

1. Vá em **Settings > Integrações > Webhooks**
2. Clique em **"+ Adicionar Webhook"**
3. Preencha:
   - **Nome**: ex. "Zapier - Notificar Projetos Concluídos"
   - **URL**: URL do serviço receptor (ex: `https://hooks.zapier.com/...`)
     - ⚠️ Deve ser HTTPS (HTTP não é aceito por segurança)
   - **Eventos** (marque os que deseja receber):
     - `project.created` — Projeto criado
     - `project.completed` — Projeto finalizado
     - `task.completed` — Task concluída
     - `file.uploaded` — Arquivo enviado
     - `client.approved` — Cliente aprovou entrega
     - `meeting.scheduled` — Reunião agendada
   - **Status**: Ativo (toggle)
4. Clique em **"Salvar"**
5. **IMPORTANTE**: Secret aparece **uma única vez** — copie e salve em lugar seguro
   - Formato: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (UUID)
   - Necessário para validar autenticidade dos webhooks

**Testar webhook:**

1. Na lista de webhooks, clique em **"Testar"** no webhook
2. Sistema envia payload de teste:
   ```json
   {
     "event": "test",
     "timestamp": "2026-07-10T14:30:00Z"
   }
   ```
3. Verifique se chegou no serviço receptor

**Ver histórico de disparos:**

1. Clique em **"Ver Detalhes"** no webhook
2. Últimos 10 disparos mostram:
   - Data/hora
   - Evento disparado
   - Status HTTP (200 = sucesso, 4xx/5xx = erro)
   - Tempo de resposta (ms)
   - Botão **"Ver Payload"**: abre modal com JSON enviado

**Troubleshooting:**

- **Webhook com status "Erro"**: falhou 3 vezes consecutivas (pausado automaticamente)
  - Sistema tenta reenviar: 3 tentativas com intervalo de 10s, 30s, 90s
  - Corrija URL ou configuração do receptor
  - Clique em **"Reativar"** após corrigir

**Limites por plano:**

- **Free**: 1 webhook
- **Pro**: 5 webhooks
- **Studio**: Ilimitados

---

## 4. Asset Library

### O que é

Biblioteca central de arquivos reutilizáveis (logos, músicas, footage, templates) entre múltiplos projetos, evitando re-uploads.

### Como usar

**Upload de asset:**

1. Acesse **`/assets`** (menu lateral "Biblioteca")
2. Clique em **"+ Upload"** ou arraste arquivos para área tracejada
3. Modal abre, preencha:
   - **Nome**: ex. "Logo Cliente ABC"
   - **Tipo**: Logos | Músicas | Footage B-Roll | Templates Gráficos | Outro
   - **Tags**: palavras-chave separadas por vírgula (ex: "corporativo, azul, minimalista")
   - **Descrição** (opcional): observações sobre uso
4. Clique em **"Enviar"**
5. Asset aparece na biblioteca com thumbnail (imagem/vídeo) ou ícone (áudio)

**Tipos de arquivo aceitos:**

- **Imagens**: PNG, JPG, SVG
- **Vídeos**: MP4, MOV
- **Áudios**: MP3, WAV
- **Tamanho máximo**: 50 MB por arquivo

**Usar asset em projeto:**

1. Ao criar/editar projeto, localize campo de upload de arquivo
2. Clique em **"Da Biblioteca"** (ao lado do upload tradicional)
3. Modal abre com grid de assets
4. Use filtros:
   - **Tipo**: filtra por categoria
   - **Busca**: nome ou tags
5. Clique no asset desejado
6. Asset é **linkado** ao projeto (não duplicado)

**Gerenciar assets:**

1. Em `/assets`, cada card mostra:
   - Thumbnail/preview
   - Nome e tags
   - Tamanho do arquivo
   - Nº de projetos usando
   - Botões: **Editar** | **Visualizar** | **Remover**
2. **Editar**: atualiza nome, tags, descrição
3. **Visualizar**: abre preview em tela cheia
4. **Remover**: soft delete (confirmação: "X projetos usam isso")
   - Asset deletado NÃO desaparece de projetos que já usam
   - Fica marcado como "deletado" mas URL continua válida

**Limpeza sugerida:**

- Assets não usados há >90 dias: banner amarelo aparece no topo
- Clique em **"Ver lista"** para revisar
- Delete os desnecessários para liberar espaço

**Monitorar espaço usado:**

- Footer da página `/assets` mostra: **"Usando X MB de Y MB disponíveis"**
- Barra de progresso:
  - Verde: <70%
  - Amarelo: 70-90%
  - Vermelho: >90%

**Limites por plano:**

- **Free**: 100 MB
- **Pro**: 1 GB
- **Studio**: 10 GB

---

## 5. Script Breakdown

### O que é

Extração automática (via IA) de personagens, locações, props e figurinos a partir de roteiro, gerando checklist de produção.

### Como usar

**Gerar breakdown:**

1. Use ferramenta **"Gerador de Roteiro"** (Tool ID 01) no Studio
2. Após gerar roteiro, botão **"Extrair Breakdown"** aparece abaixo do output
3. Clique no botão
4. Sistema envia roteiro para IA (NVIDIA ou Anthropic)
5. Aguarde ~10-30 segundos (depende do tamanho do roteiro)
6. Breakdown aparece organizado em **4 tabs**:
   - **Personagens (X)**: nome, descrição, cenas que aparece
   - **Locações (Y)**: nome INT/EXT, dia/noite, endereço
   - **Props (Z)**: objetos importantes por cena
   - **Figurino (W)**: roupas específicas por personagem

**Editar breakdown:**

1. Clique em qualquer item para editar inline (click-to-edit)
2. Alterações salvam automaticamente
3. Checkbox **☑️ Providenciado**: marque conforme conseguir item
4. Contador atualiza em tempo real

**Re-extrair breakdown:**

1. Se roteiro mudar, aviso aparece: **"Roteiro modificado. Deseja re-extrair?"**
2. Opções:
   - **"Re-extrair"**: sobrescreve breakdown atual (perda de edições manuais)
   - **"Manter Atual"**: preserva breakdown editado
3. Escolha e confirme

**Exportar checklist:**

1. Clique em **"Exportar Checklist"** (botão no header das tabs)
2. Sistema gera PDF agrupado por departamento:
   - **Produção**: locações e logística
   - **Arte**: props e cenário
   - **Figurino**: roupas por personagem
   - **Elenco**: personagens e descrições
3. Cada item tem checkbox impresso para marcar fisicamente
4. PDF baixa automaticamente

**Limites por plano:**

- **Free**: 1 breakdown por projeto
- **Pro/Studio**: Ilimitados

---

## 6. Shot List Visual

### O que é

Lista visual de planos de câmera com thumbnails, drag-and-drop para reordenar, e export PDF para equipe de filmagem.

### Como usar

**Criar shot list:**

1. Abra projeto e vá na tab **"Shot List"** (ao lado de Tasks)
2. Se vazio, clique em **"+ Adicionar Shot"**
3. Modal abre, preencha:
   - **Número do shot**: ex. "1A", "2B"
   - **Número da cena** (opcional): ex. "3" (para agrupar)
   - **Descrição**: ex. "Close-up personagem falando"
   - **Tipo de plano**: PG, PM, PA, CL, DT (dropdown customizável)
   - **Lente sugerida**: ex. "35mm", "85mm"
   - **Movimento câmera**: ex. "Dolly in", "Handheld"
   - **Duração estimada**: segundos
   - **Upload thumbnail** (opcional): referência visual
4. Clique em **"Salvar"**
5. Shot aparece em grid visual com card

**Reordenar shots:**

1. Arraste card do shot
2. Solte na posição desejada
3. Ordem salva automaticamente no banco
4. Numeração visual atualiza

**Agrupar por cena:**

1. Se shot list tem >10 shots, agrupamento por cena ativa automaticamente
2. Headers aparecem: **"Cena 1"**, **"Cena 2"**, etc
3. Clique no header para colapsar/expandir grupo
4. Facilita navegação em shot lists longas

**Editar shot:**

1. Clique no card do shot
2. Modal abre com todos campos editáveis
3. Seção **"Notas de Produção"**: textarea para observações (lighting, arte, etc)
4. Edite e salve

**Duplicar shot:**

1. Clique em **⋮** no card
2. Selecione **"Duplicar"**
3. Cópia criada com sufixo " (cópia)"
4. Edite conforme necessário

**Deletar shot:**

1. Clique em **⋮** no card
2. Selecione **"Deletar"**
3. Confirmação: **"Tem certeza?"**
4. Confirm para remover

**Exportar shot list PDF:**

1. Clique em **"Exportar PDF"** (botão no header)
2. Sistema gera documento formatado:
   - Uma página por shot
   - Thumbnail grande (se tiver)
   - Descrição completa
   - Specs técnicas (tipo, lente, movimento, duração)
   - Espaço para notas de set
3. PDF baixa automaticamente
4. Imprima e distribua para equipe

**Upload thumbnail:**

- Opção 1: Upload direto (max 10 MB, PNG/JPG)
- Opção 2: **"Da Biblioteca"** (usa Asset Library)

**Limites por plano:**

- **Free**: 20 shots por projeto
- **Pro**: 100 shots por projeto
- **Studio**: Ilimitados

---

## 7. Timesheet

### O que é

Rastreamento de horas trabalhadas por task/projeto com timer integrado, geração de relatórios e cálculo de valor (se taxa horária configurada).

### Como usar

**Iniciar timer:**

1. Em qualquer task, clique em **▶️ "Iniciar Timer"**
2. Contador começa: **HH:MM:SS** crescente em tempo real
3. Ícone de timer aparece no header (widget flutuante ou na navbar)
4. Apenas 1 timer ativo por vez (se iniciar novo, anterior pausa automaticamente)

**Pausar timer:**

1. Clique em **⏸️ "Pausar"** no widget
2. Contador congela
3. Clique novamente para retomar

**Parar timer:**

1. Clique em **⏹️ "Parar"** no widget
2. Modal abre:
   - **Tempo registrado**: "X horas Y minutos"
   - **Descrição do trabalho** (opcional): textarea
   - **Categoria**: Pré-produção | Produção | Pós-produção | Reunião | Outro
3. Clique em **"Salvar"**
4. Entrada salva na tabela Timesheet
5. Ou clique em **"Descartar"** para não salvar

**Ver timesheet completo:**

1. Acesse **`/timesheet`** (menu lateral)
2. Tabela mostra todas entradas com:
   - **Data**: dia/mês/ano
   - **Projeto**: nome do projeto
   - **Task**: nome da task (ou "Geral" se não vinculado)
   - **Duração**: HH:MM formatado
   - **Descrição**: observações
   - **Categoria**: ícone visual
   - **Valor**: calculado (se taxa horária setada)
3. Footer: **Total acumulado** do período filtrado

**Filtrar entradas:**

1. Barra de filtros no topo:
   - **Data range**: seletor de período (hoje, esta semana, este mês, custom)
   - **Projeto**: dropdown de projetos
   - **Categoria**: checkboxes múltiplas
2. Filtros combinam (AND logic)
3. Total atualiza em tempo real

**Editar entrada:**

1. Clique em **✏️** na linha da entrada
2. Modal abre com campos editáveis:
   - Start time
   - End time
   - Duração (recalcula automaticamente)
   - Descrição
   - Categoria
3. Salve alterações

**Deletar entrada:**

1. Clique em **🗑️** na linha
2. Confirmação: **"Deletar entrada de X horas?"**
3. Confirme para remover

**Configurar taxa horária:**

1. Vá em **Settings > Perfil**
2. Campo **"Taxa horária (R$/hora)"**
3. Digite valor (ex: 150.00)
4. Salva automaticamente
5. Timesheet passa a mostrar coluna "Valor" com cálculo: `duração × taxa`

**Exportar CSV:**

1. Em `/timesheet`, clique em **"Exportar CSV"**
2. Arquivo baixa com colunas:
   - Data, Projeto, Task, Duração (minutos), Descrição, Categoria, Valor
3. Abra no Excel/Google Sheets para análise

**Resumo por projeto:**

1. Na página `ProjectDetails` de qualquer projeto
2. Card **"Resumo de Horas"** mostra:
   - Total de horas trabalhadas no projeto
   - Breakdown por categoria (gráfico ou tabela)
   - Valor total (se taxa horária configurada)
3. Útil para ROI e cobrança ao cliente

**Limites por plano:**

- **Free**: Timesheet salva últimos 30 dias apenas
- **Pro**: Retenção de 1 ano
- **Studio**: Ilimitado + permite taxa horária diferente por projeto (override)

---

## 8. Google Calendar Sync

### O que é

Exporta callsheets e eventos como arquivo .ics (compatível com qualquer calendário) ou sincroniza diretamente com Google Calendar via API.

### Como usar

**Exportar .ics:**

1. Use ferramenta **"Callsheet Inteligente"** (Tool ID 03) no Studio
2. Após gerar callsheet, 3 botões aparecem:
   - **"Baixar PDF"** (já existia)
   - **"Baixar .ics"** (novo)
   - **"Adicionar ao Google Calendar"** (novo)
3. Clique em **"Baixar .ics"**
4. Arquivo `.ics` baixa automaticamente (formato RFC 5545)
5. Importe em qualquer calendário (ver [compatibilidade no setup guide](./setup-guide.md#compatibilidade-de-calendários))

**O arquivo .ics contém:**

- **Título**: "Callsheet: {nome do projeto}"
- **Data/hora**: extraída do campo "General call" do callsheet
- **Localização**: endereço da locação
- **Descrição**: resumo de cenas do dia + link para callsheet completo
- **Múltiplos eventos**: se callsheet tem vários horários (ex: "General call 7h", "Primeira tomada 9h")

**Sincronizar com Google Calendar:**

1. **Primeira vez**: clique em **"Adicionar ao Google Calendar"**
2. Popup OAuth abre pedindo permissão `calendar.events`
3. Escolha conta Google e clique em **"Permitir"**
4. Popup fecha, confirmação: **"Adicionado ao seu calendário"**
5. Link direto para o evento no Google Calendar aparece (clique para abrir)

**Editar callsheet já sincronizado:**

1. Se callsheet foi editado (regenerado com IA), botão muda para **"Atualizar Calendário"**
2. Clique no botão
3. Sistema atualiza evento existente no Google (usa `eventId` salvo)
4. **NÃO cria duplicata**

**Ver syncs ativas:**

1. Vá em **Settings > Integrações > Google Calendar**
2. Mostra:
   - Email da conta conectada
   - Nº de syncs usados no mês atual (ex: "3 de 5 syncs")
   - Lista de eventos sincronizados recentemente
   - Botão **"Desconectar"**

**Desconectar Google Calendar:**

1. Em **Settings > Integrações > Google Calendar**, clique em **"Desconectar"**
2. Confirmação: **"Isso apagará tokens. Eventos já criados permanecerão no Google."**
3. Confirme
4. Tokens são removidos do banco
5. Eventos já sincronizados **NÃO são deletados** (delete manualmente no Google se quiser)

**Limites por plano:**

| Plano  | .ics Export      | Google Sync      |
|--------|------------------|------------------|
| Free   | ✅ Ilimitado     | 5 eventos/mês    |
| Pro    | ✅ Ilimitado     | 50 eventos/mês   |
| Studio | ✅ Ilimitado     | ✅ Ilimitado     |

**Contador de sync:**

- Reseta todo dia 1º do mês
- Ao atingir limite: botão "Adicionar ao Google Calendar" fica disabled
- Tooltip explica: "Limite mensal atingido. Upgrade para Pro/Studio ou use .ics export"

---

## 9. Session Management

### O que é

Gerenciamento de sessões ativas permite visualizar todos os dispositivos conectados à sua conta e encerrar sessões suspeitas ou antigas remotamente.

### Como usar

**Ver sessões ativas:**

1. Vá em **Settings > Segurança > Sessões**
2. Lista mostra todas sessões com:
   - **Ícone do browser** (Chrome, Safari, Firefox, Edge detectado)
   - **Descrição do dispositivo**: "{Browser} no {OS}" (ex: "Chrome no macOS")
   - **Localização**: "{Cidade}, {País}" (ex: "São Paulo, BR")
   - **Badge "Sessão atual"**: destaca a sessão que você está usando agora
   - **Último acesso**: timestamp relativo (ex: "Há 2 horas", "Agora")
   - **Botão "Encerrar"**: disponível em todas menos a sessão atual

**Encerrar sessão específica:**

1. Localize a sessão que deseja encerrar
2. Clique em **"Encerrar"**
3. Sistema:
   - Invalida token JWT dessa sessão imediatamente
   - Remove sessão do banco de dados
4. Se alguém tentar usar aquela sessão: recebe erro **401 Unauthorized** e redirect para login
5. Mensagem aparece: **"Sua sessão foi encerrada. Por favor, faça login novamente."**

**Encerrar todas as sessões (exceto atual):**

1. No header da página, clique em **"Encerrar todas"**
2. Modal de confirmação:
   - **"Isso encerrará todas as outras sessões."**
   - **"Você permanecerá conectado neste dispositivo."**
   - Botões: **"Cancelar"** | **"Encerrar todas"**
3. Confirme
4. Todas sessões exceto a atual são invalidadas
5. Útil se você suspeita de acesso não autorizado

**Quando usar:**

- **Esqueceu de fazer logout** em computador público/trabalho
- **Suspeita de sessão não autorizada** (localização estranha)
- **Troca de senha**: encerre todas e force re-login em todos dispositivos
- **Limpeza periódica**: encerre sessões antigas não usadas

**Como a localização é detectada:**

- Sistema extrai IP do request
- Usa serviço de GeoIP (Cloudflare headers ou ipapi.co)
- Se não conseguir detectar: mostra **"Localização desconhecida"**
- Não bloqueia funcionalidade (apenas informativo)

**Expiração automática:**

- Tokens JWT expiram após **7 dias** sem uso
- Cron job diário limpa sessões expiradas automaticamente
- Sessão expirada: redirect para login na próxima tentativa de acesso

**Privacidade:**

- Sistema NÃO armazena conteúdo navegado ou ações realizadas
- Armazena apenas: dispositivo, IP, localização aproximada, timestamp
- Dados usados exclusivamente para segurança da conta

**Sem limites de plano:**

- Feature disponível para **todos os planos** (Free, Pro, Studio)
- Todos usuários devem ter controle sobre segurança da própria conta

---

## Suporte

**Dúvidas ou problemas?**

- 📧 Email: cenastudio@atomicmail.io
- 🌐 Site: https://cenastudio.dev
- 📚 Docs completos: `/docs/`

---

**Última atualização:** 10 de julho de 2026
