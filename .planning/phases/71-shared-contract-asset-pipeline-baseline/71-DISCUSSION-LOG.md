# Phase 71 Discussion Log

**Phase:** 71 共享契约与资产通路基线  
**Mode:** Auto (`--auto`)  
**Date:** 2026-04-23

> Decisions are captured in `71-CONTEXT.md` — this log preserves the gray areas and the auto-selected defaults.

## Auto-selected Gray Areas

### 1. 资产标准写法
**Question:** 新的 UI 图片字段该如何持久化？  
**Selected:** 复制到 `assets/ui/`，配置只记录项目相对路径。  
**Why selected:** 这是当前仓库中唯一能稳定支持保存、重开与后续导出的写法，也与 `assets` store 的现有能力一致。

### 2. legacy 字段迁移时机
**Question:** 旧路径 / 旧 base64 何时改写为新格式？  
**Selected:** 仅在用户显式重新选图后改写，不做静默迁移。  
**Why selected:** 这样既保住兼容读入，也避免把 Phase 71 扩张成迁移 UX / bulk migration 系统。

### 3. 字段与扫描边界的组织方式
**Question:** 新字段应该分散到各 surface，还是先集中成 shared contract / registry？  
**Selected:** 先集中成 shared contract / registry。  
**Why selected:** 当前最大风险是 schema 漂移与导出漏图，集中式 contract 更符合 brownfield 收口需求。

### 4. Phase 71 的收口范围
**Question:** 这一 phase 要不要顺手做完整 surface parity？  
**Selected:** 只做 contract + 资产通路基线，完整 preview/runtime/export parity 继续由 Phase 75 收口。  
**Why selected:** 当前 roadmap 已把 AST-03 / AST-04 放在 Phase 75；Phase 71 应先做可复用地基，避免过早混入 surface 细节。

## Deferred From Auto Discussion

- migration badge / 待迁移提示 UI
- `.gmtheme` 图片资产打包升级
- cursor / icon slot 最终 surface 接线
- surface-specific DOM 与 preview 交付

---

*Auto discussion completed: 2026-04-23*
