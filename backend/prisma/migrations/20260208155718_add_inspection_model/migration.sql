-- CreateTable
CREATE TABLE "Inspection" (
    "id" SERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "inspectorId" TEXT,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "notes" TEXT,
    "checklistData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("assetId") ON DELETE RESTRICT ON UPDATE CASCADE;
