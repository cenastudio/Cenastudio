-- ═══════════════════════════════════════════════════════════════
-- SPRINT 3: Preferences Advanced
-- Features: Notificações, Regionalização, Visual, Comportamentos
-- ═══════════════════════════════════════════════════════════════

-- AlterTable: Adicionar campos de preferências ao User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB DEFAULT '{"newComments":true,"clientUploads":true,"projectDeadlines":true,"weeklyNewsletter":false,"mentions":true,"newProjects":false,"reviewApproved":true,"paymentSuccess":true}';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "regional_prefs" JSONB DEFAULT '{"locale":"pt","timezone":"America/Sao_Paulo","dateFormat":"DD/MM/YYYY","currency":"BRL"}';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "visual_prefs" JSONB DEFAULT '{"themeMode":"dark","density":"normal","fontFamily":"inter","reduceAnimations":false}';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "behavior_prefs" JSONB DEFAULT '{"defaultProjectSort":"recent","defaultView":"grid","autoplayVideos":true}';

-- Comentários
COMMENT ON COLUMN "users"."notification_prefs" IS 'Preferências de notificações: 8 tipos individuais (newComments, clientUploads, projectDeadlines, weeklyNewsletter, mentions, newProjects, reviewApproved, paymentSuccess)';
COMMENT ON COLUMN "users"."regional_prefs" IS 'Regionalização: locale (pt/en), timezone, dateFormat (DD/MM vs MM/DD), currency (BRL/USD/EUR)';
COMMENT ON COLUMN "users"."visual_prefs" IS 'Preferências visuais: themeMode (dark/light/auto), density (compact/normal/spacious), fontFamily (inter/system/mono), reduceAnimations';
COMMENT ON COLUMN "users"."behavior_prefs" IS 'Comportamentos padrão: defaultProjectSort (recent/alphabetical/deadline), defaultView (grid/list), autoplayVideos';
