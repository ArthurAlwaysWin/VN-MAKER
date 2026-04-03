# Milestones

## v0.2 资源库 & 标题页 & 设置叠加层 (Shipped: 2026-03-31)

**Phases completed:** 4 phases, 7 plans, 14 tasks

**Key accomplishments:**

- Commit:

---

## v0.3 PPT 式游戏内容编辑器 (Shipped: 2026-04-01)

**Phases completed:** 6 phases (10, 11, 12, 13, 13.1, 14), 11 plans, ~30 tasks

**Key accomplishments:**

- 页面数据格式 (`pages[]`) 替代命令时间线 (`commands[]`)，引擎完全重写为按页播放
- PPT 风格所见即所得编辑器：场景树侧栏 + 1280×720 WYSIWYG 画布 + 属性检查器
- 视觉资源选择器：角色表情网格、背景预览卡片、音频 MiniPlayer 预听
- 转场效果（淡入淡出 / 滑动 / 无）+ 选择分支页（选项编辑器 + 目标链接）
- 编辑器内联试玩：iframe + postMessage 双向通信 + 只读覆盖层
- UI 打磨：说话人 combobox、选项预览标签、角色缩放滑块

**Milestone audit:** 23/23 requirements passed — see v0.3-MILESTONE-AUDIT.md

**Archives:** milestones/v0.3-ROADMAP.md, milestones/v0.3-REQUIREMENTS.md

---

## v0.4 语音 & 全局字体设置 (Shipped: 2026-04-03)

**Phases completed:** 4 phases (15-18), 6 plans, 13 requirements

**Key accomplishments:**

- 语音引擎（独立通道 + 音量控制 + D-01 停止语义）
- 编辑器语音集成（AudioPicker + 批量命名匹配 + 试听）
- 全局字体设置（数据模型 + 引擎 CSS 自定义属性 + 编辑器 UI + 画布实时预览）
- 回想屏语音重放（▶/■ 按钮 + 高亮反馈）
- 自动模式语音感知（Promise.all 等待 + 300ms 微延迟）

**Milestone audit:** 13/13 requirements passed — see v0.4-MILESTONE-AUDIT.md

**Archives:** milestones/v0.4-ROADMAP.md, milestones/v0.4-REQUIREMENTS.md

---
