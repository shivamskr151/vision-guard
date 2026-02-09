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
        await this.anomaliesService.processAnomalyData(data);
    }

    // Ingest endpoint removed as data production is now continuous on startup

    @Get('stats')
    async getStats(@Query() query: any) {
        const { severity, type, asset, camera } = query;
        const must: any[] = [];

        if (severity) must.push({ term: { 'severity.keyword': severity } });
        if (type) must.push({ term: { 'type.keyword': type } });
        if (asset) must.push({ term: { 'assetId.keyword': asset } });
        if (camera) {
            // Frontend sends "Location Cam", backend stores "Location"
            const location = camera.replace(' Cam', '');
            must.push({ term: { 'location.keyword': location } });
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
                    affected_assets: { cardinality: { field: 'assetId.keyword' } },
                    affected_cameras: { cardinality: { field: 'location.keyword' } },
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
    async getEvents() {
        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            sort: [{ timestamp: 'desc' }],
            size: 10,
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
        // Return markers
        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            size: 100,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hits = result.hits.hits as any[];

        const markers = hits.map((hit, index) => {
            const source = hit._source;
            const regionMap: Record<string, string> = {
                'South Plant': 'south-plant',
                'North Plant': 'north-plant',
                'Processing Unit A': 'processing-a',
                'Processing Unit B': 'processing-b',
                'Storage Area': 'storage',
            };

            return {
                id: `am-${source.id}`,
                regionId: regionMap[source.location] || 'north-plant',
                x: 20 + (index * 10), // scatter them
                y: 20 + (index * 5),
                type: source.severity === 'critical' ? 'hotspot' : 'camera',
                hotspotIcon: source.severity === 'critical' ? 'warning' : undefined,
            };
        });

        const regions = [
            { id: 'north-plant', label: 'North Plant', x: 5, y: 5, width: 25, height: 40 },
            { id: 'processing-a', label: 'Processing Unit A', x: 32, y: 5, width: 25, height: 40 },
            { id: 'storage', label: 'Storage Area', x: 59, y: 5, width: 25, height: 40 },
            { id: 'processing-b', label: 'Processing Unit B', x: 5, y: 50, width: 35, height: 45 },
            { id: 'south-plant', label: 'South Plant', x: 42, y: 50, width: 42, height: 45 },
        ];

        return { regions, markers };
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
