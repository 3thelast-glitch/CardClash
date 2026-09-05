import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FONT_FAMILY,
  SEMANTIC_COLOR,
  TOUCH_TARGET,
} from '../components/ui/design-tokens';
import { DEFAULT_SETTINGS } from '../lib/game/settings-store';
import { CONNECTION_STATE_COPY } from '../components/ui/ConnectionBadge';

describe('Obsidian Arcana presentation system', () => {
  it('keeps the requested semantic palette as the source of truth', () => {
    expect(SEMANTIC_COLOR.background.base).toBe('#080D16');
    expect(SEMANTIC_COLOR.background.arena).toBe('#0B1422');
    expect(SEMANTIC_COLOR.surface.default).toBe('#131E2F');
    expect(SEMANTIC_COLOR.surface.raised).toBe('#1B2A40');
    expect(SEMANTIC_COLOR.border.subtle).toBe('#2B3D55');
    expect(SEMANTIC_COLOR.accent.primary).toBe('#39E6D0');
    expect(SEMANTIC_COLOR.accent.secondary).toBe('#8DA4FF');
    expect(SEMANTIC_COLOR.status.danger).toBe('#FB7185');
  });

  it('uses real Arabic font weights instead of mapping all roles to DG-Bold', () => {
    expect(FONT_FAMILY.regular).toBe('NotoKufiArabic_400Regular');
    expect(FONT_FAMILY.semibold).toBe('NotoKufiArabic_600SemiBold');
    expect(FONT_FAMILY.bold).toBe('NotoKufiArabic_900Black');
    expect(new Set([FONT_FAMILY.regular, FONT_FAMILY.semibold, FONT_FAMILY.bold]).size).toBe(3);
  });

  it('preserves accessible Android-size touch targets and backward-compatible presentation defaults', () => {
    expect(TOUCH_TARGET.default).toBeGreaterThanOrEqual(48);
    expect(DEFAULT_SETTINGS.motionPreference).toBe('system');
    expect(DEFAULT_SETTINGS.vibration).toBe(true);
  });

  it('does not reintroduce React Native core Animated in redesigned motion surfaces', () => {
    const files = [
      'app/screens/settings.tsx',
      'app/screens/splash.tsx',
      'app/screens/multiplayer-lobby.tsx',
      'app/screens/multiplayer-battle.tsx',
      'hooks/useCardAnimations.ts',
      'components/game/draggable-card.tsx',
    ];
    files.forEach((file) => {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).not.toMatch(/Animated\s+as\s+RNAnimated/);
      expect(source, file).not.toMatch(/import\s*\{[^}]*\bAnimated\b[^}]*\}\s*from\s*['"]react-native['"]/);
    });
  });

  it('maps transport states to explicit human-readable connection states', () => {
    expect(CONNECTION_STATE_COPY.connecting).toBe('جارٍ الاتصال');
    expect(CONNECTION_STATE_COPY.waiting).toBe('انتظار الخصم');
    expect(CONNECTION_STATE_COPY.reconnecting).toBe('إعادة الاتصال');
    expect(CONNECTION_STATE_COPY.disconnected).toBe('انقطع الاتصال');
    expect(CONNECTION_STATE_COPY.hosting).toBe('غرفة محلية مفتوحة');
  });

  it('does not synchronously read a runOnJS drop result', () => {
    const draggable = readFileSync(resolve(process.cwd(), 'components/game/draggable-card.tsx'), 'utf8');
    expect(draggable).not.toMatch(/accepted\s*=\s*runOnJS/);
    expect(draggable).toContain('runOnJS(requestDrop)');
  });
});
