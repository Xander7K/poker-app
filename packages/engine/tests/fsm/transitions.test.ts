import { describe, it, expect } from 'vitest';

import { applyAction } from '../../src/fsm/actions.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { advanceTurn } from '../../src/fsm/transitions.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { GamePhase } from '../../src/types/phase.js';
import { PlayerStatus } from '../../src/types/player.js';
import { makeState } from '../helpers/make-state.js';

function setup(stacks: number[] = [1000, 1000, 1000]) {
  let s = makeState({ stacks });
  s = startHand(s, 'h', 0);
  s = postBlinds(s);
  s = dealHoleCards(s, new SeedableRNG('test'));
  return s;
}

describe('advanceTurn — fold-around', () => {
  it('hand ends when all but one fold; winner gets the pot', () => {
    let s = setup();
    // UTG (seat 0) folds.
    s = applyAction(s, 0, { type: 'fold' });
    s = advanceTurn(s);
    // SB (seat 1) folds → only BB left.
    s = applyAction(s, s.toActSeat, { type: 'fold' });
    s = advanceTurn(s);

    expect(s.phase).toBe(GamePhase.HandComplete);
    // BB is the only non-folded player.
    expect(s.seats[2]!.status).toBe(PlayerStatus.Active);
    // Total committed = SB(5) + BB(10) = 15. BB ends with 1000 - 10 + 15 = 1005.
    expect(s.seats[2]!.stack).toBe(1005);
    expect(s.awards).toBeDefined();
  });
});

describe('advanceTurn — passing the turn', () => {
  it('passes turn to next active player after a fold', () => {
    let s = setup();
    expect(s.toActSeat).toBe(0);
    s = applyAction(s, 0, { type: 'fold' });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(1);
  });

  it('passes turn after a call', () => {
    let s = setup();
    s = applyAction(s, 0, { type: 'call' });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(1);
  });
});

describe('advanceTurn — round closure preflop', () => {
  it('closes preflop when everyone calls and BB checks option', () => {
    let s = setup();
    // UTG calls
    s = applyAction(s, 0, { type: 'call' });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(1);
    // SB calls
    s = applyAction(s, 1, { type: 'call' });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(2); // BB still has option
    // BB checks option
    s = applyAction(s, 2, { type: 'check' });
    s = advanceTurn(s);
    expect(s.phase).toBe(GamePhase.Flop);
  });

  it('closes preflop with raise + calls when action returns to raiser', () => {
    let s = setup();
    // UTG raises to 30, SB calls, BB calls.
    s = applyAction(s, 0, { type: 'raise', amount: 30 });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(1);
    s = applyAction(s, 1, { type: 'call' });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(2);
    s = applyAction(s, 2, { type: 'call' });
    s = advanceTurn(s);
    // Round closes — phase advances to Flop.
    expect(s.phase).toBe(GamePhase.Flop);
  });
});

describe('advanceTurn — actedThisRound resets on full raise', () => {
  it('after a 3-bet, prior callers must act again', () => {
    let s = setup();
    // UTG raises, SB calls.
    s = applyAction(s, 0, { type: 'raise', amount: 30 });
    s = advanceTurn(s);
    s = applyAction(s, 1, { type: 'call' });
    s = advanceTurn(s);
    expect(s.toActSeat).toBe(2);
    // BB 3-bets to 100. Action reopens.
    s = applyAction(s, 2, { type: 'raise', amount: 100 });
    s = advanceTurn(s);
    // Action passes to UTG (raiser must call/fold).
    expect(s.toActSeat).toBe(0);
    expect(s.phase).toBe(GamePhase.PreFlop);
  });
});
