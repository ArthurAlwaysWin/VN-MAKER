export async function installAndApplyThemePackage({
  ipcRenderer,
  scriptStore,
  projectStore,
  assetStore,
  source,
  filePath,
  themeId,
} = {}) {
  if (!ipcRenderer) {
    throw new Error('ipcRenderer is required');
  }
  if (!scriptStore?.applyThemeBundle) {
    throw new Error('scriptStore.applyThemeBundle is required');
  }

  if (source === 'file') {
    const preflight = await ipcRenderer.invoke('preflight-theme-package', {
      filePath,
    });
    if (!preflight?.success) {
      throw new Error(preflight?.error ?? '主题包预检失败');
    }
    if (preflight.status !== 'ready') {
      throw new Error(preflight.blockingErrors?.[0] ?? '该主题包当前不可应用');
    }
  }

  const installResult = await ipcRenderer.invoke('install-theme-package', {
    source,
    ...(source === 'file' ? { filePath } : { themeId }),
  });
  if (!installResult?.success) {
    throw new Error(installResult?.error ?? '主题安装失败');
  }

  scriptStore.applyThemeBundle(installResult.bundle, installResult.packageMeta);
  projectStore?.markDirty?.();
  await assetStore?.loadCategory?.('ui');

  return installResult;
}
