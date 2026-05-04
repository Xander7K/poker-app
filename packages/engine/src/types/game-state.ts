import type { Card } from './card.js';
import type { EvaluatedHand } from './hand-rank.js';
import type { GamePhase } from './phase.js';
import type { PlayerState, SeatIndex } from './player.js';
import type { Pot } from './pot.js';

/**
 * Configuration for a hand. Immutable across the hand.
 * Lives separately from GameState because it doesn't change.
 */
export interface TableConfig {
  /** Maximum number of seats at the table (typically 6 or 9). */
  readonly maxSeats: number;
  readonly smallBlind: number;
  readonly bigBlind: number;
  /** Optional ante posted by every active player. 0 if no ante. */
  readonly ante: number;
  /** Minimum buy-in. Engine doesn't enforce — caller's responsibility. */
  readonly minBuyIn: number;
  readonly maxBuyIn: number;
}

/**
 * Per-player evaluated hand at showdown.
 */
export interface ShowdownEvaluation {
  readonly playerId: string;
  readonly hand: EvaluatedHand;
}

/**
 * Per-pot award. Aligned 1:1 with `pots` in the final state.
 */
export interface PotAward {
  readonly potIndex: number;
  readonly amount: number;
  readonly winners: ReadonlyArray<{ readonly playerId: string; readonly amount: number }>;
}

/**
 * A snapshot of a hand at a point in time. Fully immutable.
 *
 * EVERY operation on GameState returns a new GameState. The old one is never
 * mutated. This is non-negotiable; it enables debugging, replay, and time-travel.
 */
export interface GameState {
  /** Stable identifier for this hand. Set when the hand starts. */
  readonly handId: string;
  /** Configuration of the table for this hand. */
  readonly config: TableConfig;
  /** Current phase. */
  readonly phase: GamePhase;
  /**
   * All seats at the table, indexed by seat number 0..maxSeats-1.
   * Seats with no player have status='empty'.
   */
  readonly seats: readonly PlayerState[];
  /** Seat index of the dealer button for THIS hand. */
  readonly buttonSeat: SeatIndex;
  /**
   * Remaining deck (cards not yet dealt). Engine never exposes this externally;
   * the server projects per-player view before sending to clients.
   */
  readonly deck: readonly Card[];
  /** Community cards dealt so far (0, 3, 4, or 5). */
  readonly board: readonly Card[];
  /**
   * Cards burned from the deck. Tracked so replay reproduces the deck exactly.
   * Burns happen before the flop, turn, and river.
   */
  readonly burned: readonly Card[];
  /** Pots created so far. Always non-empty after blinds are posted. */
  readonly pots: readonly Pot[];
  /**
   * Seat that has to act next. -1 means no one acts (dealing, showdown,
   * complete).
   */
  readonly toActSeat: SeatIndex;
  /**
   * The largest `committedThisRound` from any player. The amount that any
   * player who wants to call must match.
   */
  readonly currentBet: number;
  /**
   * Size of the last bet or raise increment in the current round. Used to
   * compute legal min-raises. Resets each street.
   */
  readonly lastRaiseSize: number;
  /**
   * Seat that opened or last raised in this round. Action closes when it
   * returns to this seat. -1 = no aggressor yet this round.
   */
  readonly lastAggressorSeat: SeatIndex;
  /**
   * Seats that have voluntarily acted in the current betting round.
   * Reset to `[]` at the start of each street and on any aggression that
   * reopens action (full bet/raise/full-stack all-in). Forced posts (blinds,
   * antes) do NOT count as acting.
   *
   * Used by `advanceTurn` to know when every still-active player has had a
   * turn — needed to handle BB option preflop and the short-all-in case
   * correctly.
   */
  readonly actedThisRound: readonly SeatIndex[];
  /**
   * Showdown evaluation results, populated only when phase is
   * Showdown or HandComplete.
   */
  readonly showdown?: ReadonlyArray<ShowdownEvaluation> | undefined;
  /**
   * Pot-by-pot award log. Populated when phase becomes HandComplete.
   * Length matches `pots`. Each entry says which player(s) won that pot
   * and how much each got.
   */
  readonly awards?: ReadonlyArray<PotAward> | undefined;
}
