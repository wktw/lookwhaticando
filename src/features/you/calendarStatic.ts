/**
 * The fixed start day and timestamp of the static calendar files (scripts/generate-cal.mjs), so
 * regenerating them changes nothing unless the event format does. A daily event from a past
 * start day simply shows from today on.
 */
export const STATIC_CAL = { startDate: '2026-01-01', now: Date.UTC(2026, 0, 1) } as const;
