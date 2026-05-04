import { describe, it, expect } from 'vitest';

import { IllegalBetError } from '../../src/errors.js';
import { applyAction } from '../../src/fsm/actions.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { makeState } from '../helpers/make-state.js';

function setup(stacks: number[] = [1000, 1000, 1000]) {
  let s = makeState({ stacks });
  s = startHand(s, 'h', 0);
  s = postBlinds(s);
  s = dealHoleCards(s, new SeedableRNG('test'));
  return s;
}

describe('raise — preflop', () => {
  it('UTG can raise to 30 (BB=10, lastRaiseSize=10, min raise to=20+) above min', () => {
    const s0 = setup();
    const s1 = applyAction(s0, 0, { type: 'raise', amount: 30 });
    expect(s1.currentBet).toBe(30);
    expect(s1.lastRaiseSize).toBe(20);
    expect(s1.lastAggressorSeat).toBe(0);
  });

  it('UTG cannot raise to 15 (less than min raise to 20)', () => {
    const s0 = setup();
    expect(() => applyAction(s0, 0, { type: 'raise', amount: 15 })).toThrow(IllegalBetError);
  });

  it('UTG can raise exactly to min (20)', () => {
    const s0 = setup();
    const s1 = applyAction(s0, 0, { type: 'raise', amount: 20 });
    expect(s1.currentBet).toBe(20);
    expect(s1.lastRaiseSize).toBe(10);
  });

  it('cannot raise more than stack', () => {
    const s0 = setup([100, 1000, 1000]);
    expect(() => applyAction(s0, 0, { type: 'raise', amount: 200 })).toThrow(IllegalBetError);
  });
});

describe('all-in', () => {
  it('all-in commits entire stack', () => {
    const s0 = setup([100, 1000, 1000]);
    const s1 = applyAction(s0, 0, { type: 'allIn' });
    expect(s1.seats[0]!.stack).toBe(0);
    expect(s1.seats[0]!.status).toBe('allIn');
    expect(s1.seats[0]!.committedThisRound).toBe(100);
    expect(s1.currentBet).toBe(100);
  });

  it('full all-in (>= min raise) reopens action and updates lastAggressor', () => {
    const s0 = setup([1000, 1000, 1000]);
    const s1 = applyAction(s0, 0, { type: 'allIn' });
    expect(s1.lastAggressorSeat).toBe(0);
    expect(s1.lastRaiseSize).toBe(990); // 1000 - BB(10)
  });

  it('short all-in does NOT reopen action (lastAggressor unchanged)', () => {
    // Setup: BB=10, so lastRaiseSize=10. UTG raises to 30 (lastRaiseSize=20).
    // Now SB has only 35 chips. Their all-in is 35, which is currentBet=30 + 5.
    // 5 < lastRaiseSize=20, so this is a short all-in: no reopen.
    let s = setup([1000, 35, 1000]);
    s = applyAction(s, 0, { type: 'raise', amount: 30 });
    s = { ...s, toActSeat: 1 };
    const sShort = applyAction(s, 1, { type: 'allIn' });
    expect(sShort.lastAggressorSeat).toBe(0); // still UTG
    expect(sShort.lastRaiseSize).toBe(20); // unchanged
  });
});

describe('bet — postflop (simulated currentBet=0)', () => {
  it('cannot bet when there is already a bet', () => {
    const s0 = setup();
    expect(() => applyAction(s0, 0, { type: 'bet', amount: 50 })).toThrow(IllegalBetError);
  });

  it('can bet >= BB on a clean street (simulated)', () => {
    // Force a clean street: zero out currentBet and committed amounts.
    const s0 = setup();
    const cleanStreet = {
      ...s0,
      currentBet: 0,
      lastRaiseSize: 10,
      lastAggressorSeat: -1,
      seats: s0.seats.map((p) => ({ ...p, committedThisRound: 0 })),
    };
    const s1 = applyAction(cleanStreet, 0, { type: 'bet', amount: 30 });
    expect(s1.currentBet).toBe(30);
  });
});
