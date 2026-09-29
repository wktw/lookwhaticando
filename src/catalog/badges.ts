/** Badge (achievement) definitions (DESIGN §6.5). Unlock logic lives in domain/badges.ts. */
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  stars: number;
  /** Emoji used inside the illustrated medal. */
  emoji: string;
  /** Medal ribbon color family. */
  color: 'blush' | 'peach' | 'butter' | 'sage' | 'mint' | 'sky' | 'lavender' | 'lilac';
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'first-checkin', name: 'First Sprout', description: 'Check in a habit for the very first time.', stars: 1, emoji: '🌱', color: 'sage' },
  { id: 'first-perfect-day', name: 'Perfect Day', description: 'Finish every habit scheduled for a day.', stars: 1, emoji: '🌼', color: 'butter' },
  { id: 'perfect-week', name: 'Perfect Week', description: 'Finish every scheduled habit for a whole week.', stars: 3, emoji: '🌈', color: 'lavender' },
  { id: 'checkins-10', name: 'Ten Tiny Steps', description: 'Reach 10 check-ins.', stars: 1, emoji: '👣', color: 'peach' },
  { id: 'checkins-50', name: 'Fifty & Flourishing', description: 'Reach 50 check-ins.', stars: 2, emoji: '🌿', color: 'sage' },
  { id: 'checkins-100', name: 'Century Garden', description: 'Reach 100 check-ins.', stars: 3, emoji: '💯', color: 'blush' },
  { id: 'checkins-250', name: 'Quarter Thousand', description: 'Reach 250 check-ins.', stars: 4, emoji: '🌻', color: 'butter' },
  { id: 'checkins-500', name: 'Five Hundred Blooms', description: 'Reach 500 check-ins.', stars: 5, emoji: '💐', color: 'lilac' },
  { id: 'checkins-1000', name: 'Thousand Petals', description: 'Reach 1,000 check-ins.', stars: 8, emoji: '🏵️', color: 'lavender' },
  { id: 'first-rest', name: 'Rest Is Productive', description: 'Take your first rest day. Rest is part of the routine.', stars: 1, emoji: '🌙', color: 'lavender' },
  { id: 'comeback', name: 'Comeback', description: 'Pick a habit back up after a break.', stars: 1, emoji: '🌷', color: 'blush' },
  { id: 'first-capsule', name: 'First Capsule', description: 'Turn the crank for the first time.', stars: 1, emoji: '🟣', color: 'sky' },
  { id: 'first-rare', name: 'Ooh, Shiny', description: 'Pull a rare (or better) collectible.', stars: 1, emoji: '💎', color: 'lavender' },
  { id: 'first-ultra', name: 'Ultra Lucky', description: 'Pull an ultra rare collectible.', stars: 2, emoji: '🌟', color: 'butter' },
  { id: 'collect-10', name: 'Tiny Collector', description: 'Own 10 collectibles from machines.', stars: 2, emoji: '🧺', color: 'peach' },
  { id: 'collect-25', name: 'Curator', description: 'Own 25 collectibles from machines.', stars: 3, emoji: '🖼️', color: 'mint' },
  { id: 'collect-50', name: 'Treasure Keeper', description: 'Own 50 collectibles from machines.', stars: 5, emoji: '🎁', color: 'lilac' },
  { id: 'collect-100', name: 'Meadow Museum', description: 'Own 100 collectibles from machines.', stars: 8, emoji: '🏛️', color: 'lavender' },
  { id: 'set-complete', name: 'Set Complete', description: 'Collect everything in one machine.', stars: 5, emoji: '🏆', color: 'butter' },
  { id: 'first-bloom', name: 'First Bloom', description: 'Grow a habit plant to Blooming.', stars: 2, emoji: '🌸', color: 'blush' },
  { id: 'first-evergreen', name: 'Evergreen', description: 'Grow a habit plant all the way to Evergreen.', stars: 5, emoji: '🌳', color: 'sage' },
  { id: 'first-treat', name: 'Snack Time', description: 'Feed a friend their first treat.', stars: 1, emoji: '🍪', color: 'peach' },
  { id: 'favorite-found', name: 'Favorite Found', description: 'Discover a friend\'s favorite treat.', stars: 1, emoji: '💕', color: 'blush' },
  { id: 'first-outfit', name: 'Dress Up', description: 'Put an outfit on a friend.', stars: 1, emoji: '🎀', color: 'lilac' },
  { id: 'best-friends', name: 'Best Friends', description: 'Reach max friendship with a friend.', stars: 3, emoji: '💞', color: 'blush' },
  { id: 'early-bird', name: 'Early Bird', description: 'Check in before 7:00 am.', stars: 1, emoji: '🐤', color: 'butter' },
  { id: 'night-owl', name: 'Night Owl', description: 'Check in after 10:00 pm.', stars: 1, emoji: '🦉', color: 'lavender' },
  { id: 'steady-month', name: 'Steady Month', description: 'Be at least 80% consistent for a whole month.', stars: 3, emoji: '📅', color: 'mint' },
];

export const BADGE_BY_ID: ReadonlyMap<string, BadgeDef> = new Map(BADGES.map((b) => [b.id, b]));
