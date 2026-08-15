import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useSettings } from '@/lib/game/hooks/useSettings';
import { useOrientationTransition } from '@/utils/orientation-transition';
import { TrainingArena } from '@/components/game/training-arena';
import { GuideMechanicsDemo } from '@/components/game/guide-mechanics-demo';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';

const ELEMENTS = [
  { emoji: '🔥', title: 'النار', strong: 'الأرض', weak: 'الماء والريح', color: '#ef4444' },
  { emoji: '💧', title: 'الماء', strong: 'النار', weak: 'الأرض والبرق', color: '#3b82f6' },
  { emoji: '🌍', title: 'الأرض', strong: 'البرق والماء', weak: 'الريح', color: '#a3e635' },
  { emoji: '⚡', title: 'البرق', strong: 'الماء والريح', weak: 'الأرض', color: '#facc15' },
  { emoji: '💨', title: 'الريح', strong: 'الأرض', weak: 'النار والبرق', color: '#a78bfa' },
];

const STEPS = [
  { number: '01', emoji: '🎯', title: 'اختر المباراة', text: 'اختر نمط اللعب، مستوى الصعوبة، عدد الجولات، ثم قرر إن كنت تريد تفعيل القدرات الخاصة.' },
  { number: '02', emoji: '🃏', title: 'رتّب بطاقاتك', text: 'حدّد ترتيب بطاقاتك قبل البداية. تظهر بطاقة واحدة من كل جانب في كل جولة، لذا ضع بطاقاتك بعناية.' },
  { number: '03', emoji: '⚔️', title: 'العب الجولة', text: 'استخدم القدرة المناسبة إن توفرت، ثم نفّذ الهجوم. تُحسب نتيجة الجولة وتنتقل المباراة إلى الجولة التالية.' },
];

const TIPS = [
  { emoji: '🛡️', title: 'الدفاع مهم', text: 'هجوم مرتفع لا يكفي دائماً؛ الدفاع يخصم من الضرر الوارد.' },
  { emoji: '🌈', title: 'راقب العنصر', text: 'التفوق العنصري يرفع الهجوم بنسبة 25%، والضعف يخفضه بنسبة 25%.' },
  { emoji: '✨', title: 'لا تهدر القدرات', text: 'بعض القدرات تمنح درعاً أو تعدّل الإحصاءات أو تؤثر في النقاط؛ استخدمها في الجولة المناسبة.' },
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      {text ? <Text style={s.sectionText}>{text}</Text> : null}
    </View>
  );
}

function InfoCard({ emoji, title, text, accent = COLOR.gold }: { emoji: string; title: string; text: string; accent?: string }) {
  return (
    <View style={[s.infoCard, { borderColor: `${accent}48` }]}>
      <View style={[s.infoIcon, { backgroundColor: `${accent}20` }]}><Text style={s.infoEmoji}>{emoji}</Text></View>
      <View style={s.infoTextWrap}>
        <Text style={s.infoTitle}>{title}</Text>
        <Text style={s.infoText}>{text}</Text>
      </View>
    </View>
  );
}

export default function HowToPlayScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { settings } = useSettings();
  const { animatedStyle: orientationStyle, layoutTransition } = useOrientationTransition(
    isLandscape,
    settings.animationsEnabled,
  );

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={s.background}><LuxuryBackground /></View>
      <Animated.View testID="how-to-play-screen" layout={layoutTransition} style={[s.root, orientationStyle]}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.75}>
            <Text style={s.backText}>← رجوع</Text>
          </TouchableOpacity>
          <Text style={s.topLabel}>دليل Card Clash</Text>
        </View>

        <ScrollView contentContainerStyle={[s.content, isLandscape && s.contentLandscape]} showsVerticalScrollIndicator={false}>
          <View style={[s.hero, isLandscape && s.heroLandscape]}>
            <View style={s.heroBadge}><Text style={s.heroBadgeText}>📖 دليل اللاعب</Text></View>
            <Text style={s.heroTitle}>افهم المواجهة. خطّط بذكاء. وانتصر.</Text>
            <Text style={s.heroText}>Card Clash هي مواجهة بطاقات سريعة تعتمد على ترتيب بطاقاتك، إحصاءاتها، عناصرها، وقدراتك الخاصة.</Text>
            <TouchableOpacity style={s.heroButton} onPress={() => router.push('/screens/game-mode' as any)} activeOpacity={0.85}>
              <Text style={s.heroButtonText}>ابدأ مباراة الآن  ⚔️</Text>
            </TouchableOpacity>
          </View>

          <SectionTitle eyebrow="من البداية إلى النهاية" title="كيف تبدأ المباراة؟" />
          <Animated.View layout={layoutTransition} style={[s.steps, isLandscape && s.stepsLandscape]}>
            {STEPS.map(step => (
              <View key={step.number} style={s.stepCard}>
                <Text style={s.stepNumber}>{step.number}</Text>
                <Text style={s.stepEmoji}>{step.emoji}</Text>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
            ))}
          </Animated.View>

          <SectionTitle eyebrow="قلب المعركة" title="كيف تُحسم الجولة؟" text="يفوز صاحب الضرر الأعلى في الجولة؛ التعادل لا يخصم نقطة من أي طرف." />
          <View style={[s.rulesGrid, isLandscape && s.rulesGridLandscape]}>
            <InfoCard emoji="⚔️" title="الهجوم" text="ابدأ بقيمة هجوم البطاقة، ثم يطبّق النظام تأثير العنصر والقدرات النشطة." accent="#f87171" />
            <InfoCard emoji="🛡️" title="الدفاع" text="يُخصم دفاع الخصم من الضرر الخام؛ لا يمكن أن ينخفض الضرر عن صفر." accent="#60a5fa" />
            <InfoCard emoji="❤️" title="النقاط" text="تبدأ النقاط بعدد الجولات المختار. الفوز المعتاد في الجولة يخفض نقطة الخصم بمقدار واحد." accent="#34d399" />
            <InfoCard emoji="🏆" title="الفوز" text="بعد انتهاء الجولات، اللاعب صاحب النقاط المتبقية الأعلى هو الفائز بالمباراة." accent={COLOR.gold} />
          </View>

          <View style={s.formulaCard}>
            <Text style={s.formulaLabel}>معادلة مبسطة للضرر</Text>
            <Text style={s.formula}>الضرر = أقصى قيمة بين 0 و (الهجوم × معامل العنصر − دفاع الخصم)</Text>
            <Text style={s.formulaNote}>تُطبّق القدرات والتأثيرات الخاصة قبل المقارنة النهائية عند وجودها.</Text>
          </View>

          <SectionTitle eyebrow="جرّب القاعدة بنفسك" title="ساحة التدريب" text="اختر بطاقتين واضغط تحليل النتيجة؛ لن تُسجّل هذه التجربة ضمن نتائجك أو إحصاءاتك." />
          <TrainingArena />

          <SectionTitle eyebrow="شاهدها خطوة بخطوة" title="رسوم توضيحية قصيرة" text="اختر الآلية التي تريد فهمها، ثم شاهد الخطوات أو أعد تشغيلها متى شئت." />
          <GuideMechanicsDemo />

          <SectionTitle eyebrow="خمس قوى" title="نظام العناصر" text="ميزة العنصر تمنح ×1.25 للهجوم، وضعف العنصر يطبّق ×0.75." />
          <Animated.View layout={layoutTransition} style={[s.elementGrid, isLandscape && s.elementGridLandscape]}>
            {ELEMENTS.map(element => (
              <View key={element.title} style={[s.elementCard, { borderColor: `${element.color}50` }]}>
                <View style={[s.elementIcon, { backgroundColor: `${element.color}20` }]}><Text style={s.elementEmoji}>{element.emoji}</Text></View>
                <View style={s.elementTextWrap}>
                  <Text style={[s.elementTitle, { color: element.color }]}>{element.title}</Text>
                  <Text style={s.elementLine}>قوي ضد: {element.strong}</Text>
                  <Text style={s.elementLine}>ضعيف أمام: {element.weak}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          <SectionTitle eyebrow="الخيارات الذكية" title="البطاقات والقدرات" />
          <View style={[s.rulesGrid, isLandscape && s.rulesGridLandscape]}>
            <InfoCard emoji="⭐" title="الندرة والفئة" text="تؤثر خصائص البطاقة وقدراتها الفريدة في طريقة أدائها؛ راجع البطاقة قبل تثبيت ترتيبها." accent="#a78bfa" />
            <InfoCard emoji="⚡" title="القدرات الخاصة" text="عند تفعيلها، قد تحسن الإحصاءات أو تحمي من ضرر أو تغيّر أثر الجولة. لا تتوفر إلا إذا فُعّلت من إعداد المباراة." accent="#facc15" />
          </View>

          <SectionTitle eyebrow="نصائح سريعة" title="كيف ترفع فرصك في الفوز؟" />
          <View style={s.tipsCard}>
            {TIPS.map((tip, index) => (
              <View key={tip.title} style={[s.tipRow, index < TIPS.length - 1 && s.tipDivider]}>
                <Text style={s.tipEmoji}>{tip.emoji}</Text>
                <View style={s.tipTextWrap}>
                  <Text style={s.tipTitle}>{tip.title}</Text>
                  <Text style={s.tipText}>{tip.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.bottomButton} onPress={() => router.push('/screens/game-mode' as any)} activeOpacity={0.85}>
            <Text style={s.bottomButtonText}>جاهز للمواجهة؟ اختر نمط اللعب</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  background: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  root: { flex: 1, zIndex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: 'rgba(228,165,42,0.12)' },
  backButton: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  backText: { color: '#e2e8f0', fontSize: FONT.sm },
  topLabel: { color: COLOR.gold, fontSize: FONT.sm, letterSpacing: 0.4 },
  content: { padding: SPACE.lg, paddingBottom: SPACE.xxl + 44, gap: SPACE.xl },
  contentLandscape: { paddingHorizontal: SPACE.xxl, paddingTop: SPACE.md },
  hero: { borderWidth: 1, borderColor: 'rgba(228,165,42,0.28)', borderRadius: RADIUS.lg, padding: SPACE.xl, backgroundColor: 'rgba(12,8,24,0.82)', gap: SPACE.md },
  heroLandscape: { alignItems: 'flex-start', paddingHorizontal: SPACE.xxl, paddingVertical: SPACE.xl },
  heroBadge: { backgroundColor: 'rgba(228,165,42,0.13)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.28)', paddingHorizontal: SPACE.md, paddingVertical: 5, borderRadius: RADIUS.full },
  heroBadgeText: { color: COLOR.gold, fontSize: FONT.xs },
  heroTitle: { color: '#f8fafc', fontSize: FONT.xxl + 4, lineHeight: FONT.xxl + 14, fontWeight: '900', textAlign: 'left' },
  heroText: { color: '#94a3b8', fontSize: FONT.sm, lineHeight: 22, maxWidth: 720 },
  heroButton: { backgroundColor: COLOR.gold, borderRadius: RADIUS.full, paddingHorizontal: SPACE.xl, paddingVertical: SPACE.md, marginTop: SPACE.xs },
  heroButtonText: { color: '#1a0d1a', fontSize: FONT.base, fontWeight: '800' },
  sectionHead: { gap: 4, marginTop: SPACE.xs },
  eyebrow: { color: '#fbbf24', fontSize: FONT.xs, letterSpacing: 0.8 },
  sectionTitle: { color: '#f1f5f9', fontSize: FONT.xl, fontWeight: '800' },
  sectionText: { color: '#94a3b8', fontSize: FONT.sm, lineHeight: 20 },
  steps: { gap: SPACE.md },
  stepsLandscape: { flexDirection: 'row' },
  stepCard: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(10,12,28,0.8)', borderRadius: RADIUS.lg, padding: SPACE.lg, gap: SPACE.sm, overflow: 'hidden' },
  stepNumber: { color: 'rgba(228,165,42,0.28)', fontSize: FONT.hero, fontWeight: '900', position: 'absolute', top: 6, right: 12 },
  stepEmoji: { fontSize: 28, marginTop: SPACE.sm },
  stepTitle: { color: '#f8fafc', fontSize: FONT.base, fontWeight: '800' },
  stepText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 19 },
  rulesGrid: { gap: SPACE.sm },
  rulesGridLandscape: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: 'rgba(10,12,28,0.8)', borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.md },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoEmoji: { fontSize: 19 },
  infoTextWrap: { flex: 1, gap: 2 },
  infoTitle: { color: '#e2e8f0', fontSize: FONT.sm, fontWeight: '800' },
  infoText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18 },
  formulaCard: { backgroundColor: 'rgba(96,165,250,0.08)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(96,165,250,0.26)', padding: SPACE.lg, gap: SPACE.sm },
  formulaLabel: { color: '#93c5fd', fontSize: FONT.xs, letterSpacing: 0.6 },
  formula: { color: '#e0f2fe', fontSize: FONT.base, fontWeight: '800', lineHeight: 24 },
  formulaNote: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18 },
  elementGrid: { gap: SPACE.sm },
  elementGridLandscape: { flexDirection: 'row', flexWrap: 'wrap' },
  elementCard: { flexDirection: 'row', gap: SPACE.md, borderWidth: 1, backgroundColor: 'rgba(10,12,28,0.8)', borderRadius: RADIUS.lg, padding: SPACE.md },
  elementIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  elementEmoji: { fontSize: 22 },
  elementTextWrap: { flex: 1, gap: 2 },
  elementTitle: { fontSize: FONT.sm, fontWeight: '900' },
  elementLine: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 17 },
  tipsCard: { backgroundColor: 'rgba(10,12,28,0.84)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', overflow: 'hidden' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md },
  tipDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tipEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  tipTextWrap: { flex: 1, gap: 2 },
  tipTitle: { color: '#e2e8f0', fontSize: FONT.sm, fontWeight: '800' },
  tipText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18 },
  bottomButton: { backgroundColor: 'rgba(228,165,42,0.13)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.4)', borderRadius: RADIUS.lg, padding: SPACE.lg, alignItems: 'center' },
  bottomButtonText: { color: COLOR.gold, fontSize: FONT.base, fontWeight: '800' },
});
