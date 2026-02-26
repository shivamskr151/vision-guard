import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

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
    }
}

main();
