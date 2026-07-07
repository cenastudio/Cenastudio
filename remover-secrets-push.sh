#!/bin/bash

# ============================================================================
# REMOVER SECRETS E FAZER PUSH
# ============================================================================

echo "🔐 REMOVENDO ARQUIVOS COM SECRETS"
echo ""

cd /Users/danteelytra/coding-dev/cenastudio

# Arquivos detectados com secrets
FILES_TO_REMOVE=(
    "VERCEL_ENV_VARS_TO_ADD.md"
    "sync-env-to-vercel.sh"
    "LIMPEZA_CONCLUIDA.md"
    "SESSAO_07_07_2026.md"
    "STATUS_COMPLETO_LOCAL.md"
)

echo "📋 Arquivos a deletar:"
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "   - $file"
    fi
done
echo ""

read -p "Continuar? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "❌ Cancelado"
    exit 0
fi

echo ""
echo "🗑️  Deletando arquivos..."

# Deletar arquivos
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "   ✓ $file deletado"
    fi
done

echo ""
echo "📝 Atualizando .gitignore..."

# Adicionar ao .gitignore se não existir
if ! grep -q "# Docs locais com secrets" .gitignore; then
    cat >> .gitignore << 'EOF'

# Docs locais com secrets
VERCEL_ENV_VARS_TO_ADD.md
SESSAO_*.md
STATUS_COMPLETO_*.md
LIMPEZA_*.md
RESOLVER_*.md
PUSH_*.md
EOF
    echo "   ✓ .gitignore atualizado"
else
    echo "   ⚠️  Já estava no .gitignore"
fi

echo ""
echo "💾 Atualizando commit..."

# Adicionar mudanças e atualizar commit anterior
git add -A
git commit --amend --no-edit

if [ $? -eq 0 ]; then
    echo "   ✓ Commit atualizado"
else
    echo "   ❌ Erro ao atualizar commit"
    exit 1
fi

echo ""
echo "📤 Fazendo push (force)..."

# Push forçado
git push origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════════════"
    echo "🎉 PUSH CONCLUÍDO COM SUCESSO!"
    echo "════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Secrets removidos"
    echo "✅ Código no GitHub: https://github.com/cenastudio/Cenastudio"
    echo ""
    echo "🚀 PRÓXIMO PASSO - DEPLOY RAILWAY:"
    echo "   1. Abrir: https://railway.app"
    echo "   2. New Project → GitHub"
    echo "   3. Selecionar: cenastudio/Cenastudio"
    echo "   4. Variables → Copiar de DEPLOY_AGORA.md"
    echo "   5. Deploy!"
    echo ""
else
    echo ""
    echo "❌ ERRO NO PUSH!"
    echo ""
    echo "Se ainda detectar secrets:"
    echo "1. Abrir links de permissão no erro"
    echo "2. Ou deletar mais arquivos com secrets"
    echo ""
fi

