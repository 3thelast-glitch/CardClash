import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../lib/game/cards-data-exports';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Turin special card', () => {
  it('keeps Turin as a special card with the explicit forced-loss description and zero base stats', () => {
    const turin = ALL_CARDS.find(card => card.id === 'Turin_Turambar');

    expect(turin).toMatchObject({
      id: 'Turin_Turambar',
      rarity: 'special',
      attack: 0,
      defense: 0,
    });
    expect(turin?.specialAbility).toContain('لعنة تورين');
    expect(turin?.specialAbility).toContain('نصف الجولات الأولى');
  });

  it('uses Turin forced loss when choosing audio authority and keeps presentation audio optional', () => {
    const battle = source('app/screens/battle.tsx');
    const lanBattle = source('app/screens/lan-battle.tsx');
    const insights = source('lib/game/round-insights.ts');
    const artwork = source('components/cards/CardArtwork.tsx');

    expect(battle).toContain('turinPenaltyAudioWinner ?? computedWinner');
    expect(lanBattle).toContain("label: 'لعنة تورين: تخسر هذه الجولة'");
    expect(lanBattle).toContain("turinPenalty.targetSide === 'player' ? 'guest'");
    expect(insights).toContain("turinPenalty: 'لعنة تورين: خسارة هذه الجولة'");
    expect(artwork).toContain('instance.muted = !playAudio;');
    expect(artwork).toContain('if (active) instance.play();');
    expect(artwork).not.toContain('player.volume = 0;\n      player.pause();');
  });
});
