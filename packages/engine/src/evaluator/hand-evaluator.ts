import type { Card } from '../types/card.js';
import type { EvaluatedHand } from '../types/hand-rank.js';

/**
 * Abstract hand evaluator. The engine depends on this interface, never on
 * a concrete implementation. Allows swapping pokersolver for phevaluator or
 * a custom evaluator without touching the FSM.
 */
export interface HandEvaluator {
  /**
   * Given 5 to 7 cards, return the best 5-card hand and its rank.
   * Throws if input is malformed (wrong count, duplicate cards).
   */
  evaluate(cards: readonly Card[]): EvaluatedHand;

  /**
   * Given multiple evaluated hands, return the indices of the winner(s).
   * If a single index is returned, that hand wins outright.
   * If multiple indices are returned, those hands tie (split pot).
   */
  compareWinners(hands: readonly EvaluatedHand[]): readonly number[];
}
