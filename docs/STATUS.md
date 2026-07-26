# Status — Cena Studio

> Documento único e vivo. Não crie `*_SUMMARY.md`, `*_REPORT.md`,
> `*_COMPLETION.md` — atualize este arquivo. Toda vez que algo mudar
> de estado, edite a seção correspondente, não acrescente uma nova
> no fim sem contexto. Data da última atualização no topo.

**Última atualização:** 2026-07-26

## 1. Estado atual por módulo/feature

_A preencher conforme o processamento da Seção 5. Uma linha por módulo
(Comercial, Produção, Financeiro/DRE, Studio IA, Admin, LGPD, Portal do
Cliente, etc.), descrevendo o que existe de fato — sem percentual genérico._

## 2. Decisões de arquitetura em aberto

_A preencher conforme o processamento da Seção 5. Trade-off identificado
mas ainda não resolvido entra aqui; quando for resolvido, sai desta lista
e vira ADR em `ARCHITECTURE.md`, sem duplicar._

## 3. Gatilhos pendentes

- Ao fechar o primeiro cliente pagante → revisar modelo de IA das
  ferramentas de Orçamento e Contrato (alta criticidade) antes das demais.
- Ao próximo commit que tocar `.gitignore` → o `.gitignore` ainda tem 2 regras
  de ancoragem a revisar: `RELATORIO_*` e `SESSAO_*`. O `RELATORIO_*` já foi
  ancorado (`/RELATORIO_*.md`, linha 98) no commit `065bc36`; falta ancorar
  `SESSAO_*.md` (linha 73), que hoje torna
  `.kiro/specs/features-criticas-gap-analysis/SESSAO_2026_07_10.md` invisível ao
  git. Backup de segurança em `/tmp/backup-sessao.md` (volátil — reboot apaga).
  Contexto: todo esse bloco do `.gitignore` foi escrito para barrar scratch de
  sessão na **raiz** do repo, mas os padrões não têm âncora `/`, então casam em
  qualquer profundidade. Os ~30 padrões restantes do bloco têm o mesmo defeito
  latente, sem arquivo afetado hoje.

## 4. Próximas tarefas

Ordem de execução combinada. O conteúdo de cada frente vive na spec, não aqui.

1. `.kiro/specs/00-fundacao-limpeza-e-documentacao/` — em andamento
2. `.kiro/specs/qualidade-raciocinio-ia/`
3. `.kiro/specs/auditoria-ux-2026-07/`

## 5. Achados extraídos de documentos arquivados

Checklist de progresso do processamento. Para cada arquivo: decisão de
arquitetura válida → ADR em `ARCHITECTURE.md`; estado atual real → Seção 1
deste arquivo. Esta seção não repete o conteúdo extraído, só marca o que
já foi revisado.

### `features-criticas-gap-analysis/` (20)

- [ ] `EXECUTIVE_SUMMARY.md`
- [ ] `FINAL_COMPLETION_REPORT.md`
- [ ] `MISSING_FEATURES_ANALYSIS.md`
- [ ] `PROGRESS.md`
- [ ] `README.md`
- [ ] `SESSAO_2026_07_10.md` — invisível ao git (`.gitignore:73` `SESSAO_*.md`)
- [ ] `SESSION_MANAGEMENT_SPEC.md`
- [ ] `TASK_9_SUMMARY.md`
- [ ] `TASK_10_SUMMARY.md`
- [ ] `TASK_11_COMPLETION.md`
- [ ] `TASK_12_COMPLETION.md`
- [ ] `TASK_13_COMPLETION.md`
- [ ] `TASK_14_COMPLETION.md`
- [ ] `TASK_15_COMPLETION.md`
- [ ] `TASK_20_COMPLETION.md`
- [ ] `TASK_21_COMPLETION.md`
- [ ] `TASK_24_COMPLETION.md`
- [ ] `TASK_25_COMPLETION.md`
- [ ] `TASK_26_29_COMPLETION.md`
- [ ] `TASK_33_COMPLETION_REPORT.md`
