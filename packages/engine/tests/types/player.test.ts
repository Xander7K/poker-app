import { describe, it, expect } from 'vitest';

import { emptySeat, PlayerStatus } from '../../src/types/player.js';

describe('PlayerState', () => {
  it('emptySeat produces a seat with status=empty and zeroed amounts', () => {
    const seat = emptySeat(3);
    expect(seat.seat).toBe(3);
    expect(seat.status).toBe(PlayerStatus.Empty);
    expect(seat.stack).toBe(0);
    expect(seat.totalCommitted).toBe(0);
    expect(seat.committedThisRound).toBe(0);
    expect(seat.holeCards).toEqual([]);
  });

  it('PlayerStatus enum has expected values', () => {
    expect(PlayerStatus.Active).toBe('active');
    expect(PlayerStatus.Folded).toBe('folded');
    expect(PlayerStatus.AllIn).toBe('allIn');
    expect(PlayerStatus.SittingOut).toBe('sittingOut');
    expect(PlayerStatus.Empty).toBe('empty');
  });
});
