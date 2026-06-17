import { describe, expect, it } from 'vitest';

import { createScriptDiffSummary } from '../src/editor/utils/scriptDiff.js';

function createNestedObject(depth) {
  const root = {};
  let cursor = root;
  for (let index = 0; index < depth; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }
  cursor.value = 'done';
  return root;
}

describe('scriptDiff', () => {
  it('summarizes very deep objects without overflowing the call stack', () => {
    const editorScript = createNestedObject(1000);
    const diskScript = createNestedObject(1000);

    const diff = createScriptDiffSummary(editorScript, diskScript, { maxDepth: 50 });

    expect(diff.changedPathCount).toBe(1);
    expect(diff.entries[0]).toMatchObject({
      type: 'changed-on-disk',
    });
  });

  it('handles cyclic objects without throwing while formatting values', () => {
    const editorScript = { scenes: {} };
    editorScript.self = editorScript;
    const diskScript = { scenes: { start: {} } };
    diskScript.self = diskScript;

    expect(() => createScriptDiffSummary(editorScript, diskScript)).not.toThrow();
  });
});
