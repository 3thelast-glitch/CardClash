import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
  const { rooms, hostedRoom, state, notice, peer, isSupported, hostRoom, refreshRooms, joinRoom, leave } = useLanMultiplayer();
  const [name, setName] = useState('لاعب محلي');
  const [busy, setBusy] = useState(false);
  const hasEnteredMatchFlow = useRef(false);

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

  const renderRoom = ({ item }: { item: LanRoom }) => (
    <View style={styles.roomCard}>
      <View style={styles.roomCopy}>
        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={styles.roomMeta}>{item.hostAddress}:{item.port} · v{item.version}</Text>
      </View>
      <TouchableOpacity style={styles.joinButton} onPress={() => void run(() => joinRoom(item, name))} disabled={busy || state === 'connected'}>
        <Text style={styles.joinText}>انضم</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.bg}><LuxuryBackground /></View>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.back} onPress={() => { leave(); router.back(); }}><Text style={styles.backText}>← رجوع</Text></TouchableOpacity>
          <View><Text style={styles.title}>📡 غرف Wi‑Fi المحلية</Text><Text style={styles.subtitle}>mDNS + TCP مباشر — دون إنترنت أو خادم خارجي</Text></View>
        </View>

        <View style={styles.columns}>
          <View style={styles.leftPane}>
            <View style={[styles.statusCard, state === 'connected' && styles.statusConnected, state === 'failed' && styles.statusError]}>
              <View style={[styles.dot, state === 'connected' && styles.dotOnline, state === 'failed' && styles.dotFailed]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>{STATUS_COPY[state]}</Text>
                <Text style={styles.statusText}>{peer ? `متصل مع ${peer.name}` : notice || 'اتصل بنفس Wi‑Fi ثم أنشئ غرفة أو ابحث عنها.'}</Text>
              </View>
            </View>

            {!isSupported ? (
              <View style={styles.infoBox}><Text style={styles.infoTitle}>يتطلب تطبيقاً أصلياً</Text><Text style={styles.infoText}>لا تستطيع معاينة الويب نشر mDNS أو الاستماع لاتصال TCP. استخدم Development Build على هاتفين.</Text></View>
            ) : (
              <>
                <Text style={styles.label}>اسم اللاعب</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={20} placeholder="اسمك" placeholderTextColor="#64748b" textAlign="right" />
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.primaryButton, (busy || !!hostedRoom) && styles.disabled]} disabled={busy || !!hostedRoom} onPress={() => void run(() => hostRoom(name))}>
                    <Text style={styles.primaryText}>{hostedRoom ? hostedRoom.id : 'إنشاء غرفة محلية'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.refreshButton} disabled={busy} onPress={refreshRooms}><Text style={styles.refreshText}>تحديث الغرف</Text></TouchableOpacity>
                </View>
                {busy && <ActivityIndicator color={COLOR.gold} style={{ marginTop: SPACE.sm }} />}
                {state === 'connected' && <View style={styles.connectedNote}><Text style={styles.connectedNoteText}>✓ تم الاتصال. ننتقل الآن لإعداد المباراة.</Text></View>}
              </>
            )}
          </View>

          <View style={styles.rightPane}>
            <Text style={styles.sectionTitle}>الغرف المكتشفة الآن</Text>
            <FlatList data={rooms} renderItem={renderRoom} keyExtractor={(room) => `${room.id}-${room.hostAddress}`} contentContainerStyle={rooms.length ? styles.list : styles.emptyList} ListEmptyComponent={<Text style={styles.empty}>لا توجد غرف. افتح هذه الشاشة في هاتف ثانٍ على شبكة Wi‑Fi نفسها ثم أنشئ غرفة.</Text>} />
          </View>
        </View>
        <Text style={styles.footer}>{Platform.OS === 'web' ? 'معاينة الويب: عرض فقط' : 'يشترط عدم تفعيل AP Isolation في الراوتر'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.bgDeep }, bg: { ...StyleSheet.absoluteFillObject, opacity: 0.95 }, container: { flex: 1, paddingHorizontal: SPACE.xl, paddingVertical: SPACE.md },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md }, back: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.3)' }, backText: { color: COLOR.gold, fontSize: FONT.sm }, title: { color: COLOR.gold, fontSize: FONT.xl, textAlign: 'right', fontWeight: '900' }, subtitle: { color: COLOR.textMuted, fontSize: FONT.xs, marginTop: 3, textAlign: 'right' },
  columns: { flex: 1, flexDirection: 'row-reverse', gap: SPACE.md }, leftPane: { width: '41%', gap: SPACE.sm }, rightPane: { flex: 1, borderRadius: RADIUS.md, backgroundColor: 'rgba(10,14,30,0.72)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', padding: SPACE.md },
  statusCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: 'rgba(15,20,42,0.9)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.3)' }, statusConnected: { borderColor: 'rgba(74,222,128,0.65)' }, statusError: { borderColor: 'rgba(248,113,113,0.65)' }, dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLOR.gold }, dotOnline: { backgroundColor: '#4ADE80' }, dotFailed: { backgroundColor: '#F87171' }, statusTitle: { color: '#f6e3a4', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' }, statusText: { color: COLOR.textMuted, fontSize: FONT.xs, lineHeight: 18, marginTop: 3, textAlign: 'right' },
  label: { color: '#d8c577', fontSize: FONT.sm, textAlign: 'right', marginTop: SPACE.xs }, input: { minHeight: 48, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(228,165,42,0.35)', paddingHorizontal: SPACE.md, color: '#fff5d6', backgroundColor: 'rgba(8,11,24,0.84)', fontFamily: 'NotoKufiArabic_400Regular' }, actionRow: { flexDirection: 'row-reverse', gap: SPACE.sm }, primaryButton: { flex: 1, minHeight: 47, borderRadius: RADIUS.sm, backgroundColor: COLOR.gold, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE.sm }, primaryText: { color: '#241b0b', fontSize: FONT.sm, fontWeight: '900' }, refreshButton: { minWidth: 120, minHeight: 47, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#A78BFA', justifyContent: 'center', alignItems: 'center' }, refreshText: { color: '#c4b5fd', fontSize: FONT.sm, fontWeight: '800' }, disabled: { opacity: 0.55 },
  sectionTitle: { color: '#e4d4ff', fontSize: FONT.md, fontWeight: '900', textAlign: 'right', marginBottom: SPACE.sm }, list: { gap: SPACE.sm, paddingBottom: SPACE.md }, emptyList: { flexGrow: 1, justifyContent: 'center', padding: SPACE.xl }, empty: { color: COLOR.textMuted, lineHeight: 22, textAlign: 'center' }, roomCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.27)', backgroundColor: 'rgba(20,20,45,0.8)' }, roomCopy: { flex: 1 }, roomName: { color: '#f0e4ff', fontWeight: '900', fontSize: FONT.sm, textAlign: 'right' }, roomMeta: { color: COLOR.textMuted, fontSize: FONT.xs, marginTop: 4, textAlign: 'right' }, joinButton: { backgroundColor: '#7c5fd6', minHeight: 38, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm, justifyContent: 'center' }, joinText: { color: '#fff', fontWeight: '900', fontSize: FONT.xs },
  infoBox: { padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: 'rgba(92,58,24,0.55)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.55)' }, infoTitle: { color: '#f6c76f', fontWeight: '900', textAlign: 'right' }, infoText: { color: '#e4c798', marginTop: SPACE.xs, fontSize: FONT.xs, textAlign: 'right', lineHeight: 19 }, connectedNote: { minHeight: 45, borderRadius: RADIUS.sm, backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: SPACE.sm, paddingHorizontal: SPACE.sm }, connectedNoteText: { color: '#86efac', fontWeight: '900', fontSize: FONT.sm, textAlign: 'center' }, footer: { color: 'rgba(200,190,210,0.65)', fontSize: 10, textAlign: 'center', marginTop: SPACE.xs },
});
