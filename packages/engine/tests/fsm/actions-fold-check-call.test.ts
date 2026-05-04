import { describe, it, expect } from 'vitest';

import { IllegalActionError, WrongTurnError } from '../../src/errors.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { applyAction } from '../../src/fsm/actions.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import { PlayerStatus } from '../../src/types/player.js';
import { makeState } from '../helpers/make-state.js';

function setupPreflop() {
  let s = makeState({ stacks: [1000, 1000, 1000] });
  s = startHand(s, 'h', 0);
  s = postBlinds(s);
  s = dealHoleCards(s, new SeedableRNG('test'));
  return s; // toActSeat = 0 (UTG in 3-handed)
}

describe('applyAction — fold', () => {
  it('marks the player as folded', () => {
    const s0 = setupPreflop();
    const s1 = applyAction(s0, 0, { type: 'fold' });
    expect(s1.seats[0]!.status).toBe(PlayerStatus.Folded);
  });

  it('does not change other players', () => {
    const s0 = setupPreflop();
    const s1 = applyAction(s0, 0, { type: 'fold' });
    expect(s1.seats[1]).toEqual(s0.seats[1]);
    expect(s1.seats[2]).toEqual(s0.seats[2]);
  });
});

describe('applyAction — check', () => {
  it('is illegal when facing a bet preflop', () => {
    const s0 = setupPreflop();
    expect(() => applyAction(s0, 0, { type: 'check' })).toThrow(IllegalActionError);
  });

  it('is legal when committed equals currentBet (e.g. BB option preflop after limps)', () => {
    let s = setupPreflop();
    // UTG calls, SB calls, BB option to check (committed=BB=10 already).
    s = applyAction(s, 0, { type: 'call' });
    s = { ...s, toActSeat: 1 };
    s = applyAction(s, 1, { type: 'call' });
    s = { ...s, toActSeat: 2 };
    expect(() => applyAction(s, 2, { type: 'check' })).not.toThrow();
  });
});

describe('applyAction — call', () => {
  it('debits stack and credits commitments', () => {
    const s0 = setupPreflop();
    const before = s0.seats[0]!.stack;
    const s1 = applyAction(s0, 0, { type: 'call' });
    expect(s1.seats[0]!.stack).toBe(before - 10); // 10 = BB
    expect(s1.seats[0]!.committedThisRound).toBe(10);
    expect(s1.seats[0]!.totalCommitted).toBe(10);
  });

  it('all-in if call exceeds stack', () => {
    let s = makeState({ stacks: [7, 1000, 1000] });
    s = startHand(s, 'h', 0);
    s = postBlinds(s);
    s = dealHoleCards(s, new SeedableRNG('test'));
    // Seat 0 has 7. To call BB=10 they go all-in for 7.
    const s1 = applyAction(s, 0, { type: 'call' });
    expect(s1.seats[0]!.stack).toBe(0);
    expect(s1.seats[0]!.status).toBe(PlayerStatus.AllIn);
    expect(s1.seats[0]!.committedThisRound).toBe(7);
  });

  it('throws if nothing to call', () => {
    const s = setupPreflop();
    // BB has committedThisRound=10 = currentBet. Forcing toActSeat=2 (BB).
    const sBB = { ...s, toActSeat: 2 };
    expect(() => applyAction(sBB, 2, { type: 'call' })).toThrow(IllegalActionError);
  });
});

describe('applyAction — turn protection', () => {
  it('throws WrongTurnError when wrong seat acts', () => {
    const s = setupPreflop(); // toActSeat = 0
    expect(() => applyAction(s, 1, { type: 'fold' })).toThrow(WrongTurnError);
  });

  it('throws IllegalActionError when folded player tries to act', () => {
    let s = setupPreflop();
    s = applyAction(s, 0, { type: 'fold' });
    // Force toAct back to seat 0 (folded).
    expect(() => applyAction({ ...s, toActSeat: 0 }, 0, { type: 'check' })).toThrow(
      IllegalActionError,
    );
  });
});
