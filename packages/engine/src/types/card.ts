/**
 * Suit of a playing card.
 * Single-char codes match pokersolver's convention.
 */
export const Suit = {
  Clubs: 'c',
  Diamonds: 'd',
  Hearts: 'h',
  Spades: 's',
} as const;
export type Suit = (typeof Suit)[keyof typeof Suit];

export const ALL_SUITS: readonly Suit[] = [
  Suit.Clubs,
  Suit.Diamonds,
  Suit.Hearts,
  Suit.Spades,
] as const;

/**
 * Rank of a playing card.
 * 'T' is used for Ten (single char) to match pokersolver.
 */
export const Rank = {
  Two: '2',
  Three: '3',
  Four: '4',
  Five: '5',
  Six: '6',
  Seven: '7',
  Eight: '8',
  Nine: '9',
  Ten: 'T',
  Jack: 'J',
  Queen: 'Q',
  King: 'K',
  Ace: 'A',
} as const;
export type Rank = (typeof Rank)[keyof typeof Rank];

export const ALL_RANKS: readonly Rank[] = [
  Rank.Two,
  Rank.Three,
  Rank.Four,
  Rank.Five,
  Rank.Six,
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Ten,
  Rank.Jack,
  Rank.Queen,
  Rank.King,
  Rank.Ace,
] as const;

/** Numeric value 2..14 (Ace high). Used for kicker comparisons. */
export const RANK_VALUE: Readonly<Record<Rank, number>> = {
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
 * A playing card. Two characters: rank then suit (e.g. 'Ah', 'Td', '2c').
 */
export type Card = `${Rank}${Suit}`;

export function makeCard(rank: Rank, suit: Suit): Card {
  return `${rank}${suit}` as Card;
}

/** Returns a fresh ordered deck of 52 cards. Order is stable for tests. */
export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of ALL_RANKS) {
    for (const suit of ALL_SUITS) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
}

export function cardRank(card: Card): Rank {
  return card[0] as Rank;
}

export function cardSuit(card: Card): Suit {
  return card[1] as Suit;
}
