/**
 * cards-data-exports.ts
 *
 * يُوفّر exports مطلوبة من ملفات أخرى:
 *   - ALL_CARDS                 ← bot-ai.ts
 *   - getFactionAdvantage       ← bot-ai.ts
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
  FactionAdvantage,
  Race,
  Effect,
  FACTION_ADVANTAGES,
  FACTION_MULTIPLIER,
} from './types';
import { resolveSpecialAbility, applyOnSpawnPassive, applyPostBattlePassive } from './rage-engine';
import { applyCombatCharacterSpecials } from './ui-helpers';
import { attachCardAlignments, getCardAlignment } from './card-alignment';

import { getRarityFromStars } from './card-rarity';
import { normalizeCardPower } from './card-power-balance';
import { rebalanceCardStats } from './card-stat-rebalance';
import { attachProfessionalCardAbilities } from './professional-card-abilities';

// re-export so callers can use them directly from this module if needed
export { resolveSpecialAbility, applyOnSpawnPassive, applyPostBattlePassive };

// ─── ALL_CARDS ────────────────────────────────────────────────────────────────
export const ALL_CARDS: Card[] = rebalanceCardStats(attachProfessionalCardAbilities(attachCardAlignments([
  ...CARDS_BATCH_1,
  ...CARDS_BATCH_2,
  ...CARDS_BATCH_3,
  ...CARDS_BATCH_4,
  ...CARDS_BATCH_5,
  ...CARDS_BATCH_6,
  ...CARDS_BATCH_7,
  ...CARDS_BATCH_8,
].map(card => ({
  ...normalizeCardPower({ ...card, rarity: card.rarity === 'special' ? 'special' : getRarityFromStars(card.stars) }),
})))));

// ─── getFactionAdvantage ─────────────────────────────────────────────────────
export function getFactionAdvantage(
  attacker: Race,
  defender: Race,
): FactionAdvantage {
  if (FACTION_ADVANTAGES[attacker] === defender) return 'strong';
  if (FACTION_ADVANTAGES[defender] === attacker) return 'weak';
  return 'neutral';
}


// ─── determineRoundWinner ─────────────────────────────────────────────────────
interface RoundWinnerResult {
  winner: 'player' | 'bot' | 'draw';
  playerDamage: number;
  botDamage: number;
  playerBaseDamage: number;
  botBaseDamage: number;
  playerFactionAdvantage: FactionAdvantage;
  botFactionAdvantage: FactionAdvantage;
  playerHealthDelta: number;
  botHealthDelta: number;
  playerEffectiveAttack: number;
  playerEffectiveDefense: number;
  botEffectiveAttack: number;
  botEffectiveDefense: number;
}

export function determineRoundWinner(
  playerCard: Card,
  botCard: Card,
  playerEffects: Effect[] = [],
  botEffects: Effect[] = [],
  _abilitiesEnabled = true,
  combatContext: { playerScore?: number; botScore?: number } = {},
): RoundWinnerResult {
  const playerHasMastery = playerEffects.some(e => e.kind === 'factionMastery');
  const botHasMastery = botEffects.some(e => e.kind === 'factionMastery');

  const playerAdv = playerHasMastery ? 'strong' : getFactionAdvantage(playerCard.race, botCard.race);
  const botAdv    = botHasMastery ? 'strong' : getFactionAdvantage(botCard.race,    playerCard.race);

  // ── 1. قدرات خاصة (Mihawk / Gehrman / Sanji) ─────────────────────────
  // تُفحص أولاً قبل أي حسابات إحصائية أو أفضلية فصائل
  const playerSpecial = resolveSpecialAbility(playerCard, botCard);
  const botSpecial    = resolveSpecialAbility(botCard,    playerCard);

  if (playerSpecial === 'win' || botSpecial === 'lose') {
    return {
      winner: 'player',
      playerDamage: 0,
      botDamage: 0,
      playerBaseDamage: 0,
      botBaseDamage: 0,
      playerFactionAdvantage: playerAdv,
      botFactionAdvantage: botAdv,
      playerHealthDelta: 0,
      botHealthDelta: 0,
      playerEffectiveAttack: playerCard.attack,
      playerEffectiveDefense: playerCard.defense,
      botEffectiveAttack: botCard.attack,
      botEffectiveDefense: botCard.defense,
    };
  }

  if (playerSpecial === 'lose' || botSpecial === 'win') {
    return {
      winner: 'bot',
      playerDamage: 0,
      botDamage: 0,
      playerBaseDamage: 0,
      botBaseDamage: 0,
      playerFactionAdvantage: playerAdv,
      botFactionAdvantage: botAdv,
      playerHealthDelta: 0,
      botHealthDelta: 0,
      playerEffectiveAttack: playerCard.attack,
      playerEffectiveDefense: playerCard.defense,
      botEffectiveAttack: botCard.attack,
      botEffectiveDefense: botCard.defense,
    };
  }

  // ── 2. حسابات الإحصائيات العادية ─────────────────────────────────────
  const p = { attack: playerCard.attack, defense: playerCard.defense, hp: playerCard.hp };
  const b = { attack: botCard.attack,    defense: botCard.defense,    hp: botCard.hp };

  // Apply card special abilities (Ainz, Gojo, Sukuna, Makima, Kaido)
  const professionalHealth = applyCombatCharacterSpecials(
    playerCard,
    botCard,
    p,
    b,
    { ownScore: combatContext.playerScore, opponentScore: combatContext.botScore },
    { ownScore: combatContext.botScore, opponentScore: combatContext.playerScore },
  );

  const playerShield = playerEffects.some(e => e.kind === 'shieldGuard');
  const botShield = botEffects.some(e => e.kind === 'shieldGuard');

  const applySideEffects = (
    baseAtk: number,
    baseDef: number,
    effects: Effect[],
    cardClass: string,
    cardAlignment: Card['alignment'],
    cardRace: Card['race'],
    isShielded: boolean,
    ownScore?: number,
    opponentScore?: number,
    protections: { ignoreFirstDefensePenalty?: boolean; ignoreFirstStatPenalty?: boolean; cancelFirstAttackBuff?: boolean } = {},
  ) => {
    let atk = baseAtk;
    let def = baseDef;
    let ignoredDefensePenalty = false;
    let ignoredStatPenalty = false;
    let cancelledAttackBuff = false;
    for (const e of effects) {
      const d = e.data as any;
      const amount = d?.amount ?? 0;
      if (d?.alignment && d.alignment !== cardAlignment) continue;
      if (Array.isArray(d?.races) && !d.races.includes(cardRace)) continue;
      if (typeof d?.requiresHealthDeficit === 'number'
        && (ownScore === undefined || opponentScore === undefined || ownScore > opponentScore - d.requiresHealthDeficit)) continue;
      if (isShielded && amount < 0) continue;
      if (amount < 0 && protections.ignoreFirstStatPenalty && !ignoredStatPenalty) {
        ignoredStatPenalty = true;
        continue;
      }
      if (amount < 0 && d?.stat === 'defense' && protections.ignoreFirstDefensePenalty && !ignoredDefensePenalty) {
        ignoredDefensePenalty = true;
        continue;
      }
      if (amount > 0 && d?.stat === 'attack' && protections.cancelFirstAttackBuff && !cancelledAttackBuff) {
        cancelledAttackBuff = true;
        continue;
      }
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

  // تسجل القدرات الخاصة أي زيادة صحة فعلية للمباراة.
  const playerHealthDelta = Math.max(0, (p.hp ?? 0) - (playerCard.hp ?? 0)) + professionalHealth.playerHealthBonus;
  const botHealthDelta = Math.max(0, (b.hp ?? 0) - (botCard.hp ?? 0)) + professionalHealth.botHealthBonus;

  const pStats = applySideEffects(p.attack, p.defense, playerEffects, playerCard.cardClass, getCardAlignment(playerCard), playerCard.race, playerShield, combatContext.playerScore, combatContext.botScore, {
    ignoreFirstDefensePenalty: professionalHealth.playerIgnoreFirstDefensePenalty,
    ignoreFirstStatPenalty: professionalHealth.playerIgnoreFirstStatPenalty,
    cancelFirstAttackBuff: professionalHealth.botCancelOpponentAttackBuff,
  });
  const bStats = applySideEffects(b.attack, b.defense, botEffects, botCard.cardClass, getCardAlignment(botCard), botCard.race, botShield, combatContext.botScore, combatContext.playerScore, {
    ignoreFirstDefensePenalty: professionalHealth.botIgnoreFirstDefensePenalty,
    ignoreFirstStatPenalty: professionalHealth.botIgnoreFirstStatPenalty,
    cancelFirstAttackBuff: professionalHealth.playerCancelOpponentAttackBuff,
  });

  const playerRaw = pStats.atk * FACTION_MULTIPLIER[playerAdv];
  const botRaw    = bStats.atk * FACTION_MULTIPLIER[botAdv];

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
    playerFactionAdvantage: playerAdv,
    botFactionAdvantage:    botAdv,
    playerHealthDelta,
    botHealthDelta,
    playerEffectiveAttack: pStats.atk,
    playerEffectiveDefense: pStats.def,
    botEffectiveAttack: bStats.atk,
    botEffectiveDefense: bStats.def,
  };
}
