/**
 * Tests for decorLayoutHelpers — pure data functions for decoration CRUD
 * and footer button management.
 *
 * Run: node --test tests/decorLayoutEditor.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  addDecoration, deleteDecoration, setDecorationField,
  addFooterButton, deleteFooterButton, setFooterButtonField,
} from '../src/editor/components/layout/decorLayoutHelpers.js';

// ─── addDecoration ─────────────────────────────────────

describe('addDecoration', () => {
  it('no-ops on null cfg', () => {
    addDecoration(null);
    addDecoration(undefined);
  });

  it('creates header.decorations when header is absent', () => {
    const cfg = {};
    addDecoration(cfg);
    assert.ok(Array.isArray(cfg.header.decorations));
    assert.equal(cfg.header.decorations.length, 1);
  });

  it('pushes default decoration with correct shape', () => {
    const cfg = {};
    addDecoration(cfg);
    assert.deepStrictEqual(cfg.header.decorations[0], {
      src: '', x: 0, y: 0, width: 100, height: 100,
    });
  });

  it('increments length on multiple adds', () => {
    const cfg = {};
    addDecoration(cfg);
    addDecoration(cfg);
    assert.equal(cfg.header.decorations.length, 2);
  });

  it('preserves existing decorations', () => {
    const cfg = { header: { decorations: [{ src: 'a.png', x: 10, y: 20, width: 50, height: 50 }] } };
    addDecoration(cfg);
    assert.equal(cfg.header.decorations.length, 2);
    assert.equal(cfg.header.decorations[0].src, 'a.png');
  });
});

// ─── deleteDecoration ──────────────────────────────────

describe('deleteDecoration', () => {
  it('removes decoration by index', () => {
    const cfg = { header: { decorations: [{ src: 'a' }, { src: 'b' }] } };
    deleteDecoration(cfg, 0);
    assert.equal(cfg.header.decorations.length, 1);
    assert.equal(cfg.header.decorations[0].src, 'b');
  });

  it('no-ops when decorations absent', () => {
    deleteDecoration({ header: {} }, 0);
    deleteDecoration({}, 0);
  });

  it('no-ops on null cfg', () => {
    deleteDecoration(null, 0);
    deleteDecoration(undefined, 0);
  });
});

// ─── setDecorationField ────────────────────────────────

describe('setDecorationField', () => {
  it('sets field on valid index', () => {
    const cfg = { header: { decorations: [{ src: '', x: 0, y: 0, width: 100, height: 100 }] } };
    setDecorationField(cfg, 0, 'x', 50);
    assert.equal(cfg.header.decorations[0].x, 50);
  });

  it('sets src field', () => {
    const cfg = { header: { decorations: [{ src: '', x: 0, y: 0, width: 100, height: 100 }] } };
    setDecorationField(cfg, 0, 'src', 'ornament.png');
    assert.equal(cfg.header.decorations[0].src, 'ornament.png');
  });

  it('no-ops for out-of-range index', () => {
    const cfg = { header: { decorations: [{ src: '', x: 0 }] } };
    setDecorationField(cfg, 5, 'x', 99);
    assert.equal(cfg.header.decorations[0].x, 0);
  });

  it('no-ops for null cfg', () => {
    setDecorationField(null, 0, 'x', 50);
  });
});

// ─── addFooterButton ───────────────────────────────────

describe('addFooterButton', () => {
  it('no-ops on null cfg', () => {
    addFooterButton(null);
    addFooterButton(undefined);
  });

  it('creates footer.buttons when footer is absent', () => {
    const cfg = {};
    addFooterButton(cfg);
    assert.ok(Array.isArray(cfg.footer.buttons));
    assert.equal(cfg.footer.buttons.length, 1);
  });

  it('pushes default button with correct shape', () => {
    const cfg = {};
    addFooterButton(cfg);
    assert.deepStrictEqual(cfg.footer.buttons[0], {
      text: '按钮', action: 'close', x: 0, y: 0,
    });
  });

  it('increments length on multiple adds', () => {
    const cfg = {};
    addFooterButton(cfg);
    addFooterButton(cfg);
    assert.equal(cfg.footer.buttons.length, 2);
  });
});

// ─── deleteFooterButton ────────────────────────────────

describe('deleteFooterButton', () => {
  it('removes button by index', () => {
    const cfg = { footer: { buttons: [{ text: 'a' }, { text: 'b' }] } };
    deleteFooterButton(cfg, 0);
    assert.equal(cfg.footer.buttons.length, 1);
    assert.equal(cfg.footer.buttons[0].text, 'b');
  });

  it('no-ops when buttons absent', () => {
    deleteFooterButton({ footer: {} }, 0);
    deleteFooterButton({}, 0);
  });

  it('no-ops on null cfg', () => {
    deleteFooterButton(null, 0);
  });
});

// ─── setFooterButtonField ──────────────────────────────

describe('setFooterButtonField', () => {
  it('sets action field', () => {
    const cfg = { footer: { buttons: [{ text: '按钮', action: 'close', x: 0, y: 0 }] } };
    setFooterButtonField(cfg, 0, 'action', 'reset');
    assert.equal(cfg.footer.buttons[0].action, 'reset');
  });

  it('sets text field', () => {
    const cfg = { footer: { buttons: [{ text: '按钮', action: 'close', x: 0, y: 0 }] } };
    setFooterButtonField(cfg, 0, 'text', '关闭');
    assert.equal(cfg.footer.buttons[0].text, '关闭');
  });

  it('sets position field', () => {
    const cfg = { footer: { buttons: [{ text: '按钮', action: 'close', x: 0, y: 0 }] } };
    setFooterButtonField(cfg, 0, 'x', 100);
    assert.equal(cfg.footer.buttons[0].x, 100);
  });

  it('no-ops for out-of-range index', () => {
    const cfg = { footer: { buttons: [{ text: '按钮' }] } };
    setFooterButtonField(cfg, 5, 'text', 'nope');
    assert.equal(cfg.footer.buttons[0].text, '按钮');
  });

  it('no-ops on null cfg', () => {
    setFooterButtonField(null, 0, 'text', 'nope');
  });
});
