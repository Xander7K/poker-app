/**
 * Random number generator interface used throughout the engine.
 *
 * The engine NEVER uses Math.random() directly. All randomness flows through
 * an injected RNG. This enables determinism (with SeedableRNG) and allows
 * production to use crypto-quality randomness (with CryptoRNG).
 */
export interface RNG {
  /**
   * Returns a uniformly random integer in the half-open interval [0, max).
   * `max` must be a positive integer.
   */
  randomInt(max: number): number;
}
