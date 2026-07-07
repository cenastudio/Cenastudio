#!/bin/bash

# ============================================================================
# PUSH PARA GITHUB - cenastudio/Cenastudio
# ============================================================================

echo "🚀 PREPARANDO PUSH PARA GITHUB"
echo ""
echo "Repositório: cenastudio/Cenastudio"
echo "Branch: main"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# 1. Ver status
echo "📊 Status atual:"
git status --short
echo ""

# 2. Verificar se .env está protegido
if git status --short | grep -E "\.env$|\.env\.local|\.env\.production" > /dev/null; then
    echo "❌ ERRO: Arquivos .env estão sendo commitados!"
    echo "Execute: git reset .env .env.local .env.production"
    exit 1
fi

echo "✅ Nenhum .env será commitado"
echo ""

# 3. Adicionar arquivos
echo "📦 Adicionando arquivos..."
git add .

# 4. Verificar o que será commitado
echo ""
echo "📋 Arquivos que serão commitados:"
git status --short
echo ""

read -p "Continuar com commit e push? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "❌ Cancelado pelo usuário"
    exit 0
fi

# 5. Commit
echo ""
echo "💾 Fazendo commit..."
git commit -m "chore: cleanup and prepare for production deploy

- Remove dados demo do banco (5 clientes, 4 projetos)
- Remove configurações antigas do Vercel
- Remove backups e arquivos temporários
- Remove scripts já executados
- Gera credenciais de produção (JWT + senha admin)
- Atualiza git remote para cenastudio/Cenastudio
- Sistema 100% limpo e pronto para deploy no Railway"

# 6. Push
echo ""
echo "📤 Fazendo push para GitHub..."
git push origin main

# 7. Verificar resultado
if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════════════"
    echo "🎉 PUSH CONCLUÍDO COM SUCESSO!"
    echo "════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Código subiu para: https://github.com/cenastudio/Cenastudio"
    echo ""
    echo "🚀 PRÓXIMO PASSO:"
    echo "   1. Abrir: https://railway.app"
    echo "   2. New Project → GitHub"
    echo "   3. Selecionar: cenastudio/Cenastudio"
    echo "   4. Variables → Copiar de DEPLOY_AGORA.md"
    echo "   5. Deploy!"
    echo ""
else
    echo ""
    echo "❌ Erro no push!"
    echo ""
    echo "Possíveis soluções:"
    echo "1. Verificar autenticação GitHub"
    echo "2. Verificar se o repo existe"
    echo "3. Tentar: git push -u origin main"
    echo ""
fi

