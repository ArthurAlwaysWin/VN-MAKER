# Requirements: Galgame Maker v1.7 Galgame 标配系统补全

**Defined:** 2026-04-28
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1 Requirements

本里程碑聚焦把项目从“视觉和编辑体验很强的 VN 制作器”推进到“具备基础 Galgame 标配玩法闭环”的阶段。  
完成边界不是“多几个逻辑字段”，而是：**变量系统注册化 + 条件分支可视化 + 好感度/结局追踪 + CG 鉴赏 + save/profile 分层持久化**。

### Data Contracts

- [x] **DATA-01**: 项目拥有稳定 `projectId`，玩家持久化数据不再依赖标题名等可变字段作为 key
- [x] **DATA-02**: `script.json` 以显式注册表定义 variables / endings / gallery.cg，全部使用稳定 ID 而不是自由文本或资源路径推断
- [ ] **DATA-03**: 运行时变量变化与解锁变化统一走最小 effect DSL（至少支持 `var:set`、`var:add`、`var:sub`、`unlock:ending`、`unlock:cg`）

### Variable Authoring

- [ ] **VAR-01**: 用户可以在项目级变量注册表中创建并管理变量，包含 `id`、显示名、类型（bool/number）、默认值、分组、备注
- [ ] **VAR-02**: 用户在页面/选项编辑时可以通过变量选择器配置 `set` / `add` / `subtract`，而不需要手写变量 key
- [ ] **VAR-03**: 用户重命名或删除变量时，编辑器会提供引用计数、反向引用位置与安全检查，而不是静默打断现有剧情逻辑

### Branching Logic Authoring

- [ ] **BRN-01**: 用户可以通过条件页 GUI 配置 1~3 条变量条件，支持 `== != > >= < <=` 与“全部满足 / 任一满足”
- [ ] **BRN-02**: 用户配置条件跳转时使用场景选择器和可读摘要，而不是手写场景 ID 或只看到底层字段

### Affection & Ending Progression

- [ ] **AFF-01**: 用户可以把数值变量声明为“好感度预设”，并获得角色标签、快速 `+1/-1` 操作与阈值检查建议
- [ ] **END-01**: 用户可以在项目级结局注册表中定义 ending ID、标题、类型/分类、顺序，以及可选缩略图/说明
- [ ] **END-02**: 游戏到达某个结局时会显式写入 persistent ending unlock 记录，至少包含解锁状态、首次达成时间与达成次数
- [ ] **END-03**: 用户可以在标题页或额外界面中查看已解锁/未解锁结局状态，而不需要依赖存档文件推断

### CG Gallery Progression

- [ ] **CG-01**: 用户可以在项目级 CG 注册表中定义 CG item ID、标题、缩略图、锁定占位图、图片列表、顺序/分组
- [ ] **CG-02**: 游戏通过显式 `unlock_cg(id)` 或等效 effect 解锁 CG，解锁状态跨存档持久保存
- [ ] **CG-03**: 玩家可以在游戏内查看最小 CG 图鉴，至少支持 locked/unlocked 状态展示与已解锁 CG 的简单查看

### Compatibility, Persistence & Validation

- [x] **PERS-01**: 玩家持久化 `profile` 与普通 `save slot` 严格分层；加载/删除普通存档不会破坏 ending/CG/read-history 的持久进度
- [x] **PERS-02**: 用户在开发和测试阶段可以明确重置或重建 profile/save 数据，而不需要手动修改底层文件或依赖旧 schema 迁移
- [ ] **PERS-03**: 编辑器、运行时、保存重开、导出成品对变量/结局/CG 持久化表现一致，不会出现“编辑器可见、成品不记进度”
- [ ] **PERS-04**: 编辑器会阻止或明确提示孤儿 ending、孤儿 CG、缺失解锁引用与无兜底结局等高风险配置问题

## v2 Requirements

延后到后续 milestone，不进入本次 roadmap。

### Narrative Tooling

- **FLOW-01**: 用户可以通过分支流程图可视化查看和编辑场景间连接关系
- **FLOW-02**: 用户可以回放已解锁路线或场景片段（replay scene system）

### Progression Extras

- **EXTRA-01**: 用户可以为游戏配置 BGM 鉴赏室
- **EXTRA-02**: 用户可以配置成就系统
- **EXTRA-03**: 用户可以使用复杂 affection 公式、衰减或关系图

### Scripting & Data Power

- **SCRIPT-01**: 用户可以使用字符串变量与更复杂的表达式语言
- **SCRIPT-02**: 用户可以配置通用 persistent variables，而不只是专用 progression profile

## Out of Scope

明确排除，避免 v1.7 范围膨胀。

| Feature | Reason |
|---------|--------|
| 分支流程图 / 节点图编辑器 | 很有价值，但与变量/解锁闭环相比更适合作为后续独立 milestone 深挖 |
| BGM 鉴赏室 | 与 CG/结局同属 extras，但首轮应先完成更核心的剧情 progression 闭环 |
| 成就系统 | 会让 unlock 模型继续扩张，先把 ending/CG 两类典型 unlock 走通 |
| 复杂公式 / 表达式语言 | 超出“无代码、可验证”的第一阶段 cut line，容易把 milestone 做成半个平台 |
| 自动推断 CG/结局解锁 | 规则不透明、重命名易失效，必须坚持显式注册与显式解锁 |
| 云同步 / Steam 同步 | 依赖稳定的本地 progression contract，属于后续生态层问题 |

## Traceability

Roadmap 创建后回填。每条 requirement 必须映射到且只映射到一个 phase。

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 83 | Complete |
| DATA-02 | Phase 83 | Complete |
| DATA-03 | Phase 83 | Pending |
| VAR-01 | Phase 84 | Pending |
| VAR-02 | Phase 84 | Pending |
| VAR-03 | Phase 84 | Pending |
| BRN-01 | Phase 84 | Pending |
| BRN-02 | Phase 84 | Pending |
| AFF-01 | Phase 85 | Pending |
| END-01 | Phase 85 | Pending |
| END-02 | Phase 85 | Pending |
| END-03 | Phase 85 | Pending |
| CG-01 | Phase 86 | Pending |
| CG-02 | Phase 86 | Pending |
| CG-03 | Phase 86 | Pending |
| PERS-01 | Phase 83 | Complete |
| PERS-02 | Phase 83 | Complete |
| PERS-03 | Phase 86 | Pending |
| PERS-04 | Phase 86 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-28*
*Last updated: 2026-04-28 after user clarified no old-project migration requirement*
