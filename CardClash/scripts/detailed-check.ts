import * as fs from 'fs';
import * as path from 'path';

function getCards(): any[] {
    const cards: any[] = [];
    const files = [
        'lib/game/cards-batch-1-fixed.ts',
        'lib/game/cards-batch-2-fixed.ts',
        'lib/game/cards-batch-3-fixed.ts',
        'lib/game/cards-batch-4-fixed.ts',
        'lib/game/cards-batch-5-fixed.ts',
        'lib/game/cards-batch-6-fixed.ts',
    ];

    for (const f of files) {
        const fullPath = path.join(__dirname, '..', f);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf-8');
        const blocks = content.split('{');
        for (const block of blocks) {
            if (!block.includes('id:')) continue;
            
            const idMatch = block.match(/id\s*:\s*['"]([^'"]+)['"]/);
            const starsMatch = block.match(/stars\s*:\s*(\d+)/);
            const rarityMatch = block.match(/rarity\s*:\s*['"]([^'"]+)['"]/);
            const nameMatch = block.match(/name\s*:\s*['"]([^'"]+)['"]/);
            
            if (idMatch) {
                const id = idMatch[1];
                const stars = starsMatch ? parseInt(starsMatch[1], 10) : 0;
                let rarity = rarityMatch ? rarityMatch[1] : '';
                const name = nameMatch ? nameMatch[1] : id;

                if (!rarity) {
                    if (stars <= 2) rarity = 'common';
                    else if (stars === 3) rarity = 'rare';
                    else if (stars === 4) rarity = 'epic';
                    else rarity = 'legendary';
                }
                cards.push({ id, name, stars, rarity, file: f });
            }
        }
    }
    return cards;
}

function getMappedKeys(indexPath: string): Set<string> {
    const keys = new Set<string>();
    if (!fs.existsSync(indexPath)) return keys;
    
    const content = fs.readFileSync(indexPath, 'utf-8');
    const regex = /^\s*([a-zA-Z0-9_]+)\s*:\s*require/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
    return keys;
}

function check() {
    const cards = getCards();
    const cardIds = new Set(cards.map(c => c.id));
    const folders = ['common', 'rare', 'epic', 'legendary', 'special', 'rage'];
    
    const maps: Record<string, Set<string>> = {};
    for (const f of folders) {
        const indexPath = path.join(__dirname, '..', 'assets', 'characters', f, 'index.ts');
        maps[f] = getMappedKeys(indexPath);
    }

    console.log("=== MAPPED KEYS NOT CORRESPONDING TO ANY CARD ID ===");
    for (const f of folders) {
        const unmatching: string[] = [];
        for (const key of maps[f]) {
            if (!cardIds.has(key)) {
                // If it's in rage, it might be key_rage. Let's check cardIds for key without _rage
                if (f === 'rage' && key.endsWith('_rage') && cardIds.has(key.substring(0, key.length - 5))) {
                    continue;
                }
                unmatching.push(key);
            }
        }
        console.log(`Folder: assets/characters/${f} (${unmatching.length} unmatching keys):`);
        console.log(unmatching);
    }
}

check();
