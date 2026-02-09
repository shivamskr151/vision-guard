-- CreateTable
CREATE TABLE "AnomalyEvent" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyEvent_pkey" PRIMARY KEY ("id")
);
