# Milestone v1.7: Galgame 标配系统补全

**Status:** Planned  
**Phases:** 83-86  
**Total Requirements:** 19  
**Granularity:** standard

## Overview

v1.7 的目标不是“继续塞逻辑字段”，而是把当前 page-based VN 制作器补成一套**作者能配置、运行时可信、跨周目不串档**的 Galgame 标配系统基础设施：变量注册表、条件 GUI、好感度预设、结局注册与 persistent unlock、CG 注册与显式解锁、以及 save/profile 分层与兼容/验证闸门。

本 milestone 明确锁定以下边界：

- **Phase numbering 延续 v1.6**：从 **Phase 83** 开始
- **先合同与持久化护栏，再做 authoring，再做 progression UI，再做最终 validation gate**
- **好感度只是 number 变量的 preset，不引入独立 runtime 子系统**
- **结局与 CG 必须显式注册、显式解锁**
- **save slot 与 persistent profile 必须分层；即使 scope 紧张，这条也不能砍**
- **不把旧项目迁移兼容当成 v1.7 阻塞项**；优先 clean contract、schema versioning 与明确 reset 语义
- **不做**：流程图、replay、BGM room、achievements、字符串变量 / 表达式语言、generic persistent vars、auto-detected unlocks、cloud sync

## Phases

- [x] **Phase 83: 剧情系统契约与持久化护栏** - 冻结稳定 projectId、显式注册表、effect contract 与 save/profile 分层基础 (completed 2026-04-28)
- [ ] **Phase 84: 变量注册表与条件分支 GUI** - 让作者能可视化管理变量、条件与跳转，而不是手写 key / scene ID
- [ ] **Phase 85: 好感度预设与结局追踪** - 在变量系统之上补齐 route progression、ending registry 与 persistent ending unlock
- [ ] **Phase 86: CG 图鉴与一致性验证闭环** - 完成 CG registry、显式解锁、最小 gallery 与 milestone 级兼容/导出闸门

## Phase Details

### Phase 83: 剧情系统契约与持久化护栏
**Goal**: 项目先获得可信的剧情系统数据契约与玩家持久化边界，确保后续变量、结局、CG 都建立在不串档、不混档、易于测试重置的基础上。  
**Depends on**: Nothing (starts after Phase 82)  
**Requirements**: DATA-01, DATA-02, DATA-03, PERS-01, PERS-02  
**Success Criteria** (what must be TRUE):
  1. 作者保存并重新打开项目后，variables / endings / gallery.cg 这些项目级定义会以显式注册表和稳定 ID 保留下来，而不是退回自由文本或资源路径猜测。
  2. 玩家进度绑定到稳定 `projectId`，因此修改游戏标题后，既有跨周目进度不会因为 key 变化而丢失。
  3. 普通 save slot 与 persistent profile 被清楚分层：开始新周目、读取存档或删除存档都不会抹掉跨周目的 read-history / ending / CG 进度。
  4. 作者在开发和测试阶段可以明确重置或重建 profile/save 数据，而不需要手动修改底层文件或依赖旧 schema 迁移。
  5. 作者保存并重开项目后，变量写入与 ending/CG 解锁动作会以统一 effect 结构持续存在，而不是散落成彼此不兼容的特例字段。
**Plans**:
- `83-01` Contract freeze: `projectId`, explicit `systems.*` registries, shared contract/version/reset helpers
- `83-02` Persistence boundary: `PlayerDataRepository`, profile vs slot separation, named reset/rebuild entrypoints
- `83-03` Effect normalization: shared `effects[]` DSL, runtime/editor normalization, unlock-to-profile wiring

### Phase 84: 变量注册表与条件分支 GUI
**Goal**: 作者可以不写逻辑脚本，直接通过 GUI 配置变量、数值变化、条件判断与分支跳转。  
**Depends on**: Phase 83  
**Requirements**: VAR-01, VAR-02, VAR-03, BRN-01, BRN-02  
**Success Criteria** (what must be TRUE):
  1. 作者可以在项目级变量注册表中创建和管理 bool / number 变量，并维护显示名、默认值、分组与备注。
  2. 作者在页面或选项编辑时可以通过变量选择器配置 `set` / `add` / `subtract`，而不需要手写变量 key。
  3. 作者可以通过条件页 GUI 配置 1~3 条比较条件，支持 `== != > >= < <=` 与“全部满足 / 任一满足”。
  4. 作者配置条件分流时可以通过场景选择器指定跳转目标，并看到可读的自然语言摘要，而不是裸 scene ID。
  5. 作者重命名或删除变量时，可以看到引用次数、反向引用位置以及明确的安全提示或阻止行为。
**Plans**: TBD
**UI hint**: yes

### Phase 85: 好感度预设与结局追踪
**Goal**: 作者可以在变量系统之上完成 Galgame 常见的好感度推进与结局解锁追踪，玩家也能看到跨周目的结局收集进度。  
**Depends on**: Phase 84  
**Requirements**: AFF-01, END-01, END-02, END-03  
**Success Criteria** (what must be TRUE):
  1. 作者可以把数值变量声明为好感度预设，并获得角色标签、快速 `+1/-1` 入口与阈值检查建议。
  2. 作者可以在项目级结局注册表中维护 ending ID、标题、分类、顺序，以及可选缩略图和说明。
  3. 游戏到达某个结局时，会显式写入该 ending 的 persistent unlock 记录，并能保留首次达成时间与达成次数。
  4. 玩家可以在标题页或额外界面查看结局列表，明确看到 locked / unlocked 状态，而不需要依赖普通存档来推断。
**Plans**: TBD
**UI hint**: yes

### Phase 86: CG 图鉴与一致性验证闭环
**Goal**: 玩家可以跨存档收集并查看 CG，作者在交付前也能通过兼容、引用和导出闸门确认变量/结局/CG 的闭环一致。  
**Depends on**: Phase 85  
**Requirements**: CG-01, CG-02, CG-03, PERS-03, PERS-04  
**Success Criteria** (what must be TRUE):
  1. 作者可以在项目级 CG 注册表中维护 CG item ID、标题、缩略图、锁定占位图、图片列表、顺序与分组。
  2. 游戏可以通过显式 CG unlock 动作解锁图鉴条目，且该解锁会跨新周目、存档删除、保存重开和导出成品持续保留。
  3. 玩家可以在游戏内打开最小 CG 图鉴，看到 locked / unlocked 状态，并查看已解锁 CG 的简单浏览内容。
  4. 编辑器会阻止或明确提示孤儿 ending、孤儿 CG、缺失解锁引用与无兜底结局等高风险配置问题。
  5. 同一项目在编辑器、运行时、保存重开与导出成品中的变量 / ending / CG 持久化表现保持一致，不会出现“编辑器可见但成品不记进度”的分叉。
**Plans**: TBD
**UI hint**: yes

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| DATA-01 | Phase 83 |
| DATA-02 | Phase 83 |
| DATA-03 | Phase 83 |
| VAR-01 | Phase 84 |
| VAR-02 | Phase 84 |
| VAR-03 | Phase 84 |
| BRN-01 | Phase 84 |
| BRN-02 | Phase 84 |
| AFF-01 | Phase 85 |
| END-01 | Phase 85 |
| END-02 | Phase 85 |
| END-03 | Phase 85 |
| CG-01 | Phase 86 |
| CG-02 | Phase 86 |
| CG-03 | Phase 86 |
| PERS-01 | Phase 83 |
| PERS-02 | Phase 83 |
| PERS-03 | Phase 86 |
| PERS-04 | Phase 86 |

**Coverage:** 19/19 requirements mapped ✓  
**Orphans:** 0

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 83. 剧情系统契约与持久化护栏 | 3/3 | Complete   | 2026-04-28 |
| 84. 变量注册表与条件分支 GUI | 0/0 | Not started | - |
| 85. 好感度预设与结局追踪 | 0/0 | Not started | - |
| 86. CG 图鉴与一致性验证闭环 | 0/0 | Not started | - |
