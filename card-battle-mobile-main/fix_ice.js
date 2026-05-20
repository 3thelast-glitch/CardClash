const fs = require('fs');
const path = require('path');

const files = [
  'lib/game/cards-batch-3-fixed.ts',
  'lib/game/cards-batch-4-fixed.ts',
  'lib/game/cards-batch-5-fixed.ts',
  'lib/game/cards-batch-6-fixed.ts',
];

for (const file of files) {
  const filePath = path.join('a:\\020\\card-battle-mobile-main\\card-battle-mobile-main', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/element:\s*'ice'/g, "element: 'water'");
    content = content.replace(/animationPreset:\s*'ice'/g, "animationPreset: 'default'");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
}
