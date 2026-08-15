import { getCharacterAbility, matchesCharacterAbilityTarget } from './character-abilities';
import type { Effect, RoundResult, Side } from './types';

export type RoundInsightTone = 'positive' | 'negative' | 'neutral' | 'accent';

export interface RoundInsight {
  id: string;
  text: string;
  tone: RoundInsightTone;
}

const sideLabel = (side: Side) => (side === 'player' ? 'أنت' : 'البوت');

const EFFECT_LABELS: Partial<Record<Effect['kind'], string>> = {
  protection: 'حماية الصحة',
  statModifier: 'تعديل الإحصاءات',
  forcedOutcome: 'نتيجة مضمونة',
  starAdvantage: 'أفضلية النجوم',
  shieldGuard: 'درع',
  doublePoints: 'مضاعفة النقاط',
  elementalMastery: 'إتقان العناصر',
  absoluteDominance: 'السيطرة المطلقة',
  phantomBlade: 'شفرة الوهم',
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
  if (result.playerElementAdvantage === 'strong') {
    events.push({ id: 'player-element', text: 'أفضلية عنصرية لك في هذه الجولة', tone: 'positive' });
  }
  if (result.botElementAdvantage === 'strong') {
    events.push({ id: 'bot-element', text: 'أفضلية عنصرية للبوت في هذه الجولة', tone: 'negative' });
  }

  const playerHealth = formatHealthDelta('player', result.playerHealthDelta);
  const botHealth = formatHealthDelta('bot', result.botHealthDelta);
  if (playerHealth) events.push(playerHealth);
  if (botHealth) events.push(botHealth);
  return [...events, ...getCharacterEvents(result)];
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
      text: `تأثير نشط: ${EFFECT_LABELS[effect.kind] ?? effect.kind}`,
      tone: effect.sourceSide === side ? 'positive' : 'negative',
    }));
}
