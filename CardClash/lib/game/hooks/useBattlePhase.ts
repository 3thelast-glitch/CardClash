import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Card, RoundResult } from '@/lib/game/types';

export type BattlePhase = 'showing' | 'fighting' | 'result' | 'waiting';

interface UseBattlePhaseProps {
  currentPlayerCard: Card | null;
  currentBotCard: Card | null;
  currentRound: number;
  lastRoundResult: RoundResult | null;
  playRound: () => void;
  onPhaseShowing: () => void;  // callback: reset animations
  onPhaseFighting: () => void; // callback: show effects
  onFightDone: () => void;     // callback: hide effects
}

export interface UseBattlePhaseReturn {
  phase: BattlePhase;
  setPhase: (p: BattlePhase) => void;
  showResult: boolean;
  showPlayerEffect: boolean;
  showBotEffect: boolean;
}

export function useBattlePhase({
  currentPlayerCard,
  currentBotCard,
  currentRound,
  lastRoundResult,
  playRound,
  onPhaseShowing,
  onPhaseFighting,
  onFightDone,
}: UseBattlePhaseProps): UseBattlePhaseReturn {
  const [phase, setPhase] = useState<BattlePhase>('showing');
  const [showResult, setShowResult] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);

  // Phase: showing → تظهر البطاقات
  useEffect(() => {
    if (currentPlayerCard && currentBotCard && phase === 'showing') {
      setShowResult(false);
      setShowPlayerEffect(false);
      setShowBotEffect(false);
      onPhaseShowing();
      setTimeout(() => setPhase('fighting'), 800);
    }
  }, [currentPlayerCard, currentBotCard, phase, currentRound]);

  // Phase: fighting → تشغيل الجولة
  useEffect(() => {
    if (phase === 'fighting') {
      setShowPlayerEffect(true);
      setShowBotEffect(true);
      onPhaseFighting();
      setTimeout(() => {
        playRound();
        setPhase('result');
        setShowPlayerEffect(false);
        setShowBotEffect(false);
        onFightDone();
      }, 700);
    }
  }, [phase]);

  // Phase: result → عرض النتيجة
  useEffect(() => {
    if (phase === 'result' && lastRoundResult) {
      setShowResult(true);
      if (Platform.OS !== 'web') {
        if (lastRoundResult.winner === 'player') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (lastRoundResult.winner === 'bot') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
      setPhase('waiting');
    }
  }, [phase, lastRoundResult]);

  return { phase, setPhase, showResult, showPlayerEffect, showBotEffect };
}
