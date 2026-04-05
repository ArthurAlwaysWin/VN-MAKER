# Requirements — v0.5 游戏 UI 补全

## Overview

**Goal:** 补全核心游戏交互 UI — 快捷按钮栏 + 存读档界面 + 快进模式 + 存档系统升级。
**Core principle:** 开发者不碰逻辑 — 所有新 UI 由引擎内置，编辑器仅提供布局自定义（后续版本）。

---

## SAVE — 存档系统升级

- [x] **SAVE-01**: 存档数据保存到项目 `saves/` 目录，每槽独立文件（`slot_001.json` + `slot_001.jpg`），使用原子写入防止数据损坏
- [x] **SAVE-02**: 提供 IPC handlers（save-slot / load-slot / delete-slot / list-saves / capture-screenshot），编辑器和引擎通过 IPC 访问存档
- [x] **SAVE-03**: SaveManager 重写为异步模式（所有调用者使用 async/await），支持 100 个存档槽位
- [x] **SAVE-04**: 使用 `webContents.capturePage()` 截取游戏画面，缩放为 320×180 JPEG（quality 80）作为存档缩略图
- [x] **SAVE-05**: 首次运行时自动迁移旧 localStorage 8 槽存档到文件系统，写入 `.migrated` 标记防止重复迁移
- [x] **SAVE-06**: 扩展 `asset://` 协议支持 `saves/` 目录，缩略图通过 `asset://saves/slot_001.jpg` 加载
- [x] **SAVE-07**: 存档 JSON 包含 `version: 2` 字段，为后续存档格式升级预留兼容性
- [x] **SAVE-08**: 打开项目时自动创建 `saves/` 目录；历史记录截断为 50 条（完整历史保留在内存中）

## BAR — 快捷按钮栏

- [x] **BAR-01**: 对话框底部显示 6 个快捷按钮（自動 / 快進 / 回想 / 存档 / 読档 / 設置），替换现有 `#quick-controls`
- [x] **BAR-02**: 提取为独立 `QuickActionBar.js` UI 类，遵循现有 GameMenu/BacklogScreen 模式
- [x] **BAR-03**: 自動/快進按钮显示激活状态指示器（高亮或图标变化）
- [x] **BAR-04**: 按钮栏随对话框显示/隐藏同步（选择页面、菜单、覆盖层打开时隐藏）
- [x] **BAR-05**: 按钮点击不触发对话推进（`stopPropagation`），打开任何覆盖层时暂停自动/快进模式

## SLUI — 存读档界面

- [x] **SLUI-01**: 全屏替换式存读档界面，5 列 × 2 行 = 每页 10 槽位，10 页共 100 槽，页码标签导航
- [x] **SLUI-02**: 每个槽位卡片显示缩略图截图、保存时间、对话文字预览、场景名称；空槽位灰色显示 "— 空 —"
- [x] **SLUI-03**: 存档/读档模式通过顶部标签切换，无需关闭界面
- [x] **SLUI-04**: 覆盖已有存档时在槽位卡片内显示内联确认（"确定覆盖?" + 确认/取消按钮）
- [x] **SLUI-05**: 支持删除单个存档（带确认提示）
- [x] **SLUI-06**: ESC 键可关闭存读档界面，采用栈式覆盖层优先级管理（SaveLoad > Settings > Backlog > GameMenu > Game）
- [x] **SLUI-07**: 关闭存读档界面时根据来源上下文返回正确位置（从游戏菜单打开 → 返回游戏菜单；从快捷栏打开 → 返回游戏；从标题页打开 → 返回标题页）

## SKIP — 快进模式

- [ ] **SKIP-01**: 支持两种快进模式：全部跳过（skip all）和只跳已读（skip read only），默认为只跳已读
- [ ] **SKIP-02**: 新增 ReadHistory 模块，追踪已读页面（`Set<"sceneId:pageIndex">`），持久化到 localStorage
- [ ] **SKIP-03**: 只跳已读模式下，遇到未读页面自动停止快进并恢复正常阅读速度
- [ ] **SKIP-04**: 快进时显示视觉指示器（"▶▶ SKIP" 覆盖层），到达选择页面或未读页面时自动停止
- [ ] **SKIP-05**: 快进时抑制所有音频事件（BGM/SE/Voice），快进结束时应用最终音频状态
- [ ] **SKIP-06**: 快进时覆盖转场动画时长为 0（跳过转场等待）
- [ ] **SKIP-07**: 在设置页新增快进模式切换组件（全部跳过 / 只跳已读），扩展 ConfigManager 和 settingDefs 注册表

---

## Future Requirements (deferred)

| Feature | Reason |
|---------|--------|
| 快速存档/快速读档 (F5/F9) | 推迟到后续版本 |
| 自动存档专用槽位 | 推迟到后续版本 |
| 存档数据导出/导入 | 推迟到后续版本 |
| 快捷按钮编辑器自定义（图片/颜色/位置） | 推迟到 UI 美化系统里程碑 |
| Ctrl 按住持续快进 | 推迟到后续版本 |
| "跳到下一个选择" 模式 | 推迟到后续版本 |
| 已读进度百分比指示器 | 推迟到后续版本 |
| 存档缩略图悬停放大 | 推迟到后续版本 |
| ConfigManager 迁移到文件系统 | 保留 localStorage，后续考虑 |

## Out of Scope

| Feature | Reason |
|---------|--------|
| html2canvas 截图方案 | 已废弃（2022.01），无法解析 asset:// 协议，改用 capturePage() |
| 存档数据库 (SQLite/lowdb) | JSON 文件完全满足需求，无需引入数据库 |
| 虚拟滚动列表 | 每页仅 10 槽位（分页），不需要虚拟滚动 |
| 移动端存档 UI | 桌面优先 |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SAVE-01 | Phase 19 | Complete |
| SAVE-02 | Phase 19 | Complete |
| SAVE-03 | Phase 19 | Complete |
| SAVE-04 | Phase 19 | Complete |
| SAVE-05 | Phase 19 | Complete |
| SAVE-06 | Phase 19 | Complete |
| SAVE-07 | Phase 19 | Complete |
| SAVE-08 | Phase 19 | Complete |
| BAR-01 | Phase 20 | Complete |
| BAR-02 | Phase 20 | Complete |
| BAR-03 | Phase 20 | Complete |
| BAR-04 | Phase 20 | Complete |
| BAR-05 | Phase 20 | Complete |
| SLUI-01 | Phase 21 | Complete |
| SLUI-02 | Phase 21 | Complete |
| SLUI-03 | Phase 21 | Complete |
| SLUI-04 | Phase 21 | Complete |
| SLUI-05 | Phase 21 | Complete |
| SLUI-06 | Phase 21 | Complete |
| SLUI-07 | Phase 21 | Complete |
| SKIP-01 | Phase 22 | Pending |
| SKIP-02 | Phase 22 | Pending |
| SKIP-03 | Phase 22 | Pending |
| SKIP-04 | Phase 22 | Pending |
| SKIP-05 | Phase 22 | Pending |
| SKIP-06 | Phase 22 | Pending |
| SKIP-07 | Phase 22 | Pending |

---

*27 requirements total — v0.5 游戏 UI 补全*
