
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
        await pool.end();
    }
}

main();
