# Testing Patterns

**Analysis Date:** 2025-07-15

## Test Framework

**Runner:** None configured

No testing framework, test runner, or test configuration files are present in this project. There are:
- No `jest.config.*`, `vitest.config.*`, or similar config files
- No `*.test.*` or `*.spec.*` files anywhere in the codebase
- No test-related dependencies in `package.json` (no jest, vitest, mocha, cypress, playwright, etc.)
- No test scripts in `package.json` `scripts` section
- No `__tests__/`, `tests/`, or `test/` directories

**Current `package.json` scripts:**
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

## Test Coverage

**Current Coverage:** 0% — No tests exist.

**Coverage Tools:** None configured.

## What Should Be Tested

### High-Priority: Engine Core (`src/engine/`)

These modules are pure JavaScript classes with no DOM dependencies (except `AudioManager`) and are highly testable:

**`src/engine/ScriptEngine.js`** — Core interpreter, most critical:
- Script loading and parsing
- Command execution flow (sequential advancement)
- Scene transitions via `_enterScene()`
- Choice selection and variable mutation in `selectChoice()`
- Condition evaluation in `_execCondition()` (all 6 operators)
- State serialization/restore via `getState()` / `restoreState()`
- Dialogue history tracking
- Event emission for each command type
- Edge cases: missing scenes, unknown command types, end of scene

**`src/engine/EventEmitter.js`** — Foundation for engine events:
- `on()` / `off()` / `emit()` subscribe/unsubscribe/dispatch
- Multiple listeners per event
- Removing specific listeners

**`src/engine/SaveManager.js`** — Save/load with localStorage:
- `save()` / `load()` / `delete()` slot operations
- `getAllSlots()` enumeration
- `hasAnySave()` detection
- Namespace isolation via `gameId`
- Requires localStorage mock

**`src/engine/ConfigManager.js`** — Configuration persistence:
- Default values fallback
- `get()` / `set()` operations
- Persistence to localStorage
- Corrupted storage recovery (try/catch in `_load()`)

### Medium-Priority: UI Components (`src/ui/`)

These are DOM-manipulating classes. Testable with jsdom/happy-dom:

**`src/ui/sanitize.js`** — Security-critical, highly testable:
- `sanitizeCssValue()` — must reject injection patterns, accept valid CSS
- `clamp()` — numeric clamping
- `clampField()` — field-specific bounds enforcement

**`src/ui/DialogueBox.js`** — Typewriter effect, click handling
**`src/ui/CharacterLayer.js`** — Sprite management, transitions
**`src/ui/ChoiceMenu.js`** — Choice rendering and selection
**`src/ui/BackgroundLayer.js`** — Background crossfade

### Lower-Priority: Editor Vue Components (`src/editor/`)

Vue components and stores need component testing:

**`src/editor/stores/script.js`** — Undo/redo history:
- `pushState()` snapshot creation
- `undo()` / `redo()` navigation
- History limit (50 max)
- `loadFromData()` initialization

**`src/editor/stores/project.js`** — Project CRUD:
- Requires IPC mocking (`window.ipcRenderer`)

**`src/editor/composables/useCanvasState.js`** — Pure computed logic:
- Scene state replay from commands
- `updateElementPosition()` mutations
- `findSourceCommand()` reverse search

### Electron Main Process (`electron/main.js`):

- IPC handler logic (project create/load/save)
- `isInsideProject()` path traversal guard
- `sanitizeProjectName()` input sanitization
- `atomicWrite()` file write safety
- Requires electron-specific test setup

## Recommended Testing Setup

### Framework Recommendation: Vitest

Vitest integrates naturally with the existing Vite build toolchain:

**Installation:**
```bash
npm install -D vitest @vue/test-utils happy-dom
```

**Configuration (`vitest.config.js`):**
```js
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.js', 'electron/**/*.test.js'],
  },
});
```

**Package.json scripts to add:**
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

### Suggested Test File Locations

Co-locate tests alongside source files:

```
src/engine/
├── ScriptEngine.js
├── ScriptEngine.test.js      ← Unit tests for engine
├── EventEmitter.js
├── EventEmitter.test.js
├── SaveManager.js
├── SaveManager.test.js
├── ConfigManager.js
├── ConfigManager.test.js
src/ui/
├── sanitize.js
├── sanitize.test.js           ← Critical security tests
├── DialogueBox.js
├── DialogueBox.test.js
src/editor/
├── stores/
│   ├── script.js
│   ├── script.test.js
│   ├── project.js
│   ├── project.test.js
├── composables/
│   ├── useCanvasState.js
│   ├── useCanvasState.test.js
electron/
├── main.js
├── main.test.js               ← IPC handler tests (extracted)
```

### Example Test Patterns

**Engine Unit Test (`src/engine/EventEmitter.test.js`):**
```js
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './EventEmitter.js';

describe('EventEmitter', () => {
  it('calls registered listener on emit', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('test', handler);
    emitter.emit('test', { value: 42 });
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('removes listener with off()', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('test', handler);
    emitter.off('test', handler);
    emitter.emit('test', {});
    expect(handler).not.toHaveBeenCalled();
  });
});
```

**Sanitization Test (`src/ui/sanitize.test.js`):**
```js
import { describe, it, expect } from 'vitest';
import { sanitizeCssValue, clamp, clampField } from './sanitize.js';

describe('sanitizeCssValue', () => {
  it('returns valid CSS strings', () => {
    expect(sanitizeCssValue('#ff0000')).toBe('#ff0000');
    expect(sanitizeCssValue('Noto Sans SC')).toBe('Noto Sans SC');
  });

  it('rejects injection attempts', () => {
    expect(sanitizeCssValue('red; background: url(evil)')).toBeUndefined();
    expect(sanitizeCssValue('expression(alert(1))')).toBeUndefined();
    expect(sanitizeCssValue('javascript:alert(1)')).toBeUndefined();
  });

  it('returns undefined for non-strings', () => {
    expect(sanitizeCssValue(42)).toBeUndefined();
    expect(sanitizeCssValue(null)).toBeUndefined();
  });
});

describe('clampField', () => {
  it('clamps x coordinate within bounds', () => {
    expect(clampField('x', 500)).toBe(500);
    expect(clampField('x', -500)).toBe(-300);
    expect(clampField('x', 2000)).toBe(1580);
  });

  it('uses generic bounds for unknown fields', () => {
    expect(clampField('unknown', 5000)).toBe(5000);
    expect(clampField('unknown', -20000)).toBe(-10000);
  });
});
```

**ScriptEngine Test (`src/engine/ScriptEngine.test.js`):**
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScriptEngine } from './ScriptEngine.js';

describe('ScriptEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ScriptEngine();
    engine.script = {
      meta: { title: 'Test', version: '1.0' },
      characters: {
        hero: { name: 'Hero', color: '#fff', expressions: {} },
      },
      scenes: {
        start: {
          name: 'Start',
          commands: [
            { type: 'dialogue', speaker: 'hero', text: 'Hello!' },
            { type: 'dialogue', speaker: null, text: 'Narrator text' },
            { type: 'end' },
          ],
        },
      },
    };
  });

  it('starts game at specified scene', () => {
    const handler = vi.fn();
    engine.on('scene_enter', handler);
    engine.startGame('start');
    expect(handler).toHaveBeenCalledWith({ sceneId: 'start', sceneName: 'Start' });
  });

  it('emits dialogue events with character data', () => {
    const handler = vi.fn();
    engine.on('dialogue', handler);
    engine.startGame('start');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      speaker: 'hero',
      speakerName: 'Hero',
      text: 'Hello!',
    }));
  });

  it('advances on next() and tracks history', () => {
    engine.startGame('start');
    expect(engine.history).toHaveLength(1);
    engine.next();
    expect(engine.history).toHaveLength(2);
  });

  it('serializes and restores state', () => {
    engine.startGame('start');
    const state = engine.getState();
    expect(state.currentScene).toBe('start');
    expect(state.commandIndex).toBe(0);

    const engine2 = new ScriptEngine();
    engine2.script = engine.script;
    engine2.restoreState(state);
    expect(engine2.currentScene).toBe('start');
  });
});
```

**Pinia Store Test (`src/editor/stores/script.test.js`):**
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useScriptStore } from './script.js';

describe('useScriptStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads data and creates initial history', () => {
    const store = useScriptStore();
    store.loadFromData({ scenes: {}, characters: {} });
    expect(store.data).toBeTruthy();
    expect(store.history).toHaveLength(1);
    expect(store.historyIndex).toBe(0);
  });

  it('supports undo/redo', async () => {
    const store = useScriptStore();
    store.loadFromData({ value: 1 });
    store.data.value = 2;
    store.pushState();
    expect(store.historyIndex).toBe(1);
    store.undo();
    expect(store.data.value).toBe(1);
    store.redo();
    expect(store.data.value).toBe(2);
  });
});
```

### Mocking Patterns

**localStorage Mock (for `SaveManager`, `ConfigManager`):**
```js
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  const store = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => Object.keys(store).forEach(k => delete store[k])),
  });
});
```

**Electron IPC Mock (for project store):**
```js
beforeEach(() => {
  vi.stubGlobal('window', {
    ...window,
    ipcRenderer: {
      invoke: vi.fn().mockResolvedValue({ success: true }),
      send: vi.fn(),
      on: vi.fn(),
    },
  });
});
```

**fetch Mock (for `ScriptEngine.load()`):**
```js
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockScript),
}));
```

## E2E Testing

**Not configured.** No Playwright or Cypress present.

For future E2E testing of the Electron app, consider:
- **Playwright** with `electron` fixture for the editor
- **Playwright** with a local dev server for the runtime engine in-browser

## Test Types Summary

| Type | Status | Priority | Tools Needed |
|------|--------|----------|-------------|
| Unit (engine) | ❌ Missing | **High** | vitest |
| Unit (sanitize) | ❌ Missing | **High** | vitest |
| Unit (stores) | ❌ Missing | **Medium** | vitest, pinia |
| Component (Vue) | ❌ Missing | **Medium** | vitest, @vue/test-utils, happy-dom |
| Integration (IPC) | ❌ Missing | **Low** | vitest, electron mocks |
| E2E (Electron) | ❌ Missing | **Low** | playwright |

---

*Testing analysis: 2025-07-15*
