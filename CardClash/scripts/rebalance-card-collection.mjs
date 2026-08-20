import { readFile, writeFile } from 'node:fs/promises';

const ranges = {
  common: { minStat: 0, maxStat: 12 },
  rare: { minStat: 13, maxStat: 20 },
  epic: { minStat: 21, maxStat: 30 },
  legendary: { minStat: 31, maxStat: 40 },
};

const statPairKey = (attack, defense) => `${attack}-${defense}`;

function getRarity(card) {
  if (card.rarity === 'special') return 'special';
  if (card.rarity) return card.rarity;
  if (!card.stars || card.stars <= 2) return 'common';
  if (card.stars === 3) return 'rare';
  if (card.stars === 4) return 'epic';
  return 'legendary';
}

function getPairs(rarity) {
  const { minStat, maxStat } = ranges[rarity];
  const pairs = [];
  for (let attack = minStat; attack <= maxStat; attack += 1) {
    for (let defense = minStat; defense <= maxStat; defense += 1) {
      if (attack !== defense) pairs.push({ attack, defense });
    }
  }
  return pairs.sort((a, b) => (a.attack + a.defense) - (b.attack + b.defense)
    || a.attack - b.attack || a.defense - b.defense);
}

function rebalanceCardStats(cards) {
  const results = new Map();
  const groups = new Map();
  const usedPairs = new Set();
  for (const card of cards) {
    const rarity = getRarity(card);
    if (rarity === 'special') {
      const attack = Math.max(0, Math.round(card.attack));
      const defense = Math.max(0, Math.round(card.defense));
      const attackHeavy = [...card.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2 === 0;
      let nextAttack = attack === defense && attackHeavy ? attack + 1 : attack;
      let nextDefense = attack === defense && !attackHeavy ? defense + 1 : defense;
      while (usedPairs.has(statPairKey(nextAttack, nextDefense))) {
        if (nextAttack < nextDefense) nextAttack += 2;
        else nextDefense += 2;
      }
      usedPairs.add(statPairKey(nextAttack, nextDefense));
      results.set(card.id, {
        ...card,
        rarity,
        attack: nextAttack,
        defense: nextDefense,
      });
      continue;
    }
    const group = groups.get(rarity) ?? [];
    group.push(card);
    groups.set(rarity, group);
  }
  for (const [rarity, group] of groups) {
    const pairs = getPairs(rarity).filter(pair => !usedPairs.has(statPairKey(pair.attack, pair.defense)));
    const ranked = [...group].sort((a, b) => (a.attack + a.defense) - (b.attack + b.defense)
      || a.attack - b.attack || a.defense - b.defense || a.id.localeCompare(b.id));
    ranked.forEach((card, index) => {
      const pairIndex = ranked.length === 1
        ? Math.floor((pairs.length - 1) / 2)
        : Math.round((index * (pairs.length - 1)) / (ranked.length - 1));
      const pair = pairs[pairIndex];
      usedPairs.add(statPairKey(pair.attack, pair.defense));
      results.set(card.id, { ...card, rarity, attack: pair.attack, defense: pair.defense });
    });
  }
  return cards.map(card => results.get(card.id) ?? card);
}

const target = new URL('../data/card-collection.json', import.meta.url);
const collection = JSON.parse(await readFile(target, 'utf8'));
const entries = Object.entries(collection.cardEdits ?? {});
const sourceCards = entries.map(([id, edits]) => ({ id, ...edits }));
const balancedCards = rebalanceCardStats(sourceCards);
const previousPairs = new Map(sourceCards.map(card => [card.id, `${card.attack}-${card.defense}`]));
const changed = balancedCards.filter(card => previousPairs.get(card.id) !== `${card.attack}-${card.defense}`).length;

collection.cardEdits = Object.fromEntries(balancedCards.map(card => {
  const { id, ...edits } = card;
  return [id, edits];
}));
collection.exportedAt = new Date().toISOString();

await writeFile(target, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');
console.log(`Rebalanced ${balancedCards.length} Card Collection entries; changed ${changed} attack/defense pairs.`);
