/**
 * Mochi Meadow domain layer: pure, deterministic logic (DESIGN §11 "domain/").
 *
 * Tracking math (stage 1), each module importing only from those above it:
 *   dates → schedule → pauses → rules → activity → periods → consistency / streaks / growth → insights
 * Game layer (stage 2), reducers that run in a copy-on-write transaction (tx.ts) and return
 * `{ state, events, ...result }`:
 *   tx → wallet → levels / collection / seasons → badges → pantry / friendship / meadow →
 *   economy → letters → logging → gacha / habits / profile → rollover
 * Nothing here reads Date.now(), Math.random() or browser APIs: time, the app day, the local clock
 * and randomness are injected (`Env`).
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
export * from './meadow';
export * from './economy';
export * from './letters';
export * from './logging';
export * from './gacha';
export * from './habits';
export * from './profile';
export * from './rollover';
