-- CreateTable
CREATE TABLE "SchemaLibrary" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fieldCount" INTEGER NOT NULL,
    "tags" TEXT[],
    "created" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "schemaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "tags" TEXT[],
    "frequencyDays" INTEGER NOT NULL,
    "mandatoryChecks" INTEGER NOT NULL,
    "mandatoryTotal" INTEGER NOT NULL,
    "created" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionChecklist" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL,
    "passFailCondition" BOOLEAN NOT NULL,
    "templateId" INTEGER NOT NULL,

    CONSTRAINT "InspectionChecklist_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "SchemaLibrary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklist" ADD CONSTRAINT "InspectionChecklist_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
