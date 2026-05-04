import { describe, it, expect } from 'vitest';

import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import { SHOWDOWN_FIXTURES } from '../helpers/fixtures.js';

const ev = new PokerSolverEvaluator();

describe('Showdown fixtures (regression)', () => {
  for (const fixture of SHOWDOWN_FIXTURES) {
    it(fixture.name, () => {
      const evaluatedHands = fixture.hands.map((h) =>
        ev.evaluate([...h.holeCards, ...fixture.board]),
      );
      const winnerIndices = ev.compareWinners(evaluatedHands);
      const winnerIds = winnerIndices
        .map((i) => fixture.hands[i]!.id)
        .slice()
        .sort();
      expect(winnerIds).toEqual([...fixture.expectedWinners].sort());
      if (fixture.expectedDescription) {
        const winnerHand = evaluatedHands[winnerIndices[0]!]!;
        expect(winnerHand.description.toLowerCase()).toContain(
          fixture.expectedDescription.toLowerCase(),
        );
      }
    });
  }
});
