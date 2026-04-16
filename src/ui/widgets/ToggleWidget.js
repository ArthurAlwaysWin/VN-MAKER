/**
 * ToggleWidget — creates toggle controls from widgetStyles.toggle config.
 * Supports 4 style variants: pill, radio, checkbox, button-pair.
 * Each style produces completely different DOM structure.
 */

import { sanitizeCssValue } from '../sanitize.js';

// ─── Public API ──────────────────────────────────────────

/**
 * Create a toggle control with the specified style variant.
 *
 * @param {string} id — unique identifier (used for radio name attribute)
 * @param {object} config — merged widgetStyles.toggle config
 * @param {string} [config.style='pill'] — pill|radio|checkbox|button-pair
 * @param {string} [config.onColor] — color when ON
 * @param {string} [config.offColor] — color when OFF
 * @param {string} [config.thumbColor] — thumb color (pill style)
 * @param {string} [config.onLabel='ON'] — label for ON state
 * @param {string} [config.offLabel='OFF'] — label for OFF state
 * @param {number} [config.fontSize] — font size in px
 * @param {number} [config.width] — container width (pill style)
 * @param {number} [config.height] — container height (pill style)
 * @param {boolean} value — initial state (true = ON)
 * @param {(newValue: boolean) => void} onChange — callback on state change
 * @returns {{ el: HTMLElement, setValue: (bool: boolean) => void }}
 */
export function createToggle(id, config, value, onChange) {
  const style = config.style || 'pill';

  switch (style) {
    case 'radio':
      return _createRadio(id, config, value, onChange);
    case 'checkbox':
      return _createCheckbox(id, config, value, onChange);
    case 'button-pair':
      return _createButtonPair(id, config, value, onChange);
    case 'pill':
    default:
      return _createPill(id, config, value, onChange);
  }
}

// ─── Pill Style ──────────────────────────────────────────

/**
 * Pill (capsule) sliding toggle — the most common toggle style.
 * @private
 */
function _createPill(id, config, value, onChange) {
  const width = config.width || 56;
  const height = config.height || 28;
  const fontSize = config.fontSize || 12;
  const onColor = sanitizeCssValue(config.onColor) || 'rgba(180,160,255,0.8)';
  const offColor = sanitizeCssValue(config.offColor) || 'rgba(255,255,255,0.15)';
  const thumbColor = sanitizeCssValue(config.thumbColor) || '#fff';
  const onLabel = config.onLabel ?? 'ON';
  const offLabel = config.offLabel ?? 'OFF';

  let currentValue = !!value;

  // Container
  const el = document.createElement('div');
  el.className = 'gm-toggle gm-toggle-pill';
  el.setAttribute('data-on', String(currentValue));
  Object.assign(el.style, {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${height / 2}px`,
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    background: currentValue ? onColor : offColor,
    fontSize: `${fontSize}px`,
    transition: 'background 0.15s ease',
  });

  // Thumb
  const thumbSize = height - 4;
  const thumb = document.createElement('div');
  thumb.className = 'gm-toggle-thumb';
  Object.assign(thumb.style, {
    width: `${thumbSize}px`,
    height: `${thumbSize}px`,
    borderRadius: '50%',
    background: thumbColor,
    position: 'absolute',
    top: '2px',
    left: currentValue ? `${width - height + 2}px` : '2px',
    transition: 'left 0.15s ease',
  });

  // ON label
  const labelOn = document.createElement('span');
  labelOn.className = 'gm-toggle-label-on';
  labelOn.textContent = onLabel;
  Object.assign(labelOn.style, {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    left: '8px',
    color: '#fff',
    fontSize: `${fontSize}px`,
    display: currentValue ? '' : 'none',
    userSelect: 'none',
  });

  // OFF label
  const labelOff = document.createElement('span');
  labelOff.className = 'gm-toggle-label-off';
  labelOff.textContent = offLabel;
  Object.assign(labelOff.style, {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    right: '8px',
    color: '#fff',
    fontSize: `${fontSize}px`,
    display: currentValue ? 'none' : '',
    userSelect: 'none',
  });

  el.appendChild(thumb);
  el.appendChild(labelOn);
  el.appendChild(labelOff);

  // ─── Update helper ───
  function _update(val) {
    currentValue = val;
    el.setAttribute('data-on', String(val));
    el.style.background = val ? onColor : offColor;
    thumb.style.left = val ? `${width - height + 2}px` : '2px';
    labelOn.style.display = val ? '' : 'none';
    labelOff.style.display = val ? 'none' : '';
  }

  // Click handler
  el.addEventListener('click', () => {
    _update(!currentValue);
    if (typeof onChange === 'function') onChange(currentValue);
  });

  // Public setValue (no onChange trigger)
  function setValue(bool) {
    _update(!!bool);
  }

  return { el, setValue };
}

// ─── Radio Style ─────────────────────────────────────────

/**
 * Radio button group — ON and OFF as separate radio inputs.
 * @private
 */
function _createRadio(id, config, value, onChange) {
  const fontSize = config.fontSize || 14;
  const onColor = sanitizeCssValue(config.onColor) || 'rgba(180,160,255,0.8)';
  const onLabel = config.onLabel ?? 'ON';
  const offLabel = config.offLabel ?? 'OFF';

  let currentValue = !!value;

  // Container
  const el = document.createElement('div');
  el.className = 'gm-toggle gm-toggle-radio';
  Object.assign(el.style, {
    display: 'flex',
    gap: '12px',
    fontSize: `${fontSize}px`,
  });

  // Create radio pair
  const radioOn = _createRadioOption(id, 'on', onLabel, currentValue, onColor, fontSize);
  const radioOff = _createRadioOption(id, 'off', offLabel, !currentValue, onColor, fontSize);

  el.appendChild(radioOn.label);
  el.appendChild(radioOff.label);

  // Change handlers
  radioOn.input.addEventListener('change', () => {
    if (radioOn.input.checked) {
      currentValue = true;
      _updateRadioVisual(radioOn.custom, true, onColor);
      _updateRadioVisual(radioOff.custom, false, onColor);
      if (typeof onChange === 'function') onChange(true);
    }
  });

  radioOff.input.addEventListener('change', () => {
    if (radioOff.input.checked) {
      currentValue = false;
      _updateRadioVisual(radioOn.custom, false, onColor);
      _updateRadioVisual(radioOff.custom, true, onColor);
      if (typeof onChange === 'function') onChange(false);
    }
  });

  function setValue(bool) {
    currentValue = !!bool;
    radioOn.input.checked = currentValue;
    radioOff.input.checked = !currentValue;
    _updateRadioVisual(radioOn.custom, currentValue, onColor);
    _updateRadioVisual(radioOff.custom, !currentValue, onColor);
  }

  return { el, setValue };
}

/**
 * Create a single radio option (label + hidden input + custom circle).
 * @private
 */
function _createRadioOption(name, value, text, checked, activeColor, fontSize) {
  const label = document.createElement('label');
  Object.assign(label.style, {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#fff',
    fontSize: `${fontSize}px`,
  });

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  Object.assign(input.style, {
    position: 'absolute',
    opacity: '0',
    width: '0',
    height: '0',
  });

  const custom = document.createElement('span');
  custom.className = 'gm-radio-custom';
  Object.assign(custom.style, {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: checked
      ? `2px solid ${activeColor}`
      : '2px solid rgba(255,255,255,0.4)',
    background: checked ? activeColor : 'transparent',
    display: 'inline-block',
    boxSizing: 'border-box',
  });

  label.appendChild(input);
  label.appendChild(custom);
  label.appendChild(document.createTextNode(` ${text}`));

  return { label, input, custom };
}

/**
 * Update the visual style of a radio custom circle.
 * @private
 */
function _updateRadioVisual(custom, checked, activeColor) {
  custom.style.background = checked ? activeColor : 'transparent';
  custom.style.borderColor = checked ? activeColor : 'rgba(255,255,255,0.4)';
}

// ─── Checkbox Style ──────────────────────────────────────

/**
 * Checkbox — single toggle with checkmark indicator.
 * @private
 */
function _createCheckbox(id, config, value, onChange) {
  const fontSize = config.fontSize || 14;
  const onColor = sanitizeCssValue(config.onColor) || 'rgba(180,160,255,0.8)';
  const onLabel = config.onLabel ?? 'ON';

  let currentValue = !!value;

  // Container
  const el = document.createElement('div');
  el.className = 'gm-toggle gm-toggle-checkbox';

  // Label
  const label = document.createElement('label');
  Object.assign(label.style, {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: `${fontSize}px`,
  });

  // Hidden native checkbox
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = currentValue;
  Object.assign(input.style, {
    position: 'absolute',
    opacity: '0',
    width: '0',
    height: '0',
  });

  // Custom checkbox visual
  const custom = document.createElement('span');
  custom.className = 'gm-checkbox-custom';
  Object.assign(custom.style, {
    width: '18px',
    height: '18px',
    border: currentValue
      ? `2px solid ${onColor}`
      : '2px solid rgba(255,255,255,0.4)',
    borderRadius: '3px',
    background: currentValue ? onColor : 'transparent',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    color: '#fff',
    fontSize: '13px',
    lineHeight: '1',
  });
  custom.textContent = currentValue ? '✓' : '';

  label.appendChild(input);
  label.appendChild(custom);
  label.appendChild(document.createTextNode(` ${onLabel}`));
  el.appendChild(label);

  // ─── Update helper ───
  function _updateCheckbox(val) {
    currentValue = val;
    input.checked = val;
    custom.style.background = val ? onColor : 'transparent';
    custom.style.borderColor = val ? onColor : 'rgba(255,255,255,0.4)';
    custom.textContent = val ? '✓' : '';
  }

  // Change handler
  input.addEventListener('change', () => {
    _updateCheckbox(input.checked);
    if (typeof onChange === 'function') onChange(input.checked);
  });

  function setValue(bool) {
    _updateCheckbox(!!bool);
  }

  return { el, setValue };
}

// ─── Button-Pair Style ───────────────────────────────────

/**
 * Button pair — two buttons, one active at a time.
 * @private
 */
function _createButtonPair(id, config, value, onChange) {
  const fontSize = config.fontSize || 14;
  const onColor = sanitizeCssValue(config.onColor) || 'rgba(180,160,255,0.8)';
  const offColor = sanitizeCssValue(config.offColor) || 'rgba(255,255,255,0.15)';
  const onLabel = config.onLabel ?? 'ON';
  const offLabel = config.offLabel ?? 'OFF';

  let currentValue = !!value;

  // Container
  const el = document.createElement('div');
  el.className = 'gm-toggle gm-toggle-btnpair';
  Object.assign(el.style, {
    display: 'flex',
    gap: '2px',
  });

  // ON button
  const btnOn = document.createElement('button');
  btnOn.className = 'gm-toggle-btn gm-btn-on';
  btnOn.textContent = onLabel;

  // OFF button
  const btnOff = document.createElement('button');
  btnOff.className = 'gm-toggle-btn gm-btn-off';
  btnOff.textContent = offLabel;

  // Style both buttons
  for (const btn of [btnOn, btnOff]) {
    Object.assign(btn.style, {
      padding: '6px 16px',
      border: 'none',
      cursor: 'pointer',
      fontSize: `${fontSize}px`,
      borderRadius: '4px',
      outline: 'none',
    });
  }

  // ─── Update helper ───
  function _updateButtons(val) {
    currentValue = val;
    btnOn.style.background = val ? onColor : offColor;
    btnOn.style.color = val ? '#fff' : 'rgba(255,255,255,0.6)';
    btnOff.style.background = val ? offColor : onColor;
    btnOff.style.color = val ? 'rgba(255,255,255,0.6)' : '#fff';
    if (val) {
      btnOn.classList.add('active');
      btnOff.classList.remove('active');
    } else {
      btnOn.classList.remove('active');
      btnOff.classList.add('active');
    }
  }

  // Initial state
  _updateButtons(currentValue);

  // Click handlers
  btnOn.addEventListener('click', () => {
    if (!currentValue) {
      _updateButtons(true);
      if (typeof onChange === 'function') onChange(true);
    }
  });

  btnOff.addEventListener('click', () => {
    if (currentValue) {
      _updateButtons(false);
      if (typeof onChange === 'function') onChange(false);
    }
  });

  el.appendChild(btnOn);
  el.appendChild(btnOff);

  function setValue(bool) {
    _updateButtons(!!bool);
  }

  return { el, setValue };
}
