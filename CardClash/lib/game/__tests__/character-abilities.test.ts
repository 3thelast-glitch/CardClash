import { describe, expect, it } from 'vitest';
import { CHARACTER_ABILITY_DEFINITIONS, getCharacterAbility } from '../character-abilities';
import { buildAlphonseGoodAlignmentEffects, buildKaidoFactionEffects } from '../professional-card-abilities';
import { determineRoundWinner } from '../cards-data-exports';
import { gameReducer } from '../game-context';
import {
  applyOnSpawnPassive,
  applyPostBattlePassive,
  resolveSpecialAbility,
} from '../rage-engine';
import { applySpecialAbilityModifications, getDirectCharacterStatReasons, getEffectiveStats } from '../ui-helpers';
import type { Card, GameState } from '../types';

const makeCard = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  name: id,
  nameAr: id,
  attack: 10,
  defense: 0,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
  ...overrides,
});

const makeState = (playerCard: Card, botCard: Card, overrides: Partial<GameState> = {}): GameState => ({
  playerDeck: [playerCard],
  botDeck: [botCard],
  currentRound: 0,
  totalRounds: 1,
  playerScore: 1,
  botScore: 1,
  playerMaxHealth: 1,
  botMaxHealth: 1,
  roundResults: [],
  difficulty: 2,
  abilitiesEnabled: false,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
  ...overrides,
});

describe('سجل قدرات الشخصيات المنظم', () => {
  it('يعرّف القدرات التسع الحالية مع نص عربي وسلوك قابل للتنفيذ', () => {
    expect(Object.keys(CHARACTER_ABILITY_DEFINITIONS)).toHaveLength(9);
    expect(CHARACTER_ABILITY_DEFINITIONS.tsunade_medical_ninjutsu.roundStartHealthBonus).toBe(2);
    expect(CHARACTER_ABILITY_DEFINITIONS.makima_control.statModifiers?.attackBonus).toBe(4);
    expect(CHARACTER_ABILITY_DEFINITIONS.zoro_three_round_cut.cutNextRounds).toBe(3);
  });

  it('يدعم تعريف قدرة منظمة لبطاقة مستقبلية من دون الاعتماد على معرّفها', () => {
    const futureCard = makeCard('future-character', { characterAbilityId: 'makima_control' });

    expect(getCharacterAbility(futureCard)?.statModifiers?.attackBonus).toBe(4);
  });
});

describe('تدقيق قدرات الشخصيات: الحسم الفوري', () => {
  it('يفوز Mihawk على أي بطاقة من فئة swordsman حتى من دون وسم إضافي', () => {
    const mihawk = makeCard('dracule_mihawk', { name: 'Dracule Mihawk', nameAr: 'دراكول ميهوك' });
    const swordsman = makeCard('custom-swordsman', { cardClass: 'swordsman', tags: [] });

    expect(resolveSpecialAbility(mihawk, swordsman)).toBe('win');
  });

  it('يفوز Gehrman على أي بطاقة من عرق monster حتى من دون وسم إضافي', () => {
    const gehrman = makeCard('gehrman', { name: 'Gehrman, the First Hunter', nameAr: 'غيرمان، الصياد الأول' });
    const monster = makeCard('custom-monster', { race: 'monster', tags: [] });

    expect(resolveSpecialAbility(gehrman, monster)).toBe('win');
  });

  it('يخسر Sanji أمام أي شخصية female حتى من دون وسم إضافي', () => {
    const sanji = makeCard('sanji', { name: 'Sanji', nameAr: 'سانجي' });
    const female = makeCard('custom-female', { gender: 'female', tags: [] });

    expect(resolveSpecialAbility(sanji, female)).toBe('lose');
  });
});

describe('تدقيق قدرات الشخصيات: تعديل الإحصاءات', () => {
  it('يطابق Ainz وصفه بإلغاء دفاع الخصم', () => {
    const ainz = makeCard('ainz_ooal_gown');
    const opponent = makeCard('target', { defense: 99 });
    const ownStats = { attack: 10, defense: 10 };
    const opponentStats = { attack: 10, defense: 99 };

    applySpecialAbilityModifications(ainz, opponent, ownStats, opponentStats);

    expect(opponentStats.defense).toBe(0);
  });

  it('لا يطبق دفاع Gojo الخاص بعد إزالة القدرة', () => {
    const player = makeCard('player', { attack: 80, defense: 0 });
    const gojo = makeCard('satoru_gojo', { attack: 1, defense: 0 });

    expect(determineRoundWinner(player, gojo).winner).toBe('player');
  });

  it('لا يطبق هجوم Sukuna الإضافي بعد إزالة القدرة', () => {
    const player = makeCard('player', { attack: 24, defense: 0 });
    const sukuna = makeCard('ryomen_sukuna', { attack: 20, defense: 0 });

    expect(determineRoundWinner(player, sukuna).winner).toBe('player');
  });

  it('يطبق تحكم Makima ضد الوحوش والشياطين فقط', () => {
    const player = makeCard('player', { attack: 21, defense: 0, race: 'monster' });
    const makima = makeCard('makima', { attack: 18, defense: 0 });

    expect(determineRoundWinner(player, makima).winner).toBe('bot');
    expect(determineRoundWinner(makeCard('human-player', { attack: 21, defense: 0, race: 'human' }), makima).winner).toBe('player');
  });

  it('يعرض اسم قدرة الشخصية التي منحت بوفاً أو نيرفاً مباشراً', () => {
    const makima = makeCard('makima', { nameAr: 'ماكيما', attack: 18, defense: 0 });
    const monster = makeCard('monster', { race: 'monster', attack: 21, defense: 0 });

    expect(getDirectCharacterStatReasons(makima, monster)).toContainEqual(
      expect.objectContaining({ stat: 'attack', amount: 4, label: 'ماكيما — السيطرة' }),
    );
    expect(getDirectCharacterStatReasons(monster, makima)).toContainEqual(
      expect.objectContaining({ stat: 'attack', amount: -4, label: 'ماكيما — السيطرة' }),
    );
  });

  it('يمنح Kaido الفصائل المؤهلة +2 هجوم و+2 دفاع بعد ظهوره', () => {
    const kaido = makeCard('kaido');
    const dragon = makeCard('dragon-follower', { race: 'dragon', attack: 10, defense: 10 });
    const effects = buildKaidoFactionEffects([kaido, dragon], 'player', 2);
    const resolved = determineRoundWinner(dragon, makeCard('opponent', { attack: 10, defense: 10 }), effects, [], true, { playerScore: 2, botScore: 2 });

    expect(resolved.playerBaseDamage).toBe(12);
    expect(resolved.playerDamage).toBe(2);
    const human = makeCard('human-follower', { race: 'human', attack: 10, defense: 10 });
    expect(determineRoundWinner(human, makeCard('opponent', { attack: 10, defense: 10 }), effects, [], true, { playerScore: 2, botScore: 2 }).playerBaseDamage).toBe(10);
  });

  it('يعرض getEffectiveStats التعديلات النشطة فقط بعد إزالة قدرات غوجو وسوكونا', () => {
    const gojo = makeCard('satoru_gojo', { attack: 1, defense: 0 });
    const player = makeCard('player', { attack: 10, defense: 8 });
    const ainz = makeCard('ainz_ooal_gown');
    const makima = makeCard('makima');

    expect(getEffectiveStats(gojo.attack, gojo.defense, [], 'bot', gojo.cardClass, player, gojo)).toEqual({ attack: 1, defense: 0 });
    expect(getEffectiveStats(player.attack, player.defense, [], 'player', player.cardClass, ainz, player)).toEqual({ attack: 10, defense: 0 });
    expect(getEffectiveStats(player.attack, player.defense, [], 'player', player.cardClass, makima, player)).toEqual({ attack: 10, defense: 8 });
  });

  it('يمنح ألفونس كروت الخير +2 هجوم فقط عند التأخر بثلاث نقاط صحة', () => {
    const alphonse = makeCard('alphonse_elric');
    const goodFollower = makeCard('good-follower', { alignment: 'good', attack: 10, defense: 8 });
    const effects = buildAlphonseGoodAlignmentEffects([alphonse, goodFollower], 'player', 2);
    const behind = determineRoundWinner(goodFollower, makeCard('opponent', { attack: 10, defense: 8 }), effects, [], true, { playerScore: 1, botScore: 4 });
    const close = determineRoundWinner(goodFollower, makeCard('opponent', { attack: 10, defense: 8 }), effects, [], true, { playerScore: 2, botScore: 4 });
    expect(behind.playerBaseDamage).toBe(12);
    expect(close.playerBaseDamage).toBe(10);
  });
});

describe('تدقيق قدرات الشخصيات: الآثار السلبية', () => {
  it('يمنح Tsunade نقطتي HP عند الظهور', () => {
    const tsunade = makeCard('tsunade', { name: 'Tsunade', nameAr: 'تسونادي' });

    expect(applyOnSpawnPassive(tsunade).hp).toBe(2);
  });

  it('يطبق أثر Tsunade عند بدء المباراة على بطاقات اللاعب والبوت بالتساوي', () => {
    const playerTsunade = makeCard('tsunade', { name: 'Tsunade', nameAr: 'تسونادي' });
    const botTsunade = makeCard('tsunade', { name: 'Tsunade', nameAr: 'تسونادي' });
    const started = gameReducer(makeState(playerTsunade, botTsunade), {
      type: 'START_BATTLE',
      payload: { playerDeck: [playerTsunade], botDeck: [botTsunade], playerAbilities: [] },
    });

    expect(started.playerDeck[0].hp).toBe(2);
    expect(started.botDeck[0].hp).toBe(2);
    expect(started.playerScore).toBe(1);
    expect(started.botScore).toBe(1);

    const resolved = gameReducer(started, { type: 'PLAY_ROUND' });
    expect(resolved.playerScore).toBe(3);
    expect(resolved.botScore).toBe(3);
  });

  it('يعطي Sakura نقطة HP عند الفوز من أي جهة', () => {
    const sakura = makeCard('sakura_haruno', { name: 'Sakura Haruno', nameAr: 'ساكورا هارونو' });

    expect(applyPostBattlePassive(sakura, 'win').hp).toBe(1);

    const player = makeCard('player', { attack: 1, defense: 0 });
    const botSakura = makeCard('sakura_haruno', {
      name: 'Sakura Haruno',
      nameAr: 'ساكورا هارونو',
      attack: 20,
      defense: 0,
    });
    const resolved = gameReducer(makeState(player, botSakura), { type: 'PLAY_ROUND' });

    expect(resolved.botDeck[0].hp).toBe(1);
    expect(resolved.botScore).toBe(2);
  });
});
