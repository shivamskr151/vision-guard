-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "defects" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "zoneId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_zoneId_key" ON "Zone"("zoneId");
