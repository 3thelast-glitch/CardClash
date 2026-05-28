/**
 * StatsScreen — Solo + Online tabs with ELO ranking.
 */
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  Alert, StyleSheet, useWindowDimensions,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { loadStats, resetStats } from '@/lib/stats/storage';
import { PlayerStats } from '@/lib/stats/types';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL } from '@/components/ui/design-tokens';

// ── الملفات الجديدة ────────────────────────────────────────
import { getMpStats, resetMpStats, MultiplayerStats } from '@/lib/stats/mp-stats';
import { getHistoryByMode, MatchRecord } from '@/lib/stats/history';
import { eloTier } from '@/lib/stats/elo';

// ── ثوابت ──────────────────────────────────────────────────
const ELEMENT_META: Record<string, { color: string; emoji: string; label: string }> = {
  fire:      { color: '#ef4444', emoji: '🔥', label: 'نار'   },
  ice:       { color: '#38bdf8', emoji: '❄️', label: 'جليد'  },
  water:     { color: '#3b82f6', emoji: '💧', label: 'ماء'   },
  earth:     { color: '#84cc16', emoji: '🌍', label: 'أرض'   },
  lightning: { color: '#facc15', emoji: '⚡', label: 'برق'   },
  wind:      { color: '#a78bfa', emoji: '🌪️', label: 'ريح'  },
};

const ELO_TIER_COLOR: Record<string, string> = {
  '⚔️ Iron':    '#9ca3af',
  '🥉 Bronze':  '#cd7c4a',
  '🥈 Silver':  '#94a3b8',
  '🥇 Gold':    '#facc15',
  '💎 Diamond': '#38bdf8',
  '👑 Legend':  '#f59e0b',
};

// ── مكوّن بطاقة إحصائية صغيرة ──────────────────────────────
function StatCard({ value, label, color, emoji }: {
  value: string | number; label: string; color: string; emoji: string;
}) {
  return (
    <View style={sc.card}>
      <Text style={sc.emoji}>{emoji}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card:  { flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: SPACE.md, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: SPACE.xs },
  emoji: { fontSize: 22 },
  value: { fontSize: FONT.xl },
  label: { color: COLOR.textMuted, fontSize: FONT.xs - 2, textAlign: 'center' },
});

// ── شريط التقدم ─────────────────────────────────────────────
function BarRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{pct.toFixed(1)}%</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
export default function StatsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // ── حالة التاب ─────────────────────────────────────────────
  const [tab, setTab] = useState<'solo' | 'online'>('solo');

  // ── Solo ────────────────────────────────────────────────────
  const [soloStats, setSoloStats]   = useState<PlayerStats | null>(null);

  // ── Online ──────────────────────────────────────────────────
  const [mpStats, setMpStats]       = useState<MultiplayerStats | null>(null);
  const [mpHistory, setMpHistory]   = useState<MatchRecord[]>([]);

  const [loading, setLoading]       = useState(true);

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    if (tab === 'solo') {
      setSoloStats(await loadStats());
    } else {
      const [mp, hist] = await Promise.all([
        getMpStats(),
        getHistoryByMode('online'),
      ]);
      setMpStats(mp);
      setMpHistory(hist);
    }
    setLoading(false);
  };

  // ── إعادة تعيين ─────────────────────────────────────────────
  const handleReset = () => {
    const label = tab === 'solo' ? 'Solo' : 'Online';
    Alert.alert(
      `إعادة تعيين ${label}`,
      'سيتم حذف جميع إحصائياتك. هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            if (tab === 'solo') await resetStats();
            else                await resetMpStats();
            await load();
          },
        },
      ],
    );
  };

  // ════════════════════════════════════════════════════════════
  // محتوى Solo
  // ════════════════════════════════════════════════════════════
  const soloWinRate = soloStats && soloStats.totalMatches > 0
    ? (soloStats.totalWins / soloStats.totalMatches) * 100
    : 0;

  const soloElements = soloStats
    ? Object.values(soloStats.elementStats).sort((a, b) => b.timesUsed - a.timesUsed)
    : [];

  const soloContent = (
    <>
      {/* نظرة عامة */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📊 نظرة عامة</Text>
        <View style={styles.cardsRow}>
          <StatCard value={soloStats?.totalMatches   ?? 0} label="مباريات"    color={COLOR.gold}  emoji="🎮" />
          <StatCard value={soloStats?.totalWins      ?? 0} label="انتصارات"   color={COLOR.green} emoji="🏆" />
          <StatCard value={soloStats?.totalLosses    ?? 0} label="هزائم"      color={COLOR.red}   emoji="💀" />
          <StatCard value={soloStats?.totalDraws     ?? 0} label="تعادلات"    color={COLOR.amber} emoji="🤝" />
        </View>
        <BarRow label="معدل الفوز" pct={soloWinRate} color={COLOR.green} />
      </View>

      {/* أفضل النتائج */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>🔥 أفضل النتائج</Text>
        <View style={styles.cardsRow}>
          <StatCard value={soloStats?.bestWinStreak    ?? 0} label="أطول سلسلة"    color={COLOR.gold}  emoji="👑" />
          <StatCard value={soloStats?.currentWinStreak ?? 0} label="السلسلة الحالية" color={COLOR.amber} emoji="🔥" />
          <StatCard value={soloStats?.highestScore     ?? 0} label="أعلى نتيجة"    color={COLOR.green} emoji="⭐" />
        </View>
      </View>

      {/* العناصر */}
      {soloElements.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>🌟 إحصائيات العناصر</Text>
          {soloElements.map((el) => {
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

      {/* آخر مباريات Solo */}
      {soloStats && soloStats.matchHistory.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>📜 آخر المباريات</Text>
          {soloStats.matchHistory.slice(0, 10).map((match) => {
            const isWin  = match.winner === 'player';
            const isDraw = match.winner === 'draw';
            const color  = isWin ? COLOR.green : isDraw ? COLOR.amber : COLOR.red;
            const label  = isWin ? 'فوز 🏆' : isDraw ? 'تعادل 🤝' : 'هزيمة 💀';
            const diff   = ['', 'سهل', 'متوسط', 'صعب', 'خيالي', 'أسطوري'][match.difficulty ?? 0] ?? '?';
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

  // ════════════════════════════════════════════════════════════
  // محتوى Online
  // ════════════════════════════════════════════════════════════
  const tier      = mpStats ? eloTier(mpStats.currentElo) : '⚔️ Iron';
  const tierColor = ELO_TIER_COLOR[tier] ?? COLOR.gold;

  const onlineContent = (
    <>
      {/* بطاقة ELO */}
      <View style={[styles.panel, styles.eloPanel]}>
        <Text style={styles.panelTitle}>🏅 تصنيف ELO</Text>
        <Text style={[styles.eloTier, { color: tierColor }]}>{tier}</Text>
        <View style={styles.cardsRow}>
          <StatCard value={mpStats?.currentElo ?? 1000} label="النقاط الحالية" color={tierColor}    emoji="🎯" />
          <StatCard value={mpStats?.peakElo    ?? 1000} label="أعلى نقطة"     color={COLOR.gold}   emoji="👑" />
        </View>
        <BarRow
          label="معدل الفوز"
          pct={mpStats?.winRate ?? 0}
          color={COLOR.green}
        />
      </View>

      {/* نظرة عامة Online */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📊 إحصائيات المباريات</Text>
        <View style={styles.cardsRow}>
          <StatCard value={mpStats?.totalOnline  ?? 0} label="مباريات"   color={COLOR.gold}  emoji="🎮" />
          <StatCard value={mpStats?.onlineWins   ?? 0} label="انتصارات"  color={COLOR.green} emoji="🏆" />
          <StatCard value={mpStats?.onlineLosses ?? 0} label="هزائم"     color={COLOR.red}   emoji="💀" />
          <StatCard value={mpStats?.onlineDraws  ?? 0} label="تعادلات"   color={COLOR.amber} emoji="🤝" />
        </View>
      </View>

      {/* سجل مباريات Online */}
      {mpHistory.length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>📜 آخر المباريات الجماعية</Text>
          {mpHistory.slice(0, 15).map((match) => {
            const isWin  = match.result === 'win';
            const isDraw = match.result === 'draw';
            const color  = isWin ? COLOR.green : isDraw ? COLOR.amber : COLOR.red;
            const label  = isWin ? 'فوز 🏆' : isDraw ? 'تعادل 🤝' : 'هزيمة 💀';
            const delta  = match.eloDelta ?? 0;
            const deltaColor = delta > 0 ? COLOR.green : delta < 0 ? COLOR.red : COLOR.textMuted;
            const deltaText  = delta > 0 ? `+${delta}` : `${delta}`;
            const date   = new Date(match.date).toLocaleDateString('ar-SA');
            return (
              <View key={match.id} style={[styles.histRow, { borderLeftColor: color }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histResult, { color }]}>{label}</Text>
                  <Text style={styles.histDiff}>{date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.histScore, { color: deltaColor }]}>{deltaText} ELO</Text>
                  <Text style={styles.histRounds}>{match.totalRounds} ج</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.panel, { alignItems: 'center', paddingVertical: SPACE.xxl }]}>
          <Text style={{ fontSize: 40 }}>🎮</Text>
          <Text style={[styles.panelTitle, { marginTop: SPACE.md }]}>لا توجد مباريات بعد</Text>
          <Text style={{ color: COLOR.textMuted, textAlign: 'center', marginTop: SPACE.sm }}>
            العب مباراة جماعية لتظهر هنا!
          </Text>
        </View>
      )}
    </>
  );

  // ════════════════════════════════════════════════════════════
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📊 الإحصائيات</Text>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'solo'   && styles.tabActive]}
              onPress={() => setTab('solo')}
            >
              <Text style={[styles.tabText, tab === 'solo'   && styles.tabTextActive]}>🤖 فردي</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'online' && styles.tabActive]}
              onPress={() => setTab('online')}
            >
              <Text style={[styles.tabText, tab === 'online' && styles.tabTextActive]}>🌐 جماعي</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {isLandscape ? (
            <View style={styles.twoCol}>
              <View style={{ flex: 1, gap: SPACE.lg }}>
                {tab === 'solo' ? soloContent : onlineContent}
              </View>
            </View>
          ) : (
            tab === 'solo' ? soloContent : onlineContent
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

// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:   { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl, paddingBottom: SPACE.xxl + SPACE.xl, gap: SPACE.lg },
  header:      { alignItems: 'center' },
  title:       { fontSize: FONT.hero, color: COLOR.gold, letterSpacing: 1, textAlign: 'center' },
  twoCol:      { flexDirection: 'row', gap: SPACE.lg, alignItems: 'flex-start' },

  // ── Tab Bar ────────────────────────────────────────────────
  tabBar:      { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.pill, padding: 4, gap: 4 },
  tabBtn:      { flex: 1, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill, alignItems: 'center' },
  tabActive:   { backgroundColor: COLOR.gold },
  tabText:     { color: COLOR.textMuted, fontSize: FONT.base },
  tabTextActive: { color: '#000', fontWeight: 'bold' },

  // ── Panels ─────────────────────────────────────────────────
  panel:       { ...GLASS_PANEL, padding: SPACE.xl, gap: SPACE.md },
  eloPanel:    { borderColor: 'rgba(250,204,21,0.3)', borderWidth: 1.5 },
  panelTitle:  { color: COLOR.gold, fontSize: FONT.base, marginBottom: SPACE.xs },
  eloTier:     { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: SPACE.sm },
  cardsRow:    { flexDirection: 'row', gap: SPACE.sm },

  // ── Bar ────────────────────────────────────────────────────
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  barLabel:    { color: COLOR.textMuted, fontSize: FONT.sm, width: 80 },
  barTrack:    { flex: 1, height: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: RADIUS.full },
  barValue:    { fontSize: FONT.sm, width: 44, textAlign: 'right' },

  // ── Elements ───────────────────────────────────────────────
  elRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xs },
  elEmoji:     { fontSize: 18, width: 26, textAlign: 'center' },
  elName:      { width: 44, fontSize: FONT.sm },
  elTrack:     { flex: 1, height: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  elFill:      { height: '100%', borderRadius: RADIUS.full },
  elStats:     { color: COLOR.textMuted, fontSize: FONT.xs, width: 60, textAlign: 'right' },

  // ── History ────────────────────────────────────────────────
  histRow:     { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingLeft: SPACE.md, paddingVertical: SPACE.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.sm, gap: SPACE.md, marginBottom: SPACE.xs },
  histResult:  { fontSize: FONT.sm },
  histDiff:    { color: COLOR.textMuted, fontSize: FONT.xs, marginTop: 2 },
  histScore:   { color: COLOR.textPrimary, fontSize: FONT.base },
  histRounds:  { color: COLOR.textMuted, fontSize: FONT.xs, minWidth: 30, textAlign: 'right' },

  // ── Actions ────────────────────────────────────────────────
  actions:     { flexDirection: 'row', gap: SPACE.md },
  resetBtn:    { flex: 1, paddingVertical: SPACE.lg, borderRadius: RADIUS.pill, alignItems: 'center', backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.4)' },
  resetBtnText:{ color: '#f87171', fontSize: FONT.base },
  backBtn:     { flex: 1, paddingVertical: SPACE.lg, borderRadius: RADIUS.pill, alignItems: 'center', backgroundColor: 'rgba(228,165,42,0.1)', borderWidth: 1.5, borderColor: 'rgba(228,165,42,0.3)' },
  backBtnText: { color: COLOR.gold, fontSize: FONT.base },
});
