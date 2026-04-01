# Phase 13: Transitions & Branching - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 13-transitions-branching
**Areas discussed:** 页面类型切换 UX, 选项编辑器布局, 跳转目标选择

---

## 页面类型切换 UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inspector 顶部 segment 按钮 | 普通页/选择页 segment 切换，最直观 | |
| 侧栏右键菜单 | "转换为选择页"/"转换为普通页"菜单项 | ✓ |
| 侧栏专用按钮 | "新建选择页"按钮，只能新建时选择 | |

**User's choice:** 侧栏右键菜单"转换为选择页"
**Notes:** 用户认为右键菜单已是操作入口集散地（删除、重命名等），用户使用右键时自然能看到此选项。未来还会设计全面的引导/提示系统。

### 切换方向

| Option | Description | Selected |
|--------|-------------|----------|
| 双向切换 | 普通页↔选择页互转 | ✓ |
| 单向 | 只能普通→选择，想转回就删除重建 | |

**User's choice:** 双向切换
**Notes:** 转回普通页时丢弃 prompt/options 数据

---

## 选项编辑器布局

| Option | Description | Selected |
|--------|-------------|----------|
| Inspector 内列表式 | prompt 输入框 + 选项卡片列表 + 添加按钮 | ✓ |
| 独立弹窗编辑器 | 点击"编辑选项"按钮打开弹窗 | |

**User's choice:** Inspector 内列表式
**Notes:** 选择页时，对话编辑区域替换为选项编辑区域

### 选项管理

| Option | Description | Selected |
|--------|-------------|----------|
| 拖拽排序 + ✕ 删除 | 每个选项卡片右侧有删除按钮 | ✓ |
| 上移/下移箭头 + 删除 | 按钮式排序 | |
| 仅添加和删除 | 不支持排序 | |

**User's choice:** 拖拽排序 + ✕ 删除

### 选项数量

| Option | Description | Selected |
|--------|-------------|----------|
| 2-4 个 | 常见 Galgame 范围 | |
| 无上限 | 用户自由添加 | ✓ |
| 固定 2-3 个 | 最简化 | |

**User's choice:** 无上限

### setVariable 支持

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 13 支持 | 每个选项卡片加变量名+值输入 | ✓ |
| 延后 | 只做 text + target | |

**User's choice:** Phase 13 就做进去

---

## 跳转目标选择

### 跳转精度

| Option | Description | Selected |
|--------|-------------|----------|
| 场景级跳转 | 跳到场景首页，配合 _enterScene | ✓ |
| 场景+页面级 | 跳到场景内任意页面 | |

**User's choice:** 场景级跳转
**Notes:** 用户担心小片段只有 1-2 页却要单独成为场景。解决方案：场景增加 `nextScene` 属性，分支场景末尾自动跳回主线。模式：主线→选项→片段场景→nextScene→主线继续。

### 选择器控件

| Option | Description | Selected |
|--------|-------------|----------|
| 下拉选择器 | 列出所有场景名称 | ✓ |
| 树形选择器 | 显示场景树结构 | |

**User's choice:** 下拉选择器

### 转场系统

**User's choice:** 现有转场（fade/slide-left/slide-right/none + duration）已满足 EFFECT-01/02，Phase 13 不修改
**Notes:** 用户认为作为第一版够用，关心架构是否预留扩展空间。确认：添加新类型只需 CSS class + Inspector 选项 + Engine 匹配，无需改架构。

---

## Agent's Discretion

- 选项卡片视觉样式细节
- 空状态提示文案
- setVariable 区域折叠/展开行为
- 确认弹窗措辞
- 新建选择页的默认选项数量（建议 2 个）

## Deferred Ideas

- **好感度/亲密度系统** — 角色好感度变量 + 共通线结束后自动路由
- **故事结构可视化图** — 只读场景关系图，显示主线→分支→汇合
- **条件页编辑器 UI** — 引擎已支持但编辑器 UI 未做
- **更多转场类型** — 溶解、百叶窗等，架构已预留空间
