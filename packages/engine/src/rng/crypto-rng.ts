import { randomInt as nodeRandomInt } from 'node:crypto';

import type { RNG } from './rng.js';

/**
 * Production RNG. Uses Node's `crypto.randomInt` which is uniform and
 * cryptographically strong.
 *
 * Do NOT use in tests where determinism matters — use SeedableRNG instead.
 */
export class CryptoRNG implements RNG {
  randomInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) {
      throw new RangeError(`CryptoRNG.randomInt requires positive integer max, got ${max}`);
    }
    return nodeRandomInt(max);
  }
}
