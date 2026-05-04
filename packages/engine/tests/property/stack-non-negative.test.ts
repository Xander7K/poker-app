import fc from 'fast-check';
import { describe, it } from 'vitest';

import { applyAction } from '../../src/fsm/actions.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealHoleCards } from '../../src/fsm/deal.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { advanceTurn } from '../../src/fsm/transitions.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import type { GameState } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';
import { makeState } from '../helpers/make-state.js';

function safeStep(state: GameState, pref: 'fold' | 'call' | 'check'): GameState {
  const seat = state.toActSeat;
  const player = state.seats[seat]!;
  const toCall = state.currentBet - player.committedThisRound;
  let action: 'fold' | 'call' | 'check';
  if (pref === 'fold') action = 'fold';
  else if (toCall > 0) action = 'call';
  else action = 'check';
  return advanceTurn(applyAction(state, seat, { type: action }));
}

describe('Property: stack non-negative invariant', () => {
  it('no player ever ends with negative stack', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('fold', 'call', 'check'), { minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 12 }),
        (actions, seedString) => {
          let s = makeState({ stacks: [200, 500, 1000] });
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

          return s.seats.every((p) => p.stack >= 0);
        },
      ),
      { numRuns: 200 },
    );
  });
});
