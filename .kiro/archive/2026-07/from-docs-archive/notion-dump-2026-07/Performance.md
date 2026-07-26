# Performance

> Guia de métricas, otimizações e escalabilidade do Cena Studio.

---

## 📊 Status Atual de Performance

O sistema é altamente performático em renderização (React 19 + Vite), mas possui desafios específicos relacionados às APIs de IA e limites Serverless.

**Métricas Típicas:**
- **TTFB (Time to First Byte):** ~150ms
- **LCP (Largest Contentful Paint):** ~2s
- **Latência de API Comum:** ~200ms
- **Latência de Geração IA:** 2s a 15s (dependendo do prompt e modelo).

---

## ⚡ Otimizações Implementadas

### Frontend (React/Vite)
- **Code Splitting / Lazy Loading:** Páginas e componentes pesados (ex: Video Player) são carregados sob demanda.
- **Debouncing:** Inputs de busca (como filtros de clientes) aguardam o usuário parar de digitar (300ms) antes de bater na API.
- **Minificação e Tree Shaking:** O Vite remove código não utilizado das bibliotecas de UI, gerando um bundle muito leve.

### Backend (Express/Vercel)
- **Edge Cache & Compressão:** A Vercel automaticamente comprime (gzip/brotli) assets e JSONs.
- **Connection Pooling Limitado:** O Prisma usa `@prisma/adapter-pg` com `connection_limit=1` por instância, para não estourar as conexões do banco durante cold-starts concorrentes.

---

## 🐌 Gargalos (Bottlenecks) Conhecidos

### 1. Chamadas de IA Extensas
**Problema:** Gerações longas (como um Roteiro de 10 páginas) podem demorar até 30s. A Vercel no plano Free encerra conexões em 10s-15s.
**Solução Planejada:** Migração para chamadas assíncronas (Background Jobs via Inngest) ou WebSockets para streaming contínuo das respostas da IA. O `NVIDIA_TIMEOUT_MS` já está configurado para 60s internamente no código, caso a Vercel permita.

### 2. Cold Starts do Serverless
**Problema:** A primeira requisição após o deploy ou após horas de inatividade sofre um atraso de 1 a 2 segundos para o Node.js "acordar". Às vezes gera `Connection timeout` no Prisma.
**Solução:** O app já aplica retries automáticos. Alternativamente, *cron jobs* podem ser usados para manter o serviço quente (`/health`).

---

## 📈 Estratégias de Escalonamento

Se a base de usuários saltar de 50 para 5.000 diretores de arte ativos simultâneos:

1. **Caching em Memória:**
   Implementar **Redis** para *cachear* chamadas pesadas ao banco (ex: listagem de ferramentas ou templates).
   
2. **Separação de Analytics:**
   Queries para o Dashboard podem se tornar muito custosas. Será necessário criar *Materialized Views* no Postgres do Supabase, que são atualizadas a cada hora, aliviando a leitura.

3. **Sharding de Arquivos:**
   Garantir que todos os uploads pesados (Vídeos brutos) passem direto do navegador para o Supabase Storage via URLs assinadas, sem passar pelo backend Express, aliviando a banda do servidor.

---

#performance #otimizacao #serverless #escalabilidade
