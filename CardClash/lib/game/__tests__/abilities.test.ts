import { describe, expect, it } from 'vitest';
import { ABILITY_DETAILS } from '../ability-details';
import { gameReducer, getTurinPenaltyRounds } from '../game-context';
import type { AbilityData, AbilityType, Card, Effect, EffectKind, GameState, RoundResult } from '../types';

const makeCard = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  name: `Card ${id}`,
  nameAr: `بطاقة ${id}`,
  attack: 8,
  defense: 3,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
  ...overrides,
});

const previousPlayerCard = makeCard('p0', { attack: 12, defense: 6, element: 'earth' });
const previousBotCard = makeCard('b0', { attack: 20, defense: 4, element: 'water', cardClass: 'mage' });

const makeRoundResult = (
  winner: RoundResult['winner'] = 'player',
  playerCard = previousPlayerCard,
  botCard = previousBotCard,
): RoundResult => ({
  round: 1,
  playerCard,
  botCard,
  playerDamage: 5,
  botDamage: 1,
  playerBaseDamage: 8,
  botBaseDamage: 2,
  playerFactionAdvantage: 'neutral',
  botFactionAdvantage: 'neutral',
  playerHealthDelta: 0,
  botHealthDelta: 0,
  winner,
});

const makeEffect = (
  id: string,
  kind: EffectKind,
  targetSide: Effect['targetSide'],
  data: Record<string, unknown> = {},
  sourceSide: Effect['sourceSide'] = 'bot',
): Effect => ({
  id,
  kind,
  sourceSide,
  targetSide,
  createdAtRound: 1,
  expiresAtRound: 5,
  priority: 50,
  data,
});

const makeState = (ability: AbilityType, overrides: Partial<GameState> = {}): GameState => {
  const playerDeck = [
    previousPlayerCard,
    makeCard('p1', { attack: 8, defense: 3, cardClass: 'warrior', element: 'fire' }),
    makeCard('p2', { attack: 11, defense: 5, element: 'wind' }),
    makeCard('p3', { attack: 6, defense: 8, element: 'lightning' }),
    makeCard('p4', { attack: 10, defense: 4, element: 'earth' }),
  ];
  const botDeck = [
    previousBotCard,
    makeCard('b1', { attack: 20, defense: 2, cardClass: 'mage', element: 'water' }),
    makeCard('b2', { attack: 7, defense: 4, element: 'earth' }),
    makeCard('b3', { attack: 9, defense: 5, element: 'wind' }),
    makeCard('b4', { attack: 8, defense: 6, element: 'lightning' }),
  ];

  return {
    playerDeck,
    botDeck,
    currentRound: 1,
    totalRounds: 5,
    playerScore: 5,
    botScore: 5,
    playerMaxHealth: 5,
    botMaxHealth: 5,
    roundResults: [makeRoundResult()],
    difficulty: 2,
    abilitiesEnabled: true,
    activeEffects: [],
    playerAbilities: [{ type: ability, used: false }],
    botAbilities: [{ type: 'Reduction', used: false }],
    usedAbilities: [],
    ...overrides,
  };
};

const usePlayerAbility = (
  state: GameState,
  abilityType: AbilityType,
  data?: Record<string, unknown>,
): GameState => gameReducer(state, {
  type: 'USE_ABILITY',
  payload: { abilityType, isPlayer: true, data },
});

const playRound = (state: GameState): GameState => gameReducer(state, { type: 'PLAY_ROUND' });
const nextRound = (state: GameState): GameState => gameReducer(state, { type: 'NEXT_ROUND' });

const activationCases: {
  ability: Exclude<AbilityType, 'LoseHalfRounds'>;
  data?: Record<string, unknown>;
  effect?: EffectKind;
  requiresCriticalHealth?: boolean;
}[] = [
  { ability: 'LogicalEncounter', data: { predictions: { 3: 'win' } }, effect: 'prediction' },
  { ability: 'Recall' },
  { ability: 'Protection', effect: 'protection' },
  { ability: 'Arise' },
  { ability: 'Reinforcement', effect: 'fortify' },
  { ability: 'Wipe' },
  { ability: 'Purge' },
  { ability: 'HalvePoints', effect: 'halvePoints' },
  { ability: 'Seal', effect: 'silenceAbilities' },
  { ability: 'DoubleOrNothing', effect: 'doubleOrNothing' },
  { ability: 'StarSuperiority', effect: 'starAdvantage' },
  { ability: 'Reduction', effect: 'statModifier' },
  { ability: 'Sacrifice', effect: 'sacrifice' },
  { ability: 'Popularity', data: { round: 3 }, effect: 'forcedOutcome' },
  { ability: 'Eclipse', effect: 'statModifier' },
  { ability: 'CancelAbility', effect: 'silenceAbilities' },
  { ability: 'Revive' },
  { ability: 'ConsecutiveLossBuff', effect: 'consecutiveLoss' },
  { ability: 'Lifesteal', effect: 'lifesteal' },
  { ability: 'Revenge', effect: 'revengeBuff' },
  { ability: 'Suicide', effect: 'suicidePact' },
  { ability: 'Disaster', data: { roundIndex: 0 } },
  { ability: 'Compensation', effect: 'compensationBuff' },
  { ability: 'Weakening', effect: 'weakeningDebuff' },
  { ability: 'Misdirection', effect: 'doubleDebuffs' },
  { ability: 'StealAbility' },
  { ability: 'Rescue', effect: 'statModifier' },
  { ability: 'Trap', effect: 'trap' },
  { ability: 'ConvertDebuffsToBuffs', effect: 'convertDebuffs' },
  { ability: 'Sniping', data: { round: 3 }, effect: 'forcedOutcome' },
  { ability: 'Merge' },
  { ability: 'DoubleNextCards', effect: 'statModifier' },
  { ability: 'Deprivation', effect: 'deprivation' },
  { ability: 'Greed', effect: 'greedBuff' },
  { ability: 'Dilemma' },
  { ability: 'Subhan', data: { guessedAttack: 20 }, effect: 'statModifier' },
  { ability: 'Propaganda', data: { selection: 'warrior' }, effect: 'statModifier' },
  { ability: 'DoubleYourBuffs', effect: 'doubleBuffs' },
  { ability: 'Avatar', effect: 'statModifier' },
  { ability: 'Penetration', effect: 'statModifier' },
  { ability: 'Pool', effect: 'pool' },
  { ability: 'Conversion', effect: 'conversion' },
  { ability: 'Shield', effect: 'shieldGuard' },
  { ability: 'SwapClass' },
  { ability: 'TakeIt', effect: 'takeIt' },
  { ability: 'Skip', effect: 'forcedOutcome' },
  { ability: 'AddElement', data: { faction: 'elf' } },
  { ability: 'Explosion', effect: 'explosionDebuff' },
  { ability: 'DoublePoints', effect: 'doublePoints' },
  { ability: 'ElementalMastery', effect: 'factionMastery' },
  { ability: 'AbsoluteDominance', effect: 'absoluteDominance' },
  { ability: 'InfinityLoop' },
  { ability: 'PhantomBlade', effect: 'phantomBlade' },
  { ability: 'NothingHappened', effect: 'forcedOutcome', requiresCriticalHealth: true },
];

describe('تدقيق تفعيل بطاقات القدرات', () => {
  it('يغطي كل قدرة معلنة، مع استثناء عقوبة تورين التلقائية فقط', () => {
    const declaredAbilities = Object.keys(ABILITY_DETAILS).sort();
    const testedAbilities = [...activationCases.map(({ ability }) => ability), 'LoseHalfRounds'].sort();

    expect(declaredAbilities).toEqual(testedAbilities);
    expect(declaredAbilities).toHaveLength(55);
  });

  it.each(activationCases)('يفعّل $ability ويستهلكها مرة واحدة', ({ ability, data, effect, requiresCriticalHealth }) => {
    const next = usePlayerAbility(makeState(ability, requiresCriticalHealth ? { playerScore: 1 } : {}), ability, data);

    expect(next.playerAbilities).toContainEqual({ type: ability, used: true });
    expect(next.usedAbilities).toContain(ability);
    if (effect) expect(next.activeEffects.some(activeEffect => activeEffect.kind === effect)).toBe(true);
  });

  it('تستبدل Recall بطاقة الجولة الحالية ببطاقة اللاعب السابقة', () => {
    const next = usePlayerAbility(makeState('Recall'), 'Recall');
    expect(next.playerDeck[1].id).toBe('p0');
    expect(next.playerDeck[1].ability).toBeUndefined();
  });

  it('تستدعي Arise بطاقة خصم سابقة بلا قدرة', () => {
    const next = usePlayerAbility(makeState('Arise'), 'Arise');
    expect(next.playerDeck[1].id).toBe('b0');
    expect(next.playerDeck[1].ability).toBeUndefined();
  });

  it('تنعش Revive البطاقة السابقة بنصف الإحصاءات مقرباً للأعلى', () => {
    const next = usePlayerAbility(makeState('Revive'), 'Revive');
    expect(next.playerDeck[1]).toMatchObject({ id: 'p0', attack: 6, defense: 3 });
  });

  it('تبدل Disaster وDilemma بطاقة الخصم ببطاقات الجولات السابقة المناسبة', () => {
    const afterDisaster = usePlayerAbility(makeState('Disaster'), 'Disaster', { roundIndex: 0 });
    const afterDilemma = usePlayerAbility(makeState('Dilemma'), 'Dilemma');

    expect(afterDisaster.botDeck[1].id).toBe('b0');
    expect(afterDilemma.botDeck[1].id).toBe('p0');
  });

  it('تدمج Merge الإحصاءات وتبدل SwapClass الفئتين وتغير AddElement الفصيلة', () => {
    const merged = usePlayerAbility(makeState('Merge'), 'Merge');
    const swapped = usePlayerAbility(makeState('SwapClass'), 'SwapClass');
    const withFaction = usePlayerAbility(makeState('AddElement'), 'AddElement', { faction: 'elf' });

    expect(merged.playerDeck[1]).toMatchObject({ attack: 20, defense: 9 });
    expect(swapped.playerDeck[1].cardClass).toBe('mage');
    expect(swapped.botDeck[1].cardClass).toBe('warrior');
    expect(withFaction.playerDeck[1].race).toBe('elf');
  });

  it('تعيد InfinityLoop الجولات السابقة والنقاط إلى ما قبلها', () => {
    const next = usePlayerAbility(makeState('InfinityLoop'), 'InfinityLoop');

    expect(next.currentRound).toBe(0);
    expect(next.roundResults).toEqual([]);
    expect(next.playerScore).toBe(5);
    expect(next.botScore).toBe(5);
  });

  it('تمسح Wipe آثار صاحبها بينما يزيل Purge كل الآثار', () => {
    const effects = [
      makeEffect('player-debuff', 'statModifier', 'player', { stat: 'attack', amount: -2 }),
      makeEffect('bot-buff', 'statModifier', 'bot', { stat: 'attack', amount: 3 }, 'bot'),
    ];
    const wiped = usePlayerAbility(makeState('Wipe', { activeEffects: effects }), 'Wipe');
    const purged = usePlayerAbility(makeState('Purge', { activeEffects: effects }), 'Purge');

    expect(wiped.activeEffects.map(effect => effect.id)).toEqual(['bot-buff']);
    expect(purged.activeEffects).toEqual([]);
  });

  it('تسرق StealAbility قدرة خصم غير مستخدمة وتمنع الخصم من استخدامها', () => {
    const next = usePlayerAbility(makeState('StealAbility', {
      botAbilities: [{ type: 'Reduction', used: false }, { type: 'Shield', used: true }],
    }), 'StealAbility');

    expect(next.playerAbilities).toContainEqual({ type: 'Reduction', used: false });
    expect(next.botAbilities).toContainEqual({ type: 'Reduction', used: true });
  });
});

describe('تدقيق تسوية آثار القدرات في الجولة', () => {
  const losingState = (ability: AbilityType, overrides: Partial<GameState> = {}): GameState => {
    const state = makeState(ability, overrides);
    return {
      ...state,
      playerDeck: state.playerDeck.map((card, index) => index === 1 ? makeCard('weak-player', { attack: 2, defense: 0 }) : card),
      botDeck: state.botDeck.map((card, index) => index === 1 ? makeCard('strong-bot', { attack: 20, defense: 0, element: 'fire' }) : card),
    };
  };

  const winningState = (ability: AbilityType, overrides: Partial<GameState> = {}): GameState => {
    const state = makeState(ability, overrides);
    return {
      ...state,
      playerDeck: state.playerDeck.map((card, index) => index === 1 ? makeCard('strong-player', { attack: 20, defense: 0 }) : card),
      botDeck: state.botDeck.map((card, index) => index === 1 ? makeCard('weak-bot', { attack: 2, defense: 0, element: 'fire' }) : card),
    };
  };

  it('تمنع Protection وShield خسارة HP في الجولة الخاسرة', () => {
    const protectedRound = playRound(usePlayerAbility(losingState('Protection'), 'Protection'));
    const shieldedRound = playRound(usePlayerAbility(losingState('Shield'), 'Shield'));

    expect(protectedRound.playerScore).toBe(5);
    expect(shieldedRound.playerScore).toBe(5);
    expect(protectedRound.roundResults.at(-1)?.winner).toBe('bot');
    expect(shieldedRound.roundResults.at(-1)?.winner).toBe('bot');
  });

  it('يفرض StarSuperiority فوز المستخدم في سجل الجولة والنقاط', () => {
    const result = playRound(usePlayerAbility(losingState('StarSuperiority'), 'StarSuperiority'));

    expect(result.roundResults.at(-1)?.winner).toBe('player');
    expect(result.botScore).toBe(4);
    expect(result.playerScore).toBe(5);
  });

  it('يحوّل Skip الجولة إلى تعادل حقيقي بلا خسارة نقاط', () => {
    const result = playRound(usePlayerAbility(losingState('Skip'), 'Skip'));

    expect(result.roundResults.at(-1)?.winner).toBe('draw');
    expect(result.playerScore).toBe(5);
    expect(result.botScore).toBe(5);
  });

  it('لا تسمح لا شيء لا شيء حدث بالتفعيل إلا عند 1 HP أو الجولة الأخيرة وتنهي المباراة بتعادل', () => {
    const notCritical = usePlayerAbility(losingState('NothingHappened'), 'NothingHappened');
    expect(notCritical.playerAbilities[0]).toEqual({ type: 'NothingHappened', used: false });

    const critical = playRound(usePlayerAbility(losingState('NothingHappened', { playerScore: 1 }), 'NothingHappened'));
    expect(critical.roundResults.at(-1)?.winner).toBe('draw');
    expect(critical.forcedMatchOutcome).toBe('draw');
    expect(critical.playerScore).toBe(critical.botScore);

    const finalRound = makeState('NothingHappened', { currentRound: 4, totalRounds: 5, playerScore: 3, botScore: 5 });
    finalRound.playerDeck[4] = makeCard('final-weak-player', { attack: 2, defense: 0 });
    finalRound.botDeck[4] = makeCard('final-strong-bot', { attack: 20, defense: 0, element: 'fire' });
    const finalDraw = playRound(usePlayerAbility(finalRound, 'NothingHappened'));
    expect(finalDraw.roundResults.at(-1)?.winner).toBe('draw');
    expect(finalDraw.forcedMatchOutcome).toBe('draw');
    expect(finalDraw.playerScore).toBe(finalDraw.botScore);
  });

  it('يطبق DoublePoints وDoubleOrNothing وLifesteal مقدار خسارة HP الصحيح', () => {
    const doublePoints = playRound(usePlayerAbility(winningState('DoublePoints'), 'DoublePoints'));
    const doubleOrNothing = playRound(usePlayerAbility(winningState('DoubleOrNothing'), 'DoubleOrNothing'));
    const lifesteal = playRound(usePlayerAbility(winningState('Lifesteal'), 'Lifesteal'));

    expect(doublePoints.botScore).toBe(3);
    expect(doubleOrNothing.botScore).toBe(3);
    expect(lifesteal.botScore).toBe(3);
  });

  it('يلغي Pool نقاط الخصم ويجبر Trap الخصم على خسارة نقطة', () => {
    const pool = playRound(usePlayerAbility(losingState('Pool'), 'Pool'));
    const trap = playRound(usePlayerAbility(losingState('Trap'), 'Trap'));

    expect(pool.playerScore).toBe(4);
    expect(pool.botScore).toBe(5);
    expect(trap.playerScore).toBe(5);
    expect(trap.botScore).toBe(4);
  });

  it('ينشئ الفوز والخسارة آثار Reinforcement وGreed وRevenge وCompensation وExplosion', () => {
    const reinforcement = playRound(usePlayerAbility(winningState('Reinforcement'), 'Reinforcement'));
    const greed = playRound(usePlayerAbility(winningState('Greed'), 'Greed'));
    const revenge = playRound(usePlayerAbility(losingState('Revenge'), 'Revenge'));
    const compensation = playRound(usePlayerAbility(losingState('Compensation'), 'Compensation'));
    const explosion = playRound(usePlayerAbility(losingState('Explosion'), 'Explosion'));

    expect(reinforcement.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'player', data: { stat: 'defense', amount: 1 } }));
    expect(greed.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'player', data: { stat: 'attack', amount: 1 } }));
    expect(revenge.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'player', data: { stat: 'attack', amount: 1 } }));
    expect(compensation.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'player', data: { stat: 'defense', amount: 1 } }));
    expect(explosion.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'bot', data: { stat: 'defense', amount: -1 } }));
  });

  it('يبني ConsecutiveLossBuff هجوماً ودفاعاً بعد خسارتين متتاليتين', () => {
    const afterFirstLoss = nextRound(playRound(usePlayerAbility(losingState('ConsecutiveLossBuff'), 'ConsecutiveLossBuff')));
    afterFirstLoss.playerDeck[2] = makeCard('second-weak-player', { attack: 2, defense: 0 });
    afterFirstLoss.botDeck[2] = makeCard('second-strong-bot', { attack: 20, defense: 0, element: 'fire' });
    const afterSecondLoss = playRound(afterFirstLoss);

    expect(afterSecondLoss.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'player', data: { stat: 'attack', amount: 1 } }));
    expect(afterSecondLoss.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'player', data: { stat: 'defense', amount: 1 } }));
  });

  it('يمنح LogicalEncounter مكافأة عند صحة التوقع ويطبق Sacrifice عند الخسارة', () => {
    const predictionState = winningState('LogicalEncounter');
    predictionState.currentRound = 1;
    predictionState.totalRounds = 3;
    const predicted = nextRound(usePlayerAbility(predictionState, 'LogicalEncounter', { predictions: { 3: 'win' } }));
    const rewarded = playRound(predicted);

    const sacrificeState = losingState('Sacrifice');
    sacrificeState.activeEffects = [makeEffect('bot-buff', 'statModifier', 'bot', { stat: 'attack', amount: 5 }, 'bot')];
    const sacrificed = playRound(usePlayerAbility(sacrificeState, 'Sacrifice'));

    expect(rewarded.botScore).toBe(3);
    expect(sacrificed.activeEffects.some(effect => effect.id === 'bot-buff')).toBe(false);
  });

  it('تتحول وتضاعف وتنقل وتسرق الآثار المعدِّلة كما تصف القدرات', () => {
    const playerDebuff = makeEffect('player-debuff', 'statModifier', 'player', { stat: 'attack', amount: -2 });
    const playerBuff = makeEffect('player-buff', 'statModifier', 'player', { stat: 'defense', amount: 3 }, 'player');
    const botBuff = makeEffect('bot-buff', 'statModifier', 'bot', { stat: 'attack', amount: 4 }, 'bot');
    const botDebuff = makeEffect('bot-debuff', 'statModifier', 'bot', { stat: 'defense', amount: -2 });

    const convertedDebuffs = playRound(usePlayerAbility(winningState('ConvertDebuffsToBuffs', { activeEffects: [playerDebuff] }), 'ConvertDebuffsToBuffs'));
    const doubledBuffs = playRound(usePlayerAbility(winningState('DoubleYourBuffs', { activeEffects: [playerBuff] }), 'DoubleYourBuffs'));
    const converted = playRound(usePlayerAbility(winningState('Conversion', { activeEffects: [botBuff] }), 'Conversion'));
    const taken = playRound(usePlayerAbility(winningState('TakeIt', { activeEffects: [playerDebuff] }), 'TakeIt'));
    const deprived = playRound(usePlayerAbility(winningState('Deprivation', { activeEffects: [botBuff] }), 'Deprivation'));
    const misdirected = playRound(usePlayerAbility(winningState('Misdirection', { activeEffects: [botDebuff] }), 'Misdirection'));

    expect(convertedDebuffs.activeEffects).toContainEqual(expect.objectContaining({ id: expect.stringMatching(/^ConvertDebuffsToBuffs/), targetSide: 'player', data: { stat: 'attack', amount: 2 } }));
    expect(doubledBuffs.activeEffects).toContainEqual(expect.objectContaining({ id: 'player-buff', data: { stat: 'defense', amount: 6 } }));
    expect(converted.activeEffects).toContainEqual(expect.objectContaining({ id: 'bot-buff', data: { stat: 'attack', amount: -4 } }));
    expect(taken.activeEffects).toContainEqual(expect.objectContaining({ targetSide: 'bot', data: { stat: 'attack', amount: -2 } }));
    expect(deprived.activeEffects).toContainEqual(expect.objectContaining({ targetSide: 'player', data: { stat: 'attack', amount: 4 } }));
    expect(misdirected.activeEffects).toContainEqual(expect.objectContaining({ id: 'bot-debuff', data: { stat: 'defense', amount: -4 } }));
  });

  it('يطبق ElementalMastery أفضلية فصيلية كاملة وPhantomBlade هجوماً مضاعفاً', () => {
    const mastery = playRound(usePlayerAbility(losingState('ElementalMastery'), 'ElementalMastery'));
    const phantomState = losingState('PhantomBlade');
    phantomState.playerDeck[1] = makeCard('phantom-player', { attack: 11, defense: 0 });
    const phantom = playRound(usePlayerAbility(phantomState, 'PhantomBlade'));

    expect(mastery.roundResults.at(-1)?.playerFactionAdvantage).toBe('strong');
    expect(phantom.roundResults.at(-1)?.winner).toBe('player');
  });

  it('يمنع Seal وCancelAbility الخصم من استخدام القدرات ويلغي أثره الجاري', () => {
    const sealed = usePlayerAbility(winningState('Seal'), 'Seal');
    const afterBlockedUse = gameReducer(sealed, {
      type: 'USE_ABILITY',
      payload: { abilityType: 'Reduction', isPlayer: false },
    });

    const opponentEffect = makeEffect('opponent-effect', 'statModifier', 'player', { stat: 'attack', amount: -2 }, 'bot');
    const cancelled = usePlayerAbility(winningState('CancelAbility', { activeEffects: [opponentEffect] }), 'CancelAbility');

    expect(afterBlockedUse).toBe(sealed);
    expect(cancelled.activeEffects.some(effect => effect.id === 'opponent-effect')).toBe(false);
    expect(cancelled.activeEffects).toContainEqual(expect.objectContaining({ kind: 'silenceAbilities', targetSide: 'bot' }));
  });

  it('تفرض Popularity وSniping وAbsoluteDominance الفوز وفق الأولوية المعلنة', () => {
    const popularity = nextRound(usePlayerAbility(losingState('Popularity'), 'Popularity', { round: 3 }));
    const sniping = nextRound(usePlayerAbility(losingState('Sniping'), 'Sniping', { round: 3 }));
    const dominance = playRound(usePlayerAbility(losingState('AbsoluteDominance'), 'AbsoluteDominance'));

    expect(playRound(popularity).roundResults.at(-1)?.winner).toBe('player');
    expect(playRound(sniping).roundResults.at(-1)?.winner).toBe('player');
    expect(dominance.roundResults.at(-1)?.winner).toBe('player');
  });

  it('يطبق HalvePoints وSuicide وReduction وEclipse وPenetration آثار النقاط والإحصاءات المقصودة', () => {
    const halved = playRound(usePlayerAbility(winningState('HalvePoints'), 'HalvePoints'));
    const suicide = playRound(usePlayerAbility(losingState('Suicide'), 'Suicide'));

    const reductionState = losingState('Reduction');
    reductionState.playerDeck[1] = makeCard('reduction-player', { attack: 10, defense: 0 });
    reductionState.botDeck[1] = makeCard('reduction-bot', { attack: 11, defense: 0, element: 'fire' });
    const reduction = playRound(usePlayerAbility(reductionState, 'Reduction'));

    const eclipseState = losingState('Eclipse');
    eclipseState.playerDeck[1] = makeCard('eclipse-player', { attack: 10, defense: 0 });
    const eclipse = playRound(usePlayerAbility(eclipseState, 'Eclipse'));

    const penetrationState = losingState('Penetration');
    penetrationState.playerDeck[1] = makeCard('penetration-player', { attack: 10, defense: 0 });
    penetrationState.botDeck[1] = makeCard('penetration-bot', { attack: 2, defense: 15, element: 'fire' });
    const penetration = playRound(usePlayerAbility(penetrationState, 'Penetration'));

    expect(halved.playerScore).toBe(5);
    expect(halved.botScore).toBe(5);
    expect(suicide.playerScore).toBe(4);
    expect(suicide.botScore).toBe(5);
    expect(reduction.roundResults.at(-1)?.winner).toBe('player');
    expect(eclipse.roundResults.at(-1)?.winner).toBe('player');
    expect(penetration.roundResults.at(-1)?.winner).toBe('player');
  });

  it('يؤجل Rescue وDoubleNextCards للراوندات اللاحقة ويطبق Subhan وPropaganda وAvatar بالقيم الصحيحة', () => {
    const rescue = usePlayerAbility(winningState('Rescue'), 'Rescue');
    const doubleNext = usePlayerAbility(winningState('DoubleNextCards'), 'DoubleNextCards');
    const subhan = usePlayerAbility(winningState('Subhan'), 'Subhan', { guessedAttack: 2 });
    const propaganda = usePlayerAbility(winningState('Propaganda'), 'Propaganda', { selection: 'mage' });
    const avatar = usePlayerAbility(winningState('Avatar'), 'Avatar');

    expect(rescue.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', createdAtRound: 3, data: expect.objectContaining({ stat: 'defense', amount: 0, abilityType: 'Rescue' }) }));
    expect(doubleNext.activeEffects).toHaveLength(2);
    expect(doubleNext.activeEffects.map(effect => effect.createdAtRound).sort()).toEqual([3, 4]);
    expect(subhan.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', data: expect.objectContaining({ stat: 'attack', amount: 2, abilityType: 'Subhan' }) }));
    expect(propaganda.activeEffects).toContainEqual(expect.objectContaining({ kind: 'statModifier', targetSide: 'bot', data: expect.objectContaining({ stat: 'all_stats', amount: -2, targetClass: 'mage', abilityType: 'Propaganda' }) }));
    expect(avatar.activeEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({ data: expect.objectContaining({ stat: 'attack', amount: 2, abilityType: 'Avatar' }) }),
      expect.objectContaining({ data: expect.objectContaining({ stat: 'defense', amount: 2, abilityType: 'Avatar' }) }),
    ]));
  });
});

describe('قدرة Turin التلقائية', () => {
  it('تنشئ عقوبة نصف الجولات في بدء المباراة وتفرض خسارة النصف الأول', () => {
    const turin = makeCard('turin', { name: 'Turin', nameAr: 'تورين تورامباز' });
    const playerDeck = [turin, makeCard('p2'), makeCard('p3'), makeCard('p4')];
    const botDeck = [makeCard('b1'), makeCard('b2'), makeCard('b3'), makeCard('b4')];
    const setup = makeState('Protection', { playerDeck, botDeck, totalRounds: 4, currentRound: 0, roundResults: [] });
    const started = gameReducer(setup, { type: 'START_BATTLE', payload: { playerDeck, botDeck, playerAbilities: [] } });
    const resolved = playRound(started);

    expect(getTurinPenaltyRounds(4)).toBe(2);
    expect(started.activeEffects.filter(effect => effect.kind === 'turinPenalty')).toHaveLength(2);
    expect(resolved.roundResults.at(-1)?.winner).toBe('bot');
    expect(resolved.playerScore).toBe(3);
  });
});

describe('اختصار المطوّر لكرت لا شيء لا شيء حدث', () => {
  it('يستبدل أول قدرة غير مستخدمة فقط ويحافظ على القدرة الخاصة إن كانت موجودة', () => {
    const state = makeState('Protection', {
      playerAbilities: [
        { type: 'Protection', used: true },
        { type: 'Reduction', used: false },
        { type: 'Shield', used: false },
      ],
    });

    const granted = gameReducer(state, { type: 'GRANT_DEVELOPER_NOTHING_HAPPENED' });
    expect(granted.playerAbilities).toEqual([
      { type: 'Protection', used: true },
      { type: 'NothingHappened', used: false },
      { type: 'Shield', used: false },
    ]);

    const unchanged = gameReducer(granted, { type: 'GRANT_DEVELOPER_NOTHING_HAPPENED' });
    expect(unchanged).toBe(granted);
  });
});

describe('قدرة رورونوا زورو: يقطع 3 الجولات القادمة', () => {
  it('يفرض فوز صاحب زورو في الجولات الثلاث التالية مهما تفوقت كروت الخصم', () => {
    const zoro = makeCard('roronoa_zoro', {
      nameAr: 'رورونوا زورو',
      specialAbility: 'يقطع 3 الجولات القادمة',
      attack: 1,
      defense: 1,
    });
    const playerDeck = [zoro, makeCard('p1', { attack: 1, defense: 1 }), makeCard('p2', { attack: 1, defense: 1 }), makeCard('p3', { attack: 1, defense: 1 })];
    const botDeck = [makeCard('b0', { attack: 40, defense: 40 }), makeCard('b1', { attack: 40, defense: 40 }), makeCard('b2', { attack: 40, defense: 40 }), makeCard('b3', { attack: 40, defense: 40 })];
    const started = makeState('Protection', { playerDeck, botDeck, currentRound: 0, totalRounds: 4, roundResults: [] });

    const afterZoro = playRound(started);
    const cutEffect = afterZoro.activeEffects.find(effect => (effect.data as AbilityData | undefined)?.zoroCut);
    expect(cutEffect).toEqual(expect.objectContaining({
      kind: 'forcedOutcome', sourceSide: 'player', createdAtRound: 2, expiresAtRound: 4,
    }));

    const roundTwo = playRound(nextRound(afterZoro));
    const roundThree = playRound(nextRound(roundTwo));
    const roundFour = playRound(nextRound(roundThree));
    expect([roundTwo, roundThree, roundFour].map(state => state.roundResults.at(-1)?.winner)).toEqual(['player', 'player', 'player']);
    expect(roundFour.activeEffects.some(effect => (effect.data as AbilityData | undefined)?.zoroCut)).toBe(false);
  });
});


describe('استخدام البوت للقدرات قبل الهجوم', () => {
  it('يسجل قدرة البوت المفعلة في نتيجة الجولة', () => {
    const state = makeState('Protection', {
      abilitiesEnabled: true,
      botAbilities: [{ type: 'Protection', used: false }],
    });

    const afterAbility = gameReducer(state, {
      type: 'USE_ABILITY',
      payload: { abilityType: 'Protection', isPlayer: false },
    });
    expect(afterAbility.botAbilityUsedThisRound).toBe('Protection');

    const afterRound = gameReducer(afterAbility, { type: 'PLAY_ROUND' });
    expect(afterRound.roundResults.at(-1)?.botAbilityUsed).toBe('Protection');
    expect(afterRound.botAbilityUsedThisRound).toBeUndefined();
  });
});
