import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..');

function readComponent(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('card artwork fit policy', () => {
  it('keeps ability artwork fully contained in the main and activation cards', () => {
    const abilityCard = readComponent('components/game/ability-card.tsx');
    const activationOverlay = readComponent('components/game/AbilityActivationOverlay.tsx');

    expect(abilityCard).toMatch(/resizeMode="contain"/);
    expect(activationOverlay).toMatch(/resizeMode="contain"/);
    expect(abilityCard).not.toMatch(/ImageBackground[\s\S]{0,240}resizeMode="cover"/);
    expect(activationOverlay).not.toMatch(/ImageBackground[\s\S]{0,240}resizeMode="cover"/);
  });

  it('keeps premium, legendary, and special artwork filling the frame', () => {
    const premiumComponents = [
      'components/game/RarityCard.tsx',
      'components/game/epic-card-template.tsx',
      'components/game/elven-luxury-card.tsx',
      'components/game/card-item.tsx',
    ];

    for (const relativePath of premiumComponents) {
      const source = readComponent(relativePath);
      expect(source, relativePath).toMatch(/contentFit="(?:contain|cover)"/);
      expect(source, relativePath).not.toMatch(/contentFit="stretch"/);
    }
  });
});
