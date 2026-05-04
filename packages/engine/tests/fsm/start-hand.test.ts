import { describe, it, expect } from 'vitest';

import { HandStartError } from '../../src/errors.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { GamePhase } from '../../src/types/phase.js';
import { makeState } from '../helpers/make-state.js';

describe('startHand', () => {
  it('transitions phase to Dealing', () => {
    const s0 = makeState({ stacks: [1000, 1000, 1000] });
    const s1 = startHand(s0, 'h-1', 0);
    expect(s1.phase).toBe(GamePhase.Dealing);
  });

  it('sets handId and buttonSeat', () => {
    const s0 = makeState({ stacks: [1000, 1000] });
    const s1 = startHand(s0, 'hello-hand', 1);
    expect(s1.handId).toBe('hello-hand');
    expect(s1.buttonSeat).toBe(1);
  });

  it('resets per-hand player fields', () => {
    const s0 = makeState({ stacks: [1000, 1000] });
    const s1 = startHand(s0, 'h-1', 0);
    for (const seat of s1.seats) {
      expect(seat.holeCards).toEqual([]);
      expect(seat.totalCommitted).toBe(0);
      expect(seat.committedThisRound).toBe(0);
    }
  });

  it('clears showdown and awards', () => {
    const s0 = {
      ...makeState({ stacks: [1000, 1000] }),
      showdown: [],
      awards: [],
    };
    const s1 = startHand(s0, 'h-1', 0);
    expect(s1.showdown).toBeUndefined();
    expect(s1.awards).toBeUndefined();
  });

  it('throws when only one dealt-in player', () => {
    const s0 = makeState({ stacks: [1000, 0, 0] });
    expect(() => startHand(s0, 'h', 0)).toThrow(HandStartError);
  });

  it('does not mutate the input state', () => {
    const s0 = makeState({ stacks: [1000, 1000] });
    const snapshot = JSON.stringify(s0);
    startHand(s0, 'h-1', 0);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
});
