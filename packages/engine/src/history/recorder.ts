import type { Clock } from '../clock.js';
import { isDealtIn } from '../fsm/positions.js';
import type { Action } from '../types/action.js';
import type { Card } from '../types/card.js';
import type { GameState } from '../types/game-state.js';
import type { EvaluatedHand } from '../types/hand-rank.js';
import type { SeatIndex } from '../types/player.js';
import type { Pot } from '../types/pot.js';

import type { HandEvent, HandHistory } from './events.js';

/**
 * Accumulates events during a hand. After the hand is complete, call
 * `toHistory()` to produce a serializable HandHistory.
 *
 * The recorder is the only stateful object in the engine. It does not affect
 * GameState — it only observes events that the caller pushes into it.
 *
 * Pattern:
 *   const recorder = new HandRecorder(clock, seed);
 *   recorder.start(state);
 *   // ... apply game logic, record events ...
 *   const history = recorder.toHistory();
 */
export class HandRecorder {
  private events: HandEvent[] = [];
  private startMs = 0;
  private players: HandHistory['players'] = [];
  private startedAtUnixMs = 0;
  private buttonSeat: SeatIndex = -1;
  private smallBlind = 0;
  private bigBlind = 0;
  private ante = 0;
  private maxSeats = 0;
  private handId = '';

  constructor(
    private readonly clock: Clock,
    private readonly rngSeed: string,
  ) {}

  /** Records the start of the hand and snapshots starting stacks. */
  start(state: GameState): void {
    this.startMs = this.clock.now();
    this.startedAtUnixMs = this.startMs;
    this.handId = state.handId;
    this.buttonSeat = state.buttonSeat;
    this.smallBlind = state.config.smallBlind;
    this.bigBlind = state.config.bigBlind;
    this.ante = state.config.ante;
    this.maxSeats = state.config.maxSeats;
    this.players = state.seats.filter(isDealtIn).map((p) => ({
      id: p.id,
      seat: p.seat,
      name: p.name,
      startingStack: p.stack,
    }));
    this.push({
      type: 'handStart',
      t: 0,
      handId: state.handId,
      buttonSeat: state.buttonSeat,
    });
  }

  recordAnte(seat: SeatIndex, amount: number): void {
    this.push({ type: 'postAnte', t: this.elapsed(), seat, amount });
  }

  recordBlind(seat: SeatIndex, blind: 'sb' | 'bb', amount: number): void {
    this.push({ type: 'postBlind', t: this.elapsed(), seat, blind, amount });
  }

  recordHoleCards(perSeat: ReadonlyArray<{ seat: SeatIndex; cards: readonly Card[] }>): void {
    this.push({ type: 'dealHoleCards', t: this.elapsed(), perSeat });
  }

  recordAction(seat: SeatIndex, action: Action): void {
    this.push({ type: 'action', t: this.elapsed(), seat, action });
  }

  recordStreetClose(
    closedStreet: 'preFlop' | 'flop' | 'turn' | 'river',
    pots: readonly Pot[],
  ): void {
    this.push({ type: 'streetClose', t: this.elapsed(), closedStreet, pots });
  }

  recordFlop(burn: Card, cards: readonly [Card, Card, Card]): void {
    this.push({ type: 'dealFlop', t: this.elapsed(), burn, cards });
  }

  recordTurn(burn: Card, card: Card): void {
    this.push({ type: 'dealTurn', t: this.elapsed(), burn, card });
  }

  recordRiver(burn: Card, card: Card): void {
    this.push({ type: 'dealRiver', t: this.elapsed(), burn, card });
  }

  recordShowdown(
    hands: ReadonlyArray<{ playerId: string; seat: SeatIndex; hand: EvaluatedHand }>,
  ): void {
    this.push({ type: 'showdown', t: this.elapsed(), hands });
  }

  recordPotAwarded(
    potIndex: number,
    amount: number,
    winners: ReadonlyArray<{ playerId: string; amount: number }>,
  ): void {
    this.push({ type: 'potAwarded', t: this.elapsed(), potIndex, amount, winners });
  }

  recordHandComplete(): void {
    this.push({ type: 'handComplete', t: this.elapsed() });
  }

  toHistory(): HandHistory {
    return {
      handId: this.handId,
      startedAtUnixMs: this.startedAtUnixMs,
      buttonSeat: this.buttonSeat,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      ante: this.ante,
      maxSeats: this.maxSeats,
      players: this.players,
      rngSeed: this.rngSeed,
      events: this.events.slice(),
    };
  }

  private push(event: HandEvent): void {
    this.events.push(event);
  }

  private elapsed(): number {
    return this.clock.now() - this.startMs;
  }
}
