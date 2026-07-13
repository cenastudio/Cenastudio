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

- ✅ **PostgreSQL** com criptografia em repouso
- ✅ **Queries parametrizadas** (Prisma ORM)
- ✅ **Backups automáticos diários**
- ✅ **Acesso restrito via credenciais**
- ✅ **Logs de auditoria** de modificações

### 4. Armazenamento de Arquivos

- ✅ **Cloudinary** com:
  - Upload assinado (signed uploads)
  - Controle de acesso por token
  - Transformações automáticas seguras
  - CDN com proteção DDoS

### 5. Infraestrutura

- ✅ **Railway** (PaaS certificado)
- ✅ **Firewall gerenciado**
- ✅ **Monitoramento 24/7**
- ✅ **Logs centralizados**
- ✅ **Isolamento de serviços**

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

📧 **E-mail:** security@cenastudio.dev
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

Atualmente **não oferecemos recompensas monetárias** (bug bounty).

Porém, pesquisadores responsáveis podem receber:
- 🏆 Crédito público em hall of fame
- 🎁 Licença gratuita do Cena Studio Pro por 1 ano
- 📧 Carta de recomendação (para pesquisadores sérios)

---

## 🔍 ESCOPO DE TESTES

### ✅ Permitido Testar

- **Aplicação web:** https://cenastudio.dev
- **API:** https://cenastudio.dev/api/*
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

### Features de Segurança Implementadas Recentemente

**Sprint 2 (Julho 2026) - 100% Completo:**
- ✅ Autenticação de 2 Fatores (TOTP)
- ✅ API Keys Pessoais
- ✅ Activity Log (30 dias)
- ✅ Session Management
- ✅ Security Alerts

**Sprint 1 (Julho 2026) - 100% Completo:**
- ✅ LGPD Dashboard
- ✅ Data Export (JSON)
- ✅ Privacy Controls
- ✅ GDPR Compliance

**Bugs Críticos Resolvidos (13-jul-2026):**
- ✅ 2FA QR Code agora renderiza corretamente
- ✅ Campo `twoFactorEnabled` persiste entre sessões
- ✅ Migration P3009 resolvida (PostgreSQL syntax)

Ver documentação completa em: `.private/BUGS_RESOLVIDOS_HISTORICO.md`

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

**Julho:**
- **13-jul:** Bug #2 identificado e resolvido - 2FA QR Code não legível
  - **Impacto:** Baixo (feature não estava sendo usada)
  - **Causa:** Frontend renderizava mock ao invés de imagem real
  - **Solução:** Implementada em 2h, sem dados comprometidos
  - **Status:** ✅ Resolvido (commit `4780d10`)

**Nenhum incidente de segurança reportado até o momento.**

### 2025

**Nenhum incidente reportado.**

Atualizaremos esta seção se ocorrerem incidentes.

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
📧 security@cenastudio.dev

**Privacidade:**
📧 privacy@cenastudio.dev

**Geral:**
📧 contato@cenastudio.dev
🌐 https://cenastudio.dev

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

**Última revisão:** 13 de Julho de 2026
**Próxima revisão:** Outubro de 2026

**Mudanças nesta revisão:**
- Adicionado 2FA (TOTP) como feature implementada
- Adicionado API Keys Pessoais
- Adicionado Activity Log e Session Management
- Adicionado LGPD Dashboard e compliance
- Atualizado histórico de incidentes (Bug #2)
- Removido "Ausência de 2FA" da lista de não-vulnerabilidades

---

**OBRIGADO POR AJUDAR A MANTER O CENA STUDIO SEGURO!** 🔒
