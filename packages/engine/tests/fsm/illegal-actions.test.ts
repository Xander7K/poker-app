import { describe, it, expect } from 'vitest';

import { IllegalActionError, IllegalBetError, WrongTurnError } from '../../src/errors.js';
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
  s = dealHoleCards(s, new SeedableRNG('illegal-test'));
  return s;
}

describe('Illegal: wrong turn', () => {
  it('seat that is not toActSeat cannot act', () => {
    const s = setup();
    expect(() => applyAction(s, 1, { type: 'fold' })).toThrow(WrongTurnError);
    expect(() => applyAction(s, 2, { type: 'call' })).toThrow(WrongTurnError);
  });
});

describe('Illegal: check facing a bet', () => {
  it('cannot check preflop with BB unmatched', () => {
    const s = setup();
    expect(() => applyAction(s, 0, { type: 'check' })).toThrow(IllegalActionError);
  });
});

describe('Illegal: call when nothing to call', () => {
  it('throws when BB tries to call own blind preflop with no raise', () => {
    let s = setup();
    s = applyAction(s, 0, { type: 'call' });
    s = { ...s, toActSeat: 1 };
    s = applyAction(s, 1, { type: 'call' });
    s = { ...s, toActSeat: 2 };
    expect(() => applyAction(s, 2, { type: 'call' })).toThrow(IllegalActionError);
  });
});

describe('Illegal: bet when there is already a bet', () => {
  it('throws preflop because BB is implicit bet', () => {
    const s = setup();
    expect(() => applyAction(s, 0, { type: 'bet', amount: 30 })).toThrow(IllegalBetError);
  });
});

describe('Illegal: raise below min raise', () => {
  it('throws when raise to is less than currentBet + lastRaiseSize', () => {
    const s = setup();
    expect(() => applyAction(s, 0, { type: 'raise', amount: 15 })).toThrow(IllegalBetError);
  });
});

describe('Illegal: bet/raise above stack', () => {
  it('throws when raise amount > stack', () => {
    const s = setup([100, 1000, 1000]);
    expect(() => applyAction(s, 0, { type: 'raise', amount: 200 })).toThrow(IllegalBetError);
  });
});

describe('Illegal: action by folded or all-in player', () => {
  it('folded player cannot act', () => {
    let s = setup();
    s = applyAction(s, 0, { type: 'fold' });
    expect(() => applyAction({ ...s, toActSeat: 0 }, 0, { type: 'check' })).toThrow(
      IllegalActionError,
    );
  });

  it('all-in player cannot act', () => {
    let s = setup([10, 1000, 1000]); // seat 0 has only 10
    s = applyAction(s, 0, { type: 'allIn' });
    expect(() => applyAction({ ...s, toActSeat: 0 }, 0, { type: 'check' })).toThrow(
      IllegalActionError,
    );
  });
});

describe('Illegal: state is not mutated when an error is thrown', () => {
  it('throwing applyAction leaves state object identical', () => {
    const s = setup();
    const snapshot = JSON.stringify(s);
    expect(() => applyAction(s, 1, { type: 'fold' })).toThrow();
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
