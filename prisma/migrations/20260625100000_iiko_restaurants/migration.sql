-- iiko sales points (restaurants) mapped to regions + iiko OLAP departments.
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iikoDepartmentId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "regionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Restaurant_iikoDepartmentId_key" ON "Restaurant"("iikoDepartmentId");
CREATE INDEX "Restaurant_regionId_idx" ON "Restaurant"("regionId");

ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
