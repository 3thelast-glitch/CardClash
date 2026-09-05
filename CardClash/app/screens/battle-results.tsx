import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Award, BarChart3, Flame, Home, RotateCcw, ShieldCheck, Swords, Trophy, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { LuxuryBackground } from '@/components/game/luxury-background';
import { ScreenContainer } from '@/components/screen-container';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { FONT, RADIUS, SEMANTIC_COLOR, SPACE } from '@/components/ui/design-tokens';
import { getAbilityNameAr } from '@/lib/game/ability-names';
import { useGame } from '@/lib/game/game-context';
import { RACE_LABELS, type AbilityType } from '@/lib/game/types';
import { updateStatsAfterMatch } from '@/lib/stats/storage';

const DIFFICULTY_LABELS: Record<number, string> = { 1: 'سهل', 2: 'متوسط', 3: 'صعب', 4: 'أسطوري', 5: 'أسطوري' };

function ScoreBar({ current, max, label, color }: { current: number; max: number; label: string; color: string }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  return (
    <View style={styles.scoreBar} accessibilityLabel={`${label}: ${current} من ${max}`}>
      <View style={styles.scoreBarHeader}>
        <Text type="label" style={{ color }}>{label}</Text>
        <Text forceLtr type="numeric" style={{ color }}>{current}/{max}</Text>
      </View>
      <View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${ratio * 100}%` as any, backgroundColor: color }]} /></View>
    </View>
  );
}

function Metric({ label, value, Icon, color = SEMANTIC_COLOR.text.primary }: { label: string; value: string; Icon: typeof Award; color?: string }) {
  return (
    <ObsidianPanel style={styles.metric}>
      <Icon size={21} color={color} />
      <View style={styles.metricCopy}>
        <Text type="caption" style={styles.metricLabel}>{label}</Text>
        <Text type="defaultSemiBold" style={[styles.metricValue, { color }]} numberOfLines={2}>{value}</Text>
      </View>
    </ObsidianPanel>
  );
}

export default function BattleResultsScreen() {
  const router = useRouter();
  const { state, resetGame } = useGame();
  const { height } = useWindowDimensions();
  const compact = height < 430;

  const playerScore = state.playerScore;
  const opponentScore = state.botScore;
  const local = state.matchMode === 'local';
  const playerLabel = local ? 'المضيف' : 'أنت';
  const opponentLabel = local ? 'الضيف' : 'البوت';
  const maxScore = Math.max(state.totalRounds, state.playerMaxHealth, state.botMaxHealth);

  const playerLost = playerScore <= 0 && opponentScore > 0;
  const opponentLost = opponentScore <= 0 && playerScore > 0;
  const playerWon = opponentLost || (!playerLost && playerScore > opponentScore);
  const draw = !playerLost && !opponentLost && playerScore === opponentScore;

  useEffect(() => {
    if (!state.playerDeck.length) return;
    const factions = state.playerDeck.map(card => card.race);
    void updateStatsAfterMatch(state.playerScore, state.botScore, state.totalRounds, factions, state.difficulty);
  }, []); // Match is terminal here; record once on screen entry, matching the existing behavior.

  const summary = useMemo(() => {
    const results = state.roundResults ?? [];
    const bestCard = results.reduce<any>((best, result: any) => {
      const power = (result.playerCard?.attack ?? 0) + (result.playerCard?.defense ?? 0);
      const bestPower = (best?.attack ?? 0) + (best?.defense ?? 0);
      return power > bestPower ? result.playerCard : best;
    }, null);

    const factionCount: Record<string, number> = {};
    results.forEach((result: any) => {
      if (result.playerCard?.race) factionCount[result.playerCard.race] = (factionCount[result.playerCard.race] ?? 0) + 1;
    });
    const topFaction = Object.entries(factionCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const closeRounds = results.filter((result: any) => result.winner !== 'draw' && Math.abs((result.playerDamage ?? 0) - (result.botDamage ?? 0)) <= 5).length;
    let streak = 0;
    let bestStreak = 0;
    results.forEach((result: any) => {
      if (result.winner === 'player') { streak += 1; bestStreak = Math.max(bestStreak, streak); } else streak = 0;
    });
    const playerAbilities: AbilityType[] = state.usedAbilities ?? [];
    const opponentAbilities: AbilityType[] = (state.botAbilities ?? []).filter((ability: any) => ability.used).map((ability: any) => ability.type);
    return { bestCard, topFaction, closeRounds, bestStreak, playerAbilities, opponentAbilities };
  }, [state.botAbilities, state.roundResults, state.usedAbilities]);

  const outcome = draw
    ? { label: 'تعادل', color: SEMANTIC_COLOR.status.warning, Icon: ShieldCheck }
    : playerWon
      ? { label: local ? 'فاز المضيف' : 'انتصار', color: SEMANTIC_COLOR.status.success, Icon: Trophy }
      : { label: local ? 'فاز الضيف' : 'خسارة', color: SEMANTIC_COLOR.status.danger, Icon: Swords };

  const OutcomeIcon = outcome.Icon;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]} showsVerticalScrollIndicator={false}>
          <ObsidianPanel raised accent style={[styles.hero, { borderColor: `${outcome.color}88` }]}>
            <View style={[styles.outcomeIcon, { borderColor: `${outcome.color}88`, backgroundColor: `${outcome.color}12` }]}>
              <OutcomeIcon size={38} color={outcome.color} />
            </View>
            <Text type="display" style={[styles.outcomeTitle, { color: outcome.color }]}>{outcome.label}</Text>
            <Text forceLtr type="numeric" style={styles.finalScore}>{playerScore} — {opponentScore}</Text>
            {!local && playerWon && (
              <View style={styles.difficultyBadge}>
                <Award size={15} color={SEMANTIC_COLOR.rarity.legendary} />
                <Text type="caption" style={styles.difficultyText}>{DIFFICULTY_LABELS[state.difficulty] ?? 'عادي'}</Text>
              </View>
            )}
            <View style={styles.bars}>
              <ScoreBar current={playerScore} max={maxScore} label={playerLabel} color={SEMANTIC_COLOR.status.success} />
              <ScoreBar current={opponentScore} max={maxScore} label={opponentLabel} color={SEMANTIC_COLOR.status.danger} />
            </View>
          </ObsidianPanel>

          <View style={styles.metricsGrid}>
            <Metric label="أقوى كرت" value={summary.bestCard ? (summary.bestCard.nameAr ?? summary.bestCard.name) : '—'} Icon={Zap} color={SEMANTIC_COLOR.accent.primary} />
            <Metric label="الفصيلة الأكثر استخداماً" value={summary.topFaction ? (RACE_LABELS[summary.topFaction as keyof typeof RACE_LABELS] ?? summary.topFaction) : '—'} Icon={BarChart3} />
            <Metric label="أفضل سلسلة فوز" value={summary.bestStreak ? `${summary.bestStreak} جولات` : '—'} Icon={Flame} color={summary.bestStreak >= 3 ? SEMANTIC_COLOR.status.success : SEMANTIC_COLOR.text.primary} />
            <Metric label="جولات متقاربة" value={String(summary.closeRounds)} Icon={Swords} />
          </View>

          {(summary.playerAbilities.length > 0 || summary.opponentAbilities.length > 0) && (
            <ObsidianPanel raised style={styles.section}>
              <Text type="defaultSemiBold" style={styles.sectionTitle}>القدرات المستخدمة</Text>
              {!!summary.playerAbilities.length && (
                <View style={styles.abilityGroup}>
                  <Text type="label" style={{ color: SEMANTIC_COLOR.status.success }}>{playerLabel}</Text>
                  <View style={styles.chips}>
                    {summary.playerAbilities.map((ability, index) => (
                      <View key={`${ability}-${index}`} style={[styles.chip, { borderColor: 'rgba(74,222,128,0.38)' }]}>
                        <Text type="caption" style={{ color: SEMANTIC_COLOR.status.success }}>{getAbilityNameAr(ability).split('(')[0].trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {!!summary.opponentAbilities.length && (
                <View style={styles.abilityGroup}>
                  <Text type="label" style={{ color: SEMANTIC_COLOR.status.danger }}>{opponentLabel}</Text>
                  <View style={styles.chips}>
                    {summary.opponentAbilities.map((ability, index) => (
                      <View key={`${ability}-${index}`} style={[styles.chip, { borderColor: 'rgba(251,113,133,0.38)' }]}>
                        <Text type="caption" style={{ color: SEMANTIC_COLOR.status.danger }}>{getAbilityNameAr(ability).split('(')[0].trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ObsidianPanel>
          )}

          {!!state.roundResults?.length && (
            <ObsidianPanel raised style={styles.section}>
              <Text type="defaultSemiBold" style={styles.sectionTitle}>سجل الجولات</Text>
              <View style={styles.roundList}>
                {state.roundResults.map((round: any, index: number) => {
                  const tone = round.winner === 'player' ? SEMANTIC_COLOR.status.success : round.winner === 'bot' ? SEMANTIC_COLOR.status.danger : SEMANTIC_COLOR.status.warning;
                  const winnerLabel = round.winner === 'player' ? playerLabel : round.winner === 'bot' ? opponentLabel : 'تعادل';
                  return (
                    <View key={`${index}-${round.playerCard?.id ?? 'player'}-${round.botCard?.id ?? 'opponent'}`} style={styles.roundRow} accessibilityLabel={`الجولة ${index + 1}. ${winnerLabel}`}>
                      <View style={[styles.roundIndex, { borderColor: `${tone}72` }]}><Text forceLtr type="numeric" style={{ color: tone }}>{index + 1}</Text></View>
                      <View style={styles.roundCopy}>
                        <Text type="label" style={{ color: tone }}>{winnerLabel}</Text>
                        <Text type="caption" style={styles.roundCards} numberOfLines={2}>
                          {round.playerCard?.nameAr ?? '—'}  ·  {round.botCard?.nameAr ?? '—'}
                        </Text>
                      </View>
                      <Text forceLtr type="numeric" style={styles.roundDamage}>{round.playerDamage ?? 0}</Text>
                    </View>
                  );
                })}
              </View>
            </ObsidianPanel>
          )}

          <View style={styles.actions}>
            <ProButton fullWidth label="مباراة جديدة" icon={<RotateCcw size={19} color={SEMANTIC_COLOR.text.inverse} />} onPress={() => { resetGame(); router.push('/screens/rounds-config' as any); }} />
            <ProButton fullWidth label="الرئيسية" variant="secondary" icon={<Home size={19} color="#DCE4FF" />} onPress={() => router.push('/screens/splash' as any)} />
          </View>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACE.xl, gap: SPACE.xl, backgroundColor: 'rgba(8,13,22,0.34)' },
  containerCompact: { paddingVertical: SPACE.md, gap: SPACE.md },
  hero: { width: '100%', maxWidth: 980, alignSelf: 'center', alignItems: 'center', gap: SPACE.md },
  outcomeIcon: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  outcomeTitle: { textAlign: 'center' },
  finalScore: { color: SEMANTIC_COLOR.text.primary, fontSize: FONT.xxl, letterSpacing: 4 },
  difficultyBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: 'rgba(244,201,106,0.38)', backgroundColor: 'rgba(244,201,106,0.08)' },
  difficultyText: { color: SEMANTIC_COLOR.rarity.legendary },
  bars: { width: '100%', gap: SPACE.md },
  scoreBar: { gap: SPACE.xs },
  scoreBarHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  scoreTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(168,180,199,0.10)' },
  scoreFill: { height: '100%', borderRadius: 5 },
  metricsGrid: { width: '100%', maxWidth: 980, alignSelf: 'center', flexDirection: 'row-reverse', flexWrap: 'wrap', gap: SPACE.md },
  metric: { minWidth: 220, flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md },
  metricCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  metricLabel: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right' },
  metricValue: { textAlign: 'right' },
  section: { width: '100%', maxWidth: 980, alignSelf: 'center', gap: SPACE.md },
  sectionTitle: { color: SEMANTIC_COLOR.accent.primary, textAlign: 'right' },
  abilityGroup: { gap: SPACE.sm },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: SPACE.sm },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, borderWidth: 1, backgroundColor: 'rgba(8,13,22,0.42)' },
  roundList: { gap: SPACE.sm },
  roundRow: { minHeight: 62, flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.sm, borderTopWidth: 1, borderTopColor: 'rgba(43,61,85,0.62)' },
  roundIndex: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  roundCards: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right' },
  roundDamage: { color: SEMANTIC_COLOR.text.primary, minWidth: 34, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: SPACE.md },
});
