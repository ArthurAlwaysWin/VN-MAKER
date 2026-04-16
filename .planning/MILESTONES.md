# Milestones

## v1.1 v1.1 (Shipped: 2026-04-16)

**Phases completed:** 4 phases, 9 plans, 20 tasks

**Key accomplishments:**

- One-liner:
- BacklogScreen accepts layout config for background/header/entry customization with sanitized CSS, hover effects, and zero-regression null-config path
- Config-driven GameMenu rendering with position/background/button-text/icon support via setLayout(config), null-config COMPAT-02 preserved

---

## v1.0 角色表情/差分場景切換 (Shipped: 2026-04-15)

**Phases completed:** 5 phases (37-41), 7 plans, 10 requirements
**Git range:** v0.9..HEAD (~86 commits)
**Files:** 60 changed, +9533/-849 lines

**Key accomplishments:**

- CharacterLayer 雙圖層重構 — 單 `<img>` 重構為 div+imgA/imgB 容器結構，4 種定位模式完整保留
- 表情交叉漸變 — 300ms CSS opacity crossfade + img.decode() 預加載 + skipMode 即時替換
- 表情狀態管理 — 引擎 Map 追蹤每角色表情，頁面繼承 + 存讀檔持久化 + 場景重置
- ExpressionDropdown 視覺選擇器 — Teleport 縮略圖網格替換 `<select>`，角色行 + 對話行雙處集成
- 畫布繼承預覽 + 安全刪除 — 反向頁面查找顯示繼承表情，刪除前全場景引用掃描 + 批量替換

**Milestone audit:** 10/10 requirements passed — see v1.0-MILESTONE-AUDIT.md

**Archives:** milestones/v1.0-ROADMAP.md, milestones/v1.0-REQUIREMENTS.md

---

## v0.9 编辑器本地化与帮助系统 (Shipped: 2026-04-12)

**Phases completed:** 2 phases (35-36), 4 plans, 15 requirements
**Git range:** v0.8..HEAD (~22 commits)
**Files:** 54 changed, +3368/-222 lines

**Key accomplishments:**

- TOKEN_LABELS 41 条中文映射 + label prop 透传至 5 个 row 组件
- 编辑器残留英文全部翻译（字体选择器、转场、AudioPicker、ExportModal、坐标、占位符）
- HelpTip.vue 组件（Teleport + fixed 定位 + 150ms fade + viewport flip）+ helpTexts.js（6 导出、35 keys）
- 全编辑器 HelpTip 覆盖（26 实例 × 16 文件）+ 按钮 title 扫描（80+ 按钮 × 28 文件）

**Milestone audit:** 15/15 requirements passed — see v0.9-MILESTONE-AUDIT.md

**Archives:** milestones/v0.9-ROADMAP.md, milestones/v0.9-REQUIREMENTS.md

---

## v0.8 游戏导出 Electron 桌面版 (Shipped: 2026-04-10)

**Phases completed:** 3 phases (32-34), 4 plans, 15 requirements
**Git range:** v0.7..5582379 (~35 commits)
**Files:** 45 changed, +8585/-827 lines

**Key accomplishments:**

- 桌面游戏运行时：game-main.js + game-preload.js 模板，4-way 环境检测，8 通道 IPC 存档/窗口管理
- 桌面导出管线：exportDesktop.js 9 步流水线，@electron/packager 打包，PNG→ICO 图标转换，可选 ZIP
- ExportModal Web/桌面格式切换 + 桌面图标选择器 + 格式感知导出分发
- 项目分辨率透传至导出管线（CUSTOM-03 修复）

**Milestone audit:** 15/15 requirements passed — see v0.8-MILESTONE-AUDIT.md

**Archives:** milestones/v0.8-ROADMAP.md, milestones/v0.8-REQUIREMENTS.md

---

## v0.7 游戏导出 Web 静态包 (Shipped: 2026-04-08)

**Phases completed:** 8 phases, 12 plans, 17 tasks

**Key accomplishments:**

- (none recorded)

---

## v0.6 主题包系统 (Shipped: 2026-04-06)

**Phases completed:** 9 phases, 16 plans, 25 tasks

**Key accomplishments:**

- (none recorded)

---

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
