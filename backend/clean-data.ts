import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Cleaning old telemetry data...');

        // Delete all telemetry records
        const deletedTelemetry = await prisma.assetTelemetry.deleteMany({});
        console.log(`✓ Deleted ${deletedTelemetry.count} telemetry records`);

        // Delete all anomaly events
        const deletedAnomalies = await prisma.anomalyEvent.deleteMany({});
        console.log(`✓ Deleted ${deletedAnomalies.count} anomaly events`);

        console.log('\nDatabase cleaned successfully!');
        console.log('The backend will now populate fresh data from CSV files.');

    } catch (error) {
        console.error('Error cleaning database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
