/**
 * StatsScreen — Redesigned: Professional, responsive, clean.
 */
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { loadStats, resetStats } from '@/lib/stats/storage';
import { PlayerStats } from '@/lib/stats/types';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';

const ELEMENT_META: Record<string, { color: string; emoji: string; label: string }> = {
  fire: { color: '#ef4444', emoji: '🔥', label: 'نار' },
  ice: { color: '#38bdf8', emoji: '❄️', label: 'جليد' },
  water: { color: '#3b82f6', emoji: '💧', label: 'ماء' },
  earth: { color: '#84cc16', emoji: '🌍', label: 'أرض' },
  lightning: { color: '#facc15', emoji: '⚡', label: 'برق' },
  wind: { color: '#a78bfa', emoji: '🌪️', label: 'ريح' },
};

function StatCard({ value, label, color, emoji }: { value: string | number; label: string; color: string; emoji: string }) {
  return (
    <View style={sc.card}>
      <Text style={sc.emoji}>{emoji}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1, minWidth: 70,
    alignItems: 'center',
    paddingVertical: SPACE.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: SPACE.xs,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: FONT.xl },
  label: { color: COLOR.textMuted, fontSize: FONT.xs - 2, textAlign: 'center' },
});

export default function StatsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    setStats(await loadStats());
    setLoading(false);
  };

  const handleReset = () => {
    Alert.alert('إعادة تعيين', 'سيتم حذف جميع إحصائياتك. هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await resetStats(); await load(); } },
    ]);
  };

  const winRate = stats && stats.totalMatches > 0
    ? ((stats.totalWins / stats.totalMatches) * 100).toFixed(1)
    : '0.0';

  const elements = stats
    ? Object.values(stats.elementStats).sort((a, b) => b.timesUsed - a.timesUsed)
    : [];

  // ─ Left column (landscape) / single column (portrait)
  const leftContent = (
    <>
      {/* Overview */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📊 نظرة عامة</Text>
        <View style={styles.cardsRow}>
          <StatCard value={stats?.totalMatches ?? 0} label="مباريات" color={COLOR.gold} emoji="🎮" />
          <StatCard value={stats?.totalWins ?? 0} label="انتصارات" color={COLOR.green} emoji="🏆" />
          <StatCard value={stats?.totalLosses ?? 0} label="هزائم" color={COLOR.red} emoji="💀" />
          <StatCard value={stats?.totalDraws ?? 0} label="تعادلات" color={COLOR.amber} emoji="🤝" />
        </View>
        {/* Win rate bar */}
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>معدل الفوز</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${winRate}%` as any, backgroundColor: COLOR.green }]} />
          </View>
          <Text style={[styles.barValue, { color: COLOR.green }]}>{winRate}%</Text>
        </View>
      </View>

      {/* Streaks */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>🔥 أفضل النتائج</Text>
        <View style={styles.cardsRow}>
          <StatCard value={stats?.bestWinStreak ?? 0} label="أطول سلسلة" color={COLOR.gold} emoji="👑" />
          <StatCard value={stats?.currentWinStreak ?? 0} label="السلسلة الحالية" color={COLOR.amber} emoji="🔥" />
          <StatCard value={stats?.highestScore ?? 0} label="أعلى نتيجة" color={COLOR.green} emoji="⭐" />
        </View>
      </View>
    </>
  );

  // ─ Right column (landscape) / continue column (portrait)
  const rightContent = (
    <>
      {/* Elements */}
      {elements.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>🌟 إحصائيات العناصر</Text>
          {elements.map((el) => {
            const meta = ELEMENT_META[el.element] ?? { color: COLOR.gold, emoji: '✦', label: el.element };
            const frac = el.timesUsed > 0 ? el.wins / el.timesUsed : 0;
            return (
              <View key={el.element} style={styles.elRow}>
                <Text style={styles.elEmoji}>{meta.emoji}</Text>
                <Text style={[styles.elName, { color: meta.color }]}>{meta.label}</Text>
                <View style={styles.elTrack}>
                  <View style={[styles.elFill, { width: `${frac * 100}%` as any, backgroundColor: meta.color }]} />
                </View>
                <Text style={styles.elStats}>{el.wins}W/{el.losses}L</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Match history */}
      {stats && stats.matchHistory.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>📜 آخر المباريات</Text>
          {stats.matchHistory.slice(0, 10).map((match) => {
            const isWin = match.winner === 'player';
            const isDraw = match.winner === 'draw';
            const color = isWin ? COLOR.green : isDraw ? COLOR.amber : COLOR.red;
            const label = isWin ? 'فوز 🏆' : isDraw ? 'تعادل 🤝' : 'هزيمة 💀';
            const diff = ['', 'سهل', 'متوسط', 'صعب', 'خيالي', 'أسطوري'][match.difficulty ?? 0] ?? '?';
            return (
              <View key={match.id} style={[styles.histRow, { borderLeftColor: color }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histResult, { color }]}>{label}</Text>
                  <Text style={styles.histDiff}>{diff}</Text>
                </View>
                <Text style={styles.histScore}>{match.playerScore} — {match.botScore}</Text>
                <Text style={styles.histRounds}>{match.totalRounds} ج</Text>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📊 الإحصائيات</Text>
          </View>

          {isLandscape ? (
            <View style={styles.twoCol}>
              <View style={{ flex: 1, gap: SPACE.lg }}>{leftContent}</View>
              <View style={{ flex: 1, gap: SPACE.lg }}>{rightContent}</View>
            </View>
          ) : (
            <>
              {leftContent}
              {rightContent}
            </>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.resetBtnText}>🗑️ إعادة تعيين</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.backBtnText}>← رجوع</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.xxl + SPACE.xl,
    gap: SPACE.lg,
  },

  header: { alignItems: 'center' },
  title: { fontSize: FONT.hero, color: COLOR.gold, letterSpacing: 1, textAlign: 'center' },

  twoCol: { flexDirection: 'row', gap: SPACE.lg, alignItems: 'flex-start' },

  panel: { ...GLASS_PANEL, padding: SPACE.xl, gap: SPACE.md },
  panelTitle: { color: COLOR.gold, fontSize: FONT.base, marginBottom: SPACE.xs },

  cardsRow: { flexDirection: 'row', gap: SPACE.sm },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  barLabel: { color: COLOR.textMuted, fontSize: FONT.sm, width: 80 },
  barTrack: {
    flex: 1, height: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: RADIUS.full },
  barValue: { fontSize: FONT.sm, width: 44, textAlign: 'right' },

  elRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  elEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  elName: { width: 44, fontSize: FONT.sm },
  elTrack: {
    flex: 1, height: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  elFill: { height: '100%', borderRadius: RADIUS.full },
  elStats: { color: COLOR.textMuted, fontSize: FONT.xs, width: 60, textAlign: 'right' },

  histRow: {
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, paddingLeft: SPACE.md,
    paddingVertical: SPACE.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.sm,
    gap: SPACE.md,
    marginBottom: SPACE.xs,
  },
  histResult: { fontSize: FONT.sm },
  histDiff: { color: COLOR.textMuted, fontSize: FONT.xs, marginTop: 2 },
  histScore: { color: COLOR.textPrimary, fontSize: FONT.base },
  histRounds: { color: COLOR.textMuted, fontSize: FONT.xs, minWidth: 30, textAlign: 'right' },

  actions: { flexDirection: 'row', gap: SPACE.md },
  resetBtn: {
    flex: 1, paddingVertical: SPACE.lg,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.4)',
  },
  resetBtnText: { color: '#f87171', fontSize: FONT.base },
  backBtn: {
    flex: 1, paddingVertical: SPACE.lg,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    backgroundColor: 'rgba(228,165,42,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(228,165,42,0.3)',
  },
  backBtnText: { color: COLOR.gold, fontSize: FONT.base },
});