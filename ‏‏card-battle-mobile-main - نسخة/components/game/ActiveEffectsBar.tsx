/**
 * ActiveEffectsBar
 * ────────────────
 * شريط أيقونات صغيرة أسفل بطاقة كل لاعب يعرض التأثيرات الجارية عليه.
 * كل أيقونة تظهر عند الضغط تفاصيل التأثير (Tooltip خفيف).
 *
 * Props:
 *   effects      — Effect[] (activeEffects from GameState)
 *   side         — 'player' | 'bot'
 *   currentRound
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import type { Effect, EffectKind } from '@/lib/game/types';

// ─── KIND_INFO — جميع EffectKind موجودة ────────────────────────────────────
const KIND_INFO: Record<EffectKind, { label: string; emoji: string; color: string }> = {
  // ─ موجودة مسبقاً ─
  prediction: { label: 'توقع', emoji: '\u{1F52E}', color: '#a78bfa' },
  protection: { label: 'حماية', emoji: '\u{1F6E1}\ufe0f', color: '#60a5fa' },
  fortify: { label: 'تحصين دفاع', emoji: '\u26e3\ufe0f', color: '#4ade80' },
  statModifier: { label: 'تعديل إحصاء', emoji: '\u2696\ufe0f', color: '#fbbf24' },
  halvePoints: { label: 'تنصيف الإحصاء', emoji: '\u2702\ufe0f', color: '#f87171' },
  silenceAbilities: { label: 'ختم القدرات', emoji: '\u{1F512}', color: '#ef4444' },
  doubleOrNothing: { label: 'ضاعف أو لا شيء', emoji: '\u2699\ufe0f', color: '#f59e0b' },
  forcedOutcome: { label: 'نتيجة مضمونة', emoji: '\u{1F3AF}', color: '#34d399' },
  starAdvantage: { label: 'أفضلية النجوم', emoji: '\u2b50', color: '#fbbf24' },
  sacrifice: { label: 'تضحية', emoji: '\u{1F525}', color: '#f87171' },

  // ─ مضافة — كانت ناقصة ─
  greedBuff: { label: 'دفعة الجشع', emoji: '\u{1FA99}', color: '#f59e0b' },
  lifesteal: { label: 'سرقة الحياة', emoji: '\u{1F9DB}', color: '#a855f7' },
  revengeBuff: { label: 'دفعة الانتقام', emoji: '\u{1F5E1}\ufe0f', color: '#ef4444' },
  suicidePact: { label: 'عهد الانتحار', emoji: '\u{1F4A3}', color: '#dc2626' },
  compensationBuff: { label: 'دفعة التعويض', emoji: '\u{1F4B0}', color: '#4ade80' },
  weakeningDebuff: { label: 'إضعاف الخصم', emoji: '\u{1F4C9}', color: '#94a3b8' },
  explosionDebuff: { label: 'دبف الانفجار', emoji: '\u{1F4A5}', color: '#fb923c' },
  consecutiveLoss: { label: 'خسائر متتالية', emoji: '\u{1F4AB}', color: '#6366f1' },
  shieldGuard: { label: 'درع وقاية', emoji: '\u{1F6E1}', color: '#38bdf8' },
  trap: { label: 'فخ', emoji: '\u26a0\ufe0f', color: '#dc2626' },
  convertDebuffs: { label: 'تحويل الدبفات', emoji: '\u{1F504}', color: '#a3e635' },
  doubleBuffs: { label: 'مضاعفة البافات', emoji: '\u{1F4AA}', color: '#fbbf24' },
  conversion: { label: 'تحويل نقاط', emoji: '\u{1F501}', color: '#818cf8' },
  takeIt: { label: 'خذ البطاقة', emoji: '\u{1F9F2}', color: '#f472b6' },
  deprivation: { label: 'حرمان', emoji: '\u274c', color: '#f87171' },
  pool: { label: 'تجميع النقاط', emoji: '\u{1F3B1}', color: '#06b6d4' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function effectAppliesToSide(effect: Effect, side: 'player' | 'bot'): boolean {
  return effect.targetSide === side || effect.targetSide === 'all';
}

function isEffectActiveNow(effect: Effect, currentRound: number): boolean {
  if (effect.createdAtRound > currentRound) return false;
  if (effect.expiresAtRound !== undefined && currentRound > effect.expiresAtRound) return false;
  if (effect.charges !== undefined && effect.charges <= 0) return false;
  return true;
}

function roundsLeft(effect: Effect, currentRound: number): number | null {
  if (effect.expiresAtRound === undefined) return null;
  return Math.max(0, effect.expiresAtRound - currentRound + 1);
}

function statModifierSummary(effect: Effect): string {
  const d = effect.data as { stat?: string; amount?: number; multiplier?: number; stats?: string[] } | undefined;
  if (!d) return '';
  if (d.stat && d.amount !== undefined) {
    const statAr: Record<string, string> = { attack: 'هجوم', defense: 'دفاع', hp: 'صحة', all: 'كل' };
    const sign = d.amount >= 0 ? '+' : '';
    return `${statAr[d.stat] ?? d.stat} ${sign}${d.amount}`;
  }
  if (d.multiplier !== undefined && d.stats) {
    const statAr: Record<string, string> = { attack: 'هجوم', defense: 'دفاع' };
    return `${d.stats.map((s: string) => statAr[s] ?? s).join(' + ')} ×${d.multiplier}`;
  }
  return '';
}

function effectDetail(effect: Effect): string {
  const base = KIND_INFO[effect.kind]?.label ?? effect.kind;
  if (effect.kind === 'statModifier' || effect.kind === 'halvePoints') {
    const summary = statModifierSummary(effect);
    return summary ? `${base}: ${summary}` : base;
  }
  if (effect.kind === 'prediction') {
    const data = effect.data as { predictions?: Record<number, string> } | undefined;
    const rounds = Object.keys(data?.predictions ?? {}).join(', ');
    return rounds ? `${base} (جولة ${rounds})` : base;
  }
  if (effect.kind === 'forcedOutcome') {
    const data = effect.data as { appliesToRound?: number } | undefined;
    return data?.appliesToRound ? `${base} → ج${data.appliesToRound}` : base;
  }
  return base;
}

// ─── EffectPill ──────────────────────────────────────────────────────────────────

function EffectPill({ effect, currentRound }: { effect: Effect; currentRound: number }) {
  const [showTip, setShowTip] = useState(false);
  const info = KIND_INFO[effect.kind] ?? { label: effect.kind, emoji: '\u2753', color: '#94a3b8' };
  const left = roundsLeft(effect, currentRound);
  const tip = effectDetail(effect);

  const tipOp = useSharedValue(0);
  const tipStyle = useAnimatedStyle(() => ({
    opacity: tipOp.value,
    transform: [{ scale: tipOp.value * 0.15 + 0.85 }],
  }));

  const toggle = () => {
    const next = !showTip;
    setShowTip(next);
    tipOp.value = withSpring(next ? 1 : 0, { damping: 14 });
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.75}
        style={[A.pill, { borderColor: info.color + '50', backgroundColor: info.color + '14' }]}
      >
        <Text style={A.pillEmoji}>{info.emoji}</Text>
        {left !== null && (
          <View style={[A.badge, { backgroundColor: info.color }]}>
            <Text style={A.badgeText}>{left}</Text>
          </View>
        )}
      </TouchableOpacity>

      {showTip && (
        <Animated.View style={[A.tooltip, { borderColor: info.color + '40' }, tipStyle]}>
          <Text style={[A.tooltipTitle, { color: info.color }]}>{info.emoji} {info.label}</Text>
          {tip !== info.label && <Text style={A.tooltipSub}>{tip}</Text>}
          {left !== null && (
            <Text style={A.tooltipSub}>ينتهي بعد {left} جولة</Text>
          )}
          {effect.sourceSide && (
            <Text style={A.tooltipSub}>مصدر: {effect.sourceSide === 'player' ? '\u{1F464} لاعب' : '\u{1F916} بوت'}</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────────

export function ActiveEffectsBar({
  effects,
  side,
  currentRound,
}: {
  effects: Effect[];
  side: 'player' | 'bot';
  currentRound: number;
}) {
  const relevant = effects.filter(
    e => effectAppliesToSide(e, side) && isEffectActiveNow(e, currentRound)
  );

  if (relevant.length === 0) return null;

  return (
    <View style={A.bar}>
      {relevant.map(effect => (
        <EffectPill key={effect.id} effect={effect} currentRound={currentRound} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────────

const A = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 28,
  },
  pill: {
    width: 30, height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pillEmoji: { fontSize: 14, lineHeight: 16 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  tooltip: {
    position: 'absolute',
    bottom: 36,
    left: -50,
    width: 130,
    backgroundColor: 'rgba(10,8,20,0.97)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 3,
    zIndex: 200,
  },
  tooltipTitle: { fontSize: 11, letterSpacing: 0.3 },
  tooltipSub: { color: '#94a3b8', fontSize: 9 },
});