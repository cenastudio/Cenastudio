# Deployment Validation Skill

## Checklist Pré-Deploy

- [ ] Testes locais passam
- [ ] Build local funciona: `npm run build`
- [ ] TypeScript sem erros: `npm run check`
- [ ] Env vars configuradas no Vercel
- [ ] DATABASE_URL aponta para Neon

## Checklist Pós-Deploy

### 1. Build Success
```bash
vercel ls | head -3
# Deve mostrar: ● Ready
```

### 2. Function Works
```bash
curl -i https://DEPLOY-URL.vercel.app/api/health
# Deve retornar: HTTP/2 200
```

### 3. Database Connected
```bash
curl https://DEPLOY-URL.vercel.app/api/health
# Deve retornar: {"success":true,"data":{...}}
```

### 4. Main Routes Work
```bash
# Auth
curl -X POST https://DEPLOY-URL.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
# Deve retornar: 400 ou 201 (não 500)
```

## Smoke Tests

Script de validação completo:
```bash
#!/bin/bash
URL="https://cena-studio-prod.vercel.app"

echo "🧪 Testing Health..."
curl -sf $URL/api/health || echo "❌ FAIL"

echo "🧪 Testing 404..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL/api/nonexistent)
[ "$STATUS" = "404" ] && echo "✅ PASS" || echo "❌ FAIL"

echo "🧪 Testing Database..."
curl -sf $URL/api/dashboard/stats || echo "❌ FAIL (needs auth)"
```

## Rollback Strategy

```bash
# Se deploy falhar, promover último deploy bom
vercel alias cena-studio-prod-GOOD-DEPLOY.vercel.app cena-studio-prod.vercel.app
```
