# ADRENA ROYALE

## Technical Specification v2.0

**MVP Architecture, SDK Integration, Database Schema & Implementation Guide**

---

| | |
|---|---|
| **Prepared for** | Adrena Protocol & Superteam Bounty |
| **Version** | 2.0 (MVP-Focused Revision) |
| **Date** | March 2026 |
| **Author** | [Your Name/Team] |

---

## Document Navigation

| Section | Purpose |
|---------|---------|
| [1. Architecture Overview](#1-architecture-overview) | MVP system design and components |
| [2. Project Structure](#2-project-structure) | Folder layout and file organization |
| [3. Adrena SDK Integration](#3-adrena-sdk-integration) | Using adrena-sdk-ts for data access |
| [4. Database Schema](#4-database-schema) | PostgreSQL tables, indexes, and migrations |
| [5. Core Engine](#5-core-engine) | Scoring, elimination, and streak algorithms |
| [6. Entry Systems](#6-entry-systems) | SOL staking and Mutagen commitment |
| [7. Badge System](#7-badge-system) | Off-chain badges with NFT upgrade path |
| [8. API Specification](#8-api-specification) | REST endpoints for frontend |
| [9. Admin Panel](#9-admin-panel) | Tournament management interface |
| [10. Deployment](#10-deployment) | Infrastructure and environment setup |
| [11. Build Order](#11-build-order) | 2-week sprint plan |

---

# 1. Architecture Overview

## 1.1 Design Principles (Revised for MVP)

| Principle | Implementation |
|-----------|----------------|
| **SDK-First** | All Adrena data via `adrena-sdk-ts`, not direct on-chain reads |
| **Polling-Based** | No custom Yellowstone gRPC indexer for MVP |
| **Off-Chain State** | Tournament state in PostgreSQL, not on-chain |
| **Stateless API** | Horizontal scaling, no session state |
| **Progressive Enhancement** | Ship MVP, add trustless features in v2 |

## 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADRENA ROYALE MVP                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │    Frontend     │────▶│   Royale API    │────▶│   PostgreSQL    │   │
│  │   (Next.js)     │◀────│  (Express.js)   │◀────│                 │   │
│  │                 │     │                 │     │ • tournaments   │   │
│  │ • Registration  │     │ • REST API      │     │ • participants  │   │
│  │ • Standings     │     │ • Trade Poller  │     │ • round_scores  │   │
│  │ • Badges        │     │ • Scoring       │     │ • badges        │   │
│  │ • Admin Panel   │     │ • Elimination   │     │ • streaks       │   │
│  └─────────────────┘     └────────┬────────┘     └─────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────┐                         │
│                    │     adrena-sdk-ts        │                         │
│                    │                          │                         │
│                    │ • getPositions()         │                         │
│                    │ • getTraderInfo()        │                         │
│                    │ • getMutagen()           │                         │
│                    │ • getTraderVolume()      │                         │
│                    │ • getMutagenLeaderboard()│                         │
│                    └────────────┬─────────────┘                         │
│                                 │                                        │
│                                 ▼                                        │
│                    ┌──────────────────────────┐                         │
│                    │   Adrena datapi          │                         │
│                    │ datapi.adrena.xyz        │                         │
│                    └──────────────────────────┘                         │
│                                                                          │
│  ┌─────────────────┐                          ┌─────────────────┐       │
│  │  Entry Watcher  │                          │  Solana RPC     │       │
│  │                 │◀─────────────────────────│                 │       │
│  │ • Watch multisig│                          │ • Wallet verify │       │
│  │ • Credit entries│                          │ • TX monitoring │       │
│  └─────────────────┘                          └─────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **API** | Node.js + Express + TypeScript | SDK compatibility, type safety |
| **Database** | PostgreSQL (Supabase) | Managed, free tier, realtime |
| **Frontend** | Next.js 14 + Tailwind | Fast, SSR, easy deployment |
| **SDK** | adrena-sdk-ts | Official community SDK |
| **Hosting** | Vercel (frontend) + Railway (API) | Free tiers, easy deploy |
| **Cron** | Railway cron / node-cron | Trade polling, streak updates |

---

# 2. Project Structure

## 2.1 Monorepo Layout

```
adrena-royale/
├── apps/
│   ├── api/                          # Express API server
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── config/
│   │   │   │   └── env.ts            # Environment variables
│   │   │   ├── routes/
│   │   │   │   ├── tournaments.ts    # Tournament CRUD
│   │   │   │   ├── participants.ts   # Registration, status
│   │   │   │   ├── standings.ts      # Leaderboard endpoints
│   │   │   │   └── admin.ts          # Admin operations
│   │   │   ├── services/
│   │   │   │   ├── adrena.ts         # SDK wrapper
│   │   │   │   ├── scoring.ts        # Score calculation
│   │   │   │   ├── elimination.ts    # Round processing
│   │   │   │   ├── streaks.ts        # Streak calculation
│   │   │   │   ├── badges.ts         # Badge awarding
│   │   │   │   └── entry.ts          # Entry validation
│   │   │   ├── jobs/
│   │   │   │   ├── tradePoller.ts    # Poll positions
│   │   │   │   ├── roundProcessor.ts # End rounds
│   │   │   │   └── streakUpdater.ts  # Daily streak calc
│   │   │   ├── db/
│   │   │   │   ├── client.ts         # Prisma client
│   │   │   │   └── queries.ts        # Common queries
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # Wallet signature verify
│   │   │   │   └── admin.ts          # Admin wallet check
│   │   │   └── types/
│   │   │       └── index.ts          # Shared types
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   └── migrations/           # Migration files
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx          # Home / tournament list
│       │   │   ├── tournament/
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx  # Tournament detail
│       │   │   │       └── standings/
│       │   │   │           └── page.tsx
│       │   │   ├── profile/
│       │   │   │   └── [wallet]/
│       │   │   │       └── page.tsx  # User profile + badges
│       │   │   └── admin/
│       │   │       └── page.tsx      # Admin panel
│       │   ├── components/
│       │   │   ├── TournamentCard.tsx
│       │   │   ├── StandingsTable.tsx
│       │   │   ├── BadgeGrid.tsx
│       │   │   ├── RegistrationForm.tsx
│       │   │   └── WalletConnect.tsx
│       │   ├── hooks/
│       │   │   ├── useTournament.ts
│       │   │   ├── useStandings.ts
│       │   │   └── useWallet.ts
│       │   └── lib/
│       │       └── api.ts            # API client
│       ├── package.json
│       └── tailwind.config.js
│
├── packages/
│   └── shared/                       # Shared types & utils
│       ├── src/
│       │   ├── types.ts              # Tournament, Participant, etc.
│       │   └── constants.ts          # Badge definitions, etc.
│       └── package.json
│
├── submission/                       # Bounty submission docs
│   ├── ADRENA_ROYALE_Design_Document.md
│   └── ADRENA_ROYALE_Technical_Specification.md
│
├── package.json                      # Workspace root
├── turbo.json                        # Turborepo config
└── README.md
```

## 2.2 Key Dependencies

```json
// apps/api/package.json
{
  "dependencies": {
    "express": "^4.18.2",
    "adrena-sdk-ts": "beta",
    "@prisma/client": "^5.10.0",
    "@solana/web3.js": "^1.91.0",
    "bs58": "^5.0.0",
    "tweetnacl": "^1.0.3",
    "node-cron": "^3.0.3",
    "zod": "^3.22.4",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "prisma": "^5.10.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0"
  }
}
```

---

# 3. Adrena SDK Integration

## 3.1 SDK Setup

```typescript
// apps/api/src/services/adrena.ts
import { AdrenaApi } from 'adrena-sdk-ts';

// Singleton instance
let apiInstance: AdrenaApi | null = null;

export function getAdrenaApi(): AdrenaApi {
  if (!apiInstance) {
    apiInstance = new AdrenaApi(process.env.ADRENA_API_BASE_URL);
  }
  return apiInstance;
}

// ─────────────────────────────────────────────────────────────────────
// POSITION DATA
// ─────────────────────────────────────────────────────────────────────

export interface PositionData {
  wallet: string;
  pool: string;
  custody: string;
  side: 'long' | 'short';
  size_usd: number;
  collateral_usd: number;
  entry_price: number;
  current_price: number;
  unrealized_profit_usd: number;
  unrealized_loss_usd: number;
  open_time: number;      // Unix timestamp ms
  close_time?: number;    // Unix timestamp ms (if closed)
  pnl?: number;           // Realized P&L (if closed)
}

export async function getWalletPositions(wallet: string): Promise<PositionData[]> {
  const api = getAdrenaApi();
  const response = await api.getPositions({ wallet });
  return response.positions || [];
}

export async function getClosedPositionsInTimeRange(
  wallet: string,
  startTime: number,
  endTime: number
): Promise<PositionData[]> {
  const positions = await getWalletPositions(wallet);

  return positions.filter(p =>
    p.close_time &&
    p.close_time >= startTime &&
    p.close_time <= endTime
  );
}

// ─────────────────────────────────────────────────────────────────────
// MUTAGEN DATA
// ─────────────────────────────────────────────────────────────────────

export interface MutagenData {
  wallet: string;
  balance: number;
  rank?: number;
}

export async function getWalletMutagen(wallet: string): Promise<MutagenData> {
  const api = getAdrenaApi();
  const response = await api.getMutagen({ wallet });
  return {
    wallet,
    balance: response.mutagen || 0,
    rank: response.rank
  };
}

// ─────────────────────────────────────────────────────────────────────
// TRADER INFO
// ─────────────────────────────────────────────────────────────────────

export interface TraderInfo {
  wallet: string;
  totalVolume: number;
  totalTrades: number;
  winRate: number;
  pnl: number;
}

export async function getTraderInfo(wallet: string): Promise<TraderInfo> {
  const api = getAdrenaApi();
  const response = await api.getTraderInfo({ wallet });
  return {
    wallet,
    totalVolume: response.volume || 0,
    totalTrades: response.trades || 0,
    winRate: response.winRate || 0,
    pnl: response.pnl || 0
  };
}
```

## 3.2 SDK Methods Used

| Method | Purpose in Royale |
|--------|-------------------|
| `getPositions({ wallet })` | Track trades per round |
| `getMutagen({ wallet })` | Validate Mutagen entry balance |
| `getTraderInfo({ wallet })` | Profile stats display |
| `getTraderVolume({ wallet })` | Tiebreaker scoring |
| `getMutagenLeaderboard()` | Reference existing rankings |
| `getLastTradingPrices()` | Display current prices |

---

# 4. Database Schema

## 4.1 Prisma Schema

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════════════
// TOURNAMENTS
// ═══════════════════════════════════════════════════════════════════════

model Tournament {
  id                String   @id @default(cuid())
  name              String
  description       String?
  status            TournamentStatus @default(SCHEDULED)

  // Entry configuration
  entryType         EntryType @default(FREE)
  entryFeeSol       Float?    // If SOL_STAKE
  entryFeeMutagen   Int?      // If MUTAGEN_COMMIT

  // Timing
  scheduledStart    DateTime
  entryDeadline     DateTime
  actualStart       DateTime?
  actualEnd         DateTime?

  // Rounds configuration (JSON for flexibility)
  // Format: [{ duration: 360, eliminationPercent: 0.25 }, ...]
  roundConfigs      Json      @default("[]")
  currentRound      Int       @default(0)

  // Participant limits
  minParticipants   Int       @default(20)
  maxParticipants   Int       @default(256)

  // Scoring config
  minNotionalSize   Float     @default(100)
  snipePenaltyMins  Int       @default(5)

  // Relations
  participants      Participant[]
  rounds            Round[]

  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([status])
  @@index([scheduledStart])
}

enum TournamentStatus {
  SCHEDULED
  ENTRY_OPEN
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum EntryType {
  FREE              // Just register wallet
  WHITELIST         // Must be on whitelist
  SOL_STAKE         // Send SOL to treasury
  MUTAGEN_COMMIT    // Have minimum Mutagen balance
}

// ═══════════════════════════════════════════════════════════════════════
// PARTICIPANTS
// ═══════════════════════════════════════════════════════════════════════

model Participant {
  id              String      @id @default(cuid())
  tournamentId    String
  wallet          String

  // Entry details
  entryTxHash     String?     // SOL stake transaction
  mutagenCommit   Int?        // Mutagen amount committed
  enteredAt       DateTime    @default(now())

  // Status
  isEliminated    Boolean     @default(false)
  eliminatedAt    Int?        // Round number
  eliminationReason EliminationReason?
  finalRank       Int?

  // Power-ups (calculated from streaks)
  shields         Int         @default(0)

  // Relations
  tournament      Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  roundScores     RoundScore[]

  @@unique([tournamentId, wallet])
  @@index([wallet])
  @@index([tournamentId, isEliminated])
}

enum EliminationReason {
  SCORE           // Bottom percentile
  INACTIVE        // No trades in round
  DISQUALIFIED    // Manual DQ
}

// ═══════════════════════════════════════════════════════════════════════
// ROUNDS
// ═══════════════════════════════════════════════════════════════════════

model Round {
  id              String      @id @default(cuid())
  tournamentId    String
  roundNumber     Int

  // Timing
  startTime       DateTime?
  endTime         DateTime?
  durationMins    Int

  // Status
  phase           RoundPhase  @default(PENDING)

  // Results
  participantsAtStart Int?
  eliminationTarget   Int?
  actualEliminations  Int?

  // Relations
  tournament      Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  scores          RoundScore[]

  @@unique([tournamentId, roundNumber])
}

enum RoundPhase {
  PENDING
  ACTIVE
  SCORING
  ELIMINATING
  COMPLETE
}

// ═══════════════════════════════════════════════════════════════════════
// ROUND SCORES
// ═══════════════════════════════════════════════════════════════════════

model RoundScore {
  id              String      @id @default(cuid())
  tournamentId    String
  roundNumber     Int
  participantId   String
  wallet          String

  // Scores
  rawScore        Float       @default(0)
  finalScore      Float       @default(0)

  // Stats
  tradesCount     Int         @default(0)
  totalVolume     Float       @default(0)
  totalPnl        Float       @default(0)

  // Ranking
  rank            Int?

  // Outcome
  isEliminated    Boolean     @default(false)
  usedShield      Boolean     @default(false)

  // Trade details (JSON array of individual trade scores)
  trades          Json        @default("[]")

  // Relations
  participant     Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  round           Round       @relation(fields: [tournamentId, roundNumber], references: [tournamentId, roundNumber], onDelete: Cascade)

  @@unique([tournamentId, roundNumber, wallet])
  @@index([tournamentId, roundNumber, finalScore(sort: Desc)])
}

// ═══════════════════════════════════════════════════════════════════════
// STREAKS (Self-Tracked)
// ═══════════════════════════════════════════════════════════════════════

model UserStreak {
  id                  String    @id @default(cuid())
  wallet              String    @unique

  currentDailyStreak  Int       @default(0)
  longestDailyStreak  Int       @default(0)
  lastTradeDate       DateTime?

  // Calculated shields
  shieldsEarned       Int       @default(0)

  updatedAt           DateTime  @updatedAt

  @@index([wallet])
}

// ═══════════════════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════════════════

model Badge {
  id              String      @id @default(cuid())
  badgeType       String      // 'royale_champion', 'survivor_10', etc.
  wallet          String

  // Context
  tournamentId    String?     // If earned in specific tournament
  awardedAt       DateTime    @default(now())

  // NFT upgrade (future)
  nftMint         String?

  @@unique([badgeType, wallet])
  @@index([wallet])
}

// ═══════════════════════════════════════════════════════════════════════
// SOL ENTRY TRACKING
// ═══════════════════════════════════════════════════════════════════════

model EntryPayment {
  id              String      @id @default(cuid())
  tournamentId    String
  wallet          String

  txHash          String      @unique
  amount          Float       // SOL amount
  status          PaymentStatus @default(PENDING)

  processedAt     DateTime?
  createdAt       DateTime    @default(now())

  @@index([tournamentId, wallet])
  @@index([status])
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  REFUNDED
  FAILED
}

// ═══════════════════════════════════════════════════════════════════════
// ADMIN AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════

model AdminAction {
  id          String    @id @default(cuid())
  adminWallet String
  action      String
  targetType  String?   // 'tournament', 'participant'
  targetId    String?
  details     Json?
  createdAt   DateTime  @default(now())

  @@index([adminWallet])
  @@index([createdAt(sort: Desc)])
}
```

## 4.2 Initial Migration

```bash
# Generate and run migration
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

---

# 5. Core Engine

## 5.1 Scoring Engine

```typescript
// apps/api/src/services/scoring.ts

import { PositionData, getClosedPositionsInTimeRange } from './adrena';
import { prisma } from '../db/client';

// ─────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────

export interface ScoringConfig {
  minNotionalSize: number;      // Default: 100 USD
  snipePenaltyMins: number;     // Default: 5 minutes
  snipePenaltyMultiplier: number; // Default: 0.5
  maxDurationBonus: number;     // Default: 1.5
  convictionThresholdMins: number; // Default: 120
}

const DEFAULT_CONFIG: ScoringConfig = {
  minNotionalSize: 100,
  snipePenaltyMins: 5,
  snipePenaltyMultiplier: 0.5,
  maxDurationBonus: 1.5,
  convictionThresholdMins: 120
};

// ─────────────────────────────────────────────────────────────────────
// TRADE SCORE CALCULATION
// ─────────────────────────────────────────────────────────────────────

export interface TradeScore {
  positionId: string;
  pair: string;
  side: 'long' | 'short';

  // Raw data
  size: number;
  collateral: number;
  pnl: number;
  durationMins: number;

  // Calculated
  riskAdjustedReturn: number;
  durationMultiplier: number;
  finalScore: number;

  // Flags
  excluded: boolean;
  exclusionReason?: 'below_min_size' | 'wash_trade';
}

export function calculateTradeScore(
  position: PositionData,
  config: ScoringConfig = DEFAULT_CONFIG
): TradeScore {
  const size = position.size_usd;
  const collateral = position.collateral_usd;
  const pnl = position.pnl ?? (position.unrealized_profit_usd - position.unrealized_loss_usd);
  const durationMins = position.close_time
    ? (position.close_time - position.open_time) / 60000
    : 0;

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Exclusion Checks
  // ─────────────────────────────────────────────────────────────────

  // Below minimum notional
  if (size < config.minNotionalSize) {
    return {
      positionId: `${position.wallet}-${position.open_time}`,
      pair: position.custody,
      side: position.side,
      size,
      collateral,
      pnl,
      durationMins,
      riskAdjustedReturn: 0,
      durationMultiplier: 0,
      finalScore: 0,
      excluded: true,
      exclusionReason: 'below_min_size'
    };
  }

  // Wash trade detection (< 1 min, < 0.1% P&L)
  const pnlPercent = Math.abs(pnl / size);
  if (durationMins < 1 && pnlPercent < 0.001) {
    return {
      positionId: `${position.wallet}-${position.open_time}`,
      pair: position.custody,
      side: position.side,
      size,
      collateral,
      pnl,
      durationMins,
      riskAdjustedReturn: 0,
      durationMultiplier: 0,
      finalScore: 0,
      excluded: true,
      exclusionReason: 'wash_trade'
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Risk-Adjusted Return
  // ─────────────────────────────────────────────────────────────────

  // P&L as percentage of position size (not collateral, to normalize leverage)
  const riskAdjustedReturn = pnl / size;

  // ─────────────────────────────────────────────────────────────────
  // Step 3: Duration Multiplier (Anti-Sniping)
  // ─────────────────────────────────────────────────────────────────

  let durationMultiplier: number;

  if (durationMins < config.snipePenaltyMins) {
    // Penalty for scalps
    durationMultiplier = config.snipePenaltyMultiplier;
  } else if (durationMins >= config.convictionThresholdMins) {
    // Max bonus for conviction
    durationMultiplier = config.maxDurationBonus;
  } else {
    // Linear interpolation between 1.0 and max
    const progress = (durationMins - config.snipePenaltyMins) /
                     (config.convictionThresholdMins - config.snipePenaltyMins);
    durationMultiplier = 1.0 + (progress * (config.maxDurationBonus - 1.0));
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 4: Final Score
  // ─────────────────────────────────────────────────────────────────

  const finalScore = riskAdjustedReturn * durationMultiplier;

  return {
    positionId: `${position.wallet}-${position.open_time}`,
    pair: position.custody,
    side: position.side,
    size,
    collateral,
    pnl,
    durationMins,
    riskAdjustedReturn,
    durationMultiplier,
    finalScore,
    excluded: false
  };
}

// ─────────────────────────────────────────────────────────────────────
// ROUND SCORE CALCULATION
// ─────────────────────────────────────────────────────────────────────

export interface RoundScoreResult {
  wallet: string;
  trades: TradeScore[];
  rawScore: number;
  finalScore: number;
  tradesCount: number;
  totalVolume: number;
  totalPnl: number;
}

export async function calculateRoundScore(
  wallet: string,
  roundStartTime: number,
  roundEndTime: number,
  config: ScoringConfig = DEFAULT_CONFIG
): Promise<RoundScoreResult> {
  // Fetch closed positions in round window
  const positions = await getClosedPositionsInTimeRange(
    wallet,
    roundStartTime,
    roundEndTime
  );

  // Score each trade
  const trades = positions.map(p => calculateTradeScore(p, config));

  // Aggregate
  const validTrades = trades.filter(t => !t.excluded);
  const rawScore = validTrades.reduce((sum, t) => sum + t.finalScore, 0);

  return {
    wallet,
    trades,
    rawScore,
    finalScore: rawScore, // Power-ups would multiply here
    tradesCount: validTrades.length,
    totalVolume: validTrades.reduce((sum, t) => sum + t.size, 0),
    totalPnl: validTrades.reduce((sum, t) => sum + t.pnl, 0)
  };
}
```

## 5.2 Elimination Processor

```typescript
// apps/api/src/services/elimination.ts

import { prisma } from '../db/client';
import { RoundScoreResult } from './scoring';

export interface EliminationResult {
  survivorCount: number;
  eliminatedCount: number;

  eliminated: {
    wallet: string;
    rank: number;
    score: number;
    reason: 'score' | 'inactive';
  }[];

  shieldSaves: {
    wallet: string;
    wouldHaveRank: number;
  }[];

  survivors: {
    wallet: string;
    rank: number;
    score: number;
  }[];
}

export async function processEliminations(
  tournamentId: string,
  roundNumber: number,
  eliminationPercent: number
): Promise<EliminationResult> {
  // ─────────────────────────────────────────────────────────────────
  // Step 1: Get all scores for this round
  // ─────────────────────────────────────────────────────────────────

  const scores = await prisma.roundScore.findMany({
    where: { tournamentId, roundNumber },
    include: { participant: true },
    orderBy: { finalScore: 'desc' }
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Identify inactive (0 trades)
  // ─────────────────────────────────────────────────────────────────

  const inactive = scores.filter(s => s.tradesCount === 0);
  const active = scores.filter(s => s.tradesCount > 0);

  // ─────────────────────────────────────────────────────────────────
  // Step 3: Rank active participants
  // ─────────────────────────────────────────────────────────────────

  // Sort by score, then by volume (tiebreaker)
  active.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    return b.totalVolume - a.totalVolume;
  });

  // Assign ranks
  active.forEach((score, index) => {
    score.rank = index + 1;
  });

  // ─────────────────────────────────────────────────────────────────
  // Step 4: Calculate elimination line
  // ─────────────────────────────────────────────────────────────────

  const totalActive = active.length;
  const eliminationCount = Math.floor(totalActive * eliminationPercent);
  const survivalRank = totalActive - eliminationCount;

  // ─────────────────────────────────────────────────────────────────
  // Step 5: Process eliminations and shields
  // ─────────────────────────────────────────────────────────────────

  const eliminated: EliminationResult['eliminated'] = [];
  const shieldSaves: EliminationResult['shieldSaves'] = [];
  const survivors: EliminationResult['survivors'] = [];

  // Process inactive first (always eliminated)
  for (const score of inactive) {
    eliminated.push({
      wallet: score.wallet,
      rank: active.length + 1, // Below all active
      score: 0,
      reason: 'inactive'
    });

    await prisma.participant.update({
      where: { id: score.participantId },
      data: {
        isEliminated: true,
        eliminatedAt: roundNumber,
        eliminationReason: 'INACTIVE'
      }
    });
  }

  // Process active by rank
  for (const score of active) {
    if (score.rank! <= survivalRank) {
      // Survives
      survivors.push({
        wallet: score.wallet,
        rank: score.rank!,
        score: score.finalScore
      });
    } else {
      // In danger zone - check for shield
      const participant = score.participant;

      if (participant.shields > 0) {
        // Shield saves them
        shieldSaves.push({
          wallet: score.wallet,
          wouldHaveRank: score.rank!
        });

        await prisma.participant.update({
          where: { id: participant.id },
          data: { shields: participant.shields - 1 }
        });

        await prisma.roundScore.update({
          where: { id: score.id },
          data: { usedShield: true }
        });

        survivors.push({
          wallet: score.wallet,
          rank: score.rank!,
          score: score.finalScore
        });
      } else {
        // Eliminated
        eliminated.push({
          wallet: score.wallet,
          rank: score.rank!,
          score: score.finalScore,
          reason: 'score'
        });

        await prisma.participant.update({
          where: { id: participant.id },
          data: {
            isEliminated: true,
            eliminatedAt: roundNumber,
            eliminationReason: 'SCORE'
          }
        });
      }
    }

    // Update rank in score record
    await prisma.roundScore.update({
      where: { id: score.id },
      data: { rank: score.rank, isEliminated: score.rank! > survivalRank && participant.shields === 0 }
    });
  }

  return {
    survivorCount: survivors.length,
    eliminatedCount: eliminated.length,
    eliminated,
    shieldSaves,
    survivors
  };
}
```

## 5.3 Streak Calculator

```typescript
// apps/api/src/services/streaks.ts

import { getWalletPositions } from './adrena';
import { prisma } from '../db/client';

export interface StreakData {
  wallet: string;
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastTradeDate: Date | null;
  shieldsEarned: number;
}

export async function calculateStreaks(wallet: string): Promise<StreakData> {
  // Fetch all positions from SDK
  const positions = await getWalletPositions(wallet);

  // Filter to closed positions only
  const closedPositions = positions.filter(p => p.close_time);

  if (closedPositions.length === 0) {
    return {
      wallet,
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      lastTradeDate: null,
      shieldsEarned: 0
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Group trades by day (UTC)
  // ─────────────────────────────────────────────────────────────────

  const tradesByDay = new Map<string, number>();

  for (const pos of closedPositions) {
    const day = new Date(pos.close_time!).toISOString().split('T')[0];
    tradesByDay.set(day, (tradesByDay.get(day) || 0) + 1);
  }

  // ─────────────────────────────────────────────────────────────────
  // Calculate current streak (consecutive days ending today or yesterday)
  // ─────────────────────────────────────────────────────────────────

  const sortedDays = Array.from(tradesByDay.keys()).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let checkDate = sortedDays[0] === today || sortedDays[0] === yesterday
    ? new Date(sortedDays[0])
    : null;

  if (checkDate) {
    while (true) {
      const dayKey = checkDate.toISOString().split('T')[0];
      if (tradesByDay.has(dayKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Calculate longest streak ever
  // ─────────────────────────────────────────────────────────────────

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDay: Date | null = null;

  for (const dayStr of sortedDays.reverse()) {
    const day = new Date(dayStr);

    if (prevDay === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((prevDay.getTime() - day.getTime()) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    prevDay = day;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // ─────────────────────────────────────────────────────────────────
  // Calculate shields (7-day = 1, 30-day = 2)
  // ─────────────────────────────────────────────────────────────────

  let shields = 0;
  if (currentStreak >= 7) shields += 1;
  if (currentStreak >= 30) shields += 1;

  const lastTradeTime = Math.max(...closedPositions.map(p => p.close_time!));

  return {
    wallet,
    currentDailyStreak: currentStreak,
    longestDailyStreak: longestStreak,
    lastTradeDate: new Date(lastTradeTime),
    shieldsEarned: shields
  };
}

// ─────────────────────────────────────────────────────────────────────
// BATCH UPDATE JOB (Run daily)
// ─────────────────────────────────────────────────────────────────────

export async function updateAllStreaks(): Promise<void> {
  // Get all unique wallets that have participated
  const participants = await prisma.participant.findMany({
    select: { wallet: true },
    distinct: ['wallet']
  });

  for (const { wallet } of participants) {
    try {
      const streaks = await calculateStreaks(wallet);

      await prisma.userStreak.upsert({
        where: { wallet },
        create: {
          wallet,
          currentDailyStreak: streaks.currentDailyStreak,
          longestDailyStreak: streaks.longestDailyStreak,
          lastTradeDate: streaks.lastTradeDate,
          shieldsEarned: streaks.shieldsEarned
        },
        update: {
          currentDailyStreak: streaks.currentDailyStreak,
          longestDailyStreak: streaks.longestDailyStreak,
          lastTradeDate: streaks.lastTradeDate,
          shieldsEarned: streaks.shieldsEarned
        }
      });
    } catch (error) {
      console.error(`Failed to update streaks for ${wallet}:`, error);
    }
  }
}
```

## 5.4 Round Processor (THE CRITICAL JOB)

```typescript
// apps/api/src/jobs/roundProcessor.ts

import { prisma } from '../db/client';
import { calculateRoundScore } from '../services/scoring';
import { processEliminations } from '../services/elimination';
import { checkAndAwardBadges } from '../services/badges';

// ─────────────────────────────────────────────────────────────────────
// ROUND LIFECYCLE STATE MACHINE
// ─────────────────────────────────────────────────────────────────────

/*
 * Round phases:
 * PENDING → ACTIVE → SCORING → ELIMINATING → COMPLETE
 *
 * This job runs every 30 seconds and advances phases as needed.
 */

export async function processActiveRounds(): Promise<void> {
  // Get all active tournaments
  const activeTournaments = await prisma.tournament.findMany({
    where: { status: 'ACTIVE' },
    include: {
      rounds: { where: { phase: { not: 'COMPLETE' } } },
      participants: { where: { isEliminated: false } }
    }
  });

  for (const tournament of activeTournaments) {
    try {
      await processTournamentRound(tournament);
    } catch (error) {
      console.error(`Error processing tournament ${tournament.id}:`, error);
      // Continue with other tournaments - don't let one failure stop all
    }
  }
}

async function processTournamentRound(tournament: any): Promise<void> {
  const currentRound = tournament.rounds.find(
    (r: any) => r.roundNumber === tournament.currentRound
  );

  if (!currentRound) return;

  const now = Date.now();
  const roundEndTime = currentRound.startTime
    ? new Date(currentRound.startTime).getTime() + currentRound.durationMins * 60000
    : null;

  switch (currentRound.phase) {
    case 'PENDING':
      // Should not happen for current round, but handle gracefully
      await startRound(tournament.id, currentRound.roundNumber);
      break;

    case 'ACTIVE':
      // Check if round time has elapsed
      if (roundEndTime && now >= roundEndTime) {
        await transitionToScoring(tournament.id, currentRound.roundNumber);
      }
      break;

    case 'SCORING':
      // Score all participants, then move to elimination
      await scoreAllParticipants(tournament, currentRound);
      await transitionToEliminating(tournament.id, currentRound.roundNumber);
      break;

    case 'ELIMINATING':
      // Process eliminations, then complete round
      await runEliminations(tournament, currentRound);
      await completeRound(tournament, currentRound);
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────
// PHASE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────

async function startRound(tournamentId: string, roundNumber: number): Promise<void> {
  await prisma.round.update({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    data: {
      phase: 'ACTIVE',
      startTime: new Date()
    }
  });
  console.log(`Round ${roundNumber} started for tournament ${tournamentId}`);
}

async function transitionToScoring(tournamentId: string, roundNumber: number): Promise<void> {
  await prisma.round.update({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    data: {
      phase: 'SCORING',
      endTime: new Date()
    }
  });
  console.log(`Round ${roundNumber} moved to SCORING for tournament ${tournamentId}`);
}

async function transitionToEliminating(tournamentId: string, roundNumber: number): Promise<void> {
  await prisma.round.update({
    where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    data: { phase: 'ELIMINATING' }
  });
}

async function scoreAllParticipants(tournament: any, round: any): Promise<void> {
  const roundStart = new Date(round.startTime).getTime();
  const roundEnd = new Date(round.endTime).getTime();

  for (const participant of tournament.participants) {
    try {
      const scoreResult = await calculateRoundScore(
        participant.wallet,
        roundStart,
        roundEnd
      );

      await prisma.roundScore.upsert({
        where: {
          tournamentId_roundNumber_wallet: {
            tournamentId: tournament.id,
            roundNumber: round.roundNumber,
            wallet: participant.wallet
          }
        },
        create: {
          tournamentId: tournament.id,
          roundNumber: round.roundNumber,
          participantId: participant.id,
          wallet: participant.wallet,
          rawScore: scoreResult.rawScore,
          finalScore: scoreResult.finalScore,
          tradesCount: scoreResult.tradesCount,
          totalVolume: scoreResult.totalVolume,
          totalPnl: scoreResult.totalPnl,
          trades: scoreResult.trades as any
        },
        update: {
          rawScore: scoreResult.rawScore,
          finalScore: scoreResult.finalScore,
          tradesCount: scoreResult.tradesCount,
          totalVolume: scoreResult.totalVolume,
          totalPnl: scoreResult.totalPnl,
          trades: scoreResult.trades as any
        }
      });
    } catch (error) {
      console.error(`Failed to score ${participant.wallet}:`, error);
      // Create zero-score entry so they're marked inactive
      await prisma.roundScore.upsert({
        where: {
          tournamentId_roundNumber_wallet: {
            tournamentId: tournament.id,
            roundNumber: round.roundNumber,
            wallet: participant.wallet
          }
        },
        create: {
          tournamentId: tournament.id,
          roundNumber: round.roundNumber,
          participantId: participant.id,
          wallet: participant.wallet,
          rawScore: 0,
          finalScore: 0,
          tradesCount: 0,
          totalVolume: 0,
          totalPnl: 0,
          trades: []
        },
        update: {} // Don't overwrite if exists
      });
    }
  }
}

async function runEliminations(tournament: any, round: any): Promise<void> {
  const roundConfig = (tournament.roundConfigs as any[])[round.roundNumber - 1];
  const eliminationPercent = roundConfig?.eliminationPercent || 0.25;

  // Final round has no eliminations
  if (eliminationPercent === 0) return;

  await processEliminations(tournament.id, round.roundNumber, eliminationPercent);
}

async function completeRound(tournament: any, round: any): Promise<void> {
  const roundConfigs = tournament.roundConfigs as any[];
  const isLastRound = round.roundNumber >= roundConfigs.length;

  if (isLastRound) {
    // Tournament complete - finalize rankings and award badges
    await finalizeTournament(tournament);
  } else {
    // Advance to next round
    await prisma.$transaction([
      prisma.round.update({
        where: {
          tournamentId_roundNumber: {
            tournamentId: tournament.id,
            roundNumber: round.roundNumber
          }
        },
        data: { phase: 'COMPLETE' }
      }),
      prisma.tournament.update({
        where: { id: tournament.id },
        data: { currentRound: round.roundNumber + 1 }
      }),
      prisma.round.create({
        data: {
          tournamentId: tournament.id,
          roundNumber: round.roundNumber + 1,
          phase: 'ACTIVE',
          startTime: new Date(),
          durationMins: roundConfigs[round.roundNumber].duration,
          participantsAtStart: tournament.participants.filter((p: any) => !p.isEliminated).length
        }
      })
    ]);
  }
}

async function finalizeTournament(tournament: any): Promise<void> {
  // Get final standings
  const finalScores = await prisma.roundScore.findMany({
    where: {
      tournamentId: tournament.id,
      roundNumber: tournament.currentRound
    },
    orderBy: { finalScore: 'desc' },
    include: { participant: true }
  });

  // Assign final ranks and award badges
  for (let i = 0; i < finalScores.length; i++) {
    const score = finalScores[i];
    const finalRank = i + 1;

    await prisma.participant.update({
      where: { id: score.participantId },
      data: { finalRank }
    });

    // Award badges
    const participationCount = await prisma.participant.count({
      where: { wallet: score.wallet }
    });

    await checkAndAwardBadges({
      tournamentId: tournament.id,
      wallet: score.wallet,
      finalRank,
      participationCount,
      usedShield: score.usedShield,
      hadComebackMoment: false // TODO: track this during rounds
    });
  }

  // Mark tournament complete
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      status: 'COMPLETED',
      actualEnd: new Date()
    }
  });

  console.log(`Tournament ${tournament.id} completed!`);
}

// ─────────────────────────────────────────────────────────────────────
// CRON ENTRY POINT
// ─────────────────────────────────────────────────────────────────────

// Run every 30 seconds
// In apps/api/src/index.ts:
// import cron from 'node-cron';
// cron.schedule('*/30 * * * * *', processActiveRounds);
```

## 5.5 Shield Assignment

```typescript
// apps/api/src/services/shields.ts

import { prisma } from '../db/client';
import { calculateStreaks } from './streaks';

// ─────────────────────────────────────────────────────────────────────
// SHIELD RULES
// ─────────────────────────────────────────────────────────────────────

/*
 * Shields are assigned at TOURNAMENT START based on current streak:
 * - 7-day streak = 1 Shield
 * - 30-day streak = 2 Shields (cumulative)
 *
 * Shields are NOT refreshed during the tournament.
 */

export async function assignShieldsAtTournamentStart(tournamentId: string): Promise<void> {
  const participants = await prisma.participant.findMany({
    where: { tournamentId }
  });

  for (const participant of participants) {
    try {
      // Get current streak (calculated from SDK position history)
      const streaks = await calculateStreaks(participant.wallet);

      let shields = 0;
      if (streaks.currentDailyStreak >= 7) shields += 1;
      if (streaks.currentDailyStreak >= 30) shields += 1;

      await prisma.participant.update({
        where: { id: participant.id },
        data: { shields }
      });

      console.log(`Assigned ${shields} shields to ${participant.wallet}`);
    } catch (error) {
      console.error(`Failed to assign shields for ${participant.wallet}:`, error);
      // Continue - they just get 0 shields
    }
  }
}

// Call this from admin start tournament endpoint:
// await assignShieldsAtTournamentStart(tournamentId);
```

## 5.6 Position Eligibility Rules

```typescript
// apps/api/src/services/scoring.ts (additions)

// ─────────────────────────────────────────────────────────────────────
// POSITION ELIGIBILITY RULES
// ─────────────────────────────────────────────────────────────────────

/*
 * RULE: Only positions that CLOSE within the round window are scored.
 *
 * Cases:
 * 1. Opens AND closes within round → ELIGIBLE (close_time in window)
 * 2. Opens before round, closes within round → ELIGIBLE (close_time in window)
 * 3. Opens within round, closes after round → NOT ELIGIBLE (close_time outside)
 * 4. Opens before tournament, closes within round → ELIGIBLE (close_time in window)
 * 5. Position still open at round end → NOT ELIGIBLE (no close_time)
 *
 * This is consistent with Adrena's own Mutagen rules:
 * "Only closed trades count toward competition rankings"
 */

export function isPositionEligibleForRound(
  position: PositionData,
  roundStartMs: number,
  roundEndMs: number
): boolean {
  // Must have a close time
  if (!position.close_time) return false;

  // Close time must be within round window
  return position.close_time >= roundStartMs && position.close_time <= roundEndMs;
}

// Updated getClosedPositionsInTimeRange:
export async function getClosedPositionsInTimeRange(
  wallet: string,
  startTime: number,
  endTime: number
): Promise<PositionData[]> {
  const api = getAdrenaApi();

  // Request CLOSED positions specifically
  const response = await api.getPositions({
    user_wallet: wallet,
    status: ['CLOSED', 'LIQUIDATED'], // Only closed/liquidated
  });

  const positions = mapApiResponse(response.data || []);

  // Filter to those closing within our time window
  return positions.filter(p => isPositionEligibleForRound(p, startTime, endTime));
}

// Map API response to our PositionData interface
function mapApiResponse(apiPositions: any[]): PositionData[] {
  return apiPositions.map(p => ({
    wallet: p.user_wallet || p.pubkey,
    pool: p.symbol,
    custody: p.symbol,
    side: p.side as 'long' | 'short',
    size_usd: p.entry_size * p.entry_price,
    collateral_usd: p.entry_collateral_amount,
    entry_price: p.entry_price,
    current_price: p.exit_price || p.entry_price,
    unrealized_profit_usd: p.pnl > 0 ? p.pnl : 0,
    unrealized_loss_usd: p.pnl < 0 ? Math.abs(p.pnl) : 0,
    open_time: new Date(p.entry_date).getTime(),
    close_time: p.exit_date ? new Date(p.exit_date).getTime() : undefined,
    pnl: p.pnl
  }));
}
```

## 5.7 SDK Error Handling

```typescript
// apps/api/src/services/adrena.ts (updated with error handling)

import { AdrenaApi } from 'adrena-sdk-ts';

let apiInstance: AdrenaApi | null = null;
let lastSuccessfulFetch: Map<string, { data: any; timestamp: number }> = new Map();

const CACHE_TTL_MS = 60000; // 1 minute cache for failed requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export function getAdrenaApi(): AdrenaApi {
  if (!apiInstance) {
    apiInstance = new AdrenaApi(process.env.ADRENA_API_BASE_URL);
  }
  return apiInstance;
}

// ─────────────────────────────────────────────────────────────────────
// RESILIENT POSITION FETCHING
// ─────────────────────────────────────────────────────────────────────

export async function getWalletPositionsSafe(wallet: string): Promise<{
  positions: PositionData[];
  fromCache: boolean;
  error?: string;
}> {
  const cacheKey = `positions:${wallet}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const api = getAdrenaApi();
      const response = await api.getPositions({
        user_wallet: wallet,
        status: ['CLOSED', 'LIQUIDATED']
      });

      const positions = mapApiResponse(response.data || []);

      // Update cache on success
      lastSuccessfulFetch.set(cacheKey, {
        data: positions,
        timestamp: Date.now()
      });

      return { positions, fromCache: false };

    } catch (error: any) {
      console.warn(`SDK fetch attempt ${attempt}/${MAX_RETRIES} failed for ${wallet}:`, error.message);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
        continue;
      }

      // All retries failed - check cache
      const cached = lastSuccessfulFetch.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.warn(`Using cached data for ${wallet} (${Date.now() - cached.timestamp}ms old)`);
        return {
          positions: cached.data,
          fromCache: true,
          error: `SDK unavailable, using cached data`
        };
      }

      // No cache available - return empty with error
      return {
        positions: [],
        fromCache: false,
        error: `SDK unavailable: ${error.message}`
      };
    }
  }

  return { positions: [], fromCache: false, error: 'Unknown error' };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────
// MUTAGEN WITH FALLBACK
// ─────────────────────────────────────────────────────────────────────

export async function getWalletMutagenSafe(wallet: string): Promise<{
  mutagen: MutagenData;
  error?: string;
}> {
  try {
    const api = getAdrenaApi();
    const response = await api.getMutagen({ wallet });
    return {
      mutagen: {
        wallet,
        balance: response.mutagen || 0,
        rank: response.rank
      }
    };
  } catch (error: any) {
    console.error(`Failed to fetch Mutagen for ${wallet}:`, error.message);
    return {
      mutagen: { wallet, balance: 0 },
      error: `Could not verify Mutagen balance: ${error.message}`
    };
  }
}
```

---

# 5.8 Authentication Middleware

```typescript
// apps/api/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ─────────────────────────────────────────────────────────────────────
// WALLET SIGNATURE VERIFICATION
// ─────────────────────────────────────────────────────────────────────

/*
 * Frontend signs a message like:
 * "Adrena Royale: Register for tournament <id> at <timestamp>"
 *
 * Then sends:
 * - X-Wallet: base58 public key
 * - X-Signature: base64 encoded signature
 * - X-Message: the original message
 */

export interface AuthenticatedRequest extends Request {
  wallet?: string;
}

export async function verifyWalletSignature(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const walletHeader = req.headers['x-wallet'] as string;
  const signatureHeader = req.headers['x-signature'] as string;
  const messageHeader = req.headers['x-message'] as string;

  if (!walletHeader || !signatureHeader || !messageHeader) {
    res.status(401).json({ error: 'Missing authentication headers' });
    return;
  }

  try {
    // Decode wallet public key
    const publicKey = new PublicKey(walletHeader);
    const publicKeyBytes = publicKey.toBytes();

    // Decode signature
    const signature = Buffer.from(signatureHeader, 'base64');

    // Encode message
    const messageBytes = new TextEncoder().encode(messageHeader);

    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signature,
      publicKeyBytes
    );

    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Check message freshness (within 5 minutes)
    const timestampMatch = messageHeader.match(/at (\d+)$/);
    if (timestampMatch) {
      const messageTime = parseInt(timestampMatch[1], 10);
      const now = Date.now();
      if (Math.abs(now - messageTime) > 5 * 60 * 1000) {
        res.status(401).json({ error: 'Message expired' });
        return;
      }
    }

    // Attach wallet to request
    req.wallet = walletHeader;
    req.body.wallet = walletHeader; // Also add to body for convenience

    next();
  } catch (error: any) {
    res.status(401).json({ error: `Authentication failed: ${error.message}` });
  }
}

// ─────────────────────────────────────────────────────────────────────
// ADMIN WALLET CHECK
// ─────────────────────────────────────────────────────────────────────

const ADMIN_WALLETS = new Set(
  (process.env.ADMIN_WALLETS || '').split(',').filter(Boolean)
);

export interface AdminRequest extends AuthenticatedRequest {
  adminWallet?: string;
}

export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // First verify the signature
  await verifyWalletSignature(req, res, () => {
    // Check if wallet is admin
    if (!req.wallet || !ADMIN_WALLETS.has(req.wallet)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.adminWallet = req.wallet;
    next();
  });
}
```

---

# 6. Entry Systems

## 6.1 SOL Stake Entry (Multisig Approach)

```typescript
// apps/api/src/services/entry.ts

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { prisma } from '../db/client';

const TREASURY_WALLET = new PublicKey(process.env.TREASURY_WALLET!);
const connection = new Connection(process.env.SOLANA_RPC_URL!);

// ─────────────────────────────────────────────────────────────────────
// WATCH FOR SOL PAYMENTS
// ─────────────────────────────────────────────────────────────────────

export async function watchEntryPayments(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament || tournament.entryType !== 'SOL_STAKE') {
    return;
  }

  // Get recent transactions to treasury
  const signatures = await connection.getSignaturesForAddress(
    TREASURY_WALLET,
    { limit: 100 }
  );

  for (const sig of signatures) {
    // Skip if already processed
    const existing = await prisma.entryPayment.findUnique({
      where: { txHash: sig.signature }
    });
    if (existing) continue;

    // Parse transaction
    const tx = await connection.getParsedTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) continue;

    const entry = parseEntryTransaction(tx, tournament.entryFeeSol!);
    if (!entry) continue;

    // Check memo contains tournament ID
    if (!entry.memo?.includes(tournamentId)) continue;

    // Record payment
    await prisma.entryPayment.create({
      data: {
        tournamentId,
        wallet: entry.sender,
        txHash: sig.signature,
        amount: entry.amount,
        status: 'CONFIRMED'
      }
    });

    // Create participant
    await prisma.participant.upsert({
      where: {
        tournamentId_wallet: {
          tournamentId,
          wallet: entry.sender
        }
      },
      create: {
        tournamentId,
        wallet: entry.sender,
        entryTxHash: sig.signature
      },
      update: {
        entryTxHash: sig.signature
      }
    });

    console.log(`Entry confirmed: ${entry.sender} for tournament ${tournamentId}`);
  }
}

interface ParsedEntry {
  sender: string;
  amount: number;
  memo?: string;
}

function parseEntryTransaction(
  tx: ParsedTransactionWithMeta,
  expectedAmount: number
): ParsedEntry | null {
  try {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed?.type === 'transfer') {
        const info = ix.parsed.info;

        // Check destination is treasury
        if (info.destination !== TREASURY_WALLET.toString()) continue;

        // Check amount (with small tolerance for fees)
        const lamports = info.lamports;
        const sol = lamports / 1e9;
        if (Math.abs(sol - expectedAmount) > 0.001) continue;

        return {
          sender: info.source,
          amount: sol,
          memo: extractMemo(tx)
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractMemo(tx: ParsedTransactionWithMeta): string | undefined {
  for (const ix of tx.transaction.message.instructions) {
    if ('parsed' in ix && ix.program === 'spl-memo') {
      return ix.parsed;
    }
  }
  return undefined;
}
```

## 6.2 Mutagen Commitment Entry

```typescript
// apps/api/src/services/entry.ts (continued)

import { getWalletMutagen } from './adrena';

// ─────────────────────────────────────────────────────────────────────
// MUTAGEN BALANCE GATE
// ─────────────────────────────────────────────────────────────────────

export async function validateMutagenEntry(
  wallet: string,
  tournamentId: string,
  requiredAmount: number
): Promise<{ valid: boolean; error?: string }> {
  // Get current Mutagen balance
  const mutagen = await getWalletMutagen(wallet);

  if (mutagen.balance < requiredAmount) {
    return {
      valid: false,
      error: `Insufficient Mutagen. Required: ${requiredAmount}, Have: ${mutagen.balance}`
    };
  }

  // Check total committed across all active tournaments
  const activeCommitments = await prisma.participant.findMany({
    where: {
      wallet,
      mutagenCommit: { not: null },
      tournament: {
        status: { in: ['SCHEDULED', 'ENTRY_OPEN', 'ACTIVE'] }
      }
    },
    select: { mutagenCommit: true }
  });

  const totalCommitted = activeCommitments.reduce(
    (sum, p) => sum + (p.mutagenCommit || 0),
    0
  );

  if (totalCommitted + requiredAmount > mutagen.balance) {
    return {
      valid: false,
      error: `Mutagen already committed. Available: ${mutagen.balance - totalCommitted}, Required: ${requiredAmount}`
    };
  }

  return { valid: true };
}

export async function registerMutagenEntry(
  wallet: string,
  tournamentId: string,
  amount: number
): Promise<void> {
  const validation = await validateMutagenEntry(wallet, tournamentId, amount);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await prisma.participant.create({
    data: {
      tournamentId,
      wallet,
      mutagenCommit: amount
    }
  });
}
```

---

# 7. Badge System

## 7.1 Badge Definitions

```typescript
// packages/shared/src/constants.ts

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: BadgeCriteria;
}

export type BadgeCriteria =
  | { type: 'placement'; value: number }           // Final rank
  | { type: 'participation_count'; value: number } // Total entries
  | { type: 'wins'; value: number }                // Total wins
  | { type: 'streak'; value: number }              // Daily streak
  | { type: 'volume'; value: number }              // Total volume traded
  | { type: 'clutch'; description: string };       // Special moments

export const BADGES: BadgeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────
  // PLACEMENT BADGES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'royale_champion',
    name: 'Royale Champion',
    description: 'Won an Adrena Royale tournament',
    imageUrl: '/badges/champion.svg',
    rarity: 'legendary',
    criteria: { type: 'placement', value: 1 }
  },
  {
    id: 'royale_finalist_silver',
    name: 'Silver Finalist',
    description: 'Finished 2nd in a Royale',
    imageUrl: '/badges/silver.svg',
    rarity: 'epic',
    criteria: { type: 'placement', value: 2 }
  },
  {
    id: 'royale_finalist_bronze',
    name: 'Bronze Finalist',
    description: 'Finished 3rd in a Royale',
    imageUrl: '/badges/bronze.svg',
    rarity: 'epic',
    criteria: { type: 'placement', value: 3 }
  },
  {
    id: 'royale_top10',
    name: 'Top 10 Finisher',
    description: 'Finished in the top 10',
    imageUrl: '/badges/top10.svg',
    rarity: 'rare',
    criteria: { type: 'placement', value: 10 }
  },

  // ─────────────────────────────────────────────────────────────────
  // PARTICIPATION BADGES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Competed in your first Royale',
    imageUrl: '/badges/first-blood.svg',
    rarity: 'common',
    criteria: { type: 'participation_count', value: 1 }
  },
  {
    id: 'veteran_5',
    name: 'Veteran',
    description: 'Competed in 5 Royales',
    imageUrl: '/badges/veteran.svg',
    rarity: 'common',
    criteria: { type: 'participation_count', value: 5 }
  },
  {
    id: 'gladiator_10',
    name: 'Gladiator',
    description: 'Competed in 10 Royales',
    imageUrl: '/badges/gladiator.svg',
    rarity: 'rare',
    criteria: { type: 'participation_count', value: 10 }
  },
  {
    id: 'legend_25',
    name: 'Legend',
    description: 'Competed in 25 Royales',
    imageUrl: '/badges/legend.svg',
    rarity: 'epic',
    criteria: { type: 'participation_count', value: 25 }
  },

  // ─────────────────────────────────────────────────────────────────
  // STREAK BADGES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintained a 7-day trading streak',
    imageUrl: '/badges/streak-7.svg',
    rarity: 'common',
    criteria: { type: 'streak', value: 7 }
  },
  {
    id: 'streak_30',
    name: 'Iron Trader',
    description: 'Maintained a 30-day trading streak',
    imageUrl: '/badges/streak-30.svg',
    rarity: 'rare',
    criteria: { type: 'streak', value: 30 }
  },

  // ─────────────────────────────────────────────────────────────────
  // SPECIAL BADGES
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'shield_save',
    name: 'Shield Bearer',
    description: 'Survived elimination using a Shield',
    imageUrl: '/badges/shield.svg',
    rarity: 'rare',
    criteria: { type: 'clutch', description: 'Used shield to survive' }
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Rose from bottom 10% to top 25% in a single round',
    imageUrl: '/badges/comeback.svg',
    rarity: 'epic',
    criteria: { type: 'clutch', description: 'Major rank improvement' }
  }
];
```

## 7.2 Badge Awarding Service

```typescript
// apps/api/src/services/badges.ts

import { prisma } from '../db/client';
import { BADGES, BadgeDefinition } from '@adrena-royale/shared';

export interface TournamentResult {
  tournamentId: string;
  wallet: string;
  finalRank: number | null;
  participationCount: number;
  usedShield: boolean;
  hadComebackMoment: boolean;
}

export async function checkAndAwardBadges(result: TournamentResult): Promise<string[]> {
  const awarded: string[] = [];

  // Get existing badges for this wallet
  const existingBadges = await prisma.badge.findMany({
    where: { wallet: result.wallet },
    select: { badgeType: true }
  });
  const existingTypes = new Set(existingBadges.map(b => b.badgeType));

  // Get user stats
  const stats = await getUserStats(result.wallet);

  for (const badge of BADGES) {
    // Skip if already has this badge
    if (existingTypes.has(badge.id)) continue;

    // Check criteria
    if (meetsCriteria(badge, result, stats)) {
      await prisma.badge.create({
        data: {
          badgeType: badge.id,
          wallet: result.wallet,
          tournamentId: result.tournamentId
        }
      });
      awarded.push(badge.id);
    }
  }

  return awarded;
}

interface UserStats {
  totalParticipations: number;
  totalWins: number;
  currentStreak: number;
  longestStreak: number;
}

async function getUserStats(wallet: string): Promise<UserStats> {
  const participations = await prisma.participant.count({
    where: { wallet }
  });

  const wins = await prisma.participant.count({
    where: { wallet, finalRank: 1 }
  });

  const streak = await prisma.userStreak.findUnique({
    where: { wallet }
  });

  return {
    totalParticipations: participations,
    totalWins: wins,
    currentStreak: streak?.currentDailyStreak || 0,
    longestStreak: streak?.longestDailyStreak || 0
  };
}

function meetsCriteria(
  badge: BadgeDefinition,
  result: TournamentResult,
  stats: UserStats
): boolean {
  const { criteria } = badge;

  switch (criteria.type) {
    case 'placement':
      return result.finalRank !== null && result.finalRank <= criteria.value;

    case 'participation_count':
      return stats.totalParticipations >= criteria.value;

    case 'wins':
      return stats.totalWins >= criteria.value;

    case 'streak':
      return stats.longestStreak >= criteria.value;

    case 'clutch':
      if (criteria.description.includes('shield')) {
        return result.usedShield;
      }
      if (criteria.description.includes('comeback')) {
        return result.hadComebackMoment;
      }
      return false;

    default:
      return false;
  }
}
```

---

# 8. API Specification

## 8.1 Public Endpoints

```typescript
// apps/api/src/routes/tournaments.ts

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments - List tournaments
// ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { status, limit = 10, offset = 0 } = req.query;

  const tournaments = await prisma.tournament.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { scheduledStart: 'desc' },
    take: Number(limit),
    skip: Number(offset),
    include: {
      _count: { select: { participants: true } }
    }
  });

  res.json({
    tournaments: tournaments.map(t => ({
      ...t,
      participantCount: t._count.participants
    }))
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments/:id - Tournament details
// ─────────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: req.params.id },
    include: {
      rounds: true,
      _count: { select: { participants: true } }
    }
  });

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  res.json({
    ...tournament,
    participantCount: tournament._count.participants
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments/:id/standings - Current standings
// ─────────────────────────────────────────────────────────────────────

router.get('/:id/standings', async (req, res) => {
  const { id } = req.params;

  const tournament = await prisma.tournament.findUnique({
    where: { id }
  });

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  // Get latest round scores
  const scores = await prisma.roundScore.findMany({
    where: {
      tournamentId: id,
      roundNumber: tournament.currentRound
    },
    orderBy: { finalScore: 'desc' },
    include: {
      participant: {
        select: { isEliminated: true, shields: true }
      }
    }
  });

  // Calculate danger zone
  const activeCount = scores.filter(s => !s.participant.isEliminated).length;
  const roundConfig = (tournament.roundConfigs as any[])[tournament.currentRound - 1];
  const eliminationLine = Math.ceil(activeCount * (1 - (roundConfig?.eliminationPercent || 0.25)));

  res.json({
    tournamentId: id,
    roundNumber: tournament.currentRound,
    standings: scores.map((s, index) => ({
      rank: index + 1,
      wallet: s.wallet,
      score: s.finalScore,
      tradesCount: s.tradesCount,
      totalVolume: s.totalVolume,
      totalPnl: s.totalPnl,
      isEliminated: s.participant.isEliminated,
      hasShield: s.participant.shields > 0,
      inDangerZone: index + 1 > eliminationLine
    })),
    eliminationLine
  });
});

export default router;
```

## 8.2 Participant Endpoints

```typescript
// apps/api/src/routes/participants.ts

import { Router } from 'express';
import { verifyWalletSignature } from '../middleware/auth';
import { registerMutagenEntry, validateMutagenEntry } from '../services/entry';
import { prisma } from '../db/client';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// POST /api/tournaments/:id/register - Register for tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/:id/register', verifyWalletSignature, async (req, res) => {
  const { id } = req.params;
  const { wallet } = req.body; // Verified by middleware

  const tournament = await prisma.tournament.findUnique({
    where: { id }
  });

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  if (tournament.status !== 'ENTRY_OPEN') {
    return res.status(400).json({ error: 'Registration not open' });
  }

  // Check capacity
  const currentCount = await prisma.participant.count({
    where: { tournamentId: id }
  });

  if (currentCount >= tournament.maxParticipants) {
    return res.status(400).json({ error: 'Tournament full' });
  }

  // Handle entry based on type
  try {
    switch (tournament.entryType) {
      case 'FREE':
      case 'WHITELIST':
        await prisma.participant.create({
          data: { tournamentId: id, wallet }
        });
        break;

      case 'MUTAGEN_COMMIT':
        await registerMutagenEntry(wallet, id, tournament.entryFeeMutagen!);
        break;

      case 'SOL_STAKE':
        // Return payment instructions
        return res.json({
          action: 'send_payment',
          treasury: process.env.TREASURY_WALLET,
          amount: tournament.entryFeeSol,
          memo: id
        });
    }

    res.json({ success: true, message: 'Registered successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/tournaments/:id/eligibility/:wallet - Check eligibility
// ─────────────────────────────────────────────────────────────────────

router.get('/:id/eligibility/:wallet', async (req, res) => {
  const { id, wallet } = req.params;

  const tournament = await prisma.tournament.findUnique({
    where: { id }
  });

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  // Check if already registered
  const existing = await prisma.participant.findUnique({
    where: { tournamentId_wallet: { tournamentId: id, wallet } }
  });

  if (existing) {
    return res.json({ eligible: false, reason: 'Already registered' });
  }

  // Check entry requirements
  if (tournament.entryType === 'MUTAGEN_COMMIT') {
    const validation = await validateMutagenEntry(
      wallet,
      id,
      tournament.entryFeeMutagen!
    );

    if (!validation.valid) {
      return res.json({ eligible: false, reason: validation.error });
    }
  }

  res.json({ eligible: true });
});

export default router;
```

## 8.3 Admin Endpoints

```typescript
// apps/api/src/routes/admin.ts

import { Router } from 'express';
import { requireAdmin } from '../middleware/admin';
import { prisma } from '../db/client';

const router = Router();

router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments - Create tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments', async (req, res) => {
  const {
    name,
    description,
    entryType,
    entryFeeSol,
    entryFeeMutagen,
    scheduledStart,
    roundConfigs,
    minParticipants,
    maxParticipants
  } = req.body;

  // Calculate entry deadline (2 hours before start)
  const start = new Date(scheduledStart);
  const entryDeadline = new Date(start.getTime() - 2 * 60 * 60 * 1000);

  const tournament = await prisma.tournament.create({
    data: {
      name,
      description,
      entryType,
      entryFeeSol,
      entryFeeMutagen,
      scheduledStart: start,
      entryDeadline,
      roundConfigs: roundConfigs || [
        { duration: 360, eliminationPercent: 0.25 },
        { duration: 240, eliminationPercent: 0.25 },
        { duration: 180, eliminationPercent: 0.25 },
        { duration: 120, eliminationPercent: 0.25 },
        { duration: 90, eliminationPercent: 0.50 },
        { duration: 60, eliminationPercent: 0 }
      ],
      minParticipants: minParticipants || 20,
      maxParticipants: maxParticipants || 256
    }
  });

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminWallet: req.adminWallet,
      action: 'CREATE_TOURNAMENT',
      targetType: 'tournament',
      targetId: tournament.id,
      details: { name }
    }
  });

  res.json(tournament);
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/admin/tournaments/:id/start - Start tournament
// ─────────────────────────────────────────────────────────────────────

router.post('/tournaments/:id/start', async (req, res) => {
  const { id } = req.params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } }
  });

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  if (tournament._count.participants < tournament.minParticipants) {
    return res.status(400).json({
      error: `Need at least ${tournament.minParticipants} participants`
    });
  }

  // STEP 1: Assign shields based on current streaks (see §5.5)
  const { assignShieldsAtTournamentStart } = await import('../services/shields');
  await assignShieldsAtTournamentStart(id);

  // STEP 2: Update tournament status and create first round
  await prisma.$transaction([
    prisma.tournament.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        currentRound: 1,
        actualStart: new Date()
      }
    }),
    prisma.round.create({
      data: {
        tournamentId: id,
        roundNumber: 1,
        phase: 'ACTIVE',
        startTime: new Date(),
        durationMins: (tournament.roundConfigs as any[])[0].duration,
        participantsAtStart: tournament._count.participants
      }
    })
  ]);

  // STEP 3: Log admin action
  await prisma.adminAction.create({
    data: {
      adminWallet: req.adminWallet,
      action: 'START_TOURNAMENT',
      targetType: 'tournament',
      targetId: id
    }
  });

  res.json({ success: true, message: 'Tournament started', shieldsAssigned: true });
});

export default router;
```

---

# 9. Admin Panel

## 9.1 Tournament Creation Form

```tsx
// apps/web/src/app/admin/page.tsx

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const DEFAULT_ROUNDS = [
  { duration: 360, eliminationPercent: 25 },
  { duration: 240, eliminationPercent: 25 },
  { duration: 180, eliminationPercent: 25 },
  { duration: 120, eliminationPercent: 25 },
  { duration: 90, eliminationPercent: 50 },
  { duration: 60, eliminationPercent: 0 }
];

export default function AdminPage() {
  const { publicKey, signMessage } = useWallet();
  const [form, setForm] = useState({
    name: '',
    description: '',
    entryType: 'FREE',
    entryFeeSol: 0.5,
    entryFeeMutagen: 100,
    scheduledStart: '',
    minParticipants: 20,
    maxParticipants: 256
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signMessage) {
      alert('Connect wallet first');
      return;
    }

    // Sign message to prove admin
    const message = new TextEncoder().encode(
      `Create tournament: ${form.name} at ${Date.now()}`
    );
    const signature = await signMessage(message);

    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet': publicKey.toString(),
        'X-Signature': Buffer.from(signature).toString('base64')
      },
      body: JSON.stringify({
        ...form,
        roundConfigs: DEFAULT_ROUNDS.map(r => ({
          duration: r.duration,
          eliminationPercent: r.eliminationPercent / 100
        }))
      })
    });

    if (res.ok) {
      const tournament = await res.json();
      alert(`Tournament created: ${tournament.id}`);
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Tournament</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Entry Type</label>
          <select
            value={form.entryType}
            onChange={e => setForm({ ...form, entryType: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="FREE">Free Entry</option>
            <option value="MUTAGEN_COMMIT">Mutagen Commitment</option>
            <option value="SOL_STAKE">SOL Stake</option>
          </select>
        </div>

        {form.entryType === 'SOL_STAKE' && (
          <div>
            <label className="block text-sm font-medium mb-1">Entry Fee (SOL)</label>
            <input
              type="number"
              step="0.1"
              value={form.entryFeeSol}
              onChange={e => setForm({ ...form, entryFeeSol: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
        )}

        {form.entryType === 'MUTAGEN_COMMIT' && (
          <div>
            <label className="block text-sm font-medium mb-1">Mutagen Required</label>
            <input
              type="number"
              value={form.entryFeeMutagen}
              onChange={e => setForm({ ...form, entryFeeMutagen: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Scheduled Start</label>
          <input
            type="datetime-local"
            value={form.scheduledStart}
            onChange={e => setForm({ ...form, scheduledStart: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Participants</label>
            <input
              type="number"
              value={form.minParticipants}
              onChange={e => setForm({ ...form, minParticipants: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Participants</label>
            <input
              type="number"
              value={form.maxParticipants}
              onChange={e => setForm({ ...form, maxParticipants: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Create Tournament
        </button>
      </form>
    </div>
  );
}
```

---

# 10. Deployment

## 10.1 Environment Variables

```env
# apps/api/.env

# Database
DATABASE_URL=postgresql://user:pass@host:5432/adrena_royale

# Adrena SDK
ADRENA_API_BASE_URL=https://datapi.adrena.xyz

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TREASURY_WALLET=YourMultisigWalletAddress

# Admin
ADMIN_WALLETS=wallet1,wallet2,wallet3

# Server
PORT=3001
NODE_ENV=production
```

## 10.2 Railway Deployment

```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[[crons]]
name = "trade-poller"
schedule = "*/30 * * * * *"  # Every 30 seconds
command = "npm run job:poll"

[[crons]]
name = "streak-updater"
schedule = "0 0 * * *"  # Daily at midnight
command = "npm run job:streaks"
```

## 10.3 Vercel Frontend

```json
// apps/web/vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

---

# 11. Build Order

## 2-Week Sprint Plan

| Day | Task | Deliverable |
|-----|------|-------------|
| **1-2** | Project setup, Prisma schema, basic Express | Working API scaffold with DB |
| **3** | Adrena SDK integration, position fetching | `getPositions()` working |
| **4** | Scoring engine implementation | Risk-adjusted scores calculated |
| **5** | Elimination processor | Rounds process with percentile elimination |
| **6** | Streak calculator | Self-tracked streaks working |
| **7** | Entry system (multisig watcher + Mutagen gate) | SOL and Mutagen entries work |
| **8** | Tournament lifecycle (create, start, advance) | Full tournament flow |
| **9-10** | Admin panel (Next.js) | Create/manage tournaments |
| **11-12** | Public frontend (standings, registration) | Users can register and view |
| **13** | Badge system | Award and display badges |
| **14** | Testing, polish, documentation | Run mock tournament |

## MVP Success Criteria

- [ ] Create tournament via admin panel
- [ ] Register wallet for tournament
- [ ] Poll and score trades from SDK
- [ ] Process round eliminations
- [ ] Display live standings
- [ ] Track and display streaks/shields
- [ ] Award badges on completion
- [ ] Handle 20-50 concurrent participants

---

# Appendix A: Quick Reference

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tournaments` | - | List tournaments |
| GET | `/api/tournaments/:id` | - | Tournament details |
| GET | `/api/tournaments/:id/standings` | - | Current standings |
| POST | `/api/tournaments/:id/register` | Wallet | Register |
| GET | `/api/tournaments/:id/eligibility/:wallet` | - | Check eligibility |
| POST | `/api/admin/tournaments` | Admin | Create tournament |
| POST | `/api/admin/tournaments/:id/start` | Admin | Start tournament |

## Database Tables Summary

| Table | Purpose |
|-------|---------|
| `Tournament` | Tournament configuration and state |
| `Participant` | Registered participants |
| `Round` | Round timing and status |
| `RoundScore` | Per-round scores and trades |
| `UserStreak` | Self-tracked trading streaks |
| `Badge` | Awarded badges |
| `EntryPayment` | SOL stake tracking |
| `AdminAction` | Audit log |

---

*— END OF TECHNICAL SPECIFICATION v2.0 —*
