/**
 * @vitest-environment jsdom
 */

/**
 * BacklogScreen.setLayout() unit tests
 *
 * Covers SCREEN-02 and COMPAT-02:
 *   - setLayout(config) stores config
 *   - setLayout(null) clears config
 *   - show() without config produces identical output (COMPAT-02)
 *   - show() with config applies background, header, entry styles
 *   - entry.speakerColor overrides character color
 *   - entry.hoverBackground adds mouseenter/mouseleave listeners
 *   - entry.padding array converts to CSS string
 *   - backgroundImage uses resolvePath()
 *   - CSS values are sanitized
 *
 * Run with: npx vitest run tests/backlogScreenLayout.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────

// Mock resolvePath before importing BacklogScreen
vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((p) => `resolved:${p}`),
}));

import { BacklogScreen } from '../src/ui/BacklogScreen.js';
import { resolvePath } from '../src/engine/assetPath.js';

// ─── Helpers ──────────────────────────────────────────────

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function makeAudio() {
  return {
    playVoice: vi.fn(() => new Promise(() => {})),
    stopVoice: vi.fn(),
  };
}

const SAMPLE_HISTORY = [
  { speaker: 'alice', speakerName: 'Alice', text: 'Hello', voice: null },
  { speaker: 'bob', speakerName: 'Bob', text: 'Hi there', voice: null },
  { speaker: null, speakerName: null, text: 'Narrator text', voice: null },
];

const CHARACTERS = {
  alice: { name: 'Alice', color: '#ff0000' },
  bob: { name: 'Bob', color: '#00ff00' },
};

const FULL_CONFIG = {
  background: 'rgba(0,0,0,0.85)',
  backgroundImage: 'ui/backlog-bg.png',
  header: {
    title: '回 想',
    backgroundImage: 'ui/header-bg.png',
    height: 60,
  },
  entry: {
    speakerColor: '#ffcc00',
    speakerFontSize: 13,
    textFontSize: 15,
    background: 'transparent',
    hoverBackground: 'rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: [12, 20],
  },
};

// ─── Tests ────────────────────────────────────────────────

describe('BacklogScreen.setLayout', () => {

  let container, screen;

  beforeEach(() => {
    container = makeContainer();
    screen = new BacklogScreen(container, null);
    vi.clearAllMocks();
  });

  // ─── setLayout API ─────────────────────────────────────

  describe('API surface', () => {
    it('has setLayout method', () => {
      expect(typeof screen.setLayout).toBe('function');
    });

    it('stores config', () => {
      screen.setLayout(FULL_CONFIG);
      expect(screen._layoutConfig).toBe(FULL_CONFIG);
    });

    it('clears config with null', () => {
      screen.setLayout(FULL_CONFIG);
      screen.setLayout(null);
      expect(screen._layoutConfig).toBeNull();
    });

    it('clears config with undefined', () => {
      screen.setLayout(FULL_CONFIG);
      screen.setLayout(undefined);
      expect(screen._layoutConfig).toBeNull();
    });

    it('_layoutConfig is null by default', () => {
      expect(screen._layoutConfig).toBeNull();
    });
  });

  // ─── COMPAT-02: null config = identical rendering ──────

  describe('COMPAT-02: null config rendering', () => {

    it('renders header with default title 回 想', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const title = screen.el.querySelector('.backlog-title');
      expect(title.textContent).toBe('回 想');
    });

    it('renders close button with 返回 text', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const btn = screen.el.querySelector('.backlog-close');
      expect(btn.textContent).toBe('返回');
    });

    it('renders correct number of entries', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const entries = screen.el.querySelectorAll('.backlog-entry');
      expect(entries.length).toBe(3);
    });

    it('renders speaker names', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const speakers = screen.el.querySelectorAll('.backlog-speaker');
      expect(speakers.length).toBe(2);
      expect(speakers[0].textContent).toBe('Alice');
      expect(speakers[1].textContent).toBe('Bob');
    });

    it('applies character color to speaker', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const speakers = screen.el.querySelectorAll('.backlog-speaker');
      expect(speakers[0].style.color).toContain('255, 0, 0');
      expect(speakers[1].style.color).toContain('0, 255, 0');
    });

    it('narrator entry has no speaker div', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const entries = screen.el.querySelectorAll('.backlog-entry');
      const narratorEntry = entries[2];
      expect(narratorEntry.querySelector('.backlog-speaker')).toBeNull();
    });

    it('narrator text has italic style', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const entries = screen.el.querySelectorAll('.backlog-entry');
      const narratorText = entries[2].querySelector('.backlog-text');
      expect(narratorText.style.fontStyle).toBe('italic');
    });

    it('no inline background style on el when no config', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.style.background).toBe('');
      expect(screen.el.style.backgroundImage).toBe('');
    });

    it('no inline styles on header when no config', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const header = screen.el.querySelector('.backlog-header');
      expect(header.style.backgroundImage).toBe('');
      expect(header.style.height).toBe('');
    });

    it('no inline styles on entry divs when no config', () => {
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const entries = screen.el.querySelectorAll('.backlog-entry');
      for (const entry of entries) {
        expect(entry.style.borderBottom).toBe('');
        expect(entry.style.padding).toBe('');
      }
    });

    it('falls back to 返回 when a broken close theme icon fails to load', () => {
      screen.setThemeIcons({ close: 'ui/icons/close.png' });
      screen.show(SAMPLE_HISTORY, CHARACTERS);

      const img = screen.el.querySelector('.backlog-close img.close-icon');
      expect(img).not.toBeNull();
      img.dispatchEvent(new Event('error'));

      expect(screen.el.querySelector('.backlog-close img')).toBeNull();
      expect(screen.el.querySelector('.backlog-close').textContent).toBe('返回');
    });
  });

  // ─── SCREEN-02: config applied ─────────────────────────

  describe('SCREEN-02: layout config application', () => {

    describe('background', () => {
      it('applies background color', () => {
        screen.setLayout({ background: 'rgba(0,0,0,0.85)' });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        expect(screen.el.style.background).toContain('rgba(0, 0, 0, 0.85)');
      });

      it('applies backgroundImage via resolvePath', () => {
        screen.setLayout({ backgroundImage: 'ui/bg.png' });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        expect(resolvePath).toHaveBeenCalledWith('ui/bg.png');
        expect(screen.el.style.backgroundImage).toContain('resolved:ui/bg.png');
      });

      it('applies both background and backgroundImage', () => {
        screen.setLayout({
          background: 'rgba(0,0,0,0.9)',
          backgroundImage: 'ui/bg.png',
        });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        // background shorthand absorbs backgroundImage in jsdom
        expect(screen.el.style.background).toContain('rgba(0, 0, 0, 0.9)');
        expect(screen.el.style.backgroundImage).toContain('resolved:ui/bg.png');
      });
    });

    describe('header', () => {
      it('applies custom header title', () => {
        screen.setLayout({ header: { title: 'History' } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const title = screen.el.querySelector('.backlog-title');
        expect(title.textContent).toBe('History');
      });

      it('applies header backgroundImage', () => {
        screen.setLayout({ header: { backgroundImage: 'ui/header.png' } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const header = screen.el.querySelector('.backlog-header');
        expect(resolvePath).toHaveBeenCalledWith('ui/header.png');
        expect(header.style.backgroundImage).toContain('resolved:ui/header.png');
      });

      it('applies header height', () => {
        screen.setLayout({ header: { height: 80 } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const header = screen.el.querySelector('.backlog-header');
        expect(header.style.height).toBe('80px');
      });

      it('preserves default title when header has no title', () => {
        screen.setLayout({ header: { height: 60 } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const title = screen.el.querySelector('.backlog-title');
        expect(title.textContent).toBe('回 想');
      });
    });

    describe('entry styles', () => {
      it('applies entry.speakerColor overriding character color', () => {
        screen.setLayout({ entry: { speakerColor: '#ffcc00' } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const speakers = screen.el.querySelectorAll('.backlog-speaker');
        // speakerColor overrides character color (jsdom normalizes hex → rgb)
        expect(speakers[0].style.color).toContain('255, 204, 0');
        expect(speakers[1].style.color).toContain('255, 204, 0');
      });

      it('uses character color when entry.speakerColor is null', () => {
        screen.setLayout({ entry: { speakerColor: null } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const speakers = screen.el.querySelectorAll('.backlog-speaker');
        expect(speakers[0].style.color).toContain('255, 0, 0');
        expect(speakers[1].style.color).toContain('0, 255, 0');
      });

      it('applies entry.speakerFontSize', () => {
        screen.setLayout({ entry: { speakerFontSize: 16 } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const speakers = screen.el.querySelectorAll('.backlog-speaker');
        expect(speakers[0].style.fontSize).toBe('16px');
      });

      it('applies entry.textFontSize', () => {
        screen.setLayout({ entry: { textFontSize: 18 } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const texts = screen.el.querySelectorAll('.backlog-text');
        expect(texts[0].style.fontSize).toBe('18px');
      });

      it('applies entry.background', () => {
        screen.setLayout({ entry: { background: 'rgba(10,10,10,0.5)' } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entries = screen.el.querySelectorAll('.backlog-entry');
        expect(entries[0].style.background).toContain('rgba(10, 10, 10, 0.5)');
      });

      it('applies entry.borderBottom', () => {
        screen.setLayout({ entry: { borderBottom: '1px solid rgba(255,255,255,0.06)' } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entries = screen.el.querySelectorAll('.backlog-entry');
        expect(entries[0].style.borderBottom).toContain('1px solid');
        expect(entries[0].style.borderBottom).toContain('rgba(255, 255, 255, 0.06)');
      });

      it('applies entry.padding as array [y, x]', () => {
        screen.setLayout({ entry: { padding: [12, 20] } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entries = screen.el.querySelectorAll('.backlog-entry');
        expect(entries[0].style.padding).toBe('12px 20px');
      });

      it('applies entry.padding with single value', () => {
        screen.setLayout({ entry: { padding: [8] } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entries = screen.el.querySelectorAll('.backlog-entry');
        expect(entries[0].style.padding).toBe('8px');
      });
    });

    describe('entry hover effect', () => {
      it('applies hoverBackground on mouseenter', () => {
        screen.setLayout({ entry: { hoverBackground: 'rgba(255,255,255,0.05)' } });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entry = screen.el.querySelector('.backlog-entry');
        entry.dispatchEvent(new Event('mouseenter'));
        expect(entry.style.background).toContain('rgba(255, 255, 255, 0.05)');
      });

      it('removes hoverBackground on mouseleave', () => {
        screen.setLayout({
          entry: {
            background: 'transparent',
            hoverBackground: 'rgba(255,255,255,0.05)',
          },
        });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entry = screen.el.querySelector('.backlog-entry');
        entry.dispatchEvent(new Event('mouseenter'));
        expect(entry.style.background).toContain('rgba(255, 255, 255, 0.05)');
        entry.dispatchEvent(new Event('mouseleave'));
        expect(entry.style.background).toBe('transparent');
      });

      it('mouseleave restores to empty when no entry.background', () => {
        screen.setLayout({
          entry: { hoverBackground: 'rgba(255,255,255,0.05)' },
        });
        screen.show(SAMPLE_HISTORY, CHARACTERS);
        const entry = screen.el.querySelector('.backlog-entry');
        entry.dispatchEvent(new Event('mouseenter'));
        entry.dispatchEvent(new Event('mouseleave'));
        expect(entry.style.background).toBe('');
      });
    });
  });

  // ─── Sanitization ──────────────────────────────────────

  describe('sanitization', () => {
    it('rejects background with CSS injection', () => {
      screen.setLayout({ background: 'url(javascript:alert(1))' });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.style.background).toBe('');
    });

    it('rejects entry.borderBottom with injection', () => {
      screen.setLayout({ entry: { borderBottom: '1px; color: red' } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const entries = screen.el.querySelectorAll('.backlog-entry');
      expect(entries[0].style.borderBottom).toBe('');
    });

    it('clamps entry.speakerFontSize within bounds', () => {
      screen.setLayout({ entry: { speakerFontSize: 999 } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const speakers = screen.el.querySelectorAll('.backlog-speaker');
      // clampField('fontSize', 999) should clamp to 200
      expect(parseInt(speakers[0].style.fontSize)).toBeLessThanOrEqual(200);
    });

    it('clamps entry.textFontSize within bounds', () => {
      screen.setLayout({ entry: { textFontSize: -5 } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const texts = screen.el.querySelectorAll('.backlog-text');
      // clampField('fontSize', -5) should clamp to 1
      expect(parseInt(texts[0].style.fontSize)).toBeGreaterThanOrEqual(1);
    });

    it('clamps header height within bounds', () => {
      screen.setLayout({ header: { height: 9999 } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const header = screen.el.querySelector('.backlog-header');
      // clampField('height', 9999) should clamp to 1440
      expect(parseInt(header.style.height)).toBeLessThanOrEqual(1440);
    });

    it('clamps padding values within bounds', () => {
      screen.setLayout({ entry: { padding: [999, 999] } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      const entry = screen.el.querySelector('.backlog-entry');
      // Each padding value clamped to 200 max; jsdom may collapse identical values
      expect(entry.style.padding).toContain('200px');
    });
  });

  // ─── Full config integration ───────────────────────────

  describe('full config integration', () => {
    it('applies all config fields together', () => {
      screen.setLayout(FULL_CONFIG);
      screen.show(SAMPLE_HISTORY, CHARACTERS);

      // Background (shorthand absorbs backgroundImage in jsdom)
      expect(screen.el.style.background).toContain('rgba(0, 0, 0, 0.85)');
      expect(screen.el.style.backgroundImage).toContain('resolved:ui/backlog-bg.png');

      // Header
      const header = screen.el.querySelector('.backlog-header');
      const title = screen.el.querySelector('.backlog-title');
      expect(title.textContent).toBe('回 想');
      expect(header.style.height).toBe('60px');

      // Entries
      const entries = screen.el.querySelectorAll('.backlog-entry');
      expect(entries.length).toBe(3);

      // Speaker color overrides (jsdom normalizes hex → rgb)
      const speakers = screen.el.querySelectorAll('.backlog-speaker');
      expect(speakers[0].style.color).toContain('255, 204, 0');
    });

    it('re-show with different config updates styles', () => {
      screen.setLayout({ header: { title: 'First' } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.querySelector('.backlog-title').textContent).toBe('First');

      screen.setLayout({ header: { title: 'Second' } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.querySelector('.backlog-title').textContent).toBe('Second');
    });

    it('clearing config returns to default behavior', () => {
      screen.setLayout(FULL_CONFIG);
      screen.show(SAMPLE_HISTORY, CHARACTERS);

      screen.setLayout(null);
      screen.show(SAMPLE_HISTORY, CHARACTERS);

      // Default title
      expect(screen.el.querySelector('.backlog-title').textContent).toBe('回 想');
      // Default character colors (jsdom normalizes hex → rgb)
      const speakers = screen.el.querySelectorAll('.backlog-speaker');
      expect(speakers[0].style.color).toContain('255, 0, 0');
      // No inline background
      expect(screen.el.style.background).toBe('');
    });
  });

  describe('chrome.decorations (Phase 74)', () => {
    it('renders chrome.decorations as .screen-decoration elements', () => {
      screen.setLayout({
        chrome: {
          decorations: [
            { src: 'ui/bl/decor.png', x: 50, y: 100, width: 200, height: 80 },
          ],
        },
      });
      screen.show(SAMPLE_HISTORY, CHARACTERS);

      const decorations = screen.el.querySelectorAll('.screen-decoration');
      expect(decorations.length).toBe(1);
      expect(decorations[0].getAttribute('src')).toContain('resolved:ui/bl/decor.png');
      expect(decorations[0].style.left).toBe('50px');
      expect(decorations[0].style.top).toBe('100px');
    });

    it('re-showing replaces decorations instead of accumulating', () => {
      screen.setLayout({
        chrome: { decorations: [{ src: 'ui/bl/a.png', x: 0, y: 0, width: 50, height: 50 }] },
      });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.querySelectorAll('.screen-decoration').length).toBe(1);

      screen.setLayout({
        chrome: { decorations: [
          { src: 'ui/bl/b.png', x: 0, y: 0, width: 50, height: 50 },
          { src: 'ui/bl/c.png', x: 0, y: 0, width: 50, height: 50 },
        ] },
      });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.querySelectorAll('.screen-decoration').length).toBe(2);
    });

    it('empty chrome.decorations produces no decoration elements', () => {
      screen.setLayout({ chrome: { decorations: [] } });
      screen.show(SAMPLE_HISTORY, CHARACTERS);
      expect(screen.el.querySelectorAll('.screen-decoration').length).toBe(0);
    });
  });

  describe('voice replay theme icon fallback', () => {
    it('recovers to ▶ / ■ text behavior after a broken themed voice icon fails', () => {
      const audio = makeAudio();
      screen = new BacklogScreen(container, audio);
      screen.setThemeIcons({ voiceReplay: 'ui/icons/voice.png' });
      screen.show([
        { speaker: 'alice', speakerName: 'Alice', text: 'Hello', voice: 'voice/test.ogg' },
      ], CHARACTERS);

      const btn = screen.el.querySelector('.backlog-voice-btn');
      const img = btn.querySelector('img.voice-replay-icon');
      expect(img).not.toBeNull();
      img.dispatchEvent(new Event('error'));

      expect(btn.querySelector('img')).toBeNull();
      expect(btn.textContent).toBe('▶');

      btn.click();
      expect(btn.textContent).toBe('■');

      btn.click();
      expect(btn.textContent).toBe('▶');
    });

    it('restores the replay button after voice playback rejects', async () => {
      const error = new Error('missing voice');
      const audio = makeAudio();
      audio.playVoice.mockRejectedValue(error);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      screen = new BacklogScreen(container, audio);
      screen.show([
        { speaker: 'alice', speakerName: 'Alice', text: 'Hello', voice: 'voice/missing.ogg' },
      ], CHARACTERS);

      const btn = screen.el.querySelector('.backlog-voice-btn');
      btn.click();
      expect(btn.textContent).toBe('■');

      await Promise.resolve();
      await Promise.resolve();

      expect(btn.textContent).toBe('▶');
      expect(screen.el.querySelector('.backlog-entry').classList.contains('backlog-playing')).toBe(false);
      expect(warn).toHaveBeenCalledWith('[BacklogScreen] Failed to play voice:', error);
      warn.mockRestore();
    });
  });
});
