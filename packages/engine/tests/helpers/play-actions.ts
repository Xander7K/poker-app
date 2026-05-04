import { applyAction } from '../../src/fsm/actions.js';
import type { Action } from '../../src/types/action.js';
import type { GameState } from '../../src/types/game-state.js';

/**
 * Test helper: applies a sequence of actions, automatically using `state.toActSeat`
 * for each. Throws if a step has no toActSeat set.
 *
 * Note: this helper does NOT advance the turn between actions. It's only useful
 * for testing single-action behavior. Use `step` / `steps` (added in step 20)
 * for full streets that handle turn advance.
 */
export function applyActionsAtCurrentSeat(state: GameState, actions: readonly Action[]): GameState {
  let s = state;
  for (const action of actions) {
    if (s.toActSeat < 0) throw new Error('No seat to act');
    s = applyAction(s, s.toActSeat, action);
  }
  return s;
}
