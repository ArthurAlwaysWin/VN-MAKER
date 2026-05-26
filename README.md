# 🎮 Galgame Maker — 视觉小说制作器

> **可视化、无代码、PPT式拖拽** — 让任何人都能制作自己的视觉小说游戏。

## 项目状态

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 运行时引擎 MVP（脚本引擎、对话、角色、选项、存档等） | ✅ 完成 |
| Phase 2 | PPT式画布编辑器（拖拽定位、自由布局、画布预览） | ✅ 完成 |
| Phase 3A | 项目系统 + 编辑器工作流重构 | ✅ 完成 |
| **Phase 3B** | **设置页设计器 + 桌面应用导出 + 主题化 UI 扩展** | ✅ 完成/持续打磨 |

## 📖 指导文档

> **⚠️ 项目以下列文档为准，其他文档仅供参考：**

- **[项目契约](docs/agent-authoring/project-contract.md)** — project.json、script.json、assets/ 与 agent 交互边界
- **[Agent-First 开发计划](docs/agent-first-vn-systems-plan.md)** — 变量/好感度、结局/CG、分支图与转场的下一阶段路线图
- **[AI Agent Integration Contract](docs/agent-authoring/integration-contract.md)** — agent 操作、事务、诊断、预览与交接的统一接口约束
- **[脚本格式参考](docs/script-format.md)** — script.json 技术规格
- **[外部 Agent 创作工作流](docs/agent-authoring/workflow.md)** — 供 Codex、Claude、opencode、GitHub Copilot 等外部 agent 通过 CLI/API 编辑同一个项目；不是内置 AI 助手
- **[多结局示例与人工复核](docs/agent-authoring/human-review-tutorial.md)** — 通过可执行示例计划检查好感度、结局、CG、分支图与转场
- **[Phase 83 项目迁移说明](docs/agent-authoring/phase-83-migration.md)** — 在保留玩家进度权威边界的前提下升级旧项目

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式（编辑器 + 引擎）
npm run dev

# 生成并验收可在编辑器中打开的外部 Agent 多结局示例项目
npm run verify:agent-example -- --out .tmp/agent-example-project --json
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 游戏引擎 | 纯 JavaScript（ES Modules），DOM 渲染 |
| 编辑器 | Vue 3 + Pinia（无 vue-router，标签页切换） |
| 桌面壳 | Electron（IPC 项目管理 + asset:// 协议） |
| 构建工具 | Vite + vite-plugin-electron |
| 样式 | 纯 CSS，暗色主题 |

## 核心设计理念

1. **开发者不碰逻辑** — 所有游戏逻辑由引擎内置，开发者只做视觉设计
2. **PPT式编辑** — 像做幻灯片一样拖拽元素到画布上
3. **零代码** — 从创建项目到导出游戏，全程图形化操作

## 已完成功能

### 引擎（Phase 1）
- 脚本引擎：JSON 驱动，支持对话、选项、变量、条件跳转
- 角色系统：多角色同屏、表情切换、进出场动画
- 背景/音频：交叉渐变转场、BGM/SE 播放控制
- 存档系统：8 槽位 localStorage 存档
- 系统菜单：ESC 呼出，存档/读档/回想/设定/返回标题

### 编辑器（Phase 2）
- 画布预览：1280×720 可视化画布，拖拽元素自由定位
- 场景编辑：时间线 + 画布双模式切换
- 标题页设计：自定义元素拖拽布局
- 角色/素材管理：可视化管理界面
- 撤销/重做 + 中文界面

### 项目系统（Phase 3A）
- **欢迎界面**：Figma 风格居中布局，最近项目列表
- **项目创建**：首次使用 4 步向导，后续快速创建（名称+位置）
- **文件夹项目**：project.json + script.json + assets/ 目录结构
- **6 标签页导航**：游戏内容、标题页、设置页、素材库、角色、项目设置
- **素材面板**：140px 侧栏，拖拽素材到画布自动创建指令
- **自动保存**：2 秒防抖，脏标记（●），原子写入（temp+rename）
- **窗口关闭保护**：3 选项对话框（保存/不保存/取消）
- **键盘快捷键**：Ctrl+Z 撤销、Ctrl+Y 重做、Ctrl+S 保存
- **安全**：路径遍历防护、CSS 消毒、项目名消毒、保存竞态锁

### 导出与主题（Phase 3B+）
- **设置页设计器**：设置界面布局、控件样式与主题素材可视化配置
- **Web 导出**：构建静态引擎包、复制引用素材、可选 ZIP 打包
- **桌面导出**：生成 Windows Electron 运行包、自定义图标、可选 ZIP 打包
- **主题化 UI**：标题页、菜单、存读档、设置页、按钮族、图标与装饰素材扩展
- **外部 Agent 工具链**：校验、报告、布局 lint、素材引用检查与 handoff 文档
