import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import { resolveShowdown } from '../../src/fsm/showdown.js';
import type { GameState } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';
import { PlayerStatus } from '../../src/types/player.js';

const ev = new PokerSolverEvaluator();

function showdownState(overrides: Partial<GameState>): GameState {
  return {
    handId: 'h',
    config: { maxSeats: 3, smallBlind: 5, bigBlind: 10, ante: 0, minBuyIn: 0, maxBuyIn: 0 },
    phase: GamePhase.Showdown,
    seats: [],
    buttonSeat: 0,
    deck: [],
    board: [],
    burned: [],
    pots: [],
    toActSeat: -1,
    currentBet: 0,
    lastRaiseSize: 0,
    lastAggressorSeat: -1,
    actedThisRound: [],
    ...overrides,
  };
}

describe('resolveShowdown', () => {
  it('awards single pot to the better hand', () => {
    const state = showdownState({
      seats: [
        {
          id: 'a',
          seat: 0,
          name: 'A',
          stack: 0,
          holeCards: ['Ah', 'Ad'],
          status: PlayerStatus.Active,
          totalCommitted: 100,
          committedThisRound: 0,
        },
        {
          id: 'b',
          seat: 1,
          name: 'B',
          stack: 0,
          holeCards: ['Kh', 'Kd'],
          status: PlayerStatus.Active,
          totalCommitted: 100,
          committedThisRound: 0,
        },
      ],
      board: ['2c', '3d', '7s', 'Th', 'Jc'],
      pots: [{ amount: 200, eligiblePlayerIds: ['a', 'b'] }],
    });
    const result = resolveShowdown(state, ev);
    expect(result.phase).toBe(GamePhase.HandComplete);
    expect(result.awards).toHaveLength(1);
    expect(result.awards![0]!.winners).toEqual([{ playerId: 'a', amount: 200 }]);
    expect(result.seats.find((p) => p.id === 'a')!.stack).toBe(200);
    expect(result.seats.find((p) => p.id === 'b')!.stack).toBe(0);
  });

  it('splits pot evenly when hands tie', () => {
    const state = showdownState({
      seats: [
        {
          id: 'a',
          seat: 0,
          name: 'A',
          stack: 0,
          holeCards: ['Ah', 'Kh'],
          status: PlayerStatus.Active,
          totalCommitted: 100,
          committedThisRound: 0,
        },
        {
          id: 'b',
          seat: 1,
          name: 'B',
          stack: 0,
          holeCards: ['Ad', 'Kd'],
          status: PlayerStatus.Active,
          totalCommitted: 100,
          committedThisRound: 0,
        },
      ],
      board: ['2c', '3d', '7s', 'Th', 'Jc'],
      pots: [{ amount: 200, eligiblePlayerIds: ['a', 'b'] }],
    });
    const result = resolveShowdown(state, ev);
    const aStack = result.seats.find((p) => p.id === 'a')!.stack;
    const bStack = result.seats.find((p) => p.id === 'b')!.stack;
    expect(aStack).toBe(100);
    expect(bStack).toBe(100);
  });

  it('odd chip in split goes to first seat after button', () => {
    const state = showdownState({
      buttonSeat: 0,
      seats: [
        {
          id: 'btn',
          seat: 0,
          name: 'BTN',
          stack: 0,
          holeCards: [],
          status: PlayerStatus.Empty,
          totalCommitted: 0,
          committedThisRound: 0,
        },
        {
          id: 'a',
          seat: 1,
          name: 'A',
          stack: 0,
          holeCards: ['Ah', 'Kh'],
          status: PlayerStatus.Active,
          totalCommitted: 50,
          committedThisRound: 0,
        },
        {
          id: 'b',
          seat: 2,
          name: 'B',
          stack: 0,
          holeCards: ['Ad', 'Kd'],
          status: PlayerStatus.Active,
          totalCommitted: 51,
          committedThisRound: 0,
        },
      ],
      board: ['2c', '3d', '7s', 'Th', 'Jc'],
      pots: [{ amount: 101, eligiblePlayerIds: ['a', 'b'] }],
    });
    const result = resolveShowdown(state, ev);
    const aStack = result.seats.find((p) => p.id === 'a')!.stack;
    const bStack = result.seats.find((p) => p.id === 'b')!.stack;
    // Player a is closer to button (distance 1), so gets the odd chip.
    expect(aStack).toBe(51);
    expect(bStack).toBe(50);
  });

  it('phase becomes HandComplete', () => {
    const state = showdownState({
      seats: [
        {
          id: 'a',
          seat: 0,
          name: 'A',
          stack: 0,
          holeCards: ['Ah', 'Ad'],
          status: PlayerStatus.Active,
          totalCommitted: 100,
          committedThisRound: 0,
        },
      ],
      board: ['2c', '3d', '7s', 'Th', 'Jc'],
      pots: [{ amount: 100, eligiblePlayerIds: ['a'] }],
    });
    const result = resolveShowdown(state, ev);
    expect(result.phase).toBe(GamePhase.HandComplete);
  });
});
