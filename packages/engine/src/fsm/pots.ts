import { type PlayerState, PlayerStatus } from '../types/player.js';
import type { Pot } from '../types/pot.js';

/**
 * Computes pots (main + side) from the current `totalCommitted` of every
 * player who put chips in the hand. Algorithm:
 *
 * 1. Collect every distinct commitment level from non-empty players who put
 *    chips in (sort ascending). These are the "rings" of the pot.
 * 2. For each level, the layer between the previous level and this level is a
 *    pot. Its amount is (level - prevLevel) × (number of contributors who
 *    reached or exceeded this level).
 * 3. Eligibility: only players who reached or exceeded this level AND have
 *    not folded are eligible to win the pot at showdown.
 *
 * Folded players' chips still count toward the pot, but they're never
 * eligible to win. Returns at least one pot (possibly empty if no chips
 * committed). Pots with zero amount are filtered out.
 */
export function computePots(seats: readonly PlayerState[]): Pot[] {
  const contributors = seats.filter((p) => p.status !== PlayerStatus.Empty && p.totalCommitted > 0);
  if (contributors.length === 0) {
    return [{ amount: 0, eligiblePlayerIds: [] }];
  }

  // Distinct commitment levels in ascending order.
  const levels = Array.from(new Set(contributors.map((p) => p.totalCommitted))).sort(
    (a, b) => a - b,
  );

  const pots: Pot[] = [];
  let prevLevel = 0;
  for (const level of levels) {
    const eligibleSeats = contributors.filter((p) => p.totalCommitted >= level);
    const eligibleNonFolded = eligibleSeats.filter((p) => p.status !== PlayerStatus.Folded);
    const layerAmount = (level - prevLevel) * eligibleSeats.length;
    if (layerAmount > 0) {
      pots.push({
        amount: layerAmount,
        eligiblePlayerIds: eligibleNonFolded.map((p) => p.id),
      });
    }
    prevLevel = level;
  }

  return pots.length === 0 ? [{ amount: 0, eligiblePlayerIds: [] }] : pots;
}
