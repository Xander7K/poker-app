import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import type { Card } from '../../src/types/card.js';

const ev = new PokerSolverEvaluator();

function eval5(cards: string[]) {
  return ev.evaluate(cards as Card[]);
}

describe('Kickers within the same category', () => {
  it('higher pair beats lower pair', () => {
    const aces = eval5(['Ah', 'Ad', '7c', '4s', '2h']);
    const kings = eval5(['Kh', 'Kd', '7c', '4s', '2h']);
    expect(ev.compareWinners([aces, kings])).toEqual([0]);
  });

  it('same pair, higher kicker wins', () => {
    const acesKingKicker = eval5(['Ah', 'Ad', 'Kc', '4s', '2h']);
    const acesQueenKicker = eval5(['Ah', 'Ad', 'Qc', '4s', '2h']);
    expect(ev.compareWinners([acesKingKicker, acesQueenKicker])).toEqual([0]);
  });

  it('same pair, same top kicker, second kicker decides', () => {
    const aceKingNine = eval5(['As', 'Ah', 'Kd', '9c', '2h']);
    const aceKingFive = eval5(['Ad', 'Ac', 'Kh', '5s', '2d']);
    expect(ev.compareWinners([aceKingNine, aceKingFive])).toEqual([0]);
  });

  it('same pair, all kickers identical => tie', () => {
    const a = eval5(['As', 'Ah', 'Kd', '9c', '2h']);
    const b = eval5(['Ad', 'Ac', 'Ks', '9s', '2d']);
    expect(ev.compareWinners([a, b])).toEqual([0, 1]);
  });

  it('two pair: higher top pair wins', () => {
    const aces8s = eval5(['Ah', 'Ad', '8c', '8s', '2h']);
    const kingsQueens = eval5(['Kh', 'Kd', 'Qc', 'Qs', '2h']);
    expect(ev.compareWinners([aces8s, kingsQueens])).toEqual([0]);
  });

  it('two pair: same top, higher bottom pair wins', () => {
    const aces8s = eval5(['Ah', 'Ad', '8c', '8s', '2h']);
    const aces7s = eval5(['As', 'Ac', '7c', '7s', '2d']);
    expect(ev.compareWinners([aces8s, aces7s])).toEqual([0]);
  });

  it('two pair: same pairs, kicker decides', () => {
    const k = eval5(['Ah', 'Ad', '8c', '8s', 'Kh']);
    const q = eval5(['As', 'Ac', '8d', '8h', 'Qd']);
    expect(ev.compareWinners([k, q])).toEqual([0]);
  });
});

describe('Three-way and four-way splits', () => {
  it('three identical hands all tie', () => {
    const a = eval5(['Ah', 'Kd', '7c', '4s', '2h']);
    const b = eval5(['As', 'Kh', '7s', '4h', '2d']);
    const c = eval5(['Ad', 'Kc', '7h', '4d', '2s']);
    const winners = ev.compareWinners([a, b, c]);
    expect(winners.slice().sort()).toEqual([0, 1, 2]);
  });

  it('only two of three tie when third is weaker', () => {
    const a = eval5(['Ah', 'Kd', '7c', '4s', '2h']);
    const b = eval5(['As', 'Kh', '7s', '4h', '2d']);
    const weaker = eval5(['Qh', 'Jd', '9c', '4s', '2h']);
    const winners = ev.compareWinners([a, b, weaker]);
    expect(winners.slice().sort()).toEqual([0, 1]);
  });
});
