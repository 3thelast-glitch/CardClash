import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';

// ── الملفات الجديدة ───────────────────────────────────────
import { recordMpMatch, MultiplayerStats } from '@/lib/stats/mp-stats';
import { addMatchRecord } from '@/lib/stats/history';
import { eloTier } from '@/lib/stats/elo';

export default function MultiplayerResultsScreen() {
  const router = useRouter();
  const { state: mpState, leaveRoom } = useMultiplayer();

  const [stats, setStats]       = useState<MultiplayerStats | null>(null);
  const [deltaElo, setDeltaElo] = useState<number>(0);
  const [saved, setSaved]       = useState(false);

  // ── تحديد نتيجة المباراة ─────────────────────────────────
  const winner: 'win' | 'loss' | 'draw' =
    mpState.playerScore > mpState.opponentScore ? 'win'  :
    mpState.playerScore < mpState.opponentScore ? 'loss' : 'draw';

  // ── حفظ النتيجة عند تحميل الشاشة (مرة واحدة فقط) ────────
  useEffect(() => {
    if (saved) return;
    setSaved(true);
    saveMatchResult();
  }, []);

  const saveMatchResult = async () => {
    try {
      // 1. تحديث إحصائيات MP + ELO
      const { stats: newStats, eloDelta: delta } = await recordMpMatch(winner);
      setStats(newStats);
      setDeltaElo(delta);

      // 2. إضافة سجل في التاريخ العام
      await addMatchRecord({
        mode:         'online',
        opponentType: 'human',
        result:       winner,
        rounds:       [],           // يمكن تمرير gameState.roundResults هنا لاحقاً
        totalRounds:  mpState.playerCards?.length ?? 0,
        eloBefore:    newStats.currentElo - delta,
        eloAfter:     newStats.currentElo,
        eloDelta:     delta,
      });
    } catch (error) {
      console.error('Error saving match result:', error);
    }
  };

  const handlePlayAgain = () => {
    leaveRoom();
    router.push('/screens/multiplayer-lobby' as any);
  };

  const handleHome = () => {
    leaveRoom();
    router.push('/(tabs)' as any);
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container}>

          {/* Title */}
          <Text style={styles.title}>نتائج المباراة</Text>

          {/* Final Result */}
          <View style={styles.resultContainer}>
            <View style={styles.playerResult}>
              <Text style={styles.playerName}>أنت</Text>
              <Text style={[styles.score, winner === 'win' && styles.winnerScore]}>
                {mpState.playerScore}
              </Text>
              {winner === 'win' && <Text style={styles.winnerBadge}>🏆 الفائز 🏆</Text>}
            </View>

            <Text style={styles.vs}>VS</Text>

            <View style={styles.playerResult}>
              <Text style={styles.playerName}>{mpState.opponentName}</Text>
              <Text style={[styles.score, winner === 'loss' && styles.winnerScore]}>
                {mpState.opponentScore}
              </Text>
              {winner === 'loss' && <Text style={styles.winnerBadge}>🏆 الفائز 🏆</Text>}
            </View>
          </View>

          {/* Result Message */}
          <View style={styles.messageContainer}>
            {winner === 'win'  && <Text style={[styles.message, styles.winMessage]}>🎉 مبروك! أنت الفائز! 🎉</Text>}
            {winner === 'loss' && <Text style={[styles.message, styles.loseMessage]}>😔 للأسف خسرت هذه المرة</Text>}
            {winner === 'draw' && <Text style={[styles.message, styles.drawMessage]}>🤝 تعادل! 🤝</Text>}
            <Text style={styles.subtitle}>
              {winner === 'win' ? 'لقد لعبت بشكل رائع!' : winner === 'loss' ? 'حاول مرة أخرى!' : 'مباراة متوازنة!'}
            </Text>
          </View>

          {/* ELO Card */}
          {stats && (
            <View style={styles.eloCard}>
              <Text style={styles.statsTitle}>🏅 تصنيفك</Text>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>المستوى</Text>
                <Text style={styles.statValue}>{eloTier(stats.currentElo)}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>نقاط ELO</Text>
                <Text style={styles.statValue}>{stats.currentElo}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>التغيير</Text>
                <Text style={[
                  styles.statValue,
                  deltaElo > 0 ? styles.positiveElo : deltaElo < 0 ? styles.negativeElo : {},
                ]}>
                  {deltaElo > 0 ? `+${deltaElo}` : deltaElo}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>أعلى نقطة</Text>
                <Text style={styles.statValue}>{stats.peakElo}</Text>
              </View>
            </View>
          )}

          {/* Match Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>إحصائيات المباراة</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>عدد الجولات</Text>
              <Text style={styles.statValue}>{mpState.playerCards?.length ?? 0}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>نوع المباراة</Text>
              <Text style={styles.statValue}>لعب جماعي</Text>
            </View>

            {stats && (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>إجمالي مبارياتك</Text>
                  <Text style={styles.statValue}>{stats.totalOnline}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>نسبة الفوز</Text>
                  <Text style={styles.statValue}>{stats.winRate}%</Text>
                </View>
              </>
            )}

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>الوقت</Text>
              <Text style={styles.statValue}>{new Date().toLocaleTimeString('ar-SA')}</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAgain}>
              <Text style={styles.buttonText}>العب مرة أخرى</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleHome}>
              <Text style={styles.secondaryButtonText}>الرئيسية</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container:       { padding: 20, paddingBottom: 40 },
  title:           { fontSize: 42, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 30, textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4, flexWrap: 'wrap' },
  resultContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 },
  playerResult:    { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 15, padding: 20, alignItems: 'center', minWidth: 130 },
  playerName:      { fontSize: 18, color: '#ccc', marginBottom: 10, textAlign: 'center', flexWrap: 'wrap' },
  score:           { fontSize: 56, fontWeight: 'bold', color: '#FFD700', marginBottom: 10 },
  winnerScore:     { color: '#44ff44', textShadowColor: '#44ff44', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  winnerBadge:     { fontSize: 16, color: '#FFD700', fontWeight: 'bold', marginTop: 10 },
  vs:              { fontSize: 32, fontWeight: 'bold', color: '#FFD700' },
  messageContainer:{ backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 15, padding: 20, marginBottom: 30, alignItems: 'center' },
  message:         { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  winMessage:      { color: '#44ff44' },
  loseMessage:     { color: '#ff8844' },
  drawMessage:     { color: '#FFD700' },
  subtitle:        { fontSize: 16, color: '#ccc', textAlign: 'center' },
  eloCard:         { backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 15, padding: 20, marginBottom: 20 },
  statsContainer:  { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 15, padding: 20, marginBottom: 30 },
  statsTitle:      { fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginBottom: 15, textAlign: 'center' },
  statRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.2)' },
  statLabel:       { fontSize: 16, color: '#ccc' },
  statValue:       { fontSize: 16, fontWeight: 'bold', color: '#FFD700' },
  positiveElo:     { color: '#44ff44' },
  negativeElo:     { color: '#ff4444' },
  buttonsContainer:{ gap: 15 },
  primaryButton:   { backgroundColor: '#FFD700', borderRadius: 15, padding: 18, alignItems: 'center' },
  buttonText:      { fontSize: 20, fontWeight: 'bold', color: '#000' },
  secondaryButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, borderWidth: 2, borderColor: '#FFD700', padding: 18, alignItems: 'center' },
  secondaryButtonText: { fontSize: 20, fontWeight: 'bold', color: '#FFD700' },
});
