import React, { useCallback, useEffect } from 'react';
import { Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Share2, ShieldCheck, UserRound } from 'lucide-react-native';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ConnectionBadge } from '@/components/ui/ConnectionBadge';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  FONT,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';

export default function MultiplayerWaitingScreen() {
  const router = useRouter();
  const { state, leaveRoom } = useMultiplayer();

  useEffect(() => {
    if (state.status === 'playing') router.push('/screens/card-selection' as any);
  }, [router, state.status]);

  const handleShare = useCallback(async () => {
    if (!state.roomId) return;
    try {
      await Share.share({
        message: `انضم لمباراتي في Card Clash!\nرمز الغرفة: ${state.roomId}`,
      });
    } catch {}
  }, [state.roomId]);

  const handleLeave = () => {
    leaveRoom();
    router.back();
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="مغادرة والرجوع"
              onPress={handleLeave}
              style={styles.back}
            >
              <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <ThemedText type="title">غرفة اللعب</ThemedText>
              <ThemedText type="subtitle">الحالة الحقيقية للجلسة تظهر هنا.</ThemedText>
            </View>
          </View>

          {state.isHost && (
            <ObsidianPanel accent style={styles.codePanel}>
              <ConnectionBadge state={state.opponentId ? 'ready' : 'waiting'} />
              <ThemedText type="caption">رمز الغرفة</ThemedText>
              <ThemedText type="numeric" forceLtr style={styles.roomCode}>
                {state.roomId ?? '------'}
              </ThemedText>
              <ProButton
                label="مشاركة الرمز"
                variant="secondary"
                fullWidth
                onPress={() => void handleShare()}
                icon={<Share2 size={18} color="#DCE4FF" />}
              />
            </ObsidianPanel>
          )}

          <ObsidianPanel style={styles.playersPanel}>
            <Player
              label="أنت"
              name={state.playerName || 'لاعب'}
              connected
            />
            <View style={styles.vs}>
              <ShieldCheck size={22} color={SEMANTIC_COLOR.accent.primary} />
              <ThemedText type="numeric" style={styles.vsText}>VS</ThemedText>
            </View>
            <Player
              label="الخصم"
              name={state.opponentName ?? 'في الانتظار'}
              connected={Boolean(state.opponentId)}
            />
          </ObsidianPanel>

          <View style={styles.footer}>
            <ConnectionBadge
              state={state.opponentId ? 'ready' : state.isConnected ? 'waiting' : 'reconnecting'}
              label={
                state.opponentId
                  ? 'اكتمل طرفا الغرفة'
                  : state.isConnected
                    ? 'في انتظار الخصم'
                    : 'إعادة الاتصال بالخادم'
              }
            />
            <ProButton
              label="مغادرة الغرفة"
              variant="danger"
              fullWidth
              onPress={handleLeave}
              hapticEvent="invalid"
            />
          </View>
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

function Player({
  label,
  name,
  connected,
}: {
  label: string;
  name: string;
  connected: boolean;
}) {
  return (
    <View style={styles.player}>
      <View style={[styles.playerIcon, connected && styles.playerIconConnected]}>
        <UserRound
          size={24}
          color={connected ? SEMANTIC_COLOR.status.success : SEMANTIC_COLOR.text.secondary}
        />
      </View>
      <ThemedText type="caption">{label}</ThemedText>
      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.playerName}>
        {name}
      </ThemedText>
      <ConnectionBadge
        state={connected ? 'connected' : 'waiting'}
        label={connected ? 'متصل' : 'في الانتظار'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACE.lg,
    gap: SPACE.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  headerCopy: { flex: 1, alignItems: 'flex-end' },
  back: {
    width: TOUCH_TARGET.default,
    height: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,30,47,0.82)',
  },
  codePanel: { alignItems: 'center', gap: SPACE.md },
  roomCode: {
    color: SEMANTIC_COLOR.accent.primary,
    fontSize: 40,
    letterSpacing: 6,
  },
  playersPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  player: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: SPACE.xs,
  },
  playerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerIconConnected: {
    borderColor: 'rgba(74,222,128,0.48)',
  },
  playerName: { maxWidth: '100%', textAlign: 'center' },
  vs: { alignItems: 'center', gap: SPACE.xs },
  vsText: { color: SEMANTIC_COLOR.accent.primary, fontSize: FONT.md },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACE.md,
  },
});
