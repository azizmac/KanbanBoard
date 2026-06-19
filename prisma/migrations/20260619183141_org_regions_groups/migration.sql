-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "regionId" TEXT;

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'iris',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RegionManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RegionManagers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GroupMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GroupMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BoardGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BoardGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Group_regionId_idx" ON "Group"("regionId");

-- CreateIndex
CREATE INDEX "_RegionManagers_B_index" ON "_RegionManagers"("B");

-- CreateIndex
CREATE INDEX "_GroupMembers_B_index" ON "_GroupMembers"("B");

-- CreateIndex
CREATE INDEX "_BoardGroups_B_index" ON "_BoardGroups"("B");

-- CreateIndex
CREATE INDEX "Board_regionId_idx" ON "Board"("regionId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegionManagers" ADD CONSTRAINT "_RegionManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RegionManagers" ADD CONSTRAINT "_RegionManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardGroups" ADD CONSTRAINT "_BoardGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardGroups" ADD CONSTRAINT "_BoardGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
