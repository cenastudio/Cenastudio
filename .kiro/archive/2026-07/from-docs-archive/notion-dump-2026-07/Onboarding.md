# Onboarding

> Guia de introdução para novos desenvolvedores contribuindo para o Cena Studio.

---

## 👋 Boas-vindas

O Cena Studio é uma base de código consolidada com um monolito modular bem estruturado. Nós usamos tecnologias modernas, mantendo as dependências enxutas e favorecendo uma arquitetura limpa (Controllers, Services, Models).

## 🚀 Setup Rápido (First Day)

1. Clone o repositório.
2. Certifique-se de usar Node.js 20+.
3. Execute `npm install`.
4. Duplique o `.env.example` para `.env` e defina um `JWT_SECRET`.
5. Execute `npm run dev`.
6. Acesse o frontend (porta 5173) e brinque com as ferramentas de IA, clientes e painel de projetos usando o usuário `demo@cenastudio.com.br` (`demo123`).

*(Veja [[Setup & Configuração]] para detalhes de variáveis de ambiente)*

---

## 🗺️ Mapa do Repositório

Entender onde o código vive é metade do trabalho.

### Frontend (`client/src/`)
- `components/` — Fragmentos de UI organizados por contexto (`ui`, `landing`, `studio`, navbars).
- `pages/` — Componentes principais de rotas. O roteamento é feito no `App.tsx` usando `wouter`.
- `contexts/` — Estado global (Autenticação, Tema escuro/claro, Projeto ativo, Idioma).

### Backend (`server/`)
- `routes/` — Mapeia endpoints HTTP para Controllers.
- `controllers/` — Processa a request (valida com Zod) e formata a resposta. Não deve conter lógica de negócio bruta.
- `services/` — O "coração" da regra de negócio (ex: chamada à API do Stripe, NVIDIA, lógica de CRM).
- `models/` — Acesso ao banco de dados (atualmente SQLite via `better-sqlite3`, migrando para `Prisma`).

### Shared (`shared/`)
Código compartilhado entre Front e Back:
- `tools.ts` — É aqui que definimos as 12 ferramentas de IA, seus IDs, prompts e metadados. O banco faz *seed* dessas informações ao iniciar.

---

## 🔄 Fluxo Típico de uma Feature

### Exemplo: Adicionando uma nova ferramenta IA

1. **Definição:** Adicione os metadados da ferramenta no array `TOOLS` em `shared/tools.ts`. Inclua o prompt otimizado da persona de IA.
2. **Backend:** O `aiController` e o `aiService` já são genéricos e processarão a nova ferramenta automaticamente com base no ID.
3. **Frontend:** A página `Studio.tsx` renderizará a nova ferramenta dinamicamente ao acessar a rota do respectivo ID.
4. **Customização (Opcional):** Se a ferramenta precisar de um formulário ou visualizador muito específico, adicione um componente customizado na camada do Studio.

---

## 🧪 Práticas de Desenvolvimento

### Validação
Use o `zod` intensamente. Todos os *payloads* que entram no Express devem ser parseados com schemas Zod nos controllers para garantir tipagem em tempo de execução.

### Tratamento de Erros no Backend
Não use `try/catch` para enviar respostas HTTP a menos que seja estritamente necessário. Lance erros estendidos ou use o middleware de `errorHandler` global do Express. O padrão de resposta é sempre:
```json
// Sucesso
{ "success": true, "data": { ... } }

// Erro
{ "success": false, "error": "Mensagem descritiva" }
```

### Contexto do Projeto (UX Flow)
Lembre-se da arquitetura de UX: O sistema é voltado para **projetos**. Ao criar novas telas ou componentes, verifique se elas devem ler do `ProjectContext` para preencher automaticamente os dados de um cliente ou escopo (veja [[UX Flow]]).

---

## 📝 Tarefas Sugeridas para Iniciantes

Para se acostumar com o codebase:
1. Altere um texto de um *Toast* (notificação do `sonner`) no frontend.
2. Adicione um campo simples de "observação" na página de perfil do usuário.
3. Modifique um prompt de IA no `shared/tools.ts` para testar o comportamento do Assistente Livre.
4. Revise os testes executando `npm run test`.

---

#onboarding #dev #guia #iniciante
