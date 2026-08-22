import { getCharacterAbility, matchesCharacterAbilityTarget } from './character-abilities';
import { getAbilityNameOnly } from './ability-names';
import { withEffectSource } from './effect-labels';
import type { Effect, RoundResult, RoundTimeline, Side } from './types';

export type RoundInsightTone = 'positive' | 'negative' | 'neutral' | 'accent';

export interface RoundInsight {
  id: string;
  text: string;
  tone: RoundInsightTone;
}

export interface RoundTimelineStep extends RoundInsight {
  label: 'قبل الاستخدام' | 'بعد الاستخدام' | 'سبب الفوز';
}

const sideLabel = (side: Side) => (side === 'player' ? 'أنت' : 'البوت');

const EFFECT_LABELS: Partial<Record<Effect['kind'], string>> = {
  protection: 'حماية الصحة',
  statModifier: 'تعديل الإحصاءات',
  forcedOutcome: 'نتيجة مضمونة',
  starAdvantage: 'أفضلية النجوم',
  shieldGuard: 'درع',
  doublePoints: 'مضاعفة النقاط',
  factionMastery: 'إتقان الفصائل',
  absoluteDominance: 'السيطرة المطلقة',
  phantomBlade: 'شفرة الوهم',
  turinPenalty: 'لعنة تورين: خسارة هذه الجولة',
};

const formatHealthDelta = (side: Side, delta: number): RoundInsight | null => {
  if (delta === 0) return null;
  const amount = Math.abs(delta);
  const gained = delta > 0;
  return {
    id: `health-${side}`,
    text: `${sideLabel(side)} ${gained ? 'اكتسب' : 'خسر'} ${amount} صحة`,
    tone: gained ? (side === 'player' ? 'positive' : 'negative') : (side === 'player' ? 'negative' : 'positive'),
  };
};

const getCharacterEvents = (result: RoundResult): RoundInsight[] => {
  const entries: Array<{ side: Side; card: RoundResult['playerCard']; won: boolean }> = [
    { side: 'player', card: result.playerCard, won: result.winner === 'player' },
    { side: 'bot', card: result.botCard, won: result.winner === 'bot' },
  ];

  return entries.flatMap(({ side, card, won }) => {
    const ability = getCharacterAbility(card);
    if (!ability) return [];
    const events: RoundInsight[] = [];

    if (ability.roundStartHealthBonus) {
      events.push({
        id: `character-spawn-${side}`,
        text: `${ability.nameAr}: +${ability.roundStartHealthBonus} صحة عند دخول الجولة`,
        tone: side === 'player' ? 'positive' : 'negative',
      });
    }
    if (won && ability.winHealthBonus) {
      events.push({
        id: `character-win-${side}`,
        text: `${ability.nameAr}: +${ability.winHealthBonus} صحة بعد الفوز`,
        tone: side === 'player' ? 'positive' : 'negative',
      });
    }
    if (ability.matchup && matchesCharacterAbilityTarget(side === 'player' ? result.botCard : result.playerCard, ability.matchup.target)) {
      events.push({
        id: `character-matchup-${side}`,
        text: `${ability.nameAr}: ${ability.matchup.outcome === 'win' ? 'حسم المواجهة لصالحه' : 'منعه من الفوز في هذه المواجهة'}`,
        tone: 'accent',
      });
    }
    if (ability.statModifiers) {
      events.push({
        id: `character-stats-${side}`,
        text: `${ability.nameAr}: ${ability.descriptionAr}`,
        tone: 'accent',
      });
    }
    return events;
  });
};

export function buildRoundEventLog(result: RoundResult): RoundInsight[] {
  const events: RoundInsight[] = [];
  const winnerText = result.winner === 'draw'
    ? 'انتهت الجولة بتعادل'
    : result.winner === 'player' ? 'فزت بالجولة' : 'فاز البوت بالجولة';
  events.push({
    id: 'winner',
    text: winnerText,
    tone: result.winner === 'player' ? 'positive' : result.winner === 'bot' ? 'negative' : 'neutral',
  });

  if (result.playerDamage > 0 || result.botDamage > 0) {
    events.push({
      id: 'damage',
      text: `الضرر: أنت ${result.playerDamage} — البوت ${result.botDamage}`,
      tone: 'neutral',
    });
  }
  if (result.playerFactionAdvantage === 'strong') {
    events.push({ id: 'player-faction', text: 'أفضلية فصيلتك لك في هذه الجولة', tone: 'positive' });
  }
  if (result.botFactionAdvantage === 'strong') {
    events.push({ id: 'bot-faction', text: 'أفضلية فصيلة البوت في هذه الجولة', tone: 'negative' });
  }
  if (result.botAbilityUsed) {
    events.push({
      id: 'bot-ability',
      text: `البوت استخدم قدرة: ${getAbilityNameOnly(result.botAbilityUsed)}`,
      tone: 'negative',
    });
  }
  if (result.playerInfo) {
    events.push({ id: 'player-info', text: result.playerInfo, tone: 'accent' });
  }
  if (result.botInfo) {
    events.push({ id: 'bot-info', text: result.botInfo, tone: 'neutral' });
  }

  const playerHealth = formatHealthDelta('player', result.playerHealthDelta);
  const botHealth = formatHealthDelta('bot', result.botHealthDelta);
  if (playerHealth) events.push(playerHealth);
  if (botHealth) events.push(botHealth);
  return [...events, ...getCharacterEvents(result)];
}

const fallbackTimeline = (result: RoundResult): RoundTimeline => ({
  before: {
    player: { nameAr: result.playerCard.nameAr ?? result.playerCard.name, attack: result.playerCard.attack, defense: result.playerCard.defense },
    bot: { nameAr: result.botCard.nameAr ?? result.botCard.name, attack: result.botCard.attack, defense: result.botCard.defense },
  },
  after: {
    player: { nameAr: result.playerCard.nameAr ?? result.playerCard.name, attack: result.playerCard.attack, defense: result.playerCard.defense },
    bot: { nameAr: result.botCard.nameAr ?? result.botCard.name, attack: result.botCard.attack, defense: result.botCard.defense },
  },
  abilityUses: [],
});

/** يبني شرحاً ثابتاً من ثلاث مراحل قابل للعرض في كل شاشات القتال. */
export function buildRoundTimeline(result: RoundResult): RoundTimelineStep[] {
  const timeline = result.timeline ?? fallbackTimeline(result);
  const usedText = timeline.abilityUses.length > 0
    ? timeline.abilityUses.map(({ side, abilityType }) => `${sideLabel(side)}: ${getAbilityNameOnly(abilityType)}`).join('، ')
    : 'لم تُستخدم بطاقة قدرة يدوية';
  const beforeText = `أنت: ${timeline.before.player.attack} هجوم / ${timeline.before.player.defense} دفاع — الخصم: ${timeline.before.bot.attack} هجوم / ${timeline.before.bot.defense} دفاع`;
  const afterText = `${usedText}. بعد التأثيرات: أنت ${timeline.after.player.attack}/${timeline.after.player.defense} — الخصم ${timeline.after.bot.attack}/${timeline.after.bot.defense}`;
  const playerWonByFaction = result.winner === 'player' && result.playerFactionAdvantage === 'strong';
  const botWonByFaction = result.winner === 'bot' && result.botFactionAdvantage === 'strong';
  const reasonText = result.winner === 'draw'
    ? `تعادل الضرر بعد الدفاع: أنت ${result.playerDamage} — الخصم ${result.botDamage}`
    : playerWonByFaction || botWonByFaction
      ? `أفضلية الفصيلة دعمت الكرت الفائز، ثم حُسمت المقارنة: ${result.playerDamage} مقابل ${result.botDamage}`
      : `الضرر بعد الدفاع حسم الجولة: أنت ${result.playerDamage} — الخصم ${result.botDamage}`;
  return [
    { id: 'timeline-before', label: 'قبل الاستخدام', text: beforeText, tone: 'neutral' },
    { id: 'timeline-after', label: 'بعد الاستخدام', text: afterText, tone: timeline.abilityUses.length > 0 ? 'accent' : 'neutral' },
    { id: 'timeline-reason', label: 'سبب الفوز', text: reasonText, tone: result.winner === 'player' ? 'positive' : result.winner === 'bot' ? 'negative' : 'neutral' },
  ];
}

export function getActiveEffectPreview(effects: Effect[], side: Side, roundNumber: number): RoundInsight[] {
  return effects
    .filter((effect) => (effect.targetSide === side || effect.targetSide === 'all')
      && effect.createdAtRound <= roundNumber
      && (effect.expiresAtRound === undefined || roundNumber <= effect.expiresAtRound)
      && (effect.charges === undefined || effect.charges > 0))
    .slice(0, 3)
    .map((effect) => ({
      id: `effect-${effect.id}`,
      text: `تأثير نشط: ${withEffectSource(effect, EFFECT_LABELS[effect.kind] ?? effect.kind)}`,
      tone: effect.sourceSide === side ? 'positive' : 'negative',
    }));
}
