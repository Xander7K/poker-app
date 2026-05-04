import fc from 'fast-check';
import { describe, it } from 'vitest';

import { applyAction } from '../../src/fsm/actions.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { computePots } from '../../src/fsm/pots.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { advanceTurn } from '../../src/fsm/transitions.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import type { GameState } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';
import { makeState } from '../helpers/make-state.js';

const safeActionArb = fc.constantFrom('fold', 'call', 'check');

/**
 * Apply one action, picking the first legal one given the preference:
 * - 'fold' always folds.
 * - Otherwise: call if there's something to call, else check.
 *
 * This guarantees no illegal-action explosions in the property generator,
 * so the property check is about state invariants, not action validation.
 */
function safeStep(state: GameState, pref: 'fold' | 'call' | 'check'): GameState {
  const seat = state.toActSeat;
  const player = state.seats[seat]!;
  const toCall = state.currentBet - player.committedThisRound;
  let action: 'fold' | 'call' | 'check';
  if (pref === 'fold') {
    action = 'fold';
  } else if (toCall > 0) {
    action = 'call';
  } else {
    action = 'check';
  }
  const next = applyAction(state, seat, { type: action });
  return advanceTurn(next);
}

describe('Property: pot conservation', () => {
  it('total pot amount equals sum of all totalCommitted', () => {
    fc.assert(
      fc.property(
        fc.array(safeActionArb, { minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 12 }),
        (actions, seedString) => {
          let s = makeState({ stacks: [1000, 1000, 1000] });
          s = startHand(s, 'h', 0);
          s = postBlinds(s);
          s = dealHoleCards(s, new SeedableRNG(seedString));

          for (const action of actions) {
            if (s.phase === GamePhase.HandComplete) break;
            if (s.phase === GamePhase.Showdown) break;
            if (s.toActSeat < 0) break;
            try {
              s = safeStep(s, action);
            } catch {
              break;
            }
          }

          const pots = computePots(s.seats);
          const potTotal = pots.reduce((sum, p) => sum + p.amount, 0);
          const committedTotal = s.seats.reduce((sum, p) => sum + p.totalCommitted, 0);
          return potTotal === committedTotal;
        },
      ),
      { numRuns: 200 },
    );
  });
});
