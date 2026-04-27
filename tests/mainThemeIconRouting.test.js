import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const mainSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/main.js'),
  'utf8'
);

describe('main.js QAB theme icon routing', () => {
  it('passes theme icons to QuickActionBar during preview snapshot bootstrap', () => {
    expect(mainSource).toMatch(
      /function applyPreviewScriptSnapshot\([\s\S]*const themeIcons = engine\.script\.ui\?\.theme\?\.icons;[\s\S]*quickBar\.setThemeIcons\(themeIcons(?: \|\| null)?\);/
    );
  });

  it('passes theme icons to QuickActionBar during normal runtime init', () => {
    expect(mainSource).toMatch(
      /const themeIcons = engine\.script\.ui\?\.theme\?\.icons;[\s\S]*quickBar\.setThemeIcons\(themeIcons(?: \|\| null)?\);[\s\S]*\/\/ Apply nameplate style/
    );
  });

  it('refreshes QuickActionBar icons during update-theme preview messages', () => {
    expect(mainSource).toMatch(
      /case 'update-theme': \{[\s\S]*const themeIcons = msg\.theme\?\.icons;[\s\S]*quickBar\.setThemeIcons\(themeIcons \|\| null\);/
    );
  });
});
