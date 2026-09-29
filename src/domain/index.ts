/**
 * Mochi Meadow domain layer: pure, deterministic tracking math (DESIGN §11 "domain/").
 *
 * Layering (each module imports only from those above it):
 *   dates → schedule → pauses → rules → activity → periods → consistency / streaks / growth → insights
 * Everything is a pure function of (state, today, injected clock/rng); nothing reads Date.now() or
 * Math.random().
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
