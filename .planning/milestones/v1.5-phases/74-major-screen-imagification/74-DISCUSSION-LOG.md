# Phase 74 Discussion Log

**Phase:** 74-major-screen-imagification
**Date:** 2026-04-25
**Mode:** Smart Discuss (auto)

---

## Grey Area 1: 装饰层数据模型与渲染

| # | Question | Decision |
|---|----------|----------|
| 1 | 装饰层数据结构是否统一？ | 统一为 `decorations[]` 数组，每项 `{src, x, y, width, height}` — 与 Phase 72 对话框装饰层模型一致 |
| 2 | 装饰层放在哪个层级？ | `.chrome` 子路径下（`ui.saveLoadScreen.chrome.decorations[]` 等），激活 Phase 71 预留的 `UI_SCREEN_CHROME_ROOTS` |
| 3 | 装饰层是否 `pointerEvents: none`？ | 是 — 保证底层可交互 |
| 4 | 装饰层最大数量限制？ | 不硬限，超过 3 层时编辑器显示"装饰层较多可能影响性能"软提示 |

**User note:** 软性提示防止低端设备用户投诉，不硬限。

---

## Grey Area 2: 四屏背景图契约与 Runtime 接入

| # | Question | Decision |
|---|----------|----------|
| 1 | 背景图字段名统一？ | `backgroundImage`，放在 `.chrome` 子路径下 |
| 2 | SaveLoad/Backlog 如何加？ | 新增 `ui.saveLoadScreen.chrome.backgroundImage` 和 `ui.backlogScreen.chrome.backgroundImage`，默认 `null` |
| 3 | GameMenu 旧路径迁移？ | 迁移到 `ui.gameMenuScreen.chrome.backgroundImage`，旧路径加 fallback 读取（先查新路径，没有则读旧路径），`@deprecated` 注释标明下个 major milestone 移除 |
| 4 | 背景图渲染方式？ | `object-fit: cover` |
| 5 | 是否支持 overlay？ | 不做，不预留字段 — Phase 75 统一考虑 |

**User note:** GameMenu fallback 必须加 `@deprecated` 注释标明移除时间线，防止遗忘。

---

## Grey Area 3: 编辑器 UI 与真预览

| # | Question | Decision |
|---|----------|----------|
| 1 | 四屏配置入口放哪？ | 新建 `MajorScreenImageSettings.vue`，统一配置 4 屏背景图 + 装饰层 |
| 2 | 真预览实现？ | 复用现有 iframe + postMessage 基础设施（4 个编辑器视图已有 iframe 预览） |
| 3 | 四屏 HTML 是否存在？ | 不需要独立 HTML — 所有编辑器已内嵌 `<iframe src="/index.html">`，通过 `show-screen` + `update-screen-layout` 驱动预览 |
| 4 | 装饰层编辑交互？ | 列表式增删改（src + position/size 输入框），不支持拖拽 |

**Confirmed via codebase scout:** SaveLoadEditor / BacklogEditor / GameMenuEditor / SettingsPageEditor 全部已有 iframe 预览，`useScreenLayoutEditor.js` composable 封装了完整的加载-握手-推送-刷新生命周期。

---

## Grey Area 4: Scan/Export 资产管线与 Phase 75 交接

| # | Question | Decision |
|---|----------|----------|
| 1 | 背景图和装饰层 scanAssets 收集？ | 沿用 Phase 71 模式，为 4 个 screen 各加 collector |
| 2 | export 打包路径？ | `assets/ui/xxxScreen/` 前缀 |
| 3 | Phase 75 光标字段预留？ | 不预留 — 与 overlay 决策一致（YAGNI），Phase 75 按需添加 |
| 4 | ROADMAP 更新？ | 完成后更新 ROADMAP.md 和 STATE.md |

**User note:** 不预留 cursor 与不预留 overlay 策略一致，两边统一遵循 YAGNI。

---

## Summary of Key Architectural Decisions

1. **Chrome 子路径统一**: 所有背景图和装饰层走 `.chrome` 子路径
2. **GameMenu 迁移**: 旧路径 → 新路径，带 `@deprecated` fallback
3. **现有基础设施复用**: 不建新的预览基础设施
4. **YAGNI**: 不预留给 Phase 75 的任何字段
5. **软性性能提示**: >3 装饰层时显示提示，不硬限
