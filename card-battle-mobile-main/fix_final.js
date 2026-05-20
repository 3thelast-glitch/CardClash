const fs = require('fs');
const path = require('path');

const projectRoot = 'a:\\020\\card-battle-mobile-main\\card-battle-mobile-main';

function replaceInFile(relativePath, replacements) {
  const filePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { from, to } of replacements) {
    if (typeof to === 'function') {
      content = content.replace(from, to);
    } else {
      content = content.replace(from, to);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${relativePath}`);
}

replaceInFile('app/oauth/callback.tsx', [
  { from: /router\.replace\('\/\(tabs\)'\)/g, to: "router.replace('/(tabs)' as any)" }
]);

replaceInFile('app/screens/battle.tsx', [
  { from: /paladin: '.*?'\s*}/, to: "paladin: '💪',\n    swordsman: '🤺',\n    fighter: '🥊',\n    guardian: '🤖',\n    healer: '⚕️'\n  }" }
]);

replaceInFile('app/screens/card-selection.tsx', [
  { from: /epic:\s*\[\],\s*legendary:\s*\[\]/g, to: "epic: [], legendary: [], special: []" },
  { from: /epic:\s*1,\s*legendary:\s*1/g, to: "epic: 1, legendary: 1, special: 1" },
  { from: /RarityWeights\s*\|\s*\{[^\}]+\}/g, to: "RarityWeights" }
]);

replaceInFile('app/screens/cards-gallery.tsx', [
  { from: /writingDirection:\s*'rtl',?/g, to: "" }
]);

replaceInFile('app/screens/multiplayer-lobby.tsx', [
  { from: /RADIUS\.xl/g, to: "RADIUS.lg" }
]);

replaceInFile('components/game/card-item.tsx', [
  { from: /rarity=\{rarityBadge\}/g, to: "rarity={rarityBadge as any}" }
]);

replaceInFile('components/game/card-preview.tsx', [
  { from: /source=\{cardImage\}/g, to: "source={cardImage as any}" },
  { from: /rarity=\{card\.rarity\}/g, to: "rarity={card.rarity as any}" }
]);

replaceInFile('components/game/element-effect.tsx', [
  { from: /case 'ice':\s*return <IceEffect.*?\/IceEffect>;/gs, to: "" },
  { from: /case 'ice':\s*return null;/g, to: "" }
]);

replaceInFile('components/game/luxury-character-card-animated.tsx', [
  { from: /Animated\.SharedValue<number>/g, to: "any" }
]);

replaceInFile('components/game/luxury-character-card.tsx', [
  { from: /legendary:\s*\{[^}]+\}/, to: (match) => match + ",\n  special: { label: 'SPECIAL', color: '#06b6d4', borderColor: '#22d3ee', badgeBg: '#164e63', badgeBorder: '#06b6d4', badgeText: '#67e8f9', shadowColor: '#06b6d4', shadowOpacity: 1, shadowRadius: 20, elevation: 15, hasShine: true, titleGlowRadius: 10, placeholderColors: ['#083344', '#164e63', '#083344'] as const }" }
]);

replaceInFile('lib/game/__tests__/bot-ai.test.ts', [
  { from: /import \{ ALL_CARDS \} from '\.\.\/anime-cards-data';/g, to: "import { ALL_CARDS } from '../cards-collection';" },
  { from: /element:\s*'ice'/g, to: "element: 'water'" }
]);

replaceInFile('lib/game/__tests__/game-logic.test.ts', [
  { from: /import \{[^}]+\} from '\.\.\/anime-cards-data';/g, to: "import { getRandomCards, calculateBaseDamage, calculateDamage, getElementAdvantage, determineRoundWinner } from '../game-logic';\nimport { ALL_CARDS } from '../cards-collection';" }
]);

replaceInFile('lib/game/bot-ai.ts', [
  { from: /element:\s*'ice'/g, to: "element: 'water'" }
]);

