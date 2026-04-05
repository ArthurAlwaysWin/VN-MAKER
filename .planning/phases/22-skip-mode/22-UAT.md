---
status: testing
phase: 22-skip-mode
source: [22-01-SUMMARY.md, 22-02-SUMMARY.md]
started: 2026-04-05
updated: 2026-04-05
---

## Current Test

number: 1
name: 设置页快进模式开关
expected: |
  打开游戏设置页面，应看到一个新的"快进模式"设置项，显示两个分段按钮："全部跳过" 和 "只跳已读"。默认选中"只跳已读"。点击"全部跳过"后再关闭重新打开，选择应被保持。
awaiting: user response

## Tests

### 1. 设置页快进模式开关
expected: 打开游戏设置页面，应看到"快进模式"设置项，两个分段按钮"全部跳过"/"只跳已读"，默认选中"只跳已读"。切换后持久化。
result: [pending]

### 2. 快进指示器显示
expected: 在游戏中点击快捷栏的"快进"按钮，左上角应出现半透明黑色胶囊徽章"▶▶ SKIP"。再次点击按钮或按任意键后徽章消失。
result: [pending]

### 3. 快进快速推进页面
expected: 激活快进后，对话页面应以极快速度自动推进（约 30ms/页），无需手动点击。文字直接完整显示，不逐字出现。
result: [pending]

### 4. 点击停止快进
expected: 快进中，在画面任意位置点击一次，快进应立即停止（指示器消失），并且不会同时推进到下一句对话——只是停止。
result: [pending]

### 5. 按键停止快进
expected: 快进中，按任意键（如空格、回车、方向键等）应停止快进。按 ESC 也应停止。
result: [pending]

### 6. 只跳已读模式
expected: 设置为"只跳已读"（默认），从头开始游戏并激活快进——因为所有页面都是未读，快进应立即停止在第一页。先手动玩过几页，然后回到开头再快进，应跳过已读页面并在第一个未读页面停下。
result: [pending]

### 7. 全部跳过模式
expected: 设置为"全部跳过"，激活快进后应跳过所有页面（包括未读页面），直到遇到选择分支或游戏结束才停止。
result: [pending]

### 8. 选择页停止快进
expected: 快进过程中遇到选择分支页面时，快进应自动停止，玩家需要手动选择。
result: [pending]

### 9. BGM 恢复
expected: 有 BGM 播放时激活快进，BGM 应静音。停止快进后，BGM 应恢复播放（如果快进期间脚本切换了 BGM，应播放最新的那首）。
result: [pending]

### 10. 音效/语音抑制
expected: 快进期间，SE（音效）和语音应完全不播放。停止快进后恢复正常播放。
result: [pending]

### 11. 转场效果瞬时
expected: 快进期间，角色出场/退场动画和背景切换应瞬间完成（无渐变/过渡效果）。
result: [pending]

### 12. 覆盖层停止快进
expected: 快进中打开任何覆盖层（右键菜单、存档、读档、回想、设置）应自动停止快进。
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps

[none yet]
