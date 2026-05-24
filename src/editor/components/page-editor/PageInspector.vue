<template>
  <div class="page-inspector" v-if="page">
    <!-- Section 1: Page Properties -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.props = !sections.props">
        {{ sections.props ? '▼' : '▶' }} 📄 页面属性
      </div>
      <div v-if="sections.props" class="section-body">
        <div class="form-group">
          <label>页面类型</label>
          <select :value="page.type || 'normal'" class="field-input" @change="setPageType($event.target.value)">
            <option value="normal">普通对白</option>
            <option value="choice">选择菜单</option>
            <option value="condition">条件分支</option>
          </select>
        </div>

        <div class="form-group">
          <label>背景</label>
          <div class="field-with-clear">
            <input type="text" :value="page.background ? page.background.replace('backgrounds/', '') : ''"
              readonly placeholder="点击选择背景..." class="field-input"
              @click="editor.showBgPicker.value = true" />
            <button v-if="page.background" class="clear-btn" @click.stop="clearBackground" title="清除背景">✕</button>
          </div>
          <div v-if="page.background" class="bg-preview">
            <img :src="`asset://${page.background}`" alt="背景预览" draggable="false" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>过渡 <HelpTip :text="HELP_SCRIPT.transition" /></label>
            <select :value="selectedTransitionType"
              @change="setTransitionType($event.target.value)" class="field-input">
              <option v-for="option in transitionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="form-group half">
            <label>时长(ms)</label>
            <input type="number" :value="page.transition?.duration || 800"
              @change="setTransitionDuration($event.target.value)" class="field-input" />
          </div>
        </div>
        <div class="transition-toolbar transition-preview">
          <button class="preview-btn"
            :disabled="transitionPreviewUiState.isBusy || !!getCurrentPreviewDisabledReason('transition', buildTransitionPreviewPayload())"
            @click="editor.previewTransitionEffect({
              type: selectedTransitionType,
              duration: page.transition?.duration || 800,
            })">
            {{ transitionPreviewUiState.isBusy ? '预览中…' : '▶ 预览转场' }}
          </button>
          <span class="preview-status"
            :class="previewStatusClass(
              transitionPreviewUiState,
              getCurrentPreviewDisabledReason('transition', buildTransitionPreviewPayload()),
            )">
            {{
              previewStatusText(
                transitionPreviewUiState,
                getCurrentPreviewDisabledReason('transition', buildTransitionPreviewPayload()),
              )
            }}
          </span>
          <HelpTip :text="HELP_SCRIPT.cinematicPreview" />
        </div>
        <div class="camera-settings">
          <div class="camera-header">
            <label>页面镜头 <HelpTip :text="HELP_SCRIPT.pageCamera" /></label>
          </div>
          <div class="form-group">
            <label>效果</label>
            <select :value="selectedCameraEffect"
              @change="setCameraEffect($event.target.value)"
              class="field-input">
              <option v-for="option in cameraEffectOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="camera-grid">
            <div class="form-group">
              <label>时长(ms)</label>
              <input type="number"
                :value="selectedCameraDurationMs"
                min="100"
                max="2000"
                @change="setCameraDurationMs($event.target.value)"
                class="field-input" />
            </div>
            <div class="form-group">
              <label>强度</label>
              <select :value="selectedCameraIntensity"
                @change="setCameraIntensity($event.target.value)"
                class="field-input">
                <option v-for="option in cameraIntensityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
          <div v-if="selectedCameraEffect === 'shake' || selectedCameraEffect === 'pan'" class="form-group">
            <label>方向</label>
            <select :value="selectedCameraDirection"
              @change="setCameraDirection($event.target.value)"
              class="field-input">
              <option v-for="option in cameraDirectionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="transition-toolbar camera-preview">
            <button class="preview-btn"
              :disabled="cameraPreviewUiState.isBusy || !!getCurrentPreviewDisabledReason('camera', buildCameraPreviewPayload())"
              @click="editor.previewCameraEffect({
                effect: buildCameraPreviewPayload().effect,
                durationMs: buildCameraPreviewPayload().durationMs,
                intensity: buildCameraPreviewPayload().intensity,
                direction: buildCameraPreviewPayload().direction,
              })">
              {{ cameraPreviewUiState.isBusy ? '预览中…' : '▶ 预览镜头' }}
            </button>
            <span class="preview-status"
              :class="previewStatusClass(
                cameraPreviewUiState,
                getCurrentPreviewDisabledReason('camera', buildCameraPreviewPayload()),
              )">
              {{
                previewStatusText(
                  cameraPreviewUiState,
                  getCurrentPreviewDisabledReason('camera', buildCameraPreviewPayload()),
                )
              }}
            </span>
            <HelpTip :text="HELP_SCRIPT.cinematicPreview" />
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Characters -->
    <div class="inspector-section" v-if="page.type !== 'condition'">
      <div class="section-toggle" @click="sections.chars = !sections.chars">
        {{ sections.chars ? '▼' : '▶' }} 🧑 角色列表 <HelpTip :text="HELP_SCRIPT.addCharacter" />
      </div>
      <div v-if="sections.chars" class="section-body">
        <div v-for="(char, idx) in page.characters" :key="char.id + '-' + idx"
          class="char-row" :class="{ active: editor.selectedCharIndex.value === idx }"
          @click="editor.selectCharacter(idx)">
          <span class="char-name">{{ getCharName(char.id) }}</span>
          <ExpressionDropdown
            :expressions="getCharExpressions(char.id)"
            :modelValue="char.expression"
            @update:modelValue="setCharExpression(idx, $event)"
            @click.stop
          />
          <HelpTip :text="HELP_SCRIPT.charExpression" />
          <button class="delete-x" @click.stop="removeCharacter(idx)" title="移除角色">✕</button>
          <div v-if="editor.selectedCharIndex.value === idx" class="char-detail-stack" @click.stop>
            <div class="char-animation-row">
              <label class="detail-label">角色动画 <HelpTip :text="HELP_SCRIPT.charAnimation" /></label>
              <div class="inline-actions">
                <select :value="char.animation || 'none'"
                  @change="setCharAnimation(idx, $event.target.value)"
                  class="field-input mini-field-input">
                  <option v-for="option in characterAnimationOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <button class="preview-btn character-preview"
                  :disabled="getCharacterPreviewUiState(char, idx).isBusy || !!getCurrentPreviewDisabledReason('character', {
                    characterId: char.id,
                    animation: char.animation,
                  })"
                  @click="editor.previewCharacterEffect({ characterId: char.id, animation: char.animation })">
                  {{ getCharacterPreviewUiState(char, idx).isBusy ? '预览中…' : '▶ 预览' }}
                </button>
              </div>
              <span class="preview-status"
                :class="previewStatusClass(
                  getCharacterPreviewUiState(char, idx),
                  getCurrentPreviewDisabledReason('character', {
                    characterId: char.id,
                    animation: char.animation,
                  }),
                )">
                {{
                  previewStatusText(
                    getCharacterPreviewUiState(char, idx),
                    getCurrentPreviewDisabledReason('character', {
                      characterId: char.id,
                      animation: char.animation,
                    }),
                  )
                }}
              </span>
            </div>
            <div class="char-scale-row">
              <label class="scale-label">缩放</label>
              <input type="range" min="0.2" max="3" step="0.1"
                :value="char.scale || 1"
                @input="setCharScale(idx, parseFloat($event.target.value))"
                class="scale-slider" />
              <span class="scale-val">{{ (char.scale || 1).toFixed(1) }}</span>
            </div>
          </div>
        </div>
        <div v-if="page.characters.length === 0" class="empty-hint">当前页面无角色</div>
        <button class="add-btn" @click="editor.showCharPicker.value = true" title="添加角色到当前页面">+ 添加角色</button>
      </div>
    </div>

    <!-- Section 3: Dialogues (normal pages only) -->
    <div class="inspector-section" v-if="page && page.type === 'normal'">
      <div class="section-toggle" @click="sections.dialogues = !sections.dialogues">
        {{ sections.dialogues ? '▼' : '▶' }} 💬 对话列表
      </div>
      <div v-if="sections.dialogues" class="section-body">
        <div v-for="(dlg, idx) in page.dialogues" :key="idx"
          class="dialogue-row"
          :class="{ active: editor.selectedDialogueIndex.value === idx }"
          draggable="true"
          @click="editor.selectDialogue(idx)"
          @dragstart="onDlgDragStart($event, idx)"
          @dragover.prevent
          @drop="onDlgDrop($event, idx)"
          @dragend="onDlgDragEnd">
          <span class="dlg-index">#{{ idx + 1 }}</span>
          <span v-if="dlg.voice" class="dlg-voice-badge" title="已绑定语音">🔊</span>
          <span class="dlg-speaker-tag" v-if="dlg.speaker">{{ getCharName(dlg.speaker) }}:</span>
          <span class="dlg-preview">"{{ truncate(dlg.text, 15) }}"</span>
          <button class="delete-x" @click.stop="removeDialogue(idx)" title="删除此对话">✕</button>
        </div>
        <button class="add-btn" @click="addDialogue" title="添加新对话">+ 添加对话</button>

        <!-- Detail editor for selected dialogue -->
        <div v-if="selectedDialogue" class="dialogue-editor">
          <div class="editor-divider">── 编辑选中对话 ──</div>
          <div class="form-group">
            <label>说话者</label>
            <div class="speaker-combobox">
              <input type="text" :value="speakerDisplay"
                @input="onSpeakerInput($event.target.value)"
                @focus="showSpeakerDropdown = true"
                @blur="onSpeakerBlur"
                class="field-input" placeholder="无（不设置说话者）" />
              <div v-if="showSpeakerDropdown && pageCharOptions.length > 0" class="speaker-dropdown">
                <div class="speaker-option" @mousedown.prevent="setSpeaker('')">无</div>
                <div v-for="opt in pageCharOptions" :key="opt.id"
                  class="speaker-option" @mousedown.prevent="setSpeaker(opt.id)">
                  {{ opt.name }}
                </div>
              </div>
            </div>
          </div>
          <div class="form-group" v-if="selectedDialogue.speaker && isCharId(selectedDialogue.speaker)">
            <label>表情变化 <HelpTip :text="HELP_SCRIPT.dialogueExpression" /></label>
            <ExpressionDropdown
              :expressions="getCharExpressions(selectedDialogue.speaker)"
              :modelValue="selectedDialogue.expression || ''"
              @update:modelValue="setDialogueExpression($event)"
              nullable
            />
          </div>
          <div class="form-group">
            <label>语音</label>
            <div class="voice-field">
              <input type="text"
                :value="selectedDialogue.voice ? selectedDialogue.voice.replace('audio/', '') : ''"
                readonly placeholder="点击选择语音..."
                class="field-input"
                @click="showVoicePicker = true" />
              <button v-if="selectedDialogue.voice" class="voice-preview-btn"
                @click.stop="toggleVoicePreview"
                :title="isVoicePlaying ? '停止' : '试听'">
                {{ isVoicePlaying ? '⏹' : '▶' }}
              </button>
              <button v-if="selectedDialogue.voice" class="voice-clear-btn"
                @click.stop="clearDialogueVoice" title="清除语音">✕</button>
            </div>
          </div>
          <div class="form-group">
            <label>内容</label>
            <textarea :value="selectedDialogue.text"
              @input="setDialogueText($event.target.value)"
              rows="3" class="field-input field-textarea"
              placeholder="输入对话内容..."></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3b: Choice Options (choice pages only) -->
    <div class="inspector-section" v-if="page && page.type === 'choice'">
      <div class="section-toggle" @click="sections.choices = !sections.choices">
        {{ sections.choices ? '▼' : '▶' }} 🔀 选项编辑 <HelpTip :text="HELP_SCRIPT.choicePage" />
      </div>
      <div v-if="sections.choices" class="section-body">
        <div class="form-group">
          <label>提示文本</label>
          <input type="text" :value="page.prompt || ''"
            @input="setPrompt($event.target.value)"
            class="field-input" placeholder="请做出选择..." />
        </div>

        <div class="options-list">
          <div v-for="(opt, idx) in page.options" :key="idx"
            class="option-card"
            draggable="true"
            @dragstart="onOptDragStart($event, idx)"
            @dragover.prevent="onOptDragOver($event, idx)"
            @drop="onOptDrop($event, idx)"
            @dragend="onOptDragEnd">
            <div class="option-header">
              <span class="option-index">#{{ idx + 1 }}</span>
              <span class="option-drag-handle">⠿</span>
              <button class="delete-x" @click.stop="removeOption(idx)" title="删除选项">✕</button>
            </div>
            <div class="form-group">
              <label>选项文本</label>
              <input type="text" :value="opt.text"
                @input="setOptionText(idx, $event.target.value)"
                class="field-input" placeholder="选项内容..." />
            </div>
            <div class="form-group">
              <label>跳转场景</label>
              <select :value="opt.target || ''"
                @change="setOptionTarget(idx, $event.target.value)"
                class="field-input">
                <option value="">（不跳转 — 继续下一页）</option>
                <option v-for="[sId, s] in allScenes" :key="sId" :value="sId">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="form-group choice-effects">
              <label>选项效果</label>
              <div v-if="!variableOptions.length && !endingOptions.length" class="effect-empty">
                请先在剧情系统中创建变量或结局
              </div>
              <div
                v-for="(effect, effectIdx) in (opt.effects || [])"
                :key="`${idx}-${effectIdx}-${effect.type}-${effect.id}`"
                class="effect-row"
              >
                <template v-if="isVariableEffect(effect)">
                  <div class="effect-type-toggle" title="效果类型">
                    <button
                      type="button"
                      :class="{ active: effect.type === 'var:add' }"
                      title="增加"
                      @click="setChoiceEffectType(idx, effectIdx, 'var:add')"
                    >+</button>
                    <button
                      type="button"
                      :class="{ active: effect.type === 'var:sub' }"
                      title="减少"
                      @click="setChoiceEffectType(idx, effectIdx, 'var:sub')"
                    >-</button>
                    <button
                      type="button"
                      :class="{ active: effect.type === 'var:set' }"
                      title="设置"
                      @click="setChoiceEffectType(idx, effectIdx, 'var:set')"
                    >
                      =
                    </button>
                  </div>
                  <select
                    class="field-input effect-variable"
                    :value="effect.id"
                    @change="setChoiceEffectVariable(idx, effectIdx, $event.target.value)"
                  >
                    <option
                      v-for="variable in variableOptionsForEffect(effect.type)"
                      :key="variable.id"
                      :value="variable.id"
                    >
                      {{ variable.label }}
                    </option>
                  </select>
                  <select
                    v-if="effectValueType(effect) === 'bool'"
                    class="field-input effect-value"
                    :value="effect.value === true ? 'true' : 'false'"
                    @change="setChoiceEffectValue(idx, effectIdx, $event.target.value === 'true')"
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                  <input
                    v-else
                    type="number"
                    class="field-input effect-value"
                    :min="effectNumberBounds(effect).min"
                    :max="effectNumberBounds(effect).max"
                    :step="effectNumberBounds(effect).step"
                    :value="effect.value ?? 1"
                    @change="setChoiceEffectValue(idx, effectIdx, Number($event.target.value || 0))"
                  />
                </template>
                <template v-else-if="isEndingUnlockEffect(effect)">
                  <code class="readonly-effect">结局</code>
                  <select
                    class="field-input effect-variable"
                    :value="effect.id"
                    @change="setEndingUnlockId(idx, effectIdx, $event.target.value)"
                  >
                    <option v-for="ending in endingOptions" :key="ending.id" :value="ending.id">
                      {{ ending.label }}
                    </option>
                  </select>
                  <span class="readonly-effect-id">解锁</span>
                </template>
                <template v-else>
                  <code class="readonly-effect">{{ effect.type }}</code>
                  <span class="readonly-effect-id">{{ effect.id }}</span>
                </template>
                <button class="delete-x" type="button" @click="removeChoiceEffectRow(idx, effectIdx)" title="删除效果">✕</button>
              </div>
              <button
                class="secondary-add-btn"
                type="button"
                :disabled="!variableOptions.length"
                @click="addChoiceEffectRow(idx)"
              >+ 添加变量效果</button>
              <button
                class="secondary-add-btn"
                type="button"
                :disabled="!endingOptions.length"
                @click="addEndingUnlockRow(idx)"
              >+ 添加结局解锁</button>
            </div>
          </div>
        </div>

        <div v-if="!page.options || page.options.length === 0" class="empty-hint">
          暂无选项，点击下方按钮添加
        </div>
        <button class="add-btn" @click="addOption" title="添加新选项">+ 添加选项</button>
      </div>
    </div>

    <!-- Section 3c: Conditions (condition pages only) -->
    <div class="inspector-section" v-if="page && page.type === 'condition'">
      <div class="section-toggle" @click="sections.conditions = !sections.conditions">
        {{ sections.conditions ? '▼' : '▶' }} 条件分支 <HelpTip :text="HELP_SCRIPT.choicePage" />
      </div>
      <div v-if="sections.conditions" class="section-body">
        <div class="form-group">
          <label>匹配方式</label>
          <div class="condition-mode-toggle">
            <button type="button" :class="{ active: page.conditionMode !== 'any' }" @click="setConditionMode('all')">全部</button>
            <button type="button" :class="{ active: page.conditionMode === 'any' }" @click="setConditionMode('any')">任一</button>
          </div>
        </div>

        <div class="condition-rows">
          <div
            v-for="(condition, rowIndex) in (page.conditions || [])"
            :key="`${rowIndex}-${condition.variableId}`"
            class="condition-row"
          >
            <select
              class="field-input condition-variable"
              :value="condition.variableId || ''"
              @change="setConditionVariable(rowIndex, $event.target.value)"
            >
              <option value="">选择变量</option>
              <option v-for="variable in variableOptions" :key="variable.id" :value="variable.id">
                {{ variable.label }}
              </option>
            </select>
            <select
              class="field-input condition-operator"
              :value="condition.operator"
              @change="updateConditionRow(rowIndex, { operator: $event.target.value })"
            >
              <option v-for="operator in conditionOperators(condition)" :key="operator" :value="operator">
                {{ operator }}
              </option>
            </select>
            <select
              v-if="conditionValueType(condition) === 'bool'"
              class="field-input condition-value"
              :value="condition.value === true ? 'true' : 'false'"
              @change="updateConditionRow(rowIndex, { value: $event.target.value === 'true' })"
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
            <input
              v-else
              type="number"
              class="field-input condition-value"
              :min="conditionNumberBounds(condition).min"
              :max="conditionNumberBounds(condition).max"
              :step="conditionNumberBounds(condition).step"
              :value="condition.value ?? 0"
              @change="updateConditionRow(rowIndex, { value: Number($event.target.value || 0) })"
            />
            <button class="delete-x" type="button" @click="removeConditionRow(rowIndex)" title="删除条件">✕</button>
          </div>
        </div>

        <button
          class="secondary-add-btn"
          type="button"
          :disabled="!variableOptions.length || (page.conditions || []).length >= 3"
          @click="addConditionRow"
        >+ 添加条件</button>

        <div class="target-grid">
          <label class="form-group">
            <span>满足时跳转</span>
            <select class="field-input" :value="page.trueTarget || ''" @change="setConditionTarget('trueTarget', $event.target.value)">
              <option value="">继续下一页</option>
              <option v-for="[sId, s] in allScenes" :key="sId" :value="sId">{{ s.name }}</option>
            </select>
          </label>
          <label class="form-group">
            <span>不满足时跳转</span>
            <select class="field-input" :value="page.falseTarget || ''" @change="setConditionTarget('falseTarget', $event.target.value)">
              <option value="">继续下一页</option>
              <option v-for="[sId, s] in allScenes" :key="sId" :value="sId">{{ s.name }}</option>
            </select>
          </label>
        </div>

        <p class="condition-summary">{{ conditionSummary }}</p>
      </div>
    </div>

    <!-- Section 4: Audio -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.audio = !sections.audio">
        {{ sections.audio ? '▼' : '▶' }} 🎵 音频
      </div>
      <div v-if="sections.audio" class="section-body">
        <div class="form-group">
          <label>BGM</label>
          <div class="field-with-clear">
            <input type="text" :value="page.bgm?.file ? page.bgm.file.replace('audio/', '') : ''"
              readonly placeholder="点击选择BGM..." class="field-input"
              @click="openAudioPicker('bgm')" />
            <button v-if="page.bgm?.file" class="clear-btn" @click.stop="clearBgm" title="清除BGM">✕</button>
          </div>
        </div>
        <div class="form-group" v-if="page.bgm">
          <label>音量</label>
          <div class="volume-row">
            <input type="range" min="0" max="1" step="0.1"
              :value="page.bgm.volume || 0.5"
              @input="setBgmVolume(parseFloat($event.target.value))"
              class="volume-slider" />
            <span class="volume-val">{{ (page.bgm?.volume || 0.5).toFixed(1) }}</span>
          </div>
        </div>
        <div class="form-group">
          <label>SE</label>
          <div class="field-with-clear">
            <input type="text" :value="page.se?.file ? page.se.file.replace('audio/', '') : ''"
              readonly placeholder="点击选择音效..." class="field-input"
              @click="openAudioPicker('se')" />
            <button v-if="page.se?.file" class="clear-btn" @click.stop="clearSe" title="清除音效">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 6: Per-page Font Override -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.fonts = !sections.fonts">
        {{ sections.fonts ? '▼' : '▶' }} 🔤 字体
      </div>
      <div v-if="sections.fonts" class="section-body">
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" :checked="useGlobalFont" @change="toggleUseGlobal" />
            使用全局字体设置
          </label>
          <div v-if="useGlobalFont" class="override-hint">当前使用项目全局字体，取消勾选可为本页单独设置</div>
        </div>

        <template v-if="!useGlobalFont">
          <div class="form-group">
            <label>对话字号</label>
            <div class="slider-row">
              <input type="range" min="12" max="36" step="1"
                :value="fontOverride.fontSize || 18"
                @input="setOverrideField('fontSize', parseInt($event.target.value))"
                @change="script.pushState()"
                class="volume-slider" />
              <span class="volume-val">{{ fontOverride.fontSize || 18 }}px</span>
            </div>
          </div>
          <div class="form-group">
            <label>对话字体</label>
            <select class="field-input"
              :value="fontOverride.fontFamily || ''"
              @change="setOverrideField('fontFamily', $event.target.value || null); script.pushState()">
              <option value="">默认</option>
              <optgroup label="系统字体">
                <option v-for="sf in systemFonts" :key="'ov-' + sf.value"
                  :value="sf.value">{{ sf.label }}</option>
              </optgroup>
              <optgroup label="已导入字体" v-if="assets.fontFamilies.length">
                <option v-for="f in assets.fontFamilies" :key="'ov-' + f.value"
                  :value="f.value">{{ f.label }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>文字颜色</label>
            <div class="color-row">
              <input type="color"
                :value="fontOverride.textColor || '#ffffff'"
                @input="setOverrideField('textColor', $event.target.value)"
                @change="script.pushState()" />
              <button v-if="fontOverride.textColor" class="reset-btn" @click="setOverrideField('textColor', null); script.pushState()" title="重置文字颜色">重置</button>
            </div>
          </div>
          <div class="form-group">
            <label>铭牌字号</label>
            <div class="slider-row">
              <input type="range" min="12" max="36" step="1"
                :value="fontOverride.nameplateFontSize || 20"
                @input="setOverrideField('nameplateFontSize', parseInt($event.target.value))"
                @change="script.pushState()"
                class="volume-slider" />
              <span class="volume-val">{{ fontOverride.nameplateFontSize || 20 }}px</span>
            </div>
          </div>
          <div class="form-group">
            <label>铭牌字体</label>
            <select class="field-input"
              :value="fontOverride.nameplateFontFamily || ''"
              @change="setOverrideField('nameplateFontFamily', $event.target.value || null); script.pushState()">
              <option value="">默认</option>
              <optgroup label="系统字体">
                <option v-for="sf in systemFonts" :key="'ovnp-' + sf.value"
                  :value="sf.value">{{ sf.label }}</option>
              </optgroup>
              <optgroup label="已导入字体" v-if="assets.fontFamilies.length">
                <option v-for="f in assets.fontFamilies" :key="'ovnp-' + f.value"
                  :value="f.value">{{ f.label }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>铭牌颜色</label>
            <div class="color-row">
              <input type="color"
                :value="fontOverride.nameplateColor || '#ffffff'"
                @input="setOverrideField('nameplateColor', $event.target.value)"
                @change="script.pushState()" />
              <button v-if="fontOverride.nameplateColor" class="reset-btn" @click="setOverrideField('nameplateColor', null); script.pushState()" title="重置铭牌颜色">重置</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
  <div class="page-inspector empty" v-else>
    <div class="empty-hint">选择一个页面以编辑属性</div>
  </div>

  <AudioPicker
    :visible="showVoicePicker"
    mode="voice"
    @select="onVoiceSelect"
    @close="showVoicePicker = false"
  />
</template>

<script setup>
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { useAssetStore } from '../../stores/assets.js';
import AudioPicker from './AudioPicker.vue';
import HelpTip from '../HelpTip.vue';
import ExpressionDropdown from './ExpressionDropdown.vue';
import { HELP_SCRIPT } from '../../helpTexts.js';
import {
  CONDITION_OPERATORS,
  formatConditionSummary,
  normalizeConditionPage,
} from '../../../shared/branchingContract.js';
import {
  CAMERA_INTENSITY_UI_OPTIONS,
  getCameraDirectionUiOptions,
  getCameraEffectUiOptions,
  getCharacterAnimationUiOptions,
  getTransitionUiOptions,
} from '../../../shared/cinematicContract.js';

const editor = usePageEditor();
const script = useScriptStore();
const assets = useAssetStore();

const sections = reactive({ props: true, chars: true, dialogues: true, audio: true, choices: true, conditions: true, fonts: false });
const dlgDragState = reactive({ fromIndex: -1 });
const optDragState = reactive({ fromIndex: -1 });
const showSpeakerDropdown = ref(false);
const showVoicePicker = ref(false);
const isVoicePlaying = ref(false);
let previewAudio = null;

const page = computed(() => editor.currentPage.value);
const selectedDialogue = computed(() => editor.currentDialogue.value);
const characterEntries = computed(() => Object.entries(script.data?.characters || {}));
const allScenes = computed(() => Object.entries(script.data?.scenes || {}));
const variableOptions = computed(() => Object.entries(script.data?.systems?.variables || {}).map(([id, variable]) => ({
  id,
  label: variable.label || variable.name || id,
  type: variable.type || 'number',
  min: variable.min,
  max: variable.max,
  step: variable.step,
})));
const endingOptions = computed(() => Object.entries(script.data?.systems?.endings || {}).map(([id, ending]) => ({
  id,
  label: ending.title || ending.name || id,
  order: Number(ending.order ?? 0),
})).sort((left, right) => {
  const orderDelta = left.order - right.order;
  if (orderDelta !== 0) return orderDelta;
  return left.label.localeCompare(right.label);
}));
const numberVariableOptions = computed(() => variableOptions.value.filter((variable) => variable.type !== 'bool'));
const characterAnimationOptions = computed(() => {
  const idx = editor.selectedCharIndex.value;
  const currentAnimation = idx >= 0 ? page.value?.characters?.[idx]?.animation : undefined;
  return getCharacterAnimationUiOptions(currentAnimation);
});
const cameraEffectOptions = computed(() => getCameraEffectUiOptions(page.value?.camera?.effect));
const cameraIntensityOptions = CAMERA_INTENSITY_UI_OPTIONS;
const selectedCameraEffect = computed(() => page.value?.camera?.effect || '');
const selectedCameraDurationMs = computed(() => page.value?.camera?.durationMs || 800);
const selectedCameraIntensity = computed(() => page.value?.camera?.intensity || 'medium');
const selectedCameraDirection = computed(() => page.value?.camera?.direction || '');
const cameraDirectionOptions = computed(() => (
  getCameraDirectionUiOptions(selectedCameraEffect.value, selectedCameraDirection.value)
));
const transitionOptions = computed(() => getTransitionUiOptions(page.value?.transition?.type));
const selectedTransitionType = computed(() => page.value?.transition?.type || 'fade');
const cameraPreviewUiState = computed(() => editor.getEffectPreviewUiState('camera'));
const transitionPreviewUiState = computed(() => editor.getEffectPreviewUiState('transition'));

// Page-scoped character list for speaker combobox
const pageCharOptions = computed(() => {
  if (!page.value?.characters) return [];
  const chars = script.data?.characters || {};
  return page.value.characters
    .filter(c => chars[c.id])
    .map(c => ({ id: c.id, name: chars[c.id].name || c.id }));
});

// Display text for current speaker
const speakerDisplay = computed(() => {
  const dlg = selectedDialogue.value;
  if (!dlg?.speaker) return '';
  const char = script.data?.characters?.[dlg.speaker];
  return char ? char.name : dlg.speaker;
});

const conditionSummary = computed(() => {
  if (!page.value || page.value.type !== 'condition') {
    return '';
  }

  const sceneLabels = Object.fromEntries(allScenes.value.map(([sceneId, scene]) => [sceneId, scene.name || sceneId]));
  return formatConditionSummary(page.value, {
    registry: script.data?.systems?.variables ?? {},
    sceneLabels,
  });
});

// ─── Per-page font override ──────────────────────────────
const systemFonts = [
  { label: 'Noto Sans SC', value: "'Noto Sans SC', sans-serif" },
  { label: 'Noto Serif SC', value: "'Noto Serif SC', serif" },
  { label: '无衬线体', value: 'sans-serif' },
  { label: '衬线体', value: 'serif' },
  { label: '等宽字体', value: 'monospace' },
];

const fontOverride = computed(() => page.value?.fontOverride || {});

const useGlobalFont = computed(() => {
  const fo = page.value?.fontOverride;
  return !fo || fo.useGlobal !== false;
});

function toggleUseGlobal() {
  if (!page.value) return;
  if (useGlobalFont.value) {
    // Switch to per-page override
    page.value.fontOverride = { useGlobal: false };
  } else {
    // Revert to global
    page.value.fontOverride = { useGlobal: true };
  }
  script.pushState();
}

function setOverrideField(field, value) {
  if (!page.value) return;
  if (!page.value.fontOverride) page.value.fontOverride = { useGlobal: false };
  page.value.fontOverride[field] = value;
  // pushState called by @change handler for undo/redo commit
}

function isCharId(id) {
  return !!(script.data?.characters?.[id]);
}

function getCharName(charId) {
  return script.data?.characters?.[charId]?.name || charId || '';
}

function getCharExpressions(charId) {
  return script.data?.characters?.[charId]?.expressions || {};
}

function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function openAudioPicker(tab) {
  editor.audioPickerTab.value = tab;
  editor.showAudioPicker.value = true;
}

function clearBackground() {
  if (!page.value) return;
  page.value.background = '';
  script.pushState();
}

function setPageType(type) {
  if (!editor.selectedSceneId.value || !Number.isInteger(editor.selectedPageIndex.value)) return;
  script.setPageType(editor.selectedSceneId.value, editor.selectedPageIndex.value, type);
}

function clearBgm() {
  if (!page.value) return;
  page.value.bgm = null;
  script.pushState();
}

function clearSe() {
  if (!page.value) return;
  page.value.se = null;
  script.pushState();
}

function getCurrentPreviewDisabledReason(effectKind, payload = {}) {
  if (!editor.previewIframeRef.value?.contentWindow || !editor.isEngineReady.value) {
    return 'engine-not-ready';
  }
  if (!page.value || !editor.selectedSceneId.value) {
    return 'no-page-selected';
  }
  if (effectKind === 'character' && !payload.animation) {
    return 'missing-character-animation';
  }
  if (effectKind === 'camera' && !payload.effect) {
    return 'missing-camera-config';
  }
  if (effectKind === 'transition' && !payload.type) {
    return 'missing-transition-config';
  }
  return null;
}

function getCharacterPreviewUiState(char, idx) {
  return editor.getEffectPreviewUiState('character', {
    charIndex: idx,
    characterId: char?.id ?? null,
  });
}

function previewReasonText(reason) {
  switch (reason) {
    case 'engine-not-ready':
      return '预览运行时尚未就绪';
    case 'no-page-selected':
      return '请先选择一个页面';
    case 'missing-character-animation':
      return '请选择角色动画后再预览';
    case 'missing-camera-config':
      return '请选择镜头效果后再预览';
    case 'missing-transition-config':
      return '请选择转场后再预览';
    case 'preview-busy':
      return '已有其他效果预览正在进行';
    case 'unsupported-effect':
      return '当前值暂不支持运行时预览';
    case 'runtime-error':
      return '运行时预览失败';
    case 'restore-failed':
      return '预览结束，但恢复编辑状态失败';
    default:
      return reason ? `预览异常：${reason}` : '';
  }
}

function previewStatusText(uiState, fallbackReason = null) {
  if (uiState?.isBusy) {
    return '预览中…';
  }
  if (fallbackReason) {
    return previewReasonText(fallbackReason);
  }
  if (uiState?.isDisabled && uiState.disabledReason) {
    return previewReasonText(uiState.disabledReason);
  }

  switch (uiState?.result?.status) {
    case 'completed':
      return '预览完成';
    case 'cancelled':
      return '预览已取消';
    case 'rejected':
      return previewReasonText(uiState.result.reason) || '预览请求已拒绝';
    case 'failed':
      return previewReasonText(uiState.result.reason) || '预览失败';
    default:
      return '';
  }
}

function previewStatusClass(uiState, fallbackReason = null) {
  if (uiState?.isBusy) {
    return 'is-busy';
  }
  if (fallbackReason || uiState?.isDisabled) {
    return 'is-warning';
  }
  if (uiState?.result?.status === 'failed' || uiState?.result?.status === 'rejected') {
    return 'is-error';
  }
  if (uiState?.result?.status === 'completed' || uiState?.result?.status === 'cancelled') {
    return 'is-success';
  }
  return '';
}

function buildTransitionPreviewPayload() {
  return {
    type: selectedTransitionType.value,
    duration: page.value?.transition?.duration || 800,
  };
}

function ensurePageCameraState() {
  if (!page.value) return null;
  page.value.camera ??= { effect: '', durationMs: 800, intensity: 'medium', trigger: 'onEnter' };
  page.value.camera.durationMs = page.value.camera.durationMs || 800;
  page.value.camera.intensity = page.value.camera.intensity || 'medium';
  page.value.camera.trigger = 'onEnter';
  return page.value.camera;
}

function buildCameraPreviewPayload() {
  const camera = page.value?.camera;
  const payload = {
    effect: camera?.effect || '',
    durationMs: camera?.durationMs || 800,
    intensity: camera?.intensity || 'medium',
  };
  if (payload.effect === 'shake' || payload.effect === 'pan') {
    payload.direction = camera?.direction || (payload.effect === 'shake' ? 'both' : 'left');
  }
  return payload;
}

// Page property setters
function setTransitionType(type) {
  if (!page.value) return;
  page.value.transition ??= {};
  page.value.transition.type = type;
  script.pushState();
}

function setTransitionDuration(val) {
  if (!page.value) return;
  page.value.transition ??= {};
  page.value.transition.duration = parseInt(val) || 800;
  script.pushState();
}

function setCameraEffect(value) {
  if (!page.value) return;
  if (!value) {
    page.value.camera = null;
    script.pushState();
    return;
  }

  const camera = ensurePageCameraState();
  if (!camera) return;
  camera.effect = value;
  if (value === 'shake' && !camera.direction) {
    camera.direction = 'both';
  }
  if (value === 'pan' && !camera.direction) {
    camera.direction = 'left';
  }
  if (value !== 'shake' && value !== 'pan') {
    delete camera.direction;
  }
  script.pushState();
}

function setCameraDurationMs(val) {
  const camera = ensurePageCameraState();
  if (!camera) return;
  camera.durationMs = Math.min(2000, Math.max(100, parseInt(val, 10) || 800));
  script.pushState();
}

function setCameraIntensity(value) {
  const camera = ensurePageCameraState();
  if (!camera) return;
  camera.intensity = value || 'medium';
  script.pushState();
}

function setCameraDirection(value) {
  const camera = ensurePageCameraState();
  if (!camera) return;
  camera.direction = value || null;
  script.pushState();
}

// Character management
function setCharAnimation(idx, animation) {
  if (!page.value?.characters?.[idx]) return;
  page.value.characters[idx].animation = animation;
  script.pushState();
}

function setCharExpression(idx, expr) {
  if (!page.value?.characters?.[idx]) return;
  page.value.characters[idx].expression = expr;
  script.pushState();
}

function removeCharacter(idx) {
  if (!page.value) return;
  page.value.characters.splice(idx, 1);
  script.pushState();
  if (editor.selectedCharIndex.value === idx) {
    editor.selectCharacter(-1);
  }
}

function setCharScale(idx, val) {
  if (!page.value?.characters?.[idx]) return;
  page.value.characters[idx].scale = val;
  // Continuous slider — do NOT call pushState
}

// Dialogue management
function addDialogue() {
  if (!page.value) return;
  page.value.dialogues.push({ speaker: null, text: '', expression: null, voice: null });
  script.pushState();
  editor.selectDialogue(page.value.dialogues.length - 1);
}

function removeDialogue(idx) {
  if (!page.value || page.value.dialogues.length <= 1) return;
  page.value.dialogues.splice(idx, 1);
  script.pushState();
  if (editor.selectedDialogueIndex.value >= page.value.dialogues.length) {
    editor.selectDialogue(page.value.dialogues.length - 1);
  }
}

function setSpeaker(val) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.speaker = val || null;
  showSpeakerDropdown.value = false;
  script.pushState();
}

function onSpeakerInput(text) {
  if (!selectedDialogue.value) return;
  // Free text input — store as custom speaker name directly
  selectedDialogue.value.speaker = text || null;
  // Continuous typing — do NOT call pushState
}

function onSpeakerBlur() {
  // Delay to allow mousedown on dropdown options to fire first
  setTimeout(() => { showSpeakerDropdown.value = false; }, 150);
}

function setDialogueExpression(expr) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.expression = expr || null;
  script.pushState();
}

function setDialogueText(text) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.text = text;
  // Continuous typing — do NOT call pushState (Pitfall 4)
}

// ─── Voice management ──────────────────────────────────
function setDialogueVoice(path) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.voice = path || null;
  script.pushState();
}

function clearDialogueVoice() {
  if (!selectedDialogue.value) return;
  stopVoicePreview();
  selectedDialogue.value.voice = null;
  script.pushState();
}

function onVoiceSelect(path) {
  setDialogueVoice(path);
  showVoicePicker.value = false;
}

function toggleVoicePreview() {
  if (isVoicePlaying.value) {
    stopVoicePreview();
    return;
  }
  const voice = selectedDialogue.value?.voice;
  if (!voice) return;
  stopVoicePreview();
  previewAudio = new Audio(`asset://${voice}`);
  previewAudio.play().catch(() => {});
  isVoicePlaying.value = true;
  previewAudio.addEventListener('ended', () => {
    isVoicePlaying.value = false;
  });
}

function stopVoicePreview() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.removeAttribute('src');
    previewAudio.load();
    previewAudio = null;
  }
  isVoicePlaying.value = false;
}

watch(() => editor.selectedDialogueIndex.value, () => stopVoicePreview());
watch(() => editor.selectedPageIndex.value, () => stopVoicePreview());
onBeforeUnmount(() => stopVoicePreview());

// Dialogue drag-reorder
function onDlgDragStart(e, idx) {
  dlgDragState.fromIndex = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(idx));
}

function onDlgDrop(e, toIndex) {
  e.preventDefault();
  const fromIndex = dlgDragState.fromIndex;
  if (fromIndex === toIndex || fromIndex < 0) return;
  if (!page.value) return;
  const [moved] = page.value.dialogues.splice(fromIndex, 1);
  const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex;
  page.value.dialogues.splice(adjusted, 0, moved);
  script.pushState();
  editor.selectDialogue(adjusted);
  dlgDragState.fromIndex = -1;
}

function onDlgDragEnd() {
  dlgDragState.fromIndex = -1;
}

// Audio
function setBgmVolume(vol) {
  if (!page.value?.bgm) return;
  page.value.bgm.volume = vol;
  // Continuous slider — do NOT call pushState (Pitfall 4)
}

// ─── Choice option helpers ──────────────────────────────

function setPrompt(text) {
  if (!page.value || page.value.type !== 'choice') return;
  page.value.prompt = text;
  // Continuous typing — do NOT call pushState
}

function addOption() {
  if (!page.value || page.value.type !== 'choice') return;
  if (!page.value.options) page.value.options = [];
  page.value.options.push({ text: '', target: null, effects: [] });
  script.pushState();
}

function removeOption(idx) {
  if (!page.value?.options) return;
  page.value.options.splice(idx, 1);
  script.pushState();
}

function setOptionText(idx, text) {
  if (!page.value?.options?.[idx]) return;
  page.value.options[idx].text = text;
  // Continuous typing — do NOT call pushState
}

function setOptionTarget(idx, target) {
  if (!page.value?.options?.[idx]) return;
  page.value.options[idx].target = target || null;
  script.pushState();
}

function isVariableEffect(effect) {
  return effect?.type === 'var:set' || effect?.type === 'var:add' || effect?.type === 'var:sub';
}

function isEndingUnlockEffect(effect) {
  return effect?.type === 'unlock:ending';
}

function variableEntry(variableId) {
  return script.data?.systems?.variables?.[variableId] ?? null;
}

function variableOptionsForEffect(effectType) {
  if (effectType === 'var:add' || effectType === 'var:sub') {
    return numberVariableOptions.value.length ? numberVariableOptions.value : variableOptions.value;
  }
  return variableOptions.value;
}

function defaultVariableIdForEffect(effectType) {
  return variableOptionsForEffect(effectType)[0]?.id ?? '';
}

function effectValueType(effect) {
  return variableEntry(effect?.id)?.type === 'bool' && effect?.type === 'var:set' ? 'bool' : 'number';
}

function effectNumberBounds(effect) {
  const entry = variableEntry(effect?.id) ?? {};
  return {
    min: entry.min ?? undefined,
    max: entry.max ?? undefined,
    step: entry.step ?? 1,
  };
}

function normalizeEffectValue(effectType, variableId, value) {
  const entry = variableEntry(variableId);
  if (effectType === 'var:set' && entry?.type === 'bool') {
    return value === true;
  }
  return Number(value ?? (effectType === 'var:set' ? 0 : 1)) || 0;
}

function ensureOptionEffects(option) {
  option.effects ??= [];
  return option.effects;
}

function addChoiceEffectRow(optionIndex) {
  const option = page.value?.options?.[optionIndex];
  if (!option || !variableOptions.value.length) return;
  const type = 'var:add';
  const id = defaultVariableIdForEffect(type);
  if (!id) return;
  ensureOptionEffects(option).push({ type, id, value: 1 });
  script.pushState();
}

function addEndingUnlockRow(optionIndex) {
  const option = page.value?.options?.[optionIndex];
  const endingId = endingOptions.value[0]?.id;
  if (!option || !endingId) return;
  ensureOptionEffects(option).push({ type: 'unlock:ending', id: endingId });
  script.pushState();
}

function removeChoiceEffectRow(optionIndex, effectIndex) {
  const option = page.value?.options?.[optionIndex];
  if (!option?.effects?.[effectIndex]) return;
  option.effects.splice(effectIndex, 1);
  if (option.effects.length === 0) {
    delete option.effects;
  }
  script.pushState();
}

function setEndingUnlockId(optionIndex, effectIndex, endingId) {
  const effect = page.value?.options?.[optionIndex]?.effects?.[effectIndex];
  if (!effect || !isEndingUnlockEffect(effect)) return;
  effect.id = endingId;
  script.pushState();
}

function patchChoiceEffect(optionIndex, effectIndex, patch) {
  const effect = page.value?.options?.[optionIndex]?.effects?.[effectIndex];
  if (!effect || !isVariableEffect(effect)) return;
  Object.assign(effect, patch);
  effect.value = normalizeEffectValue(effect.type, effect.id, effect.value);
  script.pushState();
}

function setChoiceEffectType(optionIndex, effectIndex, type) {
  const effect = page.value?.options?.[optionIndex]?.effects?.[effectIndex];
  if (!effect || !isVariableEffect(effect)) return;
  let id = effect.id;
  if (!variableOptionsForEffect(type).some((variable) => variable.id === id)) {
    id = defaultVariableIdForEffect(type);
  }
  patchChoiceEffect(optionIndex, effectIndex, {
    type,
    id,
    value: normalizeEffectValue(type, id, effect.value),
  });
}

function setChoiceEffectVariable(optionIndex, effectIndex, variableId) {
  const effect = page.value?.options?.[optionIndex]?.effects?.[effectIndex];
  if (!effect || !isVariableEffect(effect)) return;
  patchChoiceEffect(optionIndex, effectIndex, {
    id: variableId,
    value: normalizeEffectValue(effect.type, variableId, effect.value),
  });
}

function setChoiceEffectValue(optionIndex, effectIndex, value) {
  const effect = page.value?.options?.[optionIndex]?.effects?.[effectIndex];
  if (!effect || !isVariableEffect(effect)) return;
  patchChoiceEffect(optionIndex, effectIndex, {
    value: normalizeEffectValue(effect.type, effect.id, value),
  });
}

function conditionValueType(condition) {
  return variableEntry(condition?.variableId)?.type === 'bool' ? 'bool' : 'number';
}

function conditionOperators(condition) {
  return conditionValueType(condition) === 'bool' ? ['==', '!='] : CONDITION_OPERATORS;
}

function conditionNumberBounds(condition) {
  const entry = variableEntry(condition?.variableId) ?? {};
  return {
    min: entry.min ?? undefined,
    max: entry.max ?? undefined,
    step: entry.step ?? 1,
  };
}

function commitConditionPage(nextPage) {
  const normalized = normalizeConditionPage(nextPage, {
    registry: script.data?.systems?.variables ?? {},
  });
  page.value.conditionMode = normalized.conditionMode;
  page.value.conditions = normalized.conditions;
  page.value.trueTarget = normalized.trueTarget;
  page.value.falseTarget = normalized.falseTarget;
  delete page.value.variable;
  delete page.value.operator;
  delete page.value.value;
  delete page.value.target;
  delete page.value.unresolvedCondition;
  script.pushState();
}

function setConditionMode(mode) {
  if (!page.value || page.value.type !== 'condition') return;
  commitConditionPage({ ...page.value, conditionMode: mode });
}

function addConditionRow() {
  if (!page.value || page.value.type !== 'condition' || !variableOptions.value.length) return;
  const conditions = [...(page.value.conditions ?? [])];
  if (conditions.length >= 3) return;
  const variable = variableOptions.value[0];
  conditions.push({
    variableId: variable.id,
    operator: variable.type === 'bool' ? '==' : '>=',
    value: variable.type === 'bool' ? true : 0,
  });
  commitConditionPage({ ...page.value, conditions });
}

function removeConditionRow(rowIndex) {
  if (!page.value?.conditions?.[rowIndex]) return;
  const conditions = [...page.value.conditions];
  conditions.splice(rowIndex, 1);
  commitConditionPage({ ...page.value, conditions });
}

function updateConditionRow(rowIndex, patch) {
  if (!page.value?.conditions?.[rowIndex]) return;
  const conditions = page.value.conditions.map((condition, index) => (
    index === rowIndex ? { ...condition, ...patch } : condition
  ));
  commitConditionPage({ ...page.value, conditions });
}

function setConditionVariable(rowIndex, variableId) {
  const entry = variableEntry(variableId);
  updateConditionRow(rowIndex, {
    variableId,
    operator: entry?.type === 'bool' ? '==' : '>=',
    value: entry?.type === 'bool' ? true : 0,
  });
}

function setConditionTarget(field, target) {
  if (!page.value || page.value.type !== 'condition') return;
  commitConditionPage({
    ...page.value,
    [field]: target || null,
  });
}

// Option drag reorder
function onOptDragStart(e, idx) {
  optDragState.fromIndex = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(idx));
}

function onOptDragOver(e, toIndex) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onOptDrop(e, toIndex) {
  e.preventDefault();
  const fromIndex = optDragState.fromIndex;
  if (fromIndex === toIndex || fromIndex < 0) return;
  if (!page.value?.options) return;
  const [moved] = page.value.options.splice(fromIndex, 1);
  const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex;
  page.value.options.splice(adjusted, 0, moved);
  script.pushState();
  optDragState.fromIndex = -1;
}

function onOptDragEnd() {
  optDragState.fromIndex = -1;
}
</script>

<style scoped>
.page-inspector {
  height: 100%;
  overflow-y: auto;
}

.page-inspector.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.inspector-section {
  border-bottom: 1px solid #333;
}

.section-toggle {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  background: #2d2d2d;
  user-select: none;
}

.section-toggle:hover {
  background: #333;
}

.section-body {
  padding: 8px 12px;
}

.form-group {
  margin-bottom: 8px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-group.half {
  flex: 1;
}

.field-input {
  width: 100%;
  background: #3c3c3c;
  border: 1px solid #555;
  color: #ccc;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #007acc;
  outline: none;
}

.field-input[readonly] {
  cursor: pointer;
  color: #888;
}

.mini-field-input {
  flex: 1;
}

.field-textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.4;
}

.char-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 3px;
  flex-wrap: wrap;
}

.char-row.active {
  background: #37373d;
}

.char-row:hover {
  background: #2a2d2e;
}

.char-name {
  font-size: 13px;
  color: #ccc;
  flex: 1;
}

.mini-select {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #ccc;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
}

.dialogue-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  cursor: pointer;
  border-left: 3px solid transparent;
  font-size: 13px;
}

.dialogue-row.active {
  background: #37373d;
  border-left-color: #007acc;
}

.dialogue-row:hover {
  background: #2a2d2e;
}

.dlg-index {
  color: #666;
  font-size: 11px;
  min-width: 20px;
}

.dlg-speaker-tag {
  color: #aaa;
  font-size: 12px;
  white-space: nowrap;
}

.dlg-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #888;
  font-size: 12px;
}

.delete-x {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.delete-x:hover {
  color: #a22;
}

.add-btn {
  background: transparent;
  border: none;
  color: #007acc;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 0;
  display: block;
}

.add-btn:hover {
  text-decoration: underline;
}

.dialogue-editor {
  margin-top: 12px;
}

.editor-divider {
  text-align: center;
  color: #555;
  font-size: 11px;
  margin-bottom: 8px;
  border-top: 1px solid #333;
  padding-top: 8px;
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  flex: 1;
}

.volume-val {
  color: #aaa;
  font-size: 12px;
  min-width: 24px;
}

.transition-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.camera-settings {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #333;
}

.camera-header {
  margin-bottom: 8px;
}

.camera-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.preview-btn {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}

.preview-btn:hover:not(:disabled) {
  border-color: #007acc;
  color: #fff;
  background: #094771;
}

.preview-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-status {
  min-height: 18px;
  color: #777;
  font-size: 11px;
  line-height: 1.4;
}

.preview-status.is-busy {
  color: #4ec9b0;
}

.preview-status.is-warning {
  color: #d7ba7d;
}

.preview-status.is-error {
  color: #f48771;
}

.preview-status.is-success {
  color: #89d185;
}

.field-with-clear {
  position: relative;
}

.field-with-clear .field-input {
  padding-right: 28px;
}

.clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
}

.clear-btn:hover {
  color: #a22;
}

.bg-preview {
  margin-top: 4px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1a1a;
}

.bg-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-hint {
  color: #555;
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

/* ─── Choice Options ─── */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.option-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: grab;
}

.option-card:active {
  cursor: grabbing;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.option-index {
  color: #007acc;
  font-size: 12px;
  font-weight: 600;
}

.option-drag-handle {
  color: #666;
  font-size: 14px;
  cursor: grab;
  flex: 1;
}

.choice-effects {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-row,
.condition-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(72px, 92px) 24px;
  gap: 6px;
  align-items: center;
}

.condition-row {
  grid-template-columns: minmax(0, 1fr) 64px minmax(72px, 92px) 24px;
}

.effect-type-toggle,
.condition-mode-toggle {
  display: inline-flex;
  border: 1px solid #555;
  border-radius: 4px;
  overflow: hidden;
  background: #333;
}

.effect-type-toggle button,
.condition-mode-toggle button {
  min-width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-right: 1px solid #555;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
}

.condition-mode-toggle button {
  min-width: 56px;
}

.effect-type-toggle button:last-child,
.condition-mode-toggle button:last-child {
  border-right: none;
}

.effect-type-toggle button.active,
.condition-mode-toggle button.active {
  background: #094771;
  color: #fff;
}

.effect-variable,
.condition-variable {
  min-width: 0;
}

.effect-value,
.condition-value {
  min-width: 0;
}

.effect-empty,
.condition-summary {
  color: #777;
  font-size: 12px;
  line-height: 1.5;
}

.secondary-add-btn {
  align-self: flex-start;
  background: transparent;
  border: 1px dashed #555;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 6px 10px;
}

.secondary-add-btn:hover:not(:disabled) {
  border-color: #007acc;
  color: #fff;
}

.secondary-add-btn:disabled {
  color: #666;
  cursor: not-allowed;
}

.readonly-effect,
.readonly-effect-id {
  color: #aaa;
  font-size: 12px;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.condition-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.option-variable .variable-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.var-key {
  flex: 2;
}

.var-eq {
  color: #888;
  font-size: 13px;
  flex-shrink: 0;
}

.var-value {
  flex: 1;
}

/* ─── Speaker Combobox ─── */
.speaker-combobox {
  position: relative;
}

.speaker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: #2d2d2d;
  border: 1px solid #555;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 160px;
  overflow-y: auto;
  z-index: 10;
}

.speaker-option {
  padding: 6px 8px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
}

.speaker-option:hover {
  background: #094771;
  color: #fff;
}

/* ─── Character Scale ─── */
.char-detail-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
}

.char-animation-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 11px;
}

.inline-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.char-scale-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 0 0;
}

.scale-label {
  color: #888;
  font-size: 11px;
  flex-shrink: 0;
}

.scale-slider {
  flex: 1;
  height: 4px;
}

.scale-val {
  color: #aaa;
  font-size: 11px;
  min-width: 24px;
  text-align: right;
}

/* ─── Voice Field ─── */
.dlg-voice-badge {
  font-size: 11px;
  margin-right: 2px;
  opacity: 0.7;
}

.voice-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.voice-field .field-input {
  flex: 1;
  cursor: pointer;
}

.voice-preview-btn,
.voice-clear-btn {
  background: none;
  border: 1px solid #555;
  border-radius: 3px;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 6px;
  line-height: 1;
}

.voice-preview-btn:hover {
  background: #007acc;
  border-color: #007acc;
  color: #fff;
}

.voice-clear-btn:hover {
  background: #a22;
  border-color: #a22;
  color: #fff;
}

/* ─── Font Override ─── */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #007acc;
}

.override-hint {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-row input[type="color"] {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid #555;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.reset-btn {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
}

.reset-btn:hover {
  background: #444;
  color: #ccc;
}
</style>
