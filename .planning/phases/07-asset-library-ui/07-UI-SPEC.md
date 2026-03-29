# UI-SPEC: Phase 7 — Asset Library UI

**Phase:** 07 - Asset Library UI
**Status:** draft
**Created:** 2026-03-29
**Design System:** Manual (Pure CSS, no component library)
**Language:** Chinese (中文 UI)

---

## 1. Design Tokens

### 1.1 Color Palette

All colors inherited from existing codebase. No new colors introduced.

| Token | Value | Usage | 60/30/10 |
|-------|-------|-------|----------|
| `--bg-body` | `#1e1e1e` | Main workspace background, thumbnail well | 60% dominant |
| `--bg-deep` | `#111` | Sidebar border, recessed areas | 60% dominant |
| `--bg-card` | `#252526` | Asset cards, sidebar, list items, audio rows | 30% secondary |
| `--bg-hover` | `#2a2d2e` | Hover state for list items and cards | 30% secondary |
| `--bg-active` | `#37373d` | Active/selected list item background | 30% secondary |
| `--bg-input` | `#3c3c3c` | Text inputs, inline edit fields | 30% secondary |
| `--border` | `#333` | Card borders, section dividers, input borders | — |
| `--border-input` | `#555` | Input field borders | — |
| `--accent` | `#007acc` | Active tab, card hover border, accent buttons, drop overlay | 10% accent |
| `--accent-hover` | `#0587d9` | Accent button hover | 10% accent |
| `--confirm` | `#0e633c` | Import/add buttons (primary CTA) | 10% accent |
| `--confirm-hover` | `#117748` | Import/add button hover | 10% accent |
| `--destructive` | `#a22` | Delete buttons, error text | Semantic only |
| `--text-primary` | `#ccc` | Body text, filenames | — |
| `--text-heading` | `#fff` | Section headings, active tab text | — |
| `--text-secondary` | `#888` | Empty state text, inactive tab text | — |
| `--text-muted` | `#555` | Placeholder text, disabled elements | — |
| `--text-label` | `#aaa` | Form labels | — |

**Accent reserved for:** Active sub-tab indicator, card hover border, drop zone overlay background, inline play button, character active-selection left border.

### 1.2 Typography

Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif` (inherited from `base.css`).

| Role | Size | Weight | Line-height | Usage |
|------|------|--------|-------------|-------|
| View heading | 20px | 500 | 1.2 | "资源库" toolbar title |
| Section heading | 16px | 400 | 1.3 | "表情列表", section headers |
| Body / UI | 14px | 400 | 1.5 | List items, filenames, form inputs, audio filename |
| Caption / Small UI | 12px | 400 | 1.4 | Sub-tab labels, thumbnail labels, form labels, button captions, duration text, menu items, notification text |

**4 sizes, 2 weights.** 400 (regular) and 500 (medium, headings only). Previous 13px sub-tab size merged into 12px — the 1px difference provided no meaningful visual distinction.

### 1.3 Spacing

8-point grid base, matching existing codebase patterns. Non-grid legacy values documented in Legacy Exceptions below.

| Token | Value | Usage |
|-------|-------|-------|
| `--sp-4` | 4px | Inline element gaps, border-radius (small) |
| `--sp-8` | 8px | Card padding, thumbnail padding, component internal gaps |
| `--sp-12` | 12px | Toolbar gaps, empty state vertical gaps |
| `--sp-16` | 16px | Grid gap, button horizontal padding, section padding |
| `--sp-20` | 20px | View padding, form group bottom margin |
| `--sp-24` | 24px | Section separations |
| `--sp-40` | 40px | Editor pane horizontal padding, expression section top margin |

#### Legacy Exceptions (non-grid values)

The following values are **not** multiples of 4. They are inherited from existing `Assets.vue` / `Characters.vue` CSS and must be preserved to avoid visual inconsistency with unchanged views elsewhere in the application.

| Value | Justification | Where Used |
|-------|---------------|------------|
| 2px | Inherited from existing `.tabs` button group `gap: 2px` and inline icon margins in Assets.vue. Too small for 4px (would over-space connected buttons). | Tab bar gap, icon margins, inline edit padding |
| 6px | Inherited from existing `.tabs button` `padding: 6px 16px` in Assets.vue and established `border-radius: 6px` on cards. Changing to 4px or 8px would break visual match with other views. | Button padding-block, card/section/context-menu border-radius |
| 10px | Inherited from existing `Characters.vue` list item `padding: 10px 12px` and audio player `gap: 10px`. Changing to 8px or 12px would alter list density relative to existing character view. | Character list item padding-block, color picker row gap, mini player gap |

These values are exempt from the 8-point grid rule. All **new** spacing decisions in this phase use grid-aligned values only.

### 1.4 Border Radius

| Size | Value | Usage |
|------|-------|-------|
| Small | 4px | Buttons, inputs, inline edit fields, list item corners |
| Medium | 6px | Cards, sections, tab corners (top), context menu |
| Circle | 50% | Play/pause button, character avatar |

### 1.5 Transitions

| Property | Duration | Easing | Usage |
|----------|----------|--------|-------|
| `border-color` | 200ms | ease | Card hover border |
| `background` | 150ms | ease | Button/item hover |
| `opacity` | 200ms | ease | Drop overlay show/hide |
| `transform` | 200ms | ease-out | Drop overlay scale entrance |

---

## 2. Layout Architecture

### 2.1 Top-Level: App.vue Tab Change

**Before (6 tabs):**
```
🎬 游戏内容 | 🖼️ 标题页 | ⚙️ 设置页 | 🎨 素材库 | 👤 角色 | 📦 项目设置
```

**After (5 tabs):**
```
🎬 游戏内容 | 🖼️ 标题页 | ⚙️ 设置页 | 📦 资源库 | ⚡ 项目设置
```

- Remove `assets` and `characters` tab entries
- Add `resource-library` tab: `{ id: 'resource-library', icon: '📦', label: '资源库' }`
- Map to new `ResourceLibrary.vue` component

### 2.2 ResourceLibrary.vue — Master Layout

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: "资源库" title  │  [🖼️ 背景][👤 角色][🎵 音频][🔤 字体]  │  [📂 导入文件] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  <SubTabContent />                                      │
│  (varies by active sub-tab — see sections below)        │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Full height flex column layout: `display: flex; flex-direction: column; height: 100%; padding: 20px;`
- Toolbar: `display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;`
- Sub-tab buttons: Connected button group (matching existing `.tabs` pattern from Assets.vue)
- Import button: Only visible for 背景, 音频, 字体 tabs. Hidden for 角色 tab (角色 has its own "+" and expression import).

### 2.3 Sub-Tab Button Group

Reuse the existing `.tabs` connected button group pattern exactly:

```css
.sub-tabs button {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 6px 16px;
  margin-left: -1px;
  cursor: pointer;
  font-size: 12px;
}
.sub-tabs button:first-child { border-radius: 4px 0 0 4px; }
.sub-tabs button:last-child { border-radius: 0 4px 4px 0; }
.sub-tabs button.active {
  background: #007acc;
  color: #fff;
  border-color: #007acc;
  z-index: 1;
  position: relative;
}
```

### 2.4 Backgrounds Sub-Tab — Thumbnail Grid

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │
│ │ IMG  │ │ │ │ IMG  │ │ │ │ IMG  │ │ │ │ IMG  │ │
│ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │
│ filename │ │ filename │ │ filename │ │ filename │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; overflow-y: auto; align-content: start;`
- Card: `background: #252526; border: 1px solid #333; border-radius: 6px; overflow: hidden;`
- Card hover: `border-color: #007acc;`
- Thumbnail well: `height: 100px; background: #1e1e1e; display: flex; align-items: center; justify-content: center; padding: 8px;`
- Image: `max-width: 100%; max-height: 100%; object-fit: contain;`
- Filename: `padding: 8px; font-size: 12px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid #333; color: #ccc;`
- Image source: `asset://backgrounds/{filename}`

### 2.5 Characters Sub-Tab — Sidebar + Editor Layout

```
┌──────────────┬──────────────────────────────────────┐
│ Sidebar      │ Editor Pane                          │
│ (240px)      │                                      │
│              │ Name: [________]                     │
│ ┌──────────┐ │ Color: [■ #ff9999] [________]       │
│ │ 🧑 Avatar│ │                                      │
│ │ sakura   │ │ ┌─ 表情列表 ─────── [+ 导入表情] ─┐ │
│ └──────────┘ │ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │ │
│ ┌──────────┐ │ │ │IMG │ │IMG │ │IMG │ │IMG │    │ │
│ │ 🧑 Avatar│ │ │ │    │ │    │ │    │ │    │    │ │
│ │ hero     │ │ │ └────┘ └────┘ └────┘ └────┘    │ │
│ └──────────┘ │ │ normal  smile  angry  sad       │ │
│              │ └─────────────────────────────────┘ │
│ [+ 新角色]   │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Sidebar (240px):**
- Container: `width: 240px; background: #252526; border-right: 1px solid #111; display: flex; flex-direction: column;`
- Header: `padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;`
- Header title: `font-size: 14px; font-weight: 400; color: #ccc;`
- "+" button: `background: #007acc; color: white; border: none; width: 24px; height: 24px; border-radius: 4px;` — **must include `aria-label="创建角色"`** (icon-only button, no visible text label).
- Character list item: `padding: 10px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid #333;`
- Item hover: `background: #2a2d2e;`
- Item active: `background: #37373d; border-left: 3px solid #007acc;`

**Character Avatar (in sidebar list):**
- Container: `width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #1e1e1e; flex-shrink: 0;`
- Image: `width: 100%; height: 100%; object-fit: cover; object-position: top;` (D-04: crops top half of first expression)
- Fallback (no expressions): show emoji 👤 centered in circle, `font-size: 18px; color: #555;`

**Character Name (in sidebar):**
- `font-size: 14px; color: #ccc;`

**"+ 新角色" button (sidebar footer):**
- `padding: 12px; border-top: 1px solid #333; text-align: center;`
- Button: `background: transparent; border: 1px dashed #555; color: #888; padding: 8px; width: 100%; border-radius: 4px; cursor: pointer; font-size: 12px;`
- Hover: `border-color: #007acc; color: #ccc;`

**Editor Pane:**
- Container: `flex: 1; padding: 20px 40px; overflow-y: auto;`
- Form group: `margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;`
- Label: `font-size: 12px; color: #aaa;`
- Text input: `background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 8px 10px; border-radius: 4px;`
- Color picker row: `display: flex; gap: 10px; align-items: center;` with `input[type=color]` + hex text input (matching Characters.vue existing pattern)

**Expression Grid (inside editor pane):**
- Section container: `margin-top: 24px; background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 20px;`
- Section header: `display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;`
- Section title: `font-size: 16px; font-weight: 400; color: #ccc;`
- Import button: `background: #0e633c; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px;`
- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px;`
- Expression card: `background: #252526; border: 1px solid #333; border-radius: 6px; overflow: hidden; cursor: pointer;`
- Expression thumbnail: `height: 80px; background: #1e1e1e; display: flex; align-items: center; justify-content: center; padding: 4px;`
- Expression image: `max-width: 100%; max-height: 100%; object-fit: contain;`
- Expression name: `padding: 6px 8px; font-size: 12px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid #333;`
- Expression card hover: `border-color: #007acc;`

### 2.6 Audio Sub-Tab — List with Mini Player

```
┌─────────────────────────────────────────────────────┐
│ 🎵 filename.mp3  │  [▶] ━━━━━━━━●━━━━━━  1:23/3:45 │
├─────────────────────────────────────────────────────┤
│ 🎵 bgm-02.ogg   │  [▶] ━━━━━━━━━━━━━━━━  0:00/2:10 │
├─────────────────────────────────────────────────────┤
│ 🎵 effect.wav    │  [▶] ━━━━━━━━━━━━━━━━  0:00/0:03 │
└─────────────────────────────────────────────────────┘
```

- List container: `display: flex; flex-direction: column; gap: 8px; overflow-y: auto;`
- Row: `display: flex; align-items: center; gap: 12px; background: #252526; padding: 12px 16px; border-radius: 6px; border: 1px solid #333;`
- Row hover: `border-color: #444;`
- Icon: `font-size: 16px; flex-shrink: 0;` (emoji 🎵)
- Filename: `flex: 0 0 auto; max-width: 200px; font-size: 14px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

**Mini Player (D-09):**
- Container: `display: flex; align-items: center; gap: 10px; flex: 1;`
- Play/Pause button: `width: 28px; height: 28px; border-radius: 50%; background: #007acc; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;`
- Play/Pause hover: `background: #0587d9;`
- Play icon: `▶` (Unicode &#9654;) / Pause icon: `⏸` (Unicode &#9208;)
- Progress bar track: `flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; cursor: pointer; position: relative;`
- Progress bar fill: `height: 100%; background: #007acc; border-radius: 2px; transition: width 100ms linear;`
- Progress bar thumb (on hover): `width: 12px; height: 12px; border-radius: 50%; background: #fff; position: absolute; top: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 150ms;`
- Track hover → thumb visible: `opacity: 1;`
- Duration text: `font-size: 12px; color: #888; white-space: nowrap; flex-shrink: 0; min-width: 80px; text-align: right; font-variant-numeric: tabular-nums;`
- Duration format: `m:ss / m:ss` (e.g. `1:23 / 3:45`)

### 2.7 Fonts Sub-Tab — Preview Grid

```
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ 你好世界 AaBbCc 1234         │ │ 你好世界 AaBbCc 1234         │
│ ─────────────────────────── │ │ ─────────────────────────── │
│ MyFont.ttf                   │ │ NotoSerifSC.otf              │
└──────────────────────────────┘ └──────────────────────────────┘
```

- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; overflow-y: auto; align-content: start;`
- Card: `background: #252526; border: 1px solid #333; border-radius: 6px; overflow: hidden; padding: 0;`
- Card hover: `border-color: #007acc;`
- Preview area: `padding: 20px 16px; font-size: 20px; color: #e0e0e0; line-height: 1.4;` — applies the loaded `font-family` dynamically via `:style="{ fontFamily: font.family }"`
- Preview text: `你好世界 AaBbCc 1234` (ASSET-13, fixed sample string)
- Filename bar: `padding: 8px 16px; font-size: 12px; color: #888; border-top: 1px solid #333; background: #1e1e1e;`

### 2.8 Visual Focal Points

Each sub-tab view has one primary focal point — the element the user's eye should land on first.

| Sub-Tab | Primary Focal Point | Mechanism |
|---------|---------------------|-----------|
| 背景 (Backgrounds) | Thumbnail grid | Largest visual mass; images draw attention over chrome. Empty state: centered icon + CTA. |
| 角色 (Characters) | Editor pane — selected character's expression grid | Right pane occupies ~70% width; colorful expression thumbnails attract focus. Empty state: centered prompt to select/create. |
| 音频 (Audio) | First audio row's play button | Blue accent circle is the only saturated element in the neutral list. Empty state: centered icon + CTA. |
| 字体 (Fonts) | Font preview sample text area | Large 20px rendered text in custom font is visually dominant over 12px filename bar. Empty state: centered icon + CTA. |

---

## 3. Interactive States & Behaviors

### 3.1 Inline Rename (D-15)

Applies to: background filenames, audio filenames, font filenames, expression names.

**Trigger:** Double-click on filename text.

**Edit mode:**
- Replace `<span>` with `<input type="text">` styled to match surrounding context:
  - `background: #3c3c3c; border: 1px solid #007acc; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: inherit; outline: none;`
- Input is auto-focused and text is fully selected on activation.
- Confirm: `Enter` key or blur (focus-out).
- Cancel: `Escape` key — restores original value.
- Validation: Strip leading/trailing whitespace. Reject empty names. Preserve file extension (user edits name only, extension is read-only).

**Visual feedback:**
- Editing state: blue border on input (#007acc).
- On save success: return to normal display.
- On validation error: flash red border (`#a22`) for 1 second, revert to original value.

### 3.2 Right-Click Context Menu (D-06)

Applies to: expression thumbnails, background cards, audio rows, font cards.

**Implementation:** Custom CSS context menu (not Electron native menu — matches dark theme).

**Appearance:**
- Container: `position: fixed; z-index: 1000; background: #252526; border: 1px solid #444; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); padding: 4px 0; min-width: 140px;`
- Menu item: `padding: 8px 16px; font-size: 12px; color: #ccc; cursor: pointer;`
- Menu item hover: `background: #007acc; color: #fff;`
- Destructive item (删除): `color: #e66;`
- Destructive item hover: `background: #a22; color: #fff;`
- Separator: `height: 1px; background: #444; margin: 4px 8px;`

**Menu items for expressions:**
1. `重命名` — activates inline rename on expression name
2. `───` (separator)
3. `删除` — triggers delete confirmation (D-14)

**Menu items for assets (backgrounds/audio/fonts):**
1. `重命名` — activates inline rename on filename
2. `───` (separator)
3. `删除` — triggers delete confirmation (D-14)

**Dismiss behavior:** Click anywhere outside menu, or press `Escape`.

### 3.3 Delete Confirmation (D-14)

**Mechanism:** Electron native dialog via `window.ipcRenderer.invoke('show-message-box', {...})` or `confirm()` matching existing codebase pattern.

**Dialog content:**
- Type: `warning`
- Title: `确认删除`
- Message (assets): `确定要删除 "{filename}" 吗？`
- Message (character): `确定要删除角色 "{name}" 吗？该角色的所有表情数据也会被移除。`
- Message (expression): `确定要删除表情 "{exprName}" 吗？`
- Buttons: `['取消', '删除']`
- Default button: `0` (取消)
- Cancel button: `0` (取消)

**Post-delete:** Remove item from UI immediately after successful IPC call. Refresh file list for the category.

### 3.4 Drag-Drop Import Overlay (D-11)

**Trigger:** `dragenter` on the ResourceLibrary view (or any descendant).

**Overlay appearance:**
- Container: `position: absolute; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; pointer-events: none;`
- Background: `background: rgba(0, 122, 204, 0.15);` (blue translucent from #007acc)
- Border: `border: 3px dashed #007acc;` (inset of overlay)
- Text: `"释放以导入文件"` — `font-size: 20px; color: #fff; font-weight: 500;`
- Sub-text: `"文件将导入到「{当前分类名}」"` — `font-size: 14px; color: rgba(255,255,255,0.6);`

**Show animation:** `opacity 0→1` over 200ms.
**Hide:** On `dragleave` (with debounce to avoid flicker on child element boundary crossings) or `drop`.

**Drop behavior:**
- Read dropped files via `DataTransfer` API.
- Import target = current active sub-tab category (D-12).
- Call `assets.importAssets(category, fileDataArray)`.
- Show import result notification (D-13).

### 3.5 Import Result Notification (D-13)

**Appears:** After batch import (drag-drop or file picker multi-select).

**Implementation:** Inline notification bar at top of content area (below toolbar), auto-dismiss after 5 seconds.

**Success (all files imported):**
- `background: rgba(14, 99, 60, 0.15); border: 1px solid rgba(14, 99, 60, 0.4); border-radius: 4px; padding: 10px 16px; color: #8fdf8f; font-size: 12px;`
- Text: `"成功导入 {N} 个文件"`

**Partial success (some files failed):**
- `background: rgba(170, 34, 34, 0.15); border: 1px solid rgba(170, 34, 34, 0.4); border-radius: 4px; padding: 10px 16px; color: #e88; font-size: 12px;`
- Text: `"已导入 {N} 个文件，{M} 个文件导入失败："`
- Failed file list: each filename on its own line, `color: #e88; font-size: 12px; margin-left: 16px;`
- Reason per file: `"— {filename}: 不支持的格式"` (from Phase 6 validation errors)

**Dismiss:** Click × button or auto-dismiss after 5 seconds.

### 3.6 Audio Playback (D-09, D-10)

**Behavior:**
- Only one audio can play at a time. Starting a new audio pauses any currently playing audio.
- Click play button → load audio from `asset://audio/{filename}`, start playback, icon changes to ⏸.
- Click pause button → pause playback, icon changes to ▶.
- Progress bar updates in real-time via `timeupdate` event on HTMLAudioElement.
- Click/drag on progress bar → seek to position (`audio.currentTime = ...`).
- On audio end → reset to start position, icon returns to ▶.
- Duration displays `0:00 / 0:00` until audio metadata loads, then updates to actual duration.

### 3.7 Character Avatar (D-04)

**Image source:** First key in `character.expressions` object → use `asset://characters/{path}`.

**Crop:** CSS-only crop showing the top half of the image:
```css
.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
```

**Fallback:** If character has no expressions → show `👤` emoji centered in circle background `#1e1e1e`.

### 3.8 New Character Dialog

**Trigger:** Click "+ 新角色" button in sidebar footer.

**Mechanism:** `prompt()` dialog (matching existing Characters.vue pattern).
- Prompt text: `"请输入角色 ID（如 hero、heroine）:"`
- On confirm: Create character entry in `script.data.characters[id]` with default values:
  ```js
  { name: '新角色', color: '#FFFFFF', expressions: {} }
  ```
- Auto-select the new character in sidebar.

---

## 4. Empty States

### 4.1 Backgrounds — No Files

```
      📁
 当前分类下暂无背景图
 拖放文件到此处，或点击上方"导入文件"按钮
```

- Container: `flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;`
- Icon: `font-size: 48px;`
- Title: `font-size: 14px; color: #888;`
- Subtitle: `font-size: 12px; color: #555;`

### 4.2 Audio — No Files

```
      🎵
 当前分类下暂无音频文件
 拖放文件到此处，或点击上方"导入文件"按钮
```

Same layout as 4.1, different icon and text.

### 4.3 Fonts — No Files

```
      🔤
 当前分类下暂无字体文件
 拖放文件到此处，或点击上方"导入文件"按钮
```

Same layout as 4.1, different icon and text.

### 4.4 Characters — No Characters

**Sidebar empty:**
```
      👤
 暂无角色
 点击上方 + 按钮创建
```
- Shown in sidebar list area, centered, `color: #555; font-size: 12px;`

**Editor pane empty (no selection):**
```
 从左侧列表选择一个角色进行编辑，
 或点击 + 创建新角色。
```
- Centered in editor pane, `color: #888; font-size: 14px;`

### 4.5 Expressions — No Expressions

```
      🖼️
 该角色暂无表情图片
 点击"+ 导入表情"添加
```
- Inside expression section, centered, `color: #555; font-size: 12px;`

---

## 5. Component Inventory

All components are custom Vue 3 SFCs with scoped CSS. No external component library.

| Component | Type | Purpose |
|-----------|------|---------|
| `ResourceLibrary.vue` | View (new) | Master container — replaces Assets.vue + Characters.vue |
| `AssetGrid.vue` | Component (new) | Reusable thumbnail grid for backgrounds sub-tab |
| `CharacterEditor.vue` | Component (new) | Sidebar + editor pane for characters sub-tab |
| `AudioList.vue` | Component (new) | Audio file list with mini players |
| `FontGrid.vue` | Component (new) | Font preview grid with sample text |
| `MiniPlayer.vue` | Component (new) | Single audio row player (play/pause + progress + duration) |
| `InlineEdit.vue` | Component (new) | Inline rename text field with Enter/Escape handling |
| `ContextMenu.vue` | Component (new) | Custom right-click context menu |
| `DropOverlay.vue` | Component (new) | Full-view drag-drop overlay |
| `ImportNotification.vue` | Component (new) | Inline notification bar for import results |

**Removed components (replaced by ResourceLibrary):**
- `Assets.vue` — replaced
- `Characters.vue` — replaced

**Modified components:**
- `App.vue` — Tab array updated (6→5), component map updated

---

## 6. Copywriting Contract

All UI text is in Chinese (中文).

### 6.1 Primary CTA Labels

| Context | Label | Style |
|---------|-------|-------|
| Toolbar import button | `📂 导入文件` | Green button (#0e633c) |
| Expression import button | `+ 导入表情` | Green button (#0e633c) |
| New character button | `+ 新角色` | Dashed border ghost button |
| New character prompt | `请输入角色 ID（如 hero、heroine）:` | Browser prompt() |

### 6.2 Sub-Tab Labels

| Tab | Label | Icon |
|-----|-------|------|
| Backgrounds | `背景` | 🖼️ |
| Characters | `角色` | 👤 |
| Audio | `音频` | 🎵 |
| Fonts | `字体` | 🔤 |

### 6.3 Form Labels (Character Editor)

| Field | Label |
|-------|-------|
| Character name | `显示名称` |
| Character color | `名称颜色` |
| Character ID (disabled) | `ID（键名）` |
| Expression section title | `表情列表` |

### 6.4 Empty State Copy

| State | Title | Subtitle |
|-------|-------|----------|
| No backgrounds | `当前分类下暂无背景图` | `拖放文件到此处，或点击上方"导入文件"按钮` |
| No audio | `当前分类下暂无音频文件` | `拖放文件到此处，或点击上方"导入文件"按钮` |
| No fonts | `当前分类下暂无字体文件` | `拖放文件到此处，或点击上方"导入文件"按钮` |
| No characters (sidebar) | `暂无角色` | `点击上方 + 按钮创建` |
| No selection (editor) | `从左侧列表选择一个角色进行编辑，或点击 + 创建新角色。` | — |
| No expressions | `该角色暂无表情图片` | `点击"+ 导入表情"添加` |

### 6.5 Context Menu Labels

| Action | Label | Style |
|--------|-------|-------|
| Rename | `重命名` | Normal |
| Delete | `删除` | Destructive (red text) |

### 6.6 Notification Copy

| Scenario | Text |
|----------|------|
| Import success | `成功导入 {N} 个文件` |
| Partial import | `已导入 {N} 个文件，{M} 个文件导入失败：` |
| Import failure detail | `— {filename}: 不支持的格式` |

### 6.7 Delete Confirmation Copy

| Target | Message |
|--------|---------|
| Asset file | `确定要删除 "{filename}" 吗？` |
| Character | `确定要删除角色 "{name}" 吗？该角色的所有表情数据也会被移除。` |
| Expression | `确定要删除表情 "{exprName}" 吗？` |

### 6.8 Drop Overlay Copy

| Line | Text |
|------|------|
| Primary | `释放以导入文件` |
| Secondary | `文件将导入到「{当前分类名}」` |

### 6.9 Font Preview Sample

Fixed string (ASSET-13): `你好世界 AaBbCc 1234`

### 6.10 View Title

`资源库` (shown in toolbar as h2, matching existing "素材管理" heading pattern).

---

## 7. Accessibility Notes

- All interactive elements must be keyboard-focusable (buttons, inputs, list items).
- Tab trap: Inline edit input captures Tab key to prevent focus escape during rename.
- Context menu: Opens at mouse position, can be dismissed with Escape.
- Audio progress bar: Must be operable via click (no keyboard drag required — matches native audio pattern).
- Color contrast: All text-on-background combinations in this dark theme already exceed WCAG AA 4.5:1 ratio (e.g., #ccc on #1e1e1e = ~10:1, #888 on #1e1e1e = ~4.5:1).
- `alt` attributes on all thumbnail images: use filename as alt text.

---

## 8. Registry & Dependencies

**Component library:** None. All custom components.
**Icon library:** None. Emoji icons only (matching existing codebase pattern: 🎬🖼️⚙️📦👤🎵🔤📁📂).
**CSS framework:** None. Pure scoped CSS.
**New npm dependencies:** Zero (Phase 6 decision: zero new deps).
**Audio:** HTMLAudioElement API only (D-10).
**Font preview:** FontFace API (already loaded by Phase 6 infrastructure).

---

## 9. Requirement Traceability

| REQ-ID | UI-SPEC Section | Coverage |
|--------|-----------------|----------|
| ASSET-01 | §2.1 (tab merge 6→5), §2.2 (unified view) | Full |
| ASSET-02 | §2.2, §2.3 (4 sub-tabs) | Full |
| ASSET-05 | §2.4 (thumbnail grid) | Full |
| ASSET-06 | §2.6, §3.6 (mini player) | Full |
| ASSET-07 | §2.5 (character editor — name, color, expressions) | Full |
| ASSET-08 | §2.5 (expression grid by character) | Full |
| ASSET-09 | §2.5 (file picker import button) | Full |
| ASSET-10 | §3.3 (delete with confirmation) | Full |
| ASSET-11 | §3.1 (inline rename) | Full |
| ASSET-13 | §2.7 (font sample preview) | Full |
| ASSET-14 | §3.4 (drop zone overlay) | Full |

---

*Phase: 07-asset-library-ui*
*Design contract: 2026-03-29*
