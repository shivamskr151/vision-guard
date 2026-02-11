
import { PrismaClient } from '@prisma/client';
import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Try to load .env if available
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const esClient = new Client({
    node: esNode,
});

async function main() {
    console.log('Starting full database cleanup...');

    // 1. Clean PostgreSQL
    console.log('Cleaning PostgreSQL tables...');

    // Using transaction for consistency
    try {
        await prisma.$transaction([
            prisma.assetTelemetry.deleteMany(),
            prisma.inspectionChecklist.deleteMany(),
            prisma.inspection.deleteMany(),
            prisma.anomalyEvent.deleteMany(),
            prisma.customField.deleteMany(),
            // prisma.assignedTemplates... handled by Asset delete? Explicitly implicit tables are not exposed directly usually
            prisma.asset.deleteMany(),
            prisma.inspectionTemplate.deleteMany(),
            prisma.schemaLibrary.deleteMany(),
            prisma.zone.deleteMany(),
        ]);

        console.log('PostgreSQL cleaned successfully.');
    } catch (error) {
        console.error('Error cleaning PostgreSQL:', error);
    }

    // 2. Clean ElasticSearch
    console.log('Cleaning ElasticSearch indices...');
    const indices = ['anomaly_events', 'inspections', 'asset_telemetry', 'assets', 'traffic_data'];

    for (const index of indices) {
        try {
            const exists = await esClient.indices.exists({ index });
            if (exists) {
                await esClient.indices.delete({ index });
                console.log(`Deleted ES index: ${index}`);
            } else {
                console.log(`ES index not found (skipping): ${index}`);
            }
        } catch (e) {
            console.error(`Failed to delete ES index ${index}:`, e);
        }
    }

    console.log('ElasticSearch cleaned successfully.');
}

main()
    .catch((e) => {
        console.error('Error during cleanup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        // pool.end(); // Adapter handles closing?
    });
