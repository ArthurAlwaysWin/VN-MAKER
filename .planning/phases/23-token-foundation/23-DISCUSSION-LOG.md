# Phase 23: Token Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 23-token-foundation
**Areas discussed:** 字体 Token 与现有字体系统, 默认调色板确认, 自定义布局 vs Token 优先级

---

## 字体 Token 与现有字体系统

### Q1: 主题字体 Token 和现有 ui.dialogueBox 全局字体设置如何共存？

| Option | Description | Selected |
|--------|-------------|----------|
| 主题字体做底层默认，现有设置可覆盖 | 主题字体 Token 设全局默认，但 ui.dialogueBox 和设置页组件的逐元素字体仍然可以单独覆盖 | ✓ |
| 主题字体完全接管，淘汰旧系统 | Phase 17 的 ui.dialogueBox 字体设置废弃，统一由主题 Token 控制 | |
| 你来决定 | Agent discretion | |

**User's choice:** 主题字体做底层默认，现有设置可覆盖
**Notes:** 无额外说明

### Q2: 字体 Token 槽位数量

| Option | Description | Selected |
|--------|-------------|----------|
| 2 个槽位（标题+正文） | TKN-02 原始方案，简洁易用 | ✓ |
| 3 个槽位（+对话框专用） | 对话框是 VN 核心，可能想用不同字体 | |
| 你来决定 | Agent discretion | |

**User's choice:** 2 个槽位，对话框通过 Phase 17 的 ui.dialogueBox 覆盖
**Notes:** 用户引用朋友建议——对话框字体是"内容创作级别"的概念而非"主题级别"。同一个主题可以被用在十款字体风格完全不同的 VN 里。在 Token 层加第三个槽位是职责越界。Fallback 链：ui.dialogueBox.fontFamily → var(--gm-font-body)。未来主题包需要控制对话框字体时再扩展。

---

## 默认调色板确认

### Q3: 当前调色板是否直接作为默认主题 fallback？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留现状 | 零视觉回归最简单，现有色值直接作为 fallback | ✓ |
| 微调主色调 | 保留整体风格，但想调整某些具体色值 | |
| 重新设计默认色板 | 借迁移的机会重新设计一套更好的默认配色 | |

**User's choice:** 保留现状，不做任何调整
**Notes:** 无额外说明

---

## 自定义布局 vs Token 优先级

### Q4: 当主题 Token 和用户逐元素自定义冲突时，谁的优先级更高？

| Option | Description | Selected |
|--------|-------------|----------|
| 逐元素自定义优先 | 用户手动设置的单个元素属性始终覆盖主题 Token | ✓ |
| 主题 Token 优先 | 切换主题后全部统一，逐元素自定义被覆盖 | |
| 你来决定 | Agent discretion | |

**User's choice:** 逐元素自定义优先
**Notes:** 用户明确表示"选2是反人类的——用户花时间调好一个元素的颜色，切个主题全没了，这是破坏性操作"。关于切换主题时的处理，用户建议：自定义永久保留（不弹确认对话框），提供"重置为主题默认"按钮，用户主动想清除时才清除。比切主题时自动弹窗更轻量，不打断流程。

---

## Agent's Discretion

- Token 命名约定和分组方式
- JS 内联样式迁移具体策略
- CSS 迁移顺序和分批策略
- cssText 重置防护的具体实现

## Deferred Ideas

None — discussion stayed within phase scope
