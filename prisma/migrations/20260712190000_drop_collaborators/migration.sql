-- Spec: team-task-delegation, Fase 6-C (destrutiva, executada com
-- autorização explícita do usuário).
--
-- Collaborator (freelancer sem login) foi fundido em Team (User +
-- WorkspaceMember, com login real). Project members passam a ser sempre
-- referenciados por user_id (ver Fase 6-A/6-B).
--
-- Verificado antes desta migration: produção tinha 0 linhas em
-- "collaborators" e 0 linhas em "project_members" com collaborator_id
-- preenchido (script scripts/migrate-collaborators-to-team.ts, dump salvo
-- em .private/migrations/ antes desta operação). Sem perda de dado real.

-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "project_members_collaborator_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_project_members_collaborator_id";

-- AlterTable
ALTER TABLE "project_members" DROP COLUMN IF EXISTS "collaborator_id";

-- DropForeignKey
ALTER TABLE "collaborators" DROP CONSTRAINT IF EXISTS "collaborators_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_collaborators_user_id";

-- DropTable
DROP TABLE IF EXISTS "collaborators";
