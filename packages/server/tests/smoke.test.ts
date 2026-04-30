import { describe, expect, it } from 'vitest';

import { SERVER_VERSION } from '../src/index.js';

describe('server package smoke tests', () => {
  it('exports version', () => {
    expect(SERVER_VERSION).toBe('0.0.0');
  });
});
