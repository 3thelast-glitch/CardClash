/**
 * rage-engine.ts
 * منطق تفعيل وضع الغضب + القدرات الخاصة بالبطاقات أثناء المعركة
 *
 * الاستخدام:
 *   import { shouldTriggerRage, applyRageToCard, buildRageState } from '@/lib/game/rage-engine';
 *   import { sortDeckWithTurinFirst, isTurinForcedLoss, resolveSpecialAbility, applyOnSpawnPassive, applyPostBattlePassive } from '@/lib/game/rage-engine';
 */
import type { Card, RageModeData } from './types';

// ─────────────────────────────────────────────
// RAGE STATE
// ─────────────────────────────────────────────

export interface RageState {
  /** البطاقات التي فعّلت وضع الغضب بالفعل في هذه المباراة */
  activatedThisMatch: Set<string>;
}

export function buildRageState(): RageState {
  return { activatedThisMatch: new Set() };
}

/**
 * هل يجب تفعيل وضع الغضب لهذه البطاقة بعد خسارتها؟
 *
 * الشروط:
 *   1. البطاقة لديها rageMode.enabled = true
 *   2. إذا كانت oncePer = 'match' → لم تُفعَّل بعد في هذه المباراة
 *   3. إذا كانت oncePer = 'unlimited' → تتفعل في كل خسارة
 */
export function shouldTriggerRage(
  card: Card,
  rageState: RageState,
): boolean {
  const rm = card.rageMode;
  if (!rm?.enabled) return false;
  if (rm.oncePer === 'match' && rageState.activatedThisMatch.has(card.id)) return false;
  return true;
}

/**
 * طبّق وضع الغضب على البطاقة — يُعيد نسخة جديدة من البطاقة بإحصائيات وصورة مُعدَّلة
 */
export function applyRageToCard(card: Card, rageState: RageState): Card {
  const rm = card.rageMode as RageModeData;

  // تسجيل التفعيل إذا كانت oncePer = 'match'
  if (rm.oncePer === 'match') {
    rageState.activatedThisMatch.add(card.id);
  }

  const hasRageImageOnly = !!(rm.rageImageUrl || (rm as any).image) && !(rm.rageVideoUrl || (rm as any).video);
  const newImageUrl = rm.rageImageUrl || (rm as any).image || card.imageUrl;
  const newVideoUrl = hasRageImageOnly ? undefined : (rm.rageVideoUrl || (rm as any).video || card.videoUrl);
  const hasNewRageMedia = !!(rm.rageImageUrl || (rm as any).image || rm.rageVideoUrl || (rm as any).video);

  return {
    ...card,
    isRagedVersion: true,
    originalAttack: card.attack,
    originalDefense: card.defense,
    attack:  card.attack  + (rm.rageAttackBoost  ?? 0),
    defense: card.defense + (rm.rageDefenseBoost ?? 0),
    nameAr:  rm.rageNameAr ?? card.nameAr,
    imageUrl: newImageUrl,
    videoUrl: newVideoUrl,
    ...(hasNewRageMedia && {
      customImage: undefined,
      finalImage:  undefined,
      localImage:  undefined,
      ...(hasRageImageOnly && { videoUrl: undefined }),
    }),
    _rageActive: true,
  } as Card & { _rageActive: boolean };
}

/** معلومات الغضب التي تُمرَّر للـ UI عند التفعيل */
export interface RageTriggerEvent {
  card: Card;
  rageCard: Card;
  videoUrl?: string;
  imageUrl?: string;
}

/**
 * بناء حدث الغضب الكامل (يُستخدم لعرض الـ overlay / الفيديو)
 */
export function buildRageTriggerEvent(original: Card, rageCard: Card): RageTriggerEvent {
  return {
    card:     original,
    rageCard,
    videoUrl: original.rageMode?.rageVideoUrl ?? (original as any).videoUrl,
    imageUrl: original.rageMode?.rageImageUrl ?? original.imageUrl,
  };
}

// ─────────────────────────────────────────────
// SPECIAL ABILITIES — القدرات الخاصة بالبطاقات
// ─────────────────────────────────────────────

export type BattleResult = 'win' | 'lose' | 'draw';

/**
 * Turin — يُرتَّب أول الفريق إجباريًا عند بدء المباراة
 * استدعِ هذه الدالة عند بناء ترتيب الفريق أو عند حفظه
 */
export function sortDeckWithTurinFirst(deck: Card[]): Card[] {
  const turin = deck.find(
    c => (c as any).nameEn === 'Turin' || c.nameAr === 'تورين',
  );
  if (!turin) return deck;
  return [turin, ...deck.filter(c => c.id !== turin.id)];
}

/**
 * Turin — قدرة "تخسر نصف الجولات"
 *
 * المنطق: الجولات من 1 إلى floor(totalRounds / 2) → خسارة إجبارية تلقائية
 *
 * أمثلة:
 *   totalRounds =  6  →  forcedLoss = 3  → الجولات 1-3 خسارة
 *   totalRounds = 10  →  forcedLoss = 5  → الجولات 1-5 خسارة
 *   totalRounds =  7  →  forcedLoss = 3  → الجولات 1-3 خسارة
 *   totalRounds = 20  →  forcedLoss = 10 → الجولات 1-10 خسارة
 *
 * استدعِها قبل أي حساب للجولة:
 *   if (isTurinForcedLoss(currentRound, totalRounds, playerDeck)) → نتيجة 'lose'
 *
 * @param currentRound  رقم الجولة الحالية (يبدأ من 1)
 * @param totalRounds   إجمالي عدد الجولات في المباراة
 * @param playerDeck    قائمة بطاقات اللاعب
 */
export function isTurinForcedLoss(
  currentRound: number,
  totalRounds: number,
  playerDeck: Card[],
): boolean {
  const hasTurin = playerDeck.some(
    c => (c as any).nameEn === 'Turin' || c.nameAr === 'تورين',
  );
  if (!hasTurin) return false;

  const forcedLossRounds = Math.floor(totalRounds / 2);
  return currentRound <= forcedLossRounds;
}

/**
 * applyOnSpawnPassive
 * تُطبَّق عند نزول البطاقة للميدان
 *
 * - Tsunade → +2 صحة عند الدخول
 */
export function applyOnSpawnPassive(card: Card): Card {
  if ((card as any).nameEn === 'Tsunade' || card.nameAr === 'تسونادي') {
    return { ...card, hp: ((card as any).hp ?? (card as any).health ?? 0) + 2 };
  }
  return card;
}

/**
 * resolveSpecialAbility
 * يفحص قبل المقارنة العادية إذا كانت هناك قدرة تحسم النتيجة
 *
 * يُعيد: 'win' | 'lose'  أو  null (= سير المعركة الطبيعي)
 *
 * القدرات المدعومة:
 *   - Dracule Mihawk → ينتصر على جميع السيافين  (tag: 'swordsman')
 *   - Gehrman        → يصطاد جميع الوحوش        (tag: 'monster' | 'beast')
 *   - Sanji          → يخسر من جميع النساء      (tag: 'female' | 'woman')
 */
export function resolveSpecialAbility(
  attacker: Card,
  defender: Card,
): BattleResult | null {
  const defTags: string[] = ((defender as any).tags ?? []).map((t: string) => t.toLowerCase());
  const attackerName = ((attacker as any).nameEn ?? '').toLowerCase();

  // Dracule Mihawk
  if (
    (attackerName === 'dracule mihawk' || attacker.nameAr === 'دراكيول ميهوك') &&
    (defTags.includes('swordsman') || defTags.includes('sword'))
  ) {
    return 'win';
  }

  // Gehrman
  if (
    (attackerName === 'gehrman' || attacker.nameAr === 'غيرمان') &&
    (defTags.includes('monster') || defTags.includes('beast') || defTags.includes('وحش'))
  ) {
    return 'win';
  }

  // Sanji
  if (
    (attackerName === 'sanji' || attacker.nameAr === 'سانجي') &&
    (defTags.includes('female') || defTags.includes('woman') || defTags.includes('أنثى'))
  ) {
    return 'lose';
  }

  return null;
}

/**
 * applyPostBattlePassive
 * يُطبَّق بعد انتهاء المواجهة على المهاجم
 *
 * - Sakura Haruno → +1 صحة عند الفوز فقط
 */
export function applyPostBattlePassive(card: Card, result: BattleResult): Card {
  if (
    ((card as any).nameEn === 'Sakura Haruno' || card.nameAr === 'ساكورا هارونو') &&
    result === 'win'
  ) {
    return { ...card, hp: ((card as any).hp ?? (card as any).health ?? 0) + 1 };
  }
  return card;
}

/**
 * resolveBattle
 * الدالة الرئيسية لحسم المعركة بين بطاقتين
 *
 * الترتيب:
 *   1. قدرة Turin  → خسارة إجبارية في نصف الجولات الأول
 *   2. القدرات الخاصة (Mihawk / Gehrman / Sanji)
 *   3. مقارنة الإحصائيات العادية
 *   4. تأثيرات ما بعد المعركة (Sakura)
 *
 * الاستخدام:
 *   const { result, updatedAttacker } = resolveBattle(myCard, enemyCard, currentRound, totalRounds, playerDeck);
 */
export function resolveBattle(
  attacker: Card,
  defender: Card,
  currentRound: number,
  totalRounds: number,
  playerDeck: Card[],
): { result: BattleResult; updatedAttacker: Card } {
  // 1. Turin — خسارة إجبارية في النصف الأول
  if (isTurinForcedLoss(currentRound, totalRounds, playerDeck)) {
    return { result: 'lose', updatedAttacker: attacker };
  }

  // 2. القدرات الخاصة
  const special = resolveSpecialAbility(attacker, defender);

  let result: BattleResult;
  if (special) {
    result = special;
  } else {
    // 3. المقارنة العادية
    const atkPower = (attacker.attack ?? 0) + (attacker.defense ?? 0);
    const defPower = (defender.attack ?? 0) + (defender.defense ?? 0);

    if (atkPower > defPower)      result = 'win';
    else if (atkPower < defPower) result = 'lose';
    else                          result = 'draw';
  }

  // 4. تأثيرات ما بعد المعركة
  const updatedAttacker = applyPostBattlePassive(attacker, result);

  return { result, updatedAttacker };
}
