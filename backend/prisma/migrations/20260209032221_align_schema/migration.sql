/*
  Warnings:

  - You are about to drop the `TrafficData` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Routine';

-- DropTable
DROP TABLE "TrafficData";
