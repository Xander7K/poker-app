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

describe('6-max hand: limped pot to showdown', () => {
  it('all 6 limp preflop, check down to showdown', () => {
    let s = makeState({ stacks: [1000, 1000, 1000, 1000, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('sixmax-1'));

    // 6-handed, button=0: SB=1, BB=2, UTG=3 acts first.
    expect(s.toActSeat).toBe(3);

    // UTG, MP, CO, BTN call. SB calls. BB checks.
    s = steps(s, [
      { type: 'call' }, // UTG (3)
      { type: 'call' }, // MP (4)
      { type: 'call' }, // CO (5)
      { type: 'call' }, // BTN (0)
      { type: 'call' }, // SB (1)
      { type: 'check' }, // BB (2)
    ]);
    expect(s.phase).toBe(GamePhase.Flop);
    expect(s.pots[0]!.amount).toBe(60); // 6 × 10

    // Flop, Turn, River: all 6 check each street.
    const allCheck = Array<{ type: 'check' }>(6).fill({ type: 'check' as const });
    s = steps(s, allCheck);
    expect(s.phase).toBe(GamePhase.Turn);
    s = steps(s, allCheck);
    expect(s.phase).toBe(GamePhase.River);
    s = steps(s, allCheck);
    expect(s.phase).toBe(GamePhase.Showdown);

    s = resolveShowdown(s, ev);
    expect(s.phase).toBe(GamePhase.HandComplete);

    const totalStack = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(totalStack).toBe(6000);
  });
});

describe('6-max hand: standard open, 3-bet, fold', () => {
  it('CO opens, BTN 3-bets, CO folds; rest already folded', () => {
    let s = makeState({ stacks: [1000, 1000, 1000, 1000, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('sixmax-2'));

    s = steps(s, [
      { type: 'fold' }, // UTG (3)
      { type: 'fold' }, // MP (4)
      { type: 'raise', amount: 25 }, // CO (5)
      { type: 'raise', amount: 80 }, // BTN (0)
      { type: 'fold' }, // SB (1)
      { type: 'fold' }, // BB (2)
      { type: 'fold' }, // CO (5) — back to CO after BTN's 3-bet
    ]);
    expect(s.phase).toBe(GamePhase.HandComplete);

    // BTN wins. Pot = 5 (SB) + 10 (BB) + 25 (CO) + 80 (BTN) = 120.
    const btnStack = s.seats[0]!.stack;
    expect(btnStack).toBe(1000 - 80 + 120); // 1040
  });
});
