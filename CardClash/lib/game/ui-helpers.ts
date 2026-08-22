import { Effect, Side, Card } from './types';
import { getCharacterAbility } from './character-abilities';
import {
  getProfessionalCombatModifiers,
  type ProfessionalCombatContext,
} from './professional-card-abilities';
import { getCardAlignment } from './card-alignment';

export type PredictionSelections = Record<number, 'win' | 'loss'>;

export const getUpcomingPredictionRounds = (currentRound: number, totalRounds: number) =>
  [currentRound + 1, currentRound + 2].filter((round) => round <= totalRounds);

export const getRemainingRounds = (currentRound: number, totalRounds: number) =>
  Array.from(
    { length: Math.max(0, totalRounds - currentRound) },
    (_, index) => currentRound + 1 + index
  );

/** الكرت الخاص يروي قصته عند ظهوره؛ أما الكرت العادي فلا يسمع صوته إلا إذا فاز بالجولة. */
export const shouldPlayRoundCardAudio = (
  card: Pick<Card, 'rarity'> | null | undefined,
  isCardVisibleInRound: boolean,
  didWinRound: boolean,
): boolean => Boolean(card && isCardVisibleInRound && (card.rarity === 'special' || didWinRound));

export const isPredictionComplete = (
  upcomingRounds: number[],
  selections: PredictionSelections
) =>
  upcomingRounds.length > 0 && upcomingRounds.every((round) => selections[round]);

/** هل يؤثر تعديل الإحصاء على الكرت الظاهر الآن فعلاً؟ */
export function doesEffectApplyToCard(
  effect: Effect,
  card: Card | null | undefined,
  ownScore?: number,
  opponentScore?: number,
): boolean {
  if (effect.kind !== 'statModifier') return true;
  const data = effect.data ?? {};
  if (data.alignment && card && data.alignment !== getCardAlignment(card)) return false;
  if (data.races && card && !data.races.includes(card.race)) return false;
  if (typeof data.requiresHealthDeficit === 'number'
    && (ownScore === undefined || opponentScore === undefined || ownScore > opponentScore - data.requiresHealthDeficit)) return false;
  if (data.stat === 'all_stats' && data.targetClass && card && data.targetClass !== card.cardClass) return false;
  return true;
}

export type DirectStatReason = { stat: 'attack' | 'defense'; amount: number; label: string };

/** أسباب قدرات الشخصيات المباشرة التي لا تُخزن كتأثير نشط في GameState. */
export function getDirectCharacterStatReasons(
  ownCard: Card | null | undefined,
  opponentCard: Card | null | undefined,
  context: ProfessionalCombatContext = {},
  opponentContext: ProfessionalCombatContext = {},
): DirectStatReason[] {
  if (!ownCard) return [];
  const ownStats = { attack: ownCard.attack, defense: ownCard.defense };
  applySpecialAbilityModifications(ownCard, opponentCard ?? null, ownStats, undefined, context);
  const ownAbility = getCharacterAbility(ownCard);
  const reasons: DirectStatReason[] = [];
  const ownLabel = ownAbility ? `${ownCard.nameAr ?? ownCard.name} — ${ownAbility.nameAr}` : `${ownCard.nameAr ?? ownCard.name} — قدرة الشخصية`;
  const opponentAbility = opponentCard ? getCharacterAbility(opponentCard) : undefined;
  const opponentModifiers = opponentAbility?.statModifiers;
  const opponentModifierApplies = !opponentModifiers?.opponentRaces
    || !!ownCard && opponentModifiers.opponentRaces.includes(ownCard.race);
  const inheritedAttackPenalty = opponentModifierApplies ? (opponentModifiers?.opponentAttackPenalty ?? 0) : 0;
  if (inheritedAttackPenalty > 0 && opponentCard && opponentAbility) {
    reasons.push({ stat: 'attack', amount: -inheritedAttackPenalty, label: `${opponentCard.nameAr ?? opponentCard.name} — ${opponentAbility.nameAr}` });
  }
  const ownAttackChange = ownStats.attack - ownCard.attack + inheritedAttackPenalty;
  const ownDefenseChange = ownStats.defense - ownCard.defense;
  if (ownAttackChange !== 0 && ownAbility) reasons.push({ stat: 'attack', amount: ownAttackChange, label: ownLabel });
  if (ownDefenseChange !== 0 && ownAbility) reasons.push({ stat: 'defense', amount: ownDefenseChange, label: ownLabel });

  if (opponentCard) {
    const opponentModifiers = getProfessionalCombatModifiers(
      opponentCard,
      ownCard,
      { attack: opponentCard.attack, defense: opponentCard.defense },
      { attack: ownStats.attack, defense: ownStats.defense },
      opponentContext,
    );
    const opponentLabel = opponentAbility ? `${opponentCard.nameAr ?? opponentCard.name} — ${opponentAbility.nameAr}` : `${opponentCard.nameAr ?? opponentCard.name} — قدرة الخصم`;
    if (opponentModifiers.opponentAttackPenalty) reasons.push({ stat: 'attack', amount: -opponentModifiers.opponentAttackPenalty, label: opponentLabel });
    if (opponentModifiers.opponentDefensePenalty) reasons.push({ stat: 'defense', amount: -opponentModifiers.opponentDefensePenalty, label: opponentLabel });
  }
  return reasons;
}

export const buildPredictionSummary = (activeEffects: Effect[], sourceSide: Side = 'player') => {
  const predictionEffect = activeEffects.find(
    (effect) => effect.kind === 'prediction' && effect.sourceSide === sourceSide
  );
  const predictions =
    (predictionEffect?.data as { predictions?: Record<number, 'win' | 'loss'> } | undefined)
      ?.predictions ?? {};
  const entries = Object.entries(predictions)
    .map(([round, outcome]) => ({ round: Number(round), outcome }))
    .filter((entry) => !Number.isNaN(entry.round))
    .sort((a, b) => a.round - b.round)
    .map((entry) => `Round ${entry.round}: ${entry.outcome === 'win' ? 'Win' : 'Loss'}`);
  return entries.length > 0 ? entries.join(' | ') : '';
};

/**
 * Applies matchup-based and self-buff special abilities to stats.
 */
export function applySpecialAbilityModifications(
  ownCard: Card,
  opponentCard: Card | null,
  ownStats: { attack: number; defense: number },
  oppStats?: { attack: number; defense: number },
  context: ProfessionalCombatContext = {},
): ProfessionalCombatContext & ReturnType<typeof getProfessionalCombatModifiers> {
  const ownModifiers = getCharacterAbility(ownCard)?.statModifiers;
  const opponentModifiers = opponentCard
    ? getCharacterAbility(opponentCard)?.statModifiers
    : undefined;

  const ownModifierApplies = !ownModifiers?.opponentRaces
    || !!opponentCard && ownModifiers.opponentRaces.includes(opponentCard.race);
  const opponentModifierApplies = !opponentModifiers?.opponentRaces
    || !!ownCard && opponentModifiers.opponentRaces.includes(ownCard.race);

  if (ownModifierApplies && ownModifiers?.cancelOpponentDefense && oppStats) {
    oppStats.defense = 0;
  }
  if (!oppStats && opponentModifierApplies && opponentModifiers?.cancelOpponentDefense) {
    ownStats.defense = 0;
  }

  if (ownModifierApplies && ownModifiers?.defenseOverride !== undefined) {
    ownStats.defense = ownModifiers.defenseOverride;
  }
  ownStats.attack += ownModifierApplies ? (ownModifiers?.attackBonus ?? 0) : 0;
  ownStats.defense += ownModifierApplies ? (ownModifiers?.defenseBonus ?? 0) : 0;

  if (ownModifierApplies && ownModifiers?.opponentAttackPenalty && oppStats) {
    oppStats.attack = Math.max(0, oppStats.attack - ownModifiers.opponentAttackPenalty);
  }
  if (!oppStats && opponentModifierApplies && opponentModifiers?.opponentAttackPenalty) {
    ownStats.attack = Math.max(0, ownStats.attack - opponentModifiers.opponentAttackPenalty);
  }

  if (opponentCard) {
    const professional = getProfessionalCombatModifiers(ownCard, opponentCard, ownStats, oppStats ?? { attack: 0, defense: 0 }, context);
    ownStats.attack = Math.max(0, ownStats.attack + (professional.attackBonus ?? 0) - (professional.ownAttackPenalty ?? 0));
    ownStats.defense = Math.max(0, ownStats.defense + (professional.defenseBonus ?? 0) - (professional.ownDefensePenalty ?? 0));
    if (oppStats) {
      oppStats.attack = Math.max(0, oppStats.attack - (professional.opponentAttackPenalty ?? 0));
      oppStats.defense = Math.max(0, oppStats.defense - (professional.opponentDefensePenalty ?? 0));
    }
    return professional;
  }
  return {};
}

/**
 * يطبق قدرات الشخصيات الإحصائية على طرفي الجولة قبل حساب الضرر.
 * ترتيب الاستدعاء ثابت لضمان تماثل المنطق للاعب والبوت.
 */
export function applyCombatCharacterSpecials(
  playerCard: Card,
  botCard: Card,
  playerStats: { attack: number; defense: number },
  botStats: { attack: number; defense: number },
  playerContext: ProfessionalCombatContext = {},
  botContext: ProfessionalCombatContext = {},
) {
  const playerProfessional = applySpecialAbilityModifications(playerCard, botCard, playerStats, botStats, playerContext);
  const botProfessional = applySpecialAbilityModifications(botCard, playerCard, botStats, playerStats, botContext);
  return {
    playerHealthBonus: playerProfessional.ownHealthBonus ?? 0,
    botHealthBonus: botProfessional.ownHealthBonus ?? 0,
    playerIgnoreFirstDefensePenalty: playerProfessional.ignoreFirstDefensePenalty,
    botIgnoreFirstDefensePenalty: botProfessional.ignoreFirstDefensePenalty,
    playerIgnoreFirstStatPenalty: playerProfessional.ignoreFirstStatPenalty,
    botIgnoreFirstStatPenalty: botProfessional.ignoreFirstStatPenalty,
    playerCancelOpponentAttackBuff: playerProfessional.cancelFirstOpponentAttackBuff,
    botCancelOpponentAttackBuff: botProfessional.cancelFirstOpponentAttackBuff,
  };
}

/**
 * يحسب قيم الهجوم والدفاع الفعلية للكرت بعد تطبيق كل التأثيرات النشطة.
 *
 * ✅ إصلاح: game-context يخزن القيمة في `data.amount` — لذا نقرأ `amount` هنا.
 *
 * أنواع التأثيرات المدعومة:
 *  - statModifier  : stat='attack'|'defense' + amount (موجب=buff، سالب=debuff)
 *  - statModifier  : stat='attack' + multiplier=true + amount (مضاعفة)
 *  - statModifier  : stat='elementalOverride' (تجاهل، لا يؤثر على الأرقام)
 *  - fortify/greedBuff/revengeBuff/compensationBuff/weakeningDebuff/explosionDebuff:
 *      تُعالَج كـ statModifier بعد تحويلها في PLAY_ROUND — لا حاجة لمعالجتها هنا
 */
export function getEffectiveStats(
  baseAttack: number,
  baseDefense: number,
  effects: Effect[],
  side: Side,
  cardClass?: string,
  opponentCard?: Card | null,
  ownCard?: Card,
  context: ProfessionalCombatContext = {},
  opponentContext: ProfessionalCombatContext = {},
): { attack: number; defense: number } {
  let atk = baseAttack;
  let def = baseDefense;

  // Apply card special abilities first
  if (ownCard) {
    const ownStats = { attack: atk, defense: def };
    applySpecialAbilityModifications(ownCard, opponentCard ?? null, ownStats, undefined, context);
    atk = ownStats.attack;
    def = ownStats.defense;

    // المعركة الفعلية تطبق خصومات القدرة الاحترافية على الطرف الآخر.
    // نكرر ذلك في معاينة الكرت كي يرى اللاعب التخفيض أو الزيادة قبل الحسم.
    if (opponentCard) {
      const opponentModifiers = getProfessionalCombatModifiers(
        opponentCard,
        ownCard,
        { attack: opponentCard.attack, defense: opponentCard.defense },
        { attack: atk, defense: def },
        opponentContext,
      );
      atk = Math.max(0, atk - (opponentModifiers.opponentAttackPenalty ?? 0));
      def = Math.max(0, def - (opponentModifiers.opponentDefensePenalty ?? 0));
    }
  }

  const isShielded = effects.some(e => e.kind === 'shieldGuard' && (e.targetSide === side || e.targetSide === 'all'));

  for (const eff of effects) {
    // تجاهل التأثيرات التي لا تستهدف هذا الجانب
    if (eff.targetSide !== side && eff.targetSide !== 'all') continue;

    const data = (eff.data ?? {}) as Record<string, unknown>;
    const amount = typeof data.amount === 'number' ? data.amount : 0;

    if (isShielded && amount < 0) continue;

    switch (eff.kind) {
      case 'statModifier': {
        if (!doesEffectApplyToCard(eff, ownCard, context.ownScore, context.opponentScore)) break;
        // تجاهل elementalOverride — لا يؤثر على القيم المعروضة
        if (data.stat === 'elementalOverride') break;

        // بروباغاندا - تضعيف فئة معينة
        if (data.stat === 'all_stats' && cardClass && data.targetClass === cardClass) {
          atk = Math.max(0, atk + amount);
          def = Math.max(0, def + amount);
          break;
        }

        // مضاعفة (DoubleNextCards / DoublePoints)
        if (data.multiplier === true) {
          const multAmount = data.double === true ? (data.stat === 'attack' ? atk : def) : amount;
          if (data.stat === 'attack')  atk = Math.max(0, atk + multAmount);
          if (data.stat === 'defense') def = Math.max(0, def + multAmount);
          break;
        }

        // تعديل عادي (buff / debuff)
        if (data.stat === 'attack')  atk = Math.max(0, atk + amount);
        if (data.stat === 'defense') def = Math.max(0, def + amount);
        break;
      }

      // التأثيرات التي تُحوَّل لاحقاً إلى statModifier في PLAY_ROUND
      // نطبقها مباشرة هنا لعرض معاينة صحيحة على الكارت قبل الجولة
      case 'fortify':           def = Math.max(0, def + 1);  break; // Reinforcement: +1 دفاع عند الفوز
      case 'greedBuff':         atk = Math.max(0, atk + 1);  break; // Greed: +1 هجوم عند الفوز
      case 'revengeBuff':       atk = Math.max(0, atk + 1);  break; // Revenge: +1 هجوم عند الخسارة
      case 'compensationBuff':  def = Math.max(0, def + 1);  break; // Compensation: +1 دفاع عند الخسارة
      case 'weakeningDebuff':   if (!isShielded) atk = Math.max(0, atk - 1);  break; // Weakening: -1 هجوم للخصم
      case 'explosionDebuff':   if (!isShielded) def = Math.max(0, def - 1);  break; // Explosion: -1 دفاع للخصم
      case 'phantomBlade':       atk = Math.max(0, atk + (typeof data.amount === 'number' ? data.amount : 0));  break; // PhantomBlade: هجوم مضاعف

      default:
        break;
    }
  }

  return { attack: Math.max(0, atk), defense: Math.max(0, def) };
}
