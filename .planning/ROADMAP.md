# Milestone v1.6: 完整主题包与图片主题产出

**Status:** In progress  
**Phases:** 78-82  
**Total Requirements:** 14  
**Granularity:** standard

## Overview

v1.6 不是“继续补几个图片槽位”，而是把 v1.5 已打通的图片 UI 能力升级成**完整主题包系统**：用户可以浏览、导入、安装、应用、导出完整图片主题，并最终拿到 5 套可直接复用的成品主题。

本 milestone 明确锁定以下边界：

- **Phase numbering 延续 v1.5**：从 **Phase 78** 开始
- **先合同，后链路，后浏览器，后内容产出**
- **先 1 套 golden theme，再扩展剩余 4 套**
- **built-in themes 与 imported themes 必须走同一条 install/apply path**
- **`.gmtheme` 是新的完整导出格式；legacy `.theme` 仅保留兼容导入**
- **本 milestone 不做“未应用主题的 live iframe preview”**
  - 主题浏览器只展示：**卡片预览图 + coverage/overwrite explanation**
- **运行时真源仍然是项目内 `script.json`**
  - 不引入 theme registry overlay 作为运行时第二真源
- **应用后的完整主题必须 project-local 自包含**
  - 主题资产安装到项目内命名空间，保证保存、重开、试玩、导出一致

## Phases

- [x] **Phase 78: 主题包契约与兼容边界** - 冻结 `.gmtheme`、legacy `.theme`、命名空间与 fail-closed 导入边界 (completed 2026-04-27)
- [x] **Phase 79: 统一安装 / 应用 / 导出链路** - 跑通 built-in / imported 共用的 install-apply-export 闭环 (completed 2026-04-27)
- [x] **Phase 80: 主题浏览器与选择 UX** - 让用户在应用前看懂主题内容、覆盖范围与覆盖影响 (completed 2026-04-27)
- [x] **Phase 81: Golden Theme 验收样板** - 先交付 1 套完整 golden theme 验证整链路与 coverage bar (completed 2026-04-28)
- [ ] **Phase 82: 剩余 4 套完整主题扩展** - 在 golden theme 标准上补齐其余 4 套并形成最终 5 套成品库

## Phase Details

### Phase 78: 主题包契约与兼容边界
**Goal**: 用户在写入项目之前，就能面对明确、可验证、不会静默降级的完整主题包契约与兼容边界。  
**Depends on**: Nothing (starts after Phase 77)  
**Requirements**: PKG-03, PKG-04, PKG-05  
**Success Criteria** (what must be TRUE):
  1. 用户导入损坏、不兼容或包含非法路径的主题包时，编辑器会在写入项目之前阻止导入并明确说明原因。
  2. 用户重复导入同一主题包时，相关主题资产会稳定更新到同一命名空间，不会不断生成 `-1/-2/-3` 之类的重复文件。
  3. 用户导入旧 `.theme` 包时，编辑器会明确标记它是“兼容导入 / 部分主题”，并展示缺失的覆盖范围，而不会把它伪装成完整 `.gmtheme`。
**Plans**: 2 plans  

Plans:
- [ ] `78-01-PLAN.md` — Freeze `.gmtheme` schema, canonical namespace rules, and deterministic re-import policy
- [ ] `78-02-PLAN.md` — Wire dry-run import preflight and legacy compatibility UX without Phase 79 install/apply work

### Phase 79: 统一安装 / 应用 / 导出链路
**Goal**: 用户无论应用内置主题还是导入主题，都走同一条安装 / 应用路径，并得到可保存、可重开、可导出的项目内完整主题结果。  
**Depends on**: Phase 78  
**Requirements**: PKG-01, PKG-02, APP-01, APP-02, APP-03  
**Success Criteria** (what must be TRUE):
  1. 用户导入 `.gmtheme` 后，主题配置与全部引用图片资产会自动安装到当前项目中，不需要手动补路径。
  2. 用户应用内置主题或导入主题时，两者都走同一条安装 / 应用路径，并在项目内落成本地可搬运、可再次导出的主题资产。
  3. 用户应用完整主题时，主题负责的范围会原子性整体替换，并支持一次撤销恢复到应用前状态。
  4. 用户应用完整主题、保存项目并重新打开后，编辑器预览、运行时试玩和导出成品中的结果保持一致，不会出现资源丢失或局部失配。
  5. 用户导出当前项目主题时，得到的是自包含的 `.gmtheme` 包；v1.6 不再导出 legacy `.theme`。
**Plans**: 2 plans  

Plans:
- [x] `79-01-PLAN.md` — Unify built-in and imported full-theme install/apply through one project-local pipeline with atomic undo
- [x] `79-02-PLAN.md` — Export the current applied full theme as self-contained `.gmtheme` and prove round-trip parity

### Phase 80: 主题浏览器与选择 UX
**Goal**: 用户在真正应用主题之前，就能看懂这个主题是什么、覆盖什么、会改掉什么，以及它当前处于什么状态。  
**Depends on**: Phase 79  
**Requirements**: BRW-01, BRW-02, BRW-03  
**Success Criteria** (what must be TRUE):
  1. 用户在主题浏览器里能看到每个主题的卡片预览图、名称、作者、版本、来源、兼容信息，以及完整/部分主题标识。
  2. 用户在应用主题前可以查看它覆盖哪些 UI 范围，以及本次操作会覆盖当前项目中的哪些范围，而不需要先实际应用才知道结果。
  3. 用户可以清楚分辨一个主题当前处于“内置可用 / 已导入 / 当前已应用 / 仅兼容部分主题”中的哪种状态。
  4. 用户在主题浏览器里看到的是静态卡片预览图与覆盖说明，而不是未应用主题的 live iframe 预览。
**Plans**: 2 plans  
**UI hint**: yes

Plans:
- [x] `80-01-PLAN.md` — Normalize built-in/imported theme browser items and expose session-scoped imported browser entries
- [x] `80-02-PLAN.md` — Replace split Project Settings theme entry with one unified browser modal and focused UI wiring

### Phase 81: Golden Theme 验收样板
**Goal**: 用户先拿到 1 套包含 `titleScreen` 的完整 golden theme，用它验证 v1.6 的完整主题标准与整条交付链路。  
**Depends on**: Phase 80  
**Requirements**: THM-01  
**Success Criteria** (what must be TRUE):
  1. 用户可以一键应用第一套 shipped golden theme，并看到它完整覆盖 v1.6 定义的主题覆盖面，包含 `titleScreen`，而不是只替换局部颜色或少量图片。
  2. 用户应用 golden theme 后，`titleScreen` 与其他主要非内容 UI 面在保存、重开、试玩和导出项目时保持一致，不会丢图或出现局部失配。
  3. 用户可以把包含 `titleScreen` 的 golden theme 作为 `.gmtheme` 在项目间导出和重新导入，得到相同的完整结果而不需要手动修补。
**Plans**: 3 plans  
**UI hint**: yes

Plans:
- [x] `81-01-PLAN.md` — Expand the shared `.gmtheme` contract and pipeline so full themes own titleScreen visuals while preserving `titleScreen.bgm`
- [x] `81-02-PLAN.md` — Promote built-in `wafuu` and unified browser/import UX to the titleScreen-inclusive golden theme baseline
- [x] `81-03-PLAN.md` — Lock end-to-end titleScreen parity evidence and run the final golden-theme acceptance check

### Phase 82: 剩余 4 套完整主题扩展
**Goal**: 用户最终拿到 5 套同一完整度标准、可直接交付使用的完整图片主题，而不是 1 套完整加 4 套换色变体。  
**Depends on**: Phase 81  
**Requirements**: THM-02, THM-03  
**Success Criteria** (what must be TRUE):
  1. 用户最终可以在主题浏览器中看到 5 套完整图片主题，且这 5 套都达到与 golden theme 相同的 coverage standard。
  2. 用户应用其中任意一套 shipped theme 时，都能得到完整、统一、可直接使用的主题结果，而不是局部覆盖或半成品。
  3. 用户可以清楚分辨这 5 套主题在材质语言、轮廓语言和整体风格倾向上的差异，而不只是配色不同。
**Plans**: 4 plans  
**UI hint**: yes

Plans:
- [ ] `82-01-PLAN.md` — Harden built-in completeness truth, browser honesty, and shared built-in asset materialization before theme production
- [ ] `82-02-PLAN.md` — Promote `default` and `modern-sky` into explicit full themes with canonical assets and distinct preview/signature metadata
- [ ] `82-03-PLAN.md` — Promote `fantasy-dark` and `minimal-white` into explicit full themes with canonical assets and distinct preview/signature metadata
- [ ] `82-04-PLAN.md` — Prove 5-theme parity across the shared pipeline and run the final shipped-theme visual review

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| PKG-03 | Phase 78 |
| PKG-04 | Phase 78 |
| PKG-05 | Phase 78 |
| PKG-01 | Phase 79 |
| PKG-02 | Phase 79 |
| APP-01 | Phase 79 |
| APP-02 | Phase 79 |
| APP-03 | Phase 79 |
| BRW-01 | Phase 80 |
| BRW-02 | Phase 80 |
| BRW-03 | Phase 80 |
| THM-01 | Phase 81 |
| THM-02 | Phase 82 |
| THM-03 | Phase 82 |

**Coverage:** 14/14 requirements mapped ✓  
**Orphans:** 0

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 78. 主题包契约与兼容边界 | 2/2 | Complete   | 2026-04-27 |
| 79. 统一安装 / 应用 / 导出链路 | 2/2 | Complete   | 2026-04-27 |
| 80. 主题浏览器与选择 UX | 2/2 | Complete   | 2026-04-27 |
| 81. Golden Theme 验收样板 | 3/3 | Complete   | 2026-04-28 |
| 82. 剩余 4 套完整主题扩展 | 3/4 | In Progress|  |
