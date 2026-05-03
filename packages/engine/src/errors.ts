/**
 * Base class for all engine errors. Allows callers to catch with
 * `instanceof EngineError` and also distinguish kind via `kind` field.
 */
export class EngineError extends Error {
  public readonly kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.name = 'EngineError';
    this.kind = kind;
  }
}

/** Caller tried to apply an action that is not legal in the current state. */
export class IllegalActionError extends EngineError {
  constructor(message: string) {
    super('illegalAction', message);
    this.name = 'IllegalActionError';
  }
}

/** A bet/raise amount violates min-raise, all-in, or stack rules. */
export class IllegalBetError extends EngineError {
  constructor(message: string) {
    super('illegalBet', message);
    this.name = 'IllegalBetError';
  }
}

/** A precondition for starting a hand is not met (e.g., < 2 active seats). */
export class HandStartError extends EngineError {
  constructor(message: string) {
    super('handStart', message);
    this.name = 'HandStartError';
  }
}

/**
 * Caller tried to act when it wasn't their turn, or when phase doesn't
 * accept actions.
 */
export class WrongTurnError extends EngineError {
  constructor(message: string) {
    super('wrongTurn', message);
    this.name = 'WrongTurnError';
  }
}

/**
 * Engine reached a state that should be unreachable. Indicates a bug in the
 * engine, not in caller code. If you ever see this in production, write a
 * regression test.
 */
export class InvariantViolatedError extends EngineError {
  constructor(message: string) {
    super('invariantViolated', `Engine invariant violated: ${message}`);
    this.name = 'InvariantViolatedError';
  }
}
