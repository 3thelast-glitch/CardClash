import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';

type PredictionOutcome = 'win' | 'loss';

interface PredictionModalProps {
  visible: boolean;
  upcomingRounds: number[];
  selections: Record<number, PredictionOutcome>;
  onSelect: (round: number, outcome: PredictionOutcome) => void;
  onCancel: () => void;
  onRequestClose: () => void;
  onConfirm: () => void;
  isConfirmDisabled: boolean;
}

export default function PredictionModal({
  visible,
  upcomingRounds,
  selections,
  onSelect,
  onCancel,
  onRequestClose,
  onConfirm,
  isConfirmDisabled,
}: PredictionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>توقع نتائج الجولات القادمة</Text>

          {upcomingRounds.map((round) => (
            <View key={round} style={styles.row}>
              <Text style={styles.roundLabel}>الجولة {round}</Text>
              <View style={styles.options}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    selections[round] === 'win' && styles.optionActive,
                  ]}
                  onPress={() => onSelect(round, 'win')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selections[round] === 'win' && styles.optionTextActive,
                    ]}
                  >
                    Win
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    selections[round] === 'loss' && styles.optionActive,
                  ]}
                  onPress={() => onSelect(round, 'loss')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selections[round] === 'loss' && styles.optionTextActive,
                    ]}
                  >
                    Loss
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>إلغاء</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isConfirmDisabled && styles.confirmDisabled,
              ]}
              onPress={onConfirm}
              disabled={isConfirmDisabled}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>تأكيد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    marginBottom: 12,
  },
  roundLabel: {
    fontSize: 14,
    color: '#eaeaea',
    marginBottom: 8,
    textAlign: 'center',
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
    backgroundColor: '#333',
  },
  optionActive: {
    borderColor: '#d4af37',
    backgroundColor: '#d4af37',
  },
  optionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ccc',
  },
  optionTextActive: {
    color: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDisabled: {
    backgroundColor: '#7a6a2f',
    opacity: 0.6,
  },
  confirmText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
