/**
 * The Habit Editor's own words that the copy deck has no constant for yet (VOICE §22 names the
 * fields; these are the small labels around them). See NOTES-w2-today.md: they belong in lines.ts.
 */
export const EDITOR_COPY = {
  newTitle: 'A new habit',
  editTitle: 'Edit {habit}',
  ideas: 'Ideas',
  ideaGroups: 'Kinds of ideas',
  /** The disclosure after name, ideas, how often and when. */
  more: 'Colour, plant, amount and more',
  /** Closing a form with something in it. */
  leaveTitle: 'Leave without saving?',
  leaveNew: 'The habit isn’t planted yet.',
  leaveEdit: 'Your changes aren’t saved yet.',
  keepEditing: 'Keep editing',
  leave: 'Leave it',
  searchIcons: 'Find an icon',
  chooseIcon: 'Choose an icon',
  suggested: 'Suggested from the name',
  unit: 'Unit',
  step: 'Each tap adds',
  amount: 'Amount',
  times: 'How many times',
  every: 'Every',
  days: 'Which days',
  follow: 'Or follow a habit',
  tinyCount: 'Tiny amount',
  seasonHelp: 'Until {date}, then it goes to the balcony shelf with a ribbon.',
  whyPlaceholder: 'A line, just for you',
  applyFrom: 'From when?',
  applyOptions: { today: 'From today', 'next-period': 'From next {period}', tomorrow: 'From tomorrow' },
  archive: 'Archive',
  delete: 'Delete',
  keepsCompany: 'Keeps {habit} company',
  locked: 'In {series}',
  planted: '{Plant} is a cutting in a glass of water now.',
  saved: 'Saved.',
} as const;
