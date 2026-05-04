import { applyAction } from '../../src/fsm/actions.js';
import { dealFlop, dealRiver, dealTurn } from '../../src/fsm/deal.js';
import { advanceTurn } from '../../src/fsm/transitions.js';
import type { Action } from '../../src/types/action.js';
import type { GameState } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';

/**
 * Apply a single action at the current toActSeat, then advance the turn.
 */
export function step(state: GameState, action: Action): GameState {
  const after = applyAction(state, state.toActSeat, action);
  return advanceTurn(after);
}

/**
 * Apply a sequence of actions, advancing turn between each.
 * After the last action, deals the next street's cards if applicable.
 */
export function steps(state: GameState, actions: readonly Action[]): GameState {
  let s = state;
  for (const action of actions) {
    s = step(s, action);
  }
  // If the previous step closed a street, deal the cards for the new phase.
  if (s.phase === GamePhase.Flop && s.board.length === 0) s = dealFlop(s);
  if (s.phase === GamePhase.Turn && s.board.length === 3) s = dealTurn(s);
  if (s.phase === GamePhase.River && s.board.length === 4) s = dealRiver(s);
  return s;
}
