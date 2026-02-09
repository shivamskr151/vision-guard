-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "schemaId" INTEGER;

-- CreateTable
CREATE TABLE "_AssetToInspectionTemplate" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AssetToInspectionTemplate_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AssetToInspectionTemplate_B_index" ON "_AssetToInspectionTemplate"("B");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "SchemaLibrary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssetToInspectionTemplate" ADD CONSTRAINT "_AssetToInspectionTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssetToInspectionTemplate" ADD CONSTRAINT "_AssetToInspectionTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
