import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const characterCardSource = readFileSync(
    resolve(process.cwd(), 'components/game/luxury-character-card-animated.tsx'),
    'utf8',
);

describe('character card optional metadata', () => {
    it('does not render an element chip without both element values', () => {
        expect(characterCardSource).toContain('const hasElement = Boolean(elementEmoji && elementLabel);');
        expect(characterCardSource).toContain('{hasElement && (');
    });

    it('does not render the metadata rail when race and class are absent', () => {
        expect(characterCardSource).toContain('const hasMeta = metaItems.length > 0;');
        expect(characterCardSource).toContain('{hasMeta && (');
        expect(characterCardSource).toContain('const metaHeight = hasMeta ?');
    });
});
