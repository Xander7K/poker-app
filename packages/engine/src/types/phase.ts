export const GamePhase = {
  /** Hand has not started. Waiting for enough players or for explicit start. */
  WaitingForPlayers: 'waitingForPlayers',
  /** Cards being dealt; no actions accepted. */
  Dealing: 'dealing',
  PreFlop: 'preFlop',
  Flop: 'flop',
  Turn: 'turn',
  River: 'river',
  /** Cards being shown; pot being awarded. */
  Showdown: 'showdown',
  /** Hand is complete. GameState carries the result. */
  HandComplete: 'handComplete',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

/** Streets where players can act. */
export const BETTING_PHASES: readonly GamePhase[] = [
  GamePhase.PreFlop,
  GamePhase.Flop,
  GamePhase.Turn,
  GamePhase.River,
] as const;
