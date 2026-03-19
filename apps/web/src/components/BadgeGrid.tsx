'use client';

interface Badge {
  id: string;
  badgeType: string;
  awardedAt: string;
  name?: string;
  description?: string;
  rarity?: string;
  imageUrl?: string;
}

interface BadgeGridProps {
  badges: Badge[];
}

const rarityColors: Record<string, string> = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-orange-500',
};

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
        >
          <div
            className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${
              rarityColors[badge.rarity || 'common']
            } flex items-center justify-center text-2xl`}
          >
            {getBadgeEmoji(badge.badgeType)}
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm">
              {badge.name || badge.badgeType}
            </div>
            {badge.description && (
              <div className="text-xs text-gray-400 mt-1">
                {badge.description}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              {new Date(badge.awardedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getBadgeEmoji(badgeType: string): string {
  const emojiMap: Record<string, string> = {
    royale_champion: '👑',
    royale_finalist_silver: '🥈',
    royale_finalist_bronze: '🥉',
    royale_top10: '🏆',
    first_blood: '⚔️',
    veteran_5: '🎖️',
    gladiator_10: '⚔️',
    legend_25: '🌟',
    streak_7: '🔥',
    streak_30: '💎',
    shield_save: '🛡️',
    comeback_king: '👊',
  };
  return emojiMap[badgeType] || '🏅';
}
