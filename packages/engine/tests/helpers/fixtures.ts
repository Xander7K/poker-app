import type { Card } from '../../src/types/card.js';

export interface ShowdownFixture {
  readonly name: string;
  readonly board: readonly Card[];
  readonly hands: ReadonlyArray<{
    readonly id: string;
    readonly holeCards: readonly [Card, Card];
  }>;
  /** Player ids of the winners (sorted compared as set in tests). */
  readonly expectedWinners: readonly string[];
  /** Optional: lowercase substring expected in the winner's description. */
  readonly expectedDescription?: string;
}

/**
 * Canonical showdown fixtures. Each one tests a specific evaluator scenario.
 * If the evaluator implementation changes (e.g., we swap pokersolver for
 * phevaluator), these fixtures must continue to produce the same winners.
 *
 * `expectedDescription` matches pokersolver's actual format (e.g. "Full House,
 * A's over 5's" → 'a's over'). Where description format is implementation-
 * dependent, we omit it and only check the winners.
 */
export const SHOWDOWN_FIXTURES: readonly ShowdownFixture[] = [
  {
    name: 'set over set: aces full > kings full',
    board: ['Ah', 'Kh', '5s', '5d', '2c'] as Card[],
    hands: [
      { id: 'AA', holeCards: ['Ad', 'As'] },
      { id: 'KK', holeCards: ['Kc', 'Ks'] },
    ],
    expectedWinners: ['AA'],
    expectedDescription: 'full house',
  },
  {
    name: 'flush over straight',
    board: ['Th', '9h', '8h', '7c', '6d'] as Card[],
    hands: [
      { id: 'flush', holeCards: ['Ah', '2h'] },
      { id: 'straight', holeCards: ['5s', 'Js'] },
    ],
    expectedWinners: ['flush'],
    expectedDescription: 'flush',
  },
  {
    name: 'wheel straight (A-2-3-4-5)',
    board: ['As', '2c', '3d', '4h', 'Kd'] as Card[],
    hands: [
      { id: 'wheel', holeCards: ['5s', '7c'] },
      { id: 'pairAces', holeCards: ['Ah', 'Td'] },
    ],
    expectedWinners: ['wheel'],
  },
  {
    name: 'broadway straight beats pair',
    // Note: the second player has a pair of twos, not a wheel (no 4 on board).
    board: ['Ts', 'Jc', 'Qd', '5h', '2c'] as Card[],
    hands: [
      { id: 'broadway', holeCards: ['Ah', 'Kd'] },
      { id: 'pair2s', holeCards: ['2s', '3c'] },
    ],
    expectedWinners: ['broadway'],
  },
  {
    name: 'full house over flush',
    board: ['Ah', 'As', '7h', '7c', '2d'] as Card[],
    hands: [
      { id: 'fh', holeCards: ['Ac', 'Td'] }, // aces full of sevens
      { id: 'fl', holeCards: ['Kh', '5h'] }, // ace-high flush
    ],
    expectedWinners: ['fh'],
  },
  {
    name: 'quads over full house',
    board: ['Ah', 'Ad', 'Ac', '7s', '7h'] as Card[],
    hands: [
      { id: 'quads', holeCards: ['As', '2c'] }, // four aces
      { id: 'fh', holeCards: ['7c', '7d'] }, // sevens full of aces
    ],
    expectedWinners: ['quads'],
  },
  {
    name: 'straight flush beats trips',
    // Note: second player has trip 10s (board has Th, plus their TsTd).
    board: ['7h', '8h', '9h', 'Th', '2c'] as Card[],
    hands: [
      { id: 'sf', holeCards: ['6h', 'Jh'] }, // J-high straight flush
      { id: 'tripsT', holeCards: ['Ts', 'Td'] }, // three tens
    ],
    expectedWinners: ['sf'],
  },
  {
    name: 'split: same two pair on board, kicker plays',
    board: ['Ah', 'Ad', 'Kh', 'Ks', '2c'] as Card[],
    hands: [
      { id: 'q', holeCards: ['Qs', 'Jc'] }, // AAKK with Q kicker
      { id: 'j', holeCards: ['Jh', '4d'] }, // AAKK with J kicker
    ],
    expectedWinners: ['q'],
  },
  {
    name: 'chop: identical hands play board',
    board: ['Ah', 'Kh', 'Qh', 'Jh', 'Th'] as Card[], // royal flush on board
    hands: [
      { id: 'a', holeCards: ['2c', '3d'] },
      { id: 'b', holeCards: ['4s', '5h'] },
    ],
    expectedWinners: ['a', 'b'],
  },
  {
    name: 'three-way split',
    board: ['Ah', 'Kh', 'Qh', 'Jh', 'Th'] as Card[],
    hands: [
      { id: 'a', holeCards: ['2c', '3d'] },
      { id: 'b', holeCards: ['4s', '5h'] },
      { id: 'c', holeCards: ['6c', '8d'] },
    ],
    expectedWinners: ['a', 'b', 'c'],
  },
  {
    name: 'counterfeited pocket pair: pp loses to bigger kicker on board two pair',
    // Board AAKK2: pp77 plays AAKK7, akKicker plays AAKKQ. Q > 7 kicker.
    board: ['Ah', 'Ad', 'Kh', 'Kd', '2c'] as Card[],
    hands: [
      { id: 'pp77', holeCards: ['7s', '7c'] },
      { id: 'akKicker', holeCards: ['Qs', '3d'] },
    ],
    expectedWinners: ['akKicker'],
  },
];
