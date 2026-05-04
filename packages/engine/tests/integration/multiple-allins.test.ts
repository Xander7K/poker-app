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

describe('6-max with 4 all-ins at distinct stack levels', () => {
  it('generates correct number of pots and conserves chips', () => {
    // Stacks: BTN=50, SB=100, BB=200, UTG=500, MP=1000, CO=1000.
    let s = makeState({ stacks: [50, 100, 200, 500, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('multi-allin-1'));

    // 6-handed, button=0. SB=1, BB=2. UTG=3 acts first preflop.
    expect(s.toActSeat).toBe(3);

    // Preflop sequence:
    //   UTG raises to 50, MP raises to 200, CO calls 200,
    //   BTN all-in 50 (short), SB all-in 100 (short), BB all-in 200,
    //   UTG all-in 500 (full re-raise → reopens action),
    //   MP calls 500, CO calls 500.
    s = steps(s, [
      { type: 'raise', amount: 50 }, // UTG (3)
      { type: 'raise', amount: 200 }, // MP (4)
      { type: 'call' }, // CO (5)
      { type: 'allIn' }, // BTN (0): all-in 50
      { type: 'allIn' }, // SB (1): all-in 100
      { type: 'allIn' }, // BB (2): all-in 200
      { type: 'allIn' }, // UTG (3): all-in 500 (full raise reopens)
      { type: 'call' }, // MP (4): calls to 500
      { type: 'call' }, // CO (5): calls to 500
    ]);

    // After preflop closes: MP and CO still have ~500 chips behind. They
    // play out the remaining streets (no further bets, just checks).
    if (s.phase === GamePhase.Flop) {
      const allCheck = [{ type: 'check' as const }, { type: 'check' as const }];
      s = steps(s, allCheck);
      if (s.phase === GamePhase.Turn) s = steps(s, allCheck);
      if (s.phase === GamePhase.River) s = steps(s, allCheck);
    }

    expect(s.phase).toBe(GamePhase.Showdown);
    expect(s.board).toHaveLength(5);

    // Distinct commitment levels: 50, 100, 200, 500 → expect at least 4 pots.
    expect(s.pots.length).toBeGreaterThanOrEqual(4);

    s = resolveShowdown(s, ev);
    expect(s.phase).toBe(GamePhase.HandComplete);

    // Conservation: initial total = 50+100+200+500+1000+1000 = 2850.
    const total = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(total).toBe(2850);

    // Every awarded pot has at least one winner and the amounts add up.
    expect(s.awards).toBeDefined();
    for (const award of s.awards!) {
      expect(award.winners.length).toBeGreaterThan(0);
      const totalAwarded = award.winners.reduce((acc, w) => acc + w.amount, 0);
      expect(totalAwarded).toBe(award.amount);
    }
  });
});
