declare module 'pokersolver' {
  /**
   * pokersolver represents cards as 2-char strings: rank (2-9, T, J, Q, K, A)
   * followed by suit (c, d, h, s).
   */
  export interface PokerSolverCard {
    /** Numeric rank used internally by pokersolver for comparisons. */
    rank: number;
    /** String form, e.g. "Ah". */
    toString(): string;
  }

  export interface PokerSolverHand {
    /** Numeric rank category (0..8). HighCard=0, Pair=1, ..., StraightFlush=8. */
    rank: number;
    /** Human-readable name like "Two Pair" or "Full House". */
    name: string;
    /** Detailed description like "Two Pair, A's & 8's". */
    descr: string;
    /**
     * The 5 cards forming the hand, ordered by importance (e.g. for two pair:
     * top pair, bottom pair, kicker). Suitable for encoding hand strength.
     */
    cards: PokerSolverCard[];
    /** All input cards (5-7), as Card objects. */
    cardPool: PokerSolverCard[];
  }

  export class Hand {
    static solve(cards: string[]): PokerSolverHand;
    static winners(hands: PokerSolverHand[]): PokerSolverHand[];
  }
}
