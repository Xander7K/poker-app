import { describe, it, expect } from 'vitest';

import {
  freshDeck,
  makeCard,
  Rank,
  Suit,
  cardRank,
  cardSuit,
  RANK_VALUE,
  ALL_RANKS,
  ALL_SUITS,
} from '../../src/types/card.js';

describe('Card types', () => {
  it('freshDeck has exactly 52 unique cards', () => {
    const deck = freshDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
  });

  it('freshDeck contains every rank/suit combination', () => {
    const deck = freshDeck();
    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        expect(deck).toContain(makeCard(rank, suit));
      }
    }
  });

  it('cardRank and cardSuit invert makeCard', () => {
    const card = makeCard(Rank.Ace, Suit.Spades);
    expect(card).toBe('As');
    expect(cardRank(card)).toBe(Rank.Ace);
    expect(cardSuit(card)).toBe(Suit.Spades);
  });

  it('RANK_VALUE has Ace as 14 (high) and Two as 2', () => {
    expect(RANK_VALUE[Rank.Ace]).toBe(14);
    expect(RANK_VALUE[Rank.Two]).toBe(2);
    expect(RANK_VALUE[Rank.King]).toBe(13);
  });
});
