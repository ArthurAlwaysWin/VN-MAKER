# Phase 3A: Project System & Editor Workflow Redesign

## Goal

Transform the Galgame Maker editor from a single-file script editor into a full project-based IDE with a complete "create → import → design → preview" workflow. Developers should be able to create projects, manage assets, and build visual novels without touching code or logic.

## Core Design Principle

> **The editor never requires developers to handle logic — they focus purely on visual page design. All game logic is engine-built-in.**

## Architecture Overview

### Current State
- No project concept; editor directly manipulates `public/game/script.json`
- Assets stored in fixed paths under `public/game/*`
- Editor launches straight into editing mode
- Sidebar navigation with flat module list

### Target State
- Complete project system with folder-based project structure
- `project.json` (metadata) + `script.json` (game data) separation
- Assets bound to project directory (`assets/*`)
- Welcome screen → project selection/creation → editor
- Top tab bar for module switching (6 tabs)

## Detailed Design

### 1. Project File Structure

Each project is a folder on disk:

```
my-visual-novel/
├── project.json          # Project metadata
├── script.json           # Game script (scenes, dialogue, choices, title, settings)
└── assets/
    ├── backgrounds/      # Background images
    ├── characters/       # Character sprites
    ├── audio/            # BGM, sound effects, voice
    └── ui/               # UI assets (button icons, etc.)
```

**project.json schema:**
```json
{
  "name": "我的视觉小说",
  "author": "",
  "version": "1.0.0",
  "description": "",
  "resolution": { "width": 1280, "height": 720 },
  "engineVersion": "0.1.0",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastModified": "2025-01-01T00:00:00Z"
}
```

**script.json** retains its current format for game content (scenes, characters, title layout, etc.) with one change: the `meta` block is **removed** from script.json. Project metadata (title, author, version, resolution) now lives exclusively in `project.json` — single source of truth, no duplication.

**Migration:** When opening a legacy script.json that contains a `meta` block (i.e., no project.json exists), the editor extracts `meta` into a new `project.json` and removes it from `script.json`.

### 2. Welcome Screen

**Style:** Simple centered layout (Figma-inspired)

**Layout:**
- App title and tagline centered
- Two primary buttons: "✨ 新建项目" + "📂 打开项目"
- Recent projects list below (reads from persisted user settings)
- First-time users see the wizard; returning users see the minimal creation form

**Technical:**
- New Vue component: `WelcomeScreen.vue`
- Recent projects stored in Electron's `app.getPath('userData')` as `recent-projects.json`
- App.vue state machine: `welcome` → `editing` (controlled by `currentView` ref)
- Navigation uses `<component :is="...">` with `<keep-alive>` for tab switching (preserves scroll/state per tab)
- Vue Router is **removed** — tab switching is purely component-based

### 3. New Project Flow

**First-time users:** 4-step wizard
1. Basic info (name, save location)
2. Display settings (resolution — default 1280×720)
3. Template selection (blank project or demo project)
4. Confirmation → project created

**Returning users:** Minimal form (name + location only), other settings use defaults

**Technical:**
- `CreateProjectWizard.vue` for wizard mode
- `CreateProjectQuick.vue` for minimal mode
- Flag `hasCreatedProject` stored in `recent-projects.json`
- Electron IPC: `create-project` → creates folder structure, writes `project.json` and empty `script.json`

### 4. Editor Main Layout

**Navigation:** Top tab bar replacing sidebar navigation

**Tabs (6):**
1. 🎬 **游戏内容** — Scene editor (canvas + timeline + asset panel + inspector)
2. 🖼️ **标题页** — Title screen PPT-style designer (reuse existing canvas)
3. ⚙️ **设置页** — Settings page component designer (Phase 3B, placeholder tab)
4. 🎨 **素材库** — Asset browser/uploader (existing, connected to project dir)
5. 👤 **角色** — Character definition manager (existing)
6. 📦 **项目设置** — Project metadata editor (name, author, resolution, etc.)

**Title bar:** Project name + path + undo/redo buttons + preview button

**Layout structure (game content tab):**
```
┌─────────────────────────────────────────────────────────┐
│ 🎮 项目名 — 路径               ↩ ↪  ▶ 预览            │ Title bar
├─────────────────────────────────────────────────────────┤
│ 🎬游戏内容 | 🖼️标题页 | ⚙️设置页 | 🎨素材库 | 👤角色 | 📦项目 │ Tab bar
├──────┬──────┬───────────────────────────┬───────────────┤
│ 场景 │ 素材 │                           │   属性检查器   │
│ 列表 │ 面板 │     画布预览 / 时间线      │   (位置/样式)  │
│      │      │                           │               │
│ 200px│140px │        flex: 1            │    200px      │
└──────┴──────┴───────────────────────────┴───────────────┘
```

### 5. Asset Panel Integration

**Location:** Left side of scene editor (between scene list and canvas), 140px wide

**Behavior:**
- Shows assets from the current project's `assets/` directory
- Grouped by type: backgrounds, characters, audio
- Thumbnails for images, name+icon for audio
- Draggable: user drags asset thumbnail onto canvas
- On drop:
  - Background image → sets scene background
  - Character sprite → adds character to scene at drop position
  - Audio file → sets scene BGM

**Asset loading:** All assets served via Electron's custom `asset://` protocol, repointed to the project's `assets/` directory (instead of `public/game/`).

### 6. Project Settings Tab

Simple form to edit `project.json` fields:
- Project name
- Author
- Description
- Resolution (1280×720 default, with presets)
- Engine version (read-only, informational)

### 7. IPC Changes (Electron Main Process)

New/modified IPC handlers:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `create-project` | renderer → main | Create project folder + files |
| `open-project` | renderer → main | Open folder dialog, validate project |
| `load-project` | renderer → main | Read project.json + script.json; **stores project path in main process state** |
| `save-project` | renderer → main | Write project.json + script.json |
| `read-dir` | (modify) | Read from project dir instead of hardcoded path |
| `upload-asset` | (modify) | Write to project's assets/ dir |
| `get-recent-projects` | renderer → main | Read recent-projects.json |
| `update-recent-projects` | renderer → main | Write to recent-projects.json |
| `open-preview` | (modify) | Pass project path to preview window |

**Asset protocol state:** When `load-project` is called, the main process stores the project path in a module-level variable (`let currentProjectPath = null`). The `asset://` protocol handler reads from `currentProjectPath + '/assets/'` instead of the hardcoded `public/game/`. If `currentProjectPath` is null (no project loaded), the protocol falls back to `public/game/` for backward compatibility.

**Project validation rules:** `open-project` validates a folder by checking: (1) `project.json` exists and is valid JSON, OR (2) `script.json` exists (legacy project — triggers migration). Invalid folders show an error dialog.

### 8. Data Flow

```
WelcomeScreen
  ├─ "新建项目" → CreateProjectWizard/Quick
  │    └─ IPC: create-project → folder created
  │         └─ IPC: load-project → script store populated
  │              └─ currentView = 'editing'
  │
  └─ "打开项目" / recent project click
       └─ IPC: open-project (or load-project with path)
            └─ script store populated
                 └─ currentView = 'editing'

Editor (editing mode)
  ├─ Tab switches update visible component
  ├─ All edits go through script store (Pinia)
  ├─ Auto-save debounced → IPC: save-project
  └─ Preview → IPC: open-preview with project path
```

### 9. Preview Window Changes

The preview window currently loads `index.html` which reads from `public/game/`. It needs to:
- Accept a project path parameter
- Load `script.json` from the project directory
- Resolve asset paths relative to project's `assets/` directory
- This can be done via query parameter: `index.html?project=<encoded-path>`

### 10. What's NOT in Phase 3A

- Settings page designer (Phase 3B — tab will show "即将推出" placeholder)
- Export/package to executable (Phase 3B)
- First-time wizard fancy animations
- Drag-to-reorder scenes
- Multi-project comparison
- Collaborative editing
- Plugin system

## File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `src/editor/views/WelcomeScreen.vue` | Welcome/launch screen |
| `src/editor/views/CreateProjectWizard.vue` | First-time project creation wizard |
| `src/editor/views/CreateProjectQuick.vue` | Quick project creation form |
| `src/editor/views/ProjectSettings.vue` | Project metadata editor |
| `src/editor/views/TitleDesigner.vue` | Title page designer tab (wraps existing canvas) |
| `src/editor/views/SettingsDesigner.vue` | Placeholder for Phase 3B |
| `src/editor/components/AssetPanel.vue` | Draggable asset panel for scene editor |
| `src/editor/components/TabBar.vue` | Top tab bar component |
| `src/editor/stores/project.js` | Project state (path, metadata, recent list) |

### Modified Files
| File | Changes |
|------|---------|
| `src/editor/App.vue` | State machine (welcome/editing), remove sidebar, add tab bar |
| `src/editor/views/Scenes.vue` | Integrate AssetPanel, handle asset drops |
| `src/editor/views/Assets.vue` | Read from project dir instead of hardcoded path |
| `src/editor/views/Characters.vue` | Read sprites from project assets dir |
| `src/editor/stores/script.js` | Load/save from project path, auto-save |
| `electron/main.js` | New IPC handlers, asset protocol repointing |
| `src/main.js` | Accept project path param for preview |

### Removed Files
| File | Reason |
|------|--------|
| `src/editor/components/layout/Sidebar.vue` | Replaced by TabBar |
| `src/editor/router/index.js` | Replaced by component-based tab switching |
| `src/editor/views/Dashboard.vue` | Replaced by WelcomeScreen.vue |

### Modified (additional)
| File | Changes |
|------|---------|
| `src/editor/main.js` | Remove `vue-router` import and `app.use(router)` |

## Migration Strategy

The existing `public/game/` demo data remains as a built-in demo project template. When users create a "demo project" from the wizard, these files are copied into the new project folder.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Project folder deleted externally | Show error dialog on next save, offer "Save As" to new location |
| JSON file corrupt/unreadable | Show error with file path, offer to reset to empty project |
| Disk full on save | Show OS error message, keep in-memory state intact |
| Open non-project folder | Show "不是有效的项目文件夹" dialog with instructions |
| Legacy script.json (no project.json) | Auto-migrate: create project.json from meta, show notification |

## Auto-Save

- Debounce interval: **2 seconds** after last edit
- Dirty-state indicator: dot (●) appended to project name in title bar when unsaved
- Auto-save writes both `project.json` and `script.json` (write to temp file, then rename to avoid corruption)
- Manual save via Ctrl+S also available
- On app close with unsaved changes: show "是否保存？" dialog (Save / Don't Save / Cancel)

## Project Switching

Users can return to the welcome screen to switch projects via a "🏠" button in the title bar or File menu. This sets `currentView = 'welcome'` and clears the current project state. Unsaved changes trigger the save dialog before switching.
