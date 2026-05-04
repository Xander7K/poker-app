import { describe, it, expect } from 'vitest';

import { computePots } from '../../src/fsm/pots.js';
import { type PlayerState, PlayerStatus } from '../../src/types/player.js';

function p(
  id: string,
  totalCommitted: number,
  status: PlayerStatus = PlayerStatus.Active,
  seat = 0,
): PlayerState {
  return {
    id,
    seat,
    name: id.toUpperCase(),
    stack: 0,
    holeCards: [],
    status,
    totalCommitted,
    committedThisRound: 0,
  };
}

describe('computePots', () => {
  it('no contributors → single empty pot', () => {
    expect(computePots([p('a', 0), p('b', 0)])).toEqual([{ amount: 0, eligiblePlayerIds: [] }]);
  });

  it('all equal commitments → single pot', () => {
    const pots = computePots([p('a', 100), p('b', 100), p('c', 100)]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligiblePlayerIds).toEqual(['a', 'b', 'c']);
  });

  it('one all-in below others → main pot + side pot', () => {
    // a is all-in at 100, b and c at 200.
    const pots = computePots([p('a', 100), p('b', 200), p('c', 200)]);
    expect(pots).toHaveLength(2);
    // Main pot: 100 × 3 = 300, eligible = a, b, c.
    expect(pots[0]).toEqual({ amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] });
    // Side pot: (200-100) × 2 = 200, eligible = b, c.
    expect(pots[1]).toEqual({ amount: 200, eligiblePlayerIds: ['b', 'c'] });
  });

  it('three all-ins at distinct levels → 3 pots', () => {
    const pots = computePots([p('a', 50), p('b', 100), p('c', 200), p('d', 200)]);
    expect(pots).toHaveLength(3);
    // Main: 50×4 = 200.
    expect(pots[0]).toEqual({
      amount: 200,
      eligiblePlayerIds: ['a', 'b', 'c', 'd'],
    });
    // Side1: (100-50)×3 = 150.
    expect(pots[1]).toEqual({
      amount: 150,
      eligiblePlayerIds: ['b', 'c', 'd'],
    });
    // Side2: (200-100)×2 = 200.
    expect(pots[2]).toEqual({
      amount: 200,
      eligiblePlayerIds: ['c', 'd'],
    });
  });

  it('folded players contribute chips but are not eligible', () => {
    const pots = computePots([p('a', 100, PlayerStatus.Folded), p('b', 100), p('c', 100)]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligiblePlayerIds).toEqual(['b', 'c']); // a not eligible
  });

  it('folded short stack: their chips form main pot, side pot for the rest', () => {
    // a folded at 50, b and c go to showdown at 200.
    const pots = computePots([p('a', 50, PlayerStatus.Folded), p('b', 200), p('c', 200)]);
    // Main tier (0..50): 50×3 = 150, eligible = b, c (a folded).
    // Side (50..200): 150×2 = 300, eligible = b, c.
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 150, eligiblePlayerIds: ['b', 'c'] });
    expect(pots[1]).toEqual({ amount: 300, eligiblePlayerIds: ['b', 'c'] });
  });

  it('total amount across all pots = sum of all commitments', () => {
    const seats = [p('a', 73), p('b', 192), p('c', 300), p('d', 50)];
    const pots = computePots(seats);
    const totalPots = pots.reduce((s, x) => s + x.amount, 0);
    const totalCommitted = seats.reduce((s, x) => s + x.totalCommitted, 0);
    expect(totalPots).toBe(totalCommitted);
  });

  it('5 simultaneous all-ins at different levels', () => {
    const seats = [p('a', 10), p('b', 25), p('c', 50), p('d', 100), p('e', 200)];
    const pots = computePots(seats);
    expect(pots).toHaveLength(5);
    const total = pots.reduce((s, x) => s + x.amount, 0);
    expect(total).toBe(385);
  });
});
