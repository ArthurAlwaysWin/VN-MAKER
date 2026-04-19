/**
 * Built-in Theme Packages — complete theme data for one-click application.
 *
 * Each theme contains:
 * - tokens: design token overrides (merged onto DEFAULT_TOKENS by engine)
 * - widgetStyles: widget appearance overrides (merged onto WIDGET_DEFAULTS by engine)
 * - screens: per-screen layout configs (saveLoadScreen, backlogScreen, gameMenu, settingsScreen)
 *
 * "default" captures the engine's built-in appearance (empty overrides).
 * "wafuu" provides a full Japanese-style config with nine-slice references.
 * The remaining three are color-scheme-only themes (tokens + widgetStyles colors, no screen layouts).
 *
 * @module editor/builtinThemes
 */

export const BUILTIN_THEMES = [
  {
    id: 'default',
    name: '默认',
    description: '引擎内置默认外观',
    primaryColor: '#b4a0ff',
    tokens: {},
    widgetStyles: {},
    screens: {},
  },
  {
    id: 'wafuu',
    name: '和风',
    description: '日式温暖色调，侧边栏导航，含九宫格贴图',
    primaryColor: '#C8A882',
    colorRecipe: { primary: '#C98683', accent: '#C19D71', mode: 'dark' },
    tokens: {
      'primary': 'rgba(201, 134, 131, 0.90)',
      'primary-subtle': 'rgba(50, 28, 27, 0.08)',
      'accent': 'rgba(193, 157, 113, 0.25)',
      'accent-border': 'rgba(177, 132, 78, 0.50)',
      'shadow': 'rgba(106, 50, 47, 0.30)',
      'title-glow': 'rgba(185, 100, 95, 0.30)',
      'save-title': 'rgba(201, 134, 131, 0.90)',
      'load-title': 'rgba(193, 157, 113, 0.90)',
      'text': 'rgba(244, 235, 226, 0.92)',
      'text-heading': 'rgba(235, 220, 203, 0.85)',
      'text-secondary': 'rgba(206, 186, 163, 0.75)',
      'dialogue-bg': 'linear-gradient(to top, rgba(20, 12, 10, 0.92) 0%, rgba(20, 12, 10, 0.88) 70%, rgba(20, 12, 10, 0.75) 100%)',
      'panel-bg': 'rgba(18, 12, 10, 0.95)',
      'menu-bg': 'rgba(14, 8, 6, 0.70)',
      'card-bg': 'rgba(38, 24, 18, 0.60)',
      'btn-bg': 'rgba(89, 56, 38, 0.60)',
      'btn-hover-bg': 'rgba(138, 80, 40, 0.70)',
      'font-display': "'Noto Serif SC', serif",
    },
    widgetStyles: {
      tab: {
        shape: 'ribbon',
        activeColor: 'rgba(201, 134, 131, 0.85)',
        inactiveColor: 'rgba(193, 157, 113, 0.15)',
        activeTextColor: '#fff',
        inactiveTextColor: 'rgba(244, 235, 226, 0.6)',
      },
      toggle: {
        style: 'pill',
        onColor: 'rgba(201, 134, 131, 0.85)',
        offColor: 'rgba(193, 157, 113, 0.15)',
        thumbColor: '#fff',
      },
      slider: {
        trackColor: 'rgba(193, 157, 113, 0.15)',
        fillColor: 'rgba(201, 134, 131, 0.8)',
        thumbColor: '#fff',
        thumbStyle: 'circle',
      },
      panel: {
        background: 'rgba(18, 12, 10, 0.85)',
        borderRadius: 4,
        border: '1px solid rgba(193, 157, 113, 0.2)',
        backdropBlur: 8,
      },
      button: {
        background: 'rgba(89, 56, 38, 0.6)',
        hoverBackground: 'rgba(138, 80, 40, 0.7)',
        activeBackground: 'rgba(160, 90, 45, 0.8)',
        textColor: 'rgba(244, 235, 226, 0.9)',
        borderRadius: 4,
        border: '1px solid rgba(193, 157, 113, 0.2)',
      },
    },
    screens: {
      saveLoadScreen: {
        header: { saveTitleColor: 'rgba(201, 134, 131, 0.9)', loadTitleColor: 'rgba(193, 157, 113, 0.9)' },
        slot: { borderRadius: 4, border: '1px solid rgba(193, 157, 113, 0.15)' },
        pagination: { activeColor: 'rgba(201, 134, 131, 0.9)' },
      },
      backlogScreen: {
        header: { title: '回 想' },
        entry: { speakerColor: 'rgba(201, 134, 131, 0.9)', hoverBackground: 'rgba(89, 56, 38, 0.2)' },
      },
      gameMenu: {
        background: 'rgba(18, 12, 10, 0.85)',
        borderRadius: 4,
        backdropBlur: 8,
      },
      settingsScreen: {
        header: {
          title: { text: '系統設定', color: 'rgba(244, 235, 226, 0.9)' },
          decorations: [
            { src: '', x: 0, y: 10, width: 60, height: 60 },
            { src: '', x: 1220, y: 10, width: 60, height: 60 },
          ],
        },
        tabBar: {
          position: 'left',
          width: 180,
          background: 'rgba(38, 24, 18, 0.5)',
          tabs: [
            { label: '音声', icon: '🔊' },
            { label: '画面', icon: '🖥️' },
            { label: '文字', icon: '📝' },
          ],
        },
        footer: {
          height: 60,
          buttons: [
            { text: '关闭', action: 'close', x: 0, y: 0 },
            { text: '恢复默认', action: 'reset', x: 0, y: 0 },
          ],
        },
      },
    },
  },
  {
    id: 'modern-sky',
    name: '现代天蓝',
    description: '清新蓝色调，双栏布局，适合现代都市题材',
    primaryColor: '#4A90D9',
    colorRecipe: { primary: '#4A90D9', accent: '#DB9B57', mode: 'dark' },
    tokens: {
      'primary': 'rgba(74, 143, 217, 0.90)',
      'accent': 'rgba(219, 155, 87, 0.25)',
      'save-title': 'rgba(74, 143, 217, 0.90)',
      'load-title': 'rgba(224, 168, 108, 0.90)',
      'dialogue-bg': 'linear-gradient(to top, rgba(11, 13, 15, 0.92) 0%, rgba(11, 13, 15, 0.88) 70%, rgba(11, 13, 15, 0.75) 100%)',
      'panel-bg': 'rgba(12, 15, 18, 0.95)',
      'btn-bg': 'rgba(38, 63, 89, 0.60)',
      'btn-hover-bg': 'rgba(40, 88, 138, 0.70)',
    },
    widgetStyles: {
      tab: { activeColor: 'rgba(74, 143, 217, 0.85)' },
      toggle: { onColor: 'rgba(74, 143, 217, 0.85)' },
      slider: { fillColor: 'rgba(74, 143, 217, 0.8)' },
      panel: { background: 'rgba(12, 15, 18, 0.85)' },
      button: { background: 'rgba(38, 63, 89, 0.6)', hoverBackground: 'rgba(40, 88, 138, 0.7)' },
    },
    screens: {
      settingsScreen: {
        tabBar: {
          tabs: [
            { label: '音频', icon: '🔊' },
            { label: '显示', icon: '🖥️' },
            { label: '文字', icon: '📝' },
          ],
        },
        contentArea: {
          columns: 2,
          itemStyle: {
            showDividers: true,
            alternateBackground: true,
          },
        },
      },
    },
  },
  {
    id: 'fantasy-dark',
    name: '暗黑幻想',
    description: '深紫金色调，含装饰图案，适合奇幻冒险题材',
    primaryColor: '#9B6EC8',
    colorRecipe: { primary: '#9B6EC8', accent: '#D7AF5F', mode: 'dark' },
    tokens: {
      'primary': 'rgba(155, 110, 200, 0.90)',
      'accent': 'rgba(215, 175, 95, 0.25)',
      'save-title': 'rgba(155, 110, 200, 0.90)',
      'load-title': 'rgba(215, 175, 95, 0.90)',
      'dialogue-bg': 'linear-gradient(to top, rgba(12, 8, 18, 0.92) 0%, rgba(12, 8, 18, 0.88) 70%, rgba(12, 8, 18, 0.75) 100%)',
      'panel-bg': 'rgba(14, 10, 20, 0.95)',
      'btn-bg': 'rgba(60, 40, 80, 0.60)',
      'btn-hover-bg': 'rgba(80, 55, 110, 0.70)',
    },
    widgetStyles: {
      tab: { activeColor: 'rgba(155, 110, 200, 0.85)' },
      toggle: { onColor: 'rgba(155, 110, 200, 0.85)' },
      slider: { fillColor: 'rgba(155, 110, 200, 0.8)' },
      panel: { background: 'rgba(14, 10, 20, 0.85)' },
      button: { background: 'rgba(60, 40, 80, 0.6)', hoverBackground: 'rgba(80, 55, 110, 0.7)' },
    },
    screens: {
      settingsScreen: {
        header: {
          title: { text: '系统设定' },
          decorations: [
            { src: '', x: 0, y: 5, width: 50, height: 50 },
            { src: '', x: 1230, y: 5, width: 50, height: 50 },
          ],
        },
        tabBar: {
          tabs: [
            { label: '声音', icon: '🔉' },
            { label: '画面', icon: '🎨' },
            { label: '文字', icon: '✒️' },
          ],
        },
      },
    },
  },
  {
    id: 'minimal-white',
    name: '极简白',
    description: '浅色简洁风格，适合轻松日常题材',
    primaryColor: '#5BA87E',
    colorRecipe: { primary: '#5BA87E', accent: '#5BA87E', mode: 'light' },
    tokens: {
      'primary': 'rgba(91, 168, 126, 0.90)',
      'accent': 'rgba(91, 168, 126, 0.15)',
      'save-title': 'rgba(91, 168, 126, 0.90)',
      'load-title': 'rgba(91, 168, 126, 0.70)',
      'text': 'rgba(40, 40, 40, 0.92)',
      'text-heading': 'rgba(30, 30, 30, 0.85)',
      'text-secondary': 'rgba(80, 80, 80, 0.75)',
      'dialogue-bg': 'linear-gradient(to top, rgba(245, 245, 245, 0.92) 0%, rgba(245, 245, 245, 0.88) 70%, rgba(245, 245, 245, 0.75) 100%)',
      'panel-bg': 'rgba(250, 250, 250, 0.95)',
      'menu-bg': 'rgba(240, 240, 240, 0.70)',
      'card-bg': 'rgba(235, 235, 235, 0.60)',
      'btn-bg': 'rgba(91, 168, 126, 0.15)',
      'btn-text': 'rgba(40, 40, 40, 0.90)',
      'btn-hover-bg': 'rgba(91, 168, 126, 0.25)',
    },
    widgetStyles: {
      tab: { activeColor: 'rgba(91, 168, 126, 0.85)', inactiveColor: 'rgba(91, 168, 126, 0.1)', activeTextColor: '#fff', inactiveTextColor: 'rgba(40, 40, 40, 0.6)' },
      toggle: { onColor: 'rgba(91, 168, 126, 0.85)', offColor: 'rgba(91, 168, 126, 0.1)' },
      slider: { trackColor: 'rgba(91, 168, 126, 0.1)', fillColor: 'rgba(91, 168, 126, 0.8)' },
      panel: { background: 'rgba(250, 250, 250, 0.85)', border: '1px solid rgba(91, 168, 126, 0.15)' },
      button: { background: 'rgba(91, 168, 126, 0.15)', hoverBackground: 'rgba(91, 168, 126, 0.25)', textColor: 'rgba(40, 40, 40, 0.9)' },
    },
    screens: {},
  },
];
