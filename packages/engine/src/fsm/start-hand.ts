import { HandStartError } from '../errors.js';
import type { GameState } from '../types/game-state.js';
import { GamePhase } from '../types/phase.js';
import { PlayerStatus, type SeatIndex } from '../types/player.js';

import { isDealtIn } from './positions.js';

/**
 * Resets per-hand fields and prepares a GameState to start a new hand.
 * The button does NOT auto-rotate here — caller must pass the new buttonSeat.
 *
 * After this call, the state is in `Dealing` phase. Subsequent calls will
 * post blinds and deal hole cards (separate steps).
 *
 * Throws HandStartError if fewer than 2 dealt-in players.
 */
export function startHand(
  state: GameState,
  newHandId: string,
  newButtonSeat: SeatIndex,
): GameState {
  const dealtIn = state.seats.filter(isDealtIn);
  if (dealtIn.length < 2) {
    throw new HandStartError(`Cannot start hand with only ${dealtIn.length} dealt-in player(s)`);
  }

  const seats = state.seats.map((p) => {
    if (!isDealtIn(p)) return p;
    // Reset per-hand fields. Dealt-in players become Active even if they
    // ended the previous hand as Folded or AllIn.
    return {
      ...p,
      holeCards: [],
      totalCommitted: 0,
      committedThisRound: 0,
      status: PlayerStatus.Active,
    };
  });

  return {
    ...state,
    handId: newHandId,
    phase: GamePhase.Dealing,
    seats,
    buttonSeat: newButtonSeat,
    deck: [],
    board: [],
    burned: [],
    pots: [],
    toActSeat: -1,
    currentBet: 0,
    lastRaiseSize: 0,
    lastAggressorSeat: -1,
    showdown: undefined,
    awards: undefined,
  };
}
