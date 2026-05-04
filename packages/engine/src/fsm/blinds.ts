import { InvariantViolatedError } from '../errors.js';
import type { GameState } from '../types/game-state.js';
import { GamePhase } from '../types/phase.js';
import { type PlayerState, PlayerStatus } from '../types/player.js';

import { bigBlindSeat, isDealtIn, smallBlindSeat } from './positions.js';

/**
 * Posts antes (if any) and the SB/BB. Updates seats, creates the initial pot,
 * and advances phase to PreFlop.
 *
 * Cap rule: if a player can't cover the full blind, they post what they have
 * and become all-in. The hand still proceeds; this becomes a side-pot situation.
 *
 * Note: `toActSeat` is left at -1; the caller sets it to firstToActPreflop
 * after dealing hole cards (which happens in a separate step).
 */
export function postBlinds(state: GameState): GameState {
  if (state.phase !== GamePhase.Dealing) {
    throw new InvariantViolatedError(`postBlinds called in phase ${state.phase}, expected Dealing`);
  }

  // Compute SB/BB positions on the original state. They refer to seats that
  // remain at the same indices after we update stacks, so the indices stay
  // valid below.
  const sbSeat = smallBlindSeat(state);
  const bbSeat = bigBlindSeat(state);
  if (sbSeat < 0 || bbSeat < 0) {
    throw new InvariantViolatedError(
      `Cannot determine blind positions: sbSeat=${sbSeat}, bbSeat=${bbSeat}`,
    );
  }

  let seats = state.seats.slice();
  const ante = state.config.ante;

  // 1. Post antes from every dealt-in player.
  if (ante > 0) {
    seats = seats.map((p) => (isDealtIn(p) ? takeFromStack(p, ante) : p));
  }

  // 2. Post SB.
  const sbPlayer = seats[sbSeat];
  if (!sbPlayer) {
    throw new InvariantViolatedError(`SB seat ${sbSeat} has no player`);
  }
  seats[sbSeat] = takeFromStack(sbPlayer, state.config.smallBlind);

  // 3. Post BB.
  const bbPlayer = seats[bbSeat];
  if (!bbPlayer) {
    throw new InvariantViolatedError(`BB seat ${bbSeat} has no player`);
  }
  seats[bbSeat] = takeFromStack(bbPlayer, state.config.bigBlind);

  // 4. Compute initial pot total and eligibility (everyone still in the hand).
  const totalCommitted = seats.reduce((sum, p) => sum + p.totalCommitted, 0);
  const eligiblePlayerIds = seats
    .filter((p) => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn)
    .map((p) => p.id);

  return {
    ...state,
    seats,
    phase: GamePhase.PreFlop,
    pots: [{ amount: totalCommitted, eligiblePlayerIds }],
    currentBet: state.config.bigBlind,
    lastRaiseSize: state.config.bigBlind,
    // BB is the implicit "last raiser" preflop. When action returns to BB,
    // they have the option to check or raise.
    lastAggressorSeat: bbSeat,
    toActSeat: -1,
  };
}

/**
 * Removes `amount` from a player's stack and adds to their committed amounts.
 * If they can't cover, they go all-in for whatever they have.
 */
function takeFromStack(p: PlayerState, amount: number): PlayerState {
  const taken = Math.min(amount, p.stack);
  const newStack = p.stack - taken;
  return {
    ...p,
    stack: newStack,
    committedThisRound: p.committedThisRound + taken,
    totalCommitted: p.totalCommitted + taken,
    status: newStack === 0 ? PlayerStatus.AllIn : p.status,
  };
}
