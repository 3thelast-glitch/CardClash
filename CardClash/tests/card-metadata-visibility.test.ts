import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const characterCardSource = readFileSync(
    resolve(process.cwd(), 'components/game/luxury-character-card-animated.tsx'),
    'utf8',
);

describe('character card optional metadata', () => {
    it('does not render an element chip or visible faction text, and uses a corner medallion instead', () => {
        expect(characterCardSource).not.toContain('ELEMENT_EMOJI');
        expect(characterCardSource).toContain('const FactionCornerMedallion =');
        expect(characterCardSource).toContain('<FactionCornerMedallion card={card} sc={sc} />');
        expect(characterCardSource).not.toContain('const raceLabel = card.race ?');
    });

    it('does not render the metadata rail when the card class is absent', () => {
        expect(characterCardSource).toContain('const hasMeta = metaItems.length > 0;');
        expect(characterCardSource).toContain('{hasMeta && (');
        expect(characterCardSource).toContain('const metaHeight = hasMeta ?');
    });
});
