import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { preflightThemePackage } from '../electron/themePackagePreflight.js';
import {
  createIpcCanceledResponse,
  createIpcFailureResponse,
  createIpcSuccessResponse,
} from '../src/shared/ipcResponse.js';

function readSource(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('electron IPC hardening', () => {
  it('uses one response envelope for export dialog success, cancellation, and failure', () => {
    expect(createIpcSuccessResponse('E:/exports')).toEqual({ success: true, data: 'E:/exports' });
    expect(createIpcCanceledResponse()).toEqual({ success: false, canceled: true });
    expect(createIpcFailureResponse()).toEqual({ success: false, error: 'Operation failed' });

    const editorMain = readSource('electron/main.js');
    for (const channel of ['dialog-open-directory', 'dialog-open-file', 'read-file-base64']) {
      const start = editorMain.indexOf(`ipcMain.handle('${channel}'`);
      const end = editorMain.indexOf('\n});', start + 1);
      const handler = editorMain.slice(start, end === -1 ? editorMain.length : end + 4);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(handler).not.toMatch(/return null;/);
      expect(handler).toMatch(/createIpc(Success|Canceled|Failure|Error)Response/);
    }
  });

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
