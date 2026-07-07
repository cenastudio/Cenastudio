# Systematic Debugging Skill

## Protocolo STOP-THINK-ACT

### STOP
❌ Não fazer mudanças aleatórias
❌ Não testar múltiplas coisas ao mesmo tempo
❌ Não assumir sem verificar

### THINK
1. Qual é o erro EXATO?
2. Onde está acontecendo?
3. O que mudou desde a última versão funcionando?
4. Qual é a causa mais provável?

### ACT
1. Uma mudança por vez
2. Commit com mensagem clara
3. Deploy
4. Teste específico
5. Documente resultado

## Técnica de Bisecção

```bash
# Encontrar último commit funcionando
git log --oneline
git checkout <commit-bom>
# Testar
# Se funciona, bissectar entre commit-bom e commit-ruim
```

## Debug por Eliminação

1. Remover suspeitos um por vez
2. Isolar componente problemático
3. Reproduzir em ambiente mínimo
4. Corrigir causa específica
