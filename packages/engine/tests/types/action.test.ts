import { describe, it, expect } from 'vitest';

import { type Action, ActionType } from '../../src/types/action.js';
import { HandRank } from '../../src/types/hand-rank.js';
import { GamePhase, BETTING_PHASES } from '../../src/types/phase.js';

describe('Action', () => {
  it('discriminates by type field', () => {
    const a: Action = { type: 'bet', amount: 100 };
    if (a.type === 'bet') {
      expect(a.amount).toBe(100);
    }
  });

  it('ActionType enum matches Action union', () => {
    expect(ActionType.Fold).toBe('fold');
    expect(ActionType.Raise).toBe('raise');
    expect(ActionType.AllIn).toBe('allIn');
  });
});

describe('GamePhase', () => {
  it('BETTING_PHASES contains exactly the four streets', () => {
    expect(BETTING_PHASES).toEqual([
      GamePhase.PreFlop,
      GamePhase.Flop,
      GamePhase.Turn,
      GamePhase.River,
    ]);
  });
});

describe('HandRank', () => {
  it('orders categories from HighCard (0) to StraightFlush (8)', () => {
    expect(HandRank.HighCard).toBe(0);
    expect(HandRank.StraightFlush).toBe(8);
    expect(HandRank.Flush).toBeGreaterThan(HandRank.Straight);
    expect(HandRank.FullHouse).toBeGreaterThan(HandRank.Flush);
  });
});
