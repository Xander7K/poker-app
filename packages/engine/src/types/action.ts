/**
 * Discriminated union of all possible player actions.
 * The engine validates legality — these types only describe shape.
 *
 * For 'bet' and 'raise', `amount` is the TOTAL amount to bring `committedThisRound`
 * to. NOT the increment over the previous bet. This is unambiguous and matches
 * how UIs typically present sliders ("raise to 200", not "raise by 150").
 */
export type Action =
  | { readonly type: 'fold' }
  | { readonly type: 'check' }
  | { readonly type: 'call' }
  | { readonly type: 'bet'; readonly amount: number }
  | { readonly type: 'raise'; readonly amount: number }
  | { readonly type: 'allIn' };

export const ActionType = {
  Fold: 'fold',
  Check: 'check',
  Call: 'call',
  Bet: 'bet',
  Raise: 'raise',
  AllIn: 'allIn',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];
