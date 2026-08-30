import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { LuxuryBackground } from '@/components/game/luxury-background';
import { COLOR, FONT, RADIUS, SHADOW, SPACE } from '@/components/ui/design-tokens';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/multiplayer/invites';
import { fetchJoinableRooms, type PublicRoom } from '@/lib/multiplayer/room-directory';

type LobbyPhase = 'menu' | 'matchmaking' | 'waiting_opponent' | 'ready';

const MATCHMAKING_TIPS = [
  { title: 'استغل الفصائل', text: 'كل فصيلة تتفوق على فصيلة واحدة وتتأثر بفصيلة واحدة ضمن دورة الفصائل. خطط لبطاقاتك قبل التأكيد.' },
  { title: 'وازن تشكيلتك', text: 'لا تعتمد على الهجوم فقط؛ بطاقة دفاعية في الجولة المناسبة قد تقلب نتيجة المواجهة.' },
  { title: 'راقب ترتيب الجولات', text: 'رتّب بطاقاتك حسب الأرقام المختارة. تبدأ الجولة الأولى بأول بطاقة في صفك.' },
  { title: 'القدرات الخاصة', text: 'فعّل بطاقة خاصة في التوقيت الحاسم لتقليل هجوم الخصم أو زيادة دفاع بطاقتك.' },
];

function MatchmakingRadar() {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0.94);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1.08, { duration: 1050 }), -1, true);
  }, [pulse, rotation]);

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value * 360}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 1.8 - pulse.value }));

  return (
    <View style={styles.radarShell} accessibilityLabel="يتم البحث عن لاعب مناسب">
      <Animated.View style={[styles.radarPulse, pulseStyle]} />
      <View style={styles.radarRingOuter} />
      <View style={styles.radarRingMid} />
      <View style={styles.radarRingInner} />
      <Animated.View style={[styles.radarSweep, sweepStyle]}><View style={styles.radarBeacon} /></Animated.View>
      <View style={styles.radarCore}><Text style={styles.radarCoreIcon}>♜</Text></View>
    </View>
  );
}

export default function MultiplayerLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
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
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [availableRooms, setAvailableRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState('');

  const inviteFromLink = useMemo(() => {
    const value = Array.isArray(params.invite) ? params.invite[0] : params.invite;
    return value ? normalizeInviteCode(value) : '';
  }, [params.invite]);

  const phase: LobbyPhase = (() => {
    if (state.matchmaking.status === 'searching') return 'matchmaking';
    if (!state.roomId) return 'menu';
    if (!state.opponentId) return 'waiting_opponent';
    return 'ready';
  })();

  const displayedSearchRange = Math.min(400, (state.matchmaking.searchRange ?? 100) + Math.floor(waitSeconds / 10) * 50);
  const waitTime = `${String(Math.floor(waitSeconds / 60)).padStart(2, '0')}:${String(waitSeconds % 60).padStart(2, '0')}`;
  const activeTip = MATCHMAKING_TIPS[tipIndex];

  useEffect(() => {
    if (phase === 'ready' || phase === 'menu') setIsConnecting(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'matchmaking') {
      setWaitSeconds(0);
      setTipIndex(0);
      return;
    }
    const timer = setInterval(() => setWaitSeconds((seconds) => seconds + 1), 1000);
    const tipTimer = setInterval(() => setTipIndex((index) => (index + 1) % MATCHMAKING_TIPS.length), 6000);
    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (inviteFromLink && isValidInviteCode(inviteFromLink)) {
      setJoinInput(inviteFromLink);
      setError('تم فتح دعوة خاصة. أدخل اسمك ثم اضغط «انضم».');
    }
  }, [inviteFromLink]);

  const refreshAvailableRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setRoomsError('');
    try {
      setAvailableRooms(await fetchJoinableRooms());
    } catch {
      setAvailableRooms([]);
      setRoomsError('تعذر تحميل الغرف الآن. يمكنك استخدام رمز الغرفة مباشرة.');
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (phase === 'menu') void refreshAvailableRooms();
  }, [phase, refreshAvailableRooms]);

  useEffect(() => {
    if (state.lastError) {
      setError(state.lastError === 'Invite code is invalid or already in use'
        ? 'رمز الدعوة غير صالح أو مستخدم بالفعل.'
        : state.lastError === 'رابط خادم اللعب الجماعي غير مضبوط في هذه النسخة.'
          ? state.lastError
        : 'تعذر إتمام الطلب. تأكد من الرمز وحاول مجدداً.');
      setIsConnecting(false);
    }
  }, [state.lastError]);

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
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'MultiplayerConfigurationError'
        ? 'رابط خادم اللعب الجماعي غير مضبوط في هذه النسخة.'
        : 'تعذر الاتصال بخادم اللعب الجماعي');
      setIsConnecting(false);
    }
  };

  const handleCreate = () => {
    const inviteCode = customInviteCode ? normalizeInviteCode(customInviteCode) : undefined;
    if (inviteCode && !isValidInviteCode(inviteCode)) {
      setError('استخدم رمزاً من 4 إلى 8 أحرف أو أرقام.');
      return;
    }
    withConnection(() => createRoom(playerName.trim(), inviteCode));
  };

  const handleJoin = () => {
    if (!joinInput.trim()) {
      setError('أدخل كود الغرفة');
      return;
    }
    withConnection(() => joinRoom(joinInput.trim().toUpperCase(), playerName.trim()));
  };

  const handleJoinListedRoom = (roomId: string) => {
    if (!playerName.trim()) {
      setError('أدخل اسمك أولاً');
      return;
    }
    setJoinInput(roomId);
    withConnection(() => joinRoom(roomId, playerName.trim()));
  };

  const handleQuickMatch = () => withConnection(() => queueRankedMatch(playerName.trim()));

  const inviteLink = state.roomId
    ? Linking.createURL('/screens/multiplayer-lobby', { queryParams: { invite: state.roomId } })
    : '';

  const handleShareInvite = useCallback(async () => {
    if (!state.roomId) return;
    try {
      await Share.share({
        title: 'دعوة مباراة خاصة في Card Clash',
        message: `انضم لمباراتي الخاصة في Card Clash!\nرمز الدعوة: ${state.roomId}\nافتح الرابط أو أدخل الرمز يدوياً:\n${inviteLink}`,
      });
    } catch {
      setError('تعذرت مشاركة الدعوة. يمكنك إرسال الرمز يدوياً.');
    }
  }, [inviteLink, state.roomId]);

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

              <View style={styles.customCodeCard}>
                <Text style={styles.customCodeTitle}>دعوة صديق برمز خاص</Text>
                <Text style={styles.customCodeHint}>اختياري — من 4 إلى 8 أحرف أو أرقام، مثل CLASH24</Text>
                <TextInput
                  style={[styles.input, styles.customCodeInput]}
                  placeholder="رمز الدعوة الخاص"
                  placeholderTextColor="#64748b"
                  value={customInviteCode}
                  onChangeText={(text) => setCustomInviteCode(normalizeInviteCode(text))}
                  maxLength={8}
                  autoCapitalize="characters"
                  textAlign="center"
                />
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
                  maxLength={8}
                  autoCapitalize="characters"
                  textAlign="center"
                />
                <TouchableOpacity style={[styles.btn, styles.btnJoin, isConnecting && styles.disabled]} onPress={handleJoin} disabled={isConnecting} activeOpacity={0.85}>
                  <Text style={styles.btnText}>انضم</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.directoryCard}>
                <View style={styles.directoryHeader}>
                  <View style={styles.directoryTitleBlock}>
                    <Text style={styles.directoryTitle}>الغرف المتاحة الآن</Text>
                    <Text style={styles.directoryHint}>اختر غرفة للانضمام مباشرة</Text>
                  </View>
                  <TouchableOpacity style={[styles.refreshRoomsBtn, isLoadingRooms && styles.disabled]} onPress={() => void refreshAvailableRooms()} disabled={isLoadingRooms} activeOpacity={0.75}>
                    {isLoadingRooms ? <ActivityIndicator size="small" color="#c4b5fd" /> : <Text style={styles.refreshRoomsText}>تحديث</Text>}
                  </TouchableOpacity>
                </View>
                {!!roomsError && <Text style={styles.directoryError}>{roomsError}</Text>}
                {!isLoadingRooms && !roomsError && availableRooms.length === 0 && <Text style={styles.directoryEmpty}>لا توجد غرف عامة في الانتظار حالياً. أنشئ غرفة أو اطلب من صديقك إنشاءها.</Text>}
                {availableRooms.slice(0, 8).map((room) => (
                  <View key={room.id} style={styles.directoryRoom}>
                    <View style={styles.directoryRoomCopy}>
                      <Text style={styles.directoryRoomHost}>غرفة {room.hostName}</Text>
                      <Text style={styles.directoryRoomCode}>{room.id}</Text>
                    </View>
                    <TouchableOpacity style={[styles.directoryJoinBtn, isConnecting && styles.disabled]} onPress={() => handleJoinListedRoom(room.id)} disabled={isConnecting} activeOpacity={0.8}>
                      <Text style={styles.directoryJoinText}>انضم</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {phase === 'matchmaking' && (
          <View style={styles.matchmakingBox}>
            <MatchmakingRadar />
            <Text style={styles.matchmakingTitle}>نبحث عن منافس مناسب</Text>
            <Text style={styles.matchmakingDesc}>نقارن ترتيبك مع لاعبين متصلين الآن، ثم نوسع النطاق تدريجياً للحفاظ على مباراة متوازنة.</Text>
            <View style={styles.matchMetaRow}>
              <Metric label="رتبتك" value={state.rankedProfile.tier} />
              <Metric label="نطاق البحث" value={`±${displayedSearchRange}`} />
              <Metric label="دورك" value={`#${state.matchmaking.position ?? 1}`} />
            </View>
            <View style={styles.liveStatusRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveStatusText}>بحث نشط منذ {waitTime}</Text>
            </View>
            <View style={styles.tipCard}>
              <Text style={styles.tipEyebrow}>تلميح استراتيجي</Text>
              <Text style={styles.tipTitle}>{activeTip.title}</Text>
              <Text style={styles.tipText}>{activeTip.text}</Text>
              <View style={styles.tipDots}>
                {MATCHMAKING_TIPS.map((tip, index) => (
                  <TouchableOpacity
                    key={tip.title}
                    accessibilityLabel={`عرض تلميح: ${tip.title}`}
                    onPress={() => setTipIndex(index)}
                    style={[styles.tipDot, index === tipIndex && styles.tipDotActive]}
                    activeOpacity={0.75}
                  />
                ))}
              </View>
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
            <Text style={styles.waitingHint}>شارك الدعوة بالرابط أو الكود. ستظهر حالة صديقك فور انضمامه.</Text>
            {state.isHost && <TouchableOpacity style={styles.shareInviteBtn} onPress={handleShareInvite} activeOpacity={0.8}>
              <Text style={styles.shareInviteText}>↗ مشاركة رابط الدعوة</Text>
            </TouchableOpacity>}
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
  customCodeCard: { gap: SPACE.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(96,165,250,0.35)', backgroundColor: 'rgba(96,165,250,0.06)', padding: SPACE.md },
  customCodeTitle: { color: '#bfdbfe', fontSize: FONT.sm, textAlign: 'right' },
  customCodeHint: { color: '#94a3b8', fontSize: 11, textAlign: 'right', lineHeight: 16 },
  customCodeInput: { letterSpacing: 3, color: '#dbeafe' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, borderRadius: RADIUS.pill, paddingVertical: SPACE.lg, paddingHorizontal: SPACE.xl, borderWidth: 1.5 },
  btnCreate: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80', ...SHADOW },
  btnJoin: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa', paddingHorizontal: SPACE.xl },
  btnStart: { backgroundColor: 'rgba(228,165,42,0.15)', borderColor: COLOR.gold, marginTop: SPACE.md, ...SHADOW },
  btnIcon: { fontSize: 18 },
  btnText: { color: '#f1f5f9', fontSize: FONT.base, letterSpacing: 0.3 },
  joinRow: { flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' },
  joinInput: { flex: 1, letterSpacing: 4 },
  directoryCard: { gap: SPACE.sm, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', backgroundColor: 'rgba(76,29,149,0.12)', padding: SPACE.md },
  directoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  directoryTitleBlock: { flex: 1, gap: 2 },
  directoryTitle: { color: '#ddd6fe', fontSize: FONT.base, textAlign: 'right' },
  directoryHint: { color: '#94a3b8', fontSize: 11, textAlign: 'right' },
  refreshRoomsBtn: { minWidth: 70, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1, borderColor: 'rgba(196,181,253,0.55)', backgroundColor: 'rgba(167,139,250,0.12)', paddingHorizontal: SPACE.sm },
  refreshRoomsText: { color: '#ddd6fe', fontSize: FONT.xs },
  directoryError: { color: '#fca5a5', fontSize: FONT.xs, lineHeight: 18, textAlign: 'right' },
  directoryEmpty: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 19, textAlign: 'right', paddingVertical: SPACE.sm },
  directoryRoom: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, borderTopWidth: 1, borderTopColor: 'rgba(196,181,253,0.15)', paddingTop: SPACE.sm },
  directoryRoomCopy: { flex: 1, gap: 2 },
  directoryRoomHost: { color: '#e2e8f0', fontSize: FONT.sm, textAlign: 'right' },
  directoryRoomCode: { color: '#c4b5fd', fontSize: FONT.xs, letterSpacing: 2, textAlign: 'right' },
  directoryJoinBtn: { minWidth: 72, minHeight: 36, borderRadius: RADIUS.pill, backgroundColor: 'rgba(74,222,128,0.14)', borderWidth: 1, borderColor: '#4ade80', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.sm },
  directoryJoinText: { color: '#bbf7d0', fontSize: FONT.xs },
  waitingBox: { alignItems: 'center', gap: SPACE.md, backgroundColor: 'rgba(228,165,42,0.06)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(228,165,42,0.25)', padding: SPACE.xxl, width: '100%', maxWidth: 440 },
  waitingLabel: { color: '#94a3b8', fontSize: FONT.sm },
  roomCode: { fontSize: 40, color: COLOR.gold, letterSpacing: 8, fontVariant: ['tabular-nums'] } as any,
  waitingHint: { color: '#94a3b8', fontSize: FONT.sm, textAlign: 'center' },
  shareInviteBtn: { borderRadius: RADIUS.pill, borderWidth: 1, borderColor: 'rgba(96,165,250,0.75)', backgroundColor: 'rgba(96,165,250,0.12)', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  shareInviteText: { color: '#bfdbfe', fontSize: FONT.sm },
  matchmakingBox: { alignItems: 'center', gap: SPACE.lg, backgroundColor: 'rgba(228,165,42,0.07)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(228,165,42,0.32)', padding: SPACE.xxl, width: '100%', maxWidth: 460 },
  radarShell: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  radarPulse: { position: 'absolute', width: 106, height: 106, borderRadius: 53, backgroundColor: 'rgba(228,165,42,0.12)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.45)' },
  radarRingOuter: { position: 'absolute', width: 98, height: 98, borderRadius: 49, borderWidth: 1, borderColor: 'rgba(228,165,42,0.42)' },
  radarRingMid: { position: 'absolute', width: 66, height: 66, borderRadius: 33, borderWidth: 1, borderColor: 'rgba(228,165,42,0.28)' },
  radarRingInner: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(228,165,42,0.22)' },
  radarSweep: { position: 'absolute', width: 98, height: 98, borderRadius: 49 },
  radarBeacon: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fef08a', shadowColor: '#fef08a', shadowOpacity: 1, shadowRadius: 7, elevation: 4, alignSelf: 'center', marginTop: -4 },
  radarCore: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: COLOR.gold, backgroundColor: 'rgba(228,165,42,0.20)', alignItems: 'center', justifyContent: 'center' },
  radarCoreIcon: { color: COLOR.gold, fontSize: 22 },
  matchmakingTitle: { color: COLOR.gold, fontSize: FONT.xl, textAlign: 'center' },
  matchmakingDesc: { color: '#94a3b8', fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },
  matchMetaRow: { flexDirection: 'row', width: '100%', gap: SPACE.sm },
  matchMeta: { flex: 1, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: SPACE.sm, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  matchMetaLabel: { color: '#64748b', fontSize: 10 },
  matchMetaValue: { color: '#f1f5f9', fontSize: FONT.xs, textAlign: 'center' },
  liveStatusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, alignSelf: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },
  liveStatusText: { color: '#bbf7d0', fontSize: FONT.xs },
  tipCard: { width: '100%', gap: 4, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(96,165,250,0.30)', backgroundColor: 'rgba(15,23,42,0.55)', padding: SPACE.md },
  tipEyebrow: { color: '#93c5fd', fontSize: 10, textAlign: 'right' },
  tipTitle: { color: '#dbeafe', fontSize: FONT.sm, textAlign: 'right' },
  tipText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18, textAlign: 'right' },
  tipDots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: SPACE.xs },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(148,163,184,0.45)' },
  tipDotActive: { width: 18, backgroundColor: COLOR.gold },
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
