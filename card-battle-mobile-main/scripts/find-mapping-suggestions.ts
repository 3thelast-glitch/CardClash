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

    const unmappedKeys: Record<string, string[]> = {};
    for (const f of folders) {
        unmappedKeys[f] = [];
        for (const key of maps[f]) {
            if (!cardIds.has(key)) {
                if (f === 'rage' && key.endsWith('_rage') && cardIds.has(key.substring(0, key.length - 5))) {
                    continue;
                }
                unmappedKeys[f].push(key);
            }
        }
    }

    const missingCards = cards.filter(c => {
        return !maps[c.rarity]?.has(c.id) && !maps['rage']?.has(`${c.id}_rage`);
    });

    let out = `Missing cards: ${missingCards.length}\n\n`;

    const suggestions: any[] = [];
    for (const card of missingCards) {
        const rarity = card.rarity;
        const keysInRarity = unmappedKeys[rarity] || [];
        const keysInRage = unmappedKeys['rage'] || [];
        
        const matches: string[] = [];
        const idLower = card.id.toLowerCase();
        const nameLower = card.name.toLowerCase();

        for (const key of keysInRarity) {
            const keyLower = key.toLowerCase();
            if (
                keyLower.includes(idLower) || 
                idLower.includes(keyLower) ||
                keyLower.includes(nameLower) ||
                nameLower.includes(keyLower) ||
                keyLower.split('_').some(w => w.length > 2 && idLower.includes(w))
            ) {
                matches.push(key);
            }
        }

        suggestions.push({
            card,
            matches
        });
    }

    out += "=== SUGGESTIONS ===\n";
    for (const s of suggestions) {
        out += `Card: ID="${s.card.id}" Name="${s.card.name}" Rarity="${s.card.rarity}"\n`;
        if (s.matches.length > 0) {
            out += `  -> Suggested keys: ${s.matches.join(', ')}\n`;
        } else {
            out += `  -> No direct suggestions found.\n`;
        }
    }
    
    fs.writeFileSync(path.join(__dirname, '..', 'suggestions-report.txt'), out, 'utf-8');
    console.log('Report written to suggestions-report.txt');
}

check();
