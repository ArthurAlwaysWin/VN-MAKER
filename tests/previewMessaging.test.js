/**
 * @vitest-environment jsdom
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  getPreviewReplyOrigin,
  getPreviewTargetOrigin,
  postPreviewMessage,
} from '../src/editor/utils/previewMessaging.js';

function listEditorSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listEditorSourceFiles(fullPath));
      continue;
    }
    if (/\.(js|vue)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('preview messaging', () => {
  it('uses the current concrete origin for preview messages', () => {
    const target = { postMessage: vi.fn() };

    expect(getPreviewTargetOrigin()).toBe(window.location.origin);
    expect(postPreviewMessage(target, { type: 'start' })).toBe(true);
    expect(target.postMessage).toHaveBeenCalledWith({ type: 'start' }, window.location.origin);
  });

  it('uses a concrete reply origin from engine message events', () => {
    const event = { origin: 'https://preview.example.test' };

    expect(getPreviewReplyOrigin(event)).toBe('https://preview.example.test');
  });

  it('does not use literal wildcard target origins in editor preview senders', () => {
    const editorRoot = resolve(process.cwd(), 'src/editor');
    const offenders = listEditorSourceFiles(editorRoot).filter((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return /postMessage\([\s\S]{0,240}?,\s*['"]\*['"]\s*\)/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
