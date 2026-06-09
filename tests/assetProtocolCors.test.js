import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('asset protocol CORS support', () => {
  it('registers asset:// as a CORS-enabled secure scheme for canvas-readable images', () => {
    const source = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');

    expect(source).toContain('secure: true');
    expect(source).toContain('corsEnabled: true');
    expect(source).toContain('function createAssetResponseHeaders');
    expect(source).toContain("nextHeaders.set('Access-Control-Allow-Origin', '*')");
    expect(source).toContain("nextHeaders.set('Access-Control-Allow-Headers', 'Range')");
    expect(source).toContain('fetchAssetFileResponse(fullPath)');
    expect(source).toContain('headers: createAssetResponseHeaders({');
  });
});
