/**
 * SettingsScreen — إعدادات اللعبة — Pro Redesign
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Modal, useWindowDimensions, Animated as RNAnimated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ArrowLeft, Volume2, Music, Smartphone, Sparkles, Zap, Lightbulb, Globe, RotateCcw, Trash2 } from 'lucide-react-native';
import { CARD_EDITS_KEY } from '@/app/screens/cards-gallery';

export const GAME_SETTINGS_KEY = 'game_settings_v1';

export type GameSettings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationsEnabled: boolean;
  language: 'ar' | 'en';
  showAbilityHints: boolean;
  showDamageNumbers: boolean;
  vibration: boolean;
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  animationsEnabled: true,
  language: 'ar',
  showAbilityHints: true,
  showDamageNumbers: true,
  vibration: true,
};

export async function loadSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem(GAME_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export async function saveSettings(s: GameSettings): Promise<void> {
  await AsyncStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(s));
}

// ───────────────────────────────────────────────────────────────────
type IconBadgeProps = { colors: [string, string]; icon: React.ReactNode };
function IconBadge({ colors, icon }: IconBadgeProps) {
  return (
    <LinearGradient colors={colors} style={ib.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {icon}
    </LinearGradient>
  );
}

// ── Toggle Row ────────────────────────────────────────────────────────────
function ToggleRow({
  badgeColors, icon, title, subtitle, value, thumbColor, trackColor, onChange, isLast = false,
}: {
  badgeColors: [string, string]; icon: React.ReactNode;
  title: string; subtitle?: string;
  value: boolean; thumbColor: string; trackColor: string;
  onChange: (v: boolean) => void; isLast?: boolean;
}) {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const handlePress = (v: boolean) => {
    RNAnimated.sequence([
      RNAnimated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      RNAnimated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onChange(v);
  };
  return (
    <>
      <RNAnimated.View style={[tr.wrap, { transform: [{ scale }] }]}>
        <IconBadge colors={badgeColors} icon={icon} />
        <View style={tr.texts}>
          <Text style={tr.title}>{title}</Text>
          {subtitle ? <Text style={tr.sub}>{subtitle}</Text> : null}
        </View>
        <Switch
          value={value} onValueChange={handlePress}
          trackColor={{ false: '#1e2030', true: trackColor }}
          thumbColor={value ? thumbColor : '#4a4a5a'}
          style={{ transform: [{ scale: 0.9 }] }}
        />
      </RNAnimated.View>
      {!isLast && <View style={tr.sep} />}
    </>
  );
}

// ── Segmented Choice ─────────────────────────────────────────────────────
function SegmentedChoice<T extends string>({
  badgeColors, icon, title, options, value, activeColors, onChange,
}: {
  badgeColors: [string, string]; icon: React.ReactNode;
  title: string; options: { value: T; label: string; icon: string }[];
  value: T; activeColors: [string, string]; onChange: (v: T) => void;
}) {
  return (
    <View style={sc.wrap}>
      <View style={sc.top}>
        <IconBadge colors={badgeColors} icon={icon} />
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.row}>
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} activeOpacity={0.8}
              style={[sc.seg, i === 0 && sc.first, i === options.length - 1 && sc.last]}>
              {active ? (
                <LinearGradient colors={activeColors} style={sc.segInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={sc.segIcon}>{opt.icon}</Text>
                  <Text style={[sc.segLabel, { color: '#fff', fontWeight: '800' }]}>{opt.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[sc.segInner, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                  <Text style={sc.segIcon}>{opt.icon}</Text>
                  <Text style={[sc.segLabel, { color: '#4a5568' }]}>{opt.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, color = '#d4af37' }: { label: string; color?: string }) {
  return (
    <View style={sl.wrap}>
      <Text style={[sl.txt, { color }]}>{label}</Text>
      <View style={[sl.line, { backgroundColor: color + '33' }]} />
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────────
function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={[cd.wrap, accent ? { borderColor: accent + '44' } : {}]}>
      {children}
    </View>
  );
}

// ── Danger Row ──────────────────────────────────────────────────────────────────
function DangerRow({ icon, title, subtitle, onPress, isLast = false }: {
  icon: React.ReactNode; title: string; subtitle: string; onPress: () => void; isLast?: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={dr.wrap} onPress={onPress} activeOpacity={0.75}>
        <View style={dr.iconWrap}>{icon}</View>
        <View style={dr.texts}>
          <Text style={dr.title}>{title}</Text>
          <Text style={dr.sub}>{subtitle}</Text>
        </View>
        <View style={dr.arrow}><Text style={dr.arrowTxt}>›</Text></View>
      </TouchableOpacity>
      {!isLast && <View style={dr.sep} />}
    </>
  );
}

// ── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  visible, emoji, title, body, confirmLabel, confirmColors, onConfirm, onCancel,
}: {
  visible: boolean; emoji: string; title: string; body: string;
  confirmLabel: string; confirmColors: [string, string];
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={cm.overlay}>
        <View style={cm.box}>
          <Text style={cm.emoji}>{emoji}</Text>
          <Text style={cm.title}>{title}</Text>
          <Text style={cm.body}>{body}</Text>
          <View style={cm.row}>
            <TouchableOpacity style={cm.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={cm.cancelTxt}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={{ flex: 1 }}>
              <LinearGradient colors={confirmColors} style={cm.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={cm.confirmTxt}>{confirmLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ───────────────────────────────────────────────────────────────────
const CONFIRM_DATA = {
  settings: {
    emoji: '🔄', title: 'إعادة تعيين الإعدادات',
    body: 'سيتم إرجاع جميع الإعدادات إلى الوضع الافتراضي.',
    confirmLabel: 'إعادة تعيين',
    confirmColors: ['#f59e0b', '#d97706'] as [string, string],
  },
  cards: {
    emoji: '🃏', title: 'حذف تعديلات الكروت',
    body: 'سيتم حذف جميع الصور والتعديلات المخصصة لكروتك. لا يمكن التراجع.',
    confirmLabel: 'حذف',
    confirmColors: ['#ef4444', '#dc2626'] as [string, string],
  },
  stats: {
    emoji: '📊', title: 'مسح الإحصائيات',
    body: 'سيتم مسح سجل انتصاراتك وإحصائياتك كاملاً. لا يمكن التراجع.',
    confirmLabel: 'مسح',
    confirmColors: ['#ef4444', '#dc2626'] as [string, string],
  },
};

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState<null | 'settings' | 'cards' | 'stats'>(null);
  const [savedAnim] = useState(new RNAnimated.Value(0));
  const headerAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    loadSettings().then(s => {
      setSettings(s);
      setLoaded(true);
      RNAnimated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  }, []);

  const showSaved = () => {
    RNAnimated.sequence([
      RNAnimated.timing(savedAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.delay(1200),
      RNAnimated.timing(savedAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const patch = useCallback((p: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...p };
      saveSettings(next);
      showSaved();
      return next;
    });
  }, []);

  const handleReset = async (type: 'settings' | 'cards' | 'stats') => {
    setConfirmReset(null);
    if (type === 'settings') {
      await saveSettings(DEFAULT_SETTINGS);
      setSettings({ ...DEFAULT_SETTINGS });
    } else if (type === 'cards') {
      await AsyncStorage.removeItem(CARD_EDITS_KEY);
      try { indexedDB.deleteDatabase('card_images_db'); } catch {}
    } else if (type === 'stats') {
      await AsyncStorage.removeItem('player_stats');
    }
    showSaved();
  };

  if (!loaded) return null;

  const soundSection = (
    <>
      <SectionLabel label="🔊 الصوت" />
      <Card accent="#f59e0b">
        <ToggleRow
          badgeColors={['#f59e0b', '#d97706']} icon={<Volume2 size={14} color="#fff" />}
          title="مؤثرات الصوت" subtitle="أصوات الضربات والنتائج"
          value={settings.soundEnabled} thumbColor="#f59e0b" trackColor="#f59e0b55"
          onChange={v => patch({ soundEnabled: v })}
        />
        <ToggleRow
          badgeColors={['#8b5cf6', '#7c3aed']} icon={<Music size={14} color="#fff" />}
          title="الموسيقى" subtitle="موسيقى الخلفية أثناء اللعب"
          value={settings.musicEnabled} thumbColor="#8b5cf6" trackColor="#8b5cf655"
          onChange={v => patch({ musicEnabled: v })}
        />
        <ToggleRow
          badgeColors={['#06b6d4', '#0891b2']} icon={<Smartphone size={14} color="#fff" />}
          title="الاهتزاز" subtitle="اهتزاز الجهاز عند الأحداث"
          value={settings.vibration} thumbColor="#06b6d4" trackColor="#06b6d455"
          onChange={v => patch({ vibration: v })} isLast
        />
      </Card>
    </>
  );

  const visualSection = (
    <>
      <SectionLabel label="🎨 المرئيات" color="#a78bfa" />
      <Card accent="#a78bfa">
        <ToggleRow
          badgeColors={['#a78bfa', '#7c3aed']} icon={<Sparkles size={14} color="#fff" />}
          title="الحركات والتأثيرات" subtitle="تعطيل لأداء أفضل على الأجهزة القديمة"
          value={settings.animationsEnabled} thumbColor="#a78bfa" trackColor="#a78bfa55"
          onChange={v => patch({ animationsEnabled: v })}
        />
        <ToggleRow
          badgeColors={['#f87171', '#ef4444']} icon={<Zap size={14} color="#fff" />}
          title="أرقام الضرر" subtitle="عرض قيمة الضرر فوق الكرت"
          value={settings.showDamageNumbers} thumbColor="#f87171" trackColor="#f8717155"
          onChange={v => patch({ showDamageNumbers: v })}
        />
        <ToggleRow
          badgeColors={['#60a5fa', '#3b82f6']} icon={<Lightbulb size={14} color="#fff" />}
          title="تلميحات القدرات" subtitle="شرح القدرات الخاصة خلال المعركة"
          value={settings.showAbilityHints} thumbColor="#60a5fa" trackColor="#60a5fa55"
          onChange={v => patch({ showAbilityHints: v })} isLast
        />
      </Card>
    </>
  );

  const langSection = (
    <>
      <SectionLabel label="🌍 اللغة" color="#34d399" />
      <Card accent="#34d399">
        <SegmentedChoice
          badgeColors={['#34d399', '#059669']} icon={<Globe size={14} color="#fff" />}
          title="لغة الواجهة"
          options={[
            { value: 'ar', label: 'العربية', icon: '🇸🇦' },
            { value: 'en', label: 'English',    icon: '🇺🇸' },
          ]}
          value={settings.language}
          activeColors={['#34d399', '#059669']}
          onChange={v => patch({ language: v })}
        />
      </Card>
    </>
  );

  const dangerSection = (
    <>
      <SectionLabel label="⚠️ بيانات اللعبة" color="#f87171" />
      <Card accent="#ef4444">
        <DangerRow
          icon={<RotateCcw size={16} color="#f59e0b" />}
          title="إعادة تعيين الإعدادات"
          subtitle="إرجاع كل شيء للافتراضي"
          onPress={() => setConfirmReset('settings')}
        />
        <DangerRow
          icon={<Trash2 size={16} color="#f87171" />}
          title="حذف تعديلات الكروت"
          subtitle="الصور والتعديلات المخصصة"
          onPress={() => setConfirmReset('cards')}
        />
        <DangerRow
          icon={<Trash2 size={16} color="#f87171" />}
          title="مسح الإحصائيات"
          subtitle="حذف سجل الانتصارات والمباريات"
          onPress={() => setConfirmReset('stats')}
          isLast
        />
      </Card>
    </>
  );

  const headerOpacity = headerAnim;
  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={s.bg}><LuxuryBackground /></View>

      <RNAnimated.View style={[s.toast, { opacity: savedAnim, transform: [{ translateY: savedAnim.interpolate({ inputRange: [0,1], outputRange: [10,0] }) }] }]} pointerEvents="none">
        <Text style={s.toastTxt}>✔️ تم الحفظ</Text>
      </RNAnimated.View>

      <RNAnimated.View style={[s.headerWrap, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color="#fff" />
          <Text style={s.backTxt}>رجوع</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <LinearGradient colors={['#d4af37', '#f59e0b']} style={s.headerIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.headerIcon}>⚙️</Text>
          </LinearGradient>
          <View>
            <Text style={s.title}>الإعدادات</Text>
            <Text style={s.subtitle}>تُحفظ تلقائياً</Text>
          </View>
        </View>
      </RNAnimated.View>

      {isLandscape ? (
        <View style={s.landscapeRoot}>
          <ScrollView style={s.col} contentContainerStyle={s.colContent} showsVerticalScrollIndicator={false}>
            {soundSection}
            {langSection}
          </ScrollView>
          <View style={s.colDivider} />
          <ScrollView style={s.col} contentContainerStyle={s.colContent} showsVerticalScrollIndicator={false}>
            {visualSection}
            {dangerSection}
            <Text style={s.version}>Card Clash v2.0</Text>
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {soundSection}
          {visualSection}
          {langSection}
          {dangerSection}
          <Text style={s.version}>Card Clash v2.0</Text>
        </ScrollView>
      )}

      {confirmReset && (
        <ConfirmModal
          visible
          {...CONFIRM_DATA[confirmReset]}
          onConfirm={() => handleReset(confirmReset)}
          onCancel={() => setConfirmReset(null)}
        />
      )}
    </ScreenContainer>
  );
}

// ───────────────────────────────── Styles
const GOLD = '#d4af37';

const s = StyleSheet.create({
  bg: { position: 'absolute', inset: 0, zIndex: 0 } as any,
  toast: {
    position: 'absolute', bottom: 32, alignSelf: 'center', zIndex: 100,
    backgroundColor: 'rgba(52,211,153,0.18)', borderWidth: 1, borderColor: '#34d39966',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30,
  },
  toastTxt: { color: '#34d399', fontWeight: '800', fontSize: 13 },
  headerWrap: {
    zIndex: 10, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.12)',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  backTxt:        { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerCenter:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerIcon:     { fontSize: 22 },
  title:          { color: GOLD, fontSize: 20, fontWeight: '800', letterSpacing: 0.4 },
  subtitle:       { color: '#64748b', fontSize: 11, marginTop: 1 },
  scroll:         { flex: 1, zIndex: 1 },
  scrollContent:  { paddingHorizontal: 14, paddingBottom: 60, paddingTop: 14, gap: 8 },
  landscapeRoot:  { flex: 1, flexDirection: 'row', zIndex: 1 },
  col:            { flex: 1 },
  colContent:     { paddingHorizontal: 14, paddingBottom: 40, paddingTop: 14, gap: 8 },
  colDivider:     { width: 1, backgroundColor: 'rgba(212,175,55,0.1)', marginVertical: 14 },
  version:        { color: 'rgba(255,255,255,0.12)', fontSize: 10, textAlign: 'center', paddingVertical: 6 },
});

const ib = StyleSheet.create({
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
const tr = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  texts: { flex: 1 },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  sub:   { color: '#475569', fontSize: 11, marginTop: 2 },
  sep:   { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },
});
const sc = StyleSheet.create({
  wrap:     { paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  top:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title:    { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  row:      { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  seg:      { flex: 1 },
  first:    { borderRightWidth: 0 },
  last:     { borderLeftWidth: 0 },
  segInner: { paddingVertical: 11, alignItems: 'center', gap: 4 },
  segIcon:  { fontSize: 16 },
  segLabel: { fontSize: 11, fontWeight: '700' },
});
const sl = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, marginTop: 4 },
  txt:  { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  line: { flex: 1, height: 1 },
});
const cd = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,8,18,0.92)',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    overflow: 'hidden',
  },
});
const dr = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  texts:    { flex: 1 },
  title:    { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  sub:      { color: '#475569', fontSize: 11, marginTop: 2 },
  arrow:    { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  arrowTxt: { color: '#475569', fontSize: 20, lineHeight: 24 },
  sep:      { height: 1, backgroundColor: 'rgba(239,68,68,0.12)', marginHorizontal: 14 },
});
const cm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box:        { backgroundColor: '#0a0a14', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', gap: 10 },
  emoji:      { fontSize: 40 },
  title:      { color: '#f1f5f9', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  body:       { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  row:        { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  cancelTxt:  { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  confirmBtn: { paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
