import * as fs from 'fs';
import * as path from 'path';

// Helper to parse card files statically
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
        if (!fs.existsSync(fullPath)) {
            console.error(`Missing card file: ${fullPath}`);
            continue;
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Let's parse each card block in the array export.
        // A simple way is to find id, stars, etc. inside curly braces.
        // We can split by '{' and parse each object.
        const blocks = content.split('{');
        for (const block of blocks) {
            if (!block.includes('id:')) continue;
            
            const idMatch = block.match(/id\s*:\s*['"]([^'"]+)['"]/);
            const starsMatch = block.match(/stars\s*:\s*(\d+)/);
            const rarityMatch = block.match(/rarity\s*:\s*['"]([^'"]+)['"]/);
            const nameMatch = block.match(/name\s*:\s*['"]([^'"]+)['"]/);
            const nameArMatch = block.match(/nameAr\s*:\s*['"]([^'"]+)['"]/);
            
            if (idMatch) {
                const id = idMatch[1];
                const stars = starsMatch ? parseInt(starsMatch[1], 10) : 0;
                let rarity = rarityMatch ? rarityMatch[1] : '';
                const name = nameMatch ? nameMatch[1] : id;
                const nameAr = nameArMatch ? nameArMatch[1] : '';

                // Calculate rarity from stars as getRarityFromStars does:
                if (!rarity) {
                    if (stars <= 2) rarity = 'common';
                    else if (stars === 3) rarity = 'rare';
                    else if (stars === 4) rarity = 'epic';
                    else rarity = 'legendary';
                }
                cards.push({ id, name, nameAr, stars, rarity });
            }
        }
    }
    return cards;
}

// Helper to parse index.ts file statically to find mapped IDs
function getMappedKeys(indexPath: string): Set<string> {
    const keys = new Set<string>();
    if (!fs.existsSync(indexPath)) return keys;
    
    const content = fs.readFileSync(indexPath, 'utf-8');
    // Find all lines like "key: require(...)" or "key: ..."
    // e.g. "coby: require('./coby.png')," or "Turin_Turambar: require('./Turin_Turambar.mp4'),"
    const regex = /^\s*([a-zA-Z0-9_]+)\s*:\s*require/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
    return keys;
}

function checkAll() {
    const cards = getCards();
    console.log(`Total cards parsed: ${cards.length}`);

    const folders = ['common', 'rare', 'epic', 'legendary', 'special', 'rage'];
    const maps: Record<string, Set<string>> = {};
    for (const f of folders) {
        const indexPath = path.join(__dirname, '..', 'assets', 'characters', f, 'index.ts');
        maps[f] = getMappedKeys(indexPath);
        console.log(`Mapped keys in ${f}: ${maps[f].size}`);
    }

    const missing: any[] = [];
    for (const card of cards) {
        const id = card.id;
        const rarity = card.rarity;
        
        // A card could be mapped in standard, video, gif, or rage maps.
        // Let's check if the ID is mapped in the correct rarity folder.
        const isMapped = maps[rarity]?.has(id) || maps['rage']?.has(`${id}_rage`);
        
        if (!isMapped) {
            missing.push(card);
        }
    }

    console.log(`\nCards missing images (Total ${missing.length}):`);
    console.log(JSON.stringify(missing, null, 2));

    // Let's see what unmapped files are in directories
    for (const f of folders) {
        const dir = path.join(__dirname, '..', 'assets', 'characters', f);
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        const mappedKeys = maps[f];
        
        // Find actual required filenames
        const content = fs.readFileSync(path.join(dir, 'index.ts'), 'utf-8');
        const reqRegex = /require\(['"]\.\/([^'"]+)['"]\)/g;
        const requiredFiles = new Set<string>();
        let m;
        while ((m = reqRegex.exec(content)) !== null) {
            requiredFiles.add(m[1].toLowerCase());
        }

        const unmapped: string[] = [];
        for (const file of files) {
            if (file === 'index.ts' || file === '.DS_Store') continue;
            if (!requiredFiles.has(file.toLowerCase())) {
                unmapped.push(file);
            }
        }
        if (unmapped.length > 0) {
            console.log(`\nUnmapped files in assets/characters/${f}:`);
            console.log(unmapped);
        }
    }
}

checkAll();
