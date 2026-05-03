/**
 * A pot to be awarded at showdown.
 *
 * The engine always returns pots as a list. When there are no all-ins, the list
 * has length 1 (the main pot). With one all-in covered by others, length 2.
 * With N simultaneous all-ins at distinct stack levels, length N+1.
 *
 * `eligiblePlayerIds` is the set of players who contributed to this pot AND
 * have not folded. They compete for it at showdown.
 */
export interface Pot {
  readonly amount: number;
  readonly eligiblePlayerIds: readonly string[];
}
