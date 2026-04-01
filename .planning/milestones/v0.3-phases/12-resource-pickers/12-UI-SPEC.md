---
phase: 12
slug: resource-pickers
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-01
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for Resource Pickers. Covers background picker, expression thumbnail grid, and audio picker with BGM/SE tabs.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla CSS, consistent with existing editor) |
| Preset | not applicable |
| Component library | none (custom Vue 3 components) |
| Icon library | Emoji / Unicode (consistent with existing editor) |
| Font | System stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif |

---

## Spacing Scale

Inherited from Phase 11 (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding |
| sm | 8px | Compact element spacing, thumbnail gap |
| md | 12px | Modal section padding, form spacing |
| lg | 16px | Panel padding, modal body padding |
| xl | 20px | Large section padding |
| 2xl | 32px | Major section breaks |

Exceptions: none — all spacing derived from 4px grid

---

## Typography

Inherited from Phase 11, new additions:

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 14px | 400 | 1.4 | File names in picker rows |
| Label | 12px | 400 | 1.3 | Expression name labels, audio duration |
| Caption | 11px | 400 | 1.3 | Thumbnail file size, secondary info |
| Tab Active | 13px | 600 | 1.3 | Active audio tab label |
| Tab Inactive | 13px | 400 | 1.3 | Inactive audio tab label |
| Modal Title | 14px | 500 | 1.4 | Picker modal header text |

---

## Color

Inherited from Phase 11 dark editor theme:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #1e1e1e | Modal background |
| Secondary (30%) | #252526 | Thumbnail cards, audio rows |
| Accent (10%) | #007acc | Selected thumbnail outline, active tab underline, confirm button |
| Destructive | #a22 | Clear/remove button hover |
| Surface | #2d2d2d | Modal header, tab bar background |
| Border | #333 | Card borders, dividers |
| Border Active | #007acc | Selected thumbnail border |
| Text Primary | #cccccc | File names |
| Text Secondary | #aaa | Labels, durations |
| Text Disabled | #555 | Placeholder text |

Accent reserved for: selected thumbnail outline, active tab underline, confirm button background, play button

---

## Layout: Overview of All Pickers

Phase 12 adds three picker modals accessible from PageInspector:

```
PageInspector                     Picker Modals (overlay)
┌──────────────────────┐        ┌──────────────────────────────┐
│ 📄 页面属性           │        │ ┌──────────────────────────┐ │
│  背景: [park.png ✕] ──┼──click→│ │ 选择背景图              ✕│ │
│  过渡: [fade]         │        │ │ ┌────┐ ┌────┐ ┌────┐    │ │
│                       │        │ │ │ bg1│ │ bg2│ │ bg3│    │ │
│ 🧑 角色列表           │        │ │ └────┘ └────┘ └────┘    │ │
│  角色A [grid] [x]     │        │ └──────────────────────────┘ │
│                       │        └──────────────────────────────┘
│ 💬 对话列表           │
│                       │        ┌──────────────────────────────┐
│ 🎵 音频               │        │ ┌──────────────────────────┐ │
│  BGM: [song.mp3 ✕] ──┼──click→│ │ 选择音频                ✕│ │
│  音量: [━━━━○━━] 0.5  │        │ │ [BGM] [SE]               │ │
│  SE: [click.wav ✕] ──┼──click→│ │ 🎵 song.mp3  [▶ ━━━]    │ │
│                       │        │ │ 🎵 rain.wav  [▶ ━━━]    │ │
│                       │        │ └──────────────────────────┘ │
└──────────────────────┘        └──────────────────────────────┘
```

---

## Component Specifications

### 1. Background Picker (reuse AssetPickerModal)

Reuse existing `AssetPickerModal.vue` with `category="backgrounds"`. No new component needed.

**Trigger:** Click readonly "背景" input in PageInspector.

**Behavior:**
- Opens AssetPickerModal overlay (already implemented)
- Shows background thumbnails in grid (120px cards)
- Click a thumbnail → applies to `page.background`, closes modal
- Empty state: "当前分类下暂无资源" (existing)

**PageInspector Background Row Enhancement:**

```
┌──────────────────────────────────────┐
│ 背景                                  │
│ ┌──────────────────────────────┬──┐  │
│ │ park.png                     │✕ │  │  ← 有背景时: 文件名 + 清除按钮
│ └──────────────────────────────┴──┘  │
│ ┌────────────────────────────────┐   │
│ │ 🖼️ (缩略图预览, 48px高)        │   │  ← 当前背景缩略图预览
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

When no background is set:
```
│ ┌────────────────────────────────┐   │
│ │ 点击选择背景...                 │   │  ← placeholder, cursor: pointer
│ └────────────────────────────────┘   │
```

| Property | Value |
|----------|-------|
| Input style | readonly, bg #3c3c3c, cursor pointer |
| Thumbnail preview height | 48px, border-radius 4px, object-fit cover |
| Clear button (✕) | 18px, inline, color #888, hover #a22 |
| Click area | Entire input row opens picker |
| Preview visibility | Only shown when background is set |

---

### 2. Expression Thumbnail Grid (CharacterPicker enhancement)

Replace the `<select>` dropdown in CharacterPicker with a visual thumbnail grid showing actual expression sprites.

**Current → New Layout:**

```
Current:
┌──────────────────────────────┐
│ 角色A     [happy ▾]          │  ← text select dropdown
│ 角色B     [sad ▾]            │
└──────────────────────────────┘

New:
┌──────────────────────────────────────────┐
│ 角色A                                     │  ← click row to select character
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ 😊   │ │ 😢   │ │ 😠   │ │ 😃   │     │  ← expression thumbnails
│ │happy │ │ sad  │ │angry │ │smile │     │  ← expression name below
│ └──────┘ └──────┘ └──────┘ └──────┘     │
└──────────────────────────────────────────┘
```

**Expanded picker panel (selected character):**

```
┌──────────────────────────────────────────────┐
│ 选择角色                                    ✕ │
├──────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐  │
│ │ ● 角色A                                 │  │  ← selected indicator ●
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │  │
│ │ │▒▒▒▒▒▒│ │▒▒▒▒▒▒│ │▒▒▒▒▒▒│ │▒▒▒▒▒▒│   │  │  ← 80×80px thumbnails
│ │ │ img  │ │ img  │ │ img  │ │ img  │    │  │
│ │ │      │ │      │ │✓sel  │ │      │    │  │  ← selected expression has ✓ overlay
│ │ │happy │ │ sad  │ │angry │ │smile │    │  │  ← name label below
│ │ └──────┘ └──────┘ └──────┘ └──────┘    │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ ┌─────────────────────────────────────────┐  │
│ │ ○ 角色B                                 │  │  ← unselected indicator ○
│ │ ┌──────┐ ┌──────┐                       │  │
│ │ │ img  │ │ img  │                       │  │
│ │ │normal│ │ cry  │                       │  │
│ │ └──────┘ └──────┘                       │  │
│ └─────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│                          [取消]  [确定]       │
└──────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Modal width | 480px (wider than current 300-400px to fit grid) |
| Thumbnail size | 80×80px |
| Thumbnail grid | auto-fill, minmax(80px, 1fr), gap 8px |
| Thumbnail bg | #1a1a1a, border-radius 6px |
| Thumbnail image | object-fit contain, 64×64px within, padding 4px |
| Thumbnail name | 11px, color #aaa, centered below, truncate at 1 line |
| Selected expression | border 2px solid #007acc, ✓ overlay top-right (14px circle bg #007acc) |
| Unselected expression | border 1px solid #333 |
| Hover expression | border-color #555, background lighten |
| Character section | border 1px solid #333, border-radius 6px, padding 8px, margin-bottom 8px |
| Selected char indicator | ● (filled circle) color #007acc before name |
| Unselected char indicator | ○ (empty circle) color #555 before name |
| Character name | 14px, weight 600, color from char.color |
| Expression grid margin-top | 8px |

**Behavior:**
- Click character name row → select character (shows ● indicator, `pickedCharId`)
- Click expression thumbnail → select that expression (`selectedExpressions[charId]`)
- Selected expression gets blue border + ✓ badge
- "确定" button adds character with selected expression to page
- Duplicate check preserved (alert if character already on page)

---

### 3. Audio Picker Modal (new component)

New `AudioPicker.vue` modal with BGM/SE tab switching and inline MiniPlayer preview per row.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│ 选择音频                                                ✕ │
├──────────────────────────────────────────────────────────┤
│  [  BGM  ]  [  SE  ]                                     │  ← tab bar
│ ──────────────────────────────────────────────────────── │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🎵 summer_bgm.mp3                                   │ │  ← audio row
│ │     [▶ ━━━━━━━━━━━━━━━━━━━━ 0:00 / 2:30]           │ │  ← inline MiniPlayer
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🎵 rain_ambience.wav                          ✓ sel  │ │  ← selected indicator
│ │     [⏸ ━━━━━━━●━━━━━━━━━━━ 0:45 / 3:12]            │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🎵 forest_night.mp3                                  │ │
│ │     [▶ ━━━━━━━━━━━━━━━━━━━━ 0:00 / 1:58]           │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                    [取消]  [确定]         │
└──────────────────────────────────────────────────────────┘
```

**Empty state:**
```
│                                                          │
│           当前项目暂无音频文件                              │
│       请先在「素材库」中导入音频资源                        │
│                                                          │
```

| Property | Value |
|----------|-------|
| Modal width | 520px |
| Modal max-height | 65vh |
| Tab bar height | 36px |
| Tab bar background | #2d2d2d |
| Active tab | color #e0e0e0, border-bottom 2px solid #007acc |
| Inactive tab | color #888, no bottom border |
| Tab padding | 8px 24px |
| Tab font size | 13px |
| Audio row | bg #252526, border 1px solid #333, border-radius 6px, padding 10px 12px, margin-bottom 6px |
| Audio row hover | border-color #555, bg #2a2d2e |
| Audio row selected | border-color #007acc, bg #094771 (subtle blue) |
| File name | 13px, color #ccc |
| MiniPlayer | embedded below file name, margin-top 6px |
| Selected indicator | ✓ badge, top-right of row, 16px circle bg #007acc, color #fff |
| Confirm button | bg #007acc, disabled until file selected |
| Cancel button | transparent bg, border 1px solid #555 |

**Behavior:**
- Tab switching: BGM / SE tabs filter the same `files.audio[]` list (all audio files shown; tab determines which field to write)
- Click audio row → select that file (highlight row, show ✓)
- MiniPlayer per row — plays preview of that audio file
- Only one MiniPlayer active at a time (singleton pattern via `activePlayerId`)
- "确定" writes selected file to `page.bgm.file` or `page.se.file` depending on active tab
- Closes modal after confirm

**Tab Determination:**
- When triggered from BGM input → default to BGM tab
- When triggered from SE input → default to SE tab
- User can switch tabs freely within the modal

---

### 4. PageInspector Integration Updates

**Background row → enhanced:**

```
Before:
│ 背景                                 │
│ [未设置背景            ] ← alert()   │

After:
│ 背景                                 │
│ [park.png                     ✕]     │  ← click to open AssetPickerModal
│ [🖼️ thumbnail preview, 48px ]        │  ← optional: only when bg set
```

**Audio section → enhanced:**

```
Before:
│ BGM: [未设置背景音乐   ] ← alert()   │
│ SE:  [未设置音效        ] ← alert()   │

After:
│ BGM                                   │
│ [summer_bgm.mp3              ✕]      │  ← click opens AudioPicker (BGM tab)
│ 音量: [━━━━━━━○━━] 0.5              │
│ SE                                    │
│ [click.wav                   ✕]      │  ← click opens AudioPicker (SE tab)
```

**Clear button (✕) behavior:**
- Visible only when a value is set
- Clicking ✕ clears the field (sets to null/empty)
- Stops event propagation (doesn't open picker)
- `page.bgm` → set to `null` (hides volume slider too)
- `page.se` → set to `null`
- `page.background` → set to `''`
- Calls `script.pushState()` after clearing

| Property | Value |
|----------|-------|
| Clear button (✕) | 16px, position absolute right 8px, color #666, hover #a22 |
| Input wrapper | position relative (for ✕ positioning) |
| Input padding-right | 28px (room for ✕ button) |

---

### 5. Expression Dropdown in Inspector (Optional Enhancement)

The `<select>` dropdown for character expressions in PageInspector's character list can remain as-is for Phase 12. The visual thumbnail grid is only in CharacterPicker (add flow). Changing expressions of already-placed characters stays as `<select>` dropdown — this is a conscious scope decision to keep Phase 12 focused.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Background picker trigger | 点击选择背景... |
| Background clear tooltip | 清除背景 |
| BGM picker trigger | 点击选择BGM... |
| SE picker trigger | 点击选择音效... |
| Audio picker title | 选择音频 |
| Audio BGM tab | BGM |
| Audio SE tab | SE |
| Audio empty state heading | 当前项目暂无音频文件 |
| Audio empty state body | 请先在「素材库」中导入音频资源 |
| Character picker title | 选择角色 (unchanged) |
| Expression grid empty | 该角色暂无表情图 |
| Confirm button | 确定 |
| Cancel button | 取消 |
| Clear BGM tooltip | 清除BGM |
| Clear SE tooltip | 清除音效 |
| Duplicate character alert | 该角色已在当前页面上 (unchanged) |
| No characters empty state | 暂无角色，请先在资源库中导入角色 (unchanged) |

---

## Interaction Specifications

### Background Picker Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | Click "背景" readonly input | AssetPickerModal opens with backgrounds |
| 2 | Click thumbnail | `page.background` set, modal closes |
| 3 | Click ✕ on input | `page.background` cleared to '' |
| 4 | Click overlay | Modal closes, no change |

### Expression Selection Flow (in CharacterPicker)

| Step | Action | Result |
|------|--------|--------|
| 1 | Click character row | Character selected (● indicator) |
| 2 | Expression grid appears below | Shows all expressions as thumbnails |
| 3 | Click expression thumbnail | Blue border + ✓ badge, updates `selectedExpressions[charId]` |
| 4 | Click "确定" | Character added with selected expression, modal closes |

### Audio Picker Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | Click BGM/SE readonly input | AudioPicker opens, defaulting to relevant tab |
| 2 | Browse audio list | Scroll through available audio files |
| 3 | Click ▶ on any row | MiniPlayer plays preview (singleton: others pause) |
| 4 | Click audio row | Row highlighted with blue border + ✓ |
| 5 | Switch tab | Filter changes, selection resets |
| 6 | Click "确定" | Selected file written to `page.bgm` or `page.se`, modal closes |
| 7 | Click ✕ on inspector input | BGM/SE cleared to null |

### Clear Button Interaction

| Trigger | Field Cleared | Side Effect |
|---------|---------------|-------------|
| Click ✕ on background | `page.background = ''` | Thumbnail preview hidden |
| Click ✕ on BGM | `page.bgm = null` | Volume slider hidden |
| Click ✕ on SE | `page.se = null` | — |

---

## State Management

### New refs in usePageEditor.js

| Ref | Type | Purpose |
|-----|------|---------|
| `showBgPicker` | `ref(false)` | Background picker visibility |
| `showAudioPicker` | `ref(false)` | Audio picker visibility |
| `audioPickerTab` | `ref('bgm')` | Default tab when audio picker opens |

`showCharPicker` already exists. No changes needed for character picker visibility.

### Data flow

```
PageInspector click → set show*Picker = true → Modal opens
                                                    ↓
                                              User selects
                                                    ↓
                                    Emit 'select' with value
                                                    ↓
                              PageInspector handler → write to page data
                                                    ↓
                                              pushState()
                                                    ↓
                                        set show*Picker = false
```

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (none) | N/A — no external component registry | not required |

All components are custom Vue 3 SFCs reusing existing patterns.

---

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| < 960px | Not supported (editor is desktop-only, Electron app) |
| ≥ 960px | All picker modals centered via fixed overlay |

---

## New Files

| File | Type | Purpose |
|------|------|---------|
| `src/editor/components/page-editor/AudioPicker.vue` | New component | Audio picker modal with BGM/SE tabs |

## Modified Files

| File | Changes |
|------|---------|
| `CharacterPicker.vue` | Replace `<select>` with expression thumbnail grid, widen modal |
| `PageInspector.vue` | Replace `alertPicker()` with real picker triggers, add clear buttons, add bg thumbnail preview |
| `usePageEditor.js` | Add `showBgPicker`, `showAudioPicker`, `audioPickerTab` refs |
| `PageEditor.vue` | Mount AssetPickerModal and AudioPicker, wire show/hide |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — All UI copy in Chinese, specific action verbs, empty states defined
- [x] Dimension 2 Visuals: PASS — Reuses existing modal/grid patterns, consistent dark theme
- [x] Dimension 3 Color: PASS — Uses existing palette, accent reserved for selection states
- [x] Dimension 4 Typography: PASS — Sizes and weights match existing editor
- [x] Dimension 5 Spacing: PASS — 4px grid maintained, consistent gaps
- [x] Dimension 6 Registry Safety: PASS — No external registries

**Approval:** approved 2026-04-01
