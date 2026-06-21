-- Soft archive for tasks and boards (hidden from active views, restorable).
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Board" ADD COLUMN "archivedAt" TIMESTAMP(3);
