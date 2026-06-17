import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('asset import IPC security', () => {
  it('uses preload-issued import grants instead of exposing raw grant IPC to the renderer', () => {
    const preload = readSource('electron/preload.js');
    const main = readSource('electron/main.js');
    const resourceLibrary = readSource('src/editor/views/ResourceLibrary.vue');
    const characterEditor = readSource('src/editor/components/resource-library/CharacterEditor.vue');
    const allowedChannelsBlock = preload.slice(
      preload.indexOf('const ALLOWED_CHANNELS'),
      preload.indexOf('];', preload.indexOf('const ALLOWED_CHANNELS')),
    );

    expect(preload).toContain("contextBridge.exposeInMainWorld('createImportFileGrant'");
    expect(preload).toContain("ipcRenderer.invoke('grant-import-file'");
    expect(allowedChannelsBlock).not.toContain('grant-import-file');
    expect(main).toContain("ipcMain.handle('grant-import-file'");
    expect(main).toContain('consumeImportFileGrant');
    expect(main).toContain('hasImportFileReadGrant');
    expect(resourceLibrary).toContain('window.createImportFileGrant');
    expect(characterEditor).toContain('window.createImportFileGrant');
  });

  it('clears dialog and import grants when a project is closed', () => {
    const main = readSource('electron/main.js');
    const closeProjectBlock = main.slice(
      main.indexOf("ipcMain.handle('close-project'"),
      main.indexOf('// ─── Save System IPC', main.indexOf("ipcMain.handle('close-project'")),
    );

    expect(main).toContain('function clearProjectPathGrants()');
    expect(main).toContain('dialogGrantedFilePaths.clear()');
    expect(main).toContain('dialogGrantedDirectoryPaths.clear()');
    expect(main).toContain('grantedProjectPaths.clear()');
    expect(closeProjectBlock).toContain('clearProjectPathGrants()');
  });
});
