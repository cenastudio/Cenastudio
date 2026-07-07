#!/bin/bash

# ============================================================================
# SCRIPT DE VERIFICAÇÃO - CenaSTUDIO
# Verifica se o sistema está pronto para deploy
# ============================================================================

echo "🔍 VERIFICAÇÃO DO SISTEMA - CenaSTUDIO"
echo "======================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Função para check
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "1️⃣  VERIFICANDO ESTRUTURA DE ARQUIVOS..."
echo ""

# Verificar arquivos essenciais
if [ -f "package.json" ]; then
    check_pass "package.json existe"
else
    check_fail "package.json NÃO encontrado"
fi

if [ -f ".env.example" ]; then
    check_pass ".env.example existe"
else
    check_fail ".env.example NÃO encontrado"
fi

if [ -f ".gitignore" ]; then
    check_pass ".gitignore existe"
else
    check_fail ".gitignore NÃO encontrado"
fi

if [ -f "README.md" ]; then
    check_pass "README.md existe"
else
    check_fail "README.md NÃO encontrado"
fi

# Verificar pastas essenciais
if [ -d "client" ]; then
    check_pass "Pasta client/ existe"
else
    check_fail "Pasta client/ NÃO encontrada"
fi

if [ -d "server" ]; then
    check_pass "Pasta server/ existe"
else
    check_fail "Pasta server/ NÃO encontrada"
fi

if [ -d "node_modules" ]; then
    check_pass "node_modules/ existe (dependências instaladas)"
else
    check_warn "node_modules/ NÃO existe (rodar: npm install)"
fi

echo ""
echo "2️⃣  VERIFICANDO .ENV..."
echo ""

if [ -f ".env" ]; then
    check_pass ".env existe"

    # Verificar variáveis críticas
    if grep -q "JWT_SECRET=" .env; then
        if grep -q "JWT_SECRET=$" .env || grep -q "JWT_SECRET=\"\"" .env; then
            check_warn "JWT_SECRET está vazio (preencher na segunda)"
        else
            check_pass "JWT_SECRET definido"
        fi
    else
        check_fail "JWT_SECRET não encontrado no .env"
    fi

    if grep -q "SUPABASE_URL=" .env; then
        if grep -q "your_supabase_url" .env; then
            check_warn "SUPABASE_URL é placeholder (preencher na segunda)"
        else
            check_pass "SUPABASE_URL definido"
        fi
    else
        check_fail "SUPABASE_URL não encontrado no .env"
    fi
else
    check_warn ".env NÃO existe (copiar de .env.example na segunda)"
fi

echo ""
echo "3️⃣  VERIFICANDO .GITIGNORE..."
echo ""

if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore || grep -q "\.env" .gitignore; then
        check_pass ".env está no .gitignore"
    else
        check_fail ".env NÃO está no .gitignore (CRÍTICO!)"
    fi

    if grep -q "node_modules" .gitignore; then
        check_pass "node_modules está no .gitignore"
    else
        check_warn "node_modules não está no .gitignore"
    fi
else
    check_fail ".gitignore NÃO encontrado"
fi

echo ""
echo "4️⃣  VERIFICANDO CREDENCIAIS EXPOSTAS..."
echo ""

# Buscar patterns de credenciais
EXPOSED=0

# Supabase project IDs específicos
if grep -r "vylxwhuuqluloxkhlsmd" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v "VERIFICAR_SISTEMA.sh"; then
    check_fail "Project ID Supabase antigo encontrado!"
    ((EXPOSED++))
else
    check_pass "Nenhum project ID Supabase específico encontrado"
fi

# Vercel project IDs
if grep -r "prj_[A-Za-z0-9]\{24\}" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v "VERIFICAR_SISTEMA.sh"; then
    check_fail "Project ID Vercel encontrado!"
    ((EXPOSED++))
else
    check_pass "Nenhum project ID Vercel específico encontrado"
fi

# GitHub tokens
if grep -r "ghp_\|gho_\|github_pat_" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    check_fail "Token GitHub encontrado!"
    ((EXPOSED++))
else
    check_pass "Nenhum token GitHub encontrado"
fi

# Stripe keys
if grep -r "sk_live_\|sk_test_" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    check_fail "Chave Stripe encontrada!"
    ((EXPOSED++))
else
    check_pass "Nenhuma chave Stripe encontrada"
fi

if [ $EXPOSED -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️  ATENÇÃO: Credenciais expostas encontradas!${NC}"
    echo "Execute a limpeza antes de prosseguir."
fi

echo ""
echo "5️⃣  VERIFICANDO DOCUMENTAÇÃO..."
echo ""

# Verificar docs criados
DOCS=("COMECE_AQUI.md" "SETUP_SEGUNDA_FEIRA.md" "AUDIT_COMPLETO.md" "FAZER_BACKUP_AGORA.md")
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$doc existe"
    else
        check_warn "$doc não encontrado"
    fi
done

echo ""
echo "6️⃣  VERIFICANDO BUILD..."
echo ""

if command -v npm &> /dev/null; then
    check_pass "npm está instalado"

    # Verificar Node version
    NODE_VERSION=$(node -v)
    check_pass "Node.js $NODE_VERSION"

    # Check TypeScript
    if [ -f "tsconfig.json" ]; then
        check_pass "tsconfig.json existe"
    else
        check_fail "tsconfig.json NÃO encontrado"
    fi
else
    check_fail "npm NÃO está instalado"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 RESULTADO DA VERIFICAÇÃO"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✓ Passou: $PASSED${NC}"
echo -e "${YELLOW}⚠ Avisos: $WARNINGS${NC}"
echo -e "${RED}✗ Falhou: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $EXPOSED -eq 0 ]; then
    echo -e "${GREEN}✅ SISTEMA PRONTO!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Fazer backup (FAZER_BACKUP_AGORA.md)"
    echo "2. Ler documentação (COMECE_AQUI.md)"
    echo "3. Segunda-feira: seguir SETUP_SEGUNDA_FEIRA.md"
    exit 0
elif [ $FAILED -gt 0 ] || [ $EXPOSED -gt 0 ]; then
    echo -e "${RED}❌ SISTEMA COM PROBLEMAS${NC}"
    echo ""
    echo "Corrija os erros acima antes de prosseguir."
    echo "Consulte AUDIT_COMPLETO.md para mais detalhes."
    exit 1
else
    echo -e "${YELLOW}⚠️  SISTEMA OK COM AVISOS${NC}"
    echo ""
    echo "O sistema está funcional, mas há alguns avisos."
    echo "Revise os itens marcados com ⚠️  acima."
    exit 0
fi
