import { describe, it, expect } from 'vitest';

import type { HandEvent, HandHistory } from '../../src/history/events.js';

describe('HandEvent shape', () => {
  it('handStart event carries handId and buttonSeat', () => {
    const e: HandEvent = { type: 'handStart', t: 0, handId: 'h1', buttonSeat: 0 };
    expect(e.type).toBe('handStart');
  });

  it('discriminates by type field', () => {
    const events: HandEvent[] = [
      { type: 'postBlind', t: 1, seat: 1, blind: 'sb', amount: 5 },
      { type: 'action', t: 2, seat: 0, action: { type: 'fold' } },
      { type: 'showdown', t: 100, hands: [] },
    ];
    for (const e of events) {
      expect(typeof e.type).toBe('string');
      expect(typeof e.t).toBe('number');
    }
  });
});

describe('HandHistory shape', () => {
  it('is serializable to JSON and back', () => {
    const h: HandHistory = {
      handId: 'h1',
      startedAtUnixMs: 1714000000000,
      buttonSeat: 0,
      smallBlind: 5,
      bigBlind: 10,
      ante: 0,
      maxSeats: 6,
      players: [
        { id: 'p0', seat: 0, name: 'P0', startingStack: 1000 },
        { id: 'p1', seat: 1, name: 'P1', startingStack: 1000 },
      ],
      rngSeed: 'test-seed',
      events: [{ type: 'handStart', t: 0, handId: 'h1', buttonSeat: 0 }],
    };
    const round = JSON.parse(JSON.stringify(h)) as HandHistory;
    expect(round).toEqual(h);
  });
});
