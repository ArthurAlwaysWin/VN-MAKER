const PAGE_TYPE_LABELS = Object.freeze({
  normal: '普通页',
  choice: '选择页',
  input: '输入页',
  condition: '条件页',
  video: '视频页',
});

const PAGE_TYPE_CONTENT = Object.freeze({
  normal: '对白与页面效果',
  choice: '选项与选项效果',
  input: '文本输入配置',
  condition: '条件分支数据',
  video: '视频播放配置',
});

export function getPageTypeConversionWarning(fromType, targetType) {
  const from = PAGE_TYPE_LABELS[fromType] ? fromType : 'normal';
  const target = PAGE_TYPE_LABELS[targetType] ? targetType : 'normal';
  if (from === target) return null;
  return `转换为${PAGE_TYPE_LABELS[target]}将丢弃${PAGE_TYPE_CONTENT[from]}，确定继续？`;
}
