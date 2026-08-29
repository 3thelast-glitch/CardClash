import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const [sourceArg] = process.argv.slice(2);
const target = resolve('data/card-collection.json');

if (!sourceArg) {
  console.error('Usage: node scripts/sync-card-collection-export.mjs <path-to-card-collection.json>');
  process.exit(1);
}

const source = resolve(sourceArg);
let data;
try {
  data = JSON.parse(await readFile(source, 'utf8'));
} catch (error) {
  console.error(`Could not read JSON: ${String(error)}`);
  process.exit(1);
}

const valid = data
  && data.version === 2
  && typeof data.exportedAt === 'string'
  && data.cardEdits && typeof data.cardEdits === 'object' && !Array.isArray(data.cardEdits)
  && Array.isArray(data.deletedCards) && data.deletedCards.every(id => typeof id === 'string')
  && Array.isArray(data.customCards)
  && data.rageOverrides && typeof data.rageOverrides === 'object' && !Array.isArray(data.rageOverrides)
  && data.images && typeof data.images === 'object' && !Array.isArray(data.images);

if (!valid) {
  console.error('Invalid Card Collection export. No project file was changed.');
  process.exit(1);
}

await mkdir(dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Validated ${basename(source)} and updated ${target}`);
