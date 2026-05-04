import { describe, it, expect } from 'vitest';

import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { makeState } from '../helpers/make-state.js';

describe('dealHoleCards', () => {
  it('deals 2 cards to every dealt-in player', () => {
    const s0 = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    const s1 = dealHoleCards(s0, new SeedableRNG('test'));
    for (const p of s1.seats) {
      expect(p.holeCards).toHaveLength(2);
    }
  });

  it('all dealt cards are unique across the table', () => {
    const s0 = postBlinds(
      startHand(makeState({ stacks: [1000, 1000, 1000, 1000, 1000, 1000] }), 'h', 0),
    );
    const s1 = dealHoleCards(s0, new SeedableRNG('test'));
    const allCards = s1.seats.flatMap((p) => p.holeCards);
    expect(new Set(allCards).size).toBe(allCards.length);
  });

  it('removes dealt cards from deck', () => {
    const s0 = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    const s1 = dealHoleCards(s0, new SeedableRNG('test'));
    expect(s1.deck.length).toBe(52 - 6); // 3 players × 2 cards
  });

  it('same seed produces same deal', () => {
    const s0 = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    const a = dealHoleCards(s0, new SeedableRNG('xyz'));
    const b = dealHoleCards(s0, new SeedableRNG('xyz'));
    expect(a.seats.map((p) => p.holeCards)).toEqual(b.seats.map((p) => p.holeCards));
  });

  it('sets toActSeat to first-to-act preflop', () => {
    const s0 = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    const s1 = dealHoleCards(s0, new SeedableRNG('test'));
    // 3-handed, button=0, SB=1, BB=2 → UTG = 0 (back to button).
    expect(s1.toActSeat).toBe(0);
  });
});
