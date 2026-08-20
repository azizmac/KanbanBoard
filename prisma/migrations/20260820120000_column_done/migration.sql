-- AlterTable
ALTER TABLE "Column" ADD COLUMN "done" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing terminal columns were identified by name.
UPDATE "Column" SET "done" = true WHERE name ILIKE '%Готово%';
