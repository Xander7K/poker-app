import fc from 'fast-check';
import { describe, it } from 'vitest';

import {
  EngineError,
  IllegalActionError,
  IllegalBetError,
  WrongTurnError,
} from '../../src/errors.js';
import { applyAction } from '../../src/fsm/actions.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import type { Action } from '../../src/types/action.js';
import { makeState } from '../helpers/make-state.js';

const actionArb: fc.Arbitrary<Action> = fc.oneof(
  fc.constant({ type: 'fold' as const }),
  fc.constant({ type: 'check' as const }),
  fc.constant({ type: 'call' as const }),
  fc.record({ type: fc.constant('bet' as const), amount: fc.integer({ min: 0, max: 5000 }) }),
  fc.record({ type: fc.constant('raise' as const), amount: fc.integer({ min: 0, max: 5000 }) }),
  fc.constant({ type: 'allIn' as const }),
);

describe('Property: applyAction either succeeds or throws a typed EngineError', () => {
  it('never throws an untyped error', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        actionArb,
        fc.string({ minLength: 1, maxLength: 12 }),
        (seat, action, seedString) => {
          let s = makeState({ stacks: [1000, 1000, 1000] });
          s = startHand(s, 'h', 0);
          s = postBlinds(s);
          s = dealHoleCards(s, new SeedableRNG(seedString));

          try {
            applyAction(s, seat, action);
            return true; // Succeeded; valid outcome.
          } catch (e) {
            // Must be one of the typed engine errors.
            return (
              e instanceof EngineError ||
              e instanceof WrongTurnError ||
              e instanceof IllegalActionError ||
              e instanceof IllegalBetError
            );
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('Property: applyAction does not mutate input state on error', () => {
  it('snapshot equality after every error', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        actionArb,
        fc.string({ minLength: 1, maxLength: 12 }),
        (seat, action, seedString) => {
          let s = makeState({ stacks: [1000, 1000, 1000] });
          s = startHand(s, 'h', 0);
          s = postBlinds(s);
          s = dealHoleCards(s, new SeedableRNG(seedString));

          const snapshot = JSON.stringify(s);
          try {
            applyAction(s, seat, action);
          } catch {
            // ignore — only snapshot equality matters
          }
          return JSON.stringify(s) === snapshot;
        },
      ),
      { numRuns: 200 },
    );
  });
});
