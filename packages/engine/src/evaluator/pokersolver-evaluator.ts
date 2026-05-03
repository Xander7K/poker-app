import { Hand } from 'pokersolver';

import type { Card } from '../types/card.js';
import { type EvaluatedHand, type HandRank } from '../types/hand-rank.js';

import type { HandEvaluator } from './hand-evaluator.js';

/**
 * HandEvaluator implementation backed by the `pokersolver` npm package.
 *
 * pokersolver uses **1-based** category ranks (HighCard=1, Pair=2, ...,
 * StraightFlush=9). We subtract 1 to map onto our 0-based `HandRank`. Royal
 * Flush is reported as the maximum-strength StraightFlush, matching our model.
 */
export class PokerSolverEvaluator implements HandEvaluator {
  evaluate(cards: readonly Card[]): EvaluatedHand {
    if (cards.length < 5 || cards.length > 7) {
      throw new RangeError(`HandEvaluator requires 5-7 cards, got ${cards.length}`);
    }
    const unique = new Set(cards);
    if (unique.size !== cards.length) {
      throw new RangeError(`HandEvaluator received duplicate cards`);
    }

    const solved = Hand.solve(cards.slice());
    const handRank = (solved.rank - 1) as HandRank;

    // We synthesize a single ordinal value: rank * 10^9 + secondary, where
    // `secondary` encodes kicker order via positional weighting (base-15).
    // `solved.cards` is ordered by importance (top pair first, then kickers,
    // etc.), and each Card.rank is 0..13 (Ace=13), so base-15 fits with margin.
    const secondary = solved.cards.reduce((acc, c, i) => acc + c.rank * Math.pow(15, 4 - i), 0);
    const value = handRank * 1_000_000_000 + secondary;

    return {
      rank: handRank,
      value,
      cards: solved.cards.map((c) => c.toString() as Card),
      description: solved.descr,
    };
  }

  compareWinners(hands: readonly EvaluatedHand[]): readonly number[] {
    if (hands.length === 0) return [];
    if (hands.length === 1) return [0];

    let bestValue = -Infinity;
    const winners: number[] = [];
    for (const [i, hand] of hands.entries()) {
      const v = hand.value;
      if (v > bestValue) {
        bestValue = v;
        winners.length = 0;
        winners.push(i);
      } else if (v === bestValue) {
        winners.push(i);
      }
    }
    return winners;
  }
}
