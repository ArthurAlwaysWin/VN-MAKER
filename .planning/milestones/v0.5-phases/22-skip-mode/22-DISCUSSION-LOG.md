# Phase 22: Skip Mode — Discussion Log

> Audit trail of discuss-phase Q&A for Phase 22

## Session: 2026-04-05

### Gray Area 1: 快进速度与节奏
**Question:** 当前代码每页 50ms，选择快进行为
**Options presented:** 固定50ms / 固定30ms / 可调节滑条 / 渐进加速
**User chose:** B. 固定 30ms（每秒约33页）
**Decision:** D-01

### Gray Area 2: SKIP 覆盖层指示器
**Question:** 显示位置和样式
**Options presented:** 左上角胶囊 / 顶部居中 / 左上角+闪烁 / 仅按钮高亮
**User chose:** A. 左上角半透明胶囊"▶▶ SKIP"
**Decision:** D-02, D-10

### Gray Area 3: 已读追踪存储策略
**Question:** localStorage 跨存档共享 vs 每存档独立 vs 双层
**Options presented:** localStorage全局共享 / 存档独立 / 双层
**User chose:** A. localStorage 跨存档共享
**Decision:** D-03, D-04, D-12

### Gray Area 4: 音频抑制细节
**Question:** BGM 处理方式
**Options presented:** BGM静音+SE/Voice跳过 / BGM降至10% / BGM不变+仅跳SE/Voice
**User chose:** A. BGM 完全静音 + SE/Voice 跳过
**Decision:** D-07, D-08

### Agent-derived decisions (from requirements + prior context)
- D-05: Skip mode types from SKIP-01
- D-06: Stop triggers from SKIP-04 + SKIP-03
- D-09: Settings toggle from SKIP-07 + existing settingDefs pattern
- D-11: Engine integration pattern (keep skip in main.js, not engine)
- D-13: QuickActionBar toggle interaction (match current toggleSkip behavior)
