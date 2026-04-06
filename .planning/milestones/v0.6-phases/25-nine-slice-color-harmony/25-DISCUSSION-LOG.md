# Phase 25: 9-Slice + Color Harmony - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 25-nine-slice-color-harmony
**Areas discussed:** 九宫格渲染方案, 九宫格目标元素, 配色算法, 数据结构与资产管理

---

## 九宫格渲染方案

### Q1: 九宫格与圆角如何共存？

| Option | Description | Selected |
|--------|-------------|----------|
| ::before 伪元素 + overflow:hidden | 父元素保留 border-radius，::before 负责 border-image | ✓ |
| 直接 border-image，放弃圆角 | 最简单，但九宫格激活时元素变成直角 | |
| mask-image + border-image 组合 | 用 mask 裁剪圆角，技术复杂度较高 | |

**User's choice:** ::before 伪元素 + overflow:hidden
**Notes:** 研究报告 P3 明确 border-image 和 border-radius 互斥，此方案是最干净的解法

### Q2: ::before 的九宫格样式如何注入？

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 CSS 方案（style.cssText） | 描述不准确——内联样式无法设伪元素 | |
| JS 注入 `<style>` 标签 | ThemeManager 维护专用 style 元素，覆写 textContent | ✓ |

**User's choice:** `<style>` 标签注入
**Notes:** 用户详细解释了 insertRule() 的索引管理问题，`<style>` textContent 覆写更简洁。提供了完整代码示例。

### Q3: 九宫格图片在 CSS 中如何引用？

| Option | Description | Selected |
|--------|-------------|----------|
| 内联 Data URL | 图片小(<100KB)，转 base64 直接写入 CSS | ✓ |
| asset:// URL | 依赖现有 asset:// 协议解析 | |

**User's choice:** 内联 Data URL
**Notes:** 避开 asset:// 协议路径问题（P6）

---

## 九宫格目标元素

### Q4: Phase 25 实现哪些九宫格目标元素？

| Option | Description | Selected |
|--------|-------------|----------|
| 全部 6 个目标 | dialogueBox, menuPanel, saveSlot, choiceButton, titleButton, settingsPanel | ✓ |
| 核心 3 个先做 | dialogueBox, menuPanel, choiceButton | |

**User's choice:** 全部 6 个目标
**Notes:** 无

### Q5: 按钮三态如何实现？

| Option | Description | Selected |
|--------|-------------|----------|
| CSS 伪类 | 用 :hover / :active 伪类，浏览器自动处理状态切换 | ✓ |
| JS 事件监听 | mouseenter/mouseleave/mousedown 动态切换 | |

**User's choice:** CSS 伪类
**Notes:** 用户初始跳过，后补充说明选 CSS 伪类——直接用 :hover/:active 不需手动切类名，比 JS 事件监听干净。三态图片 base64 自包含，注入时生成三条 CSS 规则。对话框没有三态只有一套图。

---

## 配色算法

### Q6: 配色算法实现方式？

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 JS 实现 | HSL 色轮计算简单，零依赖 | ✓ |
| chroma.js / color.js | 功能更全但新增依赖 | |

**User's choice:** 纯 JS 实现
**Notes:** 保持零依赖约束

### Q7: 4 种算法全部实现？

| Option | Description | Selected |
|--------|-------------|----------|
| 4 种全部实现 | 互补色/类似色/三角色/分裂互补色 | ✓ |
| 先做 2 种核心 | 互补色 + 类似色 | |

**User's choice:** 全部 4 种
**Notes:** 满足 CLR-02

### Q8: WCAG 对比度验证策略？

| Option | Description | Selected |
|--------|-------------|----------|
| 自动调整亮度 | 不达标时自动调亮度 | |
| 只警告不调整 | 显示对比度值，用户自调 | |
| 警告 + 自动修复建议 + 用户确认 | 工具函数层 contrast.js 实现 | ✓ |

**User's choice:** 警告 + 自动修复建议 + 用户确认
**Notes:** 用户朋友建议的方案。纯自动会破坏用户选色，只警告太被动。正确交互：实时计算→达标绿色✓→不达标黄色警告+「自动修复」按钮→点击显示预览→确认才应用。工具函数层 contrast.js (contrastRatio + autoFix)，编辑器 UI 层 Phase 26 负责展示。autoFix 采用二分查找亮度值。

---

## 数据结构与资产管理

### Q9: nineSlice schema？

| Option | Description | Selected |
|--------|-------------|----------|
| 研究报告定义的完整 schema | { src, slice, width, repeat, outset, states } | ✓ |
| 简化 schema | 去掉 outset | |

**User's choice:** 研究报告完整 schema
**Notes:** 无

### Q10: 图片存储格式？

| Option | Description | Selected |
|--------|-------------|----------|
| base64 Data URL 字符串 | src 字段存完整 data:image/png;base64,... | ✓ |
| 文件路径 + 加载器 | src 存相对路径，渲染时解析 | |

**User's choice:** base64 字符串存储
**Notes:** 与 Data URL 渲染方案一致，自包含无外部依赖

---

## Agent's Discretion

- 按钮三态 CSS 伪类规则的具体生成逻辑细节
- colorHarmony.js 内部实现细节
- autoFix 二分查找的精度参数
- nineSlice `<style>` 标签中选择器命名约定

## Deferred Ideas

None
