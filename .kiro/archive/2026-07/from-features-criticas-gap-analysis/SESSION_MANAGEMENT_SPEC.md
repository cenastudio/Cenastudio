# Feature I: Session Management — Especificação Completa

**Status:** Adicionada como Task 33 (Fase 6)
**Prioridade:** CRÍTICA - Deve "funcionar de verdade"
**Estimativa:** 2-3 dias de implementação
**Requisitos:** Requirement 9 (novo)

---

## 📋 Visão Geral

Feature de gerenciamento de sessões ativas que permite ao usuário visualizar todos os dispositivos/navegadores conectados à sua conta e encerrar sessões remotamente. Esta é uma feature de **segurança crítica** que deve funcionar em produção (não é mockup).

### Motivação

Usuário solicitou explicitamente:
> "isso tem que funcionar de verdade: Sessões ativas. Dispositivos conectados à sua conta. Encerrar todas. Chrome no macOS. São Paulo, BR. Sessão atual. Último acesso: Agora. Safari no iPhone. São Paulo, BR. Encerrar. Último acesso: Há 2 horas"

### Valor para o Usuário

- **Segurança:** Detectar acessos não autorizados
- **Controle:** Encerrar sessões remotamente (ex: esqueceu logout em PC público)
- **Transparência:** Ver exatamente onde a conta está sendo acessada
- **Auditoria:** Histórico de acessos por dispositivo/localização

---

## 🏗️ Arquitetura

### Fluxo de Autenticação + Sessões

```
┌─────────────────────────────────────────────────┐
│  1. User faz login                               │
│     ↓                                            │
│  2. JWT token gerado (7 dias expiry)            │
│     ↓                                            │
│  3. Token armazenado em cookie httpOnly          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Middleware Stack (toda requisição autenticada) │
│                                                  │
│  authenticate → sessionTracking → route handler │
│        ↓              ↓                          │
│   valida JWT    upsert session                  │
│   (existing)    (NEW - Task 33)                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Database: user_sessions table                  │
│                                                  │
│  - token (hash SHA256 do JWT)                   │
│  - deviceInfo (browser, OS)                     │
│  - ipAddress                                    │
│  - location (cidade, país)                      │
│  - lastAccessAt                                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Settings > Sessões (Frontend)                  │
│                                                  │
│  Lista sessões com:                             │
│  - Visual do browser/device                     │
│  - Location                                     │
│  - Badge "Sessão atual"                         │
│  - Botão "Encerrar" por sessão                  │
│  - Botão global "Encerrar todas"                │
└─────────────────────────────────────────────────┘
```

### Token Invalidation Strategy

**Problema:** JWT é stateless — não pode ser "revogado" sem state externo.

**Solução Escolhida:** Database-driven sessions
- ✅ Zero custo adicional (usa Postgres existente)
- ✅ Implementação simples
- ✅ Performance aceitável com indexes corretos
- ❌ Redis blacklist descartado (adiciona custo $10/mês)

**Como Funciona:**
1. Hash SHA256 do JWT → `sessionId` no banco
2. Middleware `authenticate` valida se sessão existe antes de aceitar token
3. Deletar sessão → próximo request com aquele token retorna 401
4. Cron job diário limpa sessões com `lastAccessAt > 7 dias` (match JWT expiry)

---

## 💾 Data Model

### Prisma Schema

```prisma
model UserSession {
  id          String   @id @default(uuid())
  userId      BigInt   @map("user_id")
  token       String   @unique // SHA256 hash do JWT token

  // Device & location info
  deviceInfo  Json     @default("{}") @map("device_info") // { browser, os, device }
  ipAddress   String   @map("ip_address")
  location    Json?    @default("{}") // { city, country, countryCode }

  // Timestamps
  lastAccessAt DateTime @default(now()) @map("last_access_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, lastAccessAt])
  @@index([token])
  @@map("user_sessions")
}
```

### Alteração em User Model

```prisma
model User {
  // ... campos existentes

  // NEW: relação
  sessions UserSession[]
}
```

### Exemplo de Dados

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 123,
  "token": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "deviceInfo": {
    "browser": "Chrome",
    "browserVersion": "120.0",
    "os": "macOS",
    "osVersion": "14.2",
    "device": "desktop"
  },
  "ipAddress": "189.45.123.45",
  "location": {
    "city": "São Paulo",
    "country": "Brazil",
    "countryCode": "BR"
  },
  "lastAccessAt": "2026-07-10T15:30:00.000Z",
  "createdAt": "2026-07-09T10:00:00.000Z"
}
```

---

## 🔌 API Endpoints

### GET /api/sessions

Lista sessões ativas do usuário autenticado.

**Headers:**
```
Cookie: frame_token=<jwt>
```

**Response 200:**
```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "deviceInfo": {
        "browser": "Chrome",
        "os": "macOS",
        "device": "desktop"
      },
      "location": {
        "city": "São Paulo",
        "country": "Brazil",
        "countryCode": "BR"
      },
      "ipAddress": "189.45.***.**",
      "lastAccessAt": "2026-07-10T15:30:00.000Z",
      "createdAt": "2026-07-09T10:00:00.000Z",
      "isCurrent": true
    },
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "deviceInfo": {
        "browser": "Safari",
        "os": "iOS",
        "device": "mobile"
      },
      "location": {
        "city": "São Paulo",
        "country": "Brazil",
        "countryCode": "BR"
      },
      "ipAddress": "189.45.***.**",
      "lastAccessAt": "2026-07-10T13:15:00.000Z",
      "createdAt": "2026-07-08T09:00:00.000Z",
      "isCurrent": false
    }
  ],
  "total": 2
}
```

**Response 401:** Token inválido ou expirado

---

### DELETE /api/sessions/:sessionId

Encerra sessão específica.

**Headers:**
```
Cookie: frame_token=<jwt>
```

**Response 200:**
```json
{
  "message": "Session terminated successfully"
}
```

**Response 400:** Tentativa de encerrar sessão atual
```json
{
  "error": "Cannot terminate current session"
}
```

**Response 404:** Sessão não encontrada ou não pertence ao usuário

---

### DELETE /api/sessions/all

Encerra todas sessões exceto a atual.

**Headers:**
```
Cookie: frame_token=<jwt>
```

**Response 200:**
```json
{
  "message": "All other sessions terminated",
  "terminated": 3
}
```

---

## 🛠️ Backend Implementation

### sessionService.ts

```typescript
import crypto from 'crypto';
import { db } from '../models/db.js';
import UAParser from 'ua-parser-js';

export interface DeviceInfo {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  device?: string; // 'desktop' | 'mobile' | 'tablet'
}

export interface LocationInfo {
  city?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Calcula SHA256 hash de token JWT
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse user-agent string
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version,
    os: result.os.name || 'Unknown',
    osVersion: result.os.version,
    device: result.device.type || 'desktop',
  };
}

/**
 * Busca localização por IP (Cloudflare headers ou ipapi.co)
 */
export async function getLocationFromIP(
  ip: string,
  headers: Record<string, string | undefined>
): Promise<LocationInfo | null> {
  // Try Cloudflare headers first (free if using CF)
  const cfCountry = headers['cf-ipcountry'];
  const cfCity = headers['cf-ipcity'];

  if (cfCountry) {
    return {
      city: cfCity,
      country: cfCountry,
      countryCode: cfCountry,
    };
  }

  // Fallback: ipapi.co (45 req/min free tier)
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      timeout: 2000, // 2s timeout
    });

    if (!response.ok) return null;

    const data = await response.json();

    return {
      city: data.city,
      country: data.country_name,
      countryCode: data.country_code,
    };
  } catch {
    return null; // Não crítico, pode falhar
  }
}

/**
 * Upsert sessão com rate limiting (max 1 update/5min)
 */
export async function upsertSession(
  userId: bigint,
  token: string,
  deviceInfo: DeviceInfo,
  ipAddress: string,
  location?: LocationInfo
): Promise<void> {
  const tokenHash = hashToken(token);
  const now = new Date();

  // Check se sessão existe e se foi atualizada recentemente
  const existing = await db.userSession.findUnique({
    where: { token: tokenHash },
  });

  if (existing) {
    const timeSinceLastUpdate = now.getTime() - existing.lastAccessAt.getTime();
    const fiveMinutesMs = 5 * 60 * 1000;

    if (timeSinceLastUpdate < fiveMinutesMs) {
      return; // Skip update (rate limiting)
    }
  }

  // Upsert
  await db.userSession.upsert({
    where: { token: tokenHash },
    create: {
      userId,
      token: tokenHash,
      deviceInfo,
      ipAddress,
      location: location || {},
      lastAccessAt: now,
    },
    update: {
      lastAccessAt: now,
      ipAddress, // Pode mudar (VPN, mobile data)
      location: location || existing?.location || {},
    },
  });
}

/**
 * Lista sessões ativas do usuário
 */
export async function listActiveSessions(userId: bigint) {
  return db.userSession.findMany({
    where: { userId },
    orderBy: { lastAccessAt: 'desc' },
  });
}

/**
 * Verifica se sessão é válida
 */
export async function isSessionValid(tokenHash: string): Promise<boolean> {
  const session = await db.userSession.findUnique({
    where: { token: tokenHash },
  });

  return !!session;
}

/**
 * Encerra sessão específica
 */
export async function terminateSession(
  userId: bigint,
  sessionId: string
): Promise<void> {
  await db.userSession.delete({
    where: {
      id: sessionId,
      userId, // Security: só pode deletar própria sessão
    },
  });
}

/**
 * Encerra todas sessões exceto atual
 */
export async function terminateAllSessions(
  userId: bigint,
  exceptCurrentToken?: string
): Promise<{ terminated: number }> {
  const exceptHash = exceptCurrentToken ? hashToken(exceptCurrentToken) : undefined;

  const result = await db.userSession.deleteMany({
    where: {
      userId,
      ...(exceptHash && {
        token: { not: exceptHash },
      }),
    },
  });

  return { terminated: result.count };
}

/**
 * Cleanup sessões expiradas (cron job diário)
 */
export async function cleanupExpiredSessions(): Promise<{ deleted: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await db.userSession.deleteMany({
    where: {
      lastAccessAt: { lt: sevenDaysAgo },
    },
  });

  return { deleted: result.count };
}
```

### sessionTracking.ts (Middleware)

```typescript
import type { RequestHandler } from 'express';
import * as sessionService from '../services/sessionService.js';
import { COOKIE_NAME } from './authenticate.js';

/**
 * Middleware que rastreia sessões ativas
 * Deve rodar APÓS authenticate middleware
 */
export const sessionTracking: RequestHandler = async (req, _res, next) => {
  if (!req.user) {
    return next(); // Não autenticado, skip
  }

  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return next();
  }

  try {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const deviceInfo = sessionService.parseUserAgent(userAgent);

    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || 'Unknown') as string;

    const location = await sessionService.getLocationFromIP(
      ipAddress,
      req.headers as Record<string, string | undefined>
    );

    // Fire-and-forget (não bloqueia request)
    sessionService.upsertSession(
      BigInt(req.user.id),
      token,
      deviceInfo,
      ipAddress,
      location || undefined
    ).catch((err) => {
      console.error('[sessionTracking] Failed to upsert session:', err);
    });
  } catch (err) {
    console.error('[sessionTracking] Unexpected error:', err);
  }

  next();
};
```

### Alteração em authenticate.ts

```typescript
// Adicionar validação de sessão
export const authenticate: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return next(new AppError("Unauthorized", 401));
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthUser;

    // NEW: Validar se sessão existe no DB
    const tokenHash = sessionService.hashToken(token);
    const sessionValid = await sessionService.isSessionValid(tokenHash);

    if (!sessionValid) {
      return next(new AppError("Session terminated. Please login again.", 401));
    }

    const currentUser = await getUserById(payload.id);
    if (!currentUser) {
      req.user = await ensureUserFromToken(payload);
      next();
      return;
    }

    req.user = currentUser;
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
};
```

---

## 🎨 Frontend Implementation

### pages/settings/Sessions.tsx

```typescript
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { SessionCard } from '@/components/sessions/SessionCard';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Session {
  id: string;
  deviceInfo: {
    browser: string;
    os: string;
    device?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  ipAddress: string;
  lastAccessAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      toast.error('Erro ao carregar sessões');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleTerminateAll = async () => {
    if (!confirm('Isso encerrará todas as outras sessões. Você permanecerá conectado neste dispositivo.')) {
      return;
    }

    try {
      setIsTerminatingAll(true);
      const response = await api.delete('/sessions/all');
      toast.success(`${response.data.terminated} sessões encerradas`);
      await loadSessions();
    } catch (error) {
      toast.error('Erro ao encerrar sessões');
    } finally {
      setIsTerminatingAll(false);
    }
  };

  const handleTerminateOne = async (sessionId: string) => {
    try {
      await api.delete(`/sessions/${sessionId}`);
      toast.success('Sessão encerrada');
      await loadSessions();
    } catch (error) {
      toast.error('Erro ao encerrar sessão');
    }
  };

  if (isLoading) {
    return <div>Carregando sessões...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sessões Ativas</h2>
          <p className="text-muted-foreground">
            Dispositivos conectados à sua conta
          </p>
        </div>

        {sessions.length > 1 && (
          <Button
            variant="destructive"
            onClick={handleTerminateAll}
            disabled={isTerminatingAll}
          >
            Encerrar Todas
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onTerminate={handleTerminateOne}
          />
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma sessão ativa encontrada
        </div>
      )}
    </div>
  );
}
```

### components/sessions/SessionCard.tsx

```typescript
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Chrome, Firefox, Safari, Globe } from 'lucide-react';

interface Session {
  id: string;
  deviceInfo: {
    browser: string;
    os: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  lastAccessAt: string;
  isCurrent: boolean;
}

const BROWSER_ICONS = {
  Chrome,
  Firefox,
  Safari,
  default: Globe,
};

export function SessionCard({ session, onTerminate }: {
  session: Session;
  onTerminate: (id: string) => void;
}) {
  const Icon = BROWSER_ICONS[session.deviceInfo.browser] || BROWSER_ICONS.default;

  const locationText = session.location?.city && session.location?.country
    ? `${session.location.city}, ${session.location.country}`
    : 'Localização desconhecida';

  const lastAccessText = formatDistanceToNow(
    new Date(session.lastAccessAt),
    { addSuffix: true, locale: ptBR }
  );

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Icon className="w-8 h-8 text-muted-foreground" />

        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {session.deviceInfo.browser} no {session.deviceInfo.os}
            </span>
            {session.isCurrent && (
              <Badge variant="success">Sessão atual</Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {locationText}
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            Último acesso: {lastAccessText}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onTerminate(session.id)}
        disabled={session.isCurrent}
      >
        Encerrar
      </Button>
    </div>
  );
}
```

---

## ✅ Testes

### sessionService.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as sessionService from './sessionService';
import { db } from '../models/db';

describe('sessionService', () => {
  const userId = 123n;
  const token = 'test-jwt-token-here';

  afterEach(async () => {
    await db.userSession.deleteMany({ where: { userId } });
  });

  it('should hash token correctly', () => {
    const hash1 = sessionService.hashToken(token);
    const hash2 = sessionService.hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 = 64 hex chars
  });

  it('should parse user-agent correctly', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const deviceInfo = sessionService.parseUserAgent(ua);

    expect(deviceInfo.browser).toBe('Chrome');
    expect(deviceInfo.os).toBe('macOS');
    expect(deviceInfo.device).toBe('desktop');
  });

  it('should upsert session', async () => {
    const deviceInfo = {
      browser: 'Chrome',
      os: 'macOS',
      device: 'desktop',
    };

    await sessionService.upsertSession(
      userId,
      token,
      deviceInfo,
      '127.0.0.1',
      { city: 'Test City', country: 'Test Country', countryCode: 'TC' }
    );

    const sessions = await sessionService.listActiveSessions(userId);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].deviceInfo).toEqual(deviceInfo);
  });

  it('should validate session exists', async () => {
    const deviceInfo = { browser: 'Chrome', os: 'macOS', device: 'desktop' };

    await sessionService.upsertSession(userId, token, deviceInfo, '127.0.0.1');

    const tokenHash = sessionService.hashToken(token);
    const isValid = await sessionService.isSessionValid(tokenHash);

    expect(isValid).toBe(true);
  });

  it('should terminate session', async () => {
    const deviceInfo = { browser: 'Chrome', os: 'macOS', device: 'desktop' };

    await sessionService.upsertSession(userId, token, deviceInfo, '127.0.0.1');

    const sessions = await sessionService.listActiveSessions(userId);
    const sessionId = sessions[0].id;

    await sessionService.terminateSession(userId, sessionId);

    const remainingSessions = await sessionService.listActiveSessions(userId);
    expect(remainingSessions).toHaveLength(0);
  });

  it('should terminate all sessions except current', async () => {
    const device1 = { browser: 'Chrome', os: 'macOS', device: 'desktop' };
    const device2 = { browser: 'Safari', os: 'iOS', device: 'mobile' };

    await sessionService.upsertSession(userId, 'token1', device1, '127.0.0.1');
    await sessionService.upsertSession(userId, 'token2', device2, '127.0.0.2');

    const result = await sessionService.terminateAllSessions(userId, 'token1');

    expect(result.terminated).toBe(1);

    const remaining = await sessionService.listActiveSessions(userId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].token).toBe(sessionService.hashToken('token1'));
  });

  it('should cleanup expired sessions', async () => {
    const deviceInfo = { browser: 'Chrome', os: 'macOS', device: 'desktop' };

    await sessionService.upsertSession(userId, token, deviceInfo, '127.0.0.1');

    // Artificialmente envelhecer sessão
    await db.userSession.update({
      where: { token: sessionService.hashToken(token) },
      data: { lastAccessAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });

    const result = await sessionService.cleanupExpiredSessions();

    expect(result.deleted).toBeGreaterThan(0);
  });
});
```

---

## 📦 Dependencies

### NPM Packages a Instalar

```bash
npm install ua-parser-js
npm install --save-dev @types/ua-parser-js
```

**ua-parser-js:**
- MIT License
- 15M downloads/week
- 400KB bundle size
- Parse confiável de 100+ browsers e 50+ OS

---

## 🚀 Deployment Checklist

- [ ] Migration `add_user_sessions` aplicada
- [ ] Lib `ua-parser-js` instalada
- [ ] Middleware `sessionTracking` registrado nas rotas
- [ ] Alteração em `authenticate` para validar sessão
- [ ] Cron job de cleanup configurado
- [ ] Testes unitários passando (15+)
- [ ] Teste manual em 2+ browsers
- [ ] Validar que token invalidado retorna 401
- [ ] Validar que logout remove sessão do DB

---

## 🔒 Security Considerations

1. **Token Hash:** SHA256 (não reversível) garante que JWT original não fica exposto no DB
2. **IP Masking:** Últimos 2 octetos mascarados no frontend (`189.45.***.***`)
3. **Current Session Protection:** Não permite encerrar própria sessão (UX + segurança)
4. **Rate Limiting:** Max 1 update/5min por sessão (evita spam no DB)
5. **Cascading Delete:** User delete → todas sessões deletadas (Prisma `onDelete: Cascade`)

---

## 📈 Performance

### Database Load

- **Inserts:** ~1 por login (desprezível)
- **Updates:** Max 1 a cada 5min por sessão ativa
- **Queries:** 1 por request autenticado (validação de sessão)
- **Indexes:** `(userId, lastAccessAt)` + `(token)` tornam queries O(log n)

**Estimativa para 100 usuários ativos:**
- ~200 sessões ativas simultâneas
- ~300 updates/dia por usuário = 30K writes/dia total
- Postgres handle facilmente (<0.35 writes/segundo avg)

### Frontend Load

- Página sessões carrega 1x ao abrir Settings
- No polling (usuário recarrega manualmente se quiser atualizar)
- Rendering <10 cards (típico usuário tem 2-3 sessões)

---

## 🎯 Success Metrics

- [ ] Usuário consegue visualizar sessões ativas
- [ ] Encerrar sessão remota invalida token (401 no próximo request)
- [ ] "Encerrar todas" mantém apenas sessão atual
- [ ] Browser/OS detectado corretamente (>95% dos casos)
- [ ] Localização exibida (quando disponível, não crítico)
- [ ] Performance: page load <500ms, terminate action <200ms

---

## 📚 Referências

- Requirement 9 (requirements.md)
- Task 33 (tasks.md)
- Design Session Management (design.md)
- JWT Best Practices: https://tools.ietf.org/html/rfc7519
- UA Parser JS: https://github.com/faisalman/ua-parser-js
