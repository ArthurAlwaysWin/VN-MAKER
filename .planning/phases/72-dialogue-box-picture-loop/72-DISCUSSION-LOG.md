# Phase 72: 对话框图片化闭环 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 72-对话框图片化闭环
**Areas discussed:** 主框图片归属, 名牌与装饰组织, 层级与可见性保护, 预览入口

---

## 主框图片归属

| Option | Description | Selected |
|--------|-------------|----------|
| 继续沿用 `ui.theme.nineSlice.dialogueBox` | 复用现有运行时主框图片通路，Phase 72 只补 dialogue-specific 图片层 | ✓ |
| 新增 `ui.dialogueBox.frameImage` | 给对话框再开一套主框字段，但会与 nine-slice 责任重叠 | |
| 双轨长期并存 | 同时支持两套主框入口，复杂度最高，容易造成 owner 漂移 | |

**User's choice:** 自动模式采用推荐项：继续沿用 `ui.theme.nineSlice.dialogueBox`
**Notes:** 现有 `ThemeManager.js` 已支持对话框 nine-slice 主框图，推荐避免 Phase 72 再引入第二套主框图片 owner。

## 名牌与装饰组织

| Option | Description | Selected |
|--------|-------------|----------|
| 名牌背景独立 + 装饰层列表（最小支持至少一层） | 兼容当前 nameplate style，且给后续 phase 留扩展空间 | ✓ |
| 全部并入一张大背景图 | 实现简单，但不满足名牌独立与装饰层分离诉求 | |
| 自由定位装饰编辑器 | 灵活但明显超出本 phase 范围 | |

**User's choice:** 自动模式采用推荐项：名牌背景独立 + 装饰层列表
**Notes:** 既满足 `DLG-01` 的“名牌背景 + 至少一层装饰”，又不把 Phase 72 拉成自由画布系统。

## 层级与可见性保护

| Option | Description | Selected |
|--------|-------------|----------|
| 图片层永远在文字/指示/QAB 下方，装饰默认不拦截点击 | 最稳，直接服务 `DLG-02` | ✓ |
| 直接把图片写成背景，不单独建层 | 简单但难精确控制名牌/装饰与文字层关系 | |
| 把图片层挂到整个 `#dialogue-layer` 顶层 | 灵活但更容易误伤交互命中与层级 | |

**User's choice:** 自动模式采用推荐项：图片层永远在文字/指示/QAB 下方
**Notes:** 这是最直接的“文字层不被遮挡”保障，也与现有 DOM/CSS runtime 最一致。

## 预览入口

| Option | Description | Selected |
|--------|-------------|----------|
| `ProjectSettings.vue` iframe runtime preview | 已有全局设置预览 owner，符合 milestone 的唯一事实来源原则 | ✓ |
| 保留本地 mini preview 作为主要预览 | 快，但不满足 runtime-backed 目标 | |
| 挪到 `PageCanvas.vue` 做画布假预览 | 与全局 dialogue settings owner 不匹配，且是 editor-side mock | |

**User's choice:** 自动模式采用推荐项：`ProjectSettings.vue` iframe runtime preview
**Notes:** `ui.dialogueBox` 是全局配置，且 `ProjectSettings.vue` 已经是 theme/global setting 的 runtime-backed preview owner。

## the agent's Discretion

- 具体字段命名与最小 decoration schema 细节交给 research / planning 收敛。

## Deferred Ideas

- None.
