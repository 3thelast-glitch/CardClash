import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const characterCardSource = readFileSync(
    resolve(process.cwd(), 'components/game/luxury-character-card-animated.tsx'),
    'utf8',
);

describe('character card optional metadata', () => {
    it('does not render an element chip and keeps faction metadata only', () => {
        expect(characterCardSource).not.toContain('ELEMENT_EMOJI');
        expect(characterCardSource).toContain('const raceLabel = card.race ? RACE_LABELS[card.race] : undefined;');
    });

    it('does not render the metadata rail when race and class are absent', () => {
        expect(characterCardSource).toContain('const hasMeta = metaItems.length > 0;');
        expect(characterCardSource).toContain('{hasMeta && (');
        expect(characterCardSource).toContain('const metaHeight = hasMeta ?');
    });
});
