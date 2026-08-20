import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Wi-Fi local multiplayer flow', () => {
  it('takes both connected phones from discovery to shared match settings', () => {
    const lobby = source('app/screens/local-lan.tsx');
    const config = source('app/screens/rounds-config.tsx');
    const context = source('lib/lan/lan-context.tsx');
    expect(lobby).toContain("router.replace('/screens/rounds-config'");
    expect(config).toContain('lan.configureMatch(rounds, withAbility, rarityWeights)');
    expect(config).toContain("gameState.matchMode === 'lan'");
    expect(config).toContain('setRarityWeights(lan.match.rarityWeights as RarityWeights)');
    expect(context).toContain('rarityWeights: LanRarityWeights');
    expect(context).toContain("LAN_MATCH_SETTINGS");
    expect(context).toContain('rarityWeights: sharedRarityWeights');
  });

  it('offers browser users a room-code fallback instead of native mDNS', () => {
    const lobby = source('app/screens/local-lan.tsx');
    const transport = source('lib/multiplayer/websocket-client.ts');
    expect(lobby).toContain('غرف الويب برمز');
    expect(lobby).toContain("router.replace('/screens/multiplayer-lobby'");
    expect(transport).toContain('resolveMultiplayerWebSocketUrl');
    expect(transport).toContain("wss:");
  });

  it('uses a responsive one-column phone layout and a balanced wide-screen room layout', () => {
    const lobby = source('app/screens/local-lan.tsx');
    expect(lobby).toContain('useWindowDimensions');
    expect(lobby).toContain('const isWideLayout = width >= 720;');
    expect(lobby).toContain('testID="lan-room-layout"');
    expect(lobby).toContain('columnsWide');
    expect(lobby).toContain('leftPaneWide');
    expect(lobby).toContain('rightPaneWide');
    expect(lobby).toContain('ScrollView');
    expect(lobby).toContain('emptyState');
    expect(lobby).toContain('rooms.map(renderRoom)');
    expect(lobby).not.toContain('FlatList');
  });

  it('gives each player independent abilities, synchronizes their activation, and waits for both players before the next round', () => {
    const context = source('lib/lan/lan-context.tsx');
    const selection = source('app/screens/card-selection.tsx');
    const battle = source('app/screens/lan-battle.tsx');
    expect(selection).toContain('lan.submitArrangement(sorted)');
    expect(context).toContain("LAN_MATCH_START");
    expect(context).toContain("LAN_REVEAL");
    expect(context).toContain("LAN_ROUND_RESULT");
    expect(context).toContain("LAN_ABILITY_REQUEST");
    expect(context).toContain("LAN_ABILITY_APPLIED");
    expect(context).toContain('hostAbilities');
    expect(context).toContain('guestAbilities');
    expect(context).toContain('useAbility');
    expect(context).toContain('queueMicrotask(() => startWhenReady(next));');
    expect(context).toContain('if (role === \'host\') queueMicrotask(() => resolveIfReady(next));');
    expect(context).toContain('comparison: {');
    expect(context).toContain('hostDamage: roundResult.playerDamage');
    expect(context).toContain('guestDamage: roundResult.botDamage');
    expect(context).toContain("LAN_NEXT_ROUND_READY");
    expect(context).toContain('hostNextReady');
    expect(context).toContain('guestNextReady');
    expect(context).toContain('confirmNextRound');
    expect(battle).toContain('revealCurrentCard()');
    expect(battle).toContain('قدرات');
    expect(battle).toContain('useAbility(ability.type)');
    expect(battle).toContain('getDynamicAudioWinner');
    expect(battle).toContain('match.hostDeck[match.currentRound]');
    expect(battle).toContain('match.guestDeck[match.currentRound]');
    expect(battle).toContain('match.activeEffects.filter');
    expect(battle).toContain('determineRoundWinner');
    expect(battle).toContain('playAudio={myCardAudio}');
    expect(battle).toContain('playAudio={opponentCardAudio}');
    expect(battle).toContain('معاينة النتيجة — كيف حُسمت الجولة؟');
    expect(battle).toContain('الضرر بعد الدفاع');
    expect(battle).toContain('القوة قبل الدفاع');
    expect(battle).toContain('getFactionLabel');
    expect(battle).toContain('confirmNextRound()');
    expect(battle).toContain('يجب أن يؤكد الطرفان للانتقال');
    expect(battle).toContain('finishMatch()');
  });

  it('synchronizes the used ability and renders active effect badges beside the Wi-Fi cards', () => {
    const context = source('lib/lan/lan-context.tsx');
    const battle = source('app/screens/lan-battle.tsx');
    expect(context).toContain('lastAbilityUse');
    expect(context).toContain("roundIndex, snapshot");
    expect(context).toContain("LAN_ABILITY_APPLIED");
    expect(battle).toContain('getActiveCardEffectBadges');
    expect(battle).toContain('AbilityActivationOverlay');
    expect(battle).toContain('تعزيز:');
    expect(battle).toContain('إضعاف:');
  });

  it('presents the synchronized Wi-Fi ability as a full card for fifteen seconds and keeps a used-card history', () => {
    const battle = source('app/screens/lan-battle.tsx');
    expect(battle).toContain('AbilityActivationOverlay');
    expect(battle).toContain('useAbilityActivationOverlay');
    expect(battle).toContain('duration: 15000');
    expect(battle).toContain('presentedAbilityRef');
    expect(battle).toContain('showAbilityCard({');
    expect(battle).toContain('buildLanAbilityCardData');
    expect(battle).toContain('fullAbilityCard');
    expect(battle).toContain('سجل القدرات');
    expect(battle).toContain('كروت القدرات المستخدمة');
    expect(battle).toContain('hostAbilities.filter(ability => ability.used)');
    expect(battle).toContain('guestAbilities.filter(ability => ability.used)');
  });

  it('lets the host request a rematch, lets the guest accept it, then sends both players back to card arrangement', () => {
    const context = source('lib/lan/lan-context.tsx');
    const battle = source('app/screens/lan-battle.tsx');
    expect(context).toContain('rematchRequested: boolean');
    expect(context).toContain('requestRematch');
    expect(context).toContain('acceptRematch');
    expect(context).toContain("LAN_REMATCH_REQUEST");
    expect(context).toContain("LAN_REMATCH_ACCEPTED");
    expect(context).toContain('resetForArrangement');
    expect(battle).toContain('↻ العب مجدداً');
    expect(battle).toContain('قبول إعادة المباراة');
    expect(battle).toContain("router.replace('/screens/card-selection'");
  });
});
