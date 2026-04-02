# Phase 16: Voice Editor Integration - Research

**Researched:** 2025-07-19
**Domain:** Vue 3 editor UI — voice picker, preview audio, batch file matching
**Confidence:** HIGH

## Summary

Phase 16 adds editor-side voice management to the existing PageInspector and SceneTree components. The codebase already has every pattern needed: AudioPicker for modal file selection, `new Audio()` for playback (as used by MiniPlayer), `pushState()` for undo-aware mutations, Teleport-to-body modals, and the `usePageEditor` provide/inject composable. No new libraries or external dependencies are required.

The primary work is: (1) extending AudioPicker with a `mode` prop to suppress the BGM/SE tab bar, (2) adding voice picker + ▶ preview button to PageInspector's dialogue editor section, (3) building a `useVoiceMatch.js` composable that scans `assetStore.files.audio` against the `{charId}_{sceneIdx}_{pageIdx}_{dlgIdx}` naming convention, (4) creating a VoiceMatchPreview.vue modal for confirming batch bindings, and (5) adding batch match entry points in SceneTree.

**Primary recommendation:** Follow existing codebase patterns exactly — no new libraries, no new architectural concepts. The core risk is getting the batch match algorithm's index mapping correct across scenes/pages/dialogues.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-04: AudioPicker adds `mode` prop. `mode="voice"` hides tab bar, changes title to "选择语音文件", fileList shows all audio/ files. emit path format unchanged: `audio/{filename}`
- D-05: Editor voice preview via `new Audio()` — no iframe dependency. Click ▶ plays, re-click or switch dialogue stops
- D-06: Dual-entry batch match — per-scene 🔊 in SceneTree + global button in toolbar. Core match function accepts scope (sceneId or 'all')
- D-07: Match preview dialog — confirm before applying. Shows summary: N new bindings, M already bound (skip/overwrite option). Vue modal (Teleport to body), no window.confirm

### Agent's Discretion
- Voice visual indicator in dialogue list (e.g. 🔊 icon) — agent decides style
- Batch match preview dialog layout — agent designs
- `setDialogueVoice()` pushState behavior — follow existing pattern (select = pushState, continuous = no pushState)
- Default dialogue value `{ speaker: null, text: '', expression: null, voice: null }` placement — agent decides

### Deferred Ideas (OUT OF SCOPE)
- Voice waveform visualization
- Voice file auto-rename tool (only matching, no renaming)

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOICE-02 | Inspector voice picker (select/clear voice file per dialogue) | AudioPicker mode prop + voice field editing in dialogue editor section |
| VOICE-03 | Editor voice preview — ▶ button plays bound voice, × clears binding | `new Audio()` with asset:// protocol, same pattern as MiniPlayer |
| VOICE-07 | Batch naming match — scan audio/ for `{charId}_{scene}_{page}_{line}` pattern | useVoiceMatch.js composable + VoiceMatchPreview.vue confirmation modal |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Style**: Dark theme, pure CSS, Chinese UI
- **Design**: Creator doesn't touch logic — engine handles all game logic
- **Compatibility**: Windows priority, macOS compatible
- **Editor**: Tab-based navigation (component :is + keep-alive), no vue-router
- **All imports use .js extensions explicitly**
- **Named exports only (no default exports)** for JS modules; Vue SFCs use implicit default via `<script setup>`
- **2-space indentation, single quotes, always semicolons**
- **Composables**: camelCase with `use` prefix in `src/editor/composables/`

## Standard Stack

### Core (already in project — no additions needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | Editor UI framework | Already used throughout |
| Pinia | ^3.0.4 | State management (script store, asset store) | Already used |
| Electron | ^41.0.4 | Desktop shell, asset:// protocol | Already used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| HTMLAudioElement (Web API) | Browser built-in | Voice preview playback | Editor ▶ button, `new Audio('asset://audio/file.mp3')` |

### No New Dependencies
This phase requires zero new npm packages. All functionality is achieved with existing Vue 3 APIs, browser built-in `Audio`, and the established asset:// protocol.

## Architecture Patterns

### Recommended File Structure
```
src/editor/
├── components/page-editor/
│   ├── AudioPicker.vue          # MODIFY: add mode prop
│   ├── PageInspector.vue        # MODIFY: voice picker + preview in dialogue editor
│   ├── SceneTree.vue            # MODIFY: batch match buttons (per-scene + global)
│   └── VoiceMatchPreview.vue    # NEW: batch match confirmation modal
├── composables/
│   └── useVoiceMatch.js         # NEW: batch matching logic
└── stores/
    ├── script.js                # MODIFY: voice: null in defaults
    └── assets.js                # READ ONLY: loadCategory('audio') for file list
```

### Pattern 1: AudioPicker Mode Prop
**What:** Add `mode` prop to AudioPicker controlling whether BGM/SE tab bar shows
**When to use:** When opening the picker for voice selection
**Example:**
```javascript
// AudioPicker.vue — props extension
const props = defineProps({
  visible: { type: Boolean, default: false },
  defaultTab: { type: String, default: 'bgm' },
  mode: { type: String, default: 'audio' },  // 'audio' | 'voice'
});

// Template conditionals
// <span class="picker-title">{{ mode === 'voice' ? '选择语音文件' : '选择音频' }}</span>
// <div class="tab-bar" v-if="mode !== 'voice'">
```

### Pattern 2: Voice Field in Dialogue Editor (follows existing form-group pattern)
**What:** Add voice picker + preview button after the expression select in dialogue-editor
**When to use:** Inside the `selectedDialogue` detail editor section
**Example:**
```html
<!-- After expression select, before content textarea -->
<div class="form-group">
  <label>语音</label>
  <div class="voice-field">
    <input type="text" :value="voiceDisplay" readonly
      placeholder="点击选择语音..." class="field-input"
      @click="showVoicePicker = true" />
    <button v-if="selectedDialogue.voice" class="voice-preview-btn"
      @click.stop="toggleVoicePreview" :title="isVoicePlaying ? '停止' : '试听'">
      {{ isVoicePlaying ? '⏹' : '▶' }}
    </button>
    <button v-if="selectedDialogue.voice" class="clear-btn"
      @click.stop="clearDialogueVoice" title="清除语音">✕</button>
  </div>
</div>
```

### Pattern 3: Editor Voice Preview (new Audio, matches D-05)
**What:** Standalone `new Audio()` for voice preview, independent of iframe/engine
**When to use:** When user clicks ▶ next to a voice-bound dialogue
**Example:**
```javascript
// In PageInspector.vue
let previewAudio = null;
const isVoicePlaying = ref(false);

function toggleVoicePreview() {
  if (isVoicePlaying.value) {
    stopVoicePreview();
    return;
  }
  const voice = selectedDialogue.value?.voice;
  if (!voice) return;
  stopVoicePreview();
  previewAudio = new Audio(`asset://${voice}`);
  previewAudio.play().catch(() => {});
  isVoicePlaying.value = true;
  previewAudio.addEventListener('ended', () => {
    isVoicePlaying.value = false;
  });
}

function stopVoicePreview() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.removeAttribute('src');
    previewAudio.load();
    previewAudio = null;
  }
  isVoicePlaying.value = false;
}

// CRITICAL: stop preview when switching dialogues
watch(() => editor.selectedDialogueIndex.value, () => stopVoicePreview());
```

### Pattern 4: Batch Match Composable (useVoiceMatch.js)
**What:** Pure function that scans audio file list against naming convention
**When to use:** Called from SceneTree via per-scene 🔊 button or global button
**Example:**
```javascript
// src/editor/composables/useVoiceMatch.js
import { useScriptStore } from '../stores/script.js';
import { useAssetStore } from '../stores/assets.js';

/**
 * Build match map: audio file → dialogue location
 * Naming: {characterId}_{sceneIndex}_{pageIndex}_{dialogueIndex}.{ext}
 * @param {string|'all'} scope — sceneId or 'all'
 * @returns {{ matches: Array, alreadyBound: number, newBindings: number }}
 */
export function useVoiceMatch() {
  const script = useScriptStore();
  const assets = useAssetStore();

  function buildMatches(scope) {
    const audioFiles = assets.files.audio || [];
    const scenes = script.data?.scenes || {};
    const sceneEntries = Object.entries(scenes);
    const matches = [];

    // Build lookup: filename (without extension) → full filename
    const fileLookup = new Map();
    for (const f of audioFiles) {
      const nameWithoutExt = f.replace(/\.[^.]+$/, '');
      fileLookup.set(nameWithoutExt, f);
    }

    sceneEntries.forEach(([sceneId, scene], sceneIdx) => {
      if (scope !== 'all' && scope !== sceneId) return;
      (scene.pages || []).forEach((page, pageIdx) => {
        if (page.type === 'choice') return;
        (page.dialogues || []).forEach((dlg, dlgIdx) => {
          const charId = dlg.speaker || '_narrator';
          const key = `${charId}_${sceneIdx}_${pageIdx}_${dlgIdx}`;
          const matchedFile = fileLookup.get(key);
          if (matchedFile) {
            matches.push({
              sceneId, sceneIdx, sceneName: scene.name,
              pageIdx, dlgIdx,
              speaker: dlg.speaker,
              text: dlg.text,
              file: matchedFile,
              path: `audio/${matchedFile}`,
              alreadyBound: dlg.voice === `audio/${matchedFile}`,
              hasExistingVoice: !!dlg.voice,
            });
          }
        });
      });
    });

    return {
      matches,
      alreadyBound: matches.filter(m => m.alreadyBound).length,
      newBindings: matches.filter(m => !m.alreadyBound).length,
    };
  }

  function applyMatches(matches, overwrite = false) {
    const scenes = script.data?.scenes;
    if (!scenes) return 0;
    const sceneEntries = Object.entries(scenes);
    let applied = 0;

    for (const m of matches) {
      const scene = sceneEntries[m.sceneIdx]?.[1];
      const dlg = scene?.pages?.[m.pageIdx]?.dialogues?.[m.dlgIdx];
      if (!dlg) continue;
      if (dlg.voice && !overwrite && !m.alreadyBound) continue;
      dlg.voice = m.path;
      applied++;
    }

    if (applied > 0) script.pushState();
    return applied;
  }

  return { buildMatches, applyMatches };
}
```

### Pattern 5: Teleport Modal for Match Preview (follows AudioPicker pattern)
**What:** VoiceMatchPreview.vue — confirmation dialog before batch apply
**When to use:** After buildMatches returns results, before applying
**Example structure:**
```html
<Teleport to="body">
  <div v-if="visible" class="voice-match-overlay" @click="onOverlayClick">
    <div class="voice-match-modal">
      <div class="picker-header">
        <span class="picker-title">批量语音匹配结果</span>
        <button class="picker-close" @click="$emit('close')">✕</button>
      </div>
      <div class="match-summary">
        <!-- Summary: N new, M already bound -->
      </div>
      <div class="match-list">
        <!-- Scrollable list of matches -->
      </div>
      <div class="picker-footer">
        <!-- Cancel / Apply (skip existing) / Apply (overwrite all) -->
      </div>
    </div>
  </div>
</Teleport>
```

### Pattern 6: SceneTree Batch Buttons
**What:** Add 🔊 button per scene header + global button in toolbar area
**When to use:** SceneTree.vue modification
**Example:**
```html
<!-- Per-scene button in scene-header, before ⋯ menu button -->
<button class="scene-voice-btn" @click.stop="onBatchMatchScene(sceneId)"
  title="批量语音匹配">🔊</button>

<!-- Global button in tree-footer area -->
<button class="footer-btn" @click.stop="onBatchMatchAll">🔊 批量语音匹配</button>
```

### Anti-Patterns to Avoid
- **Using iframe for preview**: D-05 explicitly says NO iframe dependency — use `new Audio()` directly
- **Mutating without pushState on select**: Voice picker selection is a discrete action (like expression select), so it MUST call `pushState()`. Only continuous input (typing, sliders) skips pushState
- **Using window.confirm for batch preview**: Electron doesn't fully support `prompt()`; use Vue modal with Teleport
- **Not cleaning up Audio objects**: Always `pause()` + `removeAttribute('src')` + `load()` before nulling (as MiniPlayer does in onBeforeUnmount)
- **Forgetting to update createDefaultPage() AND convertPageType()**: Both have hardcoded dialogue defaults that need `voice: null` added

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio file selection | Custom file browser | AudioPicker with `mode="voice"` prop | Already built, tested, has MiniPlayer preview |
| Audio playback | Custom player wrapper | `new Audio('asset://...')` | Built-in browser API, asset:// already supports Range requests |
| Undo integration | Custom undo tracking | `script.pushState()` | JSON snapshot undo/redo already handles full state |
| Modal overlay | Custom overlay system | `<Teleport to="body">` + scoped CSS | Pattern established by AudioPicker, works with z-index stacking |
| File list fetching | Manual IPC calls | `assetStore.loadCategory('audio')` → `assetStore.files.audio` | Cached, reactive, already used by AudioPicker |

## Common Pitfalls

### Pitfall 1: Forgetting voice: null in ALL default dialogue locations
**What goes wrong:** New dialogues lack the voice field, causing undefined access or serialization issues
**Why it happens:** The dialogue default `{ speaker: null, text: '', expression: null }` is hardcoded in TWO places: `createDefaultPage()` (line 101) and `convertPageType()` (line 172)
**How to avoid:** Search for `expression: null` in script.js and update BOTH locations to include `voice: null`
**Warning signs:** New dialogues show `undefined` in voice field, or voice isn't preserved after page type conversion

### Pitfall 2: Audio memory leak in voice preview
**What goes wrong:** `new Audio()` objects pile up, consuming memory and keeping connections open
**Why it happens:** Creating new Audio without properly releasing the previous one
**How to avoid:** Always call `stopVoicePreview()` before creating a new Audio. In stopVoicePreview: `pause()`, `removeAttribute('src')`, `load()`, then null the reference. Also clean up in `onBeforeUnmount`
**Warning signs:** Browser dev tools show growing media resource count

### Pitfall 3: pushState on continuous vs discrete operations
**What goes wrong:** Either undo history floods (pushState every keystroke) or undo doesn't capture voice changes
**Why it happens:** Misclassifying operation type
**How to avoid:** Voice selection from picker = discrete → call pushState. Voice clear via ✕ button = discrete → call pushState. There's no continuous voice input scenario in this phase
**Warning signs:** Ctrl+Z doesn't undo a voice binding, or Ctrl+Z requires many presses to undo one operation

### Pitfall 4: Batch match index calculation with filtered scenes
**What goes wrong:** Scene index doesn't match expected naming convention because `Object.entries()` order varies
**Why it happens:** `Object.entries(scenes)` returns keys in insertion order, but the naming convention uses positional indices
**How to avoid:** Use a consistent iteration: `Object.entries(scenes)` gives insertion order which is the display order in SceneTree. The sceneIndex in the filename must match this order (0-based)
**Warning signs:** Batch match finds 0 results even with correctly named files

### Pitfall 5: Not stopping voice preview when switching dialogues/pages
**What goes wrong:** Voice keeps playing from the previous dialogue while user edits a different one
**Why it happens:** No watcher on dialogue index changes
**How to avoid:** Watch `editor.selectedDialogueIndex` and `editor.selectedPageIndex` — call `stopVoicePreview()` on change
**Warning signs:** Audio plays from the wrong dialogue's voice file

### Pitfall 6: AudioPicker not refreshing file list for voice mode
**What goes wrong:** New audio files imported after initial load don't appear in voice picker
**Why it happens:** AudioPicker loads audio list only in onMounted
**How to avoid:** The existing `onMounted → loadCategory('audio')` should be sufficient since AudioPicker is re-mounted each time `visible` transitions. But verify that AudioPicker re-fetches when shown (watch `visible` → if true, loadCategory)
**Warning signs:** User imports voice files in resource library but they don't appear in voice picker

## Code Examples

### Example 1: setDialogueVoice function (PageInspector)
```javascript
// Source: follows established pattern from setDialogueExpression (line 393-396)
function setDialogueVoice(path) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.voice = path || null;
  script.pushState();  // discrete select → pushState
}

function clearDialogueVoice() {
  if (!selectedDialogue.value) return;
  stopVoicePreview();
  selectedDialogue.value.voice = null;
  script.pushState();
}
```

### Example 2: Voice indicator in dialogue list row
```html
<!-- Source: follows pattern from dlg-speaker-tag display -->
<span class="dlg-index">#{{ idx + 1 }}</span>
<span v-if="dlg.voice" class="dlg-voice-badge" title="已绑定语音">🔊</span>
<span class="dlg-speaker-tag" v-if="dlg.speaker">{{ getCharName(dlg.speaker) }}:</span>
```

### Example 3: Updated dialogue default (script.js)
```javascript
// createDefaultPage() — line 101
dialogues: [{ speaker: null, text: '', expression: null, voice: null }],

// convertPageType() — line 172
page.dialogues = [{ speaker: null, text: '', expression: null, voice: null }];
```

### Example 4: AudioPicker voice mode integration in PageInspector
```html
<!-- Voice picker modal (alongside existing AudioPicker) -->
<AudioPicker
  :visible="showVoicePicker"
  mode="voice"
  @select="onVoiceSelect"
  @close="showVoicePicker = false"
/>
```
```javascript
const showVoicePicker = ref(false);

function onVoiceSelect(path) {
  setDialogueVoice(path);
  showVoicePicker.value = false;
}
```

### Example 5: Batch match entry in SceneTree
```javascript
import { useVoiceMatch } from '../../composables/useVoiceMatch.js';
import { useAssetStore } from '../../stores/assets.js';

const { buildMatches } = useVoiceMatch();
const assetStore = useAssetStore();
const showMatchPreview = ref(false);
const matchResult = ref(null);

async function onBatchMatchScene(sceneId) {
  await assetStore.loadCategory('audio');
  matchResult.value = buildMatches(sceneId);
  if (matchResult.value.matches.length > 0) {
    showMatchPreview.value = true;
  } else {
    alert('未找到匹配的语音文件');
  }
}

async function onBatchMatchAll() {
  await assetStore.loadCategory('audio');
  matchResult.value = buildMatches('all');
  if (matchResult.value.matches.length > 0) {
    showMatchPreview.value = true;
  } else {
    alert('未找到匹配的语音文件');
  }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework in project) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-02 | Voice picker selects/clears voice file per dialogue | manual | Visual inspection — open inspector, select voice | N/A |
| VOICE-03 | ▶ button plays bound voice, ✕ clears | manual | Click ▶, verify playback in editor | N/A |
| VOICE-07 | Batch match scans and binds voice files | manual | Create test audio files with naming convention, run batch match | N/A |

### Sampling Rate
- **Per task commit:** Manual visual check that the feature works
- **Per wave merge:** Full manual walkthrough of all 3 requirements
- **Phase gate:** All 4 success criteria verified manually

### Wave 0 Gaps
- No test framework exists in project — all validation is manual
- Consider adding a simple test for `useVoiceMatch.buildMatches()` logic if test infra is set up in future

## Open Questions

1. **Narrator voice files in batch match**
   - What we know: Dialogues can have `speaker: null` (narrator). The naming convention uses `{characterId}_...`
   - What's unclear: What characterId should represent a narrator? CONTEXT suggests `_narrator` but this isn't explicitly confirmed
   - Recommendation: Use `_narrator` as the characterId for dialogues with null speaker. Document this convention in the UI

2. **Asset store audio list freshness for batch match**
   - What we know: `loadCategory('audio')` is async IPC call
   - What's unclear: Whether the cached list might be stale if user imported files right before running batch match
   - Recommendation: Always call `await assetStore.loadCategory('audio')` before running batch match to ensure freshness

## Sources

### Primary (HIGH confidence)
- `src/editor/components/page-editor/PageInspector.vue` — dialogue editor UI pattern, form-group structure, pushState usage
- `src/editor/components/page-editor/AudioPicker.vue` — modal structure, file list, MiniPlayer integration
- `src/editor/components/page-editor/SceneTree.vue` — scene tree structure, button placement patterns
- `src/editor/stores/script.js` — createDefaultPage, convertPageType, pushState
- `src/editor/stores/assets.js` — loadCategory, files.audio
- `src/editor/composables/usePageEditor.js` — provide/inject pattern, editor state
- `src/editor/components/resource-library/MiniPlayer.vue` — Audio cleanup pattern
- `src/engine/AudioManager.js` — voice channel implementation (upstream Phase 15)
- `.planning/phases/16-voice-editor-integration/16-CONTEXT.md` — all decisions D-04 through D-07

### Secondary (MEDIUM confidence)
- Naming convention `{charId}_{sceneIdx}_{pageIdx}_{dlgIdx}` — from CONTEXT.md D-06, well-defined but untested in practice

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, everything exists in codebase
- Architecture: HIGH — all patterns directly copied from existing components
- Pitfalls: HIGH — identified from reading actual code (dual default locations, Audio cleanup pattern, pushState rules)

**Research date:** 2025-07-19
**Valid until:** 2025-08-19 (stable — no external dependencies to change)
