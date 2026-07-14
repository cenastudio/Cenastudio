# One-off scripts

Scripts pontuais criados durante investigação/debug e que não fazem
parte da suíte de testes formal (não são chamados por `npm run test`,
`npm run e2e`, `npm run build` etc.). Ficam aqui como referência para
reuso manual.

**14-jul-2026:** os scripts de teste de conexão Supabase que existiam
aqui (`test-db-simple.ts`, `test-pooler.ts`, `test-projeto-b.ts`,
`test-senha-correta.ts`, `test-senha-real.ts`,
`test-supabase-connection.ts`) foram removidos por conterem senhas de
banco de dados reais hardcoded (não placeholders). Essas credenciais
já estavam commitadas no histórico do git — ver
`.private/CREDENCIAIS_ROTACIONAR.md` para o registro do vazamento e
`.private/SESSAO_2026-07-14.md` para o que foi feito nesta sessão de
limpeza. Se algum projeto Supabase antigo referenciado por esses
scripts ainda existir e estiver ativo, ele precisa ser rotacionado ou
excluído — não apenas o código.

Ao adicionar um novo script aqui: nunca hardcode credenciais reais,
mesmo que "seja só um teste local". Use variáveis de ambiente.
