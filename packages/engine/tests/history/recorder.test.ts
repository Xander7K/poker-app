import { describe, it, expect } from 'vitest';

import { FakeClock } from '../../src/clock.js';
import { startHand } from '../../src/fsm/start-hand.js';
import { HandRecorder } from '../../src/history/recorder.js';
import { makeState } from '../helpers/make-state.js';

describe('HandRecorder', () => {
  it('start emits handStart event at t=0', () => {
    const clock = new FakeClock(1000);
    const r = new HandRecorder(clock, 'seed-1');
    const s = startHand(makeState({ stacks: [1000, 1000] }), 'h', 0);
    r.start(s);
    const history = r.toHistory();
    expect(history.events).toHaveLength(1);
    expect(history.events[0]).toMatchObject({ type: 'handStart', t: 0, handId: 'h' });
  });

  it('records elapsed time relative to hand start', () => {
    const clock = new FakeClock(1000);
    const r = new HandRecorder(clock, 'seed-1');
    const s = startHand(makeState({ stacks: [1000, 1000] }), 'h', 0);
    r.start(s);
    clock.advance(500);
    r.recordBlind(0, 'sb', 5);
    clock.advance(200);
    r.recordBlind(1, 'bb', 10);
    const events = r.toHistory().events;
    expect(events[1]!.t).toBe(500);
    expect(events[2]!.t).toBe(700);
  });

  it('captures starting stacks at start time', () => {
    const r = new HandRecorder(new FakeClock(0), 'x');
    const s = startHand(makeState({ stacks: [800, 1200] }), 'h', 0);
    r.start(s);
    const history = r.toHistory();
    expect(history.players).toHaveLength(2);
    expect(history.players[0]!.startingStack).toBe(800);
    expect(history.players[1]!.startingStack).toBe(1200);
  });

  it('serializes to JSON and back without loss', () => {
    const r = new HandRecorder(new FakeClock(0), 'seed');
    const s = startHand(makeState({ stacks: [1000, 1000] }), 'h', 0);
    r.start(s);
    r.recordBlind(0, 'sb', 5);
    r.recordBlind(1, 'bb', 10);
    r.recordAction(0, { type: 'call' });
    r.recordHandComplete();
    const h = r.toHistory();
    const round: unknown = JSON.parse(JSON.stringify(h));
    expect(round).toEqual(h);
  });
});
