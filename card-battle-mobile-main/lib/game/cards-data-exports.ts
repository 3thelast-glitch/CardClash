/**
 * cards-data-exports.ts
 *
 * يُوفّر exports مطلوبة من ملفات أخرى:
 *   - ALL_CARDS                 ← bot-ai.ts
 *   - getElementAdvantage       ← bot-ai.ts
 *   - applyElementalReactions   ← منطق المعركة (داخلي)
 *   - determineRoundWinner      ← game-context.tsx
 */

import { CARDS_BATCH_1 } from './cards-batch-1-fixed';
import { CARDS_BATCH_2 } from './cards-batch-2-fixed';
import { CARDS_BATCH_3 } from './cards-batch-3-fixed';
import { CARDS_BATCH_4 } from './cards-batch-4-fixed';
import { CARDS_BATCH_5 } from './cards-batch-5-fixed';
import { CARDS_BATCH_6 } from './cards-batch-6-fixed';
import { CARDS_BATCH_7 } from './cards-batch-7-fixed';
import { CARDS_BATCH_8 } from './cards-batch-8-fixed';
import {
  Card,
  Element,
  ElementAdvantage,
  Effect,
  ELEMENT_ADVANTAGES,
  ELEMENT_WEAKNESSES,
  ELEMENT_MULTIPLIER,
} from './types';
import { resolveSpecialAbility, applyOnSpawnPassive, applyPostBattlePassive } from './rage-engine';
import { applySpecialAbilityModifications } from './ui-helpers';

import { getRarityFromStars } from './card-rarity';

// re-export so callers can use them directly from this module if needed
export { resolveSpecialAbility, applyOnSpawnPassive, applyPostBattlePassive };

// ─── ALL_CARDS ────────────────────────────────────────────────────────────────
export const ALL_CARDS: Card[] = [
  ...CARDS_BATCH_1,
  ...CARDS_BATCH_2,
  ...CARDS_BATCH_3,
  ...CARDS_BATCH_4,
  ...CARDS_BATCH_5,
  ...CARDS_BATCH_6,
  ...CARDS_BATCH_7,
  ...CARDS_BATCH_8,
].map(card => ({
  ...card,
  rarity: getRarityFromStars(card.stars)
}));

// ─── getElementAdvantage ─────────────────────────────────────────────────────
export function getElementAdvantage(
  attacker: Element,
  defender: Element,
): ElementAdvantage {
  const advantages = ELEMENT_ADVANTAGES[attacker] ?? [];
  const weaknesses = ELEMENT_WEAKNESSES[attacker] ?? [];
  if (advantages.includes(defender)) return 'strong';
  if (weaknesses.includes(defender)) return 'weak';
  return 'neutral';
}

// ─── applyElementalReactions ─────────────────────────────────────────────────
//
// تُطبّق Buffs/Debuffs على نسخ مؤقتة — لا تعدّل البيانات الأصلية.
//
// جدول التفاعلات الكامل (7 تفاعلات):
// ┌─────────────────────────────┬───────────────────────────────────────────┐
// │ التفاعل                     │ التأثير                                   │
// ├─────────────────────────────┼───────────────────────────────────────────┤
// │ 1. ماء   ضد نار   (إخماد)  │ مهاجم: +4 hp    │ مدافع: −2 attack       │
// │ 2. برق   ضد ماء   (صعق)    │ مهاجم: +3 atk   │ مدافع: −2 atk, −1 def  │
// │ 3. برق   ضد ريح   (شحن)    │ مهاجم: +2 atk   │ مدافع: −2 def          │
// │ 4. أرض   ضد برق  (تأريض)  │ مهاجم: +4 def   │ مدافع: −3 attack       │
// │ 5. نار   ضد أرض  (صهر)    │ مهاجم: +2 atk   │ مدافع: −3 def          │
// │ 6. ريح   ضد أرض  (تعرية)  │ مهاجم: +3 atk   │ مدافع: −2 def          │
// │ 7. أرض   ضد ماء  (تجفيف)  │ مهاجم: +2 hp    │ مدافع: −2 def          │
// └─────────────────────────────┴───────────────────────────────────────────┘
//
export function applyElementalReactions(
  attacker: { attack: number; defense: number; hp?: number; element: Element },
  defender: { attack: number; defense: number; hp?: number; element: Element },
): void {
  const atk = attacker.element;
  const def = defender.element;

  // ─ 1. ماء ضد نار (إخماد) ────────────────────────────────────────────
  if (atk === 'water' && def === 'fire') {
    attacker.hp = (attacker.hp ?? 0) + 4;
    defender.attack = Math.max(1, defender.attack - 2);
    return;
  }

  // ─ 2. برق ضد ماء (صعق) ──────────────────────────────────────────────
  if (atk === 'lightning' && def === 'water') {
    attacker.attack += 3;
    defender.attack  = Math.max(1, defender.attack  - 2);
    defender.defense = Math.max(0, defender.defense - 1);
    return;
  }

  // ─ 3. برق ضد ريح (شحن) ──────────────────────────────────────────────
  if (atk === 'lightning' && def === 'wind') {
    attacker.attack += 2;
    defender.defense = Math.max(0, defender.defense - 2);
    return;
  }

  // ─ 4. أرض ضد برق (تأريض) ────────────────────────────────────────────
  if (atk === 'earth' && def === 'lightning') {
    attacker.defense += 4;
    defender.attack = Math.max(1, defender.attack - 3);
    return;
  }

  // ─ 5. نار ضد أرض (صهر الصخور) ───────────────────────────────────────
  if (atk === 'fire' && def === 'earth') {
    attacker.attack += 2;
    defender.defense = Math.max(0, defender.defense - 3);
    return;
  }

  // ─ 6. ريح ضد أرض (تعرية) ─────────────────────────────────────────────
  if (atk === 'wind' && def === 'earth') {
    attacker.attack += 3;
    defender.defense = Math.max(0, defender.defense - 2);
    return;
  }

  // ─ 7. أرض ضد ماء (تجفيف) ─────────────────────────────────────────────
  if (atk === 'earth' && def === 'water') {
    attacker.hp      = (attacker.hp ?? 0) + 2;
    defender.defense = Math.max(0, defender.defense - 2);
    return;
  }
}

// ─── determineRoundWinner ─────────────────────────────────────────────────────
interface RoundWinnerResult {
  winner: 'player' | 'bot' | 'draw';
  playerDamage: number;
  botDamage: number;
  playerBaseDamage: number;
  botBaseDamage: number;
  playerElementAdvantage: ElementAdvantage;
  botElementAdvantage: ElementAdvantage;
}

export function determineRoundWinner(
  playerCard: Card,
  botCard: Card,
  playerEffects: Effect[] = [],
  botEffects: Effect[] = [],
  _abilitiesEnabled = true,
): RoundWinnerResult {
  const playerHasMastery = playerEffects.some(e => e.kind === 'elementalMastery');
  const botHasMastery = botEffects.some(e => e.kind === 'elementalMastery');

  const playerAdv = playerHasMastery ? 'strong' : getElementAdvantage(playerCard.element, botCard.element);
  const botAdv    = botHasMastery ? 'strong' : getElementAdvantage(botCard.element,    playerCard.element);

  // ── 1. قدرات خاصة (Mihawk / Gehrman / Sanji) ─────────────────────────
  // تُفحص أولاً قبل أي حسابات إحصائية أو عناصر
  const playerSpecial = resolveSpecialAbility(playerCard, botCard);
  const botSpecial    = resolveSpecialAbility(botCard,    playerCard);

  if (playerSpecial === 'win' || botSpecial === 'lose') {
    return {
      winner: 'player',
      playerDamage: 0,
      botDamage: 0,
      playerBaseDamage: 0,
      botBaseDamage: 0,
      playerElementAdvantage: playerAdv,
      botElementAdvantage: botAdv,
    };
  }

  if (playerSpecial === 'lose' || botSpecial === 'win') {
    return {
      winner: 'bot',
      playerDamage: 0,
      botDamage: 0,
      playerBaseDamage: 0,
      botBaseDamage: 0,
      playerElementAdvantage: playerAdv,
      botElementAdvantage: botAdv,
    };
  }

  // ── 2. حسابات الإحصائيات العادية ─────────────────────────────────────
  const p = { attack: playerCard.attack, defense: playerCard.defense, hp: playerCard.hp, element: playerCard.element };
  const b = { attack: botCard.attack,    defense: botCard.defense,    hp: botCard.hp,    element: botCard.element };

  // Apply card special abilities (Ainz, Gojo, Sukuna, Makima, Kaido)
  applySpecialAbilityModifications(playerCard, botCard, p, b);

  applyElementalReactions(p, b);
  applyElementalReactions(b, p);

  const playerShield = playerEffects.some(e => e.kind === 'shieldGuard');
  const botShield = botEffects.some(e => e.kind === 'shieldGuard');

  const applySideEffects = (baseAtk: number, baseDef: number, effects: Effect[], cardClass: string, isShielded: boolean) => {
    let atk = baseAtk;
    let def = baseDef;
    for (const e of effects) {
      const d = e.data as any;
      const amount = d?.amount ?? 0;
      if (isShielded && amount < 0) continue;
      switch (e.kind) {
        case 'statModifier':
          if (d?.stat === 'all_stats' && d.targetClass === cardClass) {
            atk = Math.max(0, atk + amount);
            def = Math.max(0, def + amount);
            break;
          }
          if (d?.multiplier === true) {
            const multAmount = d.double === true ? (d.stat === 'attack' ? atk : def) : amount;
            if (d.stat === 'attack')  atk = Math.max(0, atk + multAmount);
            if (d.stat === 'defense') def = Math.max(0, def + multAmount);
          } else {
            if (d?.stat === 'attack')  atk = Math.max(0, atk + amount);
            if (d?.stat === 'defense') def = Math.max(0, def + amount);
          }
          break;
        case 'fortify':           def = Math.max(0, def + 1);  break;
        case 'greedBuff':         atk = Math.max(0, atk + 1);  break;
        case 'revengeBuff':       atk = Math.max(0, atk + 1);  break;
        case 'compensationBuff':  def = Math.max(0, def + 1);  break;
        case 'weakeningDebuff':   if (!isShielded) atk = Math.max(0, atk - 1);  break;
        case 'explosionDebuff':   if (!isShielded) def = Math.max(0, def - 1);  break;
        case 'phantomBlade':      atk = Math.max(0, atk + (d?.amount ?? 0));    break;
      }
    }
    return { atk, def };
  };

  const pStats = applySideEffects(p.attack, p.defense, playerEffects, playerCard.cardClass, playerShield);
  const bStats = applySideEffects(b.attack, b.defense, botEffects, botCard.cardClass, botShield);

  const playerRaw = pStats.atk * ELEMENT_MULTIPLIER[playerAdv];
  const botRaw    = bStats.atk * ELEMENT_MULTIPLIER[botAdv];

  const playerBaseDamage = Math.max(0, Math.floor(playerRaw));
  const botBaseDamage    = Math.max(0, Math.floor(botRaw));

  const playerDamage = Math.max(0, Math.floor(playerRaw - bStats.def));
  const botDamage    = Math.max(0, Math.floor(botRaw    - pStats.def));

  let winner: 'player' | 'bot' | 'draw';
  if      (playerDamage > botDamage) winner = 'player';
  else if (botDamage > playerDamage) winner = 'bot';
  else                               winner = 'draw';

  return {
    winner,
    playerDamage,
    botDamage,
    playerBaseDamage,
    botBaseDamage,
    playerElementAdvantage: playerAdv,
    botElementAdvantage:    botAdv,
  };
}
