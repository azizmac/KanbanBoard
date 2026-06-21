-- Single owner/superadmin: outranks directors, can never be deactivated/demoted.
ALTER TABLE "User" ADD COLUMN "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Seed it onto the bootstrap owner = the oldest director (ADMIN). Runs entirely
-- inside the DB; if there are no admins yet, the owner bootstrap sets it instead.
UPDATE "User"
SET "superAdmin" = true
WHERE "id" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1
);
