# Adrena Royale Demo Video - Storyboard

## Scene 1: The Problem (0:00-0:12)

**Voiceover:**
> "Trading competitions today have a problem. Leaderboards reward raw PnL — which favors whales and lucky gamblers over skilled traders. There's no drama, no stakes, no skin in the game."

**Visual:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                                                              │
│         Trading competitions have a problem.                 │
│                                                              │
│                           ↓                                  │
│                                                              │
│   ┌───────────────────────────────────────────────────┐      │
│   │  LEADERBOARD                                      │      │
│   ├───────────────────────────────────────────────────┤      │
│   │  1. Whale_42        +$847,000   ← Big capital     │      │
│   │  2. LuckyYolo       +$312,000   ← Lucky gamble    │      │
│   │  3. MegaTrader      +$298,000   ← Big capital     │      │
│   │  ...                                              │      │
│   │  47. SkilledTrader  +$4,200     ← 420% ROI        │      │
│   └───────────────────────────────────────────────────┘      │
│                                                              │
│          Raw PnL favors whales over skilled traders.         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Notes:**
- Dark/black background with text fade-in
- Leaderboard shows skilled trader with 420% ROI ranked #47
- Whales with mediocre % returns dominate top spots

---

## Scene 2: The Solution Teaser (0:12-0:22)

**Voiceover:**
> "What if we could create competitions that reward risk-adjusted performance, where anyone can compete, and every round matters because elimination is real? what if traders can finally put their money where their mouth is?"

**Visual:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                                                              │
│                    What if...                                │
│                                                              │
│                                                              │
│     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│     │             │   │             │   │             │      │
│     │    SKILL    │   │   ANYONE    │   │    REAL     │      │
│     │    BEATS    │ + │     CAN     │ + │   STAKES    │      │
│     │   CAPITAL   │   │   COMPETE   │   │             │      │
│     │             │   │             │   │             │      │
│     │    ROI%     │   │    $100+    │   │    ELIM     │      │
│     └─────────────┘   └─────────────┘   └─────────────┘      │
│                                                              │
│                                                              │
│     Risk-adjusted scoring. Open entry. Real elimination.     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Notes:**
- Three cards fade in sequentially (left → center → right)
- Each card represents a core value prop
- Builds anticipation before the product reveal

---

## Scene 3: Architecture / Tech Overview (0:22-0:36)

**Voiceover:**
> "Introducing Adrena Royale — a battle-royale trading competition built on Adrena Protocol. It connects to Adrena's on-chain perpetuals program via real-time WebSocket feeds, tracking every position open and close as it happens."

**Visual:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                   Introducing Adrena Royale                  │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                    SOLANA MAINNET                        │ │
│ │ ┌──────────────────────────────────────────────────────┐ │ │
│ │ │           ADRENA PROTOCOL (On-Chain)                 │ │ │
│ │ │                                                      │ │ │
│ │ │   Open Position ──► Close Position ──► PnL           │ │ │
│ │ └────────────────────────┬─────────────────────────────┘ │ │
│ └──────────────────────────┼───────────────────────────────┘ │
│                            │                                 │
│                            ▼ Real-time WebSocket             │
│                   ┌───────────────────┐                      │
│                   │  COMPETITION SVC  │                      │
│                   │  ═══════════════  │                      │
│                   │  • Position feed  │                      │
│                   │  • Size multiplier│                      │
│                   └─────────┬─────────┘                      │
│                             │                                │
│                             ▼                                │
│                   ┌───────────────────┐                      │
│                   │  ADRENA ROYALE    │                      │
│                   │  ═══════════════  │                      │
│                   │  • Scoring engine │                      │
│                   │  • Elimination    │                      │
│                   │  • Live standings │                      │
│                   └───────────────────┘                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Notes:**
- Animated flow diagram
- Data flows: Solana → Competition Service → Adrena Royale
- Each box glows as narrator mentions it
- Arrows animate to show real-time data flow
- Add "live" pulse indicator on WebSocket connection

---

## Scene 4: Scoring Formula (0:36-0:48)

**Voiceover:**
> "The scoring engine uses a risk-adjusted formula: PnL divided by position size, multiplied by duration and size multipliers. This rewards conviction trades and penalizes quick scalps under five minutes. Consistent traders earn shields through daily streaks — protection from a single elimination when you need it most."

**Visual:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                       RISK-ADJUSTED SCORING                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │               PnL                                              │  │
│  │       ─────────────────  ×  Duration  ×  Size Multiplier       │  │
│  │         Position Size                                          │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │  DURATION BONUS  │  │  SIZE MULTIPLIER │  │     SHIELDS      │    │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤    │
│  │                  │  │                  │  │                  │    │
│  │  < 5 min   0.5x  │  │  $1K      0.05x  │  │  7-day     +1    │    │
│  │  5-30 min  1.0x  │  │  $10K     2.5x   │  │  streak          │    │
│  │  30m-2hr   1.25x │  │  $100K    9x     │  │                  │    │
│  │  > 2 hr    1.5x  │  │  $1M      30x    │  │  30-day    +2    │    │
│  │                  │  │                  │  │  streak          │    │
│  │   ↑ Conviction   │  │   ↑ Bigger bets  │  │  ↑ Survive elim  │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
│                                                                      │
│           Skill beats capital. Consistency is protected.             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Notes:**
- Formula appears first with animation
- Three modifier cards slide in from sides
- Duration card highlights "< 5 min → 0.5x" in red (penalty)
- Size multiplier shows progression
- Shield card shows trading streak rewards (7-day = 1 shield, 30-day = 2 shields)
- Shields protect from elimination once per use

---

## Production Tools

| Purpose | Tool |
|---------|------|
| Static slides | Figma, Canva |
| Animations | After Effects, Motion |
| Screen recording | OBS |
