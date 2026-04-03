# Requirements: Galgame Maker

**Defined:** 2025-07-18
**Core Value:** 让非程序员创作者轻松制作视觉小说游戏

## v0.4 Requirements

v0.4 里程碑：语音系统 & 全局字体设置。

### 语音系统

- [ ] **VOICE-01**: 对话数据模型添加 `voice` 字段（文件路径字符串，可空），存储于页面 JSON
- [x] **VOICE-02**: Inspector 每句对话旁提供语音选择器（复用 AudioPicker 组件），支持选择/清除语音文件
- [x] **VOICE-03**: 编辑器语音试听——对话旁 ▶ 按钮播放绑定语音，× 按钮解除绑定
- [ ] **VOICE-04**: AudioManager 新增独立 voice 通道（第 3 个 HTMLAudioElement），提供 `playVoice(src)` / `stopVoice()` API
- [ ] **VOICE-05**: 引擎播放对话时，自动播放绑定语音；推进到下一句时停止上一句语音
- [ ] **VOICE-06**: 独立语音音量控制（`voiceVolume` 加入 ConfigManager），设置页显示语音音量滑块，受 masterVolume 乘法影响
- [x] **VOICE-07**: 批量命名匹配——扫描音频文件夹，按 `{characterId}_{sceneIndex}_{pageIndex}_{dialogueIndex}.{ext}` 命名规则自动绑定语音到对话
- [x] **VOICE-08**: 回想屏（Backlog）语音重放——历史记录中有语音的条目显示 ▶ 按钮可重听
- [x] **VOICE-09**: 自动模式等待语音播完再推进；**无语音绑定时按正常间隔推进，不等待**

### 全局字体设置

- [ ] **FONT-01**: `script.json` 新增 `ui.dialogueBox` 数据字段（`fontSize`、`fontFamily`、`textColor`、`nameplateFontSize`），带合理默认值
- [ ] **FONT-02**: 引擎 DialogueBox 启动时读取全局字体设置并通过 CSS 自定义属性应用到对话框文本和名牌
- [ ] **FONT-03**: 编辑器提供字体设置 UI——字体下拉框（已导入字体 + 系统字体）、字号滑块、颜色选择器、名牌字号
- [ ] **FONT-04**: 字体设置实时预览——画布中对话框反映当前设置变更

## 延后需求（后续里程碑）

### 局部富文本

- **RICH-01**: 对话文本内联着色标记（`[color=#hex]...[/color]`）——需 DialogueBox innerHTML 重构
- **RICH-02**: 打字机效果兼容 DOM 节点树（TreeWalker 方案）
- **RICH-03**: 编辑器所见即所得颜色工具栏（选中文字→变色）

### UI 美化（v0.5）

- **UIBS-01**: 对话框/按钮图片替换系统
- **UIBS-02**: 可视化样式编辑器（基础层+高级层）
- **UIBS-03**: 预设模板库（内置+自定义+导入导出）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 局部文字着色 | 需 innerHTML 重构，风险高，延后到独立里程碑 |
| 对话框/UI 皮肤系统 | 规模大（4-6 phases），拆分到 v0.5 |
| 口型同步（lip-sync） | 超出当前定位，galgame 不需要 |
| TTS 文字转语音 | 依赖外部服务，不符合离线桌面定位 |
| 字幕/翻译系统 | 多语言支持属于更后期功能 |

## Traceability

填充于 Roadmap 创建后。

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 | Phase 15 | Pending |
| VOICE-02 | Phase 16 | Complete |
| VOICE-03 | Phase 16 | Complete |
| VOICE-04 | Phase 15 | Pending |
| VOICE-05 | Phase 15 | Pending |
| VOICE-06 | Phase 15 | Pending |
| VOICE-07 | Phase 16 | Complete |
| VOICE-08 | Phase 18 | Complete |
| VOICE-09 | Phase 18 | Complete |
| FONT-01 | Phase 17 | Pending |
| FONT-02 | Phase 17 | Pending |
| FONT-03 | Phase 17 | Pending |
| FONT-04 | Phase 17 | Pending |

**Coverage:**
- v0.4 requirements: 13 total
- Mapped to phases: 13/13 ✓
- Unmapped: 0

---
*Requirements defined: 2025-07-18*
*Last updated: 2025-07-18 after initial definition*
