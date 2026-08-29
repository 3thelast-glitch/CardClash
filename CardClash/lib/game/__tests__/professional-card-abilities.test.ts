import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../cards-data-exports';
import { gameReducer } from '../game-context';
import {
  PROFESSIONAL_CARD_ABILITIES,
  attachProfessionalCardAbilities,
  getProfessionalCombatModifiers,
  getPostLossProfessionalBonus,
  type ProfessionalCombatContext,
  type ProfessionalCombatModifiers,
} from '../professional-card-abilities';
import { getEffectiveStats } from '../ui-helpers';
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
  { label: 'توغي يجهز إضعاف الجولة التالية من محرك الجولة', cardId: 'toge_inumaki', expected: {} },
  { label: 'روك لي مع دفاع متاح', cardId: 'rock_lee', expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'روبين عندما دفاعها أقل', cardId: 'robin', expected: { attackBonus: 1, defenseBonus: 1 } },
  { label: 'بيكولو عند التأخر في الصحة', cardId: 'piccolo', context: { ownScore: 1, opponentScore: 2 }, expected: { defenseBonus: 1, ownHealthBonus: 1 } },
  { label: 'أوسوب ضد ساحر', cardId: 'usopp', opponent: { cardClass: 'mage' }, expected: { attackBonus: 2 } },
  { label: 'إينو عند تعادل القوة', cardId: 'ino_yamanaka', expected: { opponentDefensePenalty: 2 } },
  { label: 'تانجيرو ضد شيطان', cardId: 'tanjiro_kamado', opponent: { race: 'demon' }, expected: { defenseBonus: 2 } },
  { label: 'إدوارد مع دفاع أعلى', cardId: 'edward_elric', ownBase: { attack: 18, defense: 21 }, expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'ألفونس يجهز هالة الخير من محرك المباراة', cardId: 'alphonse_elric', expected: {} },
  { label: 'ميدوريا ضد كرت أقوى', cardId: 'izuku_midoriya', opponentBase: { attack: 22, defense: 19 }, expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'إنديفور ضد وحش', cardId: 'endeavor', opponent: { race: 'monster' }, expected: { attackBonus: 2, ownDefensePenalty: 1 } },
  { label: 'إينوسوكي ضد دفاع أعلى', cardId: 'inosuke_hashibira', opponentBase: { attack: 18, defense: 22 }, expected: { attackBonus: 2 } },
  { label: 'إيتاتشي يفعّل مرآة ياتا من محرك الجولة', cardId: 'itachi_uchiha', expected: {} },
  { label: 'إيرين عند التأخر في الصحة', cardId: 'eren_yeager', context: { ownScore: 1, opponentScore: 2 }, expected: { attackBonus: 1, defenseBonus: 2 } },
  { label: 'إيتشيغو عند تعادل القوة', cardId: 'ichigo_kurosaki', expected: { attackBonus: 3 } },
  { label: 'بين بدفع شينرا', cardId: 'pain_nagato', expected: { opponentAttackPenalty: 2, opponentDefensePenalty: 1, ownDefensePenalty: 1 } },
  { label: 'أوبيتو يفعّل تبديل الإضعافات من محرك الجولة', cardId: 'obito_uchiha', expected: {} },
  { label: 'أول مايت ينشئ هالته من محرك المباراة', cardId: 'all_might', expected: {} },
  { label: 'أرتورياس يبدّل الجولة التالية من محرك المباراة', cardId: 'artorias', ownBase: { attack: 23, defense: 18 }, expected: {} },
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
  it('يعكس خصم قدرة كوريناي على دفاع كرت الخصم في واجهة الساحة قبل الحسم', () => {
    const kurenai = card('kurenai', { attack: 2, defense: 6 });
    const opponent = card('opponent', { attack: 29, defense: 38 });

    expect(getEffectiveStats(
      opponent.attack,
      opponent.defense,
      [],
      'player',
      opponent.cardClass,
      kurenai,
      opponent,
    )).toEqual({ attack: 29, defense: 37 });
  });

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

  it('keeps high-impact legendary abilities behind their dedicated match effects', () => {
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

  it('queues Chopper’s one-time attack bonus and the remaining post-loss bonuses through the live game reducer', () => {
    const opponent = card('opponent', { attack: 30, defense: 20 });
    const chopperResult = gameReducer(postLossState(card('chopper', { attack: 1, defense: 0 }), opponent), { type: 'PLAY_ROUND' });
    expect(chopperResult.activeEffects).toContainEqual(expect.objectContaining({
      kind: 'statModifier', targetSide: 'player', data: { stat: 'attack', amount: 1 },
    }));

    const cobyResult = gameReducer(postLossState(card('coby', { attack: 1, defense: 0 }), opponent), { type: 'PLAY_ROUND' });
    expect(cobyResult.activeEffects).toContainEqual(expect.objectContaining({
      kind: 'statModifier', targetSide: 'player', data: { stat: 'defense', amount: 1 },
    }));

    const akiResult = gameReducer(postLossState(card('aki_hayakawa', { attack: 1, defense: 0 }), opponent), { type: 'PLAY_ROUND' });
    expect(akiResult.activeEffects).toContainEqual(expect.objectContaining({
      kind: 'statModifier', targetSide: 'player', data: { stat: 'attack', amount: 1 },
    }));
    expect(getPostLossProfessionalBonus(card('chopper'))).toEqual({ attack: 1 });
  });

  it('grants Chopper only one +1 attack boost after his first loss', () => {
    const chopper = card('chopper', { attack: 4, defense: 0 });
    const state: GameState = {
      ...postLossState(chopper, card('first-opponent', { attack: 30, defense: 20 })),
      playerDeck: [chopper, card('chopper-next', { attack: 10, defense: 8 }), card('third-player', { attack: 10, defense: 8 })],
      botDeck: [card('first-opponent', { attack: 30, defense: 20 }), card('second-opponent', { attack: 30, defense: 20 }), card('third-opponent', { attack: 30, defense: 20 })],
      totalRounds: 3,
    };
    const firstRound = gameReducer(state, { type: 'PLAY_ROUND' });
    const secondRound = gameReducer(gameReducer(firstRound, { type: 'NEXT_ROUND', payload: { fromRound: 0 } }), { type: 'PLAY_ROUND' });
    expect(secondRound.roundResults[1].playerBaseDamage).toBe(11);
    const thirdRound = gameReducer(gameReducer(secondRound, { type: 'NEXT_ROUND', payload: { fromRound: 1 } }), { type: 'PLAY_ROUND' });
    expect(thirdRound.roundResults[2].playerBaseDamage).toBe(10);
  });

  it('applies Toge’s −2 attack only in the next round after Toge wins', () => {
    const toge = card('toge_inumaki', { attack: 16, defense: 10 });
    const state: GameState = {
      ...postLossState(toge, card('weak-opponent', { attack: 5, defense: 0 })),
      playerDeck: [toge, card('player-next', { attack: 10, defense: 8 })],
      botDeck: [card('weak-opponent', { attack: 5, defense: 0 }), card('penalized-opponent', { attack: 12, defense: 8 })],
    };
    const firstRound = gameReducer(state, { type: 'PLAY_ROUND' });
    const secondRound = gameReducer(gameReducer(firstRound, { type: 'NEXT_ROUND', payload: { fromRound: 0 } }), { type: 'PLAY_ROUND' });
    expect(secondRound.roundResults[1].botBaseDamage).toBe(10);
  });

  it('records Bulma’s class-count scan as information without changing combat statistics', () => {
    const bulma = card('bulma', { attack: 10, defense: 8 });
    const state: GameState = {
      ...postLossState(bulma, card('swordsman-opponent', { cardClass: 'swordsman', attack: 10, defense: 8 })),
      playerDeck: [bulma, card('player-next')],
      botDeck: [card('swordsman-opponent', { cardClass: 'swordsman', attack: 10, defense: 8 }), card('mage-opponent', { cardClass: 'mage', attack: 10, defense: 8 })],
    };
    const resolved = gameReducer(state, { type: 'PLAY_ROUND' });
    expect(resolved.roundResults[0].playerInfo).toContain('ساحر: 1');
    expect(resolved.roundResults[0].playerInfo).not.toContain('سياف: 1');
    expect(resolved.roundResults[0].playerBaseDamage).toBe(10);
  });

  it('does not activate Yata Mirror in the first round', () => {
    const itachi = card('itachi_uchiha', { attack: 10, defense: 10 });
    const openingOpponent = card('opening-opponent', { attack: 8, defense: 6 });
    const state: GameState = {
      ...postLossState(itachi, openingOpponent),
      playerDeck: [itachi, card('player-next')],
      botDeck: [openingOpponent, card('bot-next', { defense: 24 })],
    };

    const firstRound = gameReducer(state, { type: 'PLAY_ROUND' });
    expect(firstRound.roundResults[0].botCard.defense).toBe(6);
  });

  it('copies the previous opponent defense when Itachi appears from round two', () => {
    const previousOpponent = card('previous-opponent', { attack: 8, defense: 7 });
    const currentOpponent = card('current-opponent', { attack: 12, defense: 24 });
    const itachi = card('itachi_uchiha', { attack: 16, defense: 12 });
    const state: GameState = {
      ...postLossState(card('opening-player', { attack: 10, defense: 8 }), previousOpponent),
      playerDeck: [card('opening-player', { attack: 10, defense: 8 }), itachi],
      botDeck: [previousOpponent, currentOpponent],
    };

    const firstRound = gameReducer(state, { type: 'PLAY_ROUND' });
    const nextRound = gameReducer(firstRound, { type: 'NEXT_ROUND', payload: { fromRound: 0 } });
    const secondRound = gameReducer(nextRound, { type: 'PLAY_ROUND' });
    expect(secondRound.roundResults[1].botCard.defense).toBe(7);
  });

  it('applies All Might’s alignment aura from his appearance through the rest of the match', () => {
    const allMight = card('all_might', { alignment: 'good', attack: 20, defense: 18 });
    const goodFollower = card('good-follower', { alignment: 'good', attack: 10, defense: 10 });
    const evilOpponent = card('evil-opponent', { alignment: 'evil', attack: 10, defense: 12 });
    const state: GameState = {
      ...postLossState(allMight, evilOpponent),
      playerDeck: [allMight, goodFollower],
      botDeck: [evilOpponent, card('neutral-opponent', { alignment: 'neutral' })],
      totalRounds: 2,
      playerScore: 2,
      botScore: 2,
      playerMaxHealth: 2,
      botMaxHealth: 2,
    };
    const started = gameReducer(state, { type: 'START_BATTLE' });
    const firstRound = gameReducer(started, { type: 'PLAY_ROUND' });
    expect(firstRound.roundResults[0].playerBaseDamage).toBe(23);
    expect(firstRound.roundResults[0].playerDamage).toBe(14);

    const nextRound = gameReducer(firstRound, { type: 'NEXT_ROUND', payload: { fromRound: 0 } });
    const secondRound = gameReducer(nextRound, { type: 'PLAY_ROUND' });
    expect(secondRound.roundResults[1].playerBaseDamage).toBe(13);
  });

  it('swaps active stat debuffs between players when Obito appears', () => {
    const state: GameState = {
      ...postLossState(card('obito_uchiha', { attack: 10, defense: 10 }), card('opponent', { attack: 10, defense: 10 })),
      activeEffects: [
        effect('player-attack-debuff', 'attack', -4),
        { ...effect('bot-defense-debuff', 'defense', -2), targetSide: 'bot', sourceSide: 'player' },
      ],
    };
    const resolved = gameReducer(state, { type: 'PLAY_ROUND' });
    expect(resolved.roundResults[0].playerBaseDamage).toBe(10);
    expect(resolved.roundResults[0].botBaseDamage).toBe(6);
    expect(resolved.roundResults[0].botDamage).toBe(0);
  });

  it('swaps only the next round cards when Artorias clears the four-point threshold', () => {
    const state: GameState = {
      ...postLossState(card('artorias', { attack: 20, defense: 10 }), card('opponent', { attack: 10, defense: 16 })),
      playerDeck: [card('artorias', { attack: 20, defense: 10 }), card('player-next')],
      botDeck: [card('opponent', { attack: 10, defense: 16 }), card('bot-next')],
    };
    const firstRound = gameReducer(state, { type: 'PLAY_ROUND' });
    expect(firstRound.activeEffects).toContainEqual(expect.objectContaining({ kind: 'nextRoundCardSwap' }));

    const nextRound = gameReducer(firstRound, { type: 'NEXT_ROUND', payload: { fromRound: 0 } });
    const swappedRound = gameReducer(nextRound, { type: 'PLAY_ROUND' });
    expect(swappedRound.roundResults[1].playerCard.id).toBe('bot-next');
    expect(swappedRound.roundResults[1].botCard.id).toBe('player-next');
    expect(swappedRound.activeEffects.some(item => item.kind === 'nextRoundCardSwap')).toBe(false);
  });
});
