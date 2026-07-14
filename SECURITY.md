# POLÍTICA DE SEGURANÇA

**Cena Studio - Software Proprietário**

---

## 🔒 COMPROMISSO COM A SEGURANÇA

A segurança dos dados dos nossos usuários é prioridade máxima.

Este documento descreve nossas práticas de segurança e como reportar vulnerabilidades.

---

## 🛡️ MEDIDAS DE SEGURANÇA IMPLEMENTADAS

### 1. Segurança de Aplicação

- ✅ **HTTPS obrigatório** em todas as conexões (TLS 1.3)
- ✅ **Headers de segurança:** HSTS, CSP, X-Frame-Options
- ✅ **Proteção CSRF** em todos os formulários
- ✅ **Sanitização de inputs** contra XSS e SQL Injection
- ✅ **Rate limiting** para prevenir ataques de força bruta
- ✅ **Validação de tipos** (TypeScript + Zod)
- ✅ **LGPD Compliance** (100%)
  - Dashboard de transparência de dados
  - Export de dados pessoais (JSON)
  - Solicitações de exclusão automatizadas
  - Controles de privacidade granulares
  - Auditoria de acessos
- ✅ **Notification Preferences** - 8 tipos configuráveis
  - Controle granular de notificações
  - Opt-out individual por tipo
  - Respeito às preferências do usuário

### 2. Autenticação e Autorização

- ✅ **Senhas com bcrypt** (hash + salt, 10 rounds)
- ✅ **JWT com expiração** (15 dias)
- ✅ **Autenticação de 2 Fatores (2FA)** - TOTP via Google Authenticator
  - QR Code generation com speakeasy
  - Backup codes para recuperação
  - Persistência de status entre sessões
- ✅ **API Keys Pessoais** - Formato `cena_XXXXXXXX` com SHA-256
  - Geração única com crypto.randomBytes
  - Revogação instantânea
  - Rate limiting por key
- ✅ **Activity Log** - Auditoria de 30 dias
  - Rastreamento de ações sensíveis
  - Geolocalização por IP (geoip-lite)
  - Device fingerprinting
- ✅ **Session Management** - Controle de sessões ativas
  - Múltiplas sessões por usuário
  - Encerrar sessões remotamente
  - Timeout automático de inatividade
- ✅ **Security Alerts** - Notificações de eventos suspeitos
  - Novo login de dispositivo desconhecido
  - Múltiplas tentativas de login falhadas
  - Alterações de senha
  - Ativação/desativação de 2FA
- ✅ **Controle de acesso baseado em roles**
- ✅ **Bloqueio após tentativas falhas**

### 3. Banco de Dados

- ✅ **PostgreSQL** (Railway, gerenciado) com criptografia em repouso
- ✅ **Queries parametrizadas** (Prisma ORM)
- ✅ **Backups automáticos** (gerenciados pelo Railway)
- ✅ **Acesso restrito via credenciais**
- ✅ **Audit log de ações administrativas** — toda mutação feita via
  `/api/admin/*` é registrada (quem, o quê, em qual alvo, IP, quando)

### 4. Armazenamento de Arquivos

- ✅ **Cloudinary** (thumbnails/imagens) com:
  - Upload assinado (signed uploads)
  - Controle de acesso por token
  - CDN com proteção DDoS
- ✅ **Supabase Storage** (uploads de arquivo de projeto, quando
  configurado) — desativado com erro claro (503) se as credenciais não
  estiverem definidas, em vez de falhar silenciosamente

### 5. Infraestrutura

- ✅ **Railway** (build via Nixpacks, healthcheck `/health`, restart
  automático em falha)
- ✅ **Rate limiting por área** — limite geral de API, limite mais
  restrito específico para `/api/admin/*` (uma sessão admin
  comprometida tem alcance de dano limitado)
- ✅ **Pool de conexões com o banco** dimensionado para concorrência
  real (ver `ARCHITECTURE.md`, ADR-002)

### 6. Código

- ✅ **Dependências atualizadas** regularmente
- ✅ **npm audit** antes de cada deploy
- ✅ **ESLint** para qualidade de código
- ✅ **TypeScript** para type safety
- ✅ **Repositório privado** no GitHub

---

## 🚨 REPORTAR VULNERABILIDADES

### Programa de Divulgação Responsável

Se você descobrir uma vulnerabilidade de segurança:

**NÃO PUBLIQUE PUBLICAMENTE**

### Como Reportar

📧 **E-mail:** contato@cenastudio.com.br (assunto: SEGURANÇA)
🔐 **PGP Key:** [A FORNECER se necessário]

**Inclua:**
- Descrição detalhada da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Seu nome/e-mail para contato (opcional)

### O Que Esperamos de Você

- ✅ Nos dê tempo razoável para corrigir (90 dias)
- ✅ Não explore a vulnerabilidade além do necessário para demonstração
- ✅ Não acesse dados de outros usuários
- ✅ Não cause degradação de serviço

### O Que Você Pode Esperar de Nós

- ✅ **Resposta inicial** em até 48 horas
- ✅ **Atualização de status** a cada 7 dias
- ✅ **Crédito público** após correção (se desejar)
- ✅ **Reconhecimento** na página de segurança

### Recompensas

Não temos um programa formal de bug bounty (recompensa monetária) neste
momento. Vulnerabilidades reportadas responsavelmente são levadas a
sério e corrigidas — reconhecimento público pode ser oferecido caso a
caso, a pedido do pesquisador.

---

## 🔍 ESCOPO DE TESTES

### ✅ Permitido Testar

- **Aplicação web:** https://cenastudio-production.up.railway.app
- **API:** https://cenastudio-production.up.railway.app/api/*
- **Endpoints públicos:** /login, /register, /api/health

### ❌ Fora de Escopo

- **Ataques físicos** à infraestrutura
- **Engenharia social** de funcionários
- **Ataques DoS/DDoS**
- **Spamming de e-mails**
- **Teste de força bruta** (rate limit vai bloquear)
- **Serviços de terceiros** (Stripe, Cloudinary, Railway)

---

## 🔐 VULNERABILIDADES CONHECIDAS

### Não São Vulnerabilidades

As seguintes situações **NÃO são consideradas vulnerabilidades**:

- ❌ Ausência de SPF/DKIM/DMARC em e-mails
- ❌ Cookies sem flag SameSite=Strict (usamos Lax)
- ❌ Cabeçalhos de segurança não "A+" (temos B+)
- ❌ Informações em mensagens de erro genéricas
- ❌ Self-XSS (requer ação do próprio usuário)
- ❌ Clickjacking em páginas públicas

### Features de Segurança Implementadas

- ✅ Autenticação de 2 Fatores (TOTP) — disponível para todas as contas;
  obrigatório para admin via feature flag `ADMIN_REQUIRE_2FA` (desligada
  até que as contas admin existentes configurem 2FA)
- ✅ API Keys pessoais (formato `cena_{hex}`, hash SHA-256)
- ✅ Activity Log (30 dias) com detecção de IP/dispositivo novo
- ✅ Session Management (listar/revogar sessões ativas)
- ✅ LGPD Dashboard, export de dados, processamento de solicitações
  (cópia/correção/exclusão) pelo painel admin
- ✅ Audit log de ações administrativas (Fase 2, 14/07/2026)

### Dependências com CVEs Conhecidos

Algumas dependências têm CVEs que:
- **Não afetam** nossa implementação específica
- **Não têm patch** disponível ainda
- **Estão em revisão** pela equipe

Consultamos regularmente:
- https://github.com/advisories
- https://snyk.io
- npm audit

---

## 📋 HISTÓRICO DE INCIDENTES

### 2026

**14 de julho — Credenciais expostas em commits históricos do git.**
Uma auditoria do histórico do repositório identificou chaves de API e
senhas de banco de dados reais commitadas em scripts de desenvolvimento
ao longo do projeto (não em código de produção ativo). Os arquivos
foram removidos do estado atual do repositório. Ação em andamento:
rotação das credenciais efetivamente expostas com valor real (não
placeholders). Nenhuma indicação de acesso não autorizado identificada.
Detalhes de quais credenciais e o status da rotação são mantidos em
registro interno (não público, por não expor quais chaves ainda podem
estar em janela de rotação).

**14 de julho — Pool de conexões de banco insuficiente para concorrência.**
A aplicação usava uma única conexão Postgres para todo o processo, o
que causava falha aparente ("app caindo") quando dois ou mais usuários
acessavam simultaneamente uma mesma página com escrita no banco (ex.:
link público de aprovação de vídeo). Corrigido no mesmo dia. Nenhum
dado foi perdido ou corrompido — o efeito era apenas timeout de
requisição sob concorrência.

Nenhum incidente de exposição ou perda de dados de usuário até o momento.

---

## 🔄 PROCESSO DE RESPOSTA A INCIDENTES

### 1. Detecção

- Monitoramento contínuo de logs
- Alertas automáticos de comportamento suspeito
- Reportes de usuários ou pesquisadores

### 2. Contenção

- **Imediata:** Isolar sistema afetado
- **Curto prazo:** Bloquear vetores de ataque
- **Longo prazo:** Implementar correção permanente

### 3. Erradicação

- Remover causa raiz da vulnerabilidade
- Verificar ausência de backdoors
- Revisar sistemas relacionados

### 4. Recuperação

- Restaurar operação normal
- Monitorar por reincidência
- Validar integridade dos dados

### 5. Lições Aprendidas

- Documentar incidente
- Atualizar procedimentos
- Treinar equipe

### 6. Notificação

Conforme LGPD Art. 48:
- **ANPD:** Em até 2 dias úteis
- **Usuários afetados:** Em até 48 horas
- **Publicação:** Post-mortem público (se aplicável)

---

## 🏅 HALL OF FAME

Agradecemos aos pesquisadores que reportaram vulnerabilidades responsavelmente:

*Nenhum pesquisador reportou vulnerabilidades ainda. Seja o primeiro!*

---

## 📞 CONTATO

**Segurança:**
📧 contato@cenastudio.com.br (assunto: SEGURANÇA)

**Privacidade:**
📧 contato@cenastudio.com.br (assunto: LGPD/PRIVACIDADE)

**Geral:**
📧 contato@cenastudio.com.br
🌐 https://cenastudio-production.up.railway.app

---

## 📜 CONFORMIDADE

Este documento e nossas práticas estão alinhados com:

- ✅ **OWASP Top 10** (2021)
- ✅ **CWE Top 25** (2023)
- ✅ **LGPD** (Lei 13.709/2018)
- ✅ **Marco Civil da Internet**
- ✅ **ISO/IEC 27001** (princípios)

---

## 🔄 ATUALIZAÇÕES

Esta política é revisada:
- **Trimestralmente** ou
- **Após incidentes significativos**

**Última revisão:** 14 de julho de 2026
**Próxima revisão:** Outubro de 2026

**Mudanças nesta revisão:**
- Corrigida URL de escopo de testes (domínio real de produção via Railway)
- Adicionado audit log de ações administrativas
- Adicionado incidente de exposição de credenciais em commits históricos
  e o incidente de pool de conexões insuficiente (ambos 14/07/2026)
- Removidas referências a documentos internos não públicos
- Simplificada seção de recompensas (sem promessas não confirmadas)

---

**OBRIGADO POR AJUDAR A MANTER O CENA STUDIO SEGURO!** 🔒
