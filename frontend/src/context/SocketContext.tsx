import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { config } from '@/config';

interface SocketContextType {
    socket: WebSocket | null;
    isConnected: boolean;
    lastTelemetry: any;
    lastAnomaly: any;
    lastInspectionStats: any;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastTelemetry, setLastTelemetry] = useState<any>(null);
    const [lastAnomaly, setLastAnomaly] = useState<any>(null);
    const [lastInspectionStats, setLastInspectionStats] = useState<any>(null);

    useEffect(() => {
        // Create native WebSocket connection
        // Assuming backend runs on same host/port logic or use env
        // VITE_API_URL is mostly http://... so we replace http with ws
        const apiUrl = config.API_URL;
        const wsUrl = apiUrl.replace(/^http/, 'ws');

        let ws: WebSocket;
        let reconnectTimer: NodeJS.Timeout;

        const connect = () => {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('Connected to WebSocket server');
                setIsConnected(true);
            };

            ws.onclose = () => {
                console.log('Disconnected from WebSocket server');
                setIsConnected(false);
                // Simple reconnect logic
                reconnectTimer = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket Connection Error:', err);
                ws.close();
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // Message format: { event: string, data: any }
                    if (message.event === 'telemetry') {
                        setLastTelemetry(message.data);
                    } else if (message.event === 'anomaly') {
                        setLastAnomaly(message.data);
                    } else if (message.event === 'inspection_stats') {
                        setLastInspectionStats(message.data);
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message', e);
                }
            };

            setSocket(ws);
        };

        connect();

        return () => {
            if (ws) ws.close();
            clearTimeout(reconnectTimer);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, lastTelemetry, lastAnomaly, lastInspectionStats }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
