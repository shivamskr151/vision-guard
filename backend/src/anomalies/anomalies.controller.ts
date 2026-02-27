import { Controller, Get, Post, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AnomaliesService } from './anomalies.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Controller('anomalies')
export class AnomaliesController {
    constructor(
        private readonly anomaliesService: AnomaliesService,
        private readonly elasticsearchService: ElasticsearchService,
    ) { }

    @EventPattern('anomaly_events')
    async handleAnomalyData(@Payload() data: any) {
        console.log('[Kafka] Received Anomaly Event:', JSON.stringify(data, null, 2));
        await this.anomaliesService.processAnomalyData(data);
    }

    // Ingest endpoint removed as data production is now continuous on startup

    @Get('stats')
    async getStats(@Query() query: any) {
        const { severity, type, asset, camera } = query;
        const must: any[] = [];

        if (severity) must.push({ term: { severity: severity } });
        if (type) must.push({ term: { type: type } });
        if (asset) must.push({ term: { assetId: asset } });
        if (camera) {
            // Frontend sends "Location Cam", backend stores "Location"
            const location = camera.replace(' Cam', '');
            must.push({ term: { location: location } });
        }

        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            size: 0,
            body: {
                query: {
                    bool: { must }
                },
                aggs: {
                    total: { value_count: { field: 'id' } },
                    critical: { filter: { term: { severity: 'critical' } } },
                    affected_assets: { cardinality: { field: 'assetId' } },
                    affected_cameras: { cardinality: { field: 'location' } },
                },
            },
        } as any);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aggregations = (result as any).aggregations;

        return [
            { id: 'total', title: 'Total Anomalies', value: aggregations.total.value.toString(), variant: 'total' },
            { id: 'critical', title: 'Critical Anomalies', value: aggregations.critical.doc_count.toString(), variant: 'critical' },
            { id: 'affected', title: 'Affected Assets', value: aggregations.affected_assets.value.toString(), variant: 'affected' },
            { id: 'cameras', title: 'Cameras with Anomalies', value: aggregations.affected_cameras.value.toString(), variant: 'cameras' },
        ];
    }

    @Get('events')
    async getEvents(@Query() query: any) {
        const { severity, type, asset, camera } = query;
        const must: any[] = [];

        if (severity) must.push({ term: { severity: severity } });
        if (type) must.push({ term: { type: type } });
        if (asset) must.push({ term: { assetId: asset } });
        if (camera) {
            const location = camera.replace(' Cam', '');
            must.push({ term: { location: location } });
        }

        const body: any = {};
        if (must.length > 0) {
            body.query = { bool: { must } };
        }

        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            sort: [{ timestamp: 'desc' }],
            size: 50,
            body: Object.keys(body).length > 0 ? body : undefined
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (result.hits.hits as any[]).map((hit: any) => ({
            id: hit._source.id,
            severity: hit._source.severity,
            type: hit._source.type,
            description: hit._source.description,
            asset: hit._source.assetId,
            confidence: Math.round(hit._source.confidence * 100),
            camera: `${hit._source.location} Cam`, // inferred
            timestamp: new Date(hit._source.timestamp).toLocaleTimeString(),
            timeAgo: 'Just now', // dynamic calc needed in frontend or here
        }));
    }

    @Get('map')
    async getMap() {
        return this.anomaliesService.getMapData();
    }

    @Get('filter-options')
    async getFilterOptions() {
        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            size: 0,
            body: {
                aggs: {
                    severities: { terms: { field: 'severity', size: 100 } },
                    types: { terms: { field: 'type', size: 100 } },
                    assets: { terms: { field: 'assetId', size: 100 } },
                    cameras: { terms: { field: 'location', size: 100 } }
                }
            }
        } as any);

        const allAssetIds = await this.anomaliesService.getAllAssetIds();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aggs: any = (result as any).aggregations;

        // Merge assets from anomalies and from DB source of truth
        const anomalyAssets = aggs.assets.buckets.map((b: any) => b.key);
        const mergedAssets = Array.from(new Set([...allAssetIds, ...anomalyAssets]));

        return {
            severities: aggs.severities.buckets.map((b: any) => b.key),
            types: aggs.types.buckets.map((b: any) => b.key),
            assets: mergedAssets,
            cameras: aggs.cameras.buckets.map((b: any) => `${b.key} Cam`)
        };
    }

    @Get('cameras')
    async getCameras() {
        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            size: 100,
            sort: [{ timestamp: 'desc' }],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hits = result.hits.hits as any[];
        const uniqueLocations = new Set();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dynamicCameras = hits.reduce((acc: any[], hit: any) => {
            const source = hit._source;
            if (!uniqueLocations.has(source.location)) {
                uniqueLocations.add(source.location);
                acc.push({
                    id: `cam-${source.id}`,
                    name: `${source.location} Cam`,
                    hasAnomaly: !source.isResolved,
                    isLive: true,
                    assetName: source.assetId,
                    model: 'Vision Pro 4K',
                    currentAnomaly: !source.isResolved ? source.type : undefined,
                });
            }
            return acc;
        }, []);

        return dynamicCameras;
    }
}
