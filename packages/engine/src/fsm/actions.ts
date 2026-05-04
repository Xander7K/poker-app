import { IllegalActionError, WrongTurnError } from '../errors.js';
import type { Action } from '../types/action.js';
import type { GameState } from '../types/game-state.js';
import { type PlayerState, PlayerStatus, type SeatIndex } from '../types/player.js';

import { applyAllIn, applyBet, applyRaise, type BettingResult } from './betting.js';
import { canStillAct } from './positions.js';

/**
 * Validates and applies an action by the player at `seat`. Returns a new
 * GameState. Does not advance phase or determine next-to-act — that's the
 * caller's job (handled by `advanceTurn` in a later step).
 *
 * Throws WrongTurnError if it's not this seat's turn.
 * Throws IllegalActionError for fold/check/call illegality.
 * Throws IllegalBetError for bet/raise/all-in illegality.
 */
export function applyAction(state: GameState, seat: SeatIndex, action: Action): GameState {
  if (state.toActSeat !== seat) {
    throw new WrongTurnError(`Seat ${seat} acted but it's seat ${state.toActSeat}'s turn`);
  }
  const player = state.seats[seat];
  if (!player || !canStillAct(player)) {
    throw new IllegalActionError(`Seat ${seat} cannot act (status=${player?.status})`);
  }

  switch (action.type) {
    case 'fold':
      return applyFold(state, seat, player);
    case 'check':
      return applyCheck(state, seat, player);
    case 'call':
      return applyCall(state, seat, player);
    case 'bet':
      return mergeBettingResult(state, seat, applyBet(state, seat, player, action.amount));
    case 'raise':
      return mergeBettingResult(state, seat, applyRaise(state, seat, player, action.amount));
    case 'allIn':
      return mergeBettingResult(state, seat, applyAllIn(state, seat, player));
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      throw new IllegalActionError(`Unknown action`);
    }
  }
}

/**
 * Merges a BettingResult into the state, also updating `actedThisRound`.
 * If the aggression was a full raise (reopened=true), prior actors lose
 * their "have acted" status: actedThisRound resets to just `[seat]`. Otherwise
 * (short all-in) we just append.
 */
function mergeBettingResult(state: GameState, seat: SeatIndex, r: BettingResult): GameState {
  const actedThisRound = r.reopened ? [seat] : appendActed(state.actedThisRound, seat);
  return {
    ...state,
    seats: r.seats,
    currentBet: r.currentBet,
    lastRaiseSize: r.lastRaiseSize,
    lastAggressorSeat: r.lastAggressorSeat,
    actedThisRound,
  };
}

function appendActed(prev: readonly SeatIndex[], seat: SeatIndex): SeatIndex[] {
  // Don't add duplicates — set semantics.
  return prev.includes(seat) ? prev.slice() : [...prev, seat];
}

function applyFold(state: GameState, seat: SeatIndex, player: PlayerState): GameState {
  const seats = state.seats.slice();
  seats[seat] = { ...player, status: PlayerStatus.Folded };
  return {
    ...state,
    seats,
    actedThisRound: appendActed(state.actedThisRound, seat),
  };
}

function applyCheck(state: GameState, seat: SeatIndex, player: PlayerState): GameState {
  // Check is legal only when there's nothing to call.
  if (player.committedThisRound < state.currentBet) {
    throw new IllegalActionError(
      `Cannot check: facing a bet of ${state.currentBet - player.committedThisRound} to call`,
    );
  }
  return { ...state, actedThisRound: appendActed(state.actedThisRound, seat) };
}

function applyCall(state: GameState, seat: SeatIndex, player: PlayerState): GameState {
  const toCall = state.currentBet - player.committedThisRound;
  if (toCall <= 0) {
    throw new IllegalActionError(
      `Cannot call: nothing to call (currentBet=${state.currentBet}, committed=${player.committedThisRound})`,
    );
  }
  const paid = Math.min(toCall, player.stack);
  const newStack = player.stack - paid;
  const newPlayer: PlayerState = {
    ...player,
    stack: newStack,
    committedThisRound: player.committedThisRound + paid,
    totalCommitted: player.totalCommitted + paid,
    status: newStack === 0 ? PlayerStatus.AllIn : player.status,
  };
  const seats = state.seats.slice();
  seats[seat] = newPlayer;
  return {
    ...state,
    seats,
    actedThisRound: appendActed(state.actedThisRound, seat),
  };
}
