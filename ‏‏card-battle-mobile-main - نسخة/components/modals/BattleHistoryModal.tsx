/**
 * BattleHistoryModal — سجل جولات المعركة
 * استُخرج من battle.tsx ليصبح مكوّنًا مستقلاً قابلاً لإعادة الاستخدام
 */

import React, { memo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import type { RoundResult } from '@/lib/game/types';

interface BattleHistoryModalProps {
  visible: boolean;
  roundResults: RoundResult[];
  onClose: () => void;
}

export const BattleHistoryModal = memo(function BattleHistoryModal({
  visible,
  roundResults,
  onClose,
}: BattleHistoryModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          <View style={styles.header}>
            <Text style={styles.title}>{'\uD83D\uDCCB'} \u0633\u062c\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeBtn}>\u00d7</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {roundResults.length === 0 ? (
              <Text style={styles.emptyText}>\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0648\u0644\u0627\u062a \u0628\u0639\u062f</Text>
            ) : (
              roundResults.map((result) => {
                const winnerColor =
                  result.winner === 'player' ? '#4ade80' :
                    result.winner === 'bot' ? '#f87171' : '#fbbf24';
                const winnerLabel =
                  result.winner === 'player' ? '\u2713 \u0623\u0646\u062a \u0627\u0644\u0641\u0627\u0626\u0632' :
                    result.winner === 'bot' ? '\u2717 \u0627\u0644\u0628\u0648\u062a \u064a\u0641\u0648\u0632' : '= \u062a\u0639\u0627\u062f\u0644';

                return (
                  <View key={result.round} style={styles.roundItem}>
                    <Text style={styles.roundLabel}>\u0627\u0644\u062c\u0648\u0644\u0629 {result.round}</Text>

                    <View style={styles.cardsRow}>
                      <View style={styles.cardSection}>
                        <Text style={styles.cardSideLabel}>{'\uD83D\uDC64'} \u0623\u0646\u062a</Text>
                        <Text style={styles.cardName}>{result.playerCard.nameAr}</Text>
                        <Text style={styles.cardDamage}>\u0627\u0644\u0636\u0631\u0631: {result.playerDamage}</Text>
                      </View>

                      <View style={styles.vsBlock}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>

                      <View style={styles.cardSection}>
                        <Text style={styles.cardSideLabel}>{'\uD83E\uDD16'} \u0627\u0644\u0628\u0648\u062a</Text>
                        <Text style={styles.cardName}>{result.botCard.nameAr}</Text>
                        <Text style={styles.cardDamage}>\u0627\u0644\u0636\u0631\u0631: {result.botDamage}</Text>
                      </View>
                    </View>

                    <Text style={[styles.winner, { color: winnerColor }]}>{winnerLabel}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
});

// ─── STYLES ─────────────────────────────────────────────────────────────────────

const GOLD = '#e4a52a';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    borderTopWidth: 2,
    borderTopColor: GOLD,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: GOLD,
  },
  closeBtn: {
    fontSize: 24,
    color: '#a0a0a0',
    lineHeight: 28,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 24,
  },
  roundItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  roundLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: GOLD,
    marginBottom: 8,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSection: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  cardSideLabel: {
    fontSize: 11,
    color: '#a0a0a0',
  },
  cardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#eee',
  },
  cardDamage: {
    fontSize: 11,
    color: '#888',
  },
  vsBlock: {
    marginHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: GOLD,
  },
  winner: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
  },
});