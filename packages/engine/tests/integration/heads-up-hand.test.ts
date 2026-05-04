import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { resolveShowdown } from '../../src/fsm/showdown.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { GamePhase } from '../../src/types/phase.js';
import { makeState } from '../helpers/make-state.js';
import { steps } from '../helpers/play-actions.js';

const ev = new PokerSolverEvaluator();

describe('Heads-up hand: limped to showdown', () => {
  it('completes a 4-street hand without errors', () => {
    let s = makeState({ stacks: [1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s); // SB=button=0 posts 5, BB=1 posts 10
    s = dealHoleCards(s, new SeedableRNG('headsup-1'));
    expect(s.phase).toBe(GamePhase.PreFlop);
    expect(s.toActSeat).toBe(0); // button acts first preflop heads-up

    // Preflop: SB calls, BB checks
    s = steps(s, [{ type: 'call' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.Flop);
    expect(s.board).toHaveLength(3);

    // Flop: BB checks, SB checks
    expect(s.toActSeat).toBe(1);
    s = steps(s, [{ type: 'check' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.Turn);
    expect(s.board).toHaveLength(4);

    // Turn: BB checks, SB checks
    s = steps(s, [{ type: 'check' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.River);
    expect(s.board).toHaveLength(5);

    // River: BB checks, SB checks → showdown
    s = steps(s, [{ type: 'check' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.Showdown);

    // Resolve showdown
    s = resolveShowdown(s, ev);
    expect(s.phase).toBe(GamePhase.HandComplete);
    expect(s.awards).toBeDefined();
    expect(s.awards).toHaveLength(1);

    // Total stacks must equal initial stacks (no chips lost or created).
    const totalStack = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(totalStack).toBe(2000);
  });
});

describe('Heads-up hand: BB defends a 3-bet preflop and folds on flop', () => {
  it('correctly transfers chips on a fold', () => {
    let s = makeState({ stacks: [1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('headsup-2'));

    // SB raises to 30, BB calls
    s = steps(s, [{ type: 'raise', amount: 30 }, { type: 'call' }]);
    expect(s.phase).toBe(GamePhase.Flop);

    // Flop: BB checks, SB bets 50
    s = steps(s, [{ type: 'check' }, { type: 'bet', amount: 50 }]);
    expect(s.toActSeat).toBe(1);

    // BB folds
    s = steps(s, [{ type: 'fold' }]);
    expect(s.phase).toBe(GamePhase.HandComplete);

    // SB committed: 30 (preflop) + 50 (flop) = 80
    // BB committed: 30 (preflop)
    // Total pot: 110. Winner is SB (BB folded).
    const sbStack = s.seats[0]!.stack;
    expect(sbStack).toBe(1000 - 80 + 110); // = 1030
  });
});
