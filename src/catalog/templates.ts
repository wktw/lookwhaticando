import type { HabitTemplate } from './types';

/**
 * Quick-start habits (DESIGN §5, §9.6). Many have a pre-filled tiny version (the small version
 * that still counts). Names are short, because the toast reads "{name}, watered." Tiny labels
 * spell out a number that starts them ("Four glasses"). Weekdays: 0 = Sunday … 6 = Saturday.
 * Onboarding suggests at most 3.
 */
export const TEMPLATES: readonly HabitTemplate[] = [
  // Body
  { id: 'water', group: 'body', name: 'Drink water', icon: 'water', schedule: { kind: 'daily' }, target: 8, step: 1, unit: 'glasses', effort: 'light', timeOfDay: 'anytime', tiny: { label: 'Four glasses', count: 4 }, plant: 'pothos', color: 'sky' },
  { id: 'vitamins', group: 'body', name: 'Take vitamins', icon: 'vitamins', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', plant: 'catgrass', color: 'butter' },
  { id: 'walk', group: 'body', name: 'Walk', icon: 'walk', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'midday', tiny: { label: 'Shoes on, step outside' }, plant: 'catgrass', color: 'sage' },
  { id: 'stretch', group: 'body', name: 'Stretch', icon: 'stretch', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', tiny: { label: 'One long stretch' }, plant: 'begonia', color: 'peach' },
  { id: 'strength', group: 'body', name: 'Strength training', icon: 'dumbbell', schedule: { kind: 'weekly', times: 3, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', tiny: { label: 'Ten squats' }, plant: 'snakeplant', color: 'peach' },
  { id: 'yoga', group: 'body', name: 'Yoga', icon: 'yoga', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'evening', tiny: { label: 'One sun salutation' }, plant: 'pilea', color: 'lavender' },
  { id: 'sleep', group: 'body', name: 'In bed by 11', icon: 'moon-sleep', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'evening', plant: 'snakeplant', color: 'lavender' },
  // Mind
  { id: 'read', group: 'mind', name: 'Read', icon: 'book', schedule: { kind: 'daily' }, target: 1, effort: 'steady', timeOfDay: 'evening', tiny: { label: 'One page' }, plant: 'pothos', color: 'mint' },
  { id: 'journal', group: 'mind', name: 'Journal', icon: 'journal', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'evening', tiny: { label: 'One line' }, plant: 'begonia', color: 'lilac' },
  { id: 'meditate', group: 'mind', name: 'Meditate', icon: 'lotus', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'morning', tiny: { label: 'Three slow breaths' }, plant: 'pilea', color: 'lavender' },
  { id: 'hobby', group: 'mind', name: 'Hobby time', icon: 'palette', schedule: { kind: 'weekly', times: 3, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', tiny: { label: 'Five minutes' }, plant: 'begonia', color: 'blush' },
  { id: 'learn', group: 'mind', name: 'Learn something', icon: 'lightbulb', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', plant: 'pothos', color: 'sky' },
  // Home
  { id: 'tidy', group: 'home', name: 'Tidy for 10 minutes', icon: 'broom', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'evening', tiny: { label: 'Clear one surface' }, plant: 'snakeplant', color: 'butter' },
  { id: 'plants', group: 'home', name: 'The real plants', icon: 'watering-can', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'light', timeOfDay: 'morning', plant: 'pothos', color: 'sage' },
  { id: 'mealprep', group: 'home', name: 'Meal prep', icon: 'salad', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', plant: 'catgrass', color: 'sage' },
  { id: 'bathroom', group: 'home', name: 'Clean the bathroom', icon: 'bathtub', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', plant: 'pothos', color: 'sky' },
  { id: 'sheets', group: 'home', name: 'Wash the sheets', icon: 'laundry', schedule: { kind: 'weekly', times: 1, every: 2 }, target: 1, effort: 'steady', timeOfDay: 'anytime', plant: 'snakeplant', color: 'lilac' },
  { id: 'deepclean', group: 'home', name: 'Deep clean', icon: 'sparkle-clean', schedule: { kind: 'monthly', times: 1, every: 1 }, target: 1, effort: 'big', timeOfDay: 'anytime', plant: 'snakeplant', color: 'mint' },
  { id: 'filters', group: 'home', name: 'Change the filters', icon: 'wrench', schedule: { kind: 'monthly', times: 1, every: 3 }, target: 1, effort: 'light', timeOfDay: 'anytime', plant: 'snakeplant', color: 'peach' },
  // Heart & life
  { id: 'family', group: 'heart', name: 'Call family', icon: 'phone', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', tiny: { label: 'Send a text' }, plant: 'pilea', color: 'blush' },
  { id: 'skincare', group: 'heart', name: 'Skincare', icon: 'skincare', schedule: { kind: 'daily' }, target: 1, effort: 'light', timeOfDay: 'evening', tiny: { label: 'Just moisturiser' }, plant: 'begonia', color: 'blush' },
  { id: 'budget', group: 'heart', name: 'Look over the budget', icon: 'piggy-bank', schedule: { kind: 'monthly', times: 1, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', plant: 'pilea', color: 'butter' },
  { id: 'qualitytime', group: 'heart', name: 'Quality time', icon: 'heart-date', schedule: { kind: 'monthly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'evening', plant: 'begonia', color: 'lilac' },
  { id: 'creative', group: 'heart', name: 'Make something', icon: 'yarn', schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'anytime', tiny: { label: 'Ten stitches' }, plant: 'begonia', color: 'lilac' },
  // "Avoid" habits: the status line says "Kept it up 12 days" instead of "12 days"
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
