# Relatório de Auditoria — Cena Studio

**Data:** 05 de Julho de 2026
**Objetivo:** Preparar o repositório para migração de conta (GitHub, Vercel, Supabase)

---

## 1. Escopo

Auditoria de credenciais, documentação e configuração antes de provisionar o projeto em uma infraestrutura nova. Cobriu:

- Documentação (`*.md`)
- Configuração (`.env.example`, `vercel.json`, `supabase/config.toml`)
- Código-fonte (`server/`, `client/`, `shared/`)
- Migrations (`supabase/migrations/`)
- Scripts e utilitários na raiz do projeto

---

## 2. Achados Críticos (Resolvidos)

| Arquivo | Problema | Ação |
|---------|----------|------|
| `LEIA_ISTO_URGENTE.md` | Continha IDs reais de Vercel, Supabase e GitHub | Removido |
| `CONFIGURAR_GITHUB_OAUTH_CORRETO.sh` | Continha callback URL real do Supabase | Removido |
| `SOLUCAO_FINAL_URGENTE.sh` | Continha project ID real do Vercel | Removido |
| `CHANGELOG_AUDIT.md` | Continha project ID real do Supabase | Removido |
| `.manus-logs/` | Continha tokens OAuth reais do GitHub e chaves Supabase capturados em sessões de uso, incluindo e-mail pessoal | Removido + adicionado ao `.gitignore` |
| `supabase/.temp/` | Continha connection string real com project ref | Removido + adicionado ao `.gitignore` |
| `DEPLOYMENT.md` (linha ~202) | Referenciava project-ref específico como exemplo | Generalizado para placeholder |

**Importante:** nenhum dos itens acima chegou a ser commitado no Git (confirmado via `git log` e `git ls-files`), portanto não há necessidade de reescrever histórico. Ainda assim, como precaução, revogue as chaves da conta antiga ao migrar — veja `MANUAL_ACTIONS.md`.

---

## 3. Achados Não Críticos (OK, sem ação)

Referências genéricas com wildcard ou placeholder, corretas por design:

- `server/app.ts` e `vercel.json`: `*.supabase.co` (CSP wildcard)
- `server/models/prisma.ts`: detecção de hostname genérica
- `.env.example`, `SECURITY.md`, `API_GUIDE.md`, `skills/api-design/SKILL.md`: exemplos com placeholders (`sk_live_...`, `your_supabase_url`)

---

## 4. Documentação

### Mantida e revisada
- `README.md`, `ARCHITECTURE.md`, `API_GUIDE.md`, `DEPLOYMENT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

### Nova (para o processo de migração)
- `SETUP.md` — guia de provisionamento em conta nova (Supabase, Vercel, GitHub)
- `MANUAL_ACTIONS.md` — checklist de rotação de credenciais pós-migração
- `MIGRATION_READY.md` — resumo executivo do estado do projeto
- `SEGURANCA_CHECKLIST.md` — checklist de segurança
- `FAZER_BACKUP_AGORA.md` — instruções de backup antes da migração
- `CREDENCIAIS_TEMPLATE.md` — template para organizar novas credenciais (não commitar preenchido)

### Removida por conter credenciais ou ser redundante
- `LEIA_ISTO_URGENTE.md`, `CHANGELOG_AUDIT.md`, `COMANDOS_LIMPEZA_FINAL.txt`
- Scripts `.sh` antigos com IDs reais

---

## 5. Ferramentas Criadas

- `scripts/validate-env.ts` + `npm run validate:env` — valida presença e formato das variáveis de ambiente antes do deploy
- `VERIFICAR_SISTEMA.sh` — checagem geral de estrutura, `.env`, `.gitignore` e credenciais expostas
- `EXECUTAR_LIMPEZA_SEGUNDA.sh` — automação da limpeza final (logs, Git) antes de provisionar contas novas
- `GERAR_SENHAS.sh` — gera `JWT_SECRET` e senhas fortes para admin/demo/banco

---

## 6. Estado do `.env.example`

Validado contra o uso real de `process.env.*` no código. Cobre: servidor, auth, Supabase, banco, provedores de IA (OpenRouter/Anthropic/NVIDIA), Stripe (legado), GitHub OAuth e SMTP (opcional). Nenhuma variável usada no código está ausente do template.

---

## 7. Pendências (ação manual, fora do escopo automatizável)

Ver `MANUAL_ACTIONS.md` para o checklist completo. Resumo:

- [ ] Rotacionar chaves Supabase da conta antiga (`anon`, `service_role`)
- [ ] Rotacionar tokens de acesso Vercel/GitHub da conta antiga
- [ ] Rotacionar `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (se aplicável)
- [ ] Validar deploy na conta nova com `npm run smoke:prisma`

---

## 8. Conclusão

O repositório está livre de credenciais reais rastreadas ou versionadas. Os riscos residuais estavam em arquivos não versionados (`.manus-logs/`, `supabase/.temp/`), já removidos e agora bloqueados via `.gitignore`. Próximo passo: seguir `SETUP.md` para provisionar a infraestrutura nova.
