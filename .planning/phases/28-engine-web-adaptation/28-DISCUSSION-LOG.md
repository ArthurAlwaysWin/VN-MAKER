# Phase 28: Engine Web Adaptation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 28-engine-web-adaptation
**Areas discussed:** Web 存档方案, 环境检测策略, asset:// 硬编码处理

---

## Web 存档方案

### 存档后端

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage | 简单直接，但只能存约 10-20 个槽位（无缩略图），5MB 限制 | |
| IndexedDB | 无容量限制，async API 与现有接口匹配，可保留 108 槽 + 缩略图 | ✓ |
| localStorage + IndexedDB 混合 | 小数据用 localStorage，缩略图用 IndexedDB | |

**User's choice:** IndexedDB — 无容量限制，async API 与现有接口匹配
**Notes:** 现有 SaveManager 8 个方法全是 async，IndexedDB 的异步特性完美对接

### 存档缩略图

| Option | Description | Selected |
|--------|-------------|----------|
| html2canvas 截图 | 完整还原画面，需引入三方库（~40KB） | |
| 跳过缩略图 | Web 版存档只显示文字信息，零依赖 | ✓ |
| Agent 决定 | 让 agent 选择最佳方案 | |

**User's choice:** 跳过缩略图 — Web 版存档不显示缩略图
**Notes:** 零依赖，符合 v0.7 "零新 npm 依赖"原则

---

## 环境检测策略

### 检测机制

| Option | Description | Selected |
|--------|-------------|----------|
| 功能检测（window.ipcRenderer） | 有 ipcRenderer = Electron，有 parent ≠ self = 预览，其余 = Web | ✓ |
| 显式全局标志 | HTML 模板注入 window.__GM_ENV = 'web' | |
| URL 参数 | ?mode=web 参数区分 | |

**User's choice:** 功能检测 — 零配置，自动识别
**Notes:** 无

### itch.io iframe 区分

| Option | Description | Selected |
|--------|-------------|----------|
| postMessage 握手 | 编辑器预览发 start 消息，收到则为预览，否则为 itch.io/Web | ✓ |
| URL 参数 ?embed=1 | itch.io 链接加参数 | |
| Agent 决定 | | |

**User's choice:** postMessage 握手区分
**Notes:** 编辑器预览已有 start 消息机制，利用现有握手协议

---

## asset:// 硬编码处理

### 路径管理方案

| Option | Description | Selected |
|--------|-------------|----------|
| 统一 basePath 参数化 | 每个组件都加 basePath 属性 | |
| 全局 resolvePath 函数 | 新建 assetPath.js，所有组件调用同一函数 | |
| 折中方案：BASE_PATH + resolvePath | assetPath.js 导出常量给已有组件赋值，导出函数给硬编码位置 | ✓ |

**User's choice:** 折中方案 — BASE_PATH 常量 + resolvePath 函数，同一文件管理
**Notes:** 用户朋友建议的方案。BackgroundLayer/CharacterLayer/AudioManager 保留 basePath 属性但统一赋值来源；SettingsScreen/TitleScreen/SaveLoadScreen 的硬编码改用 resolvePath()。TitleScreen 的前缀判断逻辑可在改用 resolvePath 后清理。

### 已有 basePath 组件处理

**User's choice:** 保留现有 basePath 属性，赋值改为引用 BASE_PATH 常量
**Notes:** 已经 work 的代码不动内部实现，只统一赋值来源

---

## Agent's Discretion

- WebSaveManager 的 IndexedDB schema 设计
- 环境检测 postMessage 握手超时时长
- resolvePath 的 edge case 处理

## Deferred Ideas

None — discussion stayed within phase scope
