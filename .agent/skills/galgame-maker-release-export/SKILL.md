---
name: galgame-maker-release-export
description: Prepare Galgame Maker release/export artifacts for users or public demo delivery. Use when the user asks an AI agent to export a game to a directory, make a web build, make a desktop build, package the portable editor, create a release zip, prepare a Bilibili/Douyin/GitHub release, or verify that exported artifacts are safe and complete.
---

# Galgame Maker Release Export

Use this for release and export delivery. Always run QA/readiness before packaging.

## Before Export

```bash
git status --short --branch
npm run test
npm run build
npm run build:web
npm run vn:readiness -- --script public/game/script.json --asset-root public/game --json
```

If readiness reports blockers, stop and fix or report them before packaging.

## Current Export Surfaces

The repo currently has:

- Electron editor export flows through the desktop app.
- `npm run package:editor:win` for a portable Windows editor zip.
- `npm run package:editor:win:dir` for an unpacked portable Windows editor directory.
- `vn-author export-readiness` for export safety checks.

If a direct `vn-author export-web` or `vn-author export-desktop` command exists in the current branch, use it. If it does not exist, do not fake a CLI export. Use the desktop editor export flow or report that a dedicated export CLI command is needed for fully hands-free agent export.

## Portable Editor Package

For a green/no-install Windows editor release:

```bash
npm run package:editor:win
```

Expected output:

- `release/Galgame Maker-win32-x64/`
- `release/Galgame Maker-win32-x64.zip`

After packaging, start the executable once if the environment allows it and confirm it opens without crashing.

## Game Export Request

When the user says "export to <directory>":

1. Run project QA and export readiness.
2. Confirm whether the target is web game, desktop game, or portable editor unless the request is explicit.
3. Use direct CLI export if available.
4. Otherwise, tell the user that current automated CLI export is not available and use the editor export flow when possible.
5. Report the output path, readiness result, and any limitations.

## References

- `../../../docs/agent-authoring/validation-rules.md` for readiness gates.
- `../../../docs/agent-authoring/workflow.md` for final handoff.
- `../../../docs/milestone-11-effect-packs-feasibility-security-audit.md` for effect-pack export safety.
- `../../../scripts/package-editor-win.js` for portable editor packaging.

## Do Not

- Do not skip readiness before export.
- Do not claim hands-free game export exists unless the CLI command exists in the current branch.
- Do not include source-only, temporary, or development files in a user-facing release package unless the user asked for source distribution.
- Do not open commercial licensing or marketplace claims unless the release policy explicitly allows them.
