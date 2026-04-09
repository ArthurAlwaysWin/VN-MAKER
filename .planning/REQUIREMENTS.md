# Requirements — v0.8 游戏导出 Electron 桌面版

## 导出管线 (Export Pipeline)

- [ ] **PIPE-01**: 用户可一键导出完整可运行的 Windows 桌面游戏文件夹（含 .exe）
- [ ] **PIPE-02**: 导出使用 @electron/packager 集成打包，输出绿色免安装目录
- [ ] **PIPE-03**: 导出时完整复制所有游戏资源（图片、音频、字体、语音）到输出目录
- [ ] **PIPE-04**: 导出过程显示实时进度（复用 ExportModal 3 态模式：配置→进度→完成）
- [ ] **PIPE-05**: 用户可选择导出输出目录位置
- [ ] **PIPE-06**: 导出完成后可选 ZIP 压缩输出目录
- [ ] **PIPE-07**: Electron 运行时二进制自动缓存，二次导出无需重复下载

## 游戏运行时 (Game Runtime)

- [x] **RUNTIME-01**: 导出的游戏双击 .exe 独立运行，无需安装任何依赖
- [x] **RUNTIME-02**: 游戏存档保存到 app.getPath('userData')，跨会话持久化
- [x] **RUNTIME-03**: 导出的游戏支持全屏/窗口/无边框窗口模式切换

## 自定义 (Customization)

- [ ] **CUSTOM-01**: 用户可自定义游戏标题（窗口标题 + .exe 元数据）
- [x] **CUSTOM-02**: 用户可提供 PNG 图标，自动转换 .ico 并嵌入 .exe
- [x] **CUSTOM-03**: 导出游戏窗口尺寸从项目设置读取（默认 1280×720）

## 导出 UI (Export UI)

- [ ] **UI-01**: ExportModal 新增 Web/桌面导出格式切换
- [ ] **UI-02**: 桌面导出模式显示图标选择器

## Future Requirements

- [ ] macOS .app / Linux AppImage 导出 — v0.9+
- [ ] ASAR 打包（代码保护） — v0.9+
- [ ] 资源压缩优化（图片压缩、音频转码） — v0.9+
- [ ] 自动更新机制 — v1.0+
- [ ] 代码签名 — v1.0+

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| NSIS/MSI 安装向导 | PROJECT.md 明确排除（绿色免安装） |
| macOS/Linux 平台 | v0.8 仅 Windows |
| 资源压缩优化 | v0.8 只做资源拷贝 |
| 启动画面 / 加载动画 | 保持简单 |
| DevTools 调试工具 | 安全风险 |
| 多 Electron 版本选择 | 固定编辑器版本（41.x） |
| 增量导出 | 复杂度高，推迟 |

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| PIPE-01 | Phase 33 | — | pending |
| PIPE-02 | Phase 33 | — | pending |
| PIPE-03 | Phase 33 | — | pending |
| PIPE-04 | Phase 34 | — | pending |
| PIPE-05 | Phase 34 | — | pending |
| PIPE-06 | Phase 33 | — | pending |
| PIPE-07 | Phase 33 | — | pending |
| RUNTIME-01 | Phase 32 | — | pending |
| RUNTIME-02 | Phase 32 | — | pending |
| RUNTIME-03 | Phase 32 | — | pending |
| CUSTOM-01 | Phase 33 | — | pending |
| CUSTOM-02 | Phase 33 | — | pending |
| CUSTOM-03 | Phase 32 | — | pending |
| UI-01 | Phase 34 | — | pending |
| UI-02 | Phase 34 | — | pending |
