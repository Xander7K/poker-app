import { FULL_DECK } from '@poker-app/shared';

/**
 * Poker engine — pure logic, no I/O, no network, no DB.
 * Phase 0: empty placeholder. Phase 1 will add actual logic.
 */
export const ENGINE_VERSION = '0.0.0';

/**
 * Re-export the canonical deck so downstream consumers can import from a single place.
 * This also serves as a smoke test that the @poker-app/shared dependency is wired correctly.
 */
export const CANONICAL_DECK = FULL_DECK;

export * from './types/index.js';
export * from './errors.js';
export * from './rng/index.js';
