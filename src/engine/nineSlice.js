export function normalizeNineSliceInsets(value, fallback = [0, 0, 0, 0]) {
  const source = Array.isArray(value) ? value : [value, value, value, value];
  return fallback.map((defaultValue, index) => {
    const number = Number(source[index]);
    return Number.isFinite(number) && number >= 0 ? number : defaultValue;
  });
}
