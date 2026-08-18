import { View, Text, StyleSheet } from 'react-native';
import { Card, ELEMENT_COLORS, RACE_EMOJI, CLASS_EMOJI, ELEMENT_EMOJI } from '@/lib/game/types';

interface CardItemProps {
  card: Card;
  isSelected?: boolean;
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function CardItem({ card, isSelected = false, showStats = true, size = 'medium' }: CardItemProps) {
  const elementColor = ELEMENT_COLORS[card.element];
  
  const sizeStyles = {
    small: { width: 90, height: 120, fontSize: 10, emojiSize: 24 },
    medium: { width: 120, height: 160, fontSize: 12, emojiSize: 32 },
    large: { width: 160, height: 220, fontSize: 14, emojiSize: 48 },
  };
  
  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.card,
        { 
          width: currentSize.width, 
          height: currentSize.height,
          borderColor: isSelected ? '#e94560' : elementColor,
          borderWidth: isSelected ? 3 : 2,
        },
      ]}
    >
      {/* Card Header */}
      <View style={[styles.header, { backgroundColor: elementColor + '40' }]}>
        <Text style={[styles.raceEmoji, { fontSize: currentSize.fontSize }]}>
          {RACE_EMOJI[card.race]}
        </Text>
        <Text style={[styles.elementEmoji, { fontSize: currentSize.fontSize }]}>
          {ELEMENT_EMOJI[card.element]}
        </Text>
      </View>

      {/* Card Icon */}
      <View style={styles.iconContainer}>
        <Text style={{ fontSize: currentSize.emojiSize }}>{card.emoji}</Text>
      </View>

      {/* Card Name */}
      <Text 
        style={[styles.name, { fontSize: currentSize.fontSize }]} 
        numberOfLines={1}
      >
        {card.nameAr}
      </Text>

      {/* Stats */}
      {showStats && (
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontSize: currentSize.fontSize - 2 }]}>⚔️</Text>
            <Text style={[styles.statValue, { fontSize: currentSize.fontSize - 2, color: '#ef4444' }]}>
              {card.attack}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { fontSize: currentSize.fontSize - 2 }]}>🛡️</Text>
            <Text style={[styles.statValue, { fontSize: currentSize.fontSize - 2, color: '#3b82f6' }]}>
              {card.defense}
            </Text>
          </View>
        </View>
      )}

      {/* Class Badge */}
      <View style={[styles.classBadge, { backgroundColor: elementColor }]}>
        <Text style={{ fontSize: currentSize.fontSize - 2 }}>
          {CLASS_EMOJI[card.cardClass]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  raceEmoji: {
    color: '#fff',
  },
  elementEmoji: {
    color: '#fff',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#eaeaea',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#0f0f1a',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    color: '#888',
  },
  statValue: {
    fontWeight: 'bold',
  },
  classBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
