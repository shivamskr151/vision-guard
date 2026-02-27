import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import type { KPICardData, MapMarker } from '@/types';
import { config } from '@/config';

export function useDashboardData() {
    const [kpiCards, setKpiCards] = useState<KPICardData[]>([]);
    const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
    const [mapRegions, setMapRegions] = useState<any[]>([]);
    const [mapFilters, setMapFilters] = useState<any[]>([]);
    const [mapLegend, setMapLegend] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${config.API_URL}/inspections/dashboard`);

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard data');
                }

                const data = await response.json();
                const { kpi, mapData, mapZones } = data;

                const cards: KPICardData[] = [
                    {
                        id: 'assets',
                        variant: 'assets',
                        title: 'Total Registered Assets',
                        value: kpi.totalAssets?.toString() || '0',
                        description: 'Across all facilities'
                    },
                    {
                        id: 'due',
                        variant: 'due',
                        title: 'Assets Due for Inspection',
                        value: kpi.due?.toString() || '0',
                        description: 'Within 7 days'
                    },
                    {
                        id: 'overdue',
                        variant: 'overdue',
                        title: 'Assets Overdue',
                        value: kpi.overdue?.toString() || '0',
                        description: 'Requires immediate action'
                    },
                    {
                        id: 'anomalies',
                        variant: 'anomalies',
                        title: 'Active Anomalies',
                        value: kpi.activeAnomalies?.toString() || '0',
                        description: 'Vision-detected events'
                    },
                    {
                        id: 'compliance',
                        variant: 'compliance',
                        title: 'Inspection Compliance',
                        value: `${kpi.sla || 0}%`,
                        description: 'vs last month'
                    },
                    {
                        id: 'risk',
                        variant: 'risk',
                        title: 'Critical Asset Risk Index',
                        value: kpi.riskIndex?.toFixed(1) || '0.0',
                        description: 'Weighted risk score'
                    }
                ];

                const markers: MapMarker[] = (mapData || []).map((asset: any) => ({
                    id: asset.id.toString(),
                    x: asset.x,
                    y: asset.y,
                    name: asset.name,
                    type: 'asset',
                    assetStatus: asset.healthStatus,
                    inspectionDue: asset.inspectionDue,
                    hasAnomaly: asset.hasAnomaly,
                    hasCamera: asset.hasCamera,
                    tooltip: `${asset.name} (${asset.type})`
                }));

                const regions = (mapZones || []).map((z: any) => ({
                    id: z.id.toString(),
                    label: z.label,
                    x: z.x,
                    y: z.y,
                    width: z.width,
                    height: z.height
                }));

                const filters = [
                    { id: 'assetHealth', label: 'Asset Health' },
                    { id: 'inspectionDue', label: 'Inspection Due' },
                    { id: 'anomalyHotspots', label: 'Anomaly Hotspots' }
                ];

                const legend = [
                    { id: 'good', label: 'Asset: Good', type: 'good' },
                    { id: 'warning', label: 'Asset: Warning', type: 'warning' },
                    { id: 'critical', label: 'Asset: Critical', type: 'critical' },
                    { id: 'camera', label: 'Active Camera', type: 'camera' },
                    { id: 'due', label: 'Inspection Due', type: 'inspectionDue' }
                ];

                setKpiCards(cards);
                setMapMarkers(markers);
                setMapRegions(regions);
                setMapFilters(filters);
                setMapLegend(legend);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const { lastTelemetry, lastAnomaly } = useSocket();

    // Real-time Telemetry Updates
    useEffect(() => {
        if (!lastTelemetry) return;

        setMapMarkers((prev) => prev.map((marker) => {
            if (marker.name === lastTelemetry.assetId) {
                return {
                    ...marker,
                    assetStatus: lastTelemetry.status,
                    // potential other updates
                };
            }
            return marker;
        }));
    }, [lastTelemetry]);

    // Real-time Anomaly Updates
    useEffect(() => {
        if (!lastAnomaly) return;

        setMapMarkers((prev) => prev.map((marker) => {
            if (marker.name === lastAnomaly.assetId) {
                return {
                    ...marker,
                    hasAnomaly: !lastAnomaly.isResolved,
                };
            }
            return marker;
        }));

        // Dynamically update Active Anomalies KPI
        setKpiCards((prev) => prev.map((card) => {
            if (card.id === 'anomalies' && !lastAnomaly.isResolved) {
                const val = parseInt(card.value.replace(/,/g, '')) || 0;
                return { ...card, value: (val + 1).toString() };
            }
            return card;
        }));
    }, [lastAnomaly]);

    return { kpiCards, mapMarkers, mapRegions, mapFilters, mapLegend, loading, error };
}
