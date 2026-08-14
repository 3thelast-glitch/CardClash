import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LuxuryBackground } from '@/components/game/luxury-background';
import { COLOR, FONT, RADIUS, SHADOW, SPACE } from '@/components/ui/design-tokens';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';

type LobbyPhase = 'menu' | 'matchmaking' | 'waiting_opponent' | 'ready';

export default function MultiplayerLobbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    queueRankedMatch,
    cancelMatchmaking,
  } = useMultiplayer();

  const [playerName, setPlayerName] = useState(state.playerName);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const phase: LobbyPhase = (() => {
    if (state.matchmaking.status === 'searching') return 'matchmaking';
    if (!state.roomId) return 'menu';
    if (!state.opponentId) return 'waiting_opponent';
    return 'ready';
  })();

  useEffect(() => {
    if (phase === 'ready' || phase === 'menu') setIsConnecting(false);
  }, [phase]);

  const withConnection = async (action: () => void) => {
    if (!playerName.trim()) {
      setError('أدخل اسمك أولاً');
      return;
    }
    setError('');
    setIsConnecting(true);
    try {
      await connect();
      action();
    } catch {
      setError('تعذر الاتصال بخادم اللعب الجماعي');
      setIsConnecting(false);
    }
  };

  const handleCreate = () => withConnection(() => createRoom(playerName.trim()));

  const handleJoin = () => {
    if (!joinInput.trim()) {
      setError('أدخل كود الغرفة');
      return;
    }
    withConnection(() => joinRoom(joinInput.trim().toUpperCase(), playerName.trim()));
  };

  const handleQuickMatch = () => withConnection(() => queueRankedMatch(playerName.trim()));

  const handleBack = () => {
    if (phase === 'matchmaking') {
      cancelMatchmaking();
      setIsConnecting(false);
      return;
    }
    if (phase !== 'menu') {
      leaveRoom();
      return;
    }
    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.bg}><LuxuryBackground /></View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>⚔️ الساحة الجماعية</Text>
          <Text style={styles.subtitle}>منافسة سريعة، غرف أصدقاء، وترتيب تنافسي</Text>
        </View>

        {phase === 'menu' && (
          <>
            <View style={styles.nameCard}>
              <Text style={styles.label}>اسمك في اللعبة</Text>
              <TextInput
                style={styles.input}
                placeholder="اكتب اسمك..."
                placeholderTextColor="#64748b"
                value={playerName}
                onChangeText={setPlayerName}
                maxLength={20}
                textAlign="right"
              />
            </View>

            {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View>}

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.rankedCard, isConnecting && styles.disabled]} onPress={handleQuickMatch} disabled={isConnecting} activeOpacity={0.85}>
                <View style={styles.rankedCardTop}>
                  <View style={styles.rankEmblem}><Text style={styles.rankEmblemText}>♜</Text></View>
                  <View style={styles.rankedCopy}>
                    <Text style={styles.rankedTitle}>مطابقة تنافسية</Text>
                    <Text style={styles.rankedDesc}>خصم مناسب لترتيبك الحالي</Text>
                  </View>
                  <Text style={styles.rankedArrow}>←</Text>
                </View>
                <View style={styles.rankedStatsRow}>
                  <Text style={styles.rankedStatsText}>{state.rankedProfile.tier}</Text>
                  <Text style={styles.rankedStatsText}>ELO {state.rankedProfile.rating}</Text>
                  <Text style={styles.rankedStatsText}>{state.rankedProfile.wins} فوز</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو العب مع صديق</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={[styles.btn, styles.btnCreate, isConnecting && styles.disabled]} onPress={handleCreate} disabled={isConnecting} activeOpacity={0.85}>
                {isConnecting ? <ActivityIndicator color="#fff" /> : <><Text style={styles.btnIcon}>🏠</Text><Text style={styles.btnText}>إنشاء غرفة خاصة</Text></>}
              </TouchableOpacity>

              <View style={styles.joinRow}>
                <TextInput
                  style={[styles.input, styles.joinInput]}
                  placeholder="كود الغرفة"
                  placeholderTextColor="#64748b"
                  value={joinInput}
                  onChangeText={(text) => setJoinInput(text.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  textAlign="center"
                />
                <TouchableOpacity style={[styles.btn, styles.btnJoin, isConnecting && styles.disabled]} onPress={handleJoin} disabled={isConnecting} activeOpacity={0.85}>
                  <Text style={styles.btnText}>انضم</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {phase === 'matchmaking' && (
          <View style={styles.matchmakingBox}>
            <View style={styles.searchOrbit}><ActivityIndicator size="large" color={COLOR.gold} /></View>
            <Text style={styles.matchmakingTitle}>نبحث عن منافس مناسب</Text>
            <Text style={styles.matchmakingDesc}>يبدأ البحث بفارق ترتيب ضيق، ثم يتوسع تدريجياً إذا طال الانتظار.</Text>
            <View style={styles.matchMetaRow}>
              <Metric label="رتبتك" value={state.rankedProfile.tier} />
              <Metric label="نطاق البحث" value={`±${state.matchmaking.searchRange ?? 100}`} />
              <Metric label="دورك" value={`#${state.matchmaking.position ?? 1}`} />
            </View>
            <TouchableOpacity style={styles.cancelQueueBtn} onPress={cancelMatchmaking} activeOpacity={0.8}>
              <Text style={styles.cancelQueueText}>إلغاء البحث</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'waiting_opponent' && (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingLabel}>كود الغرفة</Text>
            <Text style={styles.roomCode}>{state.roomId}</Text>
            <Text style={styles.waitingHint}>أرسل الكود لصديقك. ستظهر حالته فور انضمامه.</Text>
            <ActivityIndicator color={COLOR.gold} />
          </View>
        )}

        {phase === 'ready' && (
          <View style={styles.readyBox}>
            <Text style={styles.readyIcon}>✅</Text>
            <Text style={styles.readyTitle}>الخصم حاضر!</Text>
            <Text style={styles.readyPlayers}>{state.playerName} <Text style={{ color: COLOR.gold }}>VS</Text> {state.opponentName}</Text>
            {state.isRankedMatch ? (
              <View style={styles.rankedMatchBadge}><Text style={styles.rankedMatchBadgeText}>⚔️ مباراة تنافسية متوازنة</Text></View>
            ) : (
              <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{state.isHost ? '👑 أنت صاحب الجلسة' : '👤 أنت ضيف الجلسة'}</Text></View>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={() => router.push('/screens/rounds-config' as any)} activeOpacity={0.85}>
              <Text style={styles.btnIcon}>🎴</Text><Text style={styles.btnText}>التالي: إعداد البطاقات</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase !== 'menu' && <TouchableOpacity style={styles.backBtn} onPress={handleBack}><Text style={styles.backText}>{phase === 'matchmaking' ? 'إلغاء والعودة' : '← مغادرة الغرفة'}</Text></TouchableOpacity>}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.matchMeta}><Text style={styles.matchMetaLabel}>{label}</Text><Text style={styles.matchMetaValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080612' },
  bg: { position: 'absolute', inset: 0 },
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: SPACE.xl, gap: SPACE.xl },
  header: { alignItems: 'center', gap: SPACE.sm },
  title: { fontSize: FONT.xxl + 4, color: COLOR.gold, letterSpacing: 1 },
  subtitle: { fontSize: FONT.sm, color: '#94a3b8', textAlign: 'center' },
  nameCard: { width: '100%', maxWidth: 440, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(228,165,42,0.22)', padding: SPACE.lg, gap: SPACE.sm },
  label: { color: '#94a3b8', fontSize: FONT.xs },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', color: '#f1f5f9', fontSize: FONT.base, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  errorBox: { backgroundColor: 'rgba(248,113,113,0.10)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', padding: SPACE.md },
  errorText: { color: '#f87171', fontSize: FONT.sm, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 440, gap: SPACE.lg },
  disabled: { opacity: 0.55 },
  rankedCard: { width: '100%', backgroundColor: 'rgba(228,165,42,0.10)', borderColor: 'rgba(228,165,42,0.58)', borderWidth: 1.5, borderRadius: RADIUS.lg, padding: SPACE.lg, gap: SPACE.md, ...SHADOW },
  rankedCardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  rankEmblem: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(228,165,42,0.20)', borderWidth: 1, borderColor: COLOR.gold, alignItems: 'center', justifyContent: 'center' },
  rankEmblemText: { color: COLOR.gold, fontSize: 25 },
  rankedCopy: { flex: 1, alignItems: 'flex-start', gap: 2 },
  rankedTitle: { color: COLOR.gold, fontSize: FONT.base },
  rankedDesc: { color: '#94a3b8', fontSize: FONT.xs },
  rankedArrow: { color: COLOR.gold, fontSize: 24 },
  rankedStatsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(228,165,42,0.18)', paddingTop: SPACE.sm },
  rankedStatsText: { color: '#d9e0eb', fontSize: FONT.xs },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#64748b', fontSize: FONT.xs },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, borderRadius: RADIUS.pill, paddingVertical: SPACE.lg, paddingHorizontal: SPACE.xl, borderWidth: 1.5 },
  btnCreate: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80', ...SHADOW },
  btnJoin: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa', paddingHorizontal: SPACE.xl },
  btnStart: { backgroundColor: 'rgba(228,165,42,0.15)', borderColor: COLOR.gold, marginTop: SPACE.md, ...SHADOW },
  btnIcon: { fontSize: 18 },
  btnText: { color: '#f1f5f9', fontSize: FONT.base, letterSpacing: 0.3 },
  joinRow: { flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' },
  joinInput: { flex: 1, letterSpacing: 4 },
  waitingBox: { alignItems: 'center', gap: SPACE.md, backgroundColor: 'rgba(228,165,42,0.06)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(228,165,42,0.25)', padding: SPACE.xxl, width: '100%', maxWidth: 440 },
  waitingLabel: { color: '#94a3b8', fontSize: FONT.sm },
  roomCode: { fontSize: 40, color: COLOR.gold, letterSpacing: 8, fontVariant: ['tabular-nums'] } as any,
  waitingHint: { color: '#94a3b8', fontSize: FONT.sm, textAlign: 'center' },
  matchmakingBox: { alignItems: 'center', gap: SPACE.lg, backgroundColor: 'rgba(228,165,42,0.07)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(228,165,42,0.32)', padding: SPACE.xxl, width: '100%', maxWidth: 460 },
  searchOrbit: { width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, borderColor: 'rgba(228,165,42,0.5)', backgroundColor: 'rgba(228,165,42,0.08)', alignItems: 'center', justifyContent: 'center' },
  matchmakingTitle: { color: COLOR.gold, fontSize: FONT.xl, textAlign: 'center' },
  matchmakingDesc: { color: '#94a3b8', fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },
  matchMetaRow: { flexDirection: 'row', width: '100%', gap: SPACE.sm },
  matchMeta: { flex: 1, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: SPACE.sm, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  matchMetaLabel: { color: '#64748b', fontSize: 10 },
  matchMetaValue: { color: '#f1f5f9', fontSize: FONT.xs, textAlign: 'center' },
  cancelQueueBtn: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: 'rgba(248,113,113,0.6)', paddingHorizontal: SPACE.xl, paddingVertical: SPACE.sm, backgroundColor: 'rgba(248,113,113,0.08)' },
  cancelQueueText: { color: '#f87171', fontSize: FONT.sm },
  readyBox: { alignItems: 'center', gap: SPACE.md, padding: SPACE.xxl, width: '100%', maxWidth: 440 },
  readyIcon: { fontSize: 48 },
  readyTitle: { fontSize: FONT.xl, color: '#4ade80' },
  readyPlayers: { fontSize: FONT.base, color: '#e2e8f0', textAlign: 'center' },
  roleBadge: { borderRadius: RADIUS.pill, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs, borderWidth: 1, backgroundColor: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.25)' },
  roleBadgeText: { color: '#e2e8f0', fontSize: FONT.sm, textAlign: 'center' },
  rankedMatchBadge: { backgroundColor: 'rgba(228,165,42,0.12)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.4)', borderRadius: RADIUS.pill, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs },
  rankedMatchBadgeText: { color: COLOR.gold, fontSize: FONT.xs, textAlign: 'center' },
  backBtn: { marginTop: SPACE.xl, padding: SPACE.md },
  backText: { color: '#94a3b8', fontSize: FONT.sm },
});
