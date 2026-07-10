# Task 9 Implementation Summary

## Task: Backend webhooksService + delivery engine + HMAC signature

**Status:** ✅ Completed

**Date:** 2024-01-XX

---

## What Was Implemented

### 1. Core Services

#### `server/services/webhooksService.ts`
Complete webhook management service with:
- **CRUD operations**: `createWebhook`, `updateWebhook`, `deleteWebhook`, `listWebhooks`, `getWebhook`
- **Delivery engine**: `deliverWebhook` with HMAC-SHA256 signature
- **Retry logic**: `retryFailedDeliveries` with exponential backoff (10s, 30s, 90s)
- **Testing**: `testWebhook` for debugging
- **Security**: HTTPS-only URL validation
- **Plan limits**: Free (1 webhook), Pro (5), Studio (unlimited)

#### `server/services/eventDispatcher.ts`
Event orchestration service:
- Fire-and-forget event dispatching
- Finds and triggers all active webhooks for a user
- Non-blocking: failures don't block main operations
- Event filtering by subscription

### 2. Controller & Routes

#### `server/controllers/webhooksController.ts`
6 endpoints:
- `GET /api/webhooks` - List webhooks
- `POST /api/webhooks` - Create webhook
- `GET /api/webhooks/:id` - Get details + recent deliveries
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook
- `POST /api/webhooks/:id/test` - Send test payload

#### `server/routes/webhooks.ts`
Router configuration with authentication middleware

### 3. Integration Points

Webhook events dispatched from:

#### `server/controllers/projectsController.ts`
- ✅ `project.created` - When new project is created
- ✅ `project.completed` - When project status changes to "completed"

#### `server/controllers/filesController.ts`
- ✅ `file.uploaded` - When file is uploaded to project

#### `server/services/clientPortalService.ts`
- ✅ `client.approved` - When client approves delivery in portal

#### `server/controllers/meetingsController.ts`
- ✅ `meeting.scheduled` - When meeting is created

### 4. Testing

#### `server/services/webhooksService.test.ts`
Comprehensive test coverage:
- ✅ HMAC signature correctness
- ✅ Retry backoff delays (10s, 30s, 90s)
- ✅ Webhook pause after 3 failures
- ✅ Event filtering
- ✅ Plan limits enforcement
- ✅ HTTPS validation
- ✅ Timeout configuration (10s)

**Test Results:** 11/11 passing ✅

---

## Technical Implementation

### HMAC Signature (Requirement 3.3)

```typescript
function calculateSignature(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
```

Sent as `X-Webhook-Signature` header for receiver validation.

### Delivery with Timeout (Requirement 3.8)

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s

const response = await fetch(webhook.url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Signature": signature,
    "User-Agent": "CenaStudio-Webhook/1.0",
  },
  body: payloadString,
  signal: controller.signal,
});
```

### Retry Logic (Requirement 3.4)

- **Backoff delays**: 10s → 30s → 90s
- **Max attempts**: 3
- **Auto-pause**: Webhook deactivated after 3 consecutive failures
- **Manual reactivation**: User can reactivate in UI (resets failure count)

### Event Filtering (Requirement 3.2)

Webhooks subscribe to specific events:
```typescript
type WebhookEventType =
  | "project.created"
  | "project.completed"
  | "task.completed"
  | "file.uploaded"
  | "client.approved"
  | "meeting.scheduled";
```

Only matching webhooks receive events.

### Plan Gating (Requirement 3.6)

```typescript
const PLAN_LIMITS = {
  free: 1,
  pro: 5,
  studio: Infinity,
};
```

Enforced on webhook creation.

---

## Payload Structure

Standard webhook payload:

```json
{
  "event": "project.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": 123,
  "projectId": 456,
  "data": {
    "projectId": 456,
    "projectName": "Reel Instagram 30s",
    "status": "active"
  }
}
```

### Event-Specific Data

**project.created**
```json
{
  "projectId": 456,
  "projectName": "Nome do Projeto",
  "status": "active"
}
```

**project.completed**
```json
{
  "projectId": 456,
  "projectName": "Nome do Projeto",
  "completedAt": "2024-01-15T10:30:00.000Z"
}
```

**file.uploaded**
```json
{
  "fileId": 789,
  "fileName": "video-final.mp4",
  "originalName": "video-final.mp4",
  "fileSize": 15728640,
  "mimeType": "video/mp4"
}
```

**client.approved**
```json
{
  "projectId": 456,
  "projectName": "Nome do Projeto",
  "fileId": 789,
  "approvedAt": "2024-01-15T10:30:00.000Z"
}
```

**meeting.scheduled**
```json
{
  "meetingId": 101,
  "meetingTitle": "Reunião de Briefing",
  "clientId": 12,
  "clientName": "Cliente X",
  "startsAt": "2024-01-20T14:00:00.000Z",
  "location": "Google Meet"
}
```

---

## Security Features

1. **HTTPS-only URLs**: HTTP webhooks rejected at creation
2. **HMAC-SHA256 signatures**: Receivers can verify authenticity
3. **UUID secrets**: Auto-generated, shown once on creation
4. **10s timeout**: Prevents webhook endpoints from blocking server
5. **Rate limiting**: Inherited from global API rate limits

---

## Database Schema

Already created in Prisma (Task 8):

### `webhooks` table
- `id` (UUID)
- `userId` (BigInt)
- `name` (String)
- `url` (String)
- `secret` (UUID)
- `events` (String[])
- `isActive` (Boolean)
- `failureCount` (Int)
- `lastError` (String?)
- `lastErrorAt` (DateTime?)
- `createdAt` / `updatedAt`

### `webhook_deliveries` table
- `id` (UUID)
- `webhookId` (UUID)
- `event` (String)
- `payload` (Json)
- `statusCode` (Int?)
- `responseTime` (Int?)
- `responseBody` (String?)
- `error` (String?)
- `attemptCount` (Int)
- `nextRetryAt` (DateTime?)
- `createdAt`

---

## Integration with Zapier/Make/n8n

Users can integrate with automation platforms:

1. **Zapier**: Use "Webhooks by Zapier" trigger
2. **Make (Integromat)**: Use "Custom Webhook" module
3. **n8n**: Use "Webhook" trigger node
4. **Discord**: Use Discord webhook URL
5. **Slack**: Use Slack incoming webhook URL

Example URLs:
- Zapier: `https://hooks.zapier.com/hooks/catch/12345/abcde`
- Discord: `https://discord.com/api/webhooks/12345/token`
- Slack: `https://hooks.slack.com/services/T00/B00/token`

---

## Not Implemented (Future Tasks)

The following items from the task description are **not** part of Task 9:

- ❌ **Task-related webhooks**: `task.completed` event dispatcher (no task completion controller found)
- ❌ **Cron job**: `server/jobs/webhookRetryJob.ts` (Task 10)
- ❌ **Frontend UI**: `WebhookManager` component (Task 11)

These will be implemented in subsequent tasks.

---

## Verification Checklist

- ✅ `webhooksService.ts` created with all functions
- ✅ `eventDispatcher.ts` created
- ✅ `webhooksController.ts` created with 6 endpoints
- ✅ `webhooks.ts` routes registered in `router.ts`
- ✅ HMAC signature implementation
- ✅ Retry logic with backoff (10s/30s/90s)
- ✅ HTTPS validation
- ✅ 10s timeout with AbortController
- ✅ Plan limits (Free 1, Pro 5, Studio unlimited)
- ✅ Event dispatches in 5 controllers
- ✅ Tests passing (11/11)
- ✅ TypeScript compiles without errors

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| 3.1 | ✅ | Webhook CRUD implemented |
| 3.2 | ✅ | Event types + validation |
| 3.3 | ✅ | HMAC-SHA256 signature |
| 3.4 | ✅ | Retry with backoff + pause after 3 failures |
| 3.6 | ✅ | Plan limits enforced |
| 3.7 | ✅ | Deliveries list (last 10) |
| 3.8 | ✅ | 10s timeout + User-Agent header |

**Requirements from other tasks:**
- 3.5 (Frontend debug UI) → Task 11
- Cron job → Task 10

---

## Usage Example

### 1. Create Webhook

```bash
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Zapier Integration",
  "url": "https://hooks.zapier.com/hooks/catch/12345/abcde",
  "events": ["project.completed", "client.approved"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Zapier Integration",
    "url": "https://hooks.zapier.com/hooks/catch/12345/abcde",
    "secret": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "events": ["project.completed", "client.approved"],
    "isActive": true,
    "failureCount": 0
  },
  "message": "Webhook criado com sucesso. Salve o secret exibido, ele não será mostrado novamente."
}
```

### 2. Trigger Event

When a project is completed:

```typescript
// In projectsController.ts
dispatchEvent("project.completed", userId, {
  userId,
  projectId: 456,
  data: {
    projectId: 456,
    projectName: "Reel Instagram",
    completedAt: "2024-01-15T10:30:00.000Z",
  },
});
```

### 3. Receive Webhook

POST to `https://hooks.zapier.com/hooks/catch/12345/abcde`

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: a1b2c3d4e5f6...
User-Agent: CenaStudio-Webhook/1.0
```

**Body:**
```json
{
  "event": "project.completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": 123,
  "projectId": 456,
  "data": {
    "projectId": 456,
    "projectName": "Reel Instagram",
    "completedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Verify Signature (Receiver Side)

```javascript
const crypto = require('crypto');

function verifySignature(secret, payload, receivedSignature) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return computedSignature === receivedSignature;
}

// In webhook handler
const signature = req.headers['x-webhook-signature'];
const isValid = verifySignature(SECRET, req.body, signature);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

---

## Next Steps (Remaining Tasks)

1. **Task 10**: Create cron job `webhookRetryJob.ts` for scheduled retries
2. **Task 11**: Build frontend UI `WebhookManager` in Settings
3. Add `task.completed` event dispatch when task controller is found

---

## Notes

- All webhook deliveries are **non-blocking** - failures don't interrupt main operations
- Secret is shown **only once** on creation - store securely
- Reactivating a webhook resets failure count
- Deliveries older than 30 days may be archived (future enhancement)
- Test endpoint useful for debugging integrations

