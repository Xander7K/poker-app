import type { Card } from './card.js';

/**
 * Position is the seat index relative to the table (0..maxSeats-1).
 * It does NOT rotate; it's the physical seat. Rotation is a function of
 * `buttonSeat` in GameState plus active players.
 */
export type SeatIndex = number;

/**
 * Status of a player at a given moment in a hand.
 *
 * - 'active': in the hand, can act.
 * - 'folded': out of the hand for this hand only.
 * - 'allIn': all chips committed; no more actions but eligible for showdown
 *   on contributed amount.
 * - 'sittingOut': not in the hand. Did not post blinds.
 * - 'empty': the seat is empty (no player).
 */
export const PlayerStatus = {
  Active: 'active',
  Folded: 'folded',
  AllIn: 'allIn',
  SittingOut: 'sittingOut',
  Empty: 'empty',
} as const;
export type PlayerStatus = (typeof PlayerStatus)[keyof typeof PlayerStatus];

export interface PlayerState {
  /** Stable id for this player. Engine-agnostic; treated as opaque. */
  readonly id: string;
  /** Physical seat at the table, 0..maxSeats-1. */
  readonly seat: SeatIndex;
  /** Display name (engine doesn't validate; just carries it). */
  readonly name: string;
  /** Stack (chips behind), in smallest unit. Never negative. */
  readonly stack: number;
  /** Cards dealt to this player for the current hand. Empty if none dealt. */
  readonly holeCards: readonly Card[];
  /** Status for the current hand. */
  readonly status: PlayerStatus;
  /**
   * Total amount this player has put in the pot during the current hand.
   * Used to compute side pots.
   */
  readonly totalCommitted: number;
  /**
   * Amount put in the pot during the current betting round.
   * Resets to 0 at the start of each street.
   */
  readonly committedThisRound: number;
}

/** Helper to construct an empty seat. */
export function emptySeat(seat: SeatIndex): PlayerState {
  return {
    id: '',
    seat,
    name: '',
    stack: 0,
    holeCards: [],
    status: PlayerStatus.Empty,
    totalCommitted: 0,
    committedThisRound: 0,
  };
}
