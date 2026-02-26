export default () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        url: process.env.DATABASE_URL,
    },
    kafka: {
        brokers: process.env.KAFKA_BROKERS || 'localhost:9092',
        consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'vision-guard-group',
        clientId: process.env.KAFKA_CLIENT_ID || 'vision-guard-producer',
        producerGroup: process.env.KAFKA_PRODUCER_GROUP || 'vision-guard-producer-group',
    },
    elasticsearch: {
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    },
    simulation: {
        dataDir: process.env.DATA_DIR || 'Data',
        intervals: {
            asset: parseInt(process.env.ASSET_STREAM_INTERVAL || '3000', 10),
            telemetry: parseInt(process.env.TELEMETRY_STREAM_INTERVAL || '2000', 10),
            anomaly: parseInt(process.env.ANOMALY_STREAM_INTERVAL || '10000', 10),
            inspection: parseInt(process.env.INSPECTION_STREAM_INTERVAL || '3000', 10),
        },
        files: {
            asset: process.env.ASSET_UPDATES_FILE || 'asset_updates.csv',
            telemetry: process.env.TELEMETRY_DATA_FILE || 'telemetry_data.csv',
            anomaly: process.env.ANOMALY_DATA_FILE || 'anomaly_data.csv',
            inspection: process.env.INSPECTION_UPDATES_FILE || 'inspection_updates.csv',
            zone: process.env.ZONE_UPDATES_FILE || 'zone_updates.csv',
        },
        thresholds: {
            criticalAnomalies: parseInt(process.env.CRITICAL_ANOMALY_THRESHOLD || '150', 10),
            warningAnomalies: parseInt(process.env.WARNING_ANOMALY_THRESHOLD || '100', 10),
        }
    },
    nodeEnv: process.env.NODE_ENV || 'development',
});
