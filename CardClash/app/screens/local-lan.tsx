import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Radio, RefreshCw, Router, Wifi, WifiOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ConnectionBadge } from '@/components/ui/ConnectionBadge';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import type { LanRoom } from '@/lib/lan/lan-protocol';

export default function LocalLanScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    rooms,
    hostedRoom,
    state,
    notice,
    peer,
    isSupported,
    hostRoom,
    refreshRooms,
    joinRoom,
    leave,
  } = useLanMultiplayer();

  const [name, setName] = useState('لاعب محلي');
  const [busy, setBusy] = useState(false);
  const enteredMatch = useRef(false);
  const wide = width >= 760;

  useEffect(() => {
    if (!isSupported) return;
    try { refreshRooms(); } catch {}
  }, [isSupported, refreshRooms]);

  useEffect(() => {
    if (state !== 'connected' || !peer || enteredMatch.current) return;
    enteredMatch.current = true;
    router.replace('/screens/rounds-config' as any);
  }, [peer, router, state]);

  const run = async (action: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await action();
    } catch {
      // LAN context/session owns the user-facing failure notice.
    } finally {
      setBusy(false);
    }
  };

  const badgeState =
    state === 'hosting'
      ? 'hosting'
      : state === 'discovering'
        ? 'discovering'
        : state === 'connecting'
          ? 'connecting'
          : state === 'connected'
            ? 'connected'
            : state === 'failed'
              ? 'failed'
              : 'idle';

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={StyleSheet.absoluteFill}><LuxuryBackground /></View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => { leave(); router.back(); }}
            style={styles.back}
          >
            <ThemedText type="link">رجوع</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <ThemedText type="title">Wi‑Fi محلي</ThemedText>
            <ThemedText type="subtitle">
              TCP مباشر مع اكتشاف mDNS على الشبكة نفسها.
            </ThemedText>
          </View>
        </View>

        {!isSupported ? (
          <ObsidianPanel style={styles.unsupported}>
            <WifiOff size={30} color={SEMANTIC_COLOR.status.warning} />
            <ThemedText type="defaultSemiBold">LAN الأصلي غير متاح على هذه المنصة</ThemedText>
            <ThemedText type="subtitle" style={styles.centerText}>
              المتصفح لا يستطيع تشغيل mDNS وTCP المحلي. استخدم غرف الويب برمز.
            </ThemedText>
            <ProButton
              label="فتح غرف الويب"
              fullWidth
              onPress={() => router.replace('/screens/multiplayer-lobby' as any)}
            />
          </ObsidianPanel>
        ) : (
          <View style={[styles.columns, wide && styles.columnsWide]}>
            <ObsidianPanel accent style={[styles.controlPanel, wide && styles.controlPanelWide]}>
              <ConnectionBadge state={badgeState} />
              <View style={styles.statusRow}>
                <Wifi size={22} color={SEMANTIC_COLOR.accent.primary} />
                <View style={styles.statusCopy}>
                  <ThemedText type="defaultSemiBold">
                    {peer ? `متصل مع ${peer.name}` : hostedRoom ? 'غرفتك منشورة' : 'جاهز للشبكة المحلية'}
                  </ThemedText>
                  <ThemedText type="caption">
                    {notice || 'اتصل الهاتفان بشبكة Wi‑Fi نفسها.'}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="label" style={styles.fieldLabel}>اسم اللاعب</ThemedText>
              <TextInput
                accessibilityLabel="اسم اللاعب المحلي"
                value={name}
                onChangeText={setName}
                maxLength={20}
                placeholder="اسمك"
                placeholderTextColor={SEMANTIC_COLOR.text.secondary}
                textAlign="right"
                style={styles.input}
              />

              <ProButton
                label={hostedRoom ? `الغرفة ${hostedRoom.id}` : 'إنشاء غرفة محلية'}
                onPress={() => void run(() => hostRoom(name))}
                disabled={busy || Boolean(hostedRoom)}
                loading={busy && !hostedRoom}
                fullWidth
                icon={<Router size={18} color={SEMANTIC_COLOR.text.inverse} />}
              />
              <ProButton
                label="تحديث البحث"
                variant="ghost"
                onPress={() => void run(() => refreshRooms())}
                disabled={busy}
                fullWidth
                icon={<RefreshCw size={18} color={SEMANTIC_COLOR.text.primary} />}
              />

              {state === 'failed' && (
                <View style={styles.errorBox}>
                  <ThemedText type="caption" style={styles.errorText}>
                    {notice || 'تعذر تشغيل الاتصال المحلي. تحقق من Wi‑Fi وبناء التطبيق.'}
                  </ThemedText>
                </View>
              )}
            </ObsidianPanel>

            <ObsidianPanel style={styles.roomsPanel}>
              <View style={styles.roomsHeader}>
                <Radio size={20} color={SEMANTIC_COLOR.accent.secondary} />
                <View style={styles.roomsHeaderCopy}>
                  <ThemedText type="defaultSemiBold">الغرف القريبة</ThemedText>
                  <ThemedText type="caption">{rooms.length} متاحة الآن</ThemedText>
                </View>
              </View>

              {rooms.length === 0 ? (
                <View style={styles.empty}>
                  <Wifi size={28} color={SEMANTIC_COLOR.text.secondary} />
                  <ThemedText type="defaultSemiBold">لا توجد غرف مكتشفة</ThemedText>
                  <ThemedText type="caption" style={styles.centerText}>
                    أنشئ غرفة على هاتف آخر ثم حدّث البحث.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.roomList}>
                  {rooms.map((room) => (
                    <LanRoomRow
                      key={`${room.id}-${room.hostAddress}`}
                      room={room}
                      disabled={busy || state === 'connected'}
                      onJoin={() => void run(() => joinRoom(room, name))}
                    />
                  ))}
                </View>
              )}
            </ObsidianPanel>
          </View>
        )}

        <ThemedText type="caption" style={styles.footer}>
          {Platform.OS === 'web'
            ? 'غرف الويب تستخدم خادم WebSocket المهيأ للنشر.'
            : 'إذا لم تظهر الأجهزة لبعضها، تحقق من عزل العملاء AP Isolation في الراوتر.'}
        </ThemedText>
      </ScrollView>
    </View>
  );
}

function LanRoomRow({
  room,
  disabled,
  onJoin,
}: {
  room: LanRoom;
  disabled: boolean;
  onJoin: () => void;
}) {
  return (
    <View style={styles.roomRow}>
      <View style={styles.roomCopy}>
        <ThemedText type="label" numberOfLines={1}>{room.name}</ThemedText>
        <ThemedText type="caption" forceLtr numberOfLines={1}>
          {room.hostAddress}:{room.port} · v{room.version}
        </ThemedText>
      </View>
      <ProButton label="انضم" variant="secondary" disabled={disabled} onPress={onJoin} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SEMANTIC_COLOR.background.base },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxxl,
    gap: SPACE.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  headerCopy: { flex: 1, alignItems: 'flex-end' },
  back: {
    minWidth: TOUCH_TARGET.default,
    minHeight: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
  },
  unsupported: { width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center', gap: SPACE.lg },
  columns: { gap: SPACE.md },
  columnsWide: { flexDirection: 'row-reverse', alignItems: 'stretch' },
  controlPanel: { gap: SPACE.md },
  controlPanelWide: { width: 380, flexShrink: 0 },
  roomsPanel: { flex: 1, minHeight: 320 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  statusCopy: { flex: 1, alignItems: 'flex-end' },
  fieldLabel: { textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.56)',
    color: SEMANTIC_COLOR.text.primary,
    fontFamily: 'NotoKufiArabic_400Regular',
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  errorBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.42)',
    backgroundColor: 'rgba(251,113,133,0.08)',
    padding: SPACE.md,
  },
  errorText: { color: '#FFD0D8', textAlign: 'right' },
  roomsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  roomsHeaderCopy: { flex: 1, alignItems: 'flex-end' },
  empty: { flex: 1, minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: SPACE.sm },
  centerText: { textAlign: 'center' },
  roomList: { gap: SPACE.sm },
  roomRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: SEMANTIC_COLOR.border.subtle,
    paddingVertical: SPACE.sm,
  },
  roomCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  footer: { textAlign: 'center' },
});
