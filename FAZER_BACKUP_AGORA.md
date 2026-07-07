# 💾 FAZER BACKUP AGORA - CenaSTUDIO

**⚠️ IMPORTANTE: Faça isso ANTES de segunda-feira!**

---

## 🎯 POR QUE FAZER BACKUP?

Na segunda-feira, você vai:
1. Limpar histórico Git (não tem volta!)
2. Renomear a pasta
3. Criar novas contas

**Se algo der errado, você vai querer ter um backup!**

---

## 📦 OPÇÃO 1: Backup Manual (Recomendado)

### Método 1: Copiar Pasta

```bash
# 1. Voltar para o diretório pai
cd "Projetos - NAO APAGAR"

# 2. Copiar pasta inteira
cp -R "frameai-director-correto" "frameai-director-correto-BACKUP-05-07-2026"

# 3. Verificar que copiou
ls -la | grep frameai
```

**Resultado esperado:**
```
frameai-director-correto/           ← Original
frameai-director-correto-BACKUP-05-07-2026/  ← Backup
```

### Método 2: ZIP

```bash
# 1. Voltar para o diretório pai
cd "Projetos - NAO APAGAR"

# 2. Criar ZIP (sem node_modules)
zip -r "cenastudio-backup-05-07-2026.zip" "frameai-director-correto" \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/dist/*" \
  -x "*/data/*.db"

# 3. Verificar tamanho
ls -lh cenastudio-backup-05-07-2026.zip
```

**Tamanho esperado:** ~10-50 MB (sem node_modules)

---

## 📦 OPÇÃO 2: Backup via Git (Alternativo)

### Criar Branch de Backup

```bash
# 1. Dentro da pasta do projeto
cd frameai-director-correto

# 2. Criar branch de backup
git checkout -b backup-pre-cleanup-05-07-2026

# 3. Commit tudo
git add -A
git commit -m "backup: estado antes da limpeza de segunda-feira"

# 4. Voltar para main
git checkout main
```

**Vantagem:** Você pode recuperar o estado exato via Git
**Desvantagem:** O histórico Git será apagado na segunda, então o branch também será perdido

---

## 📦 OPÇÃO 3: Backup em Nuvem (Mais Seguro)

### Google Drive / Dropbox / OneDrive

```bash
# 1. Criar ZIP
cd "Projetos - NAO APAGAR"
zip -r "cenastudio-backup-05-07-2026.zip" "frameai-director-correto" \
  -x "*/node_modules/*" -x "*/.git/*"

# 2. Upload manual para nuvem
# (arrastar arquivo ZIP para Google Drive/Dropbox)

# 3. Verificar que subiu
```

### GitHub Private Repo (Temporário)

```bash
# 1. Criar repo PRIVADO no GitHub
# https://github.com/new
# Nome: cenastudio-backup-05-07-2026
# Visibilidade: PRIVATE

# 2. Push backup
cd frameai-director-correto
git remote add backup https://github.com/SEU-USER/cenastudio-backup-05-07-2026.git
git push backup main

# 3. Depois de confirmar que nova conta funciona, você pode deletar este repo
```

---

## ✅ CHECKLIST DE BACKUP

Escolha pelo menos UMA opção abaixo:

### Backup Local
- [ ] Pasta copiada: `frameai-director-correto-BACKUP-05-07-2026/`
- [ ] OU: ZIP criado: `cenastudio-backup-05-07-2026.zip`
- [ ] OU: Branch Git criado: `backup-pre-cleanup-05-07-2026`

### Backup Nuvem (RECOMENDADO)
- [ ] ZIP upado para Google Drive / Dropbox / OneDrive
- [ ] OU: Push para GitHub repo privado temporário
- [ ] Link de download anotado

### Verificação
- [ ] Backup existe e está acessível
- [ ] Tamanho do backup parece correto (~10-50 MB)
- [ ] Data do backup é hoje (05/07/2026)

---

## 🧪 TESTAR BACKUP

**Sempre teste se o backup está bom!**

### Teste Rápido: ZIP

```bash
# 1. Ver conteúdo do ZIP
unzip -l cenastudio-backup-05-07-2026.zip | head -20

# 2. Extrair em outro lugar (teste)
mkdir test-restore
cd test-restore
unzip ../cenastudio-backup-05-07-2026.zip

# 3. Verificar estrutura
ls -la

# 4. Se estiver OK, deletar teste
cd ..
rm -rf test-restore
```

### Teste Rápido: Pasta Copiada

```bash
# 1. Entrar no backup
cd "frameai-director-correto-BACKUP-05-07-2026"

# 2. Verificar arquivos principais
ls -la | grep -E "(package.json|README.md|.env.example)"

# 3. Contar arquivos
find . -type f | wc -l

# 4. Voltar
cd ..
```

**Resultado esperado:**
- ✅ package.json existe
- ✅ README.md existe
- ✅ .env.example existe
- ✅ Milhares de arquivos (client/, server/, etc.)

---

## 🔄 RESTAURAR BACKUP (Se Necessário)

### Se Algo Der Errado na Segunda-feira

#### Opção 1: Restaurar Pasta Copiada

```bash
# 1. Deletar pasta com problema
cd "Projetos - NAO APAGAR"
rm -rf cenastudio  # ou frameai-director-correto

# 2. Restaurar do backup
cp -R "frameai-director-correto-BACKUP-05-07-2026" "frameai-director-correto"

# 3. Reinstalar dependências
cd frameai-director-correto
npm install
```

#### Opção 2: Restaurar ZIP

```bash
# 1. Deletar pasta com problema
cd "Projetos - NAO APAGAR"
rm -rf cenastudio

# 2. Extrair ZIP
unzip cenastudio-backup-05-07-2026.zip

# 3. Reinstalar dependências
cd frameai-director-correto
npm install
```

#### Opção 3: Restaurar Git Branch

```bash
# 1. Checkout branch de backup
cd frameai-director-correto
git checkout backup-pre-cleanup-05-07-2026

# 2. Criar nova branch
git checkout -b main-restored

# 3. Continuar trabalho
```

---

## 📊 TAMANHOS ESPERADOS

| Item | Tamanho | Observação |
|------|---------|------------|
| Pasta completa (com node_modules) | ~300-500 MB | Muito grande |
| Pasta sem node_modules | ~10-50 MB | Tamanho ideal |
| ZIP sem node_modules | ~5-20 MB | Comprimido |
| Apenas código fonte | ~2-5 MB | Muito leve |

---

## ⏰ QUANDO FAZER

**AGORA!** Não espere até segunda-feira.

Motivos:
1. ✅ Se algo der errado no fim de semana, você tem backup
2. ✅ Segunda-feira você vai estar ocupado criando contas
3. ✅ Melhor ter backup e não precisar, do que precisar e não ter

**Tempo estimado:** 5-10 minutos

---

## 🗑️ QUANDO DELETAR BACKUP

Você pode deletar o backup depois que:

- ✅ Nova conta GitHub funcionando
- ✅ Nova conta Supabase funcionando
- ✅ Nova conta Vercel funcionando
- ✅ Deploy produção funcionando
- ✅ Todos os testes passando
- ✅ Pelo menos 1 semana de uso estável

**Recomendação:** Manter backup por pelo menos 30 dias.

---

## 📞 SE TIVER PROBLEMAS

### Backup não cria

**Erro:** "Disk full" ou "No space left"
**Solução:** Libere espaço no disco ou use backup em nuvem

**Erro:** "Permission denied"
**Solução:**
```bash
# Dar permissões
chmod -R u+rwX frameai-director-correto
```

### Backup corrompido

**Sintoma:** ZIP não abre ou pasta vazia
**Solução:**
1. Delete backup corrompido
2. Tente novamente
3. Verifique espaço em disco

### Arquivo muito grande

**Sintoma:** Backup > 1 GB
**Solução:**
```bash
# Excluir mais pastas
zip -r backup.zip frameai-director-correto \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/dist/*" \
  -x "*/data/*" \
  -x "*/uploads/*"
```

---

## ✅ CONFIRMAÇÃO FINAL

Antes de continuar para segunda-feira, confirme:

- [ ] ✅ Backup feito
- [ ] ✅ Backup testado
- [ ] ✅ Backup acessível
- [ ] ✅ Data correta (05/07/2026)
- [ ] ✅ Tamanho razoável (~10-50 MB)

**Se todos marcados:** 🎉 Você está pronto!

**Se algum faltando:** ⚠️ Faça o backup agora!

---

## 🎯 PRÓXIMO PASSO

Depois de fazer backup:

1. ✅ Marcar como concluído
2. ✅ Relaxar no fim de semana
3. ✅ Segunda-feira: seguir `SETUP_SEGUNDA_FEIRA.md`

---

**💾 LEMBRE-SE: Backup é como seguro - melhor ter e não precisar!**

*Criado em: 05 de Julho de 2026, 00:15*
*Status: ⚠️ AÇÃO NECESSÁRIA*
