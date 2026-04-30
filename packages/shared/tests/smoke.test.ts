import { describe, expect, it } from 'vitest';

import { FULL_DECK, RANKS, SUITS, makeCard, parseCard } from '../src/index.js';

describe('shared package smoke tests', () => {
  it('full deck has 52 unique cards', () => {
    expect(FULL_DECK).toHaveLength(52);
    expect(new Set(FULL_DECK).size).toBe(52);
  });

  it('makes and parses cards correctly', () => {
    const card = makeCard('A', 's');
    expect(card).toBe('As');
    expect(parseCard(card)).toEqual({ rank: 'A', suit: 's' });
  });

  it('has 13 ranks and 4 suits', () => {
    expect(RANKS).toHaveLength(13);
    expect(SUITS).toHaveLength(4);
  });
});
