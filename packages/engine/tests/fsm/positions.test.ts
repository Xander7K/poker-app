import { describe, it, expect } from 'vitest';

import {
  bigBlindSeat,
  firstToActPostflop,
  firstToActPreflop,
  isDealtIn,
  smallBlindSeat,
} from '../../src/fsm/positions.js';
import type { GameState } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';
import { type PlayerState, PlayerStatus } from '../../src/types/player.js';

function makePlayer(
  seat: number,
  status: PlayerStatus = PlayerStatus.Active,
  stack = 1000,
): PlayerState {
  return {
    id: `p${seat}`,
    seat,
    name: `P${seat}`,
    stack,
    holeCards: [],
    status,
    totalCommitted: 0,
    committedThisRound: 0,
  };
}

function makeState(seatStatuses: PlayerStatus[], buttonSeat: number): GameState {
  return {
    handId: 'h',
    config: {
      maxSeats: seatStatuses.length,
      smallBlind: 1,
      bigBlind: 2,
      ante: 0,
      minBuyIn: 0,
      maxBuyIn: 0,
    },
    phase: GamePhase.WaitingForPlayers,
    seats: seatStatuses.map((s, i) => makePlayer(i, s)),
    buttonSeat,
    deck: [],
    board: [],
    burned: [],
    pots: [],
    toActSeat: -1,
    currentBet: 0,
    lastRaiseSize: 0,
    lastAggressorSeat: -1,
    actedThisRound: [],
  };
}

describe('positions: 6-handed', () => {
  // 6 active seats, button at 0.
  const state = makeState(Array<PlayerStatus>(6).fill(PlayerStatus.Active), 0);

  it('SB is seat 1, BB is seat 2', () => {
    expect(smallBlindSeat(state)).toBe(1);
    expect(bigBlindSeat(state)).toBe(2);
  });

  it('first to act preflop is seat 3 (UTG)', () => {
    expect(firstToActPreflop(state)).toBe(3);
  });

  it('first to act postflop is SB (seat 1)', () => {
    expect(firstToActPostflop(state)).toBe(1);
  });
});

describe('positions: heads-up', () => {
  // 2 active seats. Button at 0.
  const state = makeState([PlayerStatus.Active, PlayerStatus.Active, PlayerStatus.Empty], 0);

  it('SB is the button (seat 0)', () => {
    expect(smallBlindSeat(state)).toBe(0);
  });

  it('BB is seat 1', () => {
    expect(bigBlindSeat(state)).toBe(1);
  });

  it('first to act preflop is the button (SB)', () => {
    expect(firstToActPreflop(state)).toBe(0);
  });

  it('first to act postflop is the BB', () => {
    expect(firstToActPostflop(state)).toBe(1);
  });
});

describe('positions: skip empty and sitting-out seats', () => {
  // Seats: 0=button, 1=empty, 2=sittingOut, 3=active, 4=active, 5=active.
  const state = makeState(
    [
      PlayerStatus.Active,
      PlayerStatus.Empty,
      PlayerStatus.SittingOut,
      PlayerStatus.Active,
      PlayerStatus.Active,
      PlayerStatus.Active,
    ],
    0,
  );

  it('SB is seat 3 (next dealt-in after button)', () => {
    expect(smallBlindSeat(state)).toBe(3);
  });

  it('BB is seat 4', () => {
    expect(bigBlindSeat(state)).toBe(4);
  });
});

describe('isDealtIn', () => {
  it('returns true for active with chips', () => {
    expect(isDealtIn(makePlayer(0, PlayerStatus.Active, 100))).toBe(true);
  });

  it('returns false for empty seat', () => {
    expect(isDealtIn(makePlayer(0, PlayerStatus.Empty))).toBe(false);
  });

  it('returns false for sitting-out', () => {
    expect(isDealtIn(makePlayer(0, PlayerStatus.SittingOut, 100))).toBe(false);
  });

  it('returns false for player with zero stack', () => {
    expect(isDealtIn(makePlayer(0, PlayerStatus.Active, 0))).toBe(false);
  });
});
