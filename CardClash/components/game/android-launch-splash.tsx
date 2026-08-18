import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';

/** طبقة افتتاح React تظهر بعد شاشة Android الأصلية وتختفي تلقائياً قبل القائمة. */
export function AndroidLaunchSplash({ onComplete }: { onComplete: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') { onComplete(); return; }
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(750),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished) onComplete(); });
    return () => animation.stop();
  }, [onComplete, opacity, scale]);

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity }]}>
      <View style={styles.orbA} /><View style={styles.orbB} />
      <Animated.View style={[styles.center, { transform: [{ scale }] }]}>
        <View style={styles.cardMark}><Text style={styles.suit}>♠</Text></View>
        <Text style={styles.title}>CARD CLASH</Text>
        <Text style={styles.subtitle}>استعد للمواجهة</Text>
        <View style={styles.loadingTrack}><View style={styles.loadingFill} /></View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 1000, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#160816' },
  center: { alignItems: 'center', minWidth: 250 },
  orbA: { position: 'absolute', width: 440, height: 440, borderRadius: 220, backgroundColor: 'rgba(225, 170, 43, 0.12)', top: -200, left: -110 },
  orbB: { position: 'absolute', width: 330, height: 330, borderRadius: 165, backgroundColor: 'rgba(128, 20, 60, 0.35)', bottom: -160, right: -70 },
  cardMark: { width: 82, height: 106, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 2, borderColor: '#e4a52a', alignItems: 'center', justifyContent: 'center', shadowColor: '#e4a52a', shadowOpacity: 0.65, shadowRadius: 18, elevation: 10 },
  suit: { fontSize: 45, color: '#e4a52a' },
  title: { marginTop: 17, color: '#f6d36d', fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  subtitle: { marginTop: 6, color: '#dfd5e3', fontSize: 14, fontWeight: '700' },
  loadingTrack: { marginTop: 26, width: 154, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  loadingFill: { width: '68%', height: '100%', backgroundColor: '#e4a52a', borderRadius: 4 },
});
