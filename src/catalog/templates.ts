import type { HabitTemplate } from './types';

/**
 * Quick-start habits (DESIGN §5.6 + §13). Each has a pre-filled tiny version (the
 * "showed up" version for hard days). Weekdays: 0 = Sunday … 6 = Saturday.
 * Onboarding suggests at most 3.
 */
export const TEMPLATES: readonly HabitTemplate[] = [
  // Body
  { id: 'water', group: 'body', name: 'Drink water', icon: 'water', schedule: { kind: 'daily' }, target: 8, step: 1, unit: 'glasses', effort: 'light', timeOfDay: 'anytime', tiny: { label: '4 glasses', count: 4 }, plant: 'pothos', color: 'sky' },
  { id: 'vitamins', group: 'body', name: 'Take vitamins', icon: 'vitamins', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', plant: 'catgrass', color: 'butter' },
  { id: 'walk', group: 'body', name: 'Go for a walk', icon: 'walk', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'midday', tiny: { label: 'Shoes on, step outside' }, plant: 'catgrass', color: 'sage' },
  { id: 'stretch', group: 'body', name: 'Stretch', icon: 'stretch', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', tiny: { label: 'One big stretch' }, plant: 'begonia', color: 'peach' },
  { id: 'strength', group: 'body', name: 'Strength training', icon: 'dumbbell', schedule: { kind: 'weekly', times: 3, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', tiny: { label: '10 squats' }, plant: 'snakeplant', color: 'peach' },
  { id: 'yoga', group: 'body', name: 'Yoga', icon: 'yoga', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'evening', tiny: { label: 'One sun salutation' }, plant: 'pilea', color: 'lavender' },
  { id: 'sleep', group: 'body', name: 'In bed by 11', icon: 'moon-sleep', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'evening', plant: 'snakeplant', color: 'lavender' },
  // Mind
  { id: 'read', group: 'mind', name: 'Read', icon: 'book', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'evening', tiny: { label: 'One page' }, plant: 'pothos', color: 'mint' },
  { id: 'journal', group: 'mind', name: 'Journal', icon: 'journal', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'evening', tiny: { label: 'One sentence' }, plant: 'begonia', color: 'lilac' },
  { id: 'meditate', group: 'mind', name: 'Meditate', icon: 'lotus', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', tiny: { label: 'Three deep breaths' }, plant: 'pilea', color: 'lavender' },
  { id: 'hobby', group: 'mind', name: 'Practice a hobby', icon: 'palette', schedule: { kind: 'weekly', times: 3, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', tiny: { label: 'Five minutes' }, plant: 'begonia', color: 'blush' },
  { id: 'learn', group: 'mind', name: 'Learn something', icon: 'lightbulb', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', plant: 'pothos', color: 'sky' },
  // Home
  { id: 'tidy', group: 'home', name: 'Tidy for 10 min', icon: 'broom', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'evening', tiny: { label: 'Clear one surface' }, plant: 'snakeplant', color: 'butter' },
  { id: 'plants', group: 'home', name: 'Water the plants', icon: 'watering-can', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'light', timeOfDay: 'morning', plant: 'pothos', color: 'sage' },
  { id: 'mealprep', group: 'home', name: 'Meal prep', icon: 'salad', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', plant: 'catgrass', color: 'sage' },
  { id: 'bathroom', group: 'home', name: 'Clean the bathroom', icon: 'bathtub', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', plant: 'pothos', color: 'sky' },
  { id: 'sheets', group: 'home', name: 'Wash the sheets', icon: 'laundry', schedule: { kind: 'weekly', times: 1, every: 2 }, target: 1, effort: 'steady', timeOfDay: 'anytime', plant: 'snakeplant', color: 'lilac' },
  { id: 'deepclean', group: 'home', name: 'Deep clean', icon: 'sparkle-clean', schedule: { kind: 'monthly', times: 1, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', plant: 'snakeplant', color: 'mint' },
  { id: 'filters', group: 'home', name: 'Change filters', icon: 'wrench', schedule: { kind: 'monthly', times: 1, every: 3 }, target: 1, effort: 'light', timeOfDay: 'anytime', plant: 'snakeplant', color: 'peach' },
  // Heart & life
  { id: 'family', group: 'heart', name: 'Call family', icon: 'phone', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', tiny: { label: 'Send a sweet text' }, plant: 'pilea', color: 'blush' },
  { id: 'skincare', group: 'heart', name: 'Skincare', icon: 'skincare', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'evening', tiny: { label: 'Just moisturizer' }, plant: 'begonia', color: 'blush' },
  { id: 'budget', group: 'heart', name: 'Review budget', icon: 'piggy-bank', schedule: { kind: 'monthly', times: 1, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', plant: 'pilea', color: 'butter' },
  { id: 'qualitytime', group: 'heart', name: 'Quality time', icon: 'heart-date', schedule: { kind: 'monthly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'evening', plant: 'begonia', color: 'lilac' },
  { id: 'creative', group: 'heart', name: 'Make something', icon: 'yarn', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', tiny: { label: 'Ten stitches' }, plant: 'begonia', color: 'lilac' },
  // Gentle "avoid" habits (copy says "Kept it up")
  { id: 'nospend', group: 'heart', name: 'No-spend day', icon: 'piggy-bank', schedule: { kind: 'days', days: [1, 2, 3, 4] }, target: 1, effort: 'light', timeOfDay: 'evening', polarity: 'avoid', plant: 'pilea', color: 'mint' },
  { id: 'phonefree', group: 'mind', name: 'Phone-free bedtime', icon: 'no-phone', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'evening', polarity: 'avoid', plant: 'catgrass', color: 'lavender' },
  { id: 'nosnooze', group: 'body', name: 'No snooze', icon: 'sun', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', polarity: 'avoid', plant: 'catgrass', color: 'butter' },
];

export const TEMPLATE_GROUPS = [
  { id: 'body', label: 'Body', icon: 'stretch' },
  { id: 'mind', label: 'Mind', icon: 'book' },
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'heart', label: 'Heart & life', icon: 'heart-date' },
] as const;

/** Onboarding suggests these three (small, varied, high-success). */
export const ONBOARDING_SUGGESTIONS = ['water', 'walk', 'read'] as const;
