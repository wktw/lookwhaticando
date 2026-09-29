import type { HabitTemplate } from './types';

/** Quick-start habits (DESIGN §5.6). Weekdays: 0 = Sunday … 6 = Saturday. */
export const TEMPLATES: readonly HabitTemplate[] = [
  // Body
  { id: 'water', group: 'body', name: 'Drink water', icon: 'water', schedule: { kind: 'daily' }, target: 8, unit: 'glasses', effort: 'tiny', plant: 'monstera', color: 'sky' },
  { id: 'vitamins', group: 'body', name: 'Take vitamins', icon: 'vitamins', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'succulent', color: 'butter' },
  { id: 'walk', group: 'body', name: 'Go for a walk', icon: 'walk', schedule: { kind: 'daily' }, target: 1, effort: 'steady', plant: 'sunflower', color: 'sage' },
  { id: 'stretch', group: 'body', name: 'Stretch', icon: 'stretch', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'tulip', color: 'peach' },
  { id: 'strength', group: 'body', name: 'Strength training', icon: 'dumbbell', schedule: { kind: 'weekly', times: 3 }, target: 1, effort: 'big', plant: 'cactus', color: 'peach' },
  { id: 'yoga', group: 'body', name: 'Yoga', icon: 'yoga', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'steady', plant: 'lavender', color: 'lavender' },
  { id: 'sleep', group: 'body', name: 'In bed by 11', icon: 'moon-sleep', schedule: { kind: 'daily' }, target: 1, effort: 'steady', plant: 'lily', color: 'lavender' },
  // Mind
  { id: 'read', group: 'mind', name: 'Read', icon: 'book', schedule: { kind: 'daily' }, target: 1, effort: 'steady', plant: 'daisy', color: 'mint' },
  { id: 'journal', group: 'mind', name: 'Journal', icon: 'journal', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'tulip', color: 'lilac' },
  { id: 'meditate', group: 'mind', name: 'Meditate', icon: 'lotus', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'lavender', color: 'lavender' },
  { id: 'hobby', group: 'mind', name: 'Practice a hobby', icon: 'palette', schedule: { kind: 'weekly', times: 3 }, target: 1, effort: 'steady', plant: 'sunflower', color: 'blush' },
  { id: 'learn', group: 'mind', name: 'Learn something', icon: 'lightbulb', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'steady', plant: 'monstera', color: 'sky' },
  // Home
  { id: 'tidy', group: 'home', name: 'Tidy for 10 min', icon: 'broom', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'daisy', color: 'butter' },
  { id: 'plants', group: 'home', name: 'Water the plants', icon: 'watering-can', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'tiny', plant: 'monstera', color: 'sage' },
  { id: 'mealprep', group: 'home', name: 'Meal prep', icon: 'salad', schedule: { kind: 'weekly', times: 1 }, target: 1, effort: 'big', plant: 'strawberry', color: 'sage' },
  { id: 'bathroom', group: 'home', name: 'Clean the bathroom', icon: 'bathtub', schedule: { kind: 'weekly', times: 1 }, target: 1, effort: 'big', plant: 'lily', color: 'sky' },
  { id: 'deepclean', group: 'home', name: 'Deep clean', icon: 'sparkle-clean', schedule: { kind: 'monthly', times: 1 }, target: 1, effort: 'big', plant: 'sunflower', color: 'mint' },
  { id: 'filters', group: 'home', name: 'Change filters', icon: 'wrench', schedule: { kind: 'monthly', times: 1 }, target: 1, effort: 'tiny', plant: 'succulent', color: 'peach' },
  // Heart & life
  { id: 'family', group: 'heart', name: 'Call family', icon: 'phone', schedule: { kind: 'weekly', times: 1 }, target: 1, effort: 'steady', plant: 'tulip', color: 'blush' },
  { id: 'skincare', group: 'heart', name: 'Skincare', icon: 'skincare', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'daisy', color: 'blush' },
  { id: 'budget', group: 'heart', name: 'Review budget', icon: 'piggy-bank', schedule: { kind: 'monthly', times: 1 }, target: 1, effort: 'steady', plant: 'succulent', color: 'butter' },
  { id: 'datenight', group: 'heart', name: 'Date night', icon: 'heart-date', schedule: { kind: 'monthly', times: 2 }, target: 1, effort: 'steady', plant: 'tulip', color: 'lilac' },
  { id: 'creative', group: 'heart', name: 'Make something', icon: 'yarn', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'steady', plant: 'sunflower', color: 'lilac' },
];

export const TEMPLATE_GROUPS = [
  { id: 'body', label: 'Body', icon: 'stretch' },
  { id: 'mind', label: 'Mind', icon: 'book' },
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'heart', label: 'Heart & life', icon: 'heart-date' },
] as const;

