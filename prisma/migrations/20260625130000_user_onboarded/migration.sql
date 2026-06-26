-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboardedAt" TIMESTAMP(3);

-- Existing users predate onboarding — mark them done so only new hires get the tour.
UPDATE "User" SET "onboardedAt" = now() WHERE "onboardedAt" IS NULL;
