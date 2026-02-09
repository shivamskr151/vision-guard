/*
  Warnings:

  - You are about to drop the column `schemaId` on the `Asset` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_schemaId_fkey";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "schemaId",
ADD COLUMN     "customData" JSONB,
ALTER COLUMN "inspectionFrequency" DROP DEFAULT;
