import { describe, it, expect } from 'vitest';

import { postBlinds } from '../../src/fsm/blinds.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { GamePhase } from '../../src/types/phase.js';
import { PlayerStatus } from '../../src/types/player.js';
import { makeState } from '../helpers/make-state.js';

describe('postBlinds', () => {
  it('debits SB and BB from the right seats (6-max, button=0)', () => {
    const s = postBlinds(
      startHand(makeState({ stacks: [1000, 1000, 1000, 1000, 1000, 1000] }), 'h', 0),
    );
    expect(s.seats[1]!.stack).toBe(995); // SB
    expect(s.seats[2]!.stack).toBe(990); // BB
    expect(s.seats[1]!.committedThisRound).toBe(5);
    expect(s.seats[2]!.committedThisRound).toBe(10);
  });

  it('creates a single initial pot equal to SB + BB', () => {
    const s = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    expect(s.pots).toHaveLength(1);
    expect(s.pots[0]!.amount).toBe(15);
  });

  it('sets currentBet = BB', () => {
    const s = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    expect(s.currentBet).toBe(10);
  });

  it('marks BB as last aggressor (implicit raiser preflop)', () => {
    const s = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    expect(s.lastAggressorSeat).toBe(2);
  });

  it('heads-up: button posts SB, other posts BB', () => {
    const s = postBlinds(startHand(makeState({ stacks: [1000, 1000] }), 'h', 0));
    expect(s.seats[0]!.committedThisRound).toBe(5); // SB on button
    expect(s.seats[1]!.committedThisRound).toBe(10); // BB
  });

  it('player with less than blind goes all-in', () => {
    // Seat 1 has only 3 chips, can't cover SB=5.
    const s0 = makeState({ stacks: [1000, 3, 1000], buttonSeat: 0 });
    const s = postBlinds(startHand(s0, 'h', 0));
    expect(s.seats[1]!.stack).toBe(0);
    expect(s.seats[1]!.committedThisRound).toBe(3);
    expect(s.seats[1]!.status).toBe(PlayerStatus.AllIn);
  });

  it('antes are debited from every dealt-in player', () => {
    const s = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000], ante: 1 }), 'h', 0));
    expect(s.seats[0]!.committedThisRound).toBe(1); // ante only
    expect(s.seats[1]!.committedThisRound).toBe(6); // ante + SB
    expect(s.seats[2]!.committedThisRound).toBe(11); // ante + BB
    expect(s.pots[0]!.amount).toBe(18); // 1+1+1 + 5 + 10
  });

  it('phase becomes PreFlop after posting', () => {
    const s = postBlinds(startHand(makeState({ stacks: [1000, 1000, 1000] }), 'h', 0));
    expect(s.phase).toBe(GamePhase.PreFlop);
  });

  it('does not mutate the input state', () => {
    const s0 = startHand(makeState({ stacks: [1000, 1000] }), 'h', 0);
    const snapshot = JSON.stringify(s0);
    postBlinds(s0);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
});
