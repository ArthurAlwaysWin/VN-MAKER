/**
 * Built-in Theme Packages — complete manifest data for the shipped theme roster.
 *
 * Phase 82 keeps `BUILTIN_THEMES` as the single built-in source of truth while
 * exposing explicit browser metadata (`coverage`, `preview`, `visualSignature`)
 * and the shared install/apply shape (`ui`, `tokens`, `widgetStyles`, `screens`).
 *
 * @module editor/builtinThemes
 */

import { FULL_THEME_COVERAGE_KEYS } from '../shared/themePackageContract.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function cloneTitleScreen(value) {
  const titleScreen = value && typeof value === 'object' ? value : {};
  return {
    background: titleScreen.background ?? null,
    elements: Array.isArray(titleScreen.elements)
      ? titleScreen.elements.map(element => ({ ...(element ?? {}) }))
      : [],
  };
}

function createBuiltinTheme({
  id,
  name,
  description,
  primaryColor,
  preview,
  visualSignature,
  ui,
} = {}) {
  const normalizedUi = {
    theme: clone(ui?.theme),
    widgetStyles: clone(ui?.widgetStyles),
    dialogueBox: clone(ui?.dialogueBox),
    saveLoadScreen: clone(ui?.saveLoadScreen),
    backlogScreen: clone(ui?.backlogScreen),
    gameMenu: clone(ui?.gameMenu),
    settingsScreen: clone(ui?.settingsScreen),
    titleScreen: cloneTitleScreen(ui?.titleScreen),
  };

  return {
    id,
    name,
    description,
    primaryColor,
    coverage: [...FULL_THEME_COVERAGE_KEYS],
    preview: { ...preview },
    visualSignature: {
      ...visualSignature,
      requiredTells: { ...(visualSignature?.requiredTells ?? {}) },
    },
    ui: normalizedUi,
    tokens: { ...(normalizedUi.theme?.tokens ?? {}) },
    colorRecipe: normalizedUi.theme?.colorRecipe ? { ...normalizedUi.theme.colorRecipe } : undefined,
    widgetStyles: clone(normalizedUi.widgetStyles),
    screens: {
      saveLoadScreen: clone(normalizedUi.saveLoadScreen),
      backlogScreen: clone(normalizedUi.backlogScreen),
      gameMenu: clone(normalizedUi.gameMenu),
      settingsScreen: clone(normalizedUi.settingsScreen),
      titleScreen: cloneTitleScreen(normalizedUi.titleScreen),
    },
  };
}

export const BUILTIN_THEMES = [
  createBuiltinTheme({
    id: 'default',
    name: '默认',
    description: '打磨完成的中性出厂基线，以抛光石墨面板统一标题、对话与主要界面。',
    primaryColor: '#7D8AA6',
    preview: {
      mode: 'asset',
      src: '/builtin-themes/default/preview.svg',
      background: '#151A22',
      accent: '#B9C4DA',
      text: '默认',
      initials: '默认',
    },
    visualSignature: {
      materialLanguage: '磨砂石墨面板、缎面冷灰描边与低饱和蓝灰高光',
      contourLanguage: '克制的圆角矩形、稳定横向条带与均匀留白构成 polished neutral baseline',
      styleDirection: 'polished neutral baseline',
      requiredTells: {
        titleScreen: '标题界面以石墨幕布、金属字标和双按钮底座组成可靠出厂入口',
        dialogueBox: '对话框使用半透明石墨层与浅色名牌条保持稳健可读性',
        buttonFamily: '按钮族维持统一的灰蓝高亮、细描边和 8px 圆角',
        majorScreenChrome: '主要界面共用深石墨 chrome 底板、亮边线和克制分栏条',
      },
    },
    ui: {
      theme: {
        colorRecipe: { primary: '#7D8AA6', accent: '#A7B4CF', mode: 'dark' },
        tokens: {
          primary: 'rgba(133, 147, 173, 0.94)',
          accent: 'rgba(185, 196, 218, 0.30)',
          text: 'rgba(239, 243, 249, 0.94)',
          textHeading: 'rgba(250, 252, 255, 0.96)',
          textSecondary: 'rgba(188, 198, 217, 0.78)',
          dialogueBg: 'linear-gradient(to top, rgba(12, 15, 20, 0.96) 0%, rgba(15, 19, 25, 0.90) 70%, rgba(15, 19, 25, 0.72) 100%)',
          panelBg: 'rgba(17, 22, 30, 0.94)',
          menuBg: 'rgba(12, 15, 20, 0.74)',
          cardBg: 'rgba(33, 40, 53, 0.74)',
          btnBg: 'rgba(92, 105, 128, 0.64)',
          btnHoverBg: 'rgba(124, 142, 171, 0.82)',
          shadow: 'rgba(4, 7, 11, 0.38)',
        },
      },
      widgetStyles: {
        tab: {
          activeColor: 'rgba(133, 147, 173, 0.94)',
          inactiveColor: 'rgba(185, 196, 218, 0.16)',
          activeTextColor: '#FFFFFF',
          inactiveTextColor: 'rgba(239, 243, 249, 0.66)',
        },
        toggle: {
          style: 'pill',
          onColor: 'rgba(133, 147, 173, 0.94)',
          offColor: 'rgba(185, 196, 218, 0.18)',
          thumbColor: '#FFFFFF',
        },
        slider: {
          trackColor: 'rgba(185, 196, 218, 0.20)',
          fillColor: 'rgba(133, 147, 173, 0.90)',
          thumbColor: '#FFFFFF',
          thumbStyle: 'capsule',
        },
        panel: {
          background: 'rgba(17, 22, 30, 0.90)',
          borderRadius: 10,
          border: '1px solid rgba(185, 196, 218, 0.20)',
          backdropBlur: 12,
        },
        button: {
          background: 'rgba(92, 105, 128, 0.64)',
          hoverBackground: 'rgba(124, 142, 171, 0.82)',
          activeBackground: 'rgba(155, 169, 193, 0.90)',
          textColor: 'rgba(239, 243, 249, 0.94)',
          borderRadius: 8,
          border: '1px solid rgba(185, 196, 218, 0.24)',
        },
      },
      dialogueBox: {
        layout: 'lower-third',
        nameplateStyle: 'polished-plaque',
        nameplateBackgroundImage: 'ui/themes/default/dialogue/nameplate.svg',
        background: 'rgba(12, 15, 20, 0.92)',
        border: '1px solid rgba(185, 196, 218, 0.20)',
        shadow: '0 16px 40px rgba(4, 7, 11, 0.34)',
        decorations: [
          {
            src: 'ui/themes/default/dialogue/nameplate.svg',
            x: 72,
            y: 18,
            width: 220,
            height: 58,
          },
        ],
      },
      saveLoadScreen: {
        header: {
          title: '存档 / 读档',
          accentBarColor: 'rgba(133, 147, 173, 0.94)',
        },
        slot: {
          background: 'rgba(33, 40, 53, 0.76)',
          borderRadius: 10,
          border: '1px solid rgba(185, 196, 218, 0.18)',
        },
        chrome: {
          backgroundColor: 'rgba(17, 22, 30, 0.86)',
          backgroundImage: 'ui/themes/default/screens/chrome.svg',
          edgeGlow: 'rgba(185, 196, 218, 0.18)',
        },
      },
      backlogScreen: {
        header: {
          title: '回看记录',
          accentBarColor: 'rgba(133, 147, 173, 0.94)',
        },
        entry: {
          speakerColor: 'rgba(239, 243, 249, 0.90)',
          hoverBackground: 'rgba(92, 105, 128, 0.24)',
        },
        chrome: {
          backgroundColor: 'rgba(17, 22, 30, 0.86)',
          backgroundImage: 'ui/themes/default/screens/chrome.svg',
          dividerColor: 'rgba(185, 196, 218, 0.18)',
        },
      },
      gameMenu: {
        background: 'rgba(12, 15, 20, 0.78)',
        borderRadius: 12,
        backdropBlur: 16,
        buttons: {
          save: { label: '保存', icon: '💾' },
          load: { label: '读取', icon: '📂' },
          backlog: { label: '回看', icon: '📝' },
          settings: { label: '设置', icon: '⚙️' },
        },
        chrome: {
          backgroundColor: 'rgba(17, 22, 30, 0.88)',
          backgroundImage: 'ui/themes/default/screens/chrome.svg',
          edgeGlow: 'rgba(185, 196, 218, 0.18)',
        },
      },
      settingsScreen: {
        header: {
          title: { text: '系统设定', color: 'rgba(250, 252, 255, 0.96)' },
          subtitle: '默认基线 · 石墨中性系统',
        },
        tabBar: {
          position: 'left',
          width: 180,
          background: 'rgba(33, 40, 53, 0.68)',
          tabs: [
            { label: '音频', icon: '🔊' },
            { label: '显示', icon: '🖥️' },
            { label: '文字', icon: '📝' },
          ],
        },
        footer: {
          height: 60,
          buttons: [
            { text: '恢复默认', action: 'reset', x: 1030, y: 14 },
          ],
        },
        chrome: {
          backgroundColor: 'rgba(17, 22, 30, 0.90)',
          backgroundImage: 'ui/themes/default/screens/chrome.svg',
          border: '1px solid rgba(185, 196, 218, 0.20)',
        },
      },
      titleScreen: {
        background: 'ui/themes/default/title/background.svg',
        elements: [
          {
            type: 'image',
            src: 'ui/themes/default/title/mark.svg',
            x: 640,
            y: 182,
            anchor: 'center',
            width: 436,
            height: 178,
          },
          {
            type: 'text',
            content: 'DEFAULT SYSTEM',
            x: 640,
            y: 286,
            anchor: 'center',
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(223, 231, 244, 0.82)',
            letterSpacing: 6,
            textShadow: '0 8px 22px rgba(4, 7, 11, 0.36)',
          },
          {
            type: 'button',
            text: '开始',
            action: 'start',
            x: 640,
            y: 404,
            anchor: 'center',
            width: 236,
            height: 54,
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(239, 243, 249, 0.94)',
            backgroundColor: 'rgba(92, 105, 128, 0.82)',
            hoverColor: 'rgba(124, 142, 171, 0.90)',
            borderRadius: 8,
            border: '1px solid rgba(185, 196, 218, 0.30)',
          },
          {
            type: 'button',
            text: '设置',
            action: 'settings',
            x: 640,
            y: 474,
            anchor: 'center',
            width: 236,
            height: 54,
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(239, 243, 249, 0.92)',
            backgroundColor: 'rgba(48, 56, 70, 0.76)',
            hoverColor: 'rgba(91, 107, 132, 0.86)',
            borderRadius: 8,
            border: '1px solid rgba(185, 196, 218, 0.24)',
          },
        ],
      },
    },
  }),
  createBuiltinTheme({
    id: 'wafuu',
    name: '和风',
    description: '日式温暖色调，织物与木纹感面板，作为 golden baseline 保持完整交付。',
    primaryColor: '#C8A882',
    preview: {
      mode: 'asset',
      src: '/builtin-themes/wafuu/preview.svg',
      background: '#2C1D18',
      accent: '#C98683',
      text: '和风',
      initials: '和风',
    },
    visualSignature: {
      materialLanguage: '漆木、和纸与温暖铜色描边的日式器物语言',
      contourLanguage: '细窄边框、横向纹样与留白分层形成静谧轮廓',
      styleDirection: 'warm ceremonial Japanese baseline',
      requiredTells: {
        titleScreen: '标题界面必须保留淡金文字与木色按钮构成的安静仪式感',
        dialogueBox: '对话框需要深色半透明底与织物感名牌层次',
        buttonFamily: '按钮族必须统一为温润木色块面与铜金描边',
        majorScreenChrome: '主要界面 chrome 需要延续深木底与暖金分割线',
      },
    },
    ui: {
      theme: {
        colorRecipe: { primary: '#C98683', accent: '#C19D71', mode: 'dark' },
        tokens: {
          primary: 'rgba(201, 134, 131, 0.90)',
          accent: 'rgba(193, 157, 113, 0.25)',
          text: 'rgba(244, 235, 226, 0.92)',
          textHeading: 'rgba(235, 220, 203, 0.85)',
          textSecondary: 'rgba(206, 186, 163, 0.75)',
          dialogueBg: 'linear-gradient(to top, rgba(20, 12, 10, 0.92) 0%, rgba(20, 12, 10, 0.88) 70%, rgba(20, 12, 10, 0.75) 100%)',
          panelBg: 'rgba(18, 12, 10, 0.95)',
          menuBg: 'rgba(14, 8, 6, 0.70)',
          cardBg: 'rgba(38, 24, 18, 0.60)',
          btnBg: 'rgba(89, 56, 38, 0.60)',
          btnHoverBg: 'rgba(138, 80, 40, 0.70)',
          shadow: 'rgba(106, 50, 47, 0.30)',
          fontDisplay: "'Noto Serif SC', serif",
        },
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
      dialogueBox: {
        layout: 'lower-third',
        nameplateStyle: 'woven-plaque',
        background: 'rgba(20, 12, 10, 0.90)',
        border: '1px solid rgba(193, 157, 113, 0.22)',
        shadow: '0 10px 30px rgba(20, 12, 10, 0.32)',
      },
      saveLoadScreen: {
        header: {
          title: '存档 / 读档',
          saveTitleColor: 'rgba(201, 134, 131, 0.9)',
          loadTitleColor: 'rgba(193, 157, 113, 0.9)',
        },
        slot: {
          borderRadius: 4,
          border: '1px solid rgba(193, 157, 113, 0.15)',
          background: 'rgba(38, 24, 18, 0.60)',
        },
        pagination: {
          activeColor: 'rgba(201, 134, 131, 0.9)',
        },
        chrome: {
          backgroundColor: 'rgba(18, 12, 10, 0.84)',
          edgeGlow: 'rgba(193, 157, 113, 0.18)',
        },
      },
      backlogScreen: {
        header: { title: '回 想' },
        entry: {
          speakerColor: 'rgba(201, 134, 131, 0.9)',
          hoverBackground: 'rgba(89, 56, 38, 0.2)',
        },
        chrome: {
          backgroundColor: 'rgba(18, 12, 10, 0.84)',
          dividerColor: 'rgba(193, 157, 113, 0.18)',
        },
      },
      gameMenu: {
        background: 'rgba(18, 12, 10, 0.85)',
        borderRadius: 4,
        backdropBlur: 8,
        buttons: {
          save: { label: '保存', icon: '💾' },
          load: { label: '读取', icon: '📂' },
          backlog: { label: '回看', icon: '📝' },
          settings: { label: '设置', icon: '⚙️' },
        },
        chrome: {
          backgroundColor: 'rgba(18, 12, 10, 0.84)',
          edgeGlow: 'rgba(193, 157, 113, 0.18)',
        },
      },
      settingsScreen: {
        header: {
          title: { text: '系统设定', color: 'rgba(244, 235, 226, 0.9)' },
          subtitle: '和风 · 温暖木色系统',
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
            { text: '恢复默认', action: 'reset', x: 1030, y: 14 },
          ],
        },
        chrome: {
          backgroundColor: 'rgba(18, 12, 10, 0.88)',
          border: '1px solid rgba(193, 157, 113, 0.18)',
        },
      },
      titleScreen: {
        background: null,
        elements: [
          {
            type: 'text',
            content: '物语',
            x: 640,
            y: 150,
            anchor: 'center',
            fontSize: 52,
            fontFamily: "'Noto Serif SC', serif",
            color: 'rgba(244, 235, 226, 0.92)',
            letterSpacing: 12,
            textShadow: '0 6px 24px rgba(20, 12, 10, 0.45)',
          },
          {
            type: 'button',
            text: '开始',
            action: 'start',
            x: 640,
            y: 360,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Noto Serif SC', serif",
            color: 'rgba(244, 235, 226, 0.92)',
            backgroundColor: 'rgba(89, 56, 38, 0.72)',
            hoverColor: 'rgba(138, 80, 40, 0.82)',
            borderRadius: 6,
            border: '1px solid rgba(193, 157, 113, 0.45)',
          },
          {
            type: 'button',
            text: '设置',
            action: 'settings',
            x: 640,
            y: 430,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Noto Serif SC', serif",
            color: 'rgba(244, 235, 226, 0.92)',
            backgroundColor: 'rgba(89, 56, 38, 0.58)',
            hoverColor: 'rgba(138, 80, 40, 0.78)',
            borderRadius: 6,
            border: '1px solid rgba(193, 157, 113, 0.35)',
          },
        ],
      },
    },
  }),
  createBuiltinTheme({
    id: 'modern-sky',
    name: '现代天蓝',
    description: '通透明亮的现代城市界面，强调玻璃感与双栏信息结构。',
    primaryColor: '#4A90D9',
    preview: {
      mode: 'asset',
      src: '/builtin-themes/modern-sky/preview.svg',
      background: '#0F1823',
      accent: '#4A90D9',
      text: '现代天蓝',
      initials: '天蓝',
    },
    visualSignature: {
      materialLanguage: '浅玻璃、霓虹蓝高光与清爽金属框线',
      contourLanguage: '长直边、透明层叠和整齐网格构成都市 UI',
      styleDirection: 'airy modern glass-panel language',
      requiredTells: {
        titleScreen: '标题界面必须读出城市夜空蓝与玻璃按钮的漂浮感',
        dialogueBox: '对话框要保留冷色玻璃条与细光边名牌',
        buttonFamily: '按钮族统一使用蓝色高亮和清洁矩形轮廓',
        majorScreenChrome: '主要界面 chrome 需要持续出现玻璃分栏与冷蓝边线',
      },
    },
    ui: {
      theme: {
        colorRecipe: { primary: '#4A90D9', accent: '#DB9B57', mode: 'dark' },
        tokens: {
          primary: 'rgba(74, 143, 217, 0.90)',
          accent: 'rgba(219, 155, 87, 0.25)',
          text: 'rgba(235, 243, 251, 0.94)',
          textHeading: 'rgba(244, 249, 255, 0.96)',
          textSecondary: 'rgba(181, 203, 227, 0.78)',
          dialogueBg: 'linear-gradient(to top, rgba(11, 13, 15, 0.92) 0%, rgba(11, 13, 15, 0.88) 70%, rgba(11, 13, 15, 0.75) 100%)',
          panelBg: 'rgba(12, 15, 18, 0.95)',
          menuBg: 'rgba(10, 16, 24, 0.70)',
          cardBg: 'rgba(18, 32, 48, 0.62)',
          btnBg: 'rgba(38, 63, 89, 0.60)',
          btnHoverBg: 'rgba(40, 88, 138, 0.70)',
          shadow: 'rgba(5, 14, 24, 0.30)',
        },
      },
      widgetStyles: {
        tab: {
          activeColor: 'rgba(74, 143, 217, 0.85)',
          inactiveColor: 'rgba(124, 175, 226, 0.14)',
          activeTextColor: '#FFFFFF',
          inactiveTextColor: 'rgba(235, 243, 251, 0.64)',
        },
        toggle: {
          onColor: 'rgba(74, 143, 217, 0.85)',
          offColor: 'rgba(124, 175, 226, 0.16)',
          thumbColor: '#FFFFFF',
          style: 'pill',
        },
        slider: {
          trackColor: 'rgba(124, 175, 226, 0.18)',
          fillColor: 'rgba(74, 143, 217, 0.8)',
          thumbColor: '#FFFFFF',
          thumbStyle: 'rounded-rect',
        },
        panel: {
          background: 'rgba(12, 15, 18, 0.78)',
          border: '1px solid rgba(124, 175, 226, 0.24)',
          borderRadius: 10,
          backdropBlur: 14,
        },
        button: {
          background: 'rgba(38, 63, 89, 0.6)',
          hoverBackground: 'rgba(40, 88, 138, 0.7)',
          activeBackground: 'rgba(62, 120, 179, 0.82)',
          textColor: 'rgba(235, 243, 251, 0.94)',
          borderRadius: 8,
          border: '1px solid rgba(124, 175, 226, 0.24)',
        },
      },
      dialogueBox: {
        layout: 'floating-card',
        nameplateStyle: 'glass-strip',
        background: 'rgba(11, 13, 15, 0.88)',
        border: '1px solid rgba(124, 175, 226, 0.24)',
        shadow: '0 18px 40px rgba(5, 14, 24, 0.34)',
      },
      saveLoadScreen: {
        header: {
          title: '云端记忆',
          accentBarColor: 'rgba(74, 143, 217, 0.88)',
        },
        slot: {
          background: 'rgba(18, 32, 48, 0.64)',
          borderRadius: 10,
          border: '1px solid rgba(124, 175, 226, 0.20)',
        },
        chrome: {
          backgroundColor: 'rgba(12, 15, 18, 0.80)',
          edgeGlow: 'rgba(74, 143, 217, 0.22)',
        },
      },
      backlogScreen: {
        header: {
          title: '讯息回放',
          accentBarColor: 'rgba(74, 143, 217, 0.88)',
        },
        entry: {
          speakerColor: 'rgba(124, 191, 255, 0.92)',
          hoverBackground: 'rgba(40, 88, 138, 0.18)',
        },
        chrome: {
          backgroundColor: 'rgba(12, 15, 18, 0.82)',
          dividerColor: 'rgba(124, 175, 226, 0.18)',
        },
      },
      gameMenu: {
        background: 'rgba(10, 16, 24, 0.72)',
        borderRadius: 12,
        backdropBlur: 16,
        buttons: {
          save: { label: '保存', icon: '💾' },
          load: { label: '读取', icon: '📁' },
          backlog: { label: '回放', icon: '🧾' },
          settings: { label: '系统', icon: '⚙️' },
        },
        chrome: {
          backgroundColor: 'rgba(12, 15, 18, 0.84)',
          edgeGlow: 'rgba(74, 143, 217, 0.20)',
        },
      },
      settingsScreen: {
        header: {
          title: { text: '系统调校', color: 'rgba(235, 243, 251, 0.94)' },
          subtitle: '现代天蓝 · 双栏玻璃布局',
        },
        tabBar: {
          position: 'left',
          width: 188,
          background: 'rgba(18, 32, 48, 0.52)',
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
        footer: {
          height: 60,
          buttons: [
            { text: '同步推荐值', action: 'reset', x: 980, y: 14 },
          ],
        },
        chrome: {
          backgroundColor: 'rgba(12, 15, 18, 0.84)',
          border: '1px solid rgba(124, 175, 226, 0.20)',
        },
      },
      titleScreen: {
        background: null,
        elements: [
          {
            type: 'text',
            content: 'SKYLINE',
            x: 640,
            y: 148,
            anchor: 'center',
            fontSize: 48,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(235, 243, 251, 0.96)',
            letterSpacing: 12,
            textShadow: '0 10px 30px rgba(5, 14, 24, 0.36)',
          },
          {
            type: 'button',
            text: '开始',
            action: 'start',
            x: 640,
            y: 356,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(235, 243, 251, 0.96)',
            backgroundColor: 'rgba(38, 63, 89, 0.76)',
            hoverColor: 'rgba(40, 88, 138, 0.88)',
            borderRadius: 8,
            border: '1px solid rgba(124, 175, 226, 0.28)',
          },
          {
            type: 'button',
            text: '设置',
            action: 'settings',
            x: 640,
            y: 426,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(235, 243, 251, 0.94)',
            backgroundColor: 'rgba(18, 32, 48, 0.72)',
            hoverColor: 'rgba(62, 120, 179, 0.84)',
            borderRadius: 8,
            border: '1px solid rgba(124, 175, 226, 0.24)',
          },
        ],
      },
    },
  }),
  createBuiltinTheme({
    id: 'fantasy-dark',
    name: '暗黑幻想',
    description: '深紫与古金的奇幻宫廷界面，强调纹章、饰边与戏剧化层次。',
    primaryColor: '#9B6EC8',
    preview: {
      mode: 'asset',
      src: '/builtin-themes/fantasy-dark/preview.svg',
      background: '#160E1F',
      accent: '#D7AF5F',
      text: '暗黑幻想',
      initials: '幻想',
    },
    visualSignature: {
      materialLanguage: '深紫天鹅绒、古金描边与纹章式装饰',
      contourLanguage: '尖拱、徽章与层叠描边形成戏剧化奇幻轮廓',
      styleDirection: 'ornate dark-fantasy language',
      requiredTells: {
        titleScreen: '标题界面必须读出紫黑舞台与古金高光的仪式感',
        dialogueBox: '对话框应保留绒面深底与徽章名牌印象',
        buttonFamily: '按钮族需要统一为古金边的深紫块面与尖拱细节',
        majorScreenChrome: '主要界面 chrome 必须持续有古金分割与纹章装饰',
      },
    },
    ui: {
      theme: {
        colorRecipe: { primary: '#9B6EC8', accent: '#D7AF5F', mode: 'dark' },
        tokens: {
          primary: 'rgba(155, 110, 200, 0.90)',
          accent: 'rgba(215, 175, 95, 0.25)',
          text: 'rgba(245, 236, 220, 0.94)',
          textHeading: 'rgba(255, 244, 224, 0.96)',
          textSecondary: 'rgba(217, 198, 160, 0.78)',
          dialogueBg: 'linear-gradient(to top, rgba(12, 8, 18, 0.92) 0%, rgba(12, 8, 18, 0.88) 70%, rgba(12, 8, 18, 0.75) 100%)',
          panelBg: 'rgba(14, 10, 20, 0.95)',
          menuBg: 'rgba(12, 8, 18, 0.72)',
          cardBg: 'rgba(31, 20, 44, 0.66)',
          btnBg: 'rgba(60, 40, 80, 0.60)',
          btnHoverBg: 'rgba(80, 55, 110, 0.70)',
          shadow: 'rgba(5, 2, 8, 0.34)',
        },
      },
      widgetStyles: {
        tab: {
          activeColor: 'rgba(155, 110, 200, 0.85)',
          inactiveColor: 'rgba(215, 175, 95, 0.12)',
          activeTextColor: '#FFF5E3',
          inactiveTextColor: 'rgba(245, 236, 220, 0.64)',
        },
        toggle: {
          onColor: 'rgba(155, 110, 200, 0.85)',
          offColor: 'rgba(215, 175, 95, 0.14)',
          thumbColor: '#FFF5E3',
          style: 'pill',
        },
        slider: {
          trackColor: 'rgba(215, 175, 95, 0.14)',
          fillColor: 'rgba(155, 110, 200, 0.8)',
          thumbColor: '#FFF5E3',
          thumbStyle: 'gem',
        },
        panel: {
          background: 'rgba(14, 10, 20, 0.88)',
          border: '1px solid rgba(215, 175, 95, 0.22)',
          borderRadius: 10,
          backdropBlur: 10,
        },
        button: {
          background: 'rgba(60, 40, 80, 0.6)',
          hoverBackground: 'rgba(80, 55, 110, 0.7)',
          activeBackground: 'rgba(110, 78, 145, 0.82)',
          textColor: 'rgba(245, 236, 220, 0.94)',
          borderRadius: 8,
          border: '1px solid rgba(215, 175, 95, 0.24)',
        },
      },
      dialogueBox: {
        layout: 'crest-panel',
        nameplateStyle: 'sigil-plaque',
        background: 'rgba(12, 8, 18, 0.90)',
        border: '1px solid rgba(215, 175, 95, 0.24)',
        shadow: '0 18px 40px rgba(5, 2, 8, 0.36)',
      },
      saveLoadScreen: {
        header: {
          title: '圣典档案',
          accentBarColor: 'rgba(215, 175, 95, 0.88)',
        },
        slot: {
          background: 'rgba(31, 20, 44, 0.68)',
          borderRadius: 10,
          border: '1px solid rgba(215, 175, 95, 0.18)',
        },
        chrome: {
          backgroundColor: 'rgba(14, 10, 20, 0.84)',
          edgeGlow: 'rgba(215, 175, 95, 0.20)',
        },
      },
      backlogScreen: {
        header: {
          title: '编年回响',
          accentBarColor: 'rgba(215, 175, 95, 0.88)',
        },
        entry: {
          speakerColor: 'rgba(255, 223, 154, 0.92)',
          hoverBackground: 'rgba(80, 55, 110, 0.18)',
        },
        chrome: {
          backgroundColor: 'rgba(14, 10, 20, 0.84)',
          dividerColor: 'rgba(215, 175, 95, 0.18)',
        },
      },
      gameMenu: {
        background: 'rgba(12, 8, 18, 0.74)',
        borderRadius: 12,
        backdropBlur: 12,
        buttons: {
          save: { label: '保存', icon: '🕯️' },
          load: { label: '读取', icon: '📜' },
          backlog: { label: '编年', icon: '🗒️' },
          settings: { label: '秘仪', icon: '⚙️' },
        },
        chrome: {
          backgroundColor: 'rgba(14, 10, 20, 0.84)',
          edgeGlow: 'rgba(215, 175, 95, 0.20)',
        },
      },
      settingsScreen: {
        header: {
          title: { text: '系统设定', color: 'rgba(245, 236, 220, 0.94)' },
          subtitle: '暗黑幻想 · 宫廷纹章布局',
        },
        tabBar: {
          position: 'left',
          width: 188,
          background: 'rgba(31, 20, 44, 0.56)',
          tabs: [
            { label: '声音', icon: '🔉' },
            { label: '画面', icon: '🎨' },
            { label: '文字', icon: '✒️' },
          ],
        },
        footer: {
          height: 60,
          buttons: [
            { text: '恢复仪式默认', action: 'reset', x: 948, y: 14 },
          ],
        },
        chrome: {
          backgroundColor: 'rgba(14, 10, 20, 0.86)',
          border: '1px solid rgba(215, 175, 95, 0.20)',
        },
      },
      titleScreen: {
        background: null,
        elements: [
          {
            type: 'text',
            content: 'ECLIPSE',
            x: 640,
            y: 146,
            anchor: 'center',
            fontSize: 48,
            fontFamily: "'Cinzel', serif",
            color: 'rgba(255, 244, 224, 0.96)',
            letterSpacing: 14,
            textShadow: '0 10px 28px rgba(5, 2, 8, 0.42)',
          },
          {
            type: 'button',
            text: '开始',
            action: 'start',
            x: 640,
            y: 354,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Cinzel', serif",
            color: 'rgba(245, 236, 220, 0.94)',
            backgroundColor: 'rgba(60, 40, 80, 0.78)',
            hoverColor: 'rgba(110, 78, 145, 0.88)',
            borderRadius: 8,
            border: '1px solid rgba(215, 175, 95, 0.30)',
          },
          {
            type: 'button',
            text: '设置',
            action: 'settings',
            x: 640,
            y: 424,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Cinzel', serif",
            color: 'rgba(245, 236, 220, 0.94)',
            backgroundColor: 'rgba(31, 20, 44, 0.76)',
            hoverColor: 'rgba(80, 55, 110, 0.86)',
            borderRadius: 8,
            border: '1px solid rgba(215, 175, 95, 0.26)',
          },
        ],
      },
    },
  }),
  createBuiltinTheme({
    id: 'minimal-white',
    name: '极简白',
    description: '明亮留白的编辑风，强调轻量卡片、细线与柔和绿色提示。',
    primaryColor: '#5BA87E',
    preview: {
      mode: 'asset',
      src: '/builtin-themes/minimal-white/preview.svg',
      background: '#F3F4EF',
      accent: '#5BA87E',
      text: '极简白',
      initials: '极简',
    },
    visualSignature: {
      materialLanguage: '纸张白、细线描边与柔和植系绿色点缀',
      contourLanguage: '留白卡片、整齐分隔线与轻薄矩形形成编辑感',
      styleDirection: 'bright minimal editorial language',
      requiredTells: {
        titleScreen: '标题界面必须保持大面积留白与轻盈绿色操作按钮',
        dialogueBox: '对话框要读出浅纸面底与克制细线名牌',
        buttonFamily: '按钮族统一为轻卡片与柔和绿高亮，不可回到深色块面',
        majorScreenChrome: '主要界面 chrome 必须延续纸面底与细线分割节奏',
      },
    },
    ui: {
      theme: {
        colorRecipe: { primary: '#5BA87E', accent: '#5BA87E', mode: 'light' },
        tokens: {
          primary: 'rgba(91, 168, 126, 0.90)',
          accent: 'rgba(91, 168, 126, 0.15)',
          text: 'rgba(40, 40, 40, 0.92)',
          textHeading: 'rgba(30, 30, 30, 0.85)',
          textSecondary: 'rgba(80, 80, 80, 0.75)',
          dialogueBg: 'linear-gradient(to top, rgba(245, 245, 245, 0.92) 0%, rgba(245, 245, 245, 0.88) 70%, rgba(245, 245, 245, 0.75) 100%)',
          panelBg: 'rgba(250, 250, 250, 0.95)',
          menuBg: 'rgba(240, 240, 240, 0.70)',
          cardBg: 'rgba(235, 235, 235, 0.60)',
          btnBg: 'rgba(91, 168, 126, 0.15)',
          btnHoverBg: 'rgba(91, 168, 126, 0.25)',
          shadow: 'rgba(120, 128, 118, 0.16)',
        },
      },
      widgetStyles: {
        tab: {
          activeColor: 'rgba(91, 168, 126, 0.85)',
          inactiveColor: 'rgba(91, 168, 126, 0.10)',
          activeTextColor: '#FFFFFF',
          inactiveTextColor: 'rgba(40, 40, 40, 0.64)',
        },
        toggle: {
          onColor: 'rgba(91, 168, 126, 0.85)',
          offColor: 'rgba(91, 168, 126, 0.10)',
          thumbColor: '#FFFFFF',
          style: 'pill',
        },
        slider: {
          trackColor: 'rgba(91, 168, 126, 0.10)',
          fillColor: 'rgba(91, 168, 126, 0.80)',
          thumbColor: '#FFFFFF',
          thumbStyle: 'circle',
        },
        panel: {
          background: 'rgba(250, 250, 250, 0.90)',
          border: '1px solid rgba(91, 168, 126, 0.15)',
          borderRadius: 12,
          backdropBlur: 0,
        },
        button: {
          background: 'rgba(91, 168, 126, 0.15)',
          hoverBackground: 'rgba(91, 168, 126, 0.25)',
          activeBackground: 'rgba(91, 168, 126, 0.34)',
          textColor: 'rgba(40, 40, 40, 0.90)',
          borderRadius: 10,
          border: '1px solid rgba(91, 168, 126, 0.18)',
        },
      },
      dialogueBox: {
        layout: 'paper-sheet',
        nameplateStyle: 'inline-label',
        background: 'rgba(250, 250, 250, 0.92)',
        border: '1px solid rgba(91, 168, 126, 0.18)',
        shadow: '0 12px 28px rgba(120, 128, 118, 0.12)',
      },
      saveLoadScreen: {
        header: {
          title: '记录',
          accentBarColor: 'rgba(91, 168, 126, 0.84)',
        },
        slot: {
          background: 'rgba(255, 255, 255, 0.92)',
          borderRadius: 12,
          border: '1px solid rgba(91, 168, 126, 0.14)',
        },
        chrome: {
          backgroundColor: 'rgba(248, 248, 245, 0.92)',
          edgeGlow: 'rgba(91, 168, 126, 0.10)',
        },
      },
      backlogScreen: {
        header: {
          title: '对白记录',
          accentBarColor: 'rgba(91, 168, 126, 0.84)',
        },
        entry: {
          speakerColor: 'rgba(60, 120, 86, 0.92)',
          hoverBackground: 'rgba(91, 168, 126, 0.12)',
        },
        chrome: {
          backgroundColor: 'rgba(248, 248, 245, 0.92)',
          dividerColor: 'rgba(91, 168, 126, 0.12)',
        },
      },
      gameMenu: {
        background: 'rgba(240, 240, 240, 0.82)',
        borderRadius: 14,
        backdropBlur: 0,
        buttons: {
          save: { label: '保存', icon: '💾' },
          load: { label: '读取', icon: '📂' },
          backlog: { label: '回看', icon: '📝' },
          settings: { label: '设置', icon: '⚙️' },
        },
        chrome: {
          backgroundColor: 'rgba(248, 248, 245, 0.92)',
          edgeGlow: 'rgba(91, 168, 126, 0.10)',
        },
      },
      settingsScreen: {
        header: {
          title: { text: '系统设定', color: 'rgba(30, 30, 30, 0.88)' },
          subtitle: '极简白 · 明亮编辑布局',
        },
        tabBar: {
          position: 'left',
          width: 176,
          background: 'rgba(235, 235, 235, 0.78)',
          tabs: [
            { label: '音频', icon: '🔊' },
            { label: '显示', icon: '🖥️' },
            { label: '文字', icon: '📝' },
          ],
        },
        footer: {
          height: 60,
          buttons: [
            { text: '恢复默认', action: 'reset', x: 1030, y: 14 },
          ],
        },
        chrome: {
          backgroundColor: 'rgba(248, 248, 245, 0.94)',
          border: '1px solid rgba(91, 168, 126, 0.14)',
        },
      },
      titleScreen: {
        background: null,
        elements: [
          {
            type: 'text',
            content: 'STORY NOTE',
            x: 640,
            y: 150,
            anchor: 'center',
            fontSize: 46,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(30, 30, 30, 0.88)',
            letterSpacing: 10,
            textShadow: '0 8px 20px rgba(120, 128, 118, 0.10)',
          },
          {
            type: 'button',
            text: '开始',
            action: 'start',
            x: 640,
            y: 356,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(40, 40, 40, 0.90)',
            backgroundColor: 'rgba(91, 168, 126, 0.18)',
            hoverColor: 'rgba(91, 168, 126, 0.30)',
            borderRadius: 10,
            border: '1px solid rgba(91, 168, 126, 0.18)',
          },
          {
            type: 'button',
            text: '设置',
            action: 'settings',
            x: 640,
            y: 426,
            anchor: 'center',
            width: 220,
            height: 52,
            fontSize: 20,
            fontFamily: "'Segoe UI', sans-serif",
            color: 'rgba(40, 40, 40, 0.90)',
            backgroundColor: 'rgba(235, 235, 235, 0.88)',
            hoverColor: 'rgba(91, 168, 126, 0.20)',
            borderRadius: 10,
            border: '1px solid rgba(91, 168, 126, 0.14)',
          },
        ],
      },
    },
  }),
];
