import { describe, it, expect } from 'vitest';

import { CryptoRNG } from '../../src/rng/crypto-rng.js';
import type { RNG } from '../../src/rng/rng.js';
import { shuffle } from '../../src/rng/shuffle.js';
import { freshDeck } from '../../src/types/card.js';

/** A deterministic RNG for unit-testing shuffle without seeding logic yet. */
class FixedSequenceRNG implements RNG {
  private i = 0;
  constructor(private readonly values: number[]) {}
  randomInt(max: number): number {
    const v = this.values[this.i++ % this.values.length]!;
    return v % max;
  }
}

describe('shuffle', () => {
  it('returns a new array, does not mutate input', () => {
    const deck = freshDeck();
    const original = deck.slice();
    const rng = new CryptoRNG();
    const shuffled = shuffle(deck, rng);
    expect(deck).toEqual(original);
    expect(shuffled).not.toBe(deck);
  });

  it('preserves length', () => {
    const deck = freshDeck();
    expect(shuffle(deck, new CryptoRNG())).toHaveLength(deck.length);
  });

  it('preserves multiset (same cards, possibly different order)', () => {
    const deck = freshDeck();
    const shuffled = shuffle(deck, new CryptoRNG());
    expect(shuffled.slice().sort()).toEqual(deck.slice().sort());
  });

  it('with a fixed RNG sequence, produces a deterministic permutation', () => {
    const deck = ['A', 'B', 'C', 'D'];
    const rng1 = new FixedSequenceRNG([0, 1, 2]);
    const rng2 = new FixedSequenceRNG([0, 1, 2]);
    expect(shuffle(deck, rng1)).toEqual(shuffle(deck, rng2));
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([], new CryptoRNG())).toEqual([]);
    expect(shuffle([42], new CryptoRNG())).toEqual([42]);
  });
});

describe('CryptoRNG', () => {
  it('randomInt produces values in [0, max)', () => {
    const rng = new CryptoRNG();
    for (let i = 0; i < 100; i++) {
      const v = rng.randomInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it('throws on non-positive max', () => {
    const rng = new CryptoRNG();
    expect(() => rng.randomInt(0)).toThrow(RangeError);
    expect(() => rng.randomInt(-1)).toThrow(RangeError);
  });

  it('throws on non-integer max', () => {
    const rng = new CryptoRNG();
    expect(() => rng.randomInt(3.5)).toThrow(RangeError);
  });
});
