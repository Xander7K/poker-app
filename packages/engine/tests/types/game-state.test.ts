import { describe, it, expect } from 'vitest';

import {
  EngineError,
  HandStartError,
  IllegalActionError,
  IllegalBetError,
  InvariantViolatedError,
  WrongTurnError,
} from '../../src/errors.js';

describe('Engine errors', () => {
  it('all extend EngineError and expose kind', () => {
    const errors: EngineError[] = [
      new IllegalActionError('x'),
      new IllegalBetError('x'),
      new WrongTurnError('x'),
      new HandStartError('x'),
      new InvariantViolatedError('x'),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(EngineError);
      expect(err).toBeInstanceOf(Error);
      expect(typeof err.kind).toBe('string');
      expect(err.kind.length).toBeGreaterThan(0);
    }
  });

  it('IllegalActionError has kind=illegalAction', () => {
    expect(new IllegalActionError('x').kind).toBe('illegalAction');
  });

  it('InvariantViolatedError prepends explanatory prefix', () => {
    const err = new InvariantViolatedError('this should not happen');
    expect(err.message).toContain('Engine invariant violated');
  });
});
