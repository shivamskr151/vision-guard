# Vision Guard

Vision Guard is a vision-based asset intelligence platform for monitoring facilities, detecting anomalies, managing an asset registry, and tracking inspections and reports. It provides a real-time dashboard for operational intelligence, leveraging vision data to enhance facility management.

## 🚀 Key Features

- **Real-time Dashboard** — KPIs, facility maps, and live operational status updates.
- **Anomaly Detection** — Integration with live streams to detect and manage anomaly events with hotspot mapping.
- **Asset Registry** — Comprehensive management of assets with custom schemas and inspection templates.
- **Inspections & Compliance** — Track due/overdue inspections, maintain compliance, and generate detailed reports.
- **Telemetry Streaming** — Real-time data processing via Kafka for immediate insights.

## 🛠 Technology Stack

### Frontend
- **Framework:** [React 18](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **State/Routing:** [React Router 7](https://reactrouter.com/)
- **Visualization:** [Recharts](https://recharts.org/)
- **Testing:** [Vitest](https://vitest.dev/)

### Backend
- **Framework:** [NestJS](https://nestjs.com/) (Node.js)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Microservices:** [Kafka](https://kafka.apache.org/) (via KafkaJS)
- **Search Engine:** [Elasticsearch](https://www.elastic.co/elasticsearch/)
- **API Architecture:** Hybrid (REST + Kafka Microservices)

### Infrastructure
- **Database:** MongoDB (via Prisma)
- **Message Broker:** Apache Kafka & Zookeeper
- **Logging/Analytics:** Elasticsearch & Kibana
- **Containerization:** Docker & Docker Compose

## ⚙️ Project Setup

### 1. Prerequisites
- **Node.js:** 18+ (20 LTS recommended)
- **Docker:** For running infrastructure services.
- **npm:** 9+

### 2. Infrastructure Setup
Spin up the required services (MongoDB, Kafka, Elasticsearch) using Docker Compose:

```bash
docker-compose up -d
```

### 3. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env` (refer to `.env.example`).
4. Sync database schema:
   ```bash
   npx prisma db push
   ```
5. Start the backend:
   ```bash
   npm run start:dev
   ```

### 4. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`.
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

```
vision-guard/
├── backend/          # NestJS application
│   ├── src/          # API, Microservices, and Business Logic
│   ├── prisma/       # Database schema and migrations
│   └── Data/         # CSV files for data streaming/simulation
├── frontend/         # React/Vite application
│   ├── src/          # Components, Pages, and Hooks
│   └── public/       # Static assets
└── docker-compose.yml # Infrastructure orchestration
```

## 🧪 Testing

- **Backend:** `cd backend && npm run test`
- **Frontend:** `cd frontend && npm run test`

## 📄 License
Private.
