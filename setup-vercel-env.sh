#!/bin/bash
# Script para adicionar todas as variáveis de ambiente no Vercel

echo "🚀 Configurando variáveis de ambiente no Vercel..."
echo ""

# App Config
vercel env add NODE_ENV production production
vercel env add PORT production production
vercel env add CLIENT_ORIGIN production production
vercel env add JWT_SECRET production production

# Admin
vercel env add ADMIN_EMAILS production production
vercel env add ADMIN_DEFAULT_PASSWORD production production
vercel env add DEMO_USER_PASSWORD production production

# Cloudinary
vercel env add CLOUDINARY_CLOUD_NAME production production
vercel env add CLOUDINARY_API_KEY production production
vercel env add CLOUDINARY_API_SECRET production production

# OpenRouter
vercel env add AI_PROVIDER production production
vercel env add OPENROUTER_API_KEY production production
vercel env add OPENROUTER_MODEL production production
vercel env add OPENROUTER_MAX_TOKENS production production
vercel env add OPENROUTER_TEMPERATURE production production
vercel env add OPENROUTER_TOP_P production production
vercel env add OPENROUTER_TIMEOUT_MS production production
vercel env add OPENROUTER_FREE_LIMIT production production
vercel env add FALLBACK_AI_PROVIDER production production

# Stripe
vercel env add STRIPE_SECRET_KEY production production
vercel env add STRIPE_PUBLISHABLE_KEY production production
vercel env add STRIPE_PRICE_PRO production production
vercel env add STRIPE_PRICE_STUDIO production production

echo ""
echo "✅ Variáveis configuradas!"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique as variáveis no dashboard: https://vercel.com/cenastudio-3104s-projects/cena-studio-prod/settings/environment-variables"
echo "2. Faça redeploy: vercel --prod"
echo "3. Rode migrations: npx prisma migrate deploy"
