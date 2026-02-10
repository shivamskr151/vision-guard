import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*', // Allow all origins for dev simplicity
    },
})
export class EventsGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('EventsGateway');

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway Initialized (Native WS)');
    }

    handleConnection(client: WebSocket, ...args: any[]) {
        this.logger.log(`Client connected`);
    }

    handleDisconnect(client: WebSocket) {
        this.logger.log(`Client disconnected`);
    }

    // Method to emit events to all connected clients
    broadcast(event: string, data: any) {
        // Native WS doesn't have .emit with event name, so we stringify a JSON structure
        const message = JSON.stringify({ event, data });
        this.server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}
