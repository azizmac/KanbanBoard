-- Board↔Region becomes many-to-many (shared boards can span several regions).
-- The existing single regionId is migrated into the join table before the column
-- is dropped, so no associations are lost.

CREATE TABLE "_BoardRegions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BoardRegions_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_BoardRegions_B_index" ON "_BoardRegions"("B");

-- Preserve current associations (A = Board, B = Region).
INSERT INTO "_BoardRegions" ("A", "B")
SELECT "id", "regionId" FROM "Board" WHERE "regionId" IS NOT NULL;

ALTER TABLE "_BoardRegions" ADD CONSTRAINT "_BoardRegions_A_fkey" FOREIGN KEY ("A") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BoardRegions" ADD CONSTRAINT "_BoardRegions_B_fkey" FOREIGN KEY ("B") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dropping the column also drops its FK constraint + index.
ALTER TABLE "Board" DROP COLUMN "regionId";
