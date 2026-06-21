-- Notification preferences: quiet hours + master pause + per-board mute.
ALTER TABLE "User" ADD COLUMN "quietStart" INTEGER;
ALTER TABLE "User" ADD COLUMN "quietEnd" INTEGER;
ALTER TABLE "User" ADD COLUMN "notifyPaused" BOOLEAN NOT NULL DEFAULT false;

-- Implicit M2M join table for User.mutedBoards <-> Board.mutedBy (A=Board, B=User).
CREATE TABLE "_BoardMutes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BoardMutes_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_BoardMutes_B_index" ON "_BoardMutes"("B");

ALTER TABLE "_BoardMutes" ADD CONSTRAINT "_BoardMutes_A_fkey" FOREIGN KEY ("A") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BoardMutes" ADD CONSTRAINT "_BoardMutes_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
