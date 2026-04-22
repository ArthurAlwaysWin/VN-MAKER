# Requirements: Galgame Maker

**Defined:** 2026-04-21
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1 Requirements

Requirements for milestone v1.4 演出力升级.

### Character Animation

- [x] **ANIM-01**: 创作者可以为页面中的每个角色选择一个预设动画。
- [x] **ANIM-02**: 创作者可选的内置角色动画至少包含 `fade-in`、`slide-in-left`、`slide-in-right`、`shake`、`nod`、`breathe`。
- [x] **ANIM-03**: 播放者看到的一次性动画会自动结束，循环动画会在当前页面保持运行并在离开页面时自动清理。
- [ ] **ANIM-04**: 创作者可以在编辑器中单独重播角色动画预览，而无需启动完整试玩流程。

### Camera Effects

- [x] **CAM-01**: 创作者可以为一个页面配置一个镜头效果。
- [x] **CAM-02**: 创作者可选的页面镜头效果至少包含 `shake`、`zoom`、`pan`、`flash`。
- [x] **CAM-03**: 创作者可以为镜头效果配置时长、强度，以及效果适用时的方向参数。
- [x] **CAM-04**: 播放者看到的镜头效果会在页面进入时触发，且同一时间只存在一个页面级镜头效果。
- [x] **CAM-05**: 播放者看到的镜头效果只作用于舞台画面，不影响对话框和叠加界面的可读性。

### Transitions

- [ ] **TRAN-01**: 创作者可以为页面选择至少 7 种可区分的转场类型。
- [ ] **TRAN-02**: 新增转场能力至少覆盖 `dissolve`、`wipe`、`scale`（缩放）、`blur`，并保留现有 `none`、`fade`、`slide-*` 兼容行为。
- [ ] **TRAN-03**: 创作者可以在编辑器中预览单次转场效果，而不需要真正切换到其他页面。
- [ ] **TRAN-04**: 播放者看到的页面切换顺序保持稳定：旧页面退出与背景转场完成后，再进入角色动画和镜头效果。

### Preview and Compatibility

- [ ] **PREV-01**: 创作者可以在现有页面编辑流程内配置角色动画、镜头效果和转场，不需要进入额外模式。
- [ ] **PREV-02**: 创作者可以通过 iframe 运行时预览分别重播角色动画、镜头效果和转场，且预览支持明确的失败/禁用提示。
- [ ] **PREV-03**: 创作者在执行预览后，编辑器会恢复到预览前的页面编辑状态。
- [x] **PREV-04**: 旧项目和未来项目中的未知动画值、镜头值、转场值在编辑器打开和保存后不会被静默清除。
- [ ] **PREV-05**: 播放者在跳过、自动、读档、返回标题和停止预览等流程中，不会看到残留的动画类、镜头状态或闪屏覆盖层。

## v2 Requirements

Deferred to future milestones.

### Advanced Cinematics

- **CINE-01**: 创作者可以组合多个角色动画预设形成宏效果。
- **CINE-02**: 创作者可以为一个页面编排多个镜头效果或镜头链。
- **CINE-03**: 创作者可以使用时间轴、关键帧或曲线编辑动画。
- **CINE-04**: 创作者可以添加粒子、天气、视频等更重型演出系统。
- **CINE-05**: 创作者可以配置跨页面持续存在的连续演出状态。

## Out of Scope

| Feature | Reason |
|---------|--------|
| ATL 风格自由动画语言 | 超出 GUI-first、低学习成本的 v1.4 范围 |
| 时间轴 / 关键帧 / 曲线编辑器 | 会把高 ROI 里程碑变成新的动画平台项目 |
| 多镜头叠加与复杂编排 | 预览与运行时可靠性风险高，先限制为单页单镜头 |
| GSAP / anime.js / PixiJS / Canvas 新渲染路径 | 当前 Electron + DOM/CSS 足够，新增依赖只会增加复杂度 |
| 粒子 / 天气 / 视频系统 | 不属于本次“低成本快速提升游戏感”的核心范围 |
| 依赖新美术资源的演出包系统 | 会把问题转成内容管线建设，不适合 v1.4 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANIM-01 | Phase 68 | Complete |
| ANIM-02 | Phase 68 | Complete |
| ANIM-03 | Phase 68 | Complete |
| ANIM-04 | Phase 69 | Pending |
| CAM-01 | Phase 68 | Complete |
| CAM-02 | Phase 68 | Complete |
| CAM-03 | Phase 68 | Complete |
| CAM-04 | Phase 68 | Complete |
| CAM-05 | Phase 68 | Complete |
| TRAN-01 | Phase 69 | Pending |
| TRAN-02 | Phase 69 | Pending |
| TRAN-03 | Phase 69 | Pending |
| TRAN-04 | Phase 69 | Pending |
| PREV-01 | Phase 69 | Pending |
| PREV-02 | Phase 69 | Pending |
| PREV-03 | Phase 69 | Pending |
| PREV-04 | Phase 68 | Complete |
| PREV-05 | Phase 70 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-21 after v1.4 requirements definition*
