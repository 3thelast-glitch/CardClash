import { describe, expect, it } from 'vitest';
import { buildRoundEventLog, buildRoundTimeline, getActiveEffectPreview } from '../round-insights';
import type { Card, Effect, RoundResult } from '../types';

const makeCard = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  name: id,
  nameAr: id,
  attack: 10,
  defense: 4,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
  ...overrides,
});

const makeResult = (overrides: Partial<RoundResult> = {}): RoundResult => ({
  round: 1,
  playerCard: makeCard('tsunade', { characterAbilityId: 'tsunade_medical_ninjutsu' }),
  botCard: makeCard('fire-bot'),
  playerDamage: 8,
  botDamage: 2,
  playerBaseDamage: 10,
  botBaseDamage: 4,
  playerFactionAdvantage: 'strong',
  botFactionAdvantage: 'weak',
  playerHealthDelta: 6,
  botHealthDelta: -1,
  winner: 'player',
  ...overrides,
});

describe('سجل أحداث الجولة والمعاينة', () => {
  it('يشرح الفائز والضرر والأفضلية والعلاج وقدرة الشخصية بالعربية', () => {
    const texts = buildRoundEventLog(makeResult()).map((event) => event.text);

    expect(texts).toContain('فزت بالجولة');
    expect(texts).toContain('الضرر: أنت 8 — البوت 2');
    expect(texts).toContain('أفضلية فصيلتك لك في هذه الجولة');
    expect(texts).toContain('أنت اكتسب 6 صحة');
    expect(texts).toContain('طب تسونادي: +2 صحة عند دخول الجولة');

    const botTexts = buildRoundEventLog(makeResult({ botAbilityUsed: 'Protection' })).map((event) => event.text);
    expect(botTexts.some((text) => text.startsWith('البوت استخدم قدرة:'))).toBe(true);
  });

  it('يعرض أثر Sakura الصحي بعد الفوز ضمن سجل الجولة', () => {
    const sakura = makeCard('sakura_haruno', { characterAbilityId: 'sakura_victory_heal' });
    const texts = buildRoundEventLog(makeResult({ playerCard: sakura, playerHealthDelta: 1 })).map((event) => event.text);

    expect(texts).toContain('شفاء النصر: +1 صحة بعد الفوز');
  });

  it('يبني خطاً زمنياً من قبل القدرة إلى الإحصاءات النهائية وسبب الفوز', () => {
    const timeline = buildRoundTimeline(makeResult({
      timeline: {
        before: {
          player: { nameAr: 'مهاجم', attack: 10, defense: 4 },
          bot: { nameAr: 'مدافع', attack: 8, defense: 6 },
        },
        after: {
          player: { nameAr: 'مهاجم', attack: 12, defense: 4 },
          bot: { nameAr: 'مدافع', attack: 8, defense: 4 },
        },
        abilityUses: [{ side: 'player', abilityType: 'Reinforcement' }],
      },
    }));

    expect(timeline.map(step => step.label)).toEqual(['قبل الاستخدام', 'بعد الاستخدام', 'سبب الفوز']);
    expect(timeline[0].text).toContain('10 هجوم / 4 دفاع');
    expect(timeline[1].text).toContain('أنت: التدعيم');
    expect(timeline[1].text).toContain('12/4');
    expect(timeline[2].text).toContain('أفضلية الفصيلة');
  });

  it('يرشح آثار الجولة النشطة ويعرض تسمياتها العربية للطرف المطلوب', () => {
    const effects: Effect[] = [{
      id: 'shield-player',
      kind: 'shieldGuard',
      sourceSide: 'player',
      targetSide: 'player',
      createdAtRound: 1,
      expiresAtRound: 2,
      priority: 70,
    }];

    const preview = getActiveEffectPreview(effects, 'player', 1);

    expect(preview).toHaveLength(1);
    expect(preview[0].text).toBe('تأثير نشط: درع');
    expect(getActiveEffectPreview(effects, 'bot', 1)).toHaveLength(0);
  });
});
