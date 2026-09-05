import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const preview = source('app/screens/card-system-preview.tsx');
const collection = source('app/screens/collection.tsx');

describe('developer card system preview', () => {
  it('covers every canonical rarity and the primary UnifiedCard variants', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary', 'special']) {
      expect(preview).toContain(`'${rarity}'`);
    }
    for (const variant of ['thumbnail', 'selection', 'battle', 'inspection']) {
      expect(preview).toContain(`'${variant}'`);
    }
    expect(preview).toContain('variant="faceDown"');
  });

  it('shows interaction states independently from rarity and uses static grid media', () => {
    for (const state of ['playable', 'targeted', 'pending', 'transformed']) {
      expect(preview).toContain(`${state}: true`);
    }
    expect(preview).toContain('selected interactive={false}');
    expect(preview).toContain('mediaMode="static"');
  });

  it('is developer-only and reachable from the existing developer collection', () => {
    expect(preview).toContain('isDeveloperBuild');
    expect(preview).toContain('<Redirect href="/screens/game-mode" />');
    expect(collection).toContain("route: '/screens/card-system-preview'");
  });

  it('renders hidden preview without supplying a card object', () => {
    expect(preview).toContain('<UnifiedCard variant="faceDown" interactive={false}');
    expect(preview).not.toContain('variant="faceDown" card=');
  });
});
