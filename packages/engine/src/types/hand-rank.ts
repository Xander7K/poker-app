import type { Card } from './card.js';

/**
 * Standard 9-category poker hand ranking. Higher value = stronger hand.
 *
 * Royal Flush is intentionally not its own category — it's just the highest
 * Straight Flush. Pokersolver also treats it that way internally.
 */
export const HandRank = {
  HighCard: 0,
  Pair: 1,
  TwoPair: 2,
  ThreeOfAKind: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  FourOfAKind: 7,
  StraightFlush: 8,
} as const;
export type HandRank = (typeof HandRank)[keyof typeof HandRank];

/**
 * Result of evaluating a 5-7 card hand.
 *
 * `rank` is the category (0-8). `value` is a totally-ordered number such that
 * higher = strictly stronger hand including kickers. Two hands with the same
 * `value` are an exact tie (chop pot).
 *
 * `cards` is the 5-card subset that forms the hand (used for replay / display).
 * `description` is a human-readable string ("Two Pair, A's & 8's").
 */
export interface EvaluatedHand {
  readonly rank: HandRank;
  readonly value: number;
  readonly cards: readonly Card[];
  readonly description: string;
}
