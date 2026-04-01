---
phase: 11
slug: ppt-page-editor
status: approved
shadcn_initialized: false
preset: none
created: 2026-03-31
---

# Phase 11 — UI Design Contract

> Visual and interaction contract for the PPT Page Editor. Locks spacing, typography, color, copywriting, and layout decisions before planning.

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

Declared values (multiples of 4, matching existing editor conventions):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding |
| sm | 8px | Compact element spacing, form input padding |
| md | 12px | List item padding, section spacing |
| lg | 16px | Panel padding, canvas gaps |
| xl | 20px | Large section padding |
| 2xl | 32px | Major section breaks |

Exceptions: none — all spacing derived from 4px grid

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 14px | 400 | 1.4 | List items, page thumbnails |
| Label | 12px | 400 | 1.3 | Form labels, section headers |
| Caption | 11px | 400 | 1.3 | Page numbers, secondary info |
| Input | 14px | 400 | 1.4 | Form inputs, textareas |
| Panel Header | 13px | 600 | 1.3 | Inspector section titles |
| Scene Name | 14px | 600 | 1.4 | Tree scene nodes |

---

## Color

Consistent with existing dark editor theme:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #1e1e1e | Main workspace background |
| Secondary (30%) | #252526 | Sidebar, inspector panels |
| Accent (10%) | #007acc | Selected page, active states, add buttons |
| Destructive | #a22 | Delete page button, delete scene |
| Surface | #2d2d2d | Panel headers, toolbar backgrounds |
| Border | #333 | Subtle dividers between elements |
| Border Active | #444 | Active element borders |
| Text Primary | #cccccc | Default text |
| Text Secondary | #aaa | Labels, hints |
| Text Disabled | #555 | Disabled states |

Accent reserved for: selected page highlight, add page/scene button, active tree node left-border, draggable element selection outline

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header (40px) — existing, unchanged                      │
├─────────────────────────────────────────────────────────┤
│ TabBar — [场景编辑 | 标题页 | 设置页 | 资源库 | 项目设置]│
├──────────┬──────────────────────────┬───────────────────┤
│ Page     │ Canvas Area              │ Inspector         │
│ Sidebar  │                          │ Panel             │
│ (220px)  │  ┌──────────────────┐   │ (300px)           │
│          │  │ Toolbar (32px)   │   │                   │
│ Scene    │  ├──────────────────┤   │ [Page Props]      │
│ Tree     │  │                  │   │ ── background     │
│ ├ 📑 p1  │  │  1280×720 Canvas │   │ ── transition     │
│ ├ 📑 p2  │  │  (auto-scale)    │   │                   │
│ └ 📑 p3  │  │                  │   │ [Characters]      │
│          │  │                  │   │ ── char list      │
│ [+Page]  │  └──────────────────┘   │ ── add button     │
│ [+Scene] │  ┌──────────────────┐   │                   │
│          │  │ Dialogue Box     │   │ [Dialogues]       │
│          │  │ (inline edit)    │   │ ── dialogue list  │
│          │  └──────────────────┘   │ ── speaker/text   │
│          │                          │                   │
│          │                          │ [Audio]           │
│          │                          │ ── BGM picker     │
│          │                          │ ── SE picker      │
└──────────┴──────────────────────────┴───────────────────┘
```

### Panel Dimensions

| Panel | Width | Position | Background |
|-------|-------|----------|------------|
| Page Sidebar | 220px fixed | Left | #252526 |
| Canvas Area | flex: 1 (min 400px) | Center | #1e1e1e |
| Inspector | 300px fixed | Right | #252526 |
| Canvas Toolbar | 100% × 32px | Above canvas | #2d2d2d |

---

## Component Specifications

### Scene Tree (Left Sidebar)

```
Scene Node (collapsed):
┌────────────────────────┐
│ ▶ 🎬 场景名称    [⋯]  │  ← 右键菜单: 重命名/删除
└────────────────────────┘

Scene Node (expanded):
┌────────────────────────┐
│ ▼ 🎬 开始场景    [⋯]  │
│   ┌──────────────────┐ │
│   │ 📑 1 "你好..."   │ │  ← 页码 + 首句对话摘要
│   ├──────────────────┤ │
│   │ 📑 2 "我是..."   │ │  ← 选中时: bg #37373d, left-border 3px #007acc
│   ├──────────────────┤ │
│   │ 🔀 3 [选择页]    │ │  ← choice 类型图标
│   ├──────────────────┤ │
│   │ ❓ 4 [条件页]    │ │  ← condition 类型图标
│   └──────────────────┘ │
└────────────────────────┘
```

| Property | Value |
|----------|-------|
| Scene node height | 32px |
| Page item height | 30px |
| Page item padding | 8px 12px 8px 24px (indented) |
| Selected page bg | #37373d |
| Selected page left-border | 3px solid #007acc |
| Hover bg | #2a2d2e |
| Text truncation | ellipsis at 1 line |
| Scene toggle icon | ▶ / ▼ (Unicode) |
| Page type icons | 📑 normal, 🔀 choice, ❓ condition |

### Page Sidebar Footer Actions

```
┌────────────────────────┐
│ [+ 添加页面] [+ 添加场景] │
└────────────────────────┘
```

| Property | Value |
|----------|-------|
| Button style | text button, color #007acc |
| Padding | 8px 12px |
| Separator | 1px solid #333 top border |

### Canvas Toolbar

```
┌──────────────────────────────────────────┐
│ [+ 添加角色]  │  zoom info  │  page info │
└──────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 32px |
| Background | #2d2d2d |
| Border bottom | 1px solid #333 |
| Button style | icon button, 28px height |
| "添加角色" button | bg #007acc, border-radius 4px, color white |

### Canvas Area

| Property | Value |
|----------|-------|
| Artboard | 1280×720px, auto-scale via ResizeObserver |
| Background | Page background image or #1a1a2e default |
| Character rendering | DraggableElement with position: absolute |
| Selected character | outline: 2px solid #007acc, outline-offset: 2px |
| Dialogue box | bottom-aligned, semi-transparent (#000 @ 0.7 opacity) |
| Dialogue click-to-edit | cursor: text on hover, blue outline on focus |

### Inspector Panel

Inspector is divided into collapsible sections:

```
┌─ 📄 页面属性 ──────────────────┐
│ 背景: [选择背景...]            │
│ 过渡: [fade ▾] 时长: [800]ms   │
└────────────────────────────────┘

┌─ 🧑 角色列表 ──────────────────┐
│ ┌──────────────────────────┐   │
│ │ 角色A  [happy] [left] ✕  │   │  ← 每行: 角色名 + 表情 + 位置 + 删除
│ ├──────────────────────────┤   │
│ │ 角色B  [sad]  [right] ✕  │   │
│ └──────────────────────────┘   │
│ [+ 添加角色]                    │
└────────────────────────────────┘

┌─ 💬 对话列表 ──────────────────┐
│ ┌──────────────────────────┐   │
│ │ #1 旁白: "天气很好..."   │   │  ← 可拖拽排序
│ ├──────────────────────────┤   │
│ │ #2 角色A: "你好！"    ✕  │   │  ← 选中时高亮 + 画布联动
│ └──────────────────────────┘   │
│ [+ 添加对话]                    │
│                                │
│ ── 编辑选中对话 ──             │
│ 说话者: [角色A ▾]              │
│ 表情变化: [happy ▾]            │
│ 内容:                          │
│ ┌──────────────────────────┐   │
│ │ 你好！今天天气真好。      │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘

┌─ 🎵 音频 ──────────────────────┐
│ BGM: [选择BGM...]              │
│      音量: [━━━━━━━○━━] 0.5    │
│ SE:  [选择音效...]              │
└────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Section header | 13px, weight 600, bg #2d2d2d, padding 8px 12px |
| Section collapse | ▶/▼ toggle, click to expand/collapse |
| Form group gap | 8px between fields |
| Input field | bg #3c3c3c, border 1px solid #555, padding 6px 8px, border-radius 4px |
| Dialogue item height | 36px |
| Dialogue selected bg | #37373d, border-left 3px solid #007acc |
| Delete button (✕) | 20px, color #888, hover color #a22 |
| Add button style | text button, color #007acc |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Add page button | + 添加页面 |
| Add scene button | + 添加场景 |
| Add character button | + 添加角色 |
| Add dialogue button | + 添加对话 |
| Delete page confirmation | 确定删除第 {N} 页？此操作不可撤销。 |
| Delete scene confirmation | 确定删除场景「{name}」及其所有页面？ |
| Empty scene tree | 暂无场景，点击下方按钮创建第一个场景 |
| Empty page list | 当前场景暂无页面，点击「+ 添加页面」开始创建 |
| No background set | 未设置背景 |
| No BGM set | 未设置背景音乐 |
| No SE set | 未设置音效 |
| Scene rename prompt | 输入新的场景名称 |
| Character picker title | 选择角色 |
| Narration label | (旁白) |

---

## Interaction Specifications

### Drag-Reorder Pages

| Property | Value |
|----------|-------|
| Drag handle | Entire page item row |
| Drag feedback | opacity 0.5, blue dashed drop indicator between items |
| Drop zone | Between page items within same scene only |
| Animation | 0.2s ease transition on reorder |

### Character Drag on Canvas

| Property | Value |
|----------|-------|
| Drag mode | Free position (no grid snap) |
| Cursor | grab → grabbing |
| Selection | Click to select, outline: 2px solid #007acc |
| Multi-select | Not supported (single selection only) |
| Delete | Select + press Delete key, or ✕ in inspector |

### Dialogue Inline Edit on Canvas

| Property | Value |
|----------|-------|
| Trigger | Double-click dialogue box on canvas |
| Edit mode | Text cursor appears, direct typing |
| Exit | Click outside, or press Escape |
| Sync | Changes reflect immediately in inspector panel |

### Scene Tree Interactions

| Action | Trigger |
|--------|---------|
| Expand/collapse scene | Click scene node or ▶/▼ icon |
| Select page | Click page item |
| Rename scene | Double-click scene name, or right-click → 重命名 |
| Delete scene | Right-click → 删除 |
| Add page | Click [+ 添加页面] button at bottom, or right-click scene → 添加页面 |
| Add scene | Click [+ 添加场景] button at bottom |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (none) | N/A — no external component registry | not required |

All components are custom Vue 3 SFCs following existing editor patterns.

---

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| < 960px | Not supported (editor is desktop-only, Electron app) |
| ≥ 960px | Full 3-panel layout: sidebar + canvas + inspector |

Canvas auto-scales to fit available space via ResizeObserver (existing pattern).

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — All UI copy in Chinese, specific verb+noun patterns, empty states defined
- [x] Dimension 2 Visuals: PASS — Layout matches existing editor patterns, consistent panel widths
- [x] Dimension 3 Color: PASS — Uses existing palette, accent reserved for specific elements
- [x] Dimension 4 Typography: PASS — Sizes and weights consistent with editor base.css
- [x] Dimension 5 Spacing: PASS — 4px grid, consistent with editor conventions
- [x] Dimension 6 Registry Safety: PASS — No external registries, all custom components

**Approval:** approved 2026-03-31
