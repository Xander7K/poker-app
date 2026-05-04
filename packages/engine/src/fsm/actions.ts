import { IllegalActionError, IllegalBetError, WrongTurnError } from '../errors.js';
import type { Action } from '../types/action.js';
import type { GameState } from '../types/game-state.js';
import { type PlayerState, PlayerStatus, type SeatIndex } from '../types/player.js';

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
      return applyCheck(state, player);
    case 'call':
      return applyCall(state, seat, player);
    case 'bet':
    case 'raise':
    case 'allIn':
      // Implemented in the next step.
      throw new IllegalBetError(`Action type "${action.type}" not yet implemented`);
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      throw new IllegalActionError(`Unknown action`);
    }
  }
}

function applyFold(state: GameState, seat: SeatIndex, player: PlayerState): GameState {
  const seats = state.seats.slice();
  seats[seat] = { ...player, status: PlayerStatus.Folded };
  return { ...state, seats };
}

function applyCheck(state: GameState, player: PlayerState): GameState {
  // Check is legal only when there's nothing to call.
  if (player.committedThisRound < state.currentBet) {
    throw new IllegalActionError(
      `Cannot check: facing a bet of ${state.currentBet - player.committedThisRound} to call`,
    );
  }
  return state; // No state change other than turn advance (handled elsewhere).
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
  return { ...state, seats };
}
