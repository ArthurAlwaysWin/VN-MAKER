---
status: testing
phase: 07-asset-library-ui
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-VERIFICATION.md]
started: 2026-03-30T10:00:00Z
updated: 2026-03-30T10:00:00Z
---

## Current Test

number: 1
name: 资源库标签页显示
expected: |
  打开编辑器，顶部应该只有 5 个标签页（而不是之前的 6 个）。其中一个是"资源库"。点击"资源库"后应看到 4 个子标签页：背景、角色、音频、字体。
awaiting: user response

## Tests

### 1. 资源库标签页显示
expected: 打开编辑器，顶部应该只有 5 个标签页（而不是之前的 6 个）。其中一个是"资源库"。点击"资源库"后应看到 4 个子标签页：背景、角色、音频、字体。
result: pass
note: 顺便添加了格式提示 (5525683)

### 2. 背景缩略图网格
expected: 在"背景"子标签页中，导入一张背景图片。图片应以缩略图卡片形式显示在网格中，悬停时卡片边框变为蓝色。
result: pass
note: 拖放区域和内部拖拽重复导入问题已修复 (4d6a895)

### 3. 字体预览
expected: 在"字体"子标签页中导入一个字体文件。导入后应显示预览卡片，展示"你好世界 AaBbCc 1234"的样本文字，使用导入的字体渲染。
result: pass

### 4. 拖放导入
expected: 从 Windows 资源管理器拖拽多个图片文件到"背景"子标签页上。拖入时应出现蓝色半透明覆盖层，显示"释放以导入文件"。释放后文件被导入，顶部出现绿色通知条"成功导入 N 个文件"。
result: pass

### 5. 音频播放与单例
expected: 在"音频"子标签页导入两个音频文件。点击第一个的播放按钮开始播放，进度条实时更新，显示 m:ss / m:ss 格式时长。再点击第二个音频的播放按钮，第一个应自动停止。点击进度条可以跳转播放位置。
result: [pending]

### 6. 右键菜单与行内重命名
expected: 右键点击任意背景卡片，弹出菜单包含"重命名"和"删除"。选择"重命名"后进入行内编辑模式，按 Enter 确认重命名，文件名更新。选择"删除"弹出确认对话框。
result: [pending]

### 7. 角色编辑器
expected: 在"角色"子标签页中，点击"+ 新角色"创建角色。左侧栏显示角色列表和头像。右侧编辑区可以修改角色名称和颜色。
result: [pending]

### 8. 表情导入（文件选择器）
expected: 选中一个角色后，点击"+ 导入表情"按钮。弹出系统原生文件选择对话框（不是手动输入路径）。选择图片后，图片作为表情缩略图显示在角色的表情网格中。
result: [pending]

### 9. 表情右键操作
expected: 右键点击一个表情缩略图，弹出菜单包含"重命名"和"删除"。重命名修改表情名称（不改变图片文件），删除弹出确认对话框。
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps

[none yet]
