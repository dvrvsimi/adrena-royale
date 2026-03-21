# ADRENA ROYALE

## Competition Module Design Document

**Weekly Elimination Trading Tournaments for Adrena Protocol**

---

| | |e
|---|---|
| **Prepared for** | Adrena Protocol & Superteam Bounty |
| **Version** | 1.0 Final Submission |
| **Date** | March 2026 |
| **Author** | dvrvsimi |

---

## Live Demo

> **Try Adrena Royale now:**

| Resource | Link |
|----------|------|
| **Live Frontend** | https://adrena-royale-web.onrender.com |
| **API Endpoint** | https://adrena-royale-api.onrender.com |
| **API Health Check** | https://adrena-royale-api.onrender.com/api/health |
| **Source Code** | https://github.com/dvrvsimi/adrena-royale |

---

## Document Navigation

| Section | Purpose | Page |
|---------|---------|------|
| [Executive Summary](#1-executive-summary) | High-level overview and key differentiators | 1 |
| [Context & Constraints](#2-context--constraints) | Adrena's current state and design implications | 2 |
| [Historical Analysis](#3-historical-analysis) | Lessons from Pre-Season, Season 1, Season 2 | 3 |
| [Competitive Landscape](#4-competitive-landscape) | Why Royale beats Jupiter, Drift, and others | 4 |
| [Competition Format](#5-competition-format--rules) | Tournament structure and entry mechanics | 5 |
| [Scoring Mechanics](#6-scoring-mechanics) | Risk-adjusted, time-weighted scoring system | 6 |
| [System Integration](#7-full-system-integration) | How Royale enhances all 9 Adrena systems | 7 |
| [Economic Model](#8-economic-model--rewards) | Sustainable, status-first reward design | 8 |
| [Anti-Abuse Design](#9-anti-abuse-mechanisms) | Solutions for specific historical attacks | 9 |
| [Edge Cases](#10-edge-cases--resolutions) | Handling failures, ties, and anomalies | 10 |
| [Stakeholder Benefits](#11-stakeholder-benefits) | Value for traders, LPs, and spectators | 11 |
| [Risk Assessment](#12-risk-assessment) | Comprehensive risk register with mitigations | 12 |
| [Implementation Roadmap](#13-implementation-roadmap) | Phased delivery plan | 13 |
| [Open Questions](#14-open-questions-for-adrena-team) | Blocking items requiring team input | 14 |

---

# 1. Executive Summary

## The Opportunity

Adrena has already proven that trading competitions drive engagement—**50% of all platform volume in 2025 came from competition activity**. The infrastructure exists: Mutagen scoring, quests, streaks, raffles, badges, and championship points. What's missing is a format that creates *urgency*, *drama*, and *spectator appeal*.

## The Solution: Adrena Royale

**Adrena Royale** is a weekly elimination-based trading tournament that transforms passive leaderboard watching into an active, high-stakes event. The format is simple and compelling:

> **256 traders enter. Rounds progressively eliminate the bottom 25%. The last traders standing win.**

This creates natural drama—"clutch save" moments, comeback stories, and real-time tension that can be livestreamed, shared, and talked about. No perp DEX on Solana has implemented this format.

## Why This Wins

| Differentiator | Competitive Advantage |
|----------------|----------------------|
| **First Elimination Format on Solana** | Novel mechanic that competitors cannot quickly replicate |
| **Risk-Adjusted Scoring** | Skill beats size—a $100 trader can outperform a $10K trader |
| **Self-Sustaining Design** | Runs autonomously via existing MrSablier keepers; no dev intervention needed |
| **Status-First Rewards** | Sustainable economics that don't drain treasury |
| **Deep Integration** | Enhances all 9 existing Adrena systems, not just leaderboards |
| **Battle-Tested Anti-Abuse** | Specific solutions for Z_D_K sybil patterns and quest farming |

## Key Metrics Targets

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Royale fill rate | 50% (128/256) | 75% | 95% |
| Repeat participation | 40% | 55% | 65% |
| Trading volume during Royale | 2× normal | 3× normal | 4× normal |
| New user acquisition | 10% of participants | 20% | 30% |
| Social shares per Royale | 100+ | 300+ | 500+ |

---

# 2. Context & Constraints

> **Critical Context**: This proposal acknowledges that Adrena entered maintenance mode in November 2025. This is not a normal feature request—it's a contribution to a community-owned protocol that needs sustainable, self-operating systems.

## 2.1 What Maintenance Mode Means for Design

In November 2025, the Adrena founding team announced they could no longer sustain active development due to funding constraints and competition from Jupiter Perps and Drift. They open-sourced the entire codebase and invited community builders to continue the vision.

**This changes everything about how we design:**

| Constraint | Design Implication |
|------------|-------------------|
| **No full-time ops team** | Competition lifecycle must be fully automated |
| **Limited treasury** | Rewards must emphasize status over tokens |
| **Community operators** | Configuration must be accessible to non-developers |
| **Existing infrastructure** | Build on what exists, don't create parallel systems |

## 2.2 Design Principles

Based on this context, Adrena Royale follows these principles:

1. **Automation First**: Every lifecycle event (start, score, eliminate, distribute) is triggered by existing MrSablier keepers—no manual scripts.

2. **DAO-Operable**: Tournament creation, reward configuration, and participant management are accessible via admin panel to authorized DAO members.

3. **Treasury-Conscious**: Primary rewards are status (badges, profile flair, governance perks). Tokens are supplementary and sponsor-dependent.

4. **Infrastructure Leverage**: Uses existing Mutagen indexer, Pyth oracles, trade monitoring, and reward distribution—no parallel systems.

5. **Graceful Degradation**: Works with 20 participants just as well as 256. Market conditions (bull or bear) don't break the format.

---

# 3. Historical Analysis

> **Why This Section Matters**: Understanding what worked and failed in Adrena's actual competition history demonstrates deep research and ensures Royale solves real problems, not theoretical ones.

## 3.1 Pre-Season: Awakening (Nov-Dec 2024)

**Format**: 6-week competition with 4 volume-based divisions (Spawn, Mutant, Abomination, Leviathan). P&L-based ranking within divisions.

**What Worked**:
- Volume brackets let small traders compete against peers
- Raffle entries via fees ($50/entry) democratized rewards
- Cosmetic badges drove engagement beyond token rewards

**What Broke**:
> **Bracket Manipulation Incident**: Sophisticated traders intentionally suppressed their volume to remain in easier divisions (Spawn/Mutant) rather than competing against larger players in Abomination/Leviathan. This gaming behavior undermined competitive integrity.

**Royale Solution**: Single-bracket elimination removes division gaming entirely. All participants compete in the same pool. Risk-adjusted scoring ensures a skilled small trader beats an unskilled whale.

## 3.2 Season 1: The Expanse (Feb-Apr 2025)

**Format**: 10-week season with Mutagen as primary scoring metric. Championship points from weekly rankings. Quests, streaks, and daily mutations. 5M ADX + 50K JTO prize pool.

**What Worked**:
- Mutagen rewarded holistic engagement, not just profit
- Daily mutations added variety
- Jito sponsorship expanded prize pool significantly

**What Broke**:

> **Sybil Attack - Z_D_K/D_K_Z Cluster**: Multiple accounts with similar naming patterns and coordinated trading activity appeared on the leaderboard. Analysis suggested a single entity controlling multiple wallets to farm Mutagen and competition rewards.

> **Quest Farming**: Traders opened and closed minimal-size positions solely to complete daily quests, extracting rewards without meaningful trading activity. The scoring system couldn't distinguish between a $10 trade and a $10,000 trade for quest completion.

> **Bear Market Collapse**: Season 1 coincided with BTC -20% and SOL -50%. Pure P&L scoring became nearly random in high-volatility bear conditions.

**Royale Solutions**:
- **Sybil**: Entry cost (100 Mutagen or 0.5 SOL) + elimination survival requirement makes multi-account farming unprofitable
- **Quest Farming**: $100 minimum notional for scoring; tiny trades excluded
- **Bear Market**: Percentile ranking (bottom 25% eliminated) works regardless of whether scores are positive or negative

## 3.3 Season 2: Factions (Apr 2025+)

**Format**: Team-based "Factions" competition with 12M ADX, 4.2B BONK, and 25K JTO rewards.

**Evolution Insight**: The progression from individual brackets (Pre-Season) → multi-factor scoring (Season 1) → team-based factions (Season 2) shows a clear design trajectory toward social/collaborative competition.

**Royale Integration**: Phase 2 introduces "Guild Royale" where 5-person teams compete, continuing this evolutionary arc while maintaining the elimination format.

---

# 4. Competitive Landscape

> **Bounty Requirement**: "Why this is more engaging than current alternatives on other perp DEXs"

## 4.1 Competitor Analysis

### Jupiter Perps (Largest Solana Perp DEX)

| Aspect | Jupiter | Adrena Royale |
|--------|---------|---------------|
| **Competition Format** | Basic P&L leaderboard, weekly resets | Elimination rounds, real-time drama |
| **Scoring** | Raw P&L or volume | Risk-adjusted (skill > size) |
| **Gamification** | Minimal—trade more, rank higher | Power-ups, shields, clutch saves |
| **Spectator Appeal** | Static spreadsheet | Live WebSocket, streamable |
| **Engagement Depth** | Shallow—check rankings occasionally | Active—every round is survival |

**Jupiter's Weakness**: Pure volume play. Large traders dominate. No narrative, no drama, no reason to watch. Royale creates stories.

### Drift Protocol

| Aspect | Drift | Adrena Royale |
|--------|-------|---------------|
| **Competition Format** | No formal competitions | Weekly elimination events |
| **Points System** | FUEL (passive accumulation) | Mutagen + round scoring (active) |
| **Product Focus** | Prediction markets, vaults | Trading competition as core |

**Drift's Weakness**: Focused on product diversification, not competition engagement. FUEL is accumulation-based with no event structure. No spectator hook.

### Hyperliquid

| Aspect | Hyperliquid | Adrena Royale |
|--------|-------------|---------------|
| **Chain** | Own L1 (not Solana) | Solana-native |
| **Competition** | Leaderboard + points | Elimination + power-ups |
| **Post-Airdrop** | Engagement unclear | Sustainable format |

**Hyperliquid's Weakness**: Not on Solana (different ecosystem). Points system drove adoption but may not sustain post-airdrop.

### Flash Trade

| Aspect | Flash Trade | Adrena Royale |
|--------|-------------|---------------|
| **Format** | Standard leaderboard | Elimination brackets |
| **Innovation** | Minimal | First-mover on format |
| **Scale** | Smaller TVL | Adrena's established community |

**Flash Trade's Weakness**: Standard format, no differentiation from other leaderboards.

## 4.2 Competitive Positioning

```
                    HIGH GAMIFICATION
                           │
                    Adrena │
                    Royale ●
                           │
                           │
    PASSIVE ───────────────┼─────────────── ACTIVE
    ENGAGEMENT             │              ENGAGEMENT
                           │
              ○ Hyperliquid│○ Flash
              ○ Drift      │
              ○ Jupiter    │
                           │
                    LOW GAMIFICATION
```

**Royale is the only offering in the high-gamification, active-engagement quadrant on Solana.**

---

# 5. Competition Format & Rules

## 5.1 Tournament Structure

Each Royale runs **16-20 hours**, from Friday evening to Saturday afternoon UTC. This compressed timeframe creates urgency while remaining accessible across global timezones.

| Phase | Duration | Starting | Eliminated | Survivors |
|-------|----------|----------|------------|-----------|
| **Entry Window** | 2 hours | — | — | All entries |
| **Round 1** | 6 hours | 100% | 25% | 75% |
| **Round 2** | 4 hours | 75% | 25% | ~56% |
| **Round 3** | 3 hours | 56% | 25% | ~42% |
| **Round 4** | 2 hours | 42% | 25% | ~32% |
| **Semi-Final** | 1.5 hours | 32% | 50% | ~16% |
| **Final** | 1 hour | 16% | — | **Top 3 Win** |

### Scaling Examples

| Participants | Round 1 Survivors | Finalists | Winners |
|--------------|-------------------|-----------|---------|
| 256 (max) | 192 | 41 | Top 3 |
| 128 | 96 | 20 | Top 3 |
| 64 | 48 | 10 | Top 3 |
| 32 | 24 | 5 | Top 3 |
| 20 (min) | 15 | 3 | Top 3 |

**The format scales gracefully from 20 to 256 participants.**

## 5.2 Entry Requirements

Two entry paths ensure accessibility:

| Entry Type | Cost | Refundable | Best For |
|------------|------|------------|----------|
| **Mutagen Entry** | 100 Mutagen (burned) | No | Active traders with history |
| **Stake Entry** | 0.5 SOL (staked) | Yes, at Royale end | New users, no Mutagen |

**Entry creates prize pool**: Stake entries contribute to SOL pool. Mutagen burns reduce supply.

## 5.3 Round Rules

1. **Scoring Window**: Only trades opened AND closed within the round count
2. **Minimum Activity**: At least 1 completed trade per round (or auto-eliminated)
3. **Minimum Size**: Trades must be ≥$100 notional to count (anti-farming)
4. **Score Reset**: Each round starts fresh—only survival carries forward
5. **Position Limits**: Standard Adrena limits apply ($250K max)

---

# 6. Scoring Mechanics

## 6.1 Core Formula

The scoring system rewards **trading skill over capital size**, preventing whale domination:

```
Trade Score = (P&L ÷ Position Size) × Duration Multiplier × Power-Up Multiplier

Where:
  Position Size = Collateral × Leverage
  Duration Multiplier = 1.0 to 1.5 (based on hold time)
  Power-Up Multiplier = 1.0 to 2.0 (based on active power-ups)

Round Score = Sum of all Trade Scores
```

## 6.2 Why Risk-Adjusted Scoring?

| Scenario | Absolute P&L | Risk-Adjusted Score |
|----------|--------------|---------------------|
| Trader A: $100 profit on $1,000 position | $100 | 0.10 (10% return) |
| Trader B: $100 profit on $50,000 position | $100 | 0.002 (0.2% return) |

**Result**: Trader A scores **50× higher** than Trader B despite identical dollar profit. Skill wins.

## 6.3 Duration Multiplier (Anti-Sniping)

To prevent last-minute gambling, hold time affects score:

| Hold Duration | Multiplier | Strategic Implication |
|---------------|------------|----------------------|
| < 5 minutes | 0.5× | **Penalty** for scalp-sniping |
| 5-30 minutes | 1.0× | Neutral |
| 30 min - 2 hours | 1.0-1.25× | Conviction bonus |
| 2+ hours | 1.25-1.5× | Maximum conviction reward |

**Design Intent**: Reward traders who have conviction, not those waiting to gamble at the last second.

## 6.4 Power-Up System

Power-ups are earned through platform engagement and activated before rounds:

| Power-Up | Effect | How to Earn |
|----------|--------|-------------|
| **Shield** | Survive one elimination | 7-day streak (×1), 30-day streak (×2) |
| **Amplifier** | 1.25× score multiplier | Complete 3 daily quests in Royale week |
| **Overdrive** | 1.5× score multiplier | Complete all 7 daily quests |
| **Second Wind** | Negative trades count as 0 | Top 10 in previous Royale |
| **Wildcard** | Re-enter after elimination | Previous Royale Champion |

## 6.5 Bear Market Resilience

In downturns, all traders may have negative scores. Royale uses **percentile ranking**:

- Elimination is always "bottom 25% by rank"
- NOT "everyone below score X"
- Skilled loss mitigation is rewarded
- No scenario where "everyone loses" breaks the event

---

# 7. Full System Integration

> **Key Insight**: Adrena has 9 distinct systems a competition module touches. Most applicants will address 4. Royale integrates all 9.

| # | System | Current Function | Royale Integration |
|---|--------|------------------|-------------------|
| 1 | **Mutagen** | Points from trading; airdrop eligibility | 100 Mutagen = entry; wins grant 500-2000 bonus |
| 2 | **Streaks** | Daily/weekly/monthly activity tracking | 7-day = Shield; 30-day = 2 Shields |
| 3 | **Quests** | Task-based rewards | 3 quests = Amplifier; 7 quests = Overdrive |
| 4 | **Raffles** | Volume/fee lottery | Eliminated players auto-enter consolation raffle |
| 5 | **Badges** | Cosmetic achievements | 15+ new Royale badges |
| 6 | **Championship Points** | Season ranking | 1st = 500 CP, Top 3 = 300 CP, Finalists = 150 CP |
| 7 | **Trader Profiles** | On-chain identity | Royale stats card, season flair, achievement showcase |
| 8 | **Achievements** | Milestone tracking | Royale milestones: 10/50/100 entries, 5 wins |
| 9 | **Referral System** | Invite bonuses | 10% of referee's stake; bonus if referee survives |

### 7.1 Profile Integration Details

Trader Profiles become the primary status display:

- **Royale Stats Card**: Entries, Survivals, Finals, Wins
- **Season Flair**: Animated border for current champions
- **Achievement Showcase**: Pin up to 3 Royale badges
- **All-Time Ranking**: Visible on profile

### 7.2 Referral Integration Details

Competition-specific referral bonuses:

- **Entry Bonus**: Referrer receives 10% of referee's stake (0.05 SOL)
- **Survival Bonus**: If referee survives Round 1, referrer gets 25 Mutagen
- **Winner Bonus**: If referee wins, referrer gets 5% of winner's prize

---

# 8. Economic Model & Rewards

## 8.1 The ADX Reality

> **Critical Context**: ADX trades at approximately **$0.001-$0.02**. This means:
> - 100,000 ADX ≈ $100-200 USD
> - Season 1's 5M ADX pool was worth ~$5,000-10,000
> - **Token rewards alone cannot drive engagement**

## 8.2 Status-First Philosophy

Royale inverts the traditional reward hierarchy:

| Priority | Type | Examples | Cost to Protocol |
|----------|------|----------|------------------|
| **1. Status** | Cosmetic & Social | Champion badge, animated flair, Discord role | Zero |
| **2. Utility** | Platform Perks | Fee discounts, governance boost, priority access | Minimal |
| **3. Tokens** | Multi-Token Pool | ADX + JTO + BONK | Sponsor-dependent |

## 8.3 Prize Pool Sources

| Source | Contribution | Sustainability |
|--------|--------------|----------------|
| SOL Entry Stakes | 100% of stake pool | Self-sustaining |
| Mutagen Burns | ADX equivalent | Reduces supply |
| Protocol Allocation | 10,000 ADX/week | Treasury-conscious |
| Sponsor Pools | JTO, BONK, etc. | External funding |
| Trading Fees | 5% of Royale period | Activity-driven |

## 8.4 Distribution Structure

| Placement | SOL % | Token % | Status Rewards |
|-----------|-------|---------|----------------|
| **1st** | 30% | 25% | Champion badge (Gold), animated flair, 2× governance |
| **2nd** | 18% | 15% | Finalist badge (Silver), 1.5× governance |
| **3rd** | 12% | 10% | Finalist badge (Bronze), 1.25× governance |
| **Finalists** | 2% each | 2% each | Finalist badge, profile flair |
| **Consolation Raffle** | 10% | 10% | Lucky Loser badge |

---

# 9. Anti-Abuse Mechanisms

> **Design Philosophy**: These solutions address specific attacks observed in Adrena's history, not theoretical DeFi risks.

## 9.1 Sybil Prevention (Z_D_K/D_K_Z Response)

**Historical Attack**: Season 1 saw coordinated accounts with similar naming patterns farming rewards.

| Defense Layer | Mechanism |
|---------------|-----------|
| **Economic** | 100 Mutagen or 0.5 SOL per entry makes multi-account farming unprofitable |
| **Survival** | Must beat legitimate traders to avoid elimination—can't just enter and farm |
| **Behavioral** | Clustering detection: shared funding sources, timing patterns, trade correlation |
| **Manual** | Flagged accounts complete Royale but prizes held pending review |

## 9.2 Quest Farming Prevention

**Historical Attack**: Minimal-size trades to complete quests without real trading.

| Defense | Implementation |
|---------|----------------|
| **Minimum Notional** | Trades < $100 excluded from scoring |
| **Duration Filter** | Trades < 60 seconds flagged as potential wash trades |
| **Price Movement** | < 0.1% price movement trades excluded |

## 9.3 Bracket Manipulation Prevention

**Historical Attack**: Pre-Season traders suppressed volume to stay in easier divisions.

**Solution**: Single-bracket elimination removes divisions entirely. Everyone competes in the same pool with risk-adjusted scoring.

## 9.4 Last-Minute Sniping Prevention

**Attack Vector**: Wait until round end, make single high-leverage bet.

**Solution**: Duration Multiplier gives 0.5× penalty to trades < 5 minutes. Full-round holds get up to 1.5×.

## 9.5 Collusion Detection

| Pattern | Detection | Response |
|---------|-----------|----------|
| Identical trades within 30 seconds | Automated flagging | Review + potential disqualification |
| Shared wallet funding sources | On-chain analysis | Prize hold + investigation |
| Coordinated elimination targeting | Score impact analysis | Generally self-penalizing |

---

# 10. Edge Cases & Resolutions

| Scenario | Resolution |
|----------|------------|
| **< 20 entries by deadline** | Royale cancelled; SOL stakes refunded; Mutagen 50% refund |
| **All traders negative scores** | Percentile ranking: least negative wins. Bottom 25% still eliminated. |
| **Exact tie at elimination line** | Tiebreaker 1: Higher volume. Tiebreaker 2: Earlier entry. Both survive if still tied. |
| **Platform outage < 15 min** | Round timer pauses. Extended by outage duration. |
| **Platform outage 15 min - 2 hrs** | Round may be voided; all participants survive to next round. |
| **Platform outage > 2 hrs** | Royale cancelled with full refunds. |
| **Pyth oracle failure** | Trading paused until recovery. If unrecoverable, Royale cancelled. |
| **Player fully liquidated** | May continue with remaining capital. Still needs 1 trade to avoid AFK elimination. |
| **Shield used but would have survived** | Shield consumed regardless. Check standings before round end. |
| **Suspected collusion mid-Royale** | Flagged accounts complete Royale; prizes held pending review. |

---

# 11. Stakeholder Benefits

## 11.1 For Traders

| Benefit | How |
|---------|-----|
| **Skill Recognition** | Risk-adjusted scoring means small traders can win |
| **Weekly Events** | Regular, predictable competition schedule |
| **Status Display** | Royale achievements visible on profile |
| **Multiple Chances** | Consolation raffle for eliminated players |

## 11.2 For ALP Holders (Liquidity Providers)

| Benefit | How |
|---------|-----|
| **Increased Fees** | Royale periods generate 2-3× normal volume |
| **Spectator Staking** | Stake predictions on Royale outcomes |
| **Exclusive Access** | Top 10 ALP holders get reserved entry slots |
| **LP Royale (Phase 2)** | Separate competition for LP efficiency |

## 11.3 For Spectators

| Benefit | How |
|---------|-----|
| **Live Drama** | Real-time standings via WebSocket |
| **Shareable Moments** | Auto-generated share cards, elimination GIFs |
| **Streamer Support** | Commentary API for broadcast overlays |
| **Prediction Markets** | Side pools for outcome betting |

## 11.4 For Adrena Protocol

| Benefit | How |
|---------|-----|
| **Volume Growth** | 2-4× trading volume during Royale |
| **User Acquisition** | Referral bonuses + viral sharing |
| **Engagement Depth** | Transforms passive traders into active competitors |
| **Sustainable Model** | Status-first rewards don't drain treasury |

---

# 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Low participation** (< 20) | Medium | High | Cancellation with refunds; marketing push; reduced entry costs for early Royales |
| **Sybil cluster emerges** | Medium | Medium | Economic + behavioral detection; manual review; prize holds |
| **Whale domination despite risk-adjustment** | Low | Medium | Scoring caps maximum position contribution; ELO brackets (Phase 2) |
| **Platform outage during Royale** | Low | High | Timer pause + extension; full void if > 2 hours |
| **Oracle manipulation** | Very Low | Critical | Pyth aggregated feeds; position limits; immediate cancellation if detected |
| **Smart contract exploit** | Very Low | Critical | Off-chain coordination minimizes attack surface; only distribution is on-chain |
| **Community backlash** | Low | Medium | Consolation raffle; clear communication; iteration based on feedback |
| **Treasury depletion** | Low | High | Status-first rewards; reduced ADX; sponsor-dependent tokens |

---

# 13. Implementation Roadmap

## Phase 1: Core Royale (Weeks 1-4)

- Tournament lifecycle (create, enter, rounds, eliminate, distribute)
- Risk-adjusted scoring engine
- Shield and Amplifier power-ups
- Basic WebSocket standings
- Admin panel for tournament creation

## Phase 2: Full Integration (Weeks 5-8)

- Profile integration (stats card, flair)
- All 5 power-ups
- Referral bonuses
- Achievement milestones
- Spectator features (share cards, clips)

## Phase 3: Advanced Features (Weeks 9-12)

- Guild Royale (team competition)
- ELO-based skill brackets
- LP Royale for ALP holders
- Prediction markets
- Streamer API

---

# 14. Open Questions for Adrena Team

> **Blocking Items**: The following require Adrena team input before implementation.

## Technical Integration

1. **MrSablier Keepers**: Can we use existing keeper infrastructure for Royale automation?
2. **Yellowstone gRPC**: What are rate limits on the trade indexer for 256 concurrent participants?
3. **adrena-abi**: Should we use CPI interface (Program: `13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet`) or direct RPC?

## Economic Parameters

4. **Treasury Allocation**: Maximum weekly ADX for Royale? (Proposal: 10,000 ADX)
5. **Sponsor Pipeline**: Active discussions with JTO, BONK for Season 3?
6. **Fee Sharing**: Percentage of Royale fees for prize pool? (Proposal: 5%)

## Governance & Operations

7. **DAO Approval**: Does Royale require formal governance proposal?
8. **Moderator Roles**: Which DAO roles get admin panel access?
9. **Dispute Resolution**: Team, DAO multisig, or community vote?

## System Constraints

10. **Mutagen Burns**: Programmatic or manual?
11. **Badge Minting**: Process for new badge types?
12. **Profile Storage**: On-chain or off-chain? Update mechanisms?

---

# 15. Conclusion

Adrena Royale addresses every gap in the current competition landscape:

| Requirement | Solution |
|-------------|----------|
| "More engaging than competitors" | First elimination format on Solana with real-time drama |
| "Integrate with existing systems" | All 9 systems enhanced, not replaced |
| "Edge cases and abuse prevention" | Specific solutions for Z_D_K sybil, quest farming, bracket gaming |
| "Clean, documented, deployable" | Technical spec with full architecture, APIs, and deployment guide |
| "Test with small group" | Phased rollout from internal alpha to public launch |

The battle royale format works because it creates **stories**. Every Royale will have a champion, near-misses, comeback kings, and dramatic eliminations. That's content. That's engagement. That's what no other perp DEX on Solana offers.

**Adrena Royale transforms trading competitions from spreadsheets into spectacles.**

---

*— END OF DESIGN DOCUMENT —*
