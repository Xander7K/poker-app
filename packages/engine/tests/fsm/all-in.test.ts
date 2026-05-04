import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { resolveShowdown } from '../../src/fsm/showdown.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { GamePhase } from '../../src/types/phase.js';
import { PlayerStatus } from '../../src/types/player.js';
import { makeState } from '../helpers/make-state.js';
import { steps } from '../helpers/play-actions.js';

const ev = new PokerSolverEvaluator();

describe('Heads-up all-in preflop', () => {
  it('runs out the board to showdown automatically', () => {
    let s = makeState({ stacks: [200, 200] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('hu-allin-1'));

    // SB shoves all-in for 200, BB calls all-in.
    s = steps(s, [{ type: 'allIn' }, { type: 'call' }]);

    // Both all-in → board ran out automatically; phase = Showdown.
    expect(s.phase).toBe(GamePhase.Showdown);
    expect(s.board).toHaveLength(5);

    s = resolveShowdown(s, ev);
    expect(s.phase).toBe(GamePhase.HandComplete);

    const total = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(total).toBe(400);
  });
});

describe('All-in with shorter stack creates side pot', () => {
  it('3-handed: shortest stack all-in, others continue with side pot', () => {
    // Seat 0: 100 (button = UTG in 3-handed). Seat 1: 1000 (SB). Seat 2: 1000 (BB).
    let s = makeState({ stacks: [100, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('side-allin-1'));

    // Preflop: UTG (button) shoves 100. SB calls. BB calls.
    s = steps(s, [{ type: 'allIn' }, { type: 'call' }, { type: 'call' }]);

    // SB and BB are NOT all-in; play continues on the flop.
    expect(s.phase).toBe(GamePhase.Flop);
    expect(s.toActSeat).toBe(1); // SB acts first postflop

    // SB checks, BB shoves remaining stack, SB folds.
    s = steps(s, [{ type: 'check' }, { type: 'allIn' }, { type: 'fold' }]);

    // After SB folds: UTG (AllIn) + BB (AllIn). Run-out to showdown.
    expect([GamePhase.Showdown, GamePhase.HandComplete]).toContain(s.phase);
    if (s.phase === GamePhase.Showdown) {
      s = resolveShowdown(s, ev);
    }
    expect(s.phase).toBe(GamePhase.HandComplete);

    // Pot conservation.
    const total = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(total).toBe(2100);
  });
});

describe('Triple all-in: 3 stacks at distinct levels', () => {
  it('creates 2 non-empty pots and distributes correctly', () => {
    // Stacks: 50, 150, 1000.
    let s = makeState({ stacks: [50, 150, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('triple-allin-1'));

    // Preflop: UTG all-in 50, SB all-in 150, BB calls 150.
    s = steps(s, [{ type: 'allIn' }, { type: 'allIn' }, { type: 'call' }]);

    // All players all-in or matched → run out to showdown.
    expect(s.phase).toBe(GamePhase.Showdown);
    expect(s.board).toHaveLength(5);

    // Layer 1 (0..50): 50 × 3 = 150, eligible all 3.
    // Layer 2 (50..150): 100 × 2 = 200, eligible seats 1 and 2.
    // Layer 3 (150..150): 0 — filtered out.
    expect(s.pots).toHaveLength(2);

    s = resolveShowdown(s, ev);
    expect(s.phase).toBe(GamePhase.HandComplete);

    // Conservation.
    const total = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(total).toBe(50 + 150 + 1000);
  });
});

describe('Folded player contributes to pot but cannot win', () => {
  it('folded short stack does not get any award', () => {
    let s = makeState({ stacks: [100, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('folded-allin'));

    // UTG/button all-in for 100. SB calls. BB folds.
    s = steps(s, [{ type: 'allIn' }, { type: 'call' }, { type: 'fold' }]);

    // Two non-folded players left (one all-in, one active) → showdown after run-out.
    if (s.phase !== GamePhase.HandComplete) {
      expect(s.phase).toBe(GamePhase.Showdown);
      s = resolveShowdown(s, ev);
    }

    // BB folded after committing only the BB blind. Stack: 1000 - 10 = 990.
    expect(s.seats[2]!.status).toBe(PlayerStatus.Folded);
    expect(s.seats[2]!.stack).toBe(990);
  });
});
