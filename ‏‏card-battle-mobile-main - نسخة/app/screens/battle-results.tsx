import React, { useEffect, useMemo } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { updateStatsAfterMatch } from '@/lib/stats/storage';
import { ProButton } from '@/components/ui/ProButton';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL } from '@/components/ui/design-tokens';
import { getAbilityNameAr } from '@/lib/game/ability-names';
import type { AbilityType } from '@/lib/game/types';

const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', ice: '❄️', water: '💧',
  earth: '🌍', lightning: '⚡', wind: '💨',
};
const ELEMENT_AR: Record<string, string> = {
  fire: 'نار', ice: 'جليد', water: 'ماء',
  earth: 'أرض', lightning: 'برق', wind: 'ريح',
};
const DIFF_LABELS: Record<number, string> = {
  1: 'سهل', 2: 'متوسط', 3: 'صعب', 4: 'خيالي', 5: 'أسطوري',
};

// ─── HP Bar ───
function HpBar({ current, max, color, label }: { current: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.max(0, current / max) : 0;
  return (
    <View style={hp.wrap}>
      <View style={hp.header}>
        <Text style={[hp.lbl, { color }]}>{label}</Text>
        <Text style={[hp.val, { color }]}>{current} / {max}</Text>
      </View>
      <View style={hp.track}>
        <View style={[hp.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const hp = StyleSheet.create({
  wrap:   { flex: 1, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  lbl:    { fontSize: FONT.xs, fontWeight: '700' },
  val:    { fontSize: FONT.xs, fontWeight: '900' },
  track:  { height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill:   { height: '100%', borderRadius: 6 },
});

// ─── Stat chip ───
function StatChip({ icon, label, value, color = COLOR.textMuted }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={sc.chip}>
      <Text style={sc.icon}>{icon}</Text>
      <View>
        <Text style={sc.label}>{label}</Text>
        <Text style={[sc.value, { color }]}>{value}</Text>
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  chip:  { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, padding: SPACE.md, flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  icon:  { fontSize: 20 },
  label: { color: COLOR.textMuted, fontSize: FONT.xs - 1 },
  value: { fontSize: FONT.base, marginTop: 1 },
});

// ─── Main screen ───
export default function BattleResultsScreen() {
  const router = useRouter();
  const { state, resetGame } = useGame();
  const { height } = useWindowDimensions();
  const isSmallHeight = height < 400;

  const playerHp    = state.playerScore;
  const botHp       = state.botScore;
  const totalRounds = state.totalRounds;

  const playerLostByHp = playerHp <= 0 && botHp > 0;
  const botLostByHp   = botHp   <= 0 && playerHp > 0;
  const isPlayerWinner = botLostByHp  || (!playerLostByHp && playerHp > botHp);
  const isDraw         = !playerLostByHp && !botLostByHp && playerHp === botHp;

  useEffect(() => {
    const saveStats = async () => {
      if (state.playerDeck.length > 0) {
        const elementsUsed = state.playerDeck.map(card => card.element);
        await updateStatsAfterMatch(
          state.playerScore, state.botScore,
          state.totalRounds, elementsUsed, state.difficulty,
        );
      }
    };
    saveStats();
  }, []);

  const stats = useMemo(() => {
    const results = state.roundResults ?? [];
    const bestPlayerCard = results.reduce((best: any, r: any) =>
      (r.playerCard.attack + r.playerCard.defense) > ((best?.attack ?? 0) + (best?.defense ?? 0))
        ? r.playerCard : best, null);
    const elementCount: Record<string, number> = {};
    for (const r of results) { const el = r.playerCard.element; elementCount[el] = (elementCount[el] ?? 0) + 1; }
    const topElement = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const closeRounds = results.filter((r: any) => r.winner !== 'draw' && Math.abs(r.playerDamage - r.botDamage) <= 5).length;
    let maxStreak = 0, curStreak = 0;
    for (const r of results) {
      if (r.winner === 'player') { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
      else curStreak = 0;
    }
    const playerUsed: AbilityType[] = state.usedAbilities ?? [];
    const botUsed: AbilityType[] = (state.botAbilities ?? []).filter((a: any) => a.used).map((a: any) => a.type);
    return { bestPlayerCard, topElement, closeRounds, maxStreak, playerUsed, botUsed };
  }, [state.roundResults, state.usedAbilities, state.botAbilities]);

  const resultConfig = isDraw
    ? { emoji: '🤝', label: 'تعادل!',         color: COLOR.amber, bg: 'rgba(251,191,36,0.08)',  border: COLOR.amber }
    : isPlayerWinner
      ? { emoji: '🏆', label: 'فزت!',            color: COLOR.green, bg: 'rgba(74,222,128,0.08)',  border: COLOR.green }
      : { emoji: '💀', label: 'انتهت اللعبة!', color: COLOR.red,   bg: 'rgba(248,113,113,0.08)', border: COLOR.red };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            isSmallHeight && { paddingTop: SPACE.xl, paddingBottom: SPACE.xl, gap: SPACE.md },
          ]}
          showsVerticalScrollIndicator={false}
        >

          {/* Hero */}
          <View style={[styles.heroBanner, { backgroundColor: resultConfig.bg, borderColor: resultConfig.border + '40' }]}>
            <View style={[styles.winnerBadge, { borderColor: resultConfig.border + '80', backgroundColor: resultConfig.border + '18' }]}>
              <Text style={styles.heroEmoji}>{resultConfig.emoji}</Text>
              <Text style={[styles.heroLabel, { color: resultConfig.color }]}>{resultConfig.label}</Text>
              {isPlayerWinner && (
                <View style={styles.diffBadge}>
                  <Text style={styles.diffBadgeText}>🏅 {DIFF_LABELS[state.difficulty] ?? 'عادي'}</Text>
                </View>
              )}
            </View>

            {/* ── شريطي صحة ── */}
            <View style={styles.hpSection}>
              <HpBar current={playerHp} max={totalRounds} color={COLOR.green} label="أنت ♥" />
              <HpBar current={botHp}    max={totalRounds} color={COLOR.red}   label="البوت ♥" />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatChip icon="⚡" label="أقوى كرت" value={stats.bestPlayerCard ? (stats.bestPlayerCard.nameAr ?? stats.bestPlayerCard.name) : '—'} color={COLOR.gold} />
            <StatChip icon={stats.topElement ? (ELEMENT_EMOJI[stats.topElement] ?? '🌀') : '🌀'} label="عنصرك المفضل" value={stats.topElement ? (ELEMENT_AR[stats.topElement] ?? stats.topElement) : '—'} />
          </View>
          <View style={styles.statsRow}>
            <StatChip icon="🔥" label="سلسلة فوز" value={stats.maxStreak > 0 ? `${stats.maxStreak} جولات` : '—'} color={stats.maxStreak >= 3 ? COLOR.green : COLOR.textMuted} />
            <StatChip icon="⚔️" label="جولات حرجة" value={String(stats.closeRounds)} />
          </View>

          {/* قدرات */}
          {(stats.playerUsed.length > 0 || stats.botUsed.length > 0) && (
            <View style={[styles.panel, { gap: SPACE.md }]}>
              <Text style={styles.panelTitle}>⚡ القدرات المستخدمة</Text>
              {stats.playerUsed.length > 0 && (
                <View style={styles.abilitiesBlock}>
                  <Text style={[styles.abilitiesWho, { color: COLOR.green }]}>👤 أنت</Text>
                  <View style={styles.abilitiesRow}>
                    {stats.playerUsed.map((ab, i) => (
                      <View key={i} style={[styles.abilityChip, { borderColor: COLOR.green + '55', backgroundColor: COLOR.green + '10' }]}>
                        <Text style={[styles.abilityChipText, { color: COLOR.green }]}>{getAbilityNameAr(ab).split('(')[0].trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {stats.botUsed.length > 0 && (
                <View style={styles.abilitiesBlock}>
                  <Text style={[styles.abilitiesWho, { color: COLOR.red }]}>🤖 البوت</Text>
                  <View style={styles.abilitiesRow}>
                    {stats.botUsed.map((ab, i) => (
                      <View key={i} style={[styles.abilityChip, { borderColor: COLOR.red + '55', backgroundColor: COLOR.red + '10' }]}>
                        <Text style={[styles.abilityChipText, { color: COLOR.red }]}>{getAbilityNameAr(ab).split('(')[0].trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* سجل الجولات */}
          {state.roundResults && state.roundResults.length > 0 && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>📜 سجل الجولات</Text>
              {state.roundResults.map((round: any, index: number) => {
                const roundColor  = round.winner === 'player' ? COLOR.green : round.winner === 'bot' ? COLOR.red : COLOR.amber;
                const roundLabel  = round.winner === 'player' ? '✓ أنت' : round.winner === 'bot' ? '✗ البوت' : '= تعادل';
                return (
                  <View key={index} style={[styles.roundRow, { borderLeftColor: roundColor }]}>
                    <View style={styles.roundLeft}>
                      <Text style={styles.roundNum}>جولة {index + 1}</Text>
                      <Text style={[styles.roundWinner, { color: roundColor }]}>{roundLabel}</Text>
                    </View>
                    <View style={styles.roundCards}>
                      <Text style={styles.roundCard} numberOfLines={1}>{round.playerCard?.nameAr}</Text>
                      <Text style={styles.roundVs}>vs</Text>
                      <Text style={styles.roundCard} numberOfLines={1}>{round.botCard?.nameAr}</Text>
                    </View>
                    <View style={styles.roundRight}>
                      <Text style={styles.roundDmg}>{round.playerDamage}{round.playerElementAdvantage !== 'neutral' ? ` (${round.playerElementAdvantage === 'strong' ? '+25%' : '-25%'})` : ''}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <ProButton label="🎮 العب مجددا" onPress={() => { resetGame(); router.push('/screens/rounds-config' as any); }} variant="primary" style={styles.actionBtn} />
            <ProButton label="🏠 الرئيسية" onPress={() => router.push('/screens/splash' as any)} variant="secondary" style={styles.actionBtn} />
          </View>

        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container:       { paddingHorizontal: SPACE.lg, paddingTop: SPACE.xxl, paddingBottom: SPACE.xxl + SPACE.xl, gap: SPACE.xl },
  heroBanner:      { ...GLASS_PANEL, alignItems: 'center', paddingVertical: SPACE.xxl, gap: SPACE.lg },
  winnerBadge:     { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xxl, paddingVertical: SPACE.lg, borderRadius: RADIUS.lg, borderWidth: 1.5, width: '100%' },
  heroEmoji:       { fontSize: 56 },
  heroLabel:       { fontSize: FONT.hero + 4, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, textAlign: 'center' },
  diffBadge:       { marginTop: SPACE.xs, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs, borderRadius: RADIUS.full, backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  diffBadgeText:   { color: COLOR.green, fontSize: FONT.xs },
  hpSection:       { width: '100%', gap: SPACE.md, paddingHorizontal: SPACE.sm },
  statsRow:        { flexDirection: 'row', gap: SPACE.md },
  panel:           { ...GLASS_PANEL, padding: SPACE.xl },
  panelTitle:      { color: COLOR.gold, fontSize: FONT.lg, marginBottom: SPACE.md },
  abilitiesBlock:  { gap: SPACE.sm },
  abilitiesWho:    { fontSize: FONT.sm, marginBottom: 2 },
  abilitiesRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  abilityChip:     { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderRadius: RADIUS.full, borderWidth: 1 },
  abilityChipText: { fontSize: FONT.xs },
  roundRow:        { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingLeft: SPACE.md, paddingVertical: SPACE.sm, marginBottom: SPACE.sm, gap: SPACE.md, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.sm },
  roundLeft:       { minWidth: 72 },
  roundNum:        { color: COLOR.textMuted, fontSize: FONT.xs },
  roundWinner:     { fontSize: FONT.sm, marginTop: 2 },
  roundCards:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  roundCard:       { flex: 1, color: COLOR.textPrimary, fontSize: FONT.xs, textAlign: 'center' },
  roundVs:         { color: COLOR.textMuted, fontSize: FONT.xs },
  roundRight:      { minWidth: 60, alignItems: 'flex-end' },
  roundDmg:        { color: COLOR.textMuted, fontSize: FONT.xs },
  actions:         { flexDirection: 'row', gap: SPACE.md },
  actionBtn:       { flex: 1 },
});
