import { z } from 'zod';

/**
 * Suit of a playing card.
 * Using single letters for compact serialization in hand histories.
 */
export const SuitSchema = z.enum(['c', 'd', 'h', 's']);
export type Suit = z.infer<typeof SuitSchema>;

export const SUITS: readonly Suit[] = ['c', 'd', 'h', 's'] as const;

export const SUIT_NAMES: Record<Suit, string> = {
  c: 'clubs',
  d: 'diamonds',
  h: 'hearts',
  s: 'spades',
};

/**
 * Rank of a playing card.
 * 'T' for Ten (single character keeps card representation as 2 chars).
 */
export const RankSchema = z.enum(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
export type Rank = z.infer<typeof RankSchema>;

export const RANKS: readonly Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'J',
  'Q',
  'K',
  'A',
] as const;

/**
 * Numeric value for hand evaluation. 2 = 2, ..., A = 14.
 */
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/**
 * A card is the concatenation of rank and suit, e.g. "Ah" = Ace of hearts.
 * Two characters total. This is the canonical wire format.
 */
export const CardSchema = z.string().regex(/^[23456789TJQKA][cdhs]$/);
export type Card = z.infer<typeof CardSchema>;

export const makeCard = (rank: Rank, suit: Suit): Card => `${rank}${suit}`;

export const parseCard = (card: Card): { rank: Rank; suit: Suit } => {
  const parsed = CardSchema.parse(card);
  return {
    rank: parsed[0] as Rank,
    suit: parsed[1] as Suit,
  };
};

/**
 * Full 52-card deck in canonical order.
 */
export const FULL_DECK: readonly Card[] = RANKS.flatMap((rank) =>
  SUITS.map((suit) => makeCard(rank, suit)),
);
