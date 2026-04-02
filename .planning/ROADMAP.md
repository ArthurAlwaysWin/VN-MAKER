# Roadmap: Galgame Maker

## Overview

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

---

## v0.1 — 设置页设计器 ✅

<details>
<summary>Phases 1-5 (all completed 2025-03-28)</summary>

- [x] **Phase 1: Bug Fixes** - Fix file dialog and hot reload blockers before feature work
- [x] **Phase 2: Data Schema & Component Registry** - Define the JSON contract and extensible architecture
- [x] **Phase 3: Runtime Settings Renderer** - Engine renders interactive settings page from JSON layout data
- [x] **Phase 4: Editor Canvas & Component Palette** - Visual designer for placing and positioning settings components
- [x] **Phase 5: Property Panel & Integration** - Property editing, auto-save, undo/redo, end-to-end workflow

**Post-milestone polish (2025-03-29):**
- ✅ 创建项目 reactive Proxy bug 修复
- ✅ 设置页设计器 5 项 bug 修复（样式预览/撤销重做/自动调高等）
- ✅ 关闭按钮移至设置组件区 + icon/text 双模式
- ✅ 全屏开关 → 窗口模式三选一（radio 按钮样式）
- ✅ 保存按钮 💾 添加到工具栏

</details>

---

## v0.2 — 资源库 & 标题页 & 设置叠加层 ✅

<details>
<summary>Phases 6-9 (shipped 2026-03-31)</summary>

- [x] **Phase 6: Asset Library Foundation** — IPC handlers, file validation, auto-naming, font loading (2026-03-29)
- [x] **Phase 7: Asset Library UI** — Unified asset view with thumbnails, audio, expression editor, batch import (2026-03-29)
- [x] **Phase 8: Title Page Designer** — 3-panel canvas designer with preset buttons, schema migration (2026-03-31)
- [x] **Phase 9: Settings Overlay** — Slide-in overlay with dual-mode backdrop and ESC priority (2026-03-31)

**Key deliverables:**
- ✅ 12 格式魔数验证 + 自动命名冲突解决 + 双窗口字体加载
- ✅ 统一资源库（背景/角色/音频/字体一体化，tab 6→5）
- ✅ 标题页 3 面板设计器 + 预设按钮 + 引擎格式迁移
- ✅ 设置页右侧滑入覆盖层 + ESC 优先级链

See \.planning/milestones/v0.2-ROADMAP.md\ for full phase details.

</details>

---

## v0.3 — PPT 式游戏内容编辑器 ✅

<details>
<summary>Phases 10-14 + 13.1 (shipped 2026-04-01)</summary>

- [x] **Phase 10: Page Data Schema & Engine Adaptation** — Page-based data format + engine rewrite (2026-03-31)
- [x] **Phase 11: PPT Page Editor** — Scene tree sidebar + WYSIWYG canvas + inspector (2026-04-01)
- [x] **Phase 12: Resource Pickers** — Character/expression/background/audio pickers (2026-03-31)
- [x] **Phase 13: Transitions & Branching** — Fade/slide transitions + choice pages + scene linking (2026-04-01)
- [x] **Phase 13.1: UI Polish** — Speaker combobox + choice preview + character scale (INSERTED)
- [x] **Phase 14: Editor Test Play** — Inline iframe preview with postMessage protocol (2026-04-01)

**Key deliverables:**
- ✅ 页面式数据架构替代命令时间线 + 引擎完全重写
- ✅ PPT 风格所见即所得编辑器（场景树 + 1280×720 画布 + 检查器）
- ✅ 视觉资源选择器（角色表情网格、背景预览、音频播放器）
- ✅ 转场效果 + 选择分支页 + 场景跳转
- ✅ 编辑器内联试玩（iframe + postMessage + 只读覆盖层）

See .planning/milestones/v0.3-ROADMAP.md for full phase details.

</details>

---

## v0.4 — 语音 & 全局字体设置

### Phases

- [ ] **Phase 15: Voice Engine Foundation** — Data model, audio channel, engine playback, volume control
- [ ] **Phase 16: Voice Editor Integration** — Inspector voice picker, preview, batch naming
- [ ] **Phase 17: Global Font Settings** — Data schema, engine consumption, editor UI, live preview
- [ ] **Phase 18: Voice Polish** — Backlog replay, auto-mode voice wait

### Phase Details

#### Phase 15: Voice Engine Foundation
**Goal**: Engine can play voice audio alongside dialogue with independent volume control
**Depends on**: Phase 14 (v0.3 complete)
**Requirements**: VOICE-01, VOICE-04, VOICE-05, VOICE-06
**Success Criteria** (what must be TRUE):
  1. Page JSON stores a `voice` file path per dialogue entry, persisting through save/load cycles
  2. Engine plays the bound voice audio when displaying a dialogue line
  3. Engine stops the previous voice when advancing to the next line
  4. Player can adjust voice volume independently via the settings page slider
  5. Voice volume respects master volume (multiplicative scaling)
**Plans**: TBD

#### Phase 16: Voice Editor Integration
**Goal**: Creators can bind, preview, and batch-assign voice files to dialogue in the editor
**Depends on**: Phase 15
**Requirements**: VOICE-02, VOICE-03, VOICE-07
**Success Criteria** (what must be TRUE):
  1. Each dialogue entry in the Inspector shows a voice picker to select or clear a voice file
  2. Creator can click ▶ next to a dialogue entry to preview its bound voice in the editor
  3. Batch naming tool scans audio folder and auto-binds files matching `{charId}_{scene}_{page}_{line}` convention
  4. Batch binding shows matched results for confirmation before applying
**Plans**: TBD
**UI hint**: yes

#### Phase 17: Global Font Settings
**Goal**: Creators can customize dialogue box typography globally with live preview in editor and engine
**Depends on**: None (independent of voice; sequenced after Phase 16 for workflow)
**Requirements**: FONT-01, FONT-02, FONT-03, FONT-04
**Success Criteria** (what must be TRUE):
  1. `script.json` stores dialogue box font settings (fontSize, fontFamily, textColor, nameplateFontSize) with sensible defaults
  2. Engine dialogue box renders text using global font settings via CSS custom properties
  3. Editor provides font settings UI — font dropdown (imported + system fonts), size slider, color picker, nameplate font size
  4. Changing font settings in editor immediately updates the canvas dialogue box preview
**Plans**: TBD
**UI hint**: yes

#### Phase 18: Voice Polish
**Goal**: Voice playback integrates seamlessly with backlog review and auto-play mode
**Depends on**: Phase 15
**Requirements**: VOICE-08, VOICE-09
**Success Criteria** (what must be TRUE):
  1. Backlog (回想) screen shows ▶ button on entries with bound voice; clicking replays the voice
  2. Auto-mode waits for voice audio to finish before advancing to the next line
  3. Auto-mode advances at normal timing interval when dialogue has no voice bound
**Plans**: TBD

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15. Voice Engine Foundation | 0/? | Not started | - |
| 16. Voice Editor Integration | 0/? | Not started | - |
| 17. Global Font Settings | 0/? | Not started | - |
| 18. Voice Polish | 0/? | Not started | - |
