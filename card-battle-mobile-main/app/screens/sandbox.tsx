import React, { useState, useMemo, useCallback } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList, TextInput, Image,
  useWindowDimensions,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL } from '@/components/ui/design-tokens';
import { ALL_CARDS, determineRoundWinner } from '@/lib/game/cards-data-exports';
import {
  Card, AbilityType,
  ELEMENT_EMOJI, ELEMENT_COLORS,
  GENDER_EMOJI, GENDER_COLORS,
  CLASS_EMOJI, RACE_EMOJI,
} from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';

// ─── قائمة القدرات للإظهار ───────────────────────────────────────────────────────────────────
const ABILITIES: { key: AbilityType; labelAr: string; emoji: string; color: string }[] = [
  { key: 'LogicalEncounter',    labelAr: 'مواجهة منطقية', emoji: '🧠', color: '#60a5fa' },
  { key: 'Recall',              labelAr: 'استدعاء',       emoji: '🔄', color: '#a78bfa' },
  { key: 'Protection',          labelAr: 'حماية',           emoji: '🛡️', color: '#34d399' },
  { key: 'Arise',               labelAr: 'بعث',              emoji: '⬆️', color: '#fbbf24' },
  { key: 'Reinforcement',       labelAr: 'تعزيز',           emoji: '💪', color: '#f97316' },
  { key: 'Wipe',                labelAr: 'محو',               emoji: '💥', color: '#f87171' },
  { key: 'Purge',               labelAr: 'تطهير',            emoji: '✨', color: '#e879f9' },
  { key: 'HalvePoints',         labelAr: 'تنصيف',           emoji: '✂️', color: '#fb923c' },
  { key: 'Seal',                labelAr: 'ختم',               emoji: '🔒', color: '#64748b' },
  { key: 'DoubleOrNothing',     labelAr: 'ضعف أو لا شيء', emoji: '🎲', color: '#facc15' },
  { key: 'StarSuperiority',     labelAr: 'تفوق النجوم',  emoji: '⭐', color: '#fbbf24' },
  { key: 'Reduction',           labelAr: 'خفض',               emoji: '⬇️', color: '#94a3b8' },
  { key: 'Sacrifice',           labelAr: 'تضحية',            emoji: '💔', color: '#ef4444' },
  { key: 'Popularity',          labelAr: 'شعبية',           emoji: '👑', color: '#f472b6' },
  { key: 'Eclipse',             labelAr: 'كسوف',              emoji: '🌑', color: '#1e293b' },
  { key: 'CancelAbility',       labelAr: 'إلغاء قدرة',    emoji: '❌', color: '#f87171' },
  { key: 'Revive',              labelAr: 'إحياء',             emoji: '💚', color: '#4ade80' },
  { key: 'Lifesteal',           labelAr: 'سرقة حياة',    emoji: '🩸', color: '#f43f5e' },
  { key: 'Revenge',             labelAr: 'انتقام',           emoji: '🗡️', color: '#dc2626' },
  { key: 'Greed',               labelAr: 'جشع',               emoji: '🥇', color: '#eab308' },
  { key: 'Weakening',           labelAr: 'إضعاف',            emoji: '💧', color: '#38bdf8' },
  { key: 'Trap',                labelAr: 'فخ',                emoji: '🚨', color: '#f59e0b' },
  { key: 'Shield',              labelAr: 'درع',               emoji: '🛡', color: '#22d3ee' },
  { key: 'Explosion',           labelAr: 'انفجار',           emoji: '💣', color: '#ef4444' },
  { key: 'DoublePoints',        labelAr: 'مضاعفة نقاط', emoji: '×2', color: '#a3e635' },
  { key: 'Pool',                labelAr: 'مجموعة',           emoji: '🪙', color: '#818cf8' },
  { key: 'Skip',                labelAr: 'تخطي',              emoji: '⏭️', color: '#94a3b8' },
  { key: 'Suicide',             labelAr: 'انتحار',           emoji: '☠️', color: '#78716c' },
];

const RARITY_COLORS: Record<string, string> = {
  common:    '#9ca3af',
  rare:      '#60a5fa',
  epic:      '#c084fc',
  legendary: '#fbbf24',
  special:   '#e879f9',
};

// ─── كرت فارغ ────────────────────────────────────────────────────────────────────────────────────────────────────
const EMPTY_CARD: Card = {
  id: '', name: '', nameAr: 'اختر كرت', nameEn: '',
  attack: 10, defense: 5, hp: 3,
  race: 'human', cardClass: 'warrior', element: 'fire',
  rarity: 'common', stars: 1,
};

// ─── CardPickerModal ───────────────────────────────────────────────────────────────────────────────
function CardPickerModal({
  visible, onClose, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (card: Card) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => ALL_CARDS.filter(c =>
      c.nameAr?.includes(search) || c.name.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mp.overlay}>
        <View style={mp.sheet}>
          <View style={mp.topBar}>
            <Text style={mp.title}>🃏 اختر كرت</Text>
            <TouchableOpacity onPress={onClose} style={mp.closeBtn}>
              <Text style={mp.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={mp.search}
            placeholder="بحث بالاسم..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            numColumns={3}
            contentContainerStyle={{ padding: SPACE.sm, gap: SPACE.sm }}
            columnWrapperStyle={{ gap: SPACE.sm }}
            renderItem={({ item }) => {
              const rarityColor = RARITY_COLORS[item.rarity ?? 'common'];
              const img = getCardImage(item);
              return (
                <TouchableOpacity
                  style={[mp.cardThumb, { borderColor: rarityColor + '99' }]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.8}
                >
                  {img ? (
                    <Image source={img} style={mp.thumbImg} resizeMode="cover" />
                  ) : (
                    <View style={[mp.thumbPlaceholder, { backgroundColor: rarityColor + '22' }]}>
                      <Text style={{ fontSize: 26 }}>
                        {ELEMENT_EMOJI[item.element] ?? '🃏'}
                      </Text>
                    </View>
                  )}
                  <Text style={[mp.thumbName, { color: rarityColor }]} numberOfLines={2}>
                    {item.nameAr || item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── AbilityPickerModal ───────────────────────────────────────────────────────────────────────────
function AbilityPickerModal({
  visible, current, onClose, onSelect,
}: {
  visible: boolean;
  current: AbilityType | undefined;
  onClose: () => void;
  onSelect: (ab: AbilityType | undefined) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mp.overlay}>
        <View style={mp.sheet}>
          <View style={mp.topBar}>
            <Text style={mp.title}>⚡ اختر قدرة</Text>
            <TouchableOpacity onPress={onClose} style={mp.closeBtn}>
              <Text style={mp.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACE.sm }}>
            {/* بدون قدرة */}
            <TouchableOpacity
              style={[mp.abilityRow, !current && mp.abilityRowActive]}
              onPress={() => { onSelect(undefined); onClose(); }}
            >
              <Text style={{ fontSize: 22 }}>❌</Text>
              <Text style={[mp.abilityLabel, !current && { color: '#fff', fontWeight: '800' }]}>بدون قدرة</Text>
            </TouchableOpacity>
            {ABILITIES.map(a => (
              <TouchableOpacity
                key={a.key}
                style={[mp.abilityRow, current === a.key && { borderColor: a.color, backgroundColor: a.color + '22' }]}
                onPress={() => { onSelect(a.key); onClose(); }}
              >
                <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[mp.abilityLabel, current === a.key && { color: a.color, fontWeight: '800' }]}>
                    {a.labelAr}
                  </Text>
                  <Text style={mp.abilityKey}>{a.key}</Text>
                </View>
                {current === a.key && <Text style={{ color: a.color, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── BattleCard UI ──────────────────────────────────────────────────────────────────────────────────────────────
function BattleCardUI({
  card, ability, side, onPickCard, onPickAbility, result,
}: {
  card: Card;
  ability: AbilityType | undefined;
  side: 'player' | 'bot';
  onPickCard: () => void;
  onPickAbility: () => void;
  result: 'win' | 'lose' | 'draw' | null;
}) {
  const rarityColor = RARITY_COLORS[card.rarity ?? 'common'];
  const elemColor   = ELEMENT_COLORS[card.element];
  const img = card.id ? getCardImage(card) : null;

  const abilityInfo = ability ? ABILITIES.find(a => a.key === ability) : null;

  const borderColor = result === 'win' ? '#4ade80'
    : result === 'lose' ? '#f87171'
    : result === 'draw' ? '#facc15'
    : rarityColor;

  return (
    <View style={[bc.wrapper, { borderColor: borderColor + 'cc' }]}>
      {/* بادج الندرة */}
      {card.rarity && (
        <View style={[bc.rarityBadge, { backgroundColor: rarityColor + '22', borderColor: rarityColor + '88' }]}>
          <Text style={[bc.rarityTxt, { color: rarityColor }]}>
            {card.rarity === 'legendary' ? '★ أسطوري' :
             card.rarity === 'epic'      ? '◆ ملحمي' :
             card.rarity === 'rare'      ? '◉ نادر' :
             card.rarity === 'special'   ? '✶ خاص' : '○ عادي'}
          </Text>
        </View>
      )}

      {/* صورة الكرت */}
      <TouchableOpacity onPress={onPickCard} activeOpacity={0.85} style={bc.imgWrap}>
        {img ? (
          <Image source={img} style={bc.img} resizeMode="cover" />
        ) : (
          <View style={[bc.imgPlaceholder, { backgroundColor: rarityColor + '22' }]}>
            <Text style={{ fontSize: 48 }}>{ELEMENT_EMOJI[card.element]}</Text>
            <Text style={[bc.pickHint, { color: rarityColor }]}>اضغط لاختيار كرت</Text>
          </View>
        )}
        {/* علامة تغيير */}
        <View style={bc.changeTag}>
          <Text style={bc.changeTxt}>✏️</Text>
        </View>
      </TouchableOpacity>

      {/* اسم الكرت */}
      <Text style={[bc.cardName, { color: rarityColor }]} numberOfLines={2}>
        {card.id ? (card.nameAr || card.name) : 'اضغط لاختيار كرت'}
      </Text>

      {/* النجوم */}
      {(card.stars ?? 0) > 0 && (
        <Text style={bc.stars}>
          {'\u2605'.repeat(card.stars ?? 0)}
        </Text>
      )}

      {/* إحصائيات */}
      <View style={bc.statsRow}>
        <View style={[bc.statBadge, { backgroundColor: '#ef444433' }]}>
          <Text style={bc.statEmoji}>⚔️</Text>
          <Text style={[bc.statVal, { color: '#ef4444' }]}>{card.attack}</Text>
        </View>
        <View style={[bc.statBadge, { backgroundColor: elemColor + '33' }]}>
          <Text style={bc.statEmoji}>{ELEMENT_EMOJI[card.element]}</Text>
        </View>
        {card.gender && (
          <View style={[bc.statBadge, { backgroundColor: GENDER_COLORS[card.gender] + '33' }]}>
            <Text style={bc.statEmoji}>{GENDER_EMOJI[card.gender]}</Text>
          </View>
        )}
        <View style={[bc.statBadge, { backgroundColor: '#22c55e33' }]}>
          <Text style={bc.statEmoji}>💧</Text>
          <Text style={[bc.statVal, { color: '#22c55e' }]}>{card.defense}</Text>
        </View>
      </View>

      {/* زر القدرة */}
      <TouchableOpacity
        onPress={onPickAbility}
        style={[
          bc.abilityBtn,
          abilityInfo && { borderColor: abilityInfo.color, backgroundColor: abilityInfo.color + '22' }
        ]}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 16 }}>{abilityInfo?.emoji ?? '⚡'}</Text>
        <Text style={[bc.abilityTxt, abilityInfo && { color: abilityInfo.color }]}>
          {abilityInfo ? abilityInfo.labelAr : 'اضغط لاختيار قدرة'}
        </Text>
      </TouchableOpacity>

      {/* نتيجة */}
      {result && (
        <View style={[
          bc.resultBadge,
          result === 'win'  && { backgroundColor: '#4ade8022', borderColor: '#4ade80' },
          result === 'lose' && { backgroundColor: '#f8717122', borderColor: '#f87171' },
          result === 'draw' && { backgroundColor: '#facc1522', borderColor: '#facc15' },
        ]}>
          <Text style={[
            bc.resultTxt,
            result === 'win'  && { color: '#4ade80' },
            result === 'lose' && { color: '#f87171' },
            result === 'draw' && { color: '#facc15' },
          ]}>
            {result === 'win' ? '✅ فوز' : result === 'lose' ? '❌ خسارة' : '🤝 تعادل'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── SandboxScreen ─────────────────────────────────────────────────────────────────────────────────────────────────────
export default function SandboxScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [playerCard,    setPlayerCard]    = useState<Card>(EMPTY_CARD);
  const [botCard,       setBotCard]       = useState<Card>(EMPTY_CARD);
  const [playerAbility, setPlayerAbility] = useState<AbilityType | undefined>(undefined);
  const [botAbility,    setBotAbility]    = useState<AbilityType | undefined>(undefined);

  // modal state
  const [showPickPlayer, setShowPickPlayer]   = useState(false);
  const [showPickBot,    setShowPickBot]       = useState(false);
  const [showAbPlayer,   setShowAbPlayer]      = useState(false);
  const [showAbBot,      setShowAbBot]         = useState(false);

  // نتيجة
  const [simResult, setSimResult] = useState<{
    playerRes: 'win' | 'lose' | 'draw';
    botRes:    'win' | 'lose' | 'draw';
    log: string[];
  } | null>(null);

  const canSim = playerCard.id && botCard.id;

  const runSim = useCallback(() => {
    if (!canSim) return;
    const res = determineRoundWinner(playerCard, botCard, [], []);
    const log: string[] = [];

    const playerAdv = res.playerElementAdvantage;
    const botAdv    = res.botElementAdvantage;

    if (playerAdv !== 'neutral')
      log.push(`${ELEMENT_EMOJI[playerCard.element]} تفوق عنصري: ${playerAdv === 'strong' ? 'قوي ⬆️' : 'ضعيف ⬇️'}`);
    if (botAdv !== 'neutral')
      log.push(`${ELEMENT_EMOJI[botCard.element]} تفوق عنصري خصم: ${botAdv === 'strong' ? 'قوي ⬆️' : 'ضعيف ⬇️'}`);

    log.push(`⚔️ ضرر اللاعب الأساسي: ${res.playerBaseDamage}  →  صافي: ${res.playerDamage}`);
    log.push(`🤖 ضرر البوت الأساسي: ${res.botBaseDamage}  →  صافي: ${res.botDamage}`);

    if (playerAbility) {
      const ab = ABILITIES.find(a => a.key === playerAbility);
      log.push(`⚡ قدرة اللاعب: ${ab?.emoji ?? ''} ${ab?.labelAr ?? playerAbility}`);
    }
    if (botAbility) {
      const ab = ABILITIES.find(a => a.key === botAbility);
      log.push(`⚡ قدرة البوت: ${ab?.emoji ?? ''} ${ab?.labelAr ?? botAbility}`);
    }

    const playerRes: 'win' | 'lose' | 'draw' =
      res.winner === 'player' ? 'win' :
      res.winner === 'bot'    ? 'lose' : 'draw';
    const botRes: 'win' | 'lose' | 'draw' =
      res.winner === 'bot'    ? 'win' :
      res.winner === 'player' ? 'lose' : 'draw';

    setSimResult({ playerRes, botRes, log });
  }, [playerCard, botCard, playerAbility, botAbility, canSim]);

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>🧪 البيئة التجريبية</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── ميدان المعركة ── */}
          <View style={s.arena}>

            {/* اللاعب */}
            <BattleCardUI
              card={playerCard}
              ability={playerAbility}
              side="player"
              onPickCard={() => setShowPickPlayer(true)}
              onPickAbility={() => setShowAbPlayer(true)}
              result={simResult?.playerRes ?? null}
            />

            {/* VS + زر التشغيل */}
            <View style={s.vsCol}>
              <View style={s.vsCircle}>
                <Text style={s.vsEmoji}>⚔️</Text>
                <Text style={s.vsText}>VS</Text>
              </View>
              <TouchableOpacity
                style={[s.runBtn, !canSim && s.runBtnDisabled]}
                onPress={runSim}
                disabled={!canSim}
                activeOpacity={0.85}
              >
                <Text style={s.runTxt}>{canSim ? '🔍 حاكي' : '✕'}</Text>
              </TouchableOpacity>
            </View>

            {/* البوت */}
            <BattleCardUI
              card={botCard}
              ability={botAbility}
              side="bot"
              onPickCard={() => setShowPickBot(true)}
              onPickAbility={() => setShowAbBot(true)}
              result={simResult?.botRes ?? null}
            />
          </View>

          {/* ── سجل المحاكاة ── */}
          {simResult && (
            <View style={s.logBox}>
              <Text style={s.logTitle}>📊 تحليل الجولة</Text>
              {simResult.log.map((line, i) => (
                <Text key={i} style={s.logLine}>{line}</Text>
              ))}
              <TouchableOpacity style={s.resetBtn} onPress={() => setSimResult(null)} activeOpacity={0.8}>
                <Text style={s.resetTxt}>🔄 إعادة تعيين</Text>
              </TouchableOpacity>
            </View>
          )}

          {!canSim && (
            <Text style={s.hint}>☝️ اختر كرتين لتفعيل المحاكاة</Text>
          )}
        </ScrollView>

        {/* ── Modals ── */}
        <CardPickerModal
          visible={showPickPlayer}
          onClose={() => setShowPickPlayer(false)}
          onSelect={c => { setPlayerCard(c); setSimResult(null); }}
        />
        <CardPickerModal
          visible={showPickBot}
          onClose={() => setShowPickBot(false)}
          onSelect={c => { setBotCard(c); setSimResult(null); }}
        />
        <AbilityPickerModal
          visible={showAbPlayer}
          current={playerAbility}
          onClose={() => setShowAbPlayer(false)}
          onSelect={ab => { setPlayerAbility(ab); setSimResult(null); }}
        />
        <AbilityPickerModal
          visible={showAbBot}
          current={botAbility}
          onClose={() => setShowAbBot(false)}
          onSelect={ab => { setBotAbility(ab); setSimResult(null); }}
        />
      </LuxuryBackground>
    </ScreenContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.sm },
  backBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.3)' },
  backTxt:  { color: COLOR.gold, fontSize: FONT.lg, fontWeight: '700' },
  title:    { fontSize: FONT.lg, color: COLOR.gold, fontWeight: '900', letterSpacing: 1 },

  scroll:   { padding: SPACE.md, paddingBottom: SPACE.xxl },

  arena:    { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs },

  vsCol:    { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACE.md, width: 60 },
  vsCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(228,165,42,0.15)', borderWidth: 1.5, borderColor: 'rgba(228,165,42,0.5)', alignItems: 'center', justifyContent: 'center' },
  vsEmoji:  { fontSize: 16 },
  vsText:   { fontSize: 10, color: COLOR.gold, fontWeight: '900' },
  runBtn:   { paddingHorizontal: SPACE.sm, paddingVertical: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: '#059669', alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5, minWidth: 52 },
  runBtnDisabled: { backgroundColor: '#1f2937', shadowOpacity: 0 },
  runTxt:   { color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },

  logBox:   { marginTop: SPACE.xl, ...GLASS_PANEL, padding: SPACE.md },
  logTitle: { fontSize: FONT.md, color: COLOR.gold, fontWeight: '800', marginBottom: SPACE.sm },
  logLine:  { fontSize: FONT.sm, color: '#ddd', marginBottom: SPACE.xs, lineHeight: 20 },
  resetBtn: { marginTop: SPACE.md, alignSelf: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  resetTxt: { color: '#aaa', fontSize: FONT.sm },

  hint:     { textAlign: 'center', color: COLOR.textMuted, fontSize: FONT.sm, marginTop: SPACE.xl },
});

// ─── BattleCard styles ─────────────────────────────────────────────────────────────────────────────────────────────────
const bc = StyleSheet.create({
  wrapper:      { flex: 1, borderRadius: RADIUS.lg, borderWidth: 2, backgroundColor: 'rgba(10,10,20,0.85)', overflow: 'hidden', paddingBottom: SPACE.sm },
  rarityBadge:  { margin: SPACE.xs, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  rarityTxt:    { fontSize: 9, fontWeight: '800' },
  imgWrap:      { width: '100%', aspectRatio: 0.75, position: 'relative' },
  img:          { width: '100%', height: '100%' },
  imgPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm },
  pickHint:     { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  changeTag:    { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  changeTxt:    { fontSize: 13 },
  cardName:     { fontSize: FONT.sm, fontWeight: '800', textAlign: 'center', paddingHorizontal: SPACE.xs, marginTop: SPACE.xs },
  stars:        { textAlign: 'center', color: '#fbbf24', fontSize: 11, marginTop: 2 },
  statsRow:     { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: SPACE.xs, flexWrap: 'wrap', paddingHorizontal: SPACE.xs },
  statBadge:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 3, borderRadius: RADIUS.sm },
  statEmoji:    { fontSize: 12 },
  statVal:      { fontSize: 11, fontWeight: '800' },
  abilityBtn:   { marginHorizontal: SPACE.xs, marginTop: SPACE.xs, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  abilityTxt:   { fontSize: 9, color: '#bbb', fontWeight: '700', flex: 1 },
  resultBadge:  { margin: SPACE.xs, borderRadius: RADIUS.sm, borderWidth: 1.5, paddingVertical: SPACE.xs, alignItems: 'center' },
  resultTxt:    { fontSize: FONT.sm, fontWeight: '900' },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────────────────────────────────────────
const mp = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#0f172a', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(228,165,42,0.25)' },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACE.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  title:        { fontSize: FONT.lg, color: COLOR.gold, fontWeight: '800' },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:     { color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 22 },
  search:       { margin: SPACE.md, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: FONT.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  cardThumb:    { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', minHeight: 130 },
  thumbImg:     { width: '100%', height: 90 },
  thumbPlaceholder: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  thumbName:    { fontSize: 10, fontWeight: '700', textAlign: 'center', padding: 4, lineHeight: 13 },
  abilityRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, padding: SPACE.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: SPACE.xs, backgroundColor: 'rgba(255,255,255,0.03)' },
  abilityRowActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' },
  abilityLabel: { fontSize: FONT.sm, color: '#ccc', fontWeight: '600' },
  abilityKey:   { fontSize: 10, color: '#555', marginTop: 2 },
});
