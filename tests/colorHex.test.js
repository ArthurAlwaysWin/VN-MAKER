import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { hexToRgb } from '../src/shared/color.js';
import { hexToHsl } from '../src/engine/colorHarmony.js';
import { contrastRatio } from '../src/engine/contrast.js';

describe('shared six-digit hex conversion', () => {
  it('preserves hash-optional six-digit parsing and tuple output', () => {
    expect(hexToRgb('#4A90D9')).toEqual([74, 144, 217]);
    expect(hexToRgb('4A90D9')).toEqual([74, 144, 217]);
  });

  it('preserves permissive malformed-channel behavior', () => {
    const [r, g, b] = hexToRgb('#zz00ff');
    expect(Number.isNaN(r)).toBe(true);
    expect(g).toBe(0);
    expect(b).toBe(255);
  });
});

describe('hex conversion callers', () => {
  it('keeps color harmony and contrast results stable', () => {
    expect(hexToHsl('#ff0000')).toEqual([0, 100, 50]);
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  });

  it('keeps the preset generator RGB and gradient output stable', () => {
    const output = execFileSync(process.execPath, ['tools/generatePresets.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const presets = JSON.parse(output);
    const modern = presets.find((preset) => preset.id === 'modern');

    expect(modern.tokens.primary).toBe('rgba(74, 143, 217, 0.90)');
    expect(modern.tokens['dialogue-bg']).toContain('rgba(11, 13, 15, 0.92)');
  });
});
