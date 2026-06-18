export async function exportCurrentThemePackage({
  ipcRenderer,
  scriptStore,
  projectStore,
} = {}) {
  if (!ipcRenderer) {
    throw new Error('ipcRenderer is required');
  }

  if (projectStore?.saveProject) {
    const saved = await projectStore.saveProject(scriptStore?.data);
    if (!saved) {
      return {
        status: 'error',
        message: '导出 .gmtheme 失败: 保存项目失败',
      };
    }
  }

  const themeId = scriptStore?.data?.ui?.theme?.packageMeta?.themeId ?? '';
  const result = await ipcRenderer.invoke('export-gmtheme', {
    metadata: {
      themeId,
    },
  });

  if (result?.canceled) {
    return {
      status: 'canceled',
      message: '',
    };
  }

  if (!result?.success) {
    return {
      status: 'error',
      message: `导出 .gmtheme 失败: ${result?.error ?? '未知错误'}`,
    };
  }

  return {
    status: 'success',
    message: `已导出完整 .gmtheme：${result.path}`,
    path: result.path,
  };
}
