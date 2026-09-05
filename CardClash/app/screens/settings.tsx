import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Languages,
  Music2,
  RotateCcw,
  Smartphone,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react-native';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';
import { CARD_EDITS_KEY } from '@/app/screens/cards-gallery';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type GameSettings,
  type MotionPreference,
} from '@/lib/game/settings-store';
import { haptics } from '@/lib/feedback/haptics';

export {
  GAME_SETTINGS_KEY,
  loadSettings,
  saveSettings,
  type GameSettings,
} from '@/lib/game/settings-store';

type ConfirmKind = 'settings' | 'cards' | 'stats';

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  useEffect(() => {
    let active = true;
    loadSettings().then((value) => {
      if (!active) return;
      setSettings(value);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const patch = (next: Partial<GameSettings>) => {
    const value = { ...settings, ...next };
    setSettings(value);
    void saveSettings(value);
    haptics.trigger('selection');
  };

  const reset = async (kind: ConfirmKind) => {
    setConfirm(null);
    if (kind === 'settings') {
      setSettings({ ...DEFAULT_SETTINGS });
      await saveSettings(DEFAULT_SETTINGS);
      return;
    }
    if (kind === 'cards') {
      await AsyncStorage.removeItem(CARD_EDITS_KEY);
      if (Platform.OS === 'web' && typeof indexedDB !== 'undefined') {
        try { indexedDB.deleteDatabase('card_images_db'); } catch {}
      }
      return;
    }
    await AsyncStorage.removeItem('player_stats');
  };

  if (!loaded) {
    return (
      <ScreenContainer>
        <LuxuryBackground>
          <View style={styles.center}>
            <ThemedText type="subtitle">جارٍ تحميل الإعدادات…</ThemedText>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <ThemedText type="title">الإعدادات</ThemedText>
              <ThemedText type="subtitle">
                الصوت، الحركة، الوصول، ولغة الواجهة
              </ThemedText>
            </View>
          </View>

          <SettingsSection title="الصوت واللمس">
            <ObsidianPanel>
              <ToggleRow
                icon={<Volume2 size={18} color={SEMANTIC_COLOR.status.warning} />}
                title="مؤثرات الصوت"
                subtitle="أصوات الضربات والنتائج"
                value={settings.soundEnabled}
                onChange={(value) => patch({ soundEnabled: value })}
              />
              <Separator />
              <ToggleRow
                icon={<Music2 size={18} color={SEMANTIC_COLOR.accent.secondary} />}
                title="الموسيقى"
                subtitle="موسيقى الخلفية أثناء اللعب"
                value={settings.musicEnabled}
                onChange={(value) => patch({ musicEnabled: value })}
              />
              <Separator />
              <ToggleRow
                icon={<Smartphone size={18} color={SEMANTIC_COLOR.accent.primary} />}
                title="الاهتزاز"
                subtitle="ملاحظات لمسية للأحداث المهمة"
                value={settings.vibration}
                onChange={(value) => patch({ vibration: value })}
              />
            </ObsidianPanel>
          </SettingsSection>

          <SettingsSection title="المرئيات والوصول">
            <ObsidianPanel>
              <ToggleRow
                icon={<Sparkles size={18} color="#C084FC" />}
                title="الحركات والتأثيرات"
                subtitle="المفتاح الرئيسي لكل الحركة التقديمية"
                value={settings.animationsEnabled}
                onChange={(value) => patch({ animationsEnabled: value })}
              />
              <Separator />
              <ChoiceRow
                icon={<Zap size={18} color={SEMANTIC_COLOR.accent.primary} />}
                title="تقليل الحركة"
                subtitle="يتبع إعداد النظام افتراضياً"
                value={settings.motionPreference}
                options={[
                  { value: 'system', label: 'النظام' },
                  { value: 'full', label: 'كامل' },
                  { value: 'reduced', label: 'مخفّض' },
                ]}
                onChange={(value) => patch({ motionPreference: value })}
              />
              <Separator />
              <ToggleRow
                icon={<Zap size={18} color={SEMANTIC_COLOR.status.danger} />}
                title="أرقام الضرر"
                subtitle="إظهار التغيّر العددي فوق البطاقة"
                value={settings.showDamageNumbers}
                onChange={(value) => patch({ showDamageNumbers: value })}
              />
              <Separator />
              <ToggleRow
                icon={<BookOpen size={18} color={SEMANTIC_COLOR.accent.secondary} />}
                title="تلميحات القدرات"
                subtitle="شرح تأثير القدرة أثناء المعركة"
                value={settings.showAbilityHints}
                onChange={(value) => patch({ showAbilityHints: value })}
              />
            </ObsidianPanel>
          </SettingsSection>

          <SettingsSection title="اللغة">
            <ObsidianPanel>
              <ChoiceRow
                icon={<Languages size={18} color={SEMANTIC_COLOR.status.success} />}
                title="لغة الواجهة"
                value={settings.language}
                options={[
                  { value: 'ar', label: 'العربية' },
                  { value: 'en', label: 'English' },
                ]}
                onChange={(value) => patch({ language: value })}
              />
            </ObsidianPanel>
          </SettingsSection>

          <SettingsSection title="البيانات">
            <ObsidianPanel>
              <DangerRow
                icon={<RotateCcw size={18} color={SEMANTIC_COLOR.status.warning} />}
                title="إعادة تعيين الإعدادات"
                subtitle="إرجاع الخيارات إلى القيم الافتراضية"
                onPress={() => setConfirm('settings')}
              />
              <Separator />
              <DangerRow
                icon={<Trash2 size={18} color={SEMANTIC_COLOR.status.danger} />}
                title="حذف تعديلات الكروت"
                subtitle="يمسح الصور والتخصيصات المحلية"
                onPress={() => setConfirm('cards')}
              />
              <Separator />
              <DangerRow
                icon={<Trash2 size={18} color={SEMANTIC_COLOR.status.danger} />}
                title="مسح الإحصائيات"
                subtitle="يمسح سجل النتائج المحلي"
                onPress={() => setConfirm('stats')}
              />
            </ObsidianPanel>
          </SettingsSection>
        </ScrollView>
      </LuxuryBackground>

      <ConfirmModal
        kind={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void reset(confirm)}
      />
    </ScreenContainer>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="label" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText type="caption">{subtitle}</ThemedText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: SEMANTIC_COLOR.surface.raised,
          true: 'rgba(57,230,208,0.48)',
        }}
        thumbColor={value ? SEMANTIC_COLOR.accent.primary : SEMANTIC_COLOR.text.secondary}
      />
    </View>
  );
}

function ChoiceRow<T extends string>({
  icon,
  title,
  subtitle,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceWrap}>
      <View style={styles.row}>
        <View style={styles.rowIcon}>{icon}</View>
        <View style={styles.rowCopy}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          {subtitle ? <ThemedText type="caption">{subtitle}</ThemedText> : null}
        </View>
      </View>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <ThemedText
                type="label"
                style={selected ? styles.choiceTextSelected : styles.choiceText}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DangerRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText type="caption">{subtitle}</ThemedText>
      </View>
    </TouchableOpacity>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function ConfirmModal({
  kind,
  onCancel,
  onConfirm,
}: {
  kind: ConfirmKind | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy: Record<ConfirmKind, { title: string; body: string; action: string }> = {
    settings: {
      title: 'إعادة تعيين الإعدادات؟',
      body: 'سيتم إرجاع إعدادات العرض والصوت واللغة إلى القيم الافتراضية.',
      action: 'إعادة تعيين',
    },
    cards: {
      title: 'حذف تعديلات الكروت؟',
      body: 'سيتم حذف الصور والتخصيصات المحلية. لا يمكن التراجع عن هذا الإجراء.',
      action: 'حذف',
    },
    stats: {
      title: 'مسح الإحصائيات؟',
      body: 'سيتم حذف سجل النتائج المحلي. لا يمكن التراجع عن هذا الإجراء.',
      action: 'مسح',
    },
  };
  if (!kind) return null;
  const item = copy[kind];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <ObsidianPanel raised style={styles.modalPanel}>
          <ThemedText type="title" style={styles.modalTitle}>{item.title}</ThemedText>
          <ThemedText type="subtitle" style={styles.modalBody}>{item.body}</ThemedText>
          <View style={styles.modalActions}>
            <ProButton label="إلغاء" variant="ghost" onPress={onCancel} fullWidth style={styles.modalButton} />
            <ProButton label={item.action} variant="danger" onPress={onConfirm} fullWidth style={styles.modalButton} hapticEvent="invalid" />
          </View>
        </ObsidianPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxxl,
    gap: SPACE.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginBottom: SPACE.sm,
  },
  headerCopy: { flex: 1, alignItems: 'flex-end' },
  iconButton: {
    width: TOUCH_TARGET.default,
    height: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(19,30,47,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: SPACE.sm },
  sectionTitle: {
    color: SEMANTIC_COLOR.accent.primary,
    textAlign: 'right',
    paddingHorizontal: SPACE.xs,
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(8,13,22,0.56)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  separator: { height: 1, backgroundColor: SEMANTIC_COLOR.border.subtle },
  choiceWrap: { gap: SPACE.sm },
  choiceRow: { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'wrap' },
  choice: {
    minHeight: TOUCH_TARGET.compact,
    minWidth: 88,
    flex: 1,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceSelected: {
    borderColor: SEMANTIC_COLOR.accent.primary,
    backgroundColor: 'rgba(57,230,208,0.12)',
  },
  choiceText: { color: SEMANTIC_COLOR.text.secondary },
  choiceTextSelected: { color: SEMANTIC_COLOR.accent.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,12,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.xl,
  },
  modalPanel: { width: '100%', maxWidth: 500, gap: SPACE.lg },
  modalTitle: { textAlign: 'right' },
  modalBody: { textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: SPACE.sm },
  modalButton: { flex: 1 },
});
