import { describe, expect, it } from 'vitest';

import { isSameFileState } from '../src/shared/fileState.js';

describe('isSameFileState', () => {
  it('detects content changes even when size and mtime are unchanged', () => {
    const base = { path: 'script.json', mtimeMs: 1000, size: 42 };

    expect(isSameFileState(
      { ...base, sha256: 'hash-a' },
      { ...base, sha256: 'hash-b' },
    )).toBe(false);
  });

  it('keeps compatibility with file states created before hashes were added', () => {
    expect(isSameFileState(
      { mtimeMs: 1000, size: 42 },
      { mtimeMs: 1000, size: 42 },
    )).toBe(true);
  });
});
