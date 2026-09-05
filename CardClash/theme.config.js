/** @type {const} */
/**
 * Obsidian Arcana — runtime theme bridge.
 * Both schemes intentionally remain dark so the game retains its authored
 * battlefield contrast while still respecting the system scheme elsewhere.
 */
const palette = {
  background: '#080D16',
  surface: '#131E2F',
  elevated: '#1B2A40',
  foreground: '#F3F6FC',
  muted: '#B7C4D8',
  border: '#2B3D55',
  primary: '#39E6D0',
  secondary: '#8DA4FF',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#FB7185',
};

const pair = (value) => ({ light: value, dark: value });

const themeColors = {
  background: pair(palette.background),
  surface: pair(palette.surface),
  elevated: pair(palette.elevated),
  foreground: pair(palette.foreground),
  muted: pair(palette.muted),
  border: pair(palette.border),
  primary: pair(palette.primary),
  secondary: pair(palette.secondary),
  success: pair(palette.success),
  warning: pair(palette.warning),
  error: pair(palette.error),
};

module.exports = { themeColors };
