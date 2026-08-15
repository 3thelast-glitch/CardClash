import { describe, expect, it } from 'vitest';
import { determineRoundWinner } from '../cards-data-exports';
import { gameReducer } from '../game-context';
import {
  applyOnSpawnPassive,
  applyPostBattlePassive,
  resolveSpecialAbility,
} from '../rage-engine';
import { applySpecialAbilityModifications, getEffectiveStats } from '../ui-helpers';
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
  roundResults: [],
  difficulty: 2,
  abilitiesEnabled: false,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
  ...overrides,
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

  it('يطبق دفاع Gojo على الخصم عندما تكون بطاقة Gojo في جهة البوت', () => {
    const player = makeCard('player', { attack: 80, defense: 0 });
    const gojo = makeCard('satoru_gojo', { attack: 1, defense: 0 });

    expect(determineRoundWinner(player, gojo).winner).toBe('bot');
  });

  it('يطبق هجوم Sukuna الإضافي عندما تكون بطاقته في جهة البوت', () => {
    const player = makeCard('player', { attack: 24, defense: 0 });
    const sukuna = makeCard('ryomen_sukuna', { attack: 20, defense: 0 });

    expect(determineRoundWinner(player, sukuna).winner).toBe('bot');
  });

  it('يطبق تحكم Makima في الهجوم على كلا الطرفين عندما تكون في جهة البوت', () => {
    const player = makeCard('player', { attack: 21, defense: 0 });
    const makima = makeCard('makima', { attack: 18, defense: 0 });

    expect(determineRoundWinner(player, makima).winner).toBe('bot');
  });

  it('يطبق تعزيز Kaido على الإحصاءات عندما تكون بطاقته في جهة البوت', () => {
    const player = makeCard('player', { attack: 22, defense: 0 });
    const kaido = makeCard('kaido', { attack: 20, defense: 0 });

    expect(determineRoundWinner(player, kaido).winner).toBe('bot');
  });

  it('يعرض getEffectiveStats نفس التعديلات للشخصية في أي جانب', () => {
    const gojo = makeCard('satoru_gojo', { attack: 1, defense: 0 });
    const player = makeCard('player', { attack: 10, defense: 8 });
    const ainz = makeCard('ainz_ooal_gown');
    const makima = makeCard('makima');

    expect(getEffectiveStats(gojo.attack, gojo.defense, [], 'bot', gojo.cardClass, player, gojo)).toEqual({ attack: 1, defense: 99 });
    expect(getEffectiveStats(player.attack, player.defense, [], 'player', player.cardClass, ainz, player)).toEqual({ attack: 10, defense: 0 });
    expect(getEffectiveStats(player.attack, player.defense, [], 'player', player.cardClass, makima, player)).toEqual({ attack: 6, defense: 8 });
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
  });
});
