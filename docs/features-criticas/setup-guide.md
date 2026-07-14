# Setup Guide — Features Críticas

## Google Calendar Sync (Feature H)

### Pré-requisitos

- Conta Google (Gmail, Google Workspace, etc.)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com)

### Passo 1: Criar Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com
2. No dropdown de projetos (topo), clique em "Novo Projeto"
3. Nome do projeto: `Cena Studio Calendar` (ou nome da sua marca)
4. Clique em "Criar"
5. Aguarde a criação (~ 10-30 segundos)

### Passo 2: Habilitar Google Calendar API

1. No menu lateral, vá em **APIs e Serviços > Biblioteca**
2. Busque por "Google Calendar API"
3. Clique no card "Google Calendar API"
4. Clique no botão azul **"Ativar"**
5. Aguarde ativação (~ 5 segundos)

### Passo 3: Criar OAuth 2.0 Credentials

1. No menu lateral, vá em **APIs e Serviços > Credenciais**
2. Clique no botão **"+ Criar Credenciais"** (topo)
3. Selecione **"ID do cliente OAuth"**
4. Se aparecer tela "Configurar tela de permissão OAuth":
   - Clique em "Configurar tela de permissão"
   - User Type: **"Externo"** (a menos que use Google Workspace)
   - Clique em "Criar"
   - Preencha:
     - Nome do app: `Cena Studio` (ou sua marca)
     - E-mail de suporte: seu email
     - Domínio da página inicial: `https://cenastudio.dev` (ou seu domínio)
     - E-mail do desenvolvedor: seu email
   - Clique em "Salvar e Continuar" (3 vezes)
   - Clique em "Voltar ao Painel"
   - Volte para **Credenciais** no menu lateral
5. Clique novamente em **"+ Criar Credenciais" > "ID do cliente OAuth"**
6. Tipo de aplicativo: **"Aplicativo da Web"**
7. Nome: `Cena Studio Web Client` (ou nome de sua preferência)
8. **URIs de redirecionamento autorizados** (CRÍTICO):
   - Desenvolvimento: `http://localhost:5000/api/calendar/google/callback`
   - Produção: `https://seu-dominio.com/api/calendar/google/callback`
   - **IMPORTANTE:** Use a porta e domínio corretos do seu backend
9. Clique em **"Criar"**
10. Aparecerá um modal com **Client ID** e **Client Secret** — **COPIE AMBOS**

### Passo 4: Configurar Variáveis de Ambiente

Edite o arquivo `.env` (ou `.env.local`) e adicione:

```bash
# Google Calendar OAuth2 Credentials
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/google/callback
```

**IMPORTANTE para produção:**
- Atualize `GOOGLE_REDIRECT_URI` para o domínio real (ex: `https://cenastudio.dev/api/calendar/google/callback`)
- Volte no Google Cloud Console e adicione a URI de produção nas "URIs de redirecionamento autorizados"

### Passo 5: Validação

1. Reinicie o servidor: `npm run dev`
2. Verifique os logs — não deve aparecer erro de "GOOGLE_CLIENT_ID undefined"
3. Acesse Settings > Integrações no app
4. Clique em "Conectar Google Calendar"
5. Deve abrir popup de autorização do Google
6. Após autorizar, deve voltar para o app com confirmação "Conectado com sucesso"

### Troubleshooting

**Erro: "redirect_uri_mismatch"**
- A URI configurada no `.env` NÃO corresponde à registrada no Google Cloud Console
- Verifique que ambas são **EXATAMENTE IGUAIS** (incluindo porta e protocol http/https)

**Erro: "invalid_client"**
- Client ID ou Client Secret incorretos
- Verifique que copiou os valores corretos do modal de credenciais

**Erro: "access_denied"**
- Usuário negou permissão no popup do Google
- Tente novamente e clique em "Permitir"

**Token expira constantemente**
- Normal: access tokens do Google expiram em 1 hora
- O sistema faz refresh automático usando o refresh_token (válido indefinidamente)

---

## Webhooks com Zapier/Make (Feature C)

### Integrando com Zapier

1. Acesse https://zapier.com e crie conta gratuita
2. Crie novo Zap > Trigger: **"Webhooks by Zapier"**
3. Evento: **"Catch Hook"**
4. Copie a **Webhook URL** gerada (ex: `https://hooks.zapier.com/hooks/catch/123456/abcdef/`)
5. No Cena Studio:
   - Vá em Settings > Integrações > Webhooks
   - Clique em "+ Adicionar Webhook"
   - Nome: "Zapier - Projetos Concluídos"
   - URL: cole a URL do Zapier
   - Eventos: marque `project.completed`
   - Clique em "Salvar"
6. **Copie o Secret exibido** (só aparece uma vez) — salve em lugar seguro
7. No Zapier, clique em "Test trigger" e complete um projeto no Cena Studio
8. O payload deve aparecer no Zapier
9. Continue configurando ações (ex: enviar email, criar card no Trello, etc)

### Validando Signature (Recomendado)

Para garantir que o webhook veio do Cena Studio:

1. No Zapier, adicione step "Code by Zapier" (Python ou JavaScript)
2. Use o código abaixo para validar:

**JavaScript:**
```javascript
const crypto = require('crypto');

const secret = 'SEU_SECRET_AQUI'; // do step 6 acima
const signature = inputData.headers['X-Webhook-Signature'];
const payload = JSON.stringify(inputData.body);

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}

// Se chegou aqui, webhook é autêntico
output = inputData.body;
```

### Integrando com Make (Integromat)

1. Acesse https://make.com e crie conta
2. Crie novo Scenario > Webhook module
3. Add webhook > Custom webhook
4. Copie a URL gerada
5. Configure no Cena Studio igual ao Zapier (steps 5-6 acima)

---

## Storage Limits por Plano (Feature D)

### Asset Library — Limites de Armazenamento

| Plano    | Limite     | Comportamento ao atingir               |
|----------|------------|----------------------------------------|
| Free     | 100 MB     | Upload bloqueado, prompt para upgrade |
| Pro      | 1 GB       | Upload bloqueado, prompt para upgrade |
| Studio   | 10 GB      | Upload bloqueado, contatar suporte    |

### Como Monitorar Uso

1. Acesse `/assets` no app
2. Footer da página mostra: **"Usando X MB de Y MB disponíveis"**
3. Barra de progresso visual (verde < 70%, amarelo 70-90%, vermelho > 90%)

### Limpeza de Assets

- Assets não usados há > 90 dias: banner de sugestão de limpeza aparece automaticamente
- Deletar asset NÃO remove de projetos que já o usam (soft delete)
- Para liberar espaço: delete e confirme

### Calculando Tamanho

- Cada asset conta seu tamanho original (não comprimido)
- Thumbnails gerados NÃO contam no limite (armazenados à parte pelo Cloudinary)
- Assets deletados (soft delete) AINDA contam no limite até serem permanentemente removidos (após 30 dias)

---

## Compatibilidade de Calendários — .ics Export (Feature H)

### Formatos Suportados

O arquivo `.ics` gerado é **RFC 5545 compliant** e funciona com:

✅ **Google Calendar** (web, Android, iOS)
✅ **Apple Calendar** (macOS, iOS, iCloud)
✅ **Microsoft Outlook** (desktop, web, mobile)
✅ **Mozilla Thunderbird** (desktop)
✅ **Yahoo Calendar**
✅ **CalDAV clients** genéricos

### Como Importar em Cada Plataforma

**Google Calendar:**
1. Baixe o arquivo `.ics`
2. Abra https://calendar.google.com
3. Menu lateral > **"+ Outros calendários" > "Importar"**
4. Selecione o arquivo `.ics`
5. Escolha calendário destino
6. Clique em "Importar"

**Apple Calendar (macOS):**
1. Baixe o arquivo `.ics`
2. Dê duplo-clique no arquivo
3. Apple Calendar abre automaticamente
4. Confirme adição do evento

**Apple Calendar (iOS):**
1. Baixe o arquivo `.ics` no Safari
2. Toque no arquivo baixado
3. Toque em "Adicionar"

**Microsoft Outlook (desktop):**
1. Baixe o arquivo `.ics`
2. Outlook > **Arquivo > Abrir e Exportar > Importar/Exportar**
3. Selecione "Importar um arquivo iCalendar (.ics) ou vCalendar"
4. Navegue até o arquivo
5. Clique em "OK"

**Microsoft Outlook (web):**
1. Baixe o arquivo `.ics`
2. Outlook.com > Calendário
3. Menu **"Adicionar calendário" > "Carregar do arquivo"**
4. Selecione o arquivo `.ics`
5. Clique em "Importar"

### Diferenças entre .ics e Google Calendar Sync

| Recurso                      | .ics Export | Google Sync  |
|------------------------------|-------------|--------------|
| Funciona offline             | ✅ Sim      | ❌ Não       |
| Atualiza evento editado      | ❌ Não      | ✅ Sim       |
| Exige autorização OAuth      | ❌ Não      | ✅ Sim       |
| Compatível com qualquer app  | ✅ Sim      | ❌ Só Google |
| Um clique no app web         | ❌ Não      | ✅ Sim       |

**Recomendação:**
- **Google Sync:** para equipes que usam Google Workspace (atualizações automáticas)
- **.ics Export:** para equipes mistas ou sem Google (máxima compatibilidade)

---

## Limites de Sync por Plano (Feature H)

| Plano  | .ics Export      | Google Calendar Sync |
|--------|------------------|----------------------|
| Free   | ✅ Ilimitado     | 5 eventos/mês        |
| Pro    | ✅ Ilimitado     | 50 eventos/mês       |
| Studio | ✅ Ilimitado     | ✅ Ilimitado         |

**Contador de sync:**
- Reseta no dia 1º de cada mês
- Visível em Settings > Integrações > Google Calendar
- Ao atingir limite: botão "Adicionar ao Google Calendar" fica disabled com tooltip explicativo

---

## FAQ

### "Posso usar com Google Workspace (G Suite)?"

Sim! O processo é idêntico. A única diferença é que na tela de permissão OAuth você deve selecionar "Interno" em vez de "Externo" (restringe uso apenas para domínio da organização).

### "O token do Google Calendar expira?"

- **Access token:** expira em 1 hora, mas o sistema faz refresh automático
- **Refresh token:** válido indefinidamente (até usuário revogar ou trocar senha)
- Se refresh falhar: sistema limpa tokens e exibe mensagem "Reconecte Google Calendar"

### "Posso desconectar Google Calendar depois?"

Sim! Settings > Integrações > Google Calendar > botão "Desconectar". Isso:
1. Apaga tokens do banco de dados
2. **NÃO** deleta eventos já criados (ficam no seu calendário Google)
3. Para remover eventos: delete manualmente no Google Calendar

### "Webhooks funcionam em localhost?"

Não diretamente. Para testar webhooks em desenvolvimento local:
1. Use [ngrok](https://ngrok.com) para expor localhost: `ngrok http 5000`
2. Use a URL ngrok (ex: `https://abc123.ngrok.io/api/...`) como webhook URL
3. Ou use serviços de teste como [webhook.site](https://webhook.site)

### "Asset Library conta espaço do Cloudinary?"

Não. Os limites de Asset Library são **independentes** do limite Cloudinary geral do projeto. Cloudinary Free tier: 25 GB (muito maior que os 10 GB máximos da Asset Library).

### "Posso exportar .ics de múltiplos projetos de uma vez?"

Atualmente não. Cada callsheet/projeto gera um `.ics` individual. Para agrupar: importe múltiplos `.ics` no seu calendário.

**Feature request:** se muitos usuários pedirem, podemos adicionar "Export em lote" numa versão futura.

---

## Session Management (Feature I)

### Como funciona

Session Management rastreia automaticamente todos os dispositivos conectados à sua conta usando:

1. **Token tracking**: Hash SHA256 do JWT token identifica cada sessão
2. **Device detection**: User-agent parsing extrai browser + OS
3. **IP tracking**: Captura IP do request (headers `x-forwarded-for` ou `req.ip`)
4. **Geolocation**: Usa headers Cloudflare (`cf-ipcountry`, `cf-ipcity`) ou API ipapi.co
5. **Last access**: Timestamp atualizado a cada request (rate limited: máx 1 update/5min)

### Nenhuma configuração necessária

- Feature **ativa por padrão** para todos usuários
- Não requer env vars adicionais
- Não requer setup de terceiros
- Funciona automaticamente após login

### Invalidação de tokens

Quando sessão é encerrada:

1. Registro é **deletado do banco** (`user_sessions` table)
2. Próximo request com aquele token:
   - Middleware `authenticate` verifica se sessão existe
   - Se NÃO existe → retorna **401 Unauthorized**
   - Frontend recebe 401 → redirect para `/login`
3. Invalidação é **imediata** (não há cache)

**Abordagem escolhida:** Database-driven (não Redis)
- ✅ Zero custo adicional (usa Postgres existente)
- ✅ Performance aceitável com indexes em `(userId, lastAccessAt)` e `token`
- ✅ Evita dependência externa (Redis = $10/mês Upstash)

### Cron job de limpeza

Sistema roda cron job **diário** que remove sessões com `lastAccessAt > 7 dias`:

```javascript
// server/jobs/sessionCleanupJob.ts
cron.schedule('0 2 * * *', async () => {
  // Roda às 2AM todo dia
  await prisma.userSession.deleteMany({
    where: {
      lastAccessAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  });
});
```

**Por que 7 dias?**
- Match com expiração padrão de JWT token
- Limpa sessões abandonadas automaticamente
- Reduz tamanho da tabela `user_sessions`

### Performance considerations

**Rate limiting de updates:**
- Sessão só atualiza `lastAccessAt` máximo **1x a cada 5 minutos**
- Cache em memória (`Map<token, lastUpdated>`) evita writes desnecessários
- 100 usuários ativos = ~28.8K writes/dia (trivial para Postgres)

**Indexes necessários (já criados em migration):**
```prisma
@@index([userId, lastAccessAt]) // list queries
@@index([token])                // validate queries
```

### User-agent parsing

Lib usada: **`ua-parser-js`**
- MIT license, 400KB, 15M downloads/semana
- Parse confiável de:
  - Browsers: Chrome, Safari, Firefox, Edge, Opera, etc
  - OS: macOS, Windows, Linux, iOS, Android, etc
  - Devices: Desktop, Mobile, Tablet

**Exemplo de output:**
```javascript
{
  browser: { name: "Chrome", version: "120.0.0.0" },
  os: { name: "macOS", version: "14.1.0" },
  device: { type: "desktop" }
}
```

### GeoIP fallback chain

1. **Primeiro**: tenta headers Cloudflare (se app usa Cloudflare)
   - `cf-ipcountry`: código do país (ex: "BR")
   - `cf-ipcity`: nome da cidade (ex: "São Paulo")
2. **Fallback**: ipapi.co API gratuita
   - Rate limit: 45 req/min (suficiente)
   - Retorna: `{ city: "São Paulo", country: "Brazil", country_code: "BR" }`
3. **Se ambos falharem**: armazena `{ city: null, country: "Desconhecido" }`
   - Não bloqueia funcionalidade

### Segurança

**Token hashing:**
- JWT token é hasheado com **SHA256** antes de armazenar
- Banco NÃO guarda token plaintext (apenas hash)
- Se banco vazar: tokens não podem ser reusados (hash é one-way)

**Logout limpa sessão:**
- Endpoint `POST /api/auth/logout` deleta sessão do banco
- Token invalida imediatamente
- Já estava implementado, Session Management apenas integra

**Sem sessões compartilhadas:**
- 1 login = 1 sessão nova
- Múltiplos logins do mesmo usuário = múltiplas sessões independentes
- Encerrar uma NÃO afeta outras

### Troubleshooting

**"Localização mostra cidade errada"**
- GeoIP é aproximado (baseado em IP do ISP)
- Precisão: cidade correta ~70-80% das vezes
- Não é GPS real (apenas informativo para segurança)

**"Sessão atual não aparece como 'Sessão atual'"**
- Badge depende de match entre token atual e hash no banco
- Se acabou de fazer login, aguarde 1-2 segundos
- Refresh da página se necessário

**"Sessão não encerra após clicar 'Encerrar'"**
- Verifique console do browser por erros
- Token pode ter expirado naturalmente (7 dias)
- Tente "Encerrar todas" para forçar limpeza

**"Muitas sessões antigas aparecendo"**
- Cron job de limpeza roda diário às 2AM
- Sessões >7 dias sem uso são removidas automaticamente
- Ou encerre manualmente com "Encerrar todas"
