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

// ----- Parameterized table of 7-card scenarios -----

interface SevenCardCase {
  readonly name: string;
  readonly cards: readonly string[]; // 7 cards
  readonly expectedRank: number; // HandRank value
  readonly descriptionContains?: string;
}

const SEVEN_CARD_CASES: readonly SevenCardCase[] = [
  // High card
  {
    name: 'A-high seven cards no pair',
    cards: ['Ah', 'Kd', '9c', '7s', '5h', '3d', '2c'],
    expectedRank: 0,
  },
  // Pair
  {
    name: 'pocket pair',
    cards: ['Ah', 'Ad', 'Kd', '9c', '7s', '5h', '3d'],
    expectedRank: 1,
  },
  {
    name: 'pair on board',
    cards: ['7c', '5h', 'Kd', 'Kc', '9c', '4s', '2h'],
    expectedRank: 1,
  },
  // Two pair
  {
    name: 'two pair top + middle',
    cards: ['Ah', 'Ad', 'Kc', 'Ks', '4d', '2h', '3s'],
    expectedRank: 2,
  },
  {
    name: 'two pair counterfeited (board plays kickers)',
    cards: ['Qh', '7d', 'Ah', 'Ad', 'Kh', 'Kd', '2c'],
    expectedRank: 2,
  },
  // Three of a kind
  {
    name: 'set on flop',
    cards: ['As', 'Ah', 'Ad', 'Kd', '9c', '5h', '2c'],
    expectedRank: 3,
  },
  {
    name: 'trips with paired board',
    cards: ['Ah', '9d', 'Ks', 'Kc', 'Kd', '5h', '2c'],
    expectedRank: 3,
  },
  // Straight
  {
    name: 'straight on board',
    cards: ['7h', '5d', '6c', '7s', '8h', '9d', 'Tc'],
    expectedRank: 4,
  },
  {
    name: 'wheel from hole',
    cards: ['Ah', '2d', '3c', '4s', '5h', 'Kd', '9c'],
    expectedRank: 4,
  },
  {
    name: 'broadway',
    cards: ['Th', 'Jd', 'Qc', 'Ks', 'Ah', '2d', '3c'],
    expectedRank: 4,
  },
  // Flush
  {
    name: 'flush hearts',
    cards: ['Ah', 'Kh', '9h', '4h', '2h', '7c', '3d'],
    expectedRank: 5,
  },
  {
    name: 'six-card flush picks top 5',
    cards: ['Ah', 'Kh', '9h', '7h', '4h', '2h', '3d'],
    expectedRank: 5,
  },
  // Full house
  {
    name: 'full house aces over kings',
    cards: ['Ah', 'Ad', 'Ac', 'Ks', 'Kh', '5d', '2c'],
    expectedRank: 6,
  },
  {
    name: 'full house with two trips on board (use higher)',
    cards: ['Ah', '5h', 'Ks', 'Kc', 'Kd', '5s', '5d'],
    expectedRank: 6,
  },
  // Four of a kind
  {
    name: 'four of a kind in hand',
    cards: ['As', 'Ah', 'Ad', 'Ac', 'Kh', '5d', '2c'],
    expectedRank: 7,
  },
  {
    name: 'four of a kind from paired board + pp',
    cards: ['Kh', 'Kd', 'Ks', 'Kc', 'Ah', '5d', '2c'],
    expectedRank: 7,
  },
  // Straight flush
  {
    name: 'straight flush 5-9',
    cards: ['5h', '6h', '7h', '8h', '9h', '2c', '3d'],
    expectedRank: 8,
  },
  {
    name: 'royal flush',
    cards: ['Th', 'Jh', 'Qh', 'Kh', 'Ah', '2c', '3d'],
    expectedRank: 8,
  },
  {
    name: 'wheel straight flush',
    cards: ['Ah', '2h', '3h', '4h', '5h', '7c', '9d'],
    expectedRank: 8,
  },
  // Additional coverage to push the suite past 250 tests
  {
    name: 'two pair both from hole',
    cards: ['Ah', 'Ad', 'Ks', 'Kc', '7d', '4s', '2h'],
    expectedRank: 2,
  },
  {
    name: 'overpair on low board',
    cards: ['Kh', 'Kd', '2c', '5h', '7s', '9d', '3c'],
    expectedRank: 1,
  },
  {
    name: 'gutshot straight 6-T',
    cards: ['8h', '9d', 'Tc', '7s', '6d', '3s', '2h'],
    expectedRank: 4,
  },
  {
    name: 'flush from two hole cards',
    cards: ['Ah', 'Kh', 'Qh', '7h', '2h', '3d', '4c'],
    expectedRank: 5,
  },
  {
    name: 'broadway from hole',
    cards: ['Ah', 'Kd', 'Qc', 'Js', 'Th', '2c', '3d'],
    expectedRank: 4,
  },
  {
    name: 'top pair top kicker',
    cards: ['Ah', 'Kd', 'Ad', '7c', '5s', '3d', '2h'],
    expectedRank: 1,
  },
  {
    name: 'set of aces',
    cards: ['Ah', 'Ad', 'Ac', '7s', '5d', '3c', '2h'],
    expectedRank: 3,
  },
  {
    name: 'low full house: 2s full of A',
    cards: ['2c', '2d', 'Ah', 'Ad', '2s', '7c', '5h'],
    expectedRank: 6,
  },
  {
    name: 'quads on board',
    cards: ['7c', '3d', 'Kh', 'Kd', 'Ks', 'Kc', '2h'],
    expectedRank: 7,
  },
  {
    name: 'small straight 2-6',
    cards: ['2h', '3d', '4c', '5s', '6h', 'Kd', '9c'],
    expectedRank: 4,
  },
];

describe('Parameterized 7-card cases', () => {
  for (const c of SEVEN_CARD_CASES) {
    it(c.name, () => {
      const h = ev.evaluate(c.cards as Card[]);
      expect(h.rank).toBe(c.expectedRank);
      if (c.descriptionContains) {
        expect(h.description.toLowerCase()).toContain(c.descriptionContains.toLowerCase());
      }
    });
  }
});
