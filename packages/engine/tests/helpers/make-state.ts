import type { GameState, TableConfig } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';
import {
  type PlayerState,
  PlayerStatus,
  type SeatIndex,
  emptySeat,
} from '../../src/types/player.js';

export interface MakeStateOptions {
  /** Stacks for each seat. Length determines maxSeats. Use 0 for empty seats. */
  stacks: readonly number[];
  buttonSeat?: SeatIndex;
  smallBlind?: number;
  bigBlind?: number;
  ante?: number;
  handId?: string;
  phase?: GameState['phase'];
}

/**
 * Test helper. Builds a GameState with the given stacks. Each non-zero stack
 * becomes an Active player named "P{seat}". Zero stacks become empty seats.
 *
 * The state has phase='waitingForPlayers' by default; call startHand on the
 * result if you want a hand in progress.
 */
export function makeState(opts: MakeStateOptions): GameState {
  const { stacks, buttonSeat = 0, smallBlind = 5, bigBlind = 10, ante = 0 } = opts;
  const config: TableConfig = {
    maxSeats: stacks.length,
    smallBlind,
    bigBlind,
    ante,
    minBuyIn: 0,
    maxBuyIn: 0,
  };
  const seats: PlayerState[] = stacks.map((stack, i) => {
    if (stack === 0) return emptySeat(i);
    return {
      id: `p${i}`,
      seat: i,
      name: `P${i}`,
      stack,
      holeCards: [],
      status: PlayerStatus.Active,
      totalCommitted: 0,
      committedThisRound: 0,
    };
  });
  return {
    handId: opts.handId ?? 'test-hand',
    config,
    phase: opts.phase ?? GamePhase.WaitingForPlayers,
    seats,
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
