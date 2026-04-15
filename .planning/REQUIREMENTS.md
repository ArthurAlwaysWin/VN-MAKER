# Requirements: Galgame Maker v1.0

**Defined:** 2026-04-12
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1.0 Requirements

### 引擎渲染 (ENG)

- [ ] **ENG-01**: CharacterLayer 从单 `<img>` 重构为双图层结构（容器 div + 两个 img），保持 4 种定位模式（left/center/right/custom）不变
- [ ] **ENG-02**: 表情切换时执行 crossfade 过渡动画（CSS opacity 过渡），新图片预加载完成后才开始过渡，避免闪白
- [ ] **ENG-03**: 快进模式下表情切换跳过动画（0ms 立即替换）

### 状态管理 (STATE)

- [ ] **STATE-01**: 引擎维护表情状态 Map，页面未指定表情时沿用上一页的表情，无上一页时 fallback 到角色第一个表情
- [ ] **STATE-02**: getState()/restoreState() 扩展，存档包含当前表情状态，读档后正确恢复每个角色的表情
- [ ] **STATE-03**: 进入新场景时重置表情状态（清除继承，从 fallback 重新开始）

### 编辑器 UI (UI)

- [x] **UI-01**: ExpressionDropdown 缩略图网格选择器组件（Teleport + fixed 定位，复用 CharacterPicker 网格模式）
- [ ] **UI-02**: PageInspector 集成 — 角色行和对话表情处均使用 ExpressionDropdown 替换现有 `<select>`
- [ ] **UI-03**: 画布预览显示继承后的实际表情（未显式设置时显示继承来源的表情）
- [ ] **UI-04**: 删除表情后的 stale 引用优雅降级 — 引擎和编辑器均 fallback 到第一个可用表情，不显示空白

## Future Requirements

### 后续增强（不在 v1.0 范围内）

- **ENG-F01**: 分层合成表情系统（底图 + 表情图层叠加）— 减少素材量
- **UI-F01**: 表情分组/层级（服装组 → 组内表情）— 大量差分时组织更清晰
- **UI-F02**: 页面缩略图中标注表情变化 — 快速定位表情切换点
- **UI-F03**: defaultExpression 字段（角色定义中指定默认表情）— 替代"第一个表情"隐式规则

## Out of Scope

| Feature | Reason |
|---------|--------|
| 分层合成（底图+表情图层） | 用户选择整图切换模式，更简单 |
| 表情动画（眨眼、口型同步） | 超出 v1.0 范围，需要动画引擎 |
| 表情层级/分组数据模型 | 扁平式设计已决定，保持简洁 |
| 自动表情匹配（按对话情绪） | AI/NLP 功能，远期目标 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENG-01 | Phase 37 | Pending |
| ENG-02 | Phase 38 | Pending |
| ENG-03 | Phase 38 | Pending |
| STATE-01 | Phase 39 | Pending |
| STATE-02 | Phase 39 | Pending |
| STATE-03 | Phase 39 | Pending |
| UI-01 | Phase 40 | Complete |
| UI-02 | Phase 40 | Pending |
| UI-03 | Phase 41 | Pending |
| UI-04 | Phase 41 | Pending |

**Coverage:**
- v1.0 requirements: 10 total
- Mapped to phases: 10 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
