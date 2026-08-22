-- Run with: npx supabase db query --linked --file scripts/verify-portal-isolation.sql
-- Every fixture is rolled back. The final row must be 1, 0, 1, 0.

BEGIN;

INSERT INTO users (email, password_hash)
VALUES ('__p1b4_portal_probe__@invalid.local', 'non-login-probe');

INSERT INTO clients (user_id, name, email)
SELECT id, '__p1b4_alpha__', '__p1b4_alpha__@invalid.local'
FROM users
WHERE email = '__p1b4_portal_probe__@invalid.local';

INSERT INTO clients (user_id, name, email)
SELECT id, '__p1b4_beta__', '__p1b4_beta__@invalid.local'
FROM users
WHERE email = '__p1b4_portal_probe__@invalid.local';

INSERT INTO proposals (user_id, client_id, title, html, total, status, share_token, document_hash, visible_in_client_portal)
SELECT u.id, c.id, 'Alpha visible', '<p>alpha</p>', 10000, 'sent', '__p1b4_alpha_visible__', 'probe', true
FROM users u JOIN clients c ON c.user_id = u.id
WHERE u.email = '__p1b4_portal_probe__@invalid.local' AND c.email = '__p1b4_alpha__@invalid.local';

INSERT INTO proposals (user_id, client_id, title, html, total, status, share_token, document_hash, visible_in_client_portal)
SELECT u.id, c.id, 'Alpha hidden', '<p>hidden</p>', 10000, 'sent', '__p1b4_alpha_hidden__', 'probe', false
FROM users u JOIN clients c ON c.user_id = u.id
WHERE u.email = '__p1b4_portal_probe__@invalid.local' AND c.email = '__p1b4_alpha__@invalid.local';

INSERT INTO proposals (user_id, client_id, title, html, total, status, share_token, document_hash, visible_in_client_portal)
SELECT u.id, c.id, 'Beta revoked', '<p>revoked</p>', 10000, 'revoked', '__p1b4_beta_revoked__', 'probe', true
FROM users u JOIN clients c ON c.user_id = u.id
WHERE u.email = '__p1b4_portal_probe__@invalid.local' AND c.email = '__p1b4_beta__@invalid.local';

INSERT INTO meetings (user_id, client_id, title, starts_at, duration_minutes, status, share_token, visible_in_client_portal)
SELECT u.id, c.id, 'Alpha scheduled', now() + interval '7 days', 30, 'scheduled', '__p1b4_alpha_meeting__', true
FROM users u JOIN clients c ON c.user_id = u.id
WHERE u.email = '__p1b4_portal_probe__@invalid.local' AND c.email = '__p1b4_alpha__@invalid.local';

INSERT INTO meetings (user_id, client_id, title, starts_at, duration_minutes, status, share_token, visible_in_client_portal)
SELECT u.id, c.id, 'Beta cancelled', now() + interval '7 days', 30, 'cancelled', '__p1b4_beta_meeting__', true
FROM users u JOIN clients c ON c.user_id = u.id
WHERE u.email = '__p1b4_portal_probe__@invalid.local' AND c.email = '__p1b4_beta__@invalid.local';

SELECT
  (SELECT count(*) FROM proposals p JOIN clients c ON c.id = p.client_id
   WHERE c.email = '__p1b4_alpha__@invalid.local' AND p.visible_in_client_portal AND p.status <> 'revoked') AS alpha_visible_proposals,
  (SELECT count(*) FROM proposals p JOIN clients c ON c.id = p.client_id
   WHERE c.email = '__p1b4_beta__@invalid.local' AND p.visible_in_client_portal AND p.status <> 'revoked') AS beta_visible_proposals,
  (SELECT count(*) FROM meetings m JOIN clients c ON c.id = m.client_id
   WHERE c.email = '__p1b4_alpha__@invalid.local' AND m.visible_in_client_portal AND m.status <> 'cancelled') AS alpha_visible_meetings,
  (SELECT count(*) FROM meetings m JOIN clients c ON c.id = m.client_id
   WHERE c.email = '__p1b4_beta__@invalid.local' AND m.visible_in_client_portal AND m.status <> 'cancelled') AS beta_visible_meetings;

ROLLBACK;
