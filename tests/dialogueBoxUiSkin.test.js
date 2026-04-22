/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((value) => `resolved:${value}`),
}));

import { DialogueBox } from '../src/ui/DialogueBox.js';
import { resolvePath } from '../src/engine/assetPath.js';

function createDialogueBox() {
  document.body.innerHTML = '<div id="dialogue-layer"></div>';
  const container = document.getElementById('dialogue-layer');
  return new DialogueBox(container);
}

function readSource(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('DialogueBox UI skin runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders nameplate art and decorations into dedicated runtime nodes and clears legacy values back to CSS fallback', () => {
    const db = createDialogueBox();

    db.applyGlobalStyle({
      nameplateBackgroundImage: 'ui/dialogue/nameplate.webp',
      decorations: [
        { src: 'ui/dialogue/decor-flower.webp', x: 12, y: -8, width: 144, height: 96 },
        { src: 'legacy/dialogue/old.png', x: 0, y: 0, width: 80, height: 80 },
      ],
    });

    const underlay = db.el.querySelector('.dialogue-visual-underlay');
    const decorationLayer = db.el.querySelector('.dialogue-decoration-layer');
    const nameplateArt = db.el.querySelector('.dialogue-nameplate-art');
    const decoration0 = db.el.querySelector('[data-dialogue-decoration-index="0"]');
    const decoration1 = db.el.querySelector('[data-dialogue-decoration-index="1"]');

    expect(underlay).not.toBeNull();
    expect(decorationLayer).not.toBeNull();
    expect(nameplateArt.style.backgroundImage).toContain('resolved:ui/dialogue/nameplate.webp');
    expect(decoration0.style.backgroundImage).toContain('resolved:ui/dialogue/decor-flower.webp');
    expect(decoration1.style.backgroundImage).toBe('');
    expect(resolvePath).toHaveBeenCalledWith('ui/dialogue/nameplate.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/dialogue/decor-flower.webp');
    expect(resolvePath).not.toHaveBeenCalledWith('legacy/dialogue/old.png');

    db.applyGlobalStyle({
      nameplateBackgroundImage: 'legacy/dialogue/nameplate.png',
      decorations: [
        { src: '', x: 0, y: 0, width: 80, height: 80 },
      ],
    });

    expect(nameplateArt.style.backgroundImage).toBe('');
    expect(db.el.querySelector('[data-dialogue-decoration-index="0"]').style.backgroundImage).toBe('');
  });

  it('renders preview lines as completed dialogue without private finish hooks', () => {
    const db = createDialogueBox();

    db.renderPreviewLine({
      speakerName: 'Alice',
      speakerColor: '#ff88aa',
      text: 'Preview line',
    });

    expect(db.el.classList.contains('visible')).toBe(true);
    expect(db.textEl.textContent).toBe('Preview line');
    expect(db.indicatorEl.classList.contains('visible')).toBe(true);
    expect(db.isComplete()).toBe(true);
    expect(db.nameEl.textContent).toBe('Alice');
    expect(db.nameEl.style.color).toBe('rgb(255, 136, 170)');
  });

  it('defines explicit layering selectors so art stays under readable foreground content and never steals clicks', () => {
    const dialogueSource = readSource('src/ui/DialogueBox.js');
    const styleSource = readSource('src/style.css');

    expect(dialogueSource).toContain('dialogue-visual-underlay');
    expect(dialogueSource).toContain('dialogue-nameplate-art');
    expect(dialogueSource).toContain('data-dialogue-decoration-index');
    expect(styleSource).toContain('.dialogue-visual-underlay');
    expect(styleSource).toContain('.dialogue-decoration-layer');
    expect(styleSource).toContain('.dialogue-nameplate-art');
    expect(styleSource).toContain('pointer-events: none');
    expect(styleSource).toContain('#quick-action-bar');
  });
});
