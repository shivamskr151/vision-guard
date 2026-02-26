import { PrismaClient } from '@prisma/client';
import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Try to load .env if available
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const prisma = new PrismaClient();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const esClient = new Client({
    node: esNode,
});

async function main() {
    console.log('Starting full database cleanup...');

    // 1. Clean MongoDB
    console.log('Cleaning MongoDB collections...');

    try {
        await prisma.$transaction([
            prisma.assetTelemetry.deleteMany(),
            prisma.inspectionChecklist.deleteMany(),
            prisma.inspection.deleteMany(),
            prisma.anomalyEvent.deleteMany(),
            prisma.customField.deleteMany(),
            prisma.asset.deleteMany(),
            prisma.inspectionTemplate.deleteMany(),
            prisma.schemaLibrary.deleteMany(),
            prisma.zone.deleteMany(),
        ]);

        console.log('MongoDB cleaned successfully.');
    } catch (error) {
        console.error('Error cleaning MongoDB:', error);
        // If transaction fails (e.g. not a replica set), try sequential
        console.log('Attempting sequential cleanup...');
        try {
            await prisma.assetTelemetry.deleteMany();
            await prisma.inspectionChecklist.deleteMany();
            await prisma.inspection.deleteMany();
            await prisma.anomalyEvent.deleteMany();
            await prisma.customField.deleteMany();
            await prisma.asset.deleteMany();
            await prisma.inspectionTemplate.deleteMany();
            await prisma.schemaLibrary.deleteMany();
            await prisma.zone.deleteMany();
            console.log('Sequential MongoDB cleanup successful.');
        } catch (seqError) {
            console.error('Sequential cleanup also failed:', seqError);
        }
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
    });
