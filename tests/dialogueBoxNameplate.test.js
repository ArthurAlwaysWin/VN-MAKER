/**
 * @vitest-environment jsdom
 */

/**
 * DialogueBox nameplate style unit tests
 *
 * Covers NAMEPLATE-01, NAMEPLATE-02, NAMEPLATE-03:
 *   - setNameplateStyle() accepts 'inline'|'floating'|'banner'
 *   - Invalid values fall back to 'inline'
 *   - show() applies correct nameplate-{style} CSS class
 *   - Name-plate hidden when speakerName is empty regardless of style
 *   - CSS injected once into document.head for non-inline styles
 *   - Inline style preserves current behavior (NAMEPLATE-01 backward compat)
 *
 * Run with: npx vitest run tests/dialogueBoxNameplate.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DialogueBox } from '../src/ui/DialogueBox.js';

// ─── Helpers ──────────────────────────────────────────────

function createContainer() {
  const container = document.createElement('div');
  container.id = 'dialogue-layer';
  document.body.appendChild(container);
  return container;
}

function showData(overrides = {}) {
  return { speakerName: 'Alice', text: 'Hello world', ...overrides };
}

// ─── Tests ────────────────────────────────────────────────

describe('DialogueBox nameplate styles', () => {
  let container;
  let db;

  beforeEach(() => {
    // Clean up DOM between tests
    document.body.innerHTML = '';
    document.head.querySelectorAll('style').forEach((s) => s.remove());
    container = createContainer();
    db = new DialogueBox(container);
  });

  // 1. Default _nameplateStyle is 'inline'
  it('defaults _nameplateStyle to inline', () => {
    expect(db._nameplateStyle).toBe('inline');
  });

  // 2. setNameplateStyle('floating') sets _nameplateStyle to 'floating'
  it('setNameplateStyle("floating") sets style to floating', () => {
    db.setNameplateStyle('floating');
    expect(db._nameplateStyle).toBe('floating');
  });

  // 3. setNameplateStyle('banner') sets _nameplateStyle to 'banner'
  it('setNameplateStyle("banner") sets style to banner', () => {
    db.setNameplateStyle('banner');
    expect(db._nameplateStyle).toBe('banner');
  });

  // 4. setNameplateStyle('invalid') falls back to 'inline'
  it('setNameplateStyle with invalid value falls back to inline', () => {
    db.setNameplateStyle('invalid');
    expect(db._nameplateStyle).toBe('inline');
  });

  // 5. show() with inline style → name-plate has class 'nameplate-inline'
  it('show() applies nameplate-inline class by default', () => {
    db.show(showData());
    const namePlate = db.nameEl.parentElement;
    expect(namePlate.classList.contains('nameplate-inline')).toBe(true);
    expect(namePlate.classList.contains('nameplate-floating')).toBe(false);
    expect(namePlate.classList.contains('nameplate-banner')).toBe(false);
  });

  // 6. show() with floating style → name-plate has class 'nameplate-floating'
  it('show() applies nameplate-floating class when style is floating', () => {
    db.setNameplateStyle('floating');
    db.show(showData());
    const namePlate = db.nameEl.parentElement;
    expect(namePlate.classList.contains('nameplate-floating')).toBe(true);
    expect(namePlate.classList.contains('nameplate-inline')).toBe(false);
    expect(namePlate.classList.contains('nameplate-banner')).toBe(false);
  });

  // 7. show() with banner style → name-plate has class 'nameplate-banner'
  it('show() applies nameplate-banner class when style is banner', () => {
    db.setNameplateStyle('banner');
    db.show(showData());
    const namePlate = db.nameEl.parentElement;
    expect(namePlate.classList.contains('nameplate-banner')).toBe(true);
    expect(namePlate.classList.contains('nameplate-inline')).toBe(false);
    expect(namePlate.classList.contains('nameplate-floating')).toBe(false);
  });

  // 8. show() without speakerName → name-plate hidden regardless of style
  it('hides name-plate when speakerName is empty regardless of style', () => {
    for (const style of ['inline', 'floating', 'banner']) {
      db.setNameplateStyle(style);
      db.show(showData({ speakerName: '' }));
      const namePlate = db.nameEl.parentElement;
      expect(namePlate.classList.contains('visible')).toBe(false);
    }
  });

  // 9. CSS is injected when non-inline style is set
  it('injects CSS into document.head for non-inline style', () => {
    const styleCountBefore = document.head.querySelectorAll('style').length;
    db.setNameplateStyle('floating');
    const styleCountAfter = document.head.querySelectorAll('style').length;
    expect(styleCountAfter).toBe(styleCountBefore + 1);
    expect(db._nameplateCssInjected).toBe(true);

    // Verify CSS content includes both floating and banner rules
    const injected = document.head.querySelector('style:last-of-type');
    expect(injected.textContent).toContain('nameplate-floating');
    expect(injected.textContent).toContain('nameplate-banner');
  });

  // 9b. CSS is NOT injected for inline style
  it('does not inject CSS when style is inline', () => {
    const styleCountBefore = document.head.querySelectorAll('style').length;
    db.setNameplateStyle('inline');
    const styleCountAfter = document.head.querySelectorAll('style').length;
    expect(styleCountAfter).toBe(styleCountBefore);
    expect(db._nameplateCssInjected).toBe(false);
  });

  // 9c. CSS is injected only once even when called multiple times
  it('injects CSS only once across multiple setNameplateStyle calls', () => {
    const styleCountBefore = document.head.querySelectorAll('style').length;
    db.setNameplateStyle('floating');
    db.setNameplateStyle('banner');
    db.setNameplateStyle('floating');
    const styleCountAfter = document.head.querySelectorAll('style').length;
    expect(styleCountAfter).toBe(styleCountBefore + 1);
  });

  // 10. NAMEPLATE-01: inline style produces same behavior as no setNameplateStyle call
  it('inline style matches behavior of never calling setNameplateStyle', () => {
    // Instance A: never calls setNameplateStyle
    const containerA = createContainer();
    const dbA = new DialogueBox(containerA);
    dbA.show(showData());

    // Instance B: explicitly sets inline
    const containerB = createContainer();
    const dbB = new DialogueBox(containerB);
    dbB.setNameplateStyle('inline');
    dbB.show(showData());

    const namePlateA = dbA.nameEl.parentElement;
    const namePlateB = dbB.nameEl.parentElement;

    // Both should have nameplate-inline class
    expect(namePlateA.classList.contains('nameplate-inline')).toBe(true);
    expect(namePlateB.classList.contains('nameplate-inline')).toBe(true);

    // Both should have visible class (speaker name present)
    expect(namePlateA.classList.contains('visible')).toBe(true);
    expect(namePlateB.classList.contains('visible')).toBe(true);

    // Neither should inject CSS
    expect(dbA._nameplateCssInjected).toBe(false);
    expect(dbB._nameplateCssInjected).toBe(false);
  });
});
