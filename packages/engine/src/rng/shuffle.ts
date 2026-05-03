import type { RNG } from './rng.js';

/**
 * Fisher-Yates shuffle. Returns a NEW array; does not mutate the input.
 *
 * Iterates from the last index down to 1, swapping each element with a
 * randomly chosen earlier (or same) index. This is the unbiased shuffle —
 * every permutation is equally likely if the RNG is uniform.
 */
export function shuffle<T>(array: readonly T[], rng: RNG): T[] {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.randomInt(i + 1);
    // i and j are valid indices: i is the loop counter and j ∈ [0, i+1).
    // The `as T` casts away `T | undefined` from noUncheckedIndexedAccess.
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return result;
}
