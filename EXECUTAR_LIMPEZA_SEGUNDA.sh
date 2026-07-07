#!/bin/bash

# ============================================================================
# SCRIPT DE LIMPEZA COMPLETA - CenaSTUDIO
# Executar na SEGUNDA-FEIRA 07/07/2026 ANTES de criar novas contas
# ============================================================================

echo "🧹 LIMPEZA COMPLETA - CenaSTUDIO"
echo "================================="
echo ""
echo "⚠️  ATENÇÃO: Este script irá:"
echo "   1. Deletar logs de desenvolvimento"
echo "   2. Limpar Git e reinicializar"
echo "   3. Preparar para novas contas"
echo ""
read -p "Continuar? (digite 'SIM' em maiúsculas): " confirm

if [ "$confirm" != "SIM" ]; then
    echo "❌ Operação cancelada."
    exit 1
fi

echo ""
echo "📁 Fase 1: Deletando logs..."
rm -rf .manus-logs/
echo "✅ Logs deletados"

echo ""
echo "📝 Fase 2: Verificando arquivos restantes..."
echo "Arquivos .md no root:"
ls -1 *.md 2>/dev/null || echo "  (nenhum arquivo encontrado)"

echo ""
echo "🔧 Fase 3: Limpando Git..."
read -p "⚠️  Isso apagará TODO histórico Git! Continuar? (SIM): " git_confirm

if [ "$git_confirm" == "SIM" ]; then
    echo "  Removendo .git..."
    rm -rf .git

    echo "  Inicializando novo repositório..."
    git init

    echo "  Criando .gitignore (se não existir)..."
    if [ ! -f .gitignore ]; then
        echo "node_modules/" > .gitignore
        echo ".env" >> .gitignore
        echo "dist/" >> .gitignore
        echo "data/*.db" >> .gitignore
    fi

    echo "  Primeiro commit..."
    git add .
    git commit -m "chore: initial commit - CenaSTUDIO clean setup"

    echo "✅ Git reinicializado"
else
    echo "⏭️  Pulando limpeza do Git"
fi

echo ""
echo "📋 Fase 4: Preparando .env..."
if [ -f .env ]; then
    echo "  ⚠️  .env já existe. Fazer backup? (SIM/NAO)"
    read -p "  " backup_confirm
    if [ "$backup_confirm" == "SIM" ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo "  ✅ Backup criado"
    fi
fi

cp .env.example .env
echo "✅ .env limpo criado (preencher após criar contas)"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ LIMPEZA COMPLETA!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📝 PRÓXIMOS PASSOS (SEGUNDA-FEIRA):"
echo ""
echo "1️⃣  CRIAR CONTAS:"
echo "   - GitHub (nova conta empresa)"
echo "   - Supabase (novo projeto)"
echo "   - Vercel (nova conta empresa)"
echo ""
echo "2️⃣  PREENCHER .env:"
echo "   - JWT_SECRET (gerar: openssl rand -base64 32)"
echo "   - ADMIN_DEFAULT_PASSWORD (12+ caracteres)"
echo "   - DEMO_USER_PASSWORD (12+ caracteres)"
echo "   - SUPABASE_URL e keys"
echo "   - GITHUB_CLIENT_ID e SECRET"
echo "   - OPENROUTER_API_KEY"
echo ""
echo "3️⃣  APLICAR MIGRATIONS SUPABASE:"
echo "   npx supabase db push"
echo ""
echo "4️⃣  TESTAR LOCAL:"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "5️⃣  CRIAR REPO GITHUB:"
echo "   git remote add origin https://github.com/NOVA-CONTA/cenastudio.git"
echo "   git push -u origin main"
echo ""
echo "6️⃣  DEPLOY VERCEL:"
echo "   - Conectar com GitHub"
echo "   - Configurar variáveis de ambiente"
echo "   - Deploy!"
echo ""
echo "📚 Consulte: AUDIT_COMPLETO.md para detalhes"
echo ""
