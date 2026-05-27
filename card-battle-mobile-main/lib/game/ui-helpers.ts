import { Effect, Side, Card } from './types';

export type PredictionSelections = Record<number, 'win' | 'loss'>;

export const getUpcomingPredictionRounds = (currentRound: number, totalRounds: number) =>
  [currentRound + 1, currentRound + 2].filter((round) => round <= totalRounds);

export const getRemainingRounds = (currentRound: number, totalRounds: number) =>
  Array.from(
    { length: Math.max(0, totalRounds - currentRound) },
    (_, index) => currentRound + 1 + index
  );

export const isPredictionComplete = (
  upcomingRounds: number[],
  selections: PredictionSelections
) =>
  upcomingRounds.length > 0 && upcomingRounds.every((round) => selections[round]);

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
  oppStats?: { attack: number; defense: number }
) {
  const ownId = ownCard.id;

  // 1. Ainz Ooal Gown (ainz_ooal_gown) / Death Note / Ryuk: cancels defender defense
  if (ownId === 'ainz_ooal_gown' && oppStats) {
    oppStats.defense = 0;
  }
  if (opponentCard?.id === 'ainz_ooal_gown') {
    ownStats.defense = 0;
  }

  // 2. Gojo (satoru_gojo): Infinity (defense = 99)
  if (ownId === 'satoru_gojo') {
    ownStats.defense = 99;
  }

  // 3. Sukuna (ryomen_sukuna): Curses / high attack boost (+6)
  if (ownId === 'ryomen_sukuna') {
    ownStats.attack += 6;
  }

  // 4. Makima (makima): control opponent (steal 4 attack)
  if (ownId === 'makima') {
    ownStats.attack += 4;
    if (oppStats) {
      oppStats.attack = Math.max(0, oppStats.attack - 4);
    }
  }
  if (opponentCard?.id === 'makima') {
    ownStats.attack = Math.max(0, ownStats.attack - 4);
  }

  // 5. Kaido (kaido): +4 defense and +2 attack
  if (ownId === 'kaido') {
    ownStats.defense += 4;
    ownStats.attack += 2;
  }
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
  ownCard?: Card
): { attack: number; defense: number } {
  let atk = baseAttack;
  let def = baseDefense;

  // Apply card special abilities first
  if (ownCard) {
    const ownStats = { attack: atk, defense: def };
    applySpecialAbilityModifications(ownCard, opponentCard ?? null, ownStats);
    atk = ownStats.attack;
    def = ownStats.defense;
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

      default:
        break;
    }
  }

  return { attack: Math.max(0, atk), defense: Math.max(0, def) };
}
