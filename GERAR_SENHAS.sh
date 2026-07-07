#!/bin/bash

# ============================================================================
# GERADOR DE SENHAS SEGURAS - CenaSTUDIO
# Gera todas as senhas e secrets necessários para o setup
# ============================================================================

echo "🔐 GERADOR DE SENHAS SEGURAS - CenaSTUDIO"
echo "=========================================="
echo ""
echo "Este script vai gerar todas as senhas necessárias para o setup."
echo ""
read -p "Continuar? (s/n): " confirm

if [ "$confirm" != "s" ]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo "📋 GERANDO SENHAS E SECRETS..."
echo ""

# Verificar se openssl está disponível
if ! command -v openssl &> /dev/null; then
    echo "❌ openssl não encontrado. Instale primeiro:"
    echo "   macOS: brew install openssl"
    echo "   Linux: sudo apt install openssl"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 JWT_SECRET (32 caracteres)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
JWT_SECRET=$(openssl rand -base64 32)
echo "$JWT_SECRET"
echo ""
echo "Copiar para .env:"
echo "JWT_SECRET=$JWT_SECRET"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 ADMIN_DEFAULT_PASSWORD (16 caracteres)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "$ADMIN_PASSWORD"
echo ""
echo "Copiar para .env:"
echo "ADMIN_DEFAULT_PASSWORD=$ADMIN_PASSWORD"
echo ""
echo "⚠️  Login admin:"
echo "   Email: admin@cenastudio.com.br"
echo "   Senha: $ADMIN_PASSWORD"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 DEMO_USER_PASSWORD (16 caracteres)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DEMO_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "$DEMO_PASSWORD"
echo ""
echo "Copiar para .env:"
echo "DEMO_USER_PASSWORD=$DEMO_PASSWORD"
echo ""
echo "⚠️  Login demo:"
echo "   Email: demo@cenastudio.com.br"
echo "   Senha: $DEMO_PASSWORD"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  SUPABASE_DB_PASSWORD (Sugestão - 20 caracteres)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DB_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)
echo "$DB_PASSWORD"
echo ""
echo "⚠️  Use esta senha ao criar o projeto Supabase"
echo "   (Settings > Database > Database Password)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📧 EMAIL_PASSWORD (Sugestão - se precisar SMTP)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EMAIL_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "$EMAIL_PASSWORD"
echo ""
echo "⚠️  Opcional - apenas se configurar SMTP"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 SALVAR EM ARQUIVO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Salvar senhas em arquivo? (s/n): " save

if [ "$save" = "s" ]; then
    FILENAME="senhas-geradas-$(date +%Y%m%d-%H%M%S).txt"

    cat > "$FILENAME" << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENHAS GERADAS - CenaSTUDIO
Data: $(date)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  ATENÇÃO: Este arquivo contém senhas sensíveis!
   - NÃO compartilhe este arquivo
   - NÃO commite no Git
   - Salve em local seguro (gerenciador de senhas)
   - Delete este arquivo após usar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARA O .ENV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JWT_SECRET=$JWT_SECRET
ADMIN_DEFAULT_PASSWORD=$ADMIN_PASSWORD
DEMO_USER_PASSWORD=$DEMO_PASSWORD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGINS DE ACESSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ADMIN:
  Email: admin@cenastudio.com.br
  Senha: $ADMIN_PASSWORD

DEMO:
  Email: demo@cenastudio.com.br
  Senha: $DEMO_PASSWORD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPABASE DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Database Password (usar ao criar projeto):
$DB_PASSWORD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMTP (Opcional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SMTP Password:
$EMAIL_PASSWORD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRÓXIMOS PASSOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Copiar valores acima para o .env
2. Usar Database Password ao criar projeto Supabase
3. Anotar logins admin/demo em gerenciador de senhas
4. DELETAR ESTE ARQUIVO após usar
5. Nunca compartilhar estas senhas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gerado em: $(date)
Por: GERAR_SENHAS.sh

EOF

    echo "✅ Senhas salvas em: $FILENAME"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   1. Copie as senhas para o .env"
    echo "   2. Salve em gerenciador de senhas"
    echo "   3. DELETE este arquivo: rm $FILENAME"
    echo ""
else
    echo "⚠️  Senhas NÃO foram salvas em arquivo."
    echo "   Copie manualmente as senhas acima!"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RESUMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ JWT_SECRET gerado (32 chars)"
echo "✅ ADMIN_DEFAULT_PASSWORD gerado (16 chars)"
echo "✅ DEMO_USER_PASSWORD gerado (16 chars)"
echo "✅ SUPABASE_DB_PASSWORD sugerido (20 chars)"
echo "✅ SMTP_PASSWORD sugerido (16 chars - opcional)"
echo ""
echo "🎯 PRÓXIMA AÇÃO:"
echo "   1. Copiar valores para .env"
echo "   2. Salvar em gerenciador de senhas"
echo "   3. Continuar setup (SETUP_SEGUNDA_FEIRA.md)"
echo ""
echo "🔐 LEMBRETE:"
echo "   - NUNCA commite .env no Git"
echo "   - Use senhas únicas por serviço"
echo "   - Ative 2FA em todas as contas"
echo ""
echo "✅ Concluído!"
