import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('editor save and close dirty-state handshake', () => {
  it('flushes pending editor timers before saving and exposes an awaitable close check', () => {
    const source = readFileSync(resolve(process.cwd(), 'src', 'editor', 'App.vue'), 'utf8');

    expect(source).toContain('let activeSavePromise = null');
    expect(source).toContain('const saving = ref(false)');
    expect(source).toContain('async function flushPendingSnapshotBeforeSave()');
    expect(source).toContain('script._skipWatch = true');
    expect(source).toContain('watch(() => script.changeRevision');
    expect(source).not.toMatch(/watch\(\(\) => script\.data[\s\S]{0,500}deep:\s*true/);
    expect(source).toContain("source: 'autosave'");
    expect(source).toContain('await flushPendingSnapshotBeforeSave()');
    expect(source).toContain('window.__hasDirtyProject = async () =>');
    expect(source).toContain('await activeSavePromise.catch(() => false)');
    expect(source).toContain('window.__saveCurrentProject = () =>');
  });

  it('waits for renderer save and dirty promises before deciding whether to close', () => {
    const source = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');

    expect(source).toContain(
      '(async () => (window.__hasDirtyProject ? await window.__hasDirtyProject() : false))()'
    );
    expect(source).toContain(
      '(async () => (window.__saveCurrentProject ? await window.__saveCurrentProject() : false))()'
    );
  });
});
