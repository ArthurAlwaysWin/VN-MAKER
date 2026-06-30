/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adaptLegacyUiOverlay, adaptLegacyUiScreen } from '../src/shared/uiLegacyAdapters.js';
import { validateUiDocument } from '../src/shared/uiDocumentContract.js';
import { GalleryScreen } from '../src/ui/GalleryScreen.js';
import { TextInputScreen } from '../src/ui/TextInputScreen.js';
import { VideoPlayer } from '../src/ui/VideoPlayer.js';
import { createProjectSession } from '../src/authoring/projectSession.js';

describe('Phase 10 canonical gallery and overlays', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="before">Before</button><div id="game"></div>';
    vi.stubGlobal('requestAnimationFrame', callback => callback());
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders canonical gallery data without changing player-owned unlock records', () => {
    const script = { meta: { resolution: { width: 1280, height: 720 } }, systems: { gallery: { cg: {} }, endings: {} } };
    const canonical = adaptLegacyUiScreen(script, 'gallery').document;
    expect(validateUiDocument(canonical, { screenId: 'gallery' }).filter(item => item.severity === 'error')).toEqual([]);
    const unlocks = { unlocked: { count: 1 } };
    const snapshot = JSON.stringify(unlocks);
    const screen = new GalleryScreen(document.getElementById('game'));
    screen.setLayout(null, { canonicalDocument: canonical });
    screen.show({
      unlocked: { title: 'Moonrise', description: 'Two remembered skies.', images: ['backgrounds/one.png', 'backgrounds/two.png'], order: 2 },
      locked: { title: 'Secret', images: ['backgrounds/secret.png'], order: 1 },
    }, unlocks);
    expect(screen.el.querySelectorAll('.gallery-card')).toHaveLength(2);
    expect(screen.el.querySelector('.gallery-card.locked')).not.toBeNull();
    screen.el.querySelector('.gallery-card.unlocked').click();
    expect(screen.el.querySelector('.gallery-focus-description').textContent).toBe('Two remembered skies.');
    screen.el.querySelector('.gallery-nav-next').click();
    expect(screen.el.querySelector('.gallery-position').textContent).toBe('2 / 2');
    expect(JSON.stringify(unlocks)).toBe(snapshot);
  });

  it('keeps text input submission in the existing callback and supports validation, cancel, keyboard, and focus restoration', () => {
    const canonical = adaptLegacyUiOverlay({}, 'textInput').document;
    const before = document.getElementById('before');
    before.focus();
    const screen = new TextInputScreen(document.getElementById('game'));
    screen.setDocument(canonical);
    screen.onSubmit = vi.fn(() => true);
    screen.show({ prompt: 'Name', defaultValue: '', required: true });
    screen.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(screen.onSubmit).not.toHaveBeenCalled();
    expect(screen.el.querySelector('[role="alert"]').hidden).toBe(false);
    screen.inputEl.value = 'Alice';
    screen.inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    screen.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(screen.onSubmit).toHaveBeenCalledWith('Alice');
    expect(document.activeElement).toBe(before);

    screen.show({ prompt: 'Name', defaultValue: 'Current' });
    screen.onCancel = vi.fn();
    screen.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(screen.onCancel).toHaveBeenCalledTimes(1);
    expect(screen.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('exposes only controls allowed by VideoPlayer policy and keeps outcomes owned by VideoPlayer', async () => {
    const canonical = adaptLegacyUiOverlay({}, 'videoControls').document;
    const player = new VideoPlayer(document.getElementById('game'));
    player.setControlsDocument(canonical);
    const lockedPromise = player.play({ file: 'videos/locked.webm', controls: false, skippable: false, loop: true, audioMode: 'duck', fit: 'cover' });
    expect(player.el.querySelector('[data-controls-allowed="false"]')).not.toBeNull();
    expect(player.el.querySelector('[data-gm-ui-part="playPause"]')).toBeNull();
    expect(player.el.querySelector('[data-gm-ui-part="skip"]')).toBeNull();
    player.video.onended();
    await expect(lockedPromise).resolves.toMatchObject({ type: 'ended', request: { loop: true, audioMode: 'duck', fit: 'cover' } });

    const skippablePromise = player.play({ file: 'videos/open.webm', controls: true, skippable: true, volume: 0.4 });
    expect(player.el.querySelector('[data-gm-ui-part="playPause"]')).not.toBeNull();
    player.el.querySelector('[data-gm-ui-part="skip"]').click();
    await expect(skippablePromise).resolves.toMatchObject({ type: 'skipped' });
  });

  it('authoring migrates presentation documents only and cannot write unlock state', () => {
    const script = { projectId: 'phase10', systems: { gallery: { cg: { one: { title: 'One', images: ['backgrounds/one.png'] } } }, endings: {} }, ui: {} };
    const session = createProjectSession({ script });
    const profileBefore = JSON.stringify(script.playerData ?? null);
    const gallery = session.migrateStatefulUiScreen({ screenId: 'gallery' });
    const input = session.migrateUiOverlay({ overlayId: 'textInput' });
    const video = session.migrateUiOverlay({ overlayId: 'videoControls' });
    expect(gallery.changedPaths).toContain('ui.screens.gallery');
    expect(input.changedPaths).toContain('ui.overlays.textInput');
    expect(video.changedPaths).toContain('ui.overlays.videoControls');
    expect(JSON.stringify(script.playerData ?? null)).toBe(profileBefore);
    expect(() => session.updateStatefulUiNode({ screenId: 'gallery', nodeId: 'gallery.grid', path: 'unlocks.cg', value: {} })).toThrow(/Unsupported/);
  });
});
