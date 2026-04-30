import { describe, expect, it } from 'vitest';

import { CANONICAL_DECK, ENGINE_VERSION } from '../src/index.js';

describe('engine package smoke tests', () => {
  it('exports version', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });

  it('can import from @poker-app/shared (52 cards)', () => {
    expect(CANONICAL_DECK).toHaveLength(52);
  });
});
