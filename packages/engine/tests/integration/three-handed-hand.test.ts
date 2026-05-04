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

describe('3-handed hand: open-call-fold preflop, c-bet wins flop', () => {
  it('UTG opens, SB calls, BB folds; SB folds to flop c-bet', () => {
    let s = makeState({ stacks: [1000, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('threehanded-1'));
    expect(s.toActSeat).toBe(0); // UTG=button in 3-handed (acts after BB)

    // Preflop: UTG raise to 30, SB call, BB fold
    s = steps(s, [{ type: 'raise', amount: 30 }, { type: 'call' }, { type: 'fold' }]);
    expect(s.phase).toBe(GamePhase.Flop);
    expect(s.board).toHaveLength(3);

    // Flop: SB checks (first to act postflop), UTG bets 50, SB folds
    expect(s.toActSeat).toBe(1);
    s = steps(s, [{ type: 'check' }, { type: 'bet', amount: 50 }, { type: 'fold' }]);

    // Hand ends as fold-around. UTG wins.
    expect(s.phase).toBe(GamePhase.HandComplete);
    // UTG committed: 30 preflop + 50 flop = 80; SB committed: 30; BB committed: 10. Total: 120.
    const utgStack = s.seats[0]!.stack;
    expect(utgStack).toBe(1000 - 80 + 120); // = 1040
  });
});

describe('3-handed hand: all the way to showdown', () => {
  it('runs preflop call → checks down → showdown', () => {
    let s = makeState({ stacks: [1000, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('threehanded-2'));

    // Preflop: UTG calls, SB calls, BB checks option
    s = steps(s, [{ type: 'call' }, { type: 'call' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.Flop);

    // Flop, Turn, River: all checks
    s = steps(s, [{ type: 'check' }, { type: 'check' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.Turn);
    s = steps(s, [{ type: 'check' }, { type: 'check' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.River);
    s = steps(s, [{ type: 'check' }, { type: 'check' }, { type: 'check' }]);
    expect(s.phase).toBe(GamePhase.Showdown);

    s = resolveShowdown(s, ev);
    expect(s.phase).toBe(GamePhase.HandComplete);

    const totalStack = s.seats.reduce((sum, p) => sum + p.stack, 0);
    expect(totalStack).toBe(3000);
  });
});

describe('3-handed hand: aggressor folds out the field', () => {
  it('BB 3-bets, UTG and SB fold', () => {
    let s = makeState({ stacks: [1000, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('threehanded-3'));

    // UTG raise to 30, SB call, BB raise to 100, UTG fold, SB fold
    s = steps(s, [
      { type: 'raise', amount: 30 },
      { type: 'call' },
      { type: 'raise', amount: 100 },
      { type: 'fold' },
      { type: 'fold' },
    ]);
    expect(s.phase).toBe(GamePhase.HandComplete);

    // BB wins. UTG committed: 30. SB committed: 30. BB committed: 100. Total: 160.
    const bbStack = s.seats[2]!.stack;
    expect(bbStack).toBe(1000 - 100 + 160); // = 1060
  });
});
