require('dotenv').config();
const { Kafka } = require('kafkajs');
const fs = require('fs');
const path = require('path');
const config = require('./streams.config');

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'vision-guard-simulation-producer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();
const DATA_DIR = path.join(__dirname, process.env.DATA_DIR || 'Data');

async function sendEvent(topic, payload) {
    try {
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(payload) }],
        });
        const id = payload.assetId || payload.zoneId || payload.inspectionId || 'unknown';
        console.log(`[${topic}] Emitted update for ID ${id}`);
    } catch (error) {
        console.error(`Error sending event to topic ${topic}`, error);
    }
}

function readCsv(fileName) {
    const csvPath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}`);
        return [];
    }
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    return fileContent.split('\n').filter((line) => line.trim() !== '');
}

async function run() {
    await producer.connect();
    console.log('Kafka Producer connected successfully');

    for (const stream of config.streams) {
        console.log(`Setting up Virtual Stream Engine: ${stream.name}`);
        const lines = readCsv(stream.file);
        if (lines.length <= 1) {
            console.log(`No payload data to parse in ${stream.file}. Skipping.`);
            continue;
        }

        const stateObj = {}; // Retains stream-local state (monotonically increasing IDs, unique sets)
        const csvRows = lines.slice(1); // skip headers

        // 1. Initial Burst
        if (stream.burst) {
            console.log(`Starting Initial Burst for [${stream.topic}]...`);
            let emitted = 0;
            for (const line of csvRows) {
                const values = line.split(',');
                if (stream.burstFilter) {
                    if (stream.burstFilter(values, stateObj)) {
                        const payload = stream.map(values, stateObj, process.env);
                        await sendEvent(stream.topic, payload);
                        emitted++;
                    }
                } else {
                    const payload = stream.map(values, stateObj, process.env);
                    await sendEvent(stream.topic, payload);
                    emitted++;
                }
            }
            console.log(`Emitted initial burst of ${emitted} updates for ${stream.topic}.`);
        }

        // 2. Periodic Interval Stream
        if (stream.interval > 0) {
            console.log(`Registering interval generator for [${stream.topic}] every ${stream.interval}ms...`);
            setInterval(async () => {
                try {
                    const randomLine = csvRows[Math.floor(Math.random() * csvRows.length)];
                    const values = randomLine.split(',');
                    const payload = stream.map(values, stateObj, process.env);
                    if (payload) {
                        await sendEvent(stream.topic, payload);
                    }
                } catch (error) {
                    console.error(`Error generating stream output for [${stream.topic}]:`, error);
                }
            }, stream.interval);
        }
    }
}

run().catch(console.error);

process.on('SIGINT', async () => {
    await producer.disconnect();
    console.log('Kafka Producer disconnected');
    process.exit(0);
});
