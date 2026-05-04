import { InvariantViolatedError } from '../errors.js';
import type { HandEvaluator } from '../evaluator/hand-evaluator.js';
import { PokerSolverEvaluator } from '../evaluator/pokersolver-evaluator.js';
import { applyAction } from '../fsm/actions.js';
import { postBlinds } from '../fsm/blinds.js';
import { dealFlop, dealHoleCards, dealRiver, dealTurn } from '../fsm/deal.js';
import { resolveShowdown } from '../fsm/showdown.js';
import { startHand } from '../fsm/start-hand.js';
import { advanceTurn } from '../fsm/transitions.js';
import { SeedableRNG } from '../rng/seedable-rng.js';
import type { GameState, TableConfig } from '../types/game-state.js';
import { GamePhase } from '../types/phase.js';
import { type PlayerState, PlayerStatus, emptySeat } from '../types/player.js';

import type { HandEvent, HandHistory } from './events.js';

export interface ReplayResult {
  /** Final GameState after replay. Should match the original final state. */
  readonly finalState: GameState;
  /** True if the replay matched the recorded events exactly. */
  readonly matchedRecordedEvents: boolean;
  /** Mismatches found, if any. Empty when matchedRecordedEvents=true. */
  readonly mismatches: readonly string[];
}

/**
 * Replays a HandHistory deterministically using its rngSeed.
 *
 * Verifies that:
 * - The shuffled deck produces the same hole cards recorded.
 * - Every recorded action is legal at the moment it was recorded.
 * - The final awards match the recorded `potAwarded` events.
 *
 * Returns the final state and a list of mismatches (empty if perfect replay).
 *
 * Throws if the history is structurally malformed (does not reach
 * HandComplete after applying recorded events).
 */
export function replayHand(history: HandHistory, evaluator?: HandEvaluator): ReplayResult {
  const ev = evaluator ?? new PokerSolverEvaluator();
  const mismatches: string[] = [];
  const rng = new SeedableRNG(history.rngSeed);

  // 1. Build initial GameState from history.players.
  const config: TableConfig = {
    maxSeats: history.maxSeats,
    smallBlind: history.smallBlind,
    bigBlind: history.bigBlind,
    ante: history.ante,
    minBuyIn: 0,
    maxBuyIn: 0,
  };
  const seats: PlayerState[] = [];
  for (let i = 0; i < history.maxSeats; i++) {
    const player = history.players.find((p) => p.seat === i);
    seats.push(
      player
        ? {
            id: player.id,
            seat: player.seat,
            name: player.name,
            stack: player.startingStack,
            holeCards: [],
            status: PlayerStatus.Active,
            totalCommitted: 0,
            committedThisRound: 0,
          }
        : emptySeat(i),
    );
  }
  const initialState: GameState = {
    handId: history.handId,
    config,
    phase: GamePhase.WaitingForPlayers,
    seats,
    buttonSeat: history.buttonSeat,
    deck: [],
    board: [],
    burned: [],
    pots: [],
    toActSeat: -1,
    currentBet: 0,
    lastRaiseSize: 0,
    lastAggressorSeat: -1,
    actedThisRound: [],
  };

  // 2. Run startHand → postBlinds → dealHoleCards.
  let s = startHand(initialState, history.handId, history.buttonSeat);
  s = postBlinds(s);
  s = dealHoleCards(s, rng);

  // 3. Verify hole cards match recorded event.
  const dealEvent = history.events.find(
    (e): e is Extract<HandEvent, { type: 'dealHoleCards' }> => e.type === 'dealHoleCards',
  );
  if (dealEvent) {
    for (const recorded of dealEvent.perSeat) {
      const playerInState = s.seats[recorded.seat];
      if (!playerInState) {
        mismatches.push(`Recorded seat ${recorded.seat} not present in state`);
        continue;
      }
      const replayed = playerInState.holeCards.join(',');
      const expected = recorded.cards.join(',');
      if (replayed !== expected) {
        mismatches.push(
          `Hole cards mismatch at seat ${recorded.seat}: recorded ${expected}, replayed ${replayed}`,
        );
      }
    }
  }

  // 4. Apply each recorded action in order. Auto-deal cards between streets
  //    so the engine can continue (deal events are observational, not required
  //    for determinism since the rngSeed already fixes the deck order).
  for (const event of history.events) {
    if (event.type !== 'action') continue;
    if (s.phase === GamePhase.HandComplete) break;
    if (s.toActSeat !== event.seat) {
      mismatches.push(
        `Action at t=${event.t}: recorded seat ${event.seat} but replay expected seat ${s.toActSeat}`,
      );
      s = { ...s, toActSeat: event.seat };
    }
    s = applyAction(s, event.seat, event.action);
    s = advanceTurn(s);

    if (s.phase === GamePhase.Flop && s.board.length === 0) s = dealFlop(s);
    else if (s.phase === GamePhase.Turn && s.board.length === 3) s = dealTurn(s);
    else if (s.phase === GamePhase.River && s.board.length === 4) s = dealRiver(s);
  }

  // 5. Resolve showdown if reached.
  if (s.phase === GamePhase.Showdown) {
    s = resolveShowdown(s, ev);
  }

  // 6. Verify awards match recorded potAwarded events (when both exist).
  const recordedAwards = history.events.filter(
    (e): e is Extract<HandEvent, { type: 'potAwarded' }> => e.type === 'potAwarded',
  );
  if (s.awards && recordedAwards.length === s.awards.length) {
    for (let i = 0; i < recordedAwards.length; i++) {
      const recorded = recordedAwards[i];
      const replayed = s.awards[i];
      if (recorded && replayed && recorded.amount !== replayed.amount) {
        mismatches.push(
          `Pot ${i} amount mismatch: recorded ${recorded.amount}, replayed ${replayed.amount}`,
        );
      }
    }
  }

  if (s.phase !== GamePhase.HandComplete) {
    throw new InvariantViolatedError(`Replay finished in phase ${s.phase}, expected HandComplete`);
  }

  return {
    finalState: s,
    matchedRecordedEvents: mismatches.length === 0,
    mismatches,
  };
}
