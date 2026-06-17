import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('runtime initialization error rendering', () => {
  it('builds the failure message with textContent instead of innerHTML interpolation', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/main.js'), 'utf8');
    const catchBlock = source.slice(
      source.indexOf("console.error('[GalgameMaker] Failed to initialize:'"),
      source.indexOf('// ─── Preview mode', source.indexOf("console.error('[GalgameMaker] Failed to initialize:'")),
    );

    expect(source).toContain('function renderInitializationError');
    expect(catchBlock).toContain('renderInitializationError(gameContainer, err)');
    expect(catchBlock).not.toContain('innerHTML');
    expect(source).toContain("detail.textContent = error?.message || 'Unknown initialization error'");
  });
});
