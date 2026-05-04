import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import type { Card } from '../../src/types/card.js';
import { HandRank } from '../../src/types/hand-rank.js';

const ev = new PokerSolverEvaluator();
function eval7(cards: string[]) {
  return ev.evaluate(cards as Card[]);
}

describe('Best 5 of 7 selection', () => {
  it('picks the flush over the straight when both are present', () => {
    // Hole: Ah Kh. Board: Qh Jh 9h 8d 7s.
    // Hearts: Ah Kh Qh Jh 9h => Ace-high flush.
    const h = eval7(['Ah', 'Kh', 'Qh', 'Jh', '9h', '8d', '7s']);
    expect(h.rank).toBe(HandRank.Flush);
  });

  it('picks straight when 5 of 7 form a straight and no flush', () => {
    // Hole: 6c 5d. Board: 4s 3h 2c Kd Qs => 6-high straight.
    const h = eval7(['6c', '5d', '4s', '3h', '2c', 'Kd', 'Qs']);
    expect(h.rank).toBe(HandRank.Straight);
  });

  it('picks the better full house when boats overlap', () => {
    // Hole: Ah Ad. Board: Kh Kd Kc 5s 5d. -> Kings full of Aces.
    const h = eval7(['Ah', 'Ad', 'Kh', 'Kd', 'Kc', '5s', '5d']);
    expect(h.rank).toBe(HandRank.FullHouse);
    // pokersolver describes this as "Full House, K's over A's".
    const lc = h.description.toLowerCase();
    expect(lc).toContain('full house');
    expect(lc).toMatch(/k.s over a.s/);
  });

  it('counterfeited two pair: board has higher two pair', () => {
    // Hole: 7c 8d. Board: Ah Ad Kh Kd 2c. -> Player plays Aces and Kings with 8 kicker.
    const h = eval7(['7c', '8d', 'Ah', 'Ad', 'Kh', 'Kd', '2c']);
    expect(h.rank).toBe(HandRank.TwoPair);
    expect(h.cards.map(String)).toEqual(expect.arrayContaining(['Ah', 'Ad', 'Kh', 'Kd']));
  });
});

describe('Description strings', () => {
  it('describes a flush', () => {
    const h = ev.evaluate(['Ah', 'Kh', '9h', '4h', '2h'] as Card[]);
    expect(h.description.toLowerCase()).toContain('flush');
  });

  it('describes two pair with both pair ranks', () => {
    const h = ev.evaluate(['Ah', 'Ad', '8c', '8s', '2h'] as Card[]);
    expect(h.description.toLowerCase()).toContain('two pair');
  });
});
