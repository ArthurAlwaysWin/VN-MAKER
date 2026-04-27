import { createImportedThemeBrowserEntry } from './themeBrowser.js';

const COVERAGE_LABELS = Object.freeze({
  theme: '主题基础',
  widgetStyles: '通用控件',
  dialogueBox: '对话框',
  saveLoadScreen: '存档/读档',
  backlogScreen: '回看界面',
  gameMenu: '游戏菜单',
  settingsScreen: '设置界面',
});

function labelCoverage(list = []) {
  return list.map(item => COVERAGE_LABELS[item] ?? item);
}

export function createThemePackageImportSummary(preflight = {}) {
  if (!preflight.success) {
    return {
      state: 'error',
      badge: '读取失败',
      title: '主题包读取失败',
      previewMode: 'static',
      coverageLabels: [],
      missingCoverageLabels: [],
      coverageText: '',
      missingCoverageText: '',
      blockingErrors: [preflight.error ?? '未知错误'],
      warningLines: [],
      planLines: [],
      namespaceText: '',
      canAutoApply: false,
    };
  }

  const coverageLabels = labelCoverage(preflight.coverage);
  const missingCoverageLabels = labelCoverage(preflight.missingCoverage);
  let badge = '导入已阻止';
  let title = '主题包预检已阻止';

  if (preflight.status === 'legacy-partial') {
    badge = '兼容导入 / 部分主题';
    title = 'Legacy `.theme` 仅作兼容导入';
  } else if (preflight.status === 'ready') {
    badge = '完整主题预检通过';
    title = '完整主题包预检完成';
  }

  const planLines = [];
  if (preflight.status === 'ready' && coverageLabels.length > 0) {
    planLines.push(`应用后将接管这些主题范围：${coverageLabels.join('、')}`);
  }
  if (planLines.length === 0 && preflight.status === 'legacy-partial') {
    planLines.push('仅展示兼容导入摘要；本阶段不会自动安装或应用');
  }

  return {
    state: preflight.status ?? 'blocked',
    badge,
    title,
    previewMode: 'static',
    coverageLabels,
    missingCoverageLabels,
    coverageText: coverageLabels.join('、'),
    missingCoverageText: missingCoverageLabels.join('、'),
    blockingErrors: preflight.blockingErrors ?? [],
    warningLines: preflight.warnings ?? [],
    planLines,
    namespaceText: preflight.assetRoot ? `命名空间：${preflight.assetRoot}` : '',
    canAutoApply: preflight.status === 'ready',
  };
}

export async function preflightThemePackageImport({
  ipcRenderer,
  scriptStore,
} = {}) {
  const fileResult = await ipcRenderer.invoke('import-theme');
  if (fileResult?.canceled) {
    return {
      canceled: true,
      summary: null,
    };
  }

  if (!fileResult?.success) {
    const summary = createThemePackageImportSummary({
      success: false,
      error: fileResult?.error ?? '未能读取主题包',
    });
    return {
      canceled: false,
      summary,
      preflight: null,
    };
  }

  const preflight = await ipcRenderer.invoke('preflight-theme-package', {
    filePath: fileResult.filePath,
  });
  const scriptData = scriptStore?.data?.value ?? scriptStore?.data ?? {};

  return {
    canceled: false,
    preflight,
    summary: createThemePackageImportSummary(preflight),
    browserEntry: createImportedThemeBrowserEntry({
      ...preflight,
      filePath: fileResult.filePath,
      fileName: preflight?.fileName ?? fileResult?.filePath?.split(/[\\/]/).pop() ?? '',
    }, scriptData),
  };
}
