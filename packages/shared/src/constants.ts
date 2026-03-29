// ═══════════════════════════════════════════════════════════════════════
// BADGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// SHIELD THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════

export const SHIELD_THRESHOLDS = {
  STREAK_7_DAYS: 7,   // 1 shield
  STREAK_30_DAYS: 30  // +1 shield (cumulative)
} as const;

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT TOURNAMENT SETTINGS
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_TOURNAMENT_CONFIG = {
  minParticipants: 20,
  maxParticipants: 256,
  minNotionalSize: 100, // USD
  snipePenaltyMins: 5
} as const;

export const DEFAULT_ROUND_CONFIGS = [
  { duration: 1440, eliminationPercent: 0.25 },  // Round 1: 24h, 25% cut
  { duration: 1440, eliminationPercent: 0.25 },  // Round 2: 24h, 25% cut
  { duration: 1440, eliminationPercent: 0.33 },  // Round 3: 24h, 33% cut
  { duration: 1440, eliminationPercent: 0.50 },  // Round 4: 24h, 50% cut
  { duration: 1440, eliminationPercent: 0 }      // Finals: 24h, no elimination
] as const;

// ═══════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

export const API_ENDPOINTS = {
  // Public
  TOURNAMENTS: '/api/tournaments',
  TOURNAMENT_DETAIL: (id: string) => `/api/tournaments/${id}`,
  STANDINGS: (id: string) => `/api/tournaments/${id}/standings`,
  PROFILE: (wallet: string) => `/api/profile/${wallet}`,

  // Participant
  REGISTER: '/api/participants/register',
  MY_STATUS: (tournamentId: string, wallet: string) =>
    `/api/participants/${tournamentId}/${wallet}`,

  // Admin
  ADMIN_CREATE: '/api/admin/tournaments',
  ADMIN_START: (id: string) => `/api/admin/tournaments/${id}/start`,
  ADMIN_PAUSE: (id: string) => `/api/admin/tournaments/${id}/pause`,
  ADMIN_CANCEL: (id: string) => `/api/admin/tournaments/${id}/cancel`,
  ADMIN_DQ: (id: string) => `/api/admin/tournaments/${id}/disqualify`
} as const;
