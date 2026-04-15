# Phase 38: 表情交叉漸變 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 38-expression-crossfade
**Areas discussed:** 渐变持续时间, 跨页表情变化, 创作者可配置

---

## 渐变持续时间

| Option | Description | Selected |
|--------|-------------|----------|
| 200-300ms 快速 | 表情变化较快，感觉自然不拖沓 | ✓ |
| 400-500ms 平滑 | 较明显的渐变效果，强调表情过渡 | |
| 800ms 与背景一致 | 统一节奏，但表情变化会显得慢 | |

**User's choice:** 200-300ms 快速（推荐）
**Notes:** 最终确定为 300ms。背景 800ms、进场 500ms，表情变化节奏更快。

---

## 跨页表情变化

| Option | Description | Selected |
|--------|-------------|----------|
| 也用 crossfade | 角色在页面间持续时，表情变化也平滑过渡 | ✓ |
| 保持瞬间替换 | 跨页表情变化用即时切换，crossfade 只用于对话中 | |

**User's choice:** 也用 crossfade（推荐）
**Notes:** show() 中 wasVisible=true 且表情不同时需触发 A/B 图层交叉渐变。

---

## 创作者可配置

| Option | Description | Selected |
|--------|-------------|----------|
| 固定全局默认值 | 不增加 script.json 复杂度，统一 300ms | ✓ |
| 允许逐事件配置 | 灵活但增加脚本复杂度 | |

**User's choice:** 固定全局默认值（推荐）
**Notes:** 统一 300ms，保持脚本结构简洁。

---

## Agent's Discretion

- CSS transition 具体写法
- 预加载策略选择
- 快速连续切换的取消逻辑
- skipMode 集成方式

## Deferred Ideas

None — discussion stayed within phase scope
