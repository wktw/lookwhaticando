import { STARTER_IDS } from '@/catalog/collectibles';
import { SCHEMA_VERSION, type AppState } from './types';

/** A brand-new save. Starter plants/pots/treat recipes are owned from the beginning. */
export function createInitialState(now: number = Date.now()): AppState {
  const collection: AppState['collection'] = {};
  for (const id of STARTER_IDS) {
    if (id.startsWith('pet-')) continue; // Mochi is given during onboarding
    collection[id] = { count: 1, firstAt: now };
  }
  return {
    version: SCHEMA_VERSION,
    profile: { name: '', buddy: null, onboarded: false, createdAt: now },
    settings: {
      weekStart: 1,
      dayStartsAt: 180,
      theme: 'auto',
      sound: true,
      volume: 0.6,
      haptics: true,
      reduceMotion: 'auto',
      quickOpen: false,
      quietRewards: false,
      reminders: {},
    },
    habits: [],
    logs: {},
    offDays: {},
    wallet: { coins: 0, stars: 0, stardust: 0, tickets: 0 },
    lifetime: { coinsEarned: 0, starsEarned: 0, checkins: 0, pulls: 0, perfectDays: 0, showUpDays: 0 },
    ledger: { recent: {}, sunshine: {}, bestStage: {}, once: {}, daily: {} },
    collection,
    pity: {},
    pets: {},
    pantry: {},
    meadow: { zones: ['meadow'], decor: [] },
    badges: {},
    inbox: [],
    clock: { maxDateKey: '', maxEpochMs: 0, lastCheckinAt: 0 },
  };
}
