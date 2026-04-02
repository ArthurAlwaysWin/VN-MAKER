# Phase 16 Discussion Log

**Date:** 2025-07-19
**Phase:** 16 - Voice Editor Integration

## Gray Areas Discussed

### GA-1: AudioPicker 复用方式
- **Options**: A) mode prop 隐藏标签栏, B) 新增 Voice 标签页, C) 原样复用
- **Decision**: A — 新增 `mode` prop，`mode="voice"` 时隐藏标签栏，标题改为"选择语音文件"
- **Rationale**: 最小改动，避免用户在语音选择时看到 BGM/SE 标签的困惑

### GA-2: 编辑器语音试听方式
- **Options**: A) new Audio() 直接播放, B) iframe postMessage 走引擎
- **Decision**: A — 编辑器内 `new Audio()` 直接播放
- **Rationale**: 不依赖预览 iframe，简单可靠，与 MiniPlayer 播放方式一致

### GA-3: 批量命名匹配作用域与入口
- **Options**: A) 场景树+单场景, B) 检查器+当前页, C) 全局菜单+所有场景
- **Decision**: A+C — 双入口设计，SceneTree 场景行 🔊 按钮（单场景）+ SceneTree 顶部工具栏（全局），共享匹配函数
- **Rationale**: 用户提出同时实现两个粒度，核心匹配逻辑复用，代码增量小

### GA-4: 批量匹配冲突处理
- **Options**: A) 跳过已绑定, B) 覆盖, C) 预览摘要+确认
- **Decision**: C — 匹配前弹窗显示预览摘要，用户选择跳过/覆盖后才应用
- **Rationale**: 最安全，用户有完全控制权，避免意外覆盖手动绑定

## Scope Check
All decisions stay within Phase 16 boundary (editor-side voice integration). No scope creep detected.
