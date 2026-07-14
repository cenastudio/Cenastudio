-- Add a "disabled" flag to users so admins can suspend/reactivate accounts
-- without deleting them. Login and authentication reject disabled users.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled" BOOLEAN NOT NULL DEFAULT false;
