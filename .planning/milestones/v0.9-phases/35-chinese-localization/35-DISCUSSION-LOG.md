# Phase 35 Discussion Log

## Session Info
- Date: 2026-04-11
- Phase: 35 — 中文本地化
- Participants: User + Agent

## Gray Areas Identified

1. **Token 命名风格** — 41 个 CSS token 的中文名长度和风格
2. **BGM/SE 策略** — 保留英文缩写还是翻译
3. **技术性文本边界** — px 单位、placeholder、过渡选项等如何处理

User selected: ALL 3 areas

---

## Area 1: Token 命名风格

**Options presented:**
- 简洁派 (2-4字): 组名提供上下文，token 名简短
- 补充派 (4-6字): token 名自带部分上下文
- 详细派 (6+字): token 名完全自解释

**User choice:** 简洁派

**Examples confirmed:**
- primary → 主色, danger → 危险色, accent → 强调色
- dialogue-bg → 对话框, btn-bg → 底色, btn-hover-bg → 悬停色
- body-font → 正文, heading-font → 标题
- border-radius-sm → 小, border-radius-lg → 大

**Rationale:** 组标题（如 🔘 按钮）已明确分类，token 名只需区分同组内含义。具体名称实现时微调。

→ **Decision D-01** recorded

---

## Area 2: BGM/SE 策略

**Options presented:**
- 保留 BGM/SE（游戏行业通用）
- 翻译为"背景音乐"/"音效"（更友好但占空间）
- 混合："背景音乐(BGM)"/"音效(SE)"

**User choice:** BGM 保留，SE → 音效

**Rationale:** BGM 广泛认知，SE 不够广为人知且翻译只有两个字不占空间。

→ **Decision D-02** recorded

---

## Area 3: 技术性文本边界

### Sub-topic 3a: 坐标标签
- `X (px)` / `Y (px)` → 去掉 px 后缀
- User: "其实不需要px后缀，而X和Y则是要让用户知道这是坐标的意思"
- Options: "横坐标 X"/"纵坐标 Y" vs "X坐标"/"Y坐标" vs "水平位置"/"垂直位置"
- User choice: **X坐标 / Y坐标**（绝大多数人都知道 X 代表横轴）

→ **Decision D-03a** recorded

### Sub-topic 3b: Placeholder 值格式
- `#ffffff`、`rgba(0,0,0,0.7)`、`Noto Sans SC` 等
- User choice: **保留英文**（真实值格式示例，用户需照着输入）

→ **Decision D-03b** recorded

### Sub-topic 3c: 过渡效果选项
- `fade` / `slide-left` / `slide-right` / `none`
- User choice: **翻译显示文本**（value 不变）
- 淡入淡出 / 左滑入 / 右滑入 / 无

→ **Decision D-03c** recorded

### Sub-topic 3d: Export 按钮
- "Web" 按钮
- User choice: **网页版**（与"桌面版"对应）

→ **Decision D-03d** recorded

---

## Summary

All 3 gray areas resolved. 6 decisions captured in 35-CONTEXT.md.
