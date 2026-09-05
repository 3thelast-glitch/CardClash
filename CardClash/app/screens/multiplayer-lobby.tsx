import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Copy,
  Crown,
  DoorOpen,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Swords,
  UserRound,
  Users,
} from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
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
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/multiplayer/invites';
import { fetchJoinableRooms, type PublicRoom } from '@/lib/multiplayer/room-directory';

type LobbyPhase = 'menu' | 'matchmaking' | 'waiting_opponent' | 'ready';

function MatchmakingRadar() {
  const rotation = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    cancelAnimation(rotation);
    if (reduceMotion) {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [reduceMotion, rotation]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <View style={styles.radar} accessibilityLabel="يتم البحث عن لاعب مناسب">
      <View style={styles.radarOuter} />
      <View style={styles.radarInner} />
      {!reduceMotion && (
        <Animated.View pointerEvents="none" style={[styles.radarSweep, sweepStyle]}>
          <View style={styles.radarDot} />
        </Animated.View>
      )}
      <Search size={24} color={SEMANTIC_COLOR.accent.primary} />
    </View>
  );
}

export default function MultiplayerLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
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
  const [availableRooms, setAvailableRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState('');

  const inviteFromLink = useMemo(() => {
    const value = Array.isArray(params.invite) ? params.invite[0] : params.invite;
    return value ? normalizeInviteCode(value) : '';
  }, [params.invite]);

  const phase: LobbyPhase =
    state.matchmaking.status === 'searching'
      ? 'matchmaking'
      : !state.roomId
        ? 'menu'
        : !state.opponentId
          ? 'waiting_opponent'
          : 'ready';

  useEffect(() => {
    if (phase === 'ready' || phase === 'menu') setIsConnecting(false);
  }, [phase]);

  useEffect(() => {
    if (!inviteFromLink || !isValidInviteCode(inviteFromLink)) return;
    setJoinInput(inviteFromLink);
    setError('تم فتح دعوة خاصة. أدخل اسمك ثم اختر «انضم».');
  }, [inviteFromLink]);

  useEffect(() => {
    if (!state.lastError) return;
    setError(
      state.lastError === 'Invite code is invalid or already in use'
        ? 'رمز الدعوة غير صالح أو مستخدم بالفعل.'
        : state.lastError === 'رابط خادم اللعب الجماعي غير مضبوط في هذه النسخة.'
          ? state.lastError
          : 'تعذر إتمام الطلب. تحقق من الاتصال وحاول مجدداً.',
    );
    setIsConnecting(false);
  }, [state.lastError]);

  const refreshAvailableRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setRoomsError('');
    try {
      setAvailableRooms(await fetchJoinableRooms());
    } catch {
      setAvailableRooms([]);
      setRoomsError('تعذر تحميل الغرف الآن. استخدم رمز الغرفة مباشرة.');
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (phase === 'menu') void refreshAvailableRooms();
  }, [phase, refreshAvailableRooms]);

  const withConnection = async (action: () => void) => {
    if (!playerName.trim()) {
      setError('أدخل اسمك أولاً.');
      return;
    }
    setError('');
    setIsConnecting(true);
    try {
      await connect();
      action();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'MultiplayerConfigurationError'
          ? 'رابط خادم اللعب الجماعي غير مضبوط في هذه النسخة.'
          : 'تعذر الاتصال بخادم اللعب الجماعي.',
      );
      setIsConnecting(false);
    }
  };

  const handleCreate = () => {
    const inviteCode = customInviteCode ? normalizeInviteCode(customInviteCode) : undefined;
    if (inviteCode && !isValidInviteCode(inviteCode)) {
      setError('استخدم رمزاً من 4 إلى 8 أحرف أو أرقام.');
      return;
    }
    void withConnection(() => createRoom(playerName.trim(), inviteCode));
  };

  const handleJoin = () => {
    if (!joinInput.trim()) {
      setError('أدخل رمز الغرفة.');
      return;
    }
    void withConnection(() => joinRoom(normalizeInviteCode(joinInput), playerName.trim()));
  };

  const handleQuickMatch = () => {
    void withConnection(() => queueRankedMatch(playerName.trim()));
  };

  const inviteLink = state.roomId
    ? Linking.createURL('/screens/multiplayer-lobby', { queryParams: { invite: state.roomId } })
    : '';

  const shareInvite = useCallback(async () => {
    if (!state.roomId) return;
    try {
      await Share.share({
        title: 'دعوة Card Clash',
        message: `انضم لمباراتي في Card Clash\nرمز الغرفة: ${state.roomId}\n${inviteLink}`,
      });
    } catch {
      setError('تعذرت مشاركة الدعوة. أرسل الرمز يدوياً.');
    }
  }, [inviteLink, state.roomId]);

  const handleBack = () => {
    if (phase === 'matchmaking') {
      cancelMatchmaking();
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
      <View style={StyleSheet.absoluteFill}><LuxuryBackground /></View>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={handleBack}
              style={styles.back}
            >
              <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <ThemedText type="title">الساحة الجماعية</ThemedText>
              <ThemedText type="subtitle">
                مطابقة تنافسية أو غرفة خاصة — دون تغيير بروتوكول WebSocket الحالي
              </ThemedText>
            </View>
          </View>

          {!!error && (
            <ObsidianPanel style={styles.errorPanel}>
              <ThemedText type="label" style={styles.errorText}>{error}</ThemedText>
            </ObsidianPanel>
          )}

          {phase === 'menu' && (
            <View style={styles.stack}>
              <ObsidianPanel>
                <ThemedText type="label" style={styles.fieldLabel}>اسم اللاعب</ThemedText>
                <TextInput
                  accessibilityLabel="اسم اللاعب"
                  value={playerName}
                  onChangeText={setPlayerName}
                  maxLength={20}
                  placeholder="اكتب اسمك"
                  placeholderTextColor={SEMANTIC_COLOR.text.secondary}
                  style={styles.input}
                  textAlign="right"
                />
              </ObsidianPanel>

              <ObsidianPanel accent style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <View style={styles.iconBox}>
                    <Swords size={24} color={SEMANTIC_COLOR.accent.primary} />
                  </View>
                  <View style={styles.cardCopy}>
                    <ThemedText type="defaultSemiBold">مطابقة تنافسية</ThemedText>
                    <ThemedText type="caption">
                      يستخدم الخادم ترتيبك الحالي لاختيار خصم.
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.rankRow}>
                  <RankMetric label="التصنيف" value={state.rankedProfile.tier} />
                  <RankMetric label="ELO" value={state.rankedProfile.rating} />
                  <RankMetric label="الفوز" value={state.rankedProfile.wins} />
                </View>
                <ProButton
                  label="ابدأ البحث"
                  onPress={handleQuickMatch}
                  loading={isConnecting}
                  fullWidth
                />
              </ObsidianPanel>

              <ObsidianPanel style={styles.stack}>
                <View style={styles.sectionTitleRow}>
                  <Users size={20} color={SEMANTIC_COLOR.accent.secondary} />
                  <ThemedText type="defaultSemiBold">غرفة خاصة</ThemedText>
                </View>

                <ThemedText type="caption" style={styles.fieldLabel}>
                  رمز مخصص اختياري — 4 إلى 8 أحرف أو أرقام
                </ThemedText>
                <TextInput
                  accessibilityLabel="رمز مخصص للغرفة"
                  value={customInviteCode}
                  onChangeText={(text) => setCustomInviteCode(normalizeInviteCode(text))}
                  maxLength={8}
                  autoCapitalize="characters"
                  placeholder="CLASH24"
                  placeholderTextColor={SEMANTIC_COLOR.text.secondary}
                  style={[styles.input, styles.codeInput]}
                  textAlign="center"
                />
                <ProButton
                  label="إنشاء غرفة"
                  variant="secondary"
                  onPress={handleCreate}
                  disabled={isConnecting}
                  fullWidth
                  icon={<DoorOpen size={18} color="#DCE4FF" />}
                />

                <View style={styles.divider} />

                <TextInput
                  accessibilityLabel="رمز الغرفة"
                  value={joinInput}
                  onChangeText={(text) => setJoinInput(normalizeInviteCode(text))}
                  maxLength={8}
                  autoCapitalize="characters"
                  placeholder="رمز الغرفة"
                  placeholderTextColor={SEMANTIC_COLOR.text.secondary}
                  style={[styles.input, styles.codeInput]}
                  textAlign="center"
                />
                <ProButton
                  label="انضم"
                  variant="ghost"
                  onPress={handleJoin}
                  disabled={isConnecting}
                  fullWidth
                />
              </ObsidianPanel>

              <ObsidianPanel>
                <View style={styles.directoryHeader}>
                  <View style={styles.cardCopy}>
                    <ThemedText type="defaultSemiBold">الغرف المتاحة</ThemedText>
                    <ThemedText type="caption">الغرف العامة في حالة انتظار فقط.</ThemedText>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="تحديث قائمة الغرف"
                    onPress={() => void refreshAvailableRooms()}
                    disabled={isLoadingRooms}
                    style={styles.refreshButton}
                  >
                    {isLoadingRooms
                      ? <ActivityIndicator size="small" color={SEMANTIC_COLOR.accent.primary} />
                      : <RefreshCw size={18} color={SEMANTIC_COLOR.accent.primary} />}
                  </TouchableOpacity>
                </View>
                {roomsError ? <ThemedText type="caption" style={styles.errorText}>{roomsError}</ThemedText> : null}
                {!isLoadingRooms && !roomsError && availableRooms.length === 0 ? (
                  <ThemedText type="caption" style={styles.emptyText}>لا توجد غرف عامة في الانتظار الآن.</ThemedText>
                ) : null}
                {availableRooms.slice(0, 8).map((room) => (
                  <View key={room.id} style={styles.roomRow}>
                    <View style={styles.roomCopy}>
                      <ThemedText type="label">غرفة {room.hostName}</ThemedText>
                      <ThemedText type="numeric" forceLtr style={styles.roomCodeSmall}>{room.id}</ThemedText>
                    </View>
                    <ProButton
                      label="انضم"
                      variant="ghost"
                      disabled={isConnecting}
                      onPress={() => {
                        setJoinInput(room.id);
                        void withConnection(() => joinRoom(room.id, playerName.trim()));
                      }}
                    />
                  </View>
                ))}
              </ObsidianPanel>
            </View>
          )}

          {phase === 'matchmaking' && (
            <ObsidianPanel accent style={styles.stateCard}>
              <ConnectionBadge state="connecting" label="البحث نشط" />
              <MatchmakingRadar />
              <ThemedText type="title" style={styles.centerText}>نبحث عن منافس مناسب</ThemedText>
              <ThemedText type="subtitle" style={styles.centerText}>
                ستنتقل تلقائياً عند تأكيد الخادم للمباراة.
              </ThemedText>
              <View style={styles.rankRow}>
                <RankMetric label="التصنيف" value={state.rankedProfile.tier} />
                <RankMetric
                  label="نطاق البحث"
                  value={state.matchmaking.searchRange == null ? '—' : `±${state.matchmaking.searchRange}`}
                />
                <RankMetric
                  label="الموقع"
                  value={state.matchmaking.position == null ? '—' : `#${state.matchmaking.position}`}
                />
              </View>
              <ProButton label="إلغاء البحث" variant="danger" onPress={cancelMatchmaking} fullWidth hapticEvent="invalid" />
            </ObsidianPanel>
          )}

          {phase === 'waiting_opponent' && (
            <ObsidianPanel accent style={styles.stateCard}>
              <ConnectionBadge state="waiting" />
              <UserRound size={30} color={SEMANTIC_COLOR.accent.primary} />
              <ThemedText type="subtitle">شارك هذا الرمز مع صديقك</ThemedText>
              <ThemedText type="numeric" forceLtr style={styles.roomCode}>{state.roomId}</ThemedText>
              {state.isHost && (
                <ProButton
                  label="مشاركة الدعوة"
                  variant="secondary"
                  onPress={() => void shareInvite()}
                  icon={<Share2 size={18} color="#DCE4FF" />}
                  fullWidth
                />
              )}
              <ActivityIndicator color={SEMANTIC_COLOR.accent.primary} />
            </ObsidianPanel>
          )}

          {phase === 'ready' && (
            <ObsidianPanel accent style={styles.stateCard}>
              <ConnectionBadge state="ready" />
              <ShieldCheck size={34} color={SEMANTIC_COLOR.status.success} />
              <ThemedText type="title" style={styles.centerText}>الخصم حاضر</ThemedText>
              <View style={styles.playersRow}>
                <PlayerSlot
                  name={state.playerName || 'أنت'}
                  role={state.isHost ? 'المضيف' : 'الضيف'}
                  host={state.isHost}
                />
                <ThemedText type="numeric" style={{ color: SEMANTIC_COLOR.accent.primary }}>VS</ThemedText>
                <PlayerSlot
                  name={state.opponentName || 'الخصم'}
                  role={state.isHost ? 'الضيف' : 'المضيف'}
                  host={!state.isHost}
                />
              </View>
              <ProButton
                label="التالي: إعداد البطاقات"
                onPress={() => router.push('/screens/rounds-config' as any)}
                fullWidth
              />
            </ObsidianPanel>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RankMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.rankMetric}>
      <ThemedText type="caption">{label}</ThemedText>
      <ThemedText type="numeric" style={styles.rankValue}>{value}</ThemedText>
    </View>
  );
}

function PlayerSlot({ name, role, host }: { name: string; role: string; host: boolean }) {
  return (
    <View style={styles.playerSlot} accessibilityLabel={`${name}، ${role}`}>
      {host
        ? <Crown size={18} color={SEMANTIC_COLOR.status.warning} />
        : <UserRound size={18} color={SEMANTIC_COLOR.accent.secondary} />}
      <ThemedText type="label" numberOfLines={1}>{name}</ThemedText>
      <ThemedText type="caption">{role}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SEMANTIC_COLOR.background.base },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.xxxl,
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
    backgroundColor: 'rgba(19,30,47,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { gap: SPACE.md },
  errorPanel: { borderColor: 'rgba(251,113,133,0.48)' },
  errorText: { color: '#FFD0D8', textAlign: 'right' },
  fieldLabel: { textAlign: 'right', marginBottom: SPACE.xs },
  input: {
    minHeight: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.56)',
    color: SEMANTIC_COLOR.text.primary,
    fontFamily: 'NotoKufiArabic_400Regular',
    fontSize: FONT.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  codeInput: {
    fontFamily: 'RobotoCondensed_700Bold',
    writingDirection: 'ltr',
    letterSpacing: 2.5,
  },
  matchCard: { gap: SPACE.md },
  matchHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57,230,208,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.32)',
  },
  cardCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  rankRow: { flexDirection: 'row', gap: SPACE.sm, width: '100%' },
  rankMetric: {
    flex: 1,
    minHeight: 58,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(8,13,22,0.44)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rankValue: { color: SEMANTIC_COLOR.accent.primary, fontSize: FONT.md },
  divider: { height: 1, backgroundColor: SEMANTIC_COLOR.border.subtle },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACE.sm },
  directoryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.sm },
  refreshButton: {
    width: TOUCH_TARGET.default,
    height: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'right', paddingVertical: SPACE.md },
  roomRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: SEMANTIC_COLOR.border.subtle,
    paddingVertical: SPACE.sm,
  },
  roomCopy: { flex: 1, alignItems: 'flex-end' },
  roomCodeSmall: { color: SEMANTIC_COLOR.accent.secondary, fontSize: FONT.sm },
  stateCard: { width: '100%', alignItems: 'center', gap: SPACE.lg },
  centerText: { textAlign: 'center' },
  radar: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarOuter: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.30)',
  },
  radarInner: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.20)',
  },
  radarSweep: { position: 'absolute', width: 108, height: 108 },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SEMANTIC_COLOR.accent.primary,
    alignSelf: 'center',
    marginTop: -4,
  },
  roomCode: {
    color: SEMANTIC_COLOR.accent.primary,
    fontSize: 40,
    letterSpacing: 6,
  },
  playersRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  playerSlot: {
    flex: 1,
    minHeight: 92,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    padding: SPACE.sm,
  },
});
