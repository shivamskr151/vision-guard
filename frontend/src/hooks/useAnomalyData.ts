import { useState, useEffect } from 'react';
import type { AnomalyKpiCard, AnomalyEvent, AnomalyMapMarker, CameraStream, MapRegion } from '@/types';

export function useAnomalyData(filters?: Record<string, string>) {
    const [kpiCards, setKpiCards] = useState<AnomalyKpiCard[]>([]);
    const [events, setEvents] = useState<AnomalyEvent[]>([]);
    const [mapMarkers, setMapMarkers] = useState<AnomalyMapMarker[]>([]);
    const [mapRegions, setMapRegions] = useState<MapRegion[]>([]);
    const [cameraStreams, setCameraStreams] = useState<CameraStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const queryParams = new URLSearchParams(filters as any).toString();
                const [statsRes, eventsRes, mapRes, camerasRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/anomalies/stats?${queryParams}`),
                    fetch(`${import.meta.env.VITE_API_URL}/anomalies/events`),
                    fetch(`${import.meta.env.VITE_API_URL}/anomalies/map`),
                    fetch(`${import.meta.env.VITE_API_URL}/anomalies/cameras`),
                ]);

                if (!statsRes.ok || !eventsRes.ok || !mapRes.ok || !camerasRes.ok) {
                    throw new Error('Failed to fetch anomaly data');
                }

                const statsData = await statsRes.json();
                const eventsData = await eventsRes.json();
                const mapData = await mapRes.json();
                const camerasData = await camerasRes.json();

                setKpiCards(statsData);
                setEvents(eventsData);
                setMapMarkers(mapData.markers || []);
                setMapRegions(mapData.regions || []);
                setCameraStreams(camerasData);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching anomaly data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [filters]); // Re-run when filters change

    return { kpiCards, events, mapMarkers, mapRegions, cameraStreams, loading, error };
}
