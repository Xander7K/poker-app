import { InvariantViolatedError } from '../errors.js';
import type { HandEvaluator } from '../evaluator/hand-evaluator.js';
import type { GameState, PotAward, ShowdownEvaluation } from '../types/game-state.js';
import { GamePhase } from '../types/phase.js';
import { PlayerStatus } from '../types/player.js';
import type { Pot } from '../types/pot.js';

/**
 * Evaluates non-folded players' hands and distributes each pot to the
 * winner(s) eligible for that pot.
 *
 * Splits with non-divisible amounts: the odd chip(s) go to the player(s)
 * closest to the left of the button (first to act post-flop convention).
 *
 * Returns a new GameState with phase=HandComplete, seats updated with new
 * stacks, showdown evaluations recorded, and awards log populated.
 */
export function resolveShowdown(state: GameState, evaluator: HandEvaluator): GameState {
  if (state.phase !== GamePhase.Showdown) {
    throw new InvariantViolatedError(
      `resolveShowdown called in phase ${state.phase}, expected Showdown`,
    );
  }

  // 1. Evaluate every non-folded contributor's hand.
  const showdownEvals: ShowdownEvaluation[] = [];
  for (const p of state.seats) {
    if (
      p.status === PlayerStatus.Empty ||
      p.status === PlayerStatus.SittingOut ||
      p.status === PlayerStatus.Folded
    ) {
      continue;
    }
    if (p.totalCommitted === 0) continue;
    const cards = [...p.holeCards, ...state.board];
    const hand = evaluator.evaluate(cards);
    showdownEvals.push({ playerId: p.id, hand });
  }

  // 2. For each pot, distribute to its eligible winners.
  const awards: PotAward[] = [];
  const stackDeltas = new Map<string, number>();
  for (const [i, pot] of state.pots.entries()) {
    const award = distributePot(pot, i, showdownEvals, state, evaluator);
    awards.push(award);
    for (const w of award.winners) {
      stackDeltas.set(w.playerId, (stackDeltas.get(w.playerId) ?? 0) + w.amount);
    }
  }

  // 3. Apply stack changes.
  const seats = state.seats.map((p) => {
    const delta = stackDeltas.get(p.id);
    return delta ? { ...p, stack: p.stack + delta } : p;
  });

  return {
    ...state,
    phase: GamePhase.HandComplete,
    seats,
    showdown: showdownEvals,
    awards,
    toActSeat: -1,
  };
}

function distributePot(
  pot: Pot,
  potIndex: number,
  evals: readonly ShowdownEvaluation[],
  state: GameState,
  evaluator: HandEvaluator,
): PotAward {
  const eligibleEvals = evals.filter((e) => pot.eligiblePlayerIds.includes(e.playerId));
  if (eligibleEvals.length === 0) {
    // Shouldn't happen if computePots is correct, but fail gracefully.
    return { potIndex, amount: pot.amount, winners: [] };
  }

  const winnerIndices = evaluator.compareWinners(eligibleEvals.map((e) => e.hand));
  const winnerEvals = winnerIndices
    .map((i) => eligibleEvals[i])
    .filter((e): e is ShowdownEvaluation => e !== undefined);

  // Order winners by clockwise distance from the button (first to act
  // postflop wins the odd chip(s) in a split).
  const winnersOrdered = winnerEvals
    .map((e) => {
      const seat = state.seats.find((p) => p.id === e.playerId);
      if (!seat) {
        throw new InvariantViolatedError(`Winner ${e.playerId} has no matching seat`);
      }
      const distance =
        (seat.seat - state.buttonSeat + state.config.maxSeats) % state.config.maxSeats;
      return { e, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  const baseShare = Math.floor(pot.amount / winnerEvals.length);
  let remainder = pot.amount - baseShare * winnerEvals.length;

  const winners = winnersOrdered.map(({ e }) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    return { playerId: e.playerId, amount: baseShare + extra };
  });

  return { potIndex, amount: pot.amount, winners };
}
