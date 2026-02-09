import { useState, useEffect } from 'react';
import type { KPICardData, MapMarker } from '@/types';

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
                const response = await fetch(`${import.meta.env.VITE_API_URL}/inspections/dashboard`);

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
                        description: 'vs last month',
                        trend: { value: '↑ 5.2%', positive: true } // Mock trend for match
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
        // Poll every 5 seconds
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    return { kpiCards, mapMarkers, mapRegions, mapFilters, mapLegend, loading, error };
}
