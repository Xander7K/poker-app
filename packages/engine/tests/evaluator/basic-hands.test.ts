import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import type { Card } from '../../src/types/card.js';
import { HandRank } from '../../src/types/hand-rank.js';

const ev = new PokerSolverEvaluator();

function rank(cards: string[]): HandRank {
  return ev.evaluate(cards as Card[]).rank;
}

describe('PokerSolverEvaluator — 9 hand categories', () => {
  it('high card', () => {
    expect(rank(['Ah', 'Kd', '7c', '4s', '2h'])).toBe(HandRank.HighCard);
  });

  it('pair', () => {
    expect(rank(['Ah', 'Ad', '7c', '4s', '2h'])).toBe(HandRank.Pair);
  });

  it('two pair', () => {
    expect(rank(['Ah', 'Ad', '7c', '7s', '2h'])).toBe(HandRank.TwoPair);
  });

  it('three of a kind', () => {
    expect(rank(['Ah', 'Ad', 'Ac', '7s', '2h'])).toBe(HandRank.ThreeOfAKind);
  });

  it('straight (5-high wheel)', () => {
    expect(rank(['Ah', '2d', '3c', '4s', '5h'])).toBe(HandRank.Straight);
  });

  it('straight (broadway)', () => {
    expect(rank(['Th', 'Jd', 'Qc', 'Ks', 'Ah'])).toBe(HandRank.Straight);
  });

  it('flush', () => {
    expect(rank(['Ah', 'Kh', '9h', '4h', '2h'])).toBe(HandRank.Flush);
  });

  it('full house', () => {
    expect(rank(['Ah', 'Ad', 'Ac', '7s', '7h'])).toBe(HandRank.FullHouse);
  });

  it('four of a kind', () => {
    expect(rank(['Ah', 'Ad', 'Ac', 'As', '7h'])).toBe(HandRank.FourOfAKind);
  });

  it('straight flush', () => {
    expect(rank(['5h', '6h', '7h', '8h', '9h'])).toBe(HandRank.StraightFlush);
  });

  it('royal flush is reported as max straight flush', () => {
    expect(rank(['Th', 'Jh', 'Qh', 'Kh', 'Ah'])).toBe(HandRank.StraightFlush);
  });
});

describe('PokerSolverEvaluator — input validation', () => {
  it('throws on fewer than 5 cards', () => {
    expect(() => ev.evaluate(['Ah', 'Kh'] as Card[])).toThrow(RangeError);
  });

  it('throws on more than 7 cards', () => {
    expect(() => ev.evaluate(['Ah', 'Kh', 'Qh', 'Jh', 'Th', '9h', '8h', '7h'] as Card[])).toThrow(
      RangeError,
    );
  });

  it('throws on duplicate cards', () => {
    expect(() => ev.evaluate(['Ah', 'Ah', 'Kh', 'Qh', 'Jh'] as Card[])).toThrow(RangeError);
  });
});

describe('PokerSolverEvaluator — compareWinners', () => {
  it('returns empty for empty input', () => {
    expect(ev.compareWinners([])).toEqual([]);
  });

  it('returns [0] for single hand', () => {
    const h = ev.evaluate(['Ah', 'Kd', '7c', '4s', '2h'] as Card[]);
    expect(ev.compareWinners([h])).toEqual([0]);
  });

  it('higher hand beats lower', () => {
    const flush = ev.evaluate(['Ah', 'Kh', '9h', '4h', '2h'] as Card[]);
    const pair = ev.evaluate(['Ah', 'Ad', '7c', '4s', '2h'] as Card[]);
    expect(ev.compareWinners([flush, pair])).toEqual([0]);
    expect(ev.compareWinners([pair, flush])).toEqual([1]);
  });

  it('identical hands tie (split)', () => {
    const a = ev.evaluate(['Ah', 'Kd', '7c', '4s', '2h'] as Card[]);
    const b = ev.evaluate(['Ad', 'Kc', '7s', '4h', '2d'] as Card[]);
    expect(ev.compareWinners([a, b])).toEqual([0, 1]);
  });
});
