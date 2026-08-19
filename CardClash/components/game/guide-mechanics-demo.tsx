import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useSettings } from '@/lib/game/hooks/useSettings';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';

type LessonId = 'damage' | 'factions' | 'shield';

const LESSONS: { id: LessonId; icon: string; label: string; caption: string }[] = [
  { id: 'damage', icon: '⚔️', label: 'حساب الضرر', caption: 'كيف يتحول الهجوم والدفاع إلى ضرر فعلي؟' },
  { id: 'factions', icon: '🔁', label: 'الفصائل', caption: 'كيف تمنح أفضلية الفصيلة قوة إضافية؟' },
  { id: 'shield', icon: '🛡️', label: 'الدرع', caption: 'كيف تحميك القدرة من ضربة حاسمة؟' },
];

function Stage({ progress, start, end, children }: { progress: SharedValue<number>; start: number; end: number; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [Math.max(0, start - 0.12), start, end], [0, 1, 1]),
    transform: [{ translateY: interpolate(progress.value, [Math.max(0, start - 0.12), start, end], [9, 0, 0]) }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function DamageDemo({ progress }: { progress: SharedValue<number> }) {
  return (
    <View style={s.demoBody}>
      <Stage progress={progress} start={0.06} end={1}>
        <View style={s.cardsRow}>
          <View style={[s.miniCard, s.fireCard]}><Text style={s.miniEmoji}>👤</Text><Text style={s.miniLabel}>هجوم 18</Text></View>
          <Text style={s.vsText}>ضد</Text>
          <View style={[s.miniCard, s.earthCard]}><Text style={s.miniEmoji}>🧝</Text><Text style={s.miniLabel}>دفاع 8</Text></View>
        </View>
      </Stage>
      <Stage progress={progress} start={0.32} end={1}>
        <View style={s.calculationRow}><Text style={s.calculation}>18</Text><Text style={s.operation}>×</Text><Text style={[s.calculation, { color: '#fcd34d' }]}>1.25</Text><Text style={s.operation}>−</Text><Text style={s.calculation}>8</Text></View>
        <Text style={s.explainText}>البشر متفوقون على الألف، لذلك يُطبّق معامل 1.25.</Text>
      </Stage>
      <Stage progress={progress} start={0.66} end={1}>
        <View style={s.resultPill}><Text style={s.resultIcon}>💥</Text><Text style={s.resultText}>الضرر النهائي: 14</Text></View>
      </Stage>
    </View>
  );
}

function FactionsDemo({ progress }: { progress: SharedValue<number> }) {
  return (
    <View style={s.demoBody}>
      <Stage progress={progress} start={0.06} end={1}>
        <View style={s.cardsRow}>
          <View style={[s.miniCard, s.waterCard]}><Text style={s.miniEmoji}>🐉</Text><Text style={s.miniLabel}>تنين</Text></View>
          <Text style={s.arrowText}>→</Text>
          <View style={[s.miniCard, s.fireCard]}><Text style={s.miniEmoji}>😈</Text><Text style={s.miniLabel}>شيطان</Text></View>
        </View>
      </Stage>
      <Stage progress={progress} start={0.36} end={1}>
        <View style={s.bonusPill}><Text style={s.bonusText}>أفضلية الفصيلة: +25% هجوم</Text></View>
      </Stage>
      <Stage progress={progress} start={0.68} end={1}>
        <Text style={s.explainText}>لا تفترض القوة من الرتبة فقط؛ راقب فصيلة الخصم قبل الهجوم.</Text>
      </Stage>
    </View>
  );
}

function ShieldDemo({ progress }: { progress: SharedValue<number> }) {
  return (
    <View style={s.demoBody}>
      <Stage progress={progress} start={0.06} end={1}>
        <View style={s.cardsRow}>
          <View style={[s.miniCard, s.fireCard]}><Text style={s.miniEmoji}>⚔️</Text><Text style={s.miniLabel}>هجمة الخصم</Text></View>
          <Text style={s.arrowText}>→</Text>
          <View style={[s.miniCard, s.shieldCard]}><Text style={s.miniEmoji}>🛡️</Text><Text style={s.miniLabel}>درع نشط</Text></View>
        </View>
      </Stage>
      <Stage progress={progress} start={0.38} end={1}>
        <View style={s.blockPill}><Text style={s.blockText}>تم صدّ التأثير السلبي</Text></View>
      </Stage>
      <Stage progress={progress} start={0.7} end={1}>
        <Text style={s.explainText}>القدرات قد تمنع ضرراً أو تعدّل الإحصاءات؛ استخدمها قبل أن تحتاج إلى إنقاذ الجولة.</Text>
      </Stage>
    </View>
  );
}

export function GuideMechanicsDemo() {
  const { settings } = useSettings();
  const [activeLesson, setActiveLesson] = useState<LessonId>('damage');
  const progress = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runAnimation = useCallback(() => {
    clearTimers();
    progress.value = 0;
    if (!settings.animationsEnabled) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: 1050, easing: Easing.out(Easing.cubic) });
  }, [clearTimers, progress, settings.animationsEnabled]);

  useEffect(() => {
    runAnimation();
    return clearTimers;
  }, [activeLesson, clearTimers, runAnimation]);

  const renderDemo = () => {
    if (activeLesson === 'factions') return <FactionsDemo progress={progress} />;
    if (activeLesson === 'shield') return <ShieldDemo progress={progress} />;
    return <DamageDemo progress={progress} />;
  };

  const lesson = LESSONS.find(item => item.id === activeLesson) ?? LESSONS[0];

  return (
    <View testID="guide-mechanics-demo" style={s.root}>
      <View style={s.header}>
        <View style={s.headerIcon}><Text style={s.headerEmoji}>🎬</Text></View>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>شروحات مرئية سريعة</Text>
          <Text style={s.headerSub}>مشاهد قصيرة تعرض الفكرة خطوة بخطوة؛ لا تحتاج إلى تحميل فيديو خارجي.</Text>
        </View>
      </View>

      <View style={s.lessonTabs}>
        {LESSONS.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[s.lessonTab, activeLesson === item.id && s.lessonTabActive]}
            onPress={() => setActiveLesson(item.id)}
            activeOpacity={0.75}
          >
            <Text style={s.tabEmoji}>{item.icon}</Text>
            <Text style={[s.tabLabel, activeLesson === item.id && s.tabLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.canvas}>
        <Text style={s.lessonCaption}>{lesson.caption}</Text>
        {renderDemo()}
      </View>

      <TouchableOpacity testID="replay-guide-animation" style={s.replayButton} onPress={runAnimation} activeOpacity={0.8}>
        <Text style={s.replayText}>{settings.animationsEnabled ? '↻ أعد تشغيل الشرح' : '✓ اعرض الشرح الثابت'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: 'rgba(15,23,42,0.9)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.32)', borderRadius: RADIUS.lg, padding: SPACE.lg, gap: SPACE.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  headerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,85,247,0.16)' },
  headerEmoji: { fontSize: 22 },
  headerTextWrap: { flex: 1, gap: 2 },
  headerTitle: { color: '#e9d5ff', fontSize: FONT.base, fontWeight: '900' },
  headerSub: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 17 },
  lessonTabs: { flexDirection: 'row', gap: SPACE.sm },
  lessonTab: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3, paddingVertical: SPACE.sm, paddingHorizontal: 3, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  lessonTabActive: { backgroundColor: 'rgba(168,85,247,0.17)', borderColor: 'rgba(192,132,252,0.65)' },
  tabEmoji: { fontSize: 16 },
  tabLabel: { color: '#94a3b8', fontSize: 10, textAlign: 'center' },
  tabLabelActive: { color: '#e9d5ff', fontWeight: '800' },
  canvas: { minHeight: 210, backgroundColor: 'rgba(2,6,23,0.72)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(148,163,184,0.14)', padding: SPACE.md, justifyContent: 'center', gap: SPACE.md },
  lessonCaption: { color: '#cbd5e1', textAlign: 'center', fontSize: FONT.xs, fontWeight: '800' },
  demoBody: { gap: SPACE.md },
  cardsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
  miniCard: { width: 100, alignItems: 'center', gap: 4, paddingVertical: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1 },
  fireCard: { backgroundColor: 'rgba(239,68,68,0.14)', borderColor: 'rgba(248,113,113,0.55)' },
  earthCard: { backgroundColor: 'rgba(163,230,53,0.12)', borderColor: 'rgba(190,242,100,0.5)' },
  waterCard: { backgroundColor: 'rgba(59,130,246,0.13)', borderColor: 'rgba(96,165,250,0.56)' },
  shieldCard: { backgroundColor: 'rgba(34,197,94,0.13)', borderColor: 'rgba(74,222,128,0.58)' },
  miniEmoji: { fontSize: 26 },
  miniLabel: { color: '#e2e8f0', fontSize: FONT.xs, fontWeight: '800' },
  vsText: { color: '#64748b', fontSize: FONT.xs },
  arrowText: { color: COLOR.gold, fontSize: 24, fontWeight: '800' },
  calculationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm },
  calculation: { color: '#f8fafc', fontSize: FONT.xl, fontWeight: '900' },
  operation: { color: '#64748b', fontSize: FONT.lg },
  explainText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18, textAlign: 'center', paddingHorizontal: SPACE.sm },
  resultPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(239,68,68,0.16)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.42)' },
  resultIcon: { fontSize: 17 },
  resultText: { color: '#fecaca', fontSize: FONT.sm, fontWeight: '900' },
  bonusPill: { alignSelf: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(250,204,21,0.13)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.42)' },
  bonusText: { color: '#fde68a', fontSize: FONT.sm, fontWeight: '900' },
  blockPill: { alignSelf: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(34,197,94,0.13)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.42)' },
  blockText: { color: '#bbf7d0', fontSize: FONT.sm, fontWeight: '900' },
  replayButton: { alignSelf: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(168,85,247,0.13)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.45)' },
  replayText: { color: '#ddd6fe', fontSize: FONT.xs, fontWeight: '800' },
});
