/**
 * EffectToast
 * ────────────
 * إشعار لحظي يطلع وسط الشاشة عند تفعيل تأثير جديد.
 * الاستخدام:
 *   const { showToast } = useEffectToast();
 *   showToast({ title: 'تعزيز الدفاع +1', target: 'player', kind: 'buff' });
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence,
  runOnJS,
} from 'react-native-reanimated';

export type ToastKind = 'buff' | 'debuff' | 'seal' | 'info' | 'win' | 'loss' | 'draw';

export interface ToastPayload {
  /** Main line e.g. "تعزيز الهجوم +2" */
  title: string;
  /** Secondary line, optional */
  subtitle?: string;
  /** Which side benefits/is affected */
  target?: 'player' | 'bot' | 'all';
  kind: ToastKind;
  /** Auto-dismiss after ms, default 2200 */
  duration?: number;
}

const KIND_META: Record<ToastKind, { emoji: string; color: string; bg: string }> = {
  buff: { emoji: '⬆️', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  debuff: { emoji: '⬇️', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  seal: { emoji: '🔒', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  info: { emoji: 'ℹ️', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  win: { emoji: '🏆', color: '#4ade80', bg: 'rgba(74,222,128,0.14)' },
  loss: { emoji: '💀', color: '#f87171', bg: 'rgba(248,113,113,0.14)' },
  draw: { emoji: '🤝', color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
};

const TARGET_LABEL: Record<string, string> = {
  player: '👤 لاعب',
  bot: '🤖 بوت',
  all: '🔄 الكل',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
const listeners: Array<(p: ToastPayload) => void> = [];

export function useEffectToast() {
  const showToast = useCallback((payload: ToastPayload) => {
    listeners.forEach(fn => fn(payload));
  }, []);
  return { showToast };
}

// ─── Component ───────────────────────────────────────────────────────────
export function EffectToast() {
  const [current, setCurrent] = React.useState<(ToastPayload & { id: number }) | null>(null);
  const counter = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-24);
  const scale = useSharedValue(0.88);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 280 });
    translateY.value = withTiming(-20, { duration: 280 });
    scale.value = withTiming(0.9, { duration: 280 });
    setTimeout(() => setCurrent(null), 300);
  }, []);

  const show = useCallback((payload: ToastPayload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // reset instantly
    opacity.value = 0;
    translateY.value = -28;
    scale.value = 0.85;
    setCurrent({ ...payload, id: ++counter.current });
    // animate in
    opacity.value = withDelay(60, withSpring(1, { damping: 14 }));
    translateY.value = withDelay(60, withSpring(0, { damping: 12 }));
    scale.value = withDelay(60, withSpring(1, { damping: 12 }));
    timerRef.current = setTimeout(dismiss, payload.duration ?? 2200);
  }, [dismiss]);

  useEffect(() => {
    listeners.push(show);
    return () => {
      const idx = listeners.indexOf(show);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [show]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!current) return null;

  const meta = KIND_META[current.kind];
  const targetLabel = current.target ? TARGET_LABEL[current.target] : null;

  return (
    <Animated.View style={[T.wrap, { borderColor: meta.color + '44', backgroundColor: meta.bg }, containerStyle]} pointerEvents="none">
      <View style={T.row}>
        <Text style={T.emoji}>{meta.emoji}</Text>
        <View style={T.textWrap}>
          <Text style={[T.title, { color: meta.color }]}>{current.title}</Text>
          {(current.subtitle || targetLabel) && (
            <Text style={T.sub}>
              {[targetLabel, current.subtitle].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
      </View>
      {/* progress bar */}
      <View style={T.progressTrack}>
        <Animated.View style={[T.progressFill, { backgroundColor: meta.color }]} />
      </View>
    </Animated.View>
  );
}

const T = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    left: '20%',
    right: '20%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 999,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: { fontSize: 22 },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 15, letterSpacing: 0.3 },
  sub: { fontSize: 11, color: '#94a3b8' },
  progressTrack: {
    marginTop: 8,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
    opacity: 0.6,
  },
});
