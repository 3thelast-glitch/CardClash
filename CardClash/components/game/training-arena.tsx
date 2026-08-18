import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useCards } from '@/lib/game/useCards';
import { determineRoundWinner } from '@/lib/game/cards-data-exports';
import { Card, Element, ELEMENT_COLORS, ELEMENT_EMOJI } from '@/lib/game/types';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';

const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'lightning', 'wind'];

function cardLabel(card: Card) {
  return card.nameAr || card.name;
}

function advantageLabel(value: 'strong' | 'weak' | 'neutral') {
  if (value === 'strong') return 'تفوق عنصري ×1.25';
  if (value === 'weak') return 'ضعف عنصري ×0.75';
  return 'تفاعل عنصري محايد ×1.00';
}

function CardChoice({ card, selected, onPress }: { card: Card; selected: boolean; onPress: () => void }) {
  const color = ELEMENT_COLORS[card.element];
  return (
    <TouchableOpacity
      style={[s.choice, selected && { borderColor: color, backgroundColor: `${color}1a` }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={[s.choiceElement, { backgroundColor: `${color}24` }]}>
        <Text style={s.choiceEmoji}>{card.emoji || ELEMENT_EMOJI[card.element]}</Text>
      </View>
      <Text style={s.choiceName} numberOfLines={1}>{cardLabel(card)}</Text>
      <Text style={s.choiceStats}>⚔ {card.attack}   🛡 {card.defense}</Text>
    </TouchableOpacity>
  );
}

export function TrainingArena() {
  const cards = useCards();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const trainingCards = useMemo(() => {
    const onePerElement = ELEMENTS
      .map(element => cards.find(card => card.element === element))
      .filter((card): card is Card => Boolean(card));
    return onePerElement.length >= 2 ? onePerElement : cards.slice(0, 5);
  }, [cards]);

  useEffect(() => {
    if (trainingCards.length < 2) return;
    setPlayerId(current => trainingCards.some(card => card.id === current) ? current : trainingCards[0].id);
    setOpponentId(current => trainingCards.some(card => card.id === current) ? current : trainingCards[1].id);
  }, [trainingCards]);

  const playerCard = trainingCards.find(card => card.id === playerId) ?? trainingCards[0];
  const opponentCard = trainingCards.find(card => card.id === opponentId) ?? trainingCards[1];
  const result = playerCard && opponentCard
    ? determineRoundWinner(playerCard, opponentCard)
    : null;

  if (!playerCard || !opponentCard || !result) {
    return (
      <View style={s.loadingCard}><Text style={s.loadingText}>يتم تجهيز بطاقات التدريب…</Text></View>
    );
  }

  const playerWon = result.winner === 'player';
  const opponentWon = result.winner === 'bot';
  const outcomeTitle = playerWon ? 'تفوقت بطاقة اللاعب' : opponentWon ? 'تفوقت بطاقة الخصم' : 'تعادل الضرر';
  const outcomeColor = playerWon ? '#4ade80' : opponentWon ? '#f87171' : '#fbbf24';

  const choosePlayer = (id: string) => {
    setPlayerId(id);
    setHasRun(false);
  };
  const chooseOpponent = (id: string) => {
    setOpponentId(id);
    setHasRun(false);
  };
  const swapSides = () => {
    setPlayerId(opponentCard.id);
    setOpponentId(playerCard.id);
    setHasRun(false);
  };

  return (
    <View testID="training-arena" style={s.root}>
      <View style={s.headingRow}>
        <View style={s.headingIcon}><Text style={s.headingIconText}>🧪</Text></View>
        <View style={s.headingTextWrap}>
          <Text style={s.headingTitle}>ساحة تدريب مصغرة</Text>
          <Text style={s.headingSub}>جرّب قاعدة الجولة الفعلية من دون تغيير نتائجك أو بطاقاتك.</Text>
        </View>
      </View>

      <Text style={s.selectorLabel}>اختر بطاقة اللاعب</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choices}>
        {trainingCards.map(card => (
          <CardChoice key={`player-${card.id}`} card={card} selected={card.id === playerCard.id} onPress={() => choosePlayer(card.id)} />
        ))}
      </ScrollView>

      <Text style={s.selectorLabel}>اختر بطاقة الخصم</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choices}>
        {trainingCards.map(card => (
          <CardChoice key={`opponent-${card.id}`} card={card} selected={card.id === opponentCard.id} onPress={() => chooseOpponent(card.id)} />
        ))}
      </ScrollView>

      <View style={[s.matchup, isLandscape && s.matchupLandscape]}>
        <View style={[s.fighter, { borderColor: `${ELEMENT_COLORS[playerCard.element]}70` }]}>
          <Text style={s.fighterRole}>بطاقتك</Text>
          <Text style={s.fighterEmoji}>{playerCard.emoji || ELEMENT_EMOJI[playerCard.element]}</Text>
          <Text style={s.fighterName} numberOfLines={1}>{cardLabel(playerCard)}</Text>
          <Text style={s.fighterStats}>⚔ {playerCard.attack}  ·  🛡 {playerCard.defense}</Text>
        </View>

        <View style={s.vsWrap}>
          <Text style={s.vs}>VS</Text>
          <TouchableOpacity style={s.swapButton} onPress={swapSides} activeOpacity={0.75}>
            <Text style={s.swapText}>↔ تبديل</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.fighter, { borderColor: `${ELEMENT_COLORS[opponentCard.element]}70` }]}>
          <Text style={[s.fighterRole, { color: '#fca5a5' }]}>بطاقة الخصم</Text>
          <Text style={s.fighterEmoji}>{opponentCard.emoji || ELEMENT_EMOJI[opponentCard.element]}</Text>
          <Text style={s.fighterName} numberOfLines={1}>{cardLabel(opponentCard)}</Text>
          <Text style={s.fighterStats}>⚔ {opponentCard.attack}  ·  🛡 {opponentCard.defense}</Text>
        </View>
      </View>

      <TouchableOpacity
        testID="training-run-button"
        style={s.runButton}
        onPress={() => setHasRun(true)}
        activeOpacity={0.84}
      >
        <Text style={s.runButtonText}>حلّل نتيجة الجولة  ⚔️</Text>
      </TouchableOpacity>

      {hasRun && (
        <View style={[s.resultCard, { borderColor: `${outcomeColor}66` }]}>
          <Text style={[s.resultTitle, { color: outcomeColor }]}>{outcomeTitle}</Text>
          <View style={s.damageRow}>
            <View style={s.damageSide}>
              <Text style={s.damageLabel}>ضررك</Text>
              <Text style={[s.damageValue, { color: '#4ade80' }]}>{result.playerDamage}</Text>
              <Text style={s.damageMeta}>{advantageLabel(result.playerElementAdvantage)}</Text>
            </View>
            <View style={s.damageDivider} />
            <View style={s.damageSide}>
              <Text style={s.damageLabel}>ضرر الخصم</Text>
              <Text style={[s.damageValue, { color: '#f87171' }]}>{result.botDamage}</Text>
              <Text style={s.damageMeta}>{advantageLabel(result.botElementAdvantage)}</Text>
            </View>
          </View>
          <Text style={s.resultExplanation}>
            تمت المقارنة بعد تطبيق الهجوم والدفاع ومعامل العنصر وأي قدرة فريدة للبطاقة. غيّر البطاقات ثم أعد التحليل لترى الفرق.
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: 'rgba(8,10,24,0.9)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(96,165,250,0.38)', padding: SPACE.lg, gap: SPACE.md },
  loadingCard: { padding: SPACE.xl, alignItems: 'center', backgroundColor: 'rgba(8,10,24,0.85)', borderRadius: RADIUS.lg },
  loadingText: { color: '#94a3b8', fontSize: FONT.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  headingIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(96,165,250,0.16)' },
  headingIconText: { fontSize: 22 },
  headingTextWrap: { flex: 1, gap: 2 },
  headingTitle: { color: '#dbeafe', fontSize: FONT.base, fontWeight: '900' },
  headingSub: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 17 },
  selectorLabel: { color: '#cbd5e1', fontSize: FONT.sm, fontWeight: '800', marginTop: SPACE.xs },
  choices: { gap: SPACE.sm, paddingRight: SPACE.md },
  choice: { width: 132, minHeight: 92, padding: SPACE.sm, gap: 3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', backgroundColor: 'rgba(255,255,255,0.03)' },
  choiceElement: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  choiceEmoji: { fontSize: 15 },
  choiceName: { color: '#e2e8f0', fontSize: FONT.xs, fontWeight: '800' },
  choiceStats: { color: '#94a3b8', fontSize: 10 },
  matchup: { gap: SPACE.sm, alignItems: 'center' },
  matchupLandscape: { flexDirection: 'row', justifyContent: 'center' },
  fighter: { width: '100%', maxWidth: 250, alignItems: 'center', gap: 3, padding: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.035)' },
  fighterRole: { color: '#86efac', fontSize: FONT.xs },
  fighterEmoji: { fontSize: 28 },
  fighterName: { color: '#f1f5f9', fontSize: FONT.sm, fontWeight: '900', maxWidth: '100%' },
  fighterStats: { color: '#94a3b8', fontSize: FONT.xs },
  vsWrap: { alignItems: 'center', gap: 4 },
  vs: { color: COLOR.gold, fontSize: FONT.lg, fontWeight: '900', letterSpacing: 1 },
  swapButton: { paddingHorizontal: SPACE.md, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(228,165,42,0.28)', backgroundColor: 'rgba(228,165,42,0.08)' },
  swapText: { color: '#fcd34d', fontSize: FONT.xs },
  runButton: { backgroundColor: '#2563eb', borderRadius: RADIUS.md, paddingVertical: SPACE.md, alignItems: 'center', borderWidth: 1, borderColor: '#60a5fa' },
  runButtonText: { color: '#eff6ff', fontSize: FONT.sm, fontWeight: '900' },
  resultCard: { backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 1, borderRadius: RADIUS.md, padding: SPACE.md, gap: SPACE.sm },
  resultTitle: { textAlign: 'center', fontSize: FONT.base, fontWeight: '900' },
  damageRow: { flexDirection: 'row', alignItems: 'stretch' },
  damageSide: { flex: 1, alignItems: 'center', gap: 2 },
  damageDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.18)' },
  damageLabel: { color: '#cbd5e1', fontSize: FONT.xs },
  damageValue: { fontSize: FONT.xxl, fontWeight: '900' },
  damageMeta: { color: '#64748b', fontSize: 10, textAlign: 'center' },
  resultExplanation: { color: '#94a3b8', fontSize: FONT.xs, lineHeight: 18, textAlign: 'center', marginTop: 2 },
});
