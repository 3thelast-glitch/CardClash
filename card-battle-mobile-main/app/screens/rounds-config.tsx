/**
 * RoundsConfigScreen — Multiplayer-aware
 *
 * صاحب الجلسة (isHost):
 *   - يضبط الإعدادات ثم يضغط "التالي" → يرسل MATCH_SETTINGS → ينتقل
 *
 * الضيف (guest):
 *   - يرى شاشة انتظار حتى يستقبل MATCH_SETTINGS_RECEIVED
 *   - بعدها تُحدَّث الإعدادات تلقائياً وينتقل للصفحة التالية
 *
 * اللعب الفردي: يعمل بنفس الطريقة القديمة بدون تغيير.
 */
import React, { useCallback, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, ScrollView,
  useWindowDimensions, Text as RNText, ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';
import type { RarityWeights, RarityKey } from '@/lib/game/game-context';

// Multiplayer — آمن حتى لو الـ provider غير موجود
let useMultiplayer: (() => any) | null = null;
try { useMultiplayer = require('@/lib/multiplayer/multiplayer-context').useMultiplayer; } catch {}
function useSafeMultiplayer() {
  try { return useMultiplayer?.() ?? null; } catch { return null; }
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

const RARITY_CONFIG: { key: RarityKey; labelAr: string; color: string; emoji: string }[] = [
  { key: 'common',    labelAr: 'عادي',    color: '#6366f1', emoji: '⚪' },
  { key: 'rare',      labelAr: 'نادر',    color: '#f59e0b', emoji: '🔵' },
  { key: 'epic',      labelAr: 'ملحمي',   color: '#a855f7', emoji: '🟣' },
  { key: 'legendary', labelAr: 'أسطوري', color: '#FFD700', emoji: '🟡' },
  { key: 'special',   labelAr: 'خاص',    color: '#ff4da6', emoji: '💎' },
];

// نسب ظهور محدَّثة: مجموعها = 100%
// عادي 45 | نادر 28 | ملحمي 17 | أسطوري 8 | خاص 2
const DEFAULT_WEIGHTS: RarityWeights = { common: 45, rare: 28, epic: 17, legendary: 8, special: 2 };

// ── Rarity Slider ─────────────────────────────────────────────────────────────
function RaritySliderRow({ cfg, value, onChange }: { cfg: typeof RARITY_CONFIG[0]; value: number; onChange: (v: number) => void }) {
  return (
    <View style={rs.row}>
      <RNText style={rs.emoji}>{cfg.emoji}</RNText>
      <RNText style={[rs.label, { color: cfg.color }]}>{cfg.labelAr}</RNText>
      <View style={rs.track}>
        <View style={[rs.fill, { width: `${value}%` as any, backgroundColor: cfg.color }]} />
      </View>
      <RNText style={[rs.pct, { color: cfg.color }]}>{value}%</RNText>
      <View style={rs.btns}>
        <TouchableOpacity style={[rs.stepBtn, { borderColor: cfg.color + '66' }]} onPress={() => onChange(Math.max(0, value - 5))} activeOpacity={0.7}>
          <RNText style={{ color: cfg.color, fontSize: 13, fontWeight: '800' }}>-</RNText>
        </TouchableOpacity>
        <TouchableOpacity style={[rs.stepBtn, { borderColor: cfg.color + '66' }]} onPress={() => onChange(Math.min(100, value + 5))} activeOpacity={0.7}>
          <RNText style={{ color: cfg.color, fontSize: 13, fontWeight: '800' }}>+</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RarityWeightsPanel({ weights, onChange }: { weights: RarityWeights; onChange: (w: RarityWeights) => void }) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const balanced = total === 100;
  const handleChange = useCallback((key: RarityKey, newVal: number) => {
    const diff = newVal - weights[key];
    const others = RARITY_CONFIG.filter(r => r.key !== key);
    const newWeights = { ...weights, [key]: newVal };
    let remaining = diff;
    for (let i = others.length - 1; i >= 0; i--) {
      const ok = others[i].key;
      const candidate = newWeights[ok] - remaining;
      const clamped = Math.max(0, Math.min(100, candidate));
      remaining -= newWeights[ok] - clamped;
      newWeights[ok] = clamped;
      if (remaining === 0) break;
    }
    onChange(newWeights);
  }, [weights, onChange]);
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>🎴 نسب ظهور الكروت</Text>
        <TouchableOpacity onPress={() => onChange({ ...DEFAULT_WEIGHTS })} style={rs.resetBtn} activeOpacity={0.75}>
          <RNText style={rs.resetTxt}>إعادة تعيين</RNText>
        </TouchableOpacity>
      </View>
      <Text style={styles.panelDesc}>حدّد احتمالية ظهور كل ندرة</Text>
      {RARITY_CONFIG.map(cfg => (
        <RaritySliderRow key={cfg.key} cfg={cfg} value={weights[cfg.key] ?? 0} onChange={v => handleChange(cfg.key, v)} />
      ))}
      <View style={[rs.totalRow, { borderColor: balanced ? '#4ade8066' : '#f8717166' }]}>
        <RNText style={[rs.totalLabel, { color: balanced ? '#4ade80' : '#f87171' }]}>
          {balanced ? '✔ المجموع = 100%' : `⚠ المجموع = ${total}%`}
        </RNText>
        {!balanced && (
          <TouchableOpacity onPress={() => onChange({ ...DEFAULT_WEIGHTS })} activeOpacity={0.8}>
            <RNText style={rs.autoFix}>تصحيح تلقائي</RNText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RoundsConfigScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { setTotalRounds, setAbilitiesEnabled, rarityWeights, setRarityWeights } = useGame();

  const mp = useSafeMultiplayer();
  const isMultiplayer = !!mp?.state?.roomId;
  const isHost = mp?.state?.isHost ?? true;
  const pendingMatchSettings = mp?.state?.pendingMatchSettings ?? null;

  const [rounds, setRounds] = React.useState(5);
  const [withAbility, setWithAbility] = React.useState(false);
  const [settingsSent, setSettingsSent] = React.useState(false);

  useEffect(() => {
    if (!isMultiplayer || isHost || !pendingMatchSettings) return;
    setTotalRounds(pendingMatchSettings.rounds);
    setAbilitiesEnabled(pendingMatchSettings.withAbilities);
    setRarityWeights(pendingMatchSettings.rarityWeights as RarityWeights);
    router.push('/screens/leaderboard' as any);
  }, [pendingMatchSettings, isMultiplayer, isHost]);

  const handleContinue = () => {
    setTotalRounds(rounds);
    setAbilitiesEnabled(withAbility);
    if (isMultiplayer && isHost && mp?.sendMatchSettings) {
      mp.sendMatchSettings({ rounds, withAbilities: withAbility, rarityWeights });
      setSettingsSent(true);
    }
    router.push('/screens/leaderboard' as any);
  };

  if (isMultiplayer && !isHost) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <LuxuryBackground>
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color={COLOR.gold} />
            <Text style={styles.waitingTitle}>⏳ انتظار صاحب الجلسة</Text>
            <Text style={styles.waitingDesc}>سيتم الانتقال تلقائياً بعد ضبط الإعدادات</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← رجوع</Text>
            </TouchableOpacity>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }

  const roundsPanel = (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>🎯 عدد الجولات</Text>
        <View style={styles.selectedPill}>
          <Text style={styles.selectedPillText}>{rounds}</Text>
        </View>
      </View>
      <View style={styles.pillsGrid}>
        {ROUND_OPTIONS.map(opt => {
          const active = rounds === opt;
          return (
            <TouchableOpacity key={opt} style={[styles.roundPill, active && styles.roundPillActive]} onPress={() => setRounds(opt)} activeOpacity={0.7}>
              <Text style={[styles.roundPillText, active && styles.roundPillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const abilitiesPanel = (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>⚡ القدرات الخاصة</Text>
      <Text style={styles.panelDesc}>قدرات فريدة تغير مجريات المعركة</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, withAbility && styles.toggleBtnActive]} onPress={() => setWithAbility(true)} activeOpacity={0.75}>
          <Text style={styles.toggleBtnIcon}>❆</Text>
          <Text style={[styles.toggleBtnText, withAbility && styles.toggleBtnTextActive]}>مفعّلة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, !withAbility && styles.toggleBtnInactive]} onPress={() => setWithAbility(false)} activeOpacity={0.75}>
          <Text style={styles.toggleBtnIcon}>✕</Text>
          <Text style={[styles.toggleBtnText, !withAbility && styles.toggleBtnTextInactive]}>معطّلة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ctaBtn = (
    <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
      <Text style={styles.continueBtnText}>
        {isMultiplayer && isHost ? '✓ تأكيد وإرسال للضيف →' : 'التالي →'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/screens/game-mode' as any)} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>إعداد المباراة</Text>
            {isMultiplayer && isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>👑 صاحب الجلسة</Text>
              </View>
            )}
            <Text style={styles.subtitle}>خصّص تجربتك قبل المعركة</Text>
          </View>

          {isLandscape ? (
            <View style={styles.twoCol}>
              <View style={{ flex: 1, gap: SPACE.lg }}>
                {roundsPanel}
                <RarityWeightsPanel weights={rarityWeights} onChange={setRarityWeights} />
              </View>
              <View style={{ flex: 1, gap: SPACE.lg }}>
                {abilitiesPanel}
                {ctaBtn}
              </View>
            </View>
          ) : (
            <>
              {roundsPanel}
              {abilitiesPanel}
              <RarityWeightsPanel weights={rarityWeights} onChange={setRarityWeights} />
              {ctaBtn}
            </>
          )}
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl, paddingBottom: SPACE.xxl + SPACE.xl, gap: SPACE.lg },
  backBtn: { alignSelf: 'flex-start', paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.3)' },
  backBtnText: { color: COLOR.gold, fontSize: FONT.md },
  header: { alignItems: 'center', gap: SPACE.xs },
  title: { fontSize: FONT.hero, color: COLOR.gold, letterSpacing: 1, textAlign: 'center' },
  subtitle: { color: COLOR.textMuted, fontSize: FONT.sm, textAlign: 'center' },
  hostBadge: { backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: RADIUS.full, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  hostBadgeText: { color: COLOR.gold, fontSize: FONT.sm, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: SPACE.lg },
  panel: { ...GLASS_PANEL, padding: SPACE.xl, gap: SPACE.md },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: COLOR.gold, fontSize: FONT.base },
  panelDesc: { color: COLOR.textMuted, fontSize: FONT.sm },
  selectedPill: { backgroundColor: COLOR.goldFill, borderRadius: RADIUS.full, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs, borderWidth: 1, borderColor: COLOR.gold },
  selectedPillText: { color: COLOR.gold, fontSize: FONT.xl },
  pillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, justifyContent: 'center' },
  roundPill: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: 'rgba(228,165,42,0.25)', alignItems: 'center', justifyContent: 'center' },
  roundPillActive: { backgroundColor: COLOR.gold, borderColor: COLOR.gold, ...SHADOW.gold },
  roundPillText: { color: COLOR.textMuted, fontSize: FONT.lg },
  roundPillTextActive: { color: '#1A0D1A' },
  toggleRow: { flexDirection: 'row', gap: SPACE.md },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, paddingVertical: SPACE.md, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(228,165,42,0.2)' },
  toggleBtnActive: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80' },
  toggleBtnInactive: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: '#f87171' },
  toggleBtnIcon: { fontSize: 16, color: COLOR.textMuted },
  toggleBtnText: { fontSize: FONT.base, color: COLOR.textMuted },
  toggleBtnTextActive: { color: '#4ade80' },
  toggleBtnTextInactive: { color: '#f87171' },
  continueBtn: { backgroundColor: COLOR.gold, paddingVertical: SPACE.lg, borderRadius: RADIUS.pill, alignItems: 'center', ...SHADOW.gold },
  continueBtnText: { fontSize: FONT.xl, color: '#1A0D1A' },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACE.lg, padding: SPACE.xl },
  waitingTitle: { fontSize: FONT.xl, color: COLOR.gold, fontWeight: '800', textAlign: 'center' },
  waitingDesc: { fontSize: FONT.base, color: COLOR.textMuted, textAlign: 'center' },
});

const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  emoji: { fontSize: 16, width: 22, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', width: 44, textAlign: 'right' },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, position: 'absolute', left: 0, top: 0 },
  pct: { fontSize: 12, fontWeight: '800', width: 36, textAlign: 'center' },
  btns: { flexDirection: 'row', gap: 4 },
  stepBtn: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  resetBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(228,165,42,0.35)', backgroundColor: 'rgba(228,165,42,0.08)' },
  resetTxt: { color: COLOR.gold, fontSize: 11, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  totalLabel: { fontSize: 12, fontWeight: '700' },
  autoFix: { fontSize: 11, color: '#f87171', textDecorationLine: 'underline' },
});
