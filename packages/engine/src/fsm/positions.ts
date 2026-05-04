import type { GameState } from '../types/game-state.js';
import { type PlayerState, PlayerStatus, type SeatIndex } from '../types/player.js';

/**
 * Returns true if a player can be dealt into the current hand: has chips,
 * is not empty, and is not sitting out.
 */
export function isDealtIn(p: PlayerState): boolean {
  return p.status !== PlayerStatus.Empty && p.status !== PlayerStatus.SittingOut && p.stack > 0;
}

/**
 * Returns true if a player still has actions to take this round.
 * (active and not yet all-in.)
 */
export function canStillAct(p: PlayerState): boolean {
  return p.status === PlayerStatus.Active;
}

/**
 * Returns the next seat (clockwise) from `from`, restricted to seats matching
 * the predicate. Returns -1 if no such seat exists in a full lap.
 */
export function nextSeat(
  state: GameState,
  from: SeatIndex,
  predicate: (p: PlayerState) => boolean,
): SeatIndex {
  const n = state.seats.length;
  for (let i = 1; i <= n; i++) {
    const seat = (from + i) % n;
    const p = state.seats[seat];
    if (p && predicate(p)) return seat;
  }
  return -1;
}

/**
 * Heads-up special case: button posts the small blind and acts first preflop.
 * Otherwise, SB is the seat after the button.
 */
export function smallBlindSeat(state: GameState): SeatIndex {
  const dealtIn = state.seats.filter(isDealtIn);
  if (dealtIn.length === 2) {
    // Heads-up: button is SB.
    return state.buttonSeat;
  }
  return nextSeat(state, state.buttonSeat, isDealtIn);
}

export function bigBlindSeat(state: GameState): SeatIndex {
  return nextSeat(state, smallBlindSeat(state), isDealtIn);
}

/**
 * Returns the seat that acts first preflop.
 * Heads-up: SB (=button) acts first.
 * Multiway: seat after BB.
 */
export function firstToActPreflop(state: GameState): SeatIndex {
  const dealtIn = state.seats.filter(isDealtIn);
  if (dealtIn.length === 2) {
    return state.buttonSeat;
  }
  return nextSeat(state, bigBlindSeat(state), isDealtIn);
}

/**
 * Returns the seat that acts first postflop.
 * In all cases: first dealt-in seat clockwise from the button. In heads-up
 * this is the non-button (BB), which acts first postflop. In multiway it's
 * the SB if still in, otherwise the next dealt-in player.
 */
export function firstToActPostflop(state: GameState): SeatIndex {
  return nextSeat(state, state.buttonSeat, isDealtIn);
}
