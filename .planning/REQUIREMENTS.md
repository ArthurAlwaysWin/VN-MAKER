# Requirements: Galgame Maker

**Defined:** 2026-03-31
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v0.3 Requirements

Requirements for v0.3 milestone: PPT 式游戏内容编辑器。

### 页面编辑器核心 (EDITOR)

- [ ] **EDITOR-01**: 用户可在左侧边栏以缩略图幻灯片形式查看场景中所有页面
- [ ] **EDITOR-02**: 用户可创建新页面（插入到当前选中页面之后）
- [ ] **EDITOR-03**: 用户可删除页面（带确认提示）
- [ ] **EDITOR-04**: 用户可通过拖拽在侧栏中重新排列页面顺序
- [ ] **EDITOR-05**: 用户可在 1280×720 画布上所见即所得编辑页面内容（背景/角色/对话）
- [ ] **EDITOR-06**: 用户可在画布上添加、移除和拖拽定位角色
- [ ] **EDITOR-07**: 用户可在检查器面板中设置页面对话（说话人 + 文本）
- [ ] **EDITOR-08**: 用户可为每页设置 BGM 和音效

### 资源选择器 (PICKER)

- [ ] **PICKER-01**: 用户可从资源库角色列表中通过下拉选择器选取角色
- [ ] **PICKER-02**: 用户可从缩略图网格中选取角色表情
- [ ] **PICKER-03**: 用户可通过带预览的视觉选择器选取背景图
- [ ] **PICKER-04**: 用户可通过带播放预览的选择器选取 BGM/SE 文件

### 页面转场 (EFFECT)

- [ ] **EFFECT-01**: 用户可为每页设置转场类型（淡入/左滑/右滑/无）
- [ ] **EFFECT-02**: 引擎在播放时按配置渲染页面转场效果

### 选择分支 (BRANCH)

- [ ] **BRANCH-01**: 用户可创建选择页面（显示多个选项给玩家）
- [ ] **BRANCH-02**: 用户可将每个选项链接到目标页面/场景作为跳转目的地
- [ ] **BRANCH-03**: 选择页面在侧栏中有视觉区分标识

### 编辑器试玩 (PLAY)

- [ ] **PLAY-01**: 用户可一键从当前页面开始试玩
- [ ] **PLAY-02**: 试玩在编辑器内打开游戏预览（非独立窗口）
- [ ] **PLAY-03**: 用户可随时停止试玩返回编辑器

### 数据格式 (DATA)

- [ ] **DATA-01**: 新页面格式每页存储：背景、角色[]、对话、BGM、转场配置
- [ ] **DATA-02**: 新项目统一使用页面格式（编辑器不再生成旧命令格式）
- [ ] **DATA-03**: 引擎适配页面格式数据，能正确播放页面式脚本

## Future Requirements

### 演出系统

- **ANIM-01**: 用户可在页面内创建演出子时间线（角色移动、相机效果）
- **ANIM-02**: 用户可设置高级转场效果（震动/缩放/模糊）

### 可视化流程

- **FLOW-01**: 用户可在流程图视图中查看页面间连接关系
- **FLOW-02**: 变量/条件分支以可视化节点形式呈现

### 游戏 UI 设计器

- **UIDES-01**: 用户可自定义游戏快捷按钮栏布局（自动/快进/存档/读档/设置）
- **UIDES-02**: 用户可自定义存读档界面布局（槽位样式/缩略图/排版）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 旧命令格式迁移 | 项目未上线，无真实用户数据；范式差异太大，迁移结果质量差 |
| Live2D / 3D 动画 | 超出当前技术栈范围 |
| 视频背景 | 存储/带宽成本高，推迟到后续 |
| 多语言 (i18n) | 当前中文优先，推迟到后续 |
| 导出/打包 | 推迟到后续 Milestone |
| 语音/配音系统 | 超出当前范围 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDITOR-01 | — | Pending |
| EDITOR-02 | — | Pending |
| EDITOR-03 | — | Pending |
| EDITOR-04 | — | Pending |
| EDITOR-05 | — | Pending |
| EDITOR-06 | — | Pending |
| EDITOR-07 | — | Pending |
| EDITOR-08 | — | Pending |
| PICKER-01 | — | Pending |
| PICKER-02 | — | Pending |
| PICKER-03 | — | Pending |
| PICKER-04 | — | Pending |
| EFFECT-01 | — | Pending |
| EFFECT-02 | — | Pending |
| BRANCH-01 | — | Pending |
| BRANCH-02 | — | Pending |
| BRANCH-03 | — | Pending |
| PLAY-01 | — | Pending |
| PLAY-02 | — | Pending |
| PLAY-03 | — | Pending |
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |

**Coverage:**
- v0.3 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
