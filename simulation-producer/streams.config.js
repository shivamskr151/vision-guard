const parsers = {
    float: (val) => (val === 'null' || !val) ? null : parseFloat(val),
    int: (val) => (val === 'null' || !val) ? null : parseInt(val, 10),
    string: (val) => (val === 'null' || !val) ? null : val,
    isoDate: (val) => (val === 'null' || !val) ? null : new Date(val).toISOString(),
    boolean: (val) => (val === 'null' || !val) ? null : val.toLowerCase() === 'true'
};

module.exports = {
    parsers,
    streams: [
        {
            name: "Zone Updates",
            topic: "zone_updates",
            file: process.env.ZONE_UPDATES_FILE || 'zone_updates.csv',
            interval: 0, // burst only, no stream interval
            burst: true,
            map: (values) => ({
                timestamp: new Date().toISOString(),
                zoneId: parsers.string(values[0]),
                label: parsers.string(values[1]),
                x: parsers.float(values[2]),
                y: parsers.float(values[3]),
                width: parsers.float(values[4]),
                height: parsers.float(values[5]),
            })
        },
        {
            name: "Asset Updates",
            topic: "asset_updates",
            file: process.env.ASSET_UPDATES_FILE || 'asset_updates.csv',
            interval: parseInt(process.env.ASSET_STREAM_INTERVAL || '3000', 10),
            burst: true,
            burstFilter: (values, state) => {
                if (!state.uniqueAssets) state.uniqueAssets = new Set();
                const assetId = values[0];
                if (assetId && !state.uniqueAssets.has(assetId)) {
                    state.uniqueAssets.add(assetId);
                    return true;
                }
                return false;
            },
            map: (values) => ({
                timestamp: new Date().toISOString(),
                assetId: parsers.string(values[0]),
                name: parsers.string(values[1]),
                type: parsers.string(values[2]),
                zone: parsers.string(values[3]),
                healthStatus: parsers.string(values[4]),
                linkedCameras: parsers.int(values[5]),
                criticality: parsers.int(values[6]),
                criticalityMax: parsers.int(values[7]),
                x: parsers.float(values[8]),
                y: parsers.float(values[9]),
                lastInspectionDate: parsers.string(values[10]),
                inspectionFrequency: parsers.int(values[11]),
            })
        },
        {
            name: "Asset Telemetry",
            topic: "asset_telemetry",
            file: process.env.TELEMETRY_DATA_FILE || 'telemetry_data.csv',
            interval: parseInt(process.env.TELEMETRY_STREAM_INTERVAL || '2000', 10),
            map: (values, state, env) => {
                const criticalThreshold = parseInt(env.CRITICAL_ANOMALY_THRESHOLD || '150', 10);
                const warningThreshold = parseInt(env.WARNING_ANOMALY_THRESHOLD || '100', 10);
                const activeAnomalies = parsers.int(values[3]);
                const status = activeAnomalies > criticalThreshold ? 'critical' : (activeAnomalies > warningThreshold ? 'warning' : 'normal');

                return {
                    timestamp: new Date().toISOString(),
                    assetId: parsers.string(values[0]),
                    assetInspection: parsers.int(values[1]),
                    assetOverdue: parsers.int(values[2]),
                    activeAnomalies,
                    inspectionCompliance: parsers.float(values[4]),
                    criticalAssetRiskIndex: parsers.float(values[5]),
                    status
                };
            }
        },
        {
            name: "Anomaly Simulation",
            topic: "anomaly_events",
            file: process.env.ANOMALY_DATA_FILE || 'anomaly_data.csv',
            interval: parseInt(process.env.ANOMALY_STREAM_INTERVAL || '10000', 10),
            map: (values) => ({
                timestamp: values[6] || new Date().toISOString(),
                severity: parsers.string(values[2]),
                type: parsers.string(values[1]),
                description: parsers.string(values[3]),
                assetId: parsers.string(values[0]),
                location: parsers.string(values[4]),
                confidence: parsers.string(values[5]),
                isResolved: 'false'
            })
        },
        {
            name: "Inspection Updates",
            topic: "inspection_updates",
            file: process.env.INSPECTION_UPDATES_FILE || 'inspection_updates.csv',
            interval: parseInt(process.env.INSPECTION_STREAM_INTERVAL || '3000', 10),
            map: (values, state) => {
                if (!state.counter) state.counter = 10000;

                return {
                    timestamp: new Date().toISOString(),
                    inspectionId: state.counter++,
                    assetId: parsers.string(values[1]),
                    inspectorId: parsers.string(values[2]),
                    type: parsers.string(values[3]),
                    status: parsers.string(values[4]),
                    result: parsers.string(values[5]),
                    scheduledDate: new Date().toISOString(),
                    completedDate: values[7] === 'null' ? null : new Date().toISOString(),
                    durationSeconds: parsers.int(values[8]),
                    defects: parsers.int(values[9]),
                    notes: parsers.string(values[10]),
                };
            }
        }
    ]
};
