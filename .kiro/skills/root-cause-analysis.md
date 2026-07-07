# Root Cause Analysis Skill

## Metodologia dos 5 Porquês

### Exemplo: FUNCTION_INVOCATION_FAILED
1. **Por quê?** Função serverless crashou
2. **Por quê?** Erro não tratado durante inicialização
3. **Por quê?** assertLaunchReadyEnvironment() falhou
4. **Por quê?** Validação de SUPABASE_URL em ambiente que usa Neon
5. **Causa Raiz**: Validação incorreta para ambiente de produção

## Técnica de Análise

### 1. Sintoma Observado
- O QUE falhou (ex: endpoint retorna 500)
- QUANDO falha (sempre, intermitente, primeiro request)
- ONDE falha (qual ambiente, qual função)

### 2. Evidências
- Logs completos
- Stack trace
- Variáveis de ambiente
- Configuração atual

### 3. Hipóteses
Liste possíveis causas ordenadas por probabilidade

### 4. Teste Cada Hipótese
Um teste por vez, com rollback se falhar

### 5. Validação
Confirme que a correção resolve o problema raiz, não apenas o sintoma
