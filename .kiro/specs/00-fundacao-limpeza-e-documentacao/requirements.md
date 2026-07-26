# Fase 0 — Fundação: limpar, consolidar e proteger o que existe

## Contexto

O repo tem **103 arquivos `.md`** fora de `node_modules`. Só `.kiro/specs/` tem 50 (956 KB), e pelo menos 22 são relatórios de status (`*_COMPLETION.md`, `*_SUMMARY.md`, `*_AUDIT*`, `*_REPORT.md`) que se contradizem entre si. Tem até relatório de tarefa concluída **dentro do código-fonte** (`client/src/components/base/*_COMPLETION.md`, `client/src/pages/HOME_DASHBOARD_COMPLETION.md`). E o `.env.example` está incompleto: 19 variáveis usadas de verdade no código não estão nele, incluindo `DATABASE_URL`, `DATABASE_POOL_MAX` e `SUPABASE_SERVICE_ROLE_KEY`.

## Por que esta fase existe

Isso é a causa raiz de sessões de IA perderem decisões e gastarem contexto à toa: cada sessão nova que varre `.kiro/` ou `client/src/` carrega dezenas de KB de relatórios stale e contraditórios antes mesmo de chegar no código.

## Objetivo

Impedir que o trabalho seguinte vire mais um documento perdido no meio dos outros 50. Esta fase não adiciona nada — ela organiza e protege o que existe.

## Requisitos

1. **Inventário completo** de todos os `.md` do repositório (exceto node_modules)
2. **Classificação** de cada documento em: CANÔNICO, HISTÓRICO, DUPLICADO/SUPERADO, ou LIXO DE CÓDIGO-FONTE
3. **Consolidação** de informações úteis em documentos canônicos únicos
4. **`.env.example` completo** cobrindo 100% das variáveis usadas no código
5. **Documentação de conexões** permitindo reconectar o sistema do zero
6. **Documentação de cara do projeto** atualizada (README, API_GUIDE, etc.)
7. **Nenhum `.md` de status dentro de código-fonte** (`client/src/`, `server/`)

## Critérios de aceite

- [ ] Nenhum `.md` de status/conclusão dentro de `client/src/` ou `server/`
- [ ] `.kiro/specs/` só contém specs de trabalho ativo ou arquivado em `.kiro/archive/`
- [ ] `docs/STATUS.md` existe e é o único lugar que declara o que está pronto/em progresso
- [ ] `.env.example` cobre 100% das variáveis usadas no código
- [ ] `docs/CONEXOES.md` existe e permite reconectar o sistema do zero
- [ ] `AGENTS.md` está na raiz e será lido por qualquer sessão futura
