# Phase 24: ThemeManager Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 24-thememanager-engine
**Areas discussed:** 主题数据模型, 重置行为, 主题初始化时机, 编辑器预览通信

---

## 主题数据模型

| Option | Description | Selected |
|--------|-------------|----------|
| 稀疏存储 | 只存用户覆盖的 token，DEFAULT_TOKENS 提供默认值 | ✓ |
| 全量存储 | 始终存满 41 个 token，读取时直接用 | |

**User's choice:** 稀疏存储
**Notes:** 稀疏存储文件小，升级加新 token 时自动用新默认值

| Option | Description | Selected |
|--------|-------------|----------|
| 直接合并 | 注入时 { ...DEFAULT_TOKENS, ...ui.theme.tokens } | ✓ |
| Proxy 拦截 | 用 Proxy 拦截 set/delete 操作 | |

**User's choice:** 直接合并
**Notes:** 简单直接，token 总量才 41 个无需复杂策略

---

## 重置行为

| Option | Description | Selected |
|--------|-------------|----------|
| 只清 tokens | 设为 {} 或 null，九宫格等未来字段不动 | ✓ |
| 清空整个 ui.theme | 所有主题数据全部重置包括未来九宫格配置 | |

**User's choice:** 只清 tokens
**Notes:** 符合分层设计，重置颜色不影响未来的图片配置

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要确认 | 直接重置并推送撤销记录 | ✓ |
| 需要确认 | 弹确认对话框「确定重置主题颜色？」 | |

**User's choice:** 不需要确认
**Notes:** 有撤销/重做可回退，不打断操作流

---

## 主题初始化时机

| Option | Description | Selected |
|--------|-------------|----------|
| applyGlobalStyle 之前 | 先设主题色，字体设置叠加覆盖 | ✓ |
| applyGlobalStyle 之后 | 字体先设，主题后设 | |

**User's choice:** applyGlobalStyle 之前
**Notes:** 符合 Phase 23 D-01 三层优先级设计

| Option | Description | Selected |
|--------|-------------|----------|
| 独立模块 ThemeManager.js | 导出 applyTheme + resetTheme 纯函数 | ✓ |
| 嵌入 main.js | 不新建文件 | |

**User's choice:** 独立模块
**Notes:** 便于 Phase 25+ 扩展和编辑器复用

---

## 编辑器预览通信

| Option | Description | Selected |
|--------|-------------|----------|
| 整包替换 | { type: 'update-theme', theme: {...} }，41 token 全量 | ✓ |
| 增量更新 | { type: 'update-theme', key: 'x', value: 'y' }，单 token | |

**User's choice:** 整包替换
**Notes:** 41 个 token 量极小，无需 diff 逻辑

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 24 只做引擎侧 handler | 编辑器发送留到 Phase 26 | ✓ |
| 复用 usePageEditor 的 start 流程 | start 消息已含 script.ui.theme | |

**User's choice:** Phase 24 只做引擎侧
**Notes:** 编辑器主题设计器 UI 属 Phase 26，Phase 24 先准备接收能力

---

## Agent's Discretion

- applyTheme 内部清除/覆盖策略
- ThemeManager 是否缓存当前主题状态
- resetTheme 内部实现细节

## Deferred Ideas

None
