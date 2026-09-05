import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..');

function readComponent(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('card artwork fit policy', () => {
  it('keeps the main ability artwork filling the card while activation art stays contained', () => {
    const abilityCard = readComponent('components/game/ability-card.tsx');
    const activationOverlay = readComponent('components/game/AbilityActivationOverlay.tsx');

    expect(abilityCard).toMatch(/resizeMode="cover"/);
    expect(activationOverlay).toMatch(/resizeMode="cover"/);
    expect(abilityCard).not.toMatch(/ImageBackground[\s\S]{0,240}resizeMode="cover"/);
    expect(activationOverlay).not.toMatch(/resizeMode="stretch"/);
  });

  it('uses the nothing happened video silently in card previews with the poster retained as a fallback asset', () => {
    const abilityCard = readComponent('components/game/ability-card.tsx');

    expect(abilityCard).toMatch(/Nothing_Happened_Art\.png/);
    expect(abilityCard).toMatch(/Nothing_Happened_Art\.mp4/);
    expect(abilityCard).toMatch(/instance\.muted = !playAudio/);
    expect(abilityCard).not.toMatch(/Platform\.OS !== 'web'/);
  });

  it('preserves full silhouettes for the character cards with narrow transparent artwork', () => {
    const artwork = readComponent('components/cards/CardArtwork.tsx');
    const affectedIds = [
      'ay_raikage', 'bam', 'trunks', 'nelliel_tu', 'emlyn_white', 'riza_hawkeye',
      'leafa', 'ebisu', 'ino_yamanaka', 'yosaku', 'yonji',
    ];

    expect(artwork).toMatch(/CARD_IMAGE_FIT_OVERRIDES/);
    for (const id of affectedIds) {
      expect(artwork, id).toMatch(new RegExp(`${id}: ['\"]contain['\"]`));
    }
    expect(artwork).toContain("media.isCustomImage ? 'contain'");
    expect(artwork).toContain('contentFit={contentFit}');
  });

  it('keeps premium artwork on explicit contain/cover policies and never stretches it', () => {
    const premiumComponents = [
      'components/game/RarityCard.tsx',
      'components/game/epic-card-template.tsx',
      'components/game/elven-luxury-card.tsx',
      'components/cards/CardArtwork.tsx',
    ];

    for (const relativePath of premiumComponents) {
      const source = readComponent(relativePath);
      expect(source, relativePath).toMatch(/contentFit="(?:contain|cover)"|contentFit=\{contentFit\}/);
      expect(source, relativePath).not.toMatch(/contentFit="stretch"/);
    }
  });

  it('renders Zoro cut slashes over the affected opposing character card through the unified surface', () => {
    const battle = readComponent('app/screens/battle.tsx');
    const unified = readComponent('components/cards/UnifiedCard.tsx');
    const adapter = readComponent('components/game/luxury-character-card-animated.tsx');

    expect(battle).toMatch(/slashEffect=\{botZoroCutActive\}/);
    expect(battle).toMatch(/slashEffect=\{playerZoroCutActive\}/);
    expect(adapter).toContain('slashEffect={slashEffect}');
    expect(unified).toMatch(/zoroSlashOverlay/);
    expect(unified).toMatch(/قطع زورو/);
  });
});
