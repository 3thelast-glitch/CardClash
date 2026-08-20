import { describe, expect, it } from 'vitest';
import { ALL_CARDS, determineRoundWinner } from '../cards-data-exports';
import { gameReducer } from '../game-context';
import {
  PROFESSIONAL_CARD_ABILITIES,
  attachProfessionalCardAbilities,
  getProfessionalCombatModifiers,
  getPostLossProfessionalBonus,
  type ProfessionalCombatContext,
  type ProfessionalCombatModifiers,
} from '../professional-card-abilities';
import type { Card, Effect, GameState } from '../types';

const card = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  name: id,
  nameAr: id,
  attack: 20,
  defense: 18,
  hp: 3,
  race: 'human',
  cardClass: 'fighter',
  element: 'fire',
  rarity: 'rare',
  ...overrides,
});

type ModifierScenario = {
  label: string;
  cardId: string;
  own?: Partial<Card>;
  opponent?: Partial<Card>;
  ownBase?: { attack: number; defense: number };
  opponentBase?: { attack: number; defense: number };
  context?: ProfessionalCombatContext;
  expected: ProfessionalCombatModifiers;
};

const modifierScenarios: ModifierScenario[] = [
  { label: 'نامي ضد تنين', cardId: 'nami', opponent: { race: 'dragon' }, expected: { defenseBonus: 1 } },
  { label: 'هيناتا ضد هجوم أعلى', cardId: 'hinata_hyuga', opponentBase: { attack: 21, defense: 18 }, expected: { opponentAttackPenalty: 1 } },
  { label: 'كوريناي في الظهور', cardId: 'kurenai', expected: { opponentDefensePenalty: 1 } },
  { label: 'بروك ضد الأموات', cardId: 'brook', opponent: { race: 'undead' }, expected: { attackBonus: 1 } },
  { label: 'شيكامارو ضد محارب', cardId: 'shikamaru_nara', opponent: { cardClass: 'warrior' }, expected: { opponentAttackPenalty: 2 } },
  { label: 'توغي بأمر التوقف', cardId: 'toge_inumaki', expected: { opponentAttackPenalty: 2, ownDefensePenalty: 1 } },
  { label: 'روك لي مع دفاع متاح', cardId: 'rock_lee', expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'روبين عندما دفاعها أقل', cardId: 'robin', expected: { attackBonus: 1, defenseBonus: 1 } },
  { label: 'بيكولو عند التأخر في الصحة', cardId: 'piccolo', context: { ownScore: 1, opponentScore: 2 }, expected: { defenseBonus: 1, ownHealthBonus: 1 } },
  { label: 'أوسوب ضد ساحر', cardId: 'usopp', opponent: { cardClass: 'mage' }, expected: { attackBonus: 2 } },
  { label: 'إينو عند تعادل القوة', cardId: 'ino_yamanaka', expected: { opponentDefensePenalty: 2 } },
  { label: 'تانجيرو ضد شيطان', cardId: 'tanjiro_kamado', opponent: { race: 'demon' }, expected: { defenseBonus: 2 } },
  { label: 'إدوارد مع دفاع أعلى', cardId: 'edward_elric', ownBase: { attack: 18, defense: 21 }, expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'ألفونس يجهّز حاجز الدفاع', cardId: 'alphonse_elric', expected: { ignoreFirstDefensePenalty: true } },
  { label: 'ميدوريا ضد كرت أقوى', cardId: 'izuku_midoriya', opponentBase: { attack: 22, defense: 19 }, expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'إنديفور ضد وحش', cardId: 'endeavor', opponent: { race: 'monster' }, expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'إينوسوكي ضد دفاع أعلى', cardId: 'inosuke_hashibira', opponentBase: { attack: 18, defense: 22 }, expected: { attackBonus: 2 } },
  { label: 'إيتاتشي يجهز إلغاء تعزيز الخصم', cardId: 'itachi_uchiha', expected: { cancelFirstOpponentAttackBuff: true } },
  { label: 'إيرين عند التأخر في الصحة', cardId: 'eren_yeager', context: { ownScore: 1, opponentScore: 2 }, expected: { attackBonus: 1, defenseBonus: 2 } },
  { label: 'إيتشيغو عند تعادل القوة', cardId: 'ichigo_kurosaki', expected: { attackBonus: 3 } },
  { label: 'بين بدفع شينرا', cardId: 'pain_nagato', expected: { opponentAttackPenalty: 2, opponentDefensePenalty: 1, ownDefensePenalty: 1 } },
  { label: 'أوبيتو يجهّز إلغاء النيرف', cardId: 'obito_uchiha', expected: { ignoreFirstStatPenalty: true } },
  { label: 'أول مايت عند صحة حرجة', cardId: 'all_might', context: { ownScore: 1, opponentScore: 3 }, expected: { attackBonus: 3, ownDefensePenalty: 2 } },
  { label: 'أرتورياس عند فرق إحصائي كبير', cardId: 'artorias', ownBase: { attack: 23, defense: 18 }, expected: { attackBonus: -2, defenseBonus: 2 } },
  { label: 'بولما لا تغيّر إحصاءات القتال لأنها قدرة كشف', cardId: 'bulma', expected: {} },
];

const effect = (id: string, stat: 'attack' | 'defense', amount: number): Effect => ({
  id,
  kind: 'statModifier',
  sourceSide: 'bot',
  targetSide: 'player',
  createdAtRound: 1,
  expiresAtRound: 1,
  priority: 10,
  data: { stat, amount },
});

const postLossState = (professionalCard: Card, botCard: Card): GameState => ({
  playerDeck: [professionalCard, card('player-next')],
  botDeck: [botCard, card('bot-next')],
  currentRound: 0,
  totalRounds: 2,
  playerScore: 3,
  botScore: 3,
  playerMaxHealth: 3,
  botMaxHealth: 3,
  roundResults: [],
  difficulty: 2,
  abilitiesEnabled: true,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
});

describe('professional card abilities', () => {
  it('assigns exactly seven new abilities to each non-special rarity group', () => {
    expect(Object.keys(PROFESSIONAL_CARD_ABILITIES)).toHaveLength(28);
    expect(ALL_CARDS.filter(item => PROFESSIONAL_CARD_ABILITIES[item.id])).toHaveLength(28);
    const attached = attachProfessionalCardAbilities([card('nami'), card('unrelated')]);
    expect(attached[0].characterAbilityId).toBe('nami_weather_forecast');
    expect(attached[0].specialAbility).toContain('تنين');
    expect(attached[1].characterAbilityId).toBeUndefined();
  });

  it('applies conditional common and rare effects only when their target condition is satisfied', () => {
    const nami = card('nami');
    const dragon = card('dragon-opponent', { race: 'dragon', cardClass: 'warrior' });
    const human = card('human-opponent');
    expect(getProfessionalCombatModifiers(nami, dragon, nami, dragon).defenseBonus).toBe(1);
    expect(getProfessionalCombatModifiers(nami, human, nami, human).defenseBonus).toBeUndefined();

    const shikamaru = card('shikamaru_nara');
    expect(getProfessionalCombatModifiers(shikamaru, dragon, shikamaru, dragon).opponentAttackPenalty).toBe(2);
  });

  it('keeps high-impact legendary abilities behind state or matchup conditions', () => {
    const allMight = card('all_might');
    const enemy = card('enemy');
    expect(getProfessionalCombatModifiers(allMight, enemy, allMight, enemy, { ownScore: 2, opponentScore: 3 }).attackBonus).toBeUndefined();
    expect(getProfessionalCombatModifiers(allMight, enemy, allMight, enemy, { ownScore: 1, opponentScore: 3 })).toMatchObject({ attackBonus: 3, ownDefensePenalty: 2 });

    const ichigo = card('ichigo_kurosaki', { attack: 22, defense: 18 });
    const tiedEnemy = card('tied-enemy', { attack: 21, defense: 19 });
    expect(getProfessionalCombatModifiers(ichigo, tiedEnemy, ichigo, tiedEnemy).attackBonus).toBe(3);
  });

  it.each(modifierScenarios)('activates $label with its intended modifier', ({ cardId, own, opponent, ownBase, opponentBase, context, expected }) => {
    const ownCard = card(cardId, own);
    const opponentCard = card('opponent', opponent);
    const ownStats = ownBase ?? { attack: ownCard.attack, defense: ownCard.defense };
    const opponentStats = opponentBase ?? { attack: opponentCard.attack, defense: opponentCard.defense };
    expect(getProfessionalCombatModifiers(ownCard, opponentCard, ownStats, opponentStats, context)).toEqual(expected);
  });

  it('does not activate conditional abilities when their requirements are absent', () => {
    expect(getProfessionalCombatModifiers(card('nami'), card('human'), card('nami'), card('human'))).toEqual({});
    expect(getProfessionalCombatModifiers(card('rock_lee', { defense: 0 }), card('opponent'), { attack: 20, defense: 0 }, { attack: 20, defense: 18 })).toEqual({});
    expect(getProfessionalCombatModifiers(card('all_might'), card('opponent'), card('all_might'), card('opponent'), { ownScore: 2, opponentScore: 3 })).toEqual({});
    expect(getProfessionalCombatModifiers(card('artorias'), card('opponent'), { attack: 21, defense: 18 }, { attack: 20, defense: 18 })).toEqual({});
  });

  it('queues the three post-loss bonuses through the live game reducer', () => {
    const opponent = card('opponent', { attack: 30, defense: 20 });
    const chopperResult = gameReducer(postLossState(card('chopper', { attack: 1, defense: 0 }), opponent), { type: 'PLAY_ROUND' });
    expect(chopperResult.roundResults[0].playerHealthDelta).toBe(0);

    const cobyResult = gameReducer(postLossState(card('coby', { attack: 1, defense: 0 }), opponent), { type: 'PLAY_ROUND' });
    expect(cobyResult.activeEffects).toContainEqual(expect.objectContaining({
      kind: 'statModifier', targetSide: 'player', data: { stat: 'defense', amount: 1 },
    }));

    const akiResult = gameReducer(postLossState(card('aki_hayakawa', { attack: 1, defense: 0 }), opponent), { type: 'PLAY_ROUND' });
    expect(akiResult.activeEffects).toContainEqual(expect.objectContaining({
      kind: 'statModifier', targetSide: 'player', data: { stat: 'attack', amount: 1 },
    }));
    expect(getPostLossProfessionalBonus(card('chopper'))).toEqual({ health: 1 });
  });

  it('enforces Alphonse, Obito, and Itachi protections during live round resolution', () => {
    const opponent = card('opponent', { attack: 10, defense: 10 });
    const alphonse = determineRoundWinner(card('alphonse_elric', { attack: 10, defense: 10 }), opponent, [effect('defense-debuff', 'defense', -5)]);
    expect(alphonse.botDamage).toBe(0);

    const obito = determineRoundWinner(card('obito_uchiha', { attack: 10, defense: 10 }), opponent, [effect('attack-debuff', 'attack', -5)]);
    expect(obito.playerBaseDamage).toBe(10);

    const itachi = determineRoundWinner(card('itachi_uchiha', { attack: 10, defense: 10 }), opponent, [], [
      { ...effect('attack-buff-1', 'attack', 5), targetSide: 'bot' },
      { ...effect('attack-buff-2', 'attack', 2), targetSide: 'bot' },
    ]);
    expect(itachi.botBaseDamage).toBe(12);
  });
});
