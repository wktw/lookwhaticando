/**
 * The catkin logic layer: pure, deterministic logic (DESIGN §11 "src/domain").
 *
 * Tracking math (stage 1), each module importing only from those above it:
 *   dates → schedule → pauses → rules → activity → periods → consistency / streaks / growth → insights
 * Game layer (stage 2), reducers that run in a copy-on-write transaction (tx.ts) and return
 * `{ state, events, ...result }`:
 *   tx → wallet → levels / collection / seasons → badges → pantry / friendship →
 *   routines / stacking / company / signature → shelf → economy → journal / rituals → letters →
 *   logging → gacha / habits / profile → hemisphere / seasonReview → rollover
 * The three pillars (§14) and rituals (§13): company.ts (Keeping Company), routines.ts,
 * signature.ts (Blooms Like You), stacking.ts, journal.ts (Garden Journal), seasonReview.ts and
 * hemisphere.ts (Season Review), rituals.ts (Sunday Note, Herbarium page, birthday, came-home days,
 * the moving-in anniversary).
 * Nothing here reads Date.now(), Math.random() or browser APIs: time, the app day, the local clock
 * and randomness are injected (`Env`).
 *
 * Section references are to the catkin bible (docs/DESIGN.md). "v1 §13.x" cites the audit amendments
 * of the archived first bible (docs/archive/DESIGN-v1-mochi.md §13), which the catkin bible folds into
 * its own sections; NOTES-domain.md keeps the logic team's readings of both.
 */
export * from './dates';
export * from './schedule';
export * from './pauses';
export * from './rules';
export * from './activity';
export * from './periods';
export * from './consistency';
export * from './streaks';
export * from './growth';
export * from './insights';
export * from './rng';
export * from './tx';
export * from './wallet';
export * from './levels';
export * from './collection';
export * from './seasons';
export * from './badges';
export * from './pantry';
export * from './friendship';
export * from './shelf';
export * from './economy';
export * from './letters';
export * from './logging';
export * from './gacha';
export * from './habits';
export * from './profile';
export * from './rollover';
export * from './routines';
export * from './stacking';
export * from './company';
export * from './signature';
export * from './journal';
export * from './rituals';
export * from './hemisphere';
export * from './seasonReview';
