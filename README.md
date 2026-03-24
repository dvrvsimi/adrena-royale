# Adrena Royale

**Battle-Royale Style Trading Tournaments for Adrena Protocol**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-purple.svg)](https://solana.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

Adrena Royale is a weekly elimination trading tournament system built on top of [Adrena Protocol](https://adrena.xyz). Traders compete in multi-round elimination tournaments where the bottom performers are eliminated each round until champions emerge.

**The concept is simple:**
> 256 traders enter. Rounds progressively eliminate the bottom 25%. The last traders standing win.

This creates natural drama—clutch saves, comeback stories, and real-time tension that can be livestreamed and shared.

---

## Features

### Core Tournament Mechanics
- **Multi-Round Elimination**: 5 rounds with configurable elimination percentages (default 25-50%)
- **Risk-Adjusted Scoring**: `(PnL / Position Size) × Duration Multiplier` - skill beats capital
- **Anti-Sniping**: Duration multipliers reward conviction trades, penalize last-second scalps
- **Shield System**: Trading streaks earn shields that protect from elimination

### Smart Integrations
- **Adrena Protocol**: Direct integration with position data via Data API + on-chain fallback
- **Competition Service**: Real-time position events via WebSocket + size multiplier calculation
- **Mutagen**: Entry fees can be paid in Mutagen tokens
- **Solana Wallets**: Full wallet adapter support for signing and verification

### Treasury & Rewards
- **Prize Distribution**: Automated prize pool calculation (30/18/12% for top 3, 2% each for finalists)
- **SOL Refunds**: Stake entry refunds for non-winners and cancelled tournaments
- **Consolation Raffle**: 10% pool distributed to random eliminated participant

### Technical Highlights
- **Real-time WebSocket**: Live standings updates via `/ws/standings`
- **Atomic Operations**: Prisma transactions prevent race conditions
- **Mock Data Mode**: Full development environment without live API dependency
- **Type-Safe**: Shared types between API and frontend via monorepo

---

## Project Structure

```
adrena-royale/
├── apps/
│   ├── api/                    # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── adrena.ts         # Adrena Protocol integration
│   │   │   │   ├── competition-ws.ts # Competition Service WebSocket
│   │   │   │   ├── standings-ws.ts   # Real-time standings WebSocket
│   │   │   │   ├── treasury.ts       # Prize pool & payout management
│   │   │   │   ├── refunds.ts        # SOL stake refunds
│   │   │   │   ├── scoring.ts        # Risk-adjusted scoring engine
│   │   │   │   ├── elimination.ts    # Round elimination logic
│   │   │   │   ├── badges.ts         # Achievement system
│   │   │   │   └── entry.ts          # Entry validation
│   │   │   ├── jobs/           # Background processors
│   │   │   │   └── roundProcessor.ts  # Round state machine
│   │   │   └── middleware/     # Auth & validation
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   │
│   └── web/                    # Next.js 14 frontend
│       └── src/
│           ├── app/            # App router pages
│           ├── components/     # React components
│           ├── hooks/          # Custom hooks
│           └── lib/            # Utilities & API client
│
├── packages/
│   └── shared/                 # Shared types & constants
│       └── src/
│           └── types.ts        # TypeScript definitions
│
└── submission/                 # Design documentation
    ├── ADRENA_ROYALE_Design_Document.md
    └── ADRENA_ROYALE_Technical_Specification.md
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo + npm workspaces |
| **API** | Express.js + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Frontend** | Next.js 14 + React 18 |
| **Styling** | Tailwind CSS |
| **Blockchain** | Solana Web3.js + Wallet Adapter |
| **Data** | Adrena Data API + On-chain fallback |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 14+ (or Docker)
- **npm** 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/dvrvsimi/adrena-royale.git
cd adrena-royale

# Install dependencies
npm install

# Build shared packages
npm run build --filter=@adrena-royale/shared
```

### Database Setup

**Option 1: Docker (Recommended)**
```bash
docker run --name adrena-postgres \
  -e POSTGRES_USER=adrena \
  -e POSTGRES_PASSWORD=adrena123 \
  -e POSTGRES_DB=adrena_royale \
  -p 5432:5432 \
  -d postgres:15
```

**Option 2: Local PostgreSQL**
```bash
createdb adrena_royale
```

### Environment Configuration

```bash
# Copy example environment file
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:
```env
# Database
DATABASE_URL="postgresql://adrena:adrena123@localhost:5432/adrena_royale"

# Adrena Data API
ADRENA_API_BASE_URL="https://datapi.adrena.trade"

# Adrena Competition Service
ADRENA_COMPETITION_API_URL="https://adrena-competition-service.onrender.com"
ADRENA_COMPETITION_API_KEY="your_api_key"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Admin Configuration
TREASURY_WALLET="your_treasury_multisig_wallet"
ADMIN_WALLETS="admin1_pubkey,admin2_pubkey"

# Server
PORT=3001
NODE_ENV=development
```

### Initialize Database

```bash
# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate
```

### Run Development Servers

```bash
# Start all services (API + Web)
npm run dev

# Or run individually:
npm run dev --filter=api    # API on http://localhost:3001
npm run dev --filter=web    # Web on http://localhost:3000
```

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tournaments` | List tournaments (with status filter) |
| `GET` | `/api/tournaments/:id` | Tournament details with rounds |
| `GET` | `/api/tournaments/:id/standings` | Current round standings |
| `GET` | `/api/profile/:wallet` | User profile with badges |
| `GET` | `/api/liquidity` | Pool liquidity info |
| `GET` | `/api/liquidity/:symbol` | Custody info by symbol |
| `GET` | `/api/size-multiplier` | Size multiplier tiers |
| `GET` | `/api/size-multiplier/calculate?size=X` | Calculate multiplier for size |
| `GET` | `/api/health` | Service health check |

### WebSocket Endpoints

| Endpoint | Description |
|----------|-------------|
| `ws://host/ws/standings` | Real-time standings updates (subscribe with `{type: "subscribe", tournamentId}`) |

### Protected Endpoints (Wallet Signature Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/participants/register` | Register for tournament |
| `GET` | `/api/participants/:tournamentId/:wallet` | Check registration status |

### Admin Endpoints (Admin Wallet Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/tournaments` | Create tournament |
| `POST` | `/api/admin/tournaments/:id/open-entries` | Open registration |
| `POST` | `/api/admin/tournaments/:id/start` | Start tournament |
| `POST` | `/api/admin/tournaments/:id/whitelist` | Add wallets to whitelist |
| `GET` | `/api/admin/tournaments/:id/prizes` | Prize pool breakdown |
| `POST` | `/api/admin/tournaments/:id/prizes/initialize` | Initialize prize payouts |
| `POST` | `/api/admin/tournaments/:id/prizes/confirm` | Confirm payout transaction |
| `GET` | `/api/admin/tournaments/:id/refunds` | Refund status |
| `POST` | `/api/admin/tournaments/:id/refunds/confirm` | Confirm refund transaction |

---

## Scoring System

### Formula
```
Trade Score = (PnL / Position Size) × Duration Multiplier × Size Multiplier × Utilization Bonus

Round Score = Sum of all Trade Scores
```

### Duration Multipliers
| Hold Time | Multiplier | Purpose |
|-----------|------------|---------|
| < 5 min | 0.5× | Anti-sniping penalty |
| 5-30 min | 1.0× | Neutral |
| 30 min - 2 hrs | 1.0-1.25× | Conviction bonus |
| 2+ hrs | 1.25-1.5× | Maximum conviction |

### Size Multipliers (Adrena Competition)
| Position Size | Multiplier Range |
|---------------|------------------|
| $10 - $1K | 0.00025× - 0.05× |
| $1K - $5K | 0.05× - 1× |
| $5K - $50K | 1× - 5× |
| $50K - $100K | 5× - 9× |
| $100K - $250K | 9× - 17.5× |
| $250K - $500K | 17.5× - 25× |
| $500K - $1M | 25× - 30× |
| $1M - $4.5M | 30× - 45× |

*Linear interpolation within each tier*

### Utilization Bonus (Optional)
When enabled, trades in custodies with >70% utilization receive 1.1× bonus.

### Trade Exclusions
- Position size < $100 (anti-farming)
- Duration < 60 seconds with < 0.1% price move (wash trade)

---

## Prize Distribution

When a tournament completes, the prize pool is distributed automatically:

| Placement | Prize % | Description |
|-----------|---------|-------------|
| 1st | 30% | Champion |
| 2nd | 18% | Runner-up |
| 3rd | 12% | Third place |
| 4th-16th | 2% each | Finalists (26% total) |
| Raffle | 10% | Random eliminated participant |
| Platform | 5% | Platform fee |

### Payout Flow
1. Tournament completes → Prize pool initialized
2. Payout records created for all winners
3. Admin confirms payouts via `/api/admin/tournaments/:id/prizes/confirm`
4. Non-winners receive SOL stake refunds via `/api/admin/tournaments/:id/refunds/confirm`

---

## Shield System

Shields protect traders from elimination. Earned through trading streaks:

| Streak | Shields Earned |
|--------|----------------|
| 7-day streak | 1 shield |
| 30-day streak | 2 shields (total) |

Shields are assigned at tournament start and consumed automatically when needed.

---

## Development

### Available Scripts

```bash
# Development
npm run dev           # Start all services
npm run type-check    # TypeScript validation
npm run build         # Production build
npm run lint          # ESLint

# Database
npm run db:push       # Push schema changes
npm run db:generate   # Generate Prisma client
npm run db:studio     # Open Prisma Studio

# Testing (when implemented)
npm run test          # Run tests
npm run test:watch    # Watch mode
```

### Mock Data Mode

In development, the API uses mock data generators to simulate Adrena Protocol responses. This allows full testing without live API dependency.

Mock data is enabled automatically when `NODE_ENV=development`.

### Authentication in Development

For local testing, you can bypass wallet signature verification:
```bash
# Use x-dev-wallet header instead of signature
curl -X POST http://localhost:3001/api/participants/register \
  -H "Content-Type: application/json" \
  -H "x-dev-wallet: YourTestWalletPubkey" \
  -d '{"tournamentId": "..."}'
```

---

## Deployment

### API Server

```bash
# Build
npm run build --filter=api

# Start production server
NODE_ENV=production node apps/api/dist/index.js
```

### Web Application

```bash
# Build
npm run build --filter=web

# The .next folder can be deployed to Vercel, Netlify, etc.
```

### Environment Variables (Production)

```env
# Required
DATABASE_URL=postgresql://...
ADRENA_API_BASE_URL=https://datapi.adrena.trade
ADRENA_COMPETITION_API_URL=https://adrena-competition-service.onrender.com
ADRENA_COMPETITION_API_KEY=your_production_api_key
SOLANA_RPC_URL=https://your-rpc-endpoint.com
TREASURY_WALLET=...
ADMIN_WALLETS=...
NODE_ENV=production

# Optional
CORS_ORIGIN=https://your-domain.com
```

---

## Architecture Decisions

### Why Hybrid Data Source?
The API fetches position data from Adrena's Data API with on-chain RPC fallback. This provides:
- Fast response times (API is indexed)
- Resilience if API is down (on-chain fallback)
- Historical data access (API stores closed positions)

### Why Risk-Adjusted Scoring?
Traditional P&L scoring rewards capital, not skill. A $100 profit on a $1,000 position (10% return) should rank higher than $100 profit on $50,000 (0.2% return).

### Why Percentile Elimination?
In bear markets, all traders may have negative scores. Eliminating "bottom 25% by rank" works regardless of whether scores are positive or negative.

---

## Documentation

- [Design Document](./submission/ADRENA_ROYALE_Design_Document.md) - Full product specification
- [Technical Specification](./submission/ADRENA_ROYALE_Technical_Specification.md) - Implementation details
- [Deployment Guide](./submission/DEPLOYMENT_GUIDE.md) - Local development setup and Render deployment

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type checks (`npm run type-check`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Adrena Protocol](https://adrena.xyz) - The underlying trading platform
- [Superteam](https://superteam.fun) - Bounty program
- The Solana ecosystem for excellent developer tools

---

**Built with conviction for the Adrena community.**
