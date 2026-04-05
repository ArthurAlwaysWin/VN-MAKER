# Milestones

## v0.5 游戏 UI 补全 (Shipped: 2026-04-05)

**Phases completed:** 4 phases (19-22), 8 plans, 27 requirements
**Git range:** a6617a4..471c75a (~51 commits)
**Files:** 48 changed, +10120/-308 lines

**Key accomplishments:**

- 存档系统升级：文件系统 `saves/` 目录 + 6 个 IPC handlers + 100 槽位 + 截图缩略图 + localStorage 迁移
- 快捷按钮栏：对话框底部 8 个 Lucide SVG 图标按钮 + 快速存读档(F5/F9) + 激活状态指示
- 存读档界面：全屏 3×3×12 网格（108 槽）+ 分页导航 + 内联确认 + 来源路由返回
- 快进模式：30ms 循环 + 已读追踪(ReadHistory) + BGM 影子状态 + 6 种停止触发器

**Milestone audit:** 27/27 requirements passed — see v0.5-MILESTONE-AUDIT.md

**Archives:** milestones/v0.5-ROADMAP.md, milestones/v0.5-REQUIREMENTS.md

---

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
