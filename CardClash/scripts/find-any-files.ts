import * as fs from 'fs';
import * as path from 'path';

function findFiles(dir: string, query: string, list: string[]) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findFiles(fullPath, query, list);
        } else {
            if (f.toLowerCase().includes(query.toLowerCase())) {
                list.push(fullPath);
            }
        }
    }
}

const queries = ['shanks', 'whitebeard', 'ace', 'marco', 'katakuri', 'hancock', 'ranni', 'melina', 'malenia', 'radahn', 'maliketh'];
console.log('Searching assets for files...');
for (const q of queries) {
    const list: string[] = [];
    findFiles(path.join(__dirname, '..', 'assets'), q, list);
    if (list.length > 0) {
        console.log(`Query "${q}" matches:`);
        console.log(list);
    } else {
        console.log(`Query "${q}": NO MATCHES`);
    }
}
