import { IllegalBetError } from '../errors.js';
import type { GameState } from '../types/game-state.js';
import { type PlayerState, PlayerStatus, type SeatIndex } from '../types/player.js';

/**
 * Result of a betting action: new player state plus whether it counted as
 * a "full raise" (which reopens action) or a short all-in (which doesn't).
 */
export interface BettingResult {
  readonly seats: readonly PlayerState[];
  readonly currentBet: number;
  readonly lastRaiseSize: number;
  readonly lastAggressorSeat: SeatIndex;
  /** True if this aggression resets the right-to-reraise for prior actors. */
  readonly reopened: boolean;
}

/**
 * Apply a "bet" action: a wager when there is no current bet on this street.
 * `amount` is the total committedThisRound the player wants to reach.
 * Equivalent to a raise from currentBet=0.
 */
export function applyBet(
  state: GameState,
  seat: SeatIndex,
  player: PlayerState,
  amount: number,
): BettingResult {
  if (state.currentBet !== 0) {
    throw new IllegalBetError(
      `Cannot bet when facing a bet of ${state.currentBet}; use raise instead`,
    );
  }
  const minBet = state.config.bigBlind;
  if (amount < minBet && amount < player.stack) {
    throw new IllegalBetError(`Bet ${amount} is less than min bet ${minBet}`);
  }
  if (amount > player.stack) {
    throw new IllegalBetError(`Bet ${amount} exceeds stack ${player.stack}`);
  }
  return commitForAggression(state, seat, player, amount, /* prevCurrentBet */ 0);
}

/**
 * Apply a "raise" action. `amount` is the total committedThisRound the player
 * wants to reach. Min raise = currentBet + lastRaiseSize. A short all-in (less
 * than min raise but using the entire stack) is allowed.
 */
export function applyRaise(
  state: GameState,
  seat: SeatIndex,
  player: PlayerState,
  amount: number,
): BettingResult {
  if (state.currentBet === 0) {
    throw new IllegalBetError(`Cannot raise when there's no bet; use bet instead`);
  }
  const minRaiseTo = state.currentBet + state.lastRaiseSize;
  const playerCanReach = player.stack + player.committedThisRound;
  const isAllIn = amount >= playerCanReach;
  if (amount < minRaiseTo && !isAllIn) {
    throw new IllegalBetError(`Raise to ${amount} is less than min raise to ${minRaiseTo}`);
  }
  if (amount > playerCanReach) {
    throw new IllegalBetError(`Raise to ${amount} exceeds player's max ${playerCanReach}`);
  }
  return commitForAggression(state, seat, player, amount, state.currentBet);
}

/**
 * Apply an "all-in" action. Player commits all remaining chips. The result
 * may be a (short) call, a short raise, or a full raise depending on the amount.
 */
export function applyAllIn(state: GameState, seat: SeatIndex, player: PlayerState): BettingResult {
  const newCommitment = player.stack + player.committedThisRound;
  return commitForAggression(state, seat, player, newCommitment, state.currentBet);
}

/**
 * Common path for bet/raise/all-in. Commits the player to `targetCommitment`
 * (their new committedThisRound), updates aggregate state, and computes
 * whether this reopens action for prior actors.
 *
 * `currentBet` only goes up — a short all-in below the current bet (rare:
 * a player calling for less than the current bet because their stack is
 * smaller) does not lower the currentBet for others.
 */
function commitForAggression(
  state: GameState,
  seat: SeatIndex,
  player: PlayerState,
  targetCommitment: number,
  prevCurrentBet: number,
): BettingResult {
  const additional = targetCommitment - player.committedThisRound;
  const newStack = player.stack - additional;

  const newPlayer: PlayerState = {
    ...player,
    stack: newStack,
    committedThisRound: targetCommitment,
    totalCommitted: player.totalCommitted + additional,
    status: newStack === 0 ? PlayerStatus.AllIn : player.status,
  };

  const seats = state.seats.slice();
  seats[seat] = newPlayer;

  const newCurrentBet = Math.max(state.currentBet, targetCommitment);
  const raiseSize = targetCommitment - prevCurrentBet;
  // Action is "reopened" only if the aggression is a full raise
  // (>= the current lastRaiseSize). Short all-ins below the min-raise
  // threshold do NOT reopen action: prior actors keep call/fold only.
  const reopened = raiseSize >= state.lastRaiseSize && raiseSize > 0;

  return {
    seats,
    currentBet: newCurrentBet,
    lastRaiseSize: reopened ? raiseSize : state.lastRaiseSize,
    lastAggressorSeat: reopened ? seat : state.lastAggressorSeat,
    reopened,
  };
}
