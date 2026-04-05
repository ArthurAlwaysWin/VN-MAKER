# Retrospective

## v0.5 — 游戏 UI 补全

**Duration:** 2 days (2026-04-04 ~ 2026-04-05)
**Scope:** 4 phases, 8 plans, 27 requirements, ~51 commits

### What Worked Well

- **高并行度**：4 个 phase 在 2 天内全部完成，得益于 phase 间依赖清晰（19→20→21, 19→22）
- **SaveManager 异步重写**：一次性从 localStorage 迁移到文件系统，后续 phase 无需再改存档层
- **截图管线复用**：Phase 19 建立的 capturePage→IPC→JPEG 管线被 Phase 20（快存）和 Phase 21（存档界面）直接复用
- **CSS-only 动画**：快进指示器、存读档界面过渡均用纯 CSS，无额外依赖
- **内联确认模式**：覆盖存档用内联确认代替 window.confirm，避免 Electron prompt 限制

### What Could Be Better

- **gsd-tools frontmatter 提取不可靠**：SUMMARY 的 `requirements-completed` 字段部分缺失（19-01, 22-01, 22-02），导致 `milestone complete` 自动提取成果为垃圾文本，需手动修复 MILESTONES.md
- **Nyquist validation 全部 draft**：4 个 VALIDATION.md 均为 `nyquist_compliant: false`，未实际执行自动化验证。验证完全依赖人工 VERIFICATION.md
- **规格偏差未提前记录**：3 个有意偏差（SLUI-01 网格改 3×3, SLUI-03 来源路由, BAR-01 按钮数 6→8）在 phase 执行中决定，但 REQUIREMENTS.md 未同步更新

### Patterns to Keep

- Phase 粒度合理（每 phase 2 个 plan，1 个后端 + 1 个集成/UI）
- VERIFICATION.md 逐条对照需求的格式有效
- 集成检查（gsd-integration-checker）能发现跨 phase 遗漏

### Lessons Learned

- `gsd-tools milestone complete` 的自动提取功能不可靠，归档时应始终手动检查 MILESTONES.md 输出
- Electron 限制（无 prompt、asset 协议需 stream:true、preload .mjs 扩展名）应在项目级文档中记录，避免每次重新踩坑
- 快进模式的 BGM 影子状态是个精巧方案，但增加了 AudioManager 复杂度，后续如加入更多音频功能需注意
