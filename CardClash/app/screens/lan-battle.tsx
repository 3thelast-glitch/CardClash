import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { AbilityCard } from '@/components/game/ability-card';
import { AbilityActivationOverlay, useAbilityActivationOverlay } from '@/components/game/AbilityActivationOverlay';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import { isLanGameOver } from '@/lib/lan/lan-match-engine';
import { ABILITY_DETAILS, CATEGORY_CONFIG } from '@/lib/game/ability-details';
import { abilities as ALL_ABILITIES } from '@/data/abilities';
import { determineRoundWinner } from '@/lib/game/cards-data-exports';
import type { Effect, Side } from '@/lib/game/types';
import { shouldPlayRoundCardAudio } from '@/lib/game/ui-helpers';
import { useBattleLayout } from '@/utils/layout';

function getRoundExplanation(result: NonNullable<ReturnType<typeof useLanMultiplayer>['match']['lastResult']>): string {
  if (result.winner === 'draw') return 'تعادل الكرتان: لم تمنح الفصائل أفضلية فاصلة وتساوت نتيجة المقارنة بعد تطبيق التأثيرات.';
  const winner = result.winner === 'host' ? result.hostCard : result.guestCard;
  const loser = result.winner === 'host' ? result.guestCard : result.hostCard;
  if (result.advantage === 'faction') return `فاز ${winner.name} بأفضلية الفصيلة على ${loser.name} قبل مقارنة الهجوم والدفاع.`;
  const winnerNet = Math.max(0, (winner.attack ?? 0) - (loser.defense ?? 0));
  const loserNet = Math.max(0, (loser.attack ?? 0) - (winner.defense ?? 0));
  return `فاز ${winner.name}: قوة الهجوم بعد دفاع الخصم ${winnerNet} مقابل ${loserNet} للكرت الآخر، بعد تطبيق القدرات والتأثيرات.`;
}

function getFactionLabel(advantage: 'strong' | 'weak' | 'neutral' | undefined): string {
  return advantage === 'strong' ? 'أفضلية قوية' : advantage === 'weak' ? 'أفضلية ضعيفة' : 'دون أفضلية';
}

type ActiveCardEffectBadge = { id: string; label: string; tone: 'buff' | 'debuff' | 'utility' };

function getActiveCardEffectBadges(effects: Effect[], side: Side, currentRound: number): ActiveCardEffectBadge[] {
  const roundNumber = currentRound + 1;
  return effects
    .filter(effect => effect.targetSide === side || effect.targetSide === 'all')
    .filter(effect => effect.createdAtRound <= roundNumber && (effect.expiresAtRound === undefined || roundNumber <= effect.expiresAtRound) && (effect.charges === undefined || effect.charges > 0))
    .filter(effect => {
      const appliesToRound = (effect.data as { appliesToRound?: number } | undefined)?.appliesToRound;
      return appliesToRound === undefined || appliesToRound === roundNumber;
    })
    .map(effect => {
      const data = effect.data as { stat?: 'attack' | 'defense' | 'all_stats'; amount?: number; double?: boolean } | undefined;
      if (effect.kind === 'statModifier') {
        if (data?.double) return { id: effect.id, label: 'تعزيز: الهجوم ×2', tone: 'buff' };
        const stat = data?.stat === 'defense' ? 'الدفاع' : data?.stat === 'all_stats' ? 'الهجوم والدفاع' : 'الهجوم';
        const amount = data?.amount ?? 0;
        return { id: effect.id, label: `${amount >= 0 ? 'تعزيز' : 'إضعاف'}: ${stat} ${amount >= 0 ? '+' : ''}${amount}`, tone: amount >= 0 ? 'buff' : 'debuff' };
      }
      const labels: Partial<Record<Effect['kind'], ActiveCardEffectBadge>> = {
        protection: { id: effect.id, label: 'حماية من خسارة نقطة', tone: 'buff' },
        shieldGuard: { id: effect.id, label: 'درع: حجب الخسارة والإضعاف', tone: 'buff' },
        silenceAbilities: { id: effect.id, label: 'إضعاف: القدرات مختومة', tone: 'debuff' },
        halvePoints: { id: effect.id, label: 'إضعاف: تنصيف النقاط', tone: 'debuff' },
        forcedOutcome: { id: effect.id, label: 'نتيجة مضمونة لهذه الجولة', tone: 'utility' },
        starAdvantage: { id: effect.id, label: 'تعزيز: تفوق النجوم', tone: 'buff' },
        absoluteDominance: { id: effect.id, label: 'خاص: السيطرة المطلقة', tone: 'utility' },
        turinPenalty: { id: effect.id, label: 'لعنة تورين: تخسر هذه الجولة', tone: 'debuff' },
        factionMastery: { id: effect.id, label: 'تعزيز: إتقان الفصائل', tone: 'buff' },
        trap: { id: effect.id, label: 'إضعاف: فخ فعّال', tone: 'debuff' },
        doubleOrNothing: { id: effect.id, label: 'خاص: دبل أو نثنق', tone: 'utility' },
        phantomBlade: { id: effect.id, label: 'تعزيز: شفرة الوهم', tone: 'buff' },
      };
      return labels[effect.kind] ?? { id: effect.id, label: 'تأثير خاص فعّال', tone: 'utility' };
    });
}

function getDynamicAudioWinner(match: ReturnType<typeof useLanMultiplayer>['match']): 'host' | 'guest' | null {
  if (match.phase === 'result' && match.lastResult) return match.lastResult.winner === 'draw' ? null : match.lastResult.winner;
  if (match.phase !== 'playing') return null;
  const hostCard = match.hostDeck[match.currentRound];
  const guestCard = match.guestDeck[match.currentRound];
  if (!hostCard || !guestCard) return null;

  const round = match.currentRound + 1;
  const effects = match.activeEffects.filter(effect => effect.createdAtRound <= round && (effect.expiresAtRound === undefined || round <= effect.expiresAtRound) && (effect.charges === undefined || effect.charges > 0));
  const turinPenalty = effects.find(effect => effect.kind === 'turinPenalty'
    && (effect.data as { appliesToRound?: number } | undefined)?.appliesToRound === round);
  if (turinPenalty) return turinPenalty.targetSide === 'player' ? 'guest' : turinPenalty.targetSide === 'bot' ? 'host' : null;
  const decisive = effects
    .filter(effect => ['absoluteDominance', 'forcedOutcome', 'starAdvantage'].includes(effect.kind))
    .filter(effect => !(effect.data as { appliesToRound?: number } | undefined)?.appliesToRound || (effect.data as { appliesToRound?: number }).appliesToRound === round)
    .sort((left, right) => right.priority - left.priority)[0];
  if (decisive) {
    if (decisive.kind === 'forcedOutcome' && (decisive.data as { outcome?: string } | undefined)?.outcome === 'draw') return null;
    return decisive.sourceSide === 'player' ? 'host' : 'guest';
  }

  const hostEffects = effects.filter(effect => effect.targetSide === 'player' || effect.targetSide === 'all');
  const guestEffects = effects.filter(effect => effect.targetSide === 'bot' || effect.targetSide === 'all');
  const predicted = determineRoundWinner(hostCard, guestCard, hostEffects, guestEffects, match.abilitiesEnabled).winner;
  return predicted === 'player' ? 'host' : predicted === 'bot' ? 'guest' : null;
}

function buildLanAbilityCardData(abilityType: import('@/lib/game/types').AbilityType, isActive = true) {
  const ability = ALL_ABILITIES.find(item => item.nameEn.replace(/\s+/g, '').toLowerCase() === abilityType.replace(/\s+/g, '').toLowerCase());
  const detail = ABILITY_DETAILS[abilityType];
  return {
    id: abilityType,
    nameEn: ability?.nameEn ?? detail?.nameEn ?? abilityType,
    nameAr: ability?.nameAr ?? detail?.nameAr ?? abilityType,
    description: ability?.description ?? detail?.effectAr ?? '',
    descriptionWarning: ability?.descriptionWarning,
    rarity: ability?.rarity ?? 'Common',
    icon: ability?.icon,
    isActive,
  };
}

/** ساحة Wi‑Fi تتبع ترتيب اللعب الفردي: الخصم في الأعلى، الأمر والنتيجة في الوسط، وكرت اللاعب في الأسفل. */
export default function LanBattleScreen() {
  const router = useRouter();
  const { state: connectionState, match, revealCurrentCard, useAbility, confirmNextRound, finishMatch, requestRematch, acceptRematch, leave } = useLanMultiplayer();
  const [isAbilitiesOpen, setIsAbilitiesOpen] = useState(false);
  const [isUsedAbilitiesOpen, setIsUsedAbilitiesOpen] = useState(false);
  const { showAbilityCard } = useAbilityActivationOverlay();
  const presentedAbilityRef = useRef<string | null>(null);
  const { cardWidth, cardHeight, arenaPadding, arenaGap, centerWidth, actionButtonWidth, actionButtonHeight, isCompact, isLandscape } = useBattleLayout();
  const isHost = match.role === 'host';
  const myName = isHost ? match.hostName : match.guestName;
  const opponentName = isHost ? match.guestName : match.hostName;
  const myScore = isHost ? match.hostScore : match.guestScore;
  const opponentScore = isHost ? match.guestScore : match.hostScore;
  const myCard = (isHost ? match.hostDeck : match.guestDeck)[match.currentRound];
  const opponentCard = (isHost ? match.guestDeck : match.hostDeck)[match.currentRound];
  const iRevealed = isHost ? match.hostRevealed : match.guestRevealed;
  const opponentRevealed = isHost ? match.guestRevealed : match.hostRevealed;
  const iNextReady = isHost ? match.hostNextReady : match.guestNextReady;
  const opponentNextReady = isHost ? match.guestNextReady : match.hostNextReady;
  const myAbilities = isHost ? match.hostAbilities : match.guestAbilities;
  const mySide: Side = isHost ? 'player' : 'bot';
  const opponentSide: Side = isHost ? 'bot' : 'player';
  const myEffectBadges = getActiveCardEffectBadges(match.activeEffects, mySide, match.currentRound);
  const opponentEffectBadges = getActiveCardEffectBadges(match.activeEffects, opponentSide, match.currentRound);
  const usedAbilities = useMemo(() => [
    ...match.hostAbilities.filter(ability => ability.used).map((ability, index) => ({
      id: `host-${ability.type}-${index}`,
      owner: match.hostName || 'المضيف',
      ownerColor: '#86efac',
      ability: buildLanAbilityCardData(ability.type, false),
    })),
    ...match.guestAbilities.filter(ability => ability.used).map((ability, index) => ({
      id: `guest-${ability.type}-${index}`,
      owner: match.guestName || 'الضيف',
      ownerColor: '#93c5fd',
      ability: buildLanAbilityCardData(ability.type, false),
    })),
  ], [match.hostAbilities, match.guestAbilities, match.hostName, match.guestName]);
  const result = match.lastResult;
  const gameOver = !!result && isLanGameOver(result, match.totalRounds);
  const iWonRound = result?.winner === (isHost ? 'host' : 'guest');
  const resultExplanation = result ? getRoundExplanation(result) : null;
  const resultComparison = result?.comparison;
  const audioWinner = getDynamicAudioWinner(match);
  const myCardAudio = shouldPlayRoundCardAudio(myCard, iRevealed || match.phase === 'result', audioWinner === (isHost ? 'host' : 'guest'));
  const opponentCardAudio = shouldPlayRoundCardAudio(opponentCard, opponentRevealed || match.phase === 'result', audioWinner === (isHost ? 'guest' : 'host'));

  useEffect(() => {
    if (match.phase === 'idle') router.replace('/screens/game-mode' as any);
  }, [match.phase, router]);

  useEffect(() => {
    if (match.phase === 'arranging') router.replace('/screens/card-selection' as any);
  }, [match.phase, router]);

  useEffect(() => {
    const used = match.lastAbilityUse;
    if (!used) {
      presentedAbilityRef.current = null;
      return;
    }
    const key = `${used.owner}-${used.abilityType}-${used.roundIndex}`;
    if (presentedAbilityRef.current === key) return;
    presentedAbilityRef.current = key;
    showAbilityCard({
      abilityType: used.abilityType,
      target: used.owner === 'host' ? 'player' : 'bot',
      duration: 15000,
    });
  }, [match.lastAbilityUse, showAbilityCard]);

  if (!match.role) return null;

  const exit = () => {
    leave();
    router.replace('/screens/game-mode' as any);
  };

  if (match.phase === 'finished') {
    const finalWinner = match.hostScore === match.guestScore ? 'draw' : match.hostScore > match.guestScore ? 'host' : 'guest';
    const iWon = finalWinner === (isHost ? 'host' : 'guest');
    const canRequestRematch = isHost && !match.rematchRequested && connectionState === 'connected';
    const canAcceptRematch = !isHost && match.rematchRequested && connectionState === 'connected';
    return <View style={styles.root}><StatusBar hidden /><LuxuryBackground />
      <View style={styles.finalBox}>
        <Text style={styles.finalIcon}>{finalWinner === 'draw' ? '🤝' : iWon ? '🏆' : '🛡️'}</Text>
        <Text style={[styles.finalTitle, { color: finalWinner === 'draw' ? '#facc15' : iWon ? '#86efac' : '#fca5a5' }]}>{finalWinner === 'draw' ? 'تعادل!' : iWon ? 'فزت بالمباراة!' : 'فاز الخصم'}</Text>
        <Text style={styles.finalScore}>{myName} {myScore} — {opponentScore} {opponentName}</Text>
        <Text style={styles.finalHint}>تمت مزامنة النتيجة عبر الشبكة المحلية.</Text>
        <View style={styles.finalActions}>
          {isHost ? (
            <TouchableOpacity disabled={!canRequestRematch} style={[styles.actionButton, styles.rematchButton, !canRequestRematch && styles.disabledButton]} onPress={requestRematch}>
              <Text style={styles.actionText}>{match.rematchRequested ? 'بانتظار موافقة الخصم…' : '↻ العب مجدداً'}</Text>
            </TouchableOpacity>
          ) : match.rematchRequested ? (
            <TouchableOpacity disabled={!canAcceptRematch} style={[styles.actionButton, styles.rematchButton, !canAcceptRematch && styles.disabledButton]} onPress={acceptRematch}>
              <Text style={styles.actionText}>✓ قبول إعادة المباراة</Text>
            </TouchableOpacity>
          ) : <Text style={styles.rematchHint}>بانتظار المضيف لطلب إعادة المباراة.</Text>}
          <TouchableOpacity style={[styles.actionButton, styles.homeButton]} onPress={exit}><Text style={styles.actionText}>العودة لأنماط اللعب</Text></TouchableOpacity>
        </View>
      </View>
    </View>;
  }

  const action = () => {
    if (match.phase === 'playing') revealCurrentCard();
    else if (match.phase === 'result' && result) {
      if (gameOver) finishMatch();
      else confirmNextRound();
    }
  };

  const canAct = match.phase === 'playing'
    ? !iRevealed
    : match.phase === 'result' && (gameOver ? isHost : !iNextReady);
  const actionLabel = match.phase === 'playing'
    ? iRevealed ? 'تم التأكيد — انتظار الخصم' : '⚔️ تأكيد المواجهة'
    : gameOver ? 'إظهار النتيجة النهائية'
    : iNextReady ? 'تم التأكيد — انتظار الخصم' : '▶ جاهز للجولة التالية';
  const roundLabel = result
    ? (result.winner === 'draw' ? '🤝 تعادل الجولة' : iWonRound ? '🏆 فزت بالجولة' : '🏆 فاز الخصم بالجولة')
    : iRevealed && !opponentRevealed ? 'تم تأكيد كرتك — انتظار الخصم'
    : opponentRevealed && !iRevealed ? 'الخصم جاهز — أكد المواجهة'
    : 'أكد كرتك لبدء المواجهة';
  const nextHint = match.phase === 'result' && !gameOver
    ? iNextReady && opponentNextReady ? 'يتم فتح الجولة التالية…' : iNextReady ? 'بانتظار تأكيد الخصم للجولة التالية' : opponentNextReady ? 'الخصم جاهز — اضغط للمتابعة' : 'يجب أن يؤكد الطرفان للانتقال'
    : null;

  return <View style={styles.root}>
    <StatusBar hidden />
    <View style={styles.background}><LuxuryBackground /></View>
    <AbilityActivationOverlay />
    <View style={styles.hud}>
      <View style={styles.hudSide}><Text style={styles.myScore}>{myScore}</Text><Text style={styles.myName}>{myName || 'أنت'}</Text></View>
      <View style={styles.hudCenter}>
        <Text style={styles.lanBadge}>📡 Wi‑Fi محلي</Text>
        <Text style={styles.round}>الجولة {Math.min(match.currentRound + 1, match.totalRounds)} / {match.totalRounds}</Text>
        <TouchableOpacity style={styles.abilityHistoryButton} onPress={() => setIsUsedAbilitiesOpen(true)} activeOpacity={0.75}>
          <Text style={styles.abilityHistoryButtonText}>⚡ سجل القدرات</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.hudSide, styles.hudSideRight]}><Text style={styles.opponentScore}>{opponentScore}</Text><Text style={styles.opponentName}>{opponentName || 'الخصم'}</Text></View>
    </View>

    <View style={[styles.arena, { flexDirection: isLandscape ? 'row' : 'column-reverse', paddingHorizontal: arenaPadding, gap: arenaGap }]}>
      <View style={[styles.cardPanel, !isLandscape && styles.cardPanelPortrait]}>
        <Text style={styles.myName}>{myName || 'أنت'}</Text>
        {myEffectBadges.length > 0 && <View style={styles.effectBadgeList}>{myEffectBadges.map(effect => <View key={effect.id} style={[styles.effectBadge, effect.tone === 'buff' ? styles.effectBadgeBuff : effect.tone === 'debuff' ? styles.effectBadgeDebuff : styles.effectBadgeUtility]}><Text style={styles.effectBadgeText}>{effect.label}</Text></View>)}</View>}
        {myCard ? <LuxuryCharacterCardAnimated card={myCard} style={{ width: cardWidth, height: cardHeight }} isOpenedView={iRevealed || match.phase === 'result'} playAudio={myCardAudio} winnerState={result?.winner === (isHost ? 'host' : 'guest') ? 'winner' : null} /> : <View style={[styles.hiddenCard, { width: cardWidth, height: cardHeight }]}><Text style={styles.hiddenMark}>?</Text></View>}
      </View>

      <View style={[styles.centerPanel, { width: isLandscape ? centerWidth : undefined, minHeight: isLandscape ? undefined : 94, gap: Math.max(6, arenaGap) }]}>
        <Text style={[styles.vs, { fontSize: isCompact ? 20 : 28 }]}>⚔️</Text>
        <Text style={[styles.status, result && (iWonRound ? styles.statusWin : result.winner === 'draw' ? styles.statusDraw : styles.statusLoss)]}>{roundLabel}</Text>
        {resultExplanation && <View style={styles.resultExplanation}>
          <Text style={styles.resultExplanationTitle}>📋 معاينة النتيجة — كيف حُسمت الجولة؟</Text>
          <Text style={styles.resultExplanationText}>{resultExplanation}</Text>
          {resultComparison && <View style={styles.resultMetrics}>
            <Text style={styles.resultMetricText}>⚔️ الضرر بعد الدفاع: {result.hostCard.name} {resultComparison.hostDamage} — {resultComparison.guestDamage} {result.guestCard.name}</Text>
            <Text style={styles.resultMetricText}>📈 القوة قبل الدفاع: {resultComparison.hostBaseDamage} — {resultComparison.guestBaseDamage}</Text>
            <Text style={styles.resultMetricText}>👥 الفصائل: {getFactionLabel(resultComparison.hostFactionAdvantage)} — {getFactionLabel(resultComparison.guestFactionAdvantage)}</Text>
            {(resultComparison.hostHealthDelta > 0 || resultComparison.guestHealthDelta > 0) && <Text style={styles.resultMetricText}>💚 علاج/استعادة: +{resultComparison.hostHealthDelta} — +{resultComparison.guestHealthDelta}</Text>}
          </View>}
        </View>}
        {nextHint && <Text style={styles.nextHint}>{nextHint}</Text>}
        {match.phase === 'playing' && match.abilitiesEnabled && (
          <TouchableOpacity
            disabled={iRevealed || myAbilities.every(ability => ability.used)}
            style={[styles.abilityButton, (iRevealed || myAbilities.every(ability => ability.used)) && styles.disabledButton]}
            onPress={() => setIsAbilitiesOpen(true)}
          >
            <Text style={styles.abilityButtonText}>✨ قدراتي {myAbilities.filter(ability => !ability.used).length}/{myAbilities.length}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity disabled={!canAct} style={[styles.actionButton, { width: actionButtonWidth, minHeight: actionButtonHeight }, !canAct && styles.disabledButton, match.phase === 'result' && styles.nextButton]} onPress={action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
        {match.phase === 'result' && gameOver && !isHost && <Text style={styles.hostControls}>المضيف يعرض النتيجة النهائية</Text>}
      </View>

      <View style={[styles.cardPanel, !isLandscape && styles.cardPanelPortrait]}>
        <Text style={styles.opponentName}>{opponentName || 'الخصم'}</Text>
        {opponentEffectBadges.length > 0 && <View style={styles.effectBadgeList}>{opponentEffectBadges.map(effect => <View key={effect.id} style={[styles.effectBadge, effect.tone === 'buff' ? styles.effectBadgeBuff : effect.tone === 'debuff' ? styles.effectBadgeDebuff : styles.effectBadgeUtility]}><Text style={styles.effectBadgeText}>{effect.label}</Text></View>)}</View>}
        {opponentCard ? <LuxuryCharacterCardAnimated card={opponentCard} style={{ width: cardWidth, height: cardHeight }} isOpenedView={opponentRevealed || match.phase === 'result'} playAudio={opponentCardAudio} winnerState={result?.winner === (isHost ? 'guest' : 'host') ? 'winner' : null} /> : <View style={[styles.hiddenCard, { width: cardWidth, height: cardHeight }]}><Text style={styles.hiddenMark}>?</Text></View>}
      </View>
    </View>
    <Modal visible={isAbilitiesOpen} transparent animationType="fade" onRequestClose={() => setIsAbilitiesOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.abilitiesModal}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>✨ قدرات {myName || 'اللاعب'}</Text><TouchableOpacity onPress={() => setIsAbilitiesOpen(false)}><Text style={styles.closeText}>إغلاق</Text></TouchableOpacity></View>
          <Text style={styles.modalHint}>اختر قدرة واحدة قبل تأكيد المواجهة. تستخدم كل قدرة مرة واحدة وتُزامن للطرفين.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abilityList}>
            {myAbilities.map((ability, index) => {
              return <TouchableOpacity
                key={`${ability.type}-${index}`}
                disabled={ability.used || iRevealed}
                style={(ability.used || iRevealed) && styles.abilityCardUsed}
                onPress={() => { useAbility(ability.type); setIsAbilitiesOpen(false); }}
              >
                <AbilityCard ability={buildLanAbilityCardData(ability.type, !ability.used)} showActionButtons={false} style={styles.fullAbilityCard} />
              </TouchableOpacity>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal visible={isUsedAbilitiesOpen} transparent animationType="fade" onRequestClose={() => setIsUsedAbilitiesOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.abilitiesModal}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>⚡ كروت القدرات المستخدمة</Text><TouchableOpacity onPress={() => setIsUsedAbilitiesOpen(false)}><Text style={styles.closeText}>إغلاق</Text></TouchableOpacity></View>
          {usedAbilities.length === 0 ? <Text style={styles.emptyHistory}>لا توجد كروت قدرات مستخدمة بعد</Text> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abilityList}>
              {usedAbilities.map(entry => <View key={entry.id} style={styles.usedAbilityEntry}>
                <Text style={[styles.usedAbilityOwner, { color: entry.ownerColor }]}>استعملها {entry.owner}</Text>
                <AbilityCard ability={entry.ability} showActionButtons={false} style={styles.historyAbilityCard} />
              </View>)}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
    {connectionState !== 'connected' && <View style={styles.disconnectBar}><Text style={styles.disconnectText}>انقطع الاتصال المحلي. ارجع وأنشئ الغرفة من جديد.</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.bgDeep }, background: { ...StyleSheet.absoluteFillObject, opacity: 0.96 },
  hud: { minHeight: 66, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(8,6,18,0.88)', borderBottomWidth: 1, borderBottomColor: 'rgba(167,139,250,0.35)' },
  hudSide: { flex: 1, gap: 2 }, hudSideRight: { alignItems: 'flex-end' }, hudCenter: { alignItems: 'center', gap: 2 }, lanBadge: { color: '#c4b5fd', fontSize: FONT.xs, fontWeight: '900' }, round: { color: '#e5e7eb', fontSize: FONT.sm, fontWeight: '800' }, abilityHistoryButton: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(232,121,249,0.12)', borderWidth: 1, borderColor: 'rgba(232,121,249,0.42)' }, abilityHistoryButtonText: { color: '#f5d0fe', fontSize: 9, fontWeight: '900' }, myScore: { color: '#86efac', fontSize: FONT.xxl, fontWeight: '900' }, opponentScore: { color: '#fca5a5', fontSize: FONT.xxl, fontWeight: '900' }, myName: { color: '#86efac', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' }, opponentName: { color: '#fca5a5', fontSize: FONT.sm, fontWeight: '800', textAlign: 'left' },
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.sm }, cardPanel: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, minHeight: 0 }, cardPanelPortrait: { flex: 0, width: '100%' }, centerPanel: { alignItems: 'center', justifyContent: 'center' }, vs: { color: COLOR.gold }, status: { color: '#cbd5e1', fontSize: FONT.xs, textAlign: 'center', maxWidth: 220, lineHeight: 18 }, statusWin: { color: '#86efac' }, statusDraw: { color: '#facc15' }, statusLoss: { color: '#fca5a5' }, nextHint: { color: '#c4b5fd', fontSize: 10, textAlign: 'center', maxWidth: 220, lineHeight: 15 },
  hiddenCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.82)', borderRadius: RADIUS.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(167,139,250,0.55)' }, hiddenMark: { color: '#a78bfa', fontSize: 48, fontWeight: '900' },
  effectBadgeList: { alignItems: 'center', gap: 4, maxWidth: 250 }, effectBadge: { borderRadius: RADIUS.pill, borderWidth: 1, paddingHorizontal: SPACE.sm, paddingVertical: 3 }, effectBadgeBuff: { borderColor: 'rgba(74,222,128,0.85)', backgroundColor: 'rgba(20,83,45,0.72)' }, effectBadgeDebuff: { borderColor: 'rgba(248,113,113,0.88)', backgroundColor: 'rgba(127,29,29,0.7)' }, effectBadgeUtility: { borderColor: 'rgba(96,165,250,0.88)', backgroundColor: 'rgba(30,58,138,0.68)' }, effectBadgeText: { color: '#f8fafc', fontSize: 10, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' }, abilityUsedBanner: { width: '100%', maxWidth: 280, borderWidth: 1, borderRadius: RADIUS.md, backgroundColor: 'rgba(15,23,42,0.94)', paddingHorizontal: SPACE.sm, paddingVertical: 6, gap: 2 }, abilityUsedTitle: { fontSize: 10, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' }, abilityUsedDescription: { color: '#e2e8f0', fontSize: 9, lineHeight: 14, textAlign: 'right', writingDirection: 'rtl' },
  actionButton: { borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,222,128,0.14)', borderWidth: 1.5, borderColor: '#4ade80', paddingHorizontal: SPACE.md }, abilityButton: { minHeight: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.14)', borderWidth: 1, borderColor: '#a78bfa', paddingHorizontal: SPACE.md }, abilityButtonText: { color: '#ddd6fe', fontSize: 10, fontWeight: '900' }, nextButton: { backgroundColor: 'rgba(96,165,250,0.14)', borderColor: '#60a5fa' }, disabledButton: { backgroundColor: 'rgba(71,85,105,0.28)', borderColor: '#475569' }, actionText: { color: '#f8fafc', fontSize: FONT.xs, fontWeight: '900', textAlign: 'center' }, hostControls: { color: '#94a3b8', fontSize: 10, textAlign: 'center' }, resultExplanation: { width: '100%', maxWidth: 270, backgroundColor: 'rgba(15,23,42,0.9)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.5)', borderRadius: RADIUS.md, padding: SPACE.sm, gap: 3 }, resultExplanationTitle: { color: '#fde68a', fontSize: 10, fontWeight: '900', textAlign: 'right' }, resultExplanationText: { color: '#e2e8f0', fontSize: 10, lineHeight: 15, textAlign: 'right' }, resultMetrics: { borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.25)', paddingTop: 5, gap: 2 }, resultMetricText: { color: '#cbd5e1', fontSize: 9, lineHeight: 14, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.84)', justifyContent: 'center', padding: SPACE.lg }, abilitiesModal: { maxHeight: '78%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(167,139,250,0.65)', borderRadius: RADIUS.lg, padding: SPACE.md, gap: SPACE.sm }, modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: '#f8fafc', fontWeight: '900', fontSize: FONT.md }, closeText: { color: '#c4b5fd', fontWeight: '800', fontSize: FONT.xs }, modalHint: { color: '#cbd5e1', fontSize: 11, lineHeight: 17, textAlign: 'right' }, abilityList: { flexDirection: 'row', gap: SPACE.sm, paddingHorizontal: 4, paddingVertical: 8, alignItems: 'center' }, abilityCardUsed: { opacity: 0.45 }, fullAbilityCard: { width: 176, height: 264 }, historyAbilityCard: { width: 142, height: 213 }, usedAbilityEntry: { alignItems: 'center', gap: 5 }, usedAbilityOwner: { fontSize: 10, fontWeight: '900' }, emptyHistory: { color: '#cbd5e1', fontSize: 12, textAlign: 'center', paddingVertical: SPACE.xl },
  disconnectBar: { paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, backgroundColor: 'rgba(127,29,29,0.92)', alignItems: 'center' }, disconnectText: { color: '#fecaca', fontSize: FONT.xs, textAlign: 'center' },
  finalBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xl, gap: SPACE.md }, finalIcon: { fontSize: 68 }, finalTitle: { fontSize: FONT.xxl, fontWeight: '900', textAlign: 'center' }, finalScore: { color: '#e2e8f0', fontSize: FONT.md, textAlign: 'center', lineHeight: 26 }, finalHint: { color: '#c4b5fd', fontSize: FONT.xs, textAlign: 'center' }, finalActions: { width: '100%', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md }, rematchButton: { width: 250, minHeight: 48, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.16)' }, rematchHint: { color: '#94a3b8', fontSize: FONT.xs, textAlign: 'center' }, homeButton: { width: 250, minHeight: 48, borderColor: COLOR.gold, backgroundColor: 'rgba(228,165,42,0.16)' },
});
