import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { preflightThemePackage } from '../electron/themePackagePreflight.js';

function readSource(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('electron IPC hardening', () => {
  it('does not return raw exception messages from IPC handlers', () => {
    const editorMain = readSource('electron/main.js');
    const gameMain = readSource('electron/game/main.js');

    expect(editorMain).toContain('function createIpcErrorResponse()');
    expect(gameMain).toContain('function createIpcErrorResponse()');
    expect(editorMain).not.toMatch(/return\s+\{\s*success:\s*false,\s*error:\s*e\.message\s*\}/);
    expect(gameMain).not.toMatch(/return\s+\{\s*success:\s*false,\s*error:\s*e\.message\s*\}/);
  });

  it('does not expose raw preflight exceptions to renderer-visible results', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await preflightThemePackage({
      filePath: 'E:/private/missing-theme-package.zip',
      projectPath: process.cwd(),
    });

    expect(result).toEqual({ success: false, error: 'Operation failed' });
    expect(JSON.stringify(result)).not.toContain('missing-theme-package.zip');
    expect(consoleError).toHaveBeenCalledWith(
      '[theme-package-preflight] Failed:',
      expect.objectContaining({ message: expect.any(String) }),
    );
    consoleError.mockRestore();
  });

  it('uses only the tracked main BrowserWindow for main-window IPC', () => {
    const editorMain = readSource('electron/main.js');
    const helper = editorMain.match(/function getMainWindow\(\) \{[\s\S]*?\n\}/)?.[0] || '';

    expect(helper).toContain('return win;');
    expect(helper).toContain('win.isDestroyed()');
    expect(helper).not.toContain('BrowserWindow.getFocusedWindow');
    expect(helper).not.toContain('BrowserWindow.getAllWindows');
  });

  it('clears the tracked main window before platform-specific quit handling', () => {
    const editorMain = readSource('electron/main.js');
    const handler = editorMain.match(/app\.on\('window-all-closed'[\s\S]*?\n  \}\);/)?.[0] || '';

    expect(handler).toContain('win = null;');
    expect(handler.indexOf('win = null;')).toBeLessThan(handler.indexOf("process.platform !== 'darwin'"));
  });
});
