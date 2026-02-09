-- CreateTable
CREATE TABLE "TrafficData" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "cameraId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficData_pkey" PRIMARY KEY ("id")
);
