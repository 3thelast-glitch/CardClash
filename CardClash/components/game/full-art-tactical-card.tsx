/**
 * FullArtTacticalCard
 * تصميم Full Art Tactical: الفن يملأ الكرت، بينما تُرسم الإحصاءات والندرة
 * والفصيلة ديناميكياً فوقه من بيانات Card. لا تُضمَّن الأرقام داخل صورة الفن.
 */
import React from 'react';
import {
  Image,
  ImageBackground,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Card,
  CardRarity,
  RACE_EMOJI,
  RACE_LABELS,
  Race,
} from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';

type FullArtTacticalCardProps = {
  card: Card;
  style?: StyleProp<ViewStyle>;
  width?: number;
};

const RARITY_THEME: Record<CardRarity, { label: string; color: string }> = {
  common: { label: 'عادي', color: '#B6C2D1' },
  rare: { label: 'نادر', color: '#7DD3FC' },
  epic: { label: 'ملحمي', color: '#C4B5FD' },
  legendary: { label: 'أسطوري', color: '#F6C65D' },
  special: { label: 'خاص', color: '#67E8F9' },
};

const FACTION_MEDALLIONS: Partial<Record<Race, ImageSourcePropType>> = {
  human: require('../../assets/icons/factions/human_clean.png'),
  elf: require('../../assets/icons/factions/elf.png'),
  orc: require('../../assets/icons/factions/orc.png'),
  demon: require('../../assets/icons/factions/demon.png'),
  undead: require('../../assets/icons/factions/undead.png'),
  robot: require('../../assets/icons/factions/robot.png'),
};

type StatProps = {
  icon: string;
  label: string;
  value: number | string;
  accent: string;
};

function CombatStat({ icon, label, value, accent }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statIcon, { color: accent }]}>{icon}</Text>
      <View style={styles.statCopy}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

/**
 * كرت واجهة قابل لإعادة الاستخدام مع دعم RTL.
 * لا يستخدم صور النماذج مباشرة؛ يكفي تمرير أي Card من بيانات المشروع الحالية.
 */
export function FullArtTacticalCard({
  card,
  style,
  width = 220,
}: FullArtTacticalCardProps) {
  const rarity = card.rarity ?? 'common';
  const rarityTheme = RARITY_THEME[rarity];
  const imageSource = getCardImage(card);
  const cardHeight = Math.round(width * 1.333);
  const factionMedallion = FACTION_MEDALLIONS[card.race];

  const content = (
    <>
      <LinearGradient
        colors={['rgba(3, 7, 18, 0.02)', 'rgba(3, 7, 18, 0.14)', 'rgba(3, 7, 18, 0.95)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.innerFrame, { borderColor: rarityTheme.color }]} pointerEvents="none" />

      <View style={styles.topBadges}>
        <View style={[styles.badge, { borderColor: rarityTheme.color }]}>
          <Text style={[styles.badgeIcon, { color: rarityTheme.color }]}>✦</Text>
          <Text style={[styles.badgeText, { color: rarityTheme.color }]}>{rarityTheme.label}</Text>
        </View>
        <View style={styles.factionMedallion}>
          {factionMedallion ? (
            <Image source={factionMedallion} style={styles.factionMedallionImage} resizeMode="contain" />
          ) : (
            <Text style={styles.factionFallbackEmoji}>{RACE_EMOJI[card.race]}</Text>
          )}
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.nameAr} numberOfLines={1}>{card.nameAr}</Text>
        {!!card.nameEn && <Text style={styles.nameEn} numberOfLines={1}>{card.nameEn}</Text>}
      </View>

      <View style={styles.statsDock}>
        <CombatStat icon="⚔" label="هجوم" value={card.attack} accent="#F7C46B" />
        <View style={styles.statDivider} />
        <CombatStat icon="🛡" label="دفاع" value={card.defense} accent="#7DD3FC" />
      </View>
    </>
  );

  return (
    <View
      style={[styles.card, { width, height: cardHeight, borderColor: rarityTheme.color }, style]}
      accessibilityRole="image"
      accessibilityLabel={`${card.nameAr}. ${RACE_LABELS[card.race]}. ${rarityTheme.label}. هجوم ${card.attack}. دفاع ${card.defense}.`}
    >
      {imageSource ? (
        <ImageBackground source={imageSource} style={styles.image} imageStyle={styles.imageCorners}>
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.image, styles.noArt]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#030712',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  image: { flex: 1, justifyContent: 'flex-end' },
  imageCorners: { borderRadius: 16 },
  noArt: { backgroundColor: '#111827' },
  innerFrame: {
    position: 'absolute',
    inset: 6,
    borderWidth: 1,
    borderRadius: 12,
    opacity: 0.8,
  },
  topBadges: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(3, 7, 18, 0.76)',
  },
  badgeIcon: { fontSize: 13, fontWeight: '900' },
  badgeText: { color: '#F8FAFC', fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  factionMedallion: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 4, 12, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.74)',
    shadowColor: '#5B4BFF',
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 8,
  },
  factionMedallionImage: { width: 42, height: 42 },
  factionFallbackEmoji: { fontSize: 22, lineHeight: 28 },
  titleBlock: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  nameAr: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  nameEn: { color: '#D8E4F3', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
  statsDock: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    minHeight: 62,
    marginHorizontal: 10,
    marginBottom: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(3, 7, 18, 0.86)',
  },
  stat: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statIcon: { fontSize: 18, fontWeight: '900' },
  statCopy: { alignItems: 'flex-end' },
  statLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  statValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', lineHeight: 23 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 10, backgroundColor: 'rgba(255,255,255,0.22)' },
});
