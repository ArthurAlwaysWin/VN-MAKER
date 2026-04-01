# Phase 14: Editor Test Play - Research

**Researched:** 2026-04-02
**Domain:** iframe embedding, postMessage communication, engine preview mode, Vue conditional rendering
**Confidence:** HIGH

## Summary

Phase 14 embeds the game engine (index.html) inside the editor as an iframe to enable test play without leaving the editing workflow. The architecture is a bidirectional postMessage bridge between the Vue editor and the vanilla JS engine running in an iframe. The engine needs a new preview mode that: (a) skips its normal init flow (no title screen, no script fetch), (b) receives script data and start position via postMessage, (c) hides all game menu entries, and (d) uses `asset://` as base path for media resolution.

On the editor side, PageEditor.vue conditionally replaces PageCanvas with the iframe container, CanvasToolbar gains Play/Stop/Mute controls, and a floating overlay stop button sits absolutely positioned outside the iframe. The sidebar and inspector enter a read-only browsing mode during test play. The iframe is lazily preloaded (hidden) when the user switches to the game content tab, so first play is near-instant.

**Primary recommendation:** Split into two plans — Plan 1 handles engine-side preview mode (src/main.js postMessage listener + previewMode flag propagation to TitleScreen/GameMenu/SaveManager), Plan 2 handles editor-side integration (iframe lifecycle in App.vue/PageEditor.vue + toolbar controls + overlay button + read-only mode).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 使用 iframe 加载 index.html（引擎页面），完全隔离 CSS/JS，引擎零修改 CSS/JS scope
- **D-02:** 编辑器与 iframe 通过 postMessage 双向通信
- **D-03:** READY 握手协议 — 引擎加载完成后主动发 `{type:'ready'}` 消息，编辑器收到后才发启动指令，防止消息丢失
- **D-04:** iframe 懒预加载 — 不在编辑器启动时加载，而是在用户切到游戏内容 tab 时后台加载（hidden），首次试玩时引擎已就绪，秒开无等待
- **D-05:** 仅支持从当前编辑页面开始试玩
- **D-06:** 编辑器通过 postMessage 发送 `{type:'start', sceneId, pageIndex}` 告知引擎起始位置
- **D-07:** 试玩前编辑器通过 postMessage 将 `scriptStore.data` 的 JSON 深拷贝快照发给 iframe，引擎直接使用内存数据，不走磁盘 IO
- **D-08:** 必须传快照（`JSON.parse(JSON.stringify(data))`）而非 reactive 引用 — Vue Proxy 过 structured clone 会报错
- **D-09:** iframe 替换 PageEditor 的画布区域（PageCanvas 位置），侧栏（SceneTree）和 Inspector（PageInspector）保留显示
- **D-10:** 试玩期间侧栏和 Inspector 进入只读浏览模式 — 可点击查看其他页面内容，但不可编辑修改数据
- **D-11:** 引擎接受 `previewMode: true` 启动参数，隐藏所有游戏内菜单入口（ESC 菜单、存档/读档等）
- **D-12:** previewMode 由 postMessage 启动指令携带，引擎内部判断，编辑器不拦截键盘事件
- **D-13:** 双停止入口：工具栏按钮 + 叠层悬浮按钮
- **D-14:** 叠层按钮由编辑器在 iframe 外层用绝对定位叠加，引擎完全不感知此按钮
- **D-15:** 试玩时 BGM/SE 正常播放（iframe AudioContext 天然隔离）
- **D-16:** 工具栏提供 🔇 静音开关

### Agent's Discretion
- iframe 加载的具体 URL 和引擎初始化流程适配细节
- postMessage 消息协议的完整字段定义
- 懒预加载的具体触发时机（requestIdleCallback / tab 切换 / 其他）
- 只读模式的实现方式（CSS pointer-events / 条件渲染 / 状态标志）
- 工具栏试玩/停止按钮的具体图标和样式
- 叠层悬浮按钮的具体位置和动画

### Deferred Ideas (OUT OF SCOPE)
- 游戏 UI 组件视觉美化
- 从场景开头/游戏开头试玩
- 试玩中实时热更新编辑内容
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | 用户可一键从当前页面开始试玩 | CanvasToolbar Play button → postMessage {type:'start', sceneId, pageIndex, scriptData, previewMode:true} with deep-copy snapshot; usePageEditor provides selectedSceneId + selectedPageIndex |
| PLAY-02 | 试玩在编辑器内打开游戏预览（非独立窗口） | iframe loads index.html in PageCanvas position; engine enters preview mode (skip title, use asset:// basePath, receive data via postMessage) |
| PLAY-03 | 用户可随时停止试玩返回编辑器 | Dual stop: toolbar button + overlay floating button; sends {type:'stop'} or simply toggles isPlaying; engine cleanup restores standby state |
</phase_requirements>

## Architecture Patterns

### Overall Data Flow

```
Editor (Vue)                    iframe (Vanilla JS Engine)
─────────────                   ──────────────────────────
                                 index.html?preview=1
                                 ↓ src/main.js detects ?preview
                                 ↓ skips init() normal flow
                                 ↓ enters preview standby mode
                                 ↓ sends {type:'ready'}
         ←─── postMessage ────  
receives 'ready'
user clicks ▶ Play
scriptData = JSON.parse(
  JSON.stringify(scriptStore.data))
         ──── postMessage ────→ receives {type:'start',
{type:'start',                    sceneId, pageIndex,
 sceneId, pageIndex,              scriptData, previewMode:true}
 scriptData,                     ↓ engine.script = scriptData
 previewMode:true}               ↓ engine.restoreState({
                                     currentScene: sceneId,
                                     pageIndex, dialogueIndex:0})
                                 ↓ engine.resetRenderState()
                                 ↓ engine.renderCurrentPage()
                                 ↓ game plays normally...

user clicks ■ Stop
         ──── postMessage ────→ receives {type:'stop'}
{type:'stop'}                    ↓ engine stops, audio stops
                                 ↓ returns to standby
                                 ↓ sends {type:'ready'}
         ←─── postMessage ────
```

### Recommended Project Structure (new/modified files)

```
src/
├── main.js                          # MODIFY: add preview mode detection + postMessage listener
├── engine/
│   └── ScriptEngine.js              # NO CHANGE (restoreState + renderCurrentPage already exist)
├── ui/
│   ├── GameMenu.js                  # MINOR: hide when previewMode is active
│   └── TitleScreen.js               # NO CHANGE (simply not called in preview mode)
├── editor/
│   ├── App.vue                      # MODIFY: iframe lazy preload lifecycle
│   ├── views/
│   │   └── PageEditor.vue           # MODIFY: conditional PageCanvas vs iframe, overlay button
│   ├── composables/
│   │   └── usePageEditor.js         # MODIFY: add isPlaying, isReadOnly, isMuted refs + actions
│   └── components/
│       └── page-editor/
│           └── CanvasToolbar.vue     # MODIFY: add Play/Stop/Mute buttons
```

### Pattern 1: Engine Preview Mode (src/main.js)

**What:** Detect `?preview=1` URL parameter and enter a standby mode instead of normal init.
**When to use:** When index.html is loaded inside the editor iframe.

The engine's `src/main.js` currently has a monolithic `init()` function that fetches script, loads fonts, shows title screen. For preview mode, we need an entirely separate code path:

```javascript
// src/main.js — at the bottom, replace the simple init() call
const params = new URLSearchParams(window.location.search);
const isPreviewMode = params.has('preview');

if (isPreviewMode) {
  initPreview();
} else {
  init();
}

async function initPreview() {
  console.log('[GalgameMaker] Preview mode — waiting for editor...');
  
  // Hide game menu, quick controls in preview mode
  gameMenu.el.style.display = 'none';
  quickControls.style.display = 'none';
  
  // Listen for messages from editor
  window.addEventListener('message', async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;
    
    switch (msg.type) {
      case 'start':
        await startPreview(msg);
        break;
      case 'stop':
        stopPreview();
        break;
      case 'mute':
        setMuted(msg.muted);
        break;
    }
  });
  
  // Signal readiness to editor
  window.parent.postMessage({ type: 'ready' }, '*');
}

async function startPreview(msg) {
  // Set script data directly (no fetch)
  engine.script = msg.scriptData;
  
  // Load custom fonts if present
  if (engine.script.assets?.fonts?.length) {
    await loadAllFonts(engine.script.assets.fonts, 'asset://');
  }
  
  // Apply custom layouts if present
  if (engine.script.ui?.settingsScreen) {
    settingsScreen.setLayout(engine.script.ui.settingsScreen);
  }
  
  // Jump to requested position and render
  engine.restoreState({
    currentScene: msg.sceneId,
    pageIndex: msg.pageIndex ?? 0,
    dialogueIndex: 0,
    variables: {},
    history: [],
  });
  engine.resetRenderState();
  isPlaying = true;
  engine.renderCurrentPage();
}

function stopPreview() {
  isPlaying = false;
  stopAuto();
  stopSkip();
  audio.stopBgm({ fadeOut: 0 });
  audio.clear();
  engine.resetRenderState();
  characters.clear();
  background.clear();
  dialogueBox.hide();
  choiceMenu.hide();
  // Return to standby — ready for another play
  window.parent.postMessage({ type: 'ready' }, '*');
}

function setMuted(muted) {
  const master = config.get('masterVolume');
  audio.setBgmVolume(muted ? 0 : config.get('bgmVolume') * master);
  audio.setSeVolume(muted ? 0 : config.get('seVolume') * master);
}
```

**Confidence:** HIGH — `restoreState()`, `resetRenderState()`, `renderCurrentPage()` are verified in ScriptEngine.js lines 165-200. The engine already supports jumping to any scene+page.

### Pattern 2: Asset Path Resolution in iframe

**What:** The engine uses basePath for AudioManager, BackgroundLayer, CharacterLayer. In preview mode, paths must resolve via `asset://` protocol.
**When to use:** Always during iframe preview.

**Critical discovery:** The engine's UI components construct URLs as:
- `BackgroundLayer.setBackground()`: `url(${basePath}${data.image})` — e.g., `/game/backgrounds/sunset.png`
- `CharacterLayer.show()`: `${basePath}${data.image}` — e.g., `/game/characters/hero/happy.png`
- `AudioManager.playBgm()`: `${basePath}${data.file}` — e.g., `/game/audio/bgm1.mp3`

In normal mode, `/game/` is served by Vite dev server from `public/game/`. In preview mode, assets are in `projectPath/assets/`, accessible via the `asset://` protocol registered in Electron.

**Solution:** Detect `?preview` at the top of main.js and set basePath before component instantiation:

```javascript
const params = new URLSearchParams(window.location.search);
const isPreviewMode = params.has('preview');
const basePath = isPreviewMode ? 'asset://' : '/game/';

// Then use basePath everywhere:
const audio = new AudioManager(basePath);
const background = new BackgroundLayer(bgLayer, basePath);
const characters = new CharacterLayer(charLayer, basePath);
```

**Why this works:** The `asset://` protocol is registered globally in Electron (`electron/main.js` lines 10-16, handler at lines 614-674). When a project is open, `currentProjectPath` is set (line 219), so `asset://backgrounds/sunset.png` resolves to `projectPath/assets/backgrounds/sunset.png`. The iframe runs in the same Electron process, sharing the protocol handler.

**Confidence:** HIGH — protocol registration and basePath usage verified by code reading.

### Pattern 3: iframe URL Construction

**What:** The iframe src must point to index.html with `?preview=1` parameter.
**When to use:** When creating the preview iframe.

```javascript
function getPreviewUrl() {
  // Dev mode: Vite dev server
  if (window.location.protocol === 'http:') {
    return `${window.location.origin}/index.html?preview=1`;
  }
  // Production: index.html and editor.html are siblings in dist/
  return './index.html?preview=1';
}
```

Verified from `vite.config.js` lines 22-25: both `index.html` and `editor.html` are built as sibling entry points via `build.rollupOptions.input`. In dev mode, Vite serves both from `http://localhost:3000/`.

**Confidence:** HIGH — verified vite.config.js and electron/main.js URL patterns.

### Pattern 4: Read-Only Browsing Mode

**What:** During test play, sidebar and inspector remain visible but non-editable.
**When to use:** When isPlaying is true.

**Recommended approach:** Add `isReadOnly` computed to `usePageEditor` via the existing provide/inject. Child components check this flag to disable editing while preserving navigation:

```javascript
// usePageEditor.js
const isPlaying = ref(false);
const isReadOnly = computed(() => isPlaying.value);
```

```vue
<!-- SceneTree.vue — keep page click navigation, disable CRUD -->
<!-- Wrap CRUD buttons/menus with :disabled="editor.isReadOnly.value" -->
<!-- Disable drag reorder: :draggable="!editor.isReadOnly.value" -->

<!-- PageInspector.vue — disable all inputs -->
<input :readonly="editor.isReadOnly.value" ... />
<select :disabled="editor.isReadOnly.value" ... />
<button :disabled="editor.isReadOnly.value" ... />
```

For SceneTree, `onSelectPage()` should still work (browsing), but add/delete/reorder/rename should be disabled. The simplest approach: guard each CRUD function with `if (isReadOnly.value) return;`.

**Confidence:** HIGH — standard Vue pattern, usePageEditor already uses provide/inject (verified).

### Pattern 5: Mute via postMessage

**What:** Editor toolbar mute button sends mute/unmute commands to iframe.
**When to use:** When user clicks 🔇 toggle.

```javascript
// In usePageEditor or CanvasToolbar
function toggleMute(iframeEl) {
  isMuted.value = !isMuted.value;
  iframeEl?.contentWindow?.postMessage(
    { type: 'mute', muted: isMuted.value }, '*'
  );
}
```

AudioManager has `setBgmVolume(vol)` and `setSeVolume(vol)` which immediately affect playback (AudioManager.js lines 98-111). Setting to 0 effectively mutes.

**Confidence:** HIGH — verified AudioManager APIs.

### Pattern 6: Engine 'end' Event in Preview Mode

**What:** When the player reaches the last page, the engine fires `'end'`. In normal mode this triggers return-to-title. In preview mode, it should notify the editor.
**When to use:** When isPreviewMode is true and engine fires 'end'.

```javascript
// In initPreview(), override the end handler
engine.on('end', () => {
  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  // Notify editor that game ended
  window.parent.postMessage({ type: 'ended' }, '*');
});
```

Editor receives `{type:'ended'}` and auto-stops preview, returning to edit mode.

**Confidence:** HIGH — engine.on('end') pattern verified in main.js line 121.

### Anti-Patterns to Avoid

- **Sending reactive Vue objects via postMessage:** Vue Proxy objects fail `structuredClone()`. MUST use `JSON.parse(JSON.stringify(scriptStore.data))` before sending. Known issue from Phase 3A.
- **Relying on iframe load timing:** Never send postMessage immediately after setting iframe src. Always wait for the engine's `{type:'ready'}` message (D-03).
- **Modifying engine's existing init() flow:** Keep the normal init() completely untouched. Preview mode is an entirely separate code path.
- **Putting stop button inside iframe:** D-14 explicitly states the overlay button must be positioned by the editor OUTSIDE the iframe. Engine has no awareness of it.
- **Using `window.opener` or `window.parent.document`:** Stay with postMessage API only (D-02). Direct DOM access across frames violates isolation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iframe communication | Custom event system / shared memory | `window.postMessage` + `message` event | Standard web API, Electron-compatible, D-02 |
| Deep cloning reactive data | Manual recursive clone | `JSON.parse(JSON.stringify())` | Strips Proxy, handles nested objects, established pattern |
| Script jump to arbitrary page | Manual state reconstruction | `engine.restoreState()` + `resetRenderState()` + `renderCurrentPage()` | Already implemented in ScriptEngine.js lines 165-200 |
| Asset URL resolution | Custom path mapper | `asset://` protocol (already registered) | Handles path security, Range requests |
| Keyboard event isolation | Manual event interception in editor | iframe natural boundary | Keys inside iframe don't bubble to parent |
| Audio muting | Complex AudioContext manipulation | `AudioManager.setBgmVolume(0)` + `setSeVolume(0)` | Existing API, immediate effect |

**Key insight:** The engine already has all building blocks for preview: `restoreState()` for jumping to any position, `renderCurrentPage()` for rendering, and `resetRenderState()` for clearing stale diff state. No new engine logic is needed for playback — only a new init path and message listener.

## Common Pitfalls

### Pitfall 1: Race Condition on iframe Load
**What goes wrong:** Editor sends `{type:'start'}` before iframe's JS has loaded, message is lost, preview never starts.
**Why it happens:** iframe src is set, but the engine's JavaScript hasn't executed yet. postMessage has no built-in queue.
**How to avoid:** Implement the READY handshake (D-03). Editor MUST wait for `{type:'ready'}` from engine before sending any commands. Store a `previewReady` ref; only enable the Play button when `previewReady.value === true`.
**Warning signs:** Play button click does nothing; no console errors in iframe.

### Pitfall 2: Vue Proxy in postMessage
**What goes wrong:** `postMessage(scriptStore.data)` throws `DataCloneError: Failed to execute 'postMessage'`.
**Why it happens:** Vue 3's reactive() wraps objects in Proxy. The structuredClone algorithm used by postMessage cannot serialize Proxy objects.
**How to avoid:** Always use `JSON.parse(JSON.stringify(scriptStore.data))` before postMessage (D-08).
**Warning signs:** `DataCloneError` in console.

### Pitfall 3: Asset Path Mismatch Between Engine Modes
**What goes wrong:** Background/character images and audio fail to load, showing broken images or silent playback.
**Why it happens:** Normal engine uses `/game/` basePath (resolved by Vite from `public/game/`). In preview with a real project, assets are at `projectPath/assets/` accessible only via `asset://`.
**How to avoid:** Detect `?preview` and set `basePath = 'asset://'` BEFORE instantiating BackgroundLayer, CharacterLayer, AudioManager.
**Warning signs:** 404 errors for `/game/backgrounds/...` in iframe's DevTools network tab.

### Pitfall 4: Engine 'end' Event Shows Title in Preview
**What goes wrong:** Player reaches last page → title screen appears inside iframe.
**Why it happens:** Normal `end` handler (main.js line 128-134) calls `showTitle()` after 2 seconds.
**How to avoid:** In preview mode, replace the `end` handler: send `{type:'ended'}` to parent instead of showing title.
**Warning signs:** Title screen UI visible inside the preview iframe.

### Pitfall 5: ESC Key Opens GameMenu in Preview
**What goes wrong:** Pressing ESC during preview opens the GameMenu overlay inside iframe.
**Why it happens:** Engine keyboard handler (main.js line 239) toggles GameMenu on ESC.
**How to avoid:** In preview mode, hide GameMenu entirely (`gameMenu.el.style.display = 'none'`) and guard the ESC handler with `if (isPreviewMode) return`.
**Warning signs:** GameMenu panel appears inside iframe, blocks game interaction.

### Pitfall 6: Stale iframe State on Re-Play
**What goes wrong:** Second Play click shows characters or BGM from previous session.
**Why it happens:** `stopPreview()` cleanup missed some state (e.g., engine.script still holds old data, or characters not fully cleared).
**How to avoid:** `stopPreview()` must call ALL cleanup: `audio.clear()`, `characters.clear()`, `background.clear()`, `engine.resetRenderState()`, reset `isPlaying`, `autoMode`, `skipMode`. Each `startPreview()` then starts fresh.
**Warning signs:** Characters from previous play visible; wrong BGM continuing.

### Pitfall 7: iframe Lazy Preload Causes First-Play Lag
**What goes wrong:** First Play click has multi-second delay while iframe loads JS.
**Why it happens:** iframe wasn't preloaded, engine JavaScript needs parse + init time.
**How to avoid:** D-04: set iframe src when switching to game content tab. Wait for `{type:'ready'}`, then Play is instant. Show disabled/loading state on Play button until ready.
**Warning signs:** User perceives 1-3 second lag on very first Play click in a session.

## Code Examples

### Example 1: postMessage Protocol (Complete Specification)

```javascript
// ─── Messages FROM engine TO editor ───────────────
{ type: 'ready' }    // Engine initialized and waiting for start command
{ type: 'ended' }    // Game reached end (last page played, no more scenes)

// ─── Messages FROM editor TO engine ───────────────
{
  type: 'start',
  sceneId: 'start',      // string — scene key from script.scenes
  pageIndex: 0,           // number — index in scene.pages[]
  scriptData: { ... },    // object — deep copy of scriptStore.data
  previewMode: true,       // boolean — hide game menus
}
{ type: 'stop' }           // Stop preview, cleanup, return to standby
{ type: 'mute', muted: true }  // Toggle audio mute on/off
```

### Example 2: iframe Lazy Preload in App.vue

```javascript
// App.vue — manage iframe lifecycle
const previewIframe = ref(null);  // template ref to hidden iframe
const previewReady = ref(false);

// Preload iframe when user switches to game content tab
watch(activeTab, (tab) => {
  if (tab === 'scenes' && previewIframe.value && !previewIframe.value.src) {
    previewIframe.value.src = getPreviewUrl();
  }
});

function getPreviewUrl() {
  if (window.location.protocol === 'http:') {
    return `${window.location.origin}/index.html?preview=1`;
  }
  return './index.html?preview=1';
}

// Listen for messages from preview iframe
onMounted(() => {
  function onMessage(event) {
    const msg = event.data;
    if (!msg?.type) return;
    if (msg.type === 'ready') previewReady.value = true;
    if (msg.type === 'ended') {
      // Forward to PageEditor to auto-stop
    }
  }
  window.addEventListener('message', onMessage);
  // cleanup in onBeforeUnmount
});
```

```html
<!-- Hidden preload iframe in App.vue template -->
<iframe ref="previewIframe" class="preview-preload" />
```
```css
.preview-preload { display: none; }
```

### Example 3: Play/Stop/Mute Actions in usePageEditor

```javascript
// usePageEditor.js — new state and actions
const isPlaying = ref(false);
const isMuted = ref(false);
const isReadOnly = computed(() => isPlaying.value);

function startPlay(iframeEl) {
  if (!iframeEl?.contentWindow) return;
  const scriptData = JSON.parse(JSON.stringify(script.data));
  iframeEl.contentWindow.postMessage({
    type: 'start',
    sceneId: selectedSceneId.value,
    pageIndex: selectedPageIndex.value,
    scriptData,
    previewMode: true,
  }, '*');
  isPlaying.value = true;
}

function stopPlay(iframeEl) {
  if (iframeEl?.contentWindow) {
    iframeEl.contentWindow.postMessage({ type: 'stop' }, '*');
  }
  isPlaying.value = false;
  isMuted.value = false;
}

function toggleMute(iframeEl) {
  isMuted.value = !isMuted.value;
  if (iframeEl?.contentWindow) {
    iframeEl.contentWindow.postMessage({
      type: 'mute', muted: isMuted.value,
    }, '*');
  }
}
```

### Example 4: Conditional Canvas vs iframe in PageEditor.vue

```vue
<template>
  <div class="page-editor" v-if="script.data">
    <div class="sidebar">
      <SceneTree />
    </div>

    <div class="canvas-area">
      <CanvasToolbar />
      <!-- Normal editing mode -->
      <PageCanvas v-if="!editor.isPlaying.value" />
      <!-- Test play mode: iframe replaces canvas -->
      <div v-else class="preview-container">
        <iframe
          ref="previewFrame"
          class="preview-iframe"
          :src="previewUrl"
        ></iframe>
        <!-- Overlay stop button OUTSIDE iframe (D-14) -->
        <button class="preview-overlay-stop"
          @click="onStop" title="停止试玩">■</button>
      </div>
    </div>

    <div class="inspector">
      <PageInspector />
    </div>
    <!-- ... pickers unchanged ... -->
  </div>
</template>
```

```css
.preview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
}
.preview-overlay-stop {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 16px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}
.preview-overlay-stop:hover {
  background: rgba(180, 30, 30, 0.8);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}
```

### Example 5: CanvasToolbar Play/Stop/Mute Buttons

```vue
<template>
  <div class="canvas-toolbar">
    <!-- Existing content (hidden during play) -->
    <template v-if="!editor.isPlaying.value">
      <button class="add-char-btn" @click="editor.showCharPicker.value = true"
        :disabled="!editor.currentPage.value">
        + 添加角色
      </button>
      <span class="toolbar-sep"></span>
      <span class="toolbar-info" v-if="editor.currentPage.value">
        页面 {{ editor.selectedPageIndex.value + 1 }}
      </span>
    </template>

    <!-- Play/Stop/Mute controls -->
    <template v-if="editor.isPlaying.value">
      <button class="stop-btn" @click="$emit('stop')">■ 停止试玩</button>
      <span class="toolbar-sep"></span>
      <button class="mute-btn" @click="$emit('toggle-mute')"
        :title="editor.isMuted.value ? '取消静音' : '静音'">
        {{ editor.isMuted.value ? '🔇' : '🔊' }}
      </button>
    </template>
    <template v-else>
      <div class="toolbar-spacer"></div>
      <button class="play-btn" @click="$emit('play')"
        :disabled="!editor.currentPage.value || !previewReady">
        ▶ 试玩
      </button>
    </template>
  </div>
</template>
```

### Example 6: Engine-Side basePath Initialization (src/main.js top)

```javascript
// At the top of src/main.js, after imports
const params = new URLSearchParams(window.location.search);
const isPreviewMode = params.has('preview');
const basePath = isPreviewMode ? 'asset://' : '/game/';

// DOM references (unchanged)
const gameContainer = document.getElementById('game-container');
// ...

// Engine instances — use basePath
const engine = new ScriptEngine();
const audio = new AudioManager(basePath);
const saveManager = new SaveManager();
const config = new ConfigManager();

// UI instances — use basePath
const background = new BackgroundLayer(bgLayer, basePath);
const characters = new CharacterLayer(charLayer, basePath);
// ... rest unchanged

// At the bottom, branch init:
if (isPreviewMode) {
  initPreview();
} else {
  init();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate BrowserWindow preview (`open-preview` IPC) | iframe inside editor (inline preview) | This phase | Eliminates window switching, keeps editing context |
| Engine always fetches script.json from disk | Preview mode receives data via postMessage | This phase | Instant preview without disk IO |
| Engine always shows title screen + game menus | previewMode hides title/menus, starts directly | This phase | Clean minimal preview experience |

**Existing code that remains useful:**
- `App.vue openPreview()` (line 213-217): Opens separate BrowserWindow. Can remain as secondary "full preview" feature. No need to remove in this phase.
- `engine.restoreState()` + `renderCurrentPage()`: Already supports jumping to any page. Zero modification needed in ScriptEngine.js.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework configured in project) |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | Click Play → game starts from current page | manual-only | Visual: click ▶, verify game starts at correct page with correct background/characters | ❌ manual |
| PLAY-02 | Preview runs inline within editor | manual-only | Visual: verify iframe replaces canvas area, sidebar + inspector visible | ❌ manual |
| PLAY-03 | Stop returns to edit mode | manual-only | Visual: click ■, verify canvas restores, editing resumes from same page | ❌ manual |

**Justification for manual-only:** All behaviors require visual verification in a running Electron app with iframe interaction. No test framework exists, and setting up Playwright/Electron testing is out of scope for this phase.

### Wave 0 Gaps
None — manual verification is appropriate for this phase.

## Open Questions

1. **iframe Reuse vs Reload on Re-Play**
   - What we know: After stopping, the iframe can stay loaded (reuse) or be fully reloaded. D-04 implies keeping it loaded for instant re-play.
   - What's unclear: Whether engine state cleanup on `stop` is thorough enough across many play/stop cycles.
   - Recommendation: Keep iframe alive, reuse via stop→ready→start cycle. If bugs surface, fall back to `iframe.src = iframe.src` as nuclear reset.

2. **Engine 'end' UX in Preview Mode**
   - What we know: Normal mode shows title after 2s delay.
   - What's unclear: Exact desired behavior when preview reaches end.
   - Recommendation: Engine sends `{type:'ended'}` to editor. Editor auto-stops preview, returning to edit mode. Simple and matches user expectation of "test play finishes, back to editing."

3. **iframe Preload Management During Tab Switches**
   - What we know: D-04 says preload when switching to game content tab.
   - What's unclear: Whether to destroy/recreate iframe when switching away from game content tab.
   - Recommendation: Create iframe once on first switch to 'scenes' tab, keep it alive for entire session. Don't destroy on tab switch — it's lightweight when idle, and re-creation is expensive.

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Style**: Dark theme, pure CSS, Chinese UI labels
- **Naming**: PascalCase Vue SFCs, camelCase composables with `use` prefix, named exports only
- **Code style**: 2 spaces indentation, single quotes, semicolons, JSDoc on all modules
- **Error handling**: `{ success, error? }` returns for IPC, `console.error` with `[ModuleName]` prefix
- **Vue patterns**: `<script setup>`, Pinia stores, provide/inject for shared state
- **GSD workflow**: Do not make direct repo edits outside GSD workflow

## Sources

### Primary (HIGH confidence)
- `src/engine/ScriptEngine.js` — Verified restoreState(), resetRenderState(), renderCurrentPage() APIs (lines 165-200)
- `src/main.js` — Verified init flow (lines 382-421), event wiring (lines 92-150), engine end handler (lines 121-135), keyboard handler (lines 230-263)
- `electron/main.js` — Verified asset:// protocol registration (lines 10-16, 614-674), open-preview handler (lines 540-561), currentProjectPath management (line 18, 219)
- `src/editor/views/PageEditor.vue` — Verified 3-column layout: sidebar + canvas-area (CanvasToolbar + PageCanvas) + inspector
- `src/editor/composables/usePageEditor.js` — Verified selectedSceneId, selectedPageIndex, provide/inject with Symbol key
- `src/editor/App.vue` — Verified tab system (lines 77-91), existing openPreview (lines 213-217), activeTab watch pattern
- `src/editor/stores/script.js` — Verified scriptStore.data, JSON.parse/stringify used in undo/redo
- `src/editor/components/page-editor/CanvasToolbar.vue` — Verified existing structure (32px height, button + info layout)
- `src/editor/components/page-editor/PageCanvas.vue` — Verified canvas-wrapper flex:1 structure, artboard scaling
- `vite.config.js` — Verified dual entry points: index.html + editor.html as rollup inputs
- `src/ui/BackgroundLayer.js` — Verified `url(${basePath}${data.image})` pattern (line 31)
- `src/ui/CharacterLayer.js` — Verified `${basePath}${data.image}` pattern (line 35)
- `src/engine/AudioManager.js` — Verified `${basePath}${data.file}` pattern (line 43), setBgmVolume/setSeVolume (lines 98-111)
- `src/ui/GameMenu.js` — Verified structure; `el.style.display = 'none'` hides entirely
- `src/engine/SaveManager.js` — Verified localStorage-based, not needed in preview mode

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all uses existing browser and project APIs
- Architecture: HIGH — all integration points verified by reading source, engine has exact APIs needed
- Pitfalls: HIGH — Vue Proxy issue is documented project history, iframe timing is well-understood, asset path issue verified by tracing basePath through 3 UI components

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable — no external dependencies changing)
