import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';

function SketchFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={s.frame}>
      <View style={s.paperLines} pointerEvents="none">
        <View style={s.paperLine} /><View style={s.paperLine} /><View style={s.paperLine} />
      </View>
      <Text style={s.frameTitle}>{title}</Text>
      <Text style={s.frameSubtitle}>{subtitle}</Text>
      <View style={s.art}>{children}</View>
    </View>
  );
}

function FlowNode({ number, emoji, label, tone }: { number: string; emoji: string; label: string; tone: string }) {
  return (
    <View style={[s.flowNode, { borderColor: `${tone}90`, backgroundColor: `${tone}16` }]}>
      <Text style={[s.nodeNumber, { color: tone }]}>{number}</Text>
      <Text style={s.nodeEmoji}>{emoji}</Text>
      <Text style={s.nodeLabel}>{label}</Text>
    </View>
  );
}

function RoundFlowSketch() {
  return (
    <View style={s.flowArt}>
      <FlowNode number="1" emoji="🃏" label="اختر البطاقة" tone="#60a5fa" />
      <Text style={s.flowArrow}>←</Text>
      <FlowNode number="2" emoji="🌈" label="افحص العنصر" tone="#a78bfa" />
      <Text style={s.flowArrow}>←</Text>
      <FlowNode number="3" emoji="⚔️" label="احسب الضرر" tone="#f87171" />
      <Text style={s.flowArrow}>←</Text>
      <FlowNode number="4" emoji="🏆" label="سجّل النتيجة" tone="#facc15" />
    </View>
  );
}

function ElementSketch() {
  return (
    <View style={s.elementArt}>
      <View style={[s.elementBubble, { borderColor: '#60a5fa', backgroundColor: 'rgba(59,130,246,0.16)' }]}><Text style={s.elementEmoji}>💧</Text><Text style={s.elementText}>الماء</Text></View>
      <View style={s.elementArrowWrap}><Text style={s.elementArrow}>←</Text><Text style={s.bonus}>×1.25</Text></View>
      <View style={[s.elementBubble, { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.16)' }]}><Text style={s.elementEmoji}>🔥</Text><Text style={s.elementText}>النار</Text></View>
      <Text style={s.elementCaption}>اربط الرمز بالخصم المناسب قبل أن تضغط الهجوم.</Text>
    </View>
  );
}

function AbilitySketch() {
  return (
    <View style={s.abilityArt}>
      <View style={[s.abilityCard, { borderColor: 'rgba(248,113,113,0.6)' }]}><Text style={s.abilityEmoji}>⚔️</Text><Text style={s.abilityLabel}>هجمة قوية</Text></View>
      <View style={s.attackPath}><Text style={s.attackArrow}>←</Text><Text style={s.blockMark}>✕</Text></View>
      <View style={[s.abilityCard, { borderColor: 'rgba(74,222,128,0.65)' }]}><Text style={s.abilityEmoji}>🛡️</Text><Text style={s.abilityLabel}>قدرة الدرع</Text></View>
      <Text style={s.elementCaption}>فعّل القدرة قبل الهجوم لتقلب مسار الجولة لصالحك.</Text>
    </View>
  );
}

export function GuideSketchBoard() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <View testID="guide-sketch-board" style={[s.root, isLandscape && s.rootLandscape]}>
      <SketchFrame title="سكتش الجولة" subtitle="اتبع المسار البسيط في كل مواجهة">
        <RoundFlowSketch />
      </SketchFrame>
      <SketchFrame title="سكتش العناصر" subtitle="التفوق يمنح هجوماً أقوى">
        <ElementSketch />
      </SketchFrame>
      <SketchFrame title="سكتش القدرات" subtitle="القدرة في التوقيت الصحيح تصنع الفارق">
        <AbilitySketch />
      </SketchFrame>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: SPACE.md },
  rootLandscape: { flexDirection: 'row', alignItems: 'stretch' },
  frame: { flex: 1, minWidth: 0, minHeight: 190, overflow: 'hidden', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(226,232,240,0.2)', backgroundColor: 'rgba(249,250,251,0.96)', padding: SPACE.md, gap: 4 },
  paperLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-around', opacity: 0.6, paddingVertical: 24 },
  paperLine: { height: 1, backgroundColor: 'rgba(96,165,250,0.15)' },
  frameTitle: { color: '#1e293b', fontSize: FONT.sm, fontWeight: '900', zIndex: 1 },
  frameSubtitle: { color: '#64748b', fontSize: 10, zIndex: 1 },
  art: { flex: 1, justifyContent: 'center', zIndex: 1 },
  flowArt: { gap: 3, alignItems: 'center' },
  flowNode: { width: '100%', minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.sm, borderWidth: 1.5, borderRadius: RADIUS.md },
  nodeNumber: { fontSize: 11, fontWeight: '900', width: 12 },
  nodeEmoji: { fontSize: 16 },
  nodeLabel: { color: '#334155', fontSize: 11, fontWeight: '800' },
  flowArrow: { color: '#94a3b8', fontSize: 16, fontWeight: '900', height: 15 },
  elementArt: { alignItems: 'center', justifyContent: 'center', gap: SPACE.sm },
  elementBubble: { width: 86, height: 58, borderWidth: 1.5, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: 1 },
  elementEmoji: { fontSize: 20 },
  elementText: { color: '#334155', fontSize: 10, fontWeight: '900' },
  elementArrowWrap: { alignItems: 'center', gap: -2 },
  elementArrow: { color: COLOR.gold, fontSize: 26, fontWeight: '900', height: 23 },
  bonus: { color: '#a16207', fontSize: 10, fontWeight: '900' },
  elementCaption: { color: '#64748b', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: SPACE.sm, marginTop: SPACE.xs },
  abilityArt: { alignItems: 'center', justifyContent: 'center', gap: SPACE.sm },
  abilityCard: { width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: SPACE.sm, borderWidth: 1.5, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.7)' },
  abilityEmoji: { fontSize: 16 },
  abilityLabel: { color: '#334155', fontSize: 10, fontWeight: '900' },
  attackPath: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attackArrow: { color: '#f87171', fontSize: 28, fontWeight: '900', height: 25 },
  blockMark: { color: '#16a34a', fontSize: 19, fontWeight: '900' },
});
