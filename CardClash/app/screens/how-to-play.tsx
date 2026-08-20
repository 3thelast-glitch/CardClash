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
import { GuideSketchBoard } from '@/components/game/guide-sketch-board';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';

const FACTIONS = [
  { mark: 'بش', title: 'بشر', strong: 'ألف', weak: 'روبوت', color: '#60a5fa' },
  { mark: 'إل', title: 'ألف', strong: 'أورك', weak: 'بشر', color: '#34d399' },
  { mark: 'أو', title: 'أورك', strong: 'تنين', weak: 'ألف', color: '#f59e0b' },
  { mark: 'تن', title: 'تنين', strong: 'شيطان', weak: 'أورك', color: '#ef4444' },
  { mark: 'شي', title: 'شيطان', strong: 'ميت', weak: 'تنين', color: '#a78bfa' },
  { mark: 'مي', title: 'ميت', strong: 'وحش', weak: 'شيطان', color: '#94a3b8' },
  { mark: 'وح', title: 'وحش', strong: 'روبوت', weak: 'ميت', color: '#ec4899' },
  { mark: 'رو', title: 'روبوت', strong: 'بشر', weak: 'وحش', color: '#22d3ee' },
];

const PLAY_MODES = [
  { label: 'منفرد', icon: '🤖', title: 'واجه البوت', text: 'اختر المستوى وعدد الجولات، ثم رتّب بطاقاتك لخوض مباراة فردية.' },
  { label: 'محلي', icon: '👥', title: 'طرفان على جهاز واحد', text: 'يجهز المضيف تشكيلته ثم يسلّم الجهاز للضيف قبل بدء الساحة المشتركة.' },
  { label: 'Wi‑Fi', icon: '📡', title: 'جهازان وشبكة واحدة', text: 'أنشئ أو انضم إلى غرفة محلية، واضبط الإعدادات ثم قاتل كل لاعب من جهازه.' },
];

const STEPS = [
  { number: '01', emoji: '🎯', title: 'اضبط المباراة', text: 'اختر نمط اللعب وعدد الجولات، ثم فعّل القدرات الخاصة إن أردت استخدامها.' },
  { number: '02', emoji: '🃏', title: 'رتّب التشكيلة', text: 'ضع بطاقاتك بالترتيب الذي تريده؛ تظهر بطاقة واحدة من كل جانب في كل جولة.' },
  { number: '03', emoji: '⚡', title: 'استخدم القدرة', text: 'يمكنك تفعيل كرت قدرة مناسب في وقته لتحسين موقفك أو حماية بطاقتك.' },
  { number: '04', emoji: '⚔️', title: 'احسم الجولة', text: 'اكشف الكرتين، راقب ملخص الحسم، ثم انتقل بعد تأكيد النتيجة في اللعب الجماعي.' },
];

const TIPS = [
  { emoji: '🛡️', title: 'الدفاع مهم', text: 'هجوم مرتفع لا يكفي دائماً؛ الدفاع يخصم من الضرر الوارد.' },
  { emoji: '🔁', title: 'راقب الفصيلة', text: 'الأفضلية الفصيلية ترفع الهجوم بنسبة 25%، والضعف الفصيلي يخفضه بنسبة 25%.' },
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
  const isWideLayout = width >= 720;
  const isCompact = width < 390 || height < 640;
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
          <Text style={s.topLabel}>دليل اللعب</Text>
        </View>

        <ScrollView contentContainerStyle={[s.content, isLandscape && s.contentLandscape]} showsVerticalScrollIndicator={false}>
          <View style={[s.contentInner, isWideLayout && s.contentInnerWide]}>
          <View style={[s.hero, isWideLayout && s.heroLandscape]}>
            <View style={s.heroBadge}><Text style={s.heroBadgeText}>دليل اللاعب</Text><View style={s.heroBadgeDot} /></View>
            <Text style={[s.heroTitle, isCompact && s.heroTitleCompact]}>افهم المواجهة. خطّط بذكاء. وانتصر.</Text>
            <Text style={s.heroText}>Card Clash مواجهة بطاقات سريعة تعتمد على ترتيب تشكيلتك، الهجوم والدفاع، دورة الفصائل، وقدراتك الخاصة.</Text>
            <View style={s.heroFacts}>
              <Text style={s.heroFact}>ترتيبك يصنع الخطة</Text><View style={s.heroFactDivider} />
              <Text style={s.heroFact}>الفصائل تغيّر الضرر</Text><View style={s.heroFactDivider} />
              <Text style={s.heroFact}>القدرة توقيتها مهم</Text>
            </View>
            <TouchableOpacity style={s.heroButton} onPress={() => router.push('/screens/game-mode' as any)} activeOpacity={0.85}>
              <Text style={s.heroButtonText}>ابدأ مباراة الآن</Text>
            </TouchableOpacity>
          </View>

          <SectionTitle eyebrow="اختر طريقتك" title="أنماط اللعب" text="تبدأ القواعد نفسها في كل الأنماط، بينما تختلف طريقة الاتصال وتجهيز اللاعبين." />
          <Animated.View layout={layoutTransition} style={[s.modes, isWideLayout && s.modesWide]}>
            {PLAY_MODES.map(mode => (
              <View key={mode.label} style={[s.modeCard, isWideLayout && s.modeCardWide]}>
                <View style={s.modeTop}><Text style={s.modeTag}>{mode.label}</Text><Text style={s.modeIcon}>{mode.icon}</Text></View>
                <Text style={s.modeTitle}>{mode.title}</Text>
                <Text style={s.modeText}>{mode.text}</Text>
              </View>
            ))}
          </Animated.View>

          <SectionTitle eyebrow="من الإعداد إلى النتيجة" title="أربع خطوات للمواجهة" />
          <Animated.View layout={layoutTransition} style={[s.steps, isWideLayout && s.stepsLandscape]}>
            {STEPS.map(step => (
              <View key={step.number} style={[s.stepCard, isWideLayout && s.stepCardWide]}>
                <View style={s.stepTop}><Text style={s.stepNumber}>{step.number}</Text><Text style={s.stepEmoji}>{step.emoji}</Text></View>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
            ))}
          </Animated.View>

          <SectionTitle eyebrow="قلب المعركة" title="كيف تُحسم الجولة؟" text="يفوز صاحب الضرر الأعلى في الجولة؛ التعادل لا يخصم نقطة من أي طرف." />
          <View style={[s.rulesGrid, isWideLayout && s.rulesGridLandscape]}>
            <InfoCard emoji="⚔️" title="الهجوم" text="ابدأ بقيمة هجوم البطاقة، ثم يطبّق النظام معامل أفضلية الفصيلة والقدرات النشطة." accent="#f87171" />
            <InfoCard emoji="🛡️" title="الدفاع" text="يُخصم دفاع الخصم من الضرر الخام؛ لا يمكن أن ينخفض الضرر عن صفر." accent="#60a5fa" />
            <InfoCard emoji="❤️" title="النقاط" text="تبدأ النقاط بعدد الجولات المختار. الفوز المعتاد في الجولة يخفض نقطة الخصم بمقدار واحد." accent="#34d399" />
            <InfoCard emoji="🏆" title="الفوز" text="بعد انتهاء الجولات، اللاعب صاحب النقاط المتبقية الأعلى هو الفائز بالمباراة." accent={COLOR.gold} />
          </View>

          <View style={s.formulaCard}>
            <View style={s.formulaHeader}><View style={s.formulaDot} /><Text style={s.formulaLabel}>معادلة مبسطة للضرر</Text></View>
            <Text style={s.formula}>الضرر = أقصى قيمة بين 0 و (الهجوم × معامل الفصيلة − دفاع الخصم)</Text>
            <Text style={s.formulaNote}>تُطبّق القدرات والتأثيرات الخاصة قبل المقارنة النهائية عند وجودها.</Text>
          </View>

          <SectionTitle eyebrow="جرّب القاعدة بنفسك" title="ساحة التدريب" text="اختر بطاقتين واضغط تحليل النتيجة؛ لن تُسجّل هذه التجربة ضمن نتائجك أو إحصاءاتك." />
          <TrainingArena />

          <SectionTitle eyebrow="شاهدها خطوة بخطوة" title="رسوم توضيحية قصيرة" text="اختر الآلية التي تريد فهمها، ثم شاهد الخطوات أو أعد تشغيلها متى شئت." />
          <GuideMechanicsDemo />

          <SectionTitle eyebrow="خلاصة مرسومة" title="سكتشات تساعدك على التذكر" text="احفظ هذه الخرائط البصرية السريعة لتتخذ قرارك داخل الجولة بثقة." />
          <GuideSketchBoard />

          <SectionTitle eyebrow="دورة المواجهات" title="نظام الفصائل" text="كل فصيلة تتفوق على الفصيلة التالية في الدورة: الأفضلية تمنح ×1.25 للهجوم والضعف يطبّق ×0.75." />
          <Animated.View layout={layoutTransition} style={[s.elementGrid, isWideLayout && s.elementGridLandscape]}>
            {FACTIONS.map(element => (
              <View key={element.title} style={[s.elementCard, isWideLayout && s.elementCardWide, { borderColor: `${element.color}50` }]}>
                <View style={[s.elementIcon, { backgroundColor: `${element.color}20` }]}><Text style={[s.elementMark, { color: element.color }]}>{element.mark}</Text></View>
                <View style={s.elementTextWrap}>
                  <Text style={[s.elementTitle, { color: element.color }]}>{element.title}</Text>
                  <Text style={s.elementLine}>قوي ضد: {element.strong}</Text>
                  <Text style={s.elementLine}>ضعيف أمام: {element.weak}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          <SectionTitle eyebrow="الخيارات الذكية" title="البطاقات والقدرات" />
          <View style={[s.rulesGrid, isWideLayout && s.rulesGridLandscape]}>
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
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  background: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  root: { flex: 1, zIndex: 1 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: 'rgba(228,165,42,0.12)' },
  backButton: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  backText: { color: '#e2e8f0', fontSize: FONT.sm },
  topLabel: { color: COLOR.gold, fontSize: FONT.sm, letterSpacing: 0.4, fontWeight: '800' },
  content: { padding: SPACE.md, paddingBottom: SPACE.xxl + 44 }, contentLandscape: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.md }, contentInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: SPACE.xl }, contentInnerWide: { gap: SPACE.xxl },
  hero: { borderWidth: 1, borderColor: 'rgba(228,165,42,0.34)', borderRadius: RADIUS.lg, padding: SPACE.lg, backgroundColor: 'rgba(12,8,24,0.84)', gap: SPACE.md, alignItems: 'flex-end' }, heroLandscape: { paddingHorizontal: SPACE.xxl, paddingVertical: SPACE.xl }, heroBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(228,165,42,0.13)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.28)', paddingHorizontal: SPACE.md, paddingVertical: 5, borderRadius: RADIUS.full }, heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLOR.gold },
  heroBadgeText: { color: COLOR.gold, fontSize: FONT.xs, fontWeight: '800' }, heroTitle: { color: '#f8fafc', fontSize: FONT.xxl + 4, lineHeight: FONT.xxl + 14, fontWeight: '900', textAlign: 'right' }, heroTitleCompact: { fontSize: FONT.xl + 2, lineHeight: FONT.xxl + 6 }, heroText: { color: '#cbd5e1', fontSize: FONT.sm, lineHeight: 22, maxWidth: 720, textAlign: 'right' }, heroFacts: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7 }, heroFact: { color: '#a5f3fc', fontSize: 10, fontWeight: '800' }, heroFactDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(165,243,252,0.7)' },
  heroButton: { backgroundColor: COLOR.gold, borderRadius: RADIUS.full, paddingHorizontal: SPACE.xl, paddingVertical: SPACE.md, marginTop: SPACE.xs },
  heroButtonText: { color: '#1a0d1a', fontSize: FONT.base, fontWeight: '800' },
  sectionHead: { gap: 4, marginTop: SPACE.xs, alignItems: 'flex-end' }, eyebrow: { color: '#fbbf24', fontSize: FONT.xs, letterSpacing: 0.8 }, sectionTitle: { color: '#f1f5f9', fontSize: FONT.xl, fontWeight: '800', textAlign: 'right' }, sectionText: { color: '#94a3b8', fontSize: FONT.sm, lineHeight: 20, textAlign: 'right', maxWidth: 760 },
  modes: { gap: SPACE.sm }, modesWide: { flexDirection: 'row-reverse' }, modeCard: { minWidth: 0, backgroundColor: 'rgba(10,12,28,0.8)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.2)', borderRadius: RADIUS.lg, padding: SPACE.md, gap: 6 }, modeCardWide: { flex: 1 }, modeTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }, modeTag: { color: '#5eead4', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, backgroundColor: 'rgba(45,212,191,0.10)' }, modeIcon: { fontSize: 24 }, modeTitle: { color: '#f8fafc', fontSize: FONT.base, fontWeight: '900', textAlign: 'right' }, modeText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 19, textAlign: 'right' },
  steps: { gap: SPACE.sm }, stepsLandscape: { flexDirection: 'row-reverse' }, stepCard: { minWidth: 0, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', backgroundColor: 'rgba(10,12,28,0.8)', borderRadius: RADIUS.lg, padding: SPACE.md, gap: SPACE.sm, overflow: 'hidden' }, stepCardWide: { flex: 1 }, stepTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, stepNumber: { color: COLOR.gold, fontSize: FONT.sm, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full, backgroundColor: 'rgba(228,165,42,0.12)' }, stepEmoji: { fontSize: 25 }, stepTitle: { color: '#f8fafc', fontSize: FONT.base, fontWeight: '800', textAlign: 'right' }, stepText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 19, textAlign: 'right' },
  rulesGrid: { gap: SPACE.sm },
  rulesGridLandscape: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  infoCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md, backgroundColor: 'rgba(10,12,28,0.8)', borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.md },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoEmoji: { fontSize: 19 },
  infoTextWrap: { flex: 1, gap: 2 },
  infoTitle: { color: '#e2e8f0', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' },
  infoText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18, textAlign: 'right' },
  formulaCard: { backgroundColor: 'rgba(96,165,250,0.08)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(96,165,250,0.26)', padding: SPACE.lg, gap: SPACE.sm },
  formulaHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }, formulaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#93c5fd' }, formulaLabel: { color: '#93c5fd', fontSize: FONT.xs, letterSpacing: 0.6 }, formula: { color: '#e0f2fe', fontSize: FONT.base, fontWeight: '800', lineHeight: 24, textAlign: 'right' }, formulaNote: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18, textAlign: 'right' },
  elementGrid: { gap: SPACE.sm },
  elementGridLandscape: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  elementCard: { flexDirection: 'row-reverse', gap: SPACE.md, borderWidth: 1, backgroundColor: 'rgba(10,12,28,0.8)', borderRadius: RADIUS.lg, padding: SPACE.md }, elementCardWide: { width: '24.1%' },
  elementIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  elementMark: { fontSize: 13, fontWeight: '900' },
  elementTextWrap: { flex: 1, gap: 2 },
  elementTitle: { fontSize: FONT.sm, fontWeight: '900', textAlign: 'right' },
  elementLine: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 17, textAlign: 'right' },
  tipsCard: { backgroundColor: 'rgba(10,12,28,0.84)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', overflow: 'hidden' },
  tipRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md, padding: SPACE.md },
  tipDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tipEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  tipTextWrap: { flex: 1, gap: 2 },
  tipTitle: { color: '#e2e8f0', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' },
  tipText: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18, textAlign: 'right' },
  bottomButton: { backgroundColor: 'rgba(228,165,42,0.13)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.4)', borderRadius: RADIUS.lg, padding: SPACE.lg, alignItems: 'center' },
  bottomButtonText: { color: COLOR.gold, fontSize: FONT.base, fontWeight: '800' },
});
