/** @type {const} */
// ─── Supercell-style Theme ────────────────────────────────────────────────────
//
//  Direction: Dark fantasy. Deep blacks. Sharp neon accents.
//  Rule: Dark surfaces only. No light mode softness.
//  Rule: Accent colors carry meaning — not decoration.
//
const themeColors = {
  // ── Base surfaces ─────────────────────────────────────
  background: { light: '#0f0f1a', dark: '#09090f' }, // deepest black — always dark
  surface:    { light: '#16213e', dark: '#111827' }, // card and panel surface
  elevated:   { light: '#1e2a45', dark: '#1a2235' }, // modals, overlays

  // ── Text ─────────────────────────────────────────
  foreground: { light: '#f0f0f0', dark: '#ffffff' }, // primary text
  muted:      { light: '#8892a4', dark: '#6b7280' }, // labels, hints

  // ── Borders ─────────────────────────────────────
  border:     { light: '#1e293b', dark: '#0f172a' }, // thin, precise

  // ── Accent — main action color ───────────────────────
  primary:    { light: '#e94560', dark: '#ff2d55' }, // sharp red — buttons, CTA

  // ── Semantic ────────────────────────────────────
  success:    { light: '#22c55e', dark: '#16a34a' }, // win — always green
  warning:    { light: '#f59e0b', dark: '#d97706' }, // draw / legendary
  error:      { light: '#ef4444', dark: '#dc2626' }, // loss — always red
};

module.exports = { themeColors };
