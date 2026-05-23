import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL } from '@/components/ui/design-tokens';

// ─── بيانات الكروت الخاصة ───────────────────────────────────────────────────
const SPECIAL_CARDS = [
  { name: 'Turin',        emoji: '🎭', color: '#a78bfa', tags: [],                desc: 'يخسر نصف الجولات' },
  { name: 'Dracule Mihawk', emoji: '⚔️', color: '#e4a52a', tags: ['swordsman'],  desc: 'يفوز على جميع السيافين' },
  { name: 'Gehrman',     emoji: '🐺', color: '#34d399', tags: ['hunter'],        desc: 'يصطاد جميع الوحوش' },
  { name: 'Sanji',       emoji: '🍳', color: '#f87171', tags: ['cook'],          desc: 'يخسر أمام جميع النساء' },
  { name: 'Tsunade',     emoji: '💊', color: '#60a5fa', tags: ['medic'],         desc: '+2 صحة عند النزول' },
  { name: 'Sakura Haruno', emoji: '🌸', color: '#f9a8d4', tags: ['medic'],       desc: '+1 صحة عند الفوز' },
];

const ABILITY_TAGS = [
  { key: 'none',      label: 'بدون قدرة',   color: '#6b7280' },
  { key: 'swordsman', label: '⚔️ سيّاف',    color: '#e4a52a' },
  { key: 'monster',   label: '👹 وحش',      color: '#34d399' },
  { key: 'female',    label: '👩 أنثى',     color: '#f9a8d4' },
  { key: 'beast',     label: '🐉 مخلوق',    color: '#fb923c' },
  { key: 'hunter',    label: '🏹 صياد',     color: '#a3e635' },
  { key: 'medic',     label: '💉 طبيب',     color: '#38bdf8' },
];

type SimCard = {
  name: string;
  power: number;
  health: number;
  tags: string[];
  emoji: string;
  color: string;
};

type BattleLog = {
  round: number;
  attacker: string;
  defender: string;
  result: 'win' | 'lose' | 'draw';
  reason: string;
  hpChange?: string;
};

// ─── منطق القتال (مطابق rage-engine) ─────────────────────────────────────────
function resolveSpecial(
  attacker: SimCard,
  defender: SimCard,
): { result: 'win' | 'lose' | null; reason: string } {
  const dt = defender.tags;
  if (attacker.name === 'Dracule Mihawk' && dt.includes('swordsman'))
    return { result: 'win', reason: '⚔️ Mihawk يفوز على السيافين' };
  if (attacker.name === 'Gehrman' && (dt.includes('monster') || dt.includes('beast')))
    return { result: 'win', reason: '🐺 Gehrman يصطاد الوحوش' };
  if (attacker.name === 'Sanji' && dt.includes('female'))
    return { result: 'lose', reason: '🍳 Sanji يخسر أمام النساء' };
  return { result: null, reason: '' };
}

function simulateBattle(myCard: SimCard, enemyCard: SimCard): BattleLog[] {
  const logs: BattleLog[] = [];
  let myHp   = myCard.health;
  let enyHp  = enemyCard.health;
  let round  = 1;

  // تأثير Tsunade عند النزول
  if (myCard.name === 'Tsunade')   myHp   += 2;
  if (enemyCard.name === 'Tsunade') enyHp += 2;

  // Turin يخسر نصف الجولات — نحسب كمية الخسارة الأولى
  let turinLosesNext = myCard.name === 'Turin';

  while (myHp > 0 && enyHp > 0 && round <= 20) {
    // قدرات خاصة
    const special = resolveSpecial(myCard, enemyCard);
    const enemySpecial = resolveSpecial(enemyCard, myCard);

    let result: 'win' | 'lose' | 'draw';
    let reason: string;
    let hpChange = '';

    if (turinLosesNext && myCard.name === 'Turin') {
      result = 'lose';
      reason = '🎭 Turin يخسر هذه الجولة (penalty)';
      turinLosesNext = false; // يتناوب
    } else if (special.result) {
      result = special.result;
      reason = special.reason;
      turinLosesNext = myCard.name === 'Turin' ? true : false;
    } else if (enemySpecial.result) {
      result = enemySpecial.result === 'win' ? 'lose' : 'win';
      reason = enemySpecial.reason + ' (على بطاقتك)';
      turinLosesNext = myCard.name === 'Turin' ? true : false;
    } else if (myCard.power > enemyCard.power) {
      result = 'win';
      reason = `💪 قوة أعلى (${myCard.power} > ${enemyCard.power})`;
      turinLosesNext = myCard.name === 'Turin' ? true : false;
    } else if (myCard.power < enemyCard.power) {
      result = 'lose';
      reason = `💔 قوة أقل (${myCard.power} < ${enemyCard.power})`;
      turinLosesNext = myCard.name === 'Turin' ? true : false;
    } else {
      result = 'draw';
      reason = '🤝 تعادل (قوة متساوية)';
      turinLosesNext = myCard.name === 'Turin' ? true : false;
    }

    if (result === 'win') {
      enyHp -= 1;
      hpChange = `HP الخصم: ${enyHp + 1} → ${enyHp}`;
      if (myCard.name === 'Sakura Haruno') {
        myHp += 1;
        hpChange += `  |  💊 Sakura: HP أنت +1 → ${myHp}`;
      }
    } else if (result === 'lose') {
      myHp -= 1;
      hpChange = `HP أنت: ${myHp + 1} → ${myHp}`;
    }

    logs.push({
      round,
      attacker: myCard.name,
      defender: enemyCard.name,
      result,
      reason,
      hpChange,
    });
    round++;
  }

  const finalResult = myHp <= 0 ? 'lose' : enyHp <= 0 ? 'win' : 'draw';
  logs.push({
    round: -1,
    attacker: '',
    defender: '',
    result: finalResult,
    reason: finalResult === 'win'
      ? `🏆 انتصرت! HP أنت: ${myHp} | HP خصم: ${enyHp}`
      : finalResult === 'lose'
      ? `💀 خسرت! HP أنت: ${myHp} | HP خصم: ${enyHp}`
      : `🤝 تعادل! HP أنت: ${myHp} | HP خصم: ${enyHp}`,
  });

  return logs;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SandboxScreen() {
  const router = useRouter();

  // بطاقة اللاعب
  const [myName,    setMyName]    = useState('بطاقتي');
  const [myPower,   setMyPower]   = useState('50');
  const [myHp,      setMyHp]      = useState('3');
  const [myTags,    setMyTags]    = useState<string[]>([]);
  const [myPreset,  setMyPreset]  = useState<string | null>(null);

  // بطاقة الخصم
  const [enName,    setEnName]    = useState('الخصم');
  const [enPower,   setEnPower]   = useState('50');
  const [enHp,      setEnHp]      = useState('3');
  const [enTags,    setEnTags]    = useState<string[]>([]);
  const [enPreset,  setEnPreset]  = useState<string | null>(null);

  const [logs, setLogs] = useState<BattleLog[] | null>(null);

  function applyPreset(side: 'my' | 'en', cardName: string) {
    const card = SPECIAL_CARDS.find(c => c.name === cardName);
    if (!card) return;
    if (side === 'my') {
      setMyName(card.name); setMyTags(card.tags); setMyPreset(card.name);
    } else {
      setEnName(card.name); setEnTags(card.tags); setEnPreset(card.name);
    }
  }

  function toggleTag(side: 'my' | 'en', tag: string) {
    const setter = side === 'my' ? setMyTags : setEnTags;
    setter(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function runSim() {
    const myCard: SimCard = {
      name:   myPreset ?? myName,
      power:  parseInt(myPower) || 50,
      health: parseInt(myHp)    || 3,
      tags:   myTags,
      emoji:  SPECIAL_CARDS.find(c => c.name === myPreset)?.emoji ?? '🃏',
      color:  SPECIAL_CARDS.find(c => c.name === myPreset)?.color ?? COLOR.gold,
    };
    const enCard: SimCard = {
      name:   enPreset ?? enName,
      power:  parseInt(enPower) || 50,
      health: parseInt(enHp)    || 3,
      tags:   enTags,
      emoji:  SPECIAL_CARDS.find(c => c.name === enPreset)?.emoji ?? '👾',
      color:  SPECIAL_CARDS.find(c => c.name === enPreset)?.color ?? '#f87171',
    };
    setLogs(simulateBattle(myCard, enCard));
  }

  const finalLog = logs?.find(l => l.round === -1);
  const roundLogs = logs?.filter(l => l.round > 0) ?? [];

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backText}>← رجوع</Text>
          </TouchableOpacity>

          <Text style={styles.title}>🧪 البيئة التجريبية</Text>
          <Text style={styles.subtitle}>اختر كروتك وشغّل المحاكاة بدون ما تلعب فعلياً</Text>

          {/* ── الصف: بطاقتي vs الخصم ── */}
          <View style={styles.row}>

            {/* بطاقتي */}
            <View style={[styles.panel, { flex: 1 }]}>
              <Text style={[styles.panelTitle, { color: '#60a5fa' }]}>🃏 بطاقتي</Text>

              {/* Preset */}
              <Text style={styles.label}>كرت سريع:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACE.sm }}>
                {SPECIAL_CARDS.map(c => (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => applyPreset('my', c.name)}
                    style={[styles.presetBtn, myPreset === c.name && { borderColor: c.color, backgroundColor: c.color + '22' }]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
                    <Text style={[styles.presetName, { color: c.color }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>الاسم</Text>
              <TextInput
                style={styles.input}
                value={myName}
                onChangeText={v => { setMyName(v); setMyPreset(null); }}
                placeholderTextColor='#555'
              />

              <View style={styles.numRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>القوة</Text>
                  <TextInput style={styles.input} value={myPower} onChangeText={setMyPower} keyboardType='numeric' placeholderTextColor='#555' />
                </View>
                <View style={{ width: SPACE.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>الصحة</Text>
                  <TextInput style={styles.input} value={myHp} onChangeText={setMyHp} keyboardType='numeric' placeholderTextColor='#555' />
                </View>
              </View>

              <Text style={styles.label}>التاجات:</Text>
              <View style={styles.tagWrap}>
                {ABILITY_TAGS.filter(t => t.key !== 'none').map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => { toggleTag('my', t.key); setMyPreset(null); }}
                    style={[styles.tagBtn, myTags.includes(t.key) && { borderColor: t.color, backgroundColor: t.color + '22' }]}
                  >
                    <Text style={[styles.tagTxt, myTags.includes(t.key) && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.vsCol}>
              <Text style={styles.vs}>VS</Text>
            </View>

            {/* الخصم */}
            <View style={[styles.panel, { flex: 1 }]}>
              <Text style={[styles.panelTitle, { color: '#f87171' }]}>👾 الخصم</Text>

              <Text style={styles.label}>كرت سريع:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACE.sm }}>
                {SPECIAL_CARDS.map(c => (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => applyPreset('en', c.name)}
                    style={[styles.presetBtn, enPreset === c.name && { borderColor: c.color, backgroundColor: c.color + '22' }]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
                    <Text style={[styles.presetName, { color: c.color }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>الاسم</Text>
              <TextInput
                style={styles.input}
                value={enName}
                onChangeText={v => { setEnName(v); setEnPreset(null); }}
                placeholderTextColor='#555'
              />

              <View style={styles.numRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>القوة</Text>
                  <TextInput style={styles.input} value={enPower} onChangeText={setEnPower} keyboardType='numeric' placeholderTextColor='#555' />
                </View>
                <View style={{ width: SPACE.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>الصحة</Text>
                  <TextInput style={styles.input} value={enHp} onChangeText={setEnHp} keyboardType='numeric' placeholderTextColor='#555' />
                </View>
              </View>

              <Text style={styles.label}>التاجات:</Text>
              <View style={styles.tagWrap}>
                {ABILITY_TAGS.filter(t => t.key !== 'none').map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => { toggleTag('en', t.key); setEnPreset(null); }}
                    style={[styles.tagBtn, enTags.includes(t.key) && { borderColor: t.color, backgroundColor: t.color + '22' }]}
                  >
                    <Text style={[styles.tagTxt, enTags.includes(t.key) && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* زر المحاكاة */}
          <TouchableOpacity style={styles.runBtn} onPress={runSim} activeOpacity={0.85}>
            <Text style={styles.runBtnText}>▶ شغّل المحاكاة</Text>
          </TouchableOpacity>

          {/* النتائج */}
          {logs && (
            <View style={styles.logsWrap}>
              {/* النتيجة النهائية */}
              {finalLog && (
                <View style={[
                  styles.finalBadge,
                  finalLog.result === 'win'  && { borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' },
                  finalLog.result === 'lose' && { borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' },
                  finalLog.result === 'draw' && { borderColor: '#facc15', backgroundColor: 'rgba(250,204,21,0.1)' },
                ]}>
                  <Text style={[
                    styles.finalText,
                    finalLog.result === 'win'  && { color: '#4ade80' },
                    finalLog.result === 'lose' && { color: '#f87171' },
                    finalLog.result === 'draw' && { color: '#facc15' },
                  ]}>
                    {finalLog.reason}
                  </Text>
                </View>
              )}

              {/* سجل الجولات */}
              <Text style={styles.logsTitle}>📋 سجل الجولات</Text>
              {roundLogs.map((log, i) => (
                <View key={i} style={[
                  styles.logRow,
                  log.result === 'win'  && { borderLeftColor: '#4ade80' },
                  log.result === 'lose' && { borderLeftColor: '#f87171' },
                  log.result === 'draw' && { borderLeftColor: '#facc15' },
                ]}>
                  <Text style={styles.logRound}>جولة {log.round}</Text>
                  <Text style={styles.logResult}>
                    {log.result === 'win' ? '✅ فوز' : log.result === 'lose' ? '❌ خسارة' : '🤝 تعادل'}
                  </Text>
                  <Text style={styles.logReason}>{log.reason}</Text>
                  {!!log.hpChange && <Text style={styles.logHp}>{log.hpChange}</Text>}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingHorizontal: SPACE.md, paddingTop: SPACE.xl, paddingBottom: SPACE.xxl },
  backBtn:      { alignSelf: 'flex-start', paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.3)', marginBottom: SPACE.lg },
  backText:     { color: COLOR.gold, fontSize: FONT.md },
  title:        { fontSize: FONT.xl, color: COLOR.gold, textAlign: 'center', marginBottom: SPACE.xs },
  subtitle:     { fontSize: FONT.sm, color: COLOR.textMuted, textAlign: 'center', marginBottom: SPACE.lg },

  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  vsCol:        { alignSelf: 'center', paddingHorizontal: SPACE.xs },
  vs:           { fontSize: FONT.lg, color: COLOR.gold, fontWeight: '900' },

  panel:        { ...GLASS_PANEL, padding: SPACE.md, overflow: 'hidden' },
  panelTitle:   { fontSize: FONT.md, fontWeight: '800', textAlign: 'center', marginBottom: SPACE.sm },

  label:        { fontSize: FONT.xs, color: COLOR.textMuted, marginBottom: 2 },
  input:        { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: FONT.sm, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, marginBottom: SPACE.sm },
  numRow:       { flexDirection: 'row' },

  presetBtn:    { alignItems: 'center', marginRight: SPACE.xs, padding: SPACE.xs, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minWidth: 60 },
  presetName:   { fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2 },

  tagWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagBtn:       { paddingHorizontal: SPACE.xs, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 4 },
  tagTxt:       { fontSize: 9, color: '#aaa' },

  runBtn:       { marginTop: SPACE.lg, backgroundColor: '#059669', borderRadius: RADIUS.md, paddingVertical: SPACE.md, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  runBtnText:   { color: '#fff', fontSize: FONT.lg, fontWeight: '800', letterSpacing: 1 },

  logsWrap:     { marginTop: SPACE.xl },
  logsTitle:    { fontSize: FONT.md, color: COLOR.gold, fontWeight: '700', marginBottom: SPACE.sm },
  finalBadge:   { borderRadius: RADIUS.md, borderWidth: 1.5, padding: SPACE.md, marginBottom: SPACE.lg, alignItems: 'center' },
  finalText:    { fontSize: FONT.lg, fontWeight: '900', textAlign: 'center' },

  logRow:       { borderLeftWidth: 3, borderLeftColor: '#555', paddingLeft: SPACE.sm, marginBottom: SPACE.sm, paddingVertical: SPACE.xs },
  logRound:     { fontSize: FONT.xs, color: COLOR.textMuted },
  logResult:    { fontSize: FONT.sm, fontWeight: '700', color: '#fff' },
  logReason:    { fontSize: FONT.xs, color: '#ccc', marginTop: 2 },
  logHp:        { fontSize: FONT.xs, color: '#60a5fa', marginTop: 2 },
});
