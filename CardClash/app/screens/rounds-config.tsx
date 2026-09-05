import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, Check, Crown, Minus, Plus, RotateCcw, Sparkles, Target } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { LuxuryBackground } from '@/components/game/luxury-background';
import { ScreenContainer } from '@/components/screen-container';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { RARITY_COLOR, RADIUS, SEMANTIC_COLOR, SPACE, TOUCH_TARGET } from '@/components/ui/design-tokens';
import { useGame, type RarityKey, type RarityWeights } from '@/lib/game/game-context';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';

function useSafeMultiplayer() {
  try { return useMultiplayer(); } catch { return null; }
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] as const;
const DEFAULT_WEIGHTS: RarityWeights = { common: 45, rare: 28, epic: 17, legendary: 8, special: 2 };

const RARITIES: Array<{ key: RarityKey; label: string; color: string }> = [
  { key: 'common', label: 'عادي', color: RARITY_COLOR.common },
  { key: 'rare', label: 'نادر', color: RARITY_COLOR.rare },
  { key: 'epic', label: 'ملحمي', color: RARITY_COLOR.epic },
  { key: 'legendary', label: 'أسطوري', color: RARITY_COLOR.legendary },
  { key: 'special', label: 'خاص', color: RARITY_COLOR.special },
];

function rebalanceWeight(weights: RarityWeights, key: RarityKey, value: number): RarityWeights {
  const nextValue = Math.max(0, Math.min(100, value));
  const difference = nextValue - weights[key];
  const next = { ...weights, [key]: nextValue };
  let remaining = difference;
  const others = RARITIES.filter(item => item.key !== key);

  for (let index = others.length - 1; index >= 0 && remaining !== 0; index -= 1) {
    const other = others[index].key;
    const candidate = next[other] - remaining;
    const clamped = Math.max(0, Math.min(100, candidate));
    remaining -= next[other] - clamped;
    next[other] = clamped;
  }
  return next;
}

function RarityRow({
  item,
  value,
  onChange,
}: {
  item: (typeof RARITIES)[number];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.rarityRow}>
      <View style={styles.rarityHeading}>
        <View style={[styles.rarityDot, { backgroundColor: item.color }]} />
        <Text type="label" style={[styles.rarityLabel, { color: item.color }]}>{item.label}</Text>
      </View>
      <View style={styles.rarityTrack} accessibilityLabel={`${item.label} ${value} بالمئة`}>
        <View style={[styles.rarityFill, { width: `${value}%` as any, backgroundColor: item.color }]} />
      </View>
      <Text forceLtr type="numeric" style={[styles.rarityValue, { color: item.color }]}>{value}%</Text>
      <View style={styles.stepper}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`تقليل نسبة ${item.label}`} style={styles.stepButton} onPress={() => onChange(value - 5)}>
          <Minus size={16} color={SEMANTIC_COLOR.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`زيادة نسبة ${item.label}`} style={styles.stepButton} onPress={() => onChange(value + 5)}>
          <Plus size={16} color={SEMANTIC_COLOR.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RoundsConfigScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const game = useGame();
  const {
    state: gameState,
    setTotalRounds,
    setAbilitiesEnabled,
    rarityWeights,
    setRarityWeights,
  } = game;
  const mp = useSafeMultiplayer();
  const lan = useLanMultiplayer();

  const isLocalTwoPlayer = gameState.matchMode === 'local';
  const isLanMatch = gameState.matchMode === 'lan';
  const isOnlineMultiplayer = !!mp?.state?.roomId;
  const isLanHost = isLanMatch && lan.match.role === 'host';
  const isLanGuest = isLanMatch && lan.match.role === 'guest';
  const isHost = isLanMatch ? isLanHost : (mp?.state?.isHost ?? true);
  const pendingMatchSettings = mp?.state?.pendingMatchSettings ?? null;

  const [rounds, setRounds] = useState(5);
  const [withAbilities, setWithAbilities] = useState(true);

  useEffect(() => {
    if (!isOnlineMultiplayer || isHost || !pendingMatchSettings) return;
    setTotalRounds(pendingMatchSettings.rounds);
    setAbilitiesEnabled(pendingMatchSettings.withAbilities);
    setRarityWeights(pendingMatchSettings.rarityWeights as RarityWeights);
    router.push('/screens/leaderboard' as any);
  }, [isHost, isOnlineMultiplayer, pendingMatchSettings, router, setAbilitiesEnabled, setRarityWeights, setTotalRounds]);

  useEffect(() => {
    if (!isLanGuest || lan.match.phase !== 'arranging' || !lan.match.totalRounds) return;
    setTotalRounds(lan.match.totalRounds);
    setAbilitiesEnabled(lan.match.abilitiesEnabled);
    setRarityWeights(lan.match.rarityWeights as RarityWeights);
    router.replace('/screens/leaderboard' as any);
  }, [isLanGuest, lan.match.abilitiesEnabled, lan.match.phase, lan.match.rarityWeights, lan.match.totalRounds, router, setAbilitiesEnabled, setRarityWeights, setTotalRounds]);

  const totalWeight = useMemo(() => Object.values(rarityWeights).reduce((sum, value) => sum + value, 0), [rarityWeights]);
  const weightsValid = totalWeight === 100;

  const updateWeight = useCallback((key: RarityKey, value: number) => {
    setRarityWeights(rebalanceWeight(rarityWeights, key, value));
  }, [rarityWeights, setRarityWeights]);

  const handleContinue = () => {
    if (!weightsValid) return;
    setTotalRounds(rounds);
    setAbilitiesEnabled(withAbilities);
    if (isOnlineMultiplayer && isHost && mp?.sendMatchSettings) {
      mp.sendMatchSettings({ rounds, withAbilities, rarityWeights });
    }
    if (isLanHost) lan.configureMatch(rounds, withAbilities, rarityWeights);
    router.push('/screens/leaderboard' as any);
  };

  if ((isOnlineMultiplayer || isLanMatch) && !isHost) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <LuxuryBackground>
          <View style={styles.waitingRoot}>
            <ObsidianPanel raised accent style={styles.waitingPanel}>
              <ActivityIndicator size="large" color={SEMANTIC_COLOR.accent.primary} />
              <Text type="title" style={styles.waitingTitle}>انتظار إعدادات المضيف</Text>
              <Text style={styles.waitingText}>ستنتقل تلقائياً فور وصول عدد الجولات والقدرات ونسب الندرة المعتمدة.</Text>
              <ProButton label="مغادرة هذه الخطوة" variant="ghost" onPress={() => router.back()} fullWidth />
            </ObsidianPanel>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="رجوع" style={styles.back} onPress={() => router.push('/screens/game-mode' as any)}>
            <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            <Text type="label" style={styles.backText}>رجوع</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              {(isOnlineMultiplayer || isLanMatch) && isHost && (
                <View style={styles.hostBadge}>
                  <Crown size={15} color={SEMANTIC_COLOR.rarity.legendary} />
                  <Text type="caption" style={styles.hostBadgeText}>صاحب الجلسة</Text>
                </View>
              )}
              <Text type="title" style={styles.title}>
                {isLocalTwoPlayer ? 'إعداد مباراة محلية' : isLanMatch ? 'إعداد مباراة Wi‑Fi' : 'إعداد المواجهة'}
              </Text>
            </View>
            <Text style={styles.subtitle}>ثبّت القواعد قبل ترتيب البطاقات. لا تتغير ميكانيكيات المباراة بعد البدء.</Text>
          </View>

          <View style={[styles.columns, isLandscape && styles.columnsLandscape]}>
            <View style={styles.column}>
              <ObsidianPanel raised style={styles.panel}>
                <View style={styles.panelHeading}>
                  <Target size={20} color={SEMANTIC_COLOR.accent.primary} />
                  <View style={styles.headingCopy}>
                    <Text type="defaultSemiBold" style={styles.panelTitle}>عدد الجولات</Text>
                    <Text type="caption" style={styles.panelDescription}>نفس الخيارات الموجودة في اللعبة الحالية.</Text>
                  </View>
                  <View style={styles.valuePill}><Text forceLtr type="numeric" style={styles.valuePillText}>{rounds}</Text></View>
                </View>
                <View style={styles.roundGrid}>
                  {ROUND_OPTIONS.map(option => {
                    const selected = rounds === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        accessibilityRole="radio"
                        accessibilityLabel={`${option} جولات`}
                        accessibilityState={{ checked: selected }}
                        style={[styles.roundChip, selected && styles.roundChipSelected]}
                        onPress={() => setRounds(option)}
                      >
                        <Text forceLtr type="numeric" style={[styles.roundChipText, selected && styles.roundChipTextSelected]}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ObsidianPanel>

              <ObsidianPanel raised style={styles.panel}>
                <View style={styles.panelHeading}>
                  <Sparkles size={20} color={SEMANTIC_COLOR.accent.secondary} />
                  <View style={styles.headingCopy}>
                    <Text type="defaultSemiBold" style={styles.panelTitle}>القدرات الخاصة</Text>
                    <Text type="caption" style={styles.panelDescription}>تحكم في نفس خيار القدرات الموجود مسبقاً.</Text>
                  </View>
                </View>
                <View style={styles.segmented}>
                  <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: withAbilities }} style={[styles.segment, withAbilities && styles.segmentActive]} onPress={() => setWithAbilities(true)}>
                    <Check size={17} color={withAbilities ? SEMANTIC_COLOR.text.inverse : SEMANTIC_COLOR.text.secondary} />
                    <Text type="label" style={[styles.segmentText, withAbilities && styles.segmentTextActive]}>مفعّلة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: !withAbilities }} style={[styles.segment, !withAbilities && styles.segmentActiveSecondary]} onPress={() => setWithAbilities(false)}>
                    <Text type="label" style={styles.segmentText}>معطّلة</Text>
                  </TouchableOpacity>
                </View>
              </ObsidianPanel>
            </View>

            <ObsidianPanel raised style={[styles.panel, styles.rarityPanel]}>
              <View style={styles.panelHeading}>
                <View style={styles.headingCopy}>
                  <Text type="defaultSemiBold" style={styles.panelTitle}>نسب ظهور الندرة</Text>
                  <Text type="caption" style={styles.panelDescription}>التوزيع المعتمد يجب أن يبقى 100%.</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="إعادة نسب الندرة الافتراضية" style={styles.resetButton} onPress={() => setRarityWeights({ ...DEFAULT_WEIGHTS })}>
                  <RotateCcw size={16} color={SEMANTIC_COLOR.text.secondary} />
                  <Text type="caption" style={styles.resetText}>افتراضي</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rarityList}>
                {RARITIES.map(item => <RarityRow key={item.key} item={item} value={rarityWeights[item.key] ?? 0} onChange={value => updateWeight(item.key, value)} />)}
              </View>

              <View style={[styles.totalRow, !weightsValid && styles.totalRowInvalid]}>
                <Text type="label" style={{ color: weightsValid ? SEMANTIC_COLOR.status.success : SEMANTIC_COLOR.status.danger }}>
                  {weightsValid ? 'التوزيع جاهز' : `المجموع الحالي ${totalWeight}%`}
                </Text>
                <Text forceLtr type="numeric" style={{ color: weightsValid ? SEMANTIC_COLOR.status.success : SEMANTIC_COLOR.status.danger }}>{totalWeight}%</Text>
              </View>
            </ObsidianPanel>
          </View>

          <ProButton
            fullWidth
            label={(isOnlineMultiplayer || isLanHost) ? 'تأكيد وإرسال الإعدادات' : isLocalTwoPlayer ? 'متابعة إلى ترتيب الطرفين' : 'متابعة إلى اختيار البطاقات'}
            onPress={handleContinue}
            disabled={!weightsValid}
            accessibilityHint="يحفظ إعدادات المباراة ثم ينتقل إلى الخطوة التالية"
          />
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACE.xl, gap: SPACE.xl, backgroundColor: 'rgba(8,13,22,0.34)' },
  back: { minHeight: TOUCH_TARGET.default, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle, backgroundColor: 'rgba(19,30,47,0.72)' },
  backText: { color: SEMANTIC_COLOR.accent.primary },
  header: { width: '100%', maxWidth: 1000, alignSelf: 'center', alignItems: 'flex-end', gap: SPACE.sm },
  titleRow: { width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md, flexWrap: 'wrap' },
  title: { color: SEMANTIC_COLOR.text.primary, textAlign: 'right' },
  subtitle: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right' },
  hostBadge: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: 'rgba(244,201,106,0.46)', backgroundColor: 'rgba(244,201,106,0.08)' },
  hostBadgeText: { color: SEMANTIC_COLOR.rarity.legendary },
  columns: { width: '100%', maxWidth: 1000, alignSelf: 'center', gap: SPACE.lg },
  columnsLandscape: { flexDirection: 'row-reverse', alignItems: 'stretch' },
  column: { flex: 1, gap: SPACE.lg },
  panel: { gap: SPACE.lg },
  rarityPanel: { flex: 1 },
  panelHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md },
  headingCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  panelTitle: { color: SEMANTIC_COLOR.text.primary, textAlign: 'right' },
  panelDescription: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right' },
  valuePill: { minWidth: 44, minHeight: 40, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(57,230,208,0.48)', backgroundColor: 'rgba(57,230,208,0.10)', alignItems: 'center', justifyContent: 'center' },
  valuePillText: { color: SEMANTIC_COLOR.accent.primary },
  roundGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: SPACE.sm },
  roundChip: { minWidth: TOUCH_TARGET.default, minHeight: TOUCH_TARGET.default, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle, backgroundColor: 'rgba(8,13,22,0.44)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.sm },
  roundChipSelected: { borderColor: SEMANTIC_COLOR.accent.primary, backgroundColor: 'rgba(57,230,208,0.14)' },
  roundChipText: { color: SEMANTIC_COLOR.text.secondary },
  roundChipTextSelected: { color: SEMANTIC_COLOR.accent.primary },
  segmented: { flexDirection: 'row-reverse', gap: SPACE.sm },
  segment: { flex: 1, minHeight: TOUCH_TARGET.default, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACE.sm, backgroundColor: 'rgba(8,13,22,0.42)' },
  segmentActive: { borderColor: SEMANTIC_COLOR.accent.primary, backgroundColor: SEMANTIC_COLOR.accent.primary },
  segmentActiveSecondary: { borderColor: SEMANTIC_COLOR.accent.secondary, backgroundColor: 'rgba(141,164,255,0.14)' },
  segmentText: { color: SEMANTIC_COLOR.text.secondary },
  segmentTextActive: { color: SEMANTIC_COLOR.text.inverse },
  resetButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle },
  resetText: { color: SEMANTIC_COLOR.text.secondary },
  rarityList: { gap: SPACE.md },
  rarityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.sm },
  rarityHeading: { width: 74, flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.xs },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  rarityLabel: { textAlign: 'right' },
  rarityTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(168,180,199,0.10)', overflow: 'hidden' },
  rarityFill: { height: '100%', borderRadius: 4 },
  rarityValue: { width: 46, textAlign: 'center', fontSize: 13 },
  stepper: { flexDirection: 'row', gap: 4 },
  stepButton: { width: 38, height: 38, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,13,22,0.44)' },
  totalRow: { minHeight: TOUCH_TARGET.default, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(74,222,128,0.38)', backgroundColor: 'rgba(74,222,128,0.07)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md },
  totalRowInvalid: { borderColor: 'rgba(251,113,133,0.40)', backgroundColor: 'rgba(251,113,133,0.07)' },
  waitingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  waitingPanel: { width: '100%', maxWidth: 520, alignItems: 'center', gap: SPACE.lg },
  waitingTitle: { color: SEMANTIC_COLOR.text.primary, textAlign: 'center' },
  waitingText: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'center' },
});
