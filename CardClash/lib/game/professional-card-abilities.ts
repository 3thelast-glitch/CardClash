import type { Card, CardClass, CharacterAbilityId, Effect, Race, Side } from './types';

export interface ProfessionalAbilityDefinition {
  id: CharacterAbilityId;
  cardId: string;
  nameAr: string;
  descriptionAr: string;
}

export interface ProfessionalCombatContext {
  roundNumber?: number;
  ownScore?: number;
  opponentScore?: number;
}

export interface ProfessionalCombatModifiers {
  attackBonus?: number;
  defenseBonus?: number;
  opponentAttackPenalty?: number;
  opponentDefensePenalty?: number;
  ownAttackPenalty?: number;
  ownDefensePenalty?: number;
  ownHealthBonus?: number;
  ignoreFirstDefensePenalty?: boolean;
  ignoreFirstStatPenalty?: boolean;
  cancelFirstOpponentAttackBuff?: boolean;
}

const definition = (id: CharacterAbilityId, cardId: string, nameAr: string, descriptionAr: string): ProfessionalAbilityDefinition => ({ id, cardId, nameAr, descriptionAr });

export const PROFESSIONAL_CARD_ABILITIES: Record<string, ProfessionalAbilityDefinition> = {
  nami: definition('nami_weather_forecast', 'nami', 'تنبؤات الطقس', 'ضد تنين أو وحش: +1 دفاع هذه الجولة.'),
  chopper: definition('chopper_medical_kit', 'chopper', 'حقيبة الإسعاف', 'بعد أول خسارة: الكرت التالي يكسب +1 هجوم.'),
  hinata_hyuga: definition('hinata_gentle_fist', 'hinata_hyuga', 'راحة اليد اللطيفة', 'إذا كان هجوم الخصم أعلى: −1 هجوم للخصم.'),
  kurenai: definition('kurenai_crimson_illusion', 'kurenai', 'وهم القرمزي', 'في أول ظهور: −1 دفاع للخصم.'),
  coby: definition('coby_marine_resolve', 'coby', 'عزم البحرية', 'بعد خسارة جولة: الكرت التالي يكسب +1 دفاع.'),
  bulma: definition('bulma_capsule_scanner', 'bulma', 'ماسح الكبسولة', 'عند الظهور: يكشف عدد كروت الخصم في كل فئة، من دون تغيير الإحصاءات.'),
  brook: definition('brook_soul_melody', 'brook', 'لحن الروح', 'ضد شيطان أو ميت: +1 هجوم هذه الجولة.'),
  shikamaru_nara: definition('shikamaru_shadow_bind', 'shikamaru_nara', 'قيد الظلال', 'ضد مقاتل أو محارب: −2 هجوم للخصم.'),
  toge_inumaki: definition('toge_cursed_command', 'toge_inumaki', 'أمر: توقّف', 'إذا فاز: −2 هجوم لكرت الخصم في الجولة القادمة.'),
  rock_lee: definition('rock_lee_first_gate', 'rock_lee', 'البوابة الأولى', '+2 هجوم و−1 دفاع هذه الجولة.'),
  robin: definition('robin_blooming_arms', 'robin', 'إزهار الأذرع', 'إذا كان دفاعي أقل من هجومي: +1 هجوم و+1 دفاع.'),
  piccolo: definition('piccolo_namekian_regeneration', 'piccolo', 'تجدد ناميكي', 'عند التأخر في الصحة: +1 صحة و+1 دفاع.'),
  usopp: definition('usopp_kayzer_shot', 'usopp', 'طلقة كايزيرو', 'ضد ساحر: +2 هجوم هذه الجولة.'),
  ino_yamanaka: definition('ino_mind_possession', 'ino_yamanaka', 'استحواذ ذهني', 'عند تعادل القوة: −2 دفاع للخصم.'),
  tanjiro_kamado: definition('tanjiro_water_breathing_barrier', 'tanjiro_kamado', 'التنفس المائي: الحاجز', 'ضد تنين أو شيطان: +2 دفاع هذه الجولة.'),
  edward_elric: definition('edward_equivalent_exchange', 'edward_elric', 'قانون التبادل', 'إذا كان دفاعي أعلى: −1 دفاع، +2 هجوم.'),
  alphonse_elric: definition('alphonse_soul_bond', 'alphonse_elric', 'رباط الروح', 'عند التأخر في الصحة بـ3 أو أكثر: كروت الخير +2 هجوم حتى نهاية المباراة.'),
  izuku_midoriya: definition('midoriya_controlled_full_cowl', 'izuku_midoriya', 'تفريغ كامل محسوب', 'ضد كرت أقوى: +2 هجوم و−1 دفاع.'),
  endeavor: definition('endeavor_hellflame_focus', 'endeavor', 'لهب جهنم المركز', 'ضد وحش أو ميت: +2 هجوم و−1 دفاع.'),
  inosuke_hashibira: definition('inosuke_predator_sense', 'inosuke_hashibira', 'حس المفترس', 'إذا كان دفاع الخصم أعلى من هجومه: +2 هجوم.'),
  aki_hayakawa: definition('aki_fog_contract', 'aki_hayakawa', 'عقد الضباب', 'بعد الخسارة: الكرت التالي +1 هجوم.'),
  itachi_uchiha: definition('itachi_yata_mirror', 'itachi_uchiha', 'مرآة ياتا', 'عند الظهور من الجولة الثانية: يصبح دفاع كرت الخصم الحالي مساوياً لدفاع كرته في الجولة السابقة.'),
  eren_yeager: definition('eren_titan_hardening', 'eren_yeager', 'صلابة العملاق', 'عند التأخر في الصحة: +2 دفاع و+1 هجوم.'),
  ichigo_kurosaki: definition('ichigo_final_getsuga', 'ichigo_kurosaki', 'غيتسوغا الحاسمة', 'عند تعادل القوة: +3 هجوم هذه الجولة.'),
  pain_nagato: definition('pain_shinra_push', 'pain_nagato', 'دفع شينرا', '−2 هجوم و−1 دفاع للخصم؛ −1 دفاع لي.'),
  obito_uchiha: definition('obito_kamui_phase', 'obito_uchiha', 'العبور المكاني', 'عند الظهور: يبدّل إضعافات الهجوم والدفاع النشطة بين اللاعبين لهذه الجولة.'),
  all_might: definition('all_might_last_symbol', 'all_might', 'رمز السلام الأخير', 'عند الظهور: كروت الخير +3 هجوم وكروت الشر −3 دفاع حتى نهاية المباراة.'),
  artorias: definition('artorias_abyss_stance', 'artorias', 'وقفة الهاوية', 'إذا كان هجومه أعلى من دفاع الخصم بـ4 أو أكثر: يبدّل كرتي الجولة التالية فقط.'),
};

export function attachProfessionalCardAbility(card: Card): Card {
  const ability = PROFESSIONAL_CARD_ABILITIES[card.id];
  if (!ability) return card;
  return {
    ...card,
    specialAbility: card.specialAbility?.trim() || ability.descriptionAr,
    characterAbilityId: card.characterAbilityId ?? ability.id,
  };
}

export function attachProfessionalCardAbilities(cards: Card[]): Card[] {
  return cards.map(attachProfessionalCardAbility);
}

/** ينشئ هالة أول مايت من لحظة ظهوره وحتى نهاية المباراة. */
export function buildAllMightAlignmentEffects(deck: Card[], side: Side, totalRounds: number): Effect[] {
  const opponentSide: Side = side === 'player' ? 'bot' : 'player';
  return deck.flatMap((card, index) => {
    if (card.id !== 'all_might') return [];
    const startsAtRound = index + 1;
    return [
      {
        id: `all-might-good-attack-${side}-${index}`,
        kind: 'statModifier' as const,
        sourceSide: side,
        targetSide: side,
        createdAtRound: startsAtRound,
        expiresAtRound: totalRounds,
        priority: 80,
        data: { stat: 'attack', amount: 3, alignment: 'good' },
      },
      {
        id: `all-might-evil-defense-${side}-${index}`,
        kind: 'statModifier' as const,
        sourceSide: side,
        targetSide: opponentSide,
        createdAtRound: startsAtRound,
        expiresAtRound: totalRounds,
        priority: 80,
        data: { stat: 'defense', amount: -3, alignment: 'evil' },
      },
    ] satisfies Effect[];
  });
}

const KAIDO_AURA_RACES: Race[] = ['orc', 'dragon', 'demon', 'undead', 'monster'];

/** هالة كايدو تبدأ عند ظهوره وتستهدف كل الفصائل عدا البشر والإلف والروبوتات. */
export function buildKaidoFactionEffects(deck: Card[], side: Side, totalRounds: number): Effect[] {
  return deck.flatMap((card, index) => {
    if (card.id !== 'kaido') return [];
    const startsAtRound = index + 1;
    return [
      { id: `kaido-faction-attack-${side}-${index}`, kind: 'statModifier' as const, sourceSide: side, targetSide: side, createdAtRound: startsAtRound, expiresAtRound: totalRounds, priority: 80, data: { stat: 'attack', amount: 2, races: KAIDO_AURA_RACES } },
      { id: `kaido-faction-defense-${side}-${index}`, kind: 'statModifier' as const, sourceSide: side, targetSide: side, createdAtRound: startsAtRound, expiresAtRound: totalRounds, priority: 80, data: { stat: 'defense', amount: 2, races: KAIDO_AURA_RACES } },
    ] satisfies Effect[];
  });
}

/** هالة ألفونس لا تمنح كروت الخير هجومها إلا عند التأخر بثلاث نقاط صحة أو أكثر. */
export function buildAlphonseGoodAlignmentEffects(deck: Card[], side: Side, totalRounds: number): Effect[] {
  return deck.flatMap((card, index) => {
    if (card.id !== 'alphonse_elric') return [];
    return [{ id: `alphonse-good-attack-${side}-${index}`, kind: 'statModifier' as const, sourceSide: side, targetSide: side, createdAtRound: index + 1, expiresAtRound: totalRounds, priority: 80, data: { stat: 'attack', amount: 2, alignment: 'good', requiresHealthDeficit: 3 } }] satisfies Effect[];
  });
}

/** نص خاص بصاحب بولما يوضح توزيع فئات تشكيل الخصم، بلا أثر على نتيجة القتال. */
export function buildBulmaClassScan(opponentDeck: Card[]): string {
  const labels: Record<Card['cardClass'], string> = { warrior: 'محارب', knight: 'فارس', mage: 'ساحر', archer: 'رامي', berserker: 'ضاري', paladin: 'بالادين', swordsman: 'سياف', fighter: 'مقاتل', guardian: 'حارس', healer: 'طبيب' };
  const counts = opponentDeck.reduce<Partial<Record<Card['cardClass'], number>>>((result, card) => {
    result[card.cardClass] = (result[card.cardClass] ?? 0) + 1;
    return result;
  }, {});
  const summary = Object.entries(counts).map(([cardClass, count]) => `${labels[cardClass as Card['cardClass']]}: ${count}`).join('، ');
  return `ماسح بولما — فئات الخصم: ${summary || 'لا توجد كروت'}`;
}

export const isObitoCard = (card: Card) => card.id === 'obito_uchiha';
export const shouldArtoriasSwapNextRound = (card: Card, opponentCard: Card) =>
  card.id === 'artorias' && card.attack - opponentCard.defense >= 4;

/** مرآة ياتا: إيتاتشي ينسخ دفاع كرت الخصم في الجولة السابقة إلى كرته الحالية. */
export const applyYataMirrorDefense = (ownerCard: Card, opponentCard: Card, previousOpponentCard?: Card) =>
  ownerCard.id === 'itachi_uchiha' && previousOpponentCard
    ? { ...opponentCard, defense: previousOpponentCard.defense }
    : opponentCard;

const isLowHealth = (context: ProfessionalCombatContext) =>
  context.ownScore !== undefined && context.opponentScore !== undefined && context.ownScore < context.opponentScore;

const isRace = (card: Card, races: Race[]) => races.includes(card.race);
const isClass = (card: Card, classes: CardClass[]) => classes.includes(card.cardClass);

export function getProfessionalCombatModifiers(
  ownCard: Card,
  opponentCard: Card,
  ownBase: { attack: number; defense: number },
  opponentBase: { attack: number; defense: number },
  context: ProfessionalCombatContext = {},
): ProfessionalCombatModifiers {
  switch (PROFESSIONAL_CARD_ABILITIES[ownCard.id]?.id) {
    case 'nami_weather_forecast': return isRace(opponentCard, ['dragon', 'monster']) ? { defenseBonus: 1 } : {};
    case 'hinata_gentle_fist': return opponentBase.attack > ownBase.attack ? { opponentAttackPenalty: 1 } : {};
    case 'kurenai_crimson_illusion': return { opponentDefensePenalty: 1 };
    case 'brook_soul_melody': return isRace(opponentCard, ['demon', 'undead']) ? { attackBonus: 1 } : {};
    case 'shikamaru_shadow_bind': return isClass(opponentCard, ['fighter', 'warrior']) ? { opponentAttackPenalty: 2 } : {};
    case 'toge_cursed_command': return {};
    case 'rock_lee_first_gate': return ownBase.defense > 0 ? { attackBonus: 2, ownDefensePenalty: 1 } : {};
    case 'robin_blooming_arms': return ownBase.defense < ownBase.attack ? { attackBonus: 1, defenseBonus: 1 } : {};
    case 'piccolo_namekian_regeneration': return isLowHealth(context) ? { defenseBonus: 1, ownHealthBonus: 1 } : {};
    case 'usopp_kayzer_shot': return opponentCard.cardClass === 'mage' ? { attackBonus: 2 } : {};
    case 'ino_mind_possession': return ownBase.attack + ownBase.defense === opponentBase.attack + opponentBase.defense ? { opponentDefensePenalty: 2 } : {};
    case 'tanjiro_water_breathing_barrier': return isRace(opponentCard, ['dragon', 'demon']) ? { defenseBonus: 2 } : {};
    case 'edward_equivalent_exchange': return ownBase.defense > ownBase.attack && ownBase.defense > 0 ? { attackBonus: 2, ownDefensePenalty: 1 } : {};
    case 'alphonse_soul_bond': return {};
    case 'midoriya_controlled_full_cowl': return ownBase.attack + ownBase.defense < opponentBase.attack + opponentBase.defense ? { attackBonus: 2, ownDefensePenalty: 1 } : {};
    case 'endeavor_hellflame_focus': return isRace(opponentCard, ['monster', 'undead']) ? { attackBonus: 2, ownDefensePenalty: 1 } : {};
    case 'inosuke_predator_sense': return opponentBase.defense > opponentBase.attack ? { attackBonus: 2 } : {};
    case 'itachi_yata_mirror': return {};
    case 'eren_titan_hardening': return isLowHealth(context) ? { attackBonus: 1, defenseBonus: 2 } : {};
    case 'ichigo_final_getsuga': return ownBase.attack + ownBase.defense === opponentBase.attack + opponentBase.defense ? { attackBonus: 3 } : {};
    case 'pain_shinra_push': return { opponentAttackPenalty: 2, opponentDefensePenalty: 1, ownDefensePenalty: 1 };
    case 'obito_kamui_phase': return {};
    case 'all_might_last_symbol': return {};
    case 'artorias_abyss_stance': return {};
    default: return {};
  }
}

export function getPostLossProfessionalBonus(card: Card): { attack?: number; defense?: number; health?: number } | undefined {
  switch (PROFESSIONAL_CARD_ABILITIES[card.id]?.id) {
    case 'chopper_medical_kit': return { attack: 1 };
    case 'coby_marine_resolve': return { defense: 1 };
    case 'aki_fog_contract': return { attack: 1 };
    default: return undefined;
  }
}

export function abilitySideContext(side: Side, playerScore?: number, botScore?: number): ProfessionalCombatContext {
  return side === 'player'
    ? { ownScore: playerScore, opponentScore: botScore }
    : { ownScore: botScore, opponentScore: playerScore };
}
