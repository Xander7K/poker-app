import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import type { Card } from '../../src/types/card.js';
import { HandRank } from '../../src/types/hand-rank.js';

const ev = new PokerSolverEvaluator();
function eval5(cards: string[]) {
  return ev.evaluate(cards as Card[]);
}

describe('Wheel and broadway straights', () => {
  it('Ace plays low in 5-high wheel A-2-3-4-5', () => {
    const wheel = eval5(['Ah', '2d', '3c', '4s', '5h']);
    expect(wheel.rank).toBe(HandRank.Straight);
  });

  it('Wheel loses to 6-high straight', () => {
    const wheel = eval5(['Ah', '2d', '3c', '4s', '5h']);
    const six = eval5(['2h', '3s', '4d', '5c', '6h']);
    expect(ev.compareWinners([wheel, six])).toEqual([1]);
  });

  it('Broadway is highest straight (T-J-Q-K-A)', () => {
    const broadway = eval5(['Th', 'Jd', 'Qc', 'Ks', 'Ah']);
    const nineHigh = eval5(['5d', '6c', '7s', '8h', '9d']);
    expect(broadway.rank).toBe(HandRank.Straight);
    expect(ev.compareWinners([broadway, nineHigh])).toEqual([0]);
  });

  it('Wheel flush (5-high straight flush)', () => {
    const wheelFlush = eval5(['Ah', '2h', '3h', '4h', '5h']);
    expect(wheelFlush.rank).toBe(HandRank.StraightFlush);
  });

  it('Royal beats lower straight flush', () => {
    const royal = eval5(['Th', 'Jh', 'Qh', 'Kh', 'Ah']);
    const sf9 = eval5(['5s', '6s', '7s', '8s', '9s']);
    expect(ev.compareWinners([royal, sf9])).toEqual([0]);
  });
});

describe('Cross-category showdowns', () => {
  it('flush beats straight', () => {
    const flush = eval5(['Ah', 'Kh', '9h', '4h', '2h']);
    const straight = eval5(['5d', '6c', '7s', '8h', '9d']);
    expect(ev.compareWinners([flush, straight])).toEqual([0]);
  });

  it('full house beats flush', () => {
    const fh = eval5(['Ah', 'Ad', 'Ac', '7s', '7h']);
    const flush = eval5(['Kh', 'Qh', '9h', '4h', '2h']);
    expect(ev.compareWinners([fh, flush])).toEqual([0]);
  });

  it('four of a kind beats full house', () => {
    const quads = eval5(['Ah', 'Ad', 'Ac', 'As', '7h']);
    const fh = eval5(['Kh', 'Kd', 'Kc', '7s', '7h']);
    expect(ev.compareWinners([quads, fh])).toEqual([0]);
  });
});

describe('Full house ranking', () => {
  it('aces full beats kings full', () => {
    const acesFull = eval5(['Ah', 'Ad', 'Ac', '7s', '7h']);
    const kingsFull = eval5(['Kh', 'Kd', 'Kc', 'Qs', 'Qh']);
    expect(ev.compareWinners([acesFull, kingsFull])).toEqual([0]);
  });

  it('aces over kings beats aces over queens', () => {
    const aoK = eval5(['Ah', 'Ad', 'Ac', 'Ks', 'Kh']);
    const aoQ = eval5(['As', 'Ad', 'Ac', 'Qs', 'Qh']);
    expect(ev.compareWinners([aoK, aoQ])).toEqual([0]);
  });
});
