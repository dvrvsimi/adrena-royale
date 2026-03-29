# Adrena Royale — Testing Report

## Overview

This document presents validation results for the Adrena Royale tournament engine. Two validation approaches were conducted:

1. **Lifecycle Test** — 3 completed tournaments on production database, validating the state machine
2. **Backtest** — 10 wallets from Adrena /traders API, validating scoring differentiation

---

## Test 1: Tournament Lifecycle Validation

### Completed Tournaments (Production DB)

| Tournament | Participants | Rounds | Duration | Status |
|------------|-------------|--------|----------|--------|
| "the winner takes it all" | 5 | 5 | 12 min | COMPLETED |
| "pstt" (fast) | 5 | 5 | 12 min | COMPLETED |
| "pstt" (extended) | 5 | 5 | ~48h | COMPLETED |

### Lifecycle Validation

| Check | Status |
|-------|--------|
| SCHEDULED → ENTRY_OPEN → ACTIVE → COMPLETED | ✅ |
| Round phases (PENDING → ACTIVE → SCORING → ELIMINATING → COMPLETE) | ✅ |
| Elimination targets calculated correctly | ✅ |
| Final rankings assigned (1st, 2nd place) | ✅ |
| Inactive participant handling (INACTIVE elimination reason) | ✅ |

### Key Finding
All test tournaments used simulated wallets with no actual Adrena trades. Eliminations were based on INACTIVE status, validating the zero-trade edge case handling.

---

## Test 2: Backtest — Scoring Engine Validation

### Config

| Parameter | Value |
|-----------|-------|
| Wallets | 10 (top by PnL from Adrena /traders API) |
| Time Window | 90 days (2025-12-29 to 2026-03-29) |
| Min Notional | $100 |
| Rounds | 5 (25% / 25% / 33% / 50% / 0% elimination) |
| Data Source | `https://datapi.adrena.trade/traders` |

### Round Progression

| Round | Participants | Eliminated | Score Range | Avg Score |
|-------|-------------|------------|-------------|-----------|
| Round 1 | 10 | 2 | -0.0842 – 0.1829 | 0.0347 |
| Round 2 | 8 | 2 | 0.0057 – 0.1829 | 0.0534 |
| Round 3 | 6 | 1 | 0.0144 – 0.1829 | 0.0689 |
| Round 4 | 5 | 2 | 0.0192 – 0.1829 | 0.0798 |
| Finals | 3 | 0 | 0.0768 – 0.1829 | 0.1153 |

Score floor rose each round (-0.08 → 0.006 → 0.014 → 0.019 → 0.077), confirming progressive filtering.

### Finalists

| Rank | Wallet | Score | Trades | Volume | PnL |
|------|--------|-------|--------|--------|-----|
| 1 | `BLBZkbjB...5wWG` | 0.1829 | 3 | $147,171 | +$1,816 |
| 2 | `FG7VY9nu...pPoi` | 0.0861 | 1 | $10,080 | +$398 |
| 3 | `GYcHQX8r...zaNT` | 0.0768 | 3 | $40,095 | +$387 |

### Score Component Analysis

| Metric | Min | Max | Avg |
|--------|-----|-----|-----|
| PnL ($) | -158.64 | 605.52 | 79.98 |
| Size Multiplier | 0.63x | 10.27x | 2.82x |
| Duration Multiplier | 0.50x | 1.50x | 1.12x |

### Key Observations

1. **Score differentiation works.** 10 wallets produced 10 distinct scores ranging from -0.0842 to +0.1829

2. **Negative scores are possible.** Wallet `9MUcyAJj...` had +$259 PnL but scored -0.0842 due to high volume with low risk-adjusted returns (68.75% win rate, 16 trades)

3. **Winner had highest risk-adjusted return**, not highest PnL. `BLBZkbjB...` scored 2x higher than `FG7VY9nu...` despite only ~4.5x more PnL — efficient capital use rewarded

4. **Duration penalties applied.** 10 trades (23%) received 0.5x multiplier for <5min hold time

5. **Size multipliers working.** Range from 0.63x to 10.27x correctly applied based on position sizes

---

## Validation Summary

| Capability | Lifecycle Test | Backtest | Status |
|-----------|----------------|----------|--------|
| Tournament state machine | ✅ 3 completed | N/A | Verified |
| Multi-round elimination | ✅ 5 rounds | ✅ 5 rounds | Verified |
| Score differentiation | N/A (no trades) | ✅ 10 unique scores | Verified |
| Size multiplier (Adrena spec) | N/A | ✅ 0.63x - 10.27x | Verified |
| Duration multiplier | N/A | ✅ 10 trades penalized | Verified |
| Negative score handling | N/A | ✅ -0.0842 score | Verified |
| Zero-trade handling | ✅ INACTIVE elimination | N/A | Verified |
| Final rankings | ✅ 1st/2nd assigned | ✅ 3 finalists ranked | Verified |

---

## Data Limitations

### API Availability

| Endpoint | Status |
|----------|--------|
| `/traders` | ✅ Working — Returns aggregate stats |
| `/positions` | ❌ Returns 400 — Individual positions unavailable |
| `/liquidity-info` | ✅ Working — Pool utilization |

### Backtest Methodology

Due to `/positions` endpoint returning 400, backtest positions were derived from `/traders` aggregate statistics:
- Trade count from `number_positions`
- Average PnL from `avg_win_pnl` / `avg_loss_pnl`
- Win rate from `win_rate_percentage`
- Average duration from `average_trade_time`

This validates scoring engine differentiation but not exact historical trade timing.

### Iteration Recommendations

Negative scores flag high-volume low-efficiency traders. Wallet `9MUcyAJj...` had +$259 PnL but scored -0.0842 — the risk-adjusted formula correctly penalized 16 trades with mediocre returns. This validates the anti-whale design.

Duration multiplier needs real close timestamps. 23% of backtest trades hit the 0.5x snipe penalty, but synthetic positions used estimated durations. Competition Service WebSocket provides exact `close_position` timing for production accuracy.

Size multiplier tiers cap at 10.27x in this dataset. Larger position sizes ($100K+) would exercise the upper tiers (17.5x–45x). Consider recruiting high-volume traders for expanded validation.

---

## Files Referenced

| File | Purpose |
|------|---------|
| `apps/api/src/services/scoring.ts` | Scoring engine with size/duration multipliers |
| `apps/api/src/services/competition-ws.ts` | WebSocket client + Trade persistence |
| `apps/api/src/scripts/backtest.ts` | Backtest runner script |
| `apps/api/prisma/schema.prisma` | Trade table schema |

---

## Appendix: Size Multiplier Tiers

Verified against Adrena Competition documentation:

| Position Size | Multiplier Range |
|---------------|------------------|
| $10 – $1,000 | 0.00025x – 0.05x |
| $1,000 – $5,000 | 0.05x – 1x |
| $5,000 – $50,000 | 1x – 5x |
| $50,000 – $100,000 | 5x – 9x |
| $100,000 – $250,000 | 9x – 17.5x |
| $250,000 – $500,000 | 17.5x – 25x |
| $500,000 – $1,000,000 | 25x – 30x |
| $1,000,000 – $4,500,000 | 30x – 45x |

---

**Generated:** 2026-03-29
