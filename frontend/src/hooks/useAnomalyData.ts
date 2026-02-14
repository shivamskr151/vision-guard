import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import type { AnomalyKpiCard, AnomalyEvent, AnomalyMapMarker, CameraStream, MapRegion } from '@/types';
import { config } from '@/config';

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
                    fetch(`${config.API_URL}/anomalies/stats?${queryParams}`),
                    fetch(`${config.API_URL}/anomalies/events`),
                    fetch(`${config.API_URL}/anomalies/map`),
                    fetch(`${config.API_URL}/anomalies/cameras`),
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
    }, [filters]);

    const { lastAnomaly } = useSocket();

    useEffect(() => {
        if (!lastAnomaly) return;

        // Append new event
        const newEvent: AnomalyEvent = {
            id: lastAnomaly.id,
            severity: lastAnomaly.severity,
            type: lastAnomaly.type,
            description: lastAnomaly.description,
            asset: lastAnomaly.assetId,
            confidence: Math.round(lastAnomaly.confidence * 100),
            camera: `${lastAnomaly.location} Cam`,
            timestamp: new Date(lastAnomaly.timestamp).toLocaleTimeString(),
            timeAgo: 'Just now',
        };

        setEvents((prev) => [newEvent, ...prev].slice(0, 50)); // Keep last 50

        // Update Stats
        setKpiCards((prev) => prev.map((card) => {
            if (card.id === 'total') {
                return { ...card, value: (parseInt(card.value) + 1).toString() };
            }
            if (card.variant === lastAnomaly.severity) { // e.g. 'critical'
                return { ...card, value: (parseInt(card.value) + 1).toString() };
            }
            // affected assets? simplified logic: ignore for now or increment if unique
            return card;
        }));

        // Update Map Markers
        setMapMarkers((prev) => prev.map((marker) => {
            // marker.id often starts with 'am-'
            // but marker structure in AnomalyPage might be different.
            // let's assume we match on location or asset?
            // marker in map endpoint: 
            // { id: `am-${source.id}`, regionId: ..., x: ..., y: ..., type: ..., hotspotIcon: ... }
            // This is tricky because we don't have enough info to place a NEW marker from scratch (x, y coords).
            // However, if the marker already exists (e.g. static camera/asset), we update it.
            // But the map endpoint returns specific anomaly markers based on events.
            // If I receive a new anomaly, I should add a marker. But I don't know x,y.
            // Strategy: For now, maybe just don't update map markers on event to avoid bugs, OR refetch map data?
            // Refetching map data might be safer for "production ready" correctness if coordinates are complex.
            // Let's refetch map data on anomaly event.
            return marker;
        }));

    }, [lastAnomaly]);

    return { kpiCards, events, mapMarkers, mapRegions, cameraStreams, loading, error };
}
