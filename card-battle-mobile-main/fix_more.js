const fs = require('fs');
const path = require('path');

// Fix batch 1 missing name
const batch1Path = path.join('a:\\020\\card-battle-mobile-main\\card-battle-mobile-main\\lib\\game\\cards-batch-1-fixed.ts');
if (fs.existsSync(batch1Path)) {
  let content = fs.readFileSync(batch1Path, 'utf8');
  // Find { id: '...', ... missing name: '...', but having nameAr: '...' }
  content = content.replace(/(id:\s*'([^']+)'\s*,)[\s\n]*(nameAr:)/g, (match, p1, p2, p3) => {
    let name = p2.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${p1}\n    name: '${name}',\n    ${p3}`;
  });
  fs.writeFileSync(batch1Path, content, 'utf8');
  console.log('Fixed batch 1 names');
}

// Fix batch 2 ice
const batch2Path = path.join('a:\\020\\card-battle-mobile-main\\card-battle-mobile-main\\lib\\game\\cards-batch-2-fixed.ts');
if (fs.existsSync(batch2Path)) {
  let content = fs.readFileSync(batch2Path, 'utf8');
  content = content.replace(/element:\s*'ice'/g, "element: 'water'");
  content = content.replace(/animationPreset:\s*'ice'/g, "animationPreset: 'default'");
  fs.writeFileSync(batch2Path, content, 'utf8');
  console.log('Fixed batch 2 ice');
}
