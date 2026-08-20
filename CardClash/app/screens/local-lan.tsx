import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import type { LanRoom } from '@/lib/lan/lan-protocol';

const STATUS_COPY = {
  idle: 'جاهز للشبكة المحلية',
  hosting: 'غرفتك منشورة على Wi‑Fi',
  discovering: 'نبحث عن غرف قريبة…',
  connecting: 'اتصال مباشر بالمضيف…',
  connected: 'اتصال TCP محلي مباشر',
  failed: 'تعذر اتصال LAN',
} as const;

export default function LocalLanScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { rooms, hostedRoom, state, notice, peer, isSupported, hostRoom, refreshRooms, joinRoom, leave } = useLanMultiplayer();
  const [name, setName] = useState('لاعب محلي');
  const [busy, setBusy] = useState(false);
  const hasEnteredMatchFlow = useRef(false);
  const isCompact = width < 420 || height < 600;
  const isWideLayout = width >= 720;

  useEffect(() => {
    if (isSupported) refreshRooms();
  }, [isSupported, refreshRooms]);

  useEffect(() => {
    if (state !== 'connected' || !peer || hasEnteredMatchFlow.current) return;
    hasEnteredMatchFlow.current = true;
    router.replace('/screens/rounds-config' as any);
  }, [peer, router, state]);

  const run = async (action: () => Promise<void> | void) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  const renderRoom = (item: LanRoom) => (
    <View key={`${item.id}-${item.hostAddress}`} style={[styles.roomCard, isCompact && styles.roomCardCompact]}>
      <View style={styles.roomSignal}><View style={styles.roomSignalDot} /><Text style={styles.roomSignalText}>LAN</Text></View>
      <View style={styles.roomCopy}>
        <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.roomMeta} numberOfLines={2}>{item.hostAddress}:{item.port} · الإصدار {item.version}</Text>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, (busy || state === 'connected') && styles.disabled]}
        onPress={() => void run(() => joinRoom(item, name))}
        disabled={busy || state === 'connected'}
        activeOpacity={0.75}
      >
        <Text style={styles.joinText}>انضم</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.bg}><LuxuryBackground /></View>
      <View style={[styles.container, isWideLayout && styles.containerWide]}>
        <View style={[styles.headerRow, isWideLayout && styles.headerRowWide]}>
          <TouchableOpacity style={styles.back} onPress={() => { leave(); router.back(); }} activeOpacity={0.75}><Text style={styles.backText}>← رجوع</Text></TouchableOpacity>
          <View style={styles.titleGroup}>
            <View style={styles.networkBadge}><View style={styles.networkBadgeDot} /><Text style={styles.networkBadgeText}>{isSupported ? 'LAN / Wi‑Fi' : 'WEB / WSS'}</Text></View>
            <Text style={[styles.title, isCompact && styles.titleCompact]}>{isSupported ? 'غرف Wi‑Fi المحلية' : 'غرف الويب برمز'}</Text>
            <Text style={styles.subtitle}>{isSupported ? 'اتصل مباشرةً بلاعب قريب على الشبكة نفسها.' : 'أنشئ رمز الغرفة وشاركه مع صديقك للاتصال الآمن.'}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, isWideLayout && styles.scrollContentWide]} showsVerticalScrollIndicator={false}>
          <View testID="lan-room-layout" style={[styles.columns, isWideLayout && styles.columnsWide]}>
          <View style={[styles.leftPane, isWideLayout && styles.leftPaneWide]}>
            <View style={styles.panelHeading}>
              <Text style={styles.panelEyebrow}>الاتصال المحلي</Text>
              <Text style={styles.panelTitle}>ابدأ أو حدّث البحث</Text>
            </View>
            <View style={[styles.statusCard, state === 'connected' && styles.statusConnected, state === 'failed' && styles.statusError]}>
              <View style={[styles.dot, state === 'connected' && styles.dotOnline, state === 'failed' && styles.dotFailed]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>{STATUS_COPY[state]}</Text>
                <Text style={styles.statusText}>{peer ? `متصل مع ${peer.name}` : notice || 'اتصل بنفس Wi‑Fi ثم أنشئ غرفة أو ابحث عنها.'}</Text>
              </View>
            </View>

            {!isSupported ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>اللعب من المتصفح متاح برمز غرفة</Text>
                <Text style={styles.infoText}>لا يستطيع المتصفح نشر mDNS أو استقبال TCP مباشر، لكنه يستطيع إنشاء غرفة برمز أو الانضمام إليها عبر خادم اللعب الجماعي الآمن.</Text>
                <TouchableOpacity style={styles.webRoomButton} onPress={() => router.replace('/screens/multiplayer-lobby' as any)} activeOpacity={0.8}>
                  <Text style={styles.webRoomButtonText}>فتح غرف الويب برمز</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>اسم اللاعب</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={20} placeholder="اسمك" placeholderTextColor="#64748b" textAlign="right" />
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.primaryButton, (busy || !!hostedRoom) && styles.disabled]} disabled={busy || !!hostedRoom} onPress={() => void run(() => hostRoom(name))}>
                    <Text style={styles.primaryText}>{hostedRoom ? `رمز غرفتك: ${hostedRoom.id}` : 'إنشاء غرفة'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.refreshButton, busy && styles.disabled]} disabled={busy} onPress={refreshRooms} activeOpacity={0.75}><Text style={styles.refreshText}>↻ تحديث</Text></TouchableOpacity>
                </View>
                {busy && <ActivityIndicator color={COLOR.gold} style={{ marginTop: SPACE.sm }} />}
                {state === 'connected' && <View style={styles.connectedNote}><Text style={styles.connectedNoteText}>✓ تم الاتصال. ننتقل الآن لإعداد المباراة.</Text></View>}
              </>
            )}
          </View>

          <View style={[styles.rightPane, isWideLayout && styles.rightPaneWide]}>
            <View style={styles.roomsHeader}>
              <View style={styles.roomsCount}><Text style={styles.roomsCountText}>{rooms.length}</Text></View>
              <View style={styles.roomsHeaderCopy}><Text style={styles.sectionTitle}>الغرف المتاحة</Text><Text style={styles.sectionSubtitle}>تظهر الغرف القريبة تلقائياً عند تحديث البحث.</Text></View>
            </View>
            {rooms.length ? <View style={styles.list}>{rooms.map(renderRoom)}</View> : <View style={styles.emptyState}><Text style={styles.emptyIcon}>⌁</Text><Text style={styles.emptyTitle}>لا توجد غرف مكتشفة الآن</Text><Text style={styles.empty}>افتح هذه الشاشة في هاتف ثانٍ على شبكة Wi‑Fi نفسها، ثم أنشئ غرفة أو اضغط «تحديث».</Text></View>}
          </View>
          </View>
          <Text style={styles.footer}>{Platform.OS === 'web' ? 'تحتاج غرف الويب إلى رابط WebSocket آمن مهيأ عند النشر.' : 'للاتصال المحلي: أوقف AP Isolation في إعدادات الراوتر.'}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.bgDeep }, bg: { ...StyleSheet.absoluteFillObject, opacity: 0.95 }, container: { flex: 1, width: '100%', alignSelf: 'center', maxWidth: 1180, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md }, containerWide: { paddingHorizontal: SPACE.xl, paddingVertical: SPACE.lg },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: SPACE.sm, marginBottom: SPACE.md }, headerRowWide: { alignItems: 'center', marginBottom: SPACE.lg }, titleGroup: { flex: 1, alignItems: 'flex-end' }, networkBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(45,212,191,0.42)', backgroundColor: 'rgba(45,212,191,0.10)', marginBottom: 5 }, networkBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2dd4bf' }, networkBadgeText: { color: '#5eead4', fontSize: 9, fontWeight: '900' }, back: { minHeight: 42, paddingHorizontal: SPACE.md, justifyContent: 'center', borderRadius: RADIUS.sm, backgroundColor: 'rgba(15,23,42,0.72)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.32)' }, backText: { color: COLOR.gold, fontSize: FONT.sm, fontWeight: '800' }, title: { color: '#f5f3ff', fontSize: FONT.xl, textAlign: 'right', fontWeight: '900' }, titleCompact: { fontSize: FONT.lg }, subtitle: { color: COLOR.textMuted, fontSize: FONT.xs, marginTop: 3, textAlign: 'right', lineHeight: 18, maxWidth: 640 },
  scrollContent: { paddingBottom: SPACE.md, gap: SPACE.md }, scrollContentWide: { flexGrow: 1, justifyContent: 'center' }, columns: { gap: SPACE.md }, columnsWide: { flexDirection: 'row-reverse', alignItems: 'stretch' }, leftPane: { gap: SPACE.sm }, leftPaneWide: { width: 390, flexShrink: 0 }, panelHeading: { alignItems: 'flex-end', gap: 2, marginBottom: 2 }, panelEyebrow: { color: '#5eead4', fontSize: 10, fontWeight: '900' }, panelTitle: { color: '#f8fafc', fontSize: FONT.md, fontWeight: '900' }, rightPane: { minHeight: 235, borderRadius: RADIUS.md, backgroundColor: 'rgba(8,12,28,0.78)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.34)', padding: SPACE.md }, rightPaneWide: { flex: 1, minHeight: 320 },
  statusCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: 'rgba(15,20,42,0.9)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.28)' }, statusConnected: { borderColor: 'rgba(74,222,128,0.65)' }, statusError: { borderColor: 'rgba(248,113,113,0.65)' }, dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2dd4bf' }, dotOnline: { backgroundColor: '#4ADE80' }, dotFailed: { backgroundColor: '#F87171' }, statusTitle: { color: '#d7f9f2', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' }, statusText: { color: COLOR.textMuted, fontSize: FONT.xs, lineHeight: 18, marginTop: 3, textAlign: 'right' },
  label: { color: '#d8c577', fontSize: FONT.sm, textAlign: 'right', marginTop: SPACE.xs }, input: { minHeight: 48, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(228,165,42,0.35)', paddingHorizontal: SPACE.md, color: '#fff5d6', backgroundColor: 'rgba(8,11,24,0.84)', fontFamily: 'NotoKufiArabic_400Regular' }, actionRow: { flexDirection: 'row-reverse', gap: SPACE.sm }, primaryButton: { flex: 1, minHeight: 48, borderRadius: RADIUS.sm, backgroundColor: COLOR.gold, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE.sm }, primaryText: { color: '#241b0b', fontSize: FONT.xs, fontWeight: '900', textAlign: 'center' }, refreshButton: { minWidth: 106, minHeight: 48, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#8b5cf6', backgroundColor: 'rgba(124,95,214,0.12)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE.sm }, refreshText: { color: '#ddd6fe', fontSize: FONT.xs, fontWeight: '800' }, disabled: { opacity: 0.55 },
  roomsHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.md }, roomsHeaderCopy: { flex: 1, alignItems: 'flex-end' }, roomsCount: { minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.16)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.38)' }, roomsCountText: { color: '#ddd6fe', fontWeight: '900', fontSize: FONT.sm }, sectionTitle: { color: '#f1e7ff', fontSize: FONT.md, fontWeight: '900', textAlign: 'right' }, sectionSubtitle: { color: COLOR.textMuted, fontSize: 10, textAlign: 'right', marginTop: 2 }, list: { gap: SPACE.sm }, emptyState: { alignItems: 'center', justifyContent: 'center', minHeight: 150, paddingVertical: SPACE.lg, paddingHorizontal: SPACE.md, gap: 5 }, emptyIcon: { color: '#a78bfa', fontSize: 34, lineHeight: 40 }, emptyTitle: { color: '#e9ddff', fontSize: FONT.sm, fontWeight: '900', textAlign: 'center' }, empty: { color: COLOR.textMuted, fontSize: FONT.xs, lineHeight: 20, textAlign: 'center', maxWidth: 420 }, roomCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.32)', backgroundColor: 'rgba(20,20,45,0.82)' }, roomCardCompact: { padding: SPACE.sm }, roomSignal: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12, backgroundColor: 'rgba(45,212,191,0.10)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.28)' }, roomSignalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2dd4bf' }, roomSignalText: { color: '#7df0df', fontSize: 8, fontWeight: '900' }, roomCopy: { flex: 1, minWidth: 0 }, roomName: { color: '#f7f0ff', fontWeight: '900', fontSize: FONT.sm, textAlign: 'right' }, roomMeta: { color: COLOR.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right', lineHeight: 15 }, joinButton: { backgroundColor: '#7755d1', minHeight: 40, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(221,214,254,0.38)' }, joinText: { color: '#fff', fontWeight: '900', fontSize: FONT.xs },
  infoBox: { padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: 'rgba(92,58,24,0.55)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.55)' }, infoTitle: { color: '#f6c76f', fontWeight: '900', textAlign: 'right' }, infoText: { color: '#e4c798', marginTop: SPACE.xs, fontSize: FONT.xs, textAlign: 'right', lineHeight: 19 }, webRoomButton: { minHeight: 44, marginTop: SPACE.md, borderRadius: RADIUS.sm, backgroundColor: '#4f46a5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.md }, webRoomButtonText: { color: '#fff', fontWeight: '900', fontSize: FONT.sm }, connectedNote: { minHeight: 45, borderRadius: RADIUS.sm, backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: SPACE.sm, paddingHorizontal: SPACE.sm }, connectedNoteText: { color: '#86efac', fontWeight: '900', fontSize: FONT.sm, textAlign: 'center' }, footer: { color: 'rgba(200,190,210,0.65)', fontSize: 10, textAlign: 'center', marginTop: SPACE.xs },
});
