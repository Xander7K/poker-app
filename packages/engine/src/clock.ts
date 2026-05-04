/**
 * Time abstraction. The engine never calls `Date.now()` or `new Date()`
 * directly outside this file. All time flows through this interface.
 *
 * Production uses SystemClock. Tests use FakeClock for determinism.
 */
export interface Clock {
  /** Current Unix epoch in milliseconds. */
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class FakeClock implements Clock {
  constructor(private currentMs: number) {}
  now(): number {
    return this.currentMs;
  }
  advance(ms: number): void {
    this.currentMs += ms;
  }
  set(ms: number): void {
    this.currentMs = ms;
  }
}
