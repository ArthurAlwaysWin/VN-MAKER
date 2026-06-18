import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    testTimeout: 30000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-web/**',
      '**/dist-electron/**',
      '**/.worktrees/**',
      '**/tests/colorRecipe.test.js',
      '**/tests/configurableTabs.test.js',
      '**/tests/decorLayoutEditor.test.js',
      '**/tests/effectDsl.test.js',
      '**/tests/exportDesktop.test.js',
      '**/tests/oklch.test.js',
      '**/tests/packageEditorWin.test.js',
      '**/tests/scanAssets.test.js',
      '**/tests/scriptEngine.test.js',
      '**/tests/smartColorPanel.test.js',
      '**/tests/tabLayoutEditor.test.js',
      '**/tests/uiImageContract.test.js',
      '**/tests/widgetDefaults.test.js',
    ],
  },
});
