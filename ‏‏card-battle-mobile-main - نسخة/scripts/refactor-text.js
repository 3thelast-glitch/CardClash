const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Handle Import Replacement
    const rnImportRegex = /import\s+([^;]*?)from\s+['"]react-native['"];?(?:\r?\n)?/g;

    content = content.replace(rnImportRegex, (match, importsStr) => {
        const blockMatch = importsStr.match(/\{([\s\S]*?)\}/);
        if (blockMatch) {
            let parts = blockMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            if (parts.includes('Text')) {
                parts = parts.filter(p => p !== 'Text');
                let prefix = '';
                if (importsStr.includes(',') && !importsStr.startsWith('{')) {
                    prefix = importsStr.split(',')[0].trim() + ', ';
                }

                if (parts.length === 0 && !prefix) {
                    return `import { ThemedText as Text } from '@/components/ui/ThemedText';\n`;
                } else {
                    let namedImports = parts.length > 0 ? `{ ${parts.join(', ')} }` : '';
                    let finalImport = `import ${prefix}${namedImports} from 'react-native';`;
                    finalImport = finalImport.replace('import ,', 'import').replace('{  }', '').trim();
                    return `${finalImport}\nimport { ThemedText as Text } from '@/components/ui/ThemedText';\n`;
                }
            }
        }
        return match;
    });

    // 2. Remove fontFamily declarations with leading commas or trailing commas
    content = content.replace(/fontFamily\s*:\s*[^,\n]+,\s*/g, '');
    content = content.replace(/fontFamily\s*:\s*[^}\n]+\s*(?=\})/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
        return true;
    }
    return false;
}

function processDir(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            count += processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            if (processFile(fullPath)) count++;
        }
    }
    return count;
}

const dir = path.join(__dirname, '..', 'app');
const updated = processDir(dir);
console.log(`Finished. Updated ${updated} files in app/.`);
