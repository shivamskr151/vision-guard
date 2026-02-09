-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "inspectionFrequency" INTEGER DEFAULT 30,
ADD COLUMN     "lastInspectionDate" TIMESTAMP(3);
