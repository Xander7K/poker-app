import { describe, it, expect } from 'vitest';

import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { shuffle } from '../../src/rng/shuffle.js';
import { freshDeck } from '../../src/types/card.js';

describe('SeedableRNG', () => {
  it('same seed produces identical sequences', () => {
    const a = new SeedableRNG('hello');
    const b = new SeedableRNG('hello');
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 100; i++) {
      seqA.push(a.randomInt(1000));
      seqB.push(b.randomInt(1000));
    }
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = new SeedableRNG('seed-A');
    const b = new SeedableRNG('seed-B');
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 50; i++) {
      seqA.push(a.randomInt(1000));
      seqB.push(b.randomInt(1000));
    }
    expect(seqA).not.toEqual(seqB);
  });

  it('shuffle with same seed produces same permutation', () => {
    const deck = freshDeck();
    const s1 = shuffle(deck, new SeedableRNG('xyz'));
    const s2 = shuffle(deck, new SeedableRNG('xyz'));
    expect(s1).toEqual(s2);
  });

  it('outputs are in [0, max) and approximately uniform', () => {
    const rng = new SeedableRNG('uniformity-check');
    const N = 10000;
    const buckets: number[] = new Array<number>(10).fill(0);
    for (let i = 0; i < N; i++) {
      const v = rng.randomInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      buckets[v] = (buckets[v] ?? 0) + 1;
    }
    // Each bucket should be roughly N/10 = 1000.
    // Loose chi-squared sanity: every bucket within 25% of expected.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(750);
      expect(count).toBeLessThan(1250);
    }
  });

  it('rejects invalid max', () => {
    const rng = new SeedableRNG('x');
    expect(() => rng.randomInt(0)).toThrow(RangeError);
    expect(() => rng.randomInt(-3)).toThrow(RangeError);
    expect(() => rng.randomInt(3.5)).toThrow(RangeError);
  });
});
