#!/bin/bash

# ============================================================================
# SCRIPT DE LIMPEZA - Configurações de Deploy
# ============================================================================
# Remove configurações antigas de Vercel, backups e scripts temporários
# ============================================================================

echo "🧹 LIMPEZA DE CONFIGURAÇÕES DE DEPLOY"
echo ""
echo "Este script vai deletar:"
echo "  - Pasta .vercel/ (configs antigas)"
echo "  - Arquivos .env temporários"
echo "  - Backup de credenciais antiga"
echo "  - Scripts temporários já executados"
echo ""
read -p "Continuar? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "❌ Cancelado pelo usuário"
    exit 0
fi

echo ""
echo "🔥 Iniciando limpeza..."
echo ""

# 1. Deletar configurações Vercel
if [ -d ".vercel" ]; then
    echo "📁 Deletando .vercel/..."
    rm -rf .vercel/
    echo "   ✅ .vercel/ deletado"
else
    echo "   ⚠️  .vercel/ já não existe"
fi

# 2. Deletar .env temporários
echo ""
echo "🗑️  Deletando .env temporários..."
rm -f .env.migration.tmp && echo "   ✅ .env.migration.tmp deletado"
rm -f .env.production.backup && echo "   ✅ .env.production.backup deletado"
rm -f .env.vercel.check && echo "   ✅ .env.vercel.check deletado"
rm -f .env.vercel.production && echo "   ✅ .env.vercel.production deletado"
rm -f .env.vercel.temp && echo "   ✅ .env.vercel.temp deletado"

# 3. Deletar backup de credenciais
echo ""
if [ -d "CenaStudio-Credenciais-Backup-2026-06-30" ]; then
    echo "📦 Deletando backup de credenciais..."
    rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
    echo "   ✅ Backup deletado"
else
    echo "   ⚠️  Backup já não existe"
fi

# 4. Deletar scripts temporários
echo ""
echo "📜 Deletando scripts temporários..."
rm -f add-progress-column.mjs && echo "   ✅ add-progress-column.mjs"
rm -f check-user-data.mjs && echo "   ✅ check-user-data.mjs"
rm -f check-users.mjs && echo "   ✅ check-users.mjs"
rm -f apply-seed.mjs && echo "   ✅ apply-seed.mjs"
rm -f sync-supabase-db.mjs && echo "   ✅ sync-supabase-db.mjs"
rm -f test-all-features.mjs && echo "   ✅ test-all-features.mjs"
rm -f apply-full-migration.mjs && echo "   ✅ apply-full-migration.mjs"
rm -f run-migration.mjs && echo "   ✅ run-migration.mjs"

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "🎉 LIMPEZA CONCLUÍDA!"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Configurações antigas removidas"
echo "✅ Backups e temporários deletados"
echo "✅ Scripts executados removidos"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Verificar git remotes:"
echo "   git remote -v"
echo ""
echo "2. Se tiver 2 origins, escolher qual manter:"
echo "   Ver: LIMPEZA_DEPLOY_CONFIGS.md (seção Git Remote)"
echo ""
echo "3. Limpar usuários de teste:"
echo "   npx tsx scripts/clean-test-users.ts"
echo ""
echo "4. Deploy Railway:"
echo "   Usar variáveis de CREDENCIAIS_PRODUCAO.md"
echo ""

