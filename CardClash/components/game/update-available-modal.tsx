import { Linking, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { AppUpdate } from '@/lib/releases/github-update';

export function UpdateAvailableModal({ update, onDismiss }: { update: AppUpdate | null; onDismiss: () => void }) {
  const openDownload = async () => {
    if (!update) return;
    try { await Linking.openURL(update.downloadUrl); } catch { await Linking.openURL(update.releaseUrl); }
  };

  return (
    <Modal transparent visible={Boolean(update)} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>إصدار جديد متاح</Text>
          <Text style={styles.title}>Card Clash v{update?.version}</Text>
          <Text style={styles.body}>يتوفر تحديث جديد مع تحسينات للمعارك. حمّله من صفحة الإصدارات قبل بدء جولتك التالية.</Text>
          <TouchableOpacity style={styles.download} onPress={openDownload} activeOpacity={0.85}><Text style={styles.downloadText}>تحميل APK</Text></TouchableOpacity>
          <TouchableOpacity style={styles.later} onPress={onDismiss} activeOpacity={0.75}><Text style={styles.laterText}>لاحقاً</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(4, 5, 15, 0.84)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 430, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(228,165,42,0.72)', backgroundColor: '#1a0d1a', padding: 26, alignItems: 'center' },
  eyebrow: { color: '#fbbf24', fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 8 },
  body: { color: '#c7bfd0', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 22 },
  download: { width: '100%', borderRadius: 14, backgroundColor: '#e4a52a', alignItems: 'center', paddingVertical: 13 },
  downloadText: { color: '#1a0d1a', fontSize: 16, fontWeight: '900' },
  later: { paddingTop: 15, paddingBottom: 2 },
  laterText: { color: '#a99bb0', fontSize: 14, fontWeight: '700' },
});
