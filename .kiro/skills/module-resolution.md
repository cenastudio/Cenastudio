# Module Resolution Skill

## ESM vs CommonJS

### ESM (Este projeto)
```typescript
import { x } from './module.js'; // ✅
export default app; // ✅
```

### CommonJS (NÃO usar)
```javascript
const { x } = require('./module'); // ❌
module.exports = app; // ❌
```

## Import Extensions

Em ESM, SEMPRE incluir `.js` mesmo para arquivos `.ts`:
```typescript
import { logger } from './utils/logger.js'; // ✅
import { logger } from './utils/logger'; // ❌ Erro em runtime
```

## Dynamic Imports

Para evitar análise estática:
```typescript
const moduleName = 'better-sqlite3';
const mod = await import(moduleName); // ✅ TS não valida
```
