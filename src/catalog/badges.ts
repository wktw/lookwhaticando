/**
 * Pins: the enamel pins on the Progress screen (DESIGN §9.2), internally "badges". Unlock logic
 * lives in the domain. Names are short and engraved, so their numbers are spelled out;
 * descriptions say plainly how each is earned (docs/VOICE.md, Pins).
 */
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  /** Stamps the pin pays (internally `stars`). */
  stars: number;
  /** Kept for data compatibility and never displayed: catkin has no emoji (DESIGN §12). Always ''. */
  emoji: string;
  /** Enamel colour family. */
  color: 'blush' | 'peach' | 'butter' | 'sage' | 'mint' | 'sky' | 'lavender' | 'lilac';
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'first-checkin', name: 'First watering', description: 'Water a habit for the first time.', stars: 1, emoji: '', color: 'sage' },
  { id: 'first-perfect-day', name: 'Everything watered', description: 'Water every habit that’s on for the day. Rest days count as watered.', stars: 1, emoji: '', color: 'butter' },
  { id: 'perfect-week', name: 'A whole week, all watered', description: 'Water every habit that’s on, every day for a week. Rest days count as watered.', stars: 3, emoji: '', color: 'lavender' },
  { id: 'checkins-10', name: 'Ten waterings', description: 'Water habits 10 times in all.', stars: 1, emoji: '', color: 'peach' },
  { id: 'checkins-50', name: 'Fifty waterings', description: 'Water habits 50 times in all.', stars: 2, emoji: '', color: 'sage' },
  { id: 'checkins-100', name: 'A hundred waterings', description: 'Water habits 100 times in all.', stars: 3, emoji: '', color: 'blush' },
  { id: 'checkins-250', name: 'Two hundred and fifty waterings', description: 'Water habits 250 times in all.', stars: 4, emoji: '', color: 'butter' },
  { id: 'checkins-500', name: 'Five hundred waterings', description: 'Water habits 500 times in all.', stars: 5, emoji: '', color: 'lilac' },
  { id: 'checkins-1000', name: 'A thousand waterings', description: 'Water habits 1,000 times in all.', stars: 8, emoji: '', color: 'lavender' },
  { id: 'first-rest', name: 'First rest day', description: 'Give any habit a rest day. It shows as a moon.', stars: 1, emoji: '', color: 'lavender' },
  { id: 'comeback', name: 'Welcome home', description: 'Comes with your first welcome-home ticket.', stars: 1, emoji: '', color: 'blush' },
  { id: 'first-capsule', name: 'First capsule', description: 'Turn the handle on any capsule cabinet.', stars: 1, emoji: '', color: 'sky' },
  { id: 'first-rare', name: 'Foil edge', description: 'Open a Rare, or anything rarer.', stars: 1, emoji: '', color: 'lavender' },
  { id: 'first-ultra', name: 'Holographic stripes', description: 'Open a Super rare. A Secret counts.', stars: 2, emoji: '', color: 'butter' },
  { id: 'collect-10', name: 'Ten in the Field Guide', description: 'Collect 10 different things from the capsules.', stars: 2, emoji: '', color: 'peach' },
  { id: 'collect-25', name: 'Twenty-five in the Field Guide', description: 'Collect 25 different things from the capsules.', stars: 3, emoji: '', color: 'mint' },
  { id: 'collect-50', name: 'Fifty in the Field Guide', description: 'Collect 50 different things from the capsules.', stars: 5, emoji: '', color: 'lilac' },
  { id: 'collect-100', name: 'A hundred in the Field Guide', description: 'Collect 100 different things from the capsules.', stars: 8, emoji: '', color: 'lavender' },
  { id: 'set-complete', name: 'A full lineup', description: 'Tick off every item on one series leaflet.', stars: 5, emoji: '', color: 'butter' },
  { id: 'first-bloom', name: 'First bloom', description: 'Grow a habit’s plant to Blooming.', stars: 2, emoji: '', color: 'blush' },
  { id: 'first-evergreen', name: 'Brass watering can', description: 'Grow a habit’s plant all the way to Evergreen.', stars: 5, emoji: '', color: 'sage' },
  { id: 'first-treat', name: 'First treat', description: 'Give a pet a treat from the pantry.', stars: 1, emoji: '', color: 'peach' },
  { id: 'favorite-found', name: 'A favourite treat', description: 'Find out which treat a pet likes best.', stars: 1, emoji: '', color: 'blush' },
  { id: 'first-outfit', name: 'Something to wear', description: 'Put something to wear on a pet.', stars: 1, emoji: '', color: 'lilac' },
  { id: 'best-friends', name: 'Brass name tag', description: 'Reach friendship level 10 with a pet: best friends.', stars: 3, emoji: '', color: 'blush' },
  { id: 'early-bird', name: 'Before seven', description: 'Water a habit before 7:00 am.', stars: 1, emoji: '', color: 'butter' },
  { id: 'wind-down', name: 'Under the lamp', description: 'Water habits 3 times between 7 and 10 pm.', stars: 1, emoji: '', color: 'lavender' },
  { id: 'album-complete', name: 'A full Field Guide page', description: 'Collect everything on one page of the Field Guide.', stars: 5, emoji: '', color: 'peach' },
  { id: 'first-harvest', name: 'First harvest', description: 'Pick a treat from an edible plant that’s Blooming.', stars: 1, emoji: '', color: 'sage' },
  { id: 'steady-month', name: 'A steady month', description: 'Water at least 80% of what’s on in a calendar month.', stars: 3, emoji: '', color: 'mint' },
];

export const BADGE_BY_ID: ReadonlyMap<string, BadgeDef> = new Map(BADGES.map((b) => [b.id, b]));
