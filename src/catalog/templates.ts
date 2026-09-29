import type { HabitTemplate } from './types';

/** Quick-start habits (DESIGN §5.6). Weekdays: 0 = Sunday … 6 = Saturday. */
export const TEMPLATES: readonly HabitTemplate[] = [
  // Body
  { id: 'water', group: 'body', name: 'Drink water', emoji: '💧', schedule: { kind: 'daily' }, target: 8, unit: 'glasses', effort: 'tiny', plant: 'monstera', color: 'sky' },
  { id: 'vitamins', group: 'body', name: 'Take vitamins', emoji: '💊', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'succulent', color: 'butter' },
  { id: 'walk', group: 'body', name: 'Go for a walk', emoji: '🚶‍♀️', schedule: { kind: 'daily' }, target: 1, effort: 'steady', plant: 'sunflower', color: 'sage' },
  { id: 'stretch', group: 'body', name: 'Stretch', emoji: '🤸‍♀️', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'tulip', color: 'peach' },
  { id: 'strength', group: 'body', name: 'Strength training', emoji: '🏋️‍♀️', schedule: { kind: 'weekly', times: 3 }, target: 1, effort: 'big', plant: 'cactus', color: 'peach' },
  { id: 'yoga', group: 'body', name: 'Yoga', emoji: '🧘‍♀️', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'steady', plant: 'lavender', color: 'lavender' },
  { id: 'sleep', group: 'body', name: 'In bed by 11', emoji: '😴', schedule: { kind: 'daily' }, target: 1, effort: 'steady', plant: 'lily', color: 'lavender' },
  // Mind
  { id: 'read', group: 'mind', name: 'Read', emoji: '📖', schedule: { kind: 'daily' }, target: 1, effort: 'steady', plant: 'daisy', color: 'mint' },
  { id: 'journal', group: 'mind', name: 'Journal', emoji: '✍️', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'tulip', color: 'lilac' },
  { id: 'meditate', group: 'mind', name: 'Meditate', emoji: '🌙', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'lavender', color: 'lavender' },
  { id: 'hobby', group: 'mind', name: 'Practice a hobby', emoji: '🎨', schedule: { kind: 'weekly', times: 3 }, target: 1, effort: 'steady', plant: 'sunflower', color: 'blush' },
  { id: 'learn', group: 'mind', name: 'Learn something', emoji: '🧠', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'steady', plant: 'monstera', color: 'sky' },
  // Home
  { id: 'tidy', group: 'home', name: 'Tidy for 10 min', emoji: '🧹', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'daisy', color: 'butter' },
  { id: 'plants', group: 'home', name: 'Water the plants', emoji: '🪴', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'tiny', plant: 'monstera', color: 'sage' },
  { id: 'mealprep', group: 'home', name: 'Meal prep', emoji: '🥗', schedule: { kind: 'weekly', times: 1 }, target: 1, effort: 'big', plant: 'strawberry', color: 'sage' },
  { id: 'bathroom', group: 'home', name: 'Clean the bathroom', emoji: '🛁', schedule: { kind: 'weekly', times: 1 }, target: 1, effort: 'big', plant: 'lily', color: 'sky' },
  { id: 'deepclean', group: 'home', name: 'Deep clean', emoji: '✨', schedule: { kind: 'monthly', times: 1 }, target: 1, effort: 'big', plant: 'sunflower', color: 'mint' },
  { id: 'filters', group: 'home', name: 'Change filters', emoji: '🔧', schedule: { kind: 'monthly', times: 1 }, target: 1, effort: 'tiny', plant: 'succulent', color: 'peach' },
  // Heart & life
  { id: 'family', group: 'heart', name: 'Call family', emoji: '📞', schedule: { kind: 'weekly', times: 1 }, target: 1, effort: 'steady', plant: 'tulip', color: 'blush' },
  { id: 'skincare', group: 'heart', name: 'Skincare', emoji: '🧴', schedule: { kind: 'daily' }, target: 1, effort: 'tiny', plant: 'daisy', color: 'blush' },
  { id: 'budget', group: 'heart', name: 'Review budget', emoji: '💰', schedule: { kind: 'monthly', times: 1 }, target: 1, effort: 'steady', plant: 'succulent', color: 'butter' },
  { id: 'datenight', group: 'heart', name: 'Date night', emoji: '💕', schedule: { kind: 'monthly', times: 2 }, target: 1, effort: 'steady', plant: 'tulip', color: 'lilac' },
  { id: 'creative', group: 'heart', name: 'Make something', emoji: '🧶', schedule: { kind: 'weekly', times: 2 }, target: 1, effort: 'steady', plant: 'sunflower', color: 'lilac' },
];

export const TEMPLATE_GROUPS = [
  { id: 'body', label: 'Body', emoji: '🌿' },
  { id: 'mind', label: 'Mind', emoji: '📚' },
  { id: 'home', label: 'Home', emoji: '🏡' },
  { id: 'heart', label: 'Heart & life', emoji: '💗' },
] as const;

/** Emoji palette offered in the habit editor. */
export const HABIT_EMOJI: readonly string[] = [
  '💧', '💊', '🚶‍♀️', '🏃‍♀️', '🤸‍♀️', '🧘‍♀️', '🏋️‍♀️', '🚴‍♀️', '🏊‍♀️', '😴', '🥗', '🍎', '🥦', '🍵', '☕️', '🚭',
  '📖', '✍️', '🌙', '🎨', '🧠', '🎹', '🎸', '📷', '🧶', '🪡', '💻', '🗣️', '🌍', '📝',
  '🧹', '🪴', '🛁', '✨', '🔧', '🧺', '🍳', '🛒', '🐶', '🐱', '🌱', '🌸',
  '📞', '🧴', '💰', '💕', '💌', '🙏', '😊', '🎁', '⭐️', '🌈', '☀️', '🦷',
];
