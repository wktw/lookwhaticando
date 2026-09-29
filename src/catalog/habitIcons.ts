/**
 * Custom-drawn habit icons (replacing system emoji, which clash with the hand-drawn art and
 * render inconsistently across iPhone/Mac/Windows). Art lives in src/art/habit-icons.
 * `keywords` power the icon picker search and auto-suggestion from a habit's name.
 */
export interface HabitIconDef {
  id: string;
  label: string;
  keywords: string[];
}

export const HABIT_ICONS: readonly HabitIconDef[] = [
  // body & health
  { id: 'water', label: 'Water', keywords: ['water', 'drink', 'hydrate', 'glass'] },
  { id: 'vitamins', label: 'Vitamins', keywords: ['vitamin', 'pill', 'medicine', 'supplement', 'meds'] },
  { id: 'walk', label: 'Walk', keywords: ['walk', 'steps', 'stroll', 'hike'] },
  { id: 'run', label: 'Run', keywords: ['run', 'jog', 'cardio', 'sneaker'] },
  { id: 'stretch', label: 'Stretch', keywords: ['stretch', 'mobility', 'flexibility'] },
  { id: 'yoga', label: 'Yoga', keywords: ['yoga', 'pilates', 'mat'] },
  { id: 'dumbbell', label: 'Strength', keywords: ['gym', 'strength', 'weights', 'lift', 'workout', 'exercise'] },
  { id: 'bike', label: 'Bike', keywords: ['bike', 'cycle', 'cycling', 'spin'] },
  { id: 'swim', label: 'Swim', keywords: ['swim', 'pool'] },
  { id: 'moon-sleep', label: 'Sleep', keywords: ['sleep', 'bed', 'bedtime', 'rest', 'nap'] },
  { id: 'apple', label: 'Healthy eating', keywords: ['eat', 'fruit', 'healthy', 'food', 'snack'] },
  { id: 'salad', label: 'Veggies', keywords: ['veggie', 'vegetable', 'salad', 'meal', 'prep', 'cook'] },
  { id: 'tea', label: 'Tea', keywords: ['tea', 'coffee', 'caffeine', 'cup'] },
  { id: 'tooth', label: 'Floss', keywords: ['floss', 'teeth', 'brush', 'dental'] },
  { id: 'skincare', label: 'Skincare', keywords: ['skin', 'skincare', 'face', 'lotion', 'spf', 'sunscreen'] },
  { id: 'no-phone', label: 'Less screen', keywords: ['phone', 'screen', 'social', 'scroll', 'detox'] },
  { id: 'sun', label: 'Sunshine', keywords: ['sun', 'outside', 'outdoors', 'light', 'fresh air'] },
  // mind
  { id: 'book', label: 'Read', keywords: ['read', 'book', 'novel', 'pages'] },
  { id: 'journal', label: 'Journal', keywords: ['journal', 'write', 'diary', 'gratitude', 'notes'] },
  { id: 'lotus', label: 'Meditate', keywords: ['meditate', 'mindful', 'breathe', 'calm', 'breath'] },
  { id: 'lightbulb', label: 'Learn', keywords: ['learn', 'study', 'course', 'class', 'idea'] },
  { id: 'language', label: 'Language', keywords: ['language', 'duolingo', 'spanish', 'french', 'japanese', 'words'] },
  { id: 'music', label: 'Music', keywords: ['music', 'piano', 'guitar', 'practice', 'sing', 'instrument'] },
  { id: 'palette', label: 'Art', keywords: ['art', 'draw', 'paint', 'sketch', 'hobby', 'creative'] },
  { id: 'camera', label: 'Photo', keywords: ['photo', 'camera', 'picture'] },
  { id: 'laptop', label: 'Work', keywords: ['work', 'code', 'computer', 'focus', 'email'] },
  // home
  { id: 'broom', label: 'Tidy', keywords: ['tidy', 'clean', 'sweep', 'declutter', 'chores'] },
  { id: 'sparkle-clean', label: 'Deep clean', keywords: ['deep clean', 'scrub', 'spotless'] },
  { id: 'bathtub', label: 'Bathroom', keywords: ['bathroom', 'bath', 'shower', 'tub'] },
  { id: 'laundry', label: 'Laundry', keywords: ['laundry', 'wash', 'clothes'] },
  { id: 'dishes', label: 'Dishes', keywords: ['dishes', 'kitchen', 'dishwasher'] },
  { id: 'watering-can', label: 'Plants', keywords: ['plant', 'water plants', 'garden', 'watering'] },
  { id: 'wrench', label: 'Maintenance', keywords: ['fix', 'filter', 'repair', 'maintenance', 'tools'] },
  { id: 'cart', label: 'Groceries', keywords: ['grocery', 'shopping', 'shop', 'errands'] },
  { id: 'house', label: 'Home', keywords: ['home', 'house', 'room', 'bed', 'make bed'] },
  { id: 'paw', label: 'Pet care', keywords: ['pet', 'dog', 'cat', 'feed', 'walk dog', 'litter'] },
  // heart & life
  { id: 'phone', label: 'Call', keywords: ['call', 'family', 'friend', 'mom', 'dad', 'text'] },
  { id: 'heart-date', label: 'Love', keywords: ['date', 'love', 'partner', 'romance', 'kind'] },
  { id: 'piggy-bank', label: 'Budget', keywords: ['budget', 'money', 'save', 'finance', 'spend', 'bills'] },
  { id: 'yarn', label: 'Craft', keywords: ['knit', 'crochet', 'craft', 'sew', 'yarn', 'make'] },
  { id: 'gift', label: 'Kindness', keywords: ['gift', 'kindness', 'give', 'volunteer'] },
  { id: 'pray', label: 'Reflect', keywords: ['pray', 'faith', 'reflect', 'spiritual'] },
  { id: 'smile', label: 'Self care', keywords: ['self care', 'happy', 'mood', 'smile', 'feel'] },
  { id: 'calendar', label: 'Plan', keywords: ['plan', 'review', 'calendar', 'schedule', 'week'] },
  { id: 'star', label: 'Goal', keywords: ['goal', 'star', 'special', 'win'] },
  { id: 'leaf', label: 'Nature', keywords: ['nature', 'leaf', 'green', 'eco'] },
  { id: 'flower', label: 'Bloom', keywords: ['flower', 'bloom', 'grow'] },
  { id: 'sparkle', label: 'Anything', keywords: ['other', 'misc', 'custom', 'habit'] },
];

export const HABIT_ICON_IDS: ReadonlySet<string> = new Set(HABIT_ICONS.map((i) => i.id));

/** Suggest an icon for a habit name (first keyword hit), falling back to 'sparkle'. */
export function suggestHabitIcon(name: string): string {
  const n = name.toLowerCase();
  for (const icon of HABIT_ICONS) if (icon.keywords.some((k) => n.includes(k))) return icon.id;
  return 'sparkle';
}
