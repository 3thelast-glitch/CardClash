const fs = require('fs');

const files = [
    'app/screens/splash.tsx',
    'app/screens/game-mode.tsx',
    'app/screens/rounds-config.tsx',
    'app/screens/leaderboard.tsx',
    'app/screens/card-selection.tsx',
    'app/screens/battle-results.tsx',
    'app/screens/stats.tsx',
    'app/screens/difficulty.tsx',
    'components/ui/ProButton.tsx'
];

const path = require('path');
const root = path.join(__dirname, '..');

let changedAny = false;
files.forEach(f => {
    const fullPath = path.join(root, f);
    if (!fs.existsSync(fullPath)) {
        console.log('Not found:', fullPath);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    let original = content;

    content = content.replace(/fontWeight:\s*['"](?:900|800|bold)['"]/g, 'fontFamily: FONT_FAMILY.bold');
    content = content.replace(/fontWeight:\s*['"](?:700|600|semibold)['"]/g, 'fontFamily: FONT_FAMILY.medium');
    content = content.replace(/fontWeight:\s*['"](?:500|400|300|regular|normal)['"]/g, 'fontFamily: FONT_FAMILY.regular');

    if (content !== original) {
        if (!content.includes('FONT_FAMILY')) {
            content = content.replace(
                /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/ui\/design-tokens['"]/,
                (match, p1) => `import {${p1}, FONT_FAMILY } from '@/components/ui/design-tokens'`
            );
            content = content.replace(
                /import\s*\{([^}]*)\}\s*from\s*['"]\.\/design-tokens['"]/,
                (match, p1) => `import {${p1}, FONT_FAMILY } from './design-tokens'`
            );
        }
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', f);
        changedAny = true;
    }
});

if (!changedAny) console.log('No files needed updates.');
else console.log('Done.');
