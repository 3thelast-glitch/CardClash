const fs = require('fs');
const path = require('path');

const filesToFixIce = [
  'lib/game/anime-cards-data-3.ts',
  'lib/game/anime-cards-data.ts',
  'lib/game/bot-ai.ts',
  'lib/game/__tests__/game-logic.test.ts',
  'lib/game/__tests__/bot-ai.test.ts'
];

for (const file of filesToFixIce) {
  const filePath = path.join('a:\\020\\card-battle-mobile-main\\card-battle-mobile-main', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/element:\s*'ice'/g, "element: 'water'");
    content = content.replace(/animationPreset:\s*'ice'/g, "animationPreset: 'default'");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ice in ${file}`);
  }
}

// Fix missing speed in game-logic.test.ts
const logicTestPath = path.join('a:\\020\\card-battle-mobile-main\\card-battle-mobile-main\\lib\\game\\__tests__\\game-logic.test.ts');
if (fs.existsSync(logicTestPath)) {
  let content = fs.readFileSync(logicTestPath, 'utf8');
  content = content.replace(/speed:\s*\d+,?/g, '');
  content = content.replace(/\.\.\/cards-data/g, '../anime-cards-data');
  content = content.replace(/card: any/g, 'card: any'); // Just in case, to prevent parameter any type, let's fix it
  content = content.replace(/const p1Card = {/g, 'const p1Card: any = {');
  content = content.replace(/const p2Card = {/g, 'const p2Card: any = {');
  content = content.replace(/\(card\)/g, '(card: any)');
  content = content.replace(/\(c\)/g, '(c: any)');
  fs.writeFileSync(logicTestPath, content, 'utf8');
  console.log('Fixed game-logic.test.ts');
}

const aiTestPath = path.join('a:\\020\\card-battle-mobile-main\\card-battle-mobile-main\\lib\\game\\__tests__\\bot-ai.test.ts');
if (fs.existsSync(aiTestPath)) {
  let content = fs.readFileSync(aiTestPath, 'utf8');
  content = content.replace(/\.\.\/cards-data/g, '../anime-cards-data');
  fs.writeFileSync(aiTestPath, content, 'utf8');
  console.log('Fixed bot-ai.test.ts');
}
