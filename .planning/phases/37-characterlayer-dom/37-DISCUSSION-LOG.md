# Phase 37: CharacterLayer DOM 重构 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 37-characterlayer-dom
**Areas discussed:** 容器结构, 进出场动画兼容

---

## 容器结构

### Q1: DOM 层级方案

| Option | Description | Selected |
|--------|-------------|----------|
| div 容器承载定位/动画，img 只管图片 | 与 BackgroundLayer 模式一致，职责分离清晰 | ✓ |
| img 保留定位 class，div 仅包裹 | 更少改动，但 crossfade 时两个 img 各自带定位会重复 | |

**User's choice:** div 容器承载定位/动画，img 只管显示图片
**Notes:** 推荐方案，与 BackgroundLayer layerA/layerB 模式一致

### Q2: CSS 类名

| Option | Description | Selected |
|--------|-------------|----------|
| .char-img-a / .char-img-b + .active | 和 BackgroundLayer 的 bg-image-layer 模式对齐 | ✓ |
| .char-front / .char-back | 前景/背景语义 | |
| 你来决定 | Agent discretion | |

**User's choice:** .char-img-a / .char-img-b + .active 类名

### Q3: characters Map 数据结构

| Option | Description | Selected |
|--------|-------------|----------|
| Map<string, HTMLElement>，值改为容器 div | 最小改动 | |
| Map<string, {container, imgA, imgB}> | 结构化对象 | ✓ |
| 你来决定 | Agent discretion | |

**User's choice:** 改为 Map<string, {container, imgA, imgB}>（结构化对象）

---

## 进出场动画兼容

### Q4: 尺寸控制方案

| Option | Description | Selected |
|--------|-------------|----------|
| 容器控制尺寸，img 100% 填充 | 容器 height:90%/max-width:50%，img width:100%/height:100%/object-fit:contain | ✓ |
| img 各自继承尺寸规则 | 每个 img 各自设 height:90% 等，可能有对齐问题 | |

**User's choice:** 容器内部相对定位 + img 用 100% 填充

### Q5: 动画职责分配

| Option | Description | Selected |
|--------|-------------|----------|
| 容器 opacity+transform，img 只用 opacity | 进出场在容器层，crossfade 在 img 层 | ✓ |
| 你来决定 | Agent discretion | |

**User's choice:** 容器用 opacity+transform，子 img 只用 opacity

### Q6: Phase 37 改动范围

| Option | Description | Selected |
|--------|-------------|----------|
| 只处理 show/hide/setExpression/clear 4 方法 | 最小范围，接口签名不变 | ✓ |
| 同时重构调用方（main.js/ScriptEngine） | 更大范围 | |

**User's choice:** 只处理现有 4 个方法（最小范围）

---

## Agent's Discretion

- img 子元素的 z-index 策略
- 容器 div 的 overflow 属性

## Deferred Ideas

None
