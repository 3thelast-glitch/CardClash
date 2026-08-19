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
    expect(context).toContain('if (role === \'host\') queueMicrotask(() => resolveIfReady(next));');
    expect(context).toContain("LAN_NEXT_ROUND_READY");
    expect(context).toContain('hostNextReady');
    expect(context).toContain('guestNextReady');
    expect(context).toContain('confirmNextRound');
    expect(battle).toContain('revealCurrentCard()');
    expect(battle).toContain('قدرات');
    expect(battle).toContain('useAbility(ability.type)');
    expect(battle).toContain('getDynamicAudioWinner');
    expect(battle).toContain('playAudio={myCardAudio}');
    expect(battle).toContain('playAudio={opponentCardAudio}');
    expect(battle).toContain('معاينة النتيجة — كيف حُسمت الجولة؟');
    expect(battle).toContain('confirmNextRound()');
    expect(battle).toContain('يجب أن يؤكد الطرفان للانتقال');
    expect(battle).toContain('finishMatch()');
  });
});
