import type { Action } from '../types/action.js';
import type { Card } from '../types/card.js';
import type { EvaluatedHand } from '../types/hand-rank.js';
import type { SeatIndex } from '../types/player.js';
import type { Pot } from '../types/pot.js';

/**
 * Single event in a hand. Discriminated by `type`.
 *
 * Every event carries `t` = ms-since-hand-start (0 at the first event).
 * Wall-clock timestamp is the responsibility of the caller (Phase 2 server),
 * not the engine. The engine only knows relative time via Clock.
 */
export type HandEvent =
  | {
      readonly type: 'handStart';
      readonly t: number;
      readonly handId: string;
      readonly buttonSeat: SeatIndex;
    }
  | {
      readonly type: 'postAnte';
      readonly t: number;
      readonly seat: SeatIndex;
      readonly amount: number;
    }
  | {
      readonly type: 'postBlind';
      readonly t: number;
      readonly seat: SeatIndex;
      readonly blind: 'sb' | 'bb';
      readonly amount: number;
    }
  | {
      readonly type: 'dealHoleCards';
      readonly t: number;
      readonly perSeat: ReadonlyArray<{
        readonly seat: SeatIndex;
        readonly cards: readonly Card[];
      }>;
    }
  | {
      readonly type: 'action';
      readonly t: number;
      readonly seat: SeatIndex;
      readonly action: Action;
    }
  | {
      readonly type: 'streetClose';
      readonly t: number;
      readonly closedStreet: 'preFlop' | 'flop' | 'turn' | 'river';
      readonly pots: readonly Pot[];
    }
  | {
      readonly type: 'dealFlop';
      readonly t: number;
      readonly burn: Card;
      readonly cards: readonly [Card, Card, Card];
    }
  | {
      readonly type: 'dealTurn';
      readonly t: number;
      readonly burn: Card;
      readonly card: Card;
    }
  | {
      readonly type: 'dealRiver';
      readonly t: number;
      readonly burn: Card;
      readonly card: Card;
    }
  | {
      readonly type: 'showdown';
      readonly t: number;
      readonly hands: ReadonlyArray<{
        readonly playerId: string;
        readonly seat: SeatIndex;
        readonly hand: EvaluatedHand;
      }>;
    }
  | {
      readonly type: 'potAwarded';
      readonly t: number;
      readonly potIndex: number;
      readonly amount: number;
      readonly winners: ReadonlyArray<{ readonly playerId: string; readonly amount: number }>;
    }
  | { readonly type: 'handComplete'; readonly t: number };

/**
 * A complete hand history. Self-contained and serializable.
 *
 * `rngSeed` is the seed string that, when fed to SeedableRNG, regenerates the
 * exact same shuffled deck and therefore the same dealt cards. With this and
 * the `events` list, the entire hand can be replayed deterministically.
 */
export interface HandHistory {
  readonly handId: string;
  /** Optional; engine doesn't know about tables. */
  readonly tableId?: string;
  /** Wall-clock at handStart, recorded externally. */
  readonly startedAtUnixMs: number;
  readonly buttonSeat: SeatIndex;
  readonly smallBlind: number;
  readonly bigBlind: number;
  readonly ante: number;
  readonly maxSeats: number;
  readonly players: ReadonlyArray<{
    readonly id: string;
    readonly seat: SeatIndex;
    readonly name: string;
    readonly startingStack: number;
  }>;
  readonly rngSeed: string;
  readonly events: readonly HandEvent[];
}
