import type { RNG } from './rng.js';

const MASK64 = (1n << 64n) - 1n;

function rotl(x: bigint, k: bigint): bigint {
  return ((x << k) | (x >> (64n - k))) & MASK64;
}

/**
 * Deterministic, seedable RNG based on xoshiro256** (Vigna 2018).
 *
 * State is four 64-bit integers, represented here as four `bigint` values.
 * Output is a 64-bit unsigned integer per call, from which we derive a uniform
 * integer in [0, max).
 *
 * This is NOT cryptographically secure. Use only in tests and replay.
 */
export class SeedableRNG implements RNG {
  private s0: bigint;
  private s1: bigint;
  private s2: bigint;
  private s3: bigint;

  /**
   * Creates a new RNG from a seed string. The seed is expanded with
   * SplitMix64 to fill the four state words. Identical seed strings always
   * produce identical sequences.
   */
  constructor(seed: string) {
    let x = SeedableRNG.hashSeed(seed);
    // SplitMix64 to fill state.
    x = (x + 0x9e3779b97f4a7c15n) & MASK64;
    this.s0 = SeedableRNG.splitmix64(x);
    x = (x + 0x9e3779b97f4a7c15n) & MASK64;
    this.s1 = SeedableRNG.splitmix64(x);
    x = (x + 0x9e3779b97f4a7c15n) & MASK64;
    this.s2 = SeedableRNG.splitmix64(x);
    x = (x + 0x9e3779b97f4a7c15n) & MASK64;
    this.s3 = SeedableRNG.splitmix64(x);
    // Avoid the all-zeros state, which xoshiro can't escape.
    if (this.s0 === 0n && this.s1 === 0n && this.s2 === 0n && this.s3 === 0n) {
      this.s0 = 1n;
    }
  }

  randomInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) {
      throw new RangeError(`SeedableRNG.randomInt requires positive integer max, got ${max}`);
    }
    // Rejection sampling for unbiased uniformity in [0, max).
    const m = BigInt(max);
    const t = ((1n << 64n) - m) % m;
    while (true) {
      const r = this.next64();
      if (r >= t) {
        return Number(r % m);
      }
    }
  }

  /** Advances state and returns the next 64-bit unsigned integer. */
  private next64(): bigint {
    const result = (rotl((this.s1 * 5n) & MASK64, 7n) * 9n) & MASK64;
    const t = (this.s1 << 17n) & MASK64;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = rotl(this.s3, 45n);
    return result;
  }

  /** SplitMix64 step. Used to expand the seed. */
  private static splitmix64(x: bigint): bigint {
    let z = x;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    return (z ^ (z >> 31n)) & MASK64;
  }

  /** Hash a string into a 64-bit bigint (FNV-1a). */
  private static hashSeed(seed: string): bigint {
    let h = 0xcbf29ce484222325n; // FNV-1a 64 offset basis
    const PRIME = 0x100000001b3n;
    for (let i = 0; i < seed.length; i++) {
      h ^= BigInt(seed.charCodeAt(i));
      h = (h * PRIME) & MASK64;
    }
    return h;
  }
}
