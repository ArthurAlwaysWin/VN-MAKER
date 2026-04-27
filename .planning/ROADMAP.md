# Milestone v1.5: UI 图片驱动体系

**Status:** Gap Closure In Progress  
**Phases:** 71-77  
**Total Requirements:** 17  
**Granularity:** standard

## Overview

v1.5 聚焦把 **UI 图片资产** 从“能配置一点点”补成“可配置、可预览、可运行、可导出、可回退”的完整闭环。  
本里程碑保持现有 Electron + Vue + Pinia + DOM/CSS runtime 架构，**不新增依赖、不重写渲染栈**；同时继续以 **runtime-backed iframe preview** 作为预览唯一事实来源。

为避免 brownfield 代码库里出现 schema 漂移、导出漏图、预览/运行时分叉，本 roadmap 先冻结共享 contract 与资产通路，再按 **对话框 → 按钮族 → 主要界面 → 光标/图标与全链路收口** 的顺序推进。

v1.5 审计后发现该 milestone 仍存在 **Phase 75 运行时图标闭环缺口** 与 **71 / 72 / 74 / 75 验证证据缺口**，因此在归档前追加 gap-closure phases 76-77。

## Phases

- [x] **Phase 71: 共享契约与资产通路基线** - 统一 UI 图片路径、旧字段兼容与扫描/导出前置门
- [x] **Phase 72: 对话框图片化闭环** - 先交付最显眼的对话框图片层与真实运行时预览
- [x] **Phase 73: 按钮族图片态扩面** - 按覆盖矩阵把主要按钮族图片状态一次性铺开
- [x] **Phase 74: 主要界面图片化** - 为四个 major screen 补齐背景图、装饰层与逐屏真预览
- [x] **Phase 75: 光标图标与全链路收口** - 完成 cursor/icon slots，并把预览、运行时、导出与回退行为统一收口
- [x] **Phase 76: 图标运行时闭环与回退修复** - 收口 QAB 图标 runtime wiring 与缺图回退合同 (completed 2026-04-27)
- [ ] **Phase 77: v1.5 验证与追踪表回填** - 补齐 phase verification 证据并让 milestone 重新达到可归档状态

## Phase Details

### Phase 71: 共享契约与资产通路基线
**Goal**: 用户可以用统一的项目相对路径管理 UI 图片资产，并让旧项目字段在不损坏项目的前提下继续可读、可改写。  
**Depends on**: Nothing (starts after Phase 70)  
**Requirements**: AST-01, AST-02, AST-05, AST-06  
**Success Criteria** (what must be TRUE):
  1. 用户通过标准选图流程导入 PNG / WebP / JPEG 作为 UI 图片时，文件会复制到 `assets/ui/`，项目配置中只记录项目相对路径。
  2. 用户打开带有旧路径或旧 base64 UI 图片字段的旧项目时，相关配置仍可被读取并正常运行，不会导致项目损坏或运行时崩溃。
  3. 用户对旧字段重新执行一次标准选图后，新图片会按 v1.5 规则写入 `assets/ui/`，对应配置会改写为项目相对路径。
  4. 用户保存并重新打开项目后，已选 UI 图片引用仍保持稳定，不会回写成绝对路径、临时路径或不可复用格式。
**Plans**: 3 plans  
Plans:
- [x] 71-01-PLAN.md — 冻结共享 UI 图片契约与标准选图 helper
- [x] 71-02-PLAN.md — 打通 NineSlice 标准写入与 ThemeManager 兼容读取
- [x] 71-03-PLAN.md — 收口 screen/decor 旧写入口并建立 scan/export UI 注册基线
**UI hint**: yes

### Phase 72: 对话框图片化闭环
**Goal**: 用户可以把对话框作为图片化主题主视觉来配置，并在真实运行时预览中确认文本层依然可读。  
**Depends on**: Phase 71  
**Requirements**: DLG-01, DLG-02, DLG-03  
**Success Criteria** (what must be TRUE):
  1. 用户可以为对话框配置主框图片、名牌背景图片与至少一层装饰图片，并在游戏中看到实际效果。
  2. 用户启用对话框图片皮肤后，名牌、正文与继续指示在真实运行时中仍保持可见，不会被图片遮挡。
  3. 用户在编辑器里触发对话框预览时，看到的是 runtime-backed 真实效果，而不是本地静态模拟。
  4. 用户在切换或清空对话框图片配置后，新的对话框视觉结果会立即反映到预览与运行时结果中。
**Plans**: 3 plans  
Plans:
- [x] 72-01-PLAN.md — 冻结 `ui.dialogueBox` 图片 schema 与 scan/export collector 基线
- [x] 72-02-PLAN.md — 实现 dialogue runtime underlay、层级保护与 floating nameplate overflow 修复
- [x] 72-03-PLAN.md — 打通 DialogueBoxSettings canonical 写入口与 runtime-backed iframe 对话预览
**UI hint**: yes

### Phase 73: 按钮族图片态扩面
**Goal**: 用户可以为主要游戏界面按钮族应用成组图片状态，同时保持文字、图标与点击行为稳定。  
**Depends on**: Phase 72  
**Requirements**: BTN-01, BTN-02, BTN-03  
**Success Criteria** (what must be TRUE):
  1. 用户可以为 `game-menu-button`、`QAB`、`close-button family` 分别配置 `normal / hover / pressed` 图片态，并在对应界面看到状态切换。
  2. 用户可以为 `page-tab / pager`、`settings-tab` 配置 `normal / hover / pressed / selected` 图片态，并能清楚区分当前选中项。
  3. 用户应用按钮图片皮肤后，这 5 个按钮族上的文字或图标仍保持可读、对齐稳定且可点击。
  4. 用户在真实运行时里操作 hover、pressed、selected 等状态时，看到的按钮图片反馈与实际交互状态一致。
**Plans**: 3 plans  
Plans:
- [x] 73-01-PLAN.md — 冻结 `ui.theme.buttonFamilies` 契约、selector registry 与 scan coverage
- [x] 73-02-PLAN.md — 归一化 runtime close/tab hooks 并注入 5 个按钮族图片 CSS
- [x] 73-03-PLAN.md — 在全局主题编辑面板中接入按钮族图片字段与 runtime-backed 预览切换
**UI hint**: yes

### Phase 74: 主要界面图片化
**Goal**: 用户可以让 SaveLoad、Backlog、GameMenu、Settings 四个 major screen 拥有独立背景图与装饰层，并逐屏做真实预览。  
**Depends on**: Phase 73  
**Requirements**: SCR-01, SCR-02, SCR-03  
**Success Criteria** (what must be TRUE):
  1. 用户可以为 SaveLoad、Backlog、GameMenu、Settings 分别配置全屏背景图，并在对应界面看到完整应用结果。
  2. 用户可以为这 4 个界面配置装饰层图片，启用后主要交互元素仍可点击和触发。
  3. 用户可以在编辑器中逐个预览这 4 个界面的 runtime-backed 真实图片效果，而不是只看编辑器侧静态占位。
  4. 用户在同一主题下切换这 4 个界面时，每个界面的背景图与装饰层都会按各自配置生效，不会串用到错误界面。
**Plans**: 3 plans  
Plans:
- [x] 74-01-PLAN.md — 冻结 screen chrome 契约 (backgroundImage + decorations)、GameMenu @deprecated fallback、scan/ThemeManager 扩展
- [x] 74-02-PLAN.md — Runtime 渲染：4 屏背景图 (object-fit:cover) + 装饰层 (pointer-events:none) + GameMenu fallback
- [x] 74-03-PLAN.md — 编辑器接入：MajorScreenImageSettings.vue 统一组件 + >3 装饰层软提示 + iframe 预览联调
**UI hint**: yes

### Phase 75: 光标图标与全链路收口
**Goal**: 用户可以完成主题级 cursor / icon 皮肤，并确认所有 v1.5 UI 图片在预览、运行时、导出和缺图回退中表现一致。  
**Depends on**: Phase 74  
**Requirements**: CUR-01, ICO-01, AST-03, AST-04  
**Success Criteria** (what must be TRUE):
  1. 用户可以为主题配置 `default / pointer` 两种光标图片；缺图或路径失效时会自动回退到系统 cursor。
  2. 用户可以为 `game menu`、`QAB`、`close`、`voice-replay` 这些核心 action slots 配置主题图标；缺图时会回退到默认图标。
  3. 用户在编辑器预览、运行时试玩和导出成品中查看已配置的 v1.5 UI 图片时，看到的是同一套资源，不会出现“编辑器可见、导出丢图”。
4. 用户删除、移走或留空 UI 图片资源后，界面仍会回退到现有 CSS 外观 / 默认图标 / 系统光标，并保持可正常使用。
**Plans**: 3 plans  
**UI hint**: yes

### Phase 76: 图标运行时闭环与回退修复
**Goal**: 用户配置的主题图标在 preview / runtime / export 三条链路中真正闭环生效，且缺图时稳定回退到默认图标或文字。  
**Depends on**: Phase 75  
**Requirements**: ICO-01, AST-03, AST-04  
**Gap Closure**: Closes gaps from `v1.5-MILESTONE-AUDIT.md`
**Success Criteria** (what must be TRUE):
  1. 用户为 `ui.theme.icons.qab` 配置图片后，QAB 在编辑器预览、运行时试玩和导出成品里都会显示该图标，而不是继续使用硬编码 SVG。
  2. 用户配置错误路径、删除图标资源或留空图标槽位时，相关 action slot 会回退到默认文字或默认图标，而不是显示坏掉的 `<img>`。
  3. 用户对 `game menu`、`QAB`、`close`、`voice-replay` 四类 icon slot 做切换时，看到的行为在 preview / runtime / export 三条链路中保持一致。
  4. Phase 75 的核心 icon/runtime fallback 缺口在 phase-level verification 中被重新验证并记录为可审计证据。
**Plans**: 2 plans
Plans:
- [x] 76-01-PLAN.md — 补齐 QAB icon runtime consumer 与 main.js preview/runtime wiring
- [x] 76-02-PLAN.md — 统一 themed icon 缺图 fallback 合同并覆盖全部现有 consumer
**UI hint**: yes

### Phase 77: v1.5 验证与追踪表回填
**Goal**: 用户在 milestone 归档前拥有完整、可追溯的验证证据，确保 v1.5 的已交付能力被 phase verification 和 requirement traceability 正式闭环。  
**Depends on**: Phase 76  
**Requirements**: AST-01, AST-02, AST-05, AST-06, DLG-01, DLG-02, DLG-03, SCR-01, SCR-02, SCR-03, CUR-01  
**Gap Closure**: Closes gaps from `v1.5-MILESTONE-AUDIT.md`
**Success Criteria** (what must be TRUE):
  1. Phase 71、72、74、75 都补齐 `VERIFICATION.md`，并把 requirement/evidence/gaps 状态落成正式 phase-level 报告。
  2. `REQUIREMENTS.md` 的 traceability table 与审计结果一致，不再出现“ROADMAP / SUMMARY 已完成，但 requirement 仍停留在旧 phase 或 Pending”的漂移。
  3. v1.5 中来自 AST / DLG / SCR / CUR 的 partial requirements 被重新核对，只有真正满足者才会重新进入 milestone-ready 状态。
  4. 重新执行 milestone audit 时，不再因为缺 verification artifact 或 traceability 漂移被阻塞。
**Plans**: 2 plans
Plans:
- [x] 77-01-PLAN.md — 回填 71 / 72 / 74 / 75 的 verification evidence pack
- [ ] 77-02-PLAN.md — 对齐 REQUIREMENTS 与 milestone audit 到最新 verification 证据
**UI hint**: no

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| AST-01 | Phase 77 |
| AST-02 | Phase 77 |
| AST-05 | Phase 77 |
| AST-06 | Phase 77 |
| DLG-01 | Phase 77 |
| DLG-02 | Phase 77 |
| DLG-03 | Phase 77 |
| BTN-01 | Phase 73 |
| BTN-02 | Phase 73 |
| BTN-03 | Phase 73 |
| SCR-01 | Phase 77 |
| SCR-02 | Phase 77 |
| SCR-03 | Phase 77 |
| CUR-01 | Phase 77 |
| ICO-01 | Phase 76 |
| AST-03 | Phase 76 |
| AST-04 | Phase 76 |

**Coverage:** 17/17 requirements mapped ✓  
**Orphans:** 0

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 71. 共享契约与资产通路基线 | 3/3 | ✅ Complete | 2026-04-25 |
| 72. 对话框图片化闭环 | 3/3 | ✅ Complete | 2026-04-25 |
| 73. 按钮族图片态扩面 | 3/3 | ✅ Complete | 2026-04-25 |
| 74. 主要界面图片化 | 3/3 | ✅ Complete | 2026-04-25 |
| 75. 光标图标与全链路收口 | 3/3 | ✅ Complete | 2026-04-25 |
| 76. 图标运行时闭环与回退修复 | 2/2 | Complete   | 2026-04-27 |
| 77. v1.5 验证与追踪表回填 | 1/2 | In Progress|  |
