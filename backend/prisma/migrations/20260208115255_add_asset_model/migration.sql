-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "linkedCameras" INTEGER NOT NULL,
    "criticality" INTEGER NOT NULL,
    "criticalityMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetId_key" ON "Asset"("assetId");
