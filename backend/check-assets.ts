import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const assets = await prisma.asset.findMany({
            select: { assetId: true, name: true }
        });
        console.log('Assets in database:');
        assets.forEach(a => console.log(`  ${a.assetId}: ${a.name}`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
