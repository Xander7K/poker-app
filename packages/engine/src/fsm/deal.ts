import { InvariantViolatedError } from '../errors.js';
import type { RNG } from '../rng/rng.js';
import { shuffle } from '../rng/shuffle.js';
import { type Card, freshDeck } from '../types/card.js';
import type { GameState } from '../types/game-state.js';
import { GamePhase } from '../types/phase.js';

import { firstToActPostflop, firstToActPreflop, isDealtIn, isInHand } from './positions.js';

/**
 * Shuffles a fresh deck and deals 2 hole cards to every in-hand player.
 * Sets toActSeat to first-to-act preflop.
 *
 * Standard order: dealer deals one card to each player starting from the seat
 * after the button (SB), then a second card in the same order. We follow this
 * convention to make replay reproduce real-world dealing exactly.
 */
export function dealHoleCards(state: GameState, rng: RNG): GameState {
  if (state.phase !== GamePhase.PreFlop) {
    throw new InvariantViolatedError(`dealHoleCards expects PreFlop phase, got ${state.phase}`);
  }

  const deck = shuffle(freshDeck(), rng);
  let cursor = 0;

  // Players in the hand (Active or AllIn from blinds) — both get cards.
  const inHandSeats = state.seats.map((p, i) => ({ p, i })).filter(({ p }) => isInHand(p));

  // Find the first seat AFTER the button to start dealing.
  const startIdx = inHandSeats.findIndex(({ i }) => i > state.buttonSeat);
  const ordered =
    startIdx === -1
      ? inHandSeats
      : [...inHandSeats.slice(startIdx), ...inHandSeats.slice(0, startIdx)];

  // Distribute two cards in two passes.
  const holeCardsBySeat = new Map<number, Card[]>();
  for (let pass = 0; pass < 2; pass++) {
    for (const { i } of ordered) {
      const card = deck[cursor];
      if (!card) {
        throw new InvariantViolatedError(`Deck exhausted dealing hole cards at cursor ${cursor}`);
      }
      cursor++;
      const arr = holeCardsBySeat.get(i) ?? [];
      arr.push(card);
      holeCardsBySeat.set(i, arr);
    }
  }

  const seats = state.seats.map((p) => {
    const cards = holeCardsBySeat.get(p.seat);
    return cards ? { ...p, holeCards: cards } : p;
  });

  return {
    ...state,
    seats,
    deck: deck.slice(cursor),
    toActSeat: firstToActPreflop({ ...state, seats }),
  };
}

/**
 * Burns 1 card and deals 3 community cards (the flop).
 */
export function dealFlop(state: GameState): GameState {
  if (state.phase !== GamePhase.Flop) {
    throw new InvariantViolatedError(`dealFlop expects Flop phase, got ${state.phase}`);
  }
  return dealCommunity(state, 3);
}

/**
 * Burns 1 card and deals 1 community card (the turn).
 */
export function dealTurn(state: GameState): GameState {
  if (state.phase !== GamePhase.Turn) {
    throw new InvariantViolatedError(`dealTurn expects Turn phase, got ${state.phase}`);
  }
  return dealCommunity(state, 1);
}

/**
 * Burns 1 card and deals 1 community card (the river).
 */
export function dealRiver(state: GameState): GameState {
  if (state.phase !== GamePhase.River) {
    throw new InvariantViolatedError(`dealRiver expects River phase, got ${state.phase}`);
  }
  return dealCommunity(state, 1);
}

function dealCommunity(state: GameState, count: number): GameState {
  if (state.deck.length < count + 1) {
    throw new InvariantViolatedError(
      `Insufficient cards in deck: need ${count + 1}, have ${state.deck.length}`,
    );
  }
  const burn = state.deck[0];
  if (!burn) {
    throw new InvariantViolatedError('Deck unexpectedly empty when burning');
  }
  const community = state.deck.slice(1, 1 + count);
  const remaining = state.deck.slice(1 + count);

  // Reset committedThisRound for everyone in the hand at the start of the new
  // street. (For players who already folded or are all-in, committedThisRound
  // would already be 0 from prior round closure, but resetting is harmless.)
  const seatsAfterReset = state.seats.map((p) =>
    isDealtIn(p) || isInHand(p) ? { ...p, committedThisRound: 0 } : p,
  );

  return {
    ...state,
    deck: remaining,
    burned: [...state.burned, burn],
    board: [...state.board, ...community],
    seats: seatsAfterReset,
    currentBet: 0,
    lastRaiseSize: state.config.bigBlind,
    lastAggressorSeat: -1,
    toActSeat: firstToActPostflop({ ...state, seats: seatsAfterReset }),
  };
}
