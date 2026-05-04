import { InvariantViolatedError } from '../errors.js';
import type { GameState, PotAward } from '../types/game-state.js';
import { BETTING_PHASES, GamePhase } from '../types/phase.js';
import { PlayerStatus } from '../types/player.js';

import { dealFlop, dealRiver, dealTurn } from './deal.js';
import { canStillAct, isInHand, nextSeat } from './positions.js';
import { computePots } from './pots.js';

/**
 * After an action has been applied, decide what comes next:
 * - If only one non-folded player remains: hand ends (winner takes pot).
 * - If betting round closed (every still-active player has acted and matched
 *   currentBet): advance to the next street (or showdown after the river).
 *   If everyone left is all-in, deal remaining streets and go to showdown.
 * - Otherwise: pass turn to the next dealt-in player who can still act.
 *
 * This is a pure function: returns a new GameState.
 *
 * NOTE: When advancing past PreFlop/Flop/Turn into the next street, this
 * function does NOT deal the new street's cards by itself UNLESS everyone
 * is all-in (in which case it runs the board out automatically). For normal
 * flow, callers should check `phase` after `advanceTurn` and call dealFlop /
 * dealTurn / dealRiver as needed (the test helper `step`/`steps` does this).
 */
export function advanceTurn(state: GameState): GameState {
  if (!isBettingPhase(state.phase)) {
    return state;
  }

  // 1. Fold-around: only one non-folded player left.
  const nonFolded = state.seats.filter(
    (p) =>
      p.status !== PlayerStatus.Empty &&
      p.status !== PlayerStatus.SittingOut &&
      p.status !== PlayerStatus.Folded,
  );
  if (nonFolded.length <= 1) {
    return finalizeFoldAround(state);
  }

  // 2. Round closure.
  if (isRoundClosed(state)) {
    return advanceStreetOrShowdown(state);
  }

  // 3. Pass turn to the next seat that can still act.
  const next = nextSeat(state, state.toActSeat, canStillAct);
  if (next === -1) {
    // No one can still act — round is closed by exhaustion.
    return advanceStreetOrShowdown(state);
  }
  return { ...state, toActSeat: next };
}

function isBettingPhase(phase: GamePhase): boolean {
  return BETTING_PHASES.includes(phase);
}

/**
 * The round is closed when:
 * - No still-active player has a short call pending, AND
 * - Either there are 0 or 1 still-active players (no further betting possible),
 *   OR every still-active player has acted at least once in this round.
 *
 * `actedThisRound` is reset on each new street and on any aggression that
 * reopens action, so this check correctly handles BB option preflop, short
 * all-ins, and re-raise scenarios.
 */
function isRoundClosed(state: GameState): boolean {
  const stillActive = state.seats.filter((p) => p.status === PlayerStatus.Active);

  // Anyone with a short call still pending?
  for (const p of stillActive) {
    if (p.committedThisRound < state.currentBet) return false;
  }

  // 0 or 1 active players — no further betting possible.
  if (stillActive.length <= 1) return true;

  // All still-active players must have acted in this round.
  const actedSet = new Set(state.actedThisRound);
  return stillActive.every((p) => actedSet.has(p.seat));
}

/**
 * After PreFlop closes → goto Flop (caller deals flop next).
 * After Flop → Turn. After Turn → River. After River → Showdown.
 *
 * If only one (or zero) active players remain, jump straight to the
 * showdown by dealing remaining streets in-place.
 */
function advanceStreetOrShowdown(state: GameState): GameState {
  const stillActive = state.seats.filter((p) => p.status === PlayerStatus.Active);
  const noMoreBetting = stillActive.length <= 1;

  // Roll committedThisRound into the pot snapshot.
  const newPots = computePots(state.seats);

  switch (state.phase) {
    case GamePhase.PreFlop: {
      const next: GameState = {
        ...state,
        phase: GamePhase.Flop,
        pots: newPots,
        toActSeat: -1,
      };
      if (noMoreBetting) return runOutToShowdown(next);
      return next;
    }
    case GamePhase.Flop: {
      const next: GameState = {
        ...state,
        phase: GamePhase.Turn,
        pots: newPots,
        toActSeat: -1,
      };
      if (noMoreBetting) return runOutToShowdown(next);
      return next;
    }
    case GamePhase.Turn: {
      const next: GameState = {
        ...state,
        phase: GamePhase.River,
        pots: newPots,
        toActSeat: -1,
      };
      if (noMoreBetting) return runOutToShowdown(next);
      return next;
    }
    case GamePhase.River:
      return { ...state, phase: GamePhase.Showdown, pots: newPots, toActSeat: -1 };
    default:
      throw new InvariantViolatedError(
        `advanceStreetOrShowdown called from non-betting phase ${state.phase}`,
      );
  }
}

/**
 * Deal out remaining streets and go straight to showdown. Used when all
 * remaining players are all-in (or only one is left after a fold-around
 * with prior all-ins).
 *
 * The deal* helpers do NOT advance the phase themselves (that's normally
 * `advanceStreetOrShowdown`'s job), so we bump the phase between deals here.
 */
function runOutToShowdown(state: GameState): GameState {
  let s = state;
  if (s.phase === GamePhase.Flop) {
    s = dealFlop(s);
    s = { ...s, phase: GamePhase.Turn };
  }
  if (s.phase === GamePhase.Turn) {
    s = dealTurn(s);
    s = { ...s, phase: GamePhase.River };
  }
  if (s.phase === GamePhase.River) {
    s = dealRiver(s);
  }
  return { ...s, phase: GamePhase.Showdown, toActSeat: -1 };
}

/**
 * Hand ends because everyone folded except one. That player wins the entire
 * pot. No showdown.
 */
function finalizeFoldAround(state: GameState): GameState {
  const winner = state.seats.find(isInHand);
  if (!winner) {
    throw new InvariantViolatedError('finalizeFoldAround: no winner found');
  }
  const pots = computePots(state.seats);
  const totalAmount = pots.reduce((sum, p) => sum + p.amount, 0);

  const seats = state.seats.map((p) =>
    p.id === winner.id ? { ...p, stack: p.stack + totalAmount } : p,
  );

  const awards: PotAward[] = pots.map((pot, i) => ({
    potIndex: i,
    amount: pot.amount,
    winners: [{ playerId: winner.id, amount: pot.amount }],
  }));

  return {
    ...state,
    phase: GamePhase.HandComplete,
    seats,
    pots,
    toActSeat: -1,
    awards,
  };
}
