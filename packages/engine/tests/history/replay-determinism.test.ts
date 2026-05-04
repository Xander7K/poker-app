import { describe, it, expect } from 'vitest';

import { FakeClock } from '../../src/clock.js';
import { PokerSolverEvaluator } from '../../src/evaluator/pokersolver-evaluator.js';
import { applyAction } from '../../src/fsm/actions.js';
import { postBlinds } from '../../src/fsm/blinds.js';
import { dealFlop, dealHoleCards, dealRiver, dealTurn } from '../../src/fsm/deal.js';
import { bigBlindSeat, smallBlindSeat } from '../../src/fsm/positions.js';
import { resolveShowdown } from '../../src/fsm/showdown.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { advanceTurn } from '../../src/fsm/transitions.js';
import type { HandHistory } from '../../src/history/events.js';
import { HandRecorder } from '../../src/history/recorder.js';
import { replayHand } from '../../src/history/replay.js';
import { SeedableRNG } from '../../src/rng/seedable-rng.js';
import type { Action } from '../../src/types/action.js';
import type { GameState } from '../../src/types/game-state.js';
import { GamePhase } from '../../src/types/phase.js';
import { makeState } from '../helpers/make-state.js';

const ev = new PokerSolverEvaluator();

interface PlayAndRecordOptions {
  readonly stacks: readonly number[];
  readonly buttonSeat?: number;
  readonly seed: string;
  readonly actions: readonly Action[];
}

interface PlayResult {
  readonly finalState: GameState;
  readonly history: HandHistory;
}

/**
 * Plays a hand applying actions one-by-one, dealing cards between streets,
 * and records every event. Returns both the final GameState and the
 * recorded HandHistory so a test can replay and compare.
 */
function playAndRecord(opts: PlayAndRecordOptions): PlayResult {
  const clock = new FakeClock(0);
  const recorder = new HandRecorder(clock, opts.seed);

  let s = makeState({ stacks: opts.stacks, buttonSeat: opts.buttonSeat ?? 0 });
  s = startHand(s, 'h-replay', s.buttonSeat);
  recorder.start(s);

  const sb = smallBlindSeat(s);
  const bb = bigBlindSeat(s);
  s = postBlinds(s);
  recorder.recordBlind(sb, 'sb', s.config.smallBlind);
  recorder.recordBlind(bb, 'bb', s.config.bigBlind);

  s = dealHoleCards(s, new SeedableRNG(opts.seed));
  recorder.recordHoleCards(
    s.seats
      .filter((p) => p.holeCards.length > 0)
      .map((p) => ({ seat: p.seat, cards: p.holeCards })),
  );

  for (const action of opts.actions) {
    if (s.phase === GamePhase.HandComplete) break;
    if (s.toActSeat < 0) break;
    const seat = s.toActSeat;
    s = applyAction(s, seat, action);
    recorder.recordAction(seat, action);
    s = advanceTurn(s);
    clock.advance(50);

    if (s.phase === GamePhase.Flop && s.board.length === 0) s = dealFlop(s);
    else if (s.phase === GamePhase.Turn && s.board.length === 3) s = dealTurn(s);
    else if (s.phase === GamePhase.River && s.board.length === 4) s = dealRiver(s);
  }

  if (s.phase === GamePhase.Showdown) {
    s = resolveShowdown(s, ev);
  }
  if (s.awards) {
    for (const award of s.awards) {
      recorder.recordPotAwarded(award.potIndex, award.amount, award.winners);
    }
  }
  recorder.recordHandComplete();

  return { finalState: s, history: recorder.toHistory() };
}

describe('replayHand: determinism', () => {
  it('same seed and same actions produces identical final state', () => {
    const result = playAndRecord({
      stacks: [1000, 1000],
      seed: 'replay-test-1',
      actions: [
        { type: 'call' },
        { type: 'check' }, // preflop
        { type: 'check' },
        { type: 'check' }, // flop
        { type: 'check' },
        { type: 'check' }, // turn
        { type: 'check' },
        { type: 'check' }, // river
      ],
    });
    const replay = replayHand(result.history);
    expect(replay.matchedRecordedEvents).toBe(true);
    expect(replay.mismatches).toEqual([]);

    for (let i = 0; i < result.finalState.seats.length; i++) {
      expect(replay.finalState.seats[i]!.stack).toBe(result.finalState.seats[i]!.stack);
    }
  });

  it('reproduces hole cards exactly', () => {
    const result = playAndRecord({
      stacks: [1000, 1000, 1000],
      seed: 'cards-deterministic',
      actions: [
        { type: 'fold' }, // UTG folds
        { type: 'fold' }, // SB folds; BB wins
      ],
    });
    const replay = replayHand(result.history);
    expect(replay.mismatches).toEqual([]);
    for (let i = 0; i < 3; i++) {
      expect(replay.finalState.seats[i]!.holeCards).toEqual(result.finalState.seats[i]!.holeCards);
    }
  });

  it('different seed produces different cards (sanity check)', () => {
    const a = playAndRecord({
      stacks: [1000, 1000],
      seed: 'seed-A',
      actions: [
        { type: 'call' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
      ],
    });
    const b = playAndRecord({
      stacks: [1000, 1000],
      seed: 'seed-B',
      actions: [
        { type: 'call' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
      ],
    });
    expect(a.finalState.seats[0]!.holeCards).not.toEqual(b.finalState.seats[0]!.holeCards);
  });

  it('replays a hand with raises and folds', () => {
    const result = playAndRecord({
      stacks: [1000, 1000, 1000],
      seed: 'raise-fold',
      actions: [
        { type: 'raise', amount: 30 }, // UTG raises
        { type: 'call' }, // SB calls
        { type: 'fold' }, // BB folds
        // Flop:
        { type: 'check' }, // SB checks
        { type: 'bet', amount: 50 }, // UTG bets
        { type: 'fold' }, // SB folds
      ],
    });
    expect(result.finalState.phase).toBe(GamePhase.HandComplete);

    const replay = replayHand(result.history);
    expect(replay.mismatches).toEqual([]);
    for (let i = 0; i < 3; i++) {
      expect(replay.finalState.seats[i]!.stack).toBe(result.finalState.seats[i]!.stack);
    }
  });
});

describe('replayHand: mismatch detection', () => {
  it('reports mismatch if hole cards in history do not match replay', () => {
    const result = playAndRecord({
      stacks: [1000, 1000],
      seed: 'mismatch-test',
      actions: [
        { type: 'call' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
        { type: 'check' },
      ],
    });
    // Tamper with the recorded hole cards.
    const tamperedEvents = result.history.events.map((e) => {
      if (e.type === 'dealHoleCards') {
        return {
          ...e,
          perSeat: e.perSeat.map((ps) => ({ ...ps, cards: ['As', 'Ks'] as const })),
        };
      }
      return e;
    });
    const tamperedHistory = { ...result.history, events: tamperedEvents } as HandHistory;
    const replay = replayHand(tamperedHistory);
    expect(replay.matchedRecordedEvents).toBe(false);
    expect(replay.mismatches.some((m) => m.includes('Hole cards mismatch'))).toBe(true);
  });
});
