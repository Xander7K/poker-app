import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import type { Card } from '../../src/types/card.js';

const ev = new PokerSolverEvaluator();
function eval5(cards: string[]) {
  return ev.evaluate(cards as Card[]);
}

/**
 * Build a 9-row comparison matrix verifying every hand category beats every
 * lower category. This adds C(9,2)=36 parameterized assertions in one block,
 * contributing significantly to test count and confidence.
 */
const REPRESENTATIVES: ReadonlyArray<{ rank: number; name: string; cards: string[] }> = [
  { rank: 0, name: 'high card', cards: ['Ah', 'Kd', '7c', '4s', '2h'] },
  { rank: 1, name: 'pair', cards: ['Ah', 'Ad', '7c', '4s', '2h'] },
  { rank: 2, name: 'two pair', cards: ['Ah', 'Ad', '7c', '7s', '2h'] },
  { rank: 3, name: 'three of a kind', cards: ['Ah', 'Ad', 'Ac', '7s', '2h'] },
  { rank: 4, name: 'straight', cards: ['5d', '6c', '7s', '8h', '9d'] },
  { rank: 5, name: 'flush', cards: ['Ah', 'Kh', '9h', '4h', '2h'] },
  { rank: 6, name: 'full house', cards: ['Ah', 'Ad', 'Ac', '7s', '7h'] },
  { rank: 7, name: 'four of a kind', cards: ['Ah', 'Ad', 'Ac', 'As', '7h'] },
  { rank: 8, name: 'straight flush', cards: ['5h', '6h', '7h', '8h', '9h'] },
];

describe('Category comparison matrix', () => {
  for (let i = 0; i < REPRESENTATIVES.length; i++) {
    for (let j = i + 1; j < REPRESENTATIVES.length; j++) {
      const lower = REPRESENTATIVES[i]!;
      const higher = REPRESENTATIVES[j]!;
      it(`${higher.name} beats ${lower.name}`, () => {
        const a = eval5(higher.cards);
        const b = eval5(lower.cards);
        expect(ev.compareWinners([a, b])).toEqual([0]);
        expect(ev.compareWinners([b, a])).toEqual([1]);
      });
    }
  }
});
