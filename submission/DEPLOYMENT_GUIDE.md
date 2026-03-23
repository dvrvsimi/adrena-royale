# Adrena Royale - Deployment & Configuration Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment to Render](#deployment-to-render)
- [Configuration Options](#configuration-options)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+
- npm 9+
- Docker (for local PostgreSQL)
- Git

---

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/dvrvsimi/adrena-royale.git
cd adrena-royale
npm install
```

### 2. Start PostgreSQL with Docker

```bash
docker run --name adrena-postgres \
  -e POSTGRES_USER=adrena \
  -e POSTGRES_PASSWORD=adrena123 \
  -e POSTGRES_DB=adrena_royale \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Configure Environment

Create `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://adrena:adrena123@localhost:5432/adrena_royale"

# Adrena Integration
ADRENA_API_BASE_URL=https://datapi.adrena.xyz
ADRENA_COMPETITION_API_URL=https://adrena-competition-service.onrender.com
ADRENA_COMPETITION_API_KEY=your_api_key_here

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 4. Initialize Database

```bash
npm run db:push
npm run db:generate
```

### 5. Start Development Servers

```bash
npm run dev
```

- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **Health Check**: http://localhost:3001/api/health

---

## Environment Variables

### API Service (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADRENA_API_BASE_URL` | Yes | Adrena Data API URL |
| `ADRENA_COMPETITION_API_URL` | Yes | Competition Service URL |
| `ADRENA_COMPETITION_API_KEY` | Yes | API key for Competition Service |
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint |
| `CORS_ORIGIN` | Prod | Allowed CORS origins (comma-separated) |
| `PORT` | No | API port (default: 3001) |

### Web Service (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | API base URL |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket URL for standings |

---

## Database Setup

### Schema Overview

The database uses PostgreSQL with Prisma ORM. Key tables:

- `Tournament` - Tournament configuration and state
- `Participant` - Registered participants
- `Round` - Round status and timing
- `RoundScore` - Per-round scores and rankings
- `Badge` - Achievement badges
- `UserStreak` - Trading streak tracking

### Commands

```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Open Prisma Studio (GUI)
npm run db:studio

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset
```

---

## Deployment to Render

### Option 1: Using render.yaml (Recommended)

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render auto-detects `render.yaml` and creates services

### Option 2: Manual Setup

#### Create PostgreSQL Database

1. New → PostgreSQL
2. Name: `adrena-royale-db`
3. Database: `adrena_royale`
4. User: `adrena`
5. Plan: Free

#### Create API Service

1. New → Web Service
2. Connect repository
3. Name: `adrena-royale-api`
4. Build Command:
   ```bash
   npm install --include=dev && npm run build -w @adrena-royale/shared && npm run build -w api && npx prisma db push
   ```
5. Start Command:
   ```bash
   node apps/api/dist/index.js
   ```
6. Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (from PostgreSQL service)
   - `ADRENA_COMPETITION_API_KEY` = (your key)
   - `CORS_ORIGIN` = (frontend URL after deploy)

#### Create Web Service

1. New → Web Service
2. Connect repository
3. Name: `adrena-royale-web`
4. Build Command:
   ```bash
   npm install --include=dev && npm run build -w @adrena-royale/shared && npm run build -w web
   ```
5. Start Command:
   ```bash
   npm run start -w web
   ```
6. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://adrena-royale-api.onrender.com/api`
   - `NEXT_PUBLIC_WS_URL` = `wss://adrena-royale-api.onrender.com`

---

## Configuration Options

### Tournament Settings

Default round configuration in `packages/shared/src/constants.ts`:

```typescript
export const DEFAULT_ROUND_CONFIGS = [
  { duration: 1, eliminationPercent: 0.25 },   // Round 1
  { duration: 1, eliminationPercent: 0.25 },   // Round 2
  { duration: 1, eliminationPercent: 0.33 },   // Round 3
  { duration: 1, eliminationPercent: 0.50 },   // Round 4
  { duration: 1, eliminationPercent: 0 }       // Finals
];
```

- `duration`: Round length in minutes
- `eliminationPercent`: Fraction of participants eliminated (0-1)

### Scoring Parameters

```typescript
export const SCORING_CONFIG = {
  minNotionalSize: 100,      // Minimum position size in USD
  snipePenaltyMins: 5,       // Trades <5min get penalty
  convictionThresholdMins: 60, // Full bonus for trades >60min
  maxUtilizationPenalty: 0.5   // Max penalty for high utilization
};
```

### Admin Configuration

By default, any connected wallet can access admin functions in development mode. In production, implement wallet-based admin verification in `apps/api/src/middleware/admin.ts`.

---

## Troubleshooting

### "Database connection failed"

1. Check `DATABASE_URL` format
2. Ensure PostgreSQL is running
3. Verify network/firewall allows connection

### "Adrena Data API is unavailable"

The Adrena Data API may be suspended. In development mode, mock data is used automatically. In production, real-time data comes from the Competition Service WebSocket.

### Build fails on Render

1. Ensure build command includes shared package:
   ```bash
   npm run build -w @adrena-royale/shared && npm run build -w api
   ```
2. Check that `@types/express` and other dev dependencies are installed

### WebSocket not connecting

1. Verify `NEXT_PUBLIC_WS_URL` uses correct protocol (`ws://` local, `wss://` production)
2. Check CORS configuration allows WebSocket origins
3. Ensure API service is running

### Rounds not processing

1. Check API logs for cron job errors
2. Verify tournament status is `IN_PROGRESS`
3. Ensure participants are registered

---

## Testing

### API Health Check

```bash
curl http://localhost:3001/api/health
```

### Create Test Tournament

```bash
curl -X POST http://localhost:3001/api/admin/tournaments \
  -H "Content-Type: application/json" \
  -H "x-dev-wallet: TestAdmin" \
  -d '{
    "name": "Test Tournament",
    "entryType": "FREE",
    "scheduledStart": "2026-03-23T12:00:00Z",
    "entryDeadline": "2026-03-23T11:55:00Z",
    "minParticipants": 3
  }'
```

### View Standings

```bash
curl http://localhost:3001/api/tournaments/{id}/standings
```

---

## Live Demo

- **Web App**: https://adrena-royale-web.onrender.com
- **API**: https://adrena-royale-api.onrender.com/api
- **Health**: https://adrena-royale-api.onrender.com/api/health

---

## Support

- GitHub Issues: https://github.com/dvrvsimi/adrena-royale/issues
- Author: dvrvsimi
