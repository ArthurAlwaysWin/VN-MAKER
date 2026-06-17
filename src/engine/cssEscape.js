/**
 * Escape a value for use inside a double-quoted CSS string.
 *
 * CSS url() accepts quoted strings; escaping the string content keeps
 * user-controlled asset paths from closing the string and appending rules.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeCssString(value) {
  return String(value ?? '')
    .replace(/\0/g, '\uFFFD')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\A ')
    .replace(/\r/g, '\\D ')
    .replace(/\f/g, '\\C ');
}

/**
 * Format a URL value for CSS as url("...").
 *
 * @param {unknown} value
 * @returns {string}
 */
export function cssUrl(value) {
  return `url("${escapeCssString(value)}")`;
}
