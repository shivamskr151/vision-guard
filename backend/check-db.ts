import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    try {
        const anomalyCount = await prisma.anomalyEvent.count();
        const telemetryCount = await prisma.assetTelemetry.count();
        const assetCount = await prisma.asset.count();
        const inspectionCount = await prisma.inspection.count();

        console.log(`Assets: ${assetCount}`);
        console.log(`Inspections: ${inspectionCount}`);
        console.log(`Anomalies: ${anomalyCount}`);
        console.log(`Telemetry: ${telemetryCount}`);
    } catch (error) {
        console.error('Error querying DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
