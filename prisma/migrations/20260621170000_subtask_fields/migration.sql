-- Checklist items become subtasks: own assignee + due date.
ALTER TABLE "ChecklistItem" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "ChecklistItem" ADD COLUMN "assigneeId" TEXT;

ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
