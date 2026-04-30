import { z } from 'zod';

/**
 * Player identifier (UUID v4 in production).
 */
export const UserIdSchema = z.string().uuid();
export type UserId = z.infer<typeof UserIdSchema>;

/**
 * Table seat positions in a 6-max game.
 * 0 = button (dealer), 1 = SB, 2 = BB, 3 = UTG, 4 = HJ, 5 = CO.
 * For < 6 players, positions are still 0..N-1 with the same semantics.
 */
export const SeatIndexSchema = z.number().int().min(0).max(8);
export type SeatIndex = z.infer<typeof SeatIndexSchema>;

/**
 * Phases of a single hand.
 */
export const PhaseSchema = z.enum([
  'waiting',
  'dealing',
  'preflop',
  'flop',
  'turn',
  'river',
  'showdown',
  'complete',
]);
export type Phase = z.infer<typeof PhaseSchema>;

/**
 * Chip amount. Always integer (avoid floating-point issues).
 * 1 chip = smallest unit. Display layer can show as "decimals" if desired.
 */
export const ChipsSchema = z.number().int().nonnegative();
export type Chips = z.infer<typeof ChipsSchema>;
