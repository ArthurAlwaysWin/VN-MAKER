/**
 * Centralized help text mapping for the editor.
 * Organized by editor area per D-10.
 * Components import specific sections and pass to HelpTip :text prop.
 * @module editor/helpTexts
 */

// ─── 主题编辑器 (HELP-03) ──────────────────────────────
export const HELP_THEME = {
  paletteGenerator: '选择一个主色，系统自动生成\n与之协调的完整配色方案',
  nineSlice: '为对话框、面板等 UI 元素\n配置九宫格拉伸背景图',
  presets: '选择内置主题预设或\n导入/导出自定义主题包',
  groupCore: '控制界面的主要色调\n影响按钮、标题、强调色等',
  groupBackgrounds: '各 UI 面板的背景色\n对话框、菜单、卡片等',
  groupButtons: '按钮的配色方案\n包含默认状态和悬停状态',
  groupControls: '滑块、滚动条等\n交互控件的配色',
  groupBlur: '面板背景的模糊强度\n值越大毛玻璃效果越明显',
  groupSpeaker: '说话人名牌的阴影效果\n增强文字可读性',
};

// ─── 导出功能 (HELP-04) ────────────────────────────────
export const HELP_EXPORT = {
  formatDifference: '网页版：生成 HTML 文件，浏览器中运行\n桌面版：打包为独立 .exe 应用',
  zipToggle: '启用后将输出目录打包为\n单个 ZIP 压缩文件',
  favicon: '浏览器标签页上显示的小图标\n推荐 .ico 或 .png 格式',
  desktopIcon: '桌面版游戏的应用图标\n需要 PNG 格式，推荐 256×256 以上',
  gameTitle: '导出游戏的标题\n显示在窗口标题栏或标签页上',
  outputDir: '选择导出文件的保存位置\n建议使用空文件夹',
};

// ─── 项目设置 (HELP-05) ────────────────────────────────
export const HELP_SETTINGS = {
  resolution: '游戏画面的分辨率\n推荐 1280×720（16:9）',
  projectName: '项目名称，也是默认的游戏标题',
  dialogueFont: '设置游戏对话框的字体样式\n影响所有对话文字和名牌显示',
  speakerFont: '设置说话人名牌的字体样式\n与对话文字字体可以不同',
};

// ─── 剧本编辑器 (HELP-06) ──────────────────────────────
export const HELP_SCRIPT = {
  transition: '页面切换时的过渡动画效果\n时长可自定义（毫秒）',
  voiceMatch: '根据文件名自动匹配语音\n命名格式：场景名_页码.mp3',
  sceneJump: '场景结束后跳转到\n指定的下一个场景',
  choicePage: '选择页包含多个选项按钮\n每个选项可链接到不同场景',
  addCharacter: '将角色添加到当前页面\n可在画布上拖拽定位',
};

// ─── 资源库 (HELP-07) ──────────────────────────────────
export const HELP_RESOURCE = {
  imageFormats: '支持 PNG、JPG、WebP 格式\n拖拽或点击导入按钮添加',
  audioFormats: '支持 MP3、OGG、WAV 格式\n建议 BGM 使用 MP3 以节省空间',
  fontFormats: '支持 TTF、OTF、WOFF、WOFF2\n导入后可在字体选择器中使用',
  bgRemoval: '点击图片上的背景色取色\n调整容差和羽化值去除纯色背景',
  characterExpr: '每个角色可添加多个表情差分\n在剧本编辑器中按页面切换表情',
};

// ─── 标题页/设置页设计器 (HELP-08) ─────────────────────
export const HELP_DESIGNER = {
  presetButtons: '拖拽预制按钮到画布上\n每种按钮只能放置一个',
  textLabel: '可自由拖拽定位的文字标签\n用于添加标题或装饰文字',
  decorImage: '装饰图片元素\n支持从资源库选择背景图',
  settingComponents: '拖拽设置组件到画布上\n玩家在游戏中可交互调节',
  canvasBackground: '设置页面的背景图片\n从资源库的背景分类中选择',
  deleteElement: '删除画布上选中的元素\n可通过 Ctrl+Z 撤销',
};
